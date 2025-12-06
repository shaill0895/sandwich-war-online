import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { CONFIG } from '../game/constants';
import { supabase } from '../lib/supabase';
import { TouchControls } from './TouchControls';
import { Chat } from './Chat';

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

                // Collect characters
                const playerChars = {};
                users.forEach((uid, idx) => {
                    // state[uid] is array of presence objects (one per device/tab)
                    const pres = state[uid][0];
                    playerChars[`p${idx + 1}`] = pres.char || 'austin';
                });

                // Update Engine if Host
                if (isHost.current && engineRef.current) {
                    engineRef.current.updateRoster(playerChars);
                }

                if (myIndex === 0) {
                    isHost.current = true;
                    myRole.current = 1;
                    setStatus(`HOST (P1) as ${playerChars.p1?.toUpperCase()}`);
                } else if (myIndex === 1) {
                    isHost.current = false;
                    myRole.current = 2;
                    setStatus(`CLIENT (P2) as ${playerChars.p2?.toUpperCase()}`);
                } else if (myIndex === 2) {
                    isHost.current = false;
                    myRole.current = 3;
                    setStatus(`CLIENT (P3) as ${playerChars.p3?.toUpperCase()}`);
                } else if (myIndex === 3) {
                    isHost.current = false;
                    myRole.current = 4;
                    setStatus(`CLIENT (P4) as ${playerChars.p4?.toUpperCase()}`);
                } else {
                    isHost.current = false;
                    myRole.current = -1; // Spectator?
                    setStatus('SPECTATOR (LOBBY FULL)');
                }
            })
            .on('broadcast', { event: 'gameState' }, ({ payload }) => {
                if (!isHost.current) {
                    lastState.current = payload;
                }
            })
            .on('broadcast', { event: 'input' }, ({ payload }) => {
                if (isHost.current) {
                    // payload is { role: number, input: object }
                    if (!remoteInputs.current) remoteInputs.current = {};
                    remoteInputs.current[`p${payload.role}`] = payload.input;
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        char: selectedChar
                    });
                }
            });

        channelRef.current = channel;

        // --- Resize ---
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            // Resize canvas to physical pixels
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            // Style stays in CSS pixels
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';

            // Normalize context to CSS pixels
            ctx.scale(dpr, dpr);
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
                fire: k['KeyF'] || t.fire,
                dash: k['ShiftRight'] || k['ShiftLeft'] || k['KeyK'] || t.dash,
                ult: k['KeyV'] || k['KeyO'] || t.ult,
                jump: k['Space'] || k['KeyJ'] || t.jump
            };

            if (isHost.current) {
                // Host Logic
                const currentRemote = remoteInputs.current || {};
                const inputs = {
                    p1: myRole.current === 1 ? myInput : (currentRemote.p1 || {}),
                    p2: myRole.current === 2 ? myInput : (currentRemote.p2 || {}),
                    p3: myRole.current === 3 ? myInput : (currentRemote.p3 || {}),
                    p4: myRole.current === 4 ? myInput : (currentRemote.p4 || {})
                };

                engineRef.current.update(dt, inputs);

                // Broadcast State
                channel.send({
                    type: 'broadcast',
                    event: 'gameState',
                    payload: engineRef.current.getState()
                });
            } else {
                // Client Logic w/ Role
                if (myRole.current !== -1) {
                    channel.send({
                        type: 'broadcast',
                        event: 'input',
                        payload: { role: myRole.current, input: myInput }
                    });
                }

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
            <canvas
                ref={canvasRef}
                style={{ display: 'block', touchAction: 'none', position: 'absolute', top: 0, left: 0 }}
            />

            {/* HUD / Status Overlay */}
            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'Arial', pointerEvents: 'none', zIndex: 10 }}>
                <h2 style={{ margin: 0, textShadow: '2px 2px 0 #000' }}>ROOM: {roomId}</h2>
                <div style={{ fontSize: '1.2rem', color: isHost.current ? '#00FF00' : '#00FFFF' }}>{status}</div>
            </div>

            {/* Chat Overlay (Bottom Left) */}
            <Chat roomId={roomId} style={{
                position: 'absolute', bottom: '100px', left: '20px', width: '300px', height: '200px',
                zIndex: 30
            }} />

            <TouchControls onInput={handleTouchInput} />
        </div>
    );
}
