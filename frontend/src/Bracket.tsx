import React from 'react';
import { Card, Typography, Grid, Divider, Paper } from '@mui/material';
import GenerateRegionBracketData, { TeamData, Match } from './Utils'

interface MatchProps {
    match: Match
}

function MatchComponent({ match }: MatchProps) {
    const is_determined = match.participants[0];

    return (
        <Card sx={{ margin:0.5, padding:1, border:1, borderRadius:0, borderColor: 'var(--light-grey-color)', width: match.participants[0] ? '120px' : '30px' }}>
            <Typography variant="body2" justifyContent="center" sx={{ color: is_determined ? 'var(--tertiary-color)' : 'gray', fontSize: '10px' }}>
                {
                    is_determined ? `${match.participants[0].name} (${match.participants[0].seed})` : "TBD"
                }
            </Typography>
            <Divider/>
            <Typography variant="body2" justifyContent="center" sx={{ color: is_determined ? 'var(--tertiary-color)' : 'gray', fontSize: '10px' }}>
                {
                    is_determined ? `${match.participants[1].name} (${match.participants[1].seed})` : "TBD"
                }
            </Typography>
        </Card>
    );
}

interface RegionProps {
    region_name: string;
    region_teams: TeamData[];
    reverse: boolean
}

function Region(props: RegionProps) {
    let matches = GenerateRegionBracketData(props.region_teams);
    console.log(`MATCHES FOR REGION ${props.region_name} =`, matches);

    const rounds_sorted_matches = new Map<string, Match[]>();
    matches.forEach((item) => {
        if (!rounds_sorted_matches.has(item.tournamentRoundText)) {
            rounds_sorted_matches.set(item.tournamentRoundText, []);
        }
        rounds_sorted_matches.get(item.tournamentRoundText)!.push(item);
    });

    const sortedRounds = Array.from(rounds_sorted_matches.entries());
    const roundsToRender = props.reverse ? sortedRounds.reverse() : sortedRounds;

    return (
        <Grid container spacing={2}  sx={{ marginTop:3, marginBottom:3, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
            {roundsToRender.map(([round, matchArr]) => (
                <Grid item key={round}>
                    <Grid container direction="column" spacing={7 * (5 - matchArr.length)} justifyContent="center" alignItems="center">
                        {matchArr.map((val) => (
                            <Grid item key={`${round}_${val.id}`}>
                                {
                                matchArr.length == 1 ?
                                <Typography variant="body2" justifyContent="center" sx={{ color: 'var(--tertiary-color)', fontSize: '10px' }}>
                                    {props.region_name}
                                </Typography>
                                : <></>
                                }
                                <MatchComponent match={val} />
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
}

function Bracket(props: BracketProps) {
    const region_sorted_teams = new Map<string, TeamData[]>();
    props.all_teams.forEach((item) => {
        if (!region_sorted_teams.has(item.region)) {
            region_sorted_teams.set(item.region, []);
        }
        region_sorted_teams.get(item.region)!.push(item);
    });

    return (
        <>
            <Grid container spacing={0} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', overflowY: 'auto', maxHeight: '70vh'}}>
                {Array.from(region_sorted_teams.entries()).map(([key, val], index) => (
                    
                    <>
                    <Grid item key={key} xs={6}>
                        <Paper elevation={0} sx={{ borderRadius:0 }}>
                            <Region region_name={key} region_teams={val} reverse={index % 2 === 1}/>
                        </Paper>
                    </Grid>

                    {
                        index == 1 ? 
                        
                        <Grid container key={key} xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                            <Grid item xs={2}></Grid>
                            <Grid item xs={2}>
                                <Grid item sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                                    <Typography variant="body2" justifyContent="center" sx={{ color: 'var(--tertiary-color)', fontSize: '10px' }}>
                                        FINAL FOUR
                                    </Typography>
                                </Grid>
                                <Grid item sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                                    <Card sx={{ margin:0.5, padding:1, border:1, borderRadius:0, borderColor: 'var(--light-grey-color)', width: '100px' }}>
                                        <Typography variant="body2" justifyContent="center" sx={{ color: 'gray', fontSize: '10px' }}> TBD </Typography>
                                        <Divider/>
                                        <Typography variant="body2" justifyContent="center" sx={{ color: 'gray', fontSize: '10px' }}> TBD </Typography>
                                    </Card>
                                </Grid>
                            </Grid>
                            <Grid item xs={2}>
                                <Grid item sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                                    <Typography variant="body2" justifyContent="center" sx={{ color: 'var(--tertiary-color)', fontSize: '10px' }}>
                                        CHAMPIONSHIP
                                    </Typography>
                                </Grid>
                                <Grid item sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                                    <Card sx={{ margin:0.5, padding:1, border:1, borderRadius:0, borderColor: 'var(--light-grey-color)', width: '100px' }}>
                                        <Typography variant="body2" justifyContent="center" sx={{ color: 'gray', fontSize: '10px' }}> TBD </Typography>
                                        <Divider/>
                                        <Typography variant="body2" justifyContent="center" sx={{ color: 'gray', fontSize: '10px' }}> TBD </Typography>
                                    </Card>
                                </Grid>
                            </Grid>
                            <Grid item xs={2}>
                                <Grid item sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                                    <Typography variant="body2" justifyContent="center" sx={{ color: 'var(--tertiary-color)', fontSize: '10px' }}>
                                        FINAL FOUR
                                    </Typography>
                                </Grid>
                                <Grid item sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                                    <Card sx={{ margin:0.5, padding:1, border:1, borderRadius:0, borderColor: 'var(--light-grey-color)', width: '100px' }}>
                                        <Typography variant="body2" justifyContent="center" sx={{ color: 'gray', fontSize: '10px' }}> TBD </Typography>
                                        <Divider/>
                                        <Typography variant="body2" justifyContent="center" sx={{ color: 'gray', fontSize: '10px' }}> TBD </Typography>
                                    </Card>
                                </Grid>
                            </Grid>
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
