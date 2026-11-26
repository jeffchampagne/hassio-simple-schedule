# Simple Schedule

Simple Schedule helps you turn things on and off in Home Assistant on a weekly calendar—like outdoor lights after sunset, or Halloween décor only in October.

It has two parts that work together:

1. **The integration** — the “brain” that stores your schedules and runs them.
2. **The cards** — the on-screen editors you add to a dashboard to create and change schedules.

---

## Two kinds of cards

| Card | What it’s for |
|------|----------------|
| **Simple Schedule Card** | One schedule that can run on its own (a “solo” schedule). |
| **Simple Schedule Group Card** | A set of related seasonal options where **only one is selected at a time**—for example Normal, Halloween, and Christmas outdoor lighting. |

---

## Words we use (important)

Simple Schedule uses two similar words that mean different things:

| Term | Plain meaning | Example |
|------|----------------|---------|
| **Schedule window** | In a **group**, the date range for one seasonal option (when that option is allowed to be selected). | Halloween = Oct 1–Oct 31 |
| **Schedule** | A **time slot** inside a solo or a group member—when something should actually be “running.” | Sunset → Sunrise, or 8:00 PM–9:00 PM |

In everyday talk you might say “window” for both. On the card and in this README, **schedule window** = dates for a group member; **schedule** = hours/times.

---

## Install

Home Assistant **2024.1** or newer.

### Option A — HACS (recommended)

1. Open **HACS**.
2. Open the menu (⋮) → **Custom repositories**.
3. Add: `https://github.com/jeffchampagne/hassio-simple-schedule`  
   Category: **Integration**.
4. Find **Simple Schedule**, click **Download**.
5. **Restart Home Assistant**.
6. Go to **Settings → Devices & services → Add integration** → search **Simple Schedule**.  
   You can optionally create a few sample schedules to explore.

### Option B — Manual

1. Copy the folder `custom_components/simple_schedule` into your Home Assistant `custom_components` folder.
2. Restart Home Assistant.
3. Add the integration the same way as step 6 above.

### Add the cards to a dashboard

1. Open a dashboard → **Edit** → **Add card**.
2. Search for **Simple Schedule Card** or **Simple Schedule Group Card**.
3. Pick the schedule or group entity, then save.

