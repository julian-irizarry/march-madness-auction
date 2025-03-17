import { Typography, Card } from "@mui/joy";
import { Paper, Grid } from "@mui/material";
import { useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";

import { PlayerInfo, TeamInfo, BACKEND_URL } from "./Utils"
import { ReactComponent as CrownIcon } from "./icons/crown.svg";
import { ReactComponent as UserIcon } from "./icons/user.svg";

function ViewPage() {
    const location = useLocation();
    const { gameId } = location.state || {};

    const [playerInfos, setPlayerInfos] = useState<Map<string, PlayerInfo>>(new Map());

    const baseColor = "#FFD700";
    const [maxPoints, setMaxPoints] = useState<number>(0);

    const wsRef = useRef<WebSocket | null>(null); // Use useRef to hold the WebSocket connection
    useEffect(() => {
        const ws = new WebSocket(`ws://${BACKEND_URL}/ws/${gameId}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            if (event.data === "gameStarted") {
                // ignore
            }
            else {
                const data = JSON.parse(event.data);
                console.log("DATA", data);
                if ("players" in data) {
                    const players = new Map<string, PlayerInfo>();
                    Object.entries(data.players).forEach(([key, temp_player]: [string, any]) => {
                        let maxPointsLocal = 0;

                        players.set(key, {
                            name: temp_player.name,
                            gameId: temp_player.gameId,
                            balance: parseInt(temp_player.balance),
                            points: parseInt(temp_player.points),
                            teams: Object.values(temp_player.teams).map((temp_team: any) => {

                                if (temp_team.points > maxPointsLocal) {
                                    maxPointsLocal = temp_team.points;
                                }

                                return {
                                    shortName: temp_team.shortName,
                                    urlName: temp_team.urlName,
                                    seed: temp_team.seed,
                                    region: temp_team.region,
                                    purchasePrice: temp_team.purchasePrice,
                                    points: temp_team.points,
                                };
                            }),
                        });

                        if (maxPointsLocal > maxPoints) {
                            setMaxPoints(maxPointsLocal);
                        }
                    });
                    setPlayerInfos(players);
                }
            }
        };
        return () => ws.close();
    }, [gameId, maxPoints]);

    const calculateBackgroundColor = (points: number): string => {
        const pastelRed = [255, 182, 182]; // RGB value for pastel red
        const pastelGreen = [182, 255, 182]; // RGB value for pastel green
        const percentage = points / maxPoints;
    
        const r = Math.floor(pastelRed[0] * (1 - percentage) + pastelGreen[0] * percentage);
        const g = Math.floor(pastelRed[1] * (1 - percentage) + pastelGreen[1] * percentage);
        const b = Math.floor(pastelRed[2] * (1 - percentage) + pastelGreen[2] * percentage);
    
        return `rgb(${r}, ${g}, ${b})`; // Gradient from pastel red to pastel green
    };

    return (
        <div id="outer-container">
            <Paper elevation={1} sx={{ height: "720px", width: "1400px", padding: "10px", backgroundColor: "#fcfcfc", overflowY: "auto" }}>
                <Grid container sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row", height: "calc(100vh - 60px)", minHeight: "100%" }}>

                    {playerInfos.size > 0 ?
                        Array.from(playerInfos.entries()).map(([player, player_info]: [string, PlayerInfo], i) => {
                            // Calculate hue based on index
                            const hue = (i * 30) % 360; // Adjust 30 as needed to change the color spacing
                            const playerColor = `hsl(${hue}, 70%, 50%)`; // Adjust saturation and lightness as needed

                            return (
                                <React.Fragment key={i}>
                                    <Grid item xs={6} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                        <Card sx={{ height: "200px", width: "80%", padding: "10px", backgroundColor: "var(--off-white-color)"}}>

                                            <Grid container sx={{ display: "flex", justifyContent: "center", alignItems: "center", overflowY: "auto" }} >

                                                <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }} >
                                                    {i === 0 ? <CrownIcon fill={baseColor} width="20px" height="20px" /> : <UserIcon fill={playerColor} width="20px" height="20px" />}
                                                    <Typography sx={{ color: playerColor, margin: "10px" }}>
                                                        {player}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: "12px", margin:2, color: "var(--tertiary-color)" }}>
                                                        <b>Points: {player_info.points}</b>
                                                    </Typography>
                                                </Grid>
                                                <Grid container sx={{ display: "flex", justifyContent: "center", alignItems: "center", overflowY: "auto" }}>
                                                    {player_info["teams"].map((temp_team: TeamInfo, teamIndex: number) => (
                                                        <Card sx={{ padding: "0 20px", backgroundColor: calculateBackgroundColor(temp_team.points ? temp_team.points : 0), width: "80%", height:"30px" }}>
                                                            <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }} >
                                                                <Grid item xs={3} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                                    {/* Team logo */}
                                                                    <img src={`https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${temp_team.urlName}.svg`} alt={`${temp_team.shortName} logo`} style={{ width: "20px", height: "20px" }} />
                                                                </Grid>

                                                                <Grid item xs={8} sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                                                                    <Typography key={teamIndex} sx={{ fontSize: "12px", justifyContent: "left", alignItems: "left", color: "var(--tertiary-color)" }}>
                                                                        {temp_team.shortName}
                                                                    </Typography>
                                                                </Grid>

                                                                <Grid item xs={1} sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                                                                    <Typography key={teamIndex} sx={{ fontSize: "12px", justifyContent: "left", alignItems: "left", color: "gray" }}>
                                                                        ${temp_team.purchasePrice}
                                                                    </Typography>
                                                                </Grid>

                                                                <Grid item xs={2} sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                                                                    <Typography key={teamIndex} sx={{ fontSize: "12px", justifyContent: "left", alignItems: "left", color: "gray" }}>
                                                                        {temp_team.points} points
                                                                    </Typography>
                                                                </Grid>
                                                            </Grid>
                                                        </Card>
                                                    ))}
                                                </Grid>
                                            </Grid>
                                        </Card>
                                    </Grid>
                                </React.Fragment>
                            );
                        })
                        : <Typography>No players</Typography>
                    }
                </Grid>
            </Paper >
        </div >
    )
}

export default ViewPage;
