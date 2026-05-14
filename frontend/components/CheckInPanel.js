import React, {useEffect, useMemo, useState} from 'react';
import {checkIn, COLOURS, STATE_COLOURS} from '../styles';
import {ASN_STATUS} from '../engine/constants';

function useNow(intervalMs) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pillStyle(state) {
    const colour = state === 'idle' ? COLOURS.road : STATE_COLOURS[state] || COLOURS.road;
    return {
        ...checkIn.pill,
        color: COLOURS.snow,
        backgroundColor: colour,
    };
}

function photoStyle(state) {
    const colour = state === 'idle' ? COLOURS.road : STATE_COLOURS[state] || COLOURS.road;
    return {...checkIn.photo, borderColor: colour};
}

function placeholderStyle(state) {
    const colour = state === 'idle' ? COLOURS.road : STATE_COLOURS[state] || COLOURS.road;
    return {...checkIn.photoPlaceholder, borderColor: colour};
}

function pickDominantSession(sessions) {
    // Priority: andon > in_progress (live) > paused. Tie-break by most recent start.
    const rank = (s) => {
        if (s.hasAndon) return 3;
        if (s.status === ASN_STATUS.IN_PROGRESS) return 2;
        if (s.status === ASN_STATUS.PAUSED) return 1;
        return 0;
    };
    const sorted = [...sessions].sort((a, b) => {
        const r = rank(b) - rank(a);
        if (r !== 0) return r;
        return (b.start || '').localeCompare(a.start || '');
    });
    return sorted[0] || null;
}

function deriveState(session) {
    if (!session) return 'idle';
    if (session.hasAndon) return 'andon';
    if (session.status === ASN_STATUS.IN_PROGRESS) return 'live';
    if (session.status === ASN_STATUS.PAUSED) return 'paused';
    return 'idle';
}

function Card({tech, dominant, state, notPausedForBreak}) {
    const isAndonLike = state === 'andon' || notPausedForBreak;
    const cardStyle = {
        ...checkIn.card,
        ...(isAndonLike ? checkIn.cardAndon : {}),
    };
    const photo = tech.picture;
    const label = state === 'live' ? 'LIVE'
        : state === 'paused' ? 'PAUSED'
        : state === 'andon' ? 'ANDON'
        : 'IDLE';
    return (
        <div style={cardStyle}>
            {photo
                ? <img src={photo} alt={tech.name} style={photoStyle(state)} />
                : <div style={placeholderStyle(state)}>{initials(tech.name)}</div>}
            <div style={checkIn.body}>
                <div style={pillStyle(state)}>{label}</div>
                <div style={checkIn.name} title={tech.name}>{tech.name || 'Unknown'}</div>
                {dominant ? (
                    <>
                        <div style={checkIn.sub} title={dominant.buildName}>{dominant.buildName || '—'}</div>
                        <div style={checkIn.subDim} title={dominant.opVerName}>{dominant.opVerName || ''}</div>
                    </>
                ) : (
                    <div style={checkIn.subDim}>no active session</div>
                )}
            </div>
            {notPausedForBreak && (
                <div style={checkIn.breakWarn}>Not paused for break</div>
            )}
        </div>
    );
}

export default function CheckInPanel({
    team,
    activeSessions,
    latestStepCompleteByTechId,
    isOnBreakNow,
    breakIdleThresholdMin,
    selectedLine,
}) {
    // Re-render every 15s so the "minutes since last step" calc stays current
    // without re-running the heavy parse inside useProductionData.
    const nowMs = useNow(15000);

    const cards = useMemo(() => {
        if (!team || team.length === 0) return [];
        const sessionsByTech = {};
        for (const s of (activeSessions || [])) {
            if (selectedLine && s.lineName !== selectedLine) continue;
            if (!s.techId) continue;
            (sessionsByTech[s.techId] = sessionsByTech[s.techId] || []).push(s);
        }
        const thresholdMs = (breakIdleThresholdMin || 5) * 60 * 1000;
        const rows = team
            .map(tech => {
                const techSessions = sessionsByTech[tech.id] || [];
                const dominant = pickDominantSession(techSessions);
                const state = deriveState(dominant);
                const lastStepMs = latestStepCompleteByTechId
                    ? latestStepCompleteByTechId[tech.id]
                    : null;
                const notPausedForBreak = !!(
                    isOnBreakNow
                    && dominant
                    && dominant.status === ASN_STATUS.IN_PROGRESS
                    && !dominant.hasAndon
                    && (!lastStepMs || (nowMs - lastStepMs) > thresholdMs)
                );
                return {tech, dominant, state, notPausedForBreak};
            })
            // Only surface techs actively on the selected line. Idle (checked in but no
            // active session here) adds noise without value — hidden per user request.
            .filter(r => r.state !== 'idle');
        // Sort: andon-pulsing first (real andon or break warning), then live, paused, idle.
        // Within a state, alphabetical by name.
        const stateRank = {andon: 4, live: 3, paused: 2, idle: 1};
        rows.sort((a, b) => {
            const aPulse = a.state === 'andon' || a.notPausedForBreak ? 1 : 0;
            const bPulse = b.state === 'andon' || b.notPausedForBreak ? 1 : 0;
            if (aPulse !== bPulse) return bPulse - aPulse;
            const r = (stateRank[b.state] || 0) - (stateRank[a.state] || 0);
            if (r !== 0) return r;
            return (a.tech.name || '').localeCompare(b.tech.name || '');
        });
        return rows;
    }, [team, activeSessions, latestStepCompleteByTechId, isOnBreakNow, breakIdleThresholdMin, selectedLine, nowMs]);

    if (cards.length === 0) {
        return <div style={checkIn.emptyMsg}>No active sessions on this line.</div>;
    }
    return (
        <>
            {cards.map(c => (
                <Card
                    key={c.tech.id}
                    tech={c.tech}
                    dominant={c.dominant}
                    state={c.state}
                    notPausedForBreak={c.notPausedForBreak}
                />
            ))}
        </>
    );
}
