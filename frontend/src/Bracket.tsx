import React, { useEffect, useMemo, useRef } from "react";

import { GenerateRegionBracketData, Match, TeamInfo, normalizeTeamKey } from "./Utils";
import "./css/Bracket.css";

interface DisplayTeam {
  shortName: string;
  seed?: number | null;
  urlName?: string;
  placeholder?: boolean;
}

interface PositionedCard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rows: DisplayTeam[];
  title?: string;
  highlight: boolean;
  ownerHighlight: boolean;
  inspectedTone?: "available" | "sold";
  selectedRowIndexes: number[];
  inspectedRowIndexes: number[];
  ownedRowIndexes: number[];
  tone?: "match" | "path" | "center";
}

interface ConnectorLayout {
  id: string;
  d: string;
  joints: Array<{ x: number; y: number }>;
}

interface RegionLayout {
  cards: PositionedCard[];
  connectors: ConnectorLayout[];
  roundLabelPositions: number[];
  regionAnchor: { x: number; y: number };
}

interface BracketProps {
  all_teams: TeamInfo[];
  selected_team?: TeamInfo;
  highlightedTeamKeys?: string[];
  inspectedTeam?: TeamInfo | null;
  inspectedTeamTone?: "available" | "sold" | null;
  inspectedBundleSeed?: number | null;
  match_results?: Match[];
}

type RegionSide = "left" | "right";

const REGION_POSITIONS = [
  { name: "South", side: "left" as RegionSide, top: 96, left: 54 },
  { name: "East", side: "left" as RegionSide, top: 864, left: 54 },
  { name: "Midwest", side: "right" as RegionSide, top: 96, left: 1564 },
  { name: "West", side: "right" as RegionSide, top: 864, left: 1564 },
];

const ROUND_LABELS = ["Round 1", "Round 2", "Sweet 16", "Elite 8"];
const ROUND_WIDTHS = [248, 214, 194, 172];
const REGION_WIDTH = 962;
const REGION_HEIGHT = 596;
const REGION_PADDING_X = 16;
const REGION_PADDING_TOP = 42;
const COLUMN_GAP = 24;
const MATCH_HEIGHT = 58;
const MATCH_GAP = 10;
const CANVAS_WIDTH = 2580;
const CANVAS_HEIGHT = 1640;
const SEMI_WIDTH = 196;
const CHAMP_WIDTH = 228;
const CENTER_CARD_HEIGHT = 64;
const CENTER_X = CANVAS_WIDTH / 2;
const SEMI_LEFT_X = CENTER_X - 364;
const SEMI_RIGHT_X = CENTER_X + 168;
const CHAMP_X = CENTER_X - CHAMP_WIDTH / 2;
const TOP_SEMI_Y = 602;
const BOTTOM_SEMI_Y = 992;
const CHAMP_Y = 810;

function groupMatchesByRound(matches: Match[]) {
  const rounds = new Map<number, Match[]>();

  matches.forEach((match) => {
    const roundNumber = Number(match.roundName.match(/(\d+)/)?.[1] ?? "1") - 1;
    if (!rounds.has(roundNumber)) {
      rounds.set(roundNumber, []);
    }
    rounds.get(roundNumber)!.push(match);
  });

  return Array.from(rounds.entries())
    .sort(([left], [right]) => left - right)
    .map(([, roundMatches]) => [...roundMatches].sort((left, right) => left.id - right.id));
}

function buildFramePath(width: number, height: number, inset = 0) {
  const left = 2 + inset;
  const top = 2 + inset;
  const right = width - 2 - inset;
  const bottom = height - 2 - inset;
  const notch = 12;
  const cut = 14;

  return `M ${left + notch} ${top} H ${right - cut} L ${right} ${top + cut} V ${bottom - cut} L ${right - cut} ${bottom} H ${left + notch} L ${left} ${bottom - cut} V ${top + cut} Z`;
}

