import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Lobby } from './components/Lobby';
import './App.css';

import { AuthProvider, useAuth } from './AuthContext';

function SandwichWarApp() {
  const [roomId, setRoomId] = useState(null);
  const [selectedChar, setSelectedChar] = useState('austin');
  const { user } = useAuth();

  // Use real user ID if logged in, else temporary ID
  const playerId = user ? user.id : (sessionStorage.getItem('tempId') || Math.random().toString(36).substring(2, 10));
  if (!user && !sessionStorage.getItem('tempId')) sessionStorage.setItem('tempId', playerId);

  const handleJoin = (id, charId) => {
    setRoomId(id);
    if (charId) setSelectedChar(charId);
  };

  return (
    <div className="App">
      {!roomId ? (
        <Lobby onJoin={handleJoin} />
      ) : (
        <GameCanvas roomId={roomId} playerId={playerId} selectedChar={selectedChar} onLeave={() => setRoomId(null)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SandwichWarApp />
    </AuthProvider>
  );
}

export default App;
