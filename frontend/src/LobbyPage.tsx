import React, { useState, useEffect, useRef } from "react";
import { Button, Typography, List, ListItem, Card, Chip } from "@mui/joy";
import { Grid, Paper } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

import { BACKEND_URL } from "./Utils"
import imageSrc from "./images/march_madness_logo_auction.png";
import { ReactComponent as CrownIcon } from "./icons/crown.svg";
import { ReactComponent as UserIcon } from "./icons/user.svg";

function LobbyPage() {
  const navigate = useNavigate();

  const location = useLocation();
  const { gameId, isCreator, playerName } = location.state || {};

  const [players, setPlayers] = useState<string[]>([]);
  const baseColor = "#FFD700";
  const wsRef = useRef<WebSocket | null>(null); // Use useRef to hold the WebSocket connection

  useEffect(() => {
    const ws = new WebSocket(`ws://${BACKEND_URL}/ws/${gameId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (event.data === "gameStarted") {
        // Navigate to the game/bid page when the game starts
        navigate("/game", { state: { gameId, isCreator, playerName } });
      }
      else {
        const data = JSON.parse(event.data);

        if ("players" in data) {
          setPlayers(Object.keys(data["players"]));
        }
      }
    };

    return () => ws.close();
  }, [navigate, gameId, playerName, isCreator]);

  const handleStartGameClick = () => {
    if (isCreator && wsRef.current) {
      wsRef.current.send("startGame");
    }
  };

  return (
    <div id="outer-container">
      <Paper elevation={1} sx={{ height: "720px", width: "1400px", padding: "10px", backgroundColor: "#fcfcfc" }}>
        <Grid container spacing={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row", height: "calc(100vh - 170px)", minHeight: "100%" }}>

          {/* Left side */}
          <Grid item xs={4}>
            <Grid container spacing={2} direction="column" alignItems="center">

              {/* Player */}
              <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Typography level="h4" justifyContent="center" sx={{ color: "var(--tertiary-color)", fontSize: "30px" }}>
                  {playerName ? `Welcome ${playerName}!` : ""}
                </Typography>
              </Grid>
              <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Typography level="h4" justifyContent="center" sx={{ color: "gray", fontSize: "20px" }}>
                  You are {isCreator ? "the game creator" : "a participant"}.
                </Typography>
              </Grid>

              {/* List of players */}
              <Grid item>
                <List variant="outlined" sx={{ minWidth: 240, borderRadius: "sm" }}>
                  {players.length > 0 ?
                    players.map((participant, i) => {
                      // Calculate hue based on index
                      const hue = (i * 30) % 360; // Adjust 30 as needed to change the color spacing
                      const participantColor = `hsl(${hue}, 70%, 50%)`; // Adjust saturation and lightness as needed

                      return (
                        <React.Fragment key={i}>
                          <ListItem>
                            {i === 0 ?
                              <CrownIcon fill={baseColor} width="20px" height="20px" />
                              : <UserIcon fill={participantColor} width="20px" height="20px" />
                            }
                            <Chip> {participant} </Chip>
                          </ListItem>
                        </React.Fragment>
                      );
                    })
                    : <Typography>No players</Typography>
                  }
                </List>
              </Grid>
            </Grid>
          </Grid>

          {/* Right side */}
          <Grid item xs={8}>
            <Grid container spacing={2} direction="column" alignItems="center">

              {/* March Madness logo */}
              <Grid item>
                <img src={imageSrc} alt="Central Game" style={{ maxWidth: "350px", margin: "20px 0" }} />
              </Grid>

              {/* Game ID */}
              <Grid container item spacing={2} sx={{ justifyContent: "center", alignItems: "center", flexDirection: "row" }} >
                <Grid item>
                  <Typography level="h4" sx={{ color: "var(--tertiary-color)" }}>Your Room Code:</Typography>
                </Grid>

                <Grid item>
                  <Card variant="outlined">
                    <Typography level="h4" sx={{ color: "var(--primary-color)" }}>{gameId}</Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Start game button */}
              <Grid item>
                {
                  isCreator ? <Button sx={{ backgroundColor: "var(--primary-color)", color: "white" }} onClick={handleStartGameClick}>Start Game</Button>
                    : <Typography level="h4" sx={{ color: "var(--tertiary-color)" }} >Waiting for the host to start the game...</Typography>
                }
              </Grid>
            </Grid>
          </Grid>

        </Grid>
      </Paper>
    </div>
  );
}

export default LobbyPage;
