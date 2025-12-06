import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function Leaderboard({ style }) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaders();
        // optionally subscribe to realtime updates, but leaderboard usually doesn't need to be instant
    }, []);

    const fetchLeaders = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username, wins, level')
                .order('wins', { ascending: false })
                .limit(10);

            if (error) console.error('Error fetching leaderboard:', error);
            else setLeaders(data || []);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid #FFD700',
            borderRadius: '8px',
            padding: '20px',
            color: 'white',
            width: '300px',
            ...style
        }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: '#FFD700', textShadow: '0 0 10px #FFD700' }}>
                GLOBAL RANKINGS
            </h3>

            {loading ? (
                <div style={{ textAlign: 'center' }}>Loading...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {leaders.map((p, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '5px',
                            background: i === 0 ? 'rgba(255,215,0,0.2)' : 'transparent',
                            borderRadius: '4px'
                        }}>
                            <span style={{ fontWeight: 'bold', color: i < 3 ? '#FFD700' : '#FFF' }}>
                                #{i + 1} {p.username || 'Unknown'}
                            </span>
                            <span style={{ color: '#AAA' }}>
                                Lvl {p.level} • <span style={{ color: '#00FF00' }}>{p.wins} Wins</span>
                            </span>
                        </div>
                    ))}
                    {leaders.length === 0 && <div style={{ textAlign: 'center', color: '#666' }}>No champions yet...</div>}
                </div>
            )}
        </div>
    );
}
