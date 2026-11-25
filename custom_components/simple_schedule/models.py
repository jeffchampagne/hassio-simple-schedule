"""Data models for Simple Schedule."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any
from uuid import uuid4

from .const import ACTION_DOMAINS, BOUND_KINDS, STEP_TYPES, SUN_KINDS, WEEKDAYS


def _new_id(prefix: str = "s") -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def _validate_action(entity_id: str | None) -> str | None:
    if not entity_id:
        return None
    domain, _, object_id = entity_id.partition(".")
    if domain not in ACTION_DOMAINS or not object_id:
        raise ValueError(f"Action must be scene.* or script.*, got {entity_id}")
    return entity_id


def parse_hm(value: str) -> time:
    """Parse HH:MM (24h) on a 15-minute boundary."""
    parts = value.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time: {value}")
    hour = int(parts[0])
    minute = int(parts[1])
    if hour == 24 and minute == 0:
        return time(0, 0)
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"Invalid time: {value}")
    if minute % 15 != 0:
        raise ValueError(f"Time must be on 15-minute steps: {value}")
    return time(hour, minute)


def format_hm(t: time) -> str:
    return f"{t.hour:02d}:{t.minute:02d}"


@dataclass
class TimeBound:
    kind: str = "clock"
    time: str | None = None  # HH:MM when kind == clock
    offset_minutes: int = 0

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {"kind": self.kind}
        if self.kind == "clock":
            data["time"] = self.time or "00:00"
        else:
            data["offset_minutes"] = int(self.offset_minutes)
        return data

    @staticmethod
    def from_dict(data: dict[str, Any] | str | None) -> TimeBound:
        if data is None:
            return TimeBound()
        if isinstance(data, str):
            # Shorthand: "07:00" or sun kind name
            if data in SUN_KINDS:
                return TimeBound(kind=data, offset_minutes=0)
            parse_hm(data)
            return TimeBound(kind="clock", time=data)
        kind = data.get("kind", "clock")
        if kind not in BOUND_KINDS:
            raise ValueError(f"Invalid bound kind: {kind}")
        if kind == "clock":
            t = data.get("time") or "00:00"
            parse_hm(t)
            return TimeBound(kind="clock", time=t)
        return TimeBound(
            kind=kind,
            offset_minutes=int(data.get("offset_minutes", 0) or 0),
        )

    def label(self) -> str:
        if self.kind == "clock":
            return self.time or "—"
        name = self.kind.capitalize()
        n = int(self.offset_minutes or 0)
        if n == 0:
            return name
        sign = "+" if n > 0 else "−"
        abs_n = abs(n)
        if abs_n % 60 == 0:
            return f"{name}{sign}{abs_n // 60}h"
        return f"{name}{sign}{abs_n}m"


@dataclass
class ActionStep:
    """One ordered step in on_start / on_end (action or duration wait)."""

    type: str = "action"
    entity_id: str | None = None
    seconds: int = 0

    def to_dict(self) -> dict[str, Any]:
        if self.type == "wait":
            return {"type": "wait", "seconds": int(self.seconds)}
        return {"type": "action", "entity_id": self.entity_id}

    @staticmethod
    def from_dict(data: Any) -> ActionStep:
        if isinstance(data, str):
            eid = _validate_action(data)
            if not eid:
                raise ValueError("Empty action entity")
            return ActionStep(type="action", entity_id=eid)
        if not isinstance(data, dict):
            raise ValueError(f"Invalid action step: {data!r}")
        raw_type = data.get("type")
        if raw_type is None:
            if "seconds" in data or "minutes" in data:
                raw_type = "wait"
            else:
                raw_type = "action"
        if raw_type not in STEP_TYPES:
            raise ValueError(f"Invalid step type: {raw_type}")
        if raw_type == "wait":
            secs = int(data.get("seconds") or 0)
            secs += int(data.get("minutes") or 0) * 60
            if secs < 0:
                raise ValueError("Wait duration must be >= 0 seconds")
            return ActionStep(type="wait", seconds=secs)
        eid = _validate_action(data.get("entity_id") or data.get("entity"))
        if not eid:
            raise ValueError("Action step requires entity_id")
        return ActionStep(type="action", entity_id=eid)


def normalize_action_steps(raw: Any) -> list[ActionStep]:
    """Accept legacy singular string, list of strings, or step dicts."""
    if raw is None or raw == "" or raw == []:
        return []
    if isinstance(raw, (str, dict)):
        return [ActionStep.from_dict(raw)]
    if isinstance(raw, list):
        out: list[ActionStep] = []
        for item in raw:
            if item is None or item == "":
                continue
            out.append(ActionStep.from_dict(item))
        return out
    raise ValueError(f"Invalid action steps: {raw!r}")


def steps_to_storage(steps: list[ActionStep] | None) -> list[dict[str, Any]]:
    return [s.to_dict() for s in (steps or [])]


@dataclass
class Window:
    id: str
    start: TimeBound
    end: TimeBound
    on_start: list[ActionStep] = field(default_factory=list)
    on_end: list[ActionStep] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "from": self.start.to_dict(),
            "to": self.end.to_dict(),
            "on_start": steps_to_storage(self.on_start),
            "on_end": steps_to_storage(self.on_end),
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Window:
        wid = data.get("id") or _new_id("w")
        start = TimeBound.from_dict(data.get("from") or data.get("start"))
        end = TimeBound.from_dict(data.get("to") or data.get("end"))
        return Window(
            id=wid,
            start=start,
            end=end,
            on_start=normalize_action_steps(data.get("on_start")),
            on_end=normalize_action_steps(data.get("on_end")),
        )

    def is_clock_overnight(self) -> bool:
        if self.start.kind != "clock" or self.end.kind != "clock":
            return False
        assert self.start.time and self.end.time
        return parse_hm(self.end.time) <= parse_hm(self.start.time)

    def summary_label(self) -> str:
        if self.start.kind == "clock" and self.end.kind == "clock":
            return f"{self.start.time}–{self.end.time}"
        return f"{self.start.label()} → {self.end.label()}"

    def clock_minute_ranges(self) -> list[tuple[int, int]] | None:
        """Half-open minute ranges in [0, 1440) for clock–clock windows.

        Overnight returns two segments: [start, 1440) and [0, end).
        """
        if self.start.kind != "clock" or self.end.kind != "clock":
            return None
        if not self.start.time or not self.end.time:
            return None
        a = parse_hm(self.start.time)
        b = parse_hm(self.end.time)
        start_m = a.hour * 60 + a.minute
        end_m = b.hour * 60 + b.minute
        if end_m > start_m:
            return [(start_m, end_m)]
        # overnight / wrap (end <= start)
        return [(start_m, 1440), (0, end_m)]


@dataclass
class DateRange:
    start: str  # MM-DD or YYYY-MM-DD
    end: str
    recurs_yearly: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "start": self.start,
            "end": self.end,
            "recurs_yearly": self.recurs_yearly,
        }

    @staticmethod
    def from_dict(data: dict[str, Any] | None) -> DateRange | None:
        if not data:
            return None
        start = data.get("start") or ""
        end = data.get("end") or ""
        if not start and not end:
            return None
        return DateRange(
            start=start,
            end=end,
            recurs_yearly=bool(data.get("recurs_yearly", True)),
        )

    def contains(self, day: date) -> bool:
        """Inclusive end. Supports MM-DD yearly or YYYY-MM-DD absolute."""
        start_md = _to_month_day(self.start, day.year, self.recurs_yearly)
        end_md = _to_month_day(self.end, day.year, self.recurs_yearly)
        if start_md is None or end_md is None:
            return False
        # Handle wrap (e.g. Dec 1 – Jan 2)
        if start_md <= end_md:
            return start_md <= day <= end_md
        return day >= start_md or day <= end_md


def _to_month_day(value: str, year: int, recurs: bool) -> date | None:
    if not value:
        return None
    value = value.strip()
    if len(value) == 5 and value[2] == "-":  # MM-DD
        month, day = int(value[:2]), int(value[3:])
        return date(year, month, day)
    if len(value) == 10 and value[4] == "-" and value[7] == "-":
        y, m, d = int(value[:4]), int(value[5:7]), int(value[8:10])
        if recurs:
            return date(year, m, d)
        return date(y, m, d)
    return None


@dataclass
class Schedule:
    id: str
    name: str
    enabled: bool = True
    weekdays: list[str] = field(default_factory=lambda: list(WEEKDAYS))
    windows: list[Window] = field(default_factory=list)
    default_on_start: list[ActionStep] = field(default_factory=list)
    default_on_end: list[ActionStep] = field(default_factory=list)
    group_id: str | None = None
    date_range: DateRange | None = None
    season_available: bool = True
    object_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "enabled": self.enabled,
            "weekdays": list(self.weekdays),
            "windows": [w.to_dict() for w in self.windows],
            "default_on_start": steps_to_storage(self.default_on_start),
            "default_on_end": steps_to_storage(self.default_on_end),
            "group_id": self.group_id,
            "date_range": self.date_range.to_dict() if self.date_range else None,
            "season_available": self.season_available,
            "object_id": self.object_id,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Schedule:
        weekdays = [d for d in data.get("weekdays", list(WEEKDAYS)) if d in WEEKDAYS]
        windows = [Window.from_dict(w) for w in data.get("windows", [])]
        return Schedule(
            id=data.get("id") or _new_id("s"),
            name=data.get("name") or "Schedule",
            enabled=bool(data.get("enabled", True)),
            weekdays=weekdays,
            windows=windows,
            default_on_start=normalize_action_steps(data.get("default_on_start")),
            default_on_end=normalize_action_steps(data.get("default_on_end")),
            group_id=data.get("group_id"),
            date_range=DateRange.from_dict(data.get("date_range")),
            season_available=bool(data.get("season_available", True)),
            object_id=data.get("object_id"),
        )

    def slug(self) -> str:
        if self.object_id:
            return self.object_id
        slug = "".join(c if c.isalnum() else "_" for c in self.name.lower())
        while "__" in slug:
            slug = slug.replace("__", "_")
        return slug.strip("_") or self.id

    def in_season(self, day: date) -> bool:
        """Optional date_range: unset = year-round; set = inclusive gate."""
        if self.date_range is None:
            return True
        return self.date_range.contains(day)


@dataclass
class ScheduleGroup:
    id: str
    name: str
    exclusive: bool = True
    member_ids: list[str] = field(default_factory=list)
    fallback_member_id: str | None = None
    enabled_member_id: str | None = None
    sticky: bool = False
    object_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "exclusive": self.exclusive,
            "member_ids": list(self.member_ids),
            "fallback_member_id": self.fallback_member_id,
            "enabled_member_id": self.enabled_member_id,
            "sticky": self.sticky,
            "object_id": self.object_id,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> ScheduleGroup:
        return ScheduleGroup(
            id=data.get("id") or _new_id("g"),
            name=data.get("name") or "Schedule group",
            exclusive=bool(data.get("exclusive", True)),
            member_ids=list(data.get("member_ids") or data.get("members") or []),
            fallback_member_id=data.get("fallback_member_id"),
            enabled_member_id=data.get("enabled_member_id"),
            sticky=bool(data.get("sticky", False)),
            object_id=data.get("object_id"),
        )

    def slug(self) -> str:
        if self.object_id:
            return self.object_id
        slug = "".join(c if c.isalnum() else "_" for c in self.name.lower())
        while "__" in slug:
            slug = slug.replace("__", "_")
        return slug.strip("_") or self.id


def seasons_overlap(a: DateRange | None, b: DateRange | None, year: int | None = None) -> bool:
    """Reject overlapping season ranges (Jeff #8). Heuristic check across a year."""
    if a is None or b is None:
        return False
    y = year or date.today().year
    for i in range(366):
        d = date(y, 1, 1) + timedelta(days=i)
        if a.contains(d) and b.contains(d):
            return True
    return False


def _ranges_overlap(a: tuple[int, int], b: tuple[int, int]) -> bool:
    """Half-open [start, end) overlap."""
    return a[0] < b[1] and b[0] < a[1]


def clock_windows_overlap(a: Window, b: Window) -> bool:
    """True when two clock–clock windows share any minutes (incl. overnight)."""
    ra = a.clock_minute_ranges()
    rb = b.clock_minute_ranges()
    if not ra or not rb:
        return False
    for x in ra:
        for y in rb:
            if _ranges_overlap(x, y):
                return True
    return False


def overlapping_window_ids(windows: list[Window]) -> set[str]:
    """Ids of windows that overlap at least one other clock window."""
    hit: set[str] = set()
    for i, a in enumerate(windows):
        for b in windows[i + 1 :]:
            if clock_windows_overlap(a, b):
                hit.add(a.id)
                hit.add(b.id)
    return hit


def new_schedule(**kwargs: Any) -> Schedule:
    data = {"id": _new_id("s"), "name": "New schedule", **kwargs}
    return Schedule.from_dict(data)


def new_group(**kwargs: Any) -> ScheduleGroup:
    data = {"id": _new_id("g"), "name": "New group", **kwargs}
    return ScheduleGroup.from_dict(data)


def clone_dict(obj: Any) -> Any:
    return deepcopy(asdict(obj) if hasattr(obj, "__dataclass_fields__") else obj)
