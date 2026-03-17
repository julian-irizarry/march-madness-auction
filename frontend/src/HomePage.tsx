import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BACKEND_HTTP_URL } from "./Utils";
import imageSrc from "./images/march_madness_logo_auction.png";
import "./css/Fonts.css";
import "./css/Bracket.css";
import "./css/BloodbathPages.css";

const DIALOG_MODE = {
  CREATE: "CREATE",
  JOIN: "JOIN",
  VIEW: "VIEW",
} as const;

type DialogMode = typeof DIALOG_MODE[keyof typeof DIALOG_MODE];

const DIALOG_DETAILS: Record<
  DialogMode,
  {
    title: string;
    submitLabel: string;
    showPlayerField: boolean;
    showGameIdField: boolean;
  }
> = {
  CREATE: {
    title: "Create Game",
    submitLabel: "Create",
    showPlayerField: true,
    showGameIdField: false,
  },
  JOIN: {
    title: "Join Game",
    submitLabel: "Join",
    showPlayerField: true,
    showGameIdField: true,
  },
  VIEW: {
    title: "View Game",
    submitLabel: "View",
    showPlayerField: false,
    showGameIdField: true,
  },
};

function HomePage() {
  const navigate = useNavigate();
  const [dialogMode, setDialogMode] = useState<DialogMode>(DIALOG_MODE.VIEW);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);
  const shouldEnableAudio = import.meta.env.MODE !== "test";

  useEffect(() => {
    if (!shouldEnableAudio) {
      return undefined;
    }

    const audio = new Audio("/audio/metal.mp3");
    audio.loop = true;
    audio.volume = 1.0;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [shouldEnableAudio]);

  useEffect(() => {
    if (!shouldEnableAudio || !audioRef.current) {
      return;
    }

    audioRef.current.muted = isMuted;

    const startAudio = async () => {
      if (!audioRef.current || isPlaying) {
        return;
      }

      try {
        await audioRef.current.play();
        setIsPlaying(true);
        document.removeEventListener("click", handleFirstInteraction);
        document.removeEventListener("keypress", handleFirstInteraction);
        document.removeEventListener("scroll", handleFirstInteraction);
      } catch (error) {
        console.error("Audio playback failed:", error);
      }
    };

    const handleFirstInteraction = () => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        void startAudio();
      }
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keypress", handleFirstInteraction);
    document.addEventListener("scroll", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keypress", handleFirstInteraction);
      document.removeEventListener("scroll", handleFirstInteraction);
    };
  }, [isMuted, isPlaying, shouldEnableAudio]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDialogOpen(false);
        setDialogError("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen]);

  const toggleMute = () => {
    setIsMuted((currentValue) => !currentValue);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setDialogError("");
  };

  const handleOpenDialog = (mode: DialogMode) => {
    setDialogMode(mode);
    setDialogError("");
    setIsDialogOpen(true);
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_URL}/rejoin/`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const routeState = { gameId: data.gameId, isCreator: data.isCreator, playerName: data.playerName };
          if (data.phase === "ended") {
            navigate("/view", { state: { gameId: data.gameId } });
          } else if (data.phase === "auction") {
            navigate("/game", { state: routeState });
          } else {
            navigate("/lobby", { state: routeState });
          }
        }
      } catch (error) {
        // No session or server down — stay on home page
      }
    };
    checkSession();
  }, [navigate]);

  const handleCreateGame = async () => {
    setDialogError("");
    try {
      const response = await fetch(`${BACKEND_HTTP_URL}/create-game/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ player: playerName }),
      });

      if (response.ok) {
        const data = await response.json();
        const createdGameId = data.id;
        navigate("/lobby", { state: { gameId: createdGameId, isCreator: true, playerName } });
      } else {
        console.error("Failed to create game:", response.statusText);
      }
    } catch (error) {
      console.error("Error creating game:", error);
    }
  };

  const handleJoinGame = async () => {
    setDialogError("");
    try {
      const response = await fetch(`${BACKEND_HTTP_URL}/join-game/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ gameId, player: playerName }),
      });

      if (response.ok) {
        navigate("/lobby", { state: { gameId, isCreator: false, playerName } });
        setIsDialogOpen(false);
      } else {
        const responseData = await response.json();
        console.error("Error joining game:", responseData.detail);
        setDialogError(responseData.detail);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const handleViewGame = async () => {
    setDialogError("");
    try {
      const response = await fetch(`${BACKEND_HTTP_URL}/view-game/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ gameId }),
      });

      if (response.ok) {
        navigate("/view", { state: { gameId } });
        setIsDialogOpen(false);
      } else {
        const responseData = await response.json();
        console.error("Error viewing game:", responseData.detail);
        setDialogError(responseData.detail);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const handleSubmitDialog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (dialogMode === DIALOG_MODE.CREATE) {
      await handleCreateGame();
      return;
    }

    if (dialogMode === DIALOG_MODE.JOIN) {
      await handleJoinGame();
      return;
    }

    await handleViewGame();
  };

  const activeDialog = DIALOG_DETAILS[dialogMode];

  return (
    <div className="bloodbath-page bloodbath-page--home">
      <div className="bloodbath-page__inner">
        <div className="bloodbath-simple-home">
          <div className="bloodbath-simple-home__brand">
            <div className="graveyard-bracket__brand">
              <div className="graveyard-bracket__brand-main">Auction</div>
              <div className="graveyard-bracket__brand-accent">Bloodbath</div>
            </div>
          </div>

          <div className="bloodbath-panel bloodbath-simple-home__stage">
            <div className="bloodbath-panel__inner">
              <div className="bloodbath-simple-home__row">
                <div className="bloodbath-simple-home__action bloodbath-simple-home__action--left">
                  <button type="button" className="bloodbath-button bloodbath-button--primary bloodbath-button--large" onClick={() => handleOpenDialog(DIALOG_MODE.CREATE)}>
                    Create Game
                  </button>
                </div>

                <div className="bloodbath-simple-home__logo-block">
                  <div className="bloodbath-home__logo-shell bloodbath-home__logo-shell--simple">
                    <img src={imageSrc} alt="March Madness Auction logo" className="bloodbath-home__logo" />
                  </div>
                </div>

                <div className="bloodbath-simple-home__action bloodbath-simple-home__action--right">
                  <button type="button" className="bloodbath-button bloodbath-button--primary bloodbath-button--large" onClick={() => handleOpenDialog(DIALOG_MODE.JOIN)}>
                    Join Game
                  </button>
                </div>
              </div>

              <div className="bloodbath-simple-home__footer">
                <button type="button" className="bloodbath-button bloodbath-button--secondary bloodbath-button--large" onClick={() => handleOpenDialog(DIALOG_MODE.VIEW)}>
                  View Game
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="bloodbath-audio-toggle" onClick={toggleMute}>
        <span className="bloodbath-audio-toggle__label">Soundtrack</span>
        <span className="bloodbath-audio-toggle__value">{!isPlaying ? "Arm Audio" : isMuted ? "Muted" : "Live"}</span>
      </button>

      {isDialogOpen ? (
        <div className="bloodbath-overlay" onClick={handleCloseDialog}>
          <div
            className="bloodbath-dialog bloodbath-dialog--simple"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bloodbath-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bloodbath-dialog__shell">
              <div className="bloodbath-dialog__header bloodbath-dialog__header--simple">
                <h2 className="bloodbath-dialog__title" id="bloodbath-dialog-title">
                  {activeDialog.title}
                </h2>
              </div>

              <form className="bloodbath-dialog__form" onSubmit={handleSubmitDialog}>
                {dialogError ? (
                  <div className="bloodbath-dialog__error" role="alert">
                    {dialogError}
                  </div>
                ) : null}

                {activeDialog.showPlayerField ? (
                  <label className="bloodbath-field" htmlFor="player-name-input">
                    <span className="bloodbath-field__label">Your Name</span>
                    <input
                      id="player-name-input"
                      className="bloodbath-field__input"
                      type="text"
                      value={playerName}
                      onChange={(event) => setPlayerName(event.currentTarget.value)}
                    />
                  </label>
                ) : null}

                {activeDialog.showGameIdField ? (
                  <label className="bloodbath-field" htmlFor="game-id-input">
                    <span className="bloodbath-field__label">Game ID</span>
                    <input
                      id="game-id-input"
                      className="bloodbath-field__input"
                      type="text"
                      value={gameId}
                      onChange={(event) => setGameId(event.currentTarget.value)}
                    />
                  </label>
                ) : null}

                <div className="bloodbath-dialog__actions">
                  <button type="button" className="bloodbath-button bloodbath-button--secondary" onClick={handleCloseDialog}>
                    Close
                  </button>
                  <button type="submit" className="bloodbath-button bloodbath-button--primary">
                    {activeDialog.submitLabel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default HomePage;
