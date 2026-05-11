import React, {useEffect, useState, useMemo} from 'react';
import {useProductionData} from './hooks/useProductionData';
import {layout, errorStyles, header as headerStyles} from './styles';
import HeaderBar from './components/HeaderBar';
import MetricsPanel from './components/MetricsPanel';
import Matrix from './components/Matrix';
import FooterBar from './components/FooterBar';
import SettingsPopover from './components/SettingsPopover';
import AreaBanners from './components/AreaBanners';

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
    const areaGroupsForView = (lineColumnsForView[0] && lineColumnsForView[0].areaGroups) || [];

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
                <MetricsPanel data={data} />
            </div>

            <div style={layout.center}>
                <div style={{
                    flexShrink: 0,
                    maxHeight: '38vh',
                    overflowY: 'auto',
                    borderBottom: '1px solid rgba(57,57,57,0.5)',
                }}>
                    <AreaBanners
                        areaGroups={areaGroupsForView}
                        openDefects={data.openDefects || []}
                        andonAlerts={data.andonAlerts || []}
                    />
                </div>
                <div style={{flex: 1, position: 'relative', minHeight: 0}}>
                    <Matrix lineColumns={lineColumnsForView} lineMatrixRows={lineMatrixRowsForView} />
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
