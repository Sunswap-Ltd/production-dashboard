import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import ReactDOM from 'react-dom';
import {COLOURS} from '../styles';
import {FIELDS} from '../engine/constants';

// Floating cog button (bottom-right of the dashboard) + portaled popover panel that
// lists every row from the Settings table with an editable input. Changes are written
// back via settingsTable.updateRecordAsync() so the source of truth stays in Airtable.
//
// settings: [{recordId, variable, value, description}, ...]
// settingsTable: Airtable Table object (or null if the table isn't in this base).

const COG_SIZE = 44;

function CogIcon({size = 22, colour = COLOURS.snow}) {
    // Minimal SVG gear — no external icon font, keeps the bundle clean.
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.43-1.5.99 1.95-2 3.46-2.15-.66a7.5 7.5 0 0 1-1.8 1.04l-.47 2.21H10l-.47-2.21a7.5 7.5 0 0 1-1.8-1.04l-2.15.66-2-3.46.99-1.95A7.6 7.6 0 0 1 4.5 12c0-.69.09-1.36.27-2L3.78 8.05l2-3.46 2.15.66a7.5 7.5 0 0 1 1.8-1.04L10.2 2h3.6l.47 2.21a7.5 7.5 0 0 1 1.8 1.04l2.15-.66 2 3.46-.99 1.95c.18.64.27 1.31.27 2s-.09 1.36-.27 2Z"
                stroke={colour}
                strokeWidth="1.4"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Logical order for the panel: shift bounds first, then each break as a Start→End pair.
// Anything we don't recognise sinks to the bottom (sorted by name) so adding a new
// setting later doesn't accidentally land mid-list.
function settingSortKey(variable) {
    if (variable === 'Shift Start') return [0, 0, 0];
    if (variable === 'Shift End') return [0, 1, 0];
    const m = /^Break (\d+) (Start|End)$/.exec(variable || '');
    if (m) return [1, parseInt(m[1], 10), m[2] === 'End' ? 1 : 0];
    return [9, 0, variable || ''];
}

function compareSettings(a, b) {
    const ka = settingSortKey(a.variable);
    const kb = settingSortKey(b.variable);
    for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1;
        if (ka[i] > kb[i]) return 1;
    }
    return 0;
}

