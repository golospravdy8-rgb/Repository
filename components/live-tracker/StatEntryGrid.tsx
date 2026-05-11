'use client';

import { useTransition } from 'react';
import { recordGameAction } from '@/app/actions/game-events';
import type { Game, Team, Player, BoxScore } from '@prisma/client';

interface StatEntryGridProps {
  game: Game & {
    homeTeam: Team & { players: Player[] };
    awayTeam: Team & { players: Player[] };
  };
  boxScores: (BoxScore & { player: Player })[];
}

export default function StatEntryGrid({ game, boxScores }: StatEntryGridProps) {
  const [pending, startTransition] = useTransition();

  const handleAddStat = (
    gameId: number,
    teamId: number,
    playerId: number,
    action: string
  ) => {
    startTransition(async () => {
      const gameClockSeconds = game.currentTimeLeft || 0;
      const quarter = game.quarter || 1;

      let actionType = '';
      let payload: Record<string, any> = {};

      switch (action) {
        case '1pt':
          actionType = 'POINTS';
          payload = { points: 1, shotType: 'FT' };
          break;
        case '2pt':
          actionType = 'POINTS';
          payload = { points: 2, shotType: '2PT' };
          break;
        case '3pt':
          actionType = 'POINTS';
          payload = { points: 3, shotType: '3PT' };
          break;
        case 'defRebound':
          actionType = 'REBOUND_DEF';
          break;
        case 'offRebound':
          actionType = 'REBOUND_OFF';
          break;
        case 'assist':
          actionType = 'ASSIST';
          break;
        case 'steal':
          actionType = 'STEAL';
          break;
        case 'block':
          actionType = 'BLOCK';
          break;
        case 'turnover':
          actionType = 'TURNOVER';
          break;
        case 'miss2':
          actionType = 'MISS_2P';
          payload = { shotType: '2PT' };
          break;
        case 'miss3':
          actionType = 'MISS_3P';
          payload = { shotType: '3PT' };
          break;
        case 'miss1':
          actionType = 'MISS_1P';
          payload = { shotType: 'FT' };
          break;
        case 'foul':
          actionType = 'FOUL';
          payload = { foulType: 'PERSONAL' };
          break;
        case 'miss1ft':
          actionType = 'MISS_FT';
          break;
        case 'techFoul':
          actionType = 'FOUL_TECHNICAL';
          break;
        case 'unsportsFoul':
          actionType = 'FOUL_UNSPORTSMANLIKE';
          break;
      }

      if (actionType) {
        await recordGameAction({
          gameId,
          playerId,
          actionType,
          gameClockSeconds,
          quarter,
          payload,
        });
      }
    });
  };

  const getBoxScore = (playerId: number) => {
    return boxScores.find(bs => bs.playerId === playerId) || null;
  };

  const renderTeamSection = (team: Team & { players: Player[] }, isHome: boolean) => {
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
            const bs = getBoxScore(player.id);
            return (
              <PlayerStatRow
                key={player.id}
                player={player}
                gameId={game.id}
                teamId={team.id}
                boxScore={bs}
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
      {renderTeamSection(game.homeTeam, true)}
      {renderTeamSection(game.awayTeam, false)}
    </div>
  );
}

interface PlayerStatRowProps {
  player: Player;
  gameId: number;
  teamId: number;
  boxScore: (BoxScore & { player: Player }) | null;
  onAddStat: (gameId: number, teamId: number, playerId: number, action: string) => void;
  isDisabled: boolean;
  isHome: boolean;
}

function PlayerStatRow({
  player,
  gameId,
  teamId,
  boxScore,
  onAddStat,
  isDisabled,
  isHome,
}: PlayerStatRowProps) {
  const bgColor = isHome ? '#0d1520' : '#ffffff';
  const hoverBg = isHome ? '#163a5c' : '#f9fafb';
  const textColor = isHome ? '#c8d8e8' : '#374151';
  const borderColor = isHome ? '#2a3e52' : '#e5e7eb';

  const points = boxScore?.points || 0;
  const rebounds = (boxScore?.rebounds || 0) + (boxScore?.reboundsOff || 0) + (boxScore?.reboundsDef || 0);
  const assists = boxScore?.assists || 0;
  const steals = boxScore?.steals || 0;
  const blocks = boxScore?.blocks || 0;
  const fouls = boxScore?.fouls || 0;

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
          label="M1"
          onClick={() => onAddStat(gameId, teamId, player.id, 'miss1ft')}
          disabled={isDisabled}
          color="#a0a0a0"
          title="Промах ШТ"
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
          title="Персональний фол"
        />
        <QuickStatButton
          label="T"
          onClick={() => onAddStat(gameId, teamId, player.id, 'techFoul')}
          disabled={isDisabled}
          color="#ff6347"
          title="Технічний фол"
        />
        <QuickStatButton
          label="U"
          onClick={() => onAddStat(gameId, teamId, player.id, 'unsportsFoul')}
          disabled={isDisabled}
          color="#ff1744"
          title="Неспортивний фол"
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
  title?: string;
}

function QuickStatButton({ label, onClick, disabled, color = '#4ef472', title }: QuickStatButtonProps) {
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
      title={title || label}
    >
      {label}
    </button>
  );
}
