import { Typography, List, ListItem, Chip } from "@mui/joy";
import { Grid, Paper, Card, Fab, Snackbar, Alert } from "@mui/material";
import { useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";

import Bid from "./Bid";
import Bracket from "./Bracket";
import { PlayerInfo, TeamInfo, BACKEND_URL } from "./Utils"
import { ReactComponent as CrownIcon } from "./icons/crown.svg";
import { ReactComponent as UserIcon } from "./icons/user.svg";

import "./css/App.css";
import "./css/Fonts.css";

// Add more specific types for WebSocket messages
type WebSocketMessage = {
    players?: Map<string, PlayerInfo>;
    bid?: number;
    countdown?: number;
    team?: TeamInfo;
    log?: string;
    remaining?: TeamInfo[];
    all_teams?: TeamInfo[];
};

// Extract WebSocket logic to a custom hook
function useGameWebSocket(gameId: string) {
    const [wsData, setWsData] = useState<WebSocketMessage>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ws = new WebSocket(`ws://${BACKEND_URL}/ws/${gameId}`);

        ws.onerror = (error) => {
            setError('WebSocket connection error');
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            setError('WebSocket connection closed');
        };

        ws.onmessage = (event) => {
            if (event.data === "gameStarted") {
                // ignore
            }
            else {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    console.log("DATA", data);
                    if ("players" in data && data.players) {
                        const players = new Map<string, PlayerInfo>();
                        Object.entries(data.players).forEach(([key, temp_player]: [string, any]) => {
                            players.set(key, {
                                name: temp_player.name,
                                gameId: temp_player.gameId,
                                balance: parseInt(temp_player.balance),
                                points: parseInt(temp_player.points),
                                teams: Object.values(temp_player.teams).map((temp_team: any) => {
                                    return {
                                        shortName: temp_team.shortName,
                                        urlName: temp_team.urlName,
                                        seed: temp_team.seed,
                                        region: temp_team.region,
                                        purchasePrice: temp_team.purchasePrice
                                    };
                                }),
                            });
                        });
                        setWsData((prev: WebSocketMessage) => ({ ...prev, players }));
                    }
                    else if ("bid" in data) {
                        setWsData((prev: WebSocketMessage) => ({ ...prev, bid: data["bid"] }));
                    }
                    else if ("countdown" in data) {
                        setWsData((prev: WebSocketMessage) => ({ ...prev, countdown: data["countdown"] }));
                    }
                    else if ("team" in data && data.team) {
                        const team = data.team as TeamInfo;
                        setWsData((prev: WebSocketMessage) => ({
                            ...prev, team: {
                                shortName: team.shortName,
                                urlName: team.urlName,
                                seed: team.seed,
                                region: team.region
                            }
                        }));
                    }
                    else if ("log" in data) {
                        setWsData((prev: WebSocketMessage) => ({ ...prev, log: data["log"] }));
                    }
                    else if ("remaining" in data && data.remaining) {
                        const remaining_teams: TeamInfo[] = data.remaining.map((temp_team: { [key: string]: any }, i: number) => {
                            return {
                                shortName: temp_team["shortName"],
                                urlName: temp_team["urlName"],
                                seed: temp_team["seed"],
                                region: temp_team["region"]
                            };
                        });
                        setWsData((prev: WebSocketMessage) => ({ ...prev, remaining: remaining_teams }));
                    }
                    else if ("all_teams" in data && data.all_teams) {
                        const all_teams: TeamInfo[] = data.all_teams.map((temp_team: { [key: string]: any }, i: number) => {
                            return {
                                shortName: temp_team["shortName"],
                                urlName: temp_team["urlName"],
                                seed: temp_team["seed"],
                                region: temp_team["region"]
                            };
                        })
                        setWsData((prev: WebSocketMessage) => ({ ...prev, all_teams }));
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    setError('Invalid message format received');
                }
            }
        };
        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [gameId]);

    return { wsData, error };
}

