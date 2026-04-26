# GAME BACKUP - 2026-04-26

## Commit: 2238dd9f3358761485fda9dbacbc58871507d635

## Как восстановить:
```bash
git checkout 2238dd9f3358761485fda9dbacbc58871507d635 -- components/public/RucheekGameCanvas.tsx
npm run build
git add -A && git commit -m "restore from backup" && git push
```

## components/public/RucheekGameCanvas.tsx (первые 50 строк)

"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Pusher from "pusher-js";
import { PowerMeterSystem } from "@/lib/game/powerMeterSystem";
import { createMeterElement, hideMeter, showAccuracyFeedback } from "@/lib/game/powerMeterUI";
import {
  computeLaunchVelocity,
  stepPhysics,
  computeRimCollision,
  computeBackboardCollision,
  computeFloorBounce,
  simulateTrajectory,
  PHYSICS_CONSTANTS,
  calculateGreenZonePosition,
  updateOscillator,
  calculateAccuracy,
} from "./basketball-physics-engine";

interface RucheekGameCanvasProps {
  isVisible: boolean;
  userName?: string;
  userPhone?: string;
  gameRoomId?: string;
}

const PLAYER_COLORS = ["#4fc3f7","#81c784","#ffb74d","#f06292","#ce93d8","#80cbc4"];
const MAX_PLAYERS = 6;

export default function RucheekGameCanvas({ isVisible, userName = "", userPhone = "", gameRoomId = "general" }: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pnameRef = useRef<HTMLInputElement>(null);
  const pusherRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const remotePlayersRef = useRef<Map<string, any>>(new Map());
  const [mounted, setMounted] = useState(false);
  const [pname, setPname] = useState(userName);
  const [showModal, setShowModal] = useState(false);
  const [, forceUpdate] = useState(0);
  const gsRef = useRef<any>({
    state: "waiting",
    players: [] as any[],
    shootStates: [] as any[],
    flashes: [] as any[],
    selectedMoveIdx: -1,
    disputeP1: 0,
    disputeP2: -1,
    netShake: false,
    netShakeEnd: 0,

---

## app/api/pusher/route.ts

import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, x, y, name, score, action, ball, socket_id } = await req.json();
    
    if (!socket_id) {
      console.warn('[Pusher API] ⚠️ socket_id is missing! Will cause echo to sender');
    }
    console.log('[Pusher API] Received:', { room, playerId, action, socket_id, hasBall: !!ball });

    if (action === 'leave') {
      await pusherServer.trigger(`game-${room}`, 'player-leave', { playerId }, {
        socket_id,  // Prevent Pusher echo to sender
      });
      console.log('[Pusher API] Player left:', playerId);
      return NextResponse.json({ ok: true });
    }

    // ETAP 8: Include ball data in player-move broadcast
    await pusherServer.trigger(`game-${room}`, 'player-move', {
      playerId,
      x,
      y,
      name,
      score: score || 0,
      ball: ball || null,  // ETAP 8: Broadcast ball state to other players
      timestamp: Date.now(),
    }, {
      socket_id,  // Prevent Pusher echo to sender
    });

    if (ball) {
      console.log('[Pusher API] Position + ball sent:', { room, playerId, x, y, ballState: ball.state });
    } else {
      console.log('[Pusher API] Position sent (no ball):', { room, playerId, x, y });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher API] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

---

## app/api/pusher/join/route.ts

import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, playerIndex, nickname, x, y, socket_id } = await req.json();

    console.log('[Pusher Join] Player joining:', { room, playerId, nickname });

    await pusherServer.trigger(`game-${room}`, 'player-joined', {
      playerId,
      playerIndex,
      nickname,
      x,
      y,
      timestamp: Date.now(),
    }, {
      socket_id,  // Prevent Pusher echo to sender
    });

    console.log('[Pusher Join] Broadcast sent successfully');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher Join] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

---

## app/api/pusher/state/route.ts

import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, state, socket_id } = await req.json();

    console.log('[Pusher State] Game state update:', { room, playerId });

    await pusherServer.trigger(`game-${room}`, 'state-update', {
      playerId,
      state,
      timestamp: Date.now(),
    }, {
      socket_id,  // Prevent Pusher echo to sender
    });

    console.log('[Pusher State] Broadcast sent successfully');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher State] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
