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
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: '15px', paddingBottom: '30px', paddingRight: '10px' }}>
                <div style={colStyle}>
                    <button
                        onTouchStart={() => onInput({ fire: true })}
                        onTouchEnd={() => onInput({ fire: false })}
                        onMouseDown={() => onInput({ fire: true })}
                        onMouseUp={() => onInput({ fire: false })}
                        style={btnStyle('#FF4500', 'FIRE')}
                    >
                        F
                    </button>
                    <button
                        onTouchStart={() => onInput({ jump: true })}
                        onTouchEnd={() => onInput({ jump: false })}
                        onMouseDown={() => onInput({ jump: true })}
                        onMouseUp={() => onInput({ jump: false })}
                        style={{ ...btnStyle('#00BFFF', 'JUMP'), marginTop: '10px' }}
                    >
                        J
                    </button>
                </div>

                <div style={colStyle}>
                    <button
                        onTouchStart={() => onInput({ dash: true })}
                        onTouchEnd={() => onInput({ dash: false })}
                        onMouseDown={() => onInput({ dash: true })}
                        onMouseUp={() => onInput({ dash: false })}
                        style={btnStyle('#FFFF00', 'DASH')}
                    >
                        D
                    </button>
                    <button
                        onTouchStart={() => onInput({ ult: true })}
                        onTouchEnd={() => onInput({ ult: false })}
                        onMouseDown={() => onInput({ ult: true })}
                        onMouseUp={() => onInput({ ult: false })}
                        style={{ ...btnStyle('#FF00FF', 'ULT'), marginTop: '10px' }}
                    >
                        U
                    </button>
                </div>
            </div>
        </div>
    );
}

const colStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center'
};

const btnStyle = (color) => ({
    width: '75px', height: '75px', borderRadius: '50%',
    background: color, border: '3px solid rgba(255,255,255,0.8)',
    color: 'white', fontWeight: 'bold', fontSize: '24px',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    userSelect: 'none', touchAction: 'none',
    boxShadow: '0 4px 10px rgba(0,0,0,0.5)', opacity: 0.8
});
