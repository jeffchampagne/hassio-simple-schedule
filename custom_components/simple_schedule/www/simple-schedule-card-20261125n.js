/* CACHEBUST:20261125n Close targets, persist action drag reorder, per-line action summary */
/**
 * Simple Schedule Lovelace card (solo + group).
 * Domain: simple_schedule — no Scheduler dependency.
 */
(() => {
  // extra_module_url can load before Lovelace panel custom elements exist.
  // Object.getPrototypeOf(undefined) throws and prevents customElements.define.
  const defineWhenReady = () => {
    const base =
      customElements.get("ha-panel-lovelace") ||
      customElements.get("hui-view") ||
      customElements.get("home-assistant-main") ||
      customElements.get("home-assistant");
    if (!base) {
      customElements.whenDefined("home-assistant").then(() => setTimeout(defineWhenReady, 50));
      setTimeout(defineWhenReady, 100);
      return;
    }
    const LitElement = Object.getPrototypeOf(base);
    if (!LitElement?.prototype?.html || !LitElement?.prototype?.css) {
      setTimeout(defineWhenReady, 100);
      return;
    }
    const html = LitElement.prototype.html;
    const css = LitElement.prototype.css;
    boot(LitElement, html, css);
  };

  const boot = (LitElement, html, css) => {
    if (customElements.get("simple-schedule-card")) return;

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

  function toTimeInputValue(stored24) {
    const mins = parseHm(stored24);
    if (mins == null) return "07:00";
    const h = Math.floor((((mins % 1440) + 1440) % 1440) / 60);
    const m = ((mins % 1440) + 1440) % 1440 % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function snapHmRaw(raw) {
    const mins = parseHm(raw);
    if (mins == null) return null;
    return formatMins(mins, "24");
  }

  function toDateInputValue(raw) {
    const s = String(raw || "").trim();
    // Real calendar dates only — never invent year 2000 from MM-DD.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !s.startsWith("2000-")) return s;
    return "";
  }

  /** Absolute (non-annual) date input: keep real YYYY-MM-DD; else today / EOM. */
  function absoluteDateInputValue(raw, which) {
    const kept = toDateInputValue(raw);
    if (kept) return kept;
    return which === "start" ? todayIso() : endOfMonthIso();
  }

  function preferMonthDay(raw, recursYearly) {
    const s = String(raw || "").trim();
    if (/^\d{2}-\d{2}$/.test(s)) return true;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return recursYearly !== false;
  }

  function fromDateInputValue(iso, preferMd) {
    const s = String(iso || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return preferMd ? s.slice(5) : s;
  }

  function parseMonthDay(raw) {
    const s = String(raw || "").trim();
    let m = /^(\d{2})-(\d{2})$/.exec(s);
    if (m) return { month: Number(m[1]), day: Number(m[2]) };
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return { month: Number(m[2]), day: Number(m[3]) };
    return { month: 1, day: 1 };
  }

  function formatMonthDay(month, day) {
    return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }


  const MONTHS = [
    ["1", "Jan"], ["2", "Feb"], ["3", "Mar"], ["4", "Apr"],
    ["5", "May"], ["6", "Jun"], ["7", "Jul"], ["8", "Aug"],
    ["9", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
  ];

  function todayParts() {
    const d = new Date();
    return { y: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  function endOfMonthParts() {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      y: last.getFullYear(),
      month: last.getMonth() + 1,
      day: last.getDate(),
    };
  }

  function todayIso() {
    const t = todayParts();
    return `${t.y}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
  }

  function endOfMonthIso() {
    const t = endOfMonthParts();
    return `${t.y}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
  }

  function todayMonthDay() {
    const t = todayParts();
    return formatMonthDay(t.month, t.day);
  }

  function endOfMonthMonthDay() {
    const t = endOfMonthParts();
    return formatMonthDay(t.month, t.day);
  }

  function monthAbbr(month) {
    const row = MONTHS.find(([val]) => Number(val) === Number(month));
    return row ? row[1] : String(month);
  }

  /** Season display: annual "Jun 01 – Sep 01 · Annually"; absolute "Nov 23, 2026 – Nov 30, 2026". */
  function formatSeasonBoundLabel(raw, withYear) {
    const s = String(raw || "").trim();
    if (!s) return "—";
    let year = null;
    let month;
    let day;
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      year = Number(m[1]);
      month = Number(m[2]);
      day = Number(m[3]);
    } else {
      const md = parseMonthDay(s);
      month = md.month;
      day = md.day;
    }
    const mon = monthAbbr(month);
    if (withYear) {
      const y = year != null ? year : new Date().getFullYear();
      return `${mon} ${day}, ${y}`;
    }
    return `${mon} ${String(day).padStart(2, "0")}`;
  }

  function formatSeasonLine(dr) {
    if (!dr) return "";
    const yearly = dr.recurs_yearly !== false;
    const start = formatSeasonBoundLabel(dr.start, !yearly);
    const end = formatSeasonBoundLabel(dr.end, !yearly);
    const ann = yearly ? " · Annually" : "";
    return `${start} – ${end}${ann}`;
  }


  /** Jeff-approved user-facing errors (docs/simple-schedule-error-messages.md). */
  const SSC_GENERIC = "Something went wrong saving this schedule. Try again.";
  const SSC_TIME_STEPS = "Use times on 15-minute steps (e.g. 7:00, 7:15).";
  const SSC_SAME_TIME =
    "From and To can’t be the same time. For overnight, set To earlier than From (e.g. 10:00 PM → 6:00 AM).";
  const SSC_ENTER_NAME = "Enter a name.";
  const SSC_NAME_EMPTY = "Name can’t be empty.";
  const SSC_NO_HOURS =
    "No schedule has been created. Click to paint the day stip or click 'Add a new schedule'";
  const SSC_DATES_PAST =
    "These dates are in the past — this window won’t become Active unless you change the dates or turn on Recurs annually.";
  const SSC_ENABLE_EMPTY =
    "Enabled, but there are no hours — this schedule won’t turn Active until you add a window.";
  const SSC_NO_DAYS =
    "No days selected — this window won’t run until you pick at least one day.";
  const SSC_OVERNIGHT_DOW =
    "For overnight windows, days apply to the start night only.";
  const SSC_INCOMPLETE_DATES =
    "Enter both a Start and End date for this window.";
  const SSC_BAD_DATE =
    "Use a valid date (month–day, or a full calendar date).";
  const SSC_END_BEFORE_START =
    "End must be on or after Start (or turn on Recurs annually to continue into the next year).";
  const SSC_ACTION_DOMAIN = "Pick a Home Assistant action (domain.service).";
  const SSC_CREATE_FAIL =
    "Couldn’t create that schedule. Check the name and try again.";
  const SSC_CREATE_TIMEOUT =
    "Created, but Home Assistant hasn’t shown the new entity yet. Wait a moment, then add a card for it (or refresh).";
  const SSC_CREATE_DUP =
    "A schedule with a similar name already exists. Choose a different name.";
  const SSC_ACTIVE_FAIL =
    "Couldn’t update Active selection. Try again.";
  const SSC_GROUP_EMPTY =
    "Group is empty — add a schedule window to make this group active.";
  const SSC_UNKNOWN_MEMBER =
    "This schedule window isn’t available anymore — refresh the dashboard.";
  const SSC_UNKNOWN_SCHEDULE =
    "That schedule was removed or renamed. Refresh the dashboard.";
  const SSC_CARD_UNLINKED = "This card isn’t linked to a schedule yet.";
  const SSC_CANT_DELETE =
    "Can’t delete — this card isn’t linked to a schedule.";
  const SSC_GROUP_UNLINKED =
    "This group card isn’t linked correctly. Re-select the group entity.";

  function sscOverlapCopy(other) {
    return `Window dates overlap with “${other}”. Change Start/End so the ranges don’t share any days.`;
  }

  function sscMemberUnavailableCopy(name) {
    return `“${name || 'This schedule window'}” is turned off for this group. Enable it before making it Active.`;
  }

  function sscMissingActionCopy(id) {
    return `“${id}” is missing — pick another target, or clear this action.`;
  }

  const SSC_ACTION_FIRE_FAIL = (name, which) =>
    `Couldn’t run “${name}” at window ${which} — entity missing or unavailable.`;

  /** Normalize legacy scene./script. entity strings and Actions-style objects. */
  function sscNormalizeAction(raw) {
    if (raw == null || raw === "" || raw === false) return null;
    if (typeof raw === "string") {
      const domain = raw.split(".", 1)[0];
      if ((domain === "scene" || domain === "script") && raw.includes(".")) {
        return {
          service: `${domain}.turn_on`,
          target: { entity_id: [raw] },
          data: {},
        };
      }
      return null;
    }
    if (typeof raw !== "object") return null;
    const service = raw.service || raw.action;
    if (!service || typeof service !== "string" || !service.includes(".")) {
      return null;
    }
    const target = {};
    const srcTarget = raw.target && typeof raw.target === "object" ? raw.target : {};
    for (const key of ["entity_id", "device_id", "area_id", "label_id"]) {
      let val = srcTarget[key];
      if (val == null && key === "entity_id" && raw.entity_id != null) val = raw.entity_id;
      if (val == null || val === "") continue;
      target[key] = Array.isArray(val) ? val.filter(Boolean).map(String) : [String(val)];
    }
    const data =
      raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
        ? { ...raw.data }
        : {};
    return { service: String(service), target, data };
  }

  function sscNormalizeActionList(raw) {
    if (raw == null || raw === "" || raw === false) return [];
    if (Array.isArray(raw)) {
      return raw.map(sscNormalizeAction).filter(Boolean);
    }
    const one = sscNormalizeAction(raw);
    return one ? [one] : [];
  }

  function sscActionChipLabel(hass, action, index) {
    const a = sscNormalizeAction(action);
    if (!a) return `${index + 1} · —`;
    const friendly = sscServiceFriendlyName(hass, a.service) || a.service;
    const targets = (a.target?.entity_id || []).map((id) =>
      sscEntityFriendlyName(hass, id)
    );
    const targetBit = targets.length ? ` → ${targets.join(", ")}` : "";
    return `${index + 1} · ${friendly}${targetBit}`;
  }

  function sscActionEntityIds(action) {
    const a = sscNormalizeAction(action);
    return a?.target?.entity_id || [];
  }

  function sscTitleCaseService(service) {
    const name = (service || "").split(".")[1] || service || "";
    return name
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function sscServiceFriendlyName(hass, service) {
    if (!service) return "";
    const [domain, svc] = service.split(".");
    if (!domain || !svc) return service;
    try {
      const loc = hass?.localize?.(`component.${domain}.services.${svc}.name`);
      if (loc && loc !== `component.${domain}.services.${svc}.name`) return loc;
    } catch (_) {}
    const meta = hass?.services?.[domain]?.[svc];
    if (meta?.name) return meta.name;
    return sscTitleCaseService(service);
  }

  function sscEntityFriendlyName(hass, entityId) {
    if (!entityId) return "";
    const st = hass?.states?.[entityId];
    return st?.attributes?.friendly_name || entityId;
  }

  const SSC_CONDITION_OPS_EQ = ["=", "!="];
  const SSC_CONDITION_OPS_NUM = ["<", ">"];
  const SSC_CONDITION_MATCH_ALL = "all";
  const SSC_CONDITION_MATCH_ANY = "any";

  function sscNormalizeCondition(raw) {
    if (!raw || typeof raw !== "object") return null;
    const entity_id = String(raw.entity_id || "").trim();
    if (!entity_id || !entity_id.includes(".")) return null;
    let op = String(raw.op || "=").trim();
    if (![...SSC_CONDITION_OPS_EQ, ...SSC_CONDITION_OPS_NUM].includes(op)) op = "=";
    const state =
      raw.state != null ? String(raw.state) : raw.value != null ? String(raw.value) : "";
    if (SSC_CONDITION_OPS_NUM.includes(op)) {
      const trimmed = state.trim();
      // Number("") === 0 in JS — reject blank before coercing.
      if (trimmed === "" || Number.isNaN(Number(trimmed))) return null;
    }
    return { entity_id, op, state };
  }

  function sscNormalizeConditions(list) {
    return (list || []).map(sscNormalizeCondition).filter(Boolean);
  }

  function sscConditionMatchMode(raw) {
    return raw === SSC_CONDITION_MATCH_ANY
      ? SSC_CONDITION_MATCH_ANY
      : SSC_CONDITION_MATCH_ALL;
  }

  function sscEntityStateOptions(hass, entityId) {
    const st = hass?.states?.[entityId];
    const opts = st?.attributes?.options;
    if (Array.isArray(opts) && opts.length) return opts.map(String);
    return null;
  }

  function sscEntitySupportsNumericOps(hass, entityId) {
    const st = hass?.states?.[entityId];
    if (!st) return false;
    const domain = entityId.split(".", 1)[0];
    if (["number", "input_number", "counter"].includes(domain)) return true;
    if (!Number.isNaN(Number(st.state))) return true;
    if (domain === "sensor" && st.attributes?.unit_of_measurement != null) {
      return !Number.isNaN(Number(st.state));
    }
    return false;
  }

  function sscConditionChipLabel(hass, cond) {
    const c = sscNormalizeCondition(cond);
    if (!c) return "";
    const name = sscEntityFriendlyName(hass, c.entity_id);
    return `${name} ${c.op} ${c.state}`;
  }

  function sscConditionsSummaryLine(hass, w) {
    const conds = sscNormalizeConditions(w?.conditions);
    if (!conds.length) return "";
    const match = sscConditionMatchMode(w?.condition_match);
    const prefix = match === SSC_CONDITION_MATCH_ANY ? "If any:" : "If all:";
    const body = conds.map((c) => sscConditionChipLabel(hass, c)).join(" · ");
    return `${prefix} ${body}`;
  }


  function sscMissingTargetIds(hass, action) {
    const ids = sscActionEntityIds(action);
    return ids.filter((id) => !hass?.states?.[id]);
  }

  function sscCollectDomains(spec) {
    const out = new Set();
    if (!spec) return out;
    const list = Array.isArray(spec) ? spec : [spec];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const d = item.domain;
      if (!d) continue;
      if (Array.isArray(d)) d.forEach((x) => x && out.add(String(x)));
      else out.add(String(d));
    }
    return out;
  }

  /** Domains an action can target (entity filter). Falls back to service domain. */
  function sscActionTargetDomains(hass, service) {
    if (!service) return [];
    const [domain, svc] = service.split(".");
    const desc = hass?.services?.[domain]?.[svc] || {};
    const domains = new Set();
    sscCollectDomains(desc.target?.entity).forEach((d) => domains.add(d));
    const fields = desc.fields || {};
    for (const meta of Object.values(fields)) {
      if (!meta || typeof meta !== "object") continue;
      const sel = meta.selector || {};
      if (sel.entity) sscCollectDomains(sel.entity).forEach((d) => domains.add(d));
      if (sel.target?.entity)
        sscCollectDomains(sel.target.entity).forEach((d) => domains.add(d));
    }
    if (!domains.size && domain) domains.add(domain);
    return [...domains];
  }

  function sscRgbToHex(rgb) {
    if (!Array.isArray(rgb) || rgb.length < 3) return "#ffffff";
    const [r, g, b] = rgb.map((n) =>
      Math.max(0, Math.min(255, Number(n) || 0))
    );
    return (
      "#" +
      [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
    );
  }

  function sscHexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return [255, 255, 255];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function sscFieldKind(fkey, selector) {
    const sel = selector || {};
    if (sel.color_rgb || /rgb_color|rgbw_color|rgbww_color/i.test(fkey)) {
      return "rgb";
    }
    const ct = sel.color_temp;
    if (ct) {
      const unit = (ct.unit || ct.unit_of_measurement || "").toLowerCase();
      if (unit === "kelvin" || unit === "k" || ct.min_mireds == null) {
        return "kelvin";
      }
      return "mired";
    }
    if (/color_temp_kelvin|kelvin/i.test(fkey)) return "kelvin";
    if (sel.number) return "number";
    if (sel.boolean != null || "boolean" in sel) return "boolean";
    if (sel.select) return "select";
    return "text";
  }

  function sscServiceFields(hass, service) {
    if (!service) return [];
    const [domain, svc] = service.split(".");
    const fields = hass?.services?.[domain]?.[svc]?.fields || {};
    const out = [];
    for (const [key, meta] of Object.entries(fields)) {
      if (!meta || typeof meta !== "object") continue;
      if (key === "entity_id" || key === "device_id" || key === "area_id" || key === "label_id") {
        continue;
      }
      const selector = meta.selector || {};
      const selKeys = Object.keys(selector);
      if (selKeys.some((k) => ["entity", "device", "area", "label", "target", "object"].includes(k))) {
        continue;
      }
      out.push({ key, meta, selector, kind: sscFieldKind(key, selector) });
    }
    return out;
  }

  function sscStripHaNoise(raw) {
    let msg = String(raw || "");
    msg = msg.replace(/^.*HomeAssistantError:\s*/i, "");
    msg = msg.replace(/^Failed to call service[^:]*:\s*/i, "");
    msg = msg.replace(/^ValueError:\s*/i, "");
    return msg.trim();
  }

  function sscUserError(err, ctx) {
    const msg = sscStripHaNoise(err?.message || err);
    let m;
    if (
      (m = /Overlapping seasons between ['"]([^'"]+)['"] and ['"]([^'"]+)['"]/i.exec(
        msg
      ))
    ) {
      const self = ctx?.selfName;
      const other =
        self && self === m[1] ? m[2] : self && self === m[2] ? m[1] : m[2];
      return sscOverlapCopy(other);
    }
    if (/Member not available/i.test(msg)) {
      return sscMemberUnavailableCopy(ctx?.memberName);
    }
    if (/Unknown group or member|Unknown group/i.test(msg)) {
      return SSC_UNKNOWN_MEMBER;
    }
    if (/Unknown schedule/i.test(msg)) {
      return SSC_UNKNOWN_SCHEDULE;
    }
    if (/Action must be|Action service must be|Invalid action/i.test(msg)) {
      return SSC_ACTION_DOMAIN;
    }
    if (/Invalid time|15-minute steps/i.test(msg)) {
      return SSC_TIME_STEPS;
    }
    if (/already exists|duplicate|unique/i.test(msg)) {
      return SSC_CREATE_DUP;
    }
    if (ctx?.create) return SSC_CREATE_FAIL;
    if (ctx?.active) return SSC_ACTIVE_FAIL;
    return SSC_GENERIC;
  }

  function parseSeasonDateParts(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;
    let m = /^(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      const month = Number(m[1]);
      const day = Number(m[2]);
      if (month < 1 || month > 12 || day < 1 || day > 31) return { invalid: true };
      return { kind: "md", month, day };
    }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      const y = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      if (month < 1 || month > 12 || day < 1 || day > 31) return { invalid: true };
      return { kind: "ymd", y, month, day };
    }
    return { invalid: true };
  }

  function seasonContainsDay(dr, day) {
    if (!dr) return false;
    const start = parseSeasonDateParts(dr.start);
    const end = parseSeasonDateParts(dr.end);
    if (!start || !end || start.invalid || end.invalid) return false;
    const y = day.getFullYear();
    const toDate = (p) => {
      if (p.kind === "md" || dr.recurs_yearly !== false) {
        return new Date(y, p.month - 1, p.day);
      }
      return new Date(p.y, p.month - 1, p.day);
    };
    const sd = toDate(start);
    const ed = toDate(end);
    const t = new Date(y, day.getMonth(), day.getDate());
    if (sd <= ed) return t >= sd && t <= ed;
    return t >= sd || t <= ed;
  }

  function seasonsOverlapClient(a, b) {
    if (!a || !b) return false;
    const y = new Date().getFullYear();
    const start = new Date(y, 0, 1);
    for (let i = 0; i < 366; i++) {
      const d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      if (seasonContainsDay(a, d) && seasonContainsDay(b, d)) return true;
    }
    return false;
  }

  function validateSeasonRange(dr) {
    if (!dr) return null;
    const start = String(dr.start || "").trim();
    const end = String(dr.end || "").trim();
    if ((start && !end) || (!start && end)) return SSC_INCOMPLETE_DATES;
    if (!start && !end) return null;
    const ps = parseSeasonDateParts(start);
    const pe = parseSeasonDateParts(end);
    if (!ps || ps.invalid || !pe || pe.invalid) return SSC_BAD_DATE;
    if (dr.recurs_yearly === false && ps.kind === "ymd" && pe.kind === "ymd") {
      const sd = new Date(ps.y, ps.month - 1, ps.day);
      const ed = new Date(pe.y, pe.month - 1, pe.day);
      if (ed < sd) return SSC_END_BEFORE_START;
    }
    return null;
  }

  /** Absolute (non-annual) range whose End is before today — never applies. */
  function absoluteRangeFullyPast(dr) {
    if (!dr || dr.recurs_yearly !== false) return false;
    const pe = parseSeasonDateParts(dr.end);
    if (!pe || pe.invalid || pe.kind !== "ymd") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(pe.y, pe.month - 1, pe.day);
    return endDate < today;
  }

  function sscChip(html, message, level) {
    if (!message) return "";
    const lvl = level === "warning" ? "warning" : "critical";
    const icon =
      lvl === "warning" ? "mdi:alert-outline" : "mdi:alert-circle-outline";
    return html`<div class="ssc-chip ${lvl}" role="status">
      <ha-icon icon="${icon}"></ha-icon>
      <span>${message}</span>
    </div>`;
  }

  function sscToastMarkup(html, toast) {
    if (!toast?.message) return "";
    const lvl = toast.level === "warning" ? "warning" : "critical";
    const icon =
      lvl === "warning" ? "mdi:alert-outline" : "mdi:alert-circle-outline";
    return html`<div class="ssc-card-toast ${lvl}" role="status">
      <ha-icon icon="${icon}"></ha-icon>
      <span>${toast.message}</span>
    </div>`;
  }

  function boundLabel(b, fmt) {
    if (!b) return "—";
    if (b.kind === "clock") return displayClock(b.time, fmt || "12");
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
    return `${boundLabel(from, fmt)} → ${boundLabel(to, fmt)}`;
  }

  function isClockWindow(w) {
    const from = w?.from || w?.start;
    const to = w?.to || w?.end;
    return from?.kind === "clock" && to?.kind === "clock";
  }

  /** Resolve a bound to minutes-from-midnight for strip painting (uses sun.sun when needed). */
  function boundToMinutes(hass, bound) {
    if (!bound) return null;
    if (bound.kind === "clock") return parseHm(bound.time);
    const attrs = hass?.states?.["sun.sun"]?.attributes || {};
    const todayKey = {
      dawn: "dawn",
      sunrise: "rising",
      dusk: "dusk",
      sunset: "setting",
    }[bound.kind];
    const nextKey = {
      dawn: "next_dawn",
      sunrise: "next_rising",
      dusk: "next_dusk",
      sunset: "next_setting",
    }[bound.kind];
    const raw = (todayKey && attrs[todayKey]) || (nextKey && attrs[nextKey]);
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    let mins = d.getHours() * 60 + d.getMinutes();
    mins += Number(bound.offset_minutes || 0);
    // Snap to 15-min strip cells
    mins = Math.round(mins / 15) * 15;
    return ((mins % 1440) + 1440) % 1440;
  }

  function isOvernight(w) {
    const from = w.from || w.start;
    const to = w.to || w.end;
    if (from?.kind === "clock" && to?.kind === "clock") {
      const a = parseHm(from.time);
      const b = parseHm(to.time);
      return a != null && b != null && b <= a;
    }
    // Sun/mixed overnight is resolved at runtime from sun times; don't mark all sun windows overnight.
    return false;
  }

  function effectiveWeekdays(w, scheduleWeekdays) {
    if (w && Array.isArray(w.weekdays)) return w.weekdays;
    return scheduleWeekdays || [];
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

  /** Floating tooltips on document.body — escape overflow:hidden card/member chrome. */
  let _sscTipEl = null;
  let _sscTipAnchor = null;

  function _ensureSscTipStyle() {
    if (document.getElementById("ssc-floating-tip-style")) return;
    const style = document.createElement("style");
    style.id = "ssc-floating-tip-style";
    style.textContent = `
      .ssc-floating-tip {
        position: fixed;
        z-index: 2147483000;
        max-width: min(280px, calc(100vw - 16px));
        padding: 7px 9px;
        border-radius: 4px;
        border: 1px solid #000;
        background: #111;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: 1.35;
        text-align: left;
        white-space: normal;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
        pointer-events: none;
        opacity: 1;
      }
      .ssc-confirm-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483600;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .ssc-confirm-dialog {
        background: #1c1c1c;
        color: #f5f5f5;
        border: 1px solid #444;
        border-radius: 12px;
        padding: 16px 18px;
        max-width: 380px;
        width: 100%;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
        font-size: 0.95rem;
        line-height: 1.4;
      }
      .ssc-confirm-dialog p {
        margin: 0 0 14px;
        white-space: pre-wrap;
      }
      .ssc-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ssc-confirm-actions button {
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 0.9rem;
        font-weight: 650;
        cursor: pointer;
      }
      .ssc-confirm-actions .ssc-cancel {
        border: 1px solid #666;
        background: transparent;
        color: #f5f5f5;
      }
      .ssc-confirm-actions .ssc-ok {
        border: 1px solid #5b7c8a;
        background: #5b7c8a;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  let _sscConfirmEl = null;

  function hideSscConfirm() {
    if (_sscConfirmEl) {
      _sscConfirmEl.remove();
      _sscConfirmEl = null;
    }
  }

  /** Promise-based confirm via fixed body portal (window.confirm is often blocked in HA). */
  function sscConfirm(message, okLabel) {
    _ensureSscTipStyle();
    hideSscTip();
    hideSscConfirm();
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "ssc-confirm-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      const dialog = document.createElement("div");
      dialog.className = "ssc-confirm-dialog";
      const p = document.createElement("p");
      p.textContent = message;
      const actions = document.createElement("div");
      actions.className = "ssc-confirm-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "ssc-cancel";
      cancelBtn.textContent = "Cancel";
      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.className = "ssc-ok";
      okBtn.textContent = okLabel || "OK";
      const finish = (value) => {
        hideSscConfirm();
        resolve(value);
      };
      cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        finish(false);
      });
      okBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        finish(true);
      });
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) finish(false);
      });
      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      dialog.appendChild(p);
      dialog.appendChild(actions);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      _sscConfirmEl = backdrop;
      okBtn.focus();
    });
  }

  function hideSscTip() {
    if (_sscTipEl) {
      _sscTipEl.remove();
      _sscTipEl = null;
    }
    _sscTipAnchor = null;
  }

  function positionSscTip(anchor, tip, align) {
    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const pad = 8;
    let top = r.top - th - 6;
    let left =
      align === "end"
        ? r.right - tw
        : align === "start"
          ? r.left
          : r.left + r.width / 2 - tw / 2;
    if (top < pad) top = r.bottom + 6;
    if (top + th > window.innerHeight - pad) {
      top = Math.max(pad, r.top - th - 6);
    }
    left = Math.max(pad, Math.min(left, window.innerWidth - tw - pad));
    tip.style.top = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;
  }

  function showSscTip(anchor, text, align) {
    if (!anchor || !text) return;
    _ensureSscTipStyle();
    if (_sscTipAnchor === anchor && _sscTipEl) {
      positionSscTip(anchor, _sscTipEl, align);
      return;
    }
    hideSscTip();
    const tip = document.createElement("div");
    tip.className = "ssc-floating-tip";
    tip.setAttribute("role", "tooltip");
    tip.textContent = text;
    document.body.appendChild(tip);
    _sscTipEl = tip;
    _sscTipAnchor = anchor;
    positionSscTip(anchor, tip, align || null);
  }

  function sscTipEnter(e) {
    const el = e.currentTarget;
    if (!el) return;
    showSscTip(el, el.getAttribute("data-tip"), el.getAttribute("data-tip-align"));
  }

  function sscTipLeave() {
    hideSscTip();
  }

  function paintMinutesRange(q, a, b) {
    if (a == null || b == null) return;
    const ai = a / 15;
    const bi = b / 15;
    if (bi > ai) {
      for (let i = ai; i < bi; i++) q[i] = true;
    } else {
      // Overnight / wrap (e.g. sunset → morning clock)
      for (let i = ai; i < 96; i++) q[i] = true;
      for (let i = 0; i < bi; i++) q[i] = true;
    }
  }

  /**
   * Build strip fill. Pass hass to resolve sun→clock / clock→sun / sun→sun.
   * Without hass, only pure clock windows are painted (edit-safe).
   */
  function quartersFromWindows(windows, hass) {
    const q = Array.from({ length: 96 }, () => false);
    for (const w of windows || []) {
      const from = w.from || w.start;
      const to = w.to || w.end;
      if (!hass && (from?.kind !== "clock" || to?.kind !== "clock")) continue;
      const a = boundToMinutes(hass, from);
      const b = boundToMinutes(hass, to);
      if (a == null || b == null) continue;
      paintMinutesRange(q, a, b);
    }
    return q;
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
        on_start: sscNormalizeActionList(prev?.on_start),
        on_end: sscNormalizeActionList(prev?.on_end),
        weekdays: Array.isArray(prev?.weekdays) ? [...prev.weekdays] : undefined,
        conditions: sscNormalizeConditions(prev?.conditions),
        condition_match: sscConditionMatchMode(prev?.condition_match),
      };
    });
  }

  function scheduleIdFromEntity(entityId, state) {
    // Prefer unique id from attributes if we stored schedule id — use object path
    // Entities are simple_schedule.<slug>; services need schedule_id from storage.
    // We keep schedule_id in attributes via custom — for now parse from attributes windows and use hass connection.
    return state?.attributes?.schedule_id || null;
  }


  function sscActionTargetEntityIds(action) {
    if (!action || typeof action !== "object") return [];
    const ids = action?.target?.entity_id;
    if (Array.isArray(ids)) return ids.filter(Boolean).map(String);
    if (typeof ids === "string" && ids) return [ids];
    return [];
  }

  function sscCollectWatchedEntityIds(hass, entityId) {
    const ids = new Set();
    if (!entityId) return ids;
    ids.add(entityId);
    const attrs = hass?.states?.[entityId]?.attributes || {};
    const considerAction = (a) => {
      for (const act of sscNormalizeActionList(a)) {
        for (const id of sscActionTargetEntityIds(act)) ids.add(id);
      }
    };
    considerAction(attrs.default_on_start);
    considerAction(attrs.default_on_end);
    for (const w of attrs.windows || []) {
      if (!w || typeof w !== "object") continue;
      considerAction(w.on_start);
      considerAction(w.on_end);
      for (const c of w.conditions || []) {
        if (c?.entity_id) ids.add(String(c.entity_id));
      }
      const from = w.from || w.start || {};
      const to = w.to || w.end || {};
      if (from.kind && from.kind !== "clock") ids.add("sun.sun");
      if (to.kind && to.kind !== "clock") ids.add("sun.sun");
    }
    // Group card: members + their schedule entities
    for (const m of attrs.members || []) {
      if (m?.entity_id) ids.add(String(m.entity_id));
      if (m?.id) ids.add(`simple_schedule.${m.id}`);
    }
    for (const mid of attrs.member_ids || []) {
      // best-effort; entity_id usually on members[]
      if (typeof mid === "string" && mid) ids.add(`simple_schedule.${mid}`);
    }
    return ids;
  }

  function sscHassRelevantChanged(newHass, oldHass, entityId, force) {
    if (force) return true;
    if (!oldHass || !newHass) return true;
    if (newHass === oldHass) return false;
    const ids = sscCollectWatchedEntityIds(oldHass, entityId);
    for (const id of sscCollectWatchedEntityIds(newHass, entityId)) ids.add(id);
    for (const id of ids) {
      if (newHass.states?.[id] !== oldHass.states?.[id]) return true;
    }
    // Service catalog changes are rare; still refresh when identity flips.
    if (newHass.services !== oldHass.services) return true;
    return false;
  }

  class SimpleScheduleCard extends LitElement {

    connectedCallback() {
      super.connectedCallback();
      this._bindActionFailListener();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      hideSscTip();
      hideSscConfirm();
      if (this._unsubActionFail) {
        this._unsubActionFail();
        this._unsubActionFail = null;
      }
    }

    get hass() {
      return this.__hass;
    }

    set hass(value) {
      const old = this.__hass;
      const force = Boolean(
        this._condPickerFor ||
          this._pickerFor ||
          this._targetPickerFor ||
          this._adding
      );
      const entityId = this._boundEntity || this._config?.entity || null;
      if (!sscHassRelevantChanged(value, old, entityId, force)) {
        this.__hass = value;
        return;
      }
      this.__hass = value;
      this.requestUpdate("hass", old);
    }

    static get properties() {
      return {
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
        _targetPickerFor: { type: String },
        _targetQuery: { type: String },
        _advancedOpen: { type: String },
        _actionDomainFilter: { type: String },
        _error: { type: String },
        _adding: { type: Boolean },
        _expandedWindowId: { type: String },
        _dragging: { type: Boolean },
        _dragValue: { type: Boolean },
        _renaming: { type: Boolean },
        _renameDraft: { type: String },
        _addWeekdays: { type: Array },
        _condPickerFor: { type: String },
        _condQuery: { type: String },
        _condDraftEntity: { type: String },
        _condDraftOp: { type: String },
        _condDraftState: { type: String },
        _actionEditKey: { type: String },
        _actionEditDraft: {},
        _boundEntity: { type: String },
        _createKind: { type: String },
        _createName: { type: String },
        _createError: { type: String },
        _createBusy: { type: Boolean },
        _createSuccess: {},
        _cardToast: {},
        _renameError: { type: String },
        _errorLevel: { type: String },
      };
    }


    updated(changed) {
      if (changed.has("hass")) this._bindActionFailListener();
    }

    _bindActionFailListener() {
      if (this._unsubActionFail || !this.hass?.connection?.subscribeEvents) return;
      this._unsubActionFail = this.hass.connection.subscribeEvents((ev) => {
        const data = ev?.data || {};
        const entity = this._entityId || this._config?.entity;
        if (entity && data.entity_id && data.entity_id !== entity) return;
        const svc = data.service || "action";
        const friendly = sscServiceFriendlyName(this.hass, svc) || svc;
        const which = data.which === "end" ? "end" : "start";
        this._showToast(SSC_ACTION_FIRE_FAIL(friendly, which), "critical");
      }, "simple_schedule_action_failed");
    }

    _showToast(message, level) {
      this._cardToast = { message, level: level || "critical" };
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        this._cardToast = null;
      }, 5000);
    }

    _clearToast() {
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._cardToast = null;
    }

    async _ssCall(service, data, opts) {
      try {
        await this.hass.callService("simple_schedule", service, data);
        return true;
      } catch (err) {
        const msg = sscUserError(err, opts?.ctx);
        if (opts?.inline === "create") this._createError = msg;
        else if (opts?.inline === "error") {
          this._error = msg;
          this._errorLevel = opts?.level || "critical";
        } else if (opts?.inline === "rename") this._renameError = msg;
        else this._showToast(msg, opts?.level || "critical");
        return false;
      }
    }

    static get styles() {
      return css`
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        ha-card.embedded {
          background: transparent;
          box-shadow: none;
          border: none;
        }
        ha-card.embedded .body {
          padding: 0;
        }
        /* Card-local accents — do not use theme --state-active-color / --primary-color for headers */
        :host {
          --ssc-accent: #5b7c8a;
          --ssc-on-bg: rgba(91, 124, 138, 0.14);
          --ssc-off-bg: var(--secondary-background-color);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 14px 12px 14px 16px;
          width: 100%;
          box-sizing: border-box;
          color: var(--primary-text-color);
          border-left: 4px solid transparent;
        }
        .header.on {
          background: var(--ssc-on-bg);
          color: var(--primary-text-color);
          border-left-color: var(--ssc-accent);
        }
        .header.off {
          background: var(--ssc-off-bg);
          color: var(--primary-text-color);
          border-left-color: var(--divider-color);
        }
        .header.on .muted,
        .header.off .muted {
          color: var(--secondary-text-color);
        }
        .title {
          flex: 1 1 auto;
          min-width: 0;
          font-size: 1.25rem;
          font-weight: 650;
          line-height: 1.25;
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
          overflow-wrap: break-word;
          word-break: normal;
          margin: 0;
          padding-right: 4px;
        }
        .title-row {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          flex: 1 1 auto;
          min-width: 0;
        }
        .title-row .title {
          flex: 1 1 auto;
        }
        button.rename-pen {
          border: none;
          background: transparent;
          color: inherit;
          opacity: 0.75;
          cursor: pointer;
          padding: 2px;
          flex-shrink: 0;
          line-height: 1;
        }
        button.rename-pen:hover {
          opacity: 1;
        }
        button.rename-pen ha-icon {
          --mdc-icon-size: 18px;
        }
        input.rename-input {
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
          max-width: none;
          box-sizing: border-box;
          margin: 0;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 1.1rem;
          font-weight: 650;
        }
        .member-main .title-row .title {
          font-size: 1rem;
        }
        .member-main input.rename-input {
          font-size: 1rem;
        }
        .win-title {
          white-space: normal;
          overflow-wrap: break-word;
          word-break: normal;
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
          justify-content: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          line-height: 1;
          background: var(--secondary-background-color);
        }
        .chip.active {
          background: var(--success-color, #4caf50);
          color: #000000; /* near-black on green for contrast */
          font-weight: 700;
          gap: 4px;
          vertical-align: middle;
        }
        .chip.active ha-icon {
          --mdc-icon-size: 14px;
          width: 14px;
          height: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          margin: 0;
          flex-shrink: 0;
        }
        .chip.active ha-icon svg {
          display: block;
          width: 14px;
          height: 14px;
        }
        .chip.active .chip-label {
          display: inline-flex;
          align-items: center;
          line-height: 1;
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
        .window-card-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
        }
        .window-card-head .win-title-block {
          flex: 1;
          min-width: 0;
          padding-top: 4px;
        }
        .window-card-head .win-title {
          font-weight: 700;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          line-height: 1.25;
        }
        .overnight-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          color: var(--secondary-text-color);
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          line-height: 1;
          margin: 0;
          padding: 0;
          position: relative;
          top: 0;
        }
        .overnight-icon svg {
          display: block;
          width: 18px;
          height: 18px;
        }
        .window-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          gap: 8px;
          flex-shrink: 0;
          min-height: 52px;
        }
        .window-top-actions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .window-actions button.dup-btn {
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 0.72rem;
          font-weight: 600;
          line-height: 1.1;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
        }
        .window-actions button.dup-btn:hover {
          border-color: var(--primary-color);
          background: rgba(0, 0, 0, 0.04);
        }
        .window-actions button.remove-x,
        button.remove-x {
          border: 1px solid var(--error-color, #db4437);
          background: var(--card-background-color);
          color: var(--error-color, #db4437);
          font-size: 1.05rem;
          font-weight: 700;
          line-height: 1;
          padding: 4px 7px;
          border-radius: 6px;
          cursor: pointer;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.75rem;
          min-height: 1.75rem;
        }
        .window-actions button.remove-x:hover,
        button.remove-x:hover {
          background: rgba(219, 68, 55, 0.1);
          opacity: 1;
        }
        /* Unified Edit/Collapse expander text (solo, member, window, group tools). */
        .window-actions button.edit-link,
        .member-actions button.expand-link,
        button.expand-link,
        button.edit-link {
          border: none;
          background: transparent;
          color: var(--primary-text-color);
          font-size: 0.85rem;
          font-weight: 600;
          line-height: 1.2;
          font-family: inherit;
          padding: 2px 4px;
          cursor: pointer;
          text-align: right;
          text-decoration: none;
          box-shadow: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .window-actions button.edit-link:hover,
        .window-actions button.edit-link:focus,
        .member-actions button.expand-link:hover,
        .member-actions button.expand-link:focus,
        button.expand-link:hover,
        button.expand-link:focus,
        button.edit-link:hover,
        button.edit-link:focus {
          background: transparent;
          text-decoration: none;
          box-shadow: none;
          outline: none;
        }
        .group-tools {
          margin-top: 12px;
        }
        .group-tools-toggle {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
        }
        .add-new {
          border: 1px dashed var(--divider-color);
          border-radius: 8px;
          padding: 10px;
          margin: 10px 0 8px;
          background: var(--card-background-color);
        }
        .add-new.collapsed {
          border: none;
          padding: 0;
          background: transparent;
        }
        .bound-block {
          margin-top: 8px;
        }
        .bound-block .muted {
          font-weight: 600;
        }
        button.action-pick {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
          margin-top: 4px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          text-align: left;
          cursor: pointer;
        }
        button.action-pick:hover {
          border-color: var(--primary-color);
        }
        button.action-pick .action-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        button.action-pick .action-change {
          flex-shrink: 0;
          color: var(--primary-color);
          font-size: 0.85rem;
          font-weight: 600;
        }
        .window-card input[type="text"],
        .window-card input[type="number"],
        .add-new input[type="text"],
        .add-new input[type="number"] {
          margin-top: 6px;
          width: 100%;
          max-width: 220px;
          box-sizing: border-box;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
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

        .action-block {
          margin-top: 10px;
        }
        .action-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .action-row .action-pick {
          flex: 1;
        }
        button.clear-action,
        button.linkish.clear-action {
          border: none;
          background: transparent;
          color: var(--secondary-text-color);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 4px 6px;
        }
        .picker-shortcuts {
          display: flex;
          gap: 6px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .picker-shortcuts button {
          width: auto !important;
          display: inline-block !important;
          padding: 4px 10px !important;
          font-size: 0.8rem;
        }
        .picker-shortcuts button.on,
        .picker button.selected,
        .picker button.svc-option.selected {
          border-color: var(--primary-color);
          background: rgba(0, 0, 0, 0.04);
        }
        .svc-friendly {
          font-weight: 700;
        }
        .targets-block {
          margin-top: 8px;
        }
        .target-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 6px 0;
        }
        .target-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 0.8rem;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .target-chip button {
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--secondary-text-color);
          font-size: 1rem;
          line-height: 1;
          padding: 0 2px;
        }
        .action-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 6px 0 4px;
        }
        .action-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 0.75rem;
          /* Contrast vs .window-card secondary-background-color container */
          background: var(--card-background-color);
          color: var(--primary-text-color);
          cursor: grab;
          user-select: none;
          max-width: 100%;
        }
        .action-chip.selected {
          border-color: var(--primary-text-color);
          background: var(--ssc-on-bg);
        }
        .action-chip .drag-handle {
          opacity: 0.45;
          letter-spacing: -1px;
          cursor: grab;
        }
        .action-chip .chip-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 16rem;
        }
        .action-chip button.chip-x {
          border: none;
          background: transparent;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
          padding: 0 2px;
          line-height: 1;
        }
        .action-chip button.chip-x:hover {
          opacity: 1;
        }
        .action-order-hint {
          font-size: 0.75rem;
          color: var(--secondary-text-color);
          margin: 0 0 8px;
        }
        .action-edit-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        details.advanced {
          margin-top: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 6px 10px;
        }
        details.advanced summary {
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .advanced-body {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .adv-field-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .adv-field input[type="range"] {
          width: 100%;
        }
        .adv-bool {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .conditions-block .action-pick {
          width: 100%;
          text-align: left;
        }
        .conditions-block {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid var(--divider-color);
        }
        .conditions-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .conditions-head h3,
        .actions-block h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
        }
        .match-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .match-row .muted {
          font-size: 0.8rem;
        }
        .match-row button {
          border: 1px solid var(--divider-color);
          background: transparent;
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 0.78rem;
          cursor: pointer;
          color: var(--primary-text-color);
        }
        .match-row button.on {
          border-color: var(--primary-color);
          background: rgba(0, 0, 0, 0.04);
          font-weight: 600;
        }
        .cond-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 8px 0;
        }
        .cond-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 0.78rem;
          /* Contrast vs .window-card secondary-background-color container */
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .cond-chip button {
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--secondary-text-color);
          font-size: 1rem;
          line-height: 1;
          padding: 0 2px;
          opacity: 0.75;
        }
        .cond-draft {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 6px;
        }
        .cond-draft-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .cond-op {
          flex: 0 0 auto;
          width: 3.25rem;
          min-width: 3.25rem;
          max-width: 3.25rem;
        }
        .cond-op select {
          width: 100%;
          box-sizing: border-box;
          padding-left: 4px;
          padding-right: 2px;
          text-align: center;
        }
        .cond-state {
          flex: 1 1 auto;
          min-width: 0;
        }
        .cond-draft label {
          display: block;
          font-size: 0.75rem;
          color: var(--secondary-text-color);
          font-weight: 500;
          margin-bottom: 4px;
        }
        .cond-draft select,
        .cond-draft input[type="text"] {
          width: 100%;
          box-sizing: border-box;
        }
        .actions-block {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid var(--divider-color);
        }
        .window-summary-line.conditions {
          display: block;
        }
        .picker-search {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          margin: 6px 0 !important;
        }
        .adv-field {
          opacity: 1;
        }
        .adv-field.adv-off {
          opacity: 0.45;
        }
        .adv-field.adv-off .adv-control {
          pointer-events: none;
        }
        .adv-include {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
        }
        .adv-include input {
          width: auto !important;
          margin: 0;
        }
        .adv-control {
          margin-top: 6px;
        }
        .adv-control input[type="color"] {
          width: 100%;
          height: 36px;
          padding: 0;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
        }
        .error {
          color: var(--error-color);
          font-size: 0.85rem;
        }
        /* CACHEBUST-FULLWIDTH-ALERTS: .ssc-chip/.ssc-card-toast width 100% */
        .ssc-chip,
        .ssc-card-toast {
          width: 100%;
          box-sizing: border-box;
        }
        .ssc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 0.8rem;
          line-height: 1.35;
          max-width: 100%;
          box-sizing: border-box;
        }
        .ssc-chip ha-icon {
          --mdc-icon-size: 16px;
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
          margin-top: 0;
          align-self: center;
        }
        .ssc-chip > span {
          display: block;
          min-width: 0;
        }
        .ssc-chip.critical {
          border-color: #c62828;
          background: rgba(198, 40, 40, 0.12);
          color: var(--primary-text-color);
        }
        .ssc-chip.warning {
          border-color: #ef6c00;
          background: rgba(239, 108, 0, 0.12);
          color: var(--primary-text-color);
        }
        .ssc-card-toast {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0 4px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 0.85rem;
          line-height: 1.35;
          box-sizing: border-box;
        }
        .ssc-card-toast ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
          margin-top: 0;
          align-self: center;
        }
        .ssc-card-toast > span {
          display: block;
          min-width: 0;
        }
        .ssc-card-toast.critical {
          border-color: #c62828;
          background: rgba(198, 40, 40, 0.14);
        }
        .ssc-card-toast.warning {
          border-color: #ef6c00;
          background: rgba(239, 108, 0, 0.14);
        }
        .ssc-field-invalid input[type="date"],
        .ssc-field-invalid select,
        .ssc-field-invalid input[type="text"],
        .ssc-field-invalid input[type="time"] {
          border-color: #c62828 !important;
        }
        .spacer {
          flex: 1;
        }
        .clock-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .clock-row input[type="text"] {
          width: 120px;
          max-width: 100%;
        }
        .clock-row input[type="time"] {
          width: 140px;
          max-width: 100%;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .date-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
          flex: 1;
          min-width: 160px;
        }
        .date-row .fields {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .date-row input[type="text"] {
          width: 140px;
          max-width: 100%;
        }
        .add-new .name-row {
          flex: 1 1 100%;
          min-width: 0;
          width: 100%;
        }
        .add-new .name-row input[type="text"] {
          width: 100%;
          max-width: none;
          box-sizing: border-box;
        }
        .date-row input[type="date"],
        .date-row select {
          width: 150px;
          max-width: 100%;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .md-pick {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          align-items: center;
          gap: 4px;
        }
        .md-pick select {
          width: auto;
          min-width: 0;
          max-width: 4.75rem;
          padding: 4px 6px;
          font-size: 0.85rem;
        }
        .md-pick select:last-child {
          max-width: 3.5rem;
        }
        .group-type-icon {
          --mdc-icon-size: 22px;
          color: var(--primary-text-color);
          opacity: 0.85;
          flex-shrink: 0;
          cursor: help;
          margin-left: 0;
        }
        .header.on .group-type-icon {
          color: var(--primary-text-color);
        }
        /* Group header: title fills space; pencil sits next to type icon (solo spacing). */
        .header.group-head .title-row {
          gap: 6px;
        }
        .header.group-head .rename-pen {
          margin-right: 2px;
        }
        .season-top-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .member-shell {
          margin-top: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .member-shell.warn {
          border: 1px solid #ef6c00;
          background: rgba(239, 108, 0, 0.08);
        }
        /* Same thick left accent as normal on/off cards — orange, no thick right. */
        .member-shell.warn .member-head.on,
        .member-shell.warn .member-head.off {
          background: rgba(239, 108, 0, 0.1);
          border-left-color: #ef6c00 !important;
          border-right: none;
        }
        .member-warn-row,
        .solo-warn-row {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 6px;
          padding: 12px 12px 10px;
          box-sizing: border-box;
          width: 100%;
        }
        .member-warn-row {
          margin-top: 4px;
        }
        .solo-warn-row {
          padding: 0 0 8px;
          margin-top: 4px;
        }
        .member-warn-row .ssc-chip,
        .solo-warn-row .ssc-chip {
          display: flex;
          width: 100%;
          max-width: none;
          margin-top: 0;
          box-sizing: border-box;
        }
        .member-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          cursor: default;
        }
        .member-head.selectable {
          cursor: pointer;
        }
        .member-head .member-main {
          flex: 1;
          min-width: 0;
        }
        .member-meta-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px 8px;
          margin-top: 4px;
        }
        .member-meta-row .season-line {
          color: inherit;
          opacity: 0.9;
          font-size: 0.85rem;
        }
        .member-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }
        .member-enable {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .member-enable .muted {
          font-size: 0.8rem;
          font-weight: 600;
        }
        .active-window-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .active-window-row .heading {
          flex: 1;
          font-weight: 600;
          color: var(--secondary-text-color);
          font-size: 0.85rem;
        }
        .season-dates-row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .season-dates-row > .date-row {
          flex: 0 0 auto;
          min-width: 0;
          margin-top: 0;
        }
        .season-dates-row .recurs-yearly {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: 4px;
          padding-bottom: 2px;
          white-space: nowrap;
        }
        .season-dates-row .recurs-yearly .muted {
          font-size: 0.85rem;
          font-weight: 600;
        }
        button.set-default-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 0.85rem;
          font-weight: 650;
          cursor: pointer;
        }
        button.set-default-btn:hover {
          border-color: var(--ssc-accent, #5b7c8a);
          background: var(--ssc-on-bg, rgba(91, 124, 138, 0.14));
        }
        hr.member-split {
          border: none;
          border-top: 1px solid var(--divider-color);
          margin: 14px 0;
        }
        .offset-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: nowrap;
          margin-top: 6px;
        }
        .offset-row select.offset-sign {
          width: 3rem;
          padding: 4px 6px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .offset-row input[type="number"] {
          width: 4rem;
          max-width: 4rem;
        }
        .window-summary-line {
          display: block;
          line-height: 1.35;
        }
        .add-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .add-actions button {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 0.9rem;
          font-weight: 650;
          cursor: pointer;
        }
        .add-actions button.primary {
          border-color: var(--ssc-accent, #5b7c8a);
          background: var(--ssc-on-bg, rgba(91, 124, 138, 0.14));
        }
        .add-actions button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .add-actions button:not(:disabled):hover {
          border-color: var(--ssc-accent, #5b7c8a);
        }
        .default-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .chip.default {
          background: var(--secondary-background-color);
          border: 1px solid var(--divider-color);
          color: var(--primary-text-color);
          font-weight: 600;
        }
        .window-summary {
          margin-top: 4px;
          color: var(--secondary-text-color);
          font-size: 0.85rem;
        }
        .win-title-block {
          flex: 1;
          min-width: 0;
        }
        .win-dow {
          margin-top: 2px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--secondary-text-color);
        }
        .presets {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .presets button {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }
        .presets button:hover {
          border-color: var(--ssc-accent, #5b7c8a);
        }
        button.add-new-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          box-sizing: border-box;
          margin: 0;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px dashed var(--divider-color);
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          font-size: 0.95rem;
          font-weight: 650;
          cursor: pointer;
          text-align: center;
        }
        button.add-new-bar:hover {
          border-color: var(--ssc-accent, #5b7c8a);
          background: var(--ssc-on-bg, rgba(91, 124, 138, 0.14));
        }
        .blank-create {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .blank-create h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 650;
        }
        .blank-create .kind-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .blank-create .kind-row button {
          flex: 1 1 140px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-weight: 650;
          cursor: pointer;
        }
        .blank-create .kind-row button.on {
          border-color: var(--ssc-accent, #5b7c8a);
          background: var(--ssc-on-bg, rgba(91, 124, 138, 0.14));
        }
        .blank-create .hint {
          color: var(--secondary-text-color);
          font-size: 0.85rem;
          line-height: 1.35;
        }
        .blank-create .name-row {
          flex: 1 1 100%;
          min-width: 0;
          width: 100%;
          margin-top: 0;
        }
        .blank-create .name-row input[type="text"] {
          width: 100%;
          max-width: none;
          box-sizing: border-box;
        }
        button.delete-entity-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          box-sizing: border-box;
          margin: 10px 0 0;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid var(--error-color, #db4437);
          background: rgba(219, 68, 55, 0.1);
          color: var(--error-color, #db4437);
          font-size: 0.95rem;
          font-weight: 650;
          cursor: pointer;
          text-align: center;
        }
        button.delete-entity-bar:hover {
          background: rgba(219, 68, 55, 0.16);
        }
        button.delete-entity-bar:active,
        button.delete-entity-bar:focus,
        button.delete-entity-bar:focus-visible {
          background: rgba(219, 68, 55, 0.22);
          outline: none;
        }
        button.delete-entity-bar:focus:not(:focus-visible) {
          background: rgba(219, 68, 55, 0.1);
        }

        /* Tooltips use fixed .ssc-floating-tip on document.body (see showSscTip). */
        .chip.active[data-tip] {
          cursor: pointer;
        }
        .schedule-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sched-line {
          display: block;
          line-height: 1.35;
        }
        ha-switch {
          --mdc-theme-secondary: var(--primary-color);
        }
      `;
    }

    setConfig(config) {
      // entity is optional — blank card shows create-flow empty state.
      const cfg = config || {};
      const prevEntity = this._config?.entity;
      const entityChanged = prevEntity !== cfg.entity;
      this._config = cfg;
      if (cfg.embedded || cfg.editor_only) {
        this._expanded = true;
      } else if (entityChanged || this._expanded == null) {
        this._expanded = Boolean(cfg.expanded || cfg.start_expanded);
      }
      // Reset ephemeral editor UI only when switching entities (embedded
      // parent was calling setConfig on every update and collapsing Edit).
      if (entityChanged || prevEntity == null) {
        this._fromKind = "clock";
        this._toKind = "clock";
        this._fromClock = "7:00 AM";
        this._toClock = "9:00 AM";
        this._fromOffset = "0";
        this._toOffset = "0";
        this._pickerFor = null;
        this._pickerQuery = "";
        this._error = null;
        this._adding = false;
        this._expandedWindowId = null;
        this._renaming = false;
        this._renameDraft = "";
        this._createKind = this._createKind || "solo";
        this._createName = this._createName || "";
        this._createError = null;
        this._createBusy = false;
        if (entityChanged) this._boundEntity = null;
      }
    }

    getCardSize() {
      return this._entityId ? (this._expanded ? 8 : 2) : 4;
    }

    get _fmt() {
      return String(this._config?.time_format || "12") === "24" ? "24" : "12";
    }

    get _entityId() {
      return this._boundEntity || this._config?.entity || null;
    }

    get _state() {
      const id = this._entityId;
      return id ? this.hass?.states?.[id] : null;
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
      // For pilot: read from hass connection registry of states — use entity object_id as lookup key via update_schedule with schedule_id from config.
      const eid = this._entityId;
      return this._config.schedule_id || eid?.split(".")[1];
    }

    _slugifyName(name) {
      let slug = String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      while (slug.includes("__")) slug = slug.replace("__", "_");
      return slug || "schedule";
    }

    _bindEntity(entityId, isGroup, createdName) {
      if (isGroup) {
        // YAML dashboards can't swap card type in-place; keep blank card + success note.
        this._boundEntity = null;
        this._createSuccess = {
          kind: "group",
          entityId,
          name: createdName || this._createName,
        };
        this.requestUpdate();
        return;
      }
      this._createSuccess = null;
      this._boundEntity = entityId;
      const next = {
        ...(this._config || {}),
        entity: entityId,
        time_format: this._config?.time_format || "12",
      };
      this._config = next;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: next },
          bubbles: true,
          composed: true,
        })
      );
      this.requestUpdate();
    }

    async _waitForEntity(entityId, timeoutMs = 8000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (this.hass?.states?.[entityId]) return true;
        await new Promise((r) => setTimeout(r, 250));
      }
      return Boolean(this.hass?.states?.[entityId]);
    }

    async _createFromBlank() {
      const name = String(this._createName || "").trim();
      this._createError = null;
      if (!name) {
        this._createError = SSC_ENTER_NAME;
        return;
      }
      this._createBusy = true;
      try {
        const kind = this._createKind === "group" ? "group" : "solo";
        const slug = this._slugifyName(name);
        let ok;
        if (kind === "group") {
          ok = await this._ssCall(
            "create_group",
            { name, object_id: slug },
            { inline: "create", ctx: { create: true } }
          );
          if (!ok) return;
          const entityId = `simple_schedule.group_${slug}`;
          const appeared = await this._waitForEntity(entityId);
          this._createName = "";
          if (!appeared) {
            this._createError = SSC_CREATE_TIMEOUT;
            this._bindEntity(entityId, true, name);
            return;
          }
          this._bindEntity(entityId, true, name);
        } else {
          ok = await this._ssCall(
            "create_schedule",
            {
              name,
              object_id: slug,
              enabled: true,
              weekdays: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
              windows: [],
            },
            { inline: "create", ctx: { create: true } }
          );
          if (!ok) return;
          const entityId = `simple_schedule.${slug}`;
          const appeared = await this._waitForEntity(entityId);
          this._createName = "";
          if (!appeared) {
            this._createError = SSC_CREATE_TIMEOUT;
            this._bindEntity(entityId, false, name);
            return;
          }
          this._bindEntity(entityId, false, name);
        }
      } finally {
        this._createBusy = false;
      }
    }

    _renderBlankCreate() {
      const kind = this._createKind === "group" ? "group" : "solo";
      const success = this._createSuccess;
      return html`
        <ha-card>
          <div class="body blank-create">
            <h2>New Schedule</h2>
            ${success
              ? html`<div class="hint">
                    Created
                    <strong>${success.name || "schedule group"}</strong>
                    (<code style="display:block;margin-top:6px"
                      >${success.entityId}</code
                    >
                    Add a
                    <strong>Simple Schedule Group</strong> card with that entity
                    to edit members, or create another below.
                  </div>
                  <button
                    type="button"
                    class="add-new-bar"
                    @click=${() => {
                      this._createSuccess = null;
                      this._createName = "";
                    }}
                  >
                    Create another
                  </button>`
              : html`
                  <div class="hint">
                    Create a solo schedule or a group of schedules that are
                    active at different times of the year
                  </div>
                  <div class="kind-row">
                    <button
                      type="button"
                      class="${kind === "solo" ? "on" : ""}"
                      @click=${() => (this._createKind = "solo")}
                    >
                      Solo schedule
                    </button>
                    <button
                      type="button"
                      class="${kind === "group" ? "on" : ""}"
                      @click=${() => (this._createKind = "group")}
                    >
                      Schedule group
                    </button>
                  </div>
                  <div class="date-row name-row">
                    <span class="muted">Name</span>
                    <input
                      type="text"
                      placeholder=${kind === "group"
                        ? "e.g. Outdoor lighting themes"
                        : "e.g. Classroom hours"}
                      .value=${this._createName || ""}
                      @input=${(e) => (this._createName = e.target.value)}
                      @keydown=${(e) => {
                        if (e.key === "Enter") this._createFromBlank();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    class="add-new-bar"
                    ?disabled=${this._createBusy}
                    @click=${() => this._createFromBlank()}
                  >
                    ${this._createBusy
                      ? "Creating…"
                      : kind === "group"
                        ? "Create schedule group"
                        : "Create schedule"}
                  </button>
                  ${sscChip(html, this._createError, "critical")}
                `}
          </div>
        </ha-card>
      `;
    }

    _statusText() {
      const a = this._attrs;
      if (!a.enabled) return "Disabled";
      if (this._state?.state === "on") return "Active now";
      return "Inactive";
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
      // ha-switch/md-switch: .checked is often undefined on change; HA then omits `enabled`.
      const el = ev.currentTarget || ev.target;
      let checked = el?.checked;
      if (typeof checked !== "boolean") checked = el?.selected;
      if (typeof checked !== "boolean") {
        checked = !Boolean(this._attrs.enabled);
      }
      const sid = await this._resolveScheduleId();
      if (!sid) {
        this._error = SSC_CARD_UNLINKED;
        this._errorLevel = "critical";
        return;
      }
      const ok = await this._ssCall("set_enabled", {
        schedule_id: sid,
        enabled: Boolean(checked),
      });
      if (ok && Boolean(checked) && !(this._attrs.windows || []).length) {
        this._showToast(SSC_ENABLE_EMPTY, "warning");
      }
    }

    async _persist(patch) {
      const sid = await this._resolveScheduleId();
      if (!sid) {
        this._showToast(SSC_CARD_UNLINKED, "critical");
        return false;
      }
      const next = { ...patch };
      if (Array.isArray(next.windows)) {
        next.windows = next.windows.map((w) => ({
          ...w,
          on_start: sscNormalizeActionList(w.on_start),
          on_end: sscNormalizeActionList(w.on_end),
          conditions: sscNormalizeConditions(w.conditions),
          condition_match: sscConditionMatchMode(w.condition_match),
        }));
      }
      if ("default_on_start" in next) {
        next.default_on_start = sscNormalizeActionList(next.default_on_start);
      }
      if ("default_on_end" in next) {
        next.default_on_end = sscNormalizeActionList(next.default_on_end);
      }
      return this._ssCall("update_schedule", {
        schedule_id: sid,
        ...next,
      });
    }

    _windowWeekdays(w) {
      return effectiveWeekdays(w, this._attrs?.weekdays || []);
    }

    _toggleDow(id, windowId) {
      if (windowId) {
        const w = (this._attrs.windows || []).find((x) => x.id === windowId);
        const cur = [...this._windowWeekdays(w)];
        const next = cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id];
        this._patchWindow(windowId, { weekdays: next });
        return;
      }
      // Draft DOW while adding a new window (attached on create).
      const cur = [...(this._addWeekdays || this._attrs.weekdays || [])];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      this._addWeekdays = next;
    }

    _setPreset(kind, windowId) {
      let next = [];
      if (kind === "weekdays") next = ["mon", "tue", "wed", "thu", "fri"];
      else if (kind === "weekend") next = ["sat", "sun"];
      else if (kind === "every") next = DOW.map((d) => d.id);
      else next = [];
      if (windowId) {
        this._patchWindow(windowId, { weekdays: next });
        return;
      }
      this._addWeekdays = next;
    }

    _renderDowEditor(overnight, windowId) {
      const weekdays = windowId
        ? this._windowWeekdays(
            (this._attrs.windows || []).find((x) => x.id === windowId)
          )
        : this._addWeekdays || this._attrs?.weekdays || [];
      return html`
        <div class="dow-editor" style="margin-top:12px">
          <div class="muted" style="font-weight:600">Days of week</div>
          ${overnight
            ? html`<div class="muted">${SSC_OVERNIGHT_DOW}</div>`
            : ""}
          <div class="dow row" style="margin-top:6px">
            ${DOW.map((d) => {
              const on = weekdays.includes(d.id);
              return html`<button
                class="${on ? "on" : ""}"
                @click=${() => this._toggleDow(d.id, windowId)}
              >
                ${d.label}
              </button>`;
            })}
          </div>
          <div class="presets">
            <button
              type="button"
              @click=${() => this._setPreset("weekdays", windowId)}
            >
              Weekdays
            </button>
            <button
              type="button"
              @click=${() => this._setPreset("weekend", windowId)}
            >
              Weekend
            </button>
            <button
              type="button"
              @click=${() => this._setPreset("every", windowId)}
            >
              Every day
            </button>
            <button
              type="button"
              @click=${() => this._setPreset("clear", windowId)}
            >
              Clear
            </button>
          </div>
          ${!(windowId
            ? this._windowWeekdays(
                (this._attrs.windows || []).find((x) => x.id === windowId)
              )
            : this._addWeekdays || this._attrs?.weekdays || []
          ).length
            ? sscChip(html, SSC_NO_DAYS, "warning")
            : ""}
        </div>
      `;
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
      const windows = this._attrs.windows || [];
      // Strip edits only rewrite pure clock windows; keep sun/mixed intact.
      const clockOnly = windows.filter(isClockWindow);
      const sunWindows = windows.filter((w) => !isClockWindow(w));
      const q = quartersFromWindows(clockOnly, null);
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
      const clockWindows = mergeQuartersToWindows(q, clockOnly);
      this._persist({ windows: [...clockWindows, ...sunWindows] });
    }

    _addWindow() {
      this._error = null;
      const windows = [...(this._attrs.windows || [])];
      if (this._fromKind === "clock" && this._toKind === "clock") {
        const a = parseHm(this._fromClock);
        const b = parseHm(this._toClock);
        if (a == null || b == null) {
          this._error = SSC_TIME_STEPS;
          this._errorLevel = "critical";
          return;
        }
        if (a === b) {
          this._error = SSC_SAME_TIME;
          this._errorLevel = "critical";
          return;
        }
        windows.push({
          id: `w_${Date.now()}`,
          from: { kind: "clock", time: formatMins(a, "24") },
          to: { kind: "clock", time: formatMins(b, "24") },
          on_start: [],
          on_end: [],
          conditions: [],
          condition_match: SSC_CONDITION_MATCH_ALL,
          weekdays: [
            ...(this._addWeekdays ||
              this._attrs.weekdays ||
              DOW.map((d) => d.id)),
          ],
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
          conditions: [],
          condition_match: SSC_CONDITION_MATCH_ALL,
          weekdays: [
            ...(this._addWeekdays || this._attrs.weekdays || DOW.map((d) => d.id)),
          ],
        });
      }
      this._persist({ windows });
    }

    _removeWindow(id) {
      const windows = (this._attrs.windows || []).filter((w) => w.id !== id);
      this._persist({ windows });
    }

    _duplicateWindow(id) {
      const windows = [...(this._attrs.windows || [])];
      const src = windows.find((w) => w.id === id);
      if (!src) return;
      const newId = `w_${Date.now()}`;
      const weekdays = Array.isArray(src.weekdays)
        ? [...src.weekdays]
        : Array.isArray(this._attrs?.weekdays)
          ? [...this._attrs.weekdays]
          : DOW.map((d) => d.id);
      // Copy DOW, conditions (+ match), and actions — not From/To (user sets times).
      const dup = {
        id: newId,
        from: { kind: "clock", time: "07:00" },
        to: { kind: "clock", time: "09:00" },
        weekdays,
        conditions: sscNormalizeConditions(src.conditions),
        condition_match: sscConditionMatchMode(src.condition_match),
        on_start: sscNormalizeActionList(src.on_start).map((a) => ({
          service: a.service,
          target: { ...(a.target || {}) },
          data: { ...(a.data || {}) },
        })),
        on_end: sscNormalizeActionList(src.on_end).map((a) => ({
          service: a.service,
          target: { ...(a.target || {}) },
          data: { ...(a.data || {}) },
        })),
      };
      const idx = windows.findIndex((w) => w.id === id);
      windows.splice(idx + 1, 0, dup);
      this._persist({ windows });
      this._expandedWindowId = newId;
      this._pickerFor = null;
      this._condPickerFor = null;
      this._error = null;
    }

    _patchWindow(id, patch) {
      const windows = (this._attrs.windows || []).map((w) =>
        w.id === id ? { ...w, ...patch } : w
      );
      this._persist({ windows });
    }

    _windowBound(w, which) {
      return (which === "from" ? w.from || w.start : w.to || w.end) || {
        kind: "clock",
        time: "07:00",
      };
    }

    _setWindowBoundKind(id, which, kind) {
      const w = (this._attrs.windows || []).find((x) => x.id === id);
      if (!w) return;
      const cur = this._windowBound(w, which);
      if (kind === "clock") {
        const time =
          cur.kind === "clock" && cur.time
            ? cur.time
            : formatMins(7 * 60, "24");
        this._patchWindow(id, { [which]: { kind: "clock", time } });
        return;
      }
      const offset =
        cur.kind === kind ? Number(cur.offset_minutes || 0) : 0;
      this._patchWindow(id, {
        [which]: { kind, offset_minutes: offset },
      });
    }

    _setWindowClock(id, which, raw) {
      const mins = parseHm(raw);
      if (mins == null) {
        this._error = SSC_TIME_STEPS;
        this._errorLevel = "critical";
        return;
      }
      this._error = null;
      this._patchWindow(id, {
        [which]: { kind: "clock", time: formatMins(mins, "24") },
      });
    }

    _setWindowOffset(id, which, raw) {
      const w = (this._attrs.windows || []).find((x) => x.id === id);
      if (!w) return;
      const cur = this._windowBound(w, which);
      const kind = cur.kind && cur.kind !== "clock" ? cur.kind : "sunset";
      this._patchWindow(id, {
        [which]: { kind, offset_minutes: Number(raw) || 0 },
      });
    }

    _renderClockFields(timeValue, onTime) {
      return html`
        <div class="clock-row">
          <input
            type="time"
            step="900"
            .value=${timeValue}
            @change=${(e) => onTime(e.target.value)}
            aria-label="Time picker"
          />
        </div>
      `;
    }

    _renderOffsetField(value, onChange) {
      const n = Number(value) || 0;
      const negative = n < 0;
      const abs = Math.min(999, Math.abs(n));
      return html`
        <div class="offset-row">
          <select
            class="offset-sign"
            .value=${negative ? "-" : "+"}
            @change=${(e) => {
              const sign = e.target.value;
              onChange(String(sign === "-" ? -abs : abs));
            }}
            aria-label="Offset sign"
          >
            <option value="+">+</option>
            <option value="-">−</option>
          </select>
          <input
            type="number"
            min="0"
            max="999"
            step="1"
            .value=${String(abs)}
            @change=${(e) => {
              let v = Number(e.target.value);
              if (!Number.isFinite(v)) v = 0;
              v = Math.min(999, Math.max(0, Math.trunc(v)));
              onChange(String(negative ? -v : v));
            }}
            aria-label="Offset minutes"
          />
          <span class="muted">min</span>
        </div>
      `;
    }

    _renderBoundEditor(w, which, label) {
      const b = this._windowBound(w, which);
      const fmt = this._fmt;
      const kind = b.kind || "clock";
      return html`
        <div class="bound-block">
          <div class="muted">${label}</div>
          <div class="kinds row" style="margin-top:4px">
            ${BOUND_KINDS.map(
              (k) => html`<button
                class="${kind === k.id ? "on" : ""}"
                @click=${() => this._setWindowBoundKind(w.id, which, k.id)}
              >
                ${k.label}
              </button>`
            )}
          </div>
          ${kind === "clock"
            ? this._renderClockFields(toTimeInputValue(b.time), (raw) =>
                this._setWindowClock(w.id, which, raw)
              )
            : this._renderOffsetField(b.offset_minutes || 0, (raw) =>
                this._setWindowOffset(w.id, which, raw)
              )}
        </div>
      `;
    }

    _actionSummaryLine(actions, label) {
      const list = sscNormalizeActionList(actions);
      if (!list.length)
        return html`<span class="window-summary-line">${label}: —</span>`;
      return list.map((a, i) => {
        const friendly = sscServiceFriendlyName(this.hass, a.service);
        const targets = sscActionEntityIds(a).map((id) =>
          sscEntityFriendlyName(this.hass, id)
        );
        const targetBit = targets.length ? ` → ${targets.join(", ")}` : "";
        const body =
          list.length > 1
            ? `${i + 1}. ${friendly}${targetBit}`
            : `${friendly}${targetBit}`;
        return html`<span class="window-summary-line"
          >${label}: ${body}</span
        >`;
      });
    }

    _actionSummary(w) {
      return html`
        ${this._conditionsSummaryLine(w)}
        ${this._actionSummaryLine(w.on_start, "At start")}
        ${this._actionSummaryLine(w.on_end, "At end")}
      `;
    }

    _conditionsSummaryLine(w) {
      const line = sscConditionsSummaryLine(this.hass, w);
      if (!line) return "";
      return html`<span class="window-summary-line conditions">${line}</span>`;
    }

    _filteredConditionEntities() {
      const q = (this._condQuery || "").trim().toLowerCase();
      const out = [];
      for (const [id, st] of Object.entries(this.hass?.states || {})) {
        if (id.startsWith("simple_schedule.")) continue;
        const name = st?.attributes?.friendly_name || id;
        if (
          q &&
          !name.toLowerCase().includes(q) &&
          !id.toLowerCase().includes(q)
        ) {
          continue;
        }
        out.push({ id, name });
      }
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out.slice(0, 40);
    }

    _setConditionMatch(windowId, mode) {
      this._patchWindow(windowId, {
        condition_match: sscConditionMatchMode(mode),
      });
    }

    _removeCondition(windowId, index) {
      const w = (this._attrs.windows || []).find((x) => x.id === windowId);
      if (!w) return;
      const next = sscNormalizeConditions(w.conditions).filter((_, i) => i !== index);
      this._patchWindow(windowId, { conditions: next });
    }

    _addConditionFromDraft(windowId) {
      const entity_id = (this._condDraftEntity || "").trim();
      const op = this._condDraftOp || "=";
      const state =
        this._condDraftState != null ? String(this._condDraftState) : "";
      if (SSC_CONDITION_OPS_NUM.includes(op) && !String(state).trim()) {
        this._error = "Enter a numeric state value for < or > conditions.";
        this._errorLevel = "warning";
        return;
      }
      const cond = sscNormalizeCondition({ entity_id, op, state });
      if (!cond) {
        this._error = "Pick an entity, operator, and state to add a condition.";
        this._errorLevel = "warning";
        return;
      }
      if (
        SSC_CONDITION_OPS_NUM.includes(cond.op) &&
        !sscEntitySupportsNumericOps(this.hass, cond.entity_id)
      ) {
        this._error = "Numeric operators (< >) need a numeric entity state.";
        this._errorLevel = "warning";
        return;
      }
      const w = (this._attrs.windows || []).find((x) => x.id === windowId);
      if (!w) return;
      const next = [...sscNormalizeConditions(w.conditions), cond];
      this._error = null;
      this._patchWindow(windowId, { conditions: next });
      this._condDraftEntity = "";
      this._condDraftOp = "=";
      this._condDraftState = "";
      this._condQuery = "";
      this._condPickerFor = null;
    }

    _renderConditionsEditor(w) {
      const conditions = sscNormalizeConditions(w.conditions);
      const match = sscConditionMatchMode(w.condition_match);
      const pickerOpen = this._condPickerFor === w.id;
      const draftEntity = this._condDraftEntity || "";
      const draftOp = this._condDraftOp || "=";
      const numericOk = draftEntity
        ? sscEntitySupportsNumericOps(this.hass, draftEntity)
        : false;
      const ops = numericOk
        ? [...SSC_CONDITION_OPS_EQ, ...SSC_CONDITION_OPS_NUM]
        : [...SSC_CONDITION_OPS_EQ];
      const effectiveOp = ops.includes(draftOp) ? draftOp : "=";
      const draftStateOk = !(
        SSC_CONDITION_OPS_NUM.includes(effectiveOp) &&
        !(this._condDraftState || "").trim()
      );
      const options = draftEntity
        ? sscEntityStateOptions(this.hass, draftEntity)
        : null;
      const draftFriendly = draftEntity
        ? sscEntityFriendlyName(this.hass, draftEntity)
        : "";

      return html`
        <div class="conditions-block">
          <div class="conditions-head">
            <h3>Conditions</h3>
            <div class="match-row">
              <span class="muted">Match</span>
              <button
                type="button"
                class="${match === SSC_CONDITION_MATCH_ALL ? "on" : ""}"
                @click=${() => this._setConditionMatch(w.id, SSC_CONDITION_MATCH_ALL)}
              >
                All (AND)
              </button>
              <button
                type="button"
                class="${match === SSC_CONDITION_MATCH_ANY ? "on" : ""}"
                @click=${() => this._setConditionMatch(w.id, SSC_CONDITION_MATCH_ANY)}
              >
                Any (OR)
              </button>
            </div>
          </div>
          ${conditions.length
            ? html`<div class="cond-chips">
                ${conditions.map(
                  (c, i) => html`<span class="cond-chip"
                    >${sscConditionChipLabel(this.hass, c)}
                    <button
                      type="button"
                      aria-label="Remove condition"
                      @click=${() => this._removeCondition(w.id, i)}
                    >
                      ×
                    </button></span
                  >`
                )}
              </div>`
            : ""}
          <div class="cond-draft">
            <div>
              <label>Entity</label>
              <button
                type="button"
                class="action-pick"
                style="width:100%;text-align:left"
                @click=${() => {
                  this._condPickerFor = pickerOpen ? null : w.id;
                  this._pickerFor = null;
                  this._targetPickerFor = null;
                }}
              >
                ${draftEntity
                  ? html`<span class="svc-friendly">${draftFriendly}</span>
                      <div class="muted" style="font-size:0.75rem">${draftEntity}</div>`
                  : html`<span class="muted">Search entities…</span>`}
              </button>
              ${pickerOpen
                ? html`
                    <input
                      class="picker-search"
                      type="search"
                      placeholder="Search entities…"
                      .value=${this._condQuery || ""}
                      @input=${(e) => {
                        this._condQuery = e.target.value;
                      }}
                    />
                    <div class="picker">
                      ${this._filteredConditionEntities().map(
                        (ent) => html`<button
                          type="button"
                          class="svc-option ${ent.id === draftEntity ? "selected" : ""}"
                          @click=${() => {
                            this._condDraftEntity = ent.id;
                            this._condDraftOp = "=";
                            const opts = sscEntityStateOptions(this.hass, ent.id);
                            const st = this.hass?.states?.[ent.id];
                            this._condDraftState =
                              opts && opts.length
                                ? String(opts[0])
                                : st?.state != null
                                  ? String(st.state)
                                  : "";
                            this._condPickerFor = null;
                            this._condQuery = "";
                          }}
                        >
                          <div class="svc-friendly">${ent.name}</div>
                          <div class="muted" style="font-size:0.75rem">${ent.id}</div>
                        </button>`
                      )}
                    </div>
                  `
                : ""}
            </div>
            <div class="cond-draft-row">
              <div class="cond-op">
                <select
                  aria-label="Operator"
                  .value=${effectiveOp}
                  @change=${(e) => {
                    this._condDraftOp = e.target.value;
                  }}
                >
                  ${ops.map((op) => html`<option value=${op}>${op}</option>`)}
                </select>
              </div>
              <div class="cond-state">
                <label>State</label>
                ${options
                  ? html`<select
                      .value=${this._condDraftState || ""}
                      @change=${(e) => {
                        this._condDraftState = e.target.value;
                      }}
                    >
                      ${options.map(
                        (opt) => html`<option value=${opt}>${opt}</option>`
                      )}
                    </select>`
                  : html`<input
                      type="text"
                      placeholder="State value"
                      .value=${this._condDraftState || ""}
                      @input=${(e) => {
                        this._condDraftState = e.target.value;
                      }}
                    />`}
              </div>
            </div>
            <div class="add-actions">
              <button
                type="button"
                class="${draftEntity && draftStateOk ? "primary" : ""}"
                ?disabled=${!draftEntity || !draftStateOk}
                @click=${() => this._addConditionFromDraft(w.id)}
              >
                Add condition
              </button>
            </div>
          </div>
        </div>
      `;
    }

    _listHaServices(filterDomain) {
      const out = [];
      const services = this.hass?.services || {};
      for (const [domain, svcs] of Object.entries(services)) {
        if (filterDomain && domain !== filterDomain) continue;
        for (const svc of Object.keys(svcs || {})) {
          const notation = `${domain}.${svc}`;
          out.push({
            service: notation,
            friendly: sscServiceFriendlyName(this.hass, notation),
            domain,
          });
        }
      }
      out.sort((a, b) =>
        a.friendly.localeCompare(b.friendly) || a.service.localeCompare(b.service)
      );
      return out;
    }

    _filteredHaServices() {
      const q = (this._pickerQuery || "").trim().toLowerCase();
      const filter = this._actionDomainFilter || null;
      let all = this._listHaServices(filter);
      if (q) {
        all = all.filter(
          (a) =>
            a.friendly.toLowerCase().includes(q) ||
            a.service.toLowerCase().includes(q)
        );
      }
      return all.slice(0, 50);
    }

    _filteredTargetEntities(service) {
      const q = (this._targetQuery || "").trim().toLowerCase();
      const domains = sscActionTargetDomains(this.hass, service);
      const out = [];
      for (const [id, st] of Object.entries(this.hass?.states || {})) {
        if (id.startsWith("simple_schedule.")) continue;
        const entDomain = id.split(".", 1)[0];
        if (domains.length && !domains.includes(entDomain)) continue;
        const name = st?.attributes?.friendly_name || id;
        if (
          q &&
          !name.toLowerCase().includes(q) &&
          !id.toLowerCase().includes(q)
        ) {
          continue;
        }
        out.push({ id, name });
      }
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out.slice(0, 40);
    }

    render() {
      if (!this._entityId) {
        return this._renderBlankCreate();
      }
      const st = this._state;
      if (!st) {
        return html`<ha-card
          ><div class="body">Entity not found: ${this._entityId}</div></ha-card
        >`;
      }
      const a = this._attrs;
      const enabled = Boolean(a.enabled);
      const fmt = this._fmt;
      const windows = a.windows || [];
      const q = quartersFromWindows(windows, this.hass);
      const overnight = windows.some(
        (w) =>
          isOvernight(w) ||
          (() => {
            const from = w.from || w.start;
            const to = w.to || w.end;
            const am = boundToMinutes(this.hass, from);
            const bm = boundToMinutes(this.hass, to);
            return am != null && bm != null && bm <= am;
          })()
      );
      const status = this._statusText();
      const now = new Date();
      const nowQ = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15);
      const hourLabels =
        fmt === "24"
          ? [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
          : [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

      const embedded = Boolean(this._config.embedded || this._config.editor_only);
      const showExpanded = embedded || this._expanded;

      return html`
        <ha-card class="${embedded ? "embedded" : ""}">
          ${embedded
            ? ""
            : html`
                <div class="header ${enabled ? "on" : "off"}">
                  ${this._renderEditableTitle()}
                  <span class="muted" style="color:inherit">${enabled ? "Enabled" : "Disabled"}</span>
                  <ha-switch
                    .checked=${enabled}
                    @change=${this._setEnabled}
                    @click=${(e) => e.stopPropagation()}
                  ></ha-switch>
                </div>
              `}
          <div class="body">
            ${sscToastMarkup(html, this._cardToast)}
            ${embedded
              ? ""
              : html`
                  <div class="row">
                    <span
                      class="chip ${status === "Active now" ? "active" : ""}"
                      >${status}</span
                    >
                    <span class="muted">${this._nextHint()}</span>
                    <span class="spacer"></span>
                    <button
                      type="button"
                      class="expand-link"
                      @click=${() => (this._expanded = !this._expanded)}
                    >
                      ${this._expanded ? "▴ Collapse" : "▾ Edit"}
                    </button>
                  </div>
                  <div class="schedule-details muted" style="margin-top:6px">
                    ${windows.length
                      ? windows.map(
                          (w) => html`<div class="sched-line">
                            ${windowLabel(w, fmt)} ·
                            ${formatDow(effectiveWeekdays(w, a.weekdays))}
                          </div>`
                        )
                      : html`<div class="sched-line">No windows set</div>`}
                  </div>
                `}

            ${showExpanded
              ? html`
                  <div style="margin-top:${embedded ? "0" : "12px"}">
                    <div class="muted" style="font-weight:600;margin-bottom:4px">
                      Schedule hours
                    </div>
                    ${enabled && !windows.length
                      ? html`<div class="solo-warn-row">
                          ${sscChip(html, SSC_NO_HOURS, "warning")}
                        </div>`
                      : ""}
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

                    <div class="add-new ${this._adding ? "" : "collapsed"}">
                      ${this._adding
                        ? html`
                            <div style="margin-top:0">
                              <strong>Add new window</strong>
                            </div>
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
                                ? this._renderClockFields(
                                    toTimeInputValue(
                                      snapHmRaw(this._fromClock) || "07:00"
                                    ),
                                    (raw) => {
                                      const snapped = snapHmRaw(raw);
                                      if (snapped)
                                        this._fromClock = displayClock(
                                          snapped,
                                          this._fmt
                                        );
                                    }
                                  )
                                : this._renderOffsetField(
                                    this._fromOffset,
                                    (raw) => (this._fromOffset = raw)
                                  )}
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
                                ? this._renderClockFields(
                                    toTimeInputValue(
                                      snapHmRaw(this._toClock) || "09:00"
                                    ),
                                    (raw) => {
                                      const snapped = snapHmRaw(raw);
                                      if (snapped)
                                        this._toClock = displayClock(
                                          snapped,
                                          this._fmt
                                        );
                                    }
                                  )
                                : this._renderOffsetField(
                                    this._toOffset,
                                    (raw) => (this._toOffset = raw)
                                  )}
                            </div>
                            ${this._renderDowEditor(overnight, null)}
                            <div class="add-actions">
                              <button
                                type="button"
                                class="primary"
                                @click=${() => {
                                  this._addWindow();
                                  if (!this._error) this._adding = false;
                                }}
                              >
                                Add Window
                              </button>
                              <button
                                type="button"
                                @click=${() => {
                                  this._adding = false;
                                  this._error = null;
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            ${sscChip(
                              html,
                              this._error,
                              this._errorLevel || "critical"
                            )}
                          `
                        : html`
                            <button
                              type="button"
                              class="add-new-bar"
                              @click=${() => {
                                this._adding = true;
                                this._error = null;
                                this._addWeekdays = [
                                  ...(this._attrs.weekdays ||
                                    DOW.map((d) => d.id)),
                                ];
                              }}
                            >
                              Add a new schedule
                            </button>
                          `}
                    </div>

                    ${windows.map((w) => {
                      const winOpen = this._expandedWindowId === w.id;
                      return html`
                        <div class="window-card">
                          <div
                            class="window-card-head"
                            @click=${() => {
                              this._expandedWindowId = winOpen ? null : w.id;
                              this._pickerFor = null;
                            }}
                          >
                            <div class="win-title-block">
                              <div class="win-title">
                                ${windowLabel(w, fmt)}
                                ${isOvernight(w)
                                  ? html`<ha-icon
                                      class="overnight-icon"
                                      icon="mdi:weather-night"
                                      data-tip="Overnight"
                                      aria-label="Overnight"
                                      @mouseenter=${sscTipEnter}
                                      @mouseleave=${sscTipLeave}
                                    ></ha-icon>`
                                  : ""}
                              </div>
                              ${winOpen
                                ? ""
                                : html`<div
                                    class="win-dow"
                                    data-tip="Days of week"
                                    @mouseenter=${sscTipEnter}
                                    @mouseleave=${sscTipLeave}
                                  >
                                    ${formatDow(
                                      effectiveWeekdays(w, a.weekdays)
                                    )}
                                  </div>`}
                            </div>
                            <div class="window-actions">
                              <div class="window-top-actions">
                                <button
                                  type="button"
                                  class="dup-btn"
                                  data-tip="Duplicate this schedule (days, conditions, and actions)"
                                  data-tip-align="end"
                                  aria-label="Duplicate this schedule (days, conditions, and actions)"
                                  @mouseenter=${sscTipEnter}
                                  @mouseleave=${sscTipLeave}
                                  @focus=${sscTipEnter}
                                  @blur=${sscTipLeave}
                                  @click=${(e) => {
                                    e.stopPropagation();
                                    this._duplicateWindow(w.id);
                                  }}
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  class="remove-x"
                                  data-tip="Remove this schedule"
                                  data-tip-align="end"
                                  aria-label="Remove this schedule"
                                  @mouseenter=${sscTipEnter}
                                  @mouseleave=${sscTipLeave}
                                  @focus=${sscTipEnter}
                                  @blur=${sscTipLeave}
                                  @click=${(e) => {
                                    e.stopPropagation();
                                    this._removeWindow(w.id);
                                    if (this._expandedWindowId === w.id)
                                      this._expandedWindowId = null;
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                              <button
                                type="button"
                                class="edit-link"
                                @click=${(e) => {
                                  e.stopPropagation();
                                  this._expandedWindowId = winOpen ? null : w.id;
                                  this._pickerFor = null;
                                }}
                              >
                                ${winOpen ? "▴ Collapse" : "▾ Edit"}
                              </button>
                            </div>
                          </div>
                          ${winOpen
                            ? html`
                                ${this._renderBoundEditor(w, "from", "From")}
                                ${this._renderBoundEditor(w, "to", "To")}
                                ${this._renderDowEditor(isOvernight(w), w.id)}
                                ${this._renderConditionsEditor(w)}
                                <div class="actions-block">
                                  <h3>Actions</h3>
                                  ${this._renderActionPicker(
                                    w,
                                    "on_start",
                                    "At start, activate:",
                                    isOvernight(w)
                                      ? "Runs on the selected start day (DOW)."
                                      : ""
                                  )}
                                  ${this._renderActionPicker(
                                    w,
                                    "on_end",
                                    "At end, activate:",
                                    isOvernight(w)
                                      ? "Still runs even if the end calendar day isn’t in DOW."
                                      : ""
                                  )}
                                </div>
                              `
                            : html`<div class="window-summary">
                                ${this._actionSummary(w)}
                              </div>`}
                        </div>
                      `;
                    })}
                    ${embedded
                      ? ""
                      : html`<button
                          type="button"
                          class="delete-entity-bar"
                          @click=${(e) => this._deleteEntireSchedule(e)}
                        >
                          Delete ${this._displayName()}
                        </button>`}

                  </div>
                `
              : ""}
          </div>
        </ha-card>
      `;
    }

    _actionEditKeyFor(windowId, field, indexOrNew) {
      return `${windowId}:${field}:${indexOrNew}`;
    }

    _clearActionEdit() {
      this._actionEditKey = null;
      this._actionEditDraft = null;
      this._pickerFor = null;
      this._targetPickerFor = null;
      this._advancedOpen = null;
      this._pickerQuery = "";
      this._targetQuery = "";
      this._actionDomainFilter = null;
    }

    _beginActionEdit(windowId, field, index) {
      const list = sscNormalizeActionList(
        (this._attrs.windows || []).find((x) => x.id === windowId)?.[field]
      );
      const existing = index == null ? null : list[index];
      this._actionEditKey = this._actionEditKeyFor(
        windowId,
        field,
        index == null ? "new" : index
      );
      this._actionEditDraft = existing
        ? {
            service: existing.service,
            target: { ...(existing.target || {}) },
            data: { ...(existing.data || {}) },
          }
        : { service: "", target: {}, data: {} };
      this._pickerFor = null;
      this._targetPickerFor = null;
      this._advancedOpen = null;
      this.requestUpdate();
    }

    _saveActionEdit(windowId, field) {
      const key = this._actionEditKey || "";
      const prefix = `${windowId}:${field}:`;
      if (!key.startsWith(prefix)) return;
      const token = key.slice(prefix.length);
      const draft = sscNormalizeAction(this._actionEditDraft);
      if (!draft) {
        this._error = "Choose a service before saving this action.";
        this._errorLevel = "warning";
        return;
      }
      const list = sscNormalizeActionList(
        (this._attrs.windows || []).find((x) => x.id === windowId)?.[field]
      );
      const next = list.map((a) => ({
        service: a.service,
        target: { ...(a.target || {}) },
        data: { ...(a.data || {}) },
      }));
      if (token === "new") next.push(draft);
      else {
        const idx = Number(token);
        if (Number.isNaN(idx) || idx < 0 || idx >= next.length) return;
        next[idx] = draft;
      }
      this._error = null;
      this._clearActionEdit();
      this._patchWindow(windowId, { [field]: next });
    }

    _removeActionAt(windowId, field, index) {
      const list = sscNormalizeActionList(
        (this._attrs.windows || []).find((x) => x.id === windowId)?.[field]
      );
      const next = list.filter((_, i) => i !== index);
      if ((this._actionEditKey || "").startsWith(`${windowId}:${field}:`)) {
        this._clearActionEdit();
      }
      this._patchWindow(windowId, { [field]: next });
    }

    _reorderActions(windowId, field, fromIndex, toIndex) {
      if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;
      const list = sscNormalizeActionList(
        (this._attrs.windows || []).find((x) => x.id === windowId)?.[field]
      );
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= list.length ||
        toIndex >= list.length
      )
        return;
      const next = list.map((a) => ({
        service: a.service,
        target: { ...(a.target || {}) },
        data: { ...(a.data || {}) },
      }));
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      if ((this._actionEditKey || "").startsWith(`${windowId}:${field}:`)) {
        this._clearActionEdit();
      }
      this._patchWindow(windowId, { [field]: next });
    }

    _renderActionPicker(w, field, label, hint) {
      const actions = sscNormalizeActionList(w[field]);
      const editKey = this._actionEditKey || "";
      const prefix = `${w.id}:${field}:`;
      const editing = editKey.startsWith(prefix);
      const editToken = editing ? editKey.slice(prefix.length) : null;
      const selectedIndex =
        editToken === "new"
          ? null
          : editToken != null && editToken !== ""
            ? Number(editToken)
            : null;
      const draft = editing ? this._actionEditDraft : null;
      const value = editing ? sscNormalizeAction(draft) : null;
      const key = `${w.id}:${field}:edit`;
      const open = this._pickerFor === key;
      const advancedKey = `${key}:adv`;
      const advancedOpen = this._advancedOpen === advancedKey;
      const targetOpen = this._targetPickerFor === key;
      const fields = value ? sscServiceFields(this.hass, value.service) : [];
      const selectedEntities = value?.target?.entity_id || [];
      const targetDomains = value
        ? sscActionTargetDomains(this.hass, value.service)
        : [];
      const missingTargets = value ? sscMissingTargetIds(this.hass, value) : [];
      const friendly = value
        ? sscServiceFriendlyName(this.hass, value.service)
        : "Choose an action…";

      const setDraft = (next) => {
        this._actionEditDraft = next;
        this.requestUpdate();
      };

      const selectService = (service) => {
        const domains = sscActionTargetDomains(this.hass, service);
        const prevIds = value?.target?.entity_id || [];
        const kept = prevIds.filter((id) =>
          domains.some((d) => id.startsWith(`${d}.`))
        );
        const target = {};
        if (kept.length) target.entity_id = kept;
        setDraft({ service, target, data: {} });
        this._pickerFor = null;
        this._actionDomainFilter = null;
        this._pickerQuery = "";
      };

      const toggleTarget = (entityId) => {
        const cur = sscNormalizeAction(this._actionEditDraft) || {
          service: value?.service,
          target: {},
          data: {},
        };
        if (!cur.service) return;
        const ids = [...(cur.target?.entity_id || [])];
        const idx = ids.indexOf(entityId);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(entityId);
        const target = { ...(cur.target || {}) };
        if (ids.length) target.entity_id = ids;
        else delete target.entity_id;
        setDraft({
          service: cur.service,
          target,
          data: { ...(cur.data || {}) },
        });
      };

      const setDataField = (fkey, fval) => {
        const cur = sscNormalizeAction(this._actionEditDraft);
        if (!cur) return;
        const data = { ...(cur.data || {}) };
        if (fval === "" || fval == null) delete data[fkey];
        else data[fkey] = fval;
        setDraft({
          service: cur.service,
          target: cur.target || {},
          data,
        });
      };

      const defaultForField = (fkey, meta, selector, kind) => {
        if (kind === "rgb") return [255, 255, 255];
        if (kind === "kelvin") {
          const ct = selector.color_temp || {};
          return Number(ct.min ?? meta?.example ?? 3000);
        }
        if (kind === "number") {
          const numSel = selector.number || {};
          return Number(numSel.min ?? 0);
        }
        if (kind === "boolean") return false;
        if (kind === "select") {
          const opt = (selector.select?.options || [])[0];
          return typeof opt === "object" ? opt.value : opt ?? "";
        }
        return "";
      };

      const toggleInclude = (fkey, meta, selector, kind, on) => {
        const cur = sscNormalizeAction(this._actionEditDraft);
        if (!cur) return;
        const data = { ...(cur.data || {}) };
        if (on) {
          if (!(fkey in data))
            data[fkey] = defaultForField(fkey, meta, selector, kind);
        } else {
          delete data[fkey];
        }
        setDraft({
          service: cur.service,
          target: cur.target || {},
          data,
        });
      };

      const renderAdvControl = (fkey, meta, selector, kind, curVal, included) => {
        const disabled = !included;
        if (kind === "rgb") {
          const hex = sscRgbToHex(
            Array.isArray(curVal) ? curVal : [255, 255, 255]
          );
          return html`<input
            type="color"
            .value=${hex}
            ?disabled=${disabled}
            @input=${(e) => setDataField(fkey, sscHexToRgb(e.target.value))}
          />`;
        }
        if (kind === "kelvin") {
          const ct = selector.color_temp || {};
          const min = Number(ct.min ?? 2000);
          const max = Number(ct.max ?? 6500);
          const step = Number(ct.step ?? 50);
          const v =
            curVal != null && curVal !== "" ? Number(curVal) : min;
          return html`<div class="adv-field-head">
              <span class="muted">${v} K</span>
            </div>
            <input
              type="range"
              min=${min}
              max=${max}
              step=${step}
              .value=${String(v)}
              ?disabled=${disabled}
              @input=${(e) => setDataField(fkey, Number(e.target.value))}
            />`;
        }
        if (kind === "number" || kind === "mired") {
          const numSel = selector.number || selector.color_temp || {};
          const min = numSel.min ?? 0;
          const max = numSel.max ?? 100;
          const step = numSel.step ?? 1;
          const unit =
            numSel.unit_of_measurement ||
            (kind === "mired" ? "mired" : "") ||
            "";
          const v =
            curVal != null && curVal !== "" ? Number(curVal) : min;
          return html`<div class="adv-field-head">
              <span class="muted">${v}${unit ? ` ${unit}` : ""}</span>
            </div>
            <input
              type="range"
              min=${min}
              max=${max}
              step=${step}
              .value=${String(v)}
              ?disabled=${disabled}
              @input=${(e) => setDataField(fkey, Number(e.target.value))}
            />`;
        }
        if (kind === "boolean") {
          return html`<ha-switch
            .checked=${Boolean(curVal)}
            ?disabled=${disabled}
            @change=${(e) => setDataField(fkey, Boolean(e.target.checked))}
          ></ha-switch>`;
        }
        if (kind === "select") {
          const options = selector.select?.options || [];
          return html`<select
            ?disabled=${disabled}
            @change=${(e) =>
              setDataField(
                fkey,
                e.target.value === "" ? null : e.target.value
              )}
          >
            <option value="">—</option>
            ${options.map((opt) => {
              const ov = typeof opt === "object" ? opt.value : opt;
              const ol =
                typeof opt === "object" ? opt.label || opt.value : opt;
              return html`<option value=${ov} ?selected=${curVal === ov}>
                ${ol}
              </option>`;
            })}
          </select>`;
        }
        return html`<input
          type="text"
          class="picker-search"
          .value=${curVal != null ? String(curVal) : ""}
          ?disabled=${disabled}
          @change=${(e) => setDataField(fkey, e.target.value || null)}
        />`;
      };

      return html`
        <div class="action-block">
          <div class="muted" style="font-weight:600">${label}</div>
          ${hint ? html`<div class="muted">${hint}</div>` : ""}
          <div
            class="action-chips"
            @dragover=${(e) => {
              e.preventDefault();
              try {
                e.dataTransfer.dropEffect = "move";
              } catch (_) {}
            }}
          >
            ${actions.map(
              (act, i) => html`<span
                class="action-chip ${selectedIndex === i ? "selected" : ""}"
                draggable="true"
                @dragstart=${(e) => {
                  // Non-reactive: Lit property updates mid-drag cancel HTML5 DnD.
                  this.__actionDragFrom = {
                    windowId: w.id,
                    field,
                    index: i,
                  };
                  this.__actionDragMoved = false;
                  try {
                    e.dataTransfer.setData("text/plain", String(i));
                    e.dataTransfer.effectAllowed = "move";
                  } catch (_) {}
                }}
                @dragover=${(e) => {
                  e.preventDefault();
                  try {
                    e.dataTransfer.dropEffect = "move";
                  } catch (_) {}
                }}
                @drop=${(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const from = this.__actionDragFrom;
                  this.__actionDragFrom = null;
                  if (
                    !from ||
                    from.windowId !== w.id ||
                    from.field !== field
                  )
                    return;
                  if (from.index === i) return;
                  this.__actionDragMoved = true;
                  this._reorderActions(w.id, field, from.index, i);
                }}
                @dragend=${() => {
                  this.__actionDragFrom = null;
                }}
                @click=${(e) => {
                  if (e.target.closest && e.target.closest("button.chip-x"))
                    return;
                  // Ignore click synthesized after a successful drag-reorder.
                  if (this.__actionDragMoved) {
                    this.__actionDragMoved = false;
                    return;
                  }
                  this._beginActionEdit(w.id, field, i);
                }}
              >
                <span class="drag-handle" aria-hidden="true">⋮⋮</span>
                <span class="chip-label"
                  >${sscActionChipLabel(this.hass, act, i)}</span
                >
                <button
                  type="button"
                  class="chip-x"
                  aria-label="Remove action"
                  @click=${(e) => {
                    e.stopPropagation();
                    this._removeActionAt(w.id, field, i);
                  }}
                >
                  ×
                </button>
              </span>`
            )}
          </div>
          ${actions.length
            ? html`<div class="action-order-hint">
                Actions are executed in the order above, drag to rearrange
              </div>`
            : ""}
          ${editing
            ? html`
                <div class="action-row">
                  <button
                    class="action-pick"
                    type="button"
                    @click=${() => {
                      this._pickerFor = open ? null : key;
                      this._pickerQuery = "";
                      this._actionDomainFilter = null;
                      this._targetPickerFor = null;
                    }}
                  >
                    <span class="action-label">${friendly}</span>
                    <span class="action-change"
                      >${open ? "Close" : "Change"}</span
                    >
                  </button>
                </div>
                ${value && missingTargets.length
                  ? sscChip(
                      html,
                      sscMissingActionCopy(missingTargets.join(", ")),
                      "warning"
                    )
                  : ""}
                ${open
                  ? html`<div class="picker">
                      <div class="picker-shortcuts">
                        <button
                          type="button"
                          class="${this._actionDomainFilter === "scene"
                            ? "on"
                            : ""}"
                          @click=${() => {
                            this._actionDomainFilter =
                              this._actionDomainFilter === "scene"
                                ? null
                                : "scene";
                          }}
                        >
                          Scenes
                        </button>
                        <button
                          type="button"
                          class="${this._actionDomainFilter === "script"
                            ? "on"
                            : ""}"
                          @click=${() => {
                            this._actionDomainFilter =
                              this._actionDomainFilter === "script"
                                ? null
                                : "script";
                          }}
                        >
                          Scripts
                        </button>
                      </div>
                      <input
                        type="text"
                        class="picker-search"
                        placeholder="Search actions…"
                        .value=${this._pickerQuery || ""}
                        @input=${(e) => (this._pickerQuery = e.target.value)}
                      />
                      ${this._filteredHaServices().map(
                        (act) => html`<button
                          type="button"
                          class="svc-option ${value?.service === act.service
                            ? "selected"
                            : ""}"
                          @click=${() => selectService(act.service)}
                        >
                          <div class="svc-friendly">${act.friendly}</div>
                          <div class="id">${act.service}</div>
                        </button>`
                      )}
                    </div>`
                  : ""}
                ${value
                  ? html`
                      <div class="targets-block">
                        <div class="muted" style="font-weight:600">
                          Targets${targetDomains.length
                            ? ` (${targetDomains.join(", ")})`
                            : ""}
                        </div>
                        <div class="target-chips">
                          ${selectedEntities.map(
                            (id) => html`<span class="target-chip"
                              >${sscEntityFriendlyName(this.hass, id)}
                              <button
                                type="button"
                                aria-label="Remove ${id}"
                                @click=${() => toggleTarget(id)}
                              >
                                ×
                              </button></span
                            >`
                          )}
                        </div>
                        <button
                          type="button"
                          class="action-pick target-pick"
                          @click=${() => {
                            if (targetOpen) {
                              this._targetPickerFor = null;
                              this._targetQuery = "";
                            } else {
                              this._targetPickerFor = key;
                              this._targetQuery = "";
                              this._pickerFor = null;
                            }
                            this.requestUpdate();
                          }}
                        >
                          <span class="action-label"
                            >${targetOpen
                              ? "Close targets"
                              : "Choose target…"}</span
                          >
                        </button>
                        ${targetOpen
                          ? html`<div class="picker">
                              <input
                                type="text"
                                class="picker-search"
                                placeholder="Search entities…"
                                .value=${this._targetQuery || ""}
                                @input=${(e) =>
                                  (this._targetQuery = e.target.value)}
                              />
                              ${this._filteredTargetEntities(value.service).map(
                                (ent) => html`<button
                                  type="button"
                                  class="${selectedEntities.includes(ent.id)
                                    ? "selected"
                                    : ""}"
                                  @click=${() => toggleTarget(ent.id)}
                                >
                                  <div class="svc-friendly">${ent.name}</div>
                                  <div class="id">${ent.id}</div>
                                </button>`
                              )}
                            </div>`
                          : ""}
                      </div>
                    `
                  : ""}
                ${value && fields.length
                  ? html`<details
                      class="advanced"
                      ?open=${advancedOpen}
                      @toggle=${(e) => {
                        this._advancedOpen = e.target.open
                          ? advancedKey
                          : null;
                      }}
                    >
                      <summary>Advanced</summary>
                      <div class="advanced-body">
                        ${fields.map(({ key: fkey, meta, selector, kind }) => {
                          const included = Object.prototype.hasOwnProperty.call(
                            value.data || {},
                            fkey
                          );
                          const curVal = included
                            ? value.data[fkey]
                            : defaultForField(fkey, meta, selector, kind);
                          const labelText =
                            meta.name ||
                            fkey
                              .split("_")
                              .map(
                                (wrd) =>
                                  wrd.charAt(0).toUpperCase() + wrd.slice(1)
                              )
                              .join(" ");
                          return html`<div
                            class="adv-field ${included ? "" : "adv-off"}"
                          >
                            <label class="adv-include">
                              <input
                                type="checkbox"
                                .checked=${included}
                                @change=${(e) =>
                                  toggleInclude(
                                    fkey,
                                    meta,
                                    selector,
                                    kind,
                                    e.target.checked
                                  )}
                              />
                              <span>${labelText}</span>
                            </label>
                            <div class="adv-control">
                              ${renderAdvControl(
                                fkey,
                                meta,
                                selector,
                                kind,
                                curVal,
                                included
                              )}
                            </div>
                          </div>`;
                        })}
                      </div>
                    </details>`
                  : ""}
                <div class="add-actions action-edit-bar">
                  <button
                    type="button"
                    class="primary"
                    @click=${() => this._saveActionEdit(w.id, field)}
                  >
                    Save action
                  </button>
                  <button
                    type="button"
                    @click=${() => this._clearActionEdit()}
                  >
                    Cancel
                  </button>
                </div>
              `
            : html`<div class="add-actions">
                <button
                  type="button"
                  class="primary"
                  @click=${() => this._beginActionEdit(w.id, field, null)}
                >
                  Add action
                </button>
              </div>`}
        </div>
      `;
    }

    _displayName() {
      const a = this._attrs;
      return (
        a.friendly_name ||
        this._state?.attributes?.friendly_name ||
        this._config.entity
      );
    }

    _startRename(e) {
      if (e) e.stopPropagation();
      this._renameDraft = this._displayName() || "";
      this._renaming = true;
      requestAnimationFrame(() => {
        const el = this.shadowRoot?.querySelector("input.rename-input");
        if (el) {
          el.focus();
          el.select();
        }
      });
    }

    _cancelRename(e) {
      if (e) e.stopPropagation();
      this._renaming = false;
      this._renameDraft = "";
    }

    async _commitRename(e) {
      if (e) e.stopPropagation();
      const name = String(this._renameDraft || "").trim();
      if (!name) {
        this._renameError = SSC_NAME_EMPTY;
        return;
      }
      this._renameError = null;
      this._renaming = false;
      if (name === this._displayName()) {
        this._renameDraft = "";
        return;
      }
      const sid = await this._resolveScheduleId();
      if (!sid) {
        this._showToast(SSC_CARD_UNLINKED, "critical");
        return;
      }
      const ok = await this._ssCall(
        "update_schedule",
        { schedule_id: sid, name },
        { inline: "rename" }
      );
      if (ok) this._renameDraft = "";
      else this._renaming = true;
    }

    async _deleteEntireSchedule(e) {
      const btn = e?.currentTarget || e?.target;
      if (btn && typeof btn.blur === "function") btn.blur();
      const name = this._displayName() || "this schedule";
      const okConfirm = await sscConfirm(
        `Delete ${name}? This removes the entire schedule and cannot be undone.`,
        "Delete"
      );
      if (!okConfirm) return;
      const sid = await this._resolveScheduleId();
      if (!sid) {
        this._showToast(SSC_CANT_DELETE, "critical");
        return;
      }
      await this._ssCall("delete_schedule", { schedule_id: sid });
    }

    _renderEditableTitle() {
      if (this._renaming) {
        return html`<div>
          <input
            class="rename-input"
            .value=${this._renameDraft}
            @click=${(e) => e.stopPropagation()}
            @input=${(e) => {
              this._renameDraft = e.target.value;
              this._renameError = null;
            }}
            @keydown=${(e) => {
              if (e.key === "Enter") this._commitRename(e);
              if (e.key === "Escape") this._cancelRename(e);
            }}
            @blur=${(e) => this._commitRename(e)}
            aria-label="Rename schedule"
          />
          ${sscChip(html, this._renameError, "critical")}
        </div>`;
      }
      return html`
        <div class="title-row">
          <h2 class="title" @dblclick=${(e) => this._startRename(e)}>
            ${this._displayName()}
          </h2>
          <button
            type="button"
            class="rename-pen"
            data-tip="Rename"
            aria-label="Rename"
            @mouseenter=${sscTipEnter}
            @mouseleave=${sscTipLeave}
            @focus=${sscTipEnter}
            @blur=${sscTipLeave}
            @click=${(e) => this._startRename(e)}
          >
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
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
    disconnectedCallback() {
      super.disconnectedCallback();
      hideSscTip();
      hideSscConfirm();
    }

    get hass() {
      return this.__hass;
    }

    set hass(value) {
      const old = this.__hass;
      const force = Boolean(
        this._addingMember || this._groupToolsOpen || this._renaming
      );
      const entityId = this._config?.entity || null;
      if (!sscHassRelevantChanged(value, old, entityId, force)) {
        this.__hass = value;
        return;
      }
      this.__hass = value;
      this.requestUpdate("hass", old);
    }

    static get properties() {
      return {
        _config: {},
        _expandedId: { type: String },
        _hint: { type: String },
        _memberEditors: {},
        _renaming: { type: Boolean },
        _renameDraft: { type: String },
        _renamingMemberId: { type: String },
        _memberRenameDraft: { type: String },
        _addingMember: { type: Boolean },
        _groupToolsOpen: { type: Boolean },
        _newMemberName: { type: String },
        _newMemberStart: { type: String },
        _newMemberEnd: { type: String },
        _newMemberYearly: { type: Boolean },
        _addMemberError: { type: String },
        _pendingExpandName: { type: String },
        _cardToast: {},
        _seasonError: { type: String },
        _seasonErrorMemberId: { type: String },
        _memberRenameError: { type: String },
        _groupRenameError: { type: String },
        _memberSeasonOverride: {},
      };
    }

    _effectiveDateRange(m) {
      return this._memberSeasonOverride?.[m.id] || m.date_range || null;
    }

    _setSeasonOverride(memberId, date_range) {
      this._memberSeasonOverride = {
        ...(this._memberSeasonOverride || {}),
        [memberId]: date_range,
      };
    }

    _clearSeasonOverrideIfSynced(members) {
      const ov = this._memberSeasonOverride || {};
      const keys = Object.keys(ov);
      if (!keys.length) return;
      let next = null;
      for (const id of keys) {
        const m = (members || []).find((x) => x.id === id);
        const live = m?.date_range || null;
        const draft = ov[id];
        const same =
          live &&
          draft &&
          String(live.start || "") === String(draft.start || "") &&
          String(live.end || "") === String(draft.end || "") &&
          (live.recurs_yearly !== false) === (draft.recurs_yearly !== false);
        const gone = !m;
        if (same || gone) {
          if (!next) next = { ...ov };
          delete next[id];
        }
      }
      if (next) this._memberSeasonOverride = next;
    }

    _showToast(message, level) {
      this._cardToast = { message, level: level || "critical" };
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        this._cardToast = null;
      }, 5000);
    }

    async _ssCall(service, data, opts) {
      try {
        await this.hass.callService("simple_schedule", service, data);
        return true;
      } catch (err) {
        const msg = sscUserError(err, opts?.ctx);
        if (opts?.inline === "add") this._addMemberError = msg;
        else if (opts?.inline === "season") {
          this._seasonError = msg;
          this._seasonErrorMemberId = opts?.memberId || null;
        } else if (opts?.inline === "memberRename") {
          this._memberRenameError = msg;
        } else if (opts?.inline === "groupRename") {
          this._groupRenameError = msg;
        } else this._showToast(msg, opts?.level || "critical");
        return false;
      }
    }

    static get styles() {
      return SimpleScheduleCard.styles;
    }

    setConfig(config) {
      if (!config?.entity) throw new Error("entity is required");
      this._config = config;
      this._expandedId = null;
      this._memberEditors = {};
      this._renaming = false;
      this._renameDraft = "";
      this._renamingMemberId = null;
      this._memberRenameDraft = "";
      this._hint = "";
      this._addingMember = false;
      this._groupToolsOpen = false;
      this._newMemberName = "";
      this._newMemberStart = todayMonthDay();
      this._newMemberEnd = endOfMonthMonthDay();
      this._newMemberYearly = true;
      this._addMemberError = null;
      this._pendingExpandName = null;
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

    _groupDisplayName() {
      const a = this._state?.attributes || {};
      return a.friendly_name || this._state?.attributes?.friendly_name || "Schedule Group";
    }

    _startGroupRename(e) {
      if (e) e.stopPropagation();
      this._renameDraft = this._groupDisplayName() || "";
      this._groupRenameError = null;
      this._renaming = true;
      this._renamingMemberId = null;
      requestAnimationFrame(() => {
        const el = this.shadowRoot?.querySelector("input.rename-input[data-kind='group']");
        if (el) {
          el.focus();
          el.select();
        }
      });
    }

    async _commitGroupRename(e) {
      if (e) e.stopPropagation();
      const name = String(this._renameDraft || "").trim();
      if (!name) {
        this._groupRenameError = SSC_NAME_EMPTY;
        return;
      }
      this._groupRenameError = null;
      this._renaming = false;
      if (name === this._groupDisplayName()) {
        this._renameDraft = "";
        return;
      }
      const gid = this._groupId;
      if (!gid) {
        this._showToast(SSC_GROUP_UNLINKED, "critical");
        return;
      }
      const ok = await this._ssCall(
        "update_group",
        { group_id: gid, name },
        { inline: "groupRename" }
      );
      if (ok) this._renameDraft = "";
      else this._renaming = true;
    }

    _cancelGroupRename(e) {
      if (e) e.stopPropagation();
      this._renaming = false;
      this._renameDraft = "";
    }

    _startMemberRename(e, m) {
      if (e) e.stopPropagation();
      this._renamingMemberId = m.id;
      this._memberRenameDraft = m.name || "";
      this._memberRenameError = null;
      this._renaming = false;
      requestAnimationFrame(() => {
        const el = this.shadowRoot?.querySelector(
          `input.rename-input[data-member='${m.id}']`
        );
        if (el) {
          el.focus();
          el.select();
        }
      });
    }

    async _commitMemberRename(e, m) {
      if (e) e.stopPropagation();
      const name = String(this._memberRenameDraft || "").trim();
      const editing = this._renamingMemberId === m.id;
      if (!editing) return;
      if (!name) {
        this._memberRenameError = SSC_NAME_EMPTY;
        return;
      }
      this._memberRenameError = null;
      this._renamingMemberId = null;
      if (name === m.name) {
        this._memberRenameDraft = "";
        return;
      }
      const ok = await this._patchMemberSeason(m.id, { name }, {
        inline: "memberRename",
      });
      if (ok) this._memberRenameDraft = "";
      else this._renamingMemberId = m.id;
    }

    _cancelMemberRename(e) {
      if (e) e.stopPropagation();
      this._renamingMemberId = null;
      this._memberRenameDraft = "";
    }

    async _cycle(memberId) {
      if (this._renaming || this._renamingMemberId) return;
      const gid = this._groupId;
      const members = this._state?.attributes?.members || [];
      const m = members.find((x) => x.id === memberId);
      await this._ssCall(
        "cycle_member",
        { group_id: gid, member_id: memberId },
        {
          ctx: {
            active: true,
            memberName: m?.name,
            selfName: m?.name,
          },
        }
      );
    }

    async _selectMember(memberId) {
      if (this._renaming || this._renamingMemberId) return;
      const gid = this._groupId;
      const members = this._state?.attributes?.members || [];
      const m = members.find((x) => x.id === memberId);
      await this._ssCall(
        "select_member",
        { group_id: gid, member_id: memberId, sticky: false },
        {
          ctx: {
            active: true,
            memberName: m?.name,
            selfName: m?.name,
          },
        }
      );
    }

    async _confirmSelectMember(m) {
      if (this._renaming || this._renamingMemberId) return;
      if (!m?.id) return;
      const name = m.name || "this schedule window";
      const ok = await sscConfirm(
        `Override the window schedule and make “${name}” active?\n\nCancel leaves the current selection unchanged.`,
        "Make active"
      );
      if (!ok) return;
      await this._selectMember(m.id);
    }

    async _confirmActiveChip(m, isSticky) {
      if (this._renaming || this._renamingMemberId) return;
      if (!m?.id) return;
      const name = m.name || "this schedule window";
      let ok;
      if (isSticky) {
        ok = await sscConfirm(
          `Unlock “${name}” and allow the normal group schedule to resume?\n\nCancel leaves the current selection unchanged.`,
          "Unlock"
        );
      } else {
        ok = await sscConfirm(
          `Override the window schedule and make “${name}” active until you unlock it?\n\nCancel leaves the current selection unchanged.`,
          "Keep active"
        );
      }
      if (!ok) return;
      await this._cycle(m.id);
    }

    async _patchMemberSeason(memberId, patch, opts) {
      const members = this._state?.attributes?.members || [];
      const self = members.find((x) => x.id === memberId);
      return this._ssCall(
        "update_schedule",
        { schedule_id: memberId, ...patch },
        {
          ...(opts || {}),
          ctx: {
            ...(opts?.ctx || {}),
            selfName: self?.name || opts?.ctx?.selfName,
            memberName: self?.name,
          },
        }
      );
    }

    _findSeasonOverlap(m, date_range) {
      if (!date_range) return null;
      const members = this._state?.attributes?.members || [];
      for (const other of members) {
        if (other.id === m.id || !other.date_range) continue;
        if (seasonsOverlapClient(date_range, other.date_range)) {
          return other.name || "another window";
        }
      }
      return null;
    }

    _setSeasonBound(m, which, value) {
      const cur = this._effectiveDateRange(m) || {};
      const date_range = {
        start: which === "start" ? value : cur.start || "",
        end: which === "end" ? value : cur.end || "",
        recurs_yearly: cur.recurs_yearly !== false,
      };
      // Optimistic: orange warn / season line update immediately.
      this._setSeasonOverride(m.id, date_range);
      const invalid = validateSeasonRange(date_range);
      if (invalid) {
        this._seasonError = invalid;
        this._seasonErrorMemberId = m.id;
        return;
      }
      const overlap = this._findSeasonOverlap(m, date_range);
      if (overlap) {
        this._seasonError = sscOverlapCopy(overlap);
        this._seasonErrorMemberId = m.id;
        return;
      }
      this._seasonError = null;
      this._seasonErrorMemberId = null;
      this._patchMemberSeason(
        m.id,
        { date_range },
        { inline: "season", memberId: m.id }
      );
    }

    _renderSeasonDateField(m, which, label) {
      const dr = this._effectiveDateRange(m) || {};
      const yearly = dr.recurs_yearly !== false;
      let raw = which === "start" ? dr.start : dr.end;
      if (!String(raw || "").trim()) {
        raw = which === "start" ? todayMonthDay() : endOfMonthMonthDay();
      }
      if (yearly) {
        const md = parseMonthDay(raw);
        return html`
          <div class="date-row">
            <span class="muted">${label}</span>
            <div class="md-pick">
              <select
                aria-label="${label} month"
                .value=${String(md.month)}
                @change=${(e) => {
                  const month = Number(e.target.value);
                  this._setSeasonBound(
                    m,
                    which,
                    formatMonthDay(month, md.day)
                  );
                }}
              >
                ${MONTHS.map(
                  ([val, name]) =>
                    html`<option value=${val} ?selected=${Number(val) === md.month}>
                      ${name}
                    </option>`
                )}
              </select>
              <select
                aria-label="${label} day"
                .value=${String(md.day)}
                @change=${(e) => {
                  const day = Number(e.target.value);
                  this._setSeasonBound(
                    m,
                    which,
                    formatMonthDay(md.month, day)
                  );
                }}
              >
                ${Array.from({ length: 31 }, (_, i) => i + 1).map(
                  (d) =>
                    html`<option value=${d} ?selected=${d === md.day}>
                      ${d}
                    </option>`
                )}
              </select>
            </div>
          </div>
        `;
      }
      const dateVal = absoluteDateInputValue(raw, which);
      return html`
        <div class="date-row">
          <span class="muted">${label}</span>
          <input
            type="date"
            .value=${dateVal}
            @change=${(e) =>
              this._setSeasonBound(m, which, e.target.value || "")}
          />
        </div>
      `;
    }

    render() {
      const st = this._state;
      if (!st) {
        return html`<ha-card
          ><div class="body">Entity not found: ${this._config.entity}</div></ha-card
        >`;
      }
      const a = st.attributes || {};
      const members = a.members || [];
      const sticky = Boolean(a.sticky);
      const enabledMember = a.enabled_member;

      return html`
        <ha-card>
          <div class="header on group-head">
            ${this._renaming
              ? html`<div style="flex:1;min-width:0">
                  <input
                    class="rename-input"
                    data-kind="group"
                    .value=${this._renameDraft}
                    @click=${(e) => e.stopPropagation()}
                    @input=${(e) => {
                      this._renameDraft = e.target.value;
                      this._groupRenameError = null;
                    }}
                    @keydown=${(e) => {
                      if (e.key === "Enter") this._commitGroupRename(e);
                      if (e.key === "Escape") this._cancelGroupRename(e);
                    }}
                    @blur=${(e) => this._commitGroupRename(e)}
                    aria-label="Rename schedule group"
                  />
                  ${sscChip(html, this._groupRenameError, "critical")}
                </div>`
              : html`<h2
                  class="title"
                  @dblclick=${(e) => this._startGroupRename(e)}
                >
                  ${a.friendly_name ||
                  st.attributes.friendly_name ||
                  "Schedule Group"}
                </h2>`}
            <span class="spacer"></span>
            ${this._renaming
              ? ""
              : html`<button
                  type="button"
                  class="rename-pen"
                  data-tip="Rename"
                  aria-label="Rename"
                  @mouseenter=${sscTipEnter}
                  @mouseleave=${sscTipLeave}
                  @focus=${sscTipEnter}
                  @blur=${sscTipLeave}
                  @click=${(e) => this._startGroupRename(e)}
                >
                  <ha-icon icon="mdi:pencil"></ha-icon>
                </button>`}
            <ha-icon
              class="group-type-icon"
              icon="mdi:calendar-multiple-check"
              data-tip="Schedule group where only one schedule is active at a time based on dates."
              data-tip-align="end"
              aria-label="Schedule Group"
              @mouseenter=${sscTipEnter}
              @mouseleave=${sscTipLeave}
              @focus=${sscTipEnter}
              @blur=${sscTipLeave}
            ></ha-icon>
          </div>
          <div class="body">
            ${sscToastMarkup(html, this._cardToast)}
            ${members.map((m) => {
              const selected = m.id === enabledMember;
              const isSticky = selected && sticky;
              const expanded = this._expandedId === m.id;
              const isDefault = this._isDefaultMember(m, a, members);
              const memberEnabled = m.season_available !== false;
              const memAttrs =
                this.hass?.states?.[m.entity_id]?.attributes || {};
              const fmt = this._config?.time_format || "12";
              const memberWinSum =
                m.windows_summary ||
                windowsSummary(memAttrs.windows || [], fmt);
              const memberDow = formatDow(memAttrs.weekdays);
              const memberWindows = memAttrs.windows || [];
              const effRange = this._effectiveDateRange(m);
              const noHours = !memberWindows.length;
              const datesPast = absoluteRangeFullyPast(effRange);
              // Precedence: Disabled > Warning > Enabled — no orange warn when disabled.
              const memberWarn =
                memberEnabled && (noHours || datesPast);
              return html`
                <div class="member-shell ${memberWarn ? "warn" : ""}">
                  <div
                    class="header member-head ${memberEnabled ? "on" : "off"}${selected ? "" : " selectable"}"
                    @click=${(e) => {
                      // Select/override only from the member body — not Expand/Enabled/pencil.
                      if (selected) return;
                      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
                      if (
                        path.some(
                          (n) =>
                            n?.classList?.contains?.("member-actions") ||
                            n?.classList?.contains?.("expand-link") ||
                            n?.classList?.contains?.("rename-pen") ||
                            n?.tagName === "HA-SWITCH"
                        )
                      ) {
                        return;
                      }
                      this._confirmSelectMember(m);
                    }}
                  >
                    <div class="member-main">
                      ${this._renamingMemberId === m.id
                        ? html`<div>
                            <input
                              class="rename-input"
                              data-member=${m.id}
                              .value=${this._memberRenameDraft}
                              @click=${(e) => e.stopPropagation()}
                              @input=${(e) => {
                                this._memberRenameDraft = e.target.value;
                                this._memberRenameError = null;
                              }}
                              @keydown=${(e) => {
                                if (e.key === "Enter")
                                  this._commitMemberRename(e, m);
                                if (e.key === "Escape")
                                  this._cancelMemberRename(e);
                              }}
                              @blur=${(e) => this._commitMemberRename(e, m)}
                              aria-label="Rename schedule"
                            />
                            ${sscChip(html, this._memberRenameError, "critical")}
                          </div>`
                        : html`<div class="title-row">
                            <div
                              class="title"
                              style="font-size:1rem"
                              @dblclick=${(e) => this._startMemberRename(e, m)}
                            >
                              ${m.name}
                            </div>
                            <button
                              type="button"
                              class="rename-pen"
                              data-tip="Rename"
                              aria-label="Rename"
                              @mouseenter=${sscTipEnter}
                              @mouseleave=${sscTipLeave}
                              @focus=${sscTipEnter}
                              @blur=${sscTipLeave}
                              @click=${(e) => this._startMemberRename(e, m)}
                            >
                              <ha-icon icon="mdi:pencil"></ha-icon>
                            </button>
                          </div>`}
                      ${effRange || selected || isDefault
                        ? html`<div class="member-meta-row">
                            ${effRange
                              ? html`<span class="season-line"
                                  >${formatSeasonLine(effRange)}</span
                                >`
                              : ""}
                            ${selected
                              ? html`<span
                                  class="chip active"
                                  data-tip=${isSticky
                                    ? "Click to unlock this schedule window and allow the normal group schedule to resume"
                                    : "Click to keep this schedule window active until you unlock it"}
                                  @mouseenter=${sscTipEnter}
                                  @mouseleave=${sscTipLeave}
                                  @focus=${sscTipEnter}
                                  @blur=${sscTipLeave}
                                  @click=${(e) => {
                                    e.stopPropagation();
                                    this._confirmActiveChip(m, isSticky);
                                  }}
                                >
                                  <span class="chip-label">Active</span>
                                  ${isSticky
                                    ? html`<ha-icon icon="mdi:lock"></ha-icon>`
                                    : ""}
                                </span>`
                              : ""}
                            ${isDefault
                              ? html`<span class="chip default">Default</span>`
                              : ""}
                          </div>`
                        : ""}
                      <div
                        class="schedule-details muted"
                        style="color:inherit;opacity:0.9;margin-top:4px"
                      >
                        ${memberWindows.length
                          ? memberWindows.map(
                              (w) => html`<div class="sched-line">
                                ${windowLabel(w, fmt)} ·
                                ${formatDow(
                                  effectiveWeekdays(w, memAttrs.weekdays)
                                )}
                              </div>`
                            )
                          : html`<div class="sched-line">
                              ${memberWinSum === "No windows set"
                                ? "No windows set"
                                : memberWinSum}
                            </div>`}
                      </div>
                    </div>
                    <div class="member-actions" @click=${(e) => e.stopPropagation()}>
                      <div class="member-enable">
                        <span class="muted" style="color:inherit">${memberEnabled ? "Enabled" : "Disabled"}</span>
                        <ha-switch
                          .checked=${memberEnabled}
                          @change=${(e) => {
                            const el = e.currentTarget || e.target;
                            const checked =
                              typeof el?.checked === "boolean"
                                ? el.checked
                                : typeof el?.selected === "boolean"
                                  ? el.selected
                                  : !memberEnabled;
                            this._patchMemberSeason(m.id, {
                              season_available: Boolean(checked),
                            });
                          }}
                          @click=${(e) => e.stopPropagation()}
                        ></ha-switch>
                      </div>
                      <button
                        type="button"
                        class="expand-link"
                        @click=${(e) => {
                          e.stopPropagation();
                          this._expandedId = expanded ? null : m.id;
                        }}
                      >
                        ${expanded ? "▴ Collapse" : "▾ Edit"}
                      </button>
                    </div>
                  </div>
                  ${memberWarn
                    ? html`<div class="member-warn-row">
                        ${datesPast
                          ? sscChip(html, SSC_DATES_PAST, "warning")
                          : ""}
                        ${noHours
                          ? sscChip(html, SSC_NO_HOURS, "warning")
                          : ""}
                      </div>`
                    : ""}
                  ${expanded
                    ? html`<div class="body">
                        ${isDefault
                          ? html`<div class="active-window-row">
                              <span class="chip default">Default</span>
                              <span class="muted" style="flex:1"
                                >This schedule window is currently the default
                                for this group, which means it will be active
                                whenever another schedule in this group is not
                                active. If you want to define a specific set of
                                dates for this window, make another window in
                                this group the default.</span
                              >
                            </div>`
                          : html`
                              <div class="active-window-row">
                                <span class="heading">Active Window</span>
                              </div>
                              <div
                                class="season-dates-row ${this
                                  ._seasonErrorMemberId === m.id
                                  ? "ssc-field-invalid"
                                  : ""}"
                              >
                                ${this._renderSeasonDateField(m, "start", "Start")}
                                ${this._renderSeasonDateField(m, "end", "End")}
                                <div class="recurs-yearly">
                                  <span class="muted">Recurs annually</span>
                                  <ha-switch
                                    .checked=${(this._effectiveDateRange(m) ||
                                      m.date_range)?.recurs_yearly !== false}
                                    @change=${(e) => {
                                      const el = e.currentTarget || e.target;
                                      let checked =
                                        typeof el?.checked === "boolean"
                                          ? el.checked
                                          : typeof el?.selected === "boolean"
                                            ? el.selected
                                            : !(
                                                m.date_range?.recurs_yearly ===
                                                false
                                              );
                                      checked = Boolean(checked);
                                      const cur =
                                        this._effectiveDateRange(m) || {};
                                      const start = cur.start || "";
                                      const end = cur.end || "";
                                      // Annual ↔ absolute: MM-DD never maps to year 2000.
                                      // Absolute defaults: Start = today, End = last day of month.
                                      const date_range = {
                                        start: checked
                                          ? fromDateInputValue(
                                              toDateInputValue(start) ||
                                                todayIso(),
                                              true
                                            )
                                          : absoluteDateInputValue(
                                              start,
                                              "start"
                                            ),
                                        end: checked
                                          ? fromDateInputValue(
                                              toDateInputValue(end) ||
                                                endOfMonthIso(),
                                              true
                                            )
                                          : absoluteDateInputValue(end, "end"),
                                        recurs_yearly: checked,
                                      };
                                      // Optimistic warn / season line (no refresh).
                                      this._setSeasonOverride(m.id, date_range);
                                      const invalid =
                                        validateSeasonRange(date_range);
                                      if (invalid) {
                                        this._seasonError = invalid;
                                        this._seasonErrorMemberId = m.id;
                                        return;
                                      }
                                      const overlap = this._findSeasonOverlap(
                                        m,
                                        date_range
                                      );
                                      if (overlap) {
                                        this._seasonError =
                                          sscOverlapCopy(overlap);
                                        this._seasonErrorMemberId = m.id;
                                        return;
                                      }
                                      this._seasonError = null;
                                      this._seasonErrorMemberId = null;
                                      this._patchMemberSeason(
                                        m.id,
                                        { date_range },
                                        { inline: "season", memberId: m.id }
                                      );
                                    }}
                                  ></ha-switch>
                                </div>
                              </div>
                              ${this._seasonErrorMemberId === m.id
                                ? sscChip(html, this._seasonError, "critical")
                                : ""}
                              <div class="default-row">
                                <button
                                  type="button"
                                  class="set-default-btn"
                                  data-tip="The default schedule is used when no other schedule window in this group matches the current date."
                                  @mouseenter=${sscTipEnter}
                                  @mouseleave=${sscTipLeave}
                                  @focus=${sscTipEnter}
                                  @blur=${sscTipLeave}
                                  @click=${() => this._setMemberAsDefault(m)}
                                >
                                  Set as default
                                </button>
                              </div>
                            `}
                        <hr class="member-split" />
                        ${this._renderMemberWindowsEditor(m)}
                        <button
                          type="button"
                          class="delete-entity-bar"
                          data-tip="Remove this schedule window"
                          @mouseenter=${sscTipEnter}
                          @mouseleave=${sscTipLeave}
                          @focus=${sscTipEnter}
                          @blur=${sscTipLeave}
                          @click=${(e) => {
                            e.stopPropagation();
                            this._deleteMember(m);
                          }}
                        >
                          Delete ${m.name}
                        </button>
                      </div>`
                    : ""}
                </div>
              `;
            })}
            <div class="group-tools">
              <div class="group-tools-toggle">
                <button
                  type="button"
                  class="expand-link"
                  @click=${() => {
                    this._groupToolsOpen = !this._groupToolsOpen;
                    if (!this._groupToolsOpen) {
                      this._addingMember = false;
                      this._addMemberError = null;
                    }
                  }}
                >
                  ${this._groupToolsOpen ? "▴ Collapse" : "▾ Edit"}
                </button>
              </div>
              ${this._groupToolsOpen
                ? html`
                    <div
                      class="add-new ${this._addingMember ? "" : "collapsed"}"
                    >
                      ${this._addingMember
                        ? html`
                            <div><strong>Add a new schedule window</strong></div>
                            <div class="date-row name-row" style="margin-top:10px">
                              <span class="muted">Name</span>
                              <input
                                type="text"
                                placeholder="Schedule name"
                                .value=${this._newMemberName}
                                @input=${(e) =>
                                  (this._newMemberName = e.target.value)}
                                @keydown=${(e) => {
                                  if (e.key === "Enter") this._addGroupMember();
                                }}
                              />
                            </div>
                            ${members.length >= 1
                              ? html`
                                  <div
                                    class="season-dates-row"
                                    style="margin-top:10px"
                                  >
                                    ${this._renderNewMemberDateField(
                                      "start",
                                      "Start"
                                    )}
                                    ${this._renderNewMemberDateField(
                                      "end",
                                      "End"
                                    )}
                                    <div class="recurs-yearly">
                                      <span class="muted">Recurs annually</span>
                                      <ha-switch
                                        .checked=${this._newMemberYearly !==
                                        false}
                                        @change=${(e) => {
                                          const el = e.currentTarget || e.target;
                                          const next =
                                            typeof el?.checked === "boolean"
                                              ? el.checked
                                              : !this._newMemberYearly;
                                          this._newMemberYearly = next;
                                          if (next) {
                                            this._newMemberStart =
                                              todayMonthDay();
                                            this._newMemberEnd =
                                              endOfMonthMonthDay();
                                          } else {
                                            this._newMemberStart = todayIso();
                                            this._newMemberEnd =
                                              endOfMonthIso();
                                          }
                                        }}
                                      ></ha-switch>
                                    </div>
                                  </div>
                                  <div class="muted" style="margin-top:6px">
                                    After creating, expand the member to edit
                                    windows and refine the active window.
                                  </div>
                                `
                              : html`<div class="muted" style="margin-top:8px">
                                  First schedule in the group becomes the
                                  default (no season dates).
                                </div>`}
                            <div class="add-actions">
                              <button
                                type="button"
                                class="primary"
                                @click=${() => this._addGroupMember()}
                              >
                                Add schedule
                              </button>
                              <button
                                type="button"
                                @click=${() => {
                                  this._addingMember = false;
                                  this._addMemberError = null;
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            ${sscChip(html, this._addMemberError, "critical")}
                          `
                        : html`
                            <button
                              type="button"
                              class="add-new-bar"
                              @click=${() => {
                                this._addingMember = true;
                                this._addMemberError = null;
                                this._newMemberName = "";
                                this._newMemberStart = todayMonthDay();
                                this._newMemberEnd = endOfMonthMonthDay();
                                this._newMemberYearly = true;
                              }}
                            >
                              Add a new schedule window
                            </button>
                          `}
                    </div>
                    <button
                      type="button"
                      class="delete-entity-bar"
                      @click=${(e) => this._deleteEntireGroup(e)}
                    >
                      Delete ${a.friendly_name ||
                      st.attributes.friendly_name ||
                      "Schedule Group"}
                    </button>
                  `
                : ""}
            </div>
          </div>
        </ha-card>
      `;
    }

    _renderNewMemberDateField(which, label) {
      let raw =
        which === "start" ? this._newMemberStart : this._newMemberEnd;
      if (!String(raw || "").trim()) {
        raw = which === "start" ? todayMonthDay() : endOfMonthMonthDay();
      }
      const yearly = this._newMemberYearly !== false;
      if (yearly) {
        const md = parseMonthDay(raw);
        return html`
          <div class="date-row">
            <span class="muted">${label}</span>
            <div class="md-pick">
              <select
                aria-label="${label} month"
                .value=${String(md.month)}
                @change=${(e) => {
                  const month = Number(e.target.value);
                  const next = formatMonthDay(month, md.day);
                  if (which === "start") this._newMemberStart = next;
                  else this._newMemberEnd = next;
                }}
              >
                ${MONTHS.map(
                  ([val, name]) =>
                    html`<option
                      value=${val}
                      ?selected=${Number(val) === md.month}
                    >
                      ${name}
                    </option>`
                )}
              </select>
              <select
                aria-label="${label} day"
                .value=${String(md.day)}
                @change=${(e) => {
                  const day = Number(e.target.value);
                  const next = formatMonthDay(md.month, day);
                  if (which === "start") this._newMemberStart = next;
                  else this._newMemberEnd = next;
                }}
              >
                ${Array.from({ length: 31 }, (_, i) => i + 1).map(
                  (d) =>
                    html`<option value=${d} ?selected=${d === md.day}>
                      ${d}
                    </option>`
                )}
              </select>
            </div>
          </div>
        `;
      }
      const dateVal = absoluteDateInputValue(raw, which);
      return html`
        <div class="date-row">
          <span class="muted">${label}</span>
          <input
            type="date"
            .value=${dateVal}
            @change=${(e) => {
              const v = e.target.value || "";
              if (which === "start") this._newMemberStart = v;
              else this._newMemberEnd = v;
            }}
          />
        </div>
      `;
    }

    async _addGroupMember() {
      const gid = this._groupId;
      const name = String(this._newMemberName || "").trim();
      this._addMemberError = null;
      if (!gid) {
        this._addMemberError = SSC_GROUP_UNLINKED;
        return;
      }
      if (!name) {
        this._addMemberError = SSC_ENTER_NAME;
        return;
      }
      const members = this._state?.attributes?.members || [];
      const payload = {
        name,
        group_id: gid,
        enabled: true,
        weekdays: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
        windows: [],
        season_available: true,
      };
      // First member becomes undated default; later members get an active window.
      if (members.length >= 1) {
        const yearly = this._newMemberYearly !== false;
        const start = yearly
          ? this._newMemberStart || todayMonthDay()
          : absoluteDateInputValue(this._newMemberStart, "start");
        const end = yearly
          ? this._newMemberEnd || endOfMonthMonthDay()
          : absoluteDateInputValue(this._newMemberEnd, "end");
        payload.date_range = {
          start,
          end,
          recurs_yearly: yearly,
        };
        const invalid = validateSeasonRange(payload.date_range);
        if (invalid) {
          this._addMemberError = invalid;
          return;
        }
        for (const other of members) {
          if (!other.date_range) continue;
          if (seasonsOverlapClient(payload.date_range, other.date_range)) {
            this._addMemberError = sscOverlapCopy(
              other.name || "another window"
            );
            return;
          }
        }
      } else {
        payload.date_range = null;
      }
      const ok = await this._ssCall("create_schedule", payload, {
        inline: "add",
        ctx: { create: true, selfName: name },
      });
      if (!ok) return;
      this._pendingExpandName = name;
      this._addingMember = false;
      this._newMemberName = "";
      this._addMemberError = null;
    }

    _isDefaultMember(m, a, members) {
      const list = members || a?.members || [];
      if (list.length === 1) return true;
      if (a?.fallback_member === m.id) return true;
      // Undated member is the seasonal fallback when no other window matches.
      if (!m.date_range && (a?.fallback_member == null || a?.fallback_member === m.id))
        return true;
      return false;
    }

    async _setMemberAsDefault(m) {
      const a = this._state?.attributes || {};
      const members = a.members || [];
      // Previous undated default(s) (no start/end window) become disabled.
      for (const prev of members) {
        if (prev.id === m.id) continue;
        if (!prev.date_range) {
          const ok = await this._patchMemberSeason(prev.id, {
            season_available: false,
          });
          if (!ok) return;
        }
      }
      // Clear season dates so this member is the undated fallback, enable it, pin group fallback.
      const ok = await this._patchMemberSeason(m.id, {
        date_range: null,
        season_available: true,
      });
      if (!ok) return;
      const gid = this._groupId;
      if (gid) {
        await this._ssCall("update_group", {
          group_id: gid,
          fallback_member_id: m.id,
        });
      }
    }

    async _deleteMember(m) {
      if (!m?.id) return;
      const members = this._state?.attributes?.members || [];
      if (members.length === 1) {
        const ok = await sscConfirm(
          `“${m.name || "This schedule window"}” is the only schedule window in this group. Delete it anyway? The group will have no windows until you add one.`,
          "Delete"
        );
        if (!ok) return;
      }
      if (this._expandedId === m.id) this._expandedId = null;
      const deleted = await this._ssCall("delete_schedule", {
        schedule_id: m.id,
      });
      if (deleted && members.length === 1) {
        this._showToast(SSC_GROUP_EMPTY, "warning");
      }
    }

    async _deleteEntireGroup(e) {
      const btn = e?.currentTarget || e?.target;
      if (btn && typeof btn.blur === "function") btn.blur();
      const st = this._state;
      const name =
        st?.attributes?.friendly_name ||
        this._config?.entity ||
        "this schedule group";
      const okConfirm = await sscConfirm(
        `Delete ${name}? This removes the entire group and cannot be undone.`,
        "Delete"
      );
      if (!okConfirm) return;
      const gid = this._groupId;
      if (!gid) {
        this._showToast(SSC_GROUP_UNLINKED, "critical");
        return;
      }
      await this._ssCall("delete_group", { group_id: gid });
    }

    async _ensureSoleMemberDefault(members, a) {
      if (this._ensuringSoleDefault) return;
      if (!members || members.length !== 1) return;
      const m = members[0];
      if (!m?.id) return;
      const needsClear = Boolean(m.date_range);
      const needsFb = a?.fallback_member !== m.id;
      if (!needsClear && !needsFb) return;
      this._ensuringSoleDefault = true;
      try {
        await this._setMemberAsDefault(m);
      } finally {
        this._ensuringSoleDefault = false;
      }
    }

    _renderMemberWindowsEditor(m) {
      const entity = m.entity_id;
      if (!entity) {
        return html`<div class="muted">No entity for this member.</div>`;
      }
      // Defer setConfig until after render via updated().
      return html`
        <simple-schedule-card
          class="embedded-member-card"
          data-member-id=${m.id}
          .hass=${this.hass}
        ></simple-schedule-card>
      `;
    }

    updated(changed) {
      if (!this.shadowRoot) return;
      const a = this._state?.attributes || {};
      const members = a.members || [];
      this._clearSeasonOverrideIfSynced(members);
      // Sole member is always the default fallback — clear season dates + pin fallback.
      this._ensureSoleMemberDefault(members, a);
      if (this._pendingExpandName) {
        const match = members.find((m) => m.name === this._pendingExpandName);
        if (match) {
          this._expandedId = match.id;
          this._pendingExpandName = null;
        }
      }
      for (const el of this.shadowRoot.querySelectorAll(
        "simple-schedule-card.embedded-member-card"
      )) {
        const mid = el.getAttribute("data-member-id");
        const m = members.find((x) => x.id === mid);
        if (!m?.entity_id) continue;
        el.hass = this.hass;
        const next = {
          entity: m.entity_id,
          time_format: this._config?.time_format || "12",
          embedded: true,
          editor_only: true,
          start_expanded: true,
          expanded: true,
        };
        const prev = el._config || {};
        if (
          prev.entity !== next.entity ||
          prev.time_format !== next.time_format ||
          !prev.embedded
        ) {
          try {
            el.setConfig(next);
          } catch (err) {
            // ignore transient
          }
        }
      }
    }

    static getStubConfig(hass) {
      const entity =
        Object.keys(hass.states).find((e) =>
          e.startsWith("simple_schedule.group_")
        ) || "simple_schedule.group_sample_outdoor_lighting";
      return { type: "custom:simple-schedule-group-card", entity };
    }
  }

  class SimpleScheduleCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, _config: {} };
    }
    setConfig(config) {
      this._config = config;
    }
    render() {
      return html`
        <div style="padding:8px">
          <div>Entity</div>
          <input
            type="text"
            style="width:100%"
            .value=${this._config?.entity || ""}
            @change=${(e) => this._update({ entity: e.target.value })}
          />
          <div style="margin-top:8px">time_format (12|24)</div>
          <input
            type="text"
            .value=${this._config?.time_format || "12"}
            @change=${(e) => this._update({ time_format: e.target.value })}
          />
          <div style="margin-top:8px">schedule_id (optional override)</div>
          <input
            type="text"
            style="width:100%"
            .value=${this._config?.schedule_id || ""}
            @change=${(e) => this._update({ schedule_id: e.target.value })}
          />
        </div>
      `;
    }
    _update(patch) {
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

  // Expose schedule_id on state attributes by monkey-patching is hard;
  // instead enrich via card config. Also fix: entity uses friendly name from HA.

  if (!customElements.get("simple-schedule-card")) {
    customElements.define("simple-schedule-card", SimpleScheduleCard);
  }
  if (!customElements.get("simple-schedule-group-card")) {
    customElements.define("simple-schedule-group-card", SimpleScheduleGroupCard);
  }
  if (!customElements.get("simple-schedule-card-editor")) {
    customElements.define("simple-schedule-card-editor", SimpleScheduleCardEditor);
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "simple-schedule-card")) {
    window.customCards.push({
      type: "simple-schedule-card",
      name: "Simple Schedule Card",
      description: "Weekly availability windows with optional scene/script hooks",
    });
  }
  if (!window.customCards.some((c) => c.type === "simple-schedule-group-card")) {
    window.customCards.push({
      type: "simple-schedule-group-card",
      name: "Simple Schedule Group Card",
      description: "Exclusive schedule group with seasons + sticky select",
    });
  }
  }; // end boot

  defineWhenReady();
})();
