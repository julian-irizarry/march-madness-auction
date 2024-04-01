import { Typography, List, ListItem, Chip, Box } from '@mui/joy';
import { Grid, Paper, Card, Fab, Snackbar, Alert } from '@mui/material';
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';

import Bid from './bid';
import { ReactComponent as CrownIcon } from './icons/crown.svg';
import { ReactComponent as UserIcon } from './icons/user.svg';

import './App.css';
import './fonts.css';

function GamePage() {
    const location = useLocation();
    const { gameId, playerName } = location.state || {};

    const [currentHighestBid, setCurrentHighestBid] = useState<number>(0);
    const [countdown, setCountdown] = useState(10);
    const [participants, setParticipants] = useState<string[]>([]);
    const [participantInfos, setParticipantsInfos] = useState<Record<string, any>>({});
    const [team, setTeam] = useState<string[]>([]);
    const [remainingTeams, setRemainingTeams] = useState<string[]>([]);
    const [log, setLog] = useState<string>("");

    const [openSnackbar, setOpenSnackbar] = React.useState(false);
    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

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
            console.log("DATA", data);
            if ("participants" in data) {
                setParticipants(Object.keys(data["participants"]));
                setParticipantsInfos(data["participants"]);
            }
            else if ("bid" in data) {
                setCurrentHighestBid(data["bid"]);
            }
            else if ("countdown" in data) {
                setCountdown(data["countdown"]);
            }
            else if ("team" in data) {
                setTeam(data["team"]);
            }
            else if ("log" in data) {
                setLog(data["log"]);
                setOpenSnackbar(true);
            }
            else if ("remaining" in data) {
                const remaining_teams: string[] = data["remaining"].map((team:string[], i:number) => {
                    return `${team[0]} (${team[1]})`;
                })
                setRemainingTeams(remaining_teams);
            }
        }
        };
        return () => ws.close();
    }, [gameId]);

    return (
        <div id="outer-container">
            <Paper elevation={1} sx={{marginLeft: '200px', marginRight: '200px', marginTop: 'calc(100vh - 800px)', marginBottom: 'calc(100vh - 800px)', padding: '10px', backgroundColor: '#fcfcfc'}}>
                <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', height: 'calc(100vh - 170px)', minHeight: '100%' }}>
                    {/* Left side */}
                    <Grid item xs={8}>
                        <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>

                            {/* Team to bid on */}
                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                <Typography justifyContent="center">
                                    <span style={{ fontFamily: 'threeDim2', fontSize: '60px', lineHeight: '45px' }}> {team[0]} </span>
                                    <span style={{ fontSize: '30px' }}> ({team[1]}) </span>
                                </Typography>
                            </Grid>

                            {/* Placeholder for bracket */}
                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                <Card sx={{ height: '428px', width: '100%', padding: '10px'}}></Card>
                            </Grid>

                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                <Card sx={{ height: '100%', width: '100%', padding: '10px', backgroundColor: 'var(--off-white-color)'}}>
                                    <Grid container sx={{ justifyContent: 'center', alignItems: 'center' }}>
                                        {/* #f0f4f8 */}

                                        {/* Countdown timer */}
                                        <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}> 
                                            <Card sx={{ border: 5, height: '100%', width: '100%', backgroundColor: 'black', borderRadius: 0, borderColor: 'white'}}>
                                                <Typography sx={{ color: countdown <= 5 ? "red" : "white", textAlign: 'center', fontFamily: 'clock', fontSize: '70px', margin:"0px" }}>
                                                    {countdown.toString().padStart(2, '0')}
                                                </Typography>
                                            </Card>
                                        </Grid>

                                        {/* Bid */}
                                        <Grid item xs={10} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                            <Grid container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
                                                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                                    <Typography level="h4" justifyContent="center">Current bid: ${currentHighestBid.toFixed(2)}</Typography>
                                                </Grid>
                                                <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                                    <Bid gameId={gameId} player={playerName} currentHighestBid={currentHighestBid} team={`${team[0]} (${team[1]})`}/>
                                                </Grid>
                                            </Grid>
                                        </Grid>

                                    </Grid>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Right side */}
                    <Grid item xs={4}>
                        <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>

                            {/* Participants */}
                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                <Card sx={{ minHeight: 200, maxHeight: 200, overflowY: 'auto', width: '100%', backgroundColor: 'var(--off-white-color)'}}>
                                    <List sx={{ minWidth: 100, maxWidth: 300, width: '100%' }}>
                                    {participants.length > 0 ?
                                        participants.map((participant, i) => {
                                        // Calculate hue based on index
                                        const hue = (i * 30) % 360; // Adjust 30 as needed to change the color spacing
                                        const participantColor = `hsl(${hue}, 70%, 50%)`; // Adjust saturation and lightness as needed
                                        
                                        return (
                                            <React.Fragment key={i}>
                                            <ListItem>
                                                {i === 0 ? <CrownIcon fill={baseColor} width="20px" height="20px" /> : <UserIcon fill={participantColor} width="20px" height="20px" />}
                                                <Chip sx={{ padding: '0 20px'  }}>
                                                    <Typography sx={{ color: participantColor }}>
                                                        {participant}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '12px' }}>
                                                        Balance: $ {participantInfos[participant]["balance"].toFixed(2)}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '12px' }}>
                                                        Teams:
                                                    </Typography>
                                                    {participantInfos[participant]["teams"].map((team:string, teamIndex:number) => (
                                                        <Typography key={teamIndex} sx={{ marginLeft: '10px', fontSize: '12px' }}>
                                                        - {team}
                                                        </Typography>
                                                    ))}
                                                </Chip>
                                            </ListItem>
                                            </React.Fragment>
                                        );
                                        })
                                        : <Typography>No participants</Typography>
                                    }
                                    </List>
                                </Card>
                            </Grid>

                            {/* Remaining Teams */}
                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                <Card sx={{ maxHeight: 440, overflowY: 'auto', width: '100%', backgroundColor: 'var(--off-white-color)'}}>
                                    <List sx={{ minWidth: 100, maxWidth: 300 }}>
                                        {remainingTeams.length > 0 ?
                                            remainingTeams.map((team, i) => {
                                                return (
                                                    <React.Fragment key={i}>
                                                        <ListItem>
                                                            <Chip>
                                                                <Typography sx={{ color: "black", fontSize: '12px' }}>
                                                                    {team}
                                                                </Typography>
                                                            </Chip>
                                                        </ListItem>
                                                    </React.Fragment>
                                                );
                                            })
                                            : <Typography>No teams available</Typography>
                                        }
                                    </List>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Floating button showing number of teams remaining */}
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'right', alignItems: 'right', marginTop: '-80px' }}>
                        <Fab variant="extended" size="small" sx={{backgroundColor:"white"}}>
                            <Typography justifyContent="center" sx={{fontSize: '12px'}}><b>Teams Remaining: {remainingTeams.length}</b></Typography>
                        </Fab>                
                    </Grid>

                    {/* Display logs on the bottom */}
                    <Snackbar
                        open={openSnackbar}
                        onClose={handleCloseSnackbar}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} 
                        >
                        <Alert
                            elevation={6}
                            variant="filled"
                            onClose={handleCloseSnackbar}
                            severity="info"
                        >
                            {log}
                        </Alert>
                    </Snackbar>
                </Grid>

            </Paper>
        </div>
    )
}

export default GamePage;