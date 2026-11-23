"""Config flow for Simple Schedule."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import config_validation as cv

from .const import CONF_CREATE_SAMPLE, DOMAIN


async def _async_existing(hass: HomeAssistant) -> bool:
    return bool(hass.config_entries.async_entries(DOMAIN))


class SimpleScheduleConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if await _async_existing(self.hass):
            return self.async_abort(reason="already_configured")

        if user_input is not None:
            return self.async_create_entry(
                title="Simple Schedule",
                data={CONF_CREATE_SAMPLE: bool(user_input.get(CONF_CREATE_SAMPLE, True))},
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Optional(CONF_CREATE_SAMPLE, default=True): cv.boolean,
                }
            ),
        )

    async def async_step_import(self, user_input: dict[str, Any]) -> FlowResult:
        if await _async_existing(self.hass):
            return self.async_abort(reason="already_configured")
        return self.async_create_entry(
            title="Simple Schedule",
            data={CONF_CREATE_SAMPLE: bool(user_input.get(CONF_CREATE_SAMPLE, True))},
        )
