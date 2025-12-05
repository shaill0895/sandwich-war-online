import React, { useState } from 'react';

export function Lobby({ onJoin }) {
    const [roomId, setRoomId] = useState('');

    const createRoom = () => {
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        onJoin(id);
    };

    const joinRoom = () => {
        if (roomId.trim()) onJoin(roomId.trim().toUpperCase());
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100vh', width: '100vw',
            background: 'radial-gradient(circle at 50% 50%, #2a2a2a 0%, #000 100%)'
        }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', minWidth: '400px' }}>
                <h1 className="title-text">SANDWICH WAR</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                    <button className="btn btn-primary" onClick={createRoom}>
                        CREATE NEW WAR
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', flex: 1 }}></div>
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>OR JOIN</span>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', flex: 1 }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="ROOM ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button className="btn" onClick={joinRoom}>
                            JOIN
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2rem', color: '#444', fontSize: '0.8rem' }}>
                JJ MOBILE OPERATIONS
            </div>
        </div>
    );
}
