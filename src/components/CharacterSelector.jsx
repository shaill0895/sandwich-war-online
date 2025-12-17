import React from 'react';
import { CHARACTERS } from '../game/constants';

export function CharacterSelector({ userLevel, selectedChar, onSelect }) {
    // Unlock thresholds
    const getUnlockLevel = (id) => {
        if (id === 'mecha') return 15;
        if (id === 'crust') return 30;
        if (id === 'galactic') return 45;
        return 0; // Others free
    };

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
            maxHeight: '400px', overflowY: 'auto', padding: '10px'
        }}>
            {CHARACTERS.map(char => {
                const requiredLevel = getUnlockLevel(char.id);
                const isLocked = userLevel < requiredLevel;
                const isSelected = selectedChar === char.id;

                return (
                    <div key={char.id}
                        onClick={() => !isLocked && onSelect(char.id)}
                        style={{
                            background: isLocked ? '#333' : (isSelected ? '#007BFF' : 'rgba(255,255,255,0.1)'),
                            border: isSelected ? '2px solid #FFF' : '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            padding: '10px',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.5 : 1,
                            position: 'relative'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: char.color }}>{char.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#BBB' }}>Ult: {char.ult}</div>

                        {isLocked && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(0,0,0,0.6)', color: '#FF4500', fontWeight: 'bold'
                            }}>
                                LOCK (Lvl {requiredLevel})
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
