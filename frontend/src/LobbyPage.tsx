import React from 'react';
import { Button, Typography } from '@mui/joy';
import { Grid } from '@mui/material';
import { useLocation } from 'react-router-dom';

function LobbyPage() {
  const location = useLocation();
  const { gameId, isCreator } = location.state || {};

  return (
    <Grid container spacing={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', minHeight: '100vh' }}>

      <Grid item xs={12}>
        <Typography level="h1">Lobby</Typography>

        {gameId ?
          <Typography level="h4" color="primary">Game ID: {gameId}</Typography> 
          : <></>
        }

        <Typography level="h4">You are {isCreator ? 'the game creator' : 'a participant'}.</Typography> 
      </Grid>
      
      <Grid item xs={6}>
        {isCreator ? 
          <Button>Start Game</Button> 
          : <></>
        }
      </Grid>

      <Grid item xs={6}>
        <Typography level="h4">Participants:</Typography>
      </Grid>

    </Grid>
  );
}

export default LobbyPage;