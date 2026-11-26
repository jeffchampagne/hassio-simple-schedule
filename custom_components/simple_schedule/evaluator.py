"""Resolve windows against clock / sun and evaluate active state."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import CONDITION_MATCH_ANY, CONDITION_NUMERIC_OPS, WEEKDAYS
from .models import Schedule, ScheduleStep, TimeBound, Window, WindowCondition, parse_hm

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
        for window in schedule.windows:
            # Per-window DOW when set; otherwise inherit schedule.weekdays.
            window_days = (
                window.weekdays
                if window.weekdays is not None
                else schedule.weekdays
            )
            if dow not in window_days:
                continue
            resolved = resolve_window_for_start_day(hass, window, start_day)
            if resolved:
                out.append(resolved)
    out.sort(key=lambda i: i.start)
    return out


def _as_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def evaluate_condition(hass: HomeAssistant, cond: WindowCondition) -> bool:
    """Compare current entity state to expected value with = != < >."""
    state = hass.states.get(cond.entity_id)
    if state is None:
        return False
    current = state.state
    expected = cond.state
    op = cond.op or "="
    if op in CONDITION_NUMERIC_OPS:
        left = _as_number(current)
        right = _as_number(expected)
        if left is None or right is None:
            return False
        return left < right if op == "<" else left > right
    cur_s = "" if current is None else str(current)
    exp_s = "" if expected is None else str(expected)
    if op == "!=":
        return cur_s != exp_s
    return cur_s == exp_s


def window_conditions_match(hass: HomeAssistant, window: Window) -> bool:
    """True when window has no conditions, or match-all/any is satisfied."""
    conditions = list(window.conditions or [])
    if not conditions:
        return True
    results = [evaluate_condition(hass, c) for c in conditions]
    if window.condition_match == CONDITION_MATCH_ANY:
        return any(results)
    return all(results)


def active_intervals(
    hass: HomeAssistant, schedule: Schedule, when: datetime | None = None
) -> list[ResolvedInterval]:
    """All currently active intervals (supports overlapping windows)."""
    if not schedule.enabled:
        return []
    when = when or dt_util.now()
    local = dt_util.as_local(when)
    windows_by_id = {w.id: w for w in schedule.windows}
    out: list[ResolvedInterval] = []
    for interval in iter_intervals(hass, schedule, local, days=2):
        if not interval.contains(local):
            continue
        window = windows_by_id.get(interval.window_id)
        if window is not None and not window_conditions_match(hass, window):
            continue
        out.append(interval)
    return out


def active_interval(
    hass: HomeAssistant, schedule: Schedule, when: datetime | None = None
) -> ResolvedInterval | None:
    intervals = active_intervals(hass, schedule, when)
    return intervals[0] if intervals else None


def next_transition(
    hass: HomeAssistant, schedule: Schedule, when: datetime | None = None
) -> tuple[datetime, str, str] | None:
    """Return (when, 'start'|'end', window_id) of the next transition.

    Only considers windows whose Conditions currently match (AND/OR).
    Mid-window condition flips are handled by state listeners, not the
    point timer — so we do not wake at a time-bound that would stay inactive.
    """
    if not schedule.enabled or not schedule.windows:
        return None
    when = dt_util.as_local(when or dt_util.now())
    windows_by_id = {w.id: w for w in schedule.windows}
    candidates: list[tuple[datetime, str, str]] = []
    for interval in iter_intervals(hass, schedule, when, days=8):
        window = windows_by_id.get(interval.window_id)
        if window is not None and not window_conditions_match(hass, window):
            continue
        if interval.start > when:
            candidates.append((interval.start, "start", interval.window_id))
        if interval.end > when:
            candidates.append((interval.end, "end", interval.window_id))
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0])
    return candidates[0]


def window_actions(schedule: Schedule, window: Window, which: str) -> list[ScheduleStep]:
    """Return ordered steps for start/end (inherits schedule defaults)."""
    if which == "start":
        acts = window.on_start or schedule.default_on_start
    else:
        acts = window.on_end or schedule.default_on_end
    return list(acts or [])
