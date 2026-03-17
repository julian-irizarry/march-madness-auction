import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { BACKEND_HTTP_URL, BACKEND_WS_URL } from "./Utils";
import imageSrc from "./images/march_madness_logo_auction.png";
import CrownIcon from "./icons/crown.svg?react";
import UserIcon from "./icons/user.svg?react";
import "./css/Fonts.css";
import "./css/Bracket.css";
import "./css/BloodbathPages.css";

const ROSTER_ICON_COLORS = ["#ff6b4a", "#49a7ff", "#ffd46f", "#69dd8f", "#ff8a57", "#7cc6ff"];

function LobbyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gameId, setGameId] = useState<string>(location.state?.gameId || "");
  const [isCreator, setIsCreator] = useState<boolean>(location.state?.isCreator || false);
  const [playerName, setPlayerName] = useState<string>(location.state?.playerName || "");

  const [players, setPlayers] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState<boolean>(!!location.state?.gameId);

  // If no state from navigation, try to recover from session cookie
  useEffect(() => {
    if (location.state?.gameId) return;
    const recover = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_URL}/rejoin/`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          const routeState = { gameId: data.gameId, isCreator: data.isCreator, playerName: data.playerName };
          if (data.phase === "ended") {
            navigate("/view", { state: { gameId: data.gameId } });
            return;
          }
          if (data.phase === "auction") {
            navigate("/game", { state: routeState });
            return;
          }
          setGameId(data.gameId);
          setIsCreator(data.isCreator);
          setPlayerName(data.playerName);
          setSessionLoaded(true);
        } else {
          navigate("/");
        }
      } catch {
        navigate("/");
      }
    };
    recover();
  }, [location.state, navigate]);

  useEffect(() => {
    if (!sessionLoaded || !gameId) return;

    const ws = new WebSocket(`${BACKEND_WS_URL}/ws/${gameId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (event.data === "gameStarted") {
        navigate("/game", { state: { gameId, isCreator, playerName } });
        return;
      }

      const data = JSON.parse(event.data);
      if ("players" in data) {
        setPlayers(Object.keys(data.players));
      }
    };

    return () => ws.close();
  }, [navigate, gameId, isCreator, playerName, sessionLoaded]);

  const handleStartGameClick = () => {
    if (isCreator && wsRef.current) {
      wsRef.current.send("startGame");
    }
  };

  return (
    <div className="bloodbath-page bloodbath-page--lobby">
      <div className="bloodbath-page__inner">
        <div className="bloodbath-simple-lobby">
          <div className="bloodbath-simple-lobby__brand">
            <div className="graveyard-bracket__brand">
              <div className="graveyard-bracket__brand-main">Game</div>
              <div className="graveyard-bracket__brand-accent">Lobby</div>
            </div>
          </div>

          <div className="bloodbath-panel bloodbath-simple-lobby__stage">
            <div className="bloodbath-panel__inner">
              <div className="bloodbath-simple-lobby__grid">
                <section className="bloodbath-simple-lobby__column bloodbath-simple-lobby__column--players">
                  <div className="bloodbath-simple-lobby__welcome">
                    <h1 className="bloodbath-simple-lobby__title">{playerName ? `Welcome ${playerName}!` : "Welcome!"}</h1>
                    <p className="bloodbath-simple-lobby__subtitle">You are {isCreator ? "the game creator" : "a participant"}.</p>
                  </div>

                  <div className="bloodbath-simple-lobby__player-list">
                    {players.length > 0 ? (
                      players.map((participant, index) => {
                        const isHost = index === 0;
                        const iconColor = ROSTER_ICON_COLORS[index % ROSTER_ICON_COLORS.length];

                        return (
                          <div className="bloodbath-simple-lobby__player-card" key={`${participant}_${index}`}>
                            <div className="bloodbath-simple-lobby__player-main">
                              <span className="bloodbath-simple-lobby__player-icon" aria-hidden="true">
                                {isHost ? (
                                  <CrownIcon fill="#ffd989" width="20px" height="20px" />
                                ) : (
                                  <UserIcon fill={iconColor} width="16px" height="16px" />
                                )}
                              </span>
                              <span className="bloodbath-simple-lobby__player-name">{participant}</span>
                            </div>

                            {isHost ? <span className="bloodbath-simple-lobby__player-badge">Host</span> : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="bloodbath-simple-lobby__empty">No players</div>
                    )}
                  </div>
                </section>

                <section className="bloodbath-simple-lobby__column bloodbath-simple-lobby__column--room">
                  <div className="bloodbath-home__logo-shell bloodbath-home__logo-shell--simple">
                    <img src={imageSrc} alt="March Madness Auction logo" className="bloodbath-home__logo" />
                  </div>

                  <div className="bloodbath-simple-lobby__room-code">
                    <span className="bloodbath-simple-lobby__room-label">Your Room Code</span>
                    <strong className="bloodbath-simple-lobby__room-value">{gameId || "------"}</strong>
                  </div>

                  <div className="bloodbath-simple-lobby__action">
                    {isCreator ? (
                      <button type="button" className="bloodbath-button bloodbath-button--primary bloodbath-button--large" onClick={handleStartGameClick}>
                        Start Game
                      </button>
                    ) : (
                      <div className="bloodbath-simple-lobby__waiting">Waiting for the host to start the game...</div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LobbyPage;
