import React, { useState, useEffect } from 'react';
import { Button, Typography, List, ListItem, ListDivider, Card, Chip } from '@mui/joy';
import { Grid } from '@mui/material';
import { useLocation } from 'react-router-dom';

import imageSrc from './march_madness_logo.png'; // Ensure the path is correct

interface Participants {
  [gameId: string]: string[];
}

function LobbyPage() {
  const location = useLocation();
  const { gameId, isCreator, playerName } = location.state || {};
  
  const [participants, setParticipants] = useState<Participants>({});

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws-participants');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setParticipants(data.participants);
    };
    return () => ws.close();
  }, []);

  return (
    <Grid container spacing={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', minHeight: '100vh' }}>

      {/* Left side */}
      <Grid item xs={4}>
        <Grid container spacing={2} direction="column" alignItems="center">
          <Grid item>
            <Typography level="h4" justifyContent="center"> {playerName ? `Welcome ${playerName}!` : ""} You are {isCreator ? 'the game creator' : 'a participant'}.</Typography>
          </Grid>

          <Grid item>
            <Typography level="h4" justifyContent="center">Participants:</Typography>
          </Grid>

          <Grid item>
            <List variant="outlined" sx={{ minWidth: 240, borderRadius: 'sm' }}>
              {gameId in participants && participants[gameId].length > 0 ?
                participants[gameId].map((participant, i) => (
                  <React.Fragment key={i}>
                    <ListItem>
                      <Chip> {participant} </Chip>
                    </ListItem>
                  </React.Fragment>
                ))
                : <Typography>No participants</Typography>
              }
            </List>
          </Grid>
        </Grid>
      </Grid>

      {/* Right side */}
      <Grid item xs={8}>
        <Grid container spacing={2} direction="column" alignItems="center">
          <Grid item>
            <img src={imageSrc} alt="Central Game" style={{ maxWidth: '350px', margin: '20px 0' }} />
          </Grid>

          <Grid container item spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }} >
            <Grid item>
              <Typography level="h4">Your Room Code:</Typography>
            </Grid>

            <Grid item>
              <Card variant="outlined">
                <Typography level="h4" color="primary">{gameId}</Typography> 
              </Card>
            </Grid>
          </Grid>

          <Grid item>
            {
              isCreator ? <Button>Start Game</Button>
              : <Typography level="h4">Waiting for the host to start the game...</Typography>
            }
          </Grid>
        </Grid>
      </Grid>

    </Grid>

  );
}

export default LobbyPage;