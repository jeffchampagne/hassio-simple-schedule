/**
 * Simple Schedule Lovelace card (solo + group).
 * Domain: simple_schedule — no Scheduler dependency.
 *  waits ·  solo date_range ·  overlapping windows
 */
(() => {
  const LitElement =
    Object.getPrototypeOf(customElements.get("ha-panel-lovelace")) ||
    Object.getPrototypeOf(customElements.get("home-assistant-main"));
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  const DOW = [
    { id: "sun", label: "S", full: "Sun" },
    { id: "mon", label: "M", full: "Mon" },
    { id: "tue", label: "T", full: "Tue" },
    { id: "wed", label: "W", full: "Wed" },
    { id: "thu", label: "T", full: "Thu" },
    { id: "fri", label: "F", full: "Fri" },
    { id: "sat", label: "S", full: "Sat" },
  ];
  const BOUND_KINDS = [
    { id: "clock", label: "Clock" },
    { id: "dawn", label: "Dawn" },
    { id: "sunrise", label: "Sunrise" },
    { id: "dusk", label: "Dusk" },
    { id: "sunset", label: "Sunset" },
  ];

  function parseHm(raw) {
    const s = String(raw || "").trim();
    let m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (m) {
      let h = Number(m[1]);
      const min = Number(m[2]);
      if (h < 0 || h > 24 || min < 0 || min > 59 || min % 15) return null;
      if (h === 24 && min !== 0) return null;
      if (h === 24) h = 0;
      return h * 60 + min;
    }
    m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(s);
    if (m) {
      let h = Number(m[1]);
      const min = Number(m[2]);
      const ap = m[3].toUpperCase();
      if (h < 1 || h > 12 || min < 0 || min > 59 || min % 15) return null;
      if (ap === "AM") {
        if (h === 12) h = 0;
      } else if (h !== 12) h += 12;
      return h * 60 + min;
    }
    return null;
  }

  function formatMins(mins, fmt) {
    mins = ((mins % 1440) + 1440) % 1440;
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    if (fmt === "24")
      return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const ap = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
  }

  function displayClock(stored24, fmt) {
    const mins = parseHm(stored24);
    if (mins == null) return stored24 || "—";
    return formatMins(mins, fmt);
  }

  function boundLabel(b) {
    if (!b) return "—";
    if (b.kind === "clock") return b.time || "—";
    const name = b.kind.charAt(0).toUpperCase() + b.kind.slice(1);
    const n = Number(b.offset_minutes || 0);
    if (!n) return name;
    const sign = n > 0 ? "+" : "−";
    const abs = Math.abs(n);
    return abs % 60 === 0
      ? `${name}${sign}${abs / 60}h`
      : `${name}${sign}${abs}m`;
  }

  function windowLabel(w, fmt) {
    if (!w) return "";
    const from = w.from || w.start;
    const to = w.to || w.end;
    if (from?.kind === "clock" && to?.kind === "clock") {
      return `${displayClock(from.time, fmt)}–${displayClock(to.time, fmt)}`;
    }
    return `${boundLabel(from)} → ${boundLabel(to)}`;
  }

  function isOvernight(w) {
    const from = w.from || w.start;
    const to = w.to || w.end;
    if (from?.kind === "clock" && to?.kind === "clock") {
      const a = parseHm(from.time);
      const b = parseHm(to.time);
      return a != null && b != null && b <= a;
    }
    return from?.kind !== "clock" || to?.kind !== "clock";
  }

  function formatDow(weekdays) {
    const d = weekdays || [];
    if (!d.length) return "No days selected";
    if (d.length === 7) return "Every day";
    const weekdaysIds = ["mon", "tue", "wed", "thu", "fri"];
    const weekend = ["sat", "sun"];
    const same = (a, b) =>
      a.length === b.length && a.every((x) => b.includes(x));
    if (same(d, weekdaysIds)) return "Mon–Fri";
    if (same(d, weekend)) return "Sat–Sun";
    return DOW.filter((x) => d.includes(x.id))
      .map((x) => x.full)
      .join(", ");
  }

  function windowsSummary(windows, fmt) {
    if (!windows?.length) return "No windows set";
    return windows.map((w) => windowLabel(w, fmt)).join(", ");
  }

  function quartersFromWindows(windows) {
    const q = Array.from({ length: 96 }, () => false);
    for (const w of windows || []) {
      const from = w.from || w.start;
      const to = w.to || w.end;
      if (from?.kind !== "clock" || to?.kind !== "clock") continue;
      const a = parseHm(from.time);
      const b = parseHm(to.time);
      if (a == null || b == null) continue;
      const ai = a / 15;
      const bi = b / 15;
      if (bi > ai) {
        for (let i = ai; i < bi; i++) q[i] = true;
      } else {
        for (let i = ai; i < 96; i++) q[i] = true;
        for (let i = 0; i < bi; i++) q[i] = true;
      }
    }
    return q;
  }

  function normalizeSteps(raw) {
    if (raw == null || raw === "" || (Array.isArray(raw) && !raw.length))
      return [];
    const list = Array.isArray(raw) ? raw : [raw];
    const out = [];
    for (const item of list) {
      if (item == null || item === "") continue;
      if (typeof item === "string") {
        out.push({ type: "action", entity_id: item });
        continue;
      }
      if (typeof item === "object") {
        if (item.type === "wait" || ("seconds" in item && !item.entity_id)) {
          const secs =
            Number(item.seconds || 0) + Number(item.minutes || 0) * 60;
          out.push({ type: "wait", seconds: Math.max(0, secs | 0) });
        } else {
          const eid = item.entity_id || item.entity;
          if (eid) out.push({ type: "action", entity_id: eid });
        }
      }
    }
    return out;
  }

  /** Coerce HA attrs to a windows array. Never treat [] as missing via `||`. */
  function coerceWindows(raw) {
    if (Array.isArray(raw)) return raw.filter((w) => w && typeof w === "object");
    if (raw && typeof raw === "object") {
      // Rare: dict keyed by id
      return Object.values(raw).filter((w) => w && typeof w === "object");
    }
    return [];
  }

  /** First non-empty windows list among candidates; else first array (maybe empty). */
  function resolveWindows(...candidates) {
    let empty = null;
    for (const c of candidates) {
      const list = coerceWindows(c);
      if (list.length) return list;
      if (empty == null && Array.isArray(c)) empty = list;
      else if (empty == null && c != null) empty = list;
    }
    return empty || [];
  }

  function clockMinuteRanges(w) {
    const from = w.from || w.start;
    const to = w.to || w.end;
    if (from?.kind !== "clock" || to?.kind !== "clock") return null;
    const a = parseHm(from.time);
    const b = parseHm(to.time);
    if (a == null || b == null) return null;
    if (b > a) return [[a, b]];
    return [
      [a, 1440],
      [0, b],
    ];
  }

  function rangesOverlap(a, b) {
    return a[0] < b[1] && b[0] < a[1];
  }

  function clockWindowsOverlap(a, b) {
    const ra = clockMinuteRanges(a);
    const rb = clockMinuteRanges(b);
    if (!ra || !rb) return false;
    for (const x of ra) for (const y of rb) if (rangesOverlap(x, y)) return true;
    return false;
  }

  function overlappingWindowIds(windows) {
    const hit = new Set();
    const list = windows || [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (clockWindowsOverlap(list[i], list[j])) {
          hit.add(list[i].id);
          hit.add(list[j].id);
        }
      }
    }
    return hit;
  }

  function dateRangeContains(dr, day) {
    if (!dr || (!dr.start && !dr.end)) return true;
    const parseMd = (value, year, recurs) => {
      const v = String(value || "").trim();
      if (/^\d{2}-\d{2}$/.test(v)) {
        const [m, d] = v.split("-").map(Number);
        return new Date(year, m - 1, d);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y, m, d] = v.split("-").map(Number);
        return recurs ? new Date(year, m - 1, d) : new Date(y, m - 1, d);
      }
      return null;
    };
    const year = day.getFullYear();
    const recurs = dr.recurs_yearly !== false;
    const start = parseMd(dr.start, year, recurs);
    const end = parseMd(dr.end, year, recurs);
    if (!start || !end) return false;
    const t = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    if (start <= end) return t >= start && t <= end;
    return t >= start || t <= end;
  }

  function formatWait(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m && r) return `${m}m ${r}s`;
    if (m) return `${m}m`;
    return `${r}s`;
  }

  function mergeQuartersToWindows(q, existing) {
    const ranges = [];
    let start = null;
    for (let i = 0; i <= 96; i++) {
      const on = i < 96 && q[i];
      if (on && start == null) start = i;
      if (!on && start != null) {
        ranges.push([start, i]);
        start = null;
      }
    }
    // Detect overnight: wrap from end+start
    if (ranges.length >= 2 && ranges[0][0] === 0 && ranges[ranges.length - 1][1] === 96) {
      const morning = ranges.shift();
      const evening = ranges.pop();
      ranges.push([evening[0], morning[1] + 96]);
    }
    return ranges.map(([a, b], idx) => {
      const overnight = b > 96;
      const fromM = a * 15;
      const toM = (overnight ? b - 96 : b) * 15;
      const from = formatMins(fromM, "24");
      const to = formatMins(toM % 1440, "24");
      const prev = (existing || [])[idx];
      return {
        id: prev?.id || `w_${Date.now()}_${idx}`,
        from: { kind: "clock", time: from },
        to: { kind: "clock", time: to },
        on_start: normalizeSteps(prev?.on_start),
        on_end: normalizeSteps(prev?.on_end),
      };
    });
  }

  function scheduleIdFromEntity(entityId, state) {
    // Prefer unique id from attributes if we stored schedule id — use object path
    // Entities are simple_schedule.<slug>; services need schedule_id from storage.
    // We keep schedule_id in attributes via custom — for now parse from attributes windows and use hass connection.
    return state?.attributes?.schedule_id || null;
  }

  class SimpleScheduleCard extends LitElement {
    static get properties() {
      return {
        hass: {},
        _config: {},
        _expanded: { type: Boolean },
        _fromKind: { type: String },
        _toKind: { type: String },
        _fromClock: { type: String },
        _toClock: { type: String },
        _fromOffset: { type: String },
        _toOffset: { type: String },
        _pickerFor: { type: String },
        _pickerQuery: { type: String },
        _error: { type: String },
        _warn: { type: String },
        _dragging: { type: Boolean },
        _dragValue: { type: Boolean },
        _stepDrag: { type: Object },
      };
    }

    static get styles() {
      return css`
        :host {
          display: block;
          /* Overlap accent — amber/gold; not error/enabled/active */
          --ss-overlap: #c9a227;
        }
        ha-card {
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          width: 100%;
          box-sizing: border-box;
        }
        /* Color precedence: Disabled > Warning > Enabled */
        .header.on {
          background: color-mix(
            in srgb,
            var(--primary-color) 18%,
            var(--card-background-color)
          );
          border-left: 4px solid var(--primary-color);
          color: var(--primary-text-color);
        }
        .header.warn {
          background: color-mix(
            in srgb,
            var(--warning-color, #ef6c00) 16%,
            var(--card-background-color)
          );
          border-left: 4px solid var(--warning-color, #ef6c00);
          color: var(--primary-text-color);
        }
        .header.off {
          background: var(--disabled-color, var(--secondary-background-color));
          color: var(--primary-text-color);
          border-left: 4px solid transparent;
          opacity: 0.85;
        }
        .title {
          flex: 1;
          min-width: 0;
          font-size: 1.25rem;
          font-weight: 650;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }
        .body {
          padding: 12px 16px 16px;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .muted {
          color: var(--secondary-text-color);
          font-size: 0.85rem;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          background: var(--secondary-background-color);
        }
        .chip.active {
          background: var(--success-color, #4caf50);
          color: #fff;
        }
        .chip.warn {
          background: color-mix(
            in srgb,
            var(--warning-color, #ef6c00) 22%,
            var(--card-background-color)
          );
          border: 1px solid var(--warning-color, #ef6c00);
          color: var(--primary-text-color);
          font-weight: 650;
        }
        .chip.overlap {
          background: color-mix(in srgb, var(--ss-overlap) 22%, transparent);
          border: 1px solid var(--ss-overlap);
          color: var(--primary-text-color);
          font-weight: 650;
        }
        .warn-banner.overlap {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin: 8px 0 0;
          padding: 10px 12px;
          border-radius: 0;
          border-left: 4px solid var(--ss-overlap);
          background: color-mix(
            in srgb,
            var(--ss-overlap) 14%,
            var(--card-background-color)
          );
          color: var(--primary-text-color);
          font-size: 0.85rem;
        }
        .error {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin: 8px 0 0;
          padding: 10px 12px;
          border-left: 4px solid var(--error-color, #db4437);
          background: color-mix(
            in srgb,
            var(--error-color, #db4437) 12%,
            var(--card-background-color)
          );
          color: var(--primary-text-color);
          font-size: 0.85rem;
        }
        .strip-wrap {
          position: relative;
          margin: 8px 0 4px;
        }
        .hours {
          position: relative;
          height: 16px;
          margin-bottom: 4px;
          font-size: 0.7rem;
          color: var(--secondary-text-color);
        }
        .hours span {
          position: absolute;
          transform: translateX(-50%);
        }
        .strip {
          display: grid;
          grid-template-columns: repeat(48, 1fr);
          gap: 1px;
          height: 40px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          padding: 2px;
          background: var(--secondary-background-color);
          user-select: none;
        }
        .strip.dim {
          opacity: 0.45;
        }
        .cell {
          position: relative;
          border-radius: 2px;
          background: var(--card-background-color);
          overflow: hidden;
          cursor: pointer;
        }
        .cell.full {
          background: var(--primary-color);
        }
        .cell .half {
          position: absolute;
          left: 0;
          right: 0;
          height: 50%;
          background: var(--primary-color);
        }
        .cell .top {
          top: 0;
        }
        .cell .bottom {
          bottom: 0;
        }
        .now {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--primary-text-color);
          opacity: 0.7;
          pointer-events: none;
          z-index: 2;
        }
        .wrap-mark {
          position: absolute;
          left: 0;
          top: -2px;
          bottom: -2px;
          width: 3px;
          background: var(--primary-text-color);
          opacity: 0.45;
          z-index: 3;
        }
        .window-card {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 10px;
          margin: 8px 0;
          background: var(--secondary-background-color);
        }
        /* Overlap: same wide left rail as .header.on/.off, amber — no full outline */
        .window-card.overlap {
          border-left: 4px solid var(--ss-overlap);
          background: color-mix(
            in srgb,
            var(--ss-overlap) 12%,
            var(--secondary-background-color)
          );
        }
        .step-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 6px;
        }
        .step-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          padding: 6px 8px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          cursor: grab;
        }
        .step-row.dragging {
          opacity: 0.55;
        }
        .step-row .handle {
          color: var(--secondary-text-color);
          font-size: 0.9rem;
          user-select: none;
        }
        .dow button {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--secondary-text-color);
          font-weight: 600;
          cursor: pointer;
        }
        .dow button.on {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border-color: var(--primary-color);
        }
        .kinds button,
        .actions button.linkish {
          margin: 2px;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          cursor: pointer;
          font-size: 0.8rem;
        }
        .kinds button.on {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
        }
        input[type="text"],
        input[type="number"] {
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          width: 110px;
        }
        .picker {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 8px;
          margin-top: 6px;
          background: var(--card-background-color);
          max-height: 220px;
          overflow: auto;
        }
        .picker button {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          margin: 4px 0;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: transparent;
          color: var(--primary-text-color);
          cursor: pointer;
        }
        .picker .id {
          font-size: 0.75rem;
          color: var(--secondary-text-color);
        }
        .spacer {
          flex: 1;
        }
        ha-switch {
          --mdc-theme-secondary: var(--primary-color);
        }
      `;
    }

    setConfig(config) {
      if (!config?.entity) throw new Error("entity is required");
      this._config = config;
      this._expanded = Boolean(config.expanded || config.start_expanded);
      this._fromKind = "clock";
      this._toKind = "clock";
      this._fromClock = "7:00 AM";
      this._toClock = "9:00 AM";
      this._fromOffset = "0";
      this._toOffset = "0";
      this._pickerFor = null;
      this._pickerQuery = "";
      this._error = null;
      this._warn = null;
      this._stepDrag = null;
    }

    getCardSize() {
      return this._expanded ? 8 : 2;
    }

    get _fmt() {
      return String(this._config?.time_format || "12") === "24" ? "24" : "12";
    }

    get _state() {
      return this.hass?.states?.[this._config.entity];
    }

    get _attrs() {
      return this._state?.attributes || {};
    }

    get _scheduleId() {
      // Stored entities use slug; schedule_id may not be in attributes.
      // Look up via attributes we add — fallback: pass entity object_id to services as object lookup.
      return this._attrs.schedule_id || this._config.schedule_id || null;
    }

    async _resolveScheduleId() {
      if (this._scheduleId) return this._scheduleId;
      // Infer from entity unique objects by matching name + windows via update using object_id path
      // Services accept schedule_id; we also accept object_id via a helper attribute.
      // read from hass connection registry of states — use entity object_id as lookup key via update_schedule with schedule_id from config.
      return this._config.schedule_id || this._config.entity?.split(".")[1];
    }

    _statusText() {
      const a = this._attrs;
      if (!a.enabled) return "Disabled";
      const inSeason =
        a.in_season !== undefined
          ? Boolean(a.in_season)
          : dateRangeContains(a.date_range, new Date());
      if (a.date_range && !inSeason) return "Out of season";
      if (this._state?.state === "on") return "Active now";
      return "Inactive";
    }

    _headerClass(enabled, status) {
      // Precedence: Disabled > Warning > Enabled
      if (!enabled) return "off";
      if (status === "Out of season") return "warn";
      return "on";
    }

    _overlapWarnFor(windows) {
      const ids = overlappingWindowIds(windows);
      if (!ids.size) return null;
      return "Overlapping windows — allowed, but they share hours. Indoor/outdoor usually stay on separate schedules.";
    }

    _nextHint() {
      const a = this._attrs;
      if (!a.enabled) return "";
      if (a.active_window?.to) {
        try {
          const end = new Date(a.active_window.to);
          const mins = end.getHours() * 60 + end.getMinutes();
          return `Ends ${formatMins(mins, this._fmt)}`;
        } catch {
          return "";
        }
      }
      if (a.next_event) {
        try {
          const n = new Date(a.next_event);
          const mins = n.getHours() * 60 + n.getMinutes();
          return `Next ${formatMins(mins, this._fmt)}`;
        } catch {
          return "";
        }
      }
      return "";
    }

    async _setEnabled(ev) {
      ev.stopPropagation();
      const sid = await this._resolveScheduleId();
      await this.hass.callService("simple_schedule", "set_enabled", {
        schedule_id: sid,
        enabled: ev.target.checked,
      });
    }

    async _persist(patch) {
      const sid = await this._resolveScheduleId();
      if (patch.windows) {
        this._warn = this._overlapWarnFor(patch.windows);
      }
      await this.hass.callService("simple_schedule", "update_schedule", {
        schedule_id: sid,
        ...patch,
      });
    }

    _toggleDow(id) {
      const cur = [...(this._attrs.weekdays || [])];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      this._persist({ weekdays: next });
    }

    _setPreset(kind) {
      if (kind === "weekdays")
        this._persist({ weekdays: ["mon", "tue", "wed", "thu", "fri"] });
      else if (kind === "weekend") this._persist({ weekdays: ["sat", "sun"] });
      else if (kind === "every")
        this._persist({ weekdays: DOW.map((d) => d.id) });
      else this._persist({ weekdays: [] });
    }

    _cellFill(q, cell) {
      const top = q[cell * 2];
      const bottom = q[cell * 2 + 1];
      if (top && bottom) return 3;
      if (top) return 1;
      if (bottom) return 2;
      return 0;
    }

    _onCellPointer(cell, fillOnly) {
      const windows = coerceWindows(this._attrs.windows);
      const q = quartersFromWindows(windows);
      const topIdx = cell * 2;
      const bottomIdx = cell * 2 + 1;
      const fill = this._cellFill(q, cell);
      let nextFill = fill;
      if (fillOnly == null) {
        // cycle: empty → full → top → bottom → empty
        nextFill = { 0: 3, 3: 1, 1: 2, 2: 0 }[fill];
      } else {
        nextFill = fillOnly ? 3 : 0;
      }
      q[topIdx] = nextFill === 3 || nextFill === 1;
      q[bottomIdx] = nextFill === 3 || nextFill === 2;
      // Preserve non-clock windows
      const sunWindows = windows.filter((w) => {
        const f = w.from || w.start;
        const t = w.to || w.end;
        return f?.kind !== "clock" || t?.kind !== "clock";
      });
      const clockWindows = mergeQuartersToWindows(q, windows);
      this._persist({ windows: [...clockWindows, ...sunWindows] });
    }

    _addWindow() {
      this._error = null;
      const windows = [...coerceWindows(this._attrs.windows)];
      if (this._fromKind === "clock" && this._toKind === "clock") {
        const a = parseHm(this._fromClock);
        const b = parseHm(this._toClock);
        if (a == null || b == null) {
          this._error = "Use valid times on 15-min steps.";
          return;
        }
        if (a === b) {
          this._error = "From and To cannot be the same.";
          return;
        }
        windows.push({
          id: `w_${Date.now()}`,
          from: { kind: "clock", time: formatMins(a, "24") },
          to: { kind: "clock", time: formatMins(b, "24") },
          on_start: [],
          on_end: [],
        });
      } else {
        windows.push({
          id: `s_${Date.now()}`,
          from:
            this._fromKind === "clock"
              ? {
                  kind: "clock",
                  time: formatMins(parseHm(this._fromClock) || 0, "24"),
                }
              : {
                  kind: this._fromKind,
                  offset_minutes: Number(this._fromOffset) || 0,
                },
          to:
            this._toKind === "clock"
              ? {
                  kind: "clock",
                  time: formatMins(parseHm(this._toClock) || 0, "24"),
                }
              : {
                  kind: this._toKind,
                  offset_minutes: Number(this._toOffset) || 0,
                },
          on_start: [],
          on_end: [],
        });
      }
      // Overlaps allowed — warn on save, do not block
      this._persist({ windows });
    }

    _removeWindow(id) {
      const windows = coerceWindows(this._attrs.windows).filter(
        (w) => w.id !== id
      );
      this._persist({ windows });
    }

    _patchWindow(id, patch) {
      const windows = coerceWindows(this._attrs.windows).map((w) =>
        w.id === id ? { ...w, ...patch } : w
      );
      this._persist({ windows });
    }

    _setSteps(windowId, field, steps) {
      this._patchWindow(windowId, { [field]: normalizeSteps(steps) });
    }

    _addActionStep(windowId, field) {
      this._pickerFor = `${windowId}:${field}:add`;
      this._pickerQuery = "";
    }

    _addWaitStep(windowId, field) {
      const w = coerceWindows(this._attrs.windows).find(
        (x) => x.id === windowId
      );
      if (!w) return;
      const steps = [...normalizeSteps(w[field]), { type: "wait", seconds: 30 }];
      this._setSteps(windowId, field, steps);
    }

    _removeStep(windowId, field, index) {
      const w = coerceWindows(this._attrs.windows).find(
        (x) => x.id === windowId
      );
      if (!w) return;
      const steps = normalizeSteps(w[field]).filter((_, i) => i !== index);
      this._setSteps(windowId, field, steps);
    }

    _updateWaitSeconds(windowId, field, index, seconds) {
      const w = coerceWindows(this._attrs.windows).find(
        (x) => x.id === windowId
      );
      if (!w) return;
      const steps = normalizeSteps(w[field]).map((s, i) =>
        i === index
          ? { type: "wait", seconds: Math.max(0, Number(seconds) || 0) }
          : s
      );
      this._setSteps(windowId, field, steps);
    }

    _onStepDragStart(windowId, field, index, ev) {
      this._stepDrag = { windowId, field, index };
      ev.dataTransfer.effectAllowed = "move";
      try {
        ev.dataTransfer.setData("text/plain", String(index));
      } catch {
        /* ignore */
      }
    }

    _onStepDrop(windowId, field, toIndex, ev) {
      ev.preventDefault();
      const drag = this._stepDrag;
      if (!drag || drag.windowId !== windowId || drag.field !== field) return;
      const w = coerceWindows(this._attrs.windows).find(
        (x) => x.id === windowId
      );
      if (!w) return;
      const steps = normalizeSteps(w[field]);
      const from = drag.index;
      if (from === toIndex || from < 0 || from >= steps.length) {
        this._stepDrag = null;
        return;
      }
      const [item] = steps.splice(from, 1);
      steps.splice(toIndex, 0, item);
      this._stepDrag = null;
      this._setSteps(windowId, field, steps);
    }

    _patchDateRange(patch) {
      const cur = this._attrs.date_range || {
        start: "",
        end: "",
        recurs_yearly: true,
      };
      const next = { ...cur, ...patch };
      if (!next.start && !next.end) {
        this._persist({ date_range: null });
        return;
      }
      this._persist({ date_range: next });
    }

    _actionEntities() {
      const out = [];
      for (const [id, st] of Object.entries(this.hass?.states || {})) {
        if (id.startsWith("scene.") || id.startsWith("script.")) {
          out.push({
            id,
            name: st.attributes.friendly_name || id,
            domain: id.split(".")[0],
          });
        }
      }
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out;
    }

    _filteredActions() {
      const q = (this._pickerQuery || "").trim().toLowerCase();
      const all = this._actionEntities();
      if (!q) return all.slice(0, 40);
      return all
        .filter(
          (a) =>
            a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
        )
        .slice(0, 40);
    }

    render() {
      const st = this._state;
      if (!st) {
        return html`<ha-card
          ><div class="body">Entity not found: ${this._config.entity}</div></ha-card
        >`;
      }
      const a = this._attrs;
      const enabled = Boolean(a.enabled);
      const fmt = this._fmt;
      // Defensive: never let a non-array / empty-group attr blank the Windows section
      const windows = resolveWindows(a.windows);
      const q = quartersFromWindows(windows);
      const overnight = windows.some(isOvernight);
      const status = this._statusText();
      const overlapIds = overlappingWindowIds(windows);
      const overlapWarn =
        this._warn || (this._expanded ? this._overlapWarnFor(windows) : null);
      const dr = a.date_range;
      const now = new Date();
      const nowQ = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15);
      const hourLabels =
        fmt === "24"
          ? [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
          : [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

      return html`
        <ha-card>
          <div class="header ${this._headerClass(enabled, status)}">
            <h2 class="title">${a.friendly_name || st.attributes.friendly_name || this._config.entity}</h2>
            <span class="muted" style="color:inherit">Enabled</span>
            <ha-switch
              .checked=${enabled}
              @change=${this._setEnabled}
              @click=${(e) => e.stopPropagation()}
            ></ha-switch>
          </div>
          <div class="body">
            <div class="row">
              <span
                class="chip ${status === "Active now"
                  ? "active"
                  : status === "Out of season"
                    ? "warn"
                    : ""}"
                >${status}</span
              >
              <span class="muted">${this._nextHint()}</span>
              <span class="spacer"></span>
              <mwc-button @click=${() => (this._expanded = !this._expanded)}
                >${this._expanded ? "▴ Collapse" : "▾ Expand"}</mwc-button
              >
            </div>
            <div class="muted" style="margin-top:6px">
              ${windowsSummary(windows, fmt)} · ${formatDow(a.weekdays)}${dr
                ? ` · ${dr.start || "—"}–${dr.end || "—"}${
                    dr.recurs_yearly !== false ? " yearly" : ""
                  }`
                : ""}
            </div>
            ${overlapWarn
              ? html`<div class="warn-banner overlap">${overlapWarn}</div>`
              : ""}

            ${this._expanded
              ? html`
                  <div style="margin-top:12px">
                    <div class="muted" style="font-weight:600;margin-bottom:4px">
                      Schedule hours
                    </div>
                    <div class="hours">
                      ${hourLabels.map((h) => {
                        let label = String(h);
                        if (fmt === "12") {
                          if (h === 0 || h === 24) label = "12a";
                          else if (h === 12) label = "12p";
                          else if (h < 12) label = `${h}a`;
                          else label = `${h - 12}p`;
                        }
                        return html`<span
                          style="left:${(h / 24) * 100}%;${h === 24
                            ? "transform:translateX(-100%)"
                            : h === 0
                              ? "transform:none"
                              : ""}"
                          >${label}</span
                        >`;
                      })}
                    </div>
                    <div class="strip-wrap">
                      <div
                        class="strip ${enabled ? "" : "dim"}"
                        @mouseleave=${() => (this._dragging = false)}
                      >
                        ${Array.from({ length: 48 }, (_, cell) => {
                          const fill = this._cellFill(q, cell);
                          return html`<div
                            class="cell ${fill === 3 ? "full" : ""}"
                            @click=${() => this._onCellPointer(cell)}
                          >
                            ${fill === 1
                              ? html`<div class="half top"></div>`
                              : ""}
                            ${fill === 2
                              ? html`<div class="half bottom"></div>`
                              : ""}
                          </div>`;
                        })}
                        <div
                          class="now"
                          style="left:${(nowQ / 96) * 100}%"
                        ></div>
                        ${overnight ? html`<div class="wrap-mark"></div>` : ""}
                      </div>
                      ${overnight
                        ? html`<div class="muted" style="font-size:0.7rem;margin-top:2px">
                            ↺ overnight window (split bands) · DOW = start day
                          </div>`
                        : ""}
                    </div>

                    <div
                      class="muted"
                      style="font-weight:600;margin-top:12px;margin-bottom:4px"
                    >
                      Windows
                    </div>
                    ${windows.length
                      ? windows.map((w) =>
                          this._renderWindowCard(w, fmt, overlapIds, {
                            onRemove: () => this._removeWindow(w.id),
                            onPatchSteps: (field, steps) =>
                              this._setSteps(w.id, field, steps),
                          })
                        )
                      : html`<div class="muted" style="margin-top:4px">
                          No windows set
                        </div>`}

                    <div style="margin-top:10px">
                      <div class="muted" style="font-weight:600">From</div>
                      <div class="kinds row">
                        ${BOUND_KINDS.map(
                          (b) => html`<button
                            class="${this._fromKind === b.id ? "on" : ""}"
                            @click=${() => (this._fromKind = b.id)}
                          >
                            ${b.label}
                          </button>`
                        )}
                      </div>
                      ${this._fromKind === "clock"
                        ? html`<input
                            type="text"
                            .value=${this._fromClock}
                            @change=${(e) => (this._fromClock = e.target.value)}
                            placeholder=${fmt === "12" ? "7:00 AM" : "07:00"}
                          />`
                        : html`<input
                            type="number"
                            .value=${this._fromOffset}
                            @change=${(e) =>
                              (this._fromOffset = e.target.value)}
                            placeholder="offset min"
                          />`}
                    </div>
                    <div style="margin-top:8px">
                      <div class="muted" style="font-weight:600">To</div>
                      <div class="kinds row">
                        ${BOUND_KINDS.map(
                          (b) => html`<button
                            class="${this._toKind === b.id ? "on" : ""}"
                            @click=${() => (this._toKind = b.id)}
                          >
                            ${b.label}
                          </button>`
                        )}
                      </div>
                      ${this._toKind === "clock"
                        ? html`<input
                            type="text"
                            .value=${this._toClock}
                            @change=${(e) => (this._toClock = e.target.value)}
                            placeholder=${fmt === "12" ? "9:00 AM" : "09:00"}
                          />`
                        : html`<input
                            type="number"
                            .value=${this._toOffset}
                            @change=${(e) => (this._toOffset = e.target.value)}
                            placeholder="offset min"
                          />`}
                    </div>
                    <div class="row" style="margin-top:8px">
                      <mwc-button raised @click=${this._addWindow}
                        >Add window</mwc-button
                      >
                    </div>
                    ${this._error
                      ? html`<div class="error">${this._error}</div>`
                      : html`<div class="muted" style="margin-top:4px">
                          Tip: To &lt; From = overnight. Ordered actions +
                          duration waits (seconds). Overlaps warn, not block.
                        </div>`}

                    <div style="margin-top:14px;font-weight:600">
                      Date range (optional)
                    </div>
                    <div class="muted">
                      Unset = year-round. When set, this schedule does not fire
                      outside the range (even if Enabled).
                    </div>
                    <div class="row" style="margin-top:6px">
                      <span class="muted">Start</span>
                      <input
                        type="text"
                        placeholder="MM-DD or YYYY-MM-DD"
                        .value=${dr?.start || ""}
                        @change=${(e) =>
                          this._patchDateRange({ start: e.target.value })}
                      />
                      <span class="muted">End</span>
                      <input
                        type="text"
                        placeholder="MM-DD or YYYY-MM-DD"
                        .value=${dr?.end || ""}
                        @change=${(e) =>
                          this._patchDateRange({ end: e.target.value })}
                      />
                    </div>
                    <div class="row" style="margin-top:8px">
                      <span class="muted">Recurs yearly</span>
                      <ha-switch
                        .checked=${dr?.recurs_yearly !== false}
                        @change=${(e) =>
                          this._patchDateRange({
                            recurs_yearly: e.target.checked,
                          })}
                      ></ha-switch>
                      <mwc-button
                        @click=${() => this._persist({ date_range: null })}
                        >Clear dates</mwc-button
                      >
                    </div>

                    <div style="margin-top:14px;font-weight:600">Days of week</div>
                    ${overnight
                      ? html`<div class="muted">
                          For overnight windows, DOW is the start day only.
                        </div>`
                      : ""}
                    <div class="dow row" style="margin-top:6px">
                      ${DOW.map((d) => {
                        const on = (a.weekdays || []).includes(d.id);
                        return html`<button
                          class="${on ? "on" : ""}"
                          @click=${() => this._toggleDow(d.id)}
                        >
                          ${d.label}
                        </button>`;
                      })}
                    </div>
                    <div class="row" style="margin-top:6px">
                      <mwc-button @click=${() => this._setPreset("weekdays")}
                        >Weekdays</mwc-button
                      >
                      <mwc-button @click=${() => this._setPreset("weekend")}
                        >Weekend</mwc-button
                      >
                      <mwc-button @click=${() => this._setPreset("every")}
                        >Every day</mwc-button
                      >
                      <mwc-button @click=${() => this._setPreset("clear")}
                        >Clear</mwc-button
                      >
                    </div>
                  </div>
                `
              : ""}
          </div>
        </ha-card>
      `;
    }

    _renderWindowCard(w, fmt, overlapIds, handlers = {}) {
      const overlaps = overlapIds?.has?.(w.id);
      const onRemove = handlers.onRemove;
      const stepApi = handlers.stepApi || null;
      return html`
        <div class="window-card ${overlaps ? "overlap" : ""}">
          <div class="row">
            <strong
              >${windowLabel(w, fmt)}${isOvernight(w)
                ? " · overnight"
                : ""}</strong
            >
            ${overlaps ? html`<span class="chip overlap">Overlaps</span>` : ""}
            <span class="spacer"></span>
            ${onRemove
              ? html`<mwc-button @click=${onRemove}>Remove</mwc-button>`
              : ""}
          </div>
          ${this._renderStepEditor(
            w,
            "on_start",
            "At start",
            isOvernight(w) ? "Runs on the selected start day (DOW)." : "",
            stepApi
          )}
          ${this._renderStepEditor(
            w,
            "on_end",
            "At end",
            isOvernight(w)
              ? "Still runs even if the end calendar day isn’t in DOW."
              : "",
            stepApi
          )}
        </div>
      `;
    }

    _renderStepEditor(w, field, label, hint, api) {
      const steps = normalizeSteps(w[field]);
      const addKey = `${w.id}:${field}:add`;
      const open = this._pickerFor === addKey;
      const setSteps =
        api?.setSteps ||
        ((windowId, f, next) => this._setSteps(windowId, f, next));
      const addWait =
        api?.addWait || ((windowId, f) => this._addWaitStep(windowId, f));
      const removeStep =
        api?.removeStep ||
        ((windowId, f, index) => this._removeStep(windowId, f, index));
      const updateWait =
        api?.updateWait ||
        ((windowId, f, index, seconds) =>
          this._updateWaitSeconds(windowId, f, index, seconds));
      const onDragStart =
        api?.onDragStart ||
        ((windowId, f, index, e) =>
          this._onStepDragStart(windowId, f, index, e));
      const onDrop =
        api?.onDrop ||
        ((windowId, f, toIndex, e) =>
          this._onStepDrop(windowId, f, toIndex, e));
      return html`
        <div style="margin-top:8px">
          <div class="muted" style="font-weight:600">${label}</div>
          ${hint ? html`<div class="muted">${hint}</div>` : ""}
          <div class="step-list">
            ${steps.map((step, index) => {
              if (step.type === "wait") {
                return html`
                  <div
                    class="step-row"
                    draggable="true"
                    @dragstart=${(e) => onDragStart(w.id, field, index, e)}
                    @dragover=${(e) => e.preventDefault()}
                    @drop=${(e) => onDrop(w.id, field, index, e)}
                  >
                    <span class="handle">⋮⋮</span>
                    <span class="chip">Wait ${formatWait(step.seconds)}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      style="width:72px"
                      title="Duration in seconds"
                      .value=${String(step.seconds ?? 0)}
                      @change=${(e) =>
                        updateWait(w.id, field, index, e.target.value)}
                    />
                    <span class="muted">sec</span>
                    <span class="spacer"></span>
                    <mwc-button
                      @click=${() => removeStep(w.id, field, index)}
                      >Remove</mwc-button
                    >
                  </div>
                `;
              }
              const st = this.hass?.states?.[step.entity_id];
              const name =
                st?.attributes?.friendly_name || step.entity_id || "—";
              return html`
                <div
                  class="step-row"
                  draggable="true"
                  @dragstart=${(e) => onDragStart(w.id, field, index, e)}
                  @dragover=${(e) => e.preventDefault()}
                  @drop=${(e) => onDrop(w.id, field, index, e)}
                >
                  <span class="handle">⋮⋮</span>
                  <div style="min-width:0;flex:1">
                    <div>${name}</div>
                    <div class="muted">${step.entity_id}</div>
                  </div>
                  <mwc-button @click=${() => removeStep(w.id, field, index)}
                    >Remove</mwc-button
                  >
                </div>
              `;
            })}
          </div>
          <div class="row" style="margin-top:6px">
            <mwc-button
              @click=${() => {
                this._pickerFor = addKey;
                this._pickerQuery = "";
              }}
              >Add action</mwc-button
            >
            <mwc-button @click=${() => addWait(w.id, field)}
              >Add wait</mwc-button
            >
          </div>
          ${open
            ? html`<div class="picker">
                <input
                  type="text"
                  style="width:100%;box-sizing:border-box"
                  placeholder="Filter by name or entity id…"
                  .value=${this._pickerQuery}
                  @input=${(e) => (this._pickerQuery = e.target.value)}
                />
                <button
                  @click=${() => {
                    this._pickerFor = null;
                  }}
                >
                  Cancel
                </button>
                ${this._filteredActions().map(
                  (act) => html`<button
                    @click=${() => {
                      const next = [
                        ...normalizeSteps(w[field]),
                        { type: "action", entity_id: act.id },
                      ];
                      setSteps(w.id, field, next);
                      this._pickerFor = null;
                    }}
                  >
                    <div>${act.name}</div>
                    <div class="id">${act.id}</div>
                  </button>`
                )}
              </div>`
            : ""}
        </div>
      `;
    }

    static getConfigElement() {
      return document.createElement("simple-schedule-card-editor");
    }

    static getStubConfig(hass) {
      const entity =
        Object.keys(hass.states).find((e) =>
          e.startsWith("simple_schedule.") && !e.includes(".group_")
        ) || "simple_schedule.sample_classroom_hours";
      return { type: "custom:simple-schedule-card", entity, time_format: "12" };
    }
  }

  class SimpleScheduleGroupCard extends LitElement {
    static get properties() {
      return {
        hass: {},
        _config: {},
        _expandedId: { type: String },
        _groupEdit: { type: Boolean },
        _hint: { type: String },
        _error: { type: String },
        _pickerFor: { type: String },
        _pickerQuery: { type: String },
        _stepDrag: { type: Object },
      };
    }

    static get styles() {
      return SimpleScheduleCard.styles;
    }

    setConfig(config) {
      if (!config?.entity) throw new Error("entity is required");
      this._config = config;
      this._expandedId = null;
      this._groupEdit = false;
      this._error = null;
      this._pickerFor = null;
      this._pickerQuery = "";
      this._stepDrag = null;
      this._hint = "Click: select → sticky → clear sticky";
    }

    // Shared window / step editors (same as solo card)
    _renderWindowCard(...args) {
      return SimpleScheduleCard.prototype._renderWindowCard.apply(this, args);
    }
    _renderStepEditor(...args) {
      return SimpleScheduleCard.prototype._renderStepEditor.apply(this, args);
    }
    _actionEntities() {
      return SimpleScheduleCard.prototype._actionEntities.call(this);
    }
    _filteredActions() {
      return SimpleScheduleCard.prototype._filteredActions.call(this);
    }

    getCardSize() {
      return 6;
    }

    get _state() {
      return this.hass?.states?.[this._config.entity];
    }

    get _groupId() {
      return this._state?.attributes?.group_id || this._config.group_id || this._config.entity?.split(".")[1]?.replace(/^group_/, "");
    }

    async _cycle(memberId) {
      const gid = this._groupId;
      await this.hass.callService("simple_schedule", "cycle_member", {
        group_id: gid,
        member_id: memberId,
      });
    }

    async _patchMemberSeason(memberId, patch) {
      await this.hass.callService("simple_schedule", "update_schedule", {
        schedule_id: memberId,
        ...patch,
      });
    }

    _memberWindows(m) {
      const memberState = this.hass?.states?.[m.entity_id];
      // Critical: do NOT use `m.windows || fallback` — empty [] is truthy and
      // blanks the Windows subsection when group attrs lag member entities.
      return resolveWindows(m.windows, memberState?.attributes?.windows);
    }

    async _persistMemberWindows(memberId, windows) {
      await this.hass.callService("simple_schedule", "update_schedule", {
        schedule_id: memberId,
        windows,
      });
    }

    _memberStepApi(memberId, windows) {
      const persist = (nextWindows) =>
        this._persistMemberWindows(memberId, nextWindows);
      const mapWindow = (windowId, fn) =>
        windows.map((w) => (w.id === windowId ? fn(w) : w));
      return {
        setSteps: (windowId, field, steps) => {
          persist(
            mapWindow(windowId, (w) => ({
              ...w,
              [field]: normalizeSteps(steps),
            }))
          );
        },
        addWait: (windowId, field) => {
          const w = windows.find((x) => x.id === windowId);
          if (!w) return;
          persist(
            mapWindow(windowId, (cur) => ({
              ...cur,
              [field]: [
                ...normalizeSteps(cur[field]),
                { type: "wait", seconds: 30 },
              ],
            }))
          );
        },
        removeStep: (windowId, field, index) => {
          persist(
            mapWindow(windowId, (cur) => ({
              ...cur,
              [field]: normalizeSteps(cur[field]).filter((_, i) => i !== index),
            }))
          );
        },
        updateWait: (windowId, field, index, seconds) => {
          persist(
            mapWindow(windowId, (cur) => ({
              ...cur,
              [field]: normalizeSteps(cur[field]).map((s, i) =>
                i === index
                  ? {
                      type: "wait",
                      seconds: Math.max(0, Number(seconds) || 0),
                    }
                  : s
              ),
            }))
          );
        },
        onDragStart: (windowId, field, index, ev) => {
          this._stepDrag = { memberId, windowId, field, index };
          ev.dataTransfer.effectAllowed = "move";
          try {
            ev.dataTransfer.setData("text/plain", String(index));
          } catch {
            /* ignore */
          }
        },
        onDrop: (windowId, field, toIndex, ev) => {
          ev.preventDefault();
          const drag = this._stepDrag;
          if (
            !drag ||
            drag.memberId !== memberId ||
            drag.windowId !== windowId ||
            drag.field !== field
          )
            return;
          const w = windows.find((x) => x.id === windowId);
          if (!w) return;
          const steps = normalizeSteps(w[field]);
          const from = drag.index;
          if (from === toIndex || from < 0 || from >= steps.length) {
            this._stepDrag = null;
            return;
          }
          const [item] = steps.splice(from, 1);
          steps.splice(toIndex, 0, item);
          this._stepDrag = null;
          persist(
            mapWindow(windowId, (cur) => ({
              ...cur,
              [field]: steps,
            }))
          );
        },
      };
    }

    async _patchGroup(patch) {
      this._error = null;
      const a = this._state?.attributes || {};
      const requireFallback =
        patch.require_fallback !== undefined
          ? Boolean(patch.require_fallback)
          : a.require_fallback !== false;
      const fallback =
        patch.fallback_member_id !== undefined
          ? patch.fallback_member_id
          : a.fallback_member;
      if (requireFallback && !fallback) {
        this._error =
          "Pick a default schedule, or turn on “Don’t require a default schedule window”.";
        return;
      }
      await this.hass.callService("simple_schedule", "update_group", {
        group_id: this._groupId,
        ...patch,
      });
    }

    async _setDontRequireDefault(on) {
      if (on) {
        await this._patchGroup({
          require_fallback: false,
          fallback_member_id: null,
        });
      } else {
        const a = this._state?.attributes || {};
        const members = a.members || [];
        const keep = a.fallback_member || members.find((m) => !m.date_range)?.id || members[0]?.id || null;
        if (!keep) {
          this._error =
            "Add a member before requiring a default schedule.";
          return;
        }
        await this._patchGroup({
          require_fallback: true,
          fallback_member_id: keep,
        });
      }
    }

    render() {
      const st = this._state;
      if (!st) {
        return html`<ha-card
          ><div class="body">Entity not found: ${this._config.entity}</div></ha-card
        >`;
      }
      const a = st.attributes || {};
      // Never filter out disabled / out-of-season members — windows must still list
      const members = Array.isArray(a.members) ? a.members : [];
      const sticky = Boolean(a.sticky);
      const rawEnabled = a.enabled_member;
      const enabledMember =
        rawEnabled && rawEnabled !== "none" ? rawEnabled : null;
      const requireFallback = a.require_fallback !== false;
      const dontRequire = !requireFallback;
      const fallbackId = a.fallback_member;
      const fmt = String(this._config?.time_format || "12") === "24" ? "24" : "12";

      return html`
        <ha-card>
          <div class="header on">
            <h2 class="title">${a.friendly_name || st.attributes.friendly_name || "Schedule group"}</h2>
            <span class="chip active">Exclusive group</span>
          </div>
          <div class="body">
            <div class="muted">
              ${this._hint}${sticky ? " · Sticky on" : " · Not sticky"}${dontRequire
                ? " · No default required"
                : fallbackId
                  ? ""
                  : " · Default missing"}
            </div>
            ${dontRequire && !enabledMember
              ? html`<div
                  class="muted"
                  style="margin-top:8px;padding:10px 12px;width:100%;box-sizing:border-box;border-left:4px solid var(--disabled-color, #9e9e9e);background:var(--secondary-background-color)"
                >
                  No schedule window is active. A default schedule is not
                  required for this group.
                </div>`
              : ""}
            ${members.map((m) => {
              const selected = m.id === enabledMember;
              const isSticky = selected && sticky;
              const expanded = this._expandedId === m.id;
              const isFallback = m.id === fallbackId;
              const windows = this._memberWindows(m);
              const overlapIds = overlappingWindowIds(windows);
              const windowsSummary =
                m.windows_summary ||
                (windows.length
                  ? windows.map((w) => windowLabel(w, fmt)).join(", ")
                  : "No windows set");
              const season = m.date_range
                ? `${m.date_range.start || "—"} – ${m.date_range.end || "—"}${
                    m.date_range.recurs_yearly ? " · yearly" : ""
                  }`
                : isFallback
                  ? "Default (no dates)"
                  : "Year-round (no dates)";
              const stepApi = this._memberStepApi(m.id, windows);
              return html`
                <div
                  style="margin-top:8px;border:1px solid var(--divider-color);border-radius:8px;overflow:hidden"
                >
                  <div
                    class="header ${selected ? "on" : "off"}"
                    style="padding:10px 12px;cursor:pointer"
                    @click=${() => this._cycle(m.id)}
                  >
                    <div style="flex:1;min-width:0">
                      <div class="row">
                        <span class="title" style="font-size:1rem">${m.name}</span>
                        ${isSticky
                          ? html`<span class="chip active">Sticky</span>`
                          : ""}
                        ${isFallback && requireFallback
                          ? html`<span class="chip">Default</span>`
                          : ""}
                      </div>
                      <div class="muted" style="color:inherit;opacity:0.9">
                        ${season} · ${windowsSummary}
                      </div>
                    </div>
                    <mwc-button
                      @click=${(e) => {
                        e.stopPropagation();
                        this._expandedId = expanded ? null : m.id;
                      }}
                      >${expanded ? "▴ Collapse" : "▾ Expand"}</mwc-button
                    >
                  </div>
                  ${expanded
                    ? html`<div class="body">
                        <div class="muted" style="font-weight:600">Windows</div>
                        ${windows.length
                          ? windows.map((w) =>
                              this._renderWindowCard(w, fmt, overlapIds, {
                                onRemove: () =>
                                  this._persistMemberWindows(
                                    m.id,
                                    windows.filter((x) => x.id !== w.id)
                                  ),
                                stepApi,
                              })
                            )
                          : html`<div class="muted" style="margin-top:4px">
                              No windows set
                            </div>`}
                        <div
                          class="muted"
                          style="font-weight:600;margin-top:14px"
                        >
                          Season (dates only)
                        </div>
                        <div class="row" style="margin-top:6px">
                          <span class="muted">Start</span>
                          <input
                            type="text"
                            placeholder="MM-DD or YYYY-MM-DD"
                            .value=${m.date_range?.start || ""}
                            @change=${(e) =>
                              this._patchMemberSeason(m.id, {
                                date_range: {
                                  start: e.target.value,
                                  end: m.date_range?.end || "",
                                  recurs_yearly: m.date_range?.recurs_yearly !== false,
                                },
                              })}
                          />
                          <span class="muted">End</span>
                          <input
                            type="text"
                            placeholder="MM-DD or YYYY-MM-DD"
                            .value=${m.date_range?.end || ""}
                            @change=${(e) =>
                              this._patchMemberSeason(m.id, {
                                date_range: {
                                  start: m.date_range?.start || "",
                                  end: e.target.value,
                                  recurs_yearly: m.date_range?.recurs_yearly !== false,
                                },
                              })}
                          />
                        </div>
                        <div class="row" style="margin-top:8px">
                          <span class="muted">Recurs yearly</span>
                          <ha-switch
                            .checked=${m.date_range?.recurs_yearly !== false}
                            @change=${(e) =>
                              this._patchMemberSeason(m.id, {
                                date_range: {
                                  start: m.date_range?.start || "",
                                  end: m.date_range?.end || "",
                                  recurs_yearly: e.target.checked,
                                },
                              })}
                          ></ha-switch>
                          <span class="muted">Season available</span>
                          <ha-switch
                            .checked=${m.season_available !== false}
                            @change=${(e) =>
                              this._patchMemberSeason(m.id, {
                                season_available: e.target.checked,
                              })}
                          ></ha-switch>
                        </div>
                      </div>`
                    : ""}
                </div>
              `;
            })}

            <div style="margin-top:12px">
              <mwc-button
                @click=${() => (this._groupEdit = !this._groupEdit)}
                >${this._groupEdit ? "▴ Collapse" : "▾ Edit"}</mwc-button
              >
            </div>
            ${this._groupEdit
              ? html`<div style="margin-top:10px">
                  ${requireFallback
                    ? html`
                        <div class="muted" style="font-weight:600">
                          Default schedule
                        </div>
                        <div class="muted">
                          Used when no seasonal member matches today’s date.
                        </div>
                        <div class="row" style="margin-top:6px;flex-wrap:wrap">
                          ${members.map(
                            (m) => html`<button
                              class="linkish ${fallbackId === m.id ? "on" : ""}"
                              style="margin:2px;padding:4px 8px;border-radius:6px;border:1px solid var(--divider-color);background:${fallbackId ===
                              m.id
                                ? "var(--primary-color)"
                                : "var(--card-background-color)"};color:${fallbackId ===
                              m.id
                                ? "var(--text-primary-color, #fff)"
                                : "var(--primary-text-color)"};cursor:pointer"
                              @click=${() =>
                                this._patchGroup({
                                  require_fallback: true,
                                  fallback_member_id: m.id,
                                })}
                            >
                              ${m.name}
                            </button>`
                          )}
                        </div>
                      `
                    : ""}
                  <div
                    class="row"
                    style="margin-top:14px;padding-top:10px;border-top:1px solid var(--divider-color)"
                  >
                    <span style="flex:1;min-width:0"
                      >Don't require a default schedule window</span
                    >
                    <ha-switch
                      .checked=${dontRequire}
                      @change=${(e) =>
                        this._setDontRequireDefault(e.target.checked)}
                    ></ha-switch>
                  </div>
                  ${this._error
                    ? html`<div class="error">${this._error}</div>`
                    : ""}
                </div>`
              : ""}
          </div>
        </ha-card>
      `;
    }

    static getConfigElement() {
      return document.createElement("simple-schedule-card-editor");
    }

    static getStubConfig(hass) {
      const entity =
        Object.keys(hass.states).find((e) =>
          e.startsWith("simple_schedule.group_")
        ) || "simple_schedule.group_sample_outdoor_lighting";
      return {
        type: "custom:simple-schedule-group-card",
        entity,
        time_format: "12",
      };
    }
  }

  class SimpleScheduleCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, _config: {} };
    }

    static get styles() {
      return css`
        .wrap {
          padding: 8px 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .label {
          font-weight: 600;
          margin-bottom: 6px;
        }
        .hint {
          color: var(--secondary-text-color);
          font-size: 0.85rem;
          margin-top: 4px;
        }
        .tf-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tf-row button {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          cursor: pointer;
          font-weight: 600;
        }
        .tf-row button.on {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border-color: var(--primary-color);
        }
        ha-entity-picker {
          display: block;
          width: 100%;
        }
      `;
    }

    setConfig(config) {
      this._config = config || {};
    }

    get _fmt() {
      return String(this._config?.time_format || "12") === "24" ? "24" : "12";
    }

    get _isGroupCard() {
      const t = this._config?.type || "";
      return t.includes("simple-schedule-group-card");
    }

    render() {
      if (!this._config) return html``;
      const fmt = this._fmt;
      return html`
        <div class="wrap">
          <div>
            <div class="label">Entity</div>
            <ha-entity-picker
              .hass=${this.hass}
              .value=${this._config.entity || ""}
              .includeDomains=${["simple_schedule"]}
              .label=${"Entity"}
              allow-custom-entity
              @value-changed=${this._entityChanged}
            ></ha-entity-picker>
            <div class="hint">
              ${this._isGroupCard
                ? "Pick a simple_schedule group entity."
                : "Pick a simple_schedule entity."}
            </div>
          </div>
          <div>
            <div class="label">Time format</div>
            <div class="tf-row">
              <button
                type="button"
                class="${fmt === "12" ? "on" : ""}"
                @click=${() => this._update({ time_format: "12" })}
              >
                12-hour
              </button>
              <button
                type="button"
                class="${fmt === "24" ? "on" : ""}"
                @click=${() => this._update({ time_format: "24" })}
              >
                24-hour
              </button>
            </div>
          </div>
        </div>
      `;
    }

    _entityChanged(ev) {
      const value = ev.detail?.value ?? "";
      this._update({ entity: value || undefined });
    }

    _update(patch) {
      // Preserve YAML-only keys (e.g. schedule_id) — not shown in UI
      this._config = { ...this._config, ...patch };
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  customElements.define("simple-schedule-card", SimpleScheduleCard);
  customElements.define("simple-schedule-group-card", SimpleScheduleGroupCard);
  customElements.define("simple-schedule-card-editor", SimpleScheduleCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "simple-schedule-card",
    name: "Simple Schedule Card",
    description:
      "Create a set of schedules that can operate independently.",
    preview: false,
  });
  window.customCards.push({
    type: "simple-schedule-group-card",
    name: "Simple Schedule Group Card",
    description:
      "Create a group of schedules where only one schedule is active at any given time. Example: A Normal, Halloween, and Christmas lighting schedule",
    preview: false,
  });
})();