function Row({setting, onSave, savingId, errorMessage}) {
    const [draft, setDraft] = useState(setting.value);
    const lastSavedRef = useRef(setting.value);

    // Reset draft when the underlying record changes externally.
    useEffect(() => {
        if (setting.value !== lastSavedRef.current) {
            setDraft(setting.value);
            lastSavedRef.current = setting.value;
        }
    }, [setting.value]);

    const dirty = draft !== setting.value;
    const saving = savingId === setting.recordId;
    const errored = !!errorMessage;

    const commit = useCallback(() => {
        if (!dirty || saving) return;
        lastSavedRef.current = draft;
        onSave(setting.recordId, draft);
    }, [draft, dirty, saving, setting.recordId, onSave]);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 130px',
            gap: 12,
            padding: '8px 0',
            borderBottom: `1px solid ${COLOURS.tarmac}`,
            alignItems: 'start',
        }}>
            <div style={{minWidth: 0}}>
                <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLOURS.snow,
                    letterSpacing: 0.3,
                }}>
                    {setting.variable}
                </div>
                {setting.description && (
                    <div style={{
                        fontSize: 10,
                        color: COLOURS.road,
                        marginTop: 2,
                        lineHeight: 1.35,
                    }}>
                        {setting.description}
                    </div>
                )}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 3}}>
                <input
                    type="text"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                        if (e.key === 'Escape') { setDraft(setting.value); e.currentTarget.blur(); }
                    }}
                    style={{
                        background: errored ? 'rgba(239,68,68,0.15)' : COLOURS.motorway,
                        color: COLOURS.snow,
                        border: `1px solid ${errored ? COLOURS.red : (dirty ? COLOURS.sol : COLOURS.tarmac)}`,
                        borderRadius: 4,
                        padding: '5px 8px',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                />
                <div
                    style={{
                        fontSize: 9,
                        color: errored ? COLOURS.red : (saving ? COLOURS.sol : (dirty ? COLOURS.sol : COLOURS.road)),
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        minHeight: 11,
                    }}
                    title={errored ? errorMessage : undefined}
                >
                    {errored ? 'save failed' : saving ? 'saving…' : dirty ? 'unsaved · enter to save' : ''}
                </div>
                {errored && (
                    <div style={{
                        fontSize: 9,
                        color: COLOURS.frost,
                        lineHeight: 1.35,
                        marginTop: 1,
                        textTransform: 'none',
                        letterSpacing: 0,
                        fontWeight: 400,
                    }}>
                        {errorMessage}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SettingsPopover({settings, settingsTable}) {
    const [open, setOpen] = useState(false);
    const [savingId, setSavingId] = useState(null);
    // recordId → human-readable error message. Cleared per-record on next attempt.
    const [errors, setErrors] = useState({});
    const panelRef = useRef(null);
    const sortedSettings = useMemo(
        () => settings.slice().sort(compareSettings),
        [settings],
    );

    // Close on click-outside or Escape.
    useEffect(() => {
        if (!open) return;
        const onDocClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const handleSave = useCallback(async (recordId, newValue) => {
        const clearError = () => setErrors(prev => {
            if (!(recordId in prev)) return prev;
            const next = {...prev}; delete next[recordId]; return next;
        });
        const setError = (msg) => setErrors(prev => ({...prev, [recordId]: msg}));

        if (!settingsTable) {
            setError('Settings table not exposed in this Interface. Enable the Settings table (and its Value field) in the Fields panel.');
            return;
        }
        // Permission pre-check: hasPermissionToUpdateRecord returns false fast when the
        // Value field isn't editable for this user in the Interface, before we burn an
        // API round-trip on a guaranteed failure.
        try {
            const fieldsToUpdate = {[FIELDS.SETTING.VALUE]: newValue};
            if (typeof settingsTable.hasPermissionToUpdateRecord === 'function'
                && !settingsTable.hasPermissionToUpdateRecord(recordId, fieldsToUpdate)) {
                setError('No write permission for the Value field. Enable editing on Settings → Value in the Interface\'s Fields panel.');
                return;
            }
        } catch { /* SDK without permission API — fall through to save attempt */ }

        clearError();
        setSavingId(recordId);
        try {
            await settingsTable.updateRecordAsync(recordId, {
                [FIELDS.SETTING.VALUE]: newValue,
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[SettingsPopover] save failed:', err);
            const msg = (err && err.message) || 'Unknown error. Check console for details.';
            setError(msg);
        } finally {
            setSavingId(null);
        }
    }, [settingsTable]);

    const button = (
        <button
            type="button"
            onClick={() => setOpen(v => !v)}
            title="Dashboard settings"
            aria-label="Dashboard settings"
            style={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                width: COG_SIZE,
                height: COG_SIZE,
                borderRadius: '50%',
                background: open ? COLOURS.sol : COLOURS.tarmac,
                border: `1px solid ${open ? COLOURS.sol : COLOURS.road}`,
                color: COLOURS.snow,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.55)',
                // Must outrank AreaBanners' thumbnail popover (9500) so opening the cog
                // panel can't be buried under a stray hover. OpTile popover (9999) stays
                // highest because it's modal to the matrix.
                zIndex: 9700,
                padding: 0,
                transition: 'background 120ms ease-out, transform 200ms ease-out',
                transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
        >
            <CogIcon size={22} colour={COLOURS.snow} />
        </button>
    );

    const panel = open ? (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                bottom: 16 + COG_SIZE + 10,
                left: 16,
                width: 380,
                maxHeight: 'min(70vh, 540px)',
                background: COLOURS.panelBg,
                border: `1px solid ${COLOURS.tarmac}`,
                borderRadius: 8,
                boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
                color: COLOURS.snow,
                // See cog z-index note above — panel sits 1 above its trigger.
                zIndex: 9701,
                overflow: 'hidden',
            }}
        >
            <div style={{
                padding: '12px 14px 10px',
                borderBottom: `1px solid ${COLOURS.tarmac}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLOURS.sol,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                }}>
                    Settings
                </span>
                <span style={{fontSize: 10, color: COLOURS.road}}>
                    {sortedSettings.length} {sortedSettings.length === 1 ? 'variable' : 'variables'}
                </span>
            </div>
            <div style={{
                padding: '4px 14px 14px',
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
            }}>
                {sortedSettings.length === 0 && (
                    <div style={{padding: '20px 0', fontSize: 11, color: COLOURS.road, textAlign: 'center'}}>
                        No settings rows found. Add a record to the <em>Settings</em> table in Airtable.
                    </div>
                )}
                {sortedSettings.map(s => (
                    <Row
                        key={s.recordId}
                        setting={s}
                        onSave={handleSave}
                        savingId={savingId}
                        errorMessage={errors[s.recordId]}
                    />
                ))}
                {!settingsTable && sortedSettings.length > 0 && (
                    <div style={{
                        marginTop: 10,
                        padding: 8,
                        background: 'rgba(239,68,68,0.1)',
                        border: `1px solid ${COLOURS.red}`,
                        borderRadius: 4,
                        fontSize: 10,
                        color: COLOURS.frost,
                        lineHeight: 1.4,
                    }}>
                        Settings table not exposed in this Airtable Interface. Enable the
                        <em> Settings</em> table (and its <em>Value</em> field) in the
                        Fields panel to allow edits.
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return ReactDOM.createPortal(
        <>
            {button}
            {panel}
        </>,
        document.body,
    );
}
