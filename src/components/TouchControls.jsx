import React from 'react';
import { Joystick } from 'react-joystick-component';

export function TouchControls({ onInput }) {
    const handleMove = (event) => {
        // event.direction = "FORWARD", "RIGHT", etc.
        // event.x, event.y are coordinates
        // We need to map this to up/down/left/right booleans
        const input = {
            up: event.y > 20,
            down: event.y < -20,
            left: event.x < -20,
            right: event.x > 20
        };
        onInput(input);
    };

    const handleStop = () => {
        onInput({ up: false, down: false, left: false, right: false });
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none', // Let clicks pass through to canvas if needed, but controls need pointer events
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            padding: '20px', boxSizing: 'border-box', zIndex: 10
        }}>
            {/* Joystick Area */}
            <div style={{ pointerEvents: 'auto', opacity: 0.7 }}>
                <Joystick
                    size={100}
                    sticky={false}
                    baseColor="#444"
                    stickColor="#888"
                    move={handleMove}
                    stop={handleStop}
                />
            </div>

            {/* Action Buttons */}
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: '20px', paddingBottom: '20px' }}>
                <button
                    onTouchStart={() => onInput({ fire: true })}
                    onTouchEnd={() => onInput({ fire: false })}
                    onMouseDown={() => onInput({ fire: true })}
                    onMouseUp={() => onInput({ fire: false })}
                    style={btnStyle('#FF4500')}
                >
                    F
                </button>
                <button
                    onTouchStart={() => onInput({ dash: true })}
                    onTouchEnd={() => onInput({ dash: false })}
                    onMouseDown={() => onInput({ dash: true })}
                    onMouseUp={() => onInput({ dash: false })}
                    style={btnStyle('#FFFF00')}
                >
                    D
                </button>
                <button
                    onTouchStart={() => onInput({ jump: true })}
                    onTouchEnd={() => onInput({ jump: false })}
                    onMouseDown={() => onInput({ jump: true })}
                    onMouseUp={() => onInput({ jump: false })}
                    style={btnStyle('#00BFFF')}
                >
                    J
                </button>
                <button
                    onTouchStart={() => onInput({ ult: true })}
                    onTouchEnd={() => onInput({ ult: false })}
                    onMouseDown={() => onInput({ ult: true })}
                    onMouseUp={() => onInput({ ult: false })}
                    style={btnStyle('#FF00FF')}
                >
                    U
                </button>
            </div>
        </div>
    );
}

const btnStyle = (color) => ({
    width: '60px', height: '60px', borderRadius: '50%',
    background: color, border: '2px solid white',
    color: 'white', fontWeight: 'bold', fontSize: '20px',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    userSelect: 'none', touchAction: 'none'
});
