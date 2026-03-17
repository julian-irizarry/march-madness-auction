const backendHost = import.meta.env.VITE_BACKEND_HOST || "127.0.0.1";
const backendPort = import.meta.env.VITE_BACKEND_PORT || "8000";
const browserHostname = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
const resolvedBackendHost = backendHost === "0.0.0.0" ? browserHostname : backendHost;
const pageProtocol = typeof window !== "undefined" ? window.location.protocol : "http:";

export const BACKEND_URL = `${resolvedBackendHost}:${backendPort}`;
export const BACKEND_HTTP_URL = `${pageProtocol}//${BACKEND_URL}`;
export const BACKEND_WS_URL = `${pageProtocol === "https:" ? "wss:" : "ws:"}//${BACKEND_URL}`;

console.log("BACKEND_URL", BACKEND_URL)

export interface TeamInfo {
    shortName: string
    urlName: string
    seed: number
    region: string
    purchasePrice?: number
    points?: number
}

export interface PlayerInfo {
    name: string
    gameId: string
    balance: number
    points: number
    teams: TeamInfo[]
}

export interface Match {
    id: number
    nextMatchId: number | null
    roundName: string
    participants: TeamInfo[]
    winner?: string
}

export function normalizeTeamKey(team: Pick<TeamInfo, "shortName" | "urlName" | "region" | "seed">) {
    if (team.region === "bundle" && team.seed > 0) {
        return `bundle:${team.seed}`;
    }

    return (team.urlName || team.shortName || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function scoreBracketTeamCandidate(team: TeamInfo) {
    let score = 0;

    if (!team.shortName.includes("/")) {
        score += 4;
    }

    if (!team.shortName.toLowerCase().includes("bundle")) {
        score += 2;
    }

    score -= team.shortName.length / 100;

    return score;
}

export function GenerateRegionBracketData(regionTeams: TeamInfo[]): Match[] {
    let matchId = 1;
    const matches: Match[] = [];
    const roundMatches: { [round: number]: Match[] } = {};
    const bestTeamBySeed = new Map<number, TeamInfo>();

    [...regionTeams]
        .sort((left, right) => left.seed - right.seed)
        .forEach((team) => {
            const existing = bestTeamBySeed.get(team.seed);

            if (!existing || scoreBracketTeamCandidate(team) > scoreBracketTeamCandidate(existing)) {
                bestTeamBySeed.set(team.seed, team);
            }
        });

    const seededTeams = Array.from(bestTeamBySeed.values())
        .sort((left, right) => left.seed - right.seed)
        .slice(0, 16);
    const bracketSeedOrder = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
    const teamsBySeed = new Map(seededTeams.map((team) => [team.seed, team]));
    const firstRoundTeams = bracketSeedOrder
        .map((seed) => teamsBySeed.get(seed))
        .filter((team): team is TeamInfo => Boolean(team));

    const createMatch = (
        participants: TeamInfo[],
        round: number,
        nextMatchId: number | null
    ): Match => {
        const match: Match = {
            id: matchId++,
            nextMatchId,
            roundName: `Round ${round}`,
            participants,
        };
        matches.push(match);
        if (!roundMatches[round]) {
            roundMatches[round] = [];
        }
        roundMatches[round].push(match);
        return match;
    };

    // First round: 8 matches
    for (let i = 0; i < firstRoundTeams.length; i += 2) {
        createMatch(
            [firstRoundTeams[i], firstRoundTeams[i + 1]],
            1,
            null // Next match ID to be set later
        );
    }

    // Generate subsequent rounds dynamically
    let currentRound = 2;
    let prevRoundMatches = roundMatches[1];

    while (prevRoundMatches.length > 1) {
        const nextRoundMatches: Match[] = [];
        for (let i = 0; i < prevRoundMatches.length; i += 2) {
            const nextMatch = createMatch(
                [], // Placeholder for the winners
                currentRound,
                null
            );

            // Link previous round matches to this new match
            prevRoundMatches[i].nextMatchId = nextMatch.id;
            prevRoundMatches[i + 1].nextMatchId = nextMatch.id;

            nextRoundMatches.push(nextMatch);
        }

        roundMatches[currentRound] = nextRoundMatches;
        prevRoundMatches = nextRoundMatches;
        currentRound++;
    }

    // The final match's nextMatchId is null as it's the last one
    if (prevRoundMatches.length === 1) {
        prevRoundMatches[0].nextMatchId = null;
    }

    return matches;
}


export function IntegrateMatchResults(bracketMatches:Match[], matchResults:Match[]): Match[] {
    
    return bracketMatches;
}
