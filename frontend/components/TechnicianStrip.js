import React, {useCallback, useEffect, useRef, useState} from 'react';
import ReactDOM from 'react-dom';
import {COLOURS, TECH_STATE_COLOURS, TECH_STATE_LABEL} from '../styles';

const CARD_W = 232;
const CARD_H = 104;
const HEADSHOT = 64;
const THUMB = 40;

// Session-state palette inside the hover popover. Matches the verbs the user asked for:
// Rest (paused-no-andon), Andon (paused-with-andon), In Progress, Scheduled.
const SESSION_STATE_COLOURS = {
    'andon':       COLOURS.red,
    'rest':        COLOURS.amber,
    'in-progress': COLOURS.green,
    'scheduled':   '#3B82F6',
};
const SESSION_STATE_LABEL = {
    'andon':       'ANDON',
    'rest':        'REST',
    'in-progress': 'IN PROGRESS',
    'scheduled':   'SCHEDULED',
};

function PhotoPlaceholder() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{display: 'block', background: COLOURS.frost}}
            aria-hidden="true"
        >
            <rect x="3" y="4.5" width="18" height="15" rx="1.8" ry="1.8"
                  fill="none" stroke={COLOURS.road} strokeWidth="1.6" />
            <circle cx="15.5" cy="9.5" r="1.6" fill={COLOURS.road} />
            <path d="M4.5 18 L10 11.5 L13.5 15 L15.5 13 L19.5 18 Z" fill={COLOURS.road} />
        </svg>
    );
}

function cleanJobId(jobId) {
    if (!jobId) return '';
    const m = /^(BLD-\d+)/.exec(jobId);
    return m ? m[1] : jobId;
}

// 3-letter abbreviation for a line name: "Endurance Line" → "END", "Satellite" → "SAT".
// Strip a trailing " Line" suffix first so the abbreviation comes from the discriminating
// word, not from the common "Line" tail.
function lineAbbrev(lineName) {
    if (!lineName) return '';
    const trimmed = lineName.replace(/\s*Line\s*$/i, '').trim() || lineName;
    return trimmed.slice(0, 3).toUpperCase();
}

function formatMinutes(mins) {
    if (!mins || mins <= 0) return '';
    const total = Math.round(mins);
    if (total < 100) return `${total}m`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0 ? `${h}h` : `${h}h${m}`;
}

