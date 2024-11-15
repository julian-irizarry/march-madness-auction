export interface TeamData {
  name: string;
  seed: number;
  region: string;
}

function GenerateBracketData(data: TeamData[]): any[] {
    let matchId = 1;
    const matches: any[] = [];
    const regions = ["WEST", "EAST", "MIDWEST", "SOUTH"];

    regions.forEach((region) => {
        const regionTeams = data.filter((team) => team.region === region);
        const sortedTeams = regionTeams.sort((a, b) => a.seed - b.seed);
        const round = "Round of 32";

        for (let i = 0; i < sortedTeams.length / 2; i++) {
            
            matches.push({
                id: matchId,
                nextMatchId: null,
                tournamentRoundText: round,
                startTime: "", 
                state: "SCHEDULED",
                participants: [
                    {
                        id: matchId * 2 - 1,
                        name: sortedTeams[i].name, // Lower seed
                    },
                    {
                        id: matchId * 2,
                        name: sortedTeams[sortedTeams.length - 1 - i].name, // Higher seed
                    },
                ],
            });
            matchId++;
            console.log("MATCHING ", sortedTeams[i].name, " with ", sortedTeams[sortedTeams.length - 1 - i].name);
        }
    });

    console.log("MATCHES ", matches);

    return matches;
}

export default GenerateBracketData;
