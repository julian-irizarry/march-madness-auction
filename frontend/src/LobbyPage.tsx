import React, { useState, useEffect } from 'react';
import { Button, Typography, List, ListItem } from '@mui/joy';
import { Grid } from '@mui/material';
import { useLocation } from 'react-router-dom';

interface Participants {
  [gameId: string]: string[];
}

function LobbyPage() {
  const location = useLocation();
  const { gameId, isCreator, playerName } = location.state || {};
  
  const [participants, setParticipants] = useState<Participants>({});

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setParticipants(data.participants);
    };
    return () => ws.close();
  }, []);

  return (
    <Grid container spacing={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', minHeight: '100vh' }}>

      <Grid item xs={12}>
        <Typography level="h1">Lobby</Typography>

        {gameId ?
          <Typography level="h4" color="primary">Game ID: {gameId}</Typography> 
          : <></>
        }
        <Typography level="h4"> {playerName ? `Welcome ${playerName}!` : ""} You are {isCreator ? 'the game creator' : 'a participant'}.</Typography> 
      </Grid>

      <Grid item xs={6}>
        {isCreator ? 
          <Button>Start Game</Button> 
          : <></>
        }
      </Grid>

      <Grid item xs={6}>
        <Typography level="h4">Participants:</Typography>

        <List>
          {gameId in participants ? 
            participants[gameId].map((participant, i) => (
              <ListItem>
                <Typography>{participant}</Typography>
              </ListItem>
            ))
            : <Typography>No participants</Typography> 
          }
        </List>
      </Grid>

    </Grid>
  );
}

export default LobbyPage;