// Session sub-card used inside SessionsPopover. Default size fits a 3-column grid
// (~120 px wide); pass `compact` for the 4-column grid in the master-popover layout —
// tighter padding, smaller fonts, darker background so they recede behind the
// status-tinted master popover surface.
function SessionMiniCard({session, compact}) {
    const state = session.state || 'scheduled';
    const colour = SESSION_STATE_COLOURS[state] || COLOURS.road;
    const label = SESSION_STATE_LABEL[state] || state.toUpperCase();
    const piePct = state === 'in-progress' ? Math.round((session.progress || 0) * 100) : 0;
    const showPie = piePct > 0 && piePct < 100;
    const minLabel = formatMinutes(session.completionMinutes);
    const asnDigits = (session.asnId || '').replace(/^ASN-/, '');
    const buildLabel = cleanJobId(session.buildName);
    const fs = {
        pill:    compact ? 8  : 9,
        op:      compact ? 9  : 10,
        meta:    compact ? 8  : 9,
        line:    compact ? 7  : 8,
        padding: compact ? 4  : 6,
        gap:     compact ? 3  : 4,
        bg:      compact ? COLOURS.bg : COLOURS.cardBg,
    };
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            backgroundColor: fs.bg,
            border: `1.5px solid ${colour}`,
            borderRadius: 6,
            padding: fs.padding,
            gap: fs.gap,
        }}>
            <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 4,
                overflow: 'hidden',
                background: COLOURS.snow,
            }}>
                {session.opVerPhoto ? (
                    <img
                        src={session.opVerPhoto}
                        alt=""
                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                ) : (
                    <PhotoPlaceholder />
                )}
                {showPie && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '52%', height: '52%', borderRadius: '50%',
                        background: `conic-gradient(${colour} ${piePct}%, rgba(0,0,0,0.55) ${piePct}%)`,
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 0 3px rgba(0,0,0,0.55)',
                    }}>
                        <div style={{
                            position: 'absolute', inset: '22%', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.85)', color: COLOURS.snow,
                            fontSize: 9, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                            fontVariantNumeric: 'tabular-nums',
                        }}>{piePct}</div>
                    </div>
                )}
                {asnDigits && (
                    <div style={{
                        position: 'absolute', top: 2, left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.78)', color: COLOURS.snow,
                        fontSize: 8, fontWeight: 700,
                        padding: '1px 4px', borderRadius: 2,
                        whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                    }}>{asnDigits}</div>
                )}
                {minLabel && (
                    <div style={{
                        position: 'absolute', bottom: 2, right: 2,
                        background: 'rgba(0,0,0,0.78)', color: COLOURS.snow,
                        fontSize: 8, fontWeight: 700,
                        padding: '1px 3px', borderRadius: 2,
                        fontVariantNumeric: 'tabular-nums',
                    }}>{minLabel}</div>
                )}
            </div>
            <div style={{
                fontSize: fs.pill, fontWeight: 700, letterSpacing: 0.4,
                color: COLOURS.snow, background: colour,
                padding: '2px 5px', borderRadius: 4,
                textAlign: 'center', textTransform: 'uppercase',
            }}>
                {label}
            </div>
            <div title={session.opVerName} style={{
                fontSize: fs.op, color: COLOURS.snow, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.2,
            }}>
                {session.opVerName || '—'}
            </div>
            <div style={{
                fontSize: fs.meta, color: COLOURS.frost,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.2,
            }}>
                {session.station}{buildLabel ? ` · ${buildLabel}` : ''}
            </div>
            {session.lineName && (
                <div title={`Assembly line: ${session.lineName}`} style={{
                    fontSize: fs.line,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: COLOURS.frost,
                    background: 'rgba(255, 71, 0, 0.18)',
                    border: '1px solid rgba(255, 71, 0, 0.55)',
                    padding: '1px 4px',
                    borderRadius: 3,
                    textTransform: 'uppercase',
                    alignSelf: 'flex-start',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>{lineAbbrev(session.lineName)}</div>
            )}
        </div>
    );
}

