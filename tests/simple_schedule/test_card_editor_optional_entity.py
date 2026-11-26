#!/usr/bin/env python3
"""Guard optional-entity card editor + group visual editor wiring."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# Assert against editable source; minified JS collapses whitespace in stub returns.
CARD = ROOT / "custom_components" / "simple_schedule" / "www" / "simple-schedule-card.src.js"


class CardEditorOptionalEntityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.src = CARD.read_text(encoding="utf-8")

    def test_solo_and_group_expose_config_element(self):
        # Both cards must return the shared visual editor (HA falls back to YAML otherwise).
        self.assertGreaterEqual(self.src.count("static getConfigElement()"), 2)
        self.assertIn(
            'document.createElement("simple-schedule-card-editor")', self.src
        )

    def test_editor_optional_entity_copy(self):
        self.assertIn("Existing schedule (optional)", self.src)
        self.assertIn("Existing group (optional)", self.src)
        self.assertIn(
            "Leave blank to create a new schedule on the card", self.src
        )
        self.assertIn(
            "Leave blank to create a new schedule group on the card", self.src
        )
        self.assertNotIn("Pick a simple_schedule entity.", self.src)
        self.assertNotIn("Pick a simple_schedule group entity.", self.src)

    def test_group_set_config_allows_blank_entity(self):
        self.assertNotIn(
            'throw new Error("entity is required")',
            self.src,
        )
        self.assertIn("_renderBlankGroupCreate", self.src)
        self.assertIn("New Schedule Group", self.src)

    def test_stub_configs_omit_entity(self):
        # New cards should start without a pre-selected entity.
        self.assertIn(
            'return { type: "custom:simple-schedule-card", time_format: "12" };',
            self.src,
        )
        self.assertIn(
            'return { type: "custom:simple-schedule-group-card", time_format: "12" };',
            self.src,
        )


if __name__ == "__main__":
    unittest.main()
