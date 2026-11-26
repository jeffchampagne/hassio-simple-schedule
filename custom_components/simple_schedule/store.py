"""Persistent store for schedules and groups."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION
from .models import Schedule, ScheduleGroup, new_group, new_schedule, seasons_overlap


class SimpleScheduleStore:
    """Load/save schedule + group definitions."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORAGE_VERSION,
            STORAGE_KEY,
        )
        self.schedules: dict[str, Schedule] = {}
        self.groups: dict[str, ScheduleGroup] = {}

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        # from_dict normalizes v1 singular actions → step lists
        self.schedules = {
            item["id"]: Schedule.from_dict(item)
            for item in data.get("schedules", [])
            if item.get("id")
        }
        self.groups = {
            item["id"]: ScheduleGroup.from_dict(item)
            for item in data.get("groups", [])
            if item.get("id")
        }

    async def async_save(self) -> None:
        await self._store.async_save(
            {
                "schedules": [s.to_dict() for s in self.schedules.values()],
                "groups": [g.to_dict() for g in self.groups.values()],
            }
        )

    def get_schedule(self, schedule_id: str) -> Schedule | None:
        if schedule_id in self.schedules:
            return self.schedules[schedule_id]
        # Allow lookup by object_id / slug / entity object id
        needle = schedule_id
        if needle.startswith("simple_schedule."):
            needle = needle.split(".", 1)[1]
        for schedule in self.schedules.values():
            if schedule.slug() == needle or schedule.object_id == needle:
                return schedule
        return None

    def get_group(self, group_id: str) -> ScheduleGroup | None:
        if group_id in self.groups:
            return self.groups[group_id]
        needle = group_id
        if needle.startswith("simple_schedule."):
            needle = needle.split(".", 1)[1]
        if needle.startswith("group_"):
            needle = needle[len("group_") :]
        for group in self.groups.values():
            if group.slug() == needle or group.object_id == needle:
                return group
        return None

    def schedules_in_group(self, group_id: str) -> list[Schedule]:
        group = self.groups.get(group_id)
        if not group:
            return []
        return [self.schedules[mid] for mid in group.member_ids if mid in self.schedules]

    async def upsert_schedule(self, schedule: Schedule) -> Schedule:
        if schedule.group_id:
            self._validate_group_member_seasons(schedule)
        self.schedules[schedule.id] = schedule
        if schedule.group_id and schedule.group_id in self.groups:
            group = self.groups[schedule.group_id]
            if schedule.id not in group.member_ids:
                group.member_ids.append(schedule.id)
        await self.async_save()
        return schedule

    async def delete_schedule(self, schedule_id: str) -> None:
        schedule = self.schedules.pop(schedule_id, None)
        if schedule and schedule.group_id and schedule.group_id in self.groups:
            group = self.groups[schedule.group_id]
            group.member_ids = [m for m in group.member_ids if m != schedule_id]
            if group.enabled_member_id == schedule_id:
                group.enabled_member_id = group.fallback_member_id
                group.sticky = False
            if group.fallback_member_id == schedule_id:
                group.fallback_member_id = group.member_ids[0] if group.member_ids else None
        for group in self.groups.values():
            if schedule_id in group.member_ids:
                group.member_ids = [m for m in group.member_ids if m != schedule_id]
        await self.async_save()

    async def upsert_group(self, group: ScheduleGroup) -> ScheduleGroup:
        # Schedule windows (member date ranges) must not overlap.
        # Default/fallback is the catch-all and is exempt.
        members = [self.schedules[mid] for mid in group.member_ids if mid in self.schedules]
        fallback_id = group.fallback_member_id
        for i, a in enumerate(members):
            if a.id == fallback_id:
                continue
            for b in members[i + 1 :]:
                if b.id == fallback_id:
                    continue
                if seasons_overlap(a.date_range, b.date_range):
                    raise ValueError(
                        f"Overlapping schedule windows between '{a.name}' and '{b.name}'"
                    )
        self.groups[group.id] = group
        for mid in group.member_ids:
            if mid in self.schedules:
                self.schedules[mid].group_id = group.id
        await self.async_save()
        return group

    async def delete_group(self, group_id: str) -> None:
        group = self.groups.pop(group_id, None)
        if group:
            for mid in group.member_ids:
                if mid in self.schedules:
                    self.schedules[mid].group_id = None
        await self.async_save()

    def _validate_group_member_seasons(self, schedule: Schedule) -> None:
        """Reject overlapping schedule windows; fallback/default member is exempt."""
        if not schedule.group_id or schedule.group_id not in self.groups:
            return
        group = self.groups[schedule.group_id]
        fallback_id = group.fallback_member_id
        if schedule.id == fallback_id:
            return
        for other in self.schedules_in_group(schedule.group_id):
            if other.id == schedule.id:
                continue
            if other.id == fallback_id:
                continue
            if seasons_overlap(schedule.date_range, other.date_range):
                raise ValueError(
                    f"Overlapping schedule windows between '{schedule.name}' and '{other.name}'"
                )

    async def ensure_sample_data(self) -> list[str]:
        """Create a small pilot sample if store is empty. Returns created schedule ids."""
        if self.schedules:
            return []

        classroom = new_schedule(
            name="Sample classroom hours",
            object_id="sample_classroom_hours",
            enabled=True,
            weekdays=["mon", "tue", "wed", "thu", "fri"],
            windows=[
                {
                    "id": "w_morning",
                    "from": {"kind": "clock", "time": "07:00"},
                    "to": {"kind": "clock", "time": "09:00"},
                },
                {
                    "id": "w_afternoon",
                    "from": {"kind": "clock", "time": "16:00"},
                    "to": {"kind": "clock", "time": "20:00"},
                },
            ],
        )
        outdoor = new_schedule(
            name="Sample outdoor closed hours",
            object_id="sample_outdoor_closed_hours",
            enabled=True,
            weekdays=["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
            windows=[
                {
                    "id": "w_overnight",
                    "from": {"kind": "clock", "time": "22:00"},
                    "to": {"kind": "clock", "time": "06:00"},
                }
            ],
        )
        normal = new_schedule(
            name="Sample normal lighting",
            object_id="sample_normal_lighting",
            enabled=True,
            weekdays=list(
                ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
            ),
            windows=[
                {
                    "id": "w_sun",
                    "from": {"kind": "sunset", "offset_minutes": -30},
                    "to": {"kind": "sunrise", "offset_minutes": 0},
                }
            ],
            season_available=True,
        )
        halloween = new_schedule(
            name="Sample halloween lighting",
            object_id="sample_halloween_lighting",
            enabled=False,
            weekdays=list(
                ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
            ),
            windows=[
                {
                    "id": "w_dusk",
                    "from": {"kind": "dusk", "offset_minutes": 0},
                    "to": {"kind": "dawn", "offset_minutes": 0},
                }
            ],
            date_range={"start": "10-01", "end": "11-01", "recurs_yearly": True},
            season_available=True,
        )

        await self.upsert_schedule(classroom)
        await self.upsert_schedule(outdoor)
        await self.upsert_schedule(normal)
        await self.upsert_schedule(halloween)

        group = new_group(
            name="Sample outdoor lighting themes",
            object_id="sample_outdoor_lighting",
            member_ids=[normal.id, halloween.id],
            fallback_member_id=normal.id,
            enabled_member_id=normal.id,
            sticky=False,
        )
        normal.group_id = group.id
        halloween.group_id = group.id
        await self.upsert_group(group)
        await self.upsert_schedule(normal)
        await self.upsert_schedule(halloween)
        return [classroom.id, outdoor.id, normal.id, halloween.id]