function createConnector(id: string, startX: number, startY: number, endX: number, endY: number): ConnectorLayout {
  const elbowX = startX + (endX - startX) / 2;

  return {
    id,
    d: `M ${startX} ${startY} H ${elbowX} V ${endY} H ${endX}`,
    joints: [
      { x: startX, y: startY },
      { x: elbowX, y: startY },
      { x: elbowX, y: endY },
      { x: endX, y: endY },
    ],
  };
}

function getLogoUrl(urlName?: string) {
  return urlName
    ? `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${urlName}.svg`
    : "";
}

function normalizeDisplayTeamKey(team: DisplayTeam) {
  return (team.urlName || team.shortName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function createPlaceholderTeam(): DisplayTeam {
  return {
    shortName: "",
    placeholder: true,
  };
}

function matchesFocusedTeam(team: TeamInfo, focusedTeam?: TeamInfo | null) {
  if (!focusedTeam) {
    return false;
  }

  if (focusedTeam.region === "bundle") {
    return team.seed === focusedTeam.seed;
  }

  return team.shortName === focusedTeam.shortName;
}

function getFocusedIndexes(teams: TeamInfo[], focusedTeam?: TeamInfo | null) {
  return teams.reduce<number[]>((indexes, team, index) => {
    if (matchesFocusedTeam(team, focusedTeam)) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function getBundleFocusedIndexes(teams: TeamInfo[], bundleSeed?: number | null) {
  if (!bundleSeed) {
    return [];
  }

  return teams.reduce<number[]>((indexes, team, index) => {
    if (team.seed === bundleSeed) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function getOwnedIndexes(teams: TeamInfo[], highlightedTeamKeys: Set<string>) {
  return teams.reduce<number[]>((indexes, team, index) => {
    const normalizedKey = normalizeTeamKey(team);
    const bundleKey = team.seed > 0 ? `bundle:${team.seed}` : "";

    if ((normalizedKey && highlightedTeamKeys.has(normalizedKey)) || (bundleKey && highlightedTeamKeys.has(bundleKey))) {
      indexes.push(index);
    }

    return indexes;
  }, []);
}

function buildRegionLayout(
  regionName: string,
  regionTeams: TeamInfo[],
  side: RegionSide,
  originX: number,
  originY: number,
  selectedTeam?: TeamInfo,
  inspectedTeam?: TeamInfo | null,
  inspectedTeamTone?: "available" | "sold" | null,
  inspectedBundleSeed?: number | null,
  highlightedTeamKeys: Set<string> = new Set<string>()
): RegionLayout {
  const rounds = groupMatchesByRound(GenerateRegionBracketData(regionTeams));
  const outerX = side === "left"
    ? originX + REGION_PADDING_X
    : originX + REGION_WIDTH - REGION_PADDING_X - ROUND_WIDTHS[0];
  const columnXs: number[] = [];

  columnXs[0] = outerX;
  for (let roundIndex = 1; roundIndex < ROUND_WIDTHS.length; roundIndex += 1) {
    columnXs[roundIndex] = side === "left"
      ? columnXs[roundIndex - 1] + ROUND_WIDTHS[roundIndex - 1] + COLUMN_GAP
      : columnXs[roundIndex - 1] - COLUMN_GAP - ROUND_WIDTHS[roundIndex];
  }

  const cardsByRound: PositionedCard[][] = rounds.map((roundMatches, roundIndex) => {
    const step = (MATCH_HEIGHT + MATCH_GAP) * Math.pow(2, roundIndex);

    return roundMatches.map((match, matchIndex) => {
      const teams = match.participants.filter(Boolean);
      const selectedIndexes = getFocusedIndexes(teams, selectedTeam);
      const inspectedIndexes = inspectedBundleSeed
        ? getBundleFocusedIndexes(teams, inspectedBundleSeed)
        : getFocusedIndexes(teams, inspectedTeam);
      const hasSelectedRows = selectedIndexes.length > 0;
      const hasInspectedRows = inspectedIndexes.length > 0 && !hasSelectedRows;
      const ownedIndexes = getOwnedIndexes(teams, highlightedTeamKeys);

      return {
        id: `${regionName}_${roundIndex}_${match.id}`,
        x: columnXs[roundIndex],
        y: originY + REGION_PADDING_TOP + step * matchIndex + (step - MATCH_HEIGHT) / 2,
        width: ROUND_WIDTHS[roundIndex],
        height: MATCH_HEIGHT,
        rows: [
          teams[0]
            ? {
                shortName: teams[0].shortName,
                seed: teams[0].seed,
                urlName: teams[0].urlName,
              }
            : createPlaceholderTeam(),
          teams[1]
            ? {
                shortName: teams[1].shortName,
                seed: teams[1].seed,
                urlName: teams[1].urlName,
              }
            : createPlaceholderTeam(),
        ],
        highlight: hasSelectedRows,
        ownerHighlight: ownedIndexes.length > 0 && !hasSelectedRows && !hasInspectedRows,
        inspectedTone: hasInspectedRows ? inspectedTeamTone || undefined : undefined,
        selectedRowIndexes: selectedIndexes,
        inspectedRowIndexes: hasInspectedRows ? inspectedIndexes : [],
        ownedRowIndexes: ownedIndexes,
      };
    });
  });

  const connectors: ConnectorLayout[] = [];

  for (let roundIndex = 0; roundIndex < cardsByRound.length - 1; roundIndex += 1) {
    cardsByRound[roundIndex].forEach((card, matchIndex) => {
      const nextCard = cardsByRound[roundIndex + 1][Math.floor(matchIndex / 2)];

      if (!nextCard) {
        return;
      }

      const startX = side === "left" ? card.x + card.width : card.x;
      const endX = side === "left" ? nextCard.x : nextCard.x + nextCard.width;

      connectors.push(
        createConnector(
          `${card.id}_to_${nextCard.id}`,
          startX,
          card.y + card.height / 2,
          endX,
          nextCard.y + nextCard.height / 2
        )
      );
    });
  }

  const regionAnchorX = side === "left"
    ? columnXs[3] + ROUND_WIDTHS[3]
    : columnXs[3];
  const eliteEightCard = cardsByRound[3]?.[0];

  return {
    cards: cardsByRound.flat(),
    connectors,
    roundLabelPositions: columnXs.map((columnX, roundIndex) => columnX + ROUND_WIDTHS[roundIndex] / 2),
    regionAnchor: {
      x: regionAnchorX,
      y: eliteEightCard ? eliteEightCard.y + eliteEightCard.height / 2 : originY + REGION_HEIGHT / 2,
    },
  };
}

function MatchCard(props: PositionedCard) {
  const framePath = buildFramePath(props.width, props.height);

  return (
    <div
      className={[
        "graveyard-bracket__card",
        props.tone === "path" ? "graveyard-bracket__card--path" : "",
        props.tone === "center" ? "graveyard-bracket__card--center" : "",
        props.highlight ? "graveyard-bracket__card--highlight" : "",
        props.inspectedTone === "available" ? "graveyard-bracket__card--inspected-available" : "",
        props.inspectedTone === "sold" ? "graveyard-bracket__card--inspected-sold" : "",
        props.ownerHighlight ? "graveyard-bracket__card--owner-highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: `${props.x}px`,
        top: `${props.y}px`,
        width: `${props.width}px`,
        height: `${props.height}px`,
      }}
    >
      <svg className="graveyard-bracket__card-frame" viewBox={`0 0 ${props.width} ${props.height}`} aria-hidden="true">
        <path className="graveyard-bracket__card-frame-shadow" d={framePath} />
        <path className="graveyard-bracket__card-frame-stroke" d={framePath} />
        <path className="graveyard-bracket__card-frame-sketch" d={framePath} />
      </svg>

      {props.title ? <div className="graveyard-bracket__card-title">{props.title}</div> : null}

      <div className="graveyard-bracket__card-body">
        {props.rows.map((row, index) => {
          const logoUrl = row.placeholder ? "" : getLogoUrl(row.urlName);
          const isPlaceholder = row.placeholder && !row.shortName;
          const isSelectedRow = props.selectedRowIndexes.includes(index);
          const isInspectedAvailableRow = props.inspectedTone === "available" && props.inspectedRowIndexes.includes(index);
          const isInspectedSoldRow = props.inspectedTone === "sold" && props.inspectedRowIndexes.includes(index);
          const isOwnedRow = props.ownedRowIndexes.includes(index) && !isSelectedRow && !isInspectedAvailableRow && !isInspectedSoldRow;

          return (
            <div
              key={`${props.id}_${index}`}
              className={[
                "graveyard-bracket__row",
                isPlaceholder ? "graveyard-bracket__row--placeholder" : "",
                isSelectedRow ? "graveyard-bracket__row--selected" : "",
                isInspectedAvailableRow ? "graveyard-bracket__row--inspected-available" : "",
                isInspectedSoldRow ? "graveyard-bracket__row--inspected-sold" : "",
                isOwnedRow ? "graveyard-bracket__row--owned" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="graveyard-bracket__seed">
                {row.seed ? row.seed.toString().padStart(2, "0") : ""}
              </div>

              <div className="graveyard-bracket__logo-shell">
                {logoUrl ? (
                  <img
                    className="graveyard-bracket__logo"
                    src={logoUrl}
                    alt={`${row.shortName} logo`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
              </div>

              <div className="graveyard-bracket__team-name" title={row.shortName}>
                {row.shortName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildCenterCards() {
  return [
    {
      id: "semifinal_left",
      x: SEMI_LEFT_X,
      y: TOP_SEMI_Y,
      width: SEMI_WIDTH,
      height: CENTER_CARD_HEIGHT,
      rows: [createPlaceholderTeam()],
      title: "Semifinal",
      highlight: false,
      ownerHighlight: false,
      inspectedTone: undefined,
      selectedRowIndexes: [],
      inspectedRowIndexes: [],
      ownedRowIndexes: [],
      tone: "center" as const,
    },
    {
      id: "semifinal_right",
      x: SEMI_RIGHT_X,
      y: TOP_SEMI_Y,
      width: SEMI_WIDTH,
      height: CENTER_CARD_HEIGHT,
      rows: [createPlaceholderTeam()],
      title: "Semifinal",
      highlight: false,
      ownerHighlight: false,
      inspectedTone: undefined,
      selectedRowIndexes: [],
      inspectedRowIndexes: [],
      ownedRowIndexes: [],
      tone: "center" as const,
    },
    {
      id: "championship",
      x: CHAMP_X,
      y: CHAMP_Y,
      width: CHAMP_WIDTH,
      height: CENTER_CARD_HEIGHT,
      rows: [createPlaceholderTeam()],
      title: "National Championship",
      highlight: false,
      ownerHighlight: false,
      inspectedTone: undefined,
      selectedRowIndexes: [],
      inspectedRowIndexes: [],
      ownedRowIndexes: [],
      tone: "center" as const,
    },
    {
      id: "semifinal_left_lower",
      x: SEMI_LEFT_X,
      y: BOTTOM_SEMI_Y,
      width: SEMI_WIDTH,
      height: CENTER_CARD_HEIGHT,
      rows: [createPlaceholderTeam()],
      title: "Semifinal",
      highlight: false,
      ownerHighlight: false,
      inspectedTone: undefined,
      selectedRowIndexes: [],
      inspectedRowIndexes: [],
      ownedRowIndexes: [],
      tone: "center" as const,
    },
    {
      id: "semifinal_right_lower",
      x: SEMI_RIGHT_X,
      y: BOTTOM_SEMI_Y,
      width: SEMI_WIDTH,
      height: CENTER_CARD_HEIGHT,
      rows: [createPlaceholderTeam()],
      title: "Semifinal",
      highlight: false,
      ownerHighlight: false,
      inspectedTone: undefined,
      selectedRowIndexes: [],
      inspectedRowIndexes: [],
      ownedRowIndexes: [],
      tone: "center" as const,
    },
  ];
}

function Bracket(props: BracketProps) {
  const teamsByRegion = new Map<string, TeamInfo[]>();
  const stageWrapRef = useRef<HTMLDivElement | null>(null);
  const regionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastAutoScrolledRegion = useRef<string | null>(null);
  const lastAutoFocusKey = useRef<string | null>(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const highlightedKeySet = new Set(props.highlightedTeamKeys ?? []);

  props.all_teams.forEach((team) => {
    if (!teamsByRegion.has(team.region)) {
      teamsByRegion.set(team.region, []);
    }
    teamsByRegion.get(team.region)!.push(team);
  });

  const regionLayouts = REGION_POSITIONS.map((regionConfig) => ({
    ...regionConfig,
    teams: teamsByRegion.get(regionConfig.name) ?? [],
    layout: buildRegionLayout(
      regionConfig.name,
      teamsByRegion.get(regionConfig.name) ?? [],
      regionConfig.side,
      regionConfig.left,
      regionConfig.top,
      props.selected_team,
      props.inspectedTeam,
      props.inspectedTeamTone,
      props.inspectedBundleSeed,
      highlightedKeySet
    ),
  }));
  const focusTargets = useMemo(() => {
    const teamsByFocusRegion = new Map<string, TeamInfo[]>();
    const nextTargets = new Map<string, { left: number; top: number; width: number; height: number }>();

    props.all_teams.forEach((team) => {
      if (!teamsByFocusRegion.has(team.region)) {
        teamsByFocusRegion.set(team.region, []);
      }
      teamsByFocusRegion.get(team.region)!.push(team);
    });

    REGION_POSITIONS.forEach((regionConfig) => {
      const layout = buildRegionLayout(
        regionConfig.name,
        teamsByFocusRegion.get(regionConfig.name) ?? [],
        regionConfig.side,
        regionConfig.left,
        regionConfig.top,
      );

      layout.cards.forEach((card) => {
        card.rows.forEach((row, index) => {
          if (row.placeholder || !row.shortName) {
            return;
          }

          const focusKey = normalizeDisplayTeamKey(row);
          if (!focusKey || nextTargets.has(focusKey)) {
            return;
          }

          const rowCenterOffset = index === 0 ? 18 : 43;
          nextTargets.set(focusKey, {
            left: card.x,
            top: card.y + rowCenterOffset,
            width: card.width,
            height: card.height,
          });
        });
      });
    });

    return nextTargets;
  }, [props.all_teams]);

  const centerCards = buildCenterCards();
  const centerConnectors: ConnectorLayout[] = [];
  const centerLookup = new Map(centerCards.map((card) => [card.id, card]));

  const southLayout = regionLayouts.find((region) => region.name === "South")?.layout;
  const eastLayout = regionLayouts.find((region) => region.name === "East")?.layout;
  const midwestLayout = regionLayouts.find((region) => region.name === "Midwest")?.layout;
  const westLayout = regionLayouts.find((region) => region.name === "West")?.layout;

  if (southLayout && eastLayout && midwestLayout && westLayout) {
    centerConnectors.push(
      createConnector(
        "south_to_left_semi",
        southLayout.regionAnchor.x,
        southLayout.regionAnchor.y,
        centerLookup.get("semifinal_left")!.x,
        centerLookup.get("semifinal_left")!.y + CENTER_CARD_HEIGHT / 2
      ),
      createConnector(
        "east_to_left_lower_semi",
        eastLayout.regionAnchor.x,
        eastLayout.regionAnchor.y,
        centerLookup.get("semifinal_left_lower")!.x,
        centerLookup.get("semifinal_left_lower")!.y + CENTER_CARD_HEIGHT / 2
      ),
      createConnector(
        "midwest_to_right_semi",
        midwestLayout.regionAnchor.x,
        midwestLayout.regionAnchor.y,
        centerLookup.get("semifinal_right")!.x + SEMI_WIDTH,
        centerLookup.get("semifinal_right")!.y + CENTER_CARD_HEIGHT / 2
      ),
      createConnector(
        "west_to_right_lower_semi",
        westLayout.regionAnchor.x,
        westLayout.regionAnchor.y,
        centerLookup.get("semifinal_right_lower")!.x + SEMI_WIDTH,
        centerLookup.get("semifinal_right_lower")!.y + CENTER_CARD_HEIGHT / 2
      ),
      createConnector(
        "left_semi_to_champ",
        centerLookup.get("semifinal_left")!.x + SEMI_WIDTH,
        centerLookup.get("semifinal_left")!.y + CENTER_CARD_HEIGHT / 2,
        centerLookup.get("championship")!.x,
        centerLookup.get("championship")!.y + CENTER_CARD_HEIGHT / 2
      ),
      createConnector(
        "left_lower_semi_to_champ",
        centerLookup.get("semifinal_left_lower")!.x + SEMI_WIDTH,
        centerLookup.get("semifinal_left_lower")!.y + CENTER_CARD_HEIGHT / 2,
        centerLookup.get("championship")!.x,
        centerLookup.get("championship")!.y + CENTER_CARD_HEIGHT / 2
      ),
      createConnector(
        "right_semi_to_champ",
        centerLookup.get("semifinal_right")!.x,
        centerLookup.get("semifinal_right")!.y + CENTER_CARD_HEIGHT / 2,
        centerLookup.get("championship")!.x + CHAMP_WIDTH,
        centerLookup.get("championship")!.y + CENTER_CARD_HEIGHT / 2
      ),
      createConnector(
        "right_lower_semi_to_champ",
        centerLookup.get("semifinal_right_lower")!.x,
        centerLookup.get("semifinal_right_lower")!.y + CENTER_CARD_HEIGHT / 2,
        centerLookup.get("championship")!.x + CHAMP_WIDTH,
        centerLookup.get("championship")!.y + CENTER_CARD_HEIGHT / 2
      )
    );
  }

  useEffect(() => {
    if (props.inspectedTeam) {
      return;
    }

    const selectedRegion = props.selected_team?.region;

    if (!selectedRegion || selectedRegion === "bundle") {
      return;
    }

    if (lastAutoScrolledRegion.current !== selectedRegion && regionRefs.current[selectedRegion]) {
      const stage = regionRefs.current[selectedRegion]?.closest(".graveyard-bracket__stage-wrap");
      const regionElement = regionRefs.current[selectedRegion];

      if (stage instanceof HTMLElement && regionElement) {
        stage.scrollTo({
          behavior: "smooth",
          left: Math.max(0, regionElement.offsetLeft - 72),
          top: Math.max(0, regionElement.offsetTop - 96),
        });
      }

      lastAutoScrolledRegion.current = selectedRegion;
    }
  }, [props.inspectedTeam, props.selected_team?.region]);

  useEffect(() => {
    const stage = stageWrapRef.current;

    if (!stage || !props.inspectedTeam) {
      return;
    }

    const focusKey = props.inspectedTeam.region === "bundle" && props.inspectedTeam.seed > 0
      ? `bundle:${props.inspectedTeam.seed}`
      : normalizeTeamKey(props.inspectedTeam);

    if (!focusKey || lastAutoFocusKey.current === focusKey) {
      return;
    }

    if (props.inspectedTeam.region === "bundle") {
      const overviewLeft = Math.max(0, CANVAS_WIDTH / 2 - stage.clientWidth / 2);
      const overviewTop = Math.max(0, CANVAS_HEIGHT / 2 - stage.clientHeight / 2 - 120);

      stage.scrollTo({
        behavior: "smooth",
        left: overviewLeft,
        top: overviewTop,
      });
      lastAutoFocusKey.current = focusKey;
      return;
    }

    const focusTarget = focusTargets.get(focusKey);

    if (!focusTarget) {
      return;
    }

    stage.scrollTo({
      behavior: "smooth",
      left: Math.max(0, focusTarget.left - stage.clientWidth / 2 + focusTarget.width / 2),
      top: Math.max(0, focusTarget.top - stage.clientHeight / 2 + focusTarget.height / 2),
    });
    lastAutoFocusKey.current = focusKey;
  }, [
    focusTargets,
    props.inspectedTeam,
    props.inspectedTeam?.region,
    props.inspectedTeam?.seed,
    props.inspectedTeam?.shortName,
  ]);

  useEffect(() => {
    if (!props.inspectedTeam) {
      lastAutoFocusKey.current = null;
    }
  }, [props.inspectedTeam]);

  useEffect(() => {
    const stage = stageWrapRef.current;

    if (!stage) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) {
        return;
      }

      const target = event.target;
      if (target instanceof Element && target.closest("button")) {
        return;
      }

      dragStateRef.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: stage.scrollLeft,
        scrollTop: stage.scrollTop,
      };

      stage.classList.add("graveyard-bracket__stage-wrap--dragging");
      stage.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      stage.scrollLeft = dragStateRef.current.scrollLeft - (event.clientX - dragStateRef.current.startX);
      stage.scrollTop = dragStateRef.current.scrollTop - (event.clientY - dragStateRef.current.startY);
    };

    const endDrag = (event: PointerEvent) => {
      if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current.active = false;
      stage.classList.remove("graveyard-bracket__stage-wrap--dragging");

      if (stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
    };

    stage.addEventListener("pointerdown", handlePointerDown);
    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("lostpointercapture", endDrag);

    return () => {
      stage.removeEventListener("pointerdown", handlePointerDown);
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerup", endDrag);
      stage.removeEventListener("pointercancel", endDrag);
      stage.removeEventListener("lostpointercapture", endDrag);
    };
  }, []);

  return (
    <div className="graveyard-bracket">
      <div className="graveyard-bracket__stage-wrap" ref={stageWrapRef}>
        <div className="graveyard-bracket__canvas">
          <div className="graveyard-bracket__center-badge graveyard-bracket__center-badge--top">Final Four</div>
          <div className="graveyard-bracket__center-badge graveyard-bracket__center-badge--bottom">Championship</div>

          <svg className="graveyard-bracket__connectors" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} aria-hidden="true">
            {regionLayouts.flatMap((region) => region.layout.connectors).concat(centerConnectors).map((connector) => (
              <g key={connector.id} className="graveyard-bracket__connector-group">
                <path className="graveyard-bracket__connector-shadow" d={connector.d} />
                <path className="graveyard-bracket__connector-base" d={connector.d} />
                <path className="graveyard-bracket__connector-sketch" d={connector.d} />
                {connector.joints.map((joint, index) => (
                  <g key={`${connector.id}_${index}`} transform={`translate(${joint.x}, ${joint.y})`} className="graveyard-bracket__joint">
                    <circle r="3.1" />
                    <ellipse rx="4.6" ry="2" />
                  </g>
                ))}
              </g>
            ))}
          </svg>

          {regionLayouts.map((region) => (
            <div
              key={region.name}
              ref={(element) => {
                regionRefs.current[region.name] = element;
              }}
              className={[
                "graveyard-bracket__region-anchor",
                props.selected_team?.region === region.name ? "graveyard-bracket__region-anchor--current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: `${region.left}px`,
                top: `${region.top}px`,
                width: `${REGION_WIDTH}px`,
                height: `${REGION_HEIGHT}px`,
              }}
            >
              <div
                className={[
                  "graveyard-bracket__region-name",
                  `graveyard-bracket__region-name--${region.side}`,
                ].join(" ")}
                style={{
                  left: `${region.layout.regionAnchor.x - region.left + (region.side === "left" ? -186 : 186)}px`,
                  top: `${318}px`,
                }}
              >
                {region.name}
              </div>

              {region.layout.roundLabelPositions.map((labelX, roundIndex) => (
                <div
                  key={`${region.name}_${ROUND_LABELS[roundIndex]}`}
                  className="graveyard-bracket__round-label"
                  style={{
                    left: `${labelX - region.left}px`,
                    top: `${10}px`,
                  }}
                >
                  {ROUND_LABELS[roundIndex]}
                </div>
              ))}
            </div>
          ))}

          {regionLayouts.flatMap((region) => region.layout.cards).map((card) => (
            <MatchCard key={card.id} {...card} />
          ))}

          {centerCards.map((card) => (
            <MatchCard key={card.id} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Bracket;
