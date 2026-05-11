import React from 'react';
import {COLOURS} from '../styles';
import {formatDuration} from '../engine/helpers';
import {hashString, colourForArea, AREA_PALETTE, AREA_NEUTRAL} from '../engine/colours';
import OpTile from './OpTile';

const CELL_SIZE = 38;
const GAP = 4;
// Transposed layout: ops are rows, slots are columns.
// Operation row label column (sticky left) — wide enough to fit the full op title horizontally.
const OP_LABEL_W = 280;
// Slot column width (sticky top) — fits slot info: number, nickname, progress bar, MR badge.
const SLOT_COL_W = 78;

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
        </div>
    );
}

function LineSection({line, rows}) {
    const stationGroups = line.stations || [];
    const slots = rows || [];
    if (stationGroups.length === 0 || slots.length === 0) return null;

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
                        return (
                            <React.Fragment key={`stn-${station.stationTitle}`}>
                                {/* Station banner — title + inline area badge */}
                                <tr>
                                    <th
                                        colSpan={colCount}
                                        title={station.areaTitle || ''}
                                        style={{
                                            position: 'sticky',
                                            left: 0,
                                            background: areaCol.row,
                                            padding: '8px 10px 5px',
                                            textAlign: 'left',
                                            whiteSpace: 'nowrap',
                                            borderTop: si > 0 ? `1px solid ${COLOURS.tarmac}` : 'none',
                                            zIndex: 2,
                                        }}
                                    >
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: COLOURS.snow,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.6,
                                            verticalAlign: 'middle',
                                        }}>
                                            {station.stationTitle}
                                        </span>
                                        {station.areaTitle && (
                                            <span style={{
                                                marginLeft: 10,
                                                background: areaCol.badgeBg,
                                                border: `1px solid ${areaCol.badgeBorder}`,
                                                color: areaCol.text,
                                                fontSize: 9,
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: 3,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                verticalAlign: 'middle',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {station.areaTitle}
                                            </span>
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
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: GAP / 2,
                                                        }}>
                                                            <OpTile cell={cell} size={CELL_SIZE} />
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

export default function Matrix({lineColumns, lineMatrixRows}) {
    const lines = lineColumns || [];
    const rowsByLine = {};
    for (const r of (lineMatrixRows || [])) rowsByLine[r.lineId] = r.slots;

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
            padding: 12,
            color: COLOURS.snow,
        }}>
            {lines.map(line => (
                <LineSection
                    key={line.lineId}
                    line={line}
                    rows={rowsByLine[line.lineId] || []}
                />
            ))}
        </div>
    );
}
