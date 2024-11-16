import React from "react";
import { Card, Typography, Grid, Divider, Paper } from "@mui/material";
import GenerateRegionBracketData, { TeamData, Match, MapTeamToUrlTeam } from "./Utils"

interface MatchProps {
  match: Match
  reverse: boolean
  highlight: boolean
}

function MatchComponent(props: MatchProps) {
  const is_determined = props.match.participants[0];

  const team1Logo = is_determined ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${MapTeamToUrlTeam.get(props.match.participants[0].name)}.svg` : "";
  const team2Logo = is_determined ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${MapTeamToUrlTeam.get(props.match.participants[1].name)}.svg` : "";

  return (
    <Card sx={{ margin: 0.5, padding: 1, border: props.highlight ? 3 : 1, borderRadius: 0, borderColor: props.highlight ? "var(--neon-yellow-color)" : "var(--light-grey-color)", width: props.match.participants[0] ? "180px" : "30px" }}>
      <Grid container sx={{ display: "flex", justifyContent: props.reverse ? "right" : "left", alignItems: props.reverse ? "right" : "left" }}>
        {
          props.reverse ?
            <>
              {/* Team name */}
              <Grid item xs={6} sx={{ display: "flex", justifyContent: "right", alignItems: "right" }}>
                <Typography variant="body2" justifyContent="right" sx={{ color: is_determined ? "var(--tertiary-color)" : "gray", fontSize: "10px" }}>
                  {is_determined ? props.match.participants[0].name : "TBD"}
                </Typography>
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                {/* Team seed */}
                <Typography variant="body2" justifyContent="left" sx={{ color: "gray", fontSize: "10px", marginLeft: "5px", marginRight: "5px" }}>
                  {is_determined ? props.match.participants[0].seed : ""}
                </Typography>
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                {/* Team logo */}
                {is_determined && (<img src={team1Logo} alt={`${props.match.participants[0].name} logo`} style={{ width: "20px", height: "20px" }} />)}
              </Grid>
            </>
            :
            <>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                {/* Team logo */}
                {is_determined && (<img src={team1Logo} alt={`${props.match.participants[0].name} logo`} style={{ width: "20px", height: "20px" }} />)}
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "right", alignItems: "right" }}>
                {/* Team seed */}
                <Typography variant="body2" justifyContent="right" sx={{ color: "gray", fontSize: "10px", marginLeft: "5px", marginRight: "5px" }}>
                  {is_determined ? props.match.participants[0].seed : ""}
                </Typography>
              </Grid>
              {/* Team name */}
              <Grid item xs={6} sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                <Typography variant="body2" justifyContent="left" sx={{ color: is_determined ? "var(--tertiary-color)" : "gray", fontSize: "10px" }}>
                  {is_determined ? props.match.participants[0].name : "TBD"}
                </Typography>
              </Grid>
            </>
        }
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ marginTop: '1px', marginBottom: '1px' }} />
      </Grid>

      <Grid sx={{ display: "flex", justifyContent: props.reverse ? "right" : "left", alignItems: props.reverse ? "right" : "left" }}>
        {
          props.reverse ?
            <>
              {/* Team name */}
              <Grid item xs={6} sx={{ display: "flex", justifyContent: "right", alignItems: "right" }}>
                <Typography variant="body2" justifyContent="right" sx={{ color: is_determined ? "var(--tertiary-color)" : "gray", fontSize: "10px" }}>
                  {is_determined ? props.match.participants[1].name : "TBD"}
                </Typography>
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                {/* Team seed */}
                <Typography variant="body2" justifyContent="left" sx={{ color: "gray", fontSize: "10px", marginLeft: "5px", marginRight: "5px" }}>
                  {is_determined ? props.match.participants[1].seed : ""}
                </Typography>
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                {/* Team logo */}
                {is_determined && (<img src={team2Logo} alt={`${props.match.participants[1].name} logo`} style={{ width: "20px", height: "20px" }} />)}
              </Grid>
            </>
            :
            <>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                {/* Team logo */}
                {is_determined && (<img src={team2Logo} alt={`${props.match.participants[1].name} logo`} style={{ width: "20px", height: "20px" }} />)}
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "right", alignItems: "right" }}>
                {/* Team seed */}
                <Typography variant="body2" justifyContent="right" sx={{ color: "gray", fontSize: "10px", marginLeft: "5px", marginRight: "5px" }}>
                  {is_determined ? props.match.participants[1].seed : ""}
                </Typography>
              </Grid>
              {/* Team name */}
              <Grid item xs={6} sx={{ display: "flex", justifyContent: "left", alignItems: "left" }}>
                <Typography variant="body2" justifyContent="left" sx={{ color: is_determined ? "var(--tertiary-color)" : "gray", fontSize: "10px" }}>
                  {is_determined ? props.match.participants[1].name : "TBD"}
                </Typography>
              </Grid>
            </>
        }
      </Grid>
    </Card>
  );
}

interface RegionProps {
  region_name: string;
  region_teams: TeamData[];
  reverse: boolean
  selected_team: TeamData | null
}

