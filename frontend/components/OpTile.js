import React, {useState, useRef, useCallback, useEffect} from 'react';
import ReactDOM from 'react-dom';
import {COLOURS, STATE_COLOURS} from '../styles';

// Per-state photo tint at 30 % opacity. Mirrors STATE_COLOURS but pre-baked as rgba so we
// can layer a translucent wash over the op-version photo without recomputing on each render.
const STATE_TINTS = {
    completed: 'rgba(21, 128, 61, 0.45)',   // #15803D
    live:      'rgba(74, 222, 128, 0.30)',  // #4ADE80
    paused:    'rgba(245, 158, 11, 0.30)',  // #F59E0B
    andon:     'rgba(239, 68, 68, 0.30)',   // #ef4444
    scheduled: 'rgba(59, 130, 246, 0.30)',  // #3B82F6
    // pending intentionally omitted — frame absent + no tint = "not yet started".
};

const STATE_LABEL = {
    completed: '✓ done',
    partial: '◐ partial',
    live: '▶ in progress',
    paused: '❚❚ paused',
    andon: '⚠ andon',
    pending: '○ pending',
    na: '·  not required',
};

function Popover({cell, anchor, onEnter, onLeave}) {
    if (!cell || !anchor) return null;

    const width = 240;
    const top = anchor.bottom + 6;
    let left = anchor.left + anchor.width / 2 - width / 2;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;

    return ReactDOM.createPortal(
        <div
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            style={{
                position: 'fixed',
                top,
                left,
                width,
                backgroundColor: COLOURS.tarmac,
                border: `1px solid ${COLOURS.road}`,
                borderRadius: 6,
                padding: 8,
                zIndex: 9999,
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
            }}
        >
            <div style={{
                fontSize: 11, fontWeight: 700, color: COLOURS.snow,
                marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {cell.opVerName || '—'}
            </div>
            <div style={{fontSize: 10, color: COLOURS.frost, marginBottom: 4}}>
                {cell.station || ''}
                {cell.versionLabels && cell.versionLabels.length > 0 && (
                    <span style={{color: COLOURS.road, marginLeft: 6}}>
                        · version {cell.versionLabels.join(', ')}
                    </span>
                )}
            </div>
            <div style={{
                fontSize: 10,
                color: STATE_COLOURS[cell.state] || COLOURS.road,
                fontWeight: 600,
                marginBottom: 4,
            }}>
                {STATE_LABEL[cell.state] || cell.state}
                {cell.required && cell.needed > 0 && (
                    <span style={{color: COLOURS.road, fontWeight: 400, marginLeft: 6}}>
                        {cell.completed || 0}/{cell.needed} done
                        {cell.live > 0 ? ` · ${cell.live} live` : ''}
                    </span>
                )}
            </div>
            {cell.liveOperators && cell.liveOperators.length > 0 && (
                <div style={{fontSize: 10, color: COLOURS.snow, marginTop: 4}}>
                    Operator{cell.liveOperators.length > 1 ? 's' : ''}:{' '}
                    <span style={{color: COLOURS.frost}}>
                        {cell.liveOperators.map(o => o.name).join(', ')}
                    </span>
                </div>
            )}
        </div>,
        document.body,
    );
}

export default function OpTile({cell, size = 22}) {
    const ref = useRef(null);
    const [hovered, setHovered] = useState(null);
    const closeTimer = useRef(null);

    const cancelClose = useCallback(() => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimer.current = setTimeout(() => setHovered(null), 120);
    }, [cancelClose]);

    const handleEnter = useCallback(() => {
        if (!ref.current) return;
        cancelClose();
        const rect = ref.current.getBoundingClientRect();
        setHovered({anchor: rect});
    }, [cancelClose]);

    useEffect(() => () => cancelClose(), [cancelClose]);

    const state = cell.state || 'pending';

    if (state === 'na') {
        return (
            <div
                ref={ref}
                onMouseEnter={handleEnter}
                onMouseLeave={scheduleClose}
                style={{
                    width: size,
                    height: size,
                    borderRadius: 3,
                    border: `1px dashed ${COLOURS.tarmac}`,
                    background: 'transparent',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                }}
            />
        );
    }

    // Pending cells get a thin 2 px grey wire frame (no tint) — present but understated, so
    // the photo reads clearly and pending cells sit visually below the 3 px coloured frames.
    const isPending = state === 'pending';
    const borderColour = isPending ? COLOURS.road : (STATE_COLOURS[state] || COLOURS.tarmac);
    const borderWidth = isPending ? 2 : 3;
    const isAllDone = state === 'completed';
    const piePct = Math.round((cell.completionFraction || 0) * 100);
    // Pie shows progress for any cell with partial completion (regardless of state), except
    // andon — andon already pulses red, so an in-cell pie would just compete for attention.
    const showPie = piePct > 0 && piePct < 100 && state !== 'andon';

    // Format completion minutes for the bottom-right badge: "12m" up to 99m, "1h32" beyond.
    const formatMinutes = (mins) => {
        if (!mins || mins <= 0) return '';
        const total = Math.round(mins);
        if (total < 100) return `${total}m`;
        const h = Math.floor(total / 60);
        const m = total % 60;
        return m === 0 ? `${h}h` : `${h}h${m}`;
    };
    // Show minute badge on any cell with a known completion time (median across done repeats),
    // not just fully-done cells — partial completions still benefit from showing avg minutes.
    const minuteLabel = (state === 'completed' || cell.completionMinutes > 0)
        ? formatMinutes(cell.completionMinutes) : '';
    // Pie colour mirrors the frame: pies inherit the cell's status palette so the cell reads
    // as one coherent piece (light-green pie on a light-green frame for live, etc.).
    const pieColour = STATE_COLOURS[state] || COLOURS.green;
    const firstOperator = cell.liveOperators && cell.liveOperators.length > 0 ? cell.liveOperators[0] : null;
    const extraOperators = cell.liveOperators ? Math.max(0, cell.liveOperators.length - 1) : 0;
    const headshotSize = Math.max(13, Math.round(size * 0.42));
    const hasWarning = cell.warning && cell.warning.length > 0;
    const warningBadgeSize = Math.max(13, Math.round(size * 0.42));

    return (
        <>
            <div
                ref={ref}
                onMouseEnter={handleEnter}
                onMouseLeave={scheduleClose}
                style={{
                    position: 'relative',
                    width: size,
                    height: size,
                    borderRadius: 3,
                    border: `${borderWidth}px solid ${borderColour}`,
                    // White base layer under every ASN cell so transparent / letterboxed
                    // photos read cleanly. Photo → state tint → frame stack on top.
                    backgroundColor: COLOURS.snow,
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    cursor: 'help',
                    ...(state === 'andon'
                        ? cell.andonUnknown
                            ? {animation: 'andon-pulse-large 0.9s ease-in-out infinite'}
                            : {animation: 'andon-pulse 1.5s ease-in-out infinite'}
                        : {}),
                }}
            >
                {cell.opVerPhoto && (
                    <img
                        src={cell.opVerPhoto}
                        alt=""
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: isAllDone ? 'brightness(0.7)' : 'none',
                        }}
                    />
                )}
                {STATE_TINTS[state] && (
                    // Subtle state-coloured wash (30 %) over the photo — a faint hint that
                    // reinforces the frame colour without overpowering the underlying image.
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: STATE_TINTS[state],
                        pointerEvents: 'none',
                    }} />
                )}
                {showPie && (
                    <div
                        title={`${piePct}% complete`}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: Math.round(size * 0.62),
                            height: Math.round(size * 0.62),
                            borderRadius: '50%',
                            background: `conic-gradient(${pieColour} ${piePct}%, rgba(0,0,0,0.55) ${piePct}%)`,
                            boxShadow: '0 0 3px rgba(0,0,0,0.55)',
                            border: `1px solid rgba(255,255,255,0.18)`,
                            pointerEvents: 'none',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            inset: '22%',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.85)',
                            color: COLOURS.snow,
                            fontSize: Math.max(7, Math.round(size * 0.22)),
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {piePct}
                        </div>
                    </div>
                )}
                {hasWarning && (
                    <div
                        title={cell.warning.join('\n')}
                        style={{
                            position: 'absolute',
                            top: 1,
                            left: 1,
                            width: warningBadgeSize,
                            height: warningBadgeSize,
                            borderRadius: '50%',
                            background: COLOURS.amber,
                            color: COLOURS.motorway,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: Math.max(9, Math.round(warningBadgeSize * 0.7)),
                            fontWeight: 900,
                            lineHeight: 1,
                            border: `1.5px solid ${COLOURS.motorway}`,
                            boxShadow: '0 0 5px rgba(234,179,8,0.8)',
                            pointerEvents: 'none',
                            zIndex: 4,
                        }}
                    >
                        ⚠
                    </div>
                )}
                {firstOperator && (
                    <div
                        title={cell.liveOperators.map(o => o.name).join(', ')}
                        style={{
                            position: 'absolute',
                            top: 1,
                            right: 1,
                            width: headshotSize,
                            height: headshotSize,
                            borderRadius: '50%',
                            background: COLOURS.motorway,
                            border: `1.5px solid ${pieColour}`,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: Math.max(6, Math.round(headshotSize * 0.45)),
                            fontWeight: 700,
                            color: COLOURS.snow,
                            boxShadow: '0 0 3px rgba(0,0,0,0.7)',
                            pointerEvents: 'none',
                        }}
                    >
                        {firstOperator.picture ? (
                            <img
                                src={firstOperator.picture}
                                alt=""
                                style={{width: '100%', height: '100%', objectFit: 'cover'}}
                            />
                        ) : (
                            <span>{firstOperator.name ? firstOperator.name[0].toUpperCase() : '?'}</span>
                        )}
                        {extraOperators > 0 && (
                            <div style={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                background: COLOURS.motorway,
                                border: `1px solid ${pieColour}`,
                                borderRadius: '50%',
                                width: Math.max(10, Math.round(headshotSize * 0.55)),
                                height: Math.max(10, Math.round(headshotSize * 0.55)),
                                fontSize: Math.max(6, Math.round(headshotSize * 0.4)),
                                color: COLOURS.snow,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1,
                            }}>
                                +{extraOperators}
                            </div>
                        )}
                    </div>
                )}
                {minuteLabel && (
                    <div
                        title={`${Math.round(cell.completionMinutes)} minutes${cell.needed > 1 ? ` (avg per repeat, ${cell.needed} repeats)` : ''}`}
                        style={{
                            position: 'absolute', bottom: 1, right: 1,
                            background: 'rgba(0,0,0,0.78)', color: COLOURS.snow,
                            fontSize: 8, fontWeight: 700, lineHeight: 1,
                            padding: '1px 3px', borderRadius: 2,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {minuteLabel}
                    </div>
                )}
                {!isAllDone && cell.required && cell.needed > 1 && (
                    <div style={{
                        position: 'absolute', bottom: 1, right: 1,
                        background: 'rgba(0,0,0,0.75)', color: COLOURS.snow,
                        fontSize: 7, fontWeight: 700, lineHeight: 1,
                        padding: '1px 2px', borderRadius: 2,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {cell.completed || 0}/{cell.needed}
                    </div>
                )}
                {cell.required && cell.versionLabels && cell.versionLabels.length > 0 && (
                    <div
                        title={`Version${cell.versionLabels.length > 1 ? 's' : ''}: ${cell.versionLabels.join(', ')}`}
                        style={{
                            position: 'absolute', bottom: 1, left: 1,
                            background: 'rgba(0,0,0,0.75)', color: COLOURS.frost,
                            fontSize: 7, fontWeight: 700, lineHeight: 1,
                            padding: '1px 3px', borderRadius: 2,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {cell.versionLabels.length === 1
                            ? cell.versionLabels[0]
                            : `${cell.versionLabels[0]}+`}
                    </div>
                )}
            </div>
            {hovered && (
                <Popover
                    cell={cell}
                    anchor={hovered.anchor}
                    onEnter={cancelClose}
                    onLeave={scheduleClose}
                />
            )}
        </>
    );
}
