import { Typography, List, ListItem, Chip, Box } from '@mui/joy';
import { Grid } from '@mui/material';
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';

import Bid from './bid';
import { ReactComponent as CrownIcon } from './icons/crown.svg';
import { ReactComponent as UserIcon } from './icons/user.svg';

function GamePage() {
    const location = useLocation();
    const { gameId, playerName } = location.state || {};

    const [currentHighestBid, setCurrentHighestBid] = useState<number>(0);
    const [countdown, setCountdown] = useState(5);
    const [participants, setParticipants] = useState<string[]>([]);
    const [participantInfos, setParticipantsInfos] = useState<Record<string, any>>({});
    const [team, setTeam] = useState<string>("");
    const [remainingTeams, setRemainingTeams] = useState<string[]>([]);
    const [log, setLog] = useState<string>("");

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
                const team_name: string = data["team"][0] + " (" + data["team"][1] + ")";
                setTeam(team_name);
            }
            else if ("log" in data) {
                setLog(data["log"]);
            }
            else if ("remaining" in data) {
                const remaining_teams: string[] = data["remaining"].map((team:string[], i:number) => {
                    const team_name: string = team[0] + " (" + team[1] + ")";
                    return team_name;
                })
                setRemainingTeams(remaining_teams);
            }
        }
        };
        return () => ws.close();
    }, [gameId]);

    return (
        <Box sx={{ border: '1px solid black', borderRadius: '8px', marginLeft: '200px', marginRight: '200px', marginTop: 'calc(100vh - 750px)', padding: '10px' }}>
            <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', height: 'calc(100vh - 200px)', minHeight: '100%' }}>
                {/* Left side */}
                <Grid item xs={8}>
                    <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            <Typography level="h1" justifyContent="center">{team}</Typography>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            <Typography level="h4" justifyContent="center">Highest bid: ${currentHighestBid.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            {
                                log ?  <Typography justifyContent="center" sx={{ color: "grey" }}>{log}</Typography>
                                : <></>
                            }
                        </Grid>
                        <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            <Typography level="h4" sx={{ color: countdown <= 3 ? "red" : "inherit" }}>
                                {countdown.toString().padStart(2, '0')}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            <Bid gameId={gameId} player={playerName} currentHighestBid={currentHighestBid} team={team}/>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Right side */}
                <Grid item xs={4}>
                    <Grid container spacing={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            <Box sx={{ maxHeight: 500, overflowY: 'auto', width: '100%', border: '1px solid', borderColor: 'grey', borderRadius: 'sm' }}>
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
                                            <Chip>
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
                            </Box>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            <Box sx={{ maxHeight: 500, overflowY: 'auto', width: '100%', border: '1px solid', borderColor: 'grey', borderRadius: 'sm' }}>
                                <List sx={{ minWidth: 100, maxWidth: 300 }}>
                                    {remainingTeams.length > 0 ?
                                        remainingTeams.map((team, i) => {
                                            return (
                                                <React.Fragment key={i}>
                                                    <ListItem>
                                                        <Chip>
                                                            <Typography sx={{ color: "grey", fontSize: '12px' }}>
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
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'right', alignItems: 'right'}}>
                <Typography level="h4" justifyContent="center">Teams Remaining: {remainingTeams.length}</Typography>
            </Grid>
        </Box>
    )
}

export default GamePage;