#!/usr/bin/env python3
"""Guard schedule-window ▾ Edit expand against missing wait/step helpers.

Regression: w/p-lineage cards called sscNormalizeStepList/formatWait in the
expanded action editor without defining them, so Expand threw and the UI
looked like Edit did nothing (solo + group-embedded).
"""

from __future__ import annotations

import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CARD = ROOT / "custom_components" / "simple_schedule" / "www" / "simple-schedule-card.js"

OVERNIGHT_LEGEND = (
    "This is an overnight schedule. All actions are based on the day the schedule starts."
)


class CardScheduleEditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.src = CARD.read_text(encoding="utf-8")

    def test_card_file_exists(self):
        self.assertTrue(CARD.is_file(), f"missing card: {CARD}")

    def test_step_wait_helpers_defined(self):
        for name in (
            "sscNormalizeWaitStep",
            "sscNormalizeStep",
            "sscNormalizeStepList",
            "sscStepsToStorage",
            "formatWait",
        ):
            self.assertRegex(
                self.src,
                rf"function {name}\s*\(",
                f"{name} must be defined (Edit expand calls it)",
            )

    def test_expand_toggle_and_render_path(self):
        self.assertIn("_expandedWindowId", self.src)
        self.assertIn("▾ Edit", self.src)
        self.assertIn("▴ Collapse", self.src)
        # Expanded form renders action picker which needs step helpers
        self.assertIn("sscNormalizeStepList(w[field])", self.src)
        self.assertIn("formatWait(act.seconds)", self.src)

    def test_overnight_legend_copy_and_gate(self):
        self.assertIn(OVERNIGHT_LEGEND, self.src)
        self.assertNotIn(
            "↺ overnight window (split bands) · DOW = start day", self.src
        )
        # Legend only renders when overnight is true
        self.assertRegex(
            self.src,
            r"\$\{overnight\s*\?[\s\S]*?" + re.escape(OVERNIGHT_LEGEND),
        )

    def test_node_open_close_solo_and_group_paths(self):
        """Execute helpers + open/close state like solo and group-embedded Edit."""
        # Slice helper block from card source for a clean node eval.
        m_start = re.search(r"function sscNormalizeWaitStep\s*\(", self.src)
        m_end = re.search(r"function sscActionChipLabel\s*\(", self.src)
        self.assertIsNotNone(m_start)
        self.assertIsNotNone(m_end)
        # Need sscNormalizeAction too (dependency of sscNormalizeStep)
        m_action = re.search(r"function sscNormalizeAction\s*\(", self.src)
        self.assertIsNotNone(m_action)
        helpers = self.src[m_action.start() : m_end.start()]

        script = r"""
const sample = {
  id: "w_evening_lights",
  from: { kind: "sunset", offset_minutes: 0 },
  to: { kind: "sunrise", offset_minutes: 0 },
  on_start: [
    { service: "scene.turn_on", target: { entity_id: ["scene.example_evening"] }, data: {} },
    { type: "wait", seconds: 90 },
  ],
  on_end: [
    { service: "scene.turn_on", target: { entity_id: ["scene.example_lights_off"] }, data: {} },
  ],
};

function renderExpandedActionPicker(w, field) {
  // Mirrors _renderActionPicker's first lines — throws if helpers missing.
  const actions = sscNormalizeStepList(w[field]);
  return actions.map((act, i) => {
    if (act.type === "wait") return `${i}:wait:${formatWait(act.seconds)}`;
    return `${i}:action:${act.service}`;
  });
}

function openClose(kind) {
  let expandedWindowId = null;
  const toggle = (id) => {
    expandedWindowId = expandedWindowId === id ? null : id;
  };
  toggle(sample.id);
  if (expandedWindowId !== sample.id) throw new Error(kind + ": failed to open");
  const start = renderExpandedActionPicker(sample, "on_start");
  const end = renderExpandedActionPicker(sample, "on_end");
  if (!start.some((s) => s.includes("wait:1m 30s"))) {
    throw new Error(kind + ": wait step not rendered: " + JSON.stringify(start));
  }
  if (!end.some((s) => s.includes("scene.turn_on"))) {
    throw new Error(kind + ": end actions missing");
  }
  // Persist shape keeps waits
  const stored = sscStepsToStorage(sscNormalizeStepList(sample.on_start));
  if (!stored.some((s) => s.type === "wait" && s.seconds === 90)) {
    throw new Error(kind + ": sscStepsToStorage dropped wait");
  }
  toggle(sample.id);
  if (expandedWindowId !== null) throw new Error(kind + ": failed to close");
}

HELPERS
openClose("solo");
openClose("group-embedded"); // same window editor path inside embedded member card
console.log("ok");
""".replace("HELPERS", helpers)

        proc = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            self.fail(
                f"node open/close harness failed:\nstdout={proc.stdout}\nstderr={proc.stderr}"
            )
        self.assertIn("ok", proc.stdout)

    def test_card_parses(self):
        proc = subprocess.run(
            ["node", "--check", str(CARD)], capture_output=True, text=True, check=False
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)

    def test_hass_relevance_filter(self):
        """Card re-renders only when its own entity or watched entities change."""
        m_action = re.search(r"function sscNormalizeAction\s*\(", self.src)
        m_chip = re.search(r"function sscActionChipLabel\s*\(", self.src)
        m_targets = re.search(r"function sscActionTargetEntityIds\s*\(", self.src)
        m_coerce = re.search(r"function coerceWindows\s*\(", self.src)
        for m in (m_action, m_chip, m_targets, m_coerce):
            self.assertIsNotNone(m)
        helpers = (
            self.src[m_action.start() : m_chip.start()]
            + self.src[m_targets.start() : m_coerce.start()]
        )
        script = r"""
HELPERS
const eid = "simple_schedule.porch";
const sched = {
  state: "off",
  attributes: {
    windows: [{
      id: "w",
      from: { kind: "sunset", offset_minutes: 0 },
      to: { kind: "clock", time: "23:00" },
      on_start: [{ service: "light.turn_on", target: { entity_id: ["light.porch"] } }],
      conditions: [{ entity_id: "input_boolean.away", op: "=", state: "on" }],
    }],
  },
};
const base = {
  [eid]: sched,
  "light.porch": { state: "off" },
  "input_boolean.away": { state: "off" },
  "sun.sun": { state: "below_horizon" },
  "sensor.unrelated": { state: "1" },
};
const services = {};
const hass = (overrides) => ({ states: { ...base, ...overrides }, services });
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const h0 = hass({});
assert(!sscHassRelevantChanged(hass({ "sensor.unrelated": { state: "2" } }), h0, eid, false),
  "unrelated entity must not re-render");
assert(sscHassRelevantChanged(hass({ "light.porch": { state: "on" } }), h0, eid, false),
  "action target change must re-render");
assert(sscHassRelevantChanged(hass({ "input_boolean.away": { state: "on" } }), h0, eid, false),
  "condition entity change must re-render");
assert(sscHassRelevantChanged(hass({ "sun.sun": { state: "above_horizon" } }), h0, eid, false),
  "sun change must re-render for sun-bound windows");
assert(sscHassRelevantChanged(hass({ [eid]: { ...sched, state: "on" } }), h0, eid, false),
  "own entity change must re-render");
assert(sscHassRelevantChanged(hass({}), h0, eid, true), "force must re-render");

const a = sscCollectWatchedEntityIds(h0, eid);
const b = sscCollectWatchedEntityIds(hass({ "sensor.unrelated": { state: "3" } }), eid);
assert(a === b, "watched ids should be cached per state object");
const size = a.size;
sscHassRelevantChanged(hass({ [eid]: { ...sched, attributes: { windows: [] } } }), h0, eid, false);
assert(a.size === size, "cached watched-id set must not be mutated");
console.log("ok");
""".replace("HELPERS", helpers)
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            self.fail(f"hass relevance harness failed:\n{proc.stderr}")
        self.assertIn("ok", proc.stdout)


if __name__ == "__main__":
    unittest.main()
