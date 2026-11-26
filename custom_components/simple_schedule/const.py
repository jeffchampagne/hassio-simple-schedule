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
ATTR_STICKY = "sticky"
ATTR_ENABLED_MEMBER = "enabled_member"
ATTR_ACTIVE_MEMBER = "active_member"
ATTR_FALLBACK_MEMBER = "fallback_member"
ATTR_MEMBERS = "members"
ATTR_EXCLUSIVE = "exclusive"

CONF_CREATE_SAMPLE = "create_sample"

EVENT_WINDOW_STARTED = f"{DOMAIN}_window_started"
EVENT_WINDOW_ENDED = f"{DOMAIN}_window_ended"
EVENT_ACTION_FAILED = f"{DOMAIN}_action_failed"

WEEKDAYS = ("sun", "mon", "tue", "wed", "thu", "fri", "sat")
SUN_KINDS = ("dawn", "sunrise", "dusk", "sunset")
BOUND_KINDS = ("clock",) + SUN_KINDS
# Legacy entity-id actions only; new actions allow any domain.service (no allowlist).
LEGACY_ACTION_DOMAINS = ("scene", "script")
# Back-compat alias used by older call sites during transition.
ACTION_DOMAINS = LEGACY_ACTION_DOMAINS

CONDITION_OPS = ("=", "!=", "<", ">")
CONDITION_NUMERIC_OPS = ("<", ">")
CONDITION_MATCH_ALL = "all"
CONDITION_MATCH_ANY = "any"
CONDITION_MATCH_MODES = (CONDITION_MATCH_ALL, CONDITION_MATCH_ANY)

STEP_TYPE_ACTION = "action"
STEP_TYPE_WAIT = "wait"
STEP_TYPES = (STEP_TYPE_ACTION, STEP_TYPE_WAIT)

CARD_URL_PATH = f"/{DOMAIN}/simple-schedule-card.js"
