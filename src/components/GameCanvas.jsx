import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { CONFIG } from '../game/constants';
import { supabase } from '../lib/supabase';
import { TouchControls } from './TouchControls';

export function GameCanvas({ roomId, playerId, onLeave }) {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const requestRef = useRef(null);
    const lastTimeRef = useRef(0);
    const keysRef = useRef({});
    const touchRef = useRef({
        up: false, down: false, left: false, right: false,
        fire: false, dash: false, ult: false, jump: false
    });

    // Multiplayer Refs
    const channelRef = useRef(null);
    const isHost = useRef(false);
    const myRole = useRef(0); // 1 = P1, 2 = P2
    const remoteInputs = useRef({});
    const lastState = useRef(null);

    const [status, setStatus] = useState('CONNECTING...');

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        engineRef.current = new GameEngine();
        engineRef.current.gameState = 'PLAYING';

        // --- Networking ---
        const channel = supabase.channel(`room:${roomId}`, {
            config: { presence: { key: playerId } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.keys(state).sort(); // Deterministic order
                const myIndex = users.indexOf(playerId);

                if (myIndex === 0) {
                    isHost.current = true;
                    myRole.current = 1;
                    setStatus('YOU ARE P1 (HOST)');
                } else {
                    isHost.current = false;
                    myRole.current = 2;
                    setStatus('YOU ARE P2 (CLIENT)');
                }
            })
            .on('broadcast', { event: 'gameState' }, ({ payload }) => {
                if (!isHost.current) {
                    lastState.current = payload;
                }
            })
            .on('broadcast', { event: 'input' }, ({ payload }) => {
                if (isHost.current) {
                    remoteInputs.current = payload;
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        channelRef.current = channel;

        // --- Resize ---
        const resize = () => {
            // Resize canvas to window, but game rendering handles resolution via camera
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
        };
        window.addEventListener('resize', resize);
        resize();

        // --- Input ---
        const handleKeyDown = (e) => { keysRef.current[e.code] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // --- Loop ---
        const loop = (timestamp) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const dt = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            // Gather Local Inputs (Merge Keyboard & Touch)
            const k = keysRef.current;
            const t = touchRef.current;

            const myInput = {
                up: k['ArrowUp'] || k['KeyW'] || t.up,
                down: k['ArrowDown'] || k['KeyS'] || t.down,
                left: k['ArrowLeft'] || k['KeyA'] || t.left,
                right: k['ArrowRight'] || k['KeyD'] || t.right,
                fire: k['Space'] || k['KeyF'] || t.fire,
                dash: k['ShiftRight'] || k['ShiftLeft'] || k['KeyK'] || t.dash,
                ult: k['KeyV'] || k['KeyO'] || t.ult,
                jump: k['Space'] || k['KeyJ'] || t.jump // Jump mapped to Space, J, or touch
            };

            // Note: If Fire and Jump are both on Space, Space will trigger both.
            // Let's refine: Fire on F, Jump on Space.
            if (k['Space']) myInput.fire = false; // Prefer Jump for Space if conflict?
            // Actually, let's keep Fire on F only for keyboard to avoid confusion.
            myInput.fire = k['KeyF'] || t.fire;
            // Stick to Space for Jump.

            if (isHost.current) {
                // Host Logic
                const inputs = {
                    p1: myRole.current === 1 ? myInput : (remoteInputs.current || {}),
                    p2: myRole.current === 2 ? myInput : (remoteInputs.current || {})
                };

                engineRef.current.update(dt, inputs);

                // Broadcast State
                channel.send({
                    type: 'broadcast',
                    event: 'gameState',
                    payload: engineRef.current.getState()
                });
            } else {
                // Client Logic
                channel.send({
                    type: 'broadcast',
                    event: 'input',
                    payload: myInput
                });

                if (lastState.current) {
                    engineRef.current.setState(lastState.current);
                }
            }

            engineRef.current.draw(ctx);
            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(requestRef.current);
            supabase.removeChannel(channel);
        };
    }, [roomId, playerId]);

    const handleTouchInput = (input) => {
        touchRef.current = { ...touchRef.current, ...input };
    };

    return (
        <div style={{
            width: '100vw', height: '100vh', background: '#222',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            overflow: 'hidden', position: 'relative'
        }}>
            <div style={{ color: 'white', marginBottom: '10px', fontFamily: 'monospace', position: 'absolute', top: 10, zIndex: 20 }}>
                ROOM: {roomId} | {status}
                <button onClick={onLeave} style={{ marginLeft: '20px' }}>LEAVE</button>
            </div>

            <TouchControls onInput={handleTouchInput} />

            <canvas ref={canvasRef} style={{ background: '#333', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} />
        </div>
    );
}
