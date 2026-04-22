'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { GameCanvas } from '@/components/GameCanvas';

function GamePageContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || 'game-room-123';
  const playerIndexStr = searchParams.get('player') || '0';
  const playerIndex = parseInt(playerIndexStr, 10);

  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <Suspense fallback={<div className="text-white">Loading game...</div>}>
        <GameCanvas roomId={roomId} playerIndex={playerIndex} width={800} height={600} />
      </Suspense>
    </div>
  );
}

export default function GamePage() {
  return <GamePageContent />;
}
