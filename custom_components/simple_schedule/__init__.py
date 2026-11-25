"""Simple Schedule companion integration."""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_point_in_time, async_track_time_interval
from homeassistant.helpers.typing import ConfigType
from homeassistant.components.http import StaticPathConfig
from homeassistant.util import dt as dt_util

from .const import (
    ACTION_DOMAINS,
    ATTR_ENABLED_MEMBER,
    ATTR_STICKY,
    CARD_URL_PATH,
    CONF_CREATE_SAMPLE,
    DOMAIN,
    EVENT_WINDOW_ENDED,
    EVENT_WINDOW_STARTED,
    WEEKDAYS,
)
from .entity import SimpleScheduleEntity, SimpleScheduleGroupEntity
from .evaluator import active_intervals, next_transition, window_actions, weekday_id
from .models import Schedule, ScheduleGroup, Window, new_group, new_schedule
from .store import SimpleScheduleStore

# Service field: legacy string, list of strings, or step dicts
ACTION_STEPS_SCHEMA = vol.Any(None, cv.entity_id, [cv.entity_id], dict, [dict])

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema(
            {
                vol.Optional(CONF_CREATE_SAMPLE, default=True): cv.boolean,
            }
        )
    },
    extra=vol.ALLOW_EXTRA,
)

SERVICE_CREATE_SCHEDULE = "create_schedule"
SERVICE_UPDATE_SCHEDULE = "update_schedule"
SERVICE_DELETE_SCHEDULE = "delete_schedule"
SERVICE_SET_ENABLED = "set_enabled"
SERVICE_CREATE_GROUP = "create_group"
SERVICE_UPDATE_GROUP = "update_group"
SERVICE_DELETE_GROUP = "delete_group"
SERVICE_SELECT_MEMBER = "select_member"
SERVICE_CYCLE_MEMBER = "cycle_member"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up from YAML (optional import into a config entry)."""
    conf = config.get(DOMAIN)
    if conf is None:
        return True
    if hass.config_entries.async_entries(DOMAIN):
        return True
    hass.async_create_task(
        hass.config_entries.flow.async_init(
            DOMAIN,
            context={"source": "import"},
            data={CONF_CREATE_SAMPLE: conf.get(CONF_CREATE_SAMPLE, True)},
        )
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Simple Schedule from a config entry."""
    store = SimpleScheduleStore(hass)
    await store.async_load()

    runtime = SimpleScheduleRuntime(hass, store, entry)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = runtime

    await runtime.async_setup()

    if entry.data.get(CONF_CREATE_SAMPLE, True):
        created = await store.ensure_sample_data()
        if created:
            await runtime.async_reload_entities()

    await runtime.async_register_static_paths()
    runtime.register_services()

    if hass.is_running:
        await runtime.async_start()
    else:
        hass.bus.async_listen_once(
            EVENT_HOMEASSISTANT_STARTED, runtime.async_on_ha_started
        )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    runtime: SimpleScheduleRuntime | None = hass.data.get(DOMAIN, {}).pop(
        entry.entry_id, None
    )
    if runtime:
        await runtime.async_stop()
    return True


