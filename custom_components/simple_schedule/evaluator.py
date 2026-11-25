"""Resolve windows against clock / sun and evaluate active state."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import WEEKDAYS
from .models import ActionStep, Schedule, TimeBound, Window, parse_hm

SUN_ATTR = {
    "dawn": "next_dawn",
    "sunrise": "next_rising",
    "dusk": "next_dusk",
    "sunset": "next_setting",
}
# Prefer today's attributes when available
SUN_ATTR_TODAY = {
    "dawn": "dawn",
    "sunrise": "rising",
    "dusk": "dusk",
    "sunset": "setting",
}


@dataclass
class ResolvedInterval:
    """Half-open [start, end) in local time; may span midnight."""

    window_id: str
    start: datetime
    end: datetime
    overnight: bool
    start_dow: str  # weekday id of start local date

    def contains(self, when: datetime) -> bool:
        return self.start <= when < self.end


def weekday_id(day: date) -> str:
    # Python: Monday=0 … Sunday=6 → our Sunday-first ids
    return WEEKDAYS[(day.weekday() + 1) % 7]


def _as_local(hass: HomeAssistant, value: datetime) -> datetime:
    if value.tzinfo is None:
        return dt_util.as_local(value.replace(tzinfo=dt_util.UTC))
    return dt_util.as_local(value)


def _sun_entity_state(hass: HomeAssistant) -> dict[str, Any]:
    state = hass.states.get("sun.sun")
    if state is None:
        return {}
    return state.attributes or {}


def resolve_bound(
    hass: HomeAssistant,
    bound: TimeBound,
    on_day: date,
    *,
    after: datetime | None = None,
) -> datetime | None:
    """Resolve a bound to a timezone-aware local datetime on/near on_day."""
    tz = dt_util.get_time_zone(hass.config.time_zone) or ZoneInfo("UTC")
    if bound.kind == "clock":
        if not bound.time:
            return None
        t = parse_hm(bound.time)
        return datetime.combine(on_day, t, tzinfo=tz)

    attrs = _sun_entity_state(hass)
    # Try today's absolute attrs first, then next_*
    raw = attrs.get(SUN_ATTR_TODAY.get(bound.kind, "")) or attrs.get(
        SUN_ATTR.get(bound.kind, "")
    )
    if raw is None:
        return None
    if isinstance(raw, str):
        parsed = dt_util.parse_datetime(raw)
    elif isinstance(raw, datetime):
        parsed = raw
    else:
        return None
    if parsed is None:
        return None
    local = _as_local(hass, parsed)
    # Map to the requested calendar day when possible
    candidate = local.replace(
        year=on_day.year, month=on_day.month, day=on_day.day
    ) + timedelta(minutes=int(bound.offset_minutes or 0))
    # If sun attr is "next_*" for tomorrow, adjust
    if candidate.date() != on_day and local.date() != on_day:
        # Use local time-of-day from sun event on on_day
        tod = local.timetz() if local.tzinfo else local.time()
        candidate = datetime.combine(on_day, tod.replace(tzinfo=None), tzinfo=tz)
        candidate = candidate + timedelta(minutes=int(bound.offset_minutes or 0))
    if after is not None and candidate <= after:
        # bump one day for search helpers
        candidate = candidate + timedelta(days=1)
    return candidate


def resolve_window_for_start_day(
    hass: HomeAssistant, window: Window, start_day: date
) -> ResolvedInterval | None:
    start = resolve_bound(hass, window.start, start_day)
    if start is None:
        return None
    end = resolve_bound(hass, window.end, start_day)
    if end is None:
        return None

    overnight = False
    if window.start.kind == "clock" and window.end.kind == "clock":
        if parse_hm(window.end.time or "00:00") <= parse_hm(window.start.time or "00:00"):
            overnight = True
            end = resolve_bound(hass, window.end, start_day + timedelta(days=1))
            if end is None:
                return None
    else:
        # Sun→sun or mixed: if end <= start, treat as overnight into next day
        if end <= start:
            overnight = True
            end = resolve_bound(hass, window.end, start_day + timedelta(days=1))
            if end is None:
                return None
            if end <= start:
                end = end + timedelta(days=1)

    return ResolvedInterval(
        window_id=window.id,
        start=start,
        end=end,
        overnight=overnight,
        start_dow=weekday_id(start_day),
    )


def iter_intervals(
    hass: HomeAssistant, schedule: Schedule, around: datetime, days: int = 2
) -> list[ResolvedInterval]:
    """Build resolved intervals for start days near `around`.

    When ``date_range`` is set, intervals whose **start day** falls outside
    the range are omitted (same overnight start-day rule as DOW).
    """
    local = dt_util.as_local(around)
    base = local.date()
    out: list[ResolvedInterval] = []
    for offset in range(-1, days + 1):
        start_day = base + timedelta(days=offset)
        if not schedule.in_season(start_day):
            continue
        dow = weekday_id(start_day)
        if dow not in schedule.weekdays:
            continue
        for window in schedule.windows:
            resolved = resolve_window_for_start_day(hass, window, start_day)
            if resolved:
                out.append(resolved)
    out.sort(key=lambda i: i.start)
    return out


def active_intervals(
    hass: HomeAssistant, schedule: Schedule, when: datetime | None = None
) -> list[ResolvedInterval]:
    """All currently active intervals (supports overlapping windows)."""
    if not schedule.enabled:
        return []
    when = when or dt_util.now()
    local = dt_util.as_local(when)
    # Solo / dated schedules: if today is out of season and we're not still
    # inside an overnight window that *started* in-season, nothing is active.
    # Overnight coverage is handled by including yesterday's start_day in
    # iter_intervals (-1 offset) when that start day was in season.
    return [i for i in iter_intervals(hass, schedule, local, days=2) if i.contains(local)]


def active_interval(
    hass: HomeAssistant, schedule: Schedule, when: datetime | None = None
) -> ResolvedInterval | None:
    intervals = active_intervals(hass, schedule, when)
    return intervals[0] if intervals else None


def next_transition(
    hass: HomeAssistant, schedule: Schedule, when: datetime | None = None
) -> tuple[datetime, str, str] | None:
    """Return (when, 'start'|'end', window_id) of the next transition."""
    if not schedule.enabled or not schedule.windows:
        return None
    when = dt_util.as_local(when or dt_util.now())
    candidates: list[tuple[datetime, str, str]] = []
    for interval in iter_intervals(hass, schedule, when, days=8):
        if interval.start > when:
            candidates.append((interval.start, "start", interval.window_id))
        if interval.end > when:
            candidates.append((interval.end, "end", interval.window_id))
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0])
    return candidates[0]


def window_actions(
    schedule: Schedule, window: Window, which: str
) -> list[ActionStep]:
    """Ordered steps for start or end (window list, else schedule defaults)."""
    if which == "start":
        steps = window.on_start if window.on_start else schedule.default_on_start
    else:
        steps = window.on_end if window.on_end else schedule.default_on_end
    return list(steps or [])


def window_action(schedule: Schedule, window: Window, which: str) -> str | None:
    """First action entity id (compat helper)."""
    for step in window_actions(schedule, window, which):
        if step.type == "action" and step.entity_id:
            return step.entity_id
    return None
