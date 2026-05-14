import {TAKT_DEFAULTS} from './constants';
import {parseHHMM} from './helpers';

export function parseShiftSettings(settingRecords) {
    const lookup = {};
    for (const r of settingRecords || []) {
        const k = r.variable;
        if (k) lookup[k] = r.value;
    }
    const shiftStartMin = parseHHMM(lookup['Shift Start']) ?? (8 * 60);
    const shiftEndMin = parseHHMM(lookup['Shift End']) ?? (17 * 60);
    const breaks = [];
    for (let i = 1; i <= 5; i++) {
        const s = parseHHMM(lookup[`Break ${i} Start`]);
        const e = parseHHMM(lookup[`Break ${i} End`]);
        if (s != null && e != null && e > s) breaks.push({startMin: s, endMin: e});
    }
    breaks.sort((a, b) => a.startMin - b.startMin);
    return {shiftStartMin, shiftEndMin, breaks};
}

export function productiveMinutesPerShift(shift) {
    const total = shift.shiftEndMin - shift.shiftStartMin;
    const breakSum = (shift.breaks || []).reduce((a, b) => a + (b.endMin - b.startMin), 0);
    return Math.max(0, total - breakSum);
}

export function elapsedProductiveMinutes(shift, now) {
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    if (nowMin <= shift.shiftStartMin) return 0;
    const total = productiveMinutesPerShift(shift);
    if (nowMin >= shift.shiftEndMin) return total;
    let elapsed = nowMin - shift.shiftStartMin;
    for (const b of shift.breaks || []) {
        if (nowMin <= b.startMin) break;
        const end = Math.min(nowMin, b.endMin);
        elapsed -= Math.max(0, end - b.startMin);
    }
    return Math.max(0, Math.min(total, elapsed));
}

export function expectedBuildPctByNow(dailyTargetPct, productiveTotal, elapsed) {
    if (productiveTotal <= 0) return 0;
    const v = dailyTargetPct * (elapsed / productiveTotal);
    return Math.max(0, Math.min(dailyTargetPct, v));
}

// RAG per the user's spec: green if on/ahead, amber within 5pp behind, red if >5pp behind.
export function productionRateStatus(actualPct, expectedPct) {
    if (actualPct >= expectedPct) return 'green';
    if (actualPct >= expectedPct - 5) return 'amber';
    return 'red';
}

export function paceStatus(actualPace, targetPace) {
    if (targetPace <= 0) return 'amber';
    const ratio = actualPace / targetPace;
    if (ratio >= 0.95) return 'green';
    if (ratio >= 0.80) return 'amber';
    return 'red';
}


export function computeTaktTime(availableHours, targetOutput) {
    const hrs = availableHours || TAKT_DEFAULTS.AVAILABLE_HOURS;
    const target = targetOutput || TAKT_DEFAULTS.TARGET_OUTPUT;
    if (target === 0) return 0;
    return hrs / target;
}

export function computeLineBalance(stationCycleTimes) {
    const times = stationCycleTimes.filter(t => t > 0);
    if (times.length === 0) return 0;
    const sum = times.reduce((a, b) => a + b, 0);
    const bottleneck = Math.max(...times);
    if (bottleneck === 0) return 0;
    return (sum / (times.length * bottleneck)) * 100;
}

export function findBottleneck(stationCycleTimes) {
    let maxTime = 0;
    let bottleneckStation = null;
    for (const [station, time] of Object.entries(stationCycleTimes)) {
        if (time > maxTime) {
            maxTime = time;
            bottleneckStation = station;
        }
    }
    return bottleneckStation;
}

export function computeYamazumi(completedSessions) {
    if (!completedSessions || completedSessions.length === 0) {
        return {va: 0, nva: 0, breakTime: 0, total: 0};
    }
    let totalVA = 0;
    let totalActual = 0;
    let totalBreak = 0;
    for (const s of completedSessions) {
        totalVA += s.assemblyTimeHrs || 0;
        totalActual += s.actualTimeHrs || 0;
        totalBreak += s.breakTimeHrs || 0;
    }
    const count = completedSessions.length;
    const va = totalVA / count;
    const actual = totalActual / count;
    const breakAvg = totalBreak / count;
    const nva = Math.max(0, actual - va);
    return {va, nva, breakTime: breakAvg, total: va + nva + breakAvg};
}

export function computeVariantProgress(build, variantConfigs, opVersions, sessions) {
    const stationProgress = {};
    if (!build.variantMfgRelease || !variantConfigs.length) return stationProgress;

    const configsForBuild = variantConfigs.filter(
        vc => vc.vmrName === build.variantMfgRelease
    );

    for (const vc of configsForBuild) {
        const opVer = opVersions[vc.opVersionId];
        if (!opVer) continue;
        const station = opVer.station;
        if (!station) continue;

        if (!stationProgress[station]) {
            stationProgress[station] = {expected: 0, completed: 0, inProgress: 0, hasAndon: false};
        }
        stationProgress[station].expected += vc.repeats || 1;
    }

    const buildSessions = sessions.filter(s => s.buildId === build.id);
    for (const s of buildSessions) {
        const station = s.station;
        if (!station || !stationProgress[station]) continue;
        if (s.status === 'Completed') {
            stationProgress[station].completed++;
        } else if (s.status === 'In Progress' || s.status === 'Paused') {
            stationProgress[station].inProgress++;
        }
    }

    return stationProgress;
}

export function computeAttendance(teamMembers) {
    let total = 0;
    let checkedIn = 0;
    const available = [];

    for (const m of teamMembers) {
        if (m.employeeStatus !== 'Current') continue;
        total++;
        if (m.checkinStatus === 'Checked in') {
            checkedIn++;
            if (!m.hasActiveSession) {
                available.push(m);
            }
        }
    }
    return {total, checkedIn, available};
}
