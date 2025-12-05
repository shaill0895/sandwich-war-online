import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Lobby } from './components/Lobby';
import './App.css';

function App() {
  const [roomId, setRoomId] = useState(null);
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 10));

  return (
    <div className="App">
      {!roomId ? (
        <Lobby onJoin={setRoomId} />
      ) : (
        <GameCanvas roomId={roomId} playerId={playerId} onLeave={() => setRoomId(null)} />
      )}
    </div>
  );
}

export default App;