class SimpleScheduleRuntime:
    """Owns entities, evaluation loop, groups, and services."""

    def __init__(
        self, hass: HomeAssistant, store: SimpleScheduleStore, entry: ConfigEntry
    ) -> None:
        self.hass = hass
        self.store = store
        self.entry = entry
        self.schedule_entities: dict[str, SimpleScheduleEntity] = {}
        self.group_entities: dict[str, SimpleScheduleGroupEntity] = {}
        self._unsub_interval = None
        self._unsub_point = None
        # schedule_id -> set of active window ids (supports overlapping windows)
        self._prev_active: dict[str, set[str]] = {}

    async def async_setup(self) -> None:
        await self.async_reload_entities()

    async def async_reload_entities(self) -> None:
        # Schedules
        for schedule in list(self.store.schedules.values()):
            if schedule.id in self.schedule_entities:
                self.schedule_entities[schedule.id].apply_schedule(schedule)
            else:
                entity = SimpleScheduleEntity(self.hass, schedule)
                self.schedule_entities[schedule.id] = entity
                self.hass.states.async_set(
                    entity.entity_id,
                    entity.state,
                    entity.extra_state_attributes,
                )
        # Remove deleted
        for sid in list(self.schedule_entities):
            if sid not in self.store.schedules:
                entity = self.schedule_entities.pop(sid)
                self.hass.states.async_remove(entity.entity_id)

        for group in list(self.store.groups.values()):
            if group.id in self.group_entities:
                self.group_entities[group.id].apply_group(group)
            else:
                entity = SimpleScheduleGroupEntity(self.hass, group, self.store)
                self.group_entities[group.id] = entity
                self.hass.states.async_set(
                    entity.entity_id,
                    entity.state,
                    entity.extra_state_attributes,
                )
        for gid in list(self.group_entities):
            if gid not in self.store.groups:
                entity = self.group_entities.pop(gid)
                self.hass.states.async_remove(entity.entity_id)

        self._publish_all()

    def _publish_all(self) -> None:
        for entity in self.schedule_entities.values():
            entity.reevaluate()
            self.hass.states.async_set(
                entity.entity_id, entity.state, entity.extra_state_attributes
            )
        for entity in self.group_entities.values():
            self.hass.states.async_set(
                entity.entity_id, entity.state, entity.extra_state_attributes
            )

    async def async_register_static_paths(self) -> None:
        card = Path(__file__).parent / "www" / "simple-schedule-card.js"
        if not card.exists():
            _LOGGER.warning("Card file missing at %s", card)
            return
        try:
            await self.hass.http.async_register_static_paths(
                [
                    StaticPathConfig(
                        CARD_URL_PATH,
                        str(card),
                        cache_headers=False,
                    )
                ]
            )
        except Exception:  # noqa: BLE001 — already registered on reload
            _LOGGER.debug("Static path may already be registered", exc_info=True)

    async def async_on_ha_started(self, _event=None) -> None:
        await self.async_start()

    async def async_start(self) -> None:
        await self.async_apply_season_auto_select()
        await self.async_tick()
        self._unsub_interval = async_track_time_interval(
            self.hass, self.async_tick, timedelta(seconds=30)
        )
        self._schedule_next_point()

    async def async_stop(self) -> None:
        if self._unsub_interval:
            self._unsub_interval()
            self._unsub_interval = None
        if self._unsub_point:
            self._unsub_point()
            self._unsub_point = None

    def _schedule_next_point(self) -> None:
        if self._unsub_point:
            self._unsub_point()
            self._unsub_point = None
        soonest: datetime | None = None
        for schedule in self.store.schedules.values():
            nxt = next_transition(self.hass, schedule)
            if nxt and (soonest is None or nxt[0] < soonest):
                soonest = nxt[0]
        # Also midnight for season re-apply
        now = dt_util.now()
        midnight = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=5, microsecond=0
        )
        if soonest is None or midnight < soonest:
            soonest = midnight
        if soonest:

            @callback
            def _fire(_now):
                self.hass.async_create_task(self.async_tick())
                self.hass.async_create_task(self.async_apply_season_auto_select())
                self._schedule_next_point()

            self._unsub_point = async_track_point_in_time(self.hass, _fire, soonest)

    async def async_tick(self, _now=None) -> None:
        for schedule in list(self.store.schedules.values()):
            await self._evaluate_schedule(schedule)
        self._publish_all()
        self._schedule_next_point()

    async def _evaluate_schedule(self, schedule: Schedule) -> None:
        entity = self.schedule_entities.get(schedule.id)
        if not entity:
            return
        entity.apply_schedule(schedule)
        intervals = active_intervals(self.hass, schedule)
        cur_windows = {i.window_id for i in intervals}
        prev_windows = self._prev_active.get(schedule.id, set())

        if prev_windows != cur_windows:
            for wid in prev_windows - cur_windows:
                window = next((w for w in schedule.windows if w.id == wid), None)
                if window and schedule.enabled:
                    await self._fire_action(schedule, window, "end")
                    self.hass.bus.async_fire(
                        EVENT_WINDOW_ENDED,
                        {
                            "entity_id": entity.entity_id,
                            "schedule_id": schedule.id,
                            "window_id": wid,
                        },
                    )
            for wid in cur_windows - prev_windows:
                window = next((w for w in schedule.windows if w.id == wid), None)
                if window and schedule.enabled:
                    await self._fire_action(schedule, window, "start")
                    self.hass.bus.async_fire(
                        EVENT_WINDOW_STARTED,
                        {
                            "entity_id": entity.entity_id,
                            "schedule_id": schedule.id,
                            "window_id": wid,
                        },
                    )
            self._prev_active[schedule.id] = cur_windows

        entity.reevaluate()

    async def _fire_action(
        self, schedule: Schedule, window: Window, which: str
    ) -> None:
        """Run ordered steps (actions + duration waits) for start/end."""
        steps = window_actions(schedule, window, which)
        for step in steps:
            if step.type == "wait":
                secs = int(step.seconds or 0)
                if secs > 0:
                    await asyncio.sleep(secs)
                continue
            entity_id = step.entity_id
            if not entity_id:
                continue
            domain, _, _ = entity_id.partition(".")
            if domain not in ACTION_DOMAINS:
                _LOGGER.warning("Ignoring invalid action %s", entity_id)
                continue
            try:
                await self.hass.services.async_call(
                    domain, "turn_on", {"entity_id": entity_id}, blocking=True
                )
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Failed to fire %s action %s", which, entity_id)

    async def async_apply_season_auto_select(self) -> None:
        today = dt_util.now().date()
        for group in list(self.store.groups.values()):
            if group.sticky:
                continue
            match_id = None
            for mid in group.member_ids:
                sched = self.store.get_schedule(mid)
                if not sched or not sched.season_available or not sched.date_range:
                    continue
                if sched.date_range.contains(today):
                    if match_id is not None:
                        # Overlap should have been rejected at edit time; skip auto
                        match_id = None
                        break
                    match_id = mid
            target = match_id or group.fallback_member_id
            if target:
                await self._exclusive_enable(group.id, target, sticky=False)
            elif not group.require_fallback:
                # No in-season member and no fallback (not required) → leave none enabled
                await self._exclusive_enable(group.id, None, sticky=False)

    async def _exclusive_enable(
        self, group_id: str, member_id: str | None, *, sticky: bool
    ) -> None:
        group = self.store.get_group(group_id)
        if not group:
            return
        group.enabled_member_id = member_id
        group.sticky = sticky
        for mid in group.member_ids:
            sched = self.store.get_schedule(mid)
            if not sched:
                continue
            sched.enabled = member_id is not None and mid == member_id
            await self.store.upsert_schedule(sched)
        await self.store.upsert_group(group)
        await self.async_reload_entities()
        await self.async_tick()

    async def cycle_member(self, group_id: str, member_id: str) -> None:
        """Sticky click cycle: select → sticky → clear sticky."""
        group = self.store.get_group(group_id)
        if not group:
            raise ValueError("Unknown group")
        sched = self.store.get_schedule(member_id)
        if not sched or not sched.season_available:
            raise ValueError("Member not available")
        if group.enabled_member_id != member_id:
            await self._exclusive_enable(group_id, member_id, sticky=False)
            return
        if not group.sticky:
            group.sticky = True
            await self.store.upsert_group(group)
            await self.async_reload_entities()
            return
        group.sticky = False
        await self.store.upsert_group(group)
        await self.async_reload_entities()

    def register_services(self) -> None:
        hass = self.hass

        async def create_schedule(call: ServiceCall) -> None:
            data = dict(call.data)
            schedule = new_schedule(**data)
            if schedule.group_id:
                # will validate seasons in store
                pass
            await self.store.upsert_schedule(schedule)
            if schedule.group_id:
                group = self.store.get_group(schedule.group_id)
                if group and schedule.id not in group.member_ids:
                    group.member_ids.append(schedule.id)
                    await self.store.upsert_group(group)
            await self.async_reload_entities()
            await self.async_tick()

        async def update_schedule(call: ServiceCall) -> None:
            sid = call.data["schedule_id"]
            existing = self.store.get_schedule(sid)
            if not existing:
                raise ValueError(f"Unknown schedule {sid}")
            data = existing.to_dict()
            for key, value in call.data.items():
                if key == "schedule_id":
                    continue
                data[key] = value
            data["id"] = existing.id
            schedule = Schedule.from_dict(data)
            await self.store.upsert_schedule(schedule)
            await self.async_reload_entities()
            await self.async_tick()

        async def delete_schedule(call: ServiceCall) -> None:
            schedule = self.store.get_schedule(call.data["schedule_id"])
            if not schedule:
                raise ValueError(f"Unknown schedule {call.data['schedule_id']}")
            await self.store.delete_schedule(schedule.id)
            await self.async_reload_entities()

        async def set_enabled(call: ServiceCall) -> None:
            sid = call.data["schedule_id"]
            enabled = bool(call.data["enabled"])
            schedule = self.store.get_schedule(sid)
            if not schedule:
                raise ValueError(f"Unknown schedule {sid}")
            if schedule.group_id and enabled:
                group = self.store.get_group(schedule.group_id)
                await self._exclusive_enable(
                    schedule.group_id,
                    schedule.id,
                    sticky=bool(group.sticky) if group else False,
                )
                return
            schedule.enabled = enabled
            await self.store.upsert_schedule(schedule)
            await self.async_reload_entities()
            await self.async_tick()

        async def create_group(call: ServiceCall) -> None:
            group = new_group(**dict(call.data))
            await self.store.upsert_group(group)
            if group.enabled_member_id:
                await self._exclusive_enable(
                    group.id, group.enabled_member_id, sticky=False
                )
            else:
                await self.async_reload_entities()

        async def update_group(call: ServiceCall) -> None:
            gid = call.data["group_id"]
            existing = self.store.get_group(gid)
            if not existing:
                raise ValueError(f"Unknown group {gid}")
            data = existing.to_dict()
            for key, value in call.data.items():
                if key == "group_id":
                    continue
                data[key] = value
            data["id"] = existing.id
            # Empty string → clear fallback / enabled (default member is optional)
            if data.get("fallback_member_id") == "":
                data["fallback_member_id"] = None
            if data.get("enabled_member_id") == "":
                data["enabled_member_id"] = None
            group = ScheduleGroup.from_dict(data)
            # Card validates require_fallback; companion allows null fallback (no hard error).
            await self.store.upsert_group(group)
            if (
                not group.require_fallback
                and not group.fallback_member_id
                and not group.sticky
            ):
                # Re-run season logic so clearing fallback can leave none enabled
                await self.async_apply_season_auto_select()
            else:
                await self.async_reload_entities()

        async def delete_group(call: ServiceCall) -> None:
            group = self.store.get_group(call.data["group_id"])
            if not group:
                raise ValueError(f"Unknown group {call.data['group_id']}")
            await self.store.delete_group(group.id)
            await self.async_reload_entities()

        async def select_member(call: ServiceCall) -> None:
            group = self.store.get_group(call.data["group_id"])
            member = self.store.get_schedule(call.data["member_id"])
            if not group or not member:
                raise ValueError("Unknown group or member")
            await self._exclusive_enable(
                group.id,
                member.id,
                sticky=bool(call.data.get("sticky", False)),
            )

        async def cycle_member(call: ServiceCall) -> None:
            group = self.store.get_group(call.data["group_id"])
            member = self.store.get_schedule(call.data["member_id"])
            if not group or not member:
                raise ValueError("Unknown group or member")
            await self.cycle_member(group.id, member.id)

        schemas = {
            SERVICE_CREATE_SCHEDULE: vol.Schema(
                {
                    vol.Required("name"): cv.string,
                    vol.Optional("object_id"): cv.string,
                    vol.Optional("enabled", default=True): cv.boolean,
                    vol.Optional("weekdays", default=list(WEEKDAYS)): vol.All(
                        cv.ensure_list, [vol.In(WEEKDAYS)]
                    ),
                    vol.Optional("windows", default=[]): vol.All(cv.ensure_list, [dict]),
                    vol.Optional("default_on_start"): ACTION_STEPS_SCHEMA,
                    vol.Optional("default_on_end"): ACTION_STEPS_SCHEMA,
                    vol.Optional("group_id"): vol.Any(None, cv.string),
                    vol.Optional("date_range"): vol.Any(None, dict),
                    vol.Optional("season_available", default=True): cv.boolean,
                }
            ),
            SERVICE_UPDATE_SCHEDULE: vol.Schema(
                {
                    vol.Required("schedule_id"): cv.string,
                    vol.Optional("name"): cv.string,
                    vol.Optional("object_id"): cv.string,
                    vol.Optional("enabled"): cv.boolean,
                    vol.Optional("weekdays"): vol.All(
                        cv.ensure_list, [vol.In(WEEKDAYS)]
                    ),
                    vol.Optional("windows"): vol.All(cv.ensure_list, [dict]),
                    vol.Optional("default_on_start"): ACTION_STEPS_SCHEMA,
                    vol.Optional("default_on_end"): ACTION_STEPS_SCHEMA,
                    vol.Optional("group_id"): vol.Any(None, cv.string),
                    vol.Optional("date_range"): vol.Any(None, dict),
                    vol.Optional("season_available"): cv.boolean,
                }
            ),
            SERVICE_DELETE_SCHEDULE: vol.Schema(
                {vol.Required("schedule_id"): cv.string}
            ),
            SERVICE_SET_ENABLED: vol.Schema(
                {
                    vol.Required("schedule_id"): cv.string,
                    vol.Required("enabled"): cv.boolean,
                }
            ),
            SERVICE_CREATE_GROUP: vol.Schema(
                {
                    vol.Required("name"): cv.string,
                    vol.Optional("object_id"): cv.string,
                    vol.Optional("member_ids", default=[]): vol.All(
                        cv.ensure_list, [cv.string]
                    ),
                    vol.Optional("fallback_member_id"): vol.Any(None, cv.string),
                    vol.Optional("enabled_member_id"): vol.Any(None, cv.string),
                    vol.Optional("require_fallback", default=True): cv.boolean,
                }
            ),
            SERVICE_UPDATE_GROUP: vol.Schema(
                {
                    vol.Required("group_id"): cv.string,
                    vol.Optional("name"): cv.string,
                    vol.Optional("member_ids"): vol.All(cv.ensure_list, [cv.string]),
                    vol.Optional("fallback_member_id"): vol.Any(None, cv.string),
                    vol.Optional("enabled_member_id"): vol.Any(None, cv.string),
                    vol.Optional("sticky"): cv.boolean,
                    vol.Optional("require_fallback"): cv.boolean,
                }
            ),
            SERVICE_DELETE_GROUP: vol.Schema({vol.Required("group_id"): cv.string}),
            SERVICE_SELECT_MEMBER: vol.Schema(
                {
                    vol.Required("group_id"): cv.string,
                    vol.Required("member_id"): cv.string,
                    vol.Optional("sticky", default=False): cv.boolean,
                }
            ),
            SERVICE_CYCLE_MEMBER: vol.Schema(
                {
                    vol.Required("group_id"): cv.string,
                    vol.Required("member_id"): cv.string,
                }
            ),
        }

        handlers = {
            SERVICE_CREATE_SCHEDULE: create_schedule,
            SERVICE_UPDATE_SCHEDULE: update_schedule,
            SERVICE_DELETE_SCHEDULE: delete_schedule,
            SERVICE_SET_ENABLED: set_enabled,
            SERVICE_CREATE_GROUP: create_group,
            SERVICE_UPDATE_GROUP: update_group,
            SERVICE_DELETE_GROUP: delete_group,
            SERVICE_SELECT_MEMBER: select_member,
            SERVICE_CYCLE_MEMBER: cycle_member,
        }
        for name, handler in handlers.items():
            if not hass.services.has_service(DOMAIN, name):
                hass.services.async_register(DOMAIN, name, handler, schema=schemas[name])
