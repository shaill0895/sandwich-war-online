import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

export function Lobby({ onJoin }) {
    const [roomId, setRoomId] = useState('');
    const { user, profile, signIn, signUp, signOut } = useAuth();
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    const createRoom = () => {
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomId(id);
        setIsHost(true);
        setLobbyState('STAGING');
    };

    const joinRoom = () => {
        if (roomId.trim()) {
            setRoomId(roomId.trim().toUpperCase());
            setIsHost(false);
            setLobbyState('STAGING');
        }
    };

    const updateName = async () => {
        if (!newName.trim() || !user) return;
        const { error } = await supabase.from('profiles').update({ username: newName.trim() }).eq('id', user.id);
        if (!error) {
            setIsEditingName(false);
            // Ideally trigger a refresh of profile, but assuming realtime or simple reload for now.
            // AuthContext might need a refreshProfile method exposed or we just wait.
            // Simple hack: window.location.reload() or we just accept prompt.
            // Better: update local profile state via re-fetch or optimistically?
            // AuthContext doesn't expose setProfile. Let's just create a quick local update if success.
            window.location.reload();
        }
    };

    const startEditing = () => {
        setNewName(profile?.username || '');
        setIsEditingName(true);
    };

    import { Leaderboard } from './Leaderboard';

    // ... (inside component)
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100vh', width: '100vw',
            background: 'radial-gradient(circle at 50% 50%, #2a2a2a 0%, #000 100%)',
            position: 'relative' // For absolute positioning if needed
        }}>
            {/* Main Container: Flex Row to put Lobby on left, Leaderboard on right */}
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>

                {/* LEFT: Game Controls */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', minWidth: '400px' }}>
                    <h1 className="title-text">SANDWICH WAR</h1>
                    {/* ... (Existing Auth/Join logic) ... */}


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>

                        {/* Auth Section */}
                        {!user ? (
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input className="input-field" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                                    <input className="input-field" type="password" placeholder="Pass" value={pass} onChange={e => setPass(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => signIn(email, pass)}>LOGIN</button>
                                    <button className="btn" style={{ flex: 1, fontSize: '0.8rem', background: '#444' }} onClick={() => signUp(email, pass, email.split('@')[0])}>SIGN UP</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#00FF00' }}>
                                {isEditingName ? (
                                    <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                        <input
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="input-field"
                                            style={{ padding: '2px 5px', textAlign: 'center' }}
                                        />
                                        <button className="btn" onClick={updateName} style={{ padding: '2px 8px', background: '#007BFF' }}>OK</button>
                                        <button className="btn" onClick={() => setIsEditingName(false)} style={{ padding: '2px 8px', background: '#444' }}>X</button>
                                    </div>
                                ) : (
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }} onClick={startEditing} title="Click to Edit">
                                        {profile?.username || user.email} ✏️
                                    </div>
                                )}

                                <span style={{ color: '#FFD700', fontSize: '0.9rem' }}>LVL {profile?.level || 1} • {profile?.wins || 0} WINS</span>
                                <br />
                                <button className="btn" style={{ fontSize: '0.7rem', padding: '2px 8px', marginTop: '10px' }} onClick={signOut}>LOGOUT</button>
                            </div>
                        )}

                        <button className="btn btn-primary" onClick={createRoom}>
                            CREATE NEW WAR
                        </button>



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

                        {/* Lobby Chat Preview or Global Room? */}
                        {/* For now, maybe just show it if roomId is typed? Or better, a Global Lobby Chat if strict room mode is not enforcing isolation yet. */}
                        {/* Actually, let's put it on the side if screen is wide enough or below */}
                    </div>
                </div>

                {/* Simple footer or global chat toggle could go here, but let's keep lobby clean for now. 
                 The user asked for "Lobby & In-Game". 
                 In-Lobby chat usually implies a specific room lobby. 
                 Since we jump straight from "Enter ID" to "GameCanvas", the GameCanvas IS the room lobby. 
                 So Chat should be primarily in GameCanvas.
                 But if we want a "Global General Chat", we can put it here.
                 Let's stick to GameCanvas for Room Chat as that makes more sense for "Lobby" in this context where Lobby = Match Setup.
                 Actually existing Lobby component is just the "Entry Screen".
                 So I will put chat in GameCanvas.
              */}

                <div style={{ marginTop: '2rem', color: '#444', fontSize: '0.8rem' }}>
                    JJ MOBILE OPERATIONS
                </div>
            </div>
            );
}
