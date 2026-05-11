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

---

## File map

| File | What it does |
|---|---|
| `frontend/index.js` | `initializeBlock({interface: () => <App />})` — the **only** correct init shape |
| `frontend/App.js` | URL-hash-driven line picker, KPI strip, andon-pulse keyframes |
| `frontend/styles.js` | Sunswap palette (`COLOURS.*`), `STATE_COLOURS`, grid layout |
| `frontend/components/HeaderBar.js` | Top bar: title (= selected line), clock, line dropdown |
| `frontend/components/MetricsPanel.js` | KPI cards in the strip below the header |
| `frontend/components/Matrix.js` | The big one. Transposed matrix + `AreaStrip` + `SlotColumnHeader` + `LeaderTile` |
| `frontend/components/OpTile.js` | Per-cell tile: state border, pie chart, ✓ tint, photo, popover, ⚠ warning, operator headshot, version label, minute badge |
| `frontend/components/FooterBar.js` | Direct-assembly attendance + active andon count |
| `frontend/engine/constants.js` | Airtable table + field names (exact strings, including the trailing space in `Supply Chain `) |
| `frontend/engine/helpers.js` | `safeStr/safeNum/safeLink/safeAttachment`, `durationToHours`, `formatDuration` |
| `frontend/engine/calculations.js` | `computeYamazumi`, `computeAttendance`, `computeLineBalance`, `findBottleneck` |
| `frontend/hooks/useProductionData.js` | Single source of truth. Parses every table, builds `lineColumns` + `lineMatrixRows`, computes metrics, validates VMR-vs-ASN |

---

## Data flow (top of `useProductionData.js` → output shape)

1. **Tables read** via `useRecords` (one hook per table). Records flow into the big `useMemo` that does everything.
2. **Per-row parsing** of each Airtable table into shape-typed JS objects (sessions, breaks, builds, slots, op-versions, areas, stations, lines, team, timesheets).
3. **Operation-version canonicalisation** — for each parent operation, pick the "latest released" op-version (Status === `"Released"`, highest version number from `-vN` in the name). Its cycle time + sequenceId + title become the column's canonical values.
4. **Per build-slot loop** — walk variant config, build cellMap per `(station, operationId)`, aggregate across op-versions when needed. Track `expectedByOpId` (VMR's required versions + repeats) and `actualByOpId` (this build's actual ASNs).
5. **State derivation per cell** — andon > live > paused > completed > partial > pending, with `completionFraction` for the pie chart and `completionMinutes` for the bottom-right badge.
6. **Orphan-cell pass** — ASNs at ops not in the VMR get synthesised cells (so the matrix surfaces them), and a column is added to `opVersionsByLineId`.
7. **Warning pass** — flag wrong-version / wrong-count / missing / orphan as `cell.warning = [string, ...]` (drives the amber ⚠ badge).
8. **Slot filter** — keep only slots whose number falls in the in-progress range (min → max of in-progress slot numbers; everything between is included regardless of status).
9. **Post-filter pass** — compute per-column `repeatsLatest` (from the highest-slotNum `progress > 0` slot's VMR) and `medianActualSeconds` (median of in-view completed-session assembly times).
10. **Build `lineColumns`** — group ops into stations, sort:
    - **Areas alphabetical** (`localeCompare` with `numeric: true`)
    - **Stations alphabetical** within each area (STN-10 before STN-20 …)
    - **Ops by sequenceId** (using the latest-released op-version's value)

The hook returns: `lineColumns`, `lineMatrixRows`, `andonAlerts`, `metrics`, plus the missing-tables error path.

---

## Visual hierarchy (current)

```
ENDURANCE LINE (header)
[KPI strip: WIP, On Floor, Completed Today, Production Rate, Line Balance, Bottleneck]
[AreaStrip — leader cards: area title (Sol) + TL/QA/PS/SC avatars in a row, one card per area]

┌──────────────┬───── slot 0159 ─── slot 0160 ─── slot 0162 ───  …  ─── slot 0193 ─┐
│ OPERATION    │ Winter           │ Tundra        │ Trucker       │   │            │
│              │ [bar] 0%         │ [bar] 7%      │ [bar] 100%    │   │            │  ← SlotColumnHeader
│              │ S-3962-D-I       │ S-3962-D-I    │ S-3962-D-I    │   │ MR badge   │
│              │                  │               │ COMPLETE      │   │            │
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

OpTile cell anatomy (38 px square):
- **Border**: state colour (Sol = live, amber = paused, red = andon, green = completed, tarmac = pending)
- **Background**: op-version photo (or tarmac if no photo)
- **Centre**: conic-gradient pie (% complete) for live/partial; green tint for completed
- **Top-left**: amber ⚠ badge when `cell.warning` is truthy
- **Top-right**: operator headshot (circular avatar with state-coloured border)
- **Bottom-left**: version label (`v1`, `v2`, `v1+` if multiple)
- **Bottom-right**: minute badge for completed (`12m`, `1h45`), `2/3` count badge for multi-repeat partial
- **Andon pulse**: bigger glow + brighter peak; unknown-cause = `andon-pulse-large` (1.10× scale, 0.9s)

---

## Sunswap branding (apply religiously)

Palette in `frontend/styles.js`:

| Name | Hex | Role |
|---|---|---|
| Snow | `#ffffff` | Background / reversed text |
| Frost | `#e6e2db` | Subtle backgrounds, muted text on dark |
| Road | `#9b9b9b` | Mid grey, secondary elements |
| Tarmac | `#393939` | Borders, dim states |
| Sol | `#ff4700` | Brand orange — sparingly. Live ASN border, area title, sol stripe |
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
| Operation Versions | `Status` | `"Released"` is the canonical state for matrix columns. |
| Operation Versions | `Operation Cycle Time VA&NVA` | Duration field → API returns **seconds**. Many op-versions don't have this set; missing → `Exp —`. |
| Assembly Sessions | `Assembly Time (minutes)` | Value-added minutes (no breaks). Used for cycle-time badge + median. |
| Assembly Sessions | `Actual Time (hh:mm:ss)` | Elapsed seconds. Available but **not used for badges** — noisy (lunch/shift gaps inflate it). |
| Build Slots | `Line Slot ID` | Format `"<number>-<line name>"`. Strip the `-<lineName>` suffix to get the number. |
| Builds | `Build ID` | Some records embed nickname like `"BLD-00761 (Circuit)"`. Detect with `endsWith('(${nickname})')` to avoid duplicating. |
| Timesheets | `Direct Assembly Cost` | **Checkbox**, not a number. Use `r.getCellValue(...)` cast to bool. |

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
- Yamazumi / cycle-time-by-cell visualisation — current scope is op-state only.
- Multi-line view — dropdown filters to one line at a time, persisted in URL hash `#line=...`.
- Showing scheduled-but-not-started slots outside the in-progress range.
