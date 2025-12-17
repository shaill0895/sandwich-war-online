import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // XP, Level, etc.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            else setProfile(null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist, create one lazy
                // This covers manual signups or if trigger failed
                if (userId) {
                    const { data: newProfile, error: createError } = await supabase
                        .from('profiles')
                        .insert([{ id: userId, username: 'User_' + Math.random().toString(36).substr(2, 5), level: 1 }])
                        .select()
                        .single();

                    if (newProfile) setProfile(newProfile);
                }
            }

            if (data) setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const signIn = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUp = async (email, password, username) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }
            }
        });
        if (error) throw error;

        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{ id: data.user.id, username: username || email.split('@')[0], level: 1, xp: 0 }]);
            if (profileError) console.error("Profile creation error", profileError);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, signIn, signUp, signOut, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
