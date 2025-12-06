import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

export function Chat({ roomId, style }) {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const containerRef = useRef(null);

    // Filter list
    const badWords = ['bad', 'fudge', 'mean'];

    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`chat:${roomId}`)
            .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
                setMessages(prev => [...prev, payload]);
                scrollToBottom();
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [roomId]);

    const scrollToBottom = () => {
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        let cleanText = input;
        badWords.forEach(word => {
            const regex = new RegExp(word, "gi");
            cleanText = cleanText.replace(regex, "****");
        });

        const msg = {
            id: Date.now(),
            user: profile?.username || user?.email?.split('@')[0] || 'Guest',
            text: cleanText,
            color: profile?.level > 10 ? '#FFD700' : '#FFF' // Gold color for vets
        };

        // Optimistic update
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
        setInput('');

        await supabase.channel(`chat:${roomId}`).send({
            type: 'broadcast',
            event: 'chat_message',
            payload: msg
        });
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            ...style
        }}>
            <div ref={containerRef} style={{
                flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
                {messages.map(m => (
                    <div key={m.id} style={{ fontSize: '0.9rem', color: '#EEE', wordBreak: 'break-word' }}>
                        <span style={{ fontWeight: 'bold', color: m.color, marginRight: '6px' }}>{m.user}:</span>
                        {m.text}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <input
                    style={{
                        flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '8px', outline: 'none'
                    }}
                    placeholder="Chat..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                    onClick={sendMessage}
                    style={{
                        background: '#007BFF', border: 'none', color: 'white', padding: '0 12px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    SEND
                </button>
            </div>
        </div>
    );
}
