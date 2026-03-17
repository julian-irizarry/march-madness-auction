import React from "react";

import Bid from "./Bid";
import { TeamInfo } from "./Utils";
import "./css/AuctionBiddingPanel.css";

interface AuctionBiddingPanelProps {
  gameId: string;
  playerName: string;
  currentHighestBid: number;
  currentBidder: string;
  countdown: number;
  balance: number;
  team: TeamInfo;
}

function getTeamLogoUrl(urlName?: string) {
  return urlName
    ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${urlName}.svg`
    : "";
}

function formatCurrency(value: number) {
  return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function hexToRgbString(hex: string) {
  const normalized = hex.replace("#", "");
  const safeHex = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;
  const value = parseInt(safeHex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `${red}, ${green}, ${blue}`;
}

function brightenHex(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  const safeHex = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;
  const value = parseInt(safeHex, 16);
  const brightenChannel = (shift: number) => {
    const base = (value >> shift) & 255;
    return Math.min(255, Math.round(base + (255 - base) * amount));
  };

  const red = brightenChannel(16);
  const green = brightenChannel(8);
  const blue = brightenChannel(0);
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function getTeamAccent(urlName?: string, shortName?: string) {
  const accentMap: Record<string, string> = {
    arizona: "#cc0033",
    auburn: "#f68026",
    baylor: "#0f7b49",
    byu: "#0057b8",
    clemson: "#f56600",
    duke: "#174ea6",
    florida: "#2257d5",
    gonzaga: "#c03a2b",
    houston: "#c8102e",
    illinois: "#e84a27",
    iowa: "#f3c334",
    kansas: "#0d62d0",
    kentucky: "#2b6dff",
    louisville: "#d62828",
    marquette: "#d9a441",
    maryland: "#d62828",
    memphis: "#5d87c7",
    michigan: "#f2c230",
    michiganstate: "#18453b",
    mississippistate: "#8c1d40",
    ncstate: "#cc0000",
    northcarolina: "#7bafd4",
    oklahoma: "#841617",
    oregon: "#0b8f47",
    purdue: "#c7a34a",
    stjohns: "#b3152b",
    tennessee: "#ff8300",
    texasam: "#7b1f30",
    texastech: "#d91f26",
    ucla: "#4aa3ff",
    uconn: "#3a9cff",
    unc: "#7bafd4",
    vanderbilt: "#c9b37c",
    wisconsin: "#d9363e",
  };

  const key = (urlName || shortName || "").toLowerCase().replace(/[^a-z]/g, "");
  if (key && accentMap[key]) {
    return accentMap[key];
  }

  const palette = ["#ff6b4a", "#4aa3ff", "#f2c230", "#41c779", "#ff8a34", "#7cc6ff", "#d9534f"];
  const hashSource = shortName || urlName || "auction";
  let hash = 0;
  for (let index = 0; index < hashSource.length; index += 1) {
    hash = (hashSource.charCodeAt(index) + ((hash << 5) - hash)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function formatCountdown(value: number) {
  const safeValue = Math.max(0, value);
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function AuctionPanelFrame() {
  const outerPath = "M124 446 L156 218 L240 154 H452 L492 108 L550 74 H730 L788 108 L828 154 H1040 L1124 218 L1156 446 L1108 476 H792 L764 506 H516 L488 476 H172 Z";
  const innerPath = "M150 430 L180 231 L251 177 H458 L514 116 L542 99 H738 L766 116 L822 177 H1029 L1100 231 L1130 430 L1094 455 H797 L771 480 H509 L483 455 H186 Z";
  const timerEdgePath = "M458 154 L494 112 L548 82 H732 L786 112 L822 154";

  return (
    <svg
      className="bid-panel__frame"
      viewBox="0 0 1280 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bid-panel-shell-fill" x1="640" y1="74" x2="640" y2="506" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#181a1f" />
          <stop offset="0.52" stopColor="#101218" />
          <stop offset="1" stopColor="#07090d" />
        </linearGradient>
        <linearGradient id="bid-panel-shell-sheen" x1="178" y1="122" x2="1100" y2="430" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe8d6" stopOpacity="0.06" />
          <stop offset="0.32" stopColor="#ff552d" stopOpacity="0.04" />
          <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.01" />
          <stop offset="1" stopColor="#ff7652" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="bid-panel-electric-core" x1="128" y1="148" x2="1148" y2="468" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff6958" />
          <stop offset="0.2" stopColor="#e0321b" />
          <stop offset="0.52" stopColor="#ffb0a2" />
          <stop offset="0.76" stopColor="#d92a16" />
          <stop offset="1" stopColor="#8e120b" />
        </linearGradient>
        <linearGradient id="bid-panel-electric-haze" x1="212" y1="108" x2="1064" y2="470" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d92f1e" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#ff9b8f" stopOpacity="0.08" />
          <stop offset="1" stopColor="#b51d12" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id="bid-panel-inner-stroke" x1="180" y1="96" x2="1098" y2="486" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd8cf" />
          <stop offset="0.5" stopColor="#ff7a57" />
          <stop offset="1" stopColor="#ff9f84" />
        </linearGradient>
        <linearGradient id="bid-panel-border-energy" x1="142" y1="124" x2="1132" y2="466" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a0907" stopOpacity="0.5" />
          <stop offset="0.18" stopColor="#d62d19" stopOpacity="0.18" />
          <stop offset="0.52" stopColor="#000000" stopOpacity="0" />
          <stop offset="0.82" stopColor="#dd3820" stopOpacity="0.18" />
          <stop offset="1" stopColor="#5d0d08" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="bid-panel-shadow-fill" x1="640" y1="398" x2="640" y2="520" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.58" />
        </linearGradient>
        <linearGradient id="bid-panel-brace-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#221610" />
          <stop offset="1" stopColor="#08090d" />
        </linearGradient>
        <linearGradient id="bid-panel-timer-stroke" x1="458" y1="82" x2="822" y2="154" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff8d5f" />
          <stop offset="0.5" stopColor="#ffd0a6" />
          <stop offset="1" stopColor="#ff6c38" />
        </linearGradient>
        <filter id="bid-panel-electric-displace" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.055" numOctaves="2" seed="9" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="bid-panel-glow" x="-8%" y="-12%" width="116%" height="130%">
          <feDropShadow dx="0" dy="14" stdDeviation="22" floodColor="#000000" floodOpacity="0.48" />
        </filter>
        <filter id="bid-panel-soft-blur" x="-16%" y="-16%" width="132%" height="132%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <path d={outerPath} fill="url(#bid-panel-shell-fill)" filter="url(#bid-panel-glow)" />
      <path d={outerPath} fill="url(#bid-panel-shell-sheen)" opacity="0.22" />
      <path d={outerPath} fill="none" stroke="url(#bid-panel-border-energy)" strokeWidth="10.5" strokeLinejoin="round" opacity="0.14" />
      <path d={outerPath} fill="none" stroke="url(#bid-panel-electric-haze)" strokeWidth="6.3" strokeLinejoin="round" opacity="0.28" />
      <path d={outerPath} fill="none" stroke="url(#bid-panel-electric-core)" strokeWidth="3.8" strokeLinejoin="round" filter="url(#bid-panel-electric-displace)" />
      <path d={outerPath} fill="none" stroke="#ffd8d0" strokeWidth="0.8" strokeLinejoin="round" opacity="0.2" filter="url(#bid-panel-electric-displace)" />
      <path d={innerPath} fill="none" stroke="url(#bid-panel-inner-stroke)" strokeWidth="1.15" strokeLinejoin="round" opacity="0.42" />
      <path d={innerPath} fill="none" stroke="#fff0e1" strokeWidth="0.45" strokeLinejoin="round" opacity="0.04" />
      <path d={timerEdgePath} fill="none" stroke="url(#bid-panel-timer-stroke)" strokeWidth="3" strokeLinecap="round" opacity="0.84" />
      <path d="M198 420 L244 196" stroke="#ff4b28" strokeWidth="1.3" strokeOpacity="0.22" strokeLinecap="round" filter="url(#bid-panel-soft-blur)" />
      <path d="M1082 416 L1038 199" stroke="#ff4b28" strokeWidth="1.3" strokeOpacity="0.22" strokeLinecap="round" filter="url(#bid-panel-soft-blur)" />
      <path d="M252 210 H450" stroke="#fff0e2" strokeWidth="0.8" strokeOpacity="0.07" strokeLinecap="round" />
      <path d="M830 210 H1028" stroke="#fff0e2" strokeWidth="0.8" strokeOpacity="0.07" strokeLinecap="round" />
      <path d="M260 454 H480" stroke="#ff7340" strokeWidth="0.8" strokeOpacity="0.05" strokeLinecap="round" />
      <path d="M800 454 H1020" stroke="#ff7340" strokeWidth="0.8" strokeOpacity="0.05" strokeLinecap="round" />
      <path d="M124 446 L154 222 L177 215" fill="none" stroke="#ff6a47" strokeWidth="1" strokeOpacity="0.12" />
      <path d="M1156 446 L1126 222 L1103 215" fill="none" stroke="#ff6a47" strokeWidth="1" strokeOpacity="0.12" />
      <path d="M98 386 L72 510 H142 L162 448 Z" fill="url(#bid-panel-brace-fill)" opacity="0.94" />
      <path d="M1182 386 L1208 510 H1138 L1118 448 Z" fill="url(#bid-panel-brace-fill)" opacity="0.94" />
      <path d="M98 386 L72 510 H142 L162 448" fill="none" stroke="#ff5130" strokeWidth="1" strokeOpacity="0.1" strokeLinejoin="round" />
      <path d="M1182 386 L1208 510 H1138 L1118 448" fill="none" stroke="#ff5130" strokeWidth="1" strokeOpacity="0.1" strokeLinejoin="round" />
      <path d="M506 476 L530 500 H750 L774 476" fill="none" stroke="#ff6f4f" strokeWidth="1.1" strokeOpacity="0.14" strokeLinejoin="round" />
      <path d="M0 520 H1280" stroke="url(#bid-panel-shadow-fill)" strokeWidth="54" />
    </svg>
  );
}

function AuctionBiddingPanel(props: AuctionBiddingPanelProps) {
  const hasActiveTeam = Boolean(props.team.shortName);
  const isSeedBundle = props.team.region === "bundle" && (props.team.seed === 15 || props.team.seed === 16);
  const showLogo = !isSeedBundle && hasActiveTeam;
  const displaySeedLabel = hasActiveTeam && !isSeedBundle && props.team.seed > 0
    ? `#${props.team.seed}`
    : "";
  const displayTeamName = hasActiveTeam
    ? (isSeedBundle ? `${props.team.seed}-seed bundle` : props.team.shortName)
    : "Awaiting next team";
  const teamRegionLabel = props.team.region && props.team.region !== "bundle"
    ? `${props.team.region} region`
    : hasActiveTeam
      ? "Live auction"
      : "Auction standby";
  const currentBidStatus = props.currentBidder
    ? `- ${props.currentBidder}`
    : props.currentHighestBid > 0
      ? "Bid in play"
      : "No bids yet";
  const teamLogoUrl = getTeamLogoUrl(props.team.urlName);
  const teamAccentBase = getTeamAccent(props.team.urlName, props.team.shortName);
  const teamAccent = brightenHex(teamAccentBase, 0.1);
  const teamAccentHighlight = brightenHex(teamAccentBase, 0.65);
  const panelStyle = {
    ["--bid-panel-team-accent" as any]: teamAccent,
    ["--bid-panel-team-accent-rgb" as any]: hexToRgbString(teamAccentBase),
    ["--bid-panel-team-accent-highlight" as any]: teamAccentHighlight,
  } as React.CSSProperties;

  return (
    <div
      className={`bid-panel-shell ${hasActiveTeam ? "bid-panel-shell--active" : "bid-panel-shell--idle"} ${props.countdown <= 3 ? "bid-panel-shell--urgent" : ""}`}
      style={panelStyle}
    >
      <div className="bid-panel">
        <AuctionPanelFrame />

        <div className="bid-panel__content">
          <div className="bid-panel__timer-anchor">
            <div className={`bid-panel__timer ${props.countdown <= 3 ? "bid-panel__timer--urgent" : ""}`}>
              <span className="bid-panel__timer-value">{formatCountdown(props.countdown)}</span>
            </div>
          </div>

          <div className="bid-panel__safe-area">
            <div className="bid-panel__body">
              <div className="bid-panel__headline-stack">
                <span className="bid-panel__eyebrow">{teamRegionLabel}</span>
                <div className={`bid-panel__headline-row ${showLogo ? "" : "bid-panel__headline-row--compact"}`}>
                  {showLogo && (
                    <div className="bid-panel__logo-wrap">
                      {teamLogoUrl ? (
                        <img
                          className="bid-panel__logo"
                          src={teamLogoUrl}
                          alt={`${props.team.shortName || "Auction"} logo`}
                        />
                      ) : (
                        <span className="bid-panel__logo-fallback">MM</span>
                      )}
                    </div>
                  )}

                  <h2 className="bid-panel__title">
                    <span className="bid-panel__title-text">{displayTeamName}</span>
                    {displaySeedLabel && <span className="bid-panel__seed">{displaySeedLabel}</span>}
                  </h2>
                </div>
                <div className="bid-panel__current">
                  <span className="bid-panel__current-label">Current Bid</span>
                  <strong className="bid-panel__current-value">{formatCurrency(props.currentHighestBid)}</strong>
                  <span className="bid-panel__current-status">{currentBidStatus}</span>
                </div>
              </div>

              <div className="bid-panel__controls-wrap">
                <Bid
                  gameId={props.gameId}
                  player={props.playerName}
                  currentHighestBid={props.currentHighestBid}
                  team={props.team.seed > 0 ? `${props.team.shortName} (${props.team.seed})` : props.team.shortName}
                  balance={props.balance}
                  disabled={!hasActiveTeam}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuctionBiddingPanel;
