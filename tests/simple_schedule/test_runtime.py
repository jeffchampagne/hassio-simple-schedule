#!/usr/bin/env python3
"""Offline tests for SimpleScheduleRuntime (action sequencing, storage saves, card path)."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest import mock

from tests.simple_schedule.ha_stubs import install_ha_stubs

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "custom_components" / "simple_schedule"


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def _load_package():
    install_ha_stubs()
    pkg = types.ModuleType("simple_schedule")
    pkg.__path__ = [str(PKG)]
    pkg.__file__ = str(PKG / "__init__.py")
    sys.modules["simple_schedule"] = pkg
    for name in ("const", "models", "evaluator", "store", "entity"):
        _load(f"simple_schedule.{name}", PKG / f"{name}.py")
    return _load("simple_schedule", PKG / "__init__.py")


SS = _load_package()
models = sys.modules["simple_schedule.models"]
SimpleScheduleStore = sys.modules["simple_schedule.store"].SimpleScheduleStore
entity_mod = sys.modules["simple_schedule.entity"]


class FakeServices:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def has_service(self, domain, service) -> bool:  # noqa: ANN001
        return True

    async def async_call(self, domain, service, data, blocking=True, target=None):  # noqa: ANN001
        self.calls.append((target or {}).get("entity_id", [None])[0])


class FakeBus:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def async_fire(self, event_type, data) -> None:  # noqa: ANN001
        self.events.append((event_type, data))


class FakeHass:
    def __init__(self) -> None:
        self.config = types.SimpleNamespace(time_zone="America/New_York")
        self.states = types.SimpleNamespace(get=lambda _eid: None)
        self.services = FakeServices()
        self.bus = FakeBus()

    def async_create_task(self, coro):  # noqa: ANN001, ANN201
        return asyncio.get_running_loop().create_task(coro)

    def async_create_background_task(self, coro, name):  # noqa: ANN001, ANN201
        return asyncio.get_running_loop().create_task(coro, name=name)


class FakeRawStore:
    def __init__(self) -> None:
        self.saves = 0

    async def async_save(self, data) -> None:  # noqa: ANN001
        self.saves += 1


class FakeComponent:
    def __init__(self, hass: FakeHass) -> None:
        self.hass = hass

    async def async_add_entities(self, entities) -> None:  # noqa: ANN001
        for entity in entities:
            _attach(entity, self.hass)

    async def async_remove_entity(self, entity_id) -> None:  # noqa: ANN001
        return None


def _attach(entity, hass: FakeHass) -> None:  # noqa: ANN001
    entity.hass = hass
    entity.async_write_ha_state = lambda: None


def _action(entity_id: str) -> dict:
    return {"service": "script.turn_on", "target": {"entity_id": [entity_id]}}


def _make_runtime():
    hass = FakeHass()
    store = SimpleScheduleStore(hass)
    store._store = FakeRawStore()
    runtime = SS.SimpleScheduleRuntime(hass, store, object(), FakeComponent(hass))
    return hass, store, runtime


class ActionSequencingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.hass, self.store, self.runtime = _make_runtime()
        self.schedule = models.new_schedule(
            name="Porch",
            windows=[
                {
                    "id": "w1",
                    "from": {"kind": "clock", "time": "07:00"},
                    "to": {"kind": "clock", "time": "09:00"},
                    "on_start": [
                        _action("script.first"),
                        {"type": "wait", "seconds": 60},
                        _action("script.second"),
                    ],
                    "on_end": [_action("script.off")],
                }
            ],
        )
        self.store.schedules[self.schedule.id] = self.schedule
        entity = entity_mod.SimpleScheduleEntity(self.schedule)
        _attach(entity, self.hass)
        self.runtime.schedule_entities[self.schedule.id] = entity
        self.active: set[str] = set()
        self.gate: asyncio.Event | None = None
        self.waits: list[int] = []

    def _patches(self):
        async def fake_sleep(secs):  # noqa: ANN001
            self.waits.append(secs)
            await self.gate.wait()

        fake_asyncio = types.SimpleNamespace(sleep=fake_sleep, wait=asyncio.wait)
        intervals = lambda _hass, _schedule, when=None: [  # noqa: E731
            types.SimpleNamespace(window_id=wid) for wid in sorted(self.active)
        ]
        return (
            mock.patch.object(SS, "asyncio", fake_asyncio),
            mock.patch.object(SS, "active_intervals", intervals),
        )

    async def _settle(self) -> None:
        for _ in range(5):
            await asyncio.sleep(0)

    def _run(self, scenario) -> None:  # noqa: ANN001
        p1, p2 = self._patches()

        async def main():
            self.gate = asyncio.Event()
            await asyncio.wait_for(scenario(), timeout=5)

        with p1, p2:
            asyncio.run(main())

    def test_tick_during_wait_does_not_refire_start(self):
        async def scenario():
            await self.runtime.async_tick()  # first observe seeds without firing
            self.active.add("w1")
            await self.runtime.async_tick()
            await self._settle()
            self.assertEqual(self.hass.services.calls, ["script.first"])
            # Interval / condition ticks while the start sequence is waiting.
            await self.runtime.async_tick()
            await self.runtime.async_tick()
            self.gate.set()
            await asyncio.gather(*self.runtime._action_tasks.values())
            self.assertEqual(self.hass.services.calls, ["script.first", "script.second"])
            self.assertEqual(self.waits, [60])
            started = [e for e in self.hass.bus.events if e[0] == SS.EVENT_WINDOW_STARTED]
            self.assertEqual(len(started), 1)

        self._run(scenario)

    def test_end_waits_for_running_start_sequence(self):
        async def scenario():
            await self.runtime.async_tick()
            self.active.add("w1")
            await self.runtime.async_tick()
            await self._settle()
            self.active.discard("w1")
            await self.runtime.async_tick()
            await self._settle()
            self.assertEqual(self.hass.services.calls, ["script.first"])
            self.gate.set()
            while self.runtime._action_tasks:
                await asyncio.gather(*list(self.runtime._action_tasks.values()))
            self.assertEqual(
                self.hass.services.calls,
                ["script.first", "script.second", "script.off"],
            )
            kinds = [e[0] for e in self.hass.bus.events]
            self.assertEqual(kinds, [SS.EVENT_WINDOW_STARTED, SS.EVENT_WINDOW_ENDED])

        self._run(scenario)

    def test_tick_does_not_block_on_waits(self):
        async def scenario():
            await self.runtime.async_tick()
            self.active.add("w1")
            # Returns while the 60 s wait is still pending.
            await self.runtime.async_tick()
            await self._settle()
            self.assertEqual(self.waits, [60])
            self.assertEqual(len(self.runtime._action_tasks), 1)
            self.gate.set()
            await asyncio.gather(*self.runtime._action_tasks.values())

        self._run(scenario)

    def test_stop_cancels_pending_sequences(self):
        async def scenario():
            await self.runtime.async_tick()
            self.active.add("w1")
            await self.runtime.async_tick()
            await self._settle()
            task = next(iter(self.runtime._action_tasks.values()))
            await self.runtime.async_stop()
            await asyncio.wait([task])
            self.assertTrue(task.cancelled())
            self.assertEqual(self.hass.services.calls, ["script.first"])

        self._run(scenario)


class GroupSelectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.hass, self.store, self.runtime = _make_runtime()
        windows = [
            {
                "id": "w",
                "from": {"kind": "clock", "time": "18:00"},
                "to": {"kind": "clock", "time": "22:00"},
            }
        ]
        self.normal = models.new_schedule(name="Normal", windows=windows, enabled=True)
        self.seasonal = models.new_schedule(
            name="Seasonal",
            windows=windows,
            enabled=False,
            date_range={"start": "2000-01-01", "end": "2000-01-02", "recurs_yearly": False},
        )
        self.extra = models.new_schedule(name="Extra", windows=windows, enabled=False)
        for sched in (self.normal, self.seasonal, self.extra):
            self.store.schedules[sched.id] = sched
        self.group = models.new_group(
            name="Lights",
            member_ids=[self.normal.id, self.seasonal.id, self.extra.id],
            fallback_member_id=self.normal.id,
            enabled_member_id=self.normal.id,
        )
        self.store.groups[self.group.id] = self.group
        for sched in (self.normal, self.seasonal, self.extra):
            sched.group_id = self.group.id

    @property
    def saves(self) -> int:
        return self.store._store.saves

    def test_exclusive_enable_saves_once(self):
        asyncio.run(self.runtime._exclusive_enable(self.group.id, self.extra.id, sticky=True))
        self.assertEqual(self.saves, 1)
        self.assertEqual(
            [s.enabled for s in (self.normal, self.seasonal, self.extra)],
            [False, False, True],
        )
        self.assertEqual(self.group.enabled_member_id, self.extra.id)
        self.assertTrue(self.group.sticky)

    def test_season_select_skips_when_already_applied(self):
        asyncio.run(self.runtime.async_apply_season_auto_select())
        self.assertEqual(self.saves, 0)
        self.assertEqual(self.runtime.schedule_entities, {})

    def test_season_select_repairs_inconsistent_flags(self):
        self.extra.enabled = True
        asyncio.run(self.runtime.async_apply_season_auto_select())
        self.assertEqual(self.saves, 1)
        self.assertEqual(
            [s.enabled for s in (self.normal, self.seasonal, self.extra)],
            [True, False, False],
        )

    def test_season_select_clears_when_fallback_not_required(self):
        self.group.fallback_member_id = None
        self.group.require_fallback = False
        asyncio.run(self.runtime.async_apply_season_auto_select())
        self.assertEqual(self.saves, 1)
        self.assertIsNone(self.group.enabled_member_id)
        self.assertFalse(any(s.enabled for s in (self.normal, self.seasonal, self.extra)))

    def test_season_select_keeps_selection_when_fallback_required_but_unset(self):
        self.group.fallback_member_id = None
        asyncio.run(self.runtime.async_apply_season_auto_select())
        self.assertEqual(self.saves, 0)
        self.assertEqual(self.group.enabled_member_id, self.normal.id)


class CardServingTests(unittest.TestCase):
    def test_serves_canonical_card(self):
        card = SS.card_path()
        self.assertEqual(card, PKG / "www" / "simple-schedule-card.js")
        self.assertTrue(card.is_file())

    def test_no_stray_card_copies(self):
        names = sorted(p.name for p in (PKG / "www").iterdir())
        self.assertEqual(names, ["simple-schedule-card.js"])


if __name__ == "__main__":
    unittest.main()
