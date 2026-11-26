#!/usr/bin/env python3
"""Import every companion Python module (stubs for HA deps).

Catches missing symbols (e.g. ScheduleStep) before a tip is folded onto live HA.
"""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

from tests.simple_schedule.ha_stubs import install_ha_stubs

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "custom_components" / "simple_schedule"

# Modules that must import cleanly as part of the integration package.
MODULE_FILES = [
    "const.py",
    "models.py",
    "evaluator.py",
    "store.py",
    "entity.py",
    "config_flow.py",
    "__init__.py",
]


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


class ImportAllModulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        install_ha_stubs()
        pkg = types.ModuleType("simple_schedule")
        pkg.__path__ = [str(PKG)]
        pkg.__file__ = str(PKG / "__init__.py")
        sys.modules["simple_schedule"] = pkg
        cls.loaded = {}
        for filename in MODULE_FILES:
            path = PKG / filename
            assert path.is_file(), f"missing module file: {path}"
            modname = (
                "simple_schedule"
                if filename == "__init__.py"
                else f"simple_schedule.{path.stem}"
            )
            # Re-bind package after __init__ load
            if filename == "__init__.py":
                cls.loaded[filename] = _load("simple_schedule", path)
            else:
                cls.loaded[filename] = _load(modname, path)

    def test_every_module_file_loaded(self):
        self.assertEqual(set(self.loaded), set(MODULE_FILES))

    def test_models_exports_schedule_step(self):
        models = self.loaded["models.py"]
        self.assertTrue(
            hasattr(models, "ScheduleStep"),
            "models.py must export ScheduleStep (live PHL evaluator imports it)",
        )
        # Live shape: union of WindowAction | WaitStep (not an ActionStep alias)
        self.assertTrue(hasattr(models, "WindowAction"))
        self.assertTrue(hasattr(models, "WaitStep"))
        self.assertFalse(
            hasattr(models, "ActionStep"),
            "ActionStep must not exist — live uses ScheduleStep/WindowAction/WaitStep",
        )
        # Live defines ScheduleStep = WindowAction | WaitStep (typing.Union / | )
        self.assertEqual(
            models.ScheduleStep,
            models.WindowAction | models.WaitStep,
        )

    def test_evaluator_imports_clean(self):
        ev = self.loaded["evaluator.py"]
        self.assertTrue(hasattr(ev, "active_intervals") or hasattr(ev, "active_interval"))


if __name__ == "__main__":
    unittest.main()
