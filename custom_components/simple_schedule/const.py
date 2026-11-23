"""Constants for Simple Schedule."""

from __future__ import annotations

DOMAIN = "simple_schedule"
PLATFORMS: list[str] = []

STORAGE_KEY = f"{DOMAIN}.storage"
STORAGE_VERSION = 1

ATTR_ENABLED = "enabled"
ATTR_WEEKDAYS = "weekdays"
ATTR_WINDOWS = "windows"
ATTR_NEXT_EVENT = "next_event"
ATTR_ACTIVE_WINDOW = "active_window"
ATTR_GROUP_ID = "group_id"
ATTR_DATE_RANGE = "date_range"
ATTR_SEASON_AVAILABLE = "season_available"
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

WEEKDAYS = ("sun", "mon", "tue", "wed", "thu", "fri", "sat")
SUN_KINDS = ("dawn", "sunrise", "dusk", "sunset")
BOUND_KINDS = ("clock",) + SUN_KINDS
ACTION_DOMAINS = ("scene", "script")

CARD_URL_PATH = f"/{DOMAIN}/simple-schedule-card.js"
