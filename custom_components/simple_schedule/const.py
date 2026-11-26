"""Constants for Simple Schedule."""

from __future__ import annotations

DOMAIN = "simple_schedule"
PLATFORMS: list[str] = []

STORAGE_KEY = f"{DOMAIN}.storage"
# v2: window/default actions are {service, target, data} (legacy scene.*/script.* strings migrated).
# v3: optional per-window conditions + condition_match (all/any).
# v4: on_start/on_end (window + schedule defaults) are ordered action lists.
# v5: action lists may include wait steps {type:"wait", seconds}; solo date_range gates; multi-active windows.
STORAGE_VERSION = 5

ATTR_ENABLED = "enabled"
ATTR_WEEKDAYS = "weekdays"
ATTR_WINDOWS = "windows"
ATTR_NEXT_EVENT = "next_event"
ATTR_ACTIVE_WINDOW = "active_window"
ATTR_GROUP_ID = "group_id"
ATTR_DATE_RANGE = "date_range"
ATTR_SEASON_AVAILABLE = "season_available"
ATTR_IN_SEASON = "in_season"
ATTR_DEFAULT_ON_START = "default_on_start"
ATTR_DEFAULT_ON_END = "default_on_end"

CONF_CREATE_SAMPLE = "create_sample"

# Backup poll: point timers + condition listeners cover most transitions.
# 60 s keeps worst-case catch-up short when a timer drifts; sun.sun next_*
# attribute changes also trigger an immediate replan.
TICK_INTERVAL_SECONDS = 60
SUN_ENTITY_ID = "sun.sun"
# Attributes that affect bound resolution (see evaluator.SUN_ATTR / SUN_ATTR_TODAY).
SUN_REPLAN_ATTRS = (
    "next_dawn",
    "next_rising",
    "next_dusk",
    "next_setting",
    "dawn",
    "rising",
    "dusk",
    "setting",
)

EVENT_WINDOW_STARTED = f"{DOMAIN}_window_started"
EVENT_WINDOW_ENDED = f"{DOMAIN}_window_ended"
EVENT_ACTION_FAILED = f"{DOMAIN}_action_failed"

WEEKDAYS = ("sun", "mon", "tue", "wed", "thu", "fri", "sat")
SUN_KINDS = ("dawn", "sunrise", "dusk", "sunset")
BOUND_KINDS = ("clock",) + SUN_KINDS
# Legacy entity-id actions only; new actions allow any domain.service (no allowlist).
LEGACY_ACTION_DOMAINS = ("scene", "script")

CONDITION_OPS = ("=", "!=", "<", ">")
CONDITION_NUMERIC_OPS = ("<", ">")
CONDITION_MATCH_ALL = "all"
CONDITION_MATCH_ANY = "any"
CONDITION_MATCH_MODES = (CONDITION_MATCH_ALL, CONDITION_MATCH_ANY)

STEP_TYPE_ACTION = "action"
STEP_TYPE_WAIT = "wait"
STEP_TYPES = (STEP_TYPE_ACTION, STEP_TYPE_WAIT)

CARD_URL_PATH = f"/{DOMAIN}/simple-schedule-card.js"
