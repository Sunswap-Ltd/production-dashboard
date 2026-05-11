import React, {useState, useRef, useCallback, useEffect} from 'react';
import ReactDOM from 'react-dom';
import {COLOURS} from '../styles';
import {colourForArea, AREA_NEUTRAL} from '../engine/colours';

// One horizontal banner per area. Each banner has a left-side label (area title + count
// chips) and a scrollable horizontal row of thumbnails:
//   • Andons first (op-version photo, pulsing red border)
//   • Vertical divider (only shown if both andons AND defects are present)
//   • Defects next (defect attachment, amber border)
// Hovering a thumbnail opens a portaled popover with the bigger image + full details.

const THUMB_SIZE = 48;
const POPOVER_IMG = 240;

function minutesSinceISO(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
}

function formatElapsed(min) {
    if (min == null) return '';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : `${h}h${m}m`;
}

function ThumbPopover({item, anchor, onEnter, onLeave}) {
    if (!item || !anchor) return null;
    const width = 320;
    const margin = 8;
    let left = anchor.left + anchor.width / 2 - width / 2;
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
    let top = anchor.bottom + 6;
    // If it would clip the bottom, render above the anchor instead.
    const estimatedHeight = POPOVER_IMG + 130;
    if (top + estimatedHeight > window.innerHeight - margin) {
        top = Math.max(margin, anchor.top - estimatedHeight - 6);
    }

    const isAndon = item.kind === 'andon';
    const accent = isAndon ? COLOURS.red : COLOURS.amber;
    const title = isAndon
        ? `${item.station || 'Unknown station'} · Andon`
        : `${item.buildJobId || 'Unknown build'} · ${item.type || 'Defect'}`;
    const subtitle = isAndon
        ? (item.cause || 'Unknown cause')
        : (item.station || '');
    const body = isAndon
        ? (item.buildName ? `Build: ${item.buildName}` : '')
        : (item.observation || '');
    const tech = isAndon && item.techName ? `Operator: ${item.techName}` : '';
    const elapsed = formatElapsed(minutesSinceISO(item.start || item.createdAt));

    return ReactDOM.createPortal(
        <div
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            style={{
                position: 'fixed',
                top,
                left,
                width,
                background: COLOURS.panelBg,
                border: `1px solid ${accent}`,
                borderRadius: 8,
                padding: 12,
                zIndex: 9500,
                boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
                color: COLOURS.snow,
                pointerEvents: 'auto',
            }}
        >
            {item.thumbnail ? (
                <div style={{
                    width: '100%',
                    height: POPOVER_IMG,
                    background: COLOURS.motorway,
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <img
                        src={item.thumbnail}
                        alt=""
                        style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}}
                    />
                </div>
            ) : null}
            <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 4,
            }}>
                <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLOURS.snow,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                }}>
                    {title}
                </div>
                {elapsed && (
                    <span style={{
                        fontSize: 10,
                        color: COLOURS.road,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                    }}>
                        {elapsed} ago
                    </span>
                )}
            </div>
            <div style={{
                fontSize: 11,
                color: accent,
                fontWeight: 600,
                letterSpacing: 0.3,
                textTransform: isAndon ? 'none' : 'uppercase',
                marginBottom: 4,
            }}>
                {subtitle}
            </div>
            {body && (
                <div style={{
                    fontSize: 11,
                    color: COLOURS.frost,
                    lineHeight: 1.4,
                    marginBottom: tech ? 4 : 0,
                }}>
                    {body}
                </div>
            )}
            {tech && (
                <div style={{
                    fontSize: 10,
                    color: COLOURS.road,
                }}>
                    {tech}
                </div>
            )}
            {!isAndon && item.opVerName && (
                <div style={{
                    fontSize: 10,
                    color: COLOURS.road,
                    marginTop: 4,
                }}>
                    Op: {item.opVerName}
                </div>
            )}
        </div>,
        document.body,
    );
}

