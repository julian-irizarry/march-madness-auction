import { Typography, List, ListItem, Chip } from "@mui/joy";
import { Paper, Grid, Card } from "@mui/material";
import { useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";

import Bracket from "./Bracket";
import { PlayerInfo, TeamInfo, Match } from "./Utils"
import { ReactComponent as CrownIcon } from "./icons/crown.svg";
import { ReactComponent as UserIcon } from "./icons/user.svg";

function ViewPage() {
    const location = useLocation();
    const { gameId } = location.state || {};

    const [playerInfos, setPlayerInfos] = useState<Map<string, PlayerInfo>>(new Map());
    const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
    const [matchResults, setMatchResults] = useState<Match[]>([]);

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
                if ("players" in data) {
                    const players = new Map<string, PlayerInfo>();
                    Object.entries(data.players).forEach(([key, temp_player]: [string, any]) => {
                        players.set(key, {
                            name: temp_player.name,
                            gameId: temp_player.gameId,
                            balance: parseInt(temp_player.balance),
                            teams: temp_player.teams,
                        });
                    });
                    setPlayerInfos(players);
                }
                else if ("all_teams" in data) {
                    const all_teams: TeamInfo[] = data["all_teams"].map((temp_team: { [key: string]: any }, i: number) => {
                        return {
                            shortName: temp_team["shortName"],
                            urlName: temp_team["urlName"],
                            seed: parseInt(temp_team["seed"]),
                            region: temp_team["region"]
                        };
                    })
                    setAllTeams(all_teams);
                }
                else if ("match_results" in data) {
                    const match_results: Match[] = data["match_results"].map((temp_match: { [key: string]: any }, i: number) => {
                        return {
                            id: parseInt(temp_match["id"]),
                            roundName: temp_match["roundName"],
                            participants: [
                                {
                                    shortName: temp_match["participants"][0]["shortName"],
                                    urlName: temp_match["participants"][0]["urlName"],
                                    seed: parseInt(temp_match["participants"][0]["seed"]),
                                    region: temp_match["participants"][0]["region"]
                                },
                                {
                                    shortName: temp_match["participants"][1]["shortName"],
                                    urlName: temp_match["participants"][1]["urlName"],
                                    seed: parseInt(temp_match["participants"][1]["seed"]),
                                    region: temp_match["participants"][1]["region"]
                                }
                            ],
                            winner: temp_match["winner"]
                        };
                    })
                    setMatchResults(match_results);
                }
            }
        };
        return () => ws.close();
    }, [gameId]);

    return (
        <div id="outer-container">
            <Paper elevation={1} sx={{ height: "720px", width: "1400px", padding: "10px", backgroundColor: "#fcfcfc" }}>
                <Grid container spacing={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row", height: "calc(100vh - 60px)", minHeight: "100%" }}>

                    {/* Display bracket */}
                    <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <Card sx={{ height: "540px", width: "100%", padding: "10px", backgroundColor: "white" }}>
                            {allTeams.length > 0 ?
                                <Bracket all_teams={allTeams} match_results={matchResults}/>
                                : <Typography>No teams available</Typography>
                            }
                        </Card>
                    </Grid>
                    

                    <List sx={{ width: "100%" }}>
                        {playerInfos.size > 0 ?
                            Array.from(playerInfos.entries()).map(([player, player_info], i) => {
                                // Calculate hue based on index
                                const hue = (i * 30) % 360; // Adjust 30 as needed to change the color spacing
                                const playerColor = `hsl(${hue}, 70%, 50%)`; // Adjust saturation and lightness as needed

                                return (
                                    <React.Fragment key={i}>
                                        <ListItem>
                                            {i === 0 ? <CrownIcon fill={baseColor} width="20px" height="20px" /> : <UserIcon fill={playerColor} width="20px" height="20px" />}
                                            <Chip sx={{ padding: "0 20px", backgroundColor: "var(--off-white-color)" }}>
                                                <Typography sx={{ color: playerColor }}>
                                                    {player}
                                                </Typography>
                                                <Typography sx={{ fontSize: "12px" }}>
                                                    Balance: $ {player_info["balance"].toFixed(2)}
                                                </Typography>
                                                <Typography sx={{ fontSize: "12px" }}>
                                                    Teams:
                                                </Typography>
                                                {player_info["teams"].map((temp_team: string, teamIndex: number) => (
                                                    <Typography key={teamIndex} sx={{ marginLeft: "10px", fontSize: "12px" }}>
                                                        - {temp_team}
                                                    </Typography>
                                                ))}
                                            </Chip>
                                        </ListItem>
                                    </React.Fragment>
                                );
                            })
                            : <Typography>No players</Typography>
                        }
                    </List>
                </Grid>
            </Paper>
        </div>
    )
}

export default ViewPage;
