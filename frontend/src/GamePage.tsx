import { Typography } from "@mui/joy";
import { Grid, Paper, Card } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useRef, useState } from "react";

import AuctionBiddingPanel from "./AuctionBiddingPanel";
import Bracket from "./Bracket";
import { PlayerInfo, TeamInfo, BACKEND_HTTP_URL, BACKEND_WS_URL, normalizeTeamKey } from "./Utils";

import "./css/App.css";
import "./css/Fonts.css";
import "./css/GamePage.css";

type WebSocketMessage = {
    players?: Map<string, PlayerInfo>;
    bid?: number;
    current_bidder?: string;
    countdown?: number;
    team?: TeamInfo;
    log?: string;
    remaining?: TeamInfo[];
    all_teams?: TeamInfo[];
};

type AvailabilityFilter = "all" | "available" | "sold";
type TeamRailStatus = "live" | "available" | "sold";
type InspectedTeamTone = "available" | "sold";

type TeamRailEntry = {
    key: string;
    team: TeamInfo;
    status: TeamRailStatus;
    ownerName?: string;
    purchasePrice?: number;
    bundleSeed?: number;
    displayName: string;
    regionLabel: string;
    searchText: string;
};

interface PlayersRailProps {
    players: Array<[string, PlayerInfo]>;
    currentPlayerName?: string;
    expandedPlayerName: string | null;
    currentBidder: string;
    onTogglePlayer: (playerName: string) => void;
}

interface TeamsRailProps {
    entries: TeamRailEntry[];
    currentTeam: TeamInfo;
    availabilityFilter: AvailabilityFilter;
    searchQuery: string;
    openSections: string[];
    inspectedTeamKey: string;
    expandedSoldTeamKey: string | null;
    onAvailabilityChange: (nextFilter: AvailabilityFilter) => void;
    onSearchChange: (nextQuery: string) => void;
    onToggleSection: (sectionId: string) => void;
    onInspectTeam: (entry: TeamRailEntry) => void;
}

const AVAILABILITY_FILTER_OPTIONS: Array<{ value: AvailabilityFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "available", label: "Open" },
    { value: "sold", label: "Sold" },
];

const REGION_SECTION_ORDER = ["South", "East", "Midwest", "West"] as const;

function formatCurrency(value?: number) {
    if (value === undefined || Number.isNaN(value)) {
        return "--";
    }

    return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function getTeamLogoUrl(urlName?: string) {
    return urlName
        ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${urlName}.svg`
        : "";
}

function getTeamCountLabel(teamCount: number) {
    return `${teamCount} TEAM${teamCount === 1 ? "" : "S"}`;
}

function isSeedBundleTeam(team?: Pick<TeamInfo, "region" | "seed"> | null) {
    if (!team) {
        return false;
    }

    return team.region === "bundle" && (team.seed === 15 || team.seed === 16);
}

function getAuctionRoundKey(team?: Pick<TeamInfo, "shortName" | "urlName" | "region" | "seed"> | null) {
    if (!team) {
        return "";
    }

    if (team.seed === 15 || team.seed === 16) {
        return `bundle:${team.seed}`;
    }

    return normalizeTeamKey(team);
}

function countAuctionRounds(teams: TeamInfo[]) {
    return new Set(teams.map((team) => getAuctionRoundKey(team)).filter(Boolean)).size;
}

function getTeamDisplayName(team: Pick<TeamInfo, "shortName" | "region" | "seed">) {
    return isSeedBundleTeam(team)
        ? `${team.seed}-SEED BUNDLE`
        : team.shortName.toUpperCase();
}

function getTeamRegionLabel(team: Pick<TeamInfo, "region">) {
    return team.region && team.region !== "bundle"
        ? `${team.region.toUpperCase()} REGION`
        : "SEED BUNDLE";
}

function cloneTeamInfo(team: TeamInfo): TeamInfo {
    return {
        shortName: team.shortName,
        urlName: team.urlName,
        seed: team.seed,
        region: team.region,
        purchasePrice: team.purchasePrice,
        points: team.points,
    };
}

function buildTeamRailEntry(
    team: TeamInfo,
    status: TeamRailStatus,
    options?: {
        ownerName?: string;
        purchasePrice?: number;
        bundleSeed?: number;
    }
): TeamRailEntry {
    const entryTeam = cloneTeamInfo(team);
    const key = normalizeTeamKey(entryTeam);
    const displayName = getTeamDisplayName(entryTeam);
    const regionLabel = getTeamRegionLabel(entryTeam);
    const searchTokens = [
        displayName,
        entryTeam.shortName,
        entryTeam.region,
        options?.ownerName || "",
        entryTeam.seed > 0 ? `#${entryTeam.seed}` : "",
        options?.bundleSeed ? `${options.bundleSeed} seed bundle` : "",
    ];

    return {
        key,
        team: entryTeam,
        status,
        ownerName: options?.ownerName,
        purchasePrice: options?.purchasePrice,
        bundleSeed: options?.bundleSeed,
        displayName,
        regionLabel,
        searchText: searchTokens.join(" ").toLowerCase(),
    };
}