function Thumb({item, hoveredId, setHoveredId, cancelClose, scheduleClose}) {
    const ref = useRef(null);
    const isAndon = item.kind === 'andon';
    const borderColour = isAndon ? COLOURS.red : COLOURS.amber;
    const pulse = isAndon
        ? {animation: 'andon-pulse 1.5s ease-in-out infinite'}
        : {};

    const handleEnter = useCallback(() => {
        if (!ref.current) return;
        cancelClose();
        const rect = ref.current.getBoundingClientRect();
        setHoveredId({id: item.id, anchor: rect});
    }, [cancelClose, setHoveredId, item.id]);

    const isHovered = hoveredId && hoveredId.id === item.id;

    return (
        <>
            <div
                ref={ref}
                onMouseEnter={handleEnter}
                onMouseLeave={scheduleClose}
                title={isAndon
                    ? `${item.station || ''} · ${item.cause || 'Unknown'}`
                    : `${item.buildJobId || ''} · ${item.type || ''}`}
                style={{
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: 6,
                    background: COLOURS.motorway,
                    border: `2px solid ${borderColour}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    cursor: 'help',
                    position: 'relative',
                    ...pulse,
                }}
            >
                {item.thumbnail ? (
                    <img
                        src={item.thumbnail}
                        alt=""
                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: borderColour,
                        fontSize: 18,
                        fontWeight: 700,
                    }}>
                        {isAndon ? '⚠' : '●'}
                    </div>
                )}
            </div>
            {isHovered && (
                <ThumbPopover
                    item={item}
                    anchor={hoveredId.anchor}
                    onEnter={cancelClose}
                    onLeave={scheduleClose}
                />
            )}
        </>
    );
}

function AreaCard({areaTitle, areaIndex, andons, defects, hoveredId, setHoveredId, cancelClose, scheduleClose}) {
    const palette = areaTitle
        ? colourForArea({areaTitle, areaColorIndex: areaIndex})
        : AREA_NEUTRAL;
    const hasIssues = andons.length > 0 || defects.length > 0;
    const showDivider = andons.length > 0 && defects.length > 0;

    return (
        <div style={{
            background: COLOURS.panelBg,
            border: `1px solid ${COLOURS.tarmac}`,
            borderLeft: `3px solid ${palette.badgeBorder}`,
            borderRadius: 6,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
            minHeight: THUMB_SIZE + 18,
        }}>
            {/* Left column: area title + count chips */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 170,
                maxWidth: 200,
                flexShrink: 0,
            }}>
                <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: palette.text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {areaTitle || 'Unassigned'}
                </span>
                <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                    <span
                        title={`${andons.length} active andon${andons.length === 1 ? '' : 's'}`}
                        style={{
                            background: andons.length > 0 ? 'rgba(239,68,68,0.18)' : 'transparent',
                            border: `1px solid ${andons.length > 0 ? COLOURS.red : COLOURS.tarmac}`,
                            color: andons.length > 0 ? COLOURS.red : COLOURS.road,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 3,
                            letterSpacing: 0.4,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        ⚠ {andons.length}
                    </span>
                    <span
                        title={`${defects.length} open defect${defects.length === 1 ? '' : 's'}`}
                        style={{
                            background: defects.length > 0 ? 'rgba(234,179,8,0.15)' : 'transparent',
                            border: `1px solid ${defects.length > 0 ? COLOURS.amber : COLOURS.tarmac}`,
                            color: defects.length > 0 ? COLOURS.amber : COLOURS.road,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 3,
                            letterSpacing: 0.4,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        ● {defects.length}
                    </span>
                </div>
            </div>

            {/* Right: horizontal scroll row — andons, divider, defects */}
            <div style={{
                flex: 1,
                minWidth: 0,
                overflowX: 'auto',
                overflowY: 'visible',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
            }}>
                {andons.map(a => (
                    <Thumb
                        key={a.uniqueKey}
                        item={a}
                        hoveredId={hoveredId}
                        setHoveredId={setHoveredId}
                        cancelClose={cancelClose}
                        scheduleClose={scheduleClose}
                    />
                ))}
                {showDivider && (
                    <div style={{
                        width: 1,
                        height: THUMB_SIZE - 8,
                        background: COLOURS.tarmac,
                        margin: '0 8px',
                        flexShrink: 0,
                    }} />
                )}
                {defects.map(d => (
                    <Thumb
                        key={d.uniqueKey}
                        item={d}
                        hoveredId={hoveredId}
                        setHoveredId={setHoveredId}
                        cancelClose={cancelClose}
                        scheduleClose={scheduleClose}
                    />
                ))}
                {!hasIssues && (
                    <span style={{
                        fontSize: 10,
                        color: COLOURS.road,
                        fontStyle: 'italic',
                        paddingLeft: 4,
                    }}>
                        No active issues
                    </span>
                )}
            </div>
        </div>
    );
}

export default function AreaBanners({areaGroups, openDefects, andonAlerts}) {
    const groups = areaGroups || [];
    const defects = openDefects || [];
    const andons = andonAlerts || [];

    const [hoveredId, setHoveredId] = useState(null);
    const closeTimer = useRef(null);

    const cancelClose = useCallback(() => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimer.current = setTimeout(() => setHoveredId(null), 140);
    }, [cancelClose]);

    useEffect(() => () => cancelClose(), [cancelClose]);

    // Tag each item with kind + unique key so React diffing works and the popover can
    // discriminate styling/text. Bucket by areaId. The `aIdx` suffix on andon keys avoids
    // a duplicate-key warning when one andon record (.id) links to multiple sessions on
    // the same station — without it, React sees two siblings sharing a key.
    const andonsByArea = {};
    andons.forEach((a, aIdx) => {
        const key = a.areaId || '__unassigned';
        if (!andonsByArea[key]) andonsByArea[key] = [];
        andonsByArea[key].push({...a, kind: 'andon', uniqueKey: `andon-${a.id}-${aIdx}`});
    });
    const defectsByArea = {};
    for (const d of defects) {
        const key = d.areaId || '__unassigned';
        if (!defectsByArea[key]) defectsByArea[key] = [];
        defectsByArea[key].push({...d, kind: 'defect', uniqueKey: `defect-${d.id}`});
    }

    const unassignedAndons = andonsByArea.__unassigned || [];
    const unassignedDefects = defectsByArea.__unassigned || [];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '6px 12px 10px',
            fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
        }}>
            {groups.map((ag, idx) => (
                <AreaCard
                    key={`area-${ag.areaId || idx}`}
                    areaTitle={ag.areaTitle}
                    areaIndex={idx}
                    andons={andonsByArea[ag.areaId] || []}
                    defects={defectsByArea[ag.areaId] || []}
                    hoveredId={hoveredId}
                    setHoveredId={setHoveredId}
                    cancelClose={cancelClose}
                    scheduleClose={scheduleClose}
                />
            ))}
            {(unassignedAndons.length > 0 || unassignedDefects.length > 0) && (
                <AreaCard
                    key="area-unassigned"
                    areaTitle="Unassigned"
                    areaIndex={null}
                    andons={unassignedAndons}
                    defects={unassignedDefects}
                    hoveredId={hoveredId}
                    setHoveredId={setHoveredId}
                    cancelClose={cancelClose}
                    scheduleClose={scheduleClose}
                />
            )}
        </div>
    );
}