// Popover anchored to a TechCard (or an OpTile headshot). The popover IS the tech's
// master card: status-coloured border + tint band, a header section with headshot/name/
// role/line/status, and a denser grid of ASN sub-cards (4 columns, darker background)
// underneath. The hierarchy reads "this is a person" → "and these are their open ASNs".
export function TechSessionsPopover({entry, anchor, onEnter, onLeave}) {
    if (!entry || !anchor) return null;
    const sessions = entry.assignedSessions || [];
    const {name, picture, pictureLarge, title, status, currentSession} = entry;
    const colour = TECH_STATE_COLOURS[status] || COLOURS.road;
    const label = TECH_STATE_LABEL[status] || (status || '').toUpperCase();
    const portrait = pictureLarge || picture;
    const lineForEntry = currentSession ? currentSession.lineName : '';
    const isAndon = status === 'andon';
    const isIdle = status === 'idle';

    const width = 440;
    const top = anchor.bottom + 8;
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
                backgroundColor: COLOURS.cardBg,
                // Heavy 4 px grey frame for IDLE (no session OR paused-outside-break);
                // thinner status-coloured frame otherwise.
                border: isIdle ? `4px solid ${COLOURS.road}` : `2px solid ${colour}`,
                borderRadius: 8,
                zIndex: 10000,
                boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
                overflow: 'hidden',
                ...(isAndon ? {animation: 'andon-pulse 1.5s ease-in-out infinite'} : {}),
            }}
        >
            {/* Thin status-coloured band along the top inside the rounded border, so
                the tech's state reads even with the popover not in central focus. */}
            <div style={{height: isIdle ? 6 : 4, background: colour, width: '100%'}} />

            {/* Header: large headshot left, identity column right. */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
            }}>
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: COLOURS.motorway,
                    border: `2px solid ${colour}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLOURS.snow,
                    fontSize: 26,
                    fontWeight: 700,
                }}>
                    {portrait ? (
                        <img src={portrait} alt=""
                            style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    ) : (
                        <span>{name ? name[0].toUpperCase() : '?'}</span>
                    )}
                </div>
                <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3}}>
                    <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: COLOURS.snow,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {name || '—'}
                    </div>
                    {title && (
                        <div style={{
                            fontSize: 11,
                            color: COLOURS.frost,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>{title}</div>
                    )}
                    <div style={{display: 'flex', gap: 6, marginTop: 2, alignItems: 'center', flexWrap: 'wrap'}}>
                        <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            color: COLOURS.snow,
                            background: colour,
                            padding: '2px 8px',
                            borderRadius: 10,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        }}>{label}</span>
                        {lineForEntry && (
                            <span title={`Assembly line: ${lineForEntry}`} style={{
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: 0.5,
                                color: COLOURS.frost,
                                background: 'rgba(255, 71, 0, 0.18)',
                                border: '1px solid rgba(255, 71, 0, 0.55)',
                                padding: '1px 6px',
                                borderRadius: 4,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            }}>{lineAbbrev(lineForEntry)}</span>
                        )}
                        <span style={{fontSize: 10, color: COLOURS.road, marginLeft: 4}}>
                            {sessions.length} ASN{sessions.length === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sub-card grid: ASNs as smaller children inside the master card. Darker
                background so they recede behind the popover's surface. */}
            <div style={{
                background: COLOURS.panelBg,
                padding: 10,
                borderTop: `1px solid ${COLOURS.tarmac}`,
            }}>
                {sessions.length === 0 ? (
                    <div style={{fontSize: 10, color: COLOURS.road, textAlign: 'center', padding: '8px 0'}}>
                        No scheduled, in-progress, or paused ASNs.
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 6,
                    }}>
                        {sessions.map(s => <SessionMiniCard key={s.asnId} session={s} compact />)}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

export function TechCard({entry, onMouseEnter, onMouseLeave, cardRef}) {
    if (!entry) return null;
    const {name, picture, pictureLarge, title, status, currentSession} = entry;
    const colour = TECH_STATE_COLOURS[status] || COLOURS.road;
    const label = TECH_STATE_LABEL[status] || (status || '').toUpperCase();
    const isIdle = status === 'idle';
    const isAndon = status === 'andon';
    const isBetween = status === 'between-tasks';

    const portrait = pictureLarge || picture;
    const opPhoto = currentSession && currentSession.opVerPhoto;
    const buildLabel = currentSession ? cleanJobId(currentSession.buildName) : '';
    const stationLabel = currentSession ? currentSession.station : '';
    const lineLabel = currentSession ? (currentSession.lineName || '') : '';
    const opName = currentSession ? currentSession.opVerName : '';

    return (
        <div
            ref={cardRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            title={`${name}${title ? ' · ' + title : ''}\n${label}${opName ? ' · ' + opName : ''}`}
            style={{
                width: CARD_W,
                minHeight: CARD_H,
                flexShrink: 0,
                backgroundColor: COLOURS.cardBg,
                borderRadius: 8,
                // IDLE cards (no session, OR paused outside a scheduled break) get a
                // heavy 4 px grey frame so the floor lead spots a tech who isn't
                // producing — covers the "stuck idle" problem case the old taxonomy
                // separated into its own status.
                border: isIdle ? `4px solid ${COLOURS.road}` : `2px solid ${colour}`,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
                opacity: 1,
                cursor: 'default',
                ...(isAndon
                    ? {animation: 'andon-pulse 1.5s ease-in-out infinite'}
                    : {}),
            }}
        >
            <div style={{
                width: HEADSHOT,
                height: HEADSHOT,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                background: COLOURS.motorway,
                border: `2.5px solid ${colour}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLOURS.snow,
                fontSize: 24,
                fontWeight: 700,
            }}>
                {portrait ? (
                    <img
                        src={portrait}
                        alt=""
                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                ) : (
                    <span>{name ? name[0].toUpperCase() : '?'}</span>
                )}
            </div>

            <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4}}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0}}>
                    <div style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 700,
                        color: COLOURS.snow,
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                    }}>
                        {name || '—'}
                    </div>
                    {lineLabel && (
                        <span title={`Assembly line: ${lineLabel}`} style={{
                            flexShrink: 0,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            color: COLOURS.frost,
                            background: 'rgba(255, 71, 0, 0.18)',
                            border: '1px solid rgba(255, 71, 0, 0.55)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        }}>{lineAbbrev(lineLabel)}</span>
                    )}
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, height: THUMB}}>
                    {currentSession ? (
                        <>
                            <div style={{
                                width: THUMB,
                                height: THUMB,
                                borderRadius: 4,
                                overflow: 'hidden',
                                flexShrink: 0,
                                background: COLOURS.snow,
                                opacity: isBetween ? 0.7 : 1,
                            }}>
                                {opPhoto ? (
                                    <img
                                        src={opPhoto}
                                        alt=""
                                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                    />
                                ) : (
                                    <PhotoPlaceholder />
                                )}
                            </div>
                            <div style={{minWidth: 0, lineHeight: 1.2}}>
                                <div style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: COLOURS.snow,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {buildLabel || '—'}
                                </div>
                                <div style={{
                                    fontSize: 10,
                                    color: COLOURS.road,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {stationLabel || ''}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{fontSize: 11, color: COLOURS.road, fontStyle: 'italic'}}>
                            {isIdle ? 'no current ASN' : ''}
                        </div>
                    )}
                </div>

                <div style={{
                    alignSelf: 'flex-start',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    color: COLOURS.snow,
                    background: colour,
                    padding: '2px 8px',
                    borderRadius: 10,
                    textTransform: 'uppercase',
                }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

// Banner card that opens TechSessionsPopover on hover. Kept separate from raw TechCard
// so the popover itself can render a bare TechCard (no nested hover) at its header.
function HoverableTechCard({entry}) {
    const ref = useRef(null);
    const [hover, setHover] = useState(null);
    const closeTimer = useRef(null);

    const cancelClose = useCallback(() => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);
    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimer.current = setTimeout(() => setHover(null), 120);
    }, [cancelClose]);
    const handleEnter = useCallback(() => {
        if (!ref.current) return;
        cancelClose();
        setHover({anchor: ref.current.getBoundingClientRect()});
    }, [cancelClose]);

    useEffect(() => () => cancelClose(), [cancelClose]);

    return (
        <>
            <TechCard
                entry={entry}
                cardRef={ref}
                onMouseEnter={handleEnter}
                onMouseLeave={scheduleClose}
            />
            {hover && (
                <TechSessionsPopover
                    entry={entry}
                    anchor={hover.anchor}
                    onEnter={cancelClose}
                    onLeave={scheduleClose}
                />
            )}
        </>
    );
}

export default function TechnicianStrip({roster}) {
    const list = roster || [];
    if (list.length === 0) {
        return (
            <div style={{
                fontSize: 12,
                color: COLOURS.road,
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
                padding: '4px 6px',
            }}>
                No direct-assembly technicians checked in.
            </div>
        );
    }
    return (
        <>
            {list.map(entry => (
                <HoverableTechCard key={entry.id} entry={entry} />
            ))}
        </>
    );
}
