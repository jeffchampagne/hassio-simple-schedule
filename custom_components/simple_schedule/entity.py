"""Simple Schedule entities."""

from __future__ import annotations

from typing import Any

from homeassistant.core import callback
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.restore_state import RestoreEntity

from .const import (
    ATTR_ACTIVE_WINDOW,
    ATTR_DATE_RANGE,
    ATTR_DEFAULT_ON_END,
    ATTR_DEFAULT_ON_START,
    ATTR_ENABLED,
    ATTR_GROUP_ID,
    ATTR_NEXT_EVENT,
    ATTR_SEASON_AVAILABLE,
    ATTR_WEEKDAYS,
    ATTR_WINDOWS,
    DOMAIN,
)
from .evaluator import active_interval, next_transition
from .models import Schedule, ScheduleGroup


class SimpleScheduleEntity(RestoreEntity, Entity):
    """A weekly availability schedule entity (domain simple_schedule)."""

    _attr_should_poll = False
    _attr_has_entity_name = False

    def __init__(self, hass, schedule: Schedule) -> None:
        self.hass = hass
        self.schedule = schedule
        self._attr_unique_id = f"{DOMAIN}_{schedule.id}"
        self._attr_name = schedule.name
        self._attr_is_on = False
        self._active_window: dict[str, Any] | None = None
        self._next_event: str | None = None

    @property
    def entity_id(self) -> str:
        return f"{DOMAIN}.{self.schedule.slug()}"

    @property
    def state(self) -> str:
        return "on" if self._attr_is_on else "off"

    @property
    def icon(self) -> str:
        if not self.schedule.enabled:
            return "mdi:calendar-remove"
        return "mdi:calendar-clock" if self._attr_is_on else "mdi:calendar-blank"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "schedule_id": self.schedule.id,
            "friendly_name": self.schedule.name,
            ATTR_ENABLED: self.schedule.enabled,
            ATTR_WEEKDAYS: list(self.schedule.weekdays),
            ATTR_WINDOWS: [w.to_dict() for w in self.schedule.windows],
            ATTR_DEFAULT_ON_START: self.schedule.default_on_start,
            ATTR_DEFAULT_ON_END: self.schedule.default_on_end,
            ATTR_GROUP_ID: self.schedule.group_id,
            ATTR_DATE_RANGE: (
                self.schedule.date_range.to_dict() if self.schedule.date_range else None
            ),
            ATTR_SEASON_AVAILABLE: self.schedule.season_available,
            ATTR_ACTIVE_WINDOW: self._active_window,
            ATTR_NEXT_EVENT: self._next_event,
        }

    @callback
    def apply_schedule(self, schedule: Schedule) -> None:
        self.schedule = schedule
        self._attr_name = schedule.name
        self.async_write_ha_state()

    @callback
    def reevaluate(self) -> bool:
        """Recompute active state. Returns True if state flipped."""
        previous = self._attr_is_on
        interval = active_interval(self.hass, self.schedule)
        self._attr_is_on = interval is not None
        if interval:
            self._active_window = {
                "id": interval.window_id,
                "from": interval.start.isoformat(),
                "to": interval.end.isoformat(),
                "overnight": interval.overnight,
            }
        else:
            self._active_window = None
        nxt = next_transition(self.hass, self.schedule)
        self._next_event = nxt[0].isoformat() if nxt else None
        self.async_write_ha_state()
        return previous != self._attr_is_on


class SimpleScheduleGroupEntity(Entity):
    """Group entity exposing exclusive enable / sticky / season metadata."""

    _attr_should_poll = False
    _attr_has_entity_name = False

    def __init__(self, hass, group: ScheduleGroup, store) -> None:
        self.hass = hass
        self.group = group
        self.store = store
        self._attr_unique_id = f"{DOMAIN}_group_{group.id}"
        self._attr_name = group.name

    @property
    def entity_id(self) -> str:
        return f"{DOMAIN}.group_{self.group.slug()}"

    @property
    def state(self) -> str:
        return self.group.enabled_member_id or "none"

    @property
    def icon(self) -> str:
        return "mdi:calendar-multiple"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        members = []
        active_member = None
        for mid in self.group.member_ids:
            sched = self.store.get_schedule(mid)
            if not sched:
                continue
            members.append(
                {
                    "id": sched.id,
                    "entity_id": f"{DOMAIN}.{sched.slug()}",
                    "name": sched.name,
                    "enabled": sched.enabled,
                    "season_available": sched.season_available,
                    "date_range": (
                        sched.date_range.to_dict() if sched.date_range else None
                    ),
                    "windows_summary": ", ".join(w.summary_label() for w in sched.windows)
                    or "No windows set",
                }
            )
            st = self.hass.states.get(f"{DOMAIN}.{sched.slug()}")
            if st and st.state == "on":
                active_member = mid
        return {
            "group_id": self.group.id,
            "friendly_name": self.group.name,
            "exclusive": self.group.exclusive,
            "member_ids": list(self.group.member_ids),
            "members": members,
            "fallback_member": self.group.fallback_member_id,
            "enabled_member": self.group.enabled_member_id,
            "active_member": active_member,
            "sticky": self.group.sticky,
        }

    @callback
    def apply_group(self, group: ScheduleGroup) -> None:
        self.group = group
        self._attr_name = group.name
        self.async_write_ha_state()
