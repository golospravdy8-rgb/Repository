/**
 * FIBA Event System Types
 *
 * Comprehensive TypeScript types for all basketball actions
 * mapped to FIBA Official Scoresheet structure
 */

// ═══════════════════════════════════════════════════════════════════════════
// ① UNION OF ALL POSSIBLE FIBA ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type FibaAction =
  | FieldGoalAction
  | FreeThrowAction
  | ReboundAction
  | PassAction
  | StealAction
  | BlockAction
  | TurnoverAction
  | FoulAction
  | SubstitutionAction
  | TimeoutAction
  | QuarterAction;

// ═══════════════════════════════════════════════════════════════════════════
// ② FIELD GOAL ACTIONS (2PT, 3PT, MISS)
// ═══════════════════════════════════════════════════════════════════════════

export type FieldGoalAction =
  | TwoPointShotAction
  | ThreePointShotAction
  | MissTwoPointAction
  | MissThreePointAction
  | BankshotAction;

/**
 * 2-point basket made
 * Sends: playerId, teamId, eventType (normal|fastbreak|second_chance|off_turnover)
 */
export interface TwoPointShotAction {
  type: "FIELD_GOAL";
  subtype: "2PT";
  gameId: number;
  teamId: number;
  playerId: number;
  points: 2;
  eventContext?: "normal" | "fastbreak" | "second_chance" | "off_turnover";
  gameClockSeconds?: number;
}

/**
 * 3-point basket made
 */
export interface ThreePointShotAction {
  type: "FIELD_GOAL";
  subtype: "3PT";
  gameId: number;
  teamId: number;
  playerId: number;
  points: 3;
  eventContext?: "normal" | "fastbreak" | "second_chance" | "off_turnover";
  gameClockSeconds?: number;
}

/**
 * Miss 2-point shot
 * UI button: "Промах 2"
 */
export interface MissTwoPointAction {
  type: "FIELD_GOAL_MISS";
  subtype: "MISS_2PT";
  gameId: number;
  teamId: number;
  playerId: number;
  points: 0;
  gameClockSeconds?: number;
}

/**
 * Miss 3-point shot
 * UI button: "Промах 3"
 */
export interface MissThreePointAction {
  type: "FIELD_GOAL_MISS";
  subtype: "MISS_3PT";
  gameId: number;
  teamId: number;
  playerId: number;
  points: 0;
  gameClockSeconds?: number;
}

/**
 * Bank shot ( 2 or 3 pointer)
 * Future: separate UI button
 */
export interface BankshotAction {
  type: "FIELD_GOAL";
  subtype: "2PT" | "3PT";
  gameId: number;
  teamId: number;
  playerId: number;
  points: 2 | 3;
  isBank: true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ③ FREE THROW ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type FreeThrowAction = FreeThrowMadeAction | FreeThrowMissAction;

/**
 * Free throw made (1 point)
 * Treats FT as a separate scoring type in protocol
 * UI: Штрафний кидок (якщо буде окремо)
 */
export interface FreeThrowMadeAction {
  type: "FREE_THROW";
  subtype: "FT_MADE";
  gameId: number;
  teamId: number;
  playerId: number;
  points: 1;
  ftSequence?: number; // 1st, 2nd, 3rd FT in series
  gameClockSeconds?: number;
  isFreeThrow?: boolean;
}

/**
 * Free throw miss
 */
export interface FreeThrowMissAction {
  type: "FREE_THROW";
  subtype: "FT_MISS";
  gameId: number;
  teamId: number;
  playerId: number;
  points: 0;
  ftSequence?: number;
  gameClockSeconds?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ④ REBOUND ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type ReboundAction = DefensiveReboundAction | OffensiveReboundAction;

/**
 * Defensive rebound
 * UI button: "Підбір(З)" (захисний)
 */
export interface DefensiveReboundAction {
  type: "REBOUND";
  subtype: "REBOUND_DEF";
  gameId: number;
  teamId: number;
  playerId: number;
  gameClockSeconds?: number;
}

/**
 * Offensive rebound
 * UI button: "Підбір(н)" (атакуючий)
 */
export interface OffensiveReboundAction {
  type: "REBOUND";
  subtype: "REBOUND_OFF";
  gameId: number;
  teamId: number;
  playerId: number;
  gameClockSeconds?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ PASSING & ASSIST ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type PassAction = AssistAction;

/**
 * Assist
 * UI button: "ПР" (пас)
 */
export interface AssistAction {
  type: "ASSIST";
  subtype: "ASSIST";
  gameId: number;
  teamId: number;
  playerId: number;
  gameClockSeconds?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑥ DEFENSIVE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type StealAction = {
  type: "STEAL";
  subtype: "STEAL";
  gameId: number;
  teamId: number;
  playerId: number;
  gameClockSeconds?: number;
};

export type BlockAction = {
  type: "BLOCK";
  subtype: "BLOCK";
  gameId: number;
  teamId: number;
  playerId: number;
  gameClockSeconds?: number;
};

export type TurnoverAction = {
  type: "TURNOVER";
  subtype: "TURNOVER";
  gameId: number;
  teamId: number;
  playerId: number;
  gameClockSeconds?: number;
};

// ═══════════════════════════════════════════════════════════════════════════
// ⑦ FOUL ACTIONS (FIBA Compliant)
// ═══════════════════════════════════════════════════════════════════════════

export type FoulAction =
  | PersonalFoulAction
  | TechnicalFoulAction
  | UnsportsmanlikeFoulAction
  | DisqualifyingFoulAction
  | CoachFoulAction;

/**
 * Personal foul
 * UI button: "Фол" (типова)
 * IMPORTANTE: fouledPlayerId показує на кого був фол!
 */
export interface PersonalFoulAction {
  type: "FOUL";
  foulType: "PERSONAL";
  gameId: number;
  teamId: number;
  playerId: number; // Player who committed foul
  fouledPlayerId?: number; // Player who was fouled (optional UI input)
  wasShooting?: boolean; // Was it a shooting foul?
  gameClockSeconds?: number;
}

/**
 * Technical foul
 * UI button: "Фол Т" (технічний)
 * Results in: 1 FT + possession for opponent
 */
export interface TechnicalFoulAction {
  type: "FOUL";
  foulType: "TECHNICAL";
  gameId: number;
  teamId: number;
  playerId: number;
  fouledPlayerId?: number;
  gameClockSeconds?: number;
}

/**
 * Unsportsmanlike foul
 * UI button: "Фол Л" (неспортивна)
 * Results in: 1 FT + possession for opponent
 */
export interface UnsportsmanlikeFoulAction {
  type: "FOUL";
  foulType: "UNSPORTSMANLIKE";
  gameId: number;
  teamId: number;
  playerId: number;
  fouledPlayerId?: number;
  gameClockSeconds?: number;
}

/**
 * Disqualifying foul
 * UI button: "Фол Д" (дисквалімікуюча)
 * Results in: player ejection
 */
export interface DisqualifyingFoulAction {
  type: "FOUL";
  foulType: "DISQUALIFYING";
  gameId: number;
  teamId: number;
  playerId: number;
  fouledPlayerId?: number;
  gameClockSeconds?: number;
}

/**
 * Coach foul
 * Charged to team, not individual player
 */
export interface CoachFoulAction {
  type: "FOUL";
  foulType: "COACH";
  gameId: number;
  teamId: number;
  playerId: null; // No specific player
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑧ SUBSTITUTION ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type SubstitutionAction = PlayerSubstitutionAction;

/**
 * Substitution (player in)
 * Automatically pairs with previous "out" event
 */
export interface PlayerSubstitutionAction {
  type: "SUBSTITUTION";
  subtype: "IN" | "OUT";
  gameId: number;
  teamId: number;
  playerId: number;
  playerOutId?: number; // Player being replaced (if IN action)
  gameClockSeconds?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑨ TIMEOUT & QUARTER ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type TimeoutAction = {
  type: "TIMEOUT";
  gameId: number;
  teamId: number;
  gameClockSeconds?: number;
};

export type QuarterAction =
  | { type: "QUARTER_END"; gameId: number; quarter: number }
  | { type: "QUARTER_START"; gameId: number; quarter: number }
  | { type: "HALFTIME"; gameId: number }
  | { type: "GAME_END"; gameId: number };

// ═══════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FibaEventResult {
  success: boolean;
  gameEventId?: number;
  boxScoreId?: number;
  error?: string;

