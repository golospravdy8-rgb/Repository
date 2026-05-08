/**
 * Types for LiveScoreTracker component
 * Refactored for Record-based state management (Phase 4)
 */

export interface PlayerOnCourtState {
  // Identity
  playerId: number
  number: number
  firstName: string
  lastName: string
  teamId: number

  // On-court status
  onCourt: boolean              // true = на площадке, false = на скамейці
  isStarter: boolean            // true = стартовий гравець, false = резервіст

  // Time tracking (accumulates across substitutions)
  timeOnCourtSeconds: number    // Cumulative seconds on court
  lastSubInTimestamp: number | null // Game clock (seconds) when player last entered

  // Statistics (synced from BoxScore)
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  turnovers: number
  plusMinus: number
}

export interface TeamPlayersState {
  teamId: number
  name: string
  players: Record<number, PlayerOnCourtState>  // Key: playerId
}

export interface GameStateCompact {
  gameId: number
  status: 'SCHEDULED' | 'LIVE' | 'FINAL'
  quarter: number
  homeScore: number
  awayScore: number
  homeTimeouts: number
  awayTimeouts: number

  // Game clock: seconds elapsed since start of current quarter
  gameClock: number
  isClockRunning: boolean

  // Team states
  homeTeam: TeamPlayersState
  awayTeam: TeamPlayersState
}

export type SubstitutionMode =
  | { phase: 'idle' }
  | { phase: 'selecting_bench', teamId: number, playerOutId: number }
