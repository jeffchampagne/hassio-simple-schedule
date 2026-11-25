#!/usr/bin/env python3
"""Offline unit tests for Simple Schedule models + evaluator helpers.

No Home Assistant install required — stubs are injected before imports.
"""

from __future__ import annotations

import asyncio
import sys
import types
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "custom_components" / "simple_schedule"
import importlib.util


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


# --- minimal Home Assistant stubs ---
ha = types.ModuleType("homeassistant")
ha_core = types.ModuleType("homeassistant.core")
ha_util = types.ModuleType("homeassistant.util")
ha_util_dt = types.ModuleType("homeassistant.util.dt")


class HomeAssistant:  # noqa: D101
    pass


ha_core.HomeAssistant = HomeAssistant
ha_core.callback = lambda f: f


class _DT:
    UTC = ZoneInfo("UTC")

    @staticmethod
    def as_local(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=ZoneInfo("America/New_York"))
        return value.astimezone(ZoneInfo("America/New_York"))

    @staticmethod
    def now() -> datetime:
        return datetime.now(ZoneInfo("America/New_York"))

    @staticmethod
    def get_time_zone(name: str):
        try:
            return ZoneInfo(name)
        except Exception:
            return ZoneInfo("UTC")

    @staticmethod
    def parse_datetime(raw: str):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except Exception:
            return None


ha_util_dt.as_local = _DT.as_local
ha_util_dt.now = _DT.now
ha_util_dt.get_time_zone = _DT.get_time_zone
ha_util_dt.parse_datetime = _DT.parse_datetime
ha_util_dt.UTC = _DT.UTC

sys.modules["homeassistant"] = ha
sys.modules["homeassistant.core"] = ha_core
sys.modules["homeassistant.util"] = ha_util
sys.modules["homeassistant.util.dt"] = ha_util_dt
ha_util.dt = ha_util_dt

# Load package modules without executing package __init__ (needs HA deps)
pkg = types.ModuleType("simple_schedule")
pkg.__path__ = [str(PKG)]
sys.modules["simple_schedule"] = pkg
_load("simple_schedule.const", PKG / "const.py")
M = _load("simple_schedule.models", PKG / "models.py")
E = _load("simple_schedule.evaluator", PKG / "evaluator.py")


TZ = ZoneInfo("America/New_York")


class FakeState:
    def __init__(self, attrs=None):
        self.attributes = attrs or {}


class FakeHass:
    def __init__(self, sun_attrs=None):
        self.config = types.SimpleNamespace(time_zone="America/New_York")
        self._sun = FakeState(sun_attrs or {})
        self.states = types.SimpleNamespace(get=self._get)
        self.calls: list[tuple] = []

    def _get(self, entity_id: str):
        if entity_id == "sun.sun":
            return self._sun
        return None

    async def async_call_service(self, domain, service, data, blocking=True):
        self.calls.append((domain, service, data, blocking))


def clock_window(wid, start, end, on_start=None, on_end=None):
    return {
        "id": wid,
        "from": {"kind": "clock", "time": start},
        "to": {"kind": "clock", "time": end},
        "on_start": on_start,
        "on_end": on_end,
    }


class ActionStepTests(unittest.TestCase):
    def test_legacy_string_normalizes(self):
        steps = M.normalize_action_steps("script.foo")
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0].type, "action")
        self.assertEqual(steps[0].entity_id, "script.foo")

    def test_wait_seconds_and_minutes(self):
        step = M.ActionStep.from_dict({"type": "wait", "minutes": 1, "seconds": 30})
        self.assertEqual(step.type, "wait")
        self.assertEqual(step.seconds, 90)
        self.assertEqual(step.to_dict(), {"type": "wait", "seconds": 90})

    def test_mixed_list_roundtrip(self):
        raw = [
            "scene.a",
            {"type": "wait", "seconds": 5},
            {"type": "action", "entity_id": "script.b"},
        ]
        steps = M.normalize_action_steps(raw)
        stored = M.steps_to_storage(steps)
        self.assertEqual(
            stored,
            [
                {"type": "action", "entity_id": "scene.a"},
                {"type": "wait", "seconds": 5},
                {"type": "action", "entity_id": "script.b"},
            ],
        )

    def test_window_accepts_legacy_and_lists(self):
        w = M.Window.from_dict(
            clock_window("w1", "07:00", "09:00", on_start="script.x", on_end=[])
        )
        self.assertEqual(len(w.on_start), 1)
        self.assertEqual(w.on_start[0].entity_id, "script.x")
        self.assertEqual(w.on_end, [])


class DateRangeSoloTests(unittest.TestCase):
    def test_unset_year_round(self):
        s = M.Schedule.from_dict(
            {
                "id": "s1",
                "name": "year_round",
                "weekdays": [
                    "sun",
                    "mon",
                    "tue",
                    "wed",
                    "thu",
                    "fri",
                    "sat",
                ],
                "windows": [clock_window("w", "18:00", "22:00")],
            }
        )
        self.assertTrue(s.in_season(date(2026, 6, 15)))
        self.assertTrue(s.in_season(date(2026, 12, 25)))

    def test_winter_holiday_range(self):
        s = M.Schedule.from_dict(
            {
                "id": "s1",
                "name": "winter_holiday_lights",
                "enabled": True,
                "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                "windows": [clock_window("w", "16:00", "23:00")],
                "date_range": {
                    "start": "11-01",
                    "end": "01-31",
                    "recurs_yearly": True,
                },
            }
        )
        self.assertTrue(s.in_season(date(2026, 11, 15)))
        self.assertTrue(s.in_season(date(2027, 1, 10)))
        self.assertFalse(s.in_season(date(2026, 6, 15)))
        self.assertFalse(s.in_season(date(2026, 10, 15)))

    def test_june_only(self):
        s = M.Schedule.from_dict(
            {
                "id": "s1",
                "name": "june_display",
                "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                "windows": [clock_window("w", "20:00", "20:15")],
                "date_range": {"start": "06-01", "end": "06-30", "recurs_yearly": True},
            }
        )
        self.assertTrue(s.in_season(date(2026, 6, 1)))
        self.assertTrue(s.in_season(date(2026, 6, 30)))
        self.assertFalse(s.in_season(date(2026, 5, 31)))
        self.assertFalse(s.in_season(date(2026, 7, 1)))

    def test_october_midnight(self):
        s = M.Schedule.from_dict(
            {
                "id": "s1",
                "name": "october_midnight",
                "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                "windows": [clock_window("w", "00:00", "00:15")],
                "date_range": {"start": "10-01", "end": "10-31", "recurs_yearly": True},
            }
        )
        self.assertTrue(s.in_season(date(2026, 10, 31)))
        self.assertFalse(s.in_season(date(2026, 11, 1)))


class OverlapTests(unittest.TestCase):
    def test_clock_overlap_detected(self):
        a = M.Window.from_dict(clock_window("a", "18:00", "22:00"))
        b = M.Window.from_dict(clock_window("b", "20:00", "23:00"))
        self.assertTrue(M.clock_windows_overlap(a, b))
        ids = M.overlapping_window_ids([a, b])
        self.assertEqual(ids, {"a", "b"})

    def test_adjacent_not_overlap(self):
        a = M.Window.from_dict(clock_window("a", "18:00", "20:00"))
        b = M.Window.from_dict(clock_window("b", "20:00", "22:00"))
        self.assertFalse(M.clock_windows_overlap(a, b))

    def test_overnight_overlap(self):
        a = M.Window.from_dict(clock_window("a", "22:00", "06:00"))
        b = M.Window.from_dict(clock_window("b", "05:00", "07:00"))
        self.assertTrue(M.clock_windows_overlap(a, b))


class EvaluatorSeasonGateTests(unittest.TestCase):
    def setUp(self):
        self.hass = FakeHass()

    def _sched(self, **kwargs):
        base = {
            "id": "s1",
            "name": "solo",
            "enabled": True,
            "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
            "windows": [clock_window("w1", "10:00", "12:00")],
        }
        base.update(kwargs)
        return M.Schedule.from_dict(base)

    def test_out_of_season_not_active(self):
        sched = self._sched(
            date_range={"start": "11-01", "end": "01-31", "recurs_yearly": True}
        )
        when = datetime(2026, 6, 15, 10, 30, tzinfo=TZ)
        self.assertIsNone(E.active_interval(self.hass, sched, when))

    def test_in_season_active(self):
        sched = self._sched(
            date_range={"start": "11-01", "end": "01-31", "recurs_yearly": True}
        )
        when = datetime(2026, 11, 15, 10, 30, tzinfo=TZ)
        iv = E.active_interval(self.hass, sched, when)
        self.assertIsNotNone(iv)
        self.assertEqual(iv.window_id, "w1")

    def test_unset_date_range_active(self):
        sched = self._sched()
        when = datetime(2026, 6, 15, 10, 30, tzinfo=TZ)
        self.assertIsNotNone(E.active_interval(self.hass, sched, when))

    def test_overlapping_windows_both_active(self):
        sched = self._sched(
            windows=[
                clock_window("a", "09:00", "12:00"),
                clock_window("b", "10:00", "11:00"),
            ]
        )
        when = datetime(2026, 3, 10, 10, 30, tzinfo=TZ)
        active = E.active_intervals(self.hass, sched, when)
        self.assertEqual({i.window_id for i in active}, {"a", "b"})

    def test_overnight_start_day_season_gate(self):
        """Window starting Oct 31 22:00 still active Nov 1 01:00 when Oct in range."""
        sched = self._sched(
            windows=[clock_window("w", "22:00", "06:00")],
            date_range={"start": "10-01", "end": "10-31", "recurs_yearly": True},
        )
        # Start day Oct 31 is in season → still active after midnight
        when = datetime(2026, 11, 1, 1, 0, tzinfo=TZ)
        self.assertIsNotNone(E.active_interval(self.hass, sched, when))
        # Start day Nov 1 out of season → not active at evening
        when2 = datetime(2026, 11, 1, 22, 30, tzinfo=TZ)
        self.assertIsNone(E.active_interval(self.hass, sched, when2))


