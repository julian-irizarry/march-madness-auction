export interface TeamData {
    name: string;
    seed: number;
    region: string;
}
  
export interface Match {
    id: number;
    nextMatchId: number | null;
    tournamentRoundText: string;
    participants: TeamData[];
}
  
function GenerateRegionBracketData(regionTeams: TeamData[]): Match[] {
    let matchId = 1;
    const matches: Match[] = [];
    const roundMatches: { [round: number]: Match[] } = {};
  
    const createMatch = (
        participants: TeamData[],
        round: number,
        nextMatchId: number | null
    ): Match => {
        const match: Match = {
            id: matchId++,
            nextMatchId,
            tournamentRoundText: `Round ${round}`,
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
    for (let i = 0; i < regionTeams.length; i += 2) {
        createMatch(
            [regionTeams[i], regionTeams[15 - i]],
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

export default GenerateRegionBracketData;

export const MapTeamToUrlTeam = new Map<string, string>([
    ["Akron" , "akron"],
    ["Alabama" , "alabama"],
    ["Arizona" , "arizona"],
    ["Auburn" , "auburn"],
    ["Baylor" , "baylor"],
    ["BYU" , "byu"],
    ["Clemson" , "clemson"],
    ["Col. of Charleston" , "col-of-charleston"],
    ["Colgate" , "colgate"],
    ["Colorado St." , "colorado-st"],
    ["Colorado" , "colorado"],
    ["Creighton" , "creighton"],
    ["Dayton" , "dayton"],
    ["Drake" , "drake"],
    ["Duke" , "duke"],
    ["Duquesne" , "duquesne"],
    ["Fla. Atlantic" , "fla-atlantic"],
    ["Florida" , "florida"],
    ["Gonzaga" , "gonzaga"],
    ["Grambling" , "grambling"],
    ["Grand Canyon" , "grand-canyon"],
    ["Houston" , "houston"],
    ["Illinois" , "illinois"],
    ["Iowa St." , "iowa-st"],
    ["James Madison" , "james-madison"],
    ["Kansas" , "kansas"],
    ["Kentucky" , "kentucky"],
    ["Long Beach St." , "long-beach-st"],
    ["Longwood" , "longwood"],
    ["Marquette" , "marquette"],
    ["McNeese" , "mcneese"],
    ["Michigan St." , "michigan-st"],
    ["Mississippi St." , "mississippi-st"],
    ["Morehead St." , "morehead-st"],
    ["NC State" , "north-carolina-st"],
    ["Nebraska" , "nebraska"],
    ["Nevada" , "nevada"],
    ["New Mexico" , "new-mexico"],
    ["North Carolina" , "north-carolina"],
    ["Northwestern" , "northwestern"],
    ["Oakland" , "oakland"],
    ["Oregon" , "oregon"],
    ["Purdue" , "purdue"],
    ["Saint Mary's (CA)" , "st-marys-ca"],
    ["Saint Peter's" , "st-peters"],
    ["Samford" , "samford"],
    ["San Diego St." , "san-diego-st"],
    ["South Carolina" , "south-carolina"],
    ["South Dakota St." , "south-dakota-st"],
    ["Stetson" , "stetson"],
    ["TCU" , "tcu"],
    ["Tennessee" , "tennessee"],
    ["Texas A&M" , "texas-am"],
    ["Texas Tech" , "texas-tech"],
    ["Texas" , "texas"],
    ["UAB" , "uab"],
    ["UConn" , "uconn"],
    ["Utah St." , "utah-st"],
    ["Vermont" , "vermont"],
    ["Wagner" , "wagner"],
    ["Washington St." , "washington-st"],
    ["Western Ky." , "western-ky"],
    ["Wisconsin" , "wisconsin"],
    ["Yale" , "yale"],
])