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

export default function MetricsPanel({data}) {
    const {metrics: m} = data;
    const openDefects = data.openDefects || [];
    const andonAlerts = data.andonAlerts || [];
    // Andon alerts are flattened to one entry per (andon record, linked session). Unique =
    // distinct andon records currently active; total = the flattened count, i.e. how many
    // sessions are affected. Showing both makes "one big andon spanning 3 stations" legible.
    const uniqueAndons = new Set(andonAlerts.map(a => a.id)).size;
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
