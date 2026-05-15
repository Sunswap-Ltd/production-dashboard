import React, {useEffect, useState, useMemo} from 'react';
import {useProductionData} from './hooks/useProductionData';
import {layout, errorStyles, header as headerStyles} from './styles';
import HeaderBar from './components/HeaderBar';
import MetricsPanel from './components/MetricsPanel';
import TechnicianStrip from './components/TechnicianStrip';
import Matrix from './components/Matrix';
import FooterBar from './components/FooterBar';
import SettingsPopover from './components/SettingsPopover';

const DEFAULT_LINE_HINT = 'Endurance';

function useGlobalStyles() {
    useEffect(() => {
        const id = 'prod-dashboard-styles';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            @keyframes andon-pulse {
                0%, 100% {
                    box-shadow: 0 0 14px 2px rgba(239,68,68,0.55);
                    transform: scale(1);
                }
                50% {
                    box-shadow: 0 0 36px 6px rgba(255,80,80,0.95);
                    transform: scale(1.04);
                }
            }
            @keyframes andon-pulse-large {
                0%, 100% {
                    box-shadow: 0 0 22px 4px rgba(239,68,68,0.7);
                    transform: scale(1);
                }
                50% {
                    box-shadow: 0 0 56px 10px rgba(255,80,80,1);
                    transform: scale(1.10);
                }
            }
            /* Step-completion burst: fired once per ASN when a new Session Step ticks over.
               Scale 3× per the plan — z-index lifts the tile above neighbouring cells (z 1)
               and station banners (z 2) but stays under the sticky slot-header row (z 3)
               and the sticky corner (z 5). */
            @media (prefers-reduced-motion: no-preference) {
                @keyframes op-tile-burst {
                    0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(255, 71, 0, 0); }
                    20%  { transform: scale(3);   box-shadow: 0 0 28px 8px rgba(255, 71, 0, 0.65); }
                    60%  { transform: scale(3);   box-shadow: 0 0 20px 6px rgba(255, 71, 0, 0.45); }
                    100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(255, 71, 0, 0); }
                }
                .op-tile-burst {
                    animation: op-tile-burst 1000ms cubic-bezier(0.2, 0.8, 0.2, 1) 1;
                    transform-origin: center center;
                    will-change: transform;
                }
            }
            @media (prefers-reduced-motion: reduce) {
                .op-tile-burst {
                    box-shadow: 0 0 0 3px rgba(255, 71, 0, 0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }, []);
}

function readLineFromHash() {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash || '';
    const match = hash.match(/(?:^|[#&])line=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function writeLineToHash(lineName) {
    if (typeof window === 'undefined') return;
    const next = `#line=${encodeURIComponent(lineName)}`;
    if (window.location.hash !== next) {
        // Use replaceState so we don't pollute history with every change.
        const url = window.location.pathname + window.location.search + next;
        window.history.replaceState(null, '', url);
    }
}

function pickInitialLine(allLineNames, hashLine) {
    if (allLineNames.length === 0) return null;
    if (hashLine && allLineNames.includes(hashLine)) return hashLine;
    const def = allLineNames.find(n => n.toLowerCase().includes(DEFAULT_LINE_HINT.toLowerCase()));
    return def || allLineNames[0];
}

export default function App() {
    useGlobalStyles();
    const data = useProductionData();
    const [hashLine, setHashLine] = useState(() => readLineFromHash());

    useEffect(() => {
        const onHash = () => setHashLine(readLineFromHash());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const allLineNames = useMemo(
        () => (data && data.lineColumns ? data.lineColumns.map(l => l.lineName) : []),
        [data],
    );
    const selectedLine = pickInitialLine(allLineNames, hashLine);

    useEffect(() => {
        if (selectedLine) writeLineToHash(selectedLine);
    }, [selectedLine]);

    const handleSelectLine = (lineName) => {
        writeLineToHash(lineName);
        setHashLine(lineName);
    };

    if (!data) {
        return (
            <div style={errorStyles.container}>
                <div style={errorStyles.header}>
                    <span style={headerStyles.title}>Production Dashboard</span>
                </div>
                <div style={errorStyles.body}>Loading production data...</div>
            </div>
        );
    }

    if (data.error === 'missingTables') {
        return (
            <div style={errorStyles.container}>
                <div style={errorStyles.header}>
                    <span style={headerStyles.title}>Production Dashboard</span>
                </div>
                <div style={errorStyles.body}>
                    <div style={errorStyles.title}>Missing Tables</div>
                    <div style={errorStyles.list}>
                        {data.missingTables.map(t => <div key={t}>{t}</div>)}
                    </div>
                    <div style={{marginTop: 24, fontSize: 12, color: '#64748b'}}>
                        Available: {data.availableTables ? data.availableTables.join(', ') : 'none'}
                    </div>
                </div>
            </div>
        );
    }

    const lineColumnsForView = data.lineColumns.filter(l => l.lineName === selectedLine);
    const lineMatrixRowsForView = data.lineMatrixRows.filter(r => {
        const line = data.lineColumns.find(l => l.lineId === r.lineId);
        return line && line.lineName === selectedLine;
    });
    const selectedLineId = lineColumnsForView[0] ? lineColumnsForView[0].lineId : null;
    const stationRatesForLine = selectedLineId
        ? ((data.metrics && data.metrics.stationRatesByLineId) || {})[selectedLineId] || {}
        : {};

    // Split the technician roster: techs on the selected line (or idle with no current
    // session) render as full cards; techs whose current session is on a different line
    // get demoted to a small stacked "deck" anchored to the right of the strip.
    const roster = data.technicianRoster || [];
    const primaryTechs = [];
    const deckTechs = [];
    for (const entry of roster) {
        const sessionLine = entry.currentSession ? entry.currentSession.lineName : null;
        if (sessionLine && sessionLine !== selectedLine) {
            deckTechs.push(entry);
        } else {
            primaryTechs.push(entry);
        }
    }

    return (
        <div style={layout.container}>
            <div style={layout.header}>
                <HeaderBar
                    lineNames={allLineNames}
                    selectedLine={selectedLine}
                    onSelectLine={handleSelectLine}
                />
            </div>

            <div style={layout.kpiStrip}>
                <MetricsPanel data={data} selectedLine={selectedLine} selectedLineId={selectedLineId} />
            </div>

            <div style={layout.techStrip}>
                <TechnicianStrip primary={primaryTechs} deck={deckTechs} />
            </div>

            <div style={layout.center}>
                <div style={{flex: 1, position: 'relative', minHeight: 0}}>
                    <Matrix
                        lineColumns={lineColumnsForView}
                        lineMatrixRows={lineMatrixRowsForView}
                        stationRates={stationRatesForLine}
                        latestStepCompleteByAsn={data.latestStepCompleteByAsn || {}}
                        rosterByTechId={data.technicianRosterById || {}}
                    />
                </div>
            </div>

            <div style={layout.footer}>
                <FooterBar
                    attendance={data.metrics.attendance}
                    andonCount={data.andonAlerts.length}
                />
            </div>

            <SettingsPopover
                settings={data.settings || []}
                settingsTable={data.settingsTable || null}
            />
        </div>
    );
}