The integration also serves the card file at `/simple_schedule/simple-schedule-card.js`. After an update, if a card looks outdated, see [Troubleshooting](#troubleshooting).

---

## Solo schedules vs groups

### Solo schedule

A single schedule entity (for example `simple_schedule.outside_sign`). You set:

- Which **days of the week** it may run
- One or more **schedules** (time slots)
- Optional **start of season / end of season** dates
- What to do **when a time slot starts** and **when it ends**

### Group schedule

A group entity (for example `simple_schedule.group_outdoor_lights`) holds several **schedule windows** (members). Only one member is **selected** at a time. Typical use:

- **Normal** — year-round default  
- **Halloween** — October only  
- **Christmas** — December only  

Tap a member to select it. Tap again to **lock** it (sticky) so automatic season changes won’t switch away. Tap again to unlock.

---

## Building a schedule (time slot)

Open a solo card (or expand a group member) and use **Edit**.

### Start and end times

Each schedule has a **From** and **To** time. You can use:

- Clock time (15-minute steps), or  
- Sun times: **Dawn**, **Sunrise**, **Dusk**, **Sunset**

Sun times can include an **offset** (for example sunset + 30 minutes). Home Assistant’s `sun.sun` entity supplies those times for your location.

### Days of the week

Pick which days the schedule may start. The week is shown **Sunday first**.

### Overnight schedules

If **To** is earlier than **From** (for example 10:00 PM → 6:00 AM), that is an overnight schedule.  
**All start/end actions follow the day the schedule starts**—not the morning it ends.

### More than one schedule

You can add several time slots on the same solo or member (for example Sunset→Sunrise every day, plus a short 8–9 PM accent). Use **Duplicate** to copy days, conditions, and actions onto a new slot (you set the new times yourself).

---

## What runs when a schedule starts or ends

On each time slot you can set ordered steps for **start** and **end**:

1. **Actions** — usually turn on a scene or run a script; other Home Assistant services are supported too.  
2. **Waits** — pause a number of **seconds** between actions (the card shows a friendlier “1m 30s” style when helpful).

You can also set **default** start/end actions on the schedule itself; a time slot can override those.

---

## Optional date ranges (solos and group members)

You can limit when a schedule is in season:

- Enter a **start** and **end** date (month-day, or a full year-month-day for a one-time span).
- **Recurs yearly** (on by default) means Halloween-style ranges return every year.

If today is outside that range, a solo schedule will **not** become active (it shows as out of season), even if it is enabled.

---

## Conditions (extra “only if…”)

On a time slot you can require other entities to match a state—for example only run when a “building mode” helper is `home`.

- Operators: `=`, `!=`, `<`, `>`
- Match **all** conditions, or **any** one of them

If conditions are not met, that time slot stays inactive even during its hours.

---

## Groups: default schedule window

Every group can designate one member as the **Default** schedule window—the catch-all when no seasonal member matches today’s date.

In the group card **Edit** area you can:

- Pick which member is the default, or  
- Tap **Don’t require a default schedule window** so the group is allowed to have **no** member selected out of season.

When that setting is on and nothing is selected, the card shows:  
*“No schedule window is active. A default schedule is not required for this group.”*

---

## Active vs Active Now (group chips)

On a **selected** group member you’ll see a chip:

| Chip | Meaning |
|------|---------|
| **Active** | This schedule window is selected for the group, but its time slots are not currently running. |
| **Active Now** | Selected **and** at least one of its time slots is currently on. |

A lock icon means the selection is **sticky** (won’t auto-change with the season until you unlock it).

---

## Overlaps

| Situation | What happens |
|-----------|----------------|
| Two **schedules** (time slots) overlap—clock, sun, or mixed | **Allowed.** The card shows a warning and an amber **Overlaps** marker. Confirm that’s what you want. |
| Two **schedule windows** in the same group have overlapping date ranges | **Blocked** (error). The default / fallback member is exempt from that date check. |

---

## Enable, disable, and delete

- Use the enable control on a solo card to turn a schedule off without deleting it.  
- Group members can be marked unavailable for the season from the group editor.  
- You can delete individual time slots, or remove a whole schedule / group from the card when you’re sure.

---

## Card editor options

When you edit the card (pencil in the dashboard editor):

- **Entity** — pick a `simple_schedule` entity (solo or group) with the entity picker.  
- **Time format** — **12-hour** (default) or **24-hour**.

---

## Using schedules in automations and scripts

Every solo schedule is a Home Assistant entity under the `simple_schedule` domain. Its **state** is the simplest “is it running right now?” signal:

| Entity type | State values | Meaning |
|-------------|--------------|---------|
| Solo schedule (e.g. `simple_schedule.outside_sign`) | `on` / `off` | `on` = at least one of its time slots is currently active; `off` = not active right now. |
| Group (e.g. `simple_schedule.group_outdoor_lights`) | member id, or `none` | Which schedule window is **selected**—not whether lights are currently running. |

Useful **attributes** on a solo:

| Attribute | Meaning |
|-----------|---------|
| `enabled` | Master on/off for the schedule. |
| `in_season` | Whether today’s date is inside its optional date range (always true if no range). |
| `active_window` | Details of a currently active time slot (`id`, `from`, `to`, `overnight`), or empty when off. |
| `next_event` | Next start/end transition time (ISO timestamp), if any. |
| `weekdays`, `windows`, `date_range` | Full configuration (heavier; usually not needed in simple automations). |

Useful **attributes** on a group:

| Attribute | Meaning |
|-----------|---------|
| `enabled_member` | Selected schedule window id (same idea as the group state). |
| `active_member` | Member whose solo entity is currently `on` (actually running), if any. |
| `fallback_member` | Default schedule window id. |
| `sticky` | Whether the selection is locked. |
| `require_fallback` | Whether a default schedule window is required. |
| `members` | List of members with names, entity ids, and season info. |

### In the UI

1. Open an automation → **Add condition** (or **Add trigger**).  
2. Choose **State** (sometimes labeled with entity state).  
3. Pick your `simple_schedule.…` entity.  
4. For a solo: set the state to `on` (active) or `off` (inactive).  
5. For a group: set the state to a member id, or `none`.

You can also use **Entity** conditions that check an attribute (for example `in_season` is `true`).

### YAML examples

**Condition — only continue while a solo schedule is active:**

```yaml
condition: state
entity_id: simple_schedule.outside_sign
state: "on"
```

**Trigger — when that schedule becomes active:**

```yaml
trigger:
  - platform: state
    entity_id: simple_schedule.outside_sign
    to: "on"
```

**Condition — Outdoor Lights group has Christmas selected:**

```yaml
condition: state
entity_id: simple_schedule.group_outdoor_lights
state: outdoor_lights_christmas   # use your member’s schedule id
```

**Optional — fire on the integration’s bus events** (advanced): when a time slot starts or ends, Home Assistant also fires `simple_schedule_window_started` and `simple_schedule_window_ended`. Those work as **Event** triggers if you need them.

> **Note:** Solo schedules use the states `on` / `off` (easy for State conditions). They are **not** a separate `binary_sensor` entity—just use the `simple_schedule.*` entity itself. Group entities do **not** use `on`/`off`; use the selected member id, or check a member’s solo entity for `on`/`off` if you care about “running right now.”

---

## Troubleshooting

**The card still looks like an old version after updating**  
Hard-refresh the page, or clear this site’s browser data for your Home Assistant URL, then reload. Browsers often cache the card JavaScript for a long time.

**Entity not found on the card**  
Confirm the Simple Schedule integration is loaded and that you picked a `simple_schedule` entity in the card editor.

**Nothing runs**  
Check that the schedule is enabled, in season (if it has dates), that today’s weekday is selected, and that any conditions (like building mode) currently match.

---

## License

MIT
