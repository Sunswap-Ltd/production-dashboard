import React, {useEffect, useRef, useState} from 'react';
import {COLOURS, RAG, SLOT_COL_WIDTH, TILE_WIDTH, TILE_HEIGHT, TILE_ROW_PAD} from '../styles';
import {formatDuration} from '../engine/helpers';
import {hashString, colourForArea, AREA_PALETTE, AREA_NEUTRAL} from '../engine/colours';
import OpTile from './OpTile';

const CELL_SIZE = TILE_HEIGHT;
// Transposed layout: ops are rows, slots are columns.
// Operation row label column (sticky left) — wide enough to fit the full op title horizontally.
const OP_LABEL_W = 280;
// Slot column width (sticky top) — fits slot info: number, nickname, progress bar, MR badge.
const SLOT_COL_W = SLOT_COL_WIDTH;

// Status display — short labels only. All in-flight statuses get a visible label so
// every slot column has the same number of lines (otherwise "Assembling" slots collapse
// half a row and the slot numbers no longer line up across columns).
const GOODS_STATUS_SHORT = {
    'Goods Complete': 'Complete',
    'In Progress - Assembling': 'Assembling',
    'In Progress - Preparing Material': 'Prep material',
    'Scheduled Goods': 'Scheduled',
    'Unscheduled': 'Unscheduled',
};

const GOODS_STATUS_COLOUR = (status) => {
    if (status === 'Goods Complete') return COLOURS.green;
    if (status === 'In Progress - Preparing Material') return COLOURS.sol;
    if (status === 'Scheduled Goods') return COLOURS.frost;
    return COLOURS.road;
};

const MR_BADGE_PALETTE = [
    {bg: 'rgba(255, 71, 0, 0.20)',   border: 'rgba(255, 71, 0, 0.7)',   text: '#ff8a52'}, // Sol
    {bg: 'rgba(34, 197, 94, 0.20)',  border: 'rgba(34, 197, 94, 0.7)',  text: '#86efac'}, // green
    {bg: 'rgba(59, 130, 246, 0.22)', border: 'rgba(59, 130, 246, 0.7)', text: '#93c5fd'}, // blue
    {bg: 'rgba(234, 179, 8, 0.20)',  border: 'rgba(234, 179, 8, 0.7)',  text: '#fde047'}, // amber
    {bg: 'rgba(168, 85, 247, 0.22)', border: 'rgba(168, 85, 247, 0.7)', text: '#d8b4fe'}, // purple
    {bg: 'rgba(20, 184, 166, 0.22)', border: 'rgba(20, 184, 166, 0.7)', text: '#5eead4'}, // teal
    {bg: 'rgba(236, 72, 153, 0.22)', border: 'rgba(236, 72, 153, 0.7)', text: '#f9a8d4'}, // pink
];

function mrBadgeColour(mr) {
    return MR_BADGE_PALETTE[hashString(mr) % MR_BADGE_PALETTE.length];
}

// Strip a duplicated nickname from a Build ID like "BLD-00761 (Circuit)" so the slot
// header can show the bare BLD- code on one line and the nickname on the next.
function cleanJobId(jobId, nickname) {
    if (!jobId) return '';
    if (nickname && jobId.endsWith(`(${nickname})`)) {
        return jobId.slice(0, -(nickname.length + 3)).trim();
    }
    return jobId;
}

// "2026-05-13" → "13 May". Parsed manually because the date string has no zone and
// new Date('YYYY-MM-DD') is parsed as UTC midnight — locale rendering would shift
// the day in negative-UTC zones.
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatScheduleDate(s) {
    if (!s) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return s;
    const mon = MONTH_SHORT[parseInt(m[2], 10) - 1];
    if (!mon) return s;
    return `${parseInt(m[3], 10)} ${mon}`;
}