  // Validation info
  validation?: {
    playerFouledOut?: boolean;
    playerDisqualified?: boolean;
    teamFoulThreshold?: boolean;
  };
}

/**
 * Box Score Stats (for protocol display)
 * Matches columns in FIBA Secretarial Protocol exactly
 */
export interface BoxScoreStats {
  // Player info
  playerId: number;
  number: number;
  firstName: string;
  lastName: string;
  isStarter: boolean;
  minutesPlayed: string; // "MM:SS"

  // Scoring
  points: number;

  // Field Goals
  fgMade: number;
  fgAttempted: number;
  fgPercent: number;

  // 2-pointers
  fg2Made: number;
  fg2Attempted: number;
  fg2Percent: number;

  // 3-pointers
  fg3Made: number;
  fg3Attempted: number;
  fg3Percent: number;

  // Free throws
  ftMade: number;
  ftAttempted: number;
  ftPercent: number;

  // Rebounds
  reboundsOff: number;
  reboundsDef: number;
  reboundsTotal: number;

  // Assists & turnovers
  assists: number;
  turnovers: number;

  // Defensive
  steals: number;
  blocks: number;

  // Fouls (FIBA breakdown)
  foulsPersonal: number;
  foulsTechnical: number;
  foulsUnsports: number;
  foulsDisq: number;
  foulsCumulative: number;

  // Metrics
  plusMinus: number;
  efficiency: number;

  // Flags
  isFouledOut: boolean;
  isDisqualified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS FOR VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const FIBA_RULES = {
  // Fouls before disqualification
  MAX_PERSONAL_FOULS: 5,

  // Technical or Unsportsmanlike (2x = DQ)
  MAX_TECHNICAL_UNSPORTS: 2,

  // Team fouls threshold per quarter
  // Q1-Q3: 5 fouls = bonus FT
  // Q4: 5 fouls = bonus FT
  TEAM_FOUL_THRESHOLD_Q1_Q3: 5,
  TEAM_FOUL_THRESHOLD_Q4: 5,

  // Quarters in game
  QUARTERS_IN_GAME: 4,
  QUARTER_DURATION_SECONDS: 600, // 10 minutes
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: GET FOUL COUNT BY TYPE
// ═══════════════════════════════════════════════════════════════════════════

export function getFoulCount(action: FoulAction): {
  isPersonal: boolean;
  isTechnical: boolean;
  isUnsports: boolean;
  isDisq: boolean;
} {
  return {
    isPersonal: action.foulType === "PERSONAL",
    isTechnical: action.foulType === "TECHNICAL",
    isUnsports: action.foulType === "UNSPORTSMANLIKE",
    isDisq: action.foulType === "DISQUALIFYING",
  };
}
