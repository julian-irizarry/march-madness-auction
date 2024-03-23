import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/joy/Button';
import Grid from '@mui/material/Grid';
import imageSrc from './march_madness_logo.png';

function HomePage() {
  const navigate = useNavigate();

  const handleCreateGame = async (event: React.FormEvent) => {
    try {
      const response = await fetch('http://localhost:8000/create-game/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // No need to send gameId here
      });
      
      if (response.ok) {
        const data = await response.json();
        const createdGameId = data.id;
        navigate('/lobby', { state: { gameId: createdGameId, isCreator: true } });
      } else {
        console.error('Failed to create game:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleJoinGame = () => {
    navigate('/lobby', { state: { isCreator: false } });
  };

  return (
    <Grid container spacing={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Group the buttons and image together for alignment */}
      <Grid container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
        {/* Create Game Button */}
        <Grid item>
          <Button onClick={handleCreateGame}>Create Game</Button>
        </Grid>

        {/* Central Image */}
        <Grid item>
          <img src={imageSrc} alt="Central Game" style={{ maxWidth: '450px', margin: '20px 0' }} />
        </Grid>

        {/* Join Game Button */}
        <Grid item>
          <Button onClick={handleJoinGame}>Join Game</Button>
        </Grid>
      </Grid>

      {/* View Game Button, centered beneath the image */}
      <Grid item>
        <Button>View Game</Button> {/* Implement as needed */}
      </Grid>
    </Grid>
  );
}

export default HomePage;
