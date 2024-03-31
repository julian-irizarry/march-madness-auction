import { Typography, Button, List, ListItem, Chip } from '@mui/joy';
import { Grid } from '@mui/material';
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';

import Bid from './bid';
import imageSrc from './march_madness_logo.png';
import { ReactComponent as CrownIcon } from './icons/crown.svg';
import { ReactComponent as UserIcon } from './icons/user.svg';

function GamePage() {
    const location = useLocation();
    const { gameId, isCreator, playerName } = location.state || {};

    const [currentHighestBid, setCurrentHighestBid] = useState<number>(0);
    const [countdown, setCountdown] = useState(10);
    const [participants, setParticipants] = useState<string[]>([]);
    const [team, setTeam] = useState("Texas");

    const baseColor = "#FFD700";

    const wsRef = useRef<WebSocket | null>(null); // Use useRef to hold the WebSocket connection
    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/ws/${gameId}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
        if (event.data === "gameStarted") {
            // ignore
        }
        else {
            const data = JSON.parse(event.data);

            if ("participants" in data) {
                setParticipants(data["participants"]);
            }
            else if ("bid" in data) {
                setCurrentHighestBid(data["bid"]);
            }
            else if ("countdown" in data) {
                setCountdown(data["countdown"]);
            }
        }
        };
        return () => ws.close();
    }, []);

    const secondsToHMS = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
    
        const paddedHours = hours.toString().padStart(2, '0');
        const paddedMinutes = minutes.toString().padStart(2, '0');
        const paddedSeconds = remainingSeconds.toString().padStart(2, '0');
    
        return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    };

    return (
        <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', minHeight: '100vh' }}>
            {/* Left side */}
            <Grid item xs={8}>
                <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Typography level="h1" justifyContent="center">Team: {team}</Typography>
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Typography level="h4" justifyContent="center">Highest bid: ${currentHighestBid}</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Typography level="h4">{secondsToHMS(countdown)}</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Bid gameId={gameId} currentHighestBid={currentHighestBid} team={team}/>
                    </Grid>
                </Grid>
            </Grid>

            {/* Right side */}
            <Grid item xs={4}>
                <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Typography level="h4" justifyContent="center">Participant Overview:</Typography>
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <List variant="outlined" sx={{ minWidth: 100, maxWidth: 300, width: '100%', borderRadius: 'sm' }}>
                        {participants.length > 0 ?
                            participants.map((participant, i) => {
                            // Calculate hue based on index
                            const hue = (i * 30) % 360; // Adjust 30 as needed to change the color spacing
                            const participantColor = `hsl(${hue}, 70%, 50%)`; // Adjust saturation and lightness as needed
                            
                            return (
                                <React.Fragment key={i}>
                                <ListItem>
                                    {i === 0 ? <CrownIcon fill={baseColor} width="20px" height="20px" /> : <UserIcon fill={participantColor} width="20px" height="20px" />}
                                    <Chip> {participant} </Chip>
                                </ListItem>
                                </React.Fragment>
                            );
                            })
                            : <Typography>No participants</Typography>
                        }
                        </List>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )
}

export default GamePage;