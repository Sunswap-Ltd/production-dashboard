const COLOURS = {
    snow: '#ffffff',
    frost: '#e6e2db',
    road: '#9b9b9b',
    tarmac: '#393939',
    sol: '#ff4700',
    motorway: '#000000',

    bg: '#000000',
    headerBg: '#393939',
    panelBg: '#1a1a1a',
    cardBg: '#2a2a2a',
    border: '#393939',
    text: '#ffffff',
    textMuted: '#e6e2db',
    textDim: '#9b9b9b',
    accent: '#ff4700',
    green: '#22c55e',
    amber: '#eab308',
    red: '#ef4444',
    andonPulse: 'rgba(239, 68, 68, 0.3)',
};

export {COLOURS};

// Frame colours mirror the Airtable Assembly Sessions Status single-select
// palette so the dashboard speaks the same colour language as the record view.
// Andon retains the project's existing red (used by the andon-pulse keyframe).
export const STATE_COLOURS = {
    completed: '#15803D',  // dark green
    live:      '#4ADE80',  // light green
    paused:    '#F59E0B',  // amber-orange
    andon:     COLOURS.red,
    scheduled: '#3B82F6',  // blue
    pending:   '#9CA3AF',  // grey
};

const FONT_STACK = "'Arbeit', Arial, Helvetica, Calibri, sans-serif";

export const layout = {
    container: {
        width: '100vw',
        height: '100vh',
        backgroundColor: COLOURS.bg,
        color: COLOURS.text,
        fontFamily: FONT_STACK,
        display: 'grid',
        gridTemplate: '56px 64px 1fr 48px / 1fr',
        overflow: 'hidden',
    },
    header: {
        gridRow: '1',
        backgroundColor: COLOURS.motorway,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: `1px solid ${COLOURS.tarmac}`,
    },
    kpiStrip: {
        gridRow: '2',
        backgroundColor: COLOURS.panelBg,
        borderBottom: `1px solid ${COLOURS.tarmac}`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'stretch',
        gap: 10,
        overflowX: 'auto',
    },
    center: {
        gridRow: '3',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: COLOURS.bg,
    },
    footer: {
        gridColumn: '1 / -1',
        backgroundColor: COLOURS.motorway,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderTop: `1px solid ${COLOURS.tarmac}`,
        fontSize: 13,
        color: COLOURS.textMuted,
    },
};

export const header = {
    title: {
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: COLOURS.snow,
    },
    right: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    clock: {
        fontSize: 18,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: COLOURS.snow,
    },
    date: {
        fontSize: 13,
        color: COLOURS.frost,
    },
    editBtn: {
        background: 'none',
        border: `1px solid ${COLOURS.road}`,
        color: COLOURS.frost,
        padding: '4px 12px',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: FONT_STACK,
    },
    editBtnActive: {
        background: COLOURS.sol,
        border: `1px solid ${COLOURS.sol}`,
        color: COLOURS.snow,
        padding: '4px 12px',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: FONT_STACK,
    },
};

export const metrics = {
    card: {
        backgroundColor: COLOURS.cardBg,
        borderRadius: 6,
        padding: '6px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 110,
        flexShrink: 0,
    },
    label: {
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: COLOURS.road,
        marginBottom: 2,
    },
    value: {
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1.1,
        color: COLOURS.snow,
    },
    sub: {
        fontSize: 9,
        color: COLOURS.road,
        marginTop: 1,
    },
};

export const rightPanel = {
    sectionTitle: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: COLOURS.frost,
        marginBottom: 6,
    },
    andonCard: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 6,
    },
    andonStation: {
        fontSize: 13,
        fontWeight: 700,
        color: COLOURS.red,
    },
    andonCause: {
        fontSize: 12,
        color: COLOURS.snow,
        marginTop: 2,
    },
    andonTime: {
        fontSize: 11,
        color: COLOURS.road,
        marginTop: 2,
    },
    buildCard: {
        backgroundColor: COLOURS.cardBg,
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 6,
    },
    buildTitle: {
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 4,
        color: COLOURS.snow,
    },
    buildSub: {
        fontSize: 11,
        color: COLOURS.road,
    },
};

export const errorStyles = {
    container: {
        width: '100vw',
        height: '100vh',
        backgroundColor: COLOURS.bg,
        color: COLOURS.text,
        fontFamily: FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        height: 56,
        backgroundColor: COLOURS.motorway,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: `1px solid ${COLOURS.tarmac}`,
    },
    body: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: 600,
        color: COLOURS.sol,
        marginBottom: 16,
    },
    list: {
        fontSize: 14,
        color: COLOURS.frost,
        lineHeight: 1.8,
        textAlign: 'center',
    },
};
