import {useMemo} from 'react';
import {useBase, useRecords} from '@airtable/blocks/interface/ui';
import {TABLES, FIELDS, ASN_STATUS, GOODS_STATUS, EMPLOYEE_STATUS, CHECKIN_STATUS, DEFECT_STATUS} from '../engine/constants';
import {safeStr, safeNum, safeLink, safeAttachment, durationToHours} from '../engine/helpers';
import {computeYamazumi, computeAttendance, computeLineBalance, findBottleneck} from '../engine/calculations';

function getTable(base, name) {
    return base.getTableByNameIfExists(name);
}

function hasField(table, name) {
    return table && table.getFieldByNameIfExists(name);
}

export function useProductionData() {
    const base = useBase();

    const sessionsTable = getTable(base, TABLES.ASSEMBLY_SESSIONS);
    const buildsTable = getTable(base, TABLES.BUILDS);
    const vmrTable = getTable(base, TABLES.VARIANT_MFG_RELEASE);
    const vconfigTable = getTable(base, TABLES.VARIANT_CONFIG);
    const stationsTable = getTable(base, TABLES.PRODUCTION_STATIONS);
    const linesTable = getTable(base, TABLES.PRODUCTION_LINES);
    const areasTable = getTable(base, TABLES.PRODUCTION_AREAS);
    const opVersionsTable = getTable(base, TABLES.OPERATION_VERSIONS);
    const operationsTable = getTable(base, TABLES.OPERATIONS);
    const teamTable = getTable(base, TABLES.TEAM_MEMBERS);
    const buildSlotsTable = getTable(base, TABLES.BUILD_SLOTS);
    const timesheetsTable = getTable(base, TABLES.TIMESHEETS);
    const settingsTable = getTable(base, TABLES.SETTINGS);
    const defectsTable = getTable(base, TABLES.DEFECTS);

    const fallback = base.tables[0];
    const sessionRecords = useRecords(sessionsTable || fallback);
    const buildRecords = useRecords(buildsTable || fallback);
    const vmrRecords = useRecords(vmrTable || fallback);
    const vconfigRecords = useRecords(vconfigTable || fallback);
    const stationRecords = useRecords(stationsTable || fallback);
    const lineRecords = useRecords(linesTable || fallback);
    const areaRecords = useRecords(areasTable || fallback);
    const opVersionRecords = useRecords(opVersionsTable || fallback);
    const operationRecords = useRecords(operationsTable || fallback);
    const teamRecords = useRecords(teamTable || fallback);
    const buildSlotRecords = useRecords(buildSlotsTable || fallback);
    const timesheetRecords = useRecords(timesheetsTable || fallback);
    const settingsRecords = useRecords(settingsTable || fallback);
    const defectRecords = useRecords(defectsTable || fallback);

    return useMemo(() => {
        const requiredTables = [
            [sessionsTable, TABLES.ASSEMBLY_SESSIONS],
            [buildsTable, TABLES.BUILDS],
            [stationsTable, TABLES.PRODUCTION_STATIONS],
            [linesTable, TABLES.PRODUCTION_LINES],
            [buildSlotsTable, TABLES.BUILD_SLOTS],
            [opVersionsTable, TABLES.OPERATION_VERSIONS],
            [vconfigTable, TABLES.VARIANT_CONFIG],
        ];

        const missingTables = requiredTables
            .filter(([t]) => !t)
            .map(([, name]) => name);

        if (missingTables.length > 0) {
            return {error: 'missingTables', missingTables, availableTables: base.tables.map(t => t.name)};
        }

        // --- Parse team members ---
        const teamMembersById = {};
        const teamMembers = [];
        if (teamTable) {
            for (const r of teamRecords) {
                const m = {
                    id: r.id,
                    name: safeStr(r, FIELDS.TEAM.NAME),
                    picture: safeAttachment(r, FIELDS.TEAM.PICTURE),
                    title: safeStr(r, FIELDS.TEAM.TITLE),
                    team: safeStr(r, FIELDS.TEAM.TEAM),
                    checkinStatus: safeStr(r, FIELDS.TEAM.STATUS),
                    employeeStatus: safeStr(r, FIELDS.TEAM.EMPLOYEE_STATUS),
                    hasActiveSession: false,
                };
                teamMembersById[r.id] = m;
                teamMembers.push(m);
            }
        }

        // --- Parse operations (parent of op versions) ---
        const operationsById = {};
        if (operationsTable) {
            for (const r of operationRecords) {
                operationsById[r.id] = {
                    id: r.id,
                    title: safeStr(r, FIELDS.OPERATION.ID), // e.g. "OP-155 Van Kit 7.5.12 - HMI Touchscreen"
                    type: safeStr(r, FIELDS.OPERATION.TYPE),
                };
            }
        }

        // Parse a version label like "v1" / "v2" / "v3a" out of an Op Version name.
        // Names look like "OP-0155-v1 Van Kit 7.5.12 - HMI Touchscreen".
        const parseVersionLabel = (opVerName) => {
            if (!opVerName) return '';
            const m = opVerName.match(/-v(\d+[A-Za-z]?)\b/);
            return m ? `v${m[1]}` : '';
        };

        // --- Parse operation versions (with parent operation join) ---
        const opVersionsById = {};
        if (opVersionsTable) {
            for (const r of opVersionRecords) {
                const opLinks = safeLink(r, FIELDS.OP_VERSION.OPERATIONS);
                const operationId = opLinks.length > 0 ? opLinks[0].id : null;
                const operation = operationId ? operationsById[operationId] : null;
                const name = safeStr(r, FIELDS.OP_VERSION.OPERATION_VERSION);
                // Cycle time field is an Airtable Duration → returns seconds.
                const cycleSeconds = safeNum(r, FIELDS.OP_VERSION.CYCLE_TIME, 0);
                opVersionsById[r.id] = {
                    id: r.id,
                    name,
                    station: safeStr(r, FIELDS.OP_VERSION.STATION),
                    sequenceId: safeStr(r, FIELDS.OP_VERSION.SEQUENCE_ID),
                    operationNumber: safeStr(r, FIELDS.OP_VERSION.OPERATION_NUMBER),
                    type: safeStr(r, FIELDS.OP_VERSION.TYPE),
                    photo: safeAttachment(r, FIELDS.OP_VERSION.PHOTO),
                    status: safeStr(r, FIELDS.OP_VERSION.STATUS),
                    cycleSeconds,
                    operationId,
                    operationTitle: operation ? operation.title : (opLinks[0]?.name || name),
                    versionLabel: parseVersionLabel(name),
                };
            }
        }

        // Pick the canonical op-version per parent operation: the "latest released" one.
        // Preference order: status === "Released" > others; within each, highest version
        // number (parsed from "v<N>" in the op-version name). Used to drive column metadata
        // (sequenceId, cycle time, station, title) so the matrix reflects current engineering
        // intent instead of legacy / draft versions.
        const versionRank = (opVer) => {
            if (!opVer) return -1;
            const m = (opVer.name || '').match(/-v(\d+)/i);
            return m ? parseInt(m[1], 10) : 0;
        };
        const latestReleasedByOpId = {};
        for (const opVer of Object.values(opVersionsById)) {
            const opId = opVer.operationId || `unlinked::${opVer.id}`;
            const existing = latestReleasedByOpId[opId];
            const isReleased = opVer.status === 'Released';
            if (!existing) {
                latestReleasedByOpId[opId] = opVer;
                continue;
            }
            const existingReleased = existing.status === 'Released';
            if (isReleased && !existingReleased) {
                latestReleasedByOpId[opId] = opVer;
                continue;
            }
            if (!isReleased && existingReleased) continue;
            if (versionRank(opVer) > versionRank(existing)) {
                latestReleasedByOpId[opId] = opVer;
            }
        }

        // --- Parse variant configs ---
        const variantConfigs = [];
        if (vconfigTable) {
            for (const r of vconfigRecords) {
                const vmrLinks = safeLink(r, FIELDS.VCONFIG.VMR);
                const opLinks = safeLink(r, FIELDS.VCONFIG.OPERATION_VERSION);
                variantConfigs.push({
                    vmrId: vmrLinks.length > 0 ? vmrLinks[0].id : null,
                    vmrName: vmrLinks.length > 0 ? vmrLinks[0].name : '',
                    opVersionId: opLinks.length > 0 ? opLinks[0].id : null,
                    repeats: safeNum(r, FIELDS.VCONFIG.REPEATS, 1),
                });
            }
        }

        // --- Parse variant manufacturing releases ---
        const vmrByName = {};
        if (vmrTable) {
            for (const r of vmrRecords) {
                const name = safeStr(r, FIELDS.VMR.NAME);
                if (name) vmrByName[name] = {id: r.id, name};
            }
        }

        // --- Parse assembly sessions ---
        const allSessions = [];
        const activeSessionsByStation = {};
        const sessionsByBuildId = {};
        const completedSessionsByStation = {};

        for (const r of sessionRecords) {
            const asnId = safeStr(r, FIELDS.ASN.ASSEMBLY_SESSION_ID);
            const status = safeStr(r, FIELDS.ASN.STATUS);
            const station = safeStr(r, FIELDS.ASN.STATION);
            const progress = safeNum(r, FIELDS.ASN.PROGRESS, 0);
            const buildLinks = safeLink(r, FIELDS.ASN.BUILD);
            const techLinks = safeLink(r, FIELDS.ASN.TECHNICIAN);
            const opVerLinks = safeLink(r, FIELDS.ASN.OPERATION_VERSION);
            const startStr = safeStr(r, FIELDS.ASN.START);
            const actualTime = safeNum(r, FIELDS.ASN.ACTUAL_TIME, 0);
            const assemblyTime = safeNum(r, FIELDS.ASN.ASSEMBLY_TIME, 0);
            const stepRate = safeNum(r, FIELDS.ASN.STEP_RATE, 0);
            const remainingSteps = safeNum(r, FIELDS.ASN.REMAINING_STEPS, 0);

            const opVerId = opVerLinks.length > 0 ? opVerLinks[0].id : null;
            const opVer = opVerId ? opVersionsById[opVerId] : null;

            let breakTimeHrs = 0;
            try {
                const btVal = r.getCellValue(FIELDS.ASN.TOTAL_BREAK_TIME);
                breakTimeHrs = durationToHours(btVal);
            } catch { /* field may not exist */ }

            const techId = techLinks.length > 0 ? techLinks[0].id : null;
            const tech = techId ? teamMembersById[techId] : null;
            const buildId = buildLinks.length > 0 ? buildLinks[0].id : null;
            const buildName = buildLinks.length > 0 ? buildLinks[0].name : '';

            // Andon state comes from the session's own fields, not Production Breaks. A session
            // is in andon when Status=Paused AND the Andon Flag lookup contains "Andon". Production
            // Breaks records are unreliable (often left "In Progress" after the session moves on).
            const andonFlag = safeStr(r, FIELDS.ASN.ANDON_FLAG);
            const hasActiveAndon = status === ASN_STATUS.PAUSED && andonFlag.includes('Andon');
            const andonCause = hasActiveAndon ? safeStr(r, FIELDS.ASN.ANDON_CAUSE) : null;
            const andonStart = null;

            const actualTimeHrs = actualTime / 3600;
            const productionRatePct = actualTimeHrs > 0 ? (progress * 100) / actualTimeHrs : 0;

            const session = {
                id: r.id,
                asnId,
                status,
                station,
                progress,
                buildId,
                buildName,
                techId,
                techName: tech ? tech.name : '',
                techPicture: tech ? tech.picture : null,
                opVerId,
                opVerName: opVer ? opVer.name : '',
                opVerPhoto: opVer ? opVer.photo : null,
                start: startStr,
                actualTimeHrs,
                assemblyTimeHrs: assemblyTime / 60,
                breakTimeHrs,
                stepRate,
                productionRatePct,
                remainingSteps,
                hasAndon: hasActiveAndon,
                andonCause,
                andonStart,
            };

            allSessions.push(session);

            if (status === ASN_STATUS.IN_PROGRESS || status === ASN_STATUS.PAUSED) {
                if (!activeSessionsByStation[station]) activeSessionsByStation[station] = [];
                activeSessionsByStation[station].push(session);

                if (tech) tech.hasActiveSession = true;
            }

            if (status === ASN_STATUS.COMPLETED) {
                if (!completedSessionsByStation[station]) completedSessionsByStation[station] = [];
                completedSessionsByStation[station].push(session);
            }

            if (buildId) {
                if (!sessionsByBuildId[buildId]) sessionsByBuildId[buildId] = [];
                sessionsByBuildId[buildId].push(session);
            }
        }

        // --- Parse builds ---
        const builds = [];
        const activeBuilds = [];
        let wipCount = 0;
        let completedToday = 0;

        for (const r of buildRecords) {
            const goodsStatus = safeStr(r, FIELDS.BUILD.GOODS_STATUS);
            const buildId = safeStr(r, FIELDS.BUILD.BUILD_ID);
            const nickname = safeStr(r, FIELDS.BUILD.NICKNAME);
            const progress = safeNum(r, FIELDS.BUILD.PROGRESS, 0);
            const vmrText = safeStr(r, FIELDS.BUILD.VARIANT_MFG_RELEASE);
            const completeDateStr = safeStr(r, FIELDS.BUILD.ACTUAL_GOODS_COMPLETE);

            const build = {
                id: r.id,
                buildId,
                nickname,
                progress,
                goodsStatus,
                variantMfgRelease: vmrText,
            };

            builds.push(build);

            if (goodsStatus === GOODS_STATUS.ASSEMBLING) {
                wipCount++;
                activeBuilds.push(build);
            }

            if (goodsStatus === GOODS_STATUS.COMPLETE && completeDateStr) {
                const d = new Date(completeDateStr);
                const now = new Date();
                if (d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate()) {
                    completedToday++;
                }
            }
        }

        // --- Parse lines (all lines; matrix filters by in-progress slot membership) ---
        const linesById = {};
        for (const r of lineRecords) {
            const name = safeStr(r, FIELDS.LINE.ASSEMBLY_LINE);
            const stationLinks = safeLink(r, FIELDS.LINE.STATIONS);
            linesById[r.id] = {
                id: r.id,
                name,
                stationIds: stationLinks.map(l => l.id),
            };
        }

        // --- Parse stations (active only; minimal fields needed for matrix metrics) ---
        const stations = [];
        const stationByTitle = {};
        const activeStationTitles = new Set();
        for (const r of stationRecords) {
            const title = safeStr(r, FIELDS.STATION.TITLE);
            const status = safeStr(r, FIELDS.STATION.STATUS);
            const lineLinks = safeLink(r, FIELDS.STATION.LINES);
            // Strict filter: only include stations explicitly marked "Active". Blank / Pending /
            // any future statuses are excluded by default so they don't sneak into the matrix.
            if (status !== 'Active') continue;

            const linkedLineId = lineLinks.length > 0 ? lineLinks[0].id : null;
            const completed = completedSessionsByStation[title] || [];
            const yamazumi = computeYamazumi(completed);

            const stationData = {
                id: r.id,
                title,
                lineId: linkedLineId,
                yamazumi,
            };
            stations.push(stationData);
            stationByTitle[title] = stationData;
            if (title) activeStationTitles.add(title);
        }

        // --- Parse areas (with four collaborator-role fields) ---
        const collab = (r, fieldName) => {
            try {
                const v = r.getCellValue(fieldName);
                if (!v) return null;
                return {
                    id: v.id,
                    name: v.name || '',
                    email: v.email || '',
                    profilePicUrl: v.profilePicUrl || null,
                };
            } catch { return null; }
        };

        const areas = [];
        const areaByStationId = {};
        if (areasTable) {
            for (const r of areaRecords) {
                const stationLinks = safeLink(r, FIELDS.AREA.STATIONS);
                const lineLinks = safeLink(r, FIELDS.AREA.LINES);
                const area = {
                    id: r.id,
                    title: safeStr(r, FIELDS.AREA.TITLE),
                    stationIds: stationLinks.map(l => l.id),
                    lineIds: lineLinks.map(l => l.id),
                    leaders: {
                        teamLeader: collab(r, FIELDS.AREA.TEAM_LEADER),
                        qa: collab(r, FIELDS.AREA.QA),
                        productionSupport: collab(r, FIELDS.AREA.PRODUCTION_SUPPORT),
                        supplyChain: collab(r, FIELDS.AREA.SUPPLY_CHAIN),
                    },
                };
                areas.push(area);
                for (const sid of area.stationIds) areaByStationId[sid] = area;
            }
        }

        // Map stationTitle -> areaId for the matrix grouping (ids only; full area looked up later).
        // Map stationTitle -> lineName via the Station's own Lines link, used by MetricsPanel to
        // filter andons and defects to the currently selected line. This bypasses the Areas table
        // — going through Area.Lines silently drops alerts whenever Production Areas isn't fully
        // wired into the interface, even though the matrix renders fine (it walks Line → Stations).
        const areaIdByStationTitle = {};
        const lineNameByStationTitle = {};
        for (const station of stations) {
            const a = areaByStationId[station.id];
            if (a) areaIdByStationTitle[station.title] = a.id;
            const line = station.lineId ? linesById[station.lineId] : null;
            if (line) lineNameByStationTitle[station.title] = line.name;
        }
        const areaById = {};
        for (const a of areas) areaById[a.id] = a;

        // --- Build Slots: governing IDs for in-flight work ---
        const buildsById = {};
        for (const build of builds) buildsById[build.id] = build;

        // Map build.id → lineSlotId so per-station aggregates can label each tile with its slot
        const lineSlotByBuildId = {};
        if (buildSlotsTable) {
            for (const r of buildSlotRecords) {
                const buildLinks = safeLink(r, FIELDS.BUILD_SLOT.BUILD);
                if (buildLinks.length === 0) continue;
                lineSlotByBuildId[buildLinks[0].id] = safeStr(r, FIELDS.BUILD_SLOT.LINE_SLOT_ID);
            }
        }

        // --- Matrix data: for each line, gather slots and the union of op-versions used ---
        const slotsByLineId = {};            // lineId → array of slot entries (unfiltered yet)
        const opVersionsByLineId = {};       // lineId → opVerId → opVer metadata (union)
        const inProgressNumbersByLineId = {}; // lineId → list of numeric slot prefixes that are IN_PROGRESS

        const isUnknownCause = (cause) => !cause || /unknown/i.test(cause.trim());

        if (buildSlotsTable) {
            for (const r of buildSlotRecords) {
                const slotId = safeStr(r, FIELDS.BUILD_SLOT.LINE_SLOT_ID);
                const buildLinks = safeLink(r, FIELDS.BUILD_SLOT.BUILD);
                const linkedBuildId = buildLinks.length > 0 ? buildLinks[0].id : null;
                const build = linkedBuildId ? buildsById[linkedBuildId] : null;
                if (!build) continue; // skip empty / not-yet-assigned slots

                const slotLineLinks = safeLink(r, FIELDS.BUILD_SLOT.ASSEMBLY_LINE);
                const slotLineId = slotLineLinks.length > 0 ? slotLineLinks[0].id : null;
                if (!slotLineId) continue;

                if (!slotsByLineId[slotLineId]) slotsByLineId[slotLineId] = [];
                if (!opVersionsByLineId[slotLineId]) opVersionsByLineId[slotLineId] = {};

                const isAssembling = build.goodsStatus === GOODS_STATUS.ASSEMBLING
                    || build.goodsStatus === GOODS_STATUS.PREPARING;
                const isCompleted = build.goodsStatus === GOODS_STATUS.COMPLETE;

                const buildSessions = allSessions.filter(s => s.buildId === build.id);
                const configsForBuild = variantConfigs.filter(vc => vc.vmrName === build.variantMfgRelease);

                // ---- VMR-vs-actual validation prep ----
                // expectedByOpId: from VMR config — the op-versions and total repeats required for
                // each parent operation in this build's variant.
                const expectedByOpId = {};
                for (const vc of configsForBuild) {
                    const opVer = opVersionsById[vc.opVersionId];
                    if (!opVer) continue;
                    const opId = opVer.operationId || `unlinked::${opVer.id}`;
                    if (!expectedByOpId[opId]) {
                        expectedByOpId[opId] = {opVerIds: new Set(), repeats: 0, station: opVer.station};
                    }
                    expectedByOpId[opId].opVerIds.add(opVer.id);
                    expectedByOpId[opId].repeats += vc.repeats || 1;
                }

                // actualByOpId: from this build's actual ASNs — which op-versions are present and
                // how many sessions exist per parent operation.
                const actualByOpId = {};
                for (const s of buildSessions) {
                    const opVer = opVersionsById[s.opVerId];
                    if (!opVer) continue;
                    const opId = opVer.operationId || `unlinked::${opVer.id}`;
                    if (!actualByOpId[opId]) {
                        actualByOpId[opId] = {sessions: [], opVerIds: new Set(), station: opVer.station};
                    }
                    actualByOpId[opId].sessions.push(s);
                    actualByOpId[opId].opVerIds.add(opVer.id);
                }

                // Build a per-(station, operationId) cell for this slot. If a variant config requires
                // multiple op-versions of the same operation, aggregate them under one cell and list
                // every version label so the cell can show "v1+" or similar.
                const cellMap = {};
                let totalNeeded = 0;
                let totalCompleted = 0;

                for (const vc of configsForBuild) {
                    const opVer = opVersionsById[vc.opVersionId];
                    if (!opVer || !opVer.station) continue;
                    // Skip op-versions belonging to inactive stations — they should not appear
                    // anywhere in the matrix.
                    if (!activeStationTitles.has(opVer.station)) continue;
                    const repeats = vc.repeats || 1;

                    // Use parent operationId as the column key; fall back to opVer.id if missing
                    // (op-versions without a linked Operation get their own column).
                    const colId = opVer.operationId || `unlinked::${opVer.id}`;
                    const colTitle = opVer.operationTitle || opVer.name;

                    if (!opVersionsByLineId[slotLineId][colId]) {
                        // Use the latest-released op-version's metadata for column attributes
                        // (sequenceId, cycle time, station, title). Falls back to current opVer
                        // if no released version exists for the operation.
                        const canonical = latestReleasedByOpId[colId] || opVer;
                        opVersionsByLineId[slotLineId][colId] = {
                            operationId: opVer.operationId,
                            colKey: colId,
                            title: canonical.operationTitle || canonical.name || colTitle,
                            station: canonical.station || opVer.station,
                            sequenceId: canonical.sequenceId || opVer.sequenceId,
                            photo: canonical.photo || opVer.photo,
                            expectedCycleSeconds: canonical.cycleSeconds || 0,
                            latestVersionLabel: canonical.versionLabel || '',
                            // Filled in after the slot-filter pass.
                            repeatsLatest: 1,
                            medianActualSeconds: 0,
                        };
                    } else {
                        const existing = opVersionsByLineId[slotLineId][colId];
                        if (!existing.photo && opVer.photo) existing.photo = opVer.photo;
                    }

                    const opSessions = buildSessions.filter(s => s.opVerId === opVer.id);
                    const completedSessions = opSessions.filter(s => s.status === ASN_STATUS.COMPLETED);
                    const liveSessions = opSessions.filter(
                        s => s.status === ASN_STATUS.IN_PROGRESS || s.status === ASN_STATUS.PAUSED
                    );
                    const pausedSessions = liveSessions.filter(s => s.status === ASN_STATUS.PAUSED);
                    const scheduledSessions = opSessions.filter(s => s.status === ASN_STATUS.SCHEDULED);
                    const andonSessions = liveSessions.filter(s => s.hasAndon);
                    const andonUnknownSessions = andonSessions.filter(s => isUnknownCause(s.andonCause));

                    // Goods Complete builds: trust the build status — every required cell is done.
                    let completedCount = completedSessions.length;
                    if (isCompleted) completedCount = repeats;

                    totalNeeded += repeats;
                    totalCompleted += Math.min(completedCount, repeats);

                    const key = `${opVer.station}::${colId}`;
                    const existingCell = cellMap[key];
                    const liveProgressVals = liveSessions.map(s => s.progress || 0);
                    // Sum of *assembly*-time minutes (active work, breaks excluded) across completed
                    // sessions for this op-version. Drives the bottom-right minute badge — actual
                    // (elapsed) time is too noisy (lunch / end-of-shift gaps inflate it).
                    const completedMinutesSum = completedSessions.reduce(
                        (acc, s) => acc + (s.assemblyTimeHrs || 0) * 60,
                        0,
                    );
                    // Per-session seconds, kept on the cell so the post-filter pass can compute
                    // a per-op-column median across only the visible slots.
                    const completedSecondsList = completedSessions
                        .map(s => (s.assemblyTimeHrs || 0) * 3600)
                        .filter(sec => sec > 0);

                    const asnEntriesForOp = opSessions
                        .filter(s => s.asnId)
                        .map(s => ({asnId: s.asnId, start: s.start || ''}));

                    if (existingCell) {
                        // Multiple op-versions of the same operation for this slot — aggregate.
                        existingCell.needed += repeats;
                        existingCell.completed += Math.min(completedCount, repeats);
                        existingCell.live += liveSessions.length;
                        existingCell.paused += pausedSessions.length;
                        existingCell.scheduled += scheduledSessions.length;
                        existingCell.andon += andonSessions.length;
                        existingCell.andonUnknown = existingCell.andonUnknown || andonUnknownSessions.length > 0;
                        if (!existingCell.liveSession && liveSessions.length > 0) existingCell.liveSession = liveSessions[0];
                        for (const v of liveProgressVals) existingCell._liveProgressBag.push(v);
                        existingCell._completedMinutesSum += completedMinutesSum;
                        existingCell._completedSessionCount += completedSessions.length;
                        for (const sec of completedSecondsList) existingCell._completedSecondsList.push(sec);
                        for (const e of asnEntriesForOp) existingCell._asnEntries.push(e);
                        for (const s of liveSessions) {
                            if (s.techName && !existingCell.liveOperators.find(o => o.name === s.techName)) {
                                existingCell.liveOperators.push({name: s.techName, picture: s.techPicture});
                            }
                        }
                        if (opVer.versionLabel && !existingCell.versionLabels.includes(opVer.versionLabel)) {
                            existingCell.versionLabels.push(opVer.versionLabel);
                        }
                    } else {
                        const liveOperators = [];
                        for (const s of liveSessions) {
                            if (!s.techName) continue;
                            if (!liveOperators.find(o => o.name === s.techName)) {
                                liveOperators.push({name: s.techName, picture: s.techPicture});
                            }
                        }
                        cellMap[key] = {
                            slotId,
                            lineId: slotLineId,
                            operationId: colId,
                            opVerId: opVer.id,                    // first-seen op version (for popover)
                            opVerName: opVer.name,
                            opVerPhoto: opVer.photo,
                            station: opVer.station,
                            required: true,
                            needed: repeats,
                            completed: completedCount,
                            live: liveSessions.length,
                            paused: pausedSessions.length,
                            scheduled: scheduledSessions.length,
                            andon: andonSessions.length,
                            andonUnknown: andonUnknownSessions.length > 0,
                            liveOperators,
                            liveSession: liveSessions[0] || null,
                            _liveProgressBag: liveProgressVals.slice(),
                            _completedMinutesSum: completedMinutesSum,
                            _completedSessionCount: completedSessions.length,
                            _completedSecondsList: completedSecondsList.slice(),
                            _asnEntries: asnEntriesForOp.slice(),
                            versionLabels: opVer.versionLabel ? [opVer.versionLabel] : [],
                            state: 'pending', // recomputed below
                        };
                    }
                }

                // Final state + completionFraction pass per cell (after possible aggregation across versions).
                // Most-active-wins priority: Andon > In Progress > Paused > Completed > Scheduled > Pending.
                // Matches the user-facing Airtable status palette on Assembly Sessions.
                for (const key of Object.keys(cellMap)) {
                    const c = cellMap[key];
                    let state = 'pending';
                    if (c.andon > 0) state = 'andon';
                    else if (c.live > c.paused) state = 'live';
                    else if (c.paused > 0) state = 'paused';
                    else if (c.completed > 0 || isCompleted) state = 'completed';
                    else if ((c.scheduled || 0) > 0) state = 'scheduled';
                    c.state = state;

                    // completionFraction = (completed repeats + avg live progress for in-flight repeats) / needed
                    // Used to draw the in-cell pie chart.
                    const liveBag = c._liveProgressBag || [];
                    const avgLiveProgress = liveBag.length > 0
                        ? liveBag.reduce((a, b) => a + b, 0) / liveBag.length
                        : 0;
                    const liveContribution = Math.min(c.live, Math.max(0, c.needed - c.completed)) * avgLiveProgress;
                    const frac = c.needed > 0 ? Math.min(1, (c.completed + liveContribution) / c.needed) : 0;
                    c.completionFraction = state === 'completed' ? 1 : frac;

                    // Average minutes per completed repeat — drives the bottom-right minute badge.
                    c.completionMinutes = c._completedSessionCount > 0
                        ? c._completedMinutesSum / c._completedSessionCount
                        : 0;

                    // Latest ASN on the cell (by session start, desc) for the top-centre badge.
                    // Drops any duplicate ASN strings across op-versions so the +N counter is
                    // truthful. Empty when the cell has no sessions with an ID.
                    const dedup = new Map();
                    for (const e of c._asnEntries || []) {
                        if (!dedup.has(e.asnId) || (e.start || '') > (dedup.get(e.asnId).start || '')) {
                            dedup.set(e.asnId, e);
                        }
                    }
                    const sortedAsns = [...dedup.values()].sort(
                        (a, b) => (b.start || '').localeCompare(a.start || ''),
                    );
                    c.latestAsnId = sortedAsns[0] ? sortedAsns[0].asnId : '';
                    c.extraAsnCount = Math.max(0, sortedAsns.length - 1);

                    delete c._liveProgressBag;
                    delete c._completedMinutesSum;
                    delete c._completedSessionCount;
                    delete c._asnEntries;
                }

                // ---- Orphan-cell pass: ASNs at parent operations NOT in this build's VMR ----
                // Pre-generated ASNs are expected to match the VMR perfectly, so any session whose
                // parent operation isn't in expectedByOpId is a config error worth surfacing on
                // its own cell (with a column added for the matrix to render).
                const labelFor = (id) => opVersionsById[id]?.versionLabel || opVersionsById[id]?.name || '?';
                for (const opId of Object.keys(actualByOpId)) {
                    if (expectedByOpId[opId]) continue;
                    const orphan = actualByOpId[opId];
                    const someSession = orphan.sessions[0];
                    const opVer = opVersionsById[someSession.opVerId];
                    if (!opVer || !opVer.station) continue;
                    // Skip orphan ASNs at inactive stations — those stations shouldn't appear
                    // in the matrix at all.
                    if (!activeStationTitles.has(opVer.station)) continue;

                    const station = opVer.station;
                    const key = `${station}::${opId}`;
                    if (cellMap[key]) continue; // shouldn't happen, but be safe

                    const completedSessions = orphan.sessions.filter(s => s.status === ASN_STATUS.COMPLETED);
                    const liveSessions = orphan.sessions.filter(
                        s => s.status === ASN_STATUS.IN_PROGRESS || s.status === ASN_STATUS.PAUSED
                    );
                    const pausedSessions = liveSessions.filter(s => s.status === ASN_STATUS.PAUSED);
                    const scheduledSessions = orphan.sessions.filter(s => s.status === ASN_STATUS.SCHEDULED);
                    const andonSessions = liveSessions.filter(s => s.hasAndon);
                    const andonUnknownSessions = andonSessions.filter(s => isUnknownCause(s.andonCause));

                    const liveOperators = [];
                    for (const s of liveSessions) {
                        if (!s.techName) continue;
                        if (!liveOperators.find(o => o.name === s.techName)) {
                            liveOperators.push({name: s.techName, picture: s.techPicture});
                        }
                    }

                    const versionLabels = [...orphan.opVerIds]
                        .map(id => opVersionsById[id]?.versionLabel)
                        .filter(Boolean);

                    // Same most-active-wins priority as the main cell loop.
                    let state = 'pending';
                    const completedCount = completedSessions.length;
                    const needed = orphan.sessions.length;
                    if (andonSessions.length > 0) state = 'andon';
                    else if (liveSessions.length > pausedSessions.length) state = 'live';
                    else if (pausedSessions.length > 0) state = 'paused';
                    else if (completedCount > 0) state = 'completed';
                    else if (scheduledSessions.length > 0) state = 'scheduled';

                    const liveBag = liveSessions.map(s => s.progress || 0);
                    const avgLiveProgress = liveBag.length > 0
                        ? liveBag.reduce((a, b) => a + b, 0) / liveBag.length
                        : 0;
                    const liveContribution = Math.min(liveSessions.length, Math.max(0, needed - completedCount)) * avgLiveProgress;
                    const completionFraction = needed > 0 ? Math.min(1, (completedCount + liveContribution) / needed) : 0;
                    const completedMinutesSum = completedSessions.reduce((acc, s) => acc + (s.assemblyTimeHrs || 0) * 60, 0);
                    const orphanCompletedSecondsList = completedSessions
                        .map(s => (s.assemblyTimeHrs || 0) * 3600)
                        .filter(sec => sec > 0);

                    const orphanAsnEntries = orphan.sessions
                        .filter(s => s.asnId)
                        .map(s => ({asnId: s.asnId, start: s.start || ''}));
                    const orphanDedup = new Map();
                    for (const e of orphanAsnEntries) {
                        if (!orphanDedup.has(e.asnId) || (e.start || '') > (orphanDedup.get(e.asnId).start || '')) {
                            orphanDedup.set(e.asnId, e);
                        }
                    }
                    const orphanSortedAsns = [...orphanDedup.values()].sort(
                        (a, b) => (b.start || '').localeCompare(a.start || ''),
                    );

                    cellMap[key] = {
                        slotId,
                        lineId: slotLineId,
                        operationId: opId,
                        opVerId: someSession.opVerId,
                        opVerName: opVer.name,
                        opVerPhoto: opVer.photo,
                        station,
                        required: false,
                        needed,
                        completed: completedCount,
                        live: liveSessions.length,
                        paused: pausedSessions.length,
                        scheduled: scheduledSessions.length,
                        andon: andonSessions.length,
                        andonUnknown: andonUnknownSessions.length > 0,
                        liveOperators,
                        liveSession: liveSessions[0] || null,
                        _completedSecondsList: orphanCompletedSecondsList,
                        versionLabels,
                        state,
                        completionFraction: state === 'completed' ? 1 : completionFraction,
                        completionMinutes: completedSessions.length > 0
                            ? completedMinutesSum / completedSessions.length
                            : 0,
                        latestAsnId: orphanSortedAsns[0] ? orphanSortedAsns[0].asnId : '',
                        extraAsnCount: Math.max(0, orphanSortedAsns.length - 1),
                    };

                    // Make sure the column exists so the orphan cell can render.
                    if (!opVersionsByLineId[slotLineId][opId]) {
                        const canonical = latestReleasedByOpId[opId] || opVer;
                        opVersionsByLineId[slotLineId][opId] = {
                            operationId: opVer.operationId,
                            colKey: opId,
                            title: canonical.operationTitle || canonical.name || opVer.name,
                            station: canonical.station || station,
                            sequenceId: canonical.sequenceId || opVer.sequenceId,
                            photo: canonical.photo || opVer.photo,
                            expectedCycleSeconds: canonical.cycleSeconds || 0,
                            latestVersionLabel: canonical.versionLabel || '',
                            repeatsLatest: 1,
                            medianActualSeconds: 0,
                        };
                    }
                }

                // ---- Warning pass: walk every cell and surface VMR-vs-actual mismatches ----
                for (const key of Object.keys(cellMap)) {
                    const c = cellMap[key];
                    const expected = expectedByOpId[c.operationId];
                    const actual = actualByOpId[c.operationId];
                    const reasons = [];

                    if (!expected && actual) {
                        // Orphan — entire op isn't in VMR.
                        const labels = [...actual.opVerIds].map(labelFor).join(', ');
                        reasons.push(`Orphan: ${actual.sessions.length} ASN${actual.sessions.length !== 1 ? 's' : ''} at ${labels} but operation isn't in this build's VMR`);
                    } else if (expected) {
                        const expectedLabels = [...expected.opVerIds].map(labelFor).join(', ');

                        if (!actual) {
                            // No ASNs at all for an expected op.
                            reasons.push(`Missing: 0 of ${expected.repeats} ASN${expected.repeats !== 1 ? 's' : ''} at ${expectedLabels}`);
                        } else {
                            // Wrong version — any ASN whose op-version isn't in the expected set.
                            const wrongIds = [...actual.opVerIds].filter(id => !expected.opVerIds.has(id));
                            if (wrongIds.length > 0) {
                                reasons.push(`Wrong version: ASN at ${wrongIds.map(labelFor).join(', ')} (expected ${expectedLabels})`);
                            }
                            // Wrong count — only check when not goods-complete (completed builds may
                            // legitimately have ASNs trimmed/added by ops upstream of this dashboard).
                            if (!isCompleted && actual.sessions.length !== expected.repeats) {
                                reasons.push(`Wrong count: ${actual.sessions.length} ASN${actual.sessions.length !== 1 ? 's' : ''} (expected ${expected.repeats})`);
                            }
                        }
                    }

                    c.warning = reasons.length > 0 ? reasons : null;
                }

                // slotId comes back as "<number>-<line name>"; show only the number portion.
                const slotLineName = linesById[slotLineId]?.name || '';
                let slotLabel = slotId;
                if (slotLineName && slotLabel.endsWith(`-${slotLineName}`)) {
                    slotLabel = slotLabel.slice(0, -slotLineName.length - 1);
                } else if (slotLabel.includes('-')) {
                    slotLabel = slotLabel.split('-')[0];
                }

                const slotNum = parseInt(slotLabel, 10);
                if (isAssembling && Number.isFinite(slotNum)) {
                    if (!inProgressNumbersByLineId[slotLineId]) inProgressNumbersByLineId[slotLineId] = [];
                    inProgressNumbersByLineId[slotLineId].push(slotNum);
                }

                // Computed progress: ASN-derived for in-progress; trust build.progress otherwise.
                const matrixProgress = totalNeeded > 0 ? (totalCompleted / totalNeeded) : 0;
                const buildProgress = typeof build.progress === 'number' ? build.progress : 0;
                const progress = isCompleted ? 1 : (isAssembling ? matrixProgress : buildProgress);

                slotsByLineId[slotLineId].push({
                    slotId,
                    slotLabel,
                    slotNum,
                    jobId: build.buildId,
                    buildId: build.id,
                    nickname: build.nickname,
                    cells: cellMap,
                    progress,
                    goodsStatus: build.goodsStatus,
                    variantMfgRelease: build.variantMfgRelease,
                    isCompleted,
                    isAssembling,
                });
            }
        }

        // Filter each line's slot list to the in-progress range (earliest to latest in-progress slot number,
        // including all slots in between regardless of build status). If no in-progress slots, show nothing.
        for (const lineId of Object.keys(slotsByLineId)) {
            const inProgNums = inProgressNumbersByLineId[lineId];
            if (!inProgNums || inProgNums.length === 0) {
                slotsByLineId[lineId] = [];
                continue;
            }
            const minN = Math.min(...inProgNums);
            const maxN = Math.max(...inProgNums);
            slotsByLineId[lineId] = slotsByLineId[lineId].filter(s =>
                Number.isFinite(s.slotNum) && s.slotNum >= minN && s.slotNum <= maxN
            );
        }

        // ---- Per-line post-filter pass: repeats (from latest progressed slot's VMR) and
        // median actual cycle time per op column (across visible slots only). ----
        const median = (arr) => {
            if (!arr || arr.length === 0) return 0;
            const sorted = arr.slice().sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        };
        for (const lineId of Object.keys(slotsByLineId)) {
            const visibleSlots = slotsByLineId[lineId];
            const opMap = opVersionsByLineId[lineId] || {};
            if (!visibleSlots || visibleSlots.length === 0) continue;

            // Median actual seconds across visible cells, per op column.
            const secondsByCol = {};
            for (const slot of visibleSlots) {
                for (const cellKey of Object.keys(slot.cells || {})) {
                    const cell = slot.cells[cellKey];
                    const list = cell._completedSecondsList;
                    if (!list || list.length === 0) continue;
                    if (!secondsByCol[cell.operationId]) secondsByCol[cell.operationId] = [];
                    for (const s of list) secondsByCol[cell.operationId].push(s);
                }
            }
            for (const col of Object.values(opMap)) {
                col.medianActualSeconds = median(secondsByCol[col.colKey] || []);
            }

            // Repeats from the latest in-progress (progress > 0) slot's VMR.
            let latestProgressedSlot = null;
            for (const s of visibleSlots) {
                if ((s.progress || 0) > 0
                    && (!latestProgressedSlot || (s.slotNum || 0) > (latestProgressedSlot.slotNum || 0))) {
                    latestProgressedSlot = s;
                }
            }
            if (latestProgressedSlot && latestProgressedSlot.variantMfgRelease) {
                const configsForVmr = variantConfigs.filter(
                    vc => vc.vmrName === latestProgressedSlot.variantMfgRelease,
                );
                const repeatsByColId = {};
                for (const vc of configsForVmr) {
                    const opVer = opVersionsById[vc.opVersionId];
                    if (!opVer) continue;
                    const colId = opVer.operationId || `unlinked::${opVer.id}`;
                    repeatsByColId[colId] = (repeatsByColId[colId] || 0) + (vc.repeats || 1);
                }
                for (const col of Object.values(opMap)) {
                    col.repeatsLatest = repeatsByColId[col.colKey] || 1;
                }
            }

            // Drop the private per-session bag now that median is computed.
            for (const slot of visibleSlots) {
                for (const cellKey of Object.keys(slot.cells || {})) {
                    delete slot.cells[cellKey]._completedSecondsList;
                }
            }
        }

        // Step 2: build lineColumns — group op-versions by station, sort.
        const lineColumns = [];
        const lineMatrixRows = [];

        for (const lineId of Object.keys(slotsByLineId)) {
            const line = linesById[lineId];
            if (!line) continue;
            if ((slotsByLineId[lineId] || []).length === 0) continue;

            const opMap = opVersionsByLineId[lineId] || {};
            const opsByStation = {};
            for (const op of Object.values(opMap)) {
                if (!opsByStation[op.station]) opsByStation[op.station] = [];
                opsByStation[op.station].push(op);
            }

            const stationGroups = Object.keys(opsByStation).map(stationTitle => {
                // Ops within a station: sort ascending by sequenceId of the latest released
                // op-version (sequenceId is already canonicalised on each column at seeding).
                const ops = opsByStation[stationTitle].slice().sort((a, b) => {
                    const aSeq = parseFloat(a.sequenceId);
                    const bSeq = parseFloat(b.sequenceId);
                    const aValid = Number.isFinite(aSeq);
                    const bValid = Number.isFinite(bSeq);
                    if (aValid && bValid && aSeq !== bSeq) return aSeq - bSeq;
                    if (aValid && !bValid) return -1;
                    if (!aValid && bValid) return 1;
                    return (a.title || '').localeCompare(b.title || '');
                });
                const areaId = areaIdByStationTitle[stationTitle] || null;
                const area = areaId ? areaById[areaId] : null;
                return {
                    stationTitle,
                    opVersions: ops, // each item: {colKey, operationId, title, photo, sequenceId, station}
                    areaId,
                    areaTitle: area ? area.title : '',
                };
            });

            // Stations are ordered by the production flow — numeric station number (STN-10 → 20 →
            // 30 → 40 → 50 → 60 → 70 → 80 → 100 → 110). Area is NOT a sort key because areas span
            // non-contiguous stations (e.g. Refrigeration owns STN-10/20/30/50 with STN-40 Battery
            // Pack in between). Area is surfaced separately via row-tint + inline badge on each
            // station banner — see Matrix.js.
            stationGroups.sort((a, b) =>
                (a.stationTitle || '').localeCompare(b.stationTitle || '', undefined, {numeric: true})
            );

            // areaGroups powers the AreaStrip leader cards above the matrix. Build it from the
            // unique areas that have at least one station (NOT from contiguous runs in
            // stationGroups, which no longer exist after the numeric-station sort).
            const seenAreaIds = new Set();
            const areaGroups = [];
            for (const sg of stationGroups) {
                if (sg.areaId === null || seenAreaIds.has(sg.areaId)) continue;
                seenAreaIds.add(sg.areaId);
                const area = areaById[sg.areaId];
                if (!area) continue;
                areaGroups.push({
                    areaId: sg.areaId,
                    areaTitle: area.title,
                    leaders: area.leaders,
                    stations: stationGroups.filter(s => s.areaId === sg.areaId),
                });
            }
            // Sort area cards alphabetically (cosmetic — independent of the matrix row order).
            areaGroups.sort((a, b) =>
                (a.areaTitle || '').localeCompare(b.areaTitle || '', undefined, {numeric: true})
            );

            // Assign a stable colour-palette index to each area by alphabetical order.
            // Hashing area titles caused collisions (Battery Pack & Electrical and Refrigeration
            // and Covers both landed on palette[0]), so adjacent areas in the matrix looked the
            // same. Indexing by sorted position guarantees distinct adjacent colours when the
            // palette has enough slots.
            const areaColorIndexByTitle = {};
            areaGroups.forEach((ag, i) => { areaColorIndexByTitle[ag.areaTitle] = i; });
            for (const sg of stationGroups) {
                sg.areaColorIndex = areaColorIndexByTitle[sg.areaTitle] ?? 0;
            }

            lineColumns.push({
                lineId,
                lineName: line.name,
                stations: stationGroups,
                areaGroups,
            });

            // Sort by parsed slotNum (numeric) so the visible slots run 0159, 0160, … 0193
            // regardless of zero-padding differences. Falls back to slotId string compare
            // when slotNum is NaN (non-numeric slot ID).
            const slots = slotsByLineId[lineId].slice().sort((a, b) => {
                const an = Number.isFinite(a.slotNum) ? a.slotNum : Number.POSITIVE_INFINITY;
                const bn = Number.isFinite(b.slotNum) ? b.slotNum : Number.POSITIVE_INFINITY;
                if (an !== bn) return an - bn;
                return (a.slotId || '').localeCompare(b.slotId || '');
            });
            lineMatrixRows.push({lineId, slots});
        }

        // Sort lines by name for stable display order.
        lineColumns.sort((a, b) => (a.lineName || '').localeCompare(b.lineName || ''));
        lineMatrixRows.sort((a, b) => {
            const an = (linesById[a.lineId]?.name) || '';
            const bn = (linesById[b.lineId]?.name) || '';
            return an.localeCompare(bn);
        });

        // --- Compute metrics ---
        const stationCycleTimes = {};
        for (const s of stations) {
            const completed = completedSessionsByStation[s.title] || [];
            if (completed.length > 0) {
                const avg = completed.reduce((sum, c) => sum + c.actualTimeHrs, 0) / completed.length;
                stationCycleTimes[s.title] = avg;
            }
        }

        const lineBalancePct = computeLineBalance(Object.values(stationCycleTimes));
        const bottleneckStation = findBottleneck(stationCycleTimes);

        const activeRates = allSessions
            .filter(s => s.status === ASN_STATUS.IN_PROGRESS && s.actualTimeHrs > 0 && s.progress > 0)
            .map(s => s.productionRatePct);
        const avgProductionRate = activeRates.length > 0
            ? activeRates.reduce((a, b) => a + b, 0) / activeRates.length
            : 0;

        // --- Direct assembly filter from Timesheets (active timesheet with Direct Assembly Cost checkbox ticked) ---
        const directAssemblyTeamIds = new Set();
        let timesheetSeen = false;
        if (timesheetsTable) {
            for (const r of timesheetRecords) {
                const status = safeStr(r, FIELDS.TIMESHEET.STATUS);
                if (status !== CHECKIN_STATUS.CHECKED_IN) continue;
                timesheetSeen = true;
                let isDirect = false;
                try {
                    isDirect = !!r.getCellValue(FIELDS.TIMESHEET.DIRECT_ASSEMBLY_COST);
                } catch { /* field not exposed in interface */ }
                if (!isDirect) continue;
                const peopleLinks = safeLink(r, FIELDS.TIMESHEET.PEOPLE);
                for (const p of peopleLinks) directAssemblyTeamIds.add(p.id);
            }
        }

        const directAssemblyTeam = timesheetSeen
            ? teamMembers.filter(m => directAssemblyTeamIds.has(m.id))
            : teamMembers;
        const attendance = computeAttendance(directAssemblyTeam);

        // --- Andon alerts: one entry per Assembly Session currently flagged as andon ---
        // Source-of-truth is the session itself (Status=Paused + Andon Flag=Andon), not the
        // Production Breaks table. AreaBanners + the Andons KPI card consume this list.
        const andonAlerts = [];
        for (const session of allSessions) {
            if (!session.hasAndon) continue;
            const sessionOpVer = session.opVerId ? opVersionsById[session.opVerId] : null;
            andonAlerts.push({
                id: session.id,
                station: session.station,
                cause: session.andonCause,
                start: session.andonStart,
                buildName: session.buildName,
                techName: session.techName,
                techPicture: session.techPicture,
                areaId: areaIdByStationTitle[session.station] || null,
                lineName: lineNameByStationTitle[session.station] || null,
                opVerId: session.opVerId || null,
                opVerName: sessionOpVer ? sessionOpVer.name : '',
                opVerPhoto: sessionOpVer ? sessionOpVer.photo : null,
                // AreaBanners.Thumb reads `thumbnail` — for andons it's the op-version
                // photo, falling back to the operator's profile picture.
                thumbnail: (sessionOpVer && sessionOpVer.photo) || session.techPicture || null,
            });
        }

        // --- Open defects, grouped per area via the Op Version → Station → Area lookup ----
        // Defect.Operation Version is a free-text field holding the op-version NAME, so we
        // map name → op-version once. Defects whose op-version doesn't resolve to a known
        // active station land with areaId=null (rendered in the Unassigned card).
        const opVersionByName = {};
        for (const ov of Object.values(opVersionsById)) {
            if (ov.name) opVersionByName[ov.name] = ov;
        }
        const openDefects = [];
        if (defectsTable) {
            for (const r of defectRecords) {
                const status = safeStr(r, FIELDS.DEFECT.STATUS);
                if (status !== DEFECT_STATUS.IN_PROGRESS) continue;
                const opVerName = safeStr(r, FIELDS.DEFECT.OPERATION_VERSION);
                const opVer = opVerName ? opVersionByName[opVerName] : null;
                const station = opVer ? opVer.station : '';
                const areaId = station ? (areaIdByStationTitle[station] || null) : null;
                const buildLinks = safeLink(r, FIELDS.DEFECT.BUILD);
                const buildId = buildLinks.length > 0 ? buildLinks[0].id : null;
                const build = buildId ? buildsById[buildId] : null;
                const thumbnail = safeAttachment(r, FIELDS.DEFECT.ATTACHMENTS)
                    || (opVer ? opVer.photo : null);
                openDefects.push({
                    id: r.id,
                    observation: safeStr(r, FIELDS.DEFECT.OBSERVATION),
                    type: safeStr(r, FIELDS.DEFECT.TYPE),
                    part: safeStr(r, FIELDS.DEFECT.PART),
                    step: safeStr(r, FIELDS.DEFECT.STEP),
                    opVerName,
                    station,
                    areaId,
                    lineName: station ? (lineNameByStationTitle[station] || null) : null,
                    buildJobId: build ? build.buildId : '',
                    buildNickname: build ? build.nickname : '',
                    thumbnail,
                    createdAt: safeStr(r, FIELDS.DEFECT.CREATED),
                });
            }
            // Newest defects first.
            openDefects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        }

        // ---- Settings: ordered list of {variable, value, description, recordId} ----
        // Used by the SettingsPopover to render editable rows. Keeps original Airtable
        // ordering so the user sees them in the order they were created.
        const settings = [];
        if (settingsTable) {
            for (const r of settingsRecords) {
                const variable = safeStr(r, FIELDS.SETTING.VARIABLE);
                if (!variable) continue;
                settings.push({
                    recordId: r.id,
                    variable,
                    value: safeStr(r, FIELDS.SETTING.VALUE),
                    description: safeStr(r, FIELDS.SETTING.DESCRIPTION),
                });
            }
        }

        return {
            stations,
            lineColumns,
            lineMatrixRows,
            areas,
            builds,
            activeBuilds,
            andonAlerts,
            teamMembers,
            metrics: {
                wipCount,
                completedToday,
                lineBalancePct: Math.round(lineBalancePct),
                bottleneckStation,
                avgProductionRate: Math.round(avgProductionRate * 10) / 10,
                attendance,
            },
            settings,
            settingsTable, // exposed so the popover can call updateRecordAsync
            openDefects,
            isLoading: false,
        };
    }, [
        sessionRecords, buildRecords, vmrRecords, vconfigRecords,
        stationRecords, lineRecords, areaRecords, opVersionRecords, teamRecords,
        buildSlotRecords, timesheetRecords, settingsRecords, defectRecords,
    ]);
}
