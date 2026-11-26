"""Simple Schedule companion integration."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.event import (
    async_track_point_in_time,
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.helpers.typing import ConfigType
from homeassistant.components.http import StaticPathConfig
from homeassistant.util import dt as dt_util

from .const import (
    CARD_URL_PATH,
    CONF_CREATE_SAMPLE,
    DOMAIN,
    EVENT_ACTION_FAILED,
    EVENT_WINDOW_ENDED,
    EVENT_WINDOW_STARTED,
    SUN_ENTITY_ID,
    SUN_REPLAN_ATTRS,
    TICK_INTERVAL_SECONDS,
    WEEKDAYS,
)
from .entity import SimpleScheduleEntity, SimpleScheduleGroupEntity
from .evaluator import active_intervals, next_transition, window_actions
from .models import Schedule, ScheduleGroup, WaitStep, Window, WindowAction, new_group, new_schedule
from .store import SimpleScheduleStore

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
    domain_data = hass.data.setdefault(DOMAIN, {})
    if "component" not in domain_data:
        component: EntityComponent = EntityComponent(_LOGGER, DOMAIN, hass)
        component.register_shutdown()
        domain_data["component"] = component
    else:
        component = domain_data["component"]

    store = SimpleScheduleStore(hass)
    await store.async_load()

    runtime = SimpleScheduleRuntime(hass, store, entry, component)
    domain_data[entry.entry_id] = runtime

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


def card_path() -> Path:
    """Lovelace card bundle served at CARD_URL_PATH."""
    return Path(__file__).parent / "www" / "simple-schedule-card.js"


class SimpleScheduleRuntime:
    """Owns entities, evaluation loop, groups, and services."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: SimpleScheduleStore,
        entry: ConfigEntry,
        component: EntityComponent,
    ) -> None:
        self.hass = hass
        self.store = store
        self.entry = entry
        self.component = component
        self.schedule_entities: dict[str, SimpleScheduleEntity] = {}
        self.group_entities: dict[str, SimpleScheduleGroupEntity] = {}
        self._unsub_interval = None
        self._unsub_point = None
        self._unsub_conditions = None
        self._unsub_sun = None
        self._sun_attr_snapshot: tuple | None = None
        self._prev_active: dict[str, set[str]] = {}  # schedule_id -> active window ids
        # schedule_id -> latest queued action sequence (runs serialize per schedule)
        self._action_tasks: dict[str, asyncio.Task] = {}

    async def async_setup(self) -> None:
        await self.async_reload_entities()

    async def async_reload_entities(self, *, publish: bool = True) -> None:
        """Sync store → EntityComponent (registers unique_id in entity registry).

        When the caller will ``async_tick()`` next, pass ``publish=False`` so
        entities are updated in memory without a duplicate HA state write;
        the tick's ``_publish_all`` is then the single publish.
        """
        to_add: list[SimpleScheduleEntity | SimpleScheduleGroupEntity] = []

        for schedule in list(self.store.schedules.values()):
            if schedule.id in self.schedule_entities:
                self.schedule_entities[schedule.id].apply_schedule(
                    schedule, write_state=publish
                )
            else:
                entity = SimpleScheduleEntity(schedule)
                self.schedule_entities[schedule.id] = entity
                to_add.append(entity)

        for sid in list(self.schedule_entities):
            if sid not in self.store.schedules:
                entity = self.schedule_entities.pop(sid)
                await self.component.async_remove_entity(entity.entity_id)

        for group in list(self.store.groups.values()):
            if group.id in self.group_entities:
                self.group_entities[group.id].apply_group(
                    group, write_state=publish
                )
            else:
                entity = SimpleScheduleGroupEntity(group, self.store)
                self.group_entities[group.id] = entity
                to_add.append(entity)

        for gid in list(self.group_entities):
            if gid not in self.store.groups:
                entity = self.group_entities.pop(gid)
                await self.component.async_remove_entity(entity.entity_id)

        if to_add:
            await self.component.async_add_entities(to_add)

        self._refresh_condition_listeners()
        if publish:
            self._publish_all()

    def _condition_entity_ids(self) -> set[str]:
        ids: set[str] = set()
        for schedule in self.store.schedules.values():
            for window in schedule.windows:
                for cond in window.conditions or []:
                    if cond.entity_id:
                        ids.add(cond.entity_id)
        return ids

    def _refresh_condition_listeners(self) -> None:
        """Re-evaluate when any window condition entity changes state."""
        if self._unsub_conditions:
            self._unsub_conditions()
            self._unsub_conditions = None
        entity_ids = sorted(self._condition_entity_ids())
        if not entity_ids:
            return

        @callback
        def _on_condition_change(_event) -> None:
            self.hass.async_create_task(self.async_tick())

        self._unsub_conditions = async_track_state_change_event(
            self.hass, entity_ids, _on_condition_change
        )

    def _publish_all(self) -> None:
        for entity in self.schedule_entities.values():
            entity.reevaluate()
        for entity in self.group_entities.values():
            if entity.hass is not None:
                entity.async_write_ha_state()

    def _sun_attrs_snapshot(self) -> tuple:
        """Values that affect sun-bound window resolution."""
        state = self.hass.states.get(SUN_ENTITY_ID)
        attrs = state.attributes if state is not None else {}
        return tuple(attrs.get(key) for key in SUN_REPLAN_ATTRS)

    def _ensure_sun_listener(self) -> None:
        """Re-plan when sun next_*/today attrs change (ignores elevation churn)."""
        if self._unsub_sun:
            return
        self._sun_attr_snapshot = self._sun_attrs_snapshot()

        @callback
        def _on_sun_change(_event) -> None:
            snap = self._sun_attrs_snapshot()
            if snap == self._sun_attr_snapshot:
                return
            self._sun_attr_snapshot = snap
            self.hass.async_create_task(self.async_tick())

        self._unsub_sun = async_track_state_change_event(
            self.hass, [SUN_ENTITY_ID], _on_sun_change
        )

    async def async_register_static_paths(self) -> None:
        card = card_path()
        if not card.exists():
            www = card.parent
            _LOGGER.warning("Card file missing under %s", www)
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
            self.hass, self.async_tick, timedelta(seconds=TICK_INTERVAL_SECONDS)
        )
        self._ensure_sun_listener()
        self._schedule_next_point()

    async def async_stop(self) -> None:
        if self._unsub_interval:
            self._unsub_interval()
            self._unsub_interval = None
        if self._unsub_point:
            self._unsub_point()
            self._unsub_point = None
        if self._unsub_conditions:
            self._unsub_conditions()
            self._unsub_conditions = None
        if self._unsub_sun:
            self._unsub_sun()
            self._unsub_sun = None
        self._sun_attr_snapshot = None
        for task in self._action_tasks.values():
            if not task.done():
                task.cancel()
        self._action_tasks.clear()
        for sid in list(self.schedule_entities):
            entity = self.schedule_entities.pop(sid)
            await self.component.async_remove_entity(entity.entity_id)
        for gid in list(self.group_entities):
            entity = self.group_entities.pop(gid)
            await self.component.async_remove_entity(entity.entity_id)

    def _schedule_next_point(self) -> None:
        if self._unsub_point:
            self._unsub_point()
            self._unsub_point = None
        soonest: datetime | None = None
        for schedule in self.store.schedules.values():
            entity = self.schedule_entities.get(schedule.id)
            if entity is not None and entity.schedule is schedule:
                # Computed by entity.reevaluate() in the same tick.
                nxt_at = entity.next_transition_at
            else:
                nxt = next_transition(self.hass, schedule)
                nxt_at = nxt[0] if nxt else None
            if nxt_at and (soonest is None or nxt_at < soonest):
                soonest = nxt_at
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
                self._unsub_point = None
                # async_tick reschedules the next point when it finishes.
                self.hass.async_create_task(self.async_tick())
                self.hass.async_create_task(self.async_apply_season_auto_select())

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
        # Defer HA state write; async_tick → _publish_all does one reevaluate.
        entity.apply_schedule(schedule, write_state=False)
        intervals = active_intervals(self.hass, schedule)
        cur_windows = {i.window_id for i in intervals}

        # Restart / first observe: seed without firing so Core reload does not
        # re-fire on_start for windows that were already active.
        if schedule.id not in self._prev_active:
            self._prev_active[schedule.id] = set(cur_windows)
            return

        prev_windows = self._prev_active.get(schedule.id) or set()
        if prev_windows == cur_windows:
            return
        # Record before any action runs so overlapping ticks (interval, point
        # timer, condition change) cannot fire the same transition twice.
        self._prev_active[schedule.id] = set(cur_windows)
        windows_by_id = {w.id: w for w in schedule.windows}
        transitions: list[tuple[Window, str]] = []
        # End windows that left — fire on_end whenever leaving active
        # (including disable mid-window). Not gated on schedule.enabled.
        for wid in prev_windows - cur_windows:
            if wid in windows_by_id:
                transitions.append((windows_by_id[wid], "end"))
        # Start newly active windows — only while enabled
        if schedule.enabled:
            for wid in cur_windows - prev_windows:
                if wid in windows_by_id:
                    transitions.append((windows_by_id[wid], "start"))
        if transitions:
            self._queue_transitions(schedule, entity.entity_id, transitions)

    def _queue_transitions(
        self,
        schedule: Schedule,
        entity_id: str,
        transitions: list[tuple[Window, str]],
    ) -> None:
        """Run start/end steps off the tick so waits never block evaluation.

        Sequences for one schedule run in order (a window's start steps finish
        before its end steps begin); different schedules run independently.
        """
        previous = self._action_tasks.get(schedule.id)

        async def _run() -> None:
            if previous is not None and not previous.done():
                await asyncio.wait([previous])
            for window, which in transitions:
                await self._fire_action(schedule, window, which)
                self.hass.bus.async_fire(
                    EVENT_WINDOW_STARTED if which == "start" else EVENT_WINDOW_ENDED,
                    {
                        "entity_id": entity_id,
                        "schedule_id": schedule.id,
                        "window_id": window.id,
                    },
                )

        task = self.hass.async_create_background_task(
            _run(), f"{DOMAIN} actions {schedule.id}"
        )
        self._action_tasks[schedule.id] = task

        def _forget(done: asyncio.Task) -> None:
            if self._action_tasks.get(schedule.id) is done:
                del self._action_tasks[schedule.id]

        task.add_done_callback(_forget)

    async def _fire_action(
        self, schedule: Schedule, window: Window, which: str
    ) -> None:
        """Run ordered steps (actions + duration waits) for start/end."""
        for step in window_actions(schedule, window, which):
            if isinstance(step, WaitStep):
                secs = int(step.seconds or 0)
                if secs > 0:
                    await asyncio.sleep(secs)
                continue
            await self._fire_one_action(schedule, window, which, step)

    async def _fire_one_action(
        self, schedule: Schedule, window: Window, which: str, action: WindowAction
    ) -> None:
        """Fire one Actions-style service call: domain.service + data + target=…"""
        domain = action.domain
        service = action.service_name
        if not domain or not service:
            _LOGGER.warning("Ignoring invalid action service %r", action.service)
            return
        if not self.hass.services.has_service(domain, service):
            _LOGGER.warning(
                "Ignoring unknown service %s.%s for schedule %s",
                domain,
                service,
                schedule.id,
            )
            entity = self.schedule_entities.get(schedule.id)
            self.hass.bus.async_fire(
                EVENT_ACTION_FAILED,
                {
                    "entity_id": entity.entity_id if entity else None,
                    "schedule_id": schedule.id,
                    "window_id": window.id,
                    "which": which,
                    "service": action.service,
                    "message": f"Unknown service {action.service}",
                },
            )
            return
        service_data = dict(action.data or {})
        target = dict(action.target or {}) or None
        try:
            await self.hass.services.async_call(
                domain,
                service,
                service_data,
                # Ordered multi-actions: wait for each call to finish before the next.
                blocking=True,
                target=target,
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.exception(
                "Failed to fire %s action %s for schedule %s",
                which,
                action.service,
                schedule.id,
            )
            entity = self.schedule_entities.get(schedule.id)
            self.hass.bus.async_fire(
                EVENT_ACTION_FAILED,
                {
                    "entity_id": entity.entity_id if entity else None,
                    "schedule_id": schedule.id,
                    "window_id": window.id,
                    "which": which,
                    "service": action.service,
                    "message": str(err),
                },
            )

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
            if not target and group.require_fallback:
                continue
            # No in-season member and no fallback (not required) → leave none enabled
            if self._selection_applied(group, target):
                continue
            await self._exclusive_enable(group.id, target, sticky=False)

    def _selection_applied(self, group: ScheduleGroup, member_id: str | None) -> bool:
        """True when the group already has exactly ``member_id`` enabled (non-sticky)."""
        if group.sticky or group.enabled_member_id != member_id:
            return False
        for mid in group.member_ids:
            sched = self.store.get_schedule(mid)
            if sched and sched.enabled != (member_id is not None and mid == member_id):
                return False
        return True

    async def _exclusive_enable(
        self, group_id: str, member_id: str | None, *, sticky: bool
    ) -> None:
        group = self.store.get_group(group_id)
        if not group:
            return
        group.enabled_member_id = member_id
        group.sticky = sticky
        # Flip member flags in place; upsert_group persists everything in one save.
        for mid in group.member_ids:
            sched = self.store.get_schedule(mid)
            if sched:
                sched.enabled = member_id is not None and mid == member_id
        await self.store.upsert_group(group)
        await self.async_reload_entities(publish=False)
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
        # Clear sticky and re-apply season/fallback selection immediately.
        group.sticky = False
        await self.store.upsert_group(group)
        await self.async_apply_season_auto_select()
        await self.async_reload_entities()

    def register_services(self) -> None:
        hass = self.hass

        async def create_schedule(call: ServiceCall) -> None:
            data = dict(call.data)
            schedule = new_schedule(**data)
            await self.store.upsert_schedule(schedule)
            if schedule.group_id:
                group = self.store.get_group(schedule.group_id)
                if group and schedule.id not in group.member_ids:
                    group.member_ids.append(schedule.id)
                    await self.store.upsert_group(group)
            await self.async_reload_entities(publish=False)
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
            await self.async_reload_entities(publish=False)
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
            await self.async_reload_entities(publish=False)
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
            # Card validates require_fallback; companion allows null fallback.
            await self.store.upsert_group(group)
            if (
                not group.require_fallback
                and not group.fallback_member_id
                and not group.sticky
            ):
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
                    vol.Optional("default_on_start"): vol.Any(None, dict, cv.string, list),
                    vol.Optional("default_on_end"): vol.Any(None, dict, cv.string, list),
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
                    vol.Optional("default_on_start"): vol.Any(None, dict, cv.string, list),
                    vol.Optional("default_on_end"): vol.Any(None, dict, cv.string, list),
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
