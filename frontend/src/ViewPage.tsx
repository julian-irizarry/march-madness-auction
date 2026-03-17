import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { BACKEND_HTTP_URL, BACKEND_WS_URL } from "./Utils";
import "./css/Fonts.css";
import "./css/BloodbathPages.css";
import "./css/ViewPage.css";

interface LeaderboardEntry {
    name: string;
    points: number;
    balance: number;
    spent: number;
    teamsOwned: number;
    teams: Array<{
        name: string;
        seed: number;
        region: string;
        purchasePrice: number | null;
        points: number;
    }>;
}

interface SeedCost {
    seed: number;
    avgCost: number;
    totalSpent: number;
    teamsSold: number;
}

interface SaleRecord {
    team: string;
    seed: number;
    region: string;
    buyer: string;
    price: number;
    numBids: number;
}

interface StatsData {
    gameId: string;
    phase: string;
    leaderboard: LeaderboardEntry[];
    avgCostPerSeed: SeedCost[];
    auctionHistory: SaleRecord[];
    totalTeamsSold: number;
    totalTeamsUnsold: number;
}

function formatCurrency(value: number) {
    return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function ViewPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [gameId, setGameId] = useState<string>(location.state?.gameId || "");
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Recover gameId from session if needed
    useEffect(() => {
        if (gameId) return;
        const recover = async () => {
            try {
                const response = await fetch(`${BACKEND_HTTP_URL}/rejoin/`, { credentials: "include" });
                if (response.ok) {
                    const data = await response.json();
                    setGameId(data.gameId);
                } else {
                    navigate("/");
                }
            } catch {
                navigate("/");
            }
        };
        recover();
    }, [gameId, navigate]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        if (!gameId) return;
        try {
            const response = await fetch(`${BACKEND_HTTP_URL}/game/${gameId}/stats`, {
                credentials: "include",
            });
            if (response.ok) {
                const data: StatsData = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
        }
    }, [gameId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // WebSocket for live updates — re-fetch stats when player data changes
    useEffect(() => {
        if (!gameId) return;

        const ws = new WebSocket(`${BACKEND_WS_URL}/ws/${gameId}`);

        ws.onmessage = (event) => {
            if (event.data === "gameStarted") return;
            try {
                const data = JSON.parse(event.data);
                // Re-fetch stats when players update (means a bid finalized or scores changed)
                if ("players" in data) {
                    fetchStats();
                }
            } catch {
                // ignore parse errors
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [gameId, fetchStats]);

    const handleRefreshScores = async () => {
        if (!gameId || refreshing) return;
        setRefreshing(true);
        try {
            const response = await fetch(`${BACKEND_HTTP_URL}/game/${gameId}/refresh-scores`, {
                method: "POST",
                credentials: "include",
            });
            if (response.ok) {
                await fetchStats();
            }
        } catch (error) {
            console.error("Failed to refresh scores:", error);
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="bloodbath-page">
                <div className="bloodbath-page__inner">
                    <div className="view-page__loading">Loading stats...</div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bloodbath-page">
                <div className="bloodbath-page__inner">
                    <div className="view-page__empty">Could not load game stats.</div>
                </div>
            </div>
        );
    }

    const isLive = stats.phase === "auction";

    return (
        <div className="bloodbath-page">
            <div className="bloodbath-page__inner">
                {/* Header */}
                <div className="view-page__header">
                    <div className="view-page__header-left">
                        <div className="graveyard-bracket__brand">
                            <div className="graveyard-bracket__brand-main">Stats</div>
                            <div className="graveyard-bracket__brand-accent">Dashboard</div>
                        </div>
                        {isLive && (
                            <span className="view-page__live-badge">
                                <span className="view-page__live-dot" />
                                Live Auction
                            </span>
                        )}
                        <span className="view-page__game-id">Game {stats.gameId}</span>
                    </div>
                    <button
                        type="button"
                        className="view-page__refresh-btn"
                        onClick={handleRefreshScores}
                        disabled={refreshing}
                    >
                        {refreshing ? "Refreshing..." : "Refresh Scores"}
                    </button>
                </div>

                {/* Summary chips */}
                <div className="view-page__summary">
                    <div className="summary-chip">
                        <span className="summary-chip__value">{stats.leaderboard.length}</span>
                        <span className="summary-chip__label">Players</span>
                    </div>
                    <div className="summary-chip">
                        <span className="summary-chip__value">{stats.totalTeamsSold}</span>
                        <span className="summary-chip__label">Teams Sold</span>
                    </div>
                    <div className="summary-chip">
                        <span className="summary-chip__value">{stats.totalTeamsUnsold}</span>
                        <span className="summary-chip__label">Unsold</span>
                    </div>
                    <div className="summary-chip">
                        <span className="summary-chip__value">
                            {formatCurrency(stats.leaderboard.reduce((sum, p) => sum + p.spent, 0))}
                        </span>
                        <span className="summary-chip__label">Total Spent</span>
                    </div>
                </div>

                <div className="view-page__grid">
                    {/* Leaderboard */}
                    <div className="stat-card view-page__grid--full">
                        <h2 className="stat-card__title">Leaderboard</h2>
                        <table className="stat-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Player</th>
                                    <th>Points</th>
                                    <th>Spent</th>
                                    <th>Balance</th>
                                    <th>Teams</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.leaderboard.map((player, index) => (
                                    <tr key={player.name}>
                                        <td className="stat-table__rank">{index + 1}</td>
                                        <td className="stat-table__name">{player.name}</td>
                                        <td className="stat-table__number stat-table__gold">{player.points}</td>
                                        <td className="stat-table__number stat-table__ember">{formatCurrency(player.spent)}</td>
                                        <td className="stat-table__number">{formatCurrency(player.balance)}</td>
                                        <td>
                                            <div className="stat-table__teams">
                                                {player.teams.map((team) => (
                                                    <span className="stat-table__team-chip" key={team.name}>
                                                        {team.name} ({team.seed}) — {formatCurrency(team.purchasePrice || 0)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Avg Cost Per Seed */}
                    <div className="stat-card">
                        <h2 className="stat-card__title">Avg Cost Per Seed</h2>
                        <table className="stat-table">
                            <thead>
                                <tr>
                                    <th>Seed</th>
                                    <th>Avg Cost</th>
                                    <th>Total</th>
                                    <th>Sold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.avgCostPerSeed.map((entry) => (
                                    <tr key={entry.seed}>
                                        <td className="stat-table__number stat-table__gold">#{entry.seed}</td>
                                        <td className="stat-table__number stat-table__ember">{formatCurrency(entry.avgCost)}</td>
                                        <td className="stat-table__number">{formatCurrency(entry.totalSpent)}</td>
                                        <td className="stat-table__number">{entry.teamsSold}</td>
                                    </tr>
                                ))}
                                {stats.avgCostPerSeed.length === 0 && (
                                    <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--bloodbath-copy-muted)" }}>No sales yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Auction History */}
                    <div className="stat-card">
                        <h2 className="stat-card__title">Auction History</h2>
                        <div className="auction-history">
                            <table className="stat-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Team</th>
                                        <th>Seed</th>
                                        <th>Buyer</th>
                                        <th>Price</th>
                                        <th>Bids</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.auctionHistory.map((sale, index) => (
                                        <tr key={index}>
                                            <td className="stat-table__number" style={{ color: "var(--bloodbath-copy-muted)" }}>{index + 1}</td>
                                            <td className="stat-table__name">{sale.team}</td>
                                            <td className="stat-table__number">#{sale.seed}</td>
                                            <td>{sale.buyer || <span style={{ color: "var(--bloodbath-copy-muted)" }}>Unsold</span>}</td>
                                            <td className="stat-table__number stat-table__ember">
                                                {sale.price > 0 ? formatCurrency(sale.price) : "—"}
                                            </td>
                                            <td className="stat-table__number">{sale.numBids}</td>
                                        </tr>
                                    ))}
                                    {stats.auctionHistory.length === 0 && (
                                        <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--bloodbath-copy-muted)" }}>No auctions completed yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ViewPage;
