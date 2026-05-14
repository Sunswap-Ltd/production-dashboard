# Production Dashboard — Claude notes

A wall-mounted production dashboard for Sunswap's TRU assembly line, built as an **Airtable Interface Extension** (NOT a Custom Extension — the SDK and init code differ; see "Interface Extension gotchas" below).

The dashboard shows a single production line at a time as a dense **operation × build-slot matrix**. The screen is mounted **vertically** in the office (4K portrait), so the matrix is transposed: ops are rows, slots are columns.

---

## Quickstart

```bash
# Dev (hot reload to https://localhost:9002)
npx block run --port 9002

# Publish
echo "release notes" | npx block release

# REST API sanity (uses PAT from env)
curl -s -H "Authorization: Bearer $AIRTABLE_PERSONAL_ACCESS_TOKEN" \
  "https://api.airtable.com/v0/meta/bases/appao66f0MDXFsffr/tables"
```

- Base: `appao66f0MDXFsffr`
- Interface URL: https://airtable.com/appao66f0MDXFsffr/pag2KDtJh7tDE66vh/edit
- Block ID lives in `.block/remote.json` (baseId MUST be `"NONE"` for Interface Extensions)

### ⚠️ CRITICAL: Always inspect the local dev server, never the published bundle

This project's dev server runs on **port 9002 — NOT the Airtable default 9000**. The "Develop" button in the Airtable extension panel pre-fills `https://localhost:9000` and you must change it to `https://localhost:9002` every single time. Claude keeps forgetting this — when the user has to tell you "the port is 9002", it means the extension is pointed at the wrong URL and your code changes won't show up no matter how many times you reload.

Airtable Interface Extensions can be configured to load from EITHER:
- **Local dev server** (`https://localhost:9002` — note the port!) — shows the code from `frontend/` you're currently editing, hot-reloads on save. **This is what you want when iterating.**
- **Published bundle** (last `npx block release`) — what end users see. Does NOT reflect uncommitted local edits.

**The Airtable interface does NOT automatically point at the dev server.** It defaults to the published bundle. Switching to dev mode requires a manual action in the Airtable UI that Claude usually cannot perform via browser MCP (the option lives in a side panel that opens when the extension element is selected in design mode, and only `https://localhost:9002` is recognised once accepted via cert prompt).

Symptoms of "inspecting the wrong bundle":
- Code changes don't appear in screenshots even after `Edit` succeeded.
- The dev server log shows `Bundle updated` but the rendered UI looks identical to before.
- Adding a `console.log` does not appear in the browser console.

**Process:**
1. Before assuming a change "didn't work" based on a screenshot, ASK THE USER to confirm the extension is pointed at `https://localhost:9002` (dev mode). Do not waste cycles debugging code that you cannot see.
2. If the user enters dev mode for you, capture a fresh screenshot AFTER that switch — older screenshots reflect the published bundle.
3. If the dev server crashes (the `.tmp/` output dir disappears or the browser shows `Could not resolve .tmp/index.js`), restart it via `npx block run --port 9002 > /tmp/block_run.log 2>&1 &` and tail the log to confirm `Bundle updated`.
4. After every restart, the user must accept the SSL cert again at https://localhost:9002 if their browser drops the exception.

