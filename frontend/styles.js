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
    pending:   '#ffffff',  // white frame, no tint
};

// Tech-card statuses for the per-operator strip below the KPI row. Kept on a
// separate map so changing card palettes can't accidentally re-tint matrix tiles.
export const TECH_STATE_COLOURS = {
    'active':        COLOURS.green,
    'andon':         COLOURS.red,
    'on-break':      COLOURS.amber,
    'between-tasks': '#22d3ee',       // cyan — "still warm", but not active
    'idle':          COLOURS.road,    // grey — covers both "no session" and "paused
                                      // outside a scheduled break". Rendered with a
                                      // heavy 4 px frame so the floor lead spots them.
};

export const TECH_STATE_LABEL = {
    'active':        'ACTIVE',
    'andon':         'ANDON',
    'on-break':      'ON BREAK',
    'between-tasks': 'BETWEEN TASKS',
    'idle':          'IDLE',
};

// Slot/build column width in the matrix — sized to fit the MR badge cleanly above.
export const SLOT_COL_WIDTH = 78;
// Tile width: a few pixels narrower than the column so adjacent tiles have a clear
// vertical gutter. Wide enough that op-version photos don't read as squashed strips.
export const TILE_WIDTH = 68;
// Tile height: bumped above the legacy 38 px to give overlay badges (⚠ / headshot /
// minute / ASN id) breathing room on the now-wider tile, and to make the photo's
// aspect ratio more photo-like.
export const TILE_HEIGHT = 44;
// Vertical padding around each tile in its cell — produces the row-to-row gutter so
// matrix rows aren't flush against each other.
export const TILE_ROW_PAD = 3;

// RAG fill/tint helpers for the Production Rate chart and per-station chips.
// `wash` is the soft chart background; `chip` is the pill colour; `fill` is the solid colour.
export const RAG = {
    green: {fill: COLOURS.green, wash: 'rgba(34, 197, 94, 0.10)', chip: 'rgba(34, 197, 94, 0.85)'},
    amber: {fill: COLOURS.amber, wash: 'rgba(234, 179, 8, 0.10)', chip: 'rgba(234, 179, 8, 0.85)'},
    red:   {fill: COLOURS.red,   wash: 'rgba(239, 68, 68, 0.10)', chip: 'rgba(239, 68, 68, 0.85)'},
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
        gridTemplate: '56px 172px auto 1fr 48px / 1fr',
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
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'stretch',
        gap: 14,
        overflowX: 'auto',
    },
    techStrip: {
        gridRow: '3',
        backgroundColor: COLOURS.bg,
        borderBottom: `1px solid ${COLOURS.tarmac}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        gap: 10,
        padding: '10px 14px',
        maxHeight: '40vh',
        overflowY: 'auto',
    },
    center: {
        gridRow: '4',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: COLOURS.bg,
    },
    footer: {
        gridRow: '5',
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
    // Sized for the 172 px KPI strip. The Production Rate card drives the height: header row
    // (~22) + svg margin (4) + sparkline (80) + sub margin (2) + sub (~14) + card padding (16)
    // + strip padding (28) ≈ 166 px minimum, plus a few px of breathing room. All children
    // inside ProductionRateCard use flexShrink: 0 so the sparkline can't get compressed.
    // Other cards (WiP, On Floor, etc.) just get more vertical room around their glyph.
    card: {
        backgroundColor: COLOURS.cardBg,
        borderRadius: 8,
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 170,
        flexShrink: 0,
    },
    label: {
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: COLOURS.road,
        marginBottom: 4,
    },
    value: {
        fontSize: 38,
        fontWeight: 700,
        lineHeight: 1.05,
        color: COLOURS.snow,
    },
    sub: {
        fontSize: 12,
        color: COLOURS.road,
        marginTop: 3,
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
