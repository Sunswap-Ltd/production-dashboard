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
    if (!pr) {
        return (
            <div style={{...metrics.card, minWidth: 280}}>
                <div style={metrics.label}>Production Rate</div>
                <div style={{...metrics.value, color: COLOURS.road}}>—</div>
                <div style={metrics.sub}>no line selected</div>
            </div>
        );
    }
    if (!pr.targetAvailable || !pr.series) {
        return (
            <div style={{...metrics.card, minWidth: 280}}>
                <div style={metrics.label}>Production Rate</div>
                <div style={{...metrics.value, color: COLOURS.road}}>—</div>
                <div style={metrics.sub}>no Target KPI for today</div>
            </div>
        );
    }
    const rag = RAG[pr.status] || RAG.amber;
    const series = pr.series;
    // Wall-clock X-axis: chart spans shift start → shift end. Breaks render as flat
    // horizontal segments on the target line (cumPct doesn't advance), so the slope
    // visibly pauses during lunch / breaks and the eye can read time-of-day directly.
    const xStart = series.shiftStartMin;
    const xEnd = series.shiftEndMin;
    const xRange = Math.max(1, xEnd - xStart);
    const yMax = Math.max(pr.targetPct || 0, pr.actualPct || 0, 1) * 1.1;
    const w = 420, h = 80;
    const pad = {l: 4, r: 4, t: 4, b: 4};
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const x = (min) => pad.l + ((min - xStart) / xRange) * innerW;
    const y = (pct) => pad.t + innerH - (pct / yMax) * innerH;

    const pointsToPath = (pts) => (pts || []).map((p, i) =>
        `${i === 0 ? 'M' : 'L'}${x(p.wallMin).toFixed(1)},${y(p.cumPct).toFixed(1)}`
    ).join(' ');
    const actualPath = pointsToPath(series.actualPoints);
    const targetPath = pointsToPath(series.targetPoints);
    const nowX = x(Math.min(Math.max(series.nowWallMin, xStart), xEnd));

    const deltaSign = pr.deltaPct >= 0 ? '+' : '−';

    return (
        <div style={{
            ...metrics.card,
            minWidth: 460,
            flex: '0 0 460px',
            padding: '8px 16px',
        }}>
            <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexShrink: 0}}>
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
            <svg width={w} height={h} style={{display: 'block', marginTop: 4, flexShrink: 0}}>
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
                    strokeDasharray="4,3"
                    strokeOpacity={0.7}
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
                flexShrink: 0,
            }}>
                <span>today's target</span>
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
    if (!pace.targetAvailable) {
        return (
            <div style={metrics.card}>
                <div style={metrics.label}>Pace</div>
                <div style={{...metrics.value, color: COLOURS.road}}>—</div>
                <div style={metrics.sub}>no Target KPI for today</div>
            </div>
        );
    }
    const rag = RAG[pace.status] || RAG.amber;
    const primary = pace.recentPacePctPerHr || pace.actualPacePctPerHr;
    // On break: pill switches to "on break" (green), regardless of RAG arithmetic.
    // The big number stays so the floor can still see the trailing 60-min pace.
    const pillLabel = pace.onBreak
        ? 'on break'
        : (pace.status === 'green' ? 'on pace'
            : pace.status === 'amber' ? 'slow'
            : 'behind');
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
                    {pillLabel}
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
    // distinct PARENT operations currently affected — two andon sessions on different
    // versions of the same op (e.g. OP-0558-v1 and OP-0558-v2) collapse to 1, because
    // the floor lead reads them as "the same problem". "Total" = the flattened count,
    // i.e. how many sessions are impacted. Alerts whose session has no resolvable
    // operation are keyed by record id so they count individually rather than silently
    // merging into a single "no-op" bucket.
    const uniqueAndons = new Set(
        andonAlerts.map(a => a.operationId || `__noop__${a.id}`)
    ).size;
    const totalAndons = andonAlerts.length;
    return (
        <>
            <ProductionRateCard pr={pr} />
            <PaceCard pace={pace} />
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
