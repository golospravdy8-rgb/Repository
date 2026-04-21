"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface RucheekGameCanvasProps {
  isVisible: boolean;
}

const PLAYER_COLORS = ["#4fc3f7", "#81c784", "#ffb74d", "#f06292", "#ce93d8", "#80cbc4"];

export default function RucheekGameCanvas({ isVisible }: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const gameStateRef = useRef({
    state: "waiting" as "waiting" | "playing" | "finished",
    players: [] as any[],
    shootStates: [] as any[],
    flashes: [] as any[],
    selectedMoveIdx: -1,
    disputeP1: 0,
    disputeP2: -1,
    netShake: false,
    netShakeEnd: 0,
    netShakeT: 0,
    gameTime: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Масштабирование
    const W = window.innerWidth;
    const H = window.innerHeight;
    const scaleX = W / 860;
    const scaleY = H / 624;

    canvas.width = W;
    canvas.height = H;

    // Константы (масштабированные)
    const POLE_X = 80 * scaleX;
    const ARM_X = 120 * scaleX;
    const BOARD_X = 125 * scaleX;
    const BOARD_W = 10 * scaleX;
    const BOARD_TOP = 189 * scaleY;
    const BOARD_BOT = 292 * scaleY;
    const BOARD_FACE = BOARD_X + BOARD_W;
    const HOOP_X = 188 * scaleX;
    const HOOP_Y = 307 * scaleY;
    const HOOP_R = 27 * scaleX;
    const GY = 584 * scaleY;
    const P_START = 680 * scaleX;
    const P_STEP = 58 * scaleX;
    const G = 0.22;

    const gs = gameStateRef.current;

    // ── СИМУЛЯЦИЯ ТРАЄКТОРІЇ ──
    const simTraj = (sx: number, sy: number, angle: number, speed: number, maxSteps: number = 95) => {
      const pts: any[] = [{ x: sx, y: sy }];
      let x = sx,
        y = sy,
        vx = Math.cos(angle) * speed,
        vy = Math.sin(angle) * speed;
      for (let i = 0; i < maxSteps; i++) {
        vy += G;
        x += vx;
        y += vy;
        pts.push({ x, y });
        if (y > GY || x < 0 || x > W) break;
      }
      return pts;
    };

    // ── ТОЧНИЙ ХІТБОКС ──
    const hitTestPlayer = (mx: number, my: number, px: number, py: number) => {
      if (Math.hypot(mx - px, my - (py - 54 * scaleY)) <= 12 * scaleY) return true;
      if (mx >= px - 5 * scaleX && mx <= px + 5 * scaleX && my >= py - 44 * scaleY && my <= py - 17 * scaleY)
        return true;
      if (my >= py - 19 * scaleY && my <= py + scaleY) {
        const t = (my - (py - 18 * scaleY)) / (18 * scaleY);
        if (mx >= px - 12 * scaleX * t && mx <= px + 12 * scaleX * t) return true;
      }
      return false;
    };

    // ── ФІЗИКА М'ЯЧА ──
    const stepBall = (b: any) => {
      if (b.state !== "flying") return;
      const prevX = b.x,
        prevY = b.y;
      b.vy += G;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += 0.14;
      if (b.x < 10) {
        b.x = 10;
        b.vx = Math.abs(b.vx) * 0.5;
      }
      if (b.x > W - 10) {
        b.x = W - 10;
        b.vx = -Math.abs(b.vx) * 0.5;
      }
      if (b.y < 10) {
        b.y = 10;
        b.vy = Math.abs(b.vy) * 0.4;
      }

      // Магніт до кільця
      if (b.outcome === "perfect_direct" || b.outcome === "direct") {
        const toHX = HOOP_X - b.x,
          toHY = HOOP_Y - b.y;
        const dist = Math.hypot(toHX, toHY);
        if (dist > 0) {
          const strength = b.outcome === "perfect_direct" ? 0.015 : 0.008;
          const onlyFalling = b.outcome === "direct";
          if (!onlyFalling || (onlyFalling && b.vy > 0 && dist < 180)) {
            const pull = strength * (1 - Math.min(1, dist / 200));
            b.vx += (toHX / dist) * pull * dist;
            b.vy += (toHY / dist) * pull * dist;
          }
        }
      }

      // Щит
      if (!b.boardHandled) {
        const crossedFace = (prevX > BOARD_FACE && b.x <= BOARD_FACE) || (prevX >= BOARD_FACE && b.x < BOARD_FACE);
        const nearFace = b.x <= BOARD_FACE + 12 && b.x >= BOARD_X - 4 && b.vx < 0;
        if ((crossedFace || nearFace) && b.vx < 0) {
          const hitY = prevY + (b.y - prevY) * Math.max(0, Math.min(1, (prevX - BOARD_FACE) / Math.max(0.001, prevX - b.x)));
          if (hitY >= BOARD_TOP - 8 && hitY <= BOARD_BOT + 8) {
            b.boardHandled = true;
            b.x = BOARD_FACE + 2;
            const goIn = Math.random() < 0.5;
            if (goIn) {
              const toHX = HOOP_X - b.x,
                toHY = HOOP_Y - hitY;
              const toHLen = Math.hypot(toHX, toHY);
              const normHX = toHX / toHLen,
                normHY = toHY / toHLen;
              const reflectVx = Math.abs(b.vx) * 0.65,
                reflectVy = b.vy * 0.8;
              const impactSpd = Math.hypot(b.vx, b.vy);
              const blendToHoop = 0.8;
              const physBlend = 1 - blendToHoop;
              const finalSpd = impactSpd * 0.68;
              b.vx = (normHX * blendToHoop + (reflectVx / impactSpd) * physBlend) * finalSpd + (Math.random() - 0.5) * 0.3;
              b.vy = (normHY * blendToHoop + (reflectVy / impactSpd) * physBlend) * finalSpd + (Math.random() - 0.5) * 0.2;
              b.outcome = "direct";
            } else {
              b.vx = Math.abs(b.vx) * 0.6 * (0.9 + Math.random() * 0.2);
              b.vy = b.vy * 0.5 + Math.random() * 0.5;
              b.outcome = "miss_fly";
            }
          }
        }
      }

      // Влучення в кільце
      const d = Math.hypot(b.x - HOOP_X, b.y - HOOP_Y);
      if (d < 32 && (b.outcome === "direct" || b.outcome === "perfect_direct") && b.vy > 0) {
        b.state = "scored";
        b.vx = 0;
        b.vy = 0;
        b.x = HOOP_X;
        b.y = HOOP_Y + 26;
        return;
      }

      // Підлога
      if (b.y >= GY) {
        b.y = GY;
        b.state = "missed";
        b.vx = 0;
        b.vy = 0;
      }
    };

    // ── МАЛЮВАННЯ ──
    const drawBball = (cx: number, cy: number, r: number) => {
      ctx.fillStyle = "#e06030";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7a2008";
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
    };

    const drawStick = (x: number, y: number, pose: string, rf: number, danger: boolean, playerColor: string) => {
      ctx.save();
      let sc = playerColor || "#e05545";
      if (danger) {
        const t = (Date.now() / 300) % 1;
        const r = Math.floor(220 + 35 * Math.sin(t * Math.PI * 2));
        sc = `rgb(${r},40,40)`;
      }
      ctx.strokeStyle = sc;
      ctx.fillStyle = sc;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (pose === "run") {
        const leg = Math.sin(rf * 0.65) * 17,
          lean = -5;
        ctx.beginPath();
        ctx.arc(x + lean, y - 54 * scaleY, 10 * scaleY, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 43 * scaleY);
        ctx.lineTo(x + lean - 2 * scaleX, y - 18 * scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 35 * scaleY);
        ctx.lineTo(x + lean - 18 * scaleX, y - 25 * scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 35 * scaleY);
        ctx.lineTo(x + lean + 15 * scaleX, y - 25 * scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean - 2 * scaleX, y - 18 * scaleY);
        ctx.lineTo(x + lean - 2 * scaleX + leg, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean - 2 * scaleX, y - 18 * scaleY);
        ctx.lineTo(x + lean - 2 * scaleX - leg, y);
        ctx.stroke();
      } else if (pose === "shoot") {
        ctx.beginPath();
        ctx.arc(x, y - 54 * scaleY, 10 * scaleY, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 43 * scaleY);
        ctx.lineTo(x, y - 18 * scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 35 * scaleY);
        ctx.lineTo(x - 25 * scaleX, y - 43 * scaleY);
        ctx.stroke();
        drawBball(x - 33 * scaleX, y - 46 * scaleY, 9 * scaleX);
        ctx.strokeStyle = sc;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 35 * scaleY);
        ctx.lineTo(x + 13 * scaleX, y - 25 * scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18 * scaleY);
        ctx.lineTo(x - 11 * scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18 * scaleY);
        ctx.lineTo(x + 11 * scaleX, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y - 54 * scaleY, 10 * scaleY, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 43 * scaleY);
        ctx.lineTo(x, y - 18 * scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 37 * scaleY);
        ctx.lineTo(x + 17 * scaleX, y - 22 * scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 37 * scaleY);
        ctx.lineTo(x - 12 * scaleX, y - 26 * scaleY);
        ctx.stroke();
        drawBball(x + 24 * scaleX, y - 12 * scaleY, 10 * scaleX);
        ctx.strokeStyle = sc;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 18 * scaleY);
        ctx.lineTo(x - 10 * scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18 * scaleY);
        ctx.lineTo(x + 10 * scaleX, y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawBasket = () => {
      const sh = gs.netShake ? Math.sin(gs.netShakeT) * 2.5 : 0;
      ctx.save();
      ctx.strokeStyle = "#e05545";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(POLE_X, GY);
      ctx.lineTo(POLE_X, 209 * scaleY);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(POLE_X, 209 * scaleY);
      ctx.lineTo(ARM_X, 209 * scaleY);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeRect(BOARD_X, BOARD_TOP, BOARD_W, BOARD_BOT - BOARD_TOP);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(BOARD_X + scaleX, 227 * scaleY, BOARD_W - 2 * scaleX, 30 * scaleY);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, 262 * scaleY);
      ctx.lineTo(HOOP_X - HOOP_R + 3 * scaleX, HOOP_Y + sh * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, 276 * scaleY);
      ctx.lineTo(HOOP_X - HOOP_R + 3 * scaleX, HOOP_Y + sh * 0.3);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(HOOP_X + sh * 0.3, HOOP_Y + sh * 0.15, HOOP_R, 8 * scaleY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.65;
      for (let i = 0; i < 7; i++) {
        const tx = HOOP_X - HOOP_R + 3 * scaleX + (i * (HOOP_R * 2 - 6 * scaleX)) / 6;
        const bx2 = HOOP_X - 11 * scaleX + (i * 22 * scaleX) / 6;
        ctx.beginPath();
        ctx.moveTo(tx + sh * 0.08 * (i - 3), HOOP_Y + 8 * scaleY);
        ctx.lineTo(bx2 + sh * 0.12 * (i - 3), HOOP_Y + 46 * scaleY + sh);
        ctx.stroke();
      }
      for (let j = 0; j < 3; j++) {
        const t = (j + 1) / 4;
        const yw = HOOP_Y + 8 * scaleY + t * 38 * scaleY + sh * 0.08;
        const hw = HOOP_R * (1 - t * 0.4) - 2 * scaleX;
        ctx.beginPath();
        ctx.moveTo(HOOP_X - hw, yw);
        ctx.lineTo(HOOP_X + hw, yw);
        ctx.stroke();
      }
      if (gs.netShake) {
        const a = Math.max(0, (gs.netShakeEnd - Date.now()) / 700);
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = "#44cc44";
        ctx.beginPath();
        ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R + 14 * scaleX, 11 * scaleY, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, GY);
      ctx.lineTo(W, GY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      drawBasket();

      gs.players.forEach((p: any, i: number) => {
        if (p.status === "eliminated") return;
        const danger = gs.shootStates[i]?.inDanger || false;
        let pose = "idle";
        if (p.status === "running") pose = "run";
        else if (p.status === "shooting") pose = "shoot";
        drawStick(p.x, p.y, pose, p.rf, danger, p.color);

        ctx.fillStyle = danger ? "rgba(255,110,110,0.95)" : p.color;
        ctx.font = `${danger ? "bold " : ""}11px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${danger ? "🎯 " : "👤 "}${p.name}`, p.x, p.y - 73 * scaleY);

        ctx.fillStyle = danger ? "#ff5555" : "#ffdd00";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`🏀 ${p.score}`, p.x, p.y - 61 * scaleY);
      });

      gs.flashes.forEach((f: any) => {
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.font = "bold 17px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y + f.dy);
      });
      ctx.globalAlpha = 1;

      if (gs.state === "waiting") {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Додай 2–6 гравців і натисни ▶ Старт", W / 2, 235);
      }

      if (gs.state === "finished") {
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffdd00";
        ctx.font = "bold 30px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏆 ГРА ЗАВЕРШЕНА", W / 2, 165);
        if (gs.players.length === 1) {
          ctx.fillStyle = "#44cc44";
          ctx.font = "bold 22px sans-serif";
          ctx.fillText("Переможець: " + gs.players[0].name + " 🥇", W / 2, 205);
        }
      }
    };

    const update = () => {
      if (gs.state !== "playing") return;

      gs.players.forEach((p: any, i: number) => {
        const ss = gs.shootStates[i];
        if (p.status === "eliminated") return;

        if (ss.phase === "flying" && ss.ball) {
          stepBall(ss.ball);
          if (ss.ball.state === "scored") {
            p.score++;
            ss.phase = null;
            ss.ball = null;
            gs.netShake = true;
            gs.netShakeEnd = Date.now() + 700;
          } else if (ss.ball.state === "missed") {
            ss.phase = null;
            ss.ball = null;
          }
        }

        if (ss.phase === "auto_run" || ss.phase === "manual_run") {
          p.rf++;
          const t = ss.runTarget;
          if (!t) {
            ss.phase = ss.phase === "auto_run" ? "pickup_wait" : null;
            p.status = "idle";
          } else {
            const dx = t.x - p.x;
            if (Math.abs(dx) > 4) {
              p.x += Math.sign(dx) * 3.5;
            } else {
              if (ss.phase === "auto_run") {
                ss.phase = "pickup_wait";
                ss.ball = null;
              } else {
                ss.phase = null;
              }
              p.status = "idle";
            }
          }
        }
      });

      if (gs.netShake && Date.now() > gs.netShakeEnd) gs.netShake = false;
      if (gs.netShake) gs.netShakeT += 0.4;

      gs.flashes.forEach((f: any) => {
        f.dy -= 0.5;
        f.alpha -= 0.011;
      });
      gs.flashes = gs.flashes.filter((f: any) => f.alpha > 0);
    };

    const loop = () => {
      update();
      draw();
      requestAnimationFrame(loop);
    };

    const animId = requestAnimationFrame(loop);

    // Обработчик клика
    const handleClick = (e: MouseEvent) => {
      if (gs.state !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const sc = W / rect.width;
      const mx = (e.clientX - rect.left) * sc;
      const my = (e.clientY - rect.top) * sc;

      let hitIdx = -1;
      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i];
        if (p.status === "eliminated") continue;
        if (hitTestPlayer(mx, my, p.x, p.y)) {
          hitIdx = i;
          break;
        }
      }

      if (hitIdx >= 0) {
        const p = gs.players[hitIdx];
        const ss = gs.shootStates[hitIdx];
        if (ss.phase === null || ss.phase === "pickup_wait") {
          ss.phase = "aiming";
          p.status = "shooting";
        }
      }
    };

    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("click", handleClick);
    };
  }, [mounted, isVisible]);

  if (!mounted || !isVisible) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        pointerEvents: "auto",
        background: "transparent",
      }}
    />,
    document.body
  );
}
