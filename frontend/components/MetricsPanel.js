import React from 'react';
import {metrics, COLOURS, RAG} from '../styles';

function MetricCard({label, value, sub, colour}) {
    return (
        <div style={metrics.card}>
            <div style={metrics.label}>{label}</div>
            <div style={{...metrics.value, color: colour || COLOURS.text}}>{value}</div>
            {sub && <div style={metrics.sub}>{sub}</div>}
        </div>
    );
}

function fmtPct(n, digits = 1) {
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(digits)}%`;
}

// Wide card with a target-vs-actual line chart and a RAG-tinted background.
function ProductionRateCard({pr}) {
    if (!pr || !pr.series) {
        return (
            <div style={{...metrics.card, minWidth: 280}}>
                <div style={metrics.label}>Production Rate</div>
                <div style={{...metrics.value, color: COLOURS.road}}>—</div>
                <div style={metrics.sub}>no line selected</div>
            </div>
        );
    }
    const rag = RAG[pr.status] || RAG.amber;
    const series = pr.series;
    const total = series.productiveMinutesTotal || 1;
    const yMax = Math.max(pr.targetPct || 0, pr.actualPct || 0, 1) * 1.1;
    // Card sized for the 128 px KPI strip with room above for label and below for the legend.
    const w = 420, h = 80;
    const pad = {l: 4, r: 4, t: 4, b: 4};
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const x = (min) => pad.l + (min / total) * innerW;
    const y = (pct) => pad.t + innerH - (pct / yMax) * innerH;

    const actualPath = (series.actualPoints || []).map((p, i) =>
        `${i === 0 ? 'M' : 'L'}${x(p.productiveMin).toFixed(1)},${y(p.cumPct).toFixed(1)}`
    ).join(' ');
    const targetPath = `M${x(0)},${y(0)} L${x(total)},${y(pr.targetPct)}`;
    const nowX = x(Math.min(series.productiveMinutesNow || 0, total));

    const deltaSign = pr.deltaPct >= 0 ? '+' : '−';
    const isFallback = pr.targetSource !== 'today';

    return (
        <div style={{
            ...metrics.card,
            minWidth: 460,
            flex: '0 0 460px',
            padding: '8px 16px',
        }}>
            <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
                <div style={metrics.label}>Production Rate</div>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
                    <span style={{
                        fontSize: 16, fontWeight: 700, color: COLOURS.snow,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {fmtPct(pr.actualPct, 1)} / {fmtPct(pr.targetPct, 1)}
                    </span>
                    <span style={{
                        fontSize: 12, fontWeight: 700, color: COLOURS.snow,
                        padding: '2px 8px', borderRadius: 10, backgroundColor: rag.chip,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {deltaSign}{Math.abs(pr.deltaPct).toFixed(1)}%
                    </span>
                </div>
            </div>
            <svg width={w} height={h} style={{display: 'block', marginTop: 4}}>
                <rect x={0} y={0} width={w} height={h} fill={rag.wash} rx={4} />
                {[0.25, 0.5, 0.75, 1].map(f => (
                    <line key={f}
                        x1={pad.l} x2={w - pad.r}
                        y1={y(pr.targetPct * f)} y2={y(pr.targetPct * f)}
                        stroke={COLOURS.tarmac} strokeWidth={0.5} opacity={0.6} />
                ))}
                <path
                    d={targetPath}
                    stroke={COLOURS.snow}
                    strokeWidth={1.2}
                    strokeDasharray={isFallback ? '2,4' : '4,3'}
                    strokeOpacity={isFallback ? 0.4 : 0.7}
                    fill="none"
                />
                <path d={actualPath} stroke={COLOURS.snow} strokeWidth={2.2} fill="none" />
                <line
                    x1={nowX} x2={nowX}
                    y1={pad.t} y2={h - pad.b}
                    stroke={COLOURS.snow} strokeWidth={1} opacity={0.55}
                />
            </svg>
            <div style={{
                ...metrics.sub,
                marginTop: 2,
                display: 'flex',
                justifyContent: 'space-between',
            }}>
                <span>{isFallback ? `target estimate${pr.targetSourceDate ? ` (from ${pr.targetSourceDate})` : ''}` : `today's target`}</span>
                <span>by now {fmtPct(pr.expectedByNowPct, 1)}</span>
            </div>
        </div>
    );
}

function PaceCard({pace}) {
    if (!pace) {
        return (
            <div style={metrics.card}>
                <div style={metrics.label}>Pace</div>
                <div style={{...metrics.value, color: COLOURS.road}}>—</div>
                <div style={metrics.sub}>no line</div>
            </div>
        );
    }
    const rag = RAG[pace.status] || RAG.amber;
    const primary = pace.recentPacePctPerHr || pace.actualPacePctPerHr;
    return (
        <div style={metrics.card}>
            <div style={metrics.label}>Pace</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 6}}>
                <div style={{...metrics.value, color: COLOURS.snow}}>
                    {primary.toFixed(1)}
                </div>
                <div style={{fontSize: 14, color: COLOURS.road, fontWeight: 600}}>%/h</div>
                <span style={{
                    marginLeft: 4,
                    fontSize: 11, fontWeight: 700, color: COLOURS.snow,
                    padding: '2px 6px', borderRadius: 8, backgroundColor: rag.chip,
                }}>
                    {pace.status === 'green' ? 'on pace'
                     : pace.status === 'amber' ? 'slow'
                     : 'behind'}
                </span>
            </div>
            <div style={metrics.sub}>
                target {pace.targetPacePctPerHr.toFixed(1)} %/h · shift {pace.actualPacePctPerHr.toFixed(1)}
            </div>
        </div>
    );
}

export default function MetricsPanel({data, selectedLine, selectedLineId}) {
    const {metrics: m} = data;
    const pr = selectedLineId ? (m.productionRateByLineId || {})[selectedLineId] : null;
    const pace = selectedLineId ? (m.paceByLineId || {})[selectedLineId] : null;
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
            <ProductionRateCard pr={pr} />
            <PaceCard pace={pace} />
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