function GamePage() {
    const location = useLocation();
    const { gameId, playerName } = location.state || {};

    const [currentHighestBid, setCurrentHighestBid] = useState<number>(0);
    const [countdown, setCountdown] = useState(10);
    const [playerInfos, setPlayerInfos] = useState<Map<string, PlayerInfo>>(new Map());
    const [team, setTeam] = useState<TeamInfo>({ shortName: "", urlName: "", seed: -1, region: "" });
    const [remainingTeams, setRemainingTeams] = useState<TeamInfo[]>([]);
    const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
    const [log, setLog] = useState<string>("");

    const [openSnackbar, setOpenSnackbar] = React.useState(false);
    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

    const baseColor = "#FFD700";

    const { wsData, error } = useGameWebSocket(gameId);

    // resets current highest bid when a new team is auctioned
    useEffect(() => {
        if (wsData.team) {
            setCurrentHighestBid(0);
        }
    }, [wsData.team]);

    useEffect(() => {
        if (wsData.players !== undefined) {
            setPlayerInfos(wsData.players);
        }
        if (wsData.bid !== undefined) {
            setCurrentHighestBid(wsData.bid);
        }
        if (wsData.countdown !== undefined) {
            setCountdown(wsData.countdown);
        }
        if (wsData.team !== undefined) {
            setTeam(wsData.team);
        }
        if (wsData.log !== undefined) {
            setLog(wsData.log);
            setOpenSnackbar(true);
        }
        if (wsData.remaining !== undefined) {
            setRemainingTeams(wsData.remaining);
        }
        if (wsData.all_teams !== undefined) {
            setAllTeams(wsData.all_teams);
        }
    }, [wsData.players, wsData.bid, wsData.countdown, wsData.team, wsData.log, wsData.remaining, wsData.all_teams, error]);

    return (
        <div id="outer-container">
            {/* backgroundColor: "rgba(0, 0, 0, 0)" */}
            <Paper elevation={1} sx={{ height: "720px", width: "1400px", padding: "10px", backgroundColor: "white" }} >
                <Grid container spacing={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row", height: "calc(100vh - 170px)", minHeight: "100%" }}>
                    {/* Left side */}
                    <Grid item xs={10}>
                        <Grid container spacing={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>

                            {/* Display bracket */}
                            <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                {/* backgroundColor: "rgba(0, 0, 0, 0)" */}
                                <Card sx={{ height: "555px", width: "100%", padding: "5px", backgroundColor: "white", border: 1, borderRadius: 1, borderColor: "black", boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)" }}>
                                    {allTeams.length > 0 ?
                                        <Bracket all_teams={allTeams} selected_team={team} />
                                        : <Typography>No teams available</Typography>
                                    }
                                </Card>
                            </Grid>

                            {/* Team to bid on */}
                            <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <Grid container sx={{ justifyContent: "center", alignItems: "center", margin: 0 }}>
                                    <Grid item xs={8} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                        <Card sx={{ height: "135px", width: "100%", backgroundColor: "white", border: 1, borderRadius: 1, borderColor: "black", boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)" }}>
                                            <Grid container sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                <Grid container spacing={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                    <Grid item>
                                                        <Typography justifyContent="center" sx={{ backgroundImage: "linear-gradient(to bottom,rgb(218, 4, 4) 10%, rgb(175, 2, 2) 40%, rgb(48, 1, 1) 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "doubleFeature", fontSize: "50px", marginTop: "0px", marginBottom: "-10px" }}>
                                                            {team.shortName}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item>
                                                        <Typography justifyContent="center" sx={{ backgroundImage: "linear-gradient(to bottom,rgb(218, 4, 4) 10%, rgb(175, 2, 2) 40%, rgb(48, 1, 1) 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "doubleFeature", fontSize: "40px", marginTop: "-20px", marginBottom: "-20px" }}>
                                                            {team.seed ? `(${team.seed})` : ""}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                                {/* Countdown timer */}
                                                <Grid item sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                                                    <Card sx={{ border: 5, height: "50px", width: "50px", backgroundColor: "black", borderRadius: 0, borderColor: "white" }}>
                                                        <Typography sx={{ color: countdown <= 5 ? "red" : "white", textAlign: "center", fontFamily: "clock", fontSize: "45px", my: "-10px" }}>
                                                            {countdown.toString().padStart(2, "0")}
                                                        </Typography>
                                                    </Card>
                                                </Grid>

                                                {/* Bid */}
                                                <Grid item xs={4} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                    <Grid container sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                                                        <Grid item sx={{ display: "flex", justifyContent: "left", alignItems: "center" }}>
                                                            <Typography sx={{ justifyContent: "center", fontSize: "20px" }}>
                                                                Current bid: ${currentHighestBid.toFixed(2)}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                            <Bid
                                                                gameId={gameId}
                                                                player={playerName}
                                                                currentHighestBid={currentHighestBid}
                                                                team={`${team.shortName} (${team.seed})`}
                                                                balance={playerInfos.get(playerName)?.balance || 0}
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Right side */}
                    <Grid item xs={2} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <Grid container spacing={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>

                            {/* Player */}
                            <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <Card sx={{ height: 200, overflow: "auto", overflowY: "auto", width: "100%", backgroundColor: "white", border: 1, borderRadius: 1, borderColor: "black", boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)" }}>
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
                                                                <Typography sx={{ color: playerColor, backgroundImage: "linear-gradient(to bottom,rgb(218, 4, 4) 10%, rgb(175, 2, 2) 40%, rgb(48, 1, 1) 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "doubleFeature" }}>
                                                                    {player}
                                                                </Typography>
                                                                <Typography sx={{ fontSize: "12px" }}>
                                                                    Balance: $ {player_info["balance"].toFixed(2)}
                                                                </Typography>
                                                                <Typography sx={{ fontSize: "12px" }}>
                                                                    Teams:
                                                                </Typography>
                                                                {player_info["teams"].map((temp_team: TeamInfo, teamIndex: number) => (
                                                                    <Typography key={teamIndex} sx={{ marginLeft: "10px", fontSize: "12px" }}>
                                                                        - {temp_team.shortName} (${temp_team.purchasePrice})
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
                                </Card>
                            </Grid>

                            {/* Remaining Teams */}
                            <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <Card sx={{ maxHeight: 505, overflowY: "auto", width: "100%", backgroundColor: "white", border: 1, borderRadius: 1, borderColor: "black", boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)" }}>
                                    <Grid container spacing={1} sx={{ flexWrap: "wrap", padding: 1 }}>
                                        {remainingTeams.length > 0 ?
                                            remainingTeams.map((temp_team, i) => {
                                                const teamLogo = temp_team.region !== "region" ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${temp_team.urlName}.svg` : "";

                                                return (
                                                    <Grid item key={i} xs="auto">
                                                        <Chip sx={{ backgroundColor: "var(--off-white-color)" }}>
                                                            <Typography sx={{ color: "black", fontSize: "12px" }}>
                                                                {temp_team.region !== "region" && teamLogo && (
                                                                    <img src={teamLogo} style={{ width: "10px", height: "10px", paddingRight: 4 }} />
                                                                )}
                                                                {temp_team.shortName} ({temp_team.seed})
                                                            </Typography>
                                                        </Chip>
                                                    </Grid>
                                                );
                                            })
                                            : <Typography>No teams available</Typography>
                                        }
                                    </Grid>
                                </Card>
                            </Grid>

                        </Grid>
                    </Grid>

                    {/* Floating button showing number of teams remaining */}
                    <Grid item xs={12} sx={{ display: "flex", justifyContent: "right", alignItems: "right", marginTop: "-80px" }}>
                        <Fab variant="extended" size="small" sx={{ backgroundColor: "var(--off-white-color)" }}>
                            <Typography justifyContent="center" sx={{ fontSize: "12px" }}><b>Teams Remaining: {remainingTeams.length}</b></Typography>
                        </Fab>
                    </Grid>

                    {/* Display logs on the bottom */}
                    <Snackbar
                        open={openSnackbar}
                        onClose={handleCloseSnackbar}
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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
