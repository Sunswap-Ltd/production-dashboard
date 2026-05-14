export function safeStr(record, fieldName) {
    try {
        return record.getCellValueAsString(fieldName) || '';
    } catch {
        return '';
    }
}

export function safeNum(record, fieldName, fallback = 0) {
    try {
        const v = record.getCellValue(fieldName);
        return typeof v === 'number' ? v : fallback;
    } catch {
        return fallback;
    }
}

export function safeLink(record, fieldName) {
    try {
        const v = record.getCellValue(fieldName);
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

export function safeAttachment(record, fieldName, {size = 'small'} = {}) {
    try {
        const v = record.getCellValue(fieldName);
        if (Array.isArray(v) && v.length > 0) {
            const thumb = v[0].thumbnails;
            // Preferred size first, then the other thumbnail, then the original URL.
            if (size === 'large') {
                if (thumb && thumb.large) return thumb.large.url;
                if (thumb && thumb.small) return thumb.small.url;
            } else {
                if (thumb && thumb.small) return thumb.small.url;
                if (thumb && thumb.large) return thumb.large.url;
            }
            return v[0].url || null;
        }
        return null;
    } catch {
        return null;
    }
}

export function parseJSON(str, fallback) {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

export function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
}

export function minutesSince(dateStr) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    return Math.max(0, (Date.now() - d.getTime()) / 60000);
}

export function durationToHours(durationValue) {
    if (typeof durationValue === 'number') return durationValue / 3600;
    if (typeof durationValue === 'string') {
        const match = durationValue.match(/(\d+):(\d+)/);
        if (match) return parseInt(match[1]) + parseInt(match[2]) / 60;
    }
    return 0;
}

export function formatTime(date) {
    return date.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
}

export function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
}

export function parsePercentString(str) {
    if (str == null) return 0;
    if (typeof str === 'number') return str;
    const s = String(str).trim().replace('%', '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}

export function parseHHMM(str) {
    if (!str || typeof str !== 'string') return null;
    const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
    return h * 60 + mm;
}

export function buildRecordMap(records, keyFn) {
    const map = {};
    for (const r of records) {
        const key = keyFn(r);
        if (key) map[key] = r;
    }
    return map;
}
