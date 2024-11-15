export interface TeamData {
  name: string;
  seed: number;
  region: string;
}

function GenerateBracketData(data: TeamData[]): any[] {
    let matchId = 1;
    const matches: any[] = [];
    const regions = ["WEST", "EAST", "MIDWEST", "SOUTH"];
    const roundLabels = ["of 32", "of 16", "of 8", "Quarterfinals", "Semifinals", "Finals"];
    // Create round 1 matchups
    const round1Matches = regions.map(region => {
        const regionTeams = data.filter(team => team.region === region);
        
        // Generate first round matches (seed 1 vs 16, 2 vs 15, etc.)
        return regionTeams.map((team, index) => {
            const opponentIndex = 15 - index; // Pair seed 1 with 16, 2 with 15, etc.
            const opponent = regionTeams[opponentIndex];

            const match = {
                id: matchId++,
                nextMatchId: null, // Will be set later
                tournamentRoundText: `Round 1 - ${roundLabels[0]}`,
                startTime: "TBD", // Could be set later with actual match times
                state: 'NO_PARTY', // Placeholder until the match state is updated
                participants: [team, opponent]
            };

            matches.push(match);
            return match;
        });
    }).flat();

    // Assign next match IDs recursively for all rounds
    function assignNextMatchId(roundMatches: any[], round: number) {
        if (round >= roundLabels.length) return;

        let nextRoundMatches: any[] = [];
        for (let i = 0; i < roundMatches.length; i += 2) {
            const match1 = roundMatches[i];
            const match2 = roundMatches[i + 1];
            
            const nextMatch: any = {
                id: matchId++,
                nextMatchId: null,
                nextLooserMatchId: null,
                tournamentRoundText: roundLabels[round],
                startTime: "TBD", // Placeholder
                state: 'NO_PARTY', // Placeholder
                participants: [] // Will be filled when teams advance
            };

            // Link matches together
            match1.nextMatchId = nextMatch.id;
            match2.nextMatchId = nextMatch.id;

            matches.push(nextMatch);
            nextRoundMatches.push(nextMatch);
        }

        // Recurse to next round
        assignNextMatchId(nextRoundMatches, round + 1);
    }

    // Start recursive next match ID assignment
    assignNextMatchId(round1Matches, 1);

    return matches;
}

export default GenerateBracketData;
