"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface RucheekGameCanvasProps {
  isVisible: boolean;
  userName?: string;
  userPhone?: string;
}

const PLAYER_COLORS = ["#4fc3f7","#81c784","#ffb74d","#f06292","#ce93d8","#80cbc4"];
const MAX_PLAYERS = 6;

export default function RucheekGameCanvas({ isVisible, userName = "", userPhone = "" }: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pnameRef = useRef<HTMLInputElement>(null);
  const btnStartRef = useRef<HTMLButtonElement>(null);
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
    netShakeT: 0,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    if (!isVisible) {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Get chat container dimensions
    const chatContainer = document.querySelector('[style*="flex: 1"][style*="overflowY"]') ||
                         document.querySelector('[style*="flex: 1, overflowY"]');
    if (!chatContainer) return;

    const rect = (chatContainer as HTMLElement).getBoundingClientRect();
    canvas.style.position = "absolute";
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

    const POLE_X = 80*scaleX, ARM_X = 120*scaleX;
    const BOARD_X = 125*scaleX, BOARD_W = 10*scaleX;
    const BOARD_TOP = 189*scaleY, BOARD_BOT = 292*scaleY;
    const BOARD_FACE = BOARD_X + BOARD_W;
    const HOOP_X = 188*scaleX, HOOP_Y = 307*scaleY;
    const HOOP_R = 27*scaleX*0.7;
    const P_START = 680*scaleX, P_STEP = 58*scaleX;

    const gs = gsRef.current;
    let ss_ideal_power = 50;

    // Game logic functions from original demo
    function hitTestPlayer(mx: number, my: number, px: number, py: number) {
      return Math.hypot(mx - px, my - py) < 20;
    }

    function addFlash(text: string, x: number, y: number, color: string) {
      gs.flashes.push({ text, x, y, color, t: 0, life: 60 });
    }

    function findIdealSpeedForAngle(sx: number, sy: number, angle: number) {
      const dx = HOOP_X - sx;
      const dy = HOOP_Y - sy;
      const d = Math.hypot(dx, dy);
      const g_half = G / 2;
      const cos_a = Math.cos(angle);
      const sin_a = Math.sin(angle);
      const tan_a = Math.tan(angle);
      const sec_a = 1 / cos_a;
      const v_sq = (g_half * d * d * sec_a * sec_a) / (d * tan_a - dy);
      return Math.sqrt(Math.max(0, v_sq));
    }

    function simTraj(sx: number, sy: number, angle: number, speed: number, max_t: number) {
      const traj = [];
      const cos_a = Math.cos(angle);
      const sin_a = Math.sin(angle);
      for (let t = 0; t <= max_t; t += 1) {
        const x = sx + speed * cos_a * t;
        const y = sy + speed * sin_a * t + 0.5 * G * t * t;
        traj.push({ x, y });
      }
      return traj;
    }

    function stepBall(ball: any) {
      ball.vx *= 0.99;
      ball.vy += G;
      ball.vy *= 0.99;
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.y > GY) {
        ball.y = GY;
        ball.vy *= -0.6;
        ball.vx *= 0.8;
      }
      if (ball.x < 0 || ball.x > W) {
        ball.vx *= -0.8;
        ball.x = Math.max(0, Math.min(W, ball.x));
      }
    }

    function launchBall(idx: number) {
      const p = gs.players[idx];
      const ss = gs.shootStates[idx];
      const sx = p.x - 15*scaleX;
      const sy = p.y - 55*scaleY;
      const speed = ss.idealSpeed * (0.8 + ss.power / 100 * 0.4);
      ss.ball = { x: sx, y: sy, vx: speed * Math.cos(ss.lockedAngle), vy: speed * Math.sin(ss.lockedAngle), t: 0 };
      ss.phase = "flying";
      p.status = "waiting";
    }

    function update() {
      gs.players.forEach((p: any, idx: number) => {
        const ss = gs.shootStates[idx];
        if (ss.phase === "aiming") {
          ss.aimAngle += 0.05 * ss.aimDir;
          if (ss.aimAngle < -Math.PI * 0.9) ss.aimDir = 1;
          if (ss.aimAngle > -0.1) ss.aimDir = -1;
        } else if (ss.phase === "charging") {
          ss.power += ss.powerDir * 2;
          if (ss.power <= 0) ss.powerDir = 1;
          if (ss.power >= 100) ss.powerDir = -1;
        } else if (ss.phase === "flying" && ss.ball) {
          stepBall(ss.ball);
          ss.ball.t++;
          const dx = HOOP_X - ss.ball.x;
          const dy = HOOP_Y - ss.ball.y;
          if (Math.hypot(dx, dy) < HOOP_R) {
            handleScored(idx);
          }
          if (ss.ball.t > 300) {
            handleMissed(idx);
          }
        } else if (ss.phase === "manual_run" && ss.runTarget) {
          const dx = ss.runTarget.x - p.x;
          if (Math.abs(dx) > 2) {
            p.x += Math.sign(dx) * 3;
          } else {
            ss.phase = null;
            p.status = "idle";
          }
        }
      });
      gs.flashes = gs.flashes.filter((f: any) => {
        f.t++;
        return f.t < f.life;
      });
    }

    function handleScored(idx: number) {
      const ss = gs.shootStates[idx];
      gs.players[idx].score++;
      gs.players[idx].kills++;
      addFlash("🎯 ВЛУЧЕННЯ!", gs.players[idx].x, gs.players[idx].y - 100*scaleY, "rgba(0,255,100,0.95)");
      ss.ball = null;
      ss.phase = null;
      gs.players[idx].status = "idle";
    }

    function handleMissed(idx: number) {
      const ss = gs.shootStates[idx];
      addFlash("❌ ПРОМАХ", gs.players[idx].x, gs.players[idx].y - 100*scaleY, "rgba(255,100,100,0.9)");
      ss.ball = null;
      ss.phase = null;
      gs.players[idx].status = "idle";
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "#e05545";
      ctx.lineWidth = 3*scaleX;
      ctx.beginPath();
      ctx.moveTo(POLE_X, GY);
      ctx.lineTo(POLE_X, BOARD_TOP);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(POLE_X, BOARD_TOP - 40*scaleY);
      ctx.lineTo(ARM_X, BOARD_TOP - 40*scaleY);
      ctx.stroke();

      ctx.strokeStyle = "#e05545";
      ctx.lineWidth = 2*scaleX;
      ctx.strokeRect(BOARD_X, BOARD_TOP, BOARD_W, BOARD_BOT - BOARD_TOP);

      ctx.strokeStyle = "#ff9900";
      ctx.lineWidth = 2.5*scaleX;
      ctx.beginPath();
      ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R, HOOP_R * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,153,0,0.5)";
      ctx.lineWidth = 1*scaleX;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(HOOP_X - HOOP_R, HOOP_Y + HOOP_R * 0.3 + i * 4*scaleY);
        ctx.lineTo(HOOP_X + HOOP_R, HOOP_Y + HOOP_R * 0.3 + i * 4*scaleY);
        ctx.stroke();
      }

      gs.players.forEach((p: any, idx: number) => {
        const ss = gs.shootStates[idx];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 28*scaleY, 8*scaleX, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2*scaleX;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 20*scaleY);
        ctx.lineTo(p.x, p.y - 8*scaleY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8*scaleY);
        ctx.lineTo(p.x - 6*scaleX, p.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8*scaleY);
        ctx.lineTo(p.x + 6*scaleX, p.y);
        ctx.stroke();

        if (ss.phase === "aiming") {
          ctx.strokeStyle = "rgba(255,100,100,0.8)";
          ctx.lineWidth = 2*scaleX;
          const armLen = 80*scaleX;
          ctx.beginPath();
          ctx.moveTo(p.x - 15*scaleX, p.y - 55*scaleY);
          ctx.lineTo(p.x - 15*scaleX + armLen * Math.cos(ss.aimAngle), p.y - 55*scaleY + armLen * Math.sin(ss.aimAngle));
          ctx.stroke();

          if (ss.idealTraj) {
            ctx.strokeStyle = "rgba(255,100,100,0.5)";
            ctx.lineWidth = 1*scaleX;
            ctx.beginPath();
            ctx.moveTo(ss.idealTraj[0].x, ss.idealTraj[0].y);
            for (let i = 1; i < ss.idealTraj.length; i++) {
              ctx.lineTo(ss.idealTraj[i].x, ss.idealTraj[i].y);
            }
            ctx.stroke();
          }
        } else if (ss.phase === "charging") {
          ctx.strokeStyle = "rgba(255,200,0,0.9)";
          ctx.lineWidth = 3*scaleX;
          const armLen = 80*scaleX;
          ctx.beginPath();
          ctx.moveTo(p.x - 15*scaleX, p.y - 55*scaleY);
          ctx.lineTo(p.x - 15*scaleX + armLen * Math.cos(ss.lockedAngle), p.y - 55*scaleY + armLen * Math.sin(ss.lockedAngle));
          ctx.stroke();

          if (ss.idealTraj) {
            ctx.strokeStyle = "rgba(255,200,0,0.7)";
            ctx.lineWidth = 1.5*scaleX;
            ctx.beginPath();
            ctx.moveTo(ss.idealTraj[0].x, ss.idealTraj[0].y);
            for (let i = 1; i < ss.idealTraj.length; i++) {
              ctx.lineTo(ss.idealTraj[i].x, ss.idealTraj[i].y);
            }
            ctx.stroke();
          }

          ctx.fillStyle = "rgba(255,200,0,0.3)";
          ctx.fillRect(p.x + 30*scaleX, p.y - 80*scaleY, 60*scaleX, 20*scaleY);
          ctx.strokeStyle = "rgba(255,200,0,0.9)";
          ctx.lineWidth = 2*scaleX;
          ctx.strokeRect(p.x + 30*scaleX, p.y - 80*scaleY, 60*scaleX, 20*scaleY);
          ctx.fillStyle = "rgba(255,200,0,0.8)";
          ctx.fillRect(p.x + 30*scaleX, p.y - 80*scaleY, (ss.power / 100) * 60*scaleX, 20*scaleY);
        }

        if (gs.selectedMoveIdx === idx) {
          ctx.strokeStyle = "rgba(255,220,80,0.8)";
          ctx.lineWidth = 3*scaleX;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 35*scaleX, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (ss.ball) {
          ctx.fillStyle = "rgba(255,150,0,0.9)";
          ctx.beginPath();
          ctx.arc(ss.ball.x, ss.ball.y, 6*scaleX, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = p.color;
        ctx.font = `bold ${12*scaleX}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x, p.y + 20*scaleY);
        ctx.fillText(`${p.score}`, p.x, p.y + 35*scaleY);
      });

      gs.flashes.forEach((f: any) => {
        const alpha = 1 - f.t / f.life;
        ctx.fillStyle = f.color.replace("0.95", String(alpha * 0.95)).replace("0.9", String(alpha * 0.9)).replace("0.85", String(alpha * 0.85));
        ctx.font = `bold ${16*scaleX}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y - (f.t * 2*scaleY));
      });
    }

    const handleClick = (e: MouseEvent) => {
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
        if (ss.phase === null || ss.phase === "pickup_wait") {
          ss.phase = "aiming";
          const behindBoard = (p.x - 15*scaleX) < BOARD_FACE;
          ss.aimAngle = behindBoard ? -0.1 : -Math.PI*0.72;
          ss.aimDir = behindBoard ? -1 : 1;
          ss.lockedAngle = null; ss.idealTraj = null;
          p.status = "shooting";
          if (hitIdx === 0) gs.disputeP1 = 0;
        } else if (ss.phase === "aiming") {
          ss.lockedAngle = ss.aimAngle;
          const idealSpd = findIdealSpeedForAngle(p.x-15*scaleX, p.y-55*scaleY, ss.lockedAngle);
          ss.idealSpeed = idealSpd;
          ss_ideal_power = (idealSpd-5)/11*100;
          ss.idealTraj = simTraj(p.x-15*scaleX, p.y-55*scaleY, ss.lockedAngle, idealSpd, 95);
          ss.phase = "charging"; ss.power = 0; ss.powerDir = 1;
        } else if (ss.phase === "charging") {
          launchBall(hitIdx);
        }
      } else {
        if (gs.selectedMoveIdx >= 0 && gs.selectedMoveIdx < gs.players.length) {
          const p = gs.players[gs.selectedMoveIdx], ss = gs.shootStates[gs.selectedMoveIdx];
          if (p.status !== "eliminated" && (ss.phase === null || ss.phase === "pickup_wait" || ss.phase === "manual_run")) {
            ss.runTarget = { x: Math.max(50*scaleX, Math.min(W-30*scaleX, mx)), y: GY };
            ss.phase = "manual_run"; p.status = "running";
          }
        }
      }
      forceUpdate(n => n+1);
    };

    const handleRClick = (e: MouseEvent) => {
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
        if (ss.phase === "charging") {
          ss.phase = "aiming"; ss.aimAngle = ss.lockedAngle || ss.aimAngle; ss.aimDir = 1;
          ss.lockedAngle = null; ss.idealTraj = null;
          addFlash("↺ переприціл", p.x, p.y-105*scaleY, "rgba(255,210,80,0.95)");
        } else if (ss.phase === "aiming") {
          ss.phase = null; ss.lockedAngle = null; ss.idealTraj = null; ss.ball = null;
          p.status = "idle"; gs.selectedMoveIdx = -1;
          addFlash("✖ скасовано", p.x, p.y-95*scaleY, "rgba(200,200,200,0.9)");
        } else if (p.status !== "eliminated") {
          gs.selectedMoveIdx = hitIdx;
          addFlash("👆 вибрано", p.x, p.y-95*scaleY, "rgba(255,220,80,0.95)");
        }
      } else {
        if (gs.selectedMoveIdx >= 0) addFlash("✖ вибір скасовано", mx, my-20*scaleY, "rgba(200,200,200,0.85)");
        gs.selectedMoveIdx = -1;
      }
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("contextmenu", handleRClick);

    function renderLoop() {
      update();
      draw();
      rafRef.current = requestAnimationFrame(renderLoop);
    }
    renderLoop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("contextmenu", handleRClick);
    };
  }, [mounted, isVisible]);

  const gs = gsRef.current;

  const handleAddPlayer = () => {
    if (gs.players.length >= MAX_PLAYERS) { alert("Максимум 6 гравців!"); return; }
    const name = pname.trim() || `Гр.${gs.players.length+1}`;
    const idx = gs.players.length;
    gs.players.push({ name, x: 680*(window.innerWidth/860)+idx*58*(window.innerWidth/860), y: 584*(window.innerHeight/624), score:0, kills:0, status:"idle", rf:0, color: PLAYER_COLORS[idx%6] });
    gs.shootStates.push({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false });
    setPname("");
    forceUpdate(n => n+1);
  };

  const handleStart = () => {
    if (gs.players.length < 2) return;
    gs.state = "playing";
    gs.flashes = [];
    gs.players.forEach((p:any) => { p.score=0; p.kills=0; p.status="idle"; p.rf=0; });
    gs.shootStates = gs.players.map(() => ({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false }));
    gs.disputeP1=0; gs.disputeP2=-1; gs.selectedMoveIdx=-1;
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
          zIndex:9999, pointerEvents:"none", background:"transparent", cursor:"crosshair" }}
      />
      <div
        style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%",
          zIndex:10000, pointerEvents:"auto", cursor:"crosshair" }}
        onMouseDown={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
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
        onContextMenu={(e) => e.preventDefault()}
      />
      <div style={{ position:"fixed", bottom:8, left:"50%", transform:"translateX(-50%)",
        zIndex:10001, display:"flex", gap:7, alignItems:"center",
        background:"rgba(0,0,0,0.6)", padding:"6px 12px", borderRadius:8,
        boxShadow:"0 2px 12px rgba(0,0,0,0.5)" }}>
        <input
          ref={pnameRef}
          value={pname}
          onChange={e => setPname(e.target.value)}
          onKeyDown={e => e.key==="Enter" && handleAddPlayer()}
          placeholder="Ім'я гравця"
          maxLength={12}
          style={{ padding:"6px 11px", borderRadius:6, border:"1px solid #333",
            background:"#1a1f35", color:"#fff", fontSize:13, width:120 }}
        />
        <button onClick={handleAddPlayer} style={btnStyle("#e06030", gs.players.length>=6)}>+ Додати</button>
        <button ref={btnStartRef} onClick={handleStart} style={btnStyle("#27ae60", gs.players.length<2)} disabled={gs.players.length<2}>▶ Старт</button>
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
            <p style={{marginBottom:8}}><b style={{color:"#e05545"}}>🎮 Управління:</b></p>
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
