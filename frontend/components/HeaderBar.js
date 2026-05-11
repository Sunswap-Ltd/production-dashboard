import React, {useState, useEffect} from 'react';
import {header, COLOURS} from '../styles';
import {formatTime, formatDate} from '../engine/helpers';

export default function HeaderBar({lineNames = [], selectedLine, onSelectLine}) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(id);
    }, []);

    const titleText = selectedLine || 'Production Dashboard';

    return (
        <>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <span style={header.title}>{titleText}</span>
                {lineNames.length > 1 && (
                    <select
                        value={selectedLine || ''}
                        onChange={e => onSelectLine && onSelectLine(e.target.value)}
                        title="Switch line"
                        style={{
                            background: 'transparent',
                            color: COLOURS.frost,
                            border: `1px solid ${COLOURS.road}`,
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            fontFamily: "'Arbeit', Arial, Helvetica, Calibri, sans-serif",
                            fontWeight: 500,
                            cursor: 'pointer',
                            outline: 'none',
                        }}
                    >
                        {lineNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                )}
            </div>
            <div style={header.right}>
                <span style={header.clock}>{formatTime(now)}</span>
                <span style={header.date}>{formatDate(now)}</span>
            </div>
        </>
    );
}
