import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/joy';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Alert, Paper } from '@mui/material';

import imageSrc from './march_madness_logo_auction.png';
import './fonts.css';

function HomePage() {
  const navigate = useNavigate();
  const [isCreator, setIsCreator] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [joinGameError, setJoinGameError] = useState('');

  const handleCreateGameClick = () => {
    setIsCreator(true);
    setIsDialogOpen(true); // Open the join game dialog
  };

  const handleCreateGame = async (event: React.FormEvent) => {
    try {
      const response = await fetch('http://localhost:8000/create-game/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player: playerName }),
      });

      if (response.ok) {
        const data = await response.json();
        const createdGameId = data.id;
        navigate('/lobby', { state: { gameId: createdGameId, isCreator: true, playerName: playerName } });
      } else {
        console.error('Failed to create game:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleJoinGameClick = () => {
    setIsCreator(false);
    setIsDialogOpen(true); // Open the join game dialog
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false); // Close the dialog
  };

  const handleJoinGame = async (event: React.FormEvent) => {
    setJoinGameError("");
    try {
      const response = await fetch('http://localhost:8000/join-game/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId: joinGameId, player: playerName }),
      });

      if (response.ok) {
        navigate('/lobby', { state: { gameId: joinGameId, isCreator: false, playerName: playerName } });
        setIsDialogOpen(false); // Close the dialog after handling the join
      } else {
        // Handle error response
        const responseData = await response.json(); // Assuming the error message is returned as JSON
        console.error('Error joining game:', responseData.detail);
        setJoinGameError(responseData.detail);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  return (
    <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', height: 'calc(100vh - 170px)', minHeight: '100%' }}>
      <Grid container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>

        {/* Create game button */}
        <Grid item>
          <Button sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleCreateGameClick}>Create Game</Button>
        </Grid>

        {/* March Madness logo */}
        <Grid item>
          <img src={imageSrc} alt="Central Game" style={{ maxWidth: '450px', margin: '20px 0' }} />
        </Grid>

        {/* Join game button */}
        <Grid item>
          <Button sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleJoinGameClick}>Join Game</Button>
        </Grid>
      </Grid>

      {/* View game button */}
      <Grid item>
        <Button sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>View Game</Button> {/* Implement as needed */}
      </Grid>

      {/* Dialog for Join Game */}
      <Dialog maxWidth="lg" open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle sx={{
          textAlign: 'center',
          fontFamily: 'doubleFeature',
        }}><b>{ isCreator ? "CREATE GAME" : "JOIN GAME"}</b></DialogTitle>
        <DialogContent>

          {
            joinGameError ? <Alert severity="error">{joinGameError}</Alert>
            : <></>
          }

          <TextField
            fullWidth
            label="Your Name"
            // InputLabelProps={{
            //   style: { fontFamily: 'doubleFeature' },
            // }}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            margin="dense"
          />

          { isCreator ? <></> :
            <TextField
              fullWidth
              label="Game ID"
              // InputLabelProps={{
              //   style: {
              //     fontFamily: 'doubleFeature'
              //   },
              // }}
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              margin="dense"
            />
          }
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleCloseDialog}>Cancel</Button>

          { isCreator ?
            <Button sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleCreateGame}>Create</Button>
            : <Button sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleJoinGame}>Join</Button>
          }
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

export default HomePage;
