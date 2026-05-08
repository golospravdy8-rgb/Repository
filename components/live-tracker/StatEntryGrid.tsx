'use client';

import { useTransition } from 'react';
import {
  addScoreWithType,
  addReboundDef,
  addReboundOff,
  addAssist,
  addSteal,
  addBlock,
  addTurnover,
  addMissFg2,
  addMissFg3,
  addFoul,
} from '@/actions/game';
import type { Game, Team, Player, BoxScore } from '@prisma/client';
import type { GameStateCompact, PlayerOnCourtState } from '@/types/live-tracker';

interface StatEntryGridProps {
  game: Game & {
    homeTeam: Team & { players: Player[] };
    awayTeam: Team & { players: Player[] };
  };
  gameState: GameStateCompact;
}

export default function StatEntryGrid({ game, gameState }: StatEntryGridProps) {
  const [pending, startTransition] = useTransition();

  const handleAddStat = (
    gameId: number,
    teamId: number,
    playerId: number,
    action: string
  ) => {
    startTransition(async () => {
      switch (action) {
        case '1pt':
          await addScoreWithType(gameId, teamId, playerId, 1, 'normal');
          break;
        case '2pt':
          await addScoreWithType(gameId, teamId, playerId, 2, 'normal');
          break;
        case '3pt':
          await addScoreWithType(gameId, teamId, playerId, 3, 'normal');
          break;
        case 'defRebound':
          await addReboundDef(gameId, teamId, playerId);
          break;
        case 'offRebound':
          await addReboundOff(gameId, teamId, playerId);
          break;
        case 'assist':
          await addAssist(gameId, teamId, playerId);
          break;
        case 'steal':
          await addSteal(gameId, teamId, playerId);
          break;
        case 'block':
          await addBlock(gameId, teamId, playerId);
          break;
        case 'turnover':
          await addTurnover(gameId, teamId, playerId);
          break;
        case 'miss2':
          await addMissFg2(gameId, teamId, playerId);
          break;
        case 'miss3':
          await addMissFg3(gameId, teamId, playerId);
          break;
        case 'foul':
          await addFoul(gameId, teamId, playerId);
          break;
      }
    });
  };

  const getPlayerStats = (teamId: number, playerId: number): PlayerOnCourtState | null => {
    const isHome = teamId === gameState.homeTeam.teamId;
    const team = isHome ? gameState.homeTeam : gameState.awayTeam;
    return team.players[playerId] || null;
  };

  const renderTeamSection = (team: Team & { players: Player[] }, teamId: number, isHome: boolean) => {
    const teamColor = isHome ? '#0d1520' : '#f3f4f6';
    const textColor = isHome ? '#c8d8e8' : '#374151';

    return (
      <div
        style={{
          flex: 1,
          background: teamColor,
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px',
            background: isHome ? '#1a2737' : '#e5e7eb',
            borderBottom: `1px solid ${isHome ? '#2a3e52' : '#d1d5db'}`,
            fontWeight: 'bold',
            fontSize: '14px',
            color: isHome ? '#fff' : '#1f2937',
          }}
        >
          {team.name}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {team.players.map(player => {
            const playerStats = getPlayerStats(teamId, player.id);
            return (
              <PlayerStatRow
                key={player.id}
                player={player}
                gameId={game.id}
                teamId={teamId}
                playerStats={playerStats}
                onAddStat={handleAddStat}
                isDisabled={pending || game.status !== 'LIVE'}
                isHome={isHome}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        padding: '12px',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {renderTeamSection(game.homeTeam, gameState.homeTeam.teamId, true)}
      {renderTeamSection(game.awayTeam, gameState.awayTeam.teamId, false)}
    </div>
  );
}

interface PlayerStatRowProps {
  player: Player;
  gameId: number;
  teamId: number;
  playerStats: PlayerOnCourtState | null;
  onAddStat: (gameId: number, teamId: number, playerId: number, action: string) => void;
  isDisabled: boolean;
  isHome: boolean;
}

function PlayerStatRow({
  player,
  gameId,
  teamId,
  playerStats,
  onAddStat,
  isDisabled,
  isHome,
}: PlayerStatRowProps) {
  const bgColor = isHome ? '#0d1520' : '#ffffff';
  const hoverBg = isHome ? '#163a5c' : '#f9fafb';
  const textColor = isHome ? '#c8d8e8' : '#374151';
  const borderColor = isHome ? '#2a3e52' : '#e5e7eb';

  const points = playerStats?.points || 0;
  const rebounds = playerStats?.rebounds || 0;
  const assists = playerStats?.assists || 0;
  const steals = playerStats?.steals || 0;
  const blocks = playerStats?.blocks || 0;
  const fouls = playerStats?.fouls || 0;

  return (
    <div
      style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: bgColor,
        transition: 'background 0.2s',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLElement).style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = bgColor;
      }}
    >
      {/* Player Number & Name */}
      <div style={{ flex: '0 0 120px', minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: textColor }}>
          #{player.number}
        </div>
        <div style={{ fontSize: '11px', color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.firstName} {player.lastName}
        </div>
      </div>

      {/* Stats Display */}
      <div style={{ display: 'flex', gap: '6px', fontSize: '10px', flex: 1, minWidth: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#4ef472' }}>{points}</div>
          <div style={{ color: textColor, fontSize: '9px' }}>P</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#b07af4' }}>{rebounds}</div>
          <div style={{ color: textColor, fontSize: '9px' }}>R</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#5ae8f4' }}>{assists}</div>
          <div style={{ color: textColor, fontSize: '9px' }}>A</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#f4cc5a' }}>{steals}</div>
          <div style={{ color: textColor, fontSize: '9px' }}>S</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#f47a7a' }}>{blocks}</div>
          <div style={{ color: textColor, fontSize: '9px' }}>B</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#f4a050' }}>{fouls}</div>
          <div style={{ color: textColor, fontSize: '9px' }}>F</div>
        </div>
      </div>

      {/* Quick Buttons */}
      <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
        <QuickStatButton
          label="+1"
          onClick={() => onAddStat(gameId, teamId, player.id, '1pt')}
          disabled={isDisabled}
        />
        <QuickStatButton
          label="+2"
          onClick={() => onAddStat(gameId, teamId, player.id, '2pt')}
          disabled={isDisabled}
        />
        <QuickStatButton
          label="R"
          onClick={() => onAddStat(gameId, teamId, player.id, 'defRebound')}
          disabled={isDisabled}
        />
        <QuickStatButton
          label="A"
          onClick={() => onAddStat(gameId, teamId, player.id, 'assist')}
          disabled={isDisabled}
        />
        <QuickStatButton
          label="F"
          onClick={() => onAddStat(gameId, teamId, player.id, 'foul')}
          disabled={isDisabled}
          color="#f47a7a"
        />
      </div>
    </div>
  );
}

interface QuickStatButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  color?: string;
}

function QuickStatButton({ label, onClick, disabled, color = '#4ef472' }: QuickStatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '24px',
        height: '24px',
        padding: '0',
        fontSize: '10px',
        fontWeight: '700',
        color: disabled ? '#4a7fa5' : '#fff',
        background: disabled ? '#1a2e40' : color,
        border: 'none',
        borderRadius: '2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
      title={label}
    >
      {label}
    </button>
  );
}
