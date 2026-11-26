"""Data models for Simple Schedule."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, time, timedelta
from typing import Any
from uuid import uuid4

from .const import (
    BOUND_KINDS,
    CONDITION_MATCH_ALL,
    CONDITION_MATCH_MODES,
    CONDITION_NUMERIC_OPS,
    CONDITION_OPS,
    LEGACY_ACTION_DOMAINS,
    STEP_TYPE_ACTION,
    STEP_TYPE_WAIT,
    SUN_KINDS,
    WEEKDAYS,
)


def _new_id(prefix: str = "s") -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def _normalize_target(raw: Any) -> dict[str, list[str]]:
    """Normalize HA-style target to lists of strings."""
    if not raw:
        return {}
    if isinstance(raw, str):
        return {"entity_id": [raw]}
    if isinstance(raw, list):
        return {"entity_id": [str(x) for x in raw if x]}
    if not isinstance(raw, dict):
        return {}
    out: dict[str, list[str]] = {}
    for key in ("entity_id", "device_id", "area_id", "label_id"):
        val = raw.get(key)
        if val is None or val == "":
            continue
        if isinstance(val, str):
            out[key] = [val]
        elif isinstance(val, list):
            cleaned = [str(x) for x in val if x]
            if cleaned:
                out[key] = cleaned
    return out


def _parse_service(value: str) -> tuple[str, str]:
    domain, _, service = (value or "").partition(".")
    domain = domain.strip()
    service = service.strip()
    if not domain or not service or "." in service:
        raise ValueError(f"Action service must be domain.service, got {value!r}")
    return domain, service


@dataclass
class WindowAction:
    """HA Actions-style call: domain.service + target + typed data fields."""

    service: str  # "domain.service"
    target: dict[str, list[str]] = field(default_factory=dict)
    data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "service": self.service,
            "target": {k: list(v) for k, v in (self.target or {}).items()},
            "data": dict(self.data or {}),
        }

    @property
    def domain(self) -> str:
        return self.service.partition(".")[0]

    @property
    def service_name(self) -> str:
        return self.service.partition(".")[2]

    def entity_ids(self) -> list[str]:
        return list((self.target or {}).get("entity_id") or [])

    @staticmethod
    def from_dict(data: Any) -> WindowAction | None:
        """Parse action; migrates legacy scene.*/script.* entity id strings."""
        if data is None or data == "" or data is False:
            return None
        if isinstance(data, WindowAction):
            return data
        if isinstance(data, str):
            domain, _, object_id = data.partition(".")
            if domain in LEGACY_ACTION_DOMAINS and object_id and "." not in object_id:
                return WindowAction(
                    service=f"{domain}.turn_on",
                    target={"entity_id": [data]},
                    data={},
                )
            raise ValueError(
                f"Action must be a service object or legacy scene.*/script.*, got {data}"
            )
        if not isinstance(data, dict):
            raise ValueError(f"Invalid action payload: {data!r}")

        # Support {action: "light.turn_off", ...} alias used by some HA UIs
        service = data.get("service") or data.get("action")
        if not service:
            # Extremely old: {"entity_id": "scene.foo"} without service
            eid = data.get("entity_id")
            if isinstance(eid, str):
                return WindowAction.from_dict(eid)
            if isinstance(eid, list) and eid:
                return WindowAction.from_dict(eid[0])
            return None

        domain, svc = _parse_service(str(service))
        target = _normalize_target(data.get("target"))
        # Promote top-level entity_id into target when present
        if "entity_id" in data and "entity_id" not in target:
            target = {**target, **_normalize_target({"entity_id": data.get("entity_id")})}
        raw_data = data.get("data")
        if raw_data is None:
            # leftover keys that are not service/target/action/entity_id
            skip = {"service", "action", "target", "entity_id", "data"}
            raw_data = {k: v for k, v in data.items() if k not in skip}
        if not isinstance(raw_data, dict):
            raw_data = {}
        return WindowAction(
            service=f"{domain}.{svc}",
            target=target,
            data=dict(raw_data),
        )


@dataclass
class WaitStep:
    """Duration wait between actions (seconds; UI may roll up to m/s)."""

    seconds: int = 0

    @property
    def type(self) -> str:
        return STEP_TYPE_WAIT

    def to_dict(self) -> dict[str, Any]:
        return {"type": STEP_TYPE_WAIT, "seconds": int(self.seconds)}

    @staticmethod
    def from_dict(data: Any) -> WaitStep | None:
        if data is None or data == "" or data is False:
            return None
        if isinstance(data, WaitStep):
            return data
        if not isinstance(data, dict):
            return None
        raw_type = data.get("type")
        if raw_type is None and ("seconds" in data or "minutes" in data):
            raw_type = STEP_TYPE_WAIT
        if raw_type != STEP_TYPE_WAIT:
            return None
        secs = int(data.get("seconds") or 0)
        secs += int(data.get("minutes") or 0) * 60
        if secs < 0:
            raise ValueError("Wait duration must be >= 0 seconds")
        return WaitStep(seconds=secs)


ScheduleStep = WindowAction | WaitStep


def _is_wait_payload(raw: Any) -> bool:
    if isinstance(raw, WaitStep):
        return True
    if not isinstance(raw, dict):
        return False
    raw_type = raw.get("type")
    if raw_type == STEP_TYPE_WAIT:
        return True
    if raw_type in (None, STEP_TYPE_ACTION):
        # Bare {seconds: N} without service/action → wait
        if raw_type is None and ("seconds" in raw or "minutes" in raw):
            if not (raw.get("service") or raw.get("action")):
                return True
    return False


def parse_schedule_step(raw: Any) -> ScheduleStep | None:
    """Parse one ordered step: wait OR WindowAction (service/target/data)."""
    if raw is None or raw == "" or raw is False:
        return None
    if isinstance(raw, WaitStep):
        return raw
    if isinstance(raw, WindowAction):
        return raw
    if _is_wait_payload(raw):
        return WaitStep.from_dict(raw)
    # Strip optional type:"action" wrapper before WindowAction parse
    if isinstance(raw, dict) and raw.get("type") == STEP_TYPE_ACTION:
        raw = {k: v for k, v in raw.items() if k != "type"}
    return WindowAction.from_dict(raw)


def step_to_storage(step: ScheduleStep) -> dict[str, Any]:
    if isinstance(step, WaitStep):
        return step.to_dict()
    # Keep v4 action shape (no type field) so older readers stay happy
    return step.to_dict()


def migrate_action_value(raw: Any) -> Any:
    """Return serialized step dict or None (for store migration)."""
    step = parse_schedule_step(raw)
    return step_to_storage(step) if step else None


def migrate_action_list(raw: Any) -> list[Any]:
    """Normalize singular/list actions + waits → serialized step dicts.

    Preserves {type:wait, seconds} alongside {service,target,data} actions.
    """
    if raw is None or raw == "" or raw is False:
        return []
    if isinstance(raw, list):
        out: list[Any] = []
        for item in raw:
            migrated = migrate_action_value(item)
            if migrated:
                out.append(migrated)
        return out
    migrated = migrate_action_value(raw)
    return [migrated] if migrated else []


def _validate_action_list(raw: Any) -> list[ScheduleStep]:
    if raw is None or raw == "" or raw is False:
        return []
    if isinstance(raw, (WindowAction, WaitStep)):
        return [raw]
    if isinstance(raw, list):
        out: list[ScheduleStep] = []
        for item in raw:
            step = parse_schedule_step(item)
            if step is not None:
                out.append(step)
        return out
    step = parse_schedule_step(raw)
    return [step] if step else []


def migrate_schedule_dict(item: dict[str, Any]) -> dict[str, Any]:
    """In-place-safe copy: legacy string actions → service/target/data objects.

    Also normalizes optional per-window conditions (storage v3) and wait steps (v5).
    """
    out = dict(item)
    if "default_on_start" in out:
        out["default_on_start"] = migrate_action_list(out.get("default_on_start"))
    if "default_on_end" in out:
        out["default_on_end"] = migrate_action_list(out.get("default_on_end"))
    windows = []
    for w in out.get("windows") or []:
        if not isinstance(w, dict):
            continue
        nw = dict(w)
        if "on_start" in nw:
            nw["on_start"] = migrate_action_list(nw.get("on_start"))
        if "on_end" in nw:
            nw["on_end"] = migrate_action_list(nw.get("on_end"))
        # Normalize conditions; drop empty/invalid rows.
        parsed = [
            c.to_dict()
            for c in (
                WindowCondition.from_dict(raw)
                for raw in (nw.get("conditions") or [])
            )
            if c is not None
        ]
        nw["conditions"] = parsed
        match = nw.get("condition_match") or CONDITION_MATCH_ALL
        nw["condition_match"] = (
            match if match in CONDITION_MATCH_MODES else CONDITION_MATCH_ALL
        )
        windows.append(nw)
    out["windows"] = windows
    return out


def migrate_store_data(data: dict[str, Any]) -> dict[str, Any]:
    schedules = [
        migrate_schedule_dict(item)
        for item in (data.get("schedules") or [])
        if isinstance(item, dict)
    ]
    return {
        "schedules": schedules,
        "groups": list(data.get("groups") or []),
    }


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
class WindowCondition:
    """Entity state condition for a window (Scheduler-lite track_conditions)."""

    entity_id: str
    op: str = "="
    state: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "op": self.op,
            "state": self.state,
        }

    @staticmethod
    def from_dict(data: Any) -> WindowCondition | None:
        if data is None or data is False or data == "":
            return None
        if isinstance(data, WindowCondition):
            return data
        if not isinstance(data, dict):
            return None
        entity_id = str(data.get("entity_id") or "").strip()
        if not entity_id or "." not in entity_id:
            return None
        op = str(data.get("op") or "=").strip()
        if op not in CONDITION_OPS:
            op = "="
        state = data.get("state")
        if state is None:
            state = data.get("value")
        state_s = "" if state is None else str(state)
        if op in CONDITION_NUMERIC_OPS:
            # Reject blank / whitespace (JS Number("") === 0 footgun on card side).
            if not state_s.strip():
                return None
            try:
                float(state_s)
            except (TypeError, ValueError):
                # Numeric ops require a numeric expected value; drop invalid.
                return None
        return WindowCondition(entity_id=entity_id, op=op, state=state_s)

    def label(self, friendly_name: str | None = None) -> str:
        name = friendly_name or self.entity_id
        return f"{name} {self.op} {self.state}"


@dataclass
class Window:
    id: str
    start: TimeBound
    end: TimeBound
    on_start: list[ScheduleStep] = field(default_factory=list)
    on_end: list[ScheduleStep] = field(default_factory=list)
    # None = inherit schedule.weekdays; otherwise this window's own DOW set.
    weekdays: list[str] | None = None
    conditions: list[WindowCondition] = field(default_factory=list)
    condition_match: str = CONDITION_MATCH_ALL  # "all" (AND) | "any" (OR)

    def to_dict(self) -> dict[str, Any]:
        data = {
            "id": self.id,
            "from": self.start.to_dict(),
            "to": self.end.to_dict(),
            "on_start": [step_to_storage(a) for a in self.on_start],
            "on_end": [step_to_storage(a) for a in self.on_end],
            "conditions": [c.to_dict() for c in self.conditions],
            "condition_match": self.condition_match
            if self.condition_match in CONDITION_MATCH_MODES
            else CONDITION_MATCH_ALL,
        }
        if self.weekdays is not None:
            data["weekdays"] = list(self.weekdays)
        return data

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Window:
        wid = data.get("id") or _new_id("w")
        start = TimeBound.from_dict(data.get("from") or data.get("start"))
        end = TimeBound.from_dict(data.get("to") or data.get("end"))
        weekdays = None
        if "weekdays" in data and data.get("weekdays") is not None:
            weekdays = [d for d in data.get("weekdays") or [] if d in WEEKDAYS]
        conditions: list[WindowCondition] = []
        for raw in data.get("conditions") or []:
            cond = WindowCondition.from_dict(raw)
            if cond is not None:
                conditions.append(cond)
        match = data.get("condition_match") or CONDITION_MATCH_ALL
        if match not in CONDITION_MATCH_MODES:
            match = CONDITION_MATCH_ALL
        return Window(
            id=wid,
            start=start,
            end=end,
            on_start=_validate_action_list(data.get("on_start")),
            on_end=_validate_action_list(data.get("on_end")),
            weekdays=weekdays,
            conditions=conditions,
            condition_match=match,
        )

    def effective_weekdays(self, schedule: "Schedule") -> list[str]:
        if self.weekdays is not None:
            return list(self.weekdays)
        return list(schedule.weekdays)

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
    default_on_start: list[ScheduleStep] = field(default_factory=list)
    default_on_end: list[ScheduleStep] = field(default_factory=list)
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
            "default_on_start": [step_to_storage(a) for a in self.default_on_start],
            "default_on_end": [step_to_storage(a) for a in self.default_on_end],
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
            default_on_start=_validate_action_list(data.get("default_on_start")),
            default_on_end=_validate_action_list(data.get("default_on_end")),
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
    # When False, fallback may be null; auto-select may leave none enabled
    require_fallback: bool = True
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
            "require_fallback": self.require_fallback,
            "object_id": self.object_id,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> ScheduleGroup:
        # Default True preserves older stores that predate the field
        require_fallback = data.get("require_fallback")
        if require_fallback is None:
            require_fallback = True
        return ScheduleGroup(
            id=data.get("id") or _new_id("g"),
            name=data.get("name") or "Schedule group",
            exclusive=bool(data.get("exclusive", True)),
            member_ids=list(data.get("member_ids") or data.get("members") or []),
            fallback_member_id=data.get("fallback_member_id") or None,
            enabled_member_id=data.get("enabled_member_id") or None,
            sticky=bool(data.get("sticky", False)),
            require_fallback=bool(require_fallback),
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
    """Reject overlapping season ranges. Heuristic check across a year."""
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
