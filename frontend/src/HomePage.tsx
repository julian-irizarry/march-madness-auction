import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/joy/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import imageSrc from './march_madness_logo.png'; // Ensure the path is correct
import './fonts.css'; // Assuming fonts.css is in the src directory


function HomePage() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joinGameId, setJoinGameId] = useState('');

  const handleCreateGame = () => {
    const gameId = Math.random().toString(36).substring(2, 8); // Generate a unique ID
    // Navigate to lobby as the game creator
    navigate('/lobby', { state: { gameId, isCreator: true } });
  };

  const handleJoinGameClick = () => {
    setIsDialogOpen(true); // Open the join game dialog
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false); // Close the dialog
  };

  const handleJoinGame = () => {
    navigate('/lobby', { state: { gameId: joinGameId, isCreator: false, playerName } });
    setIsDialogOpen(false); // Close the dialog after handling the join
  };

  return (
    <Grid container spacing={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', minHeight: '100vh' }}>
      <Grid container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
        <Grid item>
          <Button onClick={handleCreateGame}>Create Game</Button>
        </Grid>
        <Grid item>
          <img src={imageSrc} alt="Central Game" style={{ maxWidth: '450px', margin: '20px 0' }} />
        </Grid>
        <Grid item>
          <Button onClick={handleJoinGameClick}>Join Game</Button>
        </Grid>
      </Grid>
      <Grid item>
        <Button>View Game</Button> {/* Implement as needed */}
      </Grid>

      {/* Dialog for Join Game */}
      <Dialog maxWidth="lg" open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle sx={{
          textAlign: 'center', 
          fontFamily: 'doubleFeature', 
        }}><b>JOIN GAME</b></DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Your Name"
            InputLabelProps={{
              style: { fontFamily: 'doubleFeature' },
            }}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Game ID"
            InputLabelProps={{
              style: { 
                fontFamily: 'doubleFeature'
              },
            }}
            value={joinGameId}
            onChange={(e) => setJoinGameId(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleJoinGame}>Join</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

export default HomePage;
