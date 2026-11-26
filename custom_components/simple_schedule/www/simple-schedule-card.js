/* simple-schedule-card v0.5.1 (minified) */
(()=>{const e=()=>{const i=customElements.get("ha-panel-lovelace")||customElements.get("hui-view")||customElements.get("home-assistant-main")||customElements.get("home-assistant");if(!i)return customElements.whenDefined("home-assistant").then((()=>setTimeout(e,50))),void setTimeout(e,100);const r=Object.getPrototypeOf(i);if(!r?.prototype?.html||!r?.prototype?.css)return void setTimeout(e,100);const n=r.prototype.html,a=r.prototype.css;t(r,n,a)},t=(e,t,i)=>{if(customElements.get("simple-schedule-card"))return;const r=[{id:"sun",label:"S",full:"Sun"},{id:"mon",label:"M",full:"Mon"},{id:"tue",label:"T",full:"Tue"},{id:"wed",label:"W",full:"Wed"},{id:"thu",label:"T",full:"Thu"},{id:"fri",label:"F",full:"Fri"},{id:"sat",label:"S",full:"Sat"}],n=[{id:"clock",label:"Clock"},{id:"dawn",label:"Dawn"},{id:"sunrise",label:"Sunrise"},{id:"dusk",label:"Dusk"},{id:"sunset",label:"Sunset"}];function a(e){const t=String(e||"").trim();let i=/^(\d{1,2}):(\d{2})$/.exec(t);if(i){let e=Number(i[1]);const t=Number(i[2]);return e<0||e>24||t<0||t>59||t%15||24===e&&0!==t?null:(24===e&&(e=0),60*e+t)}if(i=/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(t),i){let e=Number(i[1]);const t=Number(i[2]),r=i[3].toUpperCase();return e<1||e>12||t<0||t>59||t%15?null:("AM"===r?12===e&&(e=0):12!==e&&(e+=12),60*e+t)}return null}function o(e,t){e=(e%1440+1440)%1440;const i=Math.floor(e/60),r=e%60;if("24"===t)return`${String(i).padStart(2,"0")}:${String(r).padStart(2,"0")}`;const n=i>=12?"PM":"AM";let a=i%12;return 0===a&&(a=12),`${a}:${String(r).padStart(2,"0")} ${n}`}function s(e,t){const i=a(e);return null==i?e||"—":o(i,t)}function d(e){const t=a(e);if(null==t)return"07:00";const i=Math.floor((t%1440+1440)%1440/60),r=(t%1440+1440)%1440%60;return`${String(i).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function c(e){const t=a(e);return null==t?null:o(t,"24")}function l(e){const t=String(e||"").trim();return/^\d{4}-\d{2}-\d{2}$/.test(t)&&!t.startsWith("2000-")?t:""}function u(e,t){const i=l(e);return i||("start"===t?_():v())}function p(e,t){const i=String(e||"").trim();return/^\d{4}-\d{2}-\d{2}$/.test(i)&&t?i.slice(5):i}function h(e){const t=String(e||"").trim();let i=/^(\d{2})-(\d{2})$/.exec(t);return i?{month:Number(i[1]),day:Number(i[2])}:(i=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t),i?{month:Number(i[2]),day:Number(i[3])}:{month:1,day:1})}function m(e,t){return`${String(e).padStart(2,"0")}-${String(t).padStart(2,"0")}`}const f=[["1","Jan"],["2","Feb"],["3","Mar"],["4","Apr"],["5","May"],["6","Jun"],["7","Jul"],["8","Aug"],["9","Sep"],["10","Oct"],["11","Nov"],["12","Dec"]];function g(){const e=new Date;return{y:e.getFullYear(),month:e.getMonth()+1,day:e.getDate()}}function b(){const e=new Date,t=new Date(e.getFullYear(),e.getMonth()+1,0);return{y:t.getFullYear(),month:t.getMonth()+1,day:t.getDate()}}function _(){const e=g();return`${e.y}-${String(e.month).padStart(2,"0")}-${String(e.day).padStart(2,"0")}`}function v(){const e=b();return`${e.y}-${String(e.month).padStart(2,"0")}-${String(e.day).padStart(2,"0")}`}function w(){const e=g();return m(e.month,e.day)}function y(){const e=b();return m(e.month,e.day)}function x(e,t){const i=String(e||"").trim();if(!i)return"—";let r,n,a=null,o=/^(\d{4})-(\d{2})-(\d{2})$/.exec(i);if(o)a=Number(o[1]),r=Number(o[2]),n=Number(o[3]);else{const e=h(i);r=e.month,n=e.day}const s=function(e){const t=f.find((([t])=>Number(t)===Number(e)));return t?t[1]:String(e)}(r);if(t){return`${s} ${n}, ${null!=a?a:(new Date).getFullYear()}`}return`${s} ${String(n).padStart(2,"0")}`}const k="Use times on 15-minute steps (e.g. 7:00, 7:15).",$="Enter a name.",S="Name can’t be empty.",E="No schedule has been created. Click to paint the day stip or click 'Add a new schedule'",C="Created, but Home Assistant hasn’t shown the new entity yet. Wait a moment, then add a card for it (or refresh).",D="This card isn’t linked to a schedule yet.",M="This group card isn’t linked correctly. Re-select the group entity.";function N(e){return`Schedule window dates overlap with “${e}”. Change Start/End so the ranges don’t share any days.`}function A(e){if(null==e||""===e||!1===e)return null;if("string"==typeof e){const t=e.split(".",1)[0];return"scene"!==t&&"script"!==t||!e.includes(".")?null:{service:`${t}.turn_on`,target:{entity_id:[e]},data:{}}}if("object"!=typeof e)return null;const t=e.service||e.action;if(!t||"string"!=typeof t||!t.includes("."))return null;const i={},r=e.target&&"object"==typeof e.target?e.target:{};for(const t of["entity_id","device_id","area_id","label_id"]){let n=r[t];null==n&&"entity_id"===t&&null!=e.entity_id&&(n=e.entity_id),null!=n&&""!==n&&(i[t]=Array.isArray(n)?n.filter(Boolean).map(String):[String(n)])}const n=e.data&&"object"==typeof e.data&&!Array.isArray(e.data)?{...e.data}:{};return{service:String(t),target:i,data:n}}function T(e){if(null==e||""===e||!1===e)return null;const t=function(e){if(null==e||"object"!=typeof e)return null;const t=e.type;return"wait"!==t&&(null!=t&&""!==t||!("seconds"in e)&&!("minutes"in e)||e.service||e.action)?null:{type:"wait",seconds:0|Math.max(0,Number(e.seconds)||0)+60*Math.max(0,Number(e.minutes)||0)}}(e);if(t)return t;let i=e;if("object"==typeof e&&"action"===e.type){const{type:t,...r}=e;i=r}const r=A(i);return r?{type:"action",...r}:null}function F(e){if(null==e||""===e||!1===e)return[];if(Array.isArray(e))return e.map(T).filter(Boolean);const t=T(e);return t?[t]:[]}function R(e){return(e||[]).map((e=>{const t=T(e);return t?"wait"===t.type?{type:"wait",seconds:0|t.seconds}:{service:t.service,target:{...t.target||{}},data:{...t.data||{}}}:null})).filter(Boolean)}function z(e){return F(e)}function I(e){const t=A(e);return t?.target?.entity_id||[]}function O(e,t){if(!t)return"";const[i,r]=t.split(".");if(!i||!r)return t;try{const t=e?.localize?.(`component.${i}.services.${r}.name`);if(t&&t!==`component.${i}.services.${r}.name`)return t}catch(e){}const n=e?.services?.[i]?.[r];return n?.name?n.name:function(e){return((e||"").split(".")[1]||e||"").split("_").filter(Boolean).map((e=>e.charAt(0).toUpperCase()+e.slice(1))).join(" ")}(t)}function W(e,t){if(!t)return"";const i=e?.states?.[t];return i?.attributes?.friendly_name||t}const P=["=","!="],j=["<",">"],B="all",L="any";function q(e){if(!e||"object"!=typeof e)return null;const t=String(e.entity_id||"").trim();if(!t||!t.includes("."))return null;let i=String(e.op||"=").trim();[...P,...j].includes(i)||(i="=");const r=null!=e.state?String(e.state):null!=e.value?String(e.value):"";if(j.includes(i)){const e=r.trim();if(""===e||Number.isNaN(Number(e)))return null}return{entity_id:t,op:i,state:r}}function K(e){return(e||[]).map(q).filter(Boolean)}function G(e){return e===L?L:B}function U(e,t){const i=e?.states?.[t],r=i?.attributes?.options;return Array.isArray(r)&&r.length?r.map(String):null}function H(e,t){const i=e?.states?.[t];if(!i)return!1;const r=t.split(".",1)[0];return!!["number","input_number","counter"].includes(r)||(!Number.isNaN(Number(i.state))||"sensor"===r&&null!=i.attributes?.unit_of_measurement&&!Number.isNaN(Number(i.state)))}function Q(e,t){const i=q(t);if(!i)return"";return`${W(e,i.entity_id)} ${i.op} ${i.state}`}function Y(e){const t=new Set;if(!e)return t;const i=Array.isArray(e)?e:[e];for(const e of i){if(!e||"object"!=typeof e)continue;const i=e.domain;i&&(Array.isArray(i)?i.forEach((e=>e&&t.add(String(e)))):t.add(String(i)))}return t}function J(e,t){if(!t)return[];const[i,r]=t.split("."),n=e?.services?.[i]?.[r]||{},a=new Set;Y(n.target?.entity).forEach((e=>a.add(e)));const o=n.fields||{};for(const e of Object.values(o)){if(!e||"object"!=typeof e)continue;const t=e.selector||{};t.entity&&Y(t.entity).forEach((e=>a.add(e))),t.target?.entity&&Y(t.target.entity).forEach((e=>a.add(e)))}return!a.size&&i&&a.add(i),[...a]}function V(e,t){const i=t||{};if(i.color_rgb||/rgb_color|rgbw_color|rgbww_color/i.test(e))return"rgb";const r=i.color_temp;if(r){const e=(r.unit||r.unit_of_measurement||"").toLowerCase();return"kelvin"===e||"k"===e||null==r.min_mireds?"kelvin":"mired"}return/color_temp_kelvin|kelvin/i.test(e)?"kelvin":i.number?"number":null!=i.boolean||"boolean"in i?"boolean":i.select?"select":"text"}function X(e,t){const i=function(e){let t=String(e||"");return t=t.replace(/^.*HomeAssistantError:\s*/i,""),t=t.replace(/^Failed to call service[^:]*:\s*/i,""),t=t.replace(/^ValueError:\s*/i,""),t.trim()}(e?.message||e);let r;if(r=/Overlapping (?:seasons|schedule windows) between ['"]([^'"]+)['"] and ['"]([^'"]+)['"]/i.exec(i)){const e=t?.selfName;return N(e&&e===r[1]?r[2]:e&&e===r[2]?r[1]:r[2])}return/Member not available/i.test(i)?(n=t?.memberName,`“${n||"This schedule window"}” is turned off for this group. Enable it before making it Active.`):/Unknown group or member|Unknown group/i.test(i)?"This schedule window isn’t available anymore — refresh the dashboard.":/Unknown schedule/i.test(i)?"That schedule was removed or renamed. Refresh the dashboard.":/Action must be|Action service must be|Invalid action/i.test(i)?"Pick a Home Assistant action (domain.service).":/Invalid time|15-minute steps/i.test(i)?k:/already exists|duplicate|unique/i.test(i)?"A schedule with a similar name already exists. Choose a different name.":t?.create?"Couldn’t create that schedule. Check the name and try again.":t?.active?"Couldn’t update Active selection. Try again.":"Something went wrong saving this schedule. Try again.";var n}function Z(e){const t=String(e||"").trim();if(!t)return null;let i=/^(\d{2})-(\d{2})$/.exec(t);if(i){const e=Number(i[1]),t=Number(i[2]);return e<1||e>12||t<1||t>31?{invalid:!0}:{kind:"md",month:e,day:t}}if(i=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t),i){const e=Number(i[1]),t=Number(i[2]),r=Number(i[3]);return t<1||t>12||r<1||r>31?{invalid:!0}:{kind:"ymd",y:e,month:t,day:r}}return{invalid:!0}}function ee(e,t){if(!e)return!1;const i=Z(e.start),r=Z(e.end);if(!i||!r||i.invalid||r.invalid)return!1;const n=t.getFullYear(),a=t=>"md"===t.kind||!1!==e.recurs_yearly?new Date(n,t.month-1,t.day):new Date(t.y,t.month-1,t.day),o=a(i),s=a(r),d=new Date(n,t.getMonth(),t.getDate());return o<=s?d>=o&&d<=s:d>=o||d<=s}function te(e,t){if(!e||!t)return!1;const i=(new Date).getFullYear(),r=new Date(i,0,1);for(let i=0;i<366;i++){const n=new Date(r.getTime());if(n.setDate(r.getDate()+i),ee(e,n)&&ee(t,n))return!0}return!1}function ie(e){if(!e)return null;const t=String(e.start||"").trim(),i=String(e.end||"").trim();if(t&&!i||!t&&i)return"Enter both a Start and End date for this window.";if(!t&&!i)return null;const r=Z(t),n=Z(i);if(!r||r.invalid||!n||n.invalid)return"Use a valid date (month–day, or a full calendar date).";if(!1===e.recurs_yearly&&"ymd"===r.kind&&"ymd"===n.kind){const e=new Date(r.y,r.month-1,r.day);if(new Date(n.y,n.month-1,n.day)<e)return"End must be on or after Start (or turn on Recurs annually to continue into the next year)."}return null}function re(e,t,i){if(!t)return"";const r="warning"===i?"warning":"critical";return e`<div class="ssc-chip ${r}" role="status">
      <ha-icon icon="${"warning"===r?"mdi:alert-outline":"mdi:alert-circle-outline"}"></ha-icon>
      <span>${t}</span>
    </div>`}function ne(e,t){if(!t?.message)return"";const i="warning"===t.level?"warning":"critical";return e`<div class="ssc-card-toast ${i}" role="status">
      <ha-icon icon="${"warning"===i?"mdi:alert-outline":"mdi:alert-circle-outline"}"></ha-icon>
      <span>${t.message}</span>
    </div>`}function ae(e,t){if(!e)return"—";if("clock"===e.kind)return s(e.time,t||"12");const i=e.kind.charAt(0).toUpperCase()+e.kind.slice(1),r=Number(e.offset_minutes||0);if(!r)return i;const n=r>0?"+":"−",a=Math.abs(r);return a%60==0?`${i}${n}${a/60}h`:`${i}${n}${a}m`}function oe(e,t){if(!e)return"";const i=e.from||e.start,r=e.to||e.end;return"clock"===i?.kind&&"clock"===r?.kind?`${s(i.time,t)}–${s(r.time,t)}`:`${ae(i,t)} → ${ae(r,t)}`}function se(e){const t=e?.from||e?.start,i=e?.to||e?.end;return"clock"===t?.kind&&"clock"===i?.kind}function de(e,t){if(!t)return null;if("clock"===t.kind)return a(t.time);const i=e?.states?.["sun.sun"]?.attributes||{},r={dawn:"dawn",sunrise:"rising",dusk:"dusk",sunset:"setting"}[t.kind],n={dawn:"next_dawn",sunrise:"next_rising",dusk:"next_dusk",sunset:"next_setting"}[t.kind],o=r&&i[r]||n&&i[n];if(!o)return null;const s=new Date(o);if(Number.isNaN(s.getTime()))return null;let d=60*s.getHours()+s.getMinutes();return d+=Number(t.offset_minutes||0),d=15*Math.round(d/15),(d%1440+1440)%1440}function ce(e){const t=e.from||e.start,i=e.to||e.end;if("clock"===t?.kind&&"clock"===i?.kind){const e=a(t.time),r=a(i.time);return null!=e&&null!=r&&r<=e}return!1}function le(e,t){return e&&Array.isArray(e.weekdays)?e.weekdays:t||[]}function ue(e){const t=e||[];if(!t.length)return"No days selected";if(7===t.length)return"Every day";const i=(e,t)=>e.length===t.length&&e.every((e=>t.includes(e)));return i(t,["mon","tue","wed","thu","fri"])?"Mon–Fri":i(t,["sat","sun"])?"Sat–Sun":r.filter((e=>t.includes(e.id))).map((e=>e.full)).join(", ")}let pe=null,he=null;function me(){if(document.getElementById("ssc-floating-tip-style"))return;const e=document.createElement("style");e.id="ssc-floating-tip-style",e.textContent="\n      .ssc-floating-tip {\n        position: fixed;\n        z-index: 2147483000;\n        max-width: min(280px, calc(100vw - 16px));\n        padding: 7px 9px;\n        border-radius: 4px;\n        border: 1px solid #000;\n        background: #111;\n        color: #fff;\n        font-size: 0.75rem;\n        font-weight: 500;\n        line-height: 1.35;\n        text-align: left;\n        white-space: normal;\n        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);\n        pointer-events: none;\n        opacity: 1;\n      }\n      .ssc-confirm-backdrop {\n        position: fixed;\n        inset: 0;\n        z-index: 2147483600;\n        background: rgba(0, 0, 0, 0.55);\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        padding: 16px;\n        box-sizing: border-box;\n      }\n      .ssc-confirm-dialog {\n        background: #1c1c1c;\n        color: #f5f5f5;\n        border: 1px solid #444;\n        border-radius: 12px;\n        padding: 16px 18px;\n        max-width: 380px;\n        width: 100%;\n        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);\n        font-size: 0.95rem;\n        line-height: 1.4;\n      }\n      .ssc-confirm-dialog p {\n        margin: 0 0 14px;\n        white-space: pre-wrap;\n      }\n      .ssc-confirm-actions {\n        display: flex;\n        justify-content: flex-end;\n        gap: 8px;\n        flex-wrap: wrap;\n      }\n      .ssc-confirm-actions button {\n        border-radius: 8px;\n        padding: 8px 14px;\n        font-size: 0.9rem;\n        font-weight: 650;\n        cursor: pointer;\n      }\n      .ssc-confirm-actions .ssc-cancel {\n        border: 1px solid #666;\n        background: transparent;\n        color: #f5f5f5;\n      }\n      .ssc-confirm-actions .ssc-ok {\n        border: 1px solid #5b7c8a;\n        background: #5b7c8a;\n        color: #fff;\n      }\n    ",document.head.appendChild(e)}let fe=null;function ge(){fe&&(fe.remove(),fe=null)}function be(e,t){return me(),_e(),ge(),new Promise((i=>{const r=document.createElement("div");r.className="ssc-confirm-backdrop",r.setAttribute("role","dialog"),r.setAttribute("aria-modal","true");const n=document.createElement("div");n.className="ssc-confirm-dialog";const a=document.createElement("p");a.textContent=e;const o=document.createElement("div");o.className="ssc-confirm-actions";const s=document.createElement("button");s.type="button",s.className="ssc-cancel",s.textContent="Cancel";const d=document.createElement("button");d.type="button",d.className="ssc-ok",d.textContent=t||"OK";const c=e=>{ge(),i(e)};s.addEventListener("click",(e=>{e.stopPropagation(),c(!1)})),d.addEventListener("click",(e=>{e.stopPropagation(),c(!0)})),r.addEventListener("click",(e=>{e.target===r&&c(!1)})),o.appendChild(s),o.appendChild(d),n.appendChild(a),n.appendChild(o),r.appendChild(n),document.body.appendChild(r),fe=r,d.focus()}))}function _e(){pe&&(pe.remove(),pe=null),he=null}function ve(e,t,i){const r=e.getBoundingClientRect(),n=t.offsetWidth,a=t.offsetHeight;let o=r.top-a-6,s="end"===i?r.right-n:"start"===i?r.left:r.left+r.width/2-n/2;o<8&&(o=r.bottom+6),o+a>window.innerHeight-8&&(o=Math.max(8,r.top-a-6)),s=Math.max(8,Math.min(s,window.innerWidth-n-8)),t.style.top=`${Math.round(o)}px`,t.style.left=`${Math.round(s)}px`}function we(e){const t=e.currentTarget;t&&function(e,t,i){if(!e||!t)return;if(me(),he===e&&pe)return void ve(e,pe,i);_e();const r=document.createElement("div");r.className="ssc-floating-tip",r.setAttribute("role","tooltip"),r.textContent=t,document.body.appendChild(r),pe=r,he=e,ve(e,r,i||null)}(t,t.getAttribute("data-tip"),t.getAttribute("data-tip-align"))}function ye(){_e()}function xe(e,t,i){if(null==t||null==i)return;const r=t/15,n=i/15;if(n>r)for(let t=r;t<n;t++)e[t]=!0;else{for(let t=r;t<96;t++)e[t]=!0;for(let t=0;t<n;t++)e[t]=!0}}function ke(e,t){const i=Array.from({length:96},(()=>!1));for(const r of e||[]){const e=r.from||r.start,n=r.to||r.end;if(!t&&("clock"!==e?.kind||"clock"!==n?.kind))continue;const a=de(t,e),o=de(t,n);null!=a&&null!=o&&xe(i,a,o)}return i}function $e(e){if(!e||"object"!=typeof e)return[];const t=e?.target?.entity_id;return Array.isArray(t)?t.filter(Boolean).map(String):"string"==typeof t&&t?[t]:[]}const Se=new WeakMap,Ee=["next_dawn","next_rising","next_dusk","next_setting","dawn","rising","dusk","setting"];function Ce(e,t){if(e===t)return!1;if(!e||!t)return!0;const i=e.attributes||{},r=t.attributes||{};return Ee.some((e=>i[e]!==r[e]))}function De(e,t){if(!t)return new Set;const i=e?.states?.[t],r=i&&Se.get(i);if(r&&r.entityId===t)return r.ids;const n=new Set;n.add(t);const a=i?.attributes||{},o=e=>{for(const t of z(e))for(const e of $e(t))n.add(e)};o(a.default_on_start),o(a.default_on_end);for(const e of a.windows||[]){if(!e||"object"!=typeof e)continue;o(e.on_start),o(e.on_end);for(const t of e.conditions||[])t?.entity_id&&n.add(String(t.entity_id));const t=e.from||e.start||{},i=e.to||e.end||{};t.kind&&"clock"!==t.kind&&n.add("sun.sun"),i.kind&&"clock"!==i.kind&&n.add("sun.sun")}for(const e of a.members||[])e?.entity_id&&n.add(String(e.entity_id)),e?.id&&n.add(`simple_schedule.${e.id}`);for(const e of a.member_ids||[])"string"==typeof e&&e&&n.add(`simple_schedule.${e}`);return i&&"object"==typeof i&&Se.set(i,{entityId:t,ids:n}),n}function Me(e,t,i,r){if(r)return!0;if(!t||!e)return!0;if(e===t)return!1;const n=De(t,i),a=De(e,i);for(const i of n===a?[a]:[n,a])for(const r of i){const i=e.states?.[r],n=t.states?.[r];if(i!==n){if("sun.sun"!==r)return!0;if(Ce(n,i))return!0}}return e.services!==t.services}const Ne=new Set;let Ae=null,Te=0,Fe=null;function Re(e){for(const t of[...Ne])try{t._onActionFailed?.(e)}catch(e){}}function ze(){const e=Ae;if(Ae=null,Fe=null,Te+=1,e)if("function"!=typeof e)"function"==typeof e.then&&e.then((e=>{if("function"==typeof e)try{e()}catch(e){}})).catch((()=>{}));else try{e()}catch(e){}}function Ie(e){Ne.add(e),function(e){const t=e?.connection;if(!t?.subscribeEvents)return;if(Ae&&Fe===t)return;Ae&&ze();const i=Te+=1;Fe=t;const r=t.subscribeEvents(Re,"simple_schedule_action_failed");Ae=r,r.then((e=>{Te===i?Ae=e:"function"==typeof e&&e()})).catch((()=>{Te===i&&(Ae=null,Fe=null)}))}(e.hass)}function Oe(e){return Array.isArray(e)?e.filter((e=>e&&"object"==typeof e)):e&&"object"==typeof e?Object.values(e).filter((e=>e&&"object"==typeof e)):[]}function We(e,t){const i=t?.from||t?.start,r=t?.to||t?.end,n=de(e,i),a=de(e,r);return null==n||null==a?null:a>n?[[n,a]]:[[n,1440],[0,a]]}function Pe(e,t){return e[0]<t[1]&&t[0]<e[1]}function je(e,t,i,r){if(!function(e,t,i){const r=le(e,i),n=le(t,i);return!r.length||!n.length||r.some((e=>n.includes(e)))}(t,i,r))return!1;const n=We(e,t),a=We(e,i);if(!n||!a)return!1;for(const e of n)for(const t of a)if(Pe(e,t))return!0;return!1}function Be(e,t,i){const r=new Set,n=e||[];for(let e=0;e<n.length;e++)for(let a=e+1;a<n.length;a++)je(t,n[e],n[a],i)&&(r.add(n[e].id),r.add(n[a].id));return r}class Le extends e{connectedCallback(){super.connectedCallback(),this._bindActionFailListener(),this._startNowTimer()}disconnectedCallback(){super.disconnectedCallback(),_e(),ge(),this._teardownActionFailListener(),this._stopNowTimer(),this._toastTimer&&(clearTimeout(this._toastTimer),this._toastTimer=null)}get hass(){return this.__hass}set hass(e){const t=this.__hass,i=Boolean(this._condPickerFor||this._pickerFor||this._targetPickerFor||this._adding);Me(e,t,this._boundEntity||this._config?.entity||null,i)?(this.__hass=e,this.requestUpdate("hass",t)):this.__hass=e}static get properties(){return{_config:{},_expanded:{type:Boolean},_fromKind:{type:String},_toKind:{type:String},_fromClock:{type:String},_toClock:{type:String},_fromOffset:{type:String},_toOffset:{type:String},_pickerFor:{type:String},_pickerQuery:{type:String},_targetPickerFor:{type:String},_targetQuery:{type:String},_advancedOpen:{type:String},_actionDomainFilter:{type:String},_error:{type:String},_adding:{type:Boolean},_expandedWindowId:{type:String},_dragging:{type:Boolean},_dragValue:{type:Boolean},_renaming:{type:Boolean},_renameDraft:{type:String},_addWeekdays:{type:Array},_condPickerFor:{type:String},_condQuery:{type:String},_condDraftEntity:{type:String},_condDraftOp:{type:String},_condDraftState:{type:String},_actionEditKey:{type:String},_actionEditDraft:{},_boundEntity:{type:String},_createKind:{type:String},_createName:{type:String},_createError:{type:String},_createBusy:{type:Boolean},_createSuccess:{},_cardToast:{},_renameError:{type:String},_errorLevel:{type:String}}}updated(e){e.has("hass")&&this._bindActionFailListener()}_onActionFailed(e){const t=e?.data||{},i=this._entityId||this._config?.entity;if(i&&t.entity_id&&t.entity_id!==i)return;const r=t.service||"action",n=O(this.hass,r)||r,a="end"===t.which?"end":"start";this._showToast(((e,t)=>`Couldn’t run “${e}” at window ${t} — entity missing or unavailable.`)(n,a),"critical")}_bindActionFailListener(){this.hass?.connection?.subscribeEvents&&Ie(this)}_teardownActionFailListener(){var e;e=this,Ne.delete(e),0===Ne.size&&ze()}_startNowTimer(){this._stopNowTimer();const e=()=>{const t=new Date,i=60*t.getHours()+t.getMinutes(),r=60*(15*(Math.floor(i/15)+1)-i)*1e3-1e3*t.getSeconds()-t.getMilliseconds();this._nowTimer=setTimeout((()=>{this._nowTimer=null,this.requestUpdate(),e()}),Math.max(r,250))};e()}_stopNowTimer(){this._nowTimer&&(clearTimeout(this._nowTimer),this._nowTimer=null)}_showToast(e,t){this._cardToast={message:e,level:t||"critical"},this._toastTimer&&clearTimeout(this._toastTimer),this._toastTimer=setTimeout((()=>{this._toastTimer=null,this._cardToast=null}),5e3)}async _ssCall(e,t,i){try{return await this.hass.callService("simple_schedule",e,t),!0}catch(e){const t=X(e,i?.ctx);return"create"===i?.inline?this._createError=t:"error"===i?.inline?(this._error=t,this._errorLevel=i?.level||"critical"):"rename"===i?.inline?this._renameError=t:this._showToast(t,i?.level||"critical"),!1}}static get styles(){return i`
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
          /* Overlap accent — amber/gold #C9A227; not error/enabled */
          --ss-overlap: #c9a227;
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
          border: 1px solid color-mix(in srgb, var(--success-color, #4caf50) 55%, #000);
          color: #000000; /* near-black on green for contrast */
          font-weight: 700;
          gap: 4px;
          vertical-align: middle;
        }
        /* Group: selected window, no member schedule currently running — match Enabled toggle blue */
        .chip.window-active {
          background: var(--primary-color);
          border: 1px solid color-mix(in srgb, var(--primary-color) 55%, #000);
          color: var(--text-primary-color, #fff);
          font-weight: 700;
          gap: 4px;
          vertical-align: middle;
        }
        .chip.active ha-icon,
        .chip.window-active ha-icon {
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
        .chip.active ha-icon svg,
        .chip.window-active ha-icon svg {
          display: block;
          width: 14px;
          height: 14px;
        }
        .chip.active .chip-label,
        .chip.window-active .chip-label {
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
        /* After .window-card so left rail / tint win over the base border shorthand */
        .window-card.overlap {
          border-left: 4px solid var(--ss-overlap);
          background: color-mix(
            in srgb,
            var(--ss-overlap) 12%,
            var(--secondary-background-color, var(--card-background-color))
          );
        }
        .chip.overlap {
          background: color-mix(in srgb, var(--ss-overlap) 22%, transparent);
          color: var(--primary-text-color);
          border: 1px solid var(--ss-overlap);
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
        /* Pressed/ON for toggles that reuse add-new-bar (don't-require-default). */
        button.add-new-bar.on {
          border-style: solid;
          border-color: var(--primary-color);
          color: var(--text-primary-color, #fff);
          background: var(--primary-color);
        }
        button.add-new-bar.on:hover {
          border-color: var(--primary-color);
          background: color-mix(in srgb, var(--primary-color) 88%, #000);
          color: var(--text-primary-color, #fff);
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
        .chip.active[data-tip],
        .chip.window-active[data-tip] {
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
      `}setConfig(e){const t=e||{},i=this._config?.entity,r=i!==t.entity;this._config=t,t.embedded||t.editor_only?this._expanded=!0:(r||null==this._expanded)&&(this._expanded=Boolean(t.expanded||t.start_expanded)),(r||null==i)&&(this._fromKind="clock",this._toKind="clock",this._fromClock="7:00 AM",this._toClock="9:00 AM",this._fromOffset="0",this._toOffset="0",this._pickerFor=null,this._pickerQuery="",this._error=null,this._adding=!1,this._expandedWindowId=null,this._renaming=!1,this._renameDraft="",this._createKind=this._createKind||"solo",this._createName=this._createName||"",this._createError=null,this._createBusy=!1,r&&(this._boundEntity=null)),this.requestUpdate()}getCardSize(){return this._entityId?this._expanded?8:2:4}get _fmt(){return"24"===String(this._config?.time_format||"12")?"24":"12"}get _entityId(){return this._boundEntity||this._config?.entity||null}get _state(){const e=this._entityId;return e?this.hass?.states?.[e]:null}get _attrs(){return this._state?.attributes||{}}get _scheduleId(){return this._attrs.schedule_id||this._config.schedule_id||null}async _resolveScheduleId(){if(this._scheduleId)return this._scheduleId;const e=this._entityId;return this._config.schedule_id||e?.split(".")[1]}_slugifyName(e){let t=String(e||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");for(;t.includes("__");)t=t.replace("__","_");return t||"schedule"}_getLovelace(){let e=this;for(;e;){if(e.lovelace)return e.lovelace;const t="function"==typeof e.getRootNode?e.getRootNode():null;e=t&&t.host||e.parentElement}try{const e=document.querySelector("home-assistant"),t=e?.shadowRoot?.querySelector("home-assistant-main"),i=t?.shadowRoot?.querySelector("ha-drawer partial-panel-resolver ha-panel-lovelace")||t?.shadowRoot?.querySelector("ha-panel-lovelace");return i?.lovelace||i?.shadowRoot?.querySelector("hui-root")?.lovelace||null}catch(e){return null}}_replaceCardConfigInTree(e,t,i,r){if(e===i)return{...t,...r};if(Array.isArray(e)&&Array.isArray(t)){let n=!1;const a=t.map(((t,a)=>{const o=this._replaceCardConfigInTree(e[a],t,i,r);return o!==t&&(n=!0),o}));return n?a:t}if(e&&t&&"object"==typeof e&&"object"==typeof t){let n=!1;const a={...t};for(const o of Object.keys(e)){if(!Object.prototype.hasOwnProperty.call(t,o))continue;const s=this._replaceCardConfigInTree(e[o],t[o],i,r);s!==t[o]&&(a[o]=s,n=!0)}return n?a:t}return t}_replaceBlankCardStructural(e,t){const i=[],r=(e,t,n)=>{if(Array.isArray(e))return void e.forEach(((t,i)=>r(t,e,i)));if(!e||"object"!=typeof e)return;const a=String(e.type||"");"custom:simple-schedule-card"!==a&&"simple-schedule-card"!==a||e.entity||i.push({parent:t,key:n});for(const t of Object.keys(e))r(e[t],e,t)};if(r(e,null,null),1!==i.length)return!1;const{parent:n,key:a}=i[0];return n[a]={...n[a],...t},!0}async _persistLovelaceCardConfig(e,t){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}));const i=this._getLovelace();if(!i||"function"!=typeof i.saveConfig)return!1;if("yaml"===i.mode)return!1;try{const r=i.rawConfig||i.config;if(!r)return!1;const n=JSON.parse(JSON.stringify(r)),a=this._replaceCardConfigInTree(r,n,e,t);return a!==n?(await i.saveConfig(a),!0):!!this._replaceBlankCardStructural(n,t)&&(await i.saveConfig(n),!0)}catch(e){return console.warn("simple-schedule-card: Lovelace save failed",e),!1}}async _bindEntity(e,t,i){const r=this._config||{},n={...r,entity:e,time_format:r.time_format||"12"};t?n.type="custom:simple-schedule-group-card":n.type||(n.type="custom:simple-schedule-card"),this._createSuccess=null;const a=await this._persistLovelaceCardConfig(r,n);t?a?(this._config=n,this._boundEntity=e):(this._boundEntity=null,this._createSuccess={kind:"group",entityId:e,name:i||this._createName}):(this._boundEntity=e,this._config=n,a||console.warn("simple-schedule-card: bound entity in-session only; Lovelace config not saved (YAML mode or card path not found). Reload may show create dialog again.")),this.requestUpdate()}async _waitForEntity(e,t=8e3){const i=Date.now();for(;Date.now()-i<t;){if(this.hass?.states?.[e])return!0;await new Promise((e=>setTimeout(e,250)))}return Boolean(this.hass?.states?.[e])}async _createFromBlank(){const e=String(this._createName||"").trim();if(this._createError=null,e){this._createBusy=!0;try{const t="group"===this._createKind?"group":"solo",i=this._slugifyName(e);let r;if("group"===t){if(r=await this._ssCall("create_group",{name:e,object_id:i},{inline:"create",ctx:{create:!0}}),!r)return;const t=`simple_schedule.group_${i}`,n=await this._waitForEntity(t);if(this._createName="",!n)return this._createError=C,void await this._bindEntity(t,!0,e);await this._bindEntity(t,!0,e)}else{if(r=await this._ssCall("create_schedule",{name:e,object_id:i,enabled:!0,weekdays:["sun","mon","tue","wed","thu","fri","sat"],windows:[]},{inline:"create",ctx:{create:!0}}),!r)return;const t=`simple_schedule.${i}`,n=await this._waitForEntity(t);if(this._createName="",!n)return this._createError=C,void await this._bindEntity(t,!1,e);await this._bindEntity(t,!1,e)}}finally{this._createBusy=!1}}else this._createError=$}_renderBlankCreate(){const e="group"===this._createKind?"group":"solo",i=this._createSuccess;return t`
        <ha-card>
          <div class="body blank-create">
            <h2>New Schedule</h2>
            ${i?t`<div class="hint">
                    Created
                    <strong>${i.name||"schedule group"}</strong>
                    (<code style="display:block;margin-top:6px"
                      >${i.entityId}</code
                    >
                    Add a
                    <strong>Simple Schedule Group</strong> card with that entity
                    to edit members, or create another below.
                  </div>
                  <button
                    type="button"
                    class="add-new-bar"
                    @click=${()=>{this._createSuccess=null,this._createName=""}}
                  >
                    Create another
                  </button>`:t`
                  <div class="hint">
                    Create a solo schedule or a group of schedules that are
                    active at different times of the year
                  </div>
                  <div class="kind-row">
                    <button
                      type="button"
                      class="${"solo"===e?"on":""}"
                      @click=${()=>this._createKind="solo"}
                    >
                      Solo schedule
                    </button>
                    <button
                      type="button"
                      class="${"group"===e?"on":""}"
                      @click=${()=>this._createKind="group"}
                    >
                      Schedule group
                    </button>
                  </div>
                  <div class="date-row name-row">
                    <span class="muted">Name</span>
                    <input
                      type="text"
                      placeholder=${"group"===e?"e.g. Outdoor lighting themes":"e.g. Classroom hours"}
                      .value=${this._createName||""}
                      @input=${e=>this._createName=e.target.value}
                      @keydown=${e=>{"Enter"===e.key&&this._createFromBlank()}}
                    />
                  </div>
                  <button
                    type="button"
                    class="add-new-bar"
                    ?disabled=${this._createBusy}
                    @click=${()=>this._createFromBlank()}
                  >
                    ${this._createBusy?"Creating…":"group"===e?"Create schedule group":"Create schedule"}
                  </button>
                  ${re(t,this._createError,"critical")}
                `}
          </div>
        </ha-card>
      `}_statusText(){return this._attrs.enabled?"on"===this._state?.state?"Active now":"Inactive":"Disabled"}_nextHint(){const e=this._attrs;if(!e.enabled)return"";if(e.active_window?.to)try{const t=new Date(e.active_window.to);return`Ends ${o(60*t.getHours()+t.getMinutes(),this._fmt)}`}catch{return""}if(e.next_event)try{const t=new Date(e.next_event);return`Next ${o(60*t.getHours()+t.getMinutes(),this._fmt)}`}catch{return""}return""}async _setEnabled(e){e.stopPropagation();const t=e.currentTarget||e.target;let i=t?.checked;"boolean"!=typeof i&&(i=t?.selected),"boolean"!=typeof i&&(i=!Boolean(this._attrs.enabled));const r=await this._resolveScheduleId();if(!r)return this._error=D,void(this._errorLevel="critical");await this._ssCall("set_enabled",{schedule_id:r,enabled:Boolean(i)})&&Boolean(i)&&!(this._attrs.windows||[]).length&&this._showToast("Enabled, but there are no hours — this schedule won’t turn Active until you add a window.","warning")}async _persist(e){const t=await this._resolveScheduleId();if(!t)return this._showToast(D,"critical"),!1;const i={...e};return Array.isArray(i.windows)&&(i.windows=i.windows.map((e=>({...e,on_start:R(e.on_start),on_end:R(e.on_end),conditions:K(e.conditions),condition_match:G(e.condition_match)})))),"default_on_start"in i&&(i.default_on_start=R(i.default_on_start)),"default_on_end"in i&&(i.default_on_end=R(i.default_on_end)),this._ssCall("update_schedule",{schedule_id:t,...i})}_windowWeekdays(e){return le(e,this._attrs?.weekdays||[])}_toggleDow(e,t){if(t){const i=(this._attrs.windows||[]).find((e=>e.id===t)),r=[...this._windowWeekdays(i)],n=r.includes(e)?r.filter((t=>t!==e)):[...r,e];return void this._patchWindow(t,{weekdays:n})}const i=[...this._addWeekdays||this._attrs.weekdays||[]],r=i.includes(e)?i.filter((t=>t!==e)):[...i,e];this._addWeekdays=r}_setPreset(e,t){let i=[];i="weekdays"===e?["mon","tue","wed","thu","fri"]:"weekend"===e?["sat","sun"]:"every"===e?r.map((e=>e.id)):[],t?this._patchWindow(t,{weekdays:i}):this._addWeekdays=i}_renderDowEditor(e,i){const n=i?this._windowWeekdays((this._attrs.windows||[]).find((e=>e.id===i))):this._addWeekdays||this._attrs?.weekdays||[];return t`
        <div class="dow-editor" style="margin-top:12px">
          <div class="muted" style="font-weight:600">Days of week</div>
          ${e?t`<div class="muted">${"For overnight windows, days apply to the start night only."}</div>`:""}
          <div class="dow row" style="margin-top:6px">
            ${r.map((e=>{const r=n.includes(e.id);return t`<button
                class="${r?"on":""}"
                @click=${()=>this._toggleDow(e.id,i)}
              >
                ${e.label}
              </button>`}))}
          </div>
          <div class="presets">
            <button
              type="button"
              @click=${()=>this._setPreset("weekdays",i)}
            >
              Weekdays
            </button>
            <button
              type="button"
              @click=${()=>this._setPreset("weekend",i)}
            >
              Weekend
            </button>
            <button
              type="button"
              @click=${()=>this._setPreset("every",i)}
            >
              Every day
            </button>
            <button
              type="button"
              @click=${()=>this._setPreset("clear",i)}
            >
              Clear
            </button>
          </div>
          ${(i?this._windowWeekdays((this._attrs.windows||[]).find((e=>e.id===i))):this._addWeekdays||this._attrs?.weekdays||[]).length?"":re(t,"No days selected — this window won’t run until you pick at least one day.","warning")}
        </div>
      `}_cellFill(e,t){const i=e[2*t],r=e[2*t+1];return i&&r?3:i?1:r?2:0}_onCellPointer(e,t){const i=this._attrs.windows||[],r=i.filter(se),n=i.filter((e=>!se(e))),a=ke(r,null),s=2*e,d=2*e+1,c=this._cellFill(a,e);let l=c;l=null==t?{0:3,3:1,1:2,2:0}[c]:t?3:0,a[s]=3===l||1===l,a[d]=3===l||2===l;const u=function(e,t){const i=[];let r=null;for(let t=0;t<=96;t++){const n=t<96&&e[t];n&&null==r&&(r=t),n||null==r||(i.push([r,t]),r=null)}if(i.length>=2&&0===i[0][0]&&96===i[i.length-1][1]){const e=i.shift(),t=i.pop();i.push([t[0],e[1]+96])}return i.map((([e,i],r)=>{const n=15*(i>96?i-96:i),a=o(15*e,"24"),s=o(n%1440,"24"),d=(t||[])[r];return{id:d?.id||`w_${Date.now()}_${r}`,from:{kind:"clock",time:a},to:{kind:"clock",time:s},on_start:z(d?.on_start),on_end:z(d?.on_end),weekdays:Array.isArray(d?.weekdays)?[...d.weekdays]:void 0,conditions:K(d?.conditions),condition_match:G(d?.condition_match)}}))}(a,r);this._persist({windows:[...u,...n]})}_addWindow(){this._error=null;const e=[...this._attrs.windows||[]];if("clock"===this._fromKind&&"clock"===this._toKind){const t=a(this._fromClock),i=a(this._toClock);if(null==t||null==i)return this._error=k,void(this._errorLevel="critical");if(t===i)return this._error="From and To can’t be the same time. For overnight, set To earlier than From (e.g. 10:00 PM → 6:00 AM).",void(this._errorLevel="critical");e.push({id:`w_${Date.now()}`,from:{kind:"clock",time:o(t,"24")},to:{kind:"clock",time:o(i,"24")},on_start:[],on_end:[],conditions:[],condition_match:B,weekdays:[...this._addWeekdays||this._attrs.weekdays||r.map((e=>e.id))]})}else e.push({id:`s_${Date.now()}`,from:"clock"===this._fromKind?{kind:"clock",time:o(a(this._fromClock)||0,"24")}:{kind:this._fromKind,offset_minutes:Number(this._fromOffset)||0},to:"clock"===this._toKind?{kind:"clock",time:o(a(this._toClock)||0,"24")}:{kind:this._toKind,offset_minutes:Number(this._toOffset)||0},on_start:[],on_end:[],conditions:[],condition_match:B,weekdays:[...this._addWeekdays||this._attrs.weekdays||r.map((e=>e.id))]});this._persist({windows:e})}_removeWindow(e){const t=(this._attrs.windows||[]).filter((t=>t.id!==e));this._persist({windows:t})}_duplicateWindow(e){const t=[...this._attrs.windows||[]],i=t.find((t=>t.id===e));if(!i)return;const n=`w_${Date.now()}`,a={id:n,from:{kind:"clock",time:"07:00"},to:{kind:"clock",time:"09:00"},weekdays:Array.isArray(i.weekdays)?[...i.weekdays]:Array.isArray(this._attrs?.weekdays)?[...this._attrs.weekdays]:r.map((e=>e.id)),conditions:K(i.conditions),condition_match:G(i.condition_match),on_start:z(i.on_start).map((e=>({service:e.service,target:{...e.target||{}},data:{...e.data||{}}}))),on_end:z(i.on_end).map((e=>({service:e.service,target:{...e.target||{}},data:{...e.data||{}}})))},o=t.findIndex((t=>t.id===e));t.splice(o+1,0,a),this._persist({windows:t}),this._expandedWindowId=n,this._pickerFor=null,this._condPickerFor=null,this._error=null}_patchWindow(e,t){const i=(this._attrs.windows||[]).map((i=>i.id===e?{...i,...t}:i));this._persist({windows:i})}_windowBound(e,t){return("from"===t?e.from||e.start:e.to||e.end)||{kind:"clock",time:"07:00"}}_setWindowBoundKind(e,t,i){const r=(this._attrs.windows||[]).find((t=>t.id===e));if(!r)return;const n=this._windowBound(r,t);if("clock"===i){const i="clock"===n.kind&&n.time?n.time:o(420,"24");return void this._patchWindow(e,{[t]:{kind:"clock",time:i}})}const a=n.kind===i?Number(n.offset_minutes||0):0;this._patchWindow(e,{[t]:{kind:i,offset_minutes:a}})}_setWindowClock(e,t,i){const r=a(i);if(null==r)return this._error=k,void(this._errorLevel="critical");this._error=null,this._patchWindow(e,{[t]:{kind:"clock",time:o(r,"24")}})}_setWindowOffset(e,t,i){const r=(this._attrs.windows||[]).find((t=>t.id===e));if(!r)return;const n=this._windowBound(r,t),a=n.kind&&"clock"!==n.kind?n.kind:"sunset";this._patchWindow(e,{[t]:{kind:a,offset_minutes:Number(i)||0}})}_renderClockFields(e,i){return t`
        <div class="clock-row">
          <input
            type="time"
            step="900"
            .value=${e}
            @change=${e=>i(e.target.value)}
            aria-label="Time picker"
          />
        </div>
      `}_renderOffsetField(e,i){const r=Number(e)||0,n=r<0,a=Math.min(999,Math.abs(r));return t`
        <div class="offset-row">
          <select
            class="offset-sign"
            .value=${n?"-":"+"}
            @change=${e=>{const t=e.target.value;i(String("-"===t?-a:a))}}
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
            .value=${String(a)}
            @change=${e=>{let t=Number(e.target.value);Number.isFinite(t)||(t=0),t=Math.min(999,Math.max(0,Math.trunc(t))),i(String(n?-t:t))}}
            aria-label="Offset minutes"
          />
          <span class="muted">min</span>
        </div>
      `}_renderBoundEditor(e,i,r){const a=this._windowBound(e,i),o=(this._fmt,a.kind||"clock");return t`
        <div class="bound-block">
          <div class="muted">${r}</div>
          <div class="kinds row" style="margin-top:4px">
            ${n.map((r=>t`<button
                class="${o===r.id?"on":""}"
                @click=${()=>this._setWindowBoundKind(e.id,i,r.id)}
              >
                ${r.label}
              </button>`))}
          </div>
          ${"clock"===o?this._renderClockFields(d(a.time),(t=>this._setWindowClock(e.id,i,t))):this._renderOffsetField(a.offset_minutes||0,(t=>this._setWindowOffset(e.id,i,t)))}
        </div>
      `}_actionSummaryLine(e,i){const r=z(e);return r.length?r.map(((e,n)=>{const a=O(this.hass,e.service),o=I(e).map((e=>W(this.hass,e))),s=o.length?` → ${o.join(", ")}`:"",d=r.length>1?`${n+1}. ${a}${s}`:`${a}${s}`;return t`<span class="window-summary-line"
          >${i}: ${d}</span
        >`})):t`<span class="window-summary-line">${i}: —</span>`}_actionSummary(e){return t`
        ${this._conditionsSummaryLine(e)}
        ${this._actionSummaryLine(e.on_start,"At start")}
        ${this._actionSummaryLine(e.on_end,"At end")}
      `}_conditionsSummaryLine(e){const i=function(e,t){const i=K(t?.conditions);return i.length?`${G(t?.condition_match)===L?"If any:":"If all:"} ${i.map((t=>Q(e,t))).join(" · ")}`:""}(this.hass,e);return i?t`<span class="window-summary-line conditions">${i}</span>`:""}_filteredConditionEntities(){const e=(this._condQuery||"").trim().toLowerCase(),t=[];for(const[i,r]of Object.entries(this.hass?.states||{})){if(i.startsWith("simple_schedule."))continue;const n=r?.attributes?.friendly_name||i;(!e||n.toLowerCase().includes(e)||i.toLowerCase().includes(e))&&t.push({id:i,name:n})}return t.sort(((e,t)=>e.name.localeCompare(t.name))),t.slice(0,40)}_setConditionMatch(e,t){this._patchWindow(e,{condition_match:G(t)})}_removeCondition(e,t){const i=(this._attrs.windows||[]).find((t=>t.id===e));if(!i)return;const r=K(i.conditions).filter(((e,i)=>i!==t));this._patchWindow(e,{conditions:r})}_addConditionFromDraft(e){const t=(this._condDraftEntity||"").trim(),i=this._condDraftOp||"=",r=null!=this._condDraftState?String(this._condDraftState):"";if(j.includes(i)&&!String(r).trim())return this._error="Enter a numeric state value for < or > conditions.",void(this._errorLevel="warning");const n=q({entity_id:t,op:i,state:r});if(!n)return this._error="Pick an entity, operator, and state to add a condition.",void(this._errorLevel="warning");if(j.includes(n.op)&&!H(this.hass,n.entity_id))return this._error="Numeric operators (< >) need a numeric entity state.",void(this._errorLevel="warning");const a=(this._attrs.windows||[]).find((t=>t.id===e));if(!a)return;const o=[...K(a.conditions),n];this._error=null,this._patchWindow(e,{conditions:o}),this._condDraftEntity="",this._condDraftOp="=",this._condDraftState="",this._condQuery="",this._condPickerFor=null}_renderConditionsEditor(e){const i=K(e.conditions),r=G(e.condition_match),n=this._condPickerFor===e.id,a=this._condDraftEntity||"",o=this._condDraftOp||"=",s=!!a&&H(this.hass,a)?[...P,...j]:[...P],d=s.includes(o)?o:"=",c=!(j.includes(d)&&!(this._condDraftState||"").trim()),l=a?U(this.hass,a):null,u=a?W(this.hass,a):"";return t`
        <div class="conditions-block">
          <div class="conditions-head">
            <h3>Conditions</h3>
            <div class="match-row">
              <span class="muted">Match</span>
              <button
                type="button"
                class="${r===B?"on":""}"
                @click=${()=>this._setConditionMatch(e.id,B)}
              >
                All (AND)
              </button>
              <button
                type="button"
                class="${r===L?"on":""}"
                @click=${()=>this._setConditionMatch(e.id,L)}
              >
                Any (OR)
              </button>
            </div>
          </div>
          ${i.length?t`<div class="cond-chips">
                ${i.map(((i,r)=>t`<span class="cond-chip"
                    >${Q(this.hass,i)}
                    <button
                      type="button"
                      aria-label="Remove condition"
                      @click=${()=>this._removeCondition(e.id,r)}
                    >
                      ×
                    </button></span
                  >`))}
              </div>`:""}
          <div class="cond-draft">
            <div>
              <label>Entity</label>
              <button
                type="button"
                class="action-pick"
                style="width:100%;text-align:left"
                @click=${()=>{this._condPickerFor=n?null:e.id,this._pickerFor=null,this._targetPickerFor=null}}
              >
                ${a?t`<span class="svc-friendly">${u}</span>
                      <div class="muted" style="font-size:0.75rem">${a}</div>`:t`<span class="muted">Search entities…</span>`}
              </button>
              ${n?t`
                    <input
                      class="picker-search"
                      type="search"
                      placeholder="Search entities…"
                      .value=${this._condQuery||""}
                      @input=${e=>{this._condQuery=e.target.value}}
                    />
                    <div class="picker">
                      ${this._filteredConditionEntities().map((e=>t`<button
                          type="button"
                          class="svc-option ${e.id===a?"selected":""}"
                          @click=${()=>{this._condDraftEntity=e.id,this._condDraftOp="=";const t=U(this.hass,e.id),i=this.hass?.states?.[e.id];this._condDraftState=t&&t.length?String(t[0]):null!=i?.state?String(i.state):"",this._condPickerFor=null,this._condQuery=""}}
                        >
                          <div class="svc-friendly">${e.name}</div>
                          <div class="muted" style="font-size:0.75rem">${e.id}</div>
                        </button>`))}
                    </div>
                  `:""}
            </div>
            <div class="cond-draft-row">
              <div class="cond-op">
                <select
                  aria-label="Operator"
                  .value=${d}
                  @change=${e=>{this._condDraftOp=e.target.value}}
                >
                  ${s.map((e=>t`<option value=${e}>${e}</option>`))}
                </select>
              </div>
              <div class="cond-state">
                <label>State</label>
                ${l?t`<select
                      .value=${this._condDraftState||""}
                      @change=${e=>{this._condDraftState=e.target.value}}
                    >
                      ${l.map((e=>t`<option value=${e}>${e}</option>`))}
                    </select>`:t`<input
                      type="text"
                      placeholder="State value"
                      .value=${this._condDraftState||""}
                      @input=${e=>{this._condDraftState=e.target.value}}
                    />`}
              </div>
            </div>
            <div class="add-actions">
              <button
                type="button"
                class="${a&&c?"primary":""}"
                ?disabled=${!a||!c}
                @click=${()=>this._addConditionFromDraft(e.id)}
              >
                Add condition
              </button>
            </div>
          </div>
        </div>
      `}_listHaServices(e){const t=[],i=this.hass?.services||{};for(const[r,n]of Object.entries(i))if(!e||r===e)for(const e of Object.keys(n||{})){const i=`${r}.${e}`;t.push({service:i,friendly:O(this.hass,i),domain:r})}return t.sort(((e,t)=>e.friendly.localeCompare(t.friendly)||e.service.localeCompare(t.service))),t}_filteredHaServices(){const e=(this._pickerQuery||"").trim().toLowerCase(),t=this._actionDomainFilter||null;let i=this._listHaServices(t);return e&&(i=i.filter((t=>t.friendly.toLowerCase().includes(e)||t.service.toLowerCase().includes(e)))),i.slice(0,50)}_filteredTargetEntities(e){const t=(this._targetQuery||"").trim().toLowerCase(),i=J(this.hass,e),r=[];for(const[e,n]of Object.entries(this.hass?.states||{})){if(e.startsWith("simple_schedule."))continue;const a=e.split(".",1)[0];if(i.length&&!i.includes(a))continue;const o=n?.attributes?.friendly_name||e;(!t||o.toLowerCase().includes(t)||e.toLowerCase().includes(t))&&r.push({id:e,name:o})}return r.sort(((e,t)=>e.name.localeCompare(t.name))),r.slice(0,40)}_headerClass(e,t){return e?"Out of season"===t?"warn":"on":"off"}_overlapWarnFor(e){return Be(e,this.hass,this._attrs?.weekdays).size?"Warning: You have schedules with times that overlap. This is allowed but is something you should confirm you want.":null}_overlappingIds(){return Be(Oe(this._attrs.windows),this.hass,this._attrs?.weekdays)}_addWaitStep(e,t){const i=[...F(Oe(this._attrs.windows).find((t=>t.id===e))?.[t]),{type:"wait",seconds:30}];this._patchWindow(e,{[t]:R(i)})}_updateWaitSeconds(e,t,i,r){const n=F(Oe(this._attrs.windows).find((t=>t.id===e))?.[t]).map(((e,t)=>t===i?{type:"wait",seconds:Math.max(0,Number(r)||0)}:e));this._patchWindow(e,{[t]:R(n)})}render(){if(!this._entityId)return this._renderBlankCreate();if(!this._state)return t`<ha-card
          ><div class="body">Entity not found: ${this._entityId}</div></ha-card
        >`;const e=this._attrs,i=Boolean(e.enabled),a=this._fmt,o=e.windows||[],l=ke(o,this.hass),u=o.some((e=>ce(e)||(()=>{const t=e.from||e.start,i=e.to||e.end,r=de(this.hass,t),n=de(this.hass,i);return null!=r&&null!=n&&n<=r})())),p=this._statusText(),h=new Date,m=Math.floor((60*h.getHours()+h.getMinutes())/15),f=Boolean(this._config.embedded||this._config.editor_only),g=f||this._expanded;return t`
        <ha-card class="${f?"embedded":""}">
          ${f?"":t`
                <div class="header ${this._headerClass(i,p)}">
                  ${this._renderEditableTitle()}
                  <span class="muted" style="color:inherit">${i?"Enabled":"Disabled"}</span>
                  <ha-switch
                    .checked=${i}
                    @change=${this._setEnabled}
                    @click=${e=>e.stopPropagation()}
                  ></ha-switch>
                </div>
              `}
          <div class="body">
            ${ne(t,this._cardToast)}
            ${f?"":t`
                  <div class="row">
                    <span
                      class="chip ${"Active now"===p?"active":""}"
                      >${p}</span
                    >
                    <span class="muted">${this._nextHint()}</span>
                    <span class="spacer"></span>
                    <button
                      type="button"
                      class="expand-link"
                      @click=${()=>this._expanded=!this._expanded}
                    >
                      ${this._expanded?"▴ Collapse":"▾ Edit"}
                    </button>
                  </div>
                  <div class="schedule-details muted" style="margin-top:6px">
                    ${o.length?o.map((i=>t`<div class="sched-line">
                            ${oe(i,a)} ·
                            ${ue(le(i,e.weekdays))}
                          </div>`)):t`<div class="sched-line">No windows set</div>`}
                  </div>
                `}

            ${g?t`
                  <div style="margin-top:${f?"0":"12px"}">
                    <div class="muted" style="font-weight:600;margin-bottom:4px">
                      Schedule hours
                    </div>
                    ${i&&!o.length?t`<div class="solo-warn-row">
                          ${re(t,E,"warning")}
                        </div>`:""}
                    <div class="hours">
                      ${[0,2,4,6,8,10,12,14,16,18,20,22,24].map((e=>{let i=String(e);return"12"===a&&(i=0===e||24===e?"12a":12===e?"12p":e<12?`${e}a`:e-12+"p"),t`<span
                          style="left:${e/24*100}%;${24===e?"transform:translateX(-100%)":0===e?"transform:none":""}"
                          >${i}</span
                        >`}))}
                    </div>
                    <div class="strip-wrap">
                      <div
                        class="strip ${i?"":"dim"}"
                        @mouseleave=${()=>this._dragging=!1}
                      >
                        ${Array.from({length:48},((e,i)=>{const r=this._cellFill(l,i);return t`<div
                            class="cell ${3===r?"full":""}"
                            @click=${()=>this._onCellPointer(i)}
                          >
                            ${1===r?t`<div class="half top"></div>`:""}
                            ${2===r?t`<div class="half bottom"></div>`:""}
                          </div>`}))}
                        <div
                          class="now"
                          style="left:${m/96*100}%"
                        ></div>
                        ${u?t`<div class="wrap-mark"></div>`:""}
                      </div>
                      ${u?t`<div class="muted" style="font-size:0.7rem;margin-top:2px">
                            This is an overnight schedule. All actions are based on the day the schedule starts.
                          </div>`:""}
                    </div>

                    <div class="add-new ${this._adding?"":"collapsed"}">
                      ${this._adding?t`
                            <div style="margin-top:0">
                              <strong>Add new schedule</strong>
                            </div>
                            <div style="margin-top:10px">
                              <div class="muted" style="font-weight:600">From</div>
                              <div class="kinds row">
                                ${n.map((e=>t`<button
                                    class="${this._fromKind===e.id?"on":""}"
                                    @click=${()=>this._fromKind=e.id}
                                  >
                                    ${e.label}
                                  </button>`))}
                              </div>
                              ${"clock"===this._fromKind?this._renderClockFields(d(c(this._fromClock)||"07:00"),(e=>{const t=c(e);t&&(this._fromClock=s(t,this._fmt))})):this._renderOffsetField(this._fromOffset,(e=>this._fromOffset=e))}
                            </div>
                            <div style="margin-top:8px">
                              <div class="muted" style="font-weight:600">To</div>
                              <div class="kinds row">
                                ${n.map((e=>t`<button
                                    class="${this._toKind===e.id?"on":""}"
                                    @click=${()=>this._toKind=e.id}
                                  >
                                    ${e.label}
                                  </button>`))}
                              </div>
                              ${"clock"===this._toKind?this._renderClockFields(d(c(this._toClock)||"09:00"),(e=>{const t=c(e);t&&(this._toClock=s(t,this._fmt))})):this._renderOffsetField(this._toOffset,(e=>this._toOffset=e))}
                            </div>
                            ${this._renderDowEditor(u,null)}
                            <div class="add-actions">
                              <button
                                type="button"
                                class="primary"
                                @click=${()=>{this._addWindow(),this._error||(this._adding=!1)}}
                              >
                                Add Schedule
                              </button>
                              <button
                                type="button"
                                @click=${()=>{this._adding=!1,this._error=null}}
                              >
                                Cancel
                              </button>
                            </div>
                            ${re(t,this._error,this._errorLevel||"critical")}
                          `:t`
                            <button
                              type="button"
                              class="add-new-bar"
                              @click=${()=>{this._adding=!0,this._error=null,this._addWeekdays=[...this._attrs.weekdays||r.map((e=>e.id))]}}
                            >
                              Add a new schedule
                            </button>
                          `}
                    </div>

                    ${this._overlapWarnFor(o)?t`<div class="warn-banner overlap">${this._overlapWarnFor(o)}</div>`:""}
                    ${o.map((i=>{const r=this._expandedWindowId===i.id,n=this._overlappingIds().has(i.id);return t`
                        <div class="window-card ${n?"overlap":""}">
                          <div
                            class="window-card-head"
                            @click=${()=>{this._expandedWindowId=r?null:i.id,this._pickerFor=null}}
                          >
                            <div class="win-title-block">
                              <div class="win-title">
                                ${oe(i,a)}
                                ${ce(i)?t`<ha-icon
                                      class="overnight-icon"
                                      icon="mdi:weather-night"
                                      data-tip="Overnight"
                                      aria-label="Overnight"
                                      @mouseenter=${we}
                                      @mouseleave=${ye}
                                    ></ha-icon>`:""}
                                ${n?t`<span class="chip overlap">Overlaps</span>`:""}
                              </div>
                              ${r?"":t`<div
                                    class="win-dow"
                                    data-tip="Days of week"
                                    @mouseenter=${we}
                                    @mouseleave=${ye}
                                  >
                                    ${ue(le(i,e.weekdays))}
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
                                  @mouseenter=${we}
                                  @mouseleave=${ye}
                                  @focus=${we}
                                  @blur=${ye}
                                  @click=${e=>{e.stopPropagation(),this._duplicateWindow(i.id)}}
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  class="remove-x"
                                  data-tip="Remove this schedule"
                                  data-tip-align="end"
                                  aria-label="Remove this schedule"
                                  @mouseenter=${we}
                                  @mouseleave=${ye}
                                  @focus=${we}
                                  @blur=${ye}
                                  @click=${e=>{e.stopPropagation(),this._removeWindow(i.id),this._expandedWindowId===i.id&&(this._expandedWindowId=null)}}
                                >
                                  ✕
                                </button>
                              </div>
                              <button
                                type="button"
                                class="edit-link"
                                @click=${e=>{e.stopPropagation(),this._expandedWindowId=r?null:i.id,this._pickerFor=null}}
                              >
                                ${r?"▴ Collapse":"▾ Edit"}
                              </button>
                            </div>
                          </div>
                          ${r?t`
                                ${this._renderBoundEditor(i,"from","From")}
                                ${this._renderBoundEditor(i,"to","To")}
                                ${this._renderDowEditor(ce(i),i.id)}
                                ${this._renderConditionsEditor(i)}
                                <div class="actions-block">
                                  <h3>Actions</h3>
                                  ${this._renderActionPicker(i,"on_start","At start, activate:",ce(i)?"Runs on the selected start day (DOW).":"")}
                                  ${this._renderActionPicker(i,"on_end","At end, activate:",ce(i)?"Still runs even if the end calendar day isn’t in DOW.":"")}
                                </div>
                              `:t`<div class="window-summary">
                                ${this._actionSummary(i)}
                              </div>`}
                        </div>
                      `}))}
                    ${f?"":t`<button
                          type="button"
                          class="delete-entity-bar"
                          @click=${e=>this._deleteEntireSchedule(e)}
                        >
                          Delete ${this._displayName()}
                        </button>`}

                  </div>
                `:""}
          </div>
        </ha-card>
      `}_actionEditKeyFor(e,t,i){return`${e}:${t}:${i}`}_clearActionEdit(){this._actionEditKey=null,this._actionEditDraft=null,this._pickerFor=null,this._targetPickerFor=null,this._advancedOpen=null,this._pickerQuery="",this._targetQuery="",this._actionDomainFilter=null}_beginActionEdit(e,t,i){const r=F((this._attrs.windows||[]).find((t=>t.id===e))?.[t]),n=null==i?null:r[i];"wait"!==n?.type&&(this._actionEditKey=this._actionEditKeyFor(e,t,null==i?"new":i),this._actionEditDraft=n?{service:n.service,target:{...n.target||{}},data:{...n.data||{}}}:{service:"",target:{},data:{}},this._pickerFor=null,this._targetPickerFor=null,this._advancedOpen=null,this.requestUpdate())}_saveActionEdit(e,t){const i=this._actionEditKey||"",r=`${e}:${t}:`;if(!i.startsWith(r))return;const n=i.slice(r.length),a=A(this._actionEditDraft);if(!a)return this._error="Choose a service before saving this action.",void(this._errorLevel="warning");const o=F((this._attrs.windows||[]).find((t=>t.id===e))?.[t]).map((e=>"wait"===e.type?{type:"wait",seconds:0|e.seconds}:{service:e.service,target:{...e.target||{}},data:{...e.data||{}}}));if("new"===n)o.push(a);else{const e=Number(n);if(Number.isNaN(e)||e<0||e>=o.length)return;o[e]=a}this._error=null,this._clearActionEdit(),this._patchWindow(e,{[t]:R(o)})}_removeActionAt(e,t,i){const r=F((this._attrs.windows||[]).find((t=>t.id===e))?.[t]).filter(((e,t)=>t!==i));(this._actionEditKey||"").startsWith(`${e}:${t}:`)&&this._clearActionEdit(),this._patchWindow(e,{[t]:R(r)})}_reorderActions(e,t,i,r){if(i===r||null==i||null==r)return;const n=F((this._attrs.windows||[]).find((t=>t.id===e))?.[t]);if(i<0||r<0||i>=n.length||r>=n.length)return;const a=n.map((e=>"wait"===e.type?{type:"wait",seconds:0|e.seconds}:{service:e.service,target:{...e.target||{}},data:{...e.data||{}}})),[o]=a.splice(i,1);a.splice(r,0,o),(this._actionEditKey||"").startsWith(`${e}:${t}:`)&&this._clearActionEdit(),this._patchWindow(e,{[t]:R(a)})}_renderActionPicker(e,i,r,n){const a=F(e[i]),o=this._actionEditKey||"",s=`${e.id}:${i}:`,d=o.startsWith(s),c=d?o.slice(s.length):null,l="new"===c?null:null!=c&&""!==c?Number(c):null,u=d?this._actionEditDraft:null,p=d?A(u):null,h=`${e.id}:${i}:edit`,m=this._pickerFor===h,f=`${h}:adv`,g=this._advancedOpen===f,b=this._targetPickerFor===h,_=p?function(e,t){if(!t)return[];const[i,r]=t.split("."),n=e?.services?.[i]?.[r]?.fields||{},a=[];for(const[e,t]of Object.entries(n)){if(!t||"object"!=typeof t)continue;if("entity_id"===e||"device_id"===e||"area_id"===e||"label_id"===e)continue;const i=t.selector||{};Object.keys(i).some((e=>["entity","device","area","label","target","object"].includes(e)))||a.push({key:e,meta:t,selector:i,kind:V(e,i)})}return a}(this.hass,p.service):[],v=p?.target?.entity_id||[],w=p?J(this.hass,p.service):[],y=p?(x=this.hass,I(p).filter((e=>!x?.states?.[e]))):[];var x;const k=p?O(this.hass,p.service):"Choose an action…",$=e=>{this._actionEditDraft=e,this.requestUpdate()},S=e=>{const t=J(this.hass,e),i=(p?.target?.entity_id||[]).filter((e=>t.some((t=>e.startsWith(`${t}.`))))),r={};i.length&&(r.entity_id=i),$({service:e,target:r,data:{}}),this._pickerFor=null,this._actionDomainFilter=null,this._pickerQuery=""},E=e=>{const t=A(this._actionEditDraft)||{service:p?.service,target:{},data:{}};if(!t.service)return;const i=[...t.target?.entity_id||[]],r=i.indexOf(e);r>=0?i.splice(r,1):i.push(e);const n={...t.target||{}};i.length?n.entity_id=i:delete n.entity_id,$({service:t.service,target:n,data:{...t.data||{}}})},C=(e,t)=>{const i=A(this._actionEditDraft);if(!i)return;const r={...i.data||{}};""===t||null==t?delete r[e]:r[e]=t,$({service:i.service,target:i.target||{},data:r})},D=(e,t,i,r)=>{if("rgb"===r)return[255,255,255];if("kelvin"===r){const e=i.color_temp||{};return Number(e.min??t?.example??3e3)}if("number"===r){const e=i.number||{};return Number(e.min??0)}if("boolean"===r)return!1;if("select"===r){const e=(i.select?.options||[])[0];return"object"==typeof e?e.value:e??""}return""},M=(e,t,i,r,n)=>{const a=A(this._actionEditDraft);if(!a)return;const o={...a.data||{}};n?e in o||(o[e]=D(0,t,i,r)):delete o[e],$({service:a.service,target:a.target||{},data:o})},N=(e,i,r,n,a,o)=>{const s=!o;if("rgb"===n){const i=function(e){if(!Array.isArray(e)||e.length<3)return"#ffffff";const[t,i,r]=e.map((e=>Math.max(0,Math.min(255,Number(e)||0))));return"#"+[t,i,r].map((e=>e.toString(16).padStart(2,"0"))).join("")}(Array.isArray(a)?a:[255,255,255]);return t`<input
            type="color"
            .value=${i}
            ?disabled=${s}
            @input=${t=>C(e,function(e){const t=/^#?([0-9a-f]{6})$/i.exec(String(e||"").trim());if(!t)return[255,255,255];const i=parseInt(t[1],16);return[i>>16&255,i>>8&255,255&i]}(t.target.value))}
          />`}if("kelvin"===n){const i=r.color_temp||{},n=Number(i.min??2e3),o=Number(i.max??6500),d=Number(i.step??50),c=null!=a&&""!==a?Number(a):n;return t`<div class="adv-field-head">
              <span class="muted">${c} K</span>
            </div>
            <input
              type="range"
              min=${n}
              max=${o}
              step=${d}
              .value=${String(c)}
              ?disabled=${s}
              @input=${t=>C(e,Number(t.target.value))}
            />`}if("number"===n||"mired"===n){const i=r.number||r.color_temp||{},o=i.min??0,d=i.max??100,c=i.step??1,l=i.unit_of_measurement||("mired"===n?"mired":"")||"",u=null!=a&&""!==a?Number(a):o;return t`<div class="adv-field-head">
              <span class="muted">${u}${l?` ${l}`:""}</span>
            </div>
            <input
              type="range"
              min=${o}
              max=${d}
              step=${c}
              .value=${String(u)}
              ?disabled=${s}
              @input=${t=>C(e,Number(t.target.value))}
            />`}if("boolean"===n)return t`<ha-switch
            .checked=${Boolean(a)}
            ?disabled=${s}
            @change=${t=>C(e,Boolean(t.target.checked))}
          ></ha-switch>`;if("select"===n){const i=r.select?.options||[];return t`<select
            ?disabled=${s}
            @change=${t=>C(e,""===t.target.value?null:t.target.value)}
          >
            <option value="">—</option>
            ${i.map((e=>{const i="object"==typeof e?e.value:e,r="object"==typeof e?e.label||e.value:e;return t`<option value=${i} ?selected=${a===i}>
                ${r}
              </option>`}))}
          </select>`}return t`<input
          type="text"
          class="picker-search"
          .value=${null!=a?String(a):""}
          ?disabled=${s}
          @change=${t=>C(e,t.target.value||null)}
        />`};return t`
        <div class="action-block">
          <div class="muted" style="font-weight:600">${r}</div>
          ${n?t`<div class="muted">${n}</div>`:""}
          <div
            class="action-chips"
            @dragover=${e=>{e.preventDefault();try{e.dataTransfer.dropEffect="move"}catch(e){}}}
          >
            ${a.map(((r,n)=>t`<span
                class="action-chip ${l===n?"selected":""}"
                draggable="true"
                @dragstart=${t=>{this.__actionDragFrom={windowId:e.id,field:i,index:n},this.__actionDragMoved=!1;try{t.dataTransfer.setData("text/plain",String(n)),t.dataTransfer.effectAllowed="move"}catch(e){}}}
                @dragover=${e=>{e.preventDefault();try{e.dataTransfer.dropEffect="move"}catch(e){}}}
                @drop=${t=>{t.preventDefault(),t.stopPropagation();const r=this.__actionDragFrom;this.__actionDragFrom=null,r&&r.windowId===e.id&&r.field===i&&r.index!==n&&(this.__actionDragMoved=!0,this._reorderActions(e.id,i,r.index,n))}}
                @dragend=${()=>{this.__actionDragFrom=null}}
                @click=${t=>{t.target.closest&&t.target.closest("button.chip-x")||(this.__actionDragMoved?this.__actionDragMoved=!1:this._beginActionEdit(e.id,i,n))}}
              >
                <span class="drag-handle" aria-hidden="true">⋮⋮</span>
                ${"wait"===r.type?t`<span class="chip-label"
                        >${n+1} · Wait</span
                      >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        style="width:64px;margin:0 4px"
                        title="Duration in seconds"
                        .value=${String(r.seconds??0)}
                        @click=${e=>e.stopPropagation()}
                        @change=${t=>{t.stopPropagation(),this._updateWaitSeconds(e.id,i,n,t.target.value)}}
                      />
                      <span class="muted" style="margin-right:4px"
                        >sec (${function(e){const t=Math.max(0,Number(e)||0),i=Math.floor(t/60),r=t%60;return i&&r?`${i}m ${r}s`:i?`${i}m`:`${r}s`}(r.seconds)})</span
                      >`:t`<span class="chip-label"
                      >${function(e,t,i){const r=A(t);if(!r)return`${i+1} · —`;const n=O(e,r.service)||r.service,a=(r.target?.entity_id||[]).map((t=>W(e,t)));return`${i+1} · ${n}${a.length?` → ${a.join(", ")}`:""}`}(this.hass,r,n)}</span
                    >`}
                <button
                  type="button"
                  class="chip-x"
                  aria-label="Remove action"
                  @click=${t=>{t.stopPropagation(),this._removeActionAt(e.id,i,n)}}
                >
                  ×
                </button>
              </span>`))}
          </div>
          ${a.length?t`<div class="action-order-hint">
                Actions and waits run in order above — drag to rearrange
              </div>`:""}
          ${d?t`
                <div class="action-row">
                  <button
                    class="action-pick"
                    type="button"
                    @click=${()=>{this._pickerFor=m?null:h,this._pickerQuery="",this._actionDomainFilter=null,this._targetPickerFor=null}}
                  >
                    <span class="action-label">${k}</span>
                    <span class="action-change"
                      >${m?"Close":"Change"}</span
                    >
                  </button>
                </div>
                ${p&&y.length?re(t,(T=y.join(", "),`“${T}” is missing — pick another target, or clear this action.`),"warning"):""}
                ${m?t`<div class="picker">
                      <div class="picker-shortcuts">
                        <button
                          type="button"
                          class="${"scene"===this._actionDomainFilter?"on":""}"
                          @click=${()=>{this._actionDomainFilter="scene"===this._actionDomainFilter?null:"scene"}}
                        >
                          Scenes
                        </button>
                        <button
                          type="button"
                          class="${"script"===this._actionDomainFilter?"on":""}"
                          @click=${()=>{this._actionDomainFilter="script"===this._actionDomainFilter?null:"script"}}
                        >
                          Scripts
                        </button>
                      </div>
                      <input
                        type="text"
                        class="picker-search"
                        placeholder="Search actions…"
                        .value=${this._pickerQuery||""}
                        @input=${e=>this._pickerQuery=e.target.value}
                      />
                      ${this._filteredHaServices().map((e=>t`<button
                          type="button"
                          class="svc-option ${p?.service===e.service?"selected":""}"
                          @click=${()=>S(e.service)}
                        >
                          <div class="svc-friendly">${e.friendly}</div>
                          <div class="id">${e.service}</div>
                        </button>`))}
                    </div>`:""}
                ${p?t`
                      <div class="targets-block">
                        <div class="muted" style="font-weight:600">
                          Targets${w.length?` (${w.join(", ")})`:""}
                        </div>
                        <div class="target-chips">
                          ${v.map((e=>t`<span class="target-chip"
                              >${W(this.hass,e)}
                              <button
                                type="button"
                                aria-label="Remove ${e}"
                                @click=${()=>E(e)}
                              >
                                ×
                              </button></span
                            >`))}
                        </div>
                        <button
                          type="button"
                          class="action-pick target-pick"
                          @click=${()=>{b?(this._targetPickerFor=null,this._targetQuery=""):(this._targetPickerFor=h,this._targetQuery="",this._pickerFor=null),this.requestUpdate()}}
                        >
                          <span class="action-label"
                            >${b?"Close targets":"Choose target…"}</span
                          >
                        </button>
                        ${b?t`<div class="picker">
                              <input
                                type="text"
                                class="picker-search"
                                placeholder="Search entities…"
                                .value=${this._targetQuery||""}
                                @input=${e=>this._targetQuery=e.target.value}
                              />
                              ${this._filteredTargetEntities(p.service).map((e=>t`<button
                                  type="button"
                                  class="${v.includes(e.id)?"selected":""}"
                                  @click=${()=>E(e.id)}
                                >
                                  <div class="svc-friendly">${e.name}</div>
                                  <div class="id">${e.id}</div>
                                </button>`))}
                            </div>`:""}
                      </div>
                    `:""}
                ${p&&_.length?t`<details
                      class="advanced"
                      ?open=${g}
                      @toggle=${e=>{this._advancedOpen=e.target.open?f:null}}
                    >
                      <summary>Advanced</summary>
                      <div class="advanced-body">
                        ${_.map((({key:e,meta:i,selector:r,kind:n})=>{const a=Object.prototype.hasOwnProperty.call(p.data||{},e),o=a?p.data[e]:D(0,i,r,n),s=i.name||e.split("_").map((e=>e.charAt(0).toUpperCase()+e.slice(1))).join(" ");return t`<div
                            class="adv-field ${a?"":"adv-off"}"
                          >
                            <label class="adv-include">
                              <input
                                type="checkbox"
                                .checked=${a}
                                @change=${t=>M(e,i,r,n,t.target.checked)}
                              />
                              <span>${s}</span>
                            </label>
                            <div class="adv-control">
                              ${N(e,0,r,n,o,a)}
                            </div>
                          </div>`}))}
                      </div>
                    </details>`:""}
                <div class="add-actions action-edit-bar">
                  <button
                    type="button"
                    class="primary"
                    @click=${()=>this._saveActionEdit(e.id,i)}
                  >
                    Save action
                  </button>
                  <button
                    type="button"
                    @click=${()=>this._clearActionEdit()}
                  >
                    Cancel
                  </button>
                </div>
              `:t`<div class="add-actions">
                <button
                  type="button"
                  class="primary"
                  @click=${()=>this._beginActionEdit(e.id,i,null)}
                >
                  Add action
                </button>
                <button
                  type="button"
                  @click=${()=>this._addWaitStep(e.id,i)}
                >
                  Add wait
                </button>
              </div>`}
        </div>
      `;var T}_displayName(){return this._attrs.friendly_name||this._state?.attributes?.friendly_name||this._config.entity}_startRename(e){e&&e.stopPropagation(),this._renameDraft=this._displayName()||"",this._renaming=!0,requestAnimationFrame((()=>{const e=this.shadowRoot?.querySelector("input.rename-input");e&&(e.focus(),e.select())}))}_cancelRename(e){e&&e.stopPropagation(),this._renaming=!1,this._renameDraft=""}async _commitRename(e){e&&e.stopPropagation();const t=String(this._renameDraft||"").trim();if(!t)return void(this._renameError=S);if(this._renameError=null,this._renaming=!1,t===this._displayName())return void(this._renameDraft="");const i=await this._resolveScheduleId();if(!i)return void this._showToast(D,"critical");await this._ssCall("update_schedule",{schedule_id:i,name:t},{inline:"rename"})?this._renameDraft="":this._renaming=!0}async _deleteEntireSchedule(e){const t=e?.currentTarget||e?.target;t&&"function"==typeof t.blur&&t.blur();const i=this._displayName()||"this schedule";if(!await be(`Delete ${i}? This removes the entire schedule and cannot be undone.`,"Delete"))return;const r=await this._resolveScheduleId();r?await this._ssCall("delete_schedule",{schedule_id:r}):this._showToast("Can’t delete — this card isn’t linked to a schedule.","critical")}_renderEditableTitle(){return this._renaming?t`<div>
          <input
            class="rename-input"
            .value=${this._renameDraft}
            @click=${e=>e.stopPropagation()}
            @input=${e=>{this._renameDraft=e.target.value,this._renameError=null}}
            @keydown=${e=>{"Enter"===e.key&&this._commitRename(e),"Escape"===e.key&&this._cancelRename(e)}}
            @blur=${e=>this._commitRename(e)}
            aria-label="Rename schedule"
          />
          ${re(t,this._renameError,"critical")}
        </div>`:t`
        <div class="title-row">
          <h2 class="title" @dblclick=${e=>this._startRename(e)}>
            ${this._displayName()}
          </h2>
          <button
            type="button"
            class="rename-pen"
            data-tip="Rename"
            aria-label="Rename"
            @mouseenter=${we}
            @mouseleave=${ye}
            @focus=${we}
            @blur=${ye}
            @click=${e=>this._startRename(e)}
          >
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
        </div>
      `}static getConfigElement(){return document.createElement("simple-schedule-card-editor")}static getStubConfig(e){return{type:"custom:simple-schedule-card",entity:Object.keys(e.states).find((e=>e.startsWith("simple_schedule.")&&!e.includes(".group_")))||"simple_schedule.sample_classroom_hours",time_format:"12"}}}class qe extends e{disconnectedCallback(){super.disconnectedCallback(),_e(),ge(),this._toastTimer&&(clearTimeout(this._toastTimer),this._toastTimer=null)}get hass(){return this.__hass}set hass(e){const t=this.__hass,i=Boolean(this._addingMember||this._groupToolsOpen||this._renaming);Me(e,t,this._config?.entity||null,i)?(this.__hass=e,this.requestUpdate("hass",t)):this.__hass=e}static get properties(){return{_config:{},_expandedId:{type:String},_hint:{type:String},_memberEditors:{},_renaming:{type:Boolean},_renameDraft:{type:String},_renamingMemberId:{type:String},_memberRenameDraft:{type:String},_addingMember:{type:Boolean},_groupToolsOpen:{type:Boolean},_newMemberName:{type:String},_newMemberStart:{type:String},_newMemberEnd:{type:String},_newMemberYearly:{type:Boolean},_addMemberError:{type:String},_pendingExpandName:{type:String},_cardToast:{},_seasonError:{type:String},_seasonErrorMemberId:{type:String},_memberRenameError:{type:String},_groupRenameError:{type:String},_groupPatchError:{type:String},_memberSeasonOverride:{}}}_effectiveDateRange(e){return this._memberSeasonOverride?.[e.id]||e.date_range||null}_setSeasonOverride(e,t){this._memberSeasonOverride={...this._memberSeasonOverride||{},[e]:t}}_clearSeasonOverrideIfSynced(e){const t=this._memberSeasonOverride||{},i=Object.keys(t);if(!i.length)return;let r=null;for(const n of i){const i=(e||[]).find((e=>e.id===n)),a=i?.date_range||null,o=t[n];(a&&o&&String(a.start||"")===String(o.start||"")&&String(a.end||"")===String(o.end||"")&&!1!==a.recurs_yearly==(!1!==o.recurs_yearly)||!i)&&(r||(r={...t}),delete r[n])}r&&(this._memberSeasonOverride=r)}_showToast(e,t){this._cardToast={message:e,level:t||"critical"},this._toastTimer&&clearTimeout(this._toastTimer),this._toastTimer=setTimeout((()=>{this._toastTimer=null,this._cardToast=null}),5e3)}async _ssCall(e,t,i){try{return await this.hass.callService("simple_schedule",e,t),!0}catch(e){const t=X(e,i?.ctx);return"add"===i?.inline?this._addMemberError=t:"season"===i?.inline?(this._seasonError=t,this._seasonErrorMemberId=i?.memberId||null):"memberRename"===i?.inline?this._memberRenameError=t:"groupRename"===i?.inline?this._groupRenameError=t:this._showToast(t,i?.level||"critical"),!1}}static get styles(){return Le.styles}setConfig(e){if(!e?.entity)throw new Error("entity is required");this._config=e,this._expandedId=null,this._memberEditors={},this._renaming=!1,this._renameDraft="",this._renamingMemberId=null,this._memberRenameDraft="",this._hint="",this._addingMember=!1,this._groupToolsOpen=!1,this._newMemberName="",this._newMemberStart=w(),this._newMemberEnd=y(),this._newMemberYearly=!0,this._addMemberError=null,this._pendingExpandName=null}getCardSize(){return 6}get _state(){return this.hass?.states?.[this._config.entity]}get _groupId(){return this._state?.attributes?.group_id||this._config.group_id||this._config.entity?.split(".")[1]?.replace(/^group_/,"")}_groupDisplayName(){return(this._state?.attributes||{}).friendly_name||this._state?.attributes?.friendly_name||"Schedule Group"}_startGroupRename(e){e&&e.stopPropagation(),this._renameDraft=this._groupDisplayName()||"",this._groupRenameError=null,this._renaming=!0,this._renamingMemberId=null,requestAnimationFrame((()=>{const e=this.shadowRoot?.querySelector("input.rename-input[data-kind='group']");e&&(e.focus(),e.select())}))}async _commitGroupRename(e){e&&e.stopPropagation();const t=String(this._renameDraft||"").trim();if(!t)return void(this._groupRenameError=S);if(this._groupRenameError=null,this._renaming=!1,t===this._groupDisplayName())return void(this._renameDraft="");const i=this._groupId;if(!i)return void this._showToast(M,"critical");await this._ssCall("update_group",{group_id:i,name:t},{inline:"groupRename"})?this._renameDraft="":this._renaming=!0}_cancelGroupRename(e){e&&e.stopPropagation(),this._renaming=!1,this._renameDraft=""}_startMemberRename(e,t){e&&e.stopPropagation(),this._renamingMemberId=t.id,this._memberRenameDraft=t.name||"",this._memberRenameError=null,this._renaming=!1,requestAnimationFrame((()=>{const e=this.shadowRoot?.querySelector(`input.rename-input[data-member='${t.id}']`);e&&(e.focus(),e.select())}))}async _commitMemberRename(e,t){e&&e.stopPropagation();const i=String(this._memberRenameDraft||"").trim();if(!(this._renamingMemberId===t.id))return;if(!i)return void(this._memberRenameError=S);if(this._memberRenameError=null,this._renamingMemberId=null,i===t.name)return void(this._memberRenameDraft="");await this._patchMemberSeason(t.id,{name:i},{inline:"memberRename"})?this._memberRenameDraft="":this._renamingMemberId=t.id}_cancelMemberRename(e){e&&e.stopPropagation(),this._renamingMemberId=null,this._memberRenameDraft=""}async _cycle(e){if(this._renaming||this._renamingMemberId)return;const t=this._groupId,i=(this._state?.attributes?.members||[]).find((t=>t.id===e));await this._ssCall("cycle_member",{group_id:t,member_id:e},{ctx:{active:!0,memberName:i?.name,selfName:i?.name}})}async _selectMember(e){if(this._renaming||this._renamingMemberId)return;const t=this._groupId,i=(this._state?.attributes?.members||[]).find((t=>t.id===e));await this._ssCall("select_member",{group_id:t,member_id:e,sticky:!1},{ctx:{active:!0,memberName:i?.name,selfName:i?.name}})}async _confirmSelectMember(e){if(this._renaming||this._renamingMemberId)return;if(!e?.id)return;const t=e.name||"this schedule window";await be(`Override the window schedule and make “${t}” active?\n\nCancel leaves the current selection unchanged.`,"Make active")&&await this._selectMember(e.id)}async _confirmActiveChip(e,t){if(this._renaming||this._renamingMemberId)return;if(!e?.id)return;const i=e.name||"this schedule window";let r;r=t?await be(`Unlock “${i}” and allow the normal group schedule to resume?\n\nCancel leaves the current selection unchanged.`,"Unlock"):await be(`Override the window schedule and make “${i}” active until you unlock it?\n\nCancel leaves the current selection unchanged.`,"Keep active"),r&&await this._cycle(e.id)}async _patchMemberSeason(e,t,i){const r=(this._state?.attributes?.members||[]).find((t=>t.id===e));return this._ssCall("update_schedule",{schedule_id:e,...t},{...i||{},ctx:{...i?.ctx||{},selfName:r?.name||i?.ctx?.selfName,memberName:r?.name}})}_findSeasonOverlap(e,t){if(!t)return null;const i=this._state?.attributes||{},r=i.fallback_member;if(e?.id&&e.id===r)return null;const n=i.members||[];for(const i of n)if(i.id!==e.id&&i.id!==r&&i.date_range&&te(t,i.date_range))return i.name||"another schedule window";return null}_setSeasonBound(e,t,i){const r=this._effectiveDateRange(e)||{},n={start:"start"===t?i:r.start||"",end:"end"===t?i:r.end||"",recurs_yearly:!1!==r.recurs_yearly};this._setSeasonOverride(e.id,n);const a=ie(n);if(a)return this._seasonError=a,void(this._seasonErrorMemberId=e.id);const o=this._findSeasonOverlap(e,n);if(o)return this._seasonError=N(o),void(this._seasonErrorMemberId=e.id);this._seasonError=null,this._seasonErrorMemberId=null,this._patchMemberSeason(e.id,{date_range:n},{inline:"season",memberId:e.id})}_renderSeasonDateField(e,i,r){const n=this._effectiveDateRange(e)||{},a=!1!==n.recurs_yearly;let o="start"===i?n.start:n.end;if(String(o||"").trim()||(o="start"===i?w():y()),a){const n=h(o);return t`
          <div class="date-row">
            <span class="muted">${r}</span>
            <div class="md-pick">
              <select
                aria-label="${r} month"
                .value=${String(n.month)}
                @change=${t=>{const r=Number(t.target.value);this._setSeasonBound(e,i,m(r,n.day))}}
              >
                ${f.map((([e,i])=>t`<option value=${e} ?selected=${Number(e)===n.month}>
                      ${i}
                    </option>`))}
              </select>
              <select
                aria-label="${r} day"
                .value=${String(n.day)}
                @change=${t=>{const r=Number(t.target.value);this._setSeasonBound(e,i,m(n.month,r))}}
              >
                ${Array.from({length:31},((e,t)=>t+1)).map((e=>t`<option value=${e} ?selected=${e===n.day}>
                      ${e}
                    </option>`))}
              </select>
            </div>
          </div>
        `}const s=u(o,i);return t`
        <div class="date-row">
          <span class="muted">${r}</span>
          <input
            type="date"
            .value=${s}
            @change=${t=>this._setSeasonBound(e,i,t.target.value||"")}
          />
        </div>
      `}render(){const e=this._state;if(!e)return t`<ha-card
          ><div class="body">Entity not found: ${this._config.entity}</div></ha-card
        >`;const i=e.attributes||{},r=Array.isArray(i.members)?i.members:[],n=Boolean(i.sticky),a=i.enabled_member,o=a&&"none"!==a?a:null,s=!1!==i.require_fallback,d=!s,c=i.fallback_member;return t`
        <ha-card>
          <div class="header on group-head">
            ${this._renaming?t`<div style="flex:1;min-width:0">
                  <input
                    class="rename-input"
                    data-kind="group"
                    .value=${this._renameDraft}
                    @click=${e=>e.stopPropagation()}
                    @input=${e=>{this._renameDraft=e.target.value,this._groupRenameError=null}}
                    @keydown=${e=>{"Enter"===e.key&&this._commitGroupRename(e),"Escape"===e.key&&this._cancelGroupRename(e)}}
                    @blur=${e=>this._commitGroupRename(e)}
                    aria-label="Rename schedule group"
                  />
                  ${re(t,this._groupRenameError,"critical")}
                </div>`:t`<h2
                  class="title"
                  @dblclick=${e=>this._startGroupRename(e)}
                >
                  ${i.friendly_name||e.attributes.friendly_name||"Schedule Group"}
                </h2>`}
            <span class="spacer"></span>
            ${this._renaming?"":t`<button
                  type="button"
                  class="rename-pen"
                  data-tip="Rename"
                  aria-label="Rename"
                  @mouseenter=${we}
                  @mouseleave=${ye}
                  @focus=${we}
                  @blur=${ye}
                  @click=${e=>this._startGroupRename(e)}
                >
                  <ha-icon icon="mdi:pencil"></ha-icon>
                </button>`}
            <ha-icon
              class="group-type-icon"
              icon="mdi:calendar-multiple-check"
              data-tip="Schedule group where only one schedule is active at a time based on dates."
              data-tip-align="end"
              aria-label="Schedule Group"
              @mouseenter=${we}
              @mouseleave=${ye}
              @focus=${we}
              @blur=${ye}
            ></ha-icon>
          </div>
          <div class="body">
            ${ne(t,this._cardToast)}
            ${d&&!o?t`<div
                  class="muted"
                  style="margin-bottom:10px;padding:10px 12px;width:100%;box-sizing:border-box;border-left:4px solid var(--disabled-color, #9e9e9e);background:var(--secondary-background-color)"
                >
                  No schedule window is active. A default schedule is not
                  required for this group.
                </div>`:""}
            ${r.map((e=>{const a=e.id===o,s=a&&n,d=this._expandedId===e.id,c=this._isDefaultMember(e,i,r),h=!1!==e.season_available,m=this.hass?.states?.[e.entity_id],f=a&&"on"===m?.state,g=m?.attributes||{},b=this._config?.time_format||"12",w=e.windows_summary||function(e,t){return e?.length?e.map((e=>oe(e,t))).join(", "):"No windows set"}(g.windows||[],b),y=(ue(g.weekdays),g.windows||[]),k=this._effectiveDateRange(e),$=!y.length,S=function(e){if(!e||!1!==e.recurs_yearly)return!1;const t=Z(e.end);if(!t||t.invalid||"ymd"!==t.kind)return!1;const i=new Date;return i.setHours(0,0,0,0),new Date(t.y,t.month-1,t.day)<i}(k),C=h&&($||S);return t`
                <div class="member-shell ${C?"warn":""}">
                  <div
                    class="header member-head ${h?"on":"off"}${a?"":" selectable"}"
                    @click=${t=>{if(a)return;("function"==typeof t.composedPath?t.composedPath():[]).some((e=>e?.classList?.contains?.("member-actions")||e?.classList?.contains?.("expand-link")||e?.classList?.contains?.("rename-pen")||"HA-SWITCH"===e?.tagName))||this._confirmSelectMember(e)}}
                  >
                    <div class="member-main">
                      ${this._renamingMemberId===e.id?t`<div>
                            <input
                              class="rename-input"
                              data-member=${e.id}
                              .value=${this._memberRenameDraft}
                              @click=${e=>e.stopPropagation()}
                              @input=${e=>{this._memberRenameDraft=e.target.value,this._memberRenameError=null}}
                              @keydown=${t=>{"Enter"===t.key&&this._commitMemberRename(t,e),"Escape"===t.key&&this._cancelMemberRename(t)}}
                              @blur=${t=>this._commitMemberRename(t,e)}
                              aria-label="Rename schedule"
                            />
                            ${re(t,this._memberRenameError,"critical")}
                          </div>`:t`<div class="title-row">
                            <div
                              class="title"
                              style="font-size:1rem"
                              @dblclick=${t=>this._startMemberRename(t,e)}
                            >
                              ${e.name}
                            </div>
                            <button
                              type="button"
                              class="rename-pen"
                              data-tip="Rename"
                              aria-label="Rename"
                              @mouseenter=${we}
                              @mouseleave=${ye}
                              @focus=${we}
                              @blur=${ye}
                              @click=${t=>this._startMemberRename(t,e)}
                            >
                              <ha-icon icon="mdi:pencil"></ha-icon>
                            </button>
                          </div>`}
                      ${k||a||c?t`<div class="member-meta-row">
                            ${k?t`<span class="season-line"
                                  >${function(e){if(!e)return"";const t=!1!==e.recurs_yearly;return`${x(e.start,!t)} – ${x(e.end,!t)}${t?" · Annually":""}`}(k)}</span
                                >`:""}
                            ${a?t`<span
                                  class="chip ${f?"active":"window-active"}"
                                  data-tip=${s?"Click to unlock this schedule window and allow the normal group schedule to resume":"Click to keep this schedule window active until you unlock it"}
                                  @mouseenter=${we}
                                  @mouseleave=${ye}
                                  @focus=${we}
                                  @blur=${ye}
                                  @click=${t=>{t.stopPropagation(),this._confirmActiveChip(e,s)}}
                                >
                                  <span class="chip-label"
                                    >${f?"Active Now":"Active"}</span
                                  >
                                  ${s?t`<ha-icon icon="mdi:lock"></ha-icon>`:""}
                                </span>`:""}
                            ${c?t`<span
                                  class="chip default"
                                  title="This schedule window is the default for this group. That means it will become active when no other schedule applies."
                                  >Default</span
                                >`:""}
                          </div>`:""}
                      <div
                        class="schedule-details muted"
                        style="color:inherit;opacity:0.9;margin-top:4px"
                      >
                        ${y.length?y.map((e=>t`<div class="sched-line">
                                ${oe(e,b)} ·
                                ${ue(le(e,g.weekdays))}
                              </div>`)):t`<div class="sched-line">
                              ${"No windows set"===w?"No windows set":w}
                            </div>`}
                      </div>
                    </div>
                    <div class="member-actions" @click=${e=>e.stopPropagation()}>
                      <div class="member-enable">
                        <span class="muted" style="color:inherit">${h?"Enabled":"Disabled"}</span>
                        <ha-switch
                          .checked=${h}
                          @change=${t=>{const i=t.currentTarget||t.target,r="boolean"==typeof i?.checked?i.checked:"boolean"==typeof i?.selected?i.selected:!h;this._patchMemberSeason(e.id,{season_available:Boolean(r)})}}
                          @click=${e=>e.stopPropagation()}
                        ></ha-switch>
                      </div>
                      <button
                        type="button"
                        class="expand-link"
                        @click=${t=>{t.stopPropagation(),this._expandedId=d?null:e.id}}
                      >
                        ${d?"▴ Collapse":"▾ Edit"}
                      </button>
                    </div>
                  </div>
                  ${C?t`<div class="member-warn-row">
                        ${S?re(t,"These dates are in the past — this window won’t become Active unless you change the dates or turn on Recurs annually.","warning"):""}
                        ${$?re(t,E,"warning"):""}
                      </div>`:""}
                  ${d?t`<div class="body">
                        ${c?t`<div class="active-window-row">
                              <span
                                class="chip default"
                                title="This schedule window is the default for this group. That means it will become active when no other schedule applies."
                                >Default</span
                              >
                              <span class="muted" style="flex:1"
                                >This schedule window is currently the default
                                for this group, which means it will be active
                                whenever another schedule in this group is not
                                active. If you want to define a specific set of
                                dates for this window, make another window in
                                this group the default.</span
                              >
                            </div>`:t`
                              <div class="active-window-row">
                                <span class="heading">Active Window</span>
                              </div>
                              <div
                                class="season-dates-row ${this._seasonErrorMemberId===e.id?"ssc-field-invalid":""}"
                              >
                                ${this._renderSeasonDateField(e,"start","Start")}
                                ${this._renderSeasonDateField(e,"end","End")}
                                <div class="recurs-yearly">
                                  <span class="muted">Recurs annually</span>
                                  <ha-switch
                                    .checked=${!1!==(this._effectiveDateRange(e)||e.date_range)?.recurs_yearly}
                                    @change=${t=>{const i=t.currentTarget||t.target;let r="boolean"==typeof i?.checked?i.checked:"boolean"==typeof i?.selected?i.selected:!(!1===e.date_range?.recurs_yearly);r=Boolean(r);const n=this._effectiveDateRange(e)||{},a=n.start||"",o=n.end||"",s={start:r?p(l(a)||_(),!0):u(a,"start"),end:r?p(l(o)||v(),!0):u(o,"end"),recurs_yearly:r};this._setSeasonOverride(e.id,s);const d=ie(s);if(d)return this._seasonError=d,void(this._seasonErrorMemberId=e.id);const c=this._findSeasonOverlap(e,s);if(c)return this._seasonError=N(c),void(this._seasonErrorMemberId=e.id);this._seasonError=null,this._seasonErrorMemberId=null,this._patchMemberSeason(e.id,{date_range:s},{inline:"season",memberId:e.id})}}
                                  ></ha-switch>
                                </div>
                              </div>
                              ${this._seasonErrorMemberId===e.id?re(t,this._seasonError,"critical"):""}
                              <div class="default-row">
                                <button
                                  type="button"
                                  class="set-default-btn"
                                  data-tip="The default schedule is used when no other schedule window in this group matches the current date."
                                  @mouseenter=${we}
                                  @mouseleave=${ye}
                                  @focus=${we}
                                  @blur=${ye}
                                  @click=${()=>this._setMemberAsDefault(e)}
                                >
                                  Set as default
                                </button>
                              </div>
                            `}
                        <hr class="member-split" />
                        ${this._renderMemberWindowsEditor(e)}
                        <button
                          type="button"
                          class="delete-entity-bar"
                          data-tip="Remove this schedule window"
                          @mouseenter=${we}
                          @mouseleave=${ye}
                          @focus=${we}
                          @blur=${ye}
                          @click=${t=>{t.stopPropagation(),this._deleteMember(e)}}
                        >
                          Delete ${e.name}
                        </button>
                      </div>`:""}
                </div>
              `}))}
            <div class="group-tools">
              <div class="group-tools-toggle">
                <button
                  type="button"
                  class="expand-link"
                  @click=${()=>{this._groupToolsOpen=!this._groupToolsOpen,this._groupToolsOpen||(this._addingMember=!1,this._addMemberError=null)}}
                >
                  ${this._groupToolsOpen?"▴ Collapse":"▾ Edit"}
                </button>
              </div>
              ${this._groupToolsOpen?t`
                    <div
                      class="add-new ${this._addingMember?"":"collapsed"}"
                    >
                      ${this._addingMember?t`
                            <div><strong>Add a new schedule window</strong></div>
                            <div class="date-row name-row" style="margin-top:10px">
                              <span class="muted">Name</span>
                              <input
                                type="text"
                                placeholder="Schedule name"
                                .value=${this._newMemberName}
                                @input=${e=>this._newMemberName=e.target.value}
                                @keydown=${e=>{"Enter"===e.key&&this._addGroupMember()}}
                              />
                            </div>
                            ${r.length>=1?t`
                                  <div
                                    class="season-dates-row"
                                    style="margin-top:10px"
                                  >
                                    ${this._renderNewMemberDateField("start","Start")}
                                    ${this._renderNewMemberDateField("end","End")}
                                    <div class="recurs-yearly">
                                      <span class="muted">Recurs annually</span>
                                      <ha-switch
                                        .checked=${!1!==this._newMemberYearly}
                                        @change=${e=>{const t=e.currentTarget||e.target,i="boolean"==typeof t?.checked?t.checked:!this._newMemberYearly;this._newMemberYearly=i,i?(this._newMemberStart=w(),this._newMemberEnd=y()):(this._newMemberStart=_(),this._newMemberEnd=v())}}
                                      ></ha-switch>
                                    </div>
                                  </div>
                                  <div class="muted" style="margin-top:6px">
                                    After creating, expand the member to edit
                                    windows and refine the active window.
                                  </div>
                                `:t`<div class="muted" style="margin-top:8px">
                                  ${d?"First schedule starts with no default required.":"First schedule in the group becomes the default (no season dates)."}
                                </div>`}
                            <div class="add-actions">
                              <button
                                type="button"
                                class="primary"
                                @click=${()=>this._addGroupMember()}
                              >
                                Save schedule window
                              </button>
                              <button
                                type="button"
                                @click=${()=>{this._addingMember=!1,this._addMemberError=null}}
                              >
                                Cancel
                              </button>
                            </div>
                            ${re(t,this._addMemberError,"critical")}
                          `:t`
                            <button
                              type="button"
                              class="add-new-bar"
                              @click=${()=>{this._addingMember=!0,this._addMemberError=null,this._newMemberName="",this._newMemberStart=w(),this._newMemberEnd=y(),this._newMemberYearly=!0}}
                            >
                              Add a new schedule window
                            </button>
                          `}
                    </div>
                    <div
                      style="margin-top:10px;padding-top:10px;border-top:1px solid var(--divider-color)"
                    >
                      ${s?t`
                            <div class="muted" style="font-weight:600">
                              Default schedule
                            </div>
                            <div class="muted">
                              Used when no seasonal member matches today’s date.
                            </div>
                            <div
                              class="row"
                              style="margin-top:6px;margin-bottom:10px;flex-wrap:wrap;gap:6px"
                            >
                              ${r.map((e=>t`<button
                                  type="button"
                                  class="linkish ${c===e.id?"on":""}"
                                  style="padding:4px 8px;border-radius:6px;border:1px solid var(--divider-color);background:${c===e.id?"var(--primary-color)":"var(--card-background-color)"};color:${c===e.id?"var(--text-primary-color, #fff)":"var(--primary-text-color)"};cursor:pointer"
                                  @click=${()=>this._patchGroup({require_fallback:!0,fallback_member_id:e.id})}
                                >
                                  ${e.name}
                                </button>`))}
                            </div>
                          `:""}
                      <button
                        type="button"
                        class="add-new-bar ${d?"on":""}"
                        aria-pressed=${d?"true":"false"}
                        title=${d?"Click to require a default schedule window for this group. Default windows apply when no other schedule is active.":"Click to not require a default schedule window for this group. This will allow periods where no schedule is active for this group."}
                        @click=${()=>this._setDontRequireDefault(!d)}
                      >
                        ${d?"Require a default schedule window":"Don't require a default schedule window"}
                      </button>
                      ${this._groupPatchError?t`<div class="error" style="margin-top:8px">
                            ${this._groupPatchError}
                          </div>`:""}
                    </div>
                    <button
                      type="button"
                      class="delete-entity-bar"
                      @click=${e=>this._deleteEntireGroup(e)}
                    >
                      Delete ${i.friendly_name||e.attributes.friendly_name||"Schedule Group"}
                    </button>
                  `:""}
            </div>
          </div>
        </ha-card>
      `}_renderNewMemberDateField(e,i){let r="start"===e?this._newMemberStart:this._newMemberEnd;String(r||"").trim()||(r="start"===e?w():y());if(!1!==this._newMemberYearly){const n=h(r);return t`
          <div class="date-row">
            <span class="muted">${i}</span>
            <div class="md-pick">
              <select
                aria-label="${i} month"
                .value=${String(n.month)}
                @change=${t=>{const i=m(Number(t.target.value),n.day);"start"===e?this._newMemberStart=i:this._newMemberEnd=i}}
              >
                ${f.map((([e,i])=>t`<option
                      value=${e}
                      ?selected=${Number(e)===n.month}
                    >
                      ${i}
                    </option>`))}
              </select>
              <select
                aria-label="${i} day"
                .value=${String(n.day)}
                @change=${t=>{const i=Number(t.target.value),r=m(n.month,i);"start"===e?this._newMemberStart=r:this._newMemberEnd=r}}
              >
                ${Array.from({length:31},((e,t)=>t+1)).map((e=>t`<option value=${e} ?selected=${e===n.day}>
                      ${e}
                    </option>`))}
              </select>
            </div>
          </div>
        `}const n=u(r,e);return t`
        <div class="date-row">
          <span class="muted">${i}</span>
          <input
            type="date"
            .value=${n}
            @change=${t=>{const i=t.target.value||"";"start"===e?this._newMemberStart=i:this._newMemberEnd=i}}
          />
        </div>
      `}async _addGroupMember(){const e=this._groupId,t=String(this._newMemberName||"").trim();if(this._addMemberError=null,!e)return void(this._addMemberError=M);if(!t)return void(this._addMemberError=$);const i=this._state?.attributes?.members||[],r={name:t,group_id:e,enabled:!0,weekdays:["sun","mon","tue","wed","thu","fri","sat"],windows:[],season_available:!0};if(i.length>=1){const e=!1!==this._newMemberYearly,t=e?this._newMemberStart||w():u(this._newMemberStart,"start"),n=e?this._newMemberEnd||y():u(this._newMemberEnd,"end");r.date_range={start:t,end:n,recurs_yearly:e};const a=ie(r.date_range);if(a)return void(this._addMemberError=a);const o=this._state?.attributes?.fallback_member;for(const e of i)if(e.id!==o&&e.date_range&&te(r.date_range,e.date_range))return void(this._addMemberError=N(e.name||"another schedule window"))}else r.date_range=null;await this._ssCall("create_schedule",r,{inline:"add",ctx:{create:!0,selfName:t}})&&(this._pendingExpandName=t,this._addingMember=!1,this._newMemberName="",this._addMemberError=null)}async _patchGroup(e){this._groupPatchError=null;const t=this._state?.attributes||{},i=void 0!==e.require_fallback?Boolean(e.require_fallback):!1!==t.require_fallback,r=void 0!==e.fallback_member_id?e.fallback_member_id:t.fallback_member;if(i&&!r)return this._groupPatchError="Pick a default schedule, or turn on “Don’t require a default schedule window”.",!1;const n=this._groupId;return!!n&&await this._ssCall("update_group",{group_id:n,...e})}async _setDontRequireDefault(e){if(e)await this._patchGroup({require_fallback:!1,fallback_member_id:null});else{const e=this._state?.attributes||{},t=e.members||[],i=e.fallback_member||t.find((e=>!e.date_range))?.id||t[0]?.id||null;if(!i)return void(this._groupPatchError="Add a member before requiring a default schedule.");await this._patchGroup({require_fallback:!0,fallback_member_id:i})}}_isDefaultMember(e,t,i){const r=i||t?.members||[];return!1!==t?.require_fallback&&(1===r.length||(t?.fallback_member===e.id||!(e.date_range||null!=t?.fallback_member&&t?.fallback_member!==e.id)))}async _setMemberAsDefault(e){const t=(this._state?.attributes||{}).members||[];for(const i of t)if(i.id!==e.id&&!i.date_range){if(!await this._patchMemberSeason(i.id,{season_available:!1}))return}if(!await this._patchMemberSeason(e.id,{date_range:null,season_available:!0}))return;const i=this._groupId;i&&await this._ssCall("update_group",{group_id:i,require_fallback:!0,fallback_member_id:e.id})}async _deleteMember(e){if(!e?.id)return;const t=this._state?.attributes?.members||[];if(1===t.length){if(!await be(`“${e.name||"This schedule window"}” is the only schedule window in this group. Delete it anyway? The group will have no windows until you add one.`,"Delete"))return}this._expandedId===e.id&&(this._expandedId=null);await this._ssCall("delete_schedule",{schedule_id:e.id})&&1===t.length&&this._showToast("Group is empty — add a schedule window to make this group active.","warning")}async _deleteEntireGroup(e){const t=e?.currentTarget||e?.target;t&&"function"==typeof t.blur&&t.blur();const i=this._state,r=i?.attributes?.friendly_name||this._config?.entity||"this schedule group";if(!await be(`Delete ${r}? This removes the entire group and cannot be undone.`,"Delete"))return;const n=this._groupId;n?await this._ssCall("delete_group",{group_id:n}):this._showToast(M,"critical")}async _ensureSoleMemberDefault(e,t){if(this._ensuringSoleDefault)return;if(!e||1!==e.length)return;const i=e[0];if(!i?.id)return;const r=Boolean(i.date_range),n=t?.fallback_member!==i.id;if(r||n){this._ensuringSoleDefault=!0;try{await this._setMemberAsDefault(i)}finally{this._ensuringSoleDefault=!1}}}_renderMemberWindowsEditor(e){return e.entity_id?t`
        <simple-schedule-card
          class="embedded-member-card"
          data-member-id=${e.id}
          .hass=${this.hass}
        ></simple-schedule-card>
      `:t`<div class="muted">No entity for this member.</div>`}updated(e){if(!this.shadowRoot)return;const t=this._state?.attributes||{},i=t.members||[];if(this._clearSeasonOverrideIfSynced(i),this._ensureSoleMemberDefault(i,t),this._pendingExpandName){const e=i.find((e=>e.name===this._pendingExpandName));e&&(this._expandedId=e.id,this._pendingExpandName=null)}for(const e of this.shadowRoot.querySelectorAll("simple-schedule-card.embedded-member-card")){const t=e.getAttribute("data-member-id"),r=i.find((e=>e.id===t));if(!r?.entity_id)continue;e.hass=this.hass;const n={entity:r.entity_id,time_format:this._config?.time_format||"12",embedded:!0,editor_only:!0,start_expanded:!0,expanded:!0},a=e._config||{};if(a.entity!==n.entity||a.time_format!==n.time_format||!a.embedded)try{e.setConfig(n)}catch(e){}}}static getStubConfig(e){return{type:"custom:simple-schedule-group-card",entity:Object.keys(e.states).find((e=>e.startsWith("simple_schedule.group_")))||"simple_schedule.group_sample_outdoor_lighting"}}}class Ke extends e{static get properties(){return{hass:{},_config:{}}}static get styles(){return i`
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
      `}setConfig(e){this._config=e||{}}get _fmt(){return"24"===String(this._config?.time_format||"12")?"24":"12"}get _isGroupCard(){return(this._config?.type||"").includes("simple-schedule-group-card")}render(){if(!this._config)return t``;const e=this._fmt;return t`
        <div class="wrap">
          <div>
            <div class="label">Entity</div>
            <ha-entity-picker
              .hass=${this.hass}
              .value=${this._config.entity||""}
              .includeDomains=${["simple_schedule"]}
              .label=${"Entity"}
              allow-custom-entity
              @value-changed=${this._entityChanged}
            ></ha-entity-picker>
            <div class="hint">
              ${this._isGroupCard?"Pick a simple_schedule group entity.":"Pick a simple_schedule entity."}
            </div>
          </div>
          <div>
            <div class="label">Time format</div>
            <div class="tf-row">
              <button
                type="button"
                class="${"12"===e?"on":""}"
                @click=${()=>this._update({time_format:"12"})}
              >
                12-hour
              </button>
              <button
                type="button"
                class="${"24"===e?"on":""}"
                @click=${()=>this._update({time_format:"24"})}
              >
                24-hour
              </button>
            </div>
          </div>
        </div>
      `}_entityChanged(e){const t=e.detail?.value??"";this._update({entity:t||void 0})}_update(e){this._config={...this._config,...e},this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}}customElements.get("simple-schedule-card")||customElements.define("simple-schedule-card",Le),customElements.get("simple-schedule-group-card")||customElements.define("simple-schedule-group-card",qe),customElements.get("simple-schedule-card-editor")||customElements.define("simple-schedule-card-editor",Ke),window.customCards=window.customCards||[],window.customCards.some((e=>"simple-schedule-card"===e.type))||window.customCards.push({type:"simple-schedule-card",name:"Simple Schedule Card",description:"Create a set of schedules that can operate independently.",preview:!1}),window.customCards.some((e=>"simple-schedule-group-card"===e.type))||window.customCards.push({type:"simple-schedule-group-card",name:"Simple Schedule Group Card",description:"Create a group of schedules where only one schedule is active at any given time. Example: A Normal, Halloween, and Christmas lighting schedule",preview:!1})};e()})();