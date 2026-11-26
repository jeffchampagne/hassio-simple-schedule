"""Minimal Home Assistant + voluptuous stubs for offline import/smoke tests."""

from __future__ import annotations

import sys
import types
from datetime import datetime
from zoneinfo import ZoneInfo


def _pkg(name: str) -> types.ModuleType:
    """Create/return a package-like module (has __path__)."""
    mod = sys.modules.get(name)
    if mod is None:
        mod = types.ModuleType(name)
        sys.modules[name] = mod
    if not hasattr(mod, "__path__"):
        mod.__path__ = []  # type: ignore[attr-defined]
    return mod


def install_ha_stubs() -> None:
    """Install stub modules so companion Python can import without Home Assistant."""
    if "homeassistant" in sys.modules and getattr(
        sys.modules["homeassistant"], "_ss_stub", False
    ):
        return

    ha = _pkg("homeassistant")
    ha._ss_stub = True  # type: ignore[attr-defined]

    ha_core = types.ModuleType("homeassistant.core")
    ha_const = types.ModuleType("homeassistant.const")
    ha_cfg = types.ModuleType("homeassistant.config_entries")
    ha_helpers = _pkg("homeassistant.helpers")
    ha_helpers_cv = types.ModuleType("homeassistant.helpers.config_validation")
    ha_helpers_entity = types.ModuleType("homeassistant.helpers.entity")
    ha_helpers_entity_component = types.ModuleType(
        "homeassistant.helpers.entity_component"
    )
    ha_helpers_event = types.ModuleType("homeassistant.helpers.event")
    ha_helpers_restore = types.ModuleType("homeassistant.helpers.restore_state")
    ha_helpers_storage = types.ModuleType("homeassistant.helpers.storage")
    ha_helpers_typing = types.ModuleType("homeassistant.helpers.typing")
    ha_util = _pkg("homeassistant.util")
    ha_util_dt = types.ModuleType("homeassistant.util.dt")
    ha_components = _pkg("homeassistant.components")
    ha_components_http = types.ModuleType("homeassistant.components.http")
    ha_data_entry = types.ModuleType("homeassistant.data_entry_flow")

    class HomeAssistant:  # noqa: D101
        pass

    class ServiceCall:  # noqa: D101
        pass

    class ConfigEntry:  # noqa: D101
        pass

    class ConfigFlow:  # noqa: D101
        def __init_subclass__(cls, domain=None, **kwargs):  # noqa: ANN001
            return super().__init_subclass__(**kwargs)

    class Entity:  # noqa: D101
        pass

    class RestoreEntity(Entity):  # noqa: D101
        pass

    class EntityComponent:  # noqa: D101
        def __init__(self, *args, **kwargs):  # noqa: ANN002, ANN003
            pass

    class Store:  # noqa: D101
        def __init__(self, *args, **kwargs):  # noqa: ANN002, ANN003
            pass

        @classmethod
        def __class_getitem__(cls, _item):  # noqa: ANN001, ANN206
            return cls

    class StaticPathConfig:  # noqa: D101
        def __init__(self, *args, **kwargs):  # noqa: ANN002, ANN003
            pass

    class FlowResult(dict):  # noqa: D101
        pass

    def callback(fn):  # noqa: ANN001, ANN201
        return fn

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

    ha_core.HomeAssistant = HomeAssistant
    ha_core.ServiceCall = ServiceCall
    ha_core.callback = callback
    ha_const.EVENT_HOMEASSISTANT_STARTED = "homeassistant_started"
    ha_const.Platform = types.SimpleNamespace()
    ha_cfg.ConfigEntry = ConfigEntry
    ha_cfg.ConfigFlow = ConfigFlow
    ha_helpers_entity.Entity = Entity
    ha_helpers_entity_component.EntityComponent = EntityComponent
    ha_helpers_restore.RestoreEntity = RestoreEntity
    ha_helpers_storage.Store = Store
    ha_helpers_typing.ConfigType = dict
    ha_helpers_event.async_track_point_in_time = lambda *a, **k: (lambda: None)
    ha_helpers_event.async_track_time_interval = lambda *a, **k: (lambda: None)
    ha_helpers_event.async_track_state_change_event = lambda *a, **k: (lambda: None)
    ha_helpers_cv.boolean = bool
    ha_helpers_cv.entity_id = str
    ha_helpers_cv.string = str
    ha_helpers_cv.ensure_list = lambda x: list(x) if not isinstance(x, list) else x
    ha_components_http.StaticPathConfig = StaticPathConfig
    ha_data_entry.FlowResult = FlowResult
    ha_util_dt.as_local = _DT.as_local
    ha_util_dt.now = _DT.now
    ha_util_dt.get_time_zone = _DT.get_time_zone
    ha_util_dt.parse_datetime = _DT.parse_datetime
    ha_util_dt.UTC = _DT.UTC
    ha_util.dt = ha_util_dt

    # Wire package attributes for `from homeassistant.helpers import X`
    ha_helpers.config_validation = ha_helpers_cv  # type: ignore[attr-defined]
    ha_helpers.entity = ha_helpers_entity  # type: ignore[attr-defined]
    ha_helpers.entity_component = ha_helpers_entity_component  # type: ignore[attr-defined]
    ha_helpers.event = ha_helpers_event  # type: ignore[attr-defined]
    ha_helpers.restore_state = ha_helpers_restore  # type: ignore[attr-defined]
    ha_helpers.storage = ha_helpers_storage  # type: ignore[attr-defined]
    ha_helpers.typing = ha_helpers_typing  # type: ignore[attr-defined]
    ha_components.http = ha_components_http  # type: ignore[attr-defined]
    ha.config_entries = ha_cfg  # type: ignore[attr-defined]

    modules = {
        "homeassistant": ha,
        "homeassistant.core": ha_core,
        "homeassistant.const": ha_const,
        "homeassistant.config_entries": ha_cfg,
        "homeassistant.helpers": ha_helpers,
        "homeassistant.helpers.config_validation": ha_helpers_cv,
        "homeassistant.helpers.entity": ha_helpers_entity,
        "homeassistant.helpers.entity_component": ha_helpers_entity_component,
        "homeassistant.helpers.event": ha_helpers_event,
        "homeassistant.helpers.restore_state": ha_helpers_restore,
        "homeassistant.helpers.storage": ha_helpers_storage,
        "homeassistant.helpers.typing": ha_helpers_typing,
        "homeassistant.util": ha_util,
        "homeassistant.util.dt": ha_util_dt,
        "homeassistant.components": ha_components,
        "homeassistant.components.http": ha_components_http,
        "homeassistant.data_entry_flow": ha_data_entry,
    }
    for name, mod in modules.items():
        sys.modules[name] = mod

    # voluptuous — enough for schema construction at import time
    if "voluptuous" not in sys.modules:
        vol = types.ModuleType("voluptuous")

        class Invalid(Exception):
            pass

        class Schema:
            def __init__(self, schema, **kwargs):  # noqa: ANN001, ANN003
                self.schema = schema

            def __call__(self, data):  # noqa: ANN001, ANN204
                return data

        class Any:
            def __init__(self, *args):  # noqa: ANN002
                self.args = args

        class Optional:
            def __init__(self, key, default=None):  # noqa: ANN001
                self.key = key
                self.default = default

        class Required:
            def __init__(self, key, default=None):  # noqa: ANN001
                self.key = key
                self.default = default

        vol.Schema = Schema
        vol.Any = Any
        vol.Optional = Optional
        vol.Required = Required
        vol.Invalid = Invalid
        vol.ALLOW_EXTRA = object()
        vol.PREVENT_EXTRA = object()
        vol.REMOVE_EXTRA = object()
        vol.Coerce = lambda t: t
        vol.All = lambda *a: (lambda v: v)
        vol.In = lambda x: (lambda v: v)
        vol.Length = lambda **k: (lambda v: v)
        vol.Range = lambda **k: (lambda v: v)
        sys.modules["voluptuous"] = vol
