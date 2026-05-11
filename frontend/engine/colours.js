import {COLOURS} from '../styles';

// Stable string hash → unsigned 32-bit integer.
// Used to map area / variant-MR strings to a deterministic palette slot.
export function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

// Subtle row tints + matching badge colours — one stable palette slot per area title.
// Stations belonging to the same area share a row tint regardless of where they fall
// in the numeric station order, so non-contiguous areas still read as one group.
export const AREA_PALETTE = [
    {row: 'rgba(255, 71, 0, 0.05)',    badgeBg: 'rgba(255, 71, 0, 0.20)',   badgeBorder: 'rgba(255, 71, 0, 0.7)',   text: '#ff8a52'},  // Sol
    {row: 'rgba(59, 130, 246, 0.055)', badgeBg: 'rgba(59, 130, 246, 0.22)', badgeBorder: 'rgba(59, 130, 246, 0.7)', text: '#93c5fd'},  // blue
    {row: 'rgba(234, 179, 8, 0.055)',  badgeBg: 'rgba(234, 179, 8, 0.22)',  badgeBorder: 'rgba(234, 179, 8, 0.7)',  text: '#fde047'},  // amber
    {row: 'rgba(34, 197, 94, 0.055)',  badgeBg: 'rgba(34, 197, 94, 0.22)',  badgeBorder: 'rgba(34, 197, 94, 0.7)',  text: '#86efac'},  // green
    {row: 'rgba(20, 184, 166, 0.06)',  badgeBg: 'rgba(20, 184, 166, 0.24)', badgeBorder: 'rgba(20, 184, 166, 0.7)', text: '#5eead4'},  // teal
    {row: 'rgba(168, 85, 247, 0.06)',  badgeBg: 'rgba(168, 85, 247, 0.24)', badgeBorder: 'rgba(168, 85, 247, 0.7)', text: '#d8b4fe'},  // purple
];

export const AREA_NEUTRAL = {
    row: 'rgba(255,255,255,0.025)',
    badgeBg: COLOURS.tarmac,
    badgeBorder: COLOURS.road,
    text: COLOURS.frost,
};

// Resolve a station (or anything with .areaTitle / .areaColorIndex) to its palette entry.
// Prefers the data-hook-assigned alphabetical index (collision-free); falls back to hash.
export function colourForArea(station) {
    if (!station || !station.areaTitle) return AREA_NEUTRAL;
    const idx = typeof station.areaColorIndex === 'number'
        ? station.areaColorIndex
        : hashString(station.areaTitle);
    return AREA_PALETTE[((idx % AREA_PALETTE.length) + AREA_PALETTE.length) % AREA_PALETTE.length];
}

// Pick a palette entry by area title alone — used by AreaBanners when it only has the
// areaGroup (which carries areaTitle and areaIndex but not a stationGroup).
export function colourForAreaTitle(areaTitle, idx) {
    if (!areaTitle) return AREA_NEUTRAL;
    const i = typeof idx === 'number' ? idx : hashString(areaTitle);
    return AREA_PALETTE[((i % AREA_PALETTE.length) + AREA_PALETTE.length) % AREA_PALETTE.length];
}