function sortTeamRailEntries(left: TeamRailEntry, right: TeamRailEntry) {
    if (left.team.seed !== right.team.seed) {
        return left.team.seed - right.team.seed;
    }

    return left.displayName.localeCompare(right.displayName);
}

function shouldUseTapSoldCardReveal() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function PlayersRail(props: PlayersRailProps) {
    return (
        <aside className="player-rail" aria-label="Players">
            <div className="player-rail__header">
                <h2 className="player-rail__title">PLAYERS ({props.players.length})</h2>
            </div>

            <div className="player-rail__list">
                {props.players.length > 0 ? (
                    props.players.map(([playerName, playerInfo]) => {
                        const isExpanded = props.expandedPlayerName === playerName;
                        const isHighestBidder = Boolean(props.currentBidder) && props.currentBidder === playerName;
                        const isCurrentPlayer = Boolean(props.currentPlayerName) && props.currentPlayerName === playerName;
                        const teamCount = playerInfo.teams.length;

                        return (
                            <button
                                type="button"
                                key={playerName}
                                className={[
                                    "player-rail__card",
                                    isExpanded ? "player-rail__card--expanded" : "",
                                    isHighestBidder ? "player-rail__card--leader" : "",
                                    isCurrentPlayer ? "player-rail__card--self" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                onClick={() => props.onTogglePlayer(playerName)}
                                aria-expanded={isExpanded}
                            >
                                <div className="player-rail__card-shell">
                                    <div className="player-rail__summary">
                                        <div className="player-rail__identity">
                                            <div className="player-rail__copy">
                                                <div className="player-rail__name-line">
                                                    <span className="player-rail__name">{playerName.toUpperCase()}</span>
                                                </div>

                                                <div className="player-rail__meta-line">
                                                    <span
                                                        className={[
                                                            "player-rail__balance",
                                                            playerInfo.balance < 25 ? "player-rail__balance--danger" : "",
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" ")}
                                                    >
                                                        {formatCurrency(playerInfo.balance)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="player-rail__actions">
                                            <span className="player-rail__badge">{getTeamCountLabel(teamCount)}</span>
                                            {isHighestBidder ? (
                                                <span className="player-rail__leader-tag">LEAD</span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="player-rail__details">
                                        <div className="player-rail__details-inner">
                                            <div className="player-rail__details-label">Owned Teams</div>
                                            {teamCount > 0 ? (
                                                playerInfo.teams.map((ownedTeam, teamIndex) => {
                                                    const teamLogoUrl = getTeamLogoUrl(ownedTeam.urlName);

                                                    return (
                                                        <div className="player-rail__team-row" key={`${playerName}_${ownedTeam.shortName}_${teamIndex}`}>
                                                            <div className="player-rail__team-main">
                                                                <span className="player-rail__team-logo-shell" aria-hidden="true">
                                                                    {teamLogoUrl ? (
                                                                        <img
                                                                            className="player-rail__team-logo"
                                                                            src={teamLogoUrl}
                                                                            alt=""
                                                                            loading="lazy"
                                                                            onError={(event) => {
                                                                                event.currentTarget.style.display = "none";
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <span className="player-rail__team-logo-fallback">{ownedTeam.shortName.trim().charAt(0).toUpperCase() || "?"}</span>
                                                                    )}
                                                                </span>

                                                                <span className="player-rail__team-copy">
                                                                    <span className="player-rail__team-name">{ownedTeam.shortName.toUpperCase()}</span>
                                                                    {ownedTeam.seed > 0 ? (
                                                                        <span className="player-rail__team-seed">#{ownedTeam.seed}</span>
                                                                    ) : null}
                                                                </span>
                                                            </div>

                                                            <span className="player-rail__team-price">{formatCurrency(ownedTeam.purchasePrice)}</span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="player-rail__empty-copy">No teams owned yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <p className="player-rail__empty-copy player-rail__empty-copy--panel">No players yet.</p>
                )}
            </div>
        </aside>
    );
}

function TeamsRail(props: TeamsRailProps) {
    const stickyRef = useRef<HTMLDivElement | null>(null);
    const [stickyOffset, setStickyOffset] = useState(0);

    useEffect(() => {
        const stickyNode = stickyRef.current;
        if (!stickyNode) {
            return;
        }

        const updateStickyOffset = () => {
            setStickyOffset(stickyNode.offsetHeight);
        };

        updateStickyOffset();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateStickyOffset);
            return () => window.removeEventListener("resize", updateStickyOffset);
        }

        const observer = new ResizeObserver(() => updateStickyOffset());
        observer.observe(stickyNode);

        return () => observer.disconnect();
    }, [props.currentTeam, props.availabilityFilter, props.searchQuery]);

    const totals = props.entries.reduce(
        (summary, entry) => {
            summary.total += 1;
            if (entry.status === "sold") {
                summary.sold += 1;
            } else {
                summary.available += 1;
            }
            return summary;
        },
        { total: 0, available: 0, sold: 0 }
    );

    const normalizedQuery = props.searchQuery.trim().toLowerCase();
    const filteredEntries = props.entries.filter((entry) => {
        if (props.availabilityFilter === "available" && entry.status === "sold") {
            return false;
        }

        if (props.availabilityFilter === "sold" && entry.status !== "sold") {
            return false;
        }

        if (normalizedQuery && !entry.searchText.includes(normalizedQuery)) {
            return false;
        }

        return true;
    });

    const liveSpotlightEntry = (() => {
        if (!props.currentTeam.shortName) {
            return null;
        }

        if (isSeedBundleTeam(props.currentTeam)) {
            return props.entries.find((entry) => entry.status === "live" && entry.bundleSeed === props.currentTeam.seed) || null;
        }

        const currentTeamKey = normalizeTeamKey(props.currentTeam);
        return props.entries.find((entry) => entry.key === currentTeamKey) || null;
    })();
    const regionSections = REGION_SECTION_ORDER.map((region) => ({
        id: region,
        title: region,
        entries: filteredEntries
            .filter((entry) => entry.team.region === region)
            .sort(sortTeamRailEntries),
    }));
    const hasSearch = Boolean(normalizedQuery);
    const hasMatchingEntries = regionSections.some((section) => section.entries.length > 0);
    const filterCounts: Record<AvailabilityFilter, number> = {
        all: totals.total,
        available: totals.available,
        sold: totals.sold,
    };

    const sectionIsExpanded = (sectionId: string, count: number) => {
        if (count === 0) {
            return false;
        }

        return hasSearch || props.openSections.includes(sectionId);
    };

    return (
        <aside
            className="team-rail"
            aria-label="Teams"
            style={{ "--team-rail-sticky-offset": `${stickyOffset}px` } as React.CSSProperties}
        >
            <div className="team-rail__sticky" ref={stickyRef}>
                <div className="team-rail__header">
                    <div className="team-rail__title-row">
                        <h2 className="team-rail__title">TEAMS ({totals.total})</h2>
                    </div>
                </div>

                <div className="team-rail__search-shell">
                    <label className="team-rail__search-label" htmlFor="team-rail-search">
                        Search Teams
                    </label>
                    <div className="team-rail__search-input-shell">
                        <input
                            id="team-rail-search"
                            type="search"
                            className="team-rail__search-input"
                            placeholder="Team, owner, seed bundle"
                            value={props.searchQuery}
                            onChange={(event) => props.onSearchChange(event.currentTarget.value)}
                        />

                        {props.searchQuery ? (
                            <button
                                type="button"
                                className="team-rail__search-clear"
                                onClick={() => props.onSearchChange("")}
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="team-rail__spotlight-shell">
                    {props.currentTeam.shortName ? (
                        <button
                            type="button"
                            className={[
                                "team-rail__spotlight",
                                liveSpotlightEntry && props.inspectedTeamKey === liveSpotlightEntry.key ? "team-rail__spotlight--inspected" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            onClick={() => {
                                if (liveSpotlightEntry) {
                                    props.onInspectTeam(liveSpotlightEntry);
                                }
                            }}
                        >
                            <div className="team-rail__spotlight-topline">
                                <span className="team-rail__spotlight-tag">On The Block</span>
                                <span className="team-rail__spotlight-region">{getTeamRegionLabel(props.currentTeam)}</span>
                            </div>

                            <div className="team-rail__spotlight-main">
                                <span className="team-rail__team-logo-shell team-rail__team-logo-shell--spotlight" aria-hidden="true">
                                    {!isSeedBundleTeam(props.currentTeam) && getTeamLogoUrl(props.currentTeam.urlName) ? (
                                        <img
                                            className="team-rail__team-logo"
                                            src={getTeamLogoUrl(props.currentTeam.urlName)}
                                            alt=""
                                            loading="lazy"
                                            onError={(event) => {
                                                event.currentTarget.style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <span className="team-rail__team-logo-fallback">{isSeedBundleTeam(props.currentTeam) ? `${props.currentTeam.seed}` : props.currentTeam.shortName.trim().charAt(0).toUpperCase() || "?"}</span>
                                    )}
                                </span>

                                <span className="team-rail__spotlight-copy">
                                    <span className="team-rail__spotlight-name">{getTeamDisplayName(props.currentTeam)}</span>
                                    {props.currentTeam.seed > 0 ? (
                                        <span className="team-rail__spotlight-seed">
                                            {isSeedBundleTeam(props.currentTeam)
                                                ? `Click any ${props.currentTeam.seed}-seed to follow the bundle`
                                                : `#${props.currentTeam.seed}`}
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                        </button>
                    ) : (
                        <div className="team-rail__spotlight team-rail__spotlight--idle">
                            <span className="team-rail__spotlight-tag">On The Block</span>
                            <span className="team-rail__spotlight-empty">Awaiting the next team.</span>
                        </div>
                    )}
                </div>

                <div className="team-rail__controls">
                    <div className="team-rail__filter-row" role="tablist" aria-label="Availability">
                        {AVAILABILITY_FILTER_OPTIONS.map((option) => (
                            <button
                                type="button"
                                key={option.value}
                                className={[
                                    "team-rail__filter-button",
                                    props.availabilityFilter === option.value ? "team-rail__filter-button--active" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                onClick={() => props.onAvailabilityChange(option.value)}
                                aria-pressed={props.availabilityFilter === option.value}
                            >
                                <span>{option.label}</span>
                                <span className="team-rail__filter-count">{filterCounts[option.value]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="team-rail__sections">
                {regionSections.map((section) => {
                    if (section.entries.length === 0) {
                        return null;
                    }

                    const isExpanded = sectionIsExpanded(section.id, section.entries.length);

                    return (
                        <section className="team-rail__section" key={section.id}>
                            <button
                                type="button"
                                className={[
                                    "team-rail__section-toggle",
                                    isExpanded && !hasSearch ? "team-rail__section-toggle--expanded" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                onClick={() => props.onToggleSection(section.id)}
                                aria-expanded={isExpanded}
                            >
                                <span className="team-rail__section-copy">
                                    <span className="team-rail__section-title">{section.title}</span>
                                    <span className="team-rail__section-count">{section.entries.length}</span>
                                </span>

                                <span className="team-rail__section-caret">{isExpanded ? "−" : "+"}</span>
                            </button>

                            {isExpanded ? (
                                <div className="team-rail__section-grid">
                                    {section.entries.map((entry) => {
                                        const isInspected = props.inspectedTeamKey === entry.key;
                                        const isExpandedSoldCard = props.expandedSoldTeamKey === entry.key;
                                        const teamLogoUrl = getTeamLogoUrl(entry.team.urlName);

                                        return (
                                            <button
                                                type="button"
                                                key={entry.key}
                                                className={[
                                                    "team-rail__team-card",
                                                    `team-rail__team-card--${entry.status}`,
                                                    isInspected ? "team-rail__team-card--inspected" : "",
                                                    isExpandedSoldCard ? "team-rail__team-card--expanded" : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                                onClick={() => props.onInspectTeam(entry)}
                                                aria-pressed={isInspected}
                                                aria-expanded={entry.status === "sold" ? isExpandedSoldCard : undefined}
                                            >
                                                <span className="team-rail__team-card-shell">
                                                    <span className="team-rail__team-card-topline">
                                                        <span className="team-rail__team-card-meta">
                                                            <span className="team-rail__team-seed-tag">#{entry.team.seed}</span>
                                                        </span>
                                                        <span className="team-rail__team-price-badge">
                                                            {entry.status === "sold"
                                                                ? `SOLD - ${formatCurrency(entry.purchasePrice)}`
                                                                : entry.status === "live"
                                                                    ? "Live"
                                                                    : "Available"}
                                                        </span>
                                                    </span>

                                                    <span className="team-rail__team-card-main">
                                                        <span className="team-rail__team-logo-shell" aria-hidden="true">
                                                            {teamLogoUrl ? (
                                                                <img
                                                                    className="team-rail__team-logo"
                                                                    src={teamLogoUrl}
                                                                    alt=""
                                                                    loading="lazy"
                                                                    onError={(event) => {
                                                                        event.currentTarget.style.display = "none";
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className="team-rail__team-logo-fallback">{entry.team.shortName.trim().charAt(0).toUpperCase() || "?"}</span>
                                                            )}
                                                        </span>

                                                        <span className="team-rail__team-card-copy">
                                                            <span className="team-rail__team-card-name">{entry.displayName}</span>
                                                        </span>
                                                    </span>

                                                    {entry.status === "sold" ? (
                                                        <span className="team-rail__team-owner">
                                                            {entry.bundleSeed ? "Bundle bought by " : "Bought by "}
                                                            {entry.ownerName?.toUpperCase() || "UNKNOWN"}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </section>
                    );
                })}

                {!hasMatchingEntries ? (
                    <p className="team-rail__empty-copy">No teams match this filter.</p>
                ) : null}
            </div>
        </aside>
    );
}

function useGameWebSocket(gameId: string | null) {
    const [wsData, setWsData] = useState<WebSocketMessage>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!gameId) return;

        const ws = new WebSocket(`${BACKEND_WS_URL}/ws/${gameId}`);

        ws.onerror = (socketError) => {
            setError("WebSocket connection error");
            console.error("WebSocket error:", socketError);
        };

        ws.onclose = () => {
            setError("WebSocket connection closed");
        };

        ws.onmessage = (event) => {
            if (event.data === "gameStarted") {
                return;
            }

            try {
                const data: WebSocketMessage = JSON.parse(event.data);
                console.log("DATA", data);

                if ("players" in data && data.players) {
                    const players = new Map<string, PlayerInfo>();
                    Object.entries(data.players).forEach(([key, tempPlayer]: [string, any]) => {
                        players.set(key, {
                            name: tempPlayer.name,
                            gameId: tempPlayer.gameId,
                            balance: parseInt(tempPlayer.balance),
                            points: parseInt(tempPlayer.points),
                            teams: Object.values(tempPlayer.teams).map((tempTeam: any) => ({
                                shortName: tempTeam.shortName,
                                urlName: tempTeam.urlName,
                                seed: tempTeam.seed,
                                region: tempTeam.region,
                                purchasePrice: tempTeam.purchasePrice,
                            })),
                        });
                    });
                    setWsData((prev: WebSocketMessage) => ({ ...prev, players }));
                }
                else if ("bid" in data) {
                    setWsData((prev: WebSocketMessage) => ({ ...prev, bid: data.bid }));
                }
                else if ("current_bidder" in data) {
                    setWsData((prev: WebSocketMessage) => ({ ...prev, current_bidder: data.current_bidder || "" }));
                }
                else if ("countdown" in data) {
                    setWsData((prev: WebSocketMessage) => ({ ...prev, countdown: data.countdown }));
                }
                else if ("team" in data && data.team) {
                    const currentTeam = data.team as TeamInfo;
                    setWsData((prev: WebSocketMessage) => ({
                        ...prev,
                        team: {
                            shortName: currentTeam.shortName,
                            urlName: currentTeam.urlName,
                            seed: currentTeam.seed,
                            region: currentTeam.region,
                        }
                    }));
                }
                else if ("log" in data) {
                    setWsData((prev: WebSocketMessage) => ({ ...prev, log: data.log }));
                }
                else if ("remaining" in data && data.remaining) {
                    const remaining = data.remaining.map((tempTeam: { [key: string]: any }) => ({
                        shortName: tempTeam.shortName,
                        urlName: tempTeam.urlName,
                        seed: tempTeam.seed,
                        region: tempTeam.region,
                    }));
                    setWsData((prev: WebSocketMessage) => ({ ...prev, remaining }));
                }
                else if ("all_teams" in data && data.all_teams) {
                    const nextAllTeams = data.all_teams.map((tempTeam: { [key: string]: any }) => ({
                        shortName: tempTeam.shortName,
                        urlName: tempTeam.urlName,
                        seed: tempTeam.seed,
                        region: tempTeam.region,
                    }));
                    setWsData((prev: WebSocketMessage) => ({ ...prev, all_teams: nextAllTeams }));
                }
            } catch (parseError) {
                console.error("Error parsing WebSocket message:", parseError);
                setError("Invalid message format received");
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
    const navigate = useNavigate();
    const [gameId, setGameId] = useState<string | null>(location.state?.gameId || null);
    const [playerName, setPlayerName] = useState<string>(location.state?.playerName || "");

    // If no state from navigation, try to recover from session cookie
    useEffect(() => {
        if (location.state?.gameId) return;
        const recover = async () => {
            try {
                const response = await fetch(`${BACKEND_HTTP_URL}/rejoin/`, { credentials: "include" });
                if (response.ok) {
                    const data = await response.json();
                    if (data.phase === "ended") {
                        navigate("/view", { state: { gameId: data.gameId } });
                        return;
                    }
                    if (data.phase === "lobby") {
                        navigate("/lobby", { state: { gameId: data.gameId, isCreator: data.isCreator, playerName: data.playerName } });
                        return;
                    }
                    setGameId(data.gameId);
                    setPlayerName(data.playerName);
                } else {
                    navigate("/");
                }
            } catch {
                navigate("/");
            }
        };
        recover();
    }, [location.state, navigate]);

    const [currentHighestBid, setCurrentHighestBid] = useState<number>(0);
    const [currentBidder, setCurrentBidder] = useState("");
    const [countdown, setCountdown] = useState(10);
    const [playerInfos, setPlayerInfos] = useState<Map<string, PlayerInfo>>(new Map());
    const [team, setTeam] = useState<TeamInfo>({ shortName: "", urlName: "", seed: -1, region: "" });
    const [remainingTeams, setRemainingTeams] = useState<TeamInfo[]>([]);
    const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
    const [expandedPlayerName, setExpandedPlayerName] = useState<string | null>(null);
    const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
    const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
    const [teamRailSearchQuery, setTeamRailSearchQuery] = useState("");
    const [openTeamSections, setOpenTeamSections] = useState<string[]>([]);
    const [inspectedTeam, setInspectedTeam] = useState<TeamInfo | null>(null);
    const [inspectedTeamTone, setInspectedTeamTone] = useState<InspectedTeamTone | null>(null);
    const [inspectedBundleSeed, setInspectedBundleSeed] = useState<number | null>(null);
    const [expandedSoldTeamKey, setExpandedSoldTeamKey] = useState<string | null>(null);
    const lastAutoOpenedTeamKey = useRef("");

    const { wsData, error } = useGameWebSocket(gameId);

    useEffect(() => {
        if (wsData.team) {
            setCurrentHighestBid(0);
            setCurrentBidder("");
        }
    }, [wsData.team]);

    useEffect(() => {
        if (wsData.players !== undefined) {
            setPlayerInfos(wsData.players);
        }
        if (wsData.bid !== undefined) {
            setCurrentHighestBid(wsData.bid);
        }
        if (wsData.current_bidder !== undefined) {
            setCurrentBidder(wsData.current_bidder);
        }
        if (wsData.countdown !== undefined) {
            setCountdown(wsData.countdown);
        }
        if (wsData.team !== undefined) {
            setTeam(wsData.team);
        }
        if (wsData.log !== undefined) {
            console.log("Auction log:", wsData.log);
        }
        if (wsData.remaining !== undefined) {
            setRemainingTeams(wsData.remaining);
        }
        if (wsData.all_teams !== undefined) {
            setAllTeams(wsData.all_teams);
        }
    }, [wsData.players, wsData.bid, wsData.current_bidder, wsData.countdown, wsData.team, wsData.log, wsData.remaining, wsData.all_teams, error]);

    useEffect(() => {
        if (expandedPlayerName && !playerInfos.has(expandedPlayerName)) {
            setExpandedPlayerName(null);
        }
    }, [expandedPlayerName, playerInfos]);

    const isAuctionLive = remainingTeams.length > 0 || Boolean(team.shortName);
    const totalAuctions = useMemo(() => countAuctionRounds(allTeams), [allTeams]);
    const auctionNumber = useMemo(() => {
        if (totalAuctions === 0) {
            return 0;
        }

        const remainingAuctionRounds = countAuctionRounds(remainingTeams);
        if (!isAuctionLive && remainingAuctionRounds === 0) {
            return totalAuctions;
        }

        return Math.min(totalAuctions, Math.max(1, totalAuctions - remainingAuctionRounds));
    }, [isAuctionLive, remainingTeams, totalAuctions]);
    const activePlayerBalance = playerName ? (playerInfos.get(playerName)?.balance || 0) : 0;
    const orderedPlayers = Array.from(playerInfos.entries());
    const expandedPlayerTeams = expandedPlayerName ? (playerInfos.get(expandedPlayerName)?.teams || []) : [];
    const highlightedTeamKeys = Array.from(new Set(expandedPlayerTeams.map((ownedTeam) => normalizeTeamKey(ownedTeam)).filter(Boolean)));

    const uniqueTeamRailEntries = useMemo(() => {
        const liveTeamKey = team.shortName ? normalizeTeamKey(team) : "";
        const liveBundleSeed = isSeedBundleTeam(team) ? team.seed : null;
        const remainingTeamKeys = new Set(remainingTeams.map((remainingTeam) => normalizeTeamKey(remainingTeam)).filter(Boolean));
        const ownedTeamMap = new Map<string, { ownerName: string; purchasePrice?: number; team: TeamInfo }>();
        const soldBundleMap = new Map<number, { ownerName: string; purchasePrice?: number }>();

        playerInfos.forEach((playerInfo, ownerName) => {
            playerInfo.teams.forEach((ownedTeam) => {
                if (isSeedBundleTeam(ownedTeam) && ownedTeam.seed > 0) {
                    soldBundleMap.set(ownedTeam.seed, {
                        ownerName,
                        purchasePrice: ownedTeam.purchasePrice,
                    });
                    return;
                }

                const teamKey = normalizeTeamKey(ownedTeam);
                if (teamKey) {
                    ownedTeamMap.set(teamKey, {
                        ownerName,
                        purchasePrice: ownedTeam.purchasePrice,
                        team: cloneTeamInfo(ownedTeam),
                    });
                }
            });
        });

        const teamRailEntries: TeamRailEntry[] = [];

        allTeams.forEach((availableTeam) => {
            const teamKey = normalizeTeamKey(availableTeam);
            if (!teamKey) {
                return;
            }

            const ownedRecord = ownedTeamMap.get(teamKey);
            const soldBundleRecord = (availableTeam.seed === 15 || availableTeam.seed === 16)
                ? soldBundleMap.get(availableTeam.seed)
                : undefined;
            const isLiveTeam = liveTeamKey === teamKey;
            const isLiveBundleTeam = liveBundleSeed !== null && availableTeam.seed === liveBundleSeed;

            if (soldBundleRecord) {
                teamRailEntries.push(buildTeamRailEntry(availableTeam, "sold", {
                    ownerName: soldBundleRecord.ownerName,
                    purchasePrice: soldBundleRecord.purchasePrice,
                    bundleSeed: availableTeam.seed,
                }));
                return;
            }

            if (isLiveBundleTeam || isLiveTeam) {
                teamRailEntries.push(buildTeamRailEntry(availableTeam, "live", {
                    bundleSeed: isLiveBundleTeam ? availableTeam.seed : undefined,
                }));
                return;
            }

            if (ownedRecord) {
                teamRailEntries.push(buildTeamRailEntry(ownedRecord.team, "sold", {
                    ownerName: ownedRecord.ownerName,
                    purchasePrice: ownedRecord.purchasePrice,
                }));
                return;
            }

            if (remainingTeamKeys.has(teamKey)) {
                teamRailEntries.push(buildTeamRailEntry(availableTeam, "available"));
            }
        });

        return Array.from(
            new Map(teamRailEntries.map((entry) => [entry.key, entry])).values()
        ).sort(sortTeamRailEntries);
    }, [allTeams, playerInfos, remainingTeams, team]);

    const availableSectionIds = useMemo(() => {
        const sectionIds: string[] = [];

        REGION_SECTION_ORDER.forEach((region) => {
            if (uniqueTeamRailEntries.some((entry) => entry.team.region === region)) {
                sectionIds.push(region);
            }
        });

        return sectionIds;
    }, [uniqueTeamRailEntries]);

    const defaultTeamSectionId = useMemo(() => {
        if (availableSectionIds.includes(team.region)) {
            return team.region;
        }

        return availableSectionIds[0] || "";
    }, [availableSectionIds, team]);

    useEffect(() => {
        setOpenTeamSections((currentSections) => {
            const validSections = currentSections.filter((sectionId) => availableSectionIds.includes(sectionId));
            if (validSections.length === currentSections.length) {
                return validSections;
            }

            return validSections.slice(0, 1);
        });
    }, [availableSectionIds]);

    useEffect(() => {
        const liveTeamKey = normalizeTeamKey(team);
        if (!liveTeamKey || liveTeamKey === lastAutoOpenedTeamKey.current) {
            return;
        }

        lastAutoOpenedTeamKey.current = liveTeamKey;
        if (defaultTeamSectionId) {
            setOpenTeamSections([defaultTeamSectionId]);
        }
    }, [defaultTeamSectionId, team]);

    useEffect(() => {
        if (!inspectedTeam) {
            return;
        }

        const inspectedKey = normalizeTeamKey(inspectedTeam);
        const hasVisibleEntry = uniqueTeamRailEntries.some((entry) => entry.key === inspectedKey);
        if (!hasVisibleEntry) {
            setInspectedTeam(null);
            setInspectedTeamTone(null);
            setInspectedBundleSeed(null);
        }
    }, [inspectedTeam, uniqueTeamRailEntries]);

    useEffect(() => {
        if (expandedSoldTeamKey && !uniqueTeamRailEntries.some((entry) => entry.status === "sold" && entry.key === expandedSoldTeamKey)) {
            setExpandedSoldTeamKey(null);
        }
    }, [expandedSoldTeamKey, uniqueTeamRailEntries]);

    const inspectedTeamKey = inspectedTeam ? normalizeTeamKey(inspectedTeam) : "";

    const handleTogglePlayer = (nextPlayerName: string) => {
        setExpandedPlayerName((currentPlayerName) => currentPlayerName === nextPlayerName ? null : nextPlayerName);
    };

    const handleCopyGameCode = async () => {
        if (!gameId || !navigator.clipboard) {
            return;
        }

        try {
            await navigator.clipboard.writeText(gameId);
            setCopyState("copied");
            window.setTimeout(() => setCopyState("idle"), 1400);
        } catch (copyError) {
            console.error("Unable to copy game code", copyError);
        }
    };

    const handleToggleTeamSection = (sectionId: string) => {
        if (teamRailSearchQuery.trim()) {
            return;
        }

        setOpenTeamSections((currentSections) => currentSections.includes(sectionId) ? [] : [sectionId]);
    };

    const handleInspectTeam = (entry: TeamRailEntry) => {
        setInspectedTeam(cloneTeamInfo(entry.team));
        setInspectedTeamTone(entry.status === "sold" ? "sold" : "available");
        setInspectedBundleSeed(entry.bundleSeed || null);

        if (entry.status === "sold" && shouldUseTapSoldCardReveal()) {
            setExpandedSoldTeamKey((currentKey) => currentKey === entry.key ? null : entry.key);
            return;
        }

        if (entry.status !== "sold") {
            setExpandedSoldTeamKey(null);
        }
    };

    if (!gameId) {
        return null;
    }

    return (
        <div id="outer-container" className="game-page-shell">
            <Paper
                elevation={0}
                sx={{
                    minHeight: "calc(100vh - 48px)",
                    width: "min(1640px, 100%)",
                    padding: 0,
                    overflow: "visible",
                    backgroundColor: "transparent",
                    boxShadow: "none"
                }}
            >
                <div className="graveyard-bracket__header game-page__top-rail">
                    <div className="graveyard-bracket__brand">
                        <div className="graveyard-bracket__brand-main">Bracket</div>
                        <div className="graveyard-bracket__brand-accent">Bloodbath</div>
                    </div>

                    <div className="graveyard-bracket__meta">
                        <div className="graveyard-bracket__meta-chip graveyard-bracket__meta-chip--status">
                            <span className="graveyard-bracket__meta-label">Round 1</span>
                            <span className="graveyard-bracket__meta-divider">•</span>
                            <span className="graveyard-bracket__meta-label">Auction</span>
                            <span className="graveyard-bracket__meta-value">
                                {auctionNumber}/{totalAuctions || allTeams.length}
                            </span>
                        </div>

                        <div className="graveyard-bracket__meta-chip">
                            <span className="graveyard-bracket__meta-label">Game Code</span>
                            <span className="graveyard-bracket__meta-value">{gameId || "------"}</span>
                            <button type="button" className="graveyard-bracket__copy-button" onClick={handleCopyGameCode}>
                                {copyState === "copied" ? "Copied" : "Copy"}
                            </button>
                        </div>

                        <div className={[
                            "graveyard-bracket__meta-chip",
                            "graveyard-bracket__meta-chip--live",
                            isAuctionLive ? "graveyard-bracket__meta-chip--live-active" : "graveyard-bracket__meta-chip--live-complete",
                        ].join(" ")}>
                            <span className="graveyard-bracket__live-indicator" aria-hidden="true" />
                            <span className="graveyard-bracket__meta-label">{isAuctionLive ? "LIVE" : "DONE"}</span>
                        </div>
                    </div>
                </div>

                <Grid
                    container
                    spacing={2}
                    className="game-page__board"
                    sx={{ display: "flex", justifyContent: "center", alignItems: "flex-start", flexDirection: "row", minHeight: "100%" }}
                >
                    <Grid item xs={12} lg={2}>
                        <PlayersRail
                            players={orderedPlayers}
                            currentPlayerName={playerName}
                            expandedPlayerName={expandedPlayerName}
                            currentBidder={currentBidder}
                            onTogglePlayer={handleTogglePlayer}
                        />
                    </Grid>

                    <Grid item xs={12} lg={8}>
                        <Grid container spacing={2} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <Grid item xs={12}>
                                <Card
                                    sx={{
                                        height: { xs: "540px", md: "760px", lg: "840px" },
                                        width: "100%",
                                        padding: 0,
                                        overflow: "hidden",
                                        backgroundColor: "transparent",
                                        border: 0,
                                        borderRadius: 0,
                                        boxShadow: "none"
                                    }}
                                >
                                    {allTeams.length > 0 ? (
                                        <Bracket
                                            all_teams={allTeams}
                                            selected_team={team}
                                            highlightedTeamKeys={highlightedTeamKeys}
                                            inspectedTeam={inspectedTeam}
                                            inspectedTeamTone={inspectedTeamTone}
                                            inspectedBundleSeed={inspectedBundleSeed}
                                        />
                                    ) : (
                                        <Typography sx={{ color: "white", padding: 2 }}>No teams available</Typography>
                                    )}
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12} lg={2}>
                        <TeamsRail
                            entries={uniqueTeamRailEntries}
                            currentTeam={team}
                            availabilityFilter={availabilityFilter}
                            searchQuery={teamRailSearchQuery}
                            openSections={openTeamSections}
                            inspectedTeamKey={inspectedTeamKey}
                            expandedSoldTeamKey={expandedSoldTeamKey}
                            onAvailabilityChange={setAvailabilityFilter}
                            onSearchChange={setTeamRailSearchQuery}
                            onToggleSection={handleToggleTeamSection}
                            onInspectTeam={handleInspectTeam}
                        />
                    </Grid>
                </Grid>

                <AuctionBiddingPanel
                    gameId={gameId}
                    playerName={playerName}
                    currentHighestBid={currentHighestBid}
                    currentBidder={currentBidder}
                    countdown={countdown}
                    balance={activePlayerBalance}
                    team={team}
                />
            </Paper>
        </div>
    );
}

export default GamePage;
