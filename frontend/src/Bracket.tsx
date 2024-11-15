import React from 'react';
import { SingleEliminationBracket, Match, SVGViewer } from '@g-loot/react-tournament-brackets';
import GenerateBracketData, { TeamData } from './Utils'

interface BracketProps {
  all_teams: TeamData[]
}

function Bracket(props: BracketProps) {
  let matches = GenerateBracketData(props.all_teams);

  return (
    <>
      <SingleEliminationBracket
        matches={matches}
        matchComponent={Match}
        svgWrapper={({ children, ...props }) => (
          <SVGViewer
            width={1000}
            height={1000}
            background="rgb(11, 13, 19)"
            SVGBackground="rgb(11, 13, 19)"
            {...props}
          >
            {children}
          </SVGViewer>
        )}
      />
    </>
  );
}

export default Bracket;
