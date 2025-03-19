import React from "react";
import { Box, Card, Typography, Grid, Divider } from "@mui/material";
import { GenerateRegionBracketData, IntegrateMatchResults, TeamInfo, Match } from "./Utils"
import imageSrc from "./images/march_madness_logo_auction.png";
import BBImageSrc from "./images/basketball.png";


interface MatchProps {
  match: Match
  reverse: boolean
  highlight: boolean
}

function MatchComponent(props: MatchProps) {
  const is_determined = props.match.participants[0];

  const team1Logo = is_determined ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${props.match.participants[0].urlName}.svg` : "";
  const team2Logo = is_determined ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${props.match.participants[1].urlName}.svg` : "";

  return (
    <Card sx={{ margin: 0.5, padding: 1, border: props.highlight ? 3 : 1, borderRadius: 0, borderColor: props.highlight ? "var(--neon-yellow-color)" : "var(--light-grey-color)", width: props.match.participants[0] ? "180px" : "30px" }}>
      <Grid container sx={{ display: "flex", justifyContent: props.reverse ? "right" : "left", alignItems: props.reverse ? "right" : "left" }}>
        {
          props.reverse ?
            <>
              {/* Team name */}
              <Grid item xs={6} sx={{ display: "flex", justifyContent: "right", alignItems: "right" }}>
                <Typography variant="body2" justifyContent="right" sx={{ color: is_determined ? "var(--tertiary-color)" : "gray", fontSize: "10px" }}>
                  {is_determined ? props.match.participants[0].shortName : "TBD"}
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
                {is_determined && (<img src={team1Logo} alt={`${props.match.participants[0].shortName} logo`} style={{ width: "20px", height: "20px" }} />)}
              </Grid>
            </>
            :
            <>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                {/* Team logo */}
                {is_determined && (<img src={team1Logo} alt={`${props.match.participants[0].shortName} logo`} style={{ width: "20px", height: "20px" }} />)}
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
                  {is_determined ? props.match.participants[0].shortName : "TBD"}
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
                  {is_determined ? props.match.participants[1].shortName : "TBD"}
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
                {is_determined && (<img src={team2Logo} alt={`${props.match.participants[1].shortName} logo`} style={{ width: "20px", height: "20px" }} />)}
              </Grid>
            </>
            :
            <>
              <Grid item xs={2} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                {/* Team logo */}
                {is_determined && (<img src={team2Logo} alt={`${props.match.participants[1].shortName} logo`} style={{ width: "20px", height: "20px" }} />)}
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
                  {is_determined ? props.match.participants[1].shortName : "TBD"}
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
  region_teams: TeamInfo[];
  reverse: boolean
  selected_team?: TeamInfo
  match_results?: Match[] | null
}

function Region(props: RegionProps) {
  let matches = GenerateRegionBracketData(props.region_teams);

  if (props.match_results) {
    matches = IntegrateMatchResults(matches, props.match_results);
  }

  // Sort matches by rounds 
  const rounds_sorted_matches = new Map<string, Match[]>();
  matches.forEach((item) => {
    if (!rounds_sorted_matches.has(item.roundName)) {
      rounds_sorted_matches.set(item.roundName, []);
    }
    rounds_sorted_matches.get(item.roundName)!.push(item);
  });

  // Reverse bracket
  const sortedRounds = Array.from(rounds_sorted_matches.entries());
  const roundsToRender = props.reverse ? sortedRounds.reverse() : sortedRounds;

  return (
    // Display regional bracket
    <Grid container sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      {roundsToRender.map(([round, matchArr]) => (
        <Grid item key={round}>

          {/* Column for each round */}
          <Grid container direction="column" rowSpacing={10 * (5 - matchArr.length)} sx={{ display: "flex", justifyContent: "center", alignItems: "center", margin: matchArr.length === 8 ? 0 : undefined }}>
            {matchArr.map((val) => {

              // highlight match if current team is a participant or seed 15/16 bundle 
              const toHighlight = !!(
                props.selected_team &&
                val.participants[0] &&
                val.participants[1] &&
                (
                  props.selected_team.shortName === val.participants[0].shortName ||
                  props.selected_team.shortName === val.participants[1].shortName ||
                  (props.selected_team.region === "bundle" &&
                    (props.selected_team.seed === val.participants[0].seed ||
                      props.selected_team.seed === val.participants[1].seed))
                )
              );

              return (
                <Grid item key={`${round}_${val.id}`}>

                  {/* Display region name above final 8 */}
                  {matchArr.length === 1 && (
                    <Grid item sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                      <Typography variant="body2" justifyContent="center" sx={{ color: "black", fontSize: "10px" }}>
                        {props.region_name}
                      </Typography>
                    </Grid>
                  )}

                  {/* Display match */}
                  <MatchComponent match={val} reverse={props.reverse} highlight={toHighlight} />
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
}

interface BracketProps {
  all_teams: TeamInfo[]
  selected_team?: TeamInfo
  match_results?: Match[]
}

function Bracket(props: BracketProps) {

  // Sort teams by regions
  const region_sorted_teams = new Map<string, TeamInfo[]>();
  props.all_teams.forEach((item) => {
    if (!region_sorted_teams.has(item.region)) {
      region_sorted_teams.set(item.region, []);
    }
    region_sorted_teams.get(item.region)!.push(item);
  });

  // Sort match results by regions
  const region_sorted_match_results = new Map<string, Match[]>();
  if (props.match_results) {
    props.match_results.forEach((item) => {
      if (item.participants[0].region === item.participants[1].region) {
        if (!region_sorted_match_results.has(item.participants[0].region)) {
          region_sorted_match_results.set(item.participants[0].region, []);
        }
        region_sorted_match_results.get(item.participants[0].region)!.push(item);
      }
    })
  }

  return (
    <>
      {/* Display all 4 regional brackets */}
      <Grid container spacing={0} sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "row", overflowY: "auto", maxHeight: "70vh", paddingBottom: 3 }}>

        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          <img src={imageSrc} alt="Central Game" style={{ position: "absolute", top: "70%", left: "50%", maxWidth: "250px" ,transform: "translate(-50%, 20%)",zIndex: 2 }} />
        </Box>

        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          <img src={BBImageSrc} alt="Basketball" style={{ position: "absolute", top: "70%", left: "50%", maxWidth: "100px" ,transform: "translate(-50%, 370%)",zIndex: 2 }} />
        </Box>

        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          <img src={BBImageSrc} alt="Basketball" style={{ position: "absolute", top: "70%", left: "50%", maxWidth: "100px" ,transform: "translate(-50%, 700%)",zIndex: 2 }} />
        </Box>

        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          <img src={imageSrc} alt="Central Game" style={{ position: "absolute", top: "70%", left: "50%", maxWidth: "250px" ,transform: "translate(-50%, 600%)",zIndex: 2 }} />
        </Box>

        {Array.from(region_sorted_teams.entries()).map(([key, val], index) => (

          <React.Fragment key={key}>
            {/* Display regional bracket */}
            <Grid item xs={6}>
              <Region region_name={key} region_teams={val} reverse={index % 2 === 1} selected_team={props.selected_team} match_results={region_sorted_match_results.size > 0 ? region_sorted_match_results.get(key) : null} />
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
                      <Typography variant="body2" justifyContent="center" sx={{ color: "black", fontSize: "10px" }}>
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
                      <Typography variant="body2" justifyContent="center" sx={{ color: "black", fontSize: "10px" }}>
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
                      <Typography variant="body2" justifyContent="center" sx={{ color: "black", fontSize: "10px" }}>
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
          </React.Fragment>
        ))}
      </Grid>
    </>
  );
}

export default Bracket;