function SlotColumnHeader({slot}) {
    const progressPct = Math.round((slot.progress || 0) * 100);
    const hasShortLabel = Object.prototype.hasOwnProperty.call(GOODS_STATUS_SHORT, slot.goodsStatus);
    const statusLabel = hasShortLabel ? GOODS_STATUS_SHORT[slot.goodsStatus] : (slot.goodsStatus || '');
    const statusColour = GOODS_STATUS_COLOUR(slot.goodsStatus);
    const mr = slot.variantMfgRelease ? mrBadgeColour(slot.variantMfgRelease) : null;
    const jobIdClean = cleanJobId(slot.jobId, slot.nickname);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '6px 5px 6px',
            minWidth: 0,
            alignItems: 'stretch',
        }}>
            {/* End-user / customer logo. Reserve the slot even when missing so column
                heights stay aligned across the row. Logos vary wildly in aspect (Cranswick
                ~3.7:1, Bannister ~4.5:1) so object-fit: contain + a fixed box keeps them
                readable without distortion. */}
            <div style={{
                height: 22,
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {slot.endUserLogoUrl && (
                    <img
                        src={slot.endUserLogoUrl}
                        alt=""
                        style={{
                            maxHeight: '100%',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                )}
            </div>
            <div style={{
                fontWeight: 700,
                fontSize: 13,
                color: COLOURS.snow,
                lineHeight: 1.1,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
            }}>
                {slot.slotLabel || '—'}
            </div>
            <div
                title={jobIdClean}
                style={{
                    color: COLOURS.frost,
                    fontSize: 9,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {jobIdClean || '—'}
            </div>
            <div
                title={slot.nickname || ''}
                style={{
                    color: COLOURS.road,
                    fontSize: 9,
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'center',
                    minHeight: 11,
                }}
            >
                {slot.nickname || ''}
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 3, marginTop: 2}}>
                <div
                    title={`${progressPct}%`}
                    style={{
                        flex: 1,
                        height: 4,
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}
                >
                    <div style={{
                        width: `${Math.min(100, Math.max(0, progressPct))}%`,
                        height: '100%',
                        background: progressPct >= 100 ? COLOURS.green : COLOURS.sol,
                    }} />
                </div>
                <span style={{
                    color: COLOURS.snow,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 9,
                    minWidth: 16,
                    textAlign: 'right',
                }}>
                    {progressPct}
                </span>
            </div>
            {mr && (
                <span
                    title={`Variant MR: ${slot.variantMfgRelease}`}
                    style={{
                        background: mr.bg,
                        border: `1px solid ${mr.border}`,
                        color: mr.text,
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: 0.3,
                        padding: '1px 3px',
                        borderRadius: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'center',
                    }}
                >
                    {slot.variantMfgRelease}
                </span>
            )}
            {statusLabel && (
                <span style={{
                    color: statusColour,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    fontSize: 8,
                    fontWeight: 600,
                    textAlign: 'center',
                }}>
                    {statusLabel}
                </span>
            )}
            {(slot.scheduledStart || slot.scheduledEnd) && (
                <div
                    title={`Scheduled ${slot.scheduledStart || '—'} → ${slot.scheduledEnd || '—'}`}
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 1,
                        fontSize: 8,
                        color: COLOURS.road,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <span>{formatScheduleDate(slot.scheduledStart) || '—'}</span>
                    <span style={{color: COLOURS.tarmac}}>→</span>
                    <span>{formatScheduleDate(slot.scheduledEnd) || '—'}</span>
                </div>
            )}
        </div>
    );
}

// Inline RAG chip showing `actual / expected-by-now` for a station, sitting beside the
// station title (not floated to the far edge). Colour comes from RAG.chip; no glyph —
// the colour conveys status and a glyph would be redundant at this scale.
function StationRateChip({rate}) {
    if (!rate || !(rate.dailyTarget > 0)) return null;
    const rag = RAG[rate.status] || RAG.amber;
    return (
        <span
            title={`station target ${rate.dailyTarget.toFixed(2)}% · expected by now ${rate.expectedByNow.toFixed(2)}% · actual ${rate.actualToday.toFixed(2)}%`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: rag.chip,
                color: COLOURS.snow,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {rate.actualToday.toFixed(1)} / {rate.expectedByNow.toFixed(1)}%
        </span>
    );
}

function LineSection({line, rows, stationRates, pulsingAsnIds, rosterByTechId}) {
    const stationGroups = line.stations || [];
    const slots = rows || [];
    if (stationGroups.length === 0 || slots.length === 0) return null;

    // Track which area we've already labelled so the caption appears only on the FIRST
    // station of each area block (and the row's row-tint still flags every following
    // station as belonging to the same area).
    const seenAreas = new Set();

    const colCount = slots.length + 1; // +1 for the op-label sticky column

    return (
        <div style={{marginBottom: 18}}>
            <table style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
            }}>
                <thead>
                    {/* Sticky top: slot column headers */}
                    <tr>
                        <th style={{
                            width: OP_LABEL_W,
                            minWidth: OP_LABEL_W,
                            maxWidth: OP_LABEL_W,
                            position: 'sticky',
                            top: 0,
                            left: 0,
                            zIndex: 5,
                            background: COLOURS.bg,
                            padding: '6px 8px',
                            textAlign: 'left',
                            verticalAlign: 'bottom',
                            borderRight: `1px solid ${COLOURS.tarmac}`,
                            borderBottom: `1px solid ${COLOURS.tarmac}`,
                            fontSize: 9,
                            color: COLOURS.road,
                            textTransform: 'uppercase',
                            letterSpacing: 0.8,
                        }}>
                            Operation
                        </th>
                        {slots.map(slot => (
                            <th
                                key={slot.slotId}
                                style={{
                                    width: SLOT_COL_W,
                                    minWidth: SLOT_COL_W,
                                    maxWidth: SLOT_COL_W,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 3,
                                    background: COLOURS.bg,
                                    borderBottom: `1px solid ${COLOURS.tarmac}`,
                                    borderLeft: `1px solid rgba(155,155,155,0.12)`,
                                    verticalAlign: 'bottom',
                                    padding: 0,
                                }}
                            >
                                <SlotColumnHeader slot={slot} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {stationGroups.map((station, si) => {
                        const areaCol = colourForArea(station);
                        // Only show the area caption on the FIRST station of each area block;
                        // the row-tint already conveys "same area" for the following stations.
                        const showAreaCaption = !!station.areaTitle && !seenAreas.has(station.areaTitle);
                        if (station.areaTitle) seenAreas.add(station.areaTitle);
                        const rate = stationRates[station.stationTitle];
                        return (
                            <React.Fragment key={`stn-${station.stationTitle}`}>
                                {/* Station banner — title + inline RAG chip; area as caption below
                                    (first station of each area block only, to avoid repetition). */}
                                <tr>
                                    <th
                                        colSpan={colCount}
                                        title={station.areaTitle || ''}
                                        style={{
                                            position: 'sticky',
                                            left: 0,
                                            background: areaCol.row,
                                            padding: '8px 12px 5px',
                                            textAlign: 'left',
                                            whiteSpace: 'nowrap',
                                            borderTop: si > 0 ? `1px solid ${COLOURS.tarmac}` : 'none',
                                            zIndex: 2,
                                        }}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                                            <span style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: COLOURS.snow,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.6,
                                            }}>
                                                {station.stationTitle}
                                            </span>
                                            <StationRateChip rate={rate} />
                                        </div>
                                        {showAreaCaption && (
                                            <div style={{
                                                color: areaCol.text || COLOURS.frost,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                marginTop: 2,
                                                letterSpacing: 0.8,
                                                fontVariant: 'small-caps',
                                            }}>
                                                {station.areaTitle}
                                            </div>
                                        )}
                                    </th>
                                </tr>
                                {/* One row per op-version in this station */}
                                {station.opVersions.map((op, oi) => {
                                    const repeats = op.repeatsLatest || 1;
                                    const expSecondsTotal = (op.expectedCycleSeconds || 0) * repeats;
                                    const expMins = expSecondsTotal / 60;
                                    const actMins = (op.medianActualSeconds || 0) / 60;
                                    const hasExp = expMins > 0;
                                    const hasAct = actMins > 0;
                                    const versionLabel = op.latestVersionLabel ? ` (${op.latestVersionLabel})` : '';
                                    const expTooltip = hasExp
                                        ? `Expected cycle: ${formatDuration(op.expectedCycleSeconds / 60)}${repeats > 1 ? ` × ${repeats} repeats = ${formatDuration(expMins)}` : ''}${versionLabel}`
                                        : 'No expected cycle time set';
                                    const actTooltip = hasAct
                                        ? `Median completed ASN time in view: ${formatDuration(actMins)}`
                                        : 'No completed ASNs in view';
                                    return (
                                        <tr key={`${station.stationTitle}::${op.colKey}`}>
                                            <th
                                                title={op.title}
                                                style={{
                                                    width: OP_LABEL_W,
                                                    minWidth: OP_LABEL_W,
                                                    maxWidth: OP_LABEL_W,
                                                    position: 'sticky',
                                                    left: 0,
                                                    background: areaCol.row,
                                                    padding: '4px 8px 4px 32px',
                                                    textAlign: 'left',
                                                    verticalAlign: 'middle',
                                                    borderRight: `1px solid ${COLOURS.tarmac}`,
                                                    borderTop: oi === 0 ? `1px solid rgba(155,155,155,0.18)` : 'none',
                                                    zIndex: 1,
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: 10,
                                                    fontWeight: 500,
                                                    color: COLOURS.frost,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: 1.2,
                                                }}>
                                                    {op.title}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: 8,
                                                    marginTop: 2,
                                                    fontSize: 9,
                                                    lineHeight: 1.1,
                                                    color: COLOURS.road,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}>
                                                    <span title={expTooltip}>
                                                        <span style={{opacity: 0.7}}>Exp </span>
                                                        <span style={{color: hasExp ? COLOURS.frost : COLOURS.tarmac}}>
                                                            {hasExp ? formatDuration(expMins) : '—'}
                                                        </span>
                                                        {repeats > 1 && hasExp && (
                                                            <span style={{opacity: 0.55, marginLeft: 2}}>
                                                                (×{repeats})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span title={actTooltip}>
                                                        <span style={{opacity: 0.7}}>Median </span>
                                                        <span style={{color: hasAct ? COLOURS.frost : COLOURS.tarmac}}>
                                                            {hasAct ? formatDuration(actMins) : '—'}
                                                        </span>
                                                    </span>
                                                </div>
                                            </th>
                                            {slots.map(slot => {
                                                const cellKey = `${station.stationTitle}::${op.colKey}`;
                                                const cell = (slot.cells && slot.cells[cellKey])
                                                    || {state: 'na', required: false, opVerName: op.title, station: station.stationTitle};
                                                const liveAsnRecordId = cell.liveSession ? cell.liveSession.id : null;
                                                const isBursting = liveAsnRecordId
                                                    ? pulsingAsnIds.has(liveAsnRecordId)
                                                    : false;
                                                return (
                                                    <td
                                                        key={`cell-${slot.slotId}-${op.colKey}`}
                                                        style={{
                                                            padding: 0,
                                                            background: areaCol.row,
                                                            borderLeft: `1px solid rgba(155,155,155,0.08)`,
                                                            borderTop: oi === 0 ? `1px solid rgba(155,155,155,0.18)` : 'none',
                                                            width: SLOT_COL_W,
                                                            minWidth: SLOT_COL_W,
                                                            maxWidth: SLOT_COL_W,
                                                        }}
                                                    >
                                                        {/* Padding wrapper produces both the horizontal AND vertical gutters
                                                            between tiles — flush rows feel cramped on a wall display. */}
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: `${TILE_ROW_PAD}px 0`,
                                                        }}>
                                                            <OpTile
                                                                cell={cell}
                                                                size={CELL_SIZE}
                                                                width={TILE_WIDTH}
                                                                burst={isBursting}
                                                                rosterByTechId={rosterByTechId}
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// Watches the per-ASN latest-step-completion timestamps for changes between renders.
// When a new step lands on an ASN, that ASN's record-id enters `pulsingAsnIds` for ~1.1s
// so its OpTile mounts the `op-tile-burst` animation. Cold-start guard prevents the burst
// from firing for steps that completed before the dashboard loaded.
function useStepBursts(latestStepCompleteByAsn) {
    const prevByAsnRef = useRef(null);
    const timersRef = useRef({});
    const [pulsingAsnIds, setPulsingAsnIds] = useState(() => new Set());

    useEffect(() => {
        const map = latestStepCompleteByAsn || {};
        if (prevByAsnRef.current === null) {
            prevByAsnRef.current = {...map};
            return;
        }
        const newlyProgressed = [];
        for (const asnId of Object.keys(map)) {
            const prev = prevByAsnRef.current[asnId];
            const next = map[asnId];
            if (next && next !== prev) newlyProgressed.push(asnId);
        }
        prevByAsnRef.current = {...map};
        if (newlyProgressed.length === 0) return;

        setPulsingAsnIds(prev => {
            const nextSet = new Set(prev);
            for (const id of newlyProgressed) nextSet.add(id);
            return nextSet;
        });

        for (const id of newlyProgressed) {
            if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
            timersRef.current[id] = setTimeout(() => {
                setPulsingAsnIds(prev => {
                    if (!prev.has(id)) return prev;
                    const nextSet = new Set(prev);
                    nextSet.delete(id);
                    return nextSet;
                });
                delete timersRef.current[id];
            }, 1100);
        }
    }, [latestStepCompleteByAsn]);

    useEffect(() => () => {
        for (const t of Object.values(timersRef.current)) clearTimeout(t);
    }, []);

    return pulsingAsnIds;
}

export default function Matrix({lineColumns, lineMatrixRows, stationRates, latestStepCompleteByAsn, rosterByTechId}) {
    const lines = lineColumns || [];
    const rowsByLine = {};
    for (const r of (lineMatrixRows || [])) rowsByLine[r.lineId] = r.slots;
    const pulsingAsnIds = useStepBursts(latestStepCompleteByAsn || {});

    if (lines.length === 0) {
        return (
            <div style={{
                padding: 24,
                color: COLOURS.road,
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
                fontSize: 13,
            }}>
                No active slots for the selected line. Pick another line from the dropdown,
                or wait until a build slot enters In Progress.
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'auto',
            // No top padding — the sticky slot-header row sticks at the padding-box top,
            // so a top inset leaves a gap above the header where scrolling rows would
            // peek through. Side/bottom padding only.
            padding: '0 12px 12px 12px',
            backgroundColor: COLOURS.bg,
            color: COLOURS.snow,
        }}>
            {lines.map(line => (
                <LineSection
                    key={line.lineId}
                    line={line}
                    rows={rowsByLine[line.lineId] || []}
                    stationRates={stationRates || {}}
                    pulsingAsnIds={pulsingAsnIds}
                    rosterByTechId={rosterByTechId || {}}
                />
            ))}
        </div>
    );
}
