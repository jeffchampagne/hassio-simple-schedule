# Simple Schedule (Home Assistant)

Weekly availability windows with optional scene/script hooks, exclusive groups, and seasonal date ranges.

- **Domain:** `simple_schedule`
- **No dependency** on nielsfaber Scheduler
- **Card default time format:** 12-hour
- **Week starts:** Sunday
- **Overnight windows:** allowed (DOW = start day)

## Install (manual)

1. Copy `custom_components/simple_schedule` into your HA `custom_components/` folder.
2. Restart Home Assistant.
3. Add **Settings → Devices & Services → Add Integration → Simple Schedule** (optionally create sample schedules).
4. Register the Lovelace resource (either works):
   - URL served by the integration: `/simple_schedule/simple-schedule-card.js` (module)
   - Or copy `www/simple-schedule-card.js` to HA `www/` and use `/local/simple-schedule-card.js`
5. Add cards:

```yaml
type: custom:simple-schedule-card
entity: simple_schedule.sample_classroom_hours
time_format: "12"
```

```yaml
type: custom:simple-schedule-group-card
entity: simple_schedule.group_sample_outdoor_lighting
```

## Features

| Feature | Notes |
|---|---|
| Windows | Clock or sun (dawn/sunrise/dusk/sunset) ± offset |
| On start / On end | At most one `scene.*` or `script.*` each |
| DOW | Sunday-first; overnight uses start day |
| Groups | Exclusive enable + season dates + sticky click cycle |
| Events | `simple_schedule_window_started` / `simple_schedule_window_ended` |

## Services

- `simple_schedule.create_schedule` / `update_schedule` / `delete_schedule`
- `simple_schedule.set_enabled`
- `simple_schedule.create_group` / `update_group` / `delete_group`
- `simple_schedule.select_member` / `cycle_member`

Schedule/group ids accept storage ids, object ids, or entity ids.

## License

MIT
