import React from 'react';
import { useLocation } from 'react-router-dom';

function LobbyPage() {
  const location = useLocation();
  const { gameId, isCreator } = location.state || {};

  return (
    <div>
      {gameId && <p>Game ID: {gameId}</p>}
      <p>You are {isCreator ? 'the game creator' : 'a participant'}.</p>
      {isCreator && <button>Start Game</button>}
    </div>
  );
}

export default LobbyPage;