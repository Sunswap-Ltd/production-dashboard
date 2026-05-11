import React from 'react';
import {COLOURS} from '../styles';

export default function FooterBar({attendance, andonCount}) {
    const {available} = attendance;
    return (
        <>
            <div>
                <span style={{color: COLOURS.textDim}}>Available: </span>
                {available.length > 0
                    ? available.map(m => m.name.split(' ')[0]).join(', ')
                    : <span style={{color: COLOURS.textDim}}>none</span>
                }
            </div>
            <div>
                <span style={{color: andonCount > 0 ? COLOURS.red : COLOURS.textDim}}>
                    Andons: {andonCount} active
                </span>
            </div>
        </>
    );
}