**⛔ DO NOT reload the Airtable tab once the user has enabled dev mode.** Airtable's dev-server URL field is *not* persisted across page reloads — any refresh (F5, `key: F5`, `navigate` to the same URL, hard reload, even a subsequent `navigate` call to the Airtable page) silently resets it back to the default `https://localhost:9000`, which is the wrong port for this project. After that the extension iframe goes blank, the right-hand "Development" panel will still claim "in development mode" with the wrong server URL, and you'll see no console errors — just a spinner. Recovery requires the **user** to manually re-enter the correct port. Claude cannot do this through browser MCP (localhost navigation is blocked, and the field isn't reachable in design mode without manual selection).

The dev server hot-reloads in place, so after editing code a fresh `screenshot` is enough — never call `navigate` or send `F5`. The ONLY safe browser actions after dev mode is enabled are `screenshot` / `zoom` / `scroll` / `read_console_messages`.

---

## File map

| File | What it does |
|---|---|
| `frontend/index.js` | `initializeBlock({interface: () => <App />})` — the **only** correct init shape |
| `frontend/App.js` | URL-hash-driven line picker, KPI strip, andon-pulse keyframes |
| `frontend/styles.js` | Sunswap palette (`COLOURS.*`), `STATE_COLOURS`, grid layout |
| `frontend/components/HeaderBar.js` | Top bar: title (= selected line), clock, line dropdown |
| `frontend/components/MetricsPanel.js` | KPI cards in the strip below the header |
| `frontend/components/Matrix.js` | The big one. Transposed matrix + `SlotColumnHeader` + per-op `Exp`/`Median` row |
| `frontend/components/OpTile.js` | Per-cell tile: state frame, state tint, pie chart, photo (or `PhotoPlaceholder` SVG), popover, ⚠ warning, operator headshot, minute badge |
| `frontend/components/FooterBar.js` | Direct-assembly attendance + active andon count |
| `frontend/engine/constants.js` | Airtable table + field names (exact strings, including the trailing space in `Supply Chain `) |
| `frontend/engine/helpers.js` | `safeStr/safeNum/safeLink/safeAttachment`, `durationToHours`, `formatDuration` |
| `frontend/engine/calculations.js` | `computeYamazumi`, `computeAttendance`, `computeLineBalance`, `findBottleneck` |
| `frontend/hooks/useProductionData.js` | Single source of truth. Parses every table, builds `lineColumns` + `lineMatrixRows`, computes metrics, validates VMR-vs-ASN |

---

## Data flow (top of `useProductionData.js` → output shape)

1. **Tables read** via `useRecords` (one hook per table). Records flow into the big `useMemo` that does everything.
2. **Per-row parsing** of each Airtable table into shape-typed JS objects (sessions, breaks, builds, slots, op-versions, areas, stations, lines, team, timesheets).
3. **Operation-version canonicalisation** — for each parent operation, pick the "latest released" op-version (Status === `"Released"`, highest version number from `-vN` in the name). Its cycle time + sequenceId + title become the column's canonical values. Op-version `Station` is run through `stripQuotes()` because some records have `"…"` typed around the station title, which would otherwise drop them out of the active-stations set and silently kill their row in the matrix.
4. **Per build-slot loop** — walk variant config, build cellMap per `(station, operationId)`, aggregate across op-versions when needed. Track `expectedByOpId` (VMR's required versions + repeats) and `actualByOpId` (this build's actual ASNs). Each cell also tracks `scheduled` count.
5. **State derivation per cell** — most-active-wins: `andon > live > paused > completed > scheduled > pending`. (`partial` is gone; any non-zero `completed` lands in `completed` and surfaces via the pie + minute badge.) `completionFraction` drives the conic-gradient pie, `completionMinutes` drives the bottom-right badge.
6. **Orphan-cell pass** — ASNs at ops not in the VMR get synthesised cells (so the matrix surfaces them), and a column is added to `opVersionsByLineId`. Same most-active-wins derivation applies.
7. **Warning pass** — flag wrong-version / wrong-count / missing / orphan as `cell.warning = [string, ...]` (drives the amber ⚠ badge).
8. **Slot filter** — keep only slots whose number falls in the in-progress range (min → max of in-progress slot numbers; everything between is included regardless of status).
9. **Post-filter pass** — compute per-column `repeatsLatest` (from the highest-slotNum `progress > 0` slot's VMR) and `medianActualSeconds` (median of in-view completed-session assembly times).
10. **Build `lineColumns`** — group ops into stations, sort:
    - **Areas alphabetical** (`localeCompare` with `numeric: true`)
    - **Stations alphabetical** within each area (STN-10 before STN-20 …)
    - **Ops by sequenceId** (using the latest-released op-version's value)

The hook returns: `lineColumns`, `lineMatrixRows`, `andonAlerts` (each carries `lineName`), `openDefects` (each carries `lineName`), `metrics`, `settings` + `settingsTable`, plus the missing-tables error path. The `lineName` tags let `MetricsPanel` filter the Live Defects / Andons KPI cards to the currently selected line.

---

## Production Rate & Pace KPIs (target lookup)

Both cards are denominated in **% of a build**. A "step" is a row in the `Session Steps` table; each carries a `Build Percentage per Step` value saying how much of a complete build that step represents.

**Daily target lookup** — `useProductionData.js` walks the `KPI Records` table and picks the **first** row where ALL of:

| Field | Required value |
|---|---|
| `Type` | `"Target"` (single-select; the table also has `"Actual"` rows used for historical logs — those are ignored) |
| `KPI` | Linked record whose `Name` starts with `"KPI-376 "` (i.e. KPI-376 = *Endurance Production Rate (% of build equivalent)*). The KPI table's primary field is the formula `Name`, which is `"KPI-376 - Endurance Production Rate …"` — so we match by code prefix, not equality. `KPI_PRODUCTION_RATE_TARGET` in `constants.js` is the bare code (`"KPI-376"`). |
| `Date` | Today (`isToday(...)`). No fallback to prior days — see below. |
| `Metric` | A finite number. **Airtable percent fields return a fraction** (e.g. `1` for 100%, `0.85` for 85%), so we multiply by 100. |

**If no such row exists today**, `dailyTargetPct = null` and `targetAvailable = false`. The Production Rate and Pace cards both render `—  no Target KPI for today` rather than falling back to a hardcoded 100% (we removed that fallback — it silently hid configuration errors). Per-station rates are also skipped (they need a target to be meaningful).

The daily target row needs to be **created in Airtable** every operating day. The dashboard does not synthesise it.

**Derived numbers (when a target exists):**

- `actualPct` = Σ `Build Percentage per Step` across every Session Step completed today by an ASN on a build currently in view on the selected line.
- `expectedByNowPct` = `dailyTargetPct × (productiveMinutesElapsed / productiveMinutesTotal)`. Productive minutes come from the `Settings` table's shift start/end minus configured breaks; `elapsedProductiveMinutes` computes against wall clock.
- `deltaPct` = `actualPct − expectedByNowPct`. RAG: green ≥ expected, amber within 5 pp behind, red > 5 pp behind.
- `targetPacePctPerHr` = `dailyTargetPct / productiveHoursTotal` (steady pace to hit 100%).
- `actualPacePctPerHr` = `actualPct / productiveHoursElapsed` (shift-average so far).
- `recentPacePctPerHr` = sum of step %s in the **last 60 productive minutes**, divided by that window in hours. This is the headline number on the Pace card. RAG: green ≥ 95% of target, amber ≥ 80%, red below.

**Chart axis** — the production-rate sparkline plots in **wall-clock** minutes (shift start → shift end), NOT productive minutes. Each step's wall-clock minute-of-day is captured at parse time (`wallMin`) alongside `productiveMin`. The dashed target is a piecewise polyline (`buildTargetPoints`): rising during productive segments at slope `dailyTargetPct / productiveMinutesTotal`, flat across each break window. This makes the break periods visible as horizontal sections on the dashed line. The actual line uses the same X-axis so it lines up. Don't switch back to productive-minute X — you'd hide the breaks again.

**On-break override** — when wall-clock "now" lies strictly inside any break window, `paceByLineId[lineId].onBreak = true` and `status = "green"`. The Pace card swaps its pill label to **"on break"** (green) regardless of the recent-pace number. The Production Rate card's RAG tint is intentionally **not** overridden — production rate vs. target hasn't suddenly improved just because the team is on lunch.

**Interface-extension gotcha**: the `Type` field on KPI Records must be enabled in the Airtable interface's Fields popover (same rule as every other field — see schema notes below). If today's Target row exists in the table but the card still says "no Target KPI for today", check the Fields popover first.

---

## Visual hierarchy (current)

```
ENDURANCE LINE (header)                                                  ← 56 px
[KPI strip: WiP · On Floor · Completed · Prod Rate · Line Balance ·
             Bottleneck · Live Defects · Andons (unique/total) ]          ← 172 px (sized around the prod-rate sparkline; see styles.js)

┌──────────────┬───── slot 0159 ─── slot 0160 ─── slot 0162 ───  …  ─── slot 0193 ─┐
│ OPERATION    │ [Cranswick logo] │ [Bannister]   │ [no logo]     │   │            │  ← End User logo (22 px, contain)
│              │ 0159 BLD-00755   │ 0160 BLD-00761│ 0162 BLD-…    │   │            │
│              │ [bar] 0%         │ [bar] 7%      │ [bar] 100%    │   │            │  ← SlotColumnHeader
│              │ S-3962-D-I       │ S-3962-D-I    │ S-3962-D-I    │   │ MR badge   │
│              │                  │               │ COMPLETE      │   │            │
│              │ 12 Feb → 13 May  │ 9 Feb → 8 May │ …             │   │            │  ← Scheduled Build Start → Scheduled Completion
├──────────────┼──────────────────┼───────────────┼───────────────┼───┼────────────┤
│ BATTERY PACK & ELECTRICAL ◄── area banner (full-width, Sol)                       │
│   STN-40 REFRIGERATION    ◄── station banner (full-width, white)                  │
│     OP-507 Gen 1.3 - … (Stage 1)│  ▢   │  ▢    │  ✓ 1h45 │ …   │   │            │
│       Exp 1h45  Median 18h30    │      │       │         │     │   │            │
│     …
│ EOL
│   STN-60 …
│     …
└─────────────────────────────────────────────────────────────────────┘
```

The Area banner strip (TL/QA/PS/SC leader cards + per-area defect/andon thumbs) was **removed**. Live defects and active andons now surface as KPI cards in the top strip instead, scoped to the selected line.

OpTile cell anatomy (~38 px square; status-driven frames):
- **Layer order** (bottom → top): white base layer → photo (or inline `PhotoPlaceholder` SVG when missing) → state tint → frame → overlays.
- **Frame**: 3 px coloured border driven by `STATE_COLOURS`. Pending is special — 2 px Road-grey wire frame so it sits visually beneath the active states.
- **Frame palette** (mirrors Airtable's Assembly Sessions Status single-select):
  - completed `#15803D` dark green · live `#4ADE80` light green · paused `#F59E0B` amber · scheduled `#3B82F6` blue · pending Road grey · andon `COLOURS.red` (pulses)
- **State tint** (rgba wash over the photo):
  - completed 70 % · live / paused / andon / scheduled 30 % · pending 20 % · (none for `na`)
- **Pie**: conic-gradient at the centre when `0 < completionFraction < 1` and state ≠ andon. Pie colour = `STATE_COLOURS[state]`.
- **Top-left**: amber ⚠ badge when `cell.warning` is truthy.
- **Top-right**: operator headshot with state-coloured border; `+N` chip if more than one live operator.
- **Bottom-right**: minute badge whenever `completionMinutes > 0` (median across done repeats) — formatted `12m` / `1h45`. Multi-repeat partials may show `2/3` count instead.
- Version label (`v1`, `v2`, `v1+`) is **not** rendered on the tile — the op-version photo already conveys which version is in play. Version detail still shows in the hover popover for QA.
- **Andon pulse**: known-cause `andon-pulse` (1.5 s); unknown-cause `andon-pulse-large` (1.10× scale, 0.9 s).
- **No photo on op-version**: `PhotoPlaceholder` renders a grey landscape glyph on Frost so empty cells still read consistently.

---

## Sunswap branding (apply religiously)

Palette in `frontend/styles.js`:

| Name | Hex | Role |
|---|---|---|
| Snow | `#ffffff` | Background / reversed text |
| Frost | `#e6e2db` | Subtle backgrounds, muted text on dark |
| Road | `#9b9b9b` | Mid grey, secondary elements |
| Tarmac | `#393939` | Borders, dim states |
| Sol | `#ff4700` | Brand orange — sparingly. Production-rate KPI accent, line-name title in header. (Note: live ASN cells use Airtable light-green `#4ADE80`, not Sol — Sol is no longer the live colour.) |
| Motorway | `#000000` | Matrix background, header bg |

Font stack: `'Arbeit', Arial, Helvetica, Calibri, sans-serif`.

Rules:
- Sol used **sparingly** — it should pop. Live cells, accent text only.
- No throughline dividers in Sol — use Road @ 18 % or AREA_DIVIDER @ 10 %.
- Avoid emojis. The ⚠ (warning) and existing state glyphs (✓ on completed cells was removed — green tint is enough) are intentional.

---

## Airtable schema notes

Table names use exact strings in `constants.js` (case + spaces matter). Critical fields:

| Table | Field | Why it matters |
|---|---|---|
| Production Stations | `Status` | Skip when `=== "Inactive"`. 12 legacy stations are inactive. |
| Production Areas | `Supply Chain ` | **Trailing space in field name** — keep exact. |
| Operation Versions | `Station` | Some records have literal `"` quote marks around the value (data-entry typo). `useProductionData` runs the value through `stripQuotes()` before matching against `activeStationTitles`. Don't remove that helper. |
| Operation Versions | `Status` | `"Released"` is the canonical state for matrix columns. |
| Operation Versions | `Operation Cycle Time VA&NVA` | Duration field → API returns **seconds**. Many op-versions don't have this set; missing → `Exp —`. |
| Assembly Sessions | `Assembly Time (minutes)` | Value-added minutes (no breaks). Used for cycle-time badge + median. |
| Assembly Sessions | `Actual Time (hh:mm:ss)` | Elapsed seconds. Available but **not used for badges** — noisy (lunch/shift gaps inflate it). |
| Build Slots | `Line Slot ID` | Format `"<number>-<line name>"`. Strip the `-<lineName>` suffix to get the number. |
| Build Slots | `Scheduled Build Start` / `Scheduled Completion` | Date fields (ISO `YYYY-MM-DD`). Rendered under the slot status as `12 Feb → 13 May`. **Don't** use `new Date(...).toLocaleDateString()` directly — Airtable returns no zone, so it parses as UTC midnight and shifts by one day in negative-UTC zones. Parse the string manually (see `formatScheduleDate` in Matrix.js). |
| Builds | `Build ID` | Some records embed nickname like `"BLD-00761 (Circuit)"`. Detect with `endsWith('(${nickname})')` to avoid duplicating. |
| Builds | `End User` | **multipleAttachments** — customer logo. Read via `safeAttachment(r, ..., {size: 'large'})` because the small thumb (~36 px tall) is undersized for the 22 px header strip when downscaled to maintain crispness. Some builds have no logo set; the slot header reserves the strip height regardless so columns stay aligned. |
| Timesheets | `Direct Assembly Cost` | **Checkbox**, not a number. Use `r.getCellValue(...)` cast to bool. |
| KPI Records | `Type`, `KPI`, `Date`, `Metric` | Daily production-rate target lives here. See "Production Rate & Pace KPIs" above for the exact filter (`Type=Target` + `KPI` Name starts with `KPI-376` + `Date=today`). `Metric` is an Airtable percent field returning a fraction (× 100 to get percent). Linked `KPI` field's primary value is the long `Name` formula, not the bare code — match by prefix. |

**Interface Extension fields panel**: any new field added to `constants.js` must also be **enabled in the Airtable interface's Fields popover** before it's visible to `record.getCellValue(...)`. If you see `Exp —` everywhere despite data existing, the field isn't enabled in the interface.

---

## Recurring patterns (use these, don't reinvent)

- **Centring an OpTile in a wider column**: wrap in `<div style={{display: 'flex', justifyContent: 'center'}}>` — `text-align: center` on the `<td>` doesn't work because OpTile's root is a block-level div.
- **Sticky table cells**: `position: sticky; top: 0` for column headers, `left: 0` for row labels. Corner cell needs both. Z-index ladder: `5` for corner, `3` for row/col headers, `1-2` for body.
- **Hash → palette index**: `MR_BADGE_PALETTE[Math.abs(hashString(mr)) % palette.length]` — same string always maps to same colour.
- **Stable / consistent sort with numbers in strings**: `localeCompare(..., undefined, {numeric: true})` so STN-10 sorts before STN-20.
- **Duration fields**: Airtable returns seconds. Use `safeNum / 3600` for hours, `safeNum / 60` for minutes, or `durationToHours()` helper.

---

## Interface Extension gotchas

This is an **Interface Extension** (new SDK), not a Custom Extension (old SDK). Differences:

| | Custom (old) | Interface (this project) |
|---|---|---|
| SDK | `@airtable/blocks: 1.18.2` | `@airtable/blocks: interface-alpha` |
| Import | `@airtable/blocks/ui` | `@airtable/blocks/interface/ui` |
| Init | `initializeBlock(() => <App />)` | `initializeBlock({interface: () => <App />})` |
| baseId in `.block/remote.json` | real `app...` | literal `"NONE"` |
| React | 17 | 19 |

If `initializeBlock is not a function`, the import path is wrong. If `FORBIDDEN`, baseId isn't `"NONE"`.

---

## Verification loop

The dev server stays up at https://localhost:9002 (SSL cert pre-accepted). After edits:

1. Hot reload usually picks up changes automatically.
2. Browser MCP screenshot to verify: `mcp__Claude_in_Chrome__computer` action=screenshot then action=zoom on the region of interest.
3. For pulse / andon visuals, take 2-3 screenshots ~0.4s apart to catch the bright phase.
4. For data correctness, REST API spot-checks beat screenshots — see Quickstart for the curl pattern.

---

## What's intentionally out of scope

- Edit mode of any kind (station reorder, slot pinning) — removed in the matrix-rewrite.
- Floor map / draggable polygons — removed in the matrix-rewrite.
- Right-panel build journey — removed; the matrix replaces it.
- Area banner strip (TL/QA/PS/SC leader cards + per-area defect/andon thumbs) — removed; live defects + andons live in the KPI strip now, scoped to the selected line.
- `partial` cell state — folded into `completed` (any non-zero `completed`).
- Yamazumi / cycle-time-by-cell visualisation — current scope is op-state only.
- Multi-line view — dropdown filters to one line at a time, persisted in URL hash `#line=...`.
- Showing scheduled-but-not-started slots outside the in-progress range.
