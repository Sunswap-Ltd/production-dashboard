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
        gridTemplate: '56px 172px 124px 1fr 48px / 1fr',
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
    checkInBanner: {
        gridRow: '3',
        backgroundColor: COLOURS.panelBg,
        borderBottom: `1px solid ${COLOURS.tarmac}`,
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'stretch',
        gap: 10,
        overflowX: 'auto',
        overflowY: 'hidden',
    },
    center: {
        gridRow: '4',
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

export const checkIn = {
    card: {
        position: 'relative',
        backgroundColor: COLOURS.cardBg,
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        width: 220,
        minHeight: 96,
        overflow: 'hidden',
    },
    cardAndon: {
        animation: 'andon-pulse 1.5s infinite',
        outline: `2px solid ${COLOURS.red}`,
        outlineOffset: -2,
    },
    photo: {
        width: 56,
        height: 56,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        border: `2px solid ${COLOURS.road}`,
        backgroundColor: COLOURS.tarmac,
    },
    photoPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: '50%',
        flexShrink: 0,
        border: `2px solid ${COLOURS.road}`,
        backgroundColor: COLOURS.tarmac,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLOURS.frost,
        fontSize: 18,
        fontWeight: 700,
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        flex: 1,
        gap: 2,
    },
    pill: {
        alignSelf: 'flex-start',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 3,
        marginBottom: 2,
    },
    name: {
        fontSize: 13,
        fontWeight: 700,
        color: COLOURS.snow,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    sub: {
        fontSize: 11,
        color: COLOURS.frost,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    subDim: {
        fontSize: 11,
        color: COLOURS.road,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    breakWarn: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLOURS.red,
        color: COLOURS.snow,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
        padding: '3px 8px',
        textAlign: 'center',
        animation: 'break-warn-drop 0.35s ease-out 1',
    },
    emptyMsg: {
        color: COLOURS.road,
        fontSize: 13,
        alignSelf: 'center',
        padding: '0 8px',
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