function Region(props: RegionProps) {
  let matches = GenerateRegionBracketData(props.region_teams);

  // Sort matches by rounds 
  const rounds_sorted_matches = new Map<string, Match[]>();
  matches.forEach((item) => {
    if (!rounds_sorted_matches.has(item.tournamentRoundText)) {
      rounds_sorted_matches.set(item.tournamentRoundText, []);
    }
    rounds_sorted_matches.get(item.tournamentRoundText)!.push(item);
  });

  // Reverse bracket
  const sortedRounds = Array.from(rounds_sorted_matches.entries());
  const roundsToRender = props.reverse ? sortedRounds.reverse() : sortedRounds;

  return (
    // Display regional bracket
    <Grid container spacing={2} sx={{ marginTop: 3, marginBottom: 3, display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
      {roundsToRender.map(([round, matchArr]) => (
        <Grid item key={round}>

          {/* Column for each round */}
          <Grid container direction="column" spacing={10 * (5 - matchArr.length)} justifyContent="center" alignItems="center">
            {matchArr.map((val) => (
              <Grid item key={`${round}_${val.id}`}>

                {/* Display region name above final 8 */}
                {
                  matchArr.length === 1 ?
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Typography variant="body2" justifyContent="center" sx={{ color: "var(--tertiary-color)", fontSize: "10px" }}>
                        {props.region_name}
                      </Typography>
                    </Grid>
                    : <></>
                }

                {/* Display match */}
                <MatchComponent match={val} reverse={props.reverse} highlight={!!(props.selected_team && val.participants[0] && val.participants[1] && (props.selected_team.name === val.participants[0].name || props.selected_team.name === val.participants[1].name))} />
              </Grid>
            ))}
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
}

interface BracketProps {
  all_teams: TeamData[]
  selected_team: TeamData
}

function Bracket(props: BracketProps) {

  // Sort teams by regions
  const region_sorted_teams = new Map<string, TeamData[]>();
  props.all_teams.forEach((item) => {
    if (!region_sorted_teams.has(item.region)) {
      region_sorted_teams.set(item.region, []);
    }
    region_sorted_teams.get(item.region)!.push(item);
  });

  return (
    <>
      {/* Display all 4 regional brackets */}
      <Grid container spacing={0} sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row", overflowY: "auto", maxHeight: "70vh" }}>
        {Array.from(region_sorted_teams.entries()).map(([key, val], index) => (

          <>
            {/* Display regional bracket */}
            <Grid item key={key} xs={6}>
              <Paper elevation={0} sx={{ borderRadius: 0 }}>
                <Region region_name={key} region_teams={val} reverse={index % 2 === 1} selected_team={props.selected_team.region === key ? props.selected_team : null} />
              </Paper>
            </Grid>

            {/* Display the final matches in the middle */}
            {
              index === 1 ?
                <Grid container key={"finals"} sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                  {/* Spacing */}
                  <Grid item xs={2}></Grid>

                  {/* West vs Midwest final four match */}
                  <Grid item xs={2}>
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Typography variant="body2" justifyContent="center" sx={{ color: "var(--tertiary-color)", fontSize: "10px" }}>
                        FINAL FOUR
                      </Typography>
                    </Grid>
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Card sx={{ margin: 0.5, padding: 1, border: 1, borderRadius: 0, borderColor: "var(--light-grey-color)", width: "100px" }}>
                        <Typography variant="body2" justifyContent="center" sx={{ color: "gray", fontSize: "10px" }}> TBD </Typography>
                        <Divider />
                        <Typography variant="body2" justifyContent="center" sx={{ color: "gray", fontSize: "10px" }}> TBD </Typography>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Final championship match */}
                  <Grid item xs={2}>
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Typography variant="body2" justifyContent="center" sx={{ color: "var(--tertiary-color)", fontSize: "10px" }}>
                        CHAMPIONSHIP
                      </Typography>
                    </Grid>
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Card sx={{ margin: 0.5, padding: 1, border: 1, borderRadius: 0, borderColor: "var(--light-grey-color)", width: "100px" }}>
                        <Typography variant="body2" justifyContent="center" sx={{ color: "gray", fontSize: "10px" }}> TBD </Typography>
                        <Divider />
                        <Typography variant="body2" justifyContent="center" sx={{ color: "gray", fontSize: "10px" }}> TBD </Typography>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* East vs South final four match */}
                  <Grid item xs={2}>
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Typography variant="body2" justifyContent="center" sx={{ color: "var(--tertiary-color)", fontSize: "10px" }}>
                        FINAL FOUR
                      </Typography>
                    </Grid>
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Card sx={{ margin: 0.5, padding: 1, border: 1, borderRadius: 0, borderColor: "var(--light-grey-color)", width: "100px" }}>
                        <Typography variant="body2" justifyContent="center" sx={{ color: "gray", fontSize: "10px" }}> TBD </Typography>
                        <Divider />
                        <Typography variant="body2" justifyContent="center" sx={{ color: "gray", fontSize: "10px" }}> TBD </Typography>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Spacing */}
                  <Grid item xs={2}></Grid>
                </Grid>
                :
                <></>
            }
          </>
        ))}
      </Grid>
    </>
  );
}

export default Bracket;
