import React from 'react';
import {metrics, COLOURS} from '../styles';

function MetricCard({label, value, sub, colour}) {
    return (
        <div style={metrics.card}>
            <div style={metrics.label}>{label}</div>
            <div style={{...metrics.value, color: colour || COLOURS.text}}>{value}</div>
            {sub && <div style={metrics.sub}>{sub}</div>}
        </div>
    );
}

export default function MetricsPanel({data, selectedLine}) {
    const {metrics: m} = data;
    // Filter to the selected line. Each andon/defect carries a lineName resolved via its
    // station -> area -> line lookup in the hook. Items with null lineName (e.g. a defect on
    // an op-version we can't resolve to a known active station) are excluded from the count.
    const matchesLine = (item) => !selectedLine || item.lineName === selectedLine;
    const openDefects = (data.openDefects || []).filter(matchesLine);
    const andonAlerts = (data.andonAlerts || []).filter(matchesLine);
    // Andon alerts are flattened to one entry per (andon record, linked session). "Unique" =
    // distinct operation versions currently affected — two separate andon records raised
    // against the same op-version collapse to 1. "Total" = the flattened count, i.e. how
    // many in-progress sessions are impacted. Alerts whose session has no resolvable
    // op-version are keyed by record id so they count individually rather than silently
    // merging into a single "no-op" bucket.
    const uniqueAndons = new Set(
        andonAlerts.map(a => a.opVerId || `__noop__${a.id}`)
    ).size;
    const totalAndons = andonAlerts.length;
    return (
        <>
            <MetricCard label="WiP" value={m.wipCount} sub="units in progress" />
            <MetricCard label="On Floor" value={`${m.attendance.checkedIn}/${m.attendance.total}`} colour={COLOURS.green} />
            <MetricCard label="Completed" value={m.completedToday} sub="today" />
            <MetricCard label="Production Rate" value={`${m.avgProductionRate}%`} sub="per hour (1h avg)" colour={COLOURS.sol} />
            <MetricCard
                label="Line Balance"
                value={`${m.lineBalancePct}%`}
                colour={m.lineBalancePct >= 80 ? COLOURS.green : m.lineBalancePct >= 60 ? COLOURS.amber : COLOURS.red}
            />
            <MetricCard label="Bottleneck" value={m.bottleneckStation || '—'} sub="longest cycle" />
            <MetricCard
                label="Live Defects"
                value={openDefects.length}
                sub="in progress"
                colour={openDefects.length > 0 ? COLOURS.amber : COLOURS.text}
            />
            <MetricCard
                label="Andons"
                value={`${uniqueAndons}/${totalAndons}`}
                sub="unique / total"
                colour={uniqueAndons > 0 ? COLOURS.red : COLOURS.text}
            />
        </>
    );
}
