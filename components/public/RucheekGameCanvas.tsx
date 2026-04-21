"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { joinGameChannel, sendGameEvent } from "@/lib/gameChannel";

interface RucheekGameCanvasProps {
  isVisible: boolean;
  userName?: string;
  userPhone?: string;
  gameRoomId?: string;
}

const PLAYER_COLORS = ["#4fc3f7","#81c784","#ffb74d","#f06292","#ce93d8","#80cbc4"];
const MAX_PLAYERS = 6;

export default function RucheekGameCanvas({ isVisible, userName = "", userPhone = "", gameRoomId = "default" }: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pnameRef = useRef<HTMLInputElement>(null);
  const btnStartRef = useRef<HTMLButtonElement>(null);
  const channelRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [pname, setPname] = useState(userName);
  const [showModal, setShowModal] = useState(false);
  const [, forceUpdate] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const gsRef = useRef<any>({
    state: "waiting",
    players: [] as any[],
    shootStates: [] as any[],
    flashes: [] as any[],
    queue: [] as Array<{name: string, owner: string}>,
    selectedMoveIdx: -1,
    disputeP1: 0,
    disputeP2: -1,
    netShake: false,
    netShakeEnd: 0,
    netShakeT: 0,
    turnStartTime: 0,
    turnTimeoutId: null as any,
    eventLog: [] as Array<{text: string, time: number}>,
  });

  useEffect(() => { setMounted(true); }, []);

  // ── Supabase Realtime channel for game events ──────────────────────────
  useEffect(() => {
    if (!mounted || !isVisible) return;

    const handleGameEvent = (ev: any) => {
      const gs = gsRef.current;

      if (ev.action === 'addPlayer' && ev.player) {
        if (!gs.players.find((p: any) => p.owner === ev.player.owner && p.name === ev.player.name)) {
          const idx = gs.players.length;
          const W_ORIG = 860, H_ORIG = 624, GY_ORIG = 584;
          const scaleX = window.innerWidth / W_ORIG;
          const scaleY = window.innerHeight / H_ORIG;
          const P_START = window.innerWidth * 0.65;
          const P_STEP = window.innerWidth * 0.07;
          const GY = GY_ORIG * scaleY;
          gs.players.push({ name: ev.player.name, x: P_START + idx * P_STEP, y: GY, score: 0, kills: 0, status: 'idle', rf: 0, color: PLAYER_COLORS[idx % 6], owner: ev.player.owner, hp: ev.player.hp || 3 });
          gs.shootStates.push({ phase: null, aimAngle: -Math.PI * 0.72, aimDir: 1, power: 0, powerDir: 1, ball: null, lockedAngle: null, idealTraj: null, idealSpeed: 10, runTarget: null, inDanger: false });
          setPlayerCount(gs.players.length);
          forceUpdate(n => n + 1);
        }
      }
      if (ev.action === 'start' && gs.state === 'waiting') {
        gs.state = 'playing';
        forceUpdate(n => n + 1);
      }
      if (ev.action === 'leave') {
        gs.players = gs.players.filter((p: any) => p.owner !== ev.owner);
        gs.shootStates = gs.shootStates.slice(0, gs.players.length);
        setPlayerCount(gs.players.length);
        forceUpdate(n => n + 1);
      }
      if (ev.action === 'movePlayer') {
        const p = gs.players[ev.idx];
        if (p && p.owner !== userPhone) {
          gs.shootStates[ev.idx].runTarget = { x: ev.targetX, y: ev.targetY };
        }
      }
    };

    const channel = joinGameChannel(gameRoomId, handleGameEvent);
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [mounted, isVisible, gameRoomId, userPhone]);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    if (!isVisible) {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Get chat container dimensions with fallback
    const chatContainer = document.querySelector('[style*="flex: 1"][style*="overflowY"]') ||
                         document.querySelector('[style*="flex: 1, overflowY"]');
    const rect = chatContainer
      ? (chatContainer as HTMLElement).getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    canvas.style.position = "fixed";
    canvas.style.left = rect.left + "px";
    canvas.style.top = rect.top + "px";
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const W_ORIG = 860, H_ORIG = 624, GY_ORIG = 584;
    const scaleX = canvas.width / W_ORIG;
    const scaleY = canvas.height / H_ORIG;
    const W = canvas.width;
    const H = canvas.height;
    const GY = GY_ORIG * scaleY;
    const G = 0.22 * scaleY;

    const POLE_X = 12*scaleX, ARM_X = 52*scaleX;
    const BOARD_X = 57*scaleX, BOARD_W = 10*scaleX;
    const BOARD_TOP = 189*scaleY, BOARD_BOT = 292*scaleY;
    const BOARD_FACE = BOARD_X + BOARD_W;
    const HOOP_X = 110*scaleX, HOOP_Y = 307*scaleY;
    const HOOP_R = 27*scaleX;
    const P_START = W * 0.65, P_STEP = W * 0.07;

    const gs = gsRef.current;
    let ss_ideal_power = 50;

    // Game logic functions from original demo
    function hitTestPlayer(mx: number, my: number, px: number, py: number) {
      if (Math.hypot(mx - px, my - (py - 54*scaleY)) <= 12*scaleX) return true;
      if (mx >= px - 5*scaleX && mx <= px + 5*scaleX && my >= py - 44*scaleY && my <= py - 17*scaleY) return true;
      if (my >= py - 19*scaleY && my <= py + 1*scaleY) {
        const t = (my - (py - 18*scaleY)) / (18*scaleY);
        if (mx >= px - 12*scaleX*t && mx <= px + 12*scaleX*t) return true;
      }
      return false;
    }

    function addFlash(text: string, x: number, y: number, color: string) {
      gs.flashes.push({ text, x, y, color, alpha: 1, dy: 0 });
    }

    function simTraj(sx: number, sy: number, angle: number, speed: number, maxSteps: number) {
      const pts = [{ x: sx, y: sy }];
      let x = sx, y = sy, vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
      for (let i = 0; i < (maxSteps || 95); i++) {
        vy += G;
        x += vx;
        y += vy;
        pts.push({ x, y });
        if (y > GY || x < 0 || x > W) break;
      }
      return pts;
    }

    function findIdealSpeedForAngle(sx: number, sy: number, angle: number) {
      let bestSpd = 10, bestD = 1e9;
      for (let spd = 4; spd <= 16; spd += 0.12) {
        const pts = simTraj(sx, sy, angle, spd, 95);
        for (const pt of pts) {
          const d = Math.hypot(pt.x - HOOP_X, pt.y - HOOP_Y);
          if (d < bestD && pt.y < GY) { bestD = d; bestSpd = spd; }
        }
      }
      return bestSpd;
    }

    function stepBall(b: any) {
      if (b.state !== 'flying') return;
      const prevX = b.x, prevY = b.y;
      b.vy += G;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += 0.14;
      if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > W - 10) { b.x = W - 10; b.vx = -Math.abs(b.vx) * 0.5; }
      if (b.y < 10) { b.y = 10; b.vy = Math.abs(b.vy) * 0.4; }

      if (b.outcome === 'perfect_direct' || b.outcome === 'direct') {
        const toHX = HOOP_X - b.x, toHY = HOOP_Y - b.y;
        const dist = Math.hypot(toHX, toHY);
        if (dist > 0) {
          const strength = b.outcome === 'perfect_direct' ? 0.015 : 0.008;
          const onlyFalling = b.outcome === 'direct';
          if (!onlyFalling || (onlyFalling && b.vy > 0 && dist < 180)) {
            const pull = strength * (1 - Math.min(1, dist / 200));
            b.vx += toHX / dist * pull * dist;
            b.vy += toHY / dist * pull * dist;
          }
        }
      }

      if (!b.boardHandled) {
        const crossedFace = (prevX > BOARD_FACE && b.x <= BOARD_FACE) || (prevX >= BOARD_FACE && b.x < BOARD_FACE);
        const nearFace = b.x <= BOARD_FACE + 12 && b.x >= BOARD_X - 4 && b.vx < 0;
        if ((crossedFace || nearFace) && b.vx < 0) {
          const hitY = prevY + (b.y - prevY) * Math.max(0, Math.min(1, (prevX - BOARD_FACE) / Math.max(0.001, prevX - b.x)));
          if (hitY >= BOARD_TOP - 8 && hitY <= BOARD_BOT + 8) {
            b.boardHandled = true;
            b.x = BOARD_FACE + 2;
            const hitRatio = Math.max(0, Math.min(1, (hitY - BOARD_TOP) / (BOARD_BOT - BOARD_TOP)));
            const impactSpd = Math.hypot(b.vx, b.vy);
            const goIn = Math.random() < 0.50;
            if (goIn) {
              addFlash('💥 ВІДБІЙ!', BOARD_X + 50*scaleX, BOARD_TOP - 32*scaleY, '#ff9900');
              const toHX = HOOP_X - b.x, toHY = HOOP_Y - hitY;
              const toHLen = Math.hypot(toHX, toHY);
              const normHX = toHX / toHLen, normHY = toHY / toHLen;
              const reflectVx = Math.abs(b.vx) * 0.65, reflectVy = b.vy * 0.80;
              const blendToHoop = 0.80 - hitRatio * 0.40;
              const physBlend = 1 - blendToHoop;
              const finalSpd = impactSpd * 0.68;
              b.vx = (normHX * blendToHoop + (reflectVx / impactSpd) * physBlend) * finalSpd + (Math.random() - 0.5) * 0.3;
              b.vy = (normHY * blendToHoop + (reflectVy / impactSpd) * physBlend) * finalSpd + (Math.random() - 0.5) * 0.2;
              b.outcome = 'direct';
            } else {
              addFlash('🔶 ВІДБІЙ→МИМО', BOARD_X + 50*scaleX, BOARD_TOP - 32*scaleY, '#ff6600');
              b.vx = Math.abs(b.vx) * 0.60 * (0.9 + Math.random() * 0.2);
              b.vy = b.vy * 0.50 + Math.random() * 0.5;
              b.outcome = 'miss_fly';
            }
          }
        }
      }

      if (!b.rimHandled && (b.outcome === 'rim_in' || b.outcome === 'rim_out')) {
        const dLeft = Math.hypot(b.x - (HOOP_X - HOOP_R), b.y - HOOP_Y);
        const dRight = Math.hypot(b.x - (HOOP_X + HOOP_R), b.y - HOOP_Y);
        const dPrevLeft = Math.hypot(prevX - (HOOP_X - HOOP_R), prevY - HOOP_Y);
        const dPrevRight = Math.hypot(prevX - (HOOP_X + HOOP_R), prevY - HOOP_Y);
        const hitRim = (dLeft < 14 || dRight < 14 || dPrevLeft < 14 || dPrevRight < 14) && b.vy > -2;
        if (hitRim) {
          b.rimHandled = true;
          if (b.outcome === 'rim_in') {
            addFlash('🔥 РИМ-ШОТ!', HOOP_X, HOOP_Y - 52*scaleY, '#ff44ff');
            b.vx *= 0.12;
            b.vy = Math.abs(b.vy) * 0.18;
            b.outcome = 'direct';
          } else {
            addFlash('💢 В ОБІД!', HOOP_X, HOOP_Y - 52*scaleY, '#ff8800');
            b.vx *= -0.55;
            b.vy = -Math.abs(b.vy) * 0.65;
            b.outcome = 'miss_fly';
          }
        }
      }

      const d = Math.hypot(b.x - HOOP_X, b.y - HOOP_Y);
      if (d < 32 && (b.outcome === 'direct' || b.outcome === 'perfect_direct') && b.vy > 0) {
        b.state = 'scored';
        b.vx = 0;
        b.vy = 0;
        b.x = HOOP_X;
        b.y = HOOP_Y + 26*scaleY;
        return;
      }
      if (b.y >= GY) {
        b.y = GY;
        b.state = 'missed';
        b.vx = 0;
        b.vy = 0;
      }
    }

    function launchBall(idx: number) {
      const p = gs.players[idx];
      const ss = gs.shootStates[idx];
      const curSpd = 5 + (ss.power / 100) * 11;
      const angle = ss.aimAngle;

      const pts = simTraj(p.x - 15*scaleX, p.y - 55*scaleY, angle, curSpd, 95);
      const idealEnd = ss.idealTraj ? ss.idealTraj[ss.idealTraj.length - 1] : { x: HOOP_X, y: HOOP_Y };
      const curEnd = pts[pts.length - 1];
      const endDiff = Math.hypot(curEnd.x - idealEnd.x, curEnd.y - idealEnd.y);
      const spdDiff = Math.abs(curSpd - ss.idealSpeed);
      const matchPct = Math.max(0, Math.min(100, 100 - spdDiff * 13 - endDiff * 0.3));

      let nearBoard = false;
      for (const pt of pts) {
        if (pt.x >= BOARD_X - 30 && pt.x <= BOARD_FACE + 30 && pt.y >= BOARD_TOP - 15 && pt.y <= BOARD_BOT + 15) {
          nearBoard = true;
          break;
        }
      }

      let rimHit = false;
      for (const pt of pts) {
        const dRim = Math.hypot(pt.x - (HOOP_X + HOOP_R), pt.y - HOOP_Y);
        const dRim2 = Math.hypot(pt.x - (HOOP_X - HOOP_R), pt.y - HOOP_Y);
        if (dRim < 9 || dRim2 < 9) { rimHit = true; break; }
      }

      let outcome = 'miss';
      if (matchPct >= 92) {
        ss.ball = {
          x: p.x - 15*scaleX, y: p.y - 55*scaleY,
          vx: Math.cos(angle) * ss.idealSpeed, vy: Math.sin(angle) * ss.idealSpeed,
          rot: 0, state: 'flying', outcome: 'perfect_direct',
          boardHandled: false, rimHandled: false, owner: idx, perfectShot: true
        };
        addFlash('🎯 ІДЕАЛЬНО!', p.x, p.y - 115*scaleY, '#44ff88');
        ss.phase = 'flying';
        ss.lockedAngle = null;
        ss.idealTraj = null;
        p.status = 'shooting';
        if (idx === gs.disputeP1 && gs.disputeP2 === -1 && gs.players.length > 1) gs.disputeP2 = 1;
        return;
      }

      const rnd = Math.random();
      const directChance = Math.max(0, Math.min(0.82, (matchPct - 8) / 100));
      if (rnd < directChance) {
        outcome = 'direct';
      } else if (nearBoard) {
        const boardRnd = Math.random();
        outcome = boardRnd < 0.50 ? 'board_in' : 'board_out';
      } else if (rimHit && matchPct > 35) {
        const rimChance = 0.15 + (matchPct - 35) / 200;
        outcome = Math.random() < rimChance ? 'rim_in' : 'rim_out';
      } else {
        outcome = 'miss';
      }

      ss.ball = {
        x: p.x - 15*scaleX, y: p.y - 55*scaleY,
        vx: Math.cos(angle) * curSpd, vy: Math.sin(angle) * curSpd,
        rot: 0, state: 'flying', outcome,
        boardHandled: false, rimHandled: false, owner: idx, perfectShot: false
      };
      ss.phase = 'flying';
      ss.lockedAngle = null;
      ss.idealTraj = null;
      p.status = 'shooting';
      if (idx === gs.disputeP1 && gs.disputeP2 === -1 && gs.players.length > 1) gs.disputeP2 = 1;
    }

    function update() {
      if (gs.state !== 'playing') return;

      // Turn timer: auto-miss if player doesn't act within 20 seconds
      if (gs.selectedMoveIdx >= 0 && gs.selectedMoveIdx < gs.players.length) {
        const ss = gs.shootStates[gs.selectedMoveIdx];
        if (ss.phase === 'charging' || ss.phase === 'aiming') {
          if (!gs.turnStartTime) gs.turnStartTime = Date.now();
          const elapsed = (Date.now() - gs.turnStartTime) / 1000;
          if (elapsed > 20) {
            handleMissed(gs.selectedMoveIdx);
            gs.turnStartTime = 0;
            gs.selectedMoveIdx = -1;
          }
        }
      } else {
        gs.turnStartTime = 0;
      }

      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i], ss = gs.shootStates[i];
        if (p.status === 'eliminated') continue;
        if (ss.phase === 'aiming') {
          const sx = p.x - 15*scaleX;
          const behindBoard = sx < BOARD_FACE;
          ss.aimAngle += 0.022 * ss.aimDir;
          if (behindBoard) {
            if (ss.aimAngle >= -0.06) { ss.aimAngle = -0.06; ss.aimDir = -1; }
            if (ss.aimAngle <= -Math.PI * 0.5) { ss.aimAngle = -Math.PI * 0.5; ss.aimDir = 1; }
          } else {
            if (ss.aimAngle >= -Math.PI * 0.5) { ss.aimAngle = -Math.PI * 0.5; ss.aimDir = -1; }
            if (ss.aimAngle <= -Math.PI * 0.94) { ss.aimAngle = -Math.PI * 0.94; ss.aimDir = 1; }
          }
        }
        if (ss.phase === 'charging') {
          ss.power += 1.3 * ss.powerDir;
          if (ss.power >= 100) { ss.power = 100; ss.powerDir = -1; }
          if (ss.power <= 0) { ss.power = 0; ss.powerDir = 1; }
        }
        if (ss.phase === 'flying' && ss.ball) {
          stepBall(ss.ball);
          if (ss.ball.state === 'scored') handleScored(i);
          else if (ss.ball.state === 'missed') handleMissed(i);
        }
        if (ss.phase === 'auto_run' || ss.phase === 'manual_run') {
          p.rf++;
          const t = ss.runTarget;
          if (!t) { ss.phase = ss.phase === 'auto_run' ? 'pickup_wait' : null; p.status = 'idle'; continue; }
          const dx = t.x - p.x;
          if (Math.abs(dx) > 4) { p.x += Math.sign(dx) * 3.5; }
          else {
            if (ss.phase === 'auto_run') { ss.phase = 'pickup_wait'; ss.ball = null; }
            else ss.phase = null;
            p.status = 'idle';
            ss.runTarget = null;
          }
        }
      }
      if (gs.netShake && Date.now() > gs.netShakeEnd) gs.netShake = false;
      if (gs.netShake) gs.netShakeT += 0.4;
      gs.flashes = gs.flashes.filter((f: any) => {
        f.dy -= 0.5;
        f.alpha -= 0.011;
        return f.alpha > 0;
      });
    }

    function handleScored(idx: number) {
      const p = gs.players[idx];
      p.score++;
      gs.shootStates[idx].inDanger = false;
      addFlash('✅ ПОПАВ! +1', HOOP_X + 55*scaleX, HOOP_Y - 45*scaleY, '#44cc44');
      gs.eventLog.push({ text: `✅ ${p.name} забив!`, time: Date.now() });
      if (gs.eventLog.length > 4) gs.eventLog.shift();
      if (channelRef.current) sendGameEvent(channelRef.current, { action: "scored", idx, playerName: p.name, score: p.score });
      gs.netShake = true;
      gs.netShakeEnd = Date.now() + 700;
      const ss = gs.shootStates[idx];
      ss.phase = null;
      ss.ball = null;
      ss.lockedAngle = null;
      ss.idealTraj = null;

      if (idx === gs.disputeP2 && gs.disputeP1 >= 0 && gs.disputeP1 < gs.players.length) {
        const p1ph = gs.shootStates[gs.disputeP1]?.phase;
        const dangerPhases = ['auto_run', 'pickup_wait', 'flying', 'aiming', 'charging'];
        if (dangerPhases.includes(p1ph) || gs.shootStates[gs.disputeP1]?.inDanger) {
          addFlash('💀 ВИБИТО!', gs.players[gs.disputeP1]?.x || 300, GY - 130*scaleY, '#ff4444');
          gs.eventLog.push({ text: `💀 ${gs.players[gs.disputeP1]?.name} вибув!`, time: Date.now() });
          if (gs.eventLog.length > 4) gs.eventLog.shift();
          if (gs.players[gs.disputeP1]) gs.players[gs.disputeP1].status = 'eliminated';
          if (gs.players[idx]) gs.players[idx].kills = (gs.players[idx].kills || 0) + 1;
          setTimeout(() => {
            const idx2 = gs.disputeP1;
            if (idx2 < gs.players.length) { gs.players.splice(idx2, 1); gs.shootStates.splice(idx2, 1); }
            gs.disputeP1 = 0;
            gs.disputeP2 = -1;
            if (gs.players.length <= 1) { gs.state = 'finished'; return; }
          }, 900);
          return;
        }
      }

      if (idx === 0) {
        const w = gs.players.shift(), sw = gs.shootStates.shift();
        if (w && sw) {
          const tailX = P_START + gs.players.length * P_STEP;
          w.status = 'running';
          sw.phase = 'manual_run';
          sw.runTarget = { x: tailX, y: GY };
          sw.inDanger = false;
          gs.players.push(w);
          gs.shootStates.push(sw);
          gs.disputeP1 = 0;
          gs.disputeP2 = -1;
          gs.players.forEach((p2: any, i: number) => { p2.x = P_START + i * P_STEP; });
        }
      }
      if (gs.players.length <= 1) {
        gs.state = 'finished';
        if (gs.players.length === 1) {
          gs.players[0].hp = (gs.players[0].hp || 3) + 10;
          addFlash(`🏆 ПЕРЕМОЖЕЦЬ! +10❤`, gs.players[0].x, gs.players[0].y - 150*scaleY, '#ffdd00');
          gs.eventLog.push({ text: `🏆 ${gs.players[0].name} переміг!`, time: Date.now() });
          if (gs.eventLog.length > 4) gs.eventLog.shift();
        }
      }
    }

    function handleMissed(idx: number) {
      const ss = gs.shootStates[idx];
      const p = gs.players[idx];
      p.hp = (p.hp || 3) - 1;
      ss.inDanger = true;
      addFlash(`❌ МИМО! ❤${p.hp}`, p.x, p.y - 100*scaleY, '#e05545');
      gs.eventLog.push({ text: `❌ ${p.name} промахнувся!`, time: Date.now() });
      if (gs.eventLog.length > 4) gs.eventLog.shift();
      if (channelRef.current) sendGameEvent(channelRef.current, { action: "missed", idx, playerName: p.name, hp: p.hp });

      if (p.hp <= 0) {
        p.status = 'eliminated';
        addFlash('💀 ВИБИТО!', p.x, p.y - 130*scaleY, '#ff4444');
        gs.eventLog.push({ text: `💀 ${p.name} вибув!`, time: Date.now() });
        if (gs.eventLog.length > 4) gs.eventLog.shift();
        if (channelRef.current) sendGameEvent(channelRef.current, { action: "eliminated", playerName: p.name });
        if (gs.queue.length > 0) {
          const next = gs.queue.shift();
          const newIdx = gs.players.length;
          const P_START = W * 0.65, P_STEP = W * 0.07;
          gs.players.push({ name: next.name, x: P_START + newIdx * P_STEP, y: GY, score: 0, kills: 0, status: 'idle', rf: 0, color: PLAYER_COLORS[newIdx % 6], owner: next.owner, hp: 3 });
          gs.shootStates.push({ phase: null, aimAngle: -Math.PI * 0.72, aimDir: 1, power: 0, powerDir: 1, ball: null, lockedAngle: null, idealTraj: null, idealSpeed: 10, runTarget: null, inDanger: false });
          addFlash(`✅ ${next.name} грає!`, W / 2, 50*scaleY, '#44cc44');
          gs.eventLog.push({ text: `✅ ${next.name} заходить!`, time: Date.now() });
          if (gs.eventLog.length > 4) gs.eventLog.shift();
          if (channelRef.current) sendGameEvent(channelRef.current, { action: "playerJoined", playerName: next.name });
        }
        return;
      }

      const bx = ss.ball ? ss.ball.x : p.x;
      ss.runTarget = { x: Math.max(50*scaleX, Math.min(W - 30*scaleX, bx)), y: GY };
      ss.phase = 'auto_run';
      p.status = 'running';
    }

    function drawBball(cx: number, cy: number, r: number) {
      ctx.fillStyle = '#e06030';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a2008';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.stroke();
    }

    function drawStick(x: number, y: number, pose: string, rf: number, danger: boolean, playerColor: string) {
      ctx.save();
      let sc = playerColor || '#e05545';
      if (danger) {
        const t = (Date.now() / 300) % 1;
        const r = Math.floor(220 + 35 * Math.sin(t * Math.PI * 2));
        sc = `rgb(${r},40,40)`;
      }
      ctx.strokeStyle = sc;
      ctx.fillStyle = sc;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (pose === 'run') {
        const leg = Math.sin(rf * 0.65) * 17, lean = -5;
        ctx.beginPath();
        ctx.arc(x + lean, y - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 43*scaleY);
        ctx.lineTo(x + lean - 2*scaleX, y - 18*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 35*scaleY);
        ctx.lineTo(x + lean - 18*scaleX, y - 25*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 35*scaleY);
        ctx.lineTo(x + lean + 15*scaleX, y - 25*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean - 2*scaleX, y - 18*scaleY);
        ctx.lineTo(x + lean - 2*scaleX + leg, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean - 2*scaleX, y - 18*scaleY);
        ctx.lineTo(x + lean - 2*scaleX - leg, y);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.1;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(x + lean + 17*scaleX + k * 4*scaleX, y - 38*scaleY + k * 7*scaleY);
          ctx.lineTo(x + lean + 28*scaleX + k * 4*scaleX, y - 38*scaleY + k * 7*scaleY);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (pose === 'shoot') {
        ctx.beginPath();
        ctx.arc(x, y - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 43*scaleY);
        ctx.lineTo(x, y - 18*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 35*scaleY);
        ctx.lineTo(x - 25*scaleX, y - 43*scaleY);
        ctx.stroke();
        drawBball(x - 33*scaleX, y - 46*scaleY, 9*scaleX);
        ctx.strokeStyle = sc;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 35*scaleY);
        ctx.lineTo(x + 13*scaleX, y - 25*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x - 11*scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x + 11*scaleX, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 43*scaleY);
        ctx.lineTo(x, y - 18*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 37*scaleY);
        ctx.lineTo(x + 17*scaleX, y - 22*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 37*scaleY);
        ctx.lineTo(x - 12*scaleX, y - 26*scaleY);
        ctx.stroke();
        drawBball(x + 24*scaleX, y - 12*scaleY, 10*scaleX);
        ctx.strokeStyle = sc;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x - 10*scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x + 10*scaleX, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTrajPts(pts: any[], color: string, dash?: number[], lw?: number) {
      if (!pts || pts.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw || 1.5;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const pt of pts) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawAimArrow(px: number, py: number, angle: number) {
      const hx = px, hy = py - 52*scaleY;
      const ex = hx + Math.cos(angle) * 88*scaleX, ey = hy + Math.sin(angle) * 88*scaleY;
      ctx.strokeStyle = '#ffdd00';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(angle - 0.4) * 11*scaleX, ey - Math.sin(angle - 0.4) * 11*scaleY);
      ctx.lineTo(ex - Math.cos(angle + 0.4) * 11*scaleX, ey - Math.sin(angle + 0.4) * 11*scaleY);
      ctx.closePath();
      ctx.fill();
    }

    function drawPowerBar(p: any, pwr: number, matchPct: number) {
      const bw = 22*scaleX, bh = 115*scaleY, bx = p.x + 16*scaleX, by = p.y - bh - 32*scaleY, fh = (pwr / 100) * bh;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      const clr = matchPct > 92 ? '#00ffaa' : matchPct > 85 ? '#44cc44' : matchPct > 55 ? '#ffcc00' : '#e05545';
      ctx.fillStyle = clr;
      ctx.fillRect(bx, by + bh - fh, bw, fh);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx - 5*scaleX, by + bh - fh);
      ctx.lineTo(bx + bw + 5*scaleX, by + bh - fh);
      ctx.stroke();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(100,255,100,0.75)';
      ctx.lineWidth = 1.5;
      const idealFrac = (ss_ideal_power || 50) / 100;
      const idealY = by + bh - idealFrac * bh;
      ctx.beginPath();
      ctx.moveTo(bx - 3*scaleX, idealY);
      ctx.lineTo(bx + bw + 3*scaleX, idealY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = clr;
      ctx.font = `bold ${11*scaleX}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(matchPct) + '%', bx + bw / 2, by - 7*scaleY);
      ctx.fillStyle = 'rgba(100,255,100,0.8)';
      ctx.font = `${9*scaleX}px sans-serif`;
      ctx.fillText('▲ціль', bx + bw / 2, idealY - 3*scaleY);
    }

    function drawBasket() {
      const sh = gs.netShake ? Math.sin(gs.netShakeT) * 2.5 : 0;
      ctx.save();
      ctx.strokeStyle = '#e05545';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5*scaleX;
      ctx.beginPath();
      ctx.moveTo(POLE_X, GY);
      ctx.lineTo(POLE_X, 209*scaleY);
      ctx.stroke();
      ctx.lineWidth = 3*scaleX;
      ctx.beginPath();
      ctx.moveTo(POLE_X, 209*scaleY);
      ctx.lineTo(ARM_X, 209*scaleY);
      ctx.stroke();
      ctx.lineWidth = 3*scaleX;
      ctx.strokeRect(BOARD_X, BOARD_TOP, BOARD_W, BOARD_BOT - BOARD_TOP);
      ctx.lineWidth = 1.5*scaleX;
      ctx.strokeRect(BOARD_X + 1*scaleX, 227*scaleY, BOARD_W - 2*scaleX, 30*scaleY);
      ctx.lineWidth = 1.8*scaleX;
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, 262*scaleY);
      ctx.lineTo(HOOP_X - HOOP_R + 3*scaleX, HOOP_Y + sh * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, 276*scaleY);
      ctx.lineTo(HOOP_X - HOOP_R + 3*scaleX, HOOP_Y + sh * 0.3);
      ctx.stroke();
      ctx.lineWidth = 3*scaleX;
      ctx.beginPath();
      ctx.ellipse(HOOP_X + sh * 0.3, HOOP_Y + sh * 0.15, HOOP_R, 8*scaleY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1*scaleX;
      ctx.globalAlpha = 0.65;
      for (let i = 0; i < 7; i++) {
        const tx = HOOP_X - HOOP_R + 3*scaleX + i * (HOOP_R * 2 - 6*scaleX) / 6;
        const bx2 = HOOP_X - 11*scaleX + i * 22*scaleX / 6;
        ctx.beginPath();
        ctx.moveTo(tx + sh * 0.08 * (i - 3), HOOP_Y + 8*scaleY);
        ctx.lineTo(bx2 + sh * 0.12 * (i - 3), HOOP_Y + 46*scaleY + sh);
        ctx.stroke();
      }
      for (let j = 0; j < 3; j++) {
        const t = (j + 1) / 4;
        const yw = HOOP_Y + 8*scaleY + t * 38*scaleY + sh * 0.08;
        const hw = HOOP_R * (1 - t * 0.4) - 2*scaleX;
        ctx.beginPath();
        ctx.moveTo(HOOP_X - hw, yw);
        ctx.lineTo(HOOP_X + hw, yw);
        ctx.stroke();
      }
      if (gs.netShake) {
        const a = Math.max(0, (gs.netShakeEnd - Date.now()) / 700);
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = '#44cc44';
        ctx.beginPath();
        ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R + 14*scaleX, 11*scaleY, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, GY);
      ctx.lineTo(W, GY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawBasket();

      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i], ss = gs.shootStates[i];
        if (p.status === 'eliminated') continue;
        const sx = p.x - 15*scaleX, sy = p.y - 55*scaleY;
        const danger = ss.inDanger || false;

        if (danger && (ss.phase !== 'flying')) {
          const al = 0.3 + 0.4 * Math.sin(Date.now() / 200);
          ctx.strokeStyle = `rgba(255,50,50,${al})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 37*scaleY, 48*scaleX, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (i === gs.selectedMoveIdx) {
          const al = 0.5 + 0.4 * Math.sin(Date.now() / 250);
          ctx.strokeStyle = `rgba(255,220,50,${al})`;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(p.x, p.y - 37*scaleY, 46*scaleX, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (ss.phase === 'aiming') {
          const pts = simTraj(sx, sy, ss.aimAngle, 10, 95);
          drawTrajPts(pts, 'rgba(220,80,60,0.45)', [5, 5]);
          drawAimArrow(p.x, p.y, ss.aimAngle);
        }

        if (ss.phase === 'charging') {
          if (ss.idealTraj) drawTrajPts(ss.idealTraj, 'rgba(255,230,0,0.75)', [6, 5], 1.9);
          const curSpd = 5 + (ss.power / 100) * 11;
          const pts = simTraj(sx, sy, ss.aimAngle, curSpd, 95);
          const idealEnd = ss.idealTraj ? ss.idealTraj[ss.idealTraj.length - 1] : { x: HOOP_X, y: HOOP_Y };
          const curEnd = pts[pts.length - 1];
          const endDiff = Math.hypot(curEnd.x - idealEnd.x, curEnd.y - idealEnd.y);
          const spdDiff = Math.abs(curSpd - ss.idealSpeed);
          const matchPct = Math.max(0, Math.min(100, 100 - spdDiff * 13 - endDiff * 0.3));
          let tColor;
          if (matchPct > 92) tColor = 'rgba(0,255,170,0.9)';
          else if (matchPct > 85) tColor = 'rgba(60,220,80,0.8)';
          else if (matchPct > 55) tColor = 'rgba(255,210,0,0.7)';
          else tColor = 'rgba(220,80,60,0.6)';
          drawTrajPts(pts, tColor, [4, 4], 2.2);
          ss_ideal_power = (ss.idealSpeed - 5) / 11 * 100;
          drawPowerBar(p, ss.power, matchPct);
          if (matchPct > 92) {
            const pulse = 0.4 + 0.5 * Math.sin(Date.now() / 120);
            ctx.strokeStyle = `rgba(0,255,170,${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R + 8*scaleX, 11*scaleY, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(0,255,170,${pulse * 0.35})`;
            ctx.beginPath();
            ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R + 8*scaleX, 11*scaleY, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (ss.ball && ss.phase === 'flying') {
          ctx.save();
          ctx.translate(ss.ball.x, ss.ball.y);
          ctx.rotate(ss.ball.rot);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        }
        if (ss.ball && ss.phase === 'auto_run') {
          ctx.save();
          ctx.translate(ss.ball.x, ss.ball.y);
          ctx.rotate(ss.ball.rot || 0);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        }

        if (ss.phase === 'pickup_wait') {
          const al = 0.4 + 0.5 * Math.sin(Date.now() / 180);
          ctx.strokeStyle = `rgba(255,220,0,${al})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 37*scaleY, 42*scaleX, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(255,220,0,${al})`;
          ctx.font = `bold ${10*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('← КЛІКНИ → кидок', p.x, p.y - 90*scaleY);
        }

        let pose = 'idle';
        if (p.status === 'running') pose = 'run';
        else if (p.status === 'shooting') pose = 'shoot';
        drawStick(p.x, p.y, pose, p.rf, danger, p.color);

        const kills = p.kills || 0;
        const isMine = i === 0;
        if (kills > 0) {
          ctx.fillStyle = '#ff6644';
          ctx.font = `bold ${11*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('💀×' + kills, p.x, p.y - 84*scaleY);
        }
        const namePrefix = danger ? '🎯 ' : (isMine ? '👤 ' : '🔒 ');
        ctx.fillStyle = danger ? 'rgba(255,110,110,0.95)' : isMine ? p.color : 'rgba(180,180,180,0.6)';
        ctx.font = (danger ? 'bold ' : isMine ? 'bold ' : '') + `${11*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(namePrefix + (danger ? p.name : p.name), p.x, p.y - 73*scaleY);
        ctx.fillStyle = danger ? '#ff5555' : '#ffdd00';
        ctx.font = `bold ${11*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏀 ' + p.score, p.x, p.y - 61*scaleY);

        if (i === gs.disputeP2 && ss.phase === null && gs.state === 'playing' && gs.players.length > 1) {
          const al = 0.7 + 0.3 * Math.sin(Date.now() / 200);
          ctx.fillStyle = `rgba(255,200,0,${al})`;
          ctx.font = `bold ${10*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('▶ ВИБИЙ!', p.x, p.y - 90*scaleY);
        }
      }

      gs.flashes.forEach((f: any) => {
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.font = `bold ${17*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y + f.dy);
      });
      ctx.globalAlpha = 1;

      if (gs.state === 'playing' || gs.state === 'waiting') {
        const listX = 4, listY = 8, rowH = 19, padX = 6, padY = 4;
        const roster = gs.players;
        if (roster.length > 0) {
          const panelW = 110*scaleX, panelH = rowH * roster.length + padY * 2 + 14;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(listX, listY, panelW, panelH);
          ctx.strokeStyle = 'rgba(255,255,255,0.07)';
          ctx.lineWidth = 1;
          ctx.strokeRect(listX, listY, panelW, panelH);

          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = `bold ${8*scaleX}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText('УЧАСНИКИ', listX + padX, listY + padY + 7);

          roster.forEach((p2: any, i2: number) => {
            const ry = listY + padY + 15 + i2 * rowH;
            const ss2 = gs.state === 'playing' ? gs.shootStates[i2] : null;
            const danger2 = ss2?.inDanger || false;
            const eliminated2 = p2.status === 'eliminated';
            const isMine2 = i2 === 0;
            const isMyPlayer = p2.owner === userPhone;
            const blink = danger2 ? (Math.sin(Date.now() / 180) > 0) : true;

            if (eliminated2) {
              ctx.fillStyle = 'rgba(120,120,120,0.2)';
              ctx.fillRect(listX + 3, ry - 11, panelW - 6, rowH - 2);
              ctx.fillStyle = 'rgba(150,150,150,0.4)';
              ctx.font = `${10*scaleX}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.fillText('✖ ' + p2.name, listX + padX + 10, ry + 1);
              ctx.strokeStyle = 'rgba(180,60,60,0.45)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              const tw = ctx.measureText('✖ ' + p2.name).width;
              ctx.moveTo(listX + padX + 10, ry - 4);
              ctx.lineTo(listX + padX + 10 + tw, ry - 4);
              ctx.stroke();
            } else if (danger2 && blink) {
              ctx.fillStyle = 'rgba(200,30,30,0.4)';
              ctx.fillRect(listX + 3, ry - 11, panelW - 6, rowH - 2);
              ctx.fillStyle = 'rgba(255,80,80,0.95)';
              ctx.font = `bold ${10*scaleX}px sans-serif`;
              ctx.textAlign = 'left';
              const ownerMark = isMyPlayer ? '★ ' : '';
              ctx.fillText('🎯 ' + ownerMark + p2.name, listX + padX, ry + 1);
              ctx.fillStyle = 'rgba(255,150,150,0.8)';
              ctx.font = `${8*scaleX}px sans-serif`;
              ctx.textAlign = 'right';
              ctx.fillText('🏀' + p2.score, listX + panelW - padX, ry + 1);
            } else {
              if (isMine2) {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(listX + 3, ry - 11, panelW - 6, rowH - 2);
              }
              ctx.fillStyle = p2.color || '#fff';
              ctx.beginPath();
              ctx.arc(listX + padX + 3, ry - 2, 3*scaleX, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = isMine2 ? (p2.color || '#fff') : 'rgba(220,220,220,0.65)';
              ctx.font = (isMine2 ? 'bold ' : '') + `${10*scaleX}px sans-serif`;
              ctx.textAlign = 'left';
              const ownerMark = isMyPlayer ? '★ ' : '';
              ctx.fillText(ownerMark + p2.name, listX + padX + 10, ry + 1);
              ctx.fillStyle = 'rgba(255,100,100,0.8)';
              ctx.font = `${8*scaleX}px sans-serif`;
              ctx.textAlign = 'right';
              ctx.fillText('❤' + p2.hp, listX + panelW - padX, ry + 1);
            }
          });

          if (gs.queue.length > 0) {
            const queueY = listY + padY + 15 + roster.length * rowH + 8;
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = `bold ${8*scaleX}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText('ЧЕРГА', listX + padX, queueY);
            gs.queue.forEach((q: any, qi: number) => {
              const qy = queueY + 12 + qi * rowH;
              ctx.fillStyle = 'rgba(180,180,180,0.6)';
              ctx.font = `${9*scaleX}px sans-serif`;
              ctx.fillText(`${qi + 1}. ${q.name}`, listX + padX + 5, qy);
            });
          }
        }
      }

      ctx.textAlign = 'left';
      if (gs.state === 'playing') {
        const activeIdx = gs.selectedMoveIdx >= 0 ? gs.selectedMoveIdx : -1;
        const ph = activeIdx >= 0 ? gs.shootStates[activeIdx]?.phase : null;
        const hints: any = {
          null: 'ПКМ на гравця → активувати  |  ЛКМ на підлогу → бігти  |  ПКМ на пустому → скинути вибір',
          aiming: '[1] ЛКМ — зафіксуй кут  |  ПКМ на гравця → скасувати',
          charging: '[2] ЛКМ на гравця = кидок  |  ПКМ на гравця = ↺ переприціл',
          flying: 'М\'яч летить...',
          auto_run: 'Біжить за м\'ячем...',
          pickup_wait: 'Підібрав! ЛКМ щоб кидати знову',
          manual_run: 'Біжить...',
        };
        let hintText = hints[ph] ?? 'ПКМ на гравця → активувати  |  ЛКМ на підлогу → бігти  |  ЛКМ на гравця → кидок';
        if (activeIdx >= 0 && gs.players[activeIdx]) {
          hintText = '[' + gs.players[activeIdx].name + '] ' + (hints[ph] ?? '');
        }
        // Hint text removed - handled via Supabase Realtime
        const alive = gs.players.filter((p: any) => p.status !== 'eliminated').length;
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.font = `${11*scaleX}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('Гравців: ' + alive + '/6', W - 8*scaleX, 17*scaleY);
      }

      if (gs.state === 'waiting') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = `${15*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Додай 2–6 гравців і натисни ▶ Старт', W / 2, 235*scaleY);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font = `${12*scaleX}px sans-serif`;
        ctx.fillText('Натисни 📖 Інструкція для правил гри', W / 2, 260*scaleY);
      }

      if (gs.state === 'finished') {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${30*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏆 ГРА ЗАВЕРШЕНА', W / 2, 165*scaleY);
        if (gs.players.length === 1) {
          ctx.fillStyle = '#44cc44';
          ctx.font = `bold ${22*scaleX}px sans-serif`;
          ctx.fillText('Переможець: ' + gs.players[0].name + ' 🥇', W / 2, 205*scaleY);
        }
        [...gs.players].sort((a: any, b: any) => b.score - a.score).forEach((p: any, k: number) => {
          ctx.fillStyle = k === 0 ? '#ffdd00' : 'rgba(255,255,255,0.8)';
          ctx.font = (k === 0 ? `bold ${17*scaleX}px` : `${14*scaleX}px`) + ' sans-serif';
          ctx.fillText((k === 0 ? '🥇' : (k === 1 ? '🥈' : '🥉')) + ' ' + p.name + ' — ' + p.score + ' очок', W / 2, 245*scaleY + k * 24*scaleY);
        });
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `${13*scaleX}px sans-serif`;
        ctx.fillText('↺ Рестарт', W / 2, 410*scaleY);
      }
    }

    canvas.addEventListener("click", (e: MouseEvent) => {
      if (gs.state !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const sc = W / rect.width;
      const mx = (e.clientX - rect.left) * sc;
      const my = (e.clientY - rect.top) * sc;

      // Boost throw: if ball is flying, +20% speed
      for (let i = 0; i < gs.shootStates.length; i++) {
        const ss = gs.shootStates[i];
        if (ss.phase === 'flying' && ss.ball) {
          ss.ball.vx *= 1.2;
          ss.ball.vy *= 1.2;
          addFlash('💨 +20%!', ss.ball.x, ss.ball.y - 30*scaleY, '#ffdd00');
          return;
        }
      }

      let hitIdx = -1;
      for (let i = 0; i < gs.players.length; i++) {
        if (gs.players[i].status === "eliminated") continue;
        if (hitTestPlayer(mx, my, gs.players[i].x, gs.players[i].y)) { hitIdx = i; break; }
      }
      if (hitIdx >= 0) {
        const p = gs.players[hitIdx], ss = gs.shootStates[hitIdx];
        if (p.owner !== userPhone) {
          addFlash("🚫 чужий", p.x, p.y - 95*scaleY, "rgba(255,80,80,0.9)");
          return;
        }
        if (ss.phase === null || ss.phase === "pickup_wait") {
          ss.phase = "aiming";
          const behindBoard = (p.x - 15*scaleX) < BOARD_FACE;
          ss.aimAngle = behindBoard ? -0.1 : -Math.PI*0.72;
          ss.aimDir = behindBoard ? -1 : 1;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          p.status = "shooting";
          if (hitIdx === 0) gs.disputeP1 = 0;
        } else if (ss.phase === "aiming") {
          ss.lockedAngle = ss.aimAngle;
          const idealSpd = findIdealSpeedForAngle(p.x - 15*scaleX, p.y - 55*scaleY, ss.lockedAngle);
          ss.idealSpeed = idealSpd;
          ss_ideal_power = (idealSpd - 5) / 11 * 100;
          ss.idealTraj = simTraj(p.x - 15*scaleX, p.y - 55*scaleY, ss.lockedAngle, idealSpd, 95);
          ss.phase = "charging";
          ss.power = 0;
          ss.powerDir = 1;
        } else if (ss.phase === "charging") {
          launchBall(hitIdx);
        }
      } else {
        if (gs.selectedMoveIdx >= 0 && gs.selectedMoveIdx < gs.players.length) {
          const p = gs.players[gs.selectedMoveIdx], ss = gs.shootStates[gs.selectedMoveIdx];
          if (p.status !== "eliminated" && (ss.phase === null || ss.phase === "pickup_wait" || ss.phase === "manual_run")) {
            ss.runTarget = { x: Math.max(50*scaleX, Math.min(W - 30*scaleX, mx)), y: GY };
            ss.phase = "manual_run";
            p.status = "running";
            if (channelRef.current) sendGameEvent(channelRef.current, { action: "movePlayer", idx: gs.selectedMoveIdx, targetX: ss.runTarget.x, targetY: ss.runTarget.y, owner: userPhone });
          }
        }
      }
    });

    canvas.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      if (gs.state !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const sc = W / rect.width;
      const mx = (e.clientX - rect.left) * sc;
      const my = (e.clientY - rect.top) * sc;
      let hitIdx = -1;
      for (let i = 0; i < gs.players.length; i++) {
        if (gs.players[i].status === "eliminated") continue;
        if (hitTestPlayer(mx, my, gs.players[i].x, gs.players[i].y)) { hitIdx = i; break; }
      }
      if (hitIdx >= 0) {
        const p = gs.players[hitIdx], ss = gs.shootStates[hitIdx];
        if (p.owner !== userPhone) {
          addFlash("🚫 чужий", p.x, p.y - 95*scaleY, "rgba(255,80,80,0.9)");
          return;
        }
        if (ss.phase === "charging") {
          ss.phase = "aiming";
          ss.aimAngle = ss.lockedAngle || ss.aimAngle;
          ss.aimDir = 1;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          addFlash("↺ переприціл", p.x, p.y - 105*scaleY, "rgba(255,210,80,0.95)");
        } else if (ss.phase === "aiming") {
          ss.phase = null;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          ss.ball = null;
          p.status = "idle";
          gs.selectedMoveIdx = -1;
          addFlash("✖ скасовано", p.x, p.y - 95*scaleY, "rgba(200,200,200,0.9)");
        } else if (p.status !== "eliminated") {
          gs.selectedMoveIdx = hitIdx;
          addFlash("👆 вибрано", p.x, p.y - 95*scaleY, "rgba(255,220,80,0.95)");
        }
      } else {
        if (gs.selectedMoveIdx >= 0) addFlash("✖ вибір скасовано", mx, my - 20*scaleY, "rgba(200,200,200,0.85)");
        gs.selectedMoveIdx = -1;
      }
    });

    function renderLoop() {
      update();
      draw();
      rafRef.current = requestAnimationFrame(renderLoop);
    }
    renderLoop();

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, isVisible]);

  const gs = gsRef.current;

  const handleAddPlayer = (e?: any) => {
    const autoName = e?.currentTarget?.dataset?.auto === 'true';
    if (gs.players.length + gs.queue.length >= MAX_PLAYERS * 2) return;
    const myPlayers = gs.players.filter((p: any) => p.owner === userPhone);
    if (myPlayers.length >= 3) return;
    const suffix = myPlayers.length === 0 ? "" : ` ${myPlayers.length + 1}`;
    const name = autoName ? (userName + suffix) : (pname.trim() || (userName + suffix));

    if (gs.players.length >= MAX_PLAYERS) {
      if (gs.queue.find((q: any) => q.owner === userPhone)) return;
      gs.queue.push({ name, owner: userPhone });
      if (channelRef.current) sendGameEvent(channelRef.current, { action: "addPlayer", player: { name, owner: userPhone, hp: 3 } });
      setPname("");
      forceUpdate(n => n + 1);
      return;
    }

    const idx = gs.players.length;
    const W_ORIG = 860, H_ORIG = 624, GY_ORIG = 584;
    const scaleX = window.innerWidth / W_ORIG;
    const scaleY = window.innerHeight / H_ORIG;
    const P_START = window.innerWidth * 0.65;
    const P_STEP = window.innerWidth * 0.07;
    const GY = GY_ORIG * scaleY;
    gs.players.push({ name, x: P_START + idx * P_STEP, y: GY, score: 0, kills: 0, status: "idle", rf: 0, color: PLAYER_COLORS[idx % 6], owner: userPhone, hp: 3 });
    gs.shootStates.push({ phase: null, aimAngle: -Math.PI * 0.72, aimDir: 1, power: 0, powerDir: 1, ball: null, lockedAngle: null, idealTraj: null, idealSpeed: 10, runTarget: null, inDanger: false });
    if (channelRef.current) sendGameEvent(channelRef.current, { action: "addPlayer", player: { name, owner: userPhone, hp: 3 } });
    setPlayerCount(gs.players.length);
    setPname("");
    forceUpdate(n => n + 1);
  };

  const handleLeaveGame = () => {
    const myPlayers = gs.players.filter((p: any) => p.owner === userPhone);
    myPlayers.forEach((p: any) => {
      p.status = "eliminated";
    });
    const myQueueIdx = gs.queue.findIndex((q: any) => q.owner === userPhone);
    if (myQueueIdx >= 0) {
      gs.queue.splice(myQueueIdx, 1);
    }
    if (channelRef.current) sendGameEvent(channelRef.current, { action: "leave", owner: userPhone });
    forceUpdate(n => n + 1);
  };

  const handleStart = () => {
    if (playerCount < 2) return;
    gs.state = "playing";
    gs.flashes = [];
    gs.players.forEach((p:any) => { p.score=0; p.kills=0; p.status="idle"; p.rf=0; });
    gs.shootStates = gs.players.map(() => ({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false }));
    gs.disputeP1=0; gs.disputeP2=-1; gs.selectedMoveIdx=-1;
    if (channelRef.current) sendGameEvent(channelRef.current, { action: "start" });
    forceUpdate(n => n+1);
  };

  const handleRestart = () => {
    gs.state="waiting"; gs.players=[]; gs.shootStates=[]; gs.flashes=[];
    gs.disputeP1=0; gs.disputeP2=-1; gs.selectedMoveIdx=-1;
    setPname(userName); forceUpdate(n => n+1);
  };

  if (!mounted || !isVisible) return null;

  const btnStyle = (bg: string, disabled = false): React.CSSProperties => ({
    padding:"6px 13px", borderRadius:6, border:"none", color:"#fff",
    fontSize:13, cursor: disabled?"not-allowed":"pointer", fontWeight:600,
    background: bg, opacity: disabled ? 0.4 : 1,
  });

  return createPortal(
    <>
      <canvas
        ref={canvasRef}
        style={{ position:"absolute", top:0, left:0,
          zIndex:9999, pointerEvents:"auto", background:"transparent", cursor:"crosshair" }}
      />
      <div
        style={{ position:"fixed", top: 0, left: 0, width: "100%", height: "100%",
          zIndex:10000, pointerEvents:"none", cursor:"crosshair" }}
        onMouseDown={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
          const sc = canvas.width / rect.width;
          const mx = (e.clientX - rect.left) * sc;
          const my = (e.clientY - rect.top) * sc;
          const evt = new MouseEvent(e.button === 2 ? "contextmenu" : "click", {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY,
          });
          canvas.dispatchEvent(evt);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const evt = new MouseEvent("contextmenu", {
            bubbles: true, cancelable: true,
            clientX: e.clientX, clientY: e.clientY
          });
          canvasRef.current?.dispatchEvent(evt);
        }}
      />
      <div style={{ position:"fixed", bottom:8, left:"50%", transform:"translateX(-50%)",
        zIndex:10001, display:"flex", gap:7, alignItems:"center",
        background:"rgba(0,0,0,0.6)", padding:"6px 12px", borderRadius:8,
        boxShadow:"0 2px 12px rgba(0,0,0,0.5)" }}>
        <button onClick={(e) => { e.preventDefault(); handleAddPlayer(e); }} style={btnStyle("#4fc3f7", gs.players.length>=6)} data-auto="true">🏀 Гравець</button>
        <button onClick={handleLeaveGame} style={btnStyle("#ff6644")}>🚪 Вийти</button>
        <button ref={btnStartRef} onClick={handleStart} style={btnStyle("#27ae60", playerCount<2)} disabled={playerCount<2}>▶ Старт</button>
        <button onClick={handleRestart} style={btnStyle("#444")}>↺ Рестарт</button>
        <button onClick={() => setShowModal(true)} style={btnStyle("#1a4a8a")}>📖 Інструкція</button>
      </div>
      {showModal && (
        <div onClick={e => e.target===e.currentTarget && setShowModal(false)}
          style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
            background:"rgba(0,0,0,0.9)", zIndex:10002,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#161c2e", border:"1px solid #334", borderRadius:14,
            padding:"22px 26px", maxWidth:560, width:"96%", color:"#fff",
            maxHeight:"92vh", overflowY:"auto" }}>
            <h2 style={{color:"#ffdd00",fontSize:17,marginBottom:14,textAlign:"center"}}>🏀 РУЧЕЁК — Правила та Інструкція</h2>
            <p style={{marginBottom:12}}><b style={{color:"#e05545"}}>🎯 Мета:</b> Вибий усіх суперників! Останній гравець — переможець.</p>
            <p style={{marginBottom:12}}><b style={{color:"#e05545"}}>👥 Учасники:</b> Від 2 до 6. Введи ім'я → «+ Додати» → «▶ Старт».</p>
            <p style={{marginBottom:8}}><b style={{color:"#e05545"}}>🖱️ Кидок — 3 кліки:</b></p>
            <ul style={{paddingLeft:16,fontSize:13,lineHeight:1.8,marginBottom:12}}>
              <li><b>Клік 1 по гравцю</b> — стрілка крутиться, червона траєкторія</li>
              <li><b>Клік 2 по гравцю</b> — кут зафіксовано, жовта ідеальна траєкторія + шкала сили</li>
              <li><b>Клік 3 НЕ на гравця</b> — кидок! Зелена лінія = жовта (≥92%) → 🎯 100% влучення</li>
            </ul>
            <p style={{marginBottom:12}}><b style={{color:"#e05545"}}>❤️ HP система:</b> Кожен гравець має 3 ❤️. Промах = -1 ❤️. Якщо ❤️ = 0 → вибуває. Переможець отримує +10 ❤️ бонусу.</p>
            <p style={{marginBottom:12}}><b style={{color:"#e05545"}}>⏳ Черга:</b> Якщо 6 гравців грають — ти в Черзі. Коли гравець вибуває — ти автоматично заходиш на його місце.</p>
            <ul style={{paddingLeft:16,fontSize:13,lineHeight:1.8,marginBottom:12}}>
              <li><b>ЛКМ на гравця</b> — кидок</li>
              <li><b>ПКМ на гравця</b> — вибрати для переміщення</li>
              <li><b>ЛКМ на підлогу</b> — вибраний гравець побіжить туди</li>
              <li><b>ПКМ на пустому</b> — скинути вибір</li>
            </ul>
            <div style={{textAlign:"center",marginTop:16}}>
              <button onClick={() => setShowModal(false)}
                style={{...btnStyle("#e05545"), padding:"8px 28px", fontSize:14}}>
                Зрозуміло! Грати ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