class WindowActionsTests(unittest.TestCase):
    def test_window_override_and_defaults(self):
        sched = M.Schedule.from_dict(
            {
                "id": "s1",
                "name": "t",
                "default_on_start": ["script.default_start"],
                "default_on_end": ["script.default_end"],
                "windows": [
                    clock_window(
                        "w",
                        "08:00",
                        "09:00",
                        on_start=[
                            "script.a",
                            {"type": "wait", "seconds": 2},
                            "script.b",
                        ],
                    )
                ],
            }
        )
        w = sched.windows[0]
        steps = E.window_actions(sched, w, "start")
        self.assertEqual([s.type for s in steps], ["action", "wait", "action"])
        self.assertEqual(steps[1].seconds, 2)
        # empty on_end → schedule defaults
        self.assertEqual(
            E.window_actions(sched, w, "end")[0].entity_id, "script.default_end"
        )


class FireActionWaitTests(unittest.TestCase):
    def test_ordered_wait_execution(self):
        """Mirror companion runner: action → wait → action with asyncio.sleep."""

        async def run():
            calls = []

            async def fire(steps):
                for step in steps:
                    if step.type == "wait":
                        await asyncio.sleep(0)  # zero in tests; asserts order
                        calls.append(("wait", step.seconds))
                    else:
                        calls.append(("action", step.entity_id))

            steps = M.normalize_action_steps(
                [
                    "script.a",
                    {"type": "wait", "seconds": 1},
                    "script.b",
                ]
            )
            await fire(steps)
            return calls

        calls = asyncio.run(run())
        self.assertEqual(
            calls,
            [("action", "script.a"), ("wait", 1), ("action", "script.b")],
        )


class GroupFallbackTests(unittest.TestCase):
    """Groups may omit the default/fallback member."""

    def test_require_fallback_defaults_true(self):
        g = M.ScheduleGroup.from_dict({"id": "g1", "name": "Outdoor"})
        self.assertTrue(g.require_fallback)
        self.assertIsNone(g.fallback_member_id)

    def test_allow_null_fallback_when_not_required(self):
        g = M.ScheduleGroup.from_dict(
            {
                "id": "g1",
                "name": "Seasonal only",
                "require_fallback": False,
                "fallback_member_id": None,
                "member_ids": ["s_june"],
            }
        )
        self.assertFalse(g.require_fallback)
        self.assertIsNone(g.fallback_member_id)
        stored = g.to_dict()
        self.assertFalse(stored["require_fallback"])
        self.assertIsNone(stored["fallback_member_id"])

    def test_auto_select_target_none_without_fallback(self):
        """Mirror async_apply_season_auto_select target resolution."""
        seasonal = M.Schedule.from_dict(
            {
                "id": "s_june",
                "name": "June display",
                "season_available": True,
                "date_range": {"start": "06-01", "end": "06-30", "recurs_yearly": True},
                "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                "windows": [clock_window("w", "20:00", "20:15")],
            }
        )
        group = M.ScheduleGroup.from_dict(
            {
                "id": "g1",
                "name": "Outdoor",
                "member_ids": [seasonal.id],
                "require_fallback": False,
                "fallback_member_id": None,
                "enabled_member_id": seasonal.id,
            }
        )
        schedules = {seasonal.id: seasonal}

        def resolve_target(today: date) -> str | None:
            if group.sticky:
                return group.enabled_member_id
            match_id = None
            for mid in group.member_ids:
                sched = schedules.get(mid)
                if not sched or not sched.season_available or not sched.date_range:
                    continue
                if sched.date_range.contains(today):
                    if match_id is not None:
                        return None
                    match_id = mid
            return match_id or group.fallback_member_id

        self.assertEqual(resolve_target(date(2026, 6, 15)), "s_june")
        # Out of season, no fallback → none (may leave none enabled)
        self.assertIsNone(resolve_target(date(2026, 11, 15)))


def main():
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    total = result.testsRun
    failures = len(result.failures) + len(result.errors)
    print(
        f"=== SUMMARY === tests={total} failures={failures} "
        f"errors={len(result.errors)} pass={'yes' if result.wasSuccessful() else 'no'}"
    )
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
