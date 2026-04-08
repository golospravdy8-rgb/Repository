'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface HomePageNeonProps {
  season?: any;
  standings?: any;
  players?: any;
  ag?: string;
  games?: any[];
  news?: any[];
  settings?: Record<string, string>;
}

export default function HomePageNeon({ season, standings = [], players = [], ag = 'younger', games = [], news = [], settings = {} }: HomePageNeonProps) {
  const router = useRouter();
  const currentAg = ag || 'younger';

  // Mobile bottom sheets state
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showServicesSheet, setShowServicesSheet] = useState(false);

  // === HERO BACKGROUND — file-based architecture (no base64) ===
  const heroBgPath = settings?.['images.heroBg'];
  const hasHeroBg = heroBgPath && heroBgPath.startsWith('/images/');

  // ═══════════════════════════════════════════════════════════════
  // HERO SECTION
  // ═══════════════════════════════════════════════════════════════
  const HeroSection = () => {
    return (
    <section
      className="relative min-h-[65vh] md:min-h-[70vh] lg:min-h-[75vh] flex items-center justify-center overflow-hidden bg-black"
      style={
        hasHeroBg
          ? {
              backgroundImage: `url('${heroBgPath}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            }
          : {}
      }
    >
      {/* Dark overlay for text readability when using background image */}
      {hasHeroBg && <div className="absolute inset-0 bg-black/45" />}

      {/* Neon fallback (градієнт + grid + stars) ТІЛЬКИ коли картинки нет */}
      {!hasHeroBg && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950">
          {/* Neon grid lines */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-purple-500 via-orange-500 to-transparent"></div>
            <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-cyan-500 via-purple-500 to-transparent"></div>
            <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
            <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
          </div>

          {/* Floating stars */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `twinkle ${2 + Math.random() * 3}s infinite`,
              }}
            ></div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Season Badge - Compact & Elegant */}
        <div className="inline-block mb-3 md:mb-4">
          <span className="inline-block px-3 py-1 md:px-4 md:py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-[11px] md:text-xs rounded-full shadow-[0_0_15px_rgba(255,77,0,0.5)] whitespace-nowrap">
            ⚡ СЕЗОН 2025-2026
          </span>
        </div>

        {/* Main Title */}
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-black mb-2 md:mb-3 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-purple-400 to-cyan-400 leading-tight">
          Дитячо-юнацька баскетбольна ліга Львова
        </h2>

        {/* Subtitle */}
        <p className="hidden md:block text-sm md:text-base text-gray-300 mb-5 md:mb-6">
          Офіційний сайт баскетбольної ліги Львова. Матчі, статистика та новини.
        </p>

        {/* Primary Action Buttons (3-button row) — HIDDEN ON MOBILE */}
        <div className="hidden md:flex flex-col md:flex-row gap-2 justify-center mb-3 md:mb-4 items-center">
          <button className="w-full md:w-auto px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-[15px] bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.7)] transition duration-300 transform hover:scale-105">
            📅 Розклад
          </button>
          <button className="w-full md:w-auto px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-[15px] bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.7)] transition duration-300 transform hover:scale-105">
            🏆 Таблиця
          </button>
          <button className="w-full md:w-auto px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-[15px] bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.7)] transition duration-300 transform hover:scale-105">
            ❤️ Допомогти
          </button>
        </div>

        {/* Mobile Menu & Services Buttons (MOBILE ONLY) */}
        <div className="flex md:hidden gap-2 justify-center mb-3 items-center">
          <button
            onClick={() => setShowMenuSheet(true)}
            className="px-4 py-2.5 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-lg hover:shadow-[0_0_15px_rgba(168,85,247,0.7)] transition duration-300 active:scale-95 flex items-center gap-2"
          >
            ☰ Меню
          </button>
          <button
            onClick={() => setShowServicesSheet(true)}
            className="px-4 py-2.5 text-sm bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-lg hover:shadow-[0_0_15px_rgba(34,211,238,0.7)] transition duration-300 active:scale-95 flex items-center gap-2"
          >
            ⊞ Сервіси
          </button>
        </div>

        {/* Action Pills — DESKTOP ONLY */}
        <div className="hidden md:flex flex-wrap gap-1.5 justify-center mb-2.5 md:mb-3">
          {['Барахолка', 'Курси', 'Магазин', 'новини', 'Медіа', 'Відгуки'].map((item) => (
            <button
              key={item}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-full hover:shadow-[0_0_15px_rgba(255,77,0,0.8)] transition duration-300"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Chat & Age Group Section */}
        <div className="flex flex-col gap-2.5 items-center">
          {/* Chat Buttons — DESKTOP ONLY */}
          <div className="hidden md:flex flex-wrap gap-1.5 justify-center">
            <button
              onClick={() => router.push('/chat')}
              className="px-3 py-1.5 text-xs bg-black border border-cyan-400 text-cyan-400 font-bold rounded-full hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] transition duration-300 cursor-pointer"
            >
              💬 Балачка
            </button>
            <button className="px-3 py-1.5 text-xs bg-black border border-purple-400 text-purple-400 font-bold rounded-full hover:shadow-[0_0_15px_rgba(168,85,247,0.6)] transition duration-300">
              👨‍👩‍👧‍👦 Батьки
            </button>
          </div>

          {/* Age Group Toggle - PROMINENT ON MOBILE */}
          <div className="flex gap-2 justify-center mt-1 md:mt-3">
            <Link
              href="/?ag=younger"
              className={`px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold rounded-lg transition-all duration-300 ${
                currentAg === 'younger'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_0_20px_rgba(255,77,0,0.8)]'
                  : 'bg-slate-900 text-orange-300 border border-orange-500/40 hover:bg-slate-800'
              }`}
            >
              🏀 U-14
            </Link>
            <Link
              href="/?ag=older"
              className={`px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold rounded-lg transition-all duration-300 ${
                currentAg === 'older'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_0_20px_rgba(255,77,0,0.8)]'
                  : 'bg-slate-900 text-orange-300 border border-orange-500/40 hover:bg-slate-800'
              }`}
            >
              🏀 U-16
            </Link>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // LIVE SCORES TICKER
  // ═══════════════════════════════════════════════════════════════
  const LiveScoresTicker = () => {
    // Get 4 nearest games (scheduled first, then finished)
    const getDisplayGames = () => {
      if (!games || games.length === 0) {
        return [];
      }

      const now = new Date();
      const scheduled = games.filter(g => {
        try {
          return new Date(g.scheduledAt) >= now && (g.status === 'SCHEDULED' || g.status === 'LIVE');
        } catch {
          return false;
        }
      });
      const finished = games.filter(g => g.status === 'FINAL').reverse();

      return [...scheduled, ...finished].slice(0, 4);
    };

    const displayGames = getDisplayGames();

    const TeamLogo = ({ logoUrl, name }: { logoUrl: string | null; name: string }) => (
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: "1.5px solid #a78bfa", overflow: "hidden",
        flexShrink: 0, background: "rgba(15, 23, 42, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {logoUrl ? (
          <Image src={logoUrl} alt={name} fill style={{ objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8" }}>{name[0]}</span>
        )}
      </div>
    );

    return (
      <section className="bg-slate-950 border-b border-purple-500/30 py-6 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          {displayGames.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-3 bg-gradient-to-br from-slate-900 to-purple-900 border border-purple-500/50 rounded-lg animate-pulse"
                >
                  <div className="h-4 bg-purple-500/20 rounded mb-2"></div>
                  <div className="h-6 bg-purple-500/20 rounded mb-2"></div>
                  <div className="h-6 bg-purple-500/20 rounded mb-2"></div>
                  <div className="h-4 bg-purple-500/20 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {displayGames.map((game) => {
                const isFinal = game.status === 'FINAL';
                const dateShort = new Date(game.scheduledAt).toLocaleDateString("uk-UA", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                });
                const statusLabel = isFinal ? 'ЗІГРАНО' : 'ЗАПЛАНОВАНО';
                const statusColor = isFinal ? '#f97316' : '#2563eb';

                return (
                  <Link key={game.id} href={`/game/${game.id}`} style={{ textDecoration: 'none' }}>
                    <div className="p-3 bg-gradient-to-br from-slate-900 to-purple-900 border border-purple-500/50 rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition duration-300 flex flex-col h-full cursor-pointer">
                      <div className="text-xs text-purple-300 font-bold mb-2">{dateShort}</div>

                      {/* Home Team */}
                      <div className="flex gap-2 items-center mb-2">
                        <TeamLogo logoUrl={game.homeTeam?.logoUrl ?? null} name={game.homeTeam?.name ?? 'N/A'} />
                        <span className="text-white text-xs font-bold flex-1 truncate">{game.homeTeam?.name}</span>
                        {isFinal && <span className="text-orange-400 font-bold text-sm flex-shrink-0">{game.homeScore}</span>}
                      </div>

                      {/* Away Team */}
                      <div className="flex gap-2 items-center mb-2">
                        <TeamLogo logoUrl={game.awayTeam?.logoUrl ?? null} name={game.awayTeam?.name ?? 'N/A'} />
                        <span className="text-white text-xs font-bold flex-1 truncate">{game.awayTeam?.name}</span>
                        {isFinal && <span className="text-orange-400 font-bold text-sm flex-shrink-0">{game.awayScore}</span>}
                      </div>

                      {!isFinal && <div className="text-xs text-purple-300 text-center my-1">vs</div>}

                      <div className="text-xs font-bold mt-2 text-center" style={{ color: statusColor }}>
                        {statusLabel}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // TRANSMISSION / LIVE SECTION
  // ═══════════════════════════════════════════════════════════════
  const LiveSection = () => (
    <section className="bg-slate-950 py-8 px-4 border-y border-purple-500/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          {/* Live Box */}
          <div className="p-5 md:p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-2 border-orange-500 rounded-xl shadow-[0_0_30px_rgba(255,77,0,0.4)] hover:shadow-[0_0_40px_rgba(255,77,0,0.5)] transition-shadow duration-300">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,77,0,0.8)]"></div>
              <span className="text-orange-400 font-bold text-sm md:text-base">ТРАНСЛЯЦІЯ</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-1.5">Прямий ефір</h3>
            <p className="text-gray-300 text-xs md:text-sm mb-4">Дивіться матч в прямому ефірі</p>
            <button className="w-full px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm md:text-base rounded-lg hover:shadow-[0_0_25px_rgba(220,38,38,0.8)] transition duration-300 flex items-center justify-center gap-2">
              ▶️ Підписатись на канал
            </button>
          </div>

          {/* Hologram court (visual element) */}
          <div className="relative h-56 md:h-60 rounded-xl overflow-hidden border border-purple-500/50 bg-gradient-to-br from-purple-900/30 via-slate-900 to-slate-950 hover:border-purple-500/70 transition-colors duration-300">
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <div className="text-center">
                <div className="text-5xl md:text-6xl mb-2 md:mb-4">🏀</div>
                <p className="text-purple-300 text-xs md:text-sm font-bold">Трансляція</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════
  // STANDINGS TABLE (компактна, сучасна)
  // ═══════════════════════════════════════════════════════════════
  const StandingsSection = () => (
    <section className="bg-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-white">Таблиця сезону</h2>
          <a href="#" className="text-orange-400 hover:text-orange-300 font-bold text-sm transition-colors">
            Повна таблиця →
          </a>
        </div>

        <div className="overflow-hidden rounded-2xl border border-purple-500/30 shadow-lg shadow-purple-500/20 backdrop-blur-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 border-b border-purple-500/40">
                <th className="px-4 py-3 text-left text-xs font-bold text-purple-200 tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-purple-200 tracking-wider">КОМАНДА</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-purple-200 tracking-wider">І</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-purple-200 tracking-wider">П</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-purple-200 tracking-wider">ПР</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-purple-200 tracking-wider">+/-</th>
              </tr>
            </thead>
            <tbody>
              {[
                { rank: 1, team: 'Mighty Ducks Ліцей № 81', w: 1, l: 1, p: 0, diff: '+10' },
                { rank: 2, team: 'Коали Школа № 7', w: 1, l: 0, p: 1, diff: '-10' },
                { rank: 3, team: 'Бізони Школа № 17', w: 0, l: 0, p: 0, diff: '0' },
                { rank: 4, team: 'Димчасті Леопарди Школа № 91', w: 0, l: 0, p: 0, diff: '0' },
                { rank: 5, team: 'Індійські Леопарди Ліцей № 81', w: 0, l: 0, p: 0, diff: '0' },
              ].map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-purple-500/20 transition-all duration-200 hover:bg-purple-500/10 ${
                    i % 2 === 0 ? 'bg-slate-950/60' : 'bg-slate-900/40'
                  }`}
                >
                  <td className="px-4 py-3 text-xs font-bold text-orange-400">{row.rank}</td>
                  <td className="px-4 py-3 text-xs text-gray-100 font-medium">{row.team}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-white">{row.w}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-white">{row.l}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-white">{row.p}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-cyan-300">{row.diff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════
  // HONOR BOARD - PLAYERS OF THE MONTH
  // ═══════════════════════════════════════════════════════════════
  const HonorBoardSection = () => {
    // Medal config for top 3
    const medals = ['🥇', '🥈', '🥉'];
    const borderHexColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
    const placeholderGradients = ['from-amber-700 to-orange-600', 'from-amber-700 to-orange-600', 'from-amber-700 to-orange-600'];
    const medalLabels = ['#1 місце', '#2 місце', '#3 місце'];

    return (
      <section className="bg-slate-950 py-8 md:py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white">
              🏆 Дошка пошани — Гравці місяця
            </h2>
            <a href="/players" className="text-orange-400 hover:text-orange-300 font-bold text-xs md:text-sm transition-colors">
              Всі гравці →
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {players && players.length > 0 ? (
              players.map((entry: any, i: number) => {
                const player = entry.player;
                const fullName = player && player.firstName && player.lastName
                  ? `${player.firstName} ${player.lastName}`
                  : 'Невідомий гравець';
                const teamName = player?.team?.name || 'N/A';
                const position = player?.position || '';
                const displayTeam = position ? `${teamName} · ${position}` : teamName;

                return (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    style={{
                      border: `2px solid ${borderHexColors[i]}`,
                      height: '600px',
                    }}
                  >
                    {/* Upper zone - Photo/Gradient (420px) */}
                    <div
                      className={player?.photoUrl ? 'relative overflow-hidden flex items-center justify-center flex-shrink-0' : `relative bg-gradient-to-br ${placeholderGradients[i]} overflow-hidden flex items-center justify-center flex-shrink-0`}
                      style={{
                        height: '420px',
                      }}
                    >
                      {player?.photoUrl ? (
                        <Image
                          src={player.photoUrl}
                          alt={fullName}
                          fill
                          style={{ objectFit: 'cover', objectPosition: 'center top' }}
                          priority
                        />
                      ) : (
                        <div className="flex items-center justify-center">
                          <div className="text-6xl md:text-7xl text-orange-400">🏀</div>
                        </div>
                      )}

                      {/* Medal badge - bottom left */}
                      <div
                        className="absolute bottom-2.5 left-2.5 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          border: `2px solid ${borderHexColors[i]}`,
                        }}
                      >
                        {medals[i]}
                      </div>

                      {/* Badge - top right */}
                      <div
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        }}
                      >
                        {medalLabels[i]}
                      </div>
                    </div>

                    {/* Lower zone - Info (180px) */}
                    <div className="bg-white flex-1 px-3 md:px-4 py-3 md:py-3.5 flex flex-col justify-between">
                      {/* Name and Team */}
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-0.5">{fullName}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2">{displayTeam}</p>
                      </div>

                      {/* Stats */}
                      <div className="flex justify-between items-end gap-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">очк/гра</p>
                          <p className="text-xl md:text-2xl font-bold text-orange-500">{entry.avgPts}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-0.5">ігор</p>
                          <p className="text-xl md:text-2xl font-bold text-gray-900">{entry.games}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-8 text-gray-400">
                <p className="text-sm">Ще немає гравців місяця</p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };


  // ═══════════════════════════════════════════════════════════════
  // NEWS SECTION
  // ═══════════════════════════════════════════════════════════════
  const NewsSection = () => (
    <section className="bg-black py-8 md:py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            📰 Останні новини
          </h2>
          <a href="/news" className="text-orange-400 hover:text-orange-300 font-bold text-xs md:text-sm transition-colors">
            Всі новини →
          </a>
        </div>

        {news && news.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {news.map((item: any) => {
              const excerpt = item.content
                ? item.content.replace(/<[^>]*>/g, "").substring(0, 150)
                : "";
              const publishDate = new Date(item.publishedAt).toLocaleDateString(
                "uk-UA",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              );

              return (
                <Link
                  key={item.id}
                  href={`/news/${item.slug}`}
                  className="group block"
                >
                  <div className="rounded-2xl overflow-hidden bg-slate-900 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] h-full flex flex-col">
                    {/* Image */}
                    <div className="relative h-40 md:h-48 overflow-hidden bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-5xl md:text-6xl text-orange-400">📰</div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 md:p-4 flex flex-col flex-1">
                      <div className="text-xs text-purple-300 font-bold mb-2">
                        {publishDate}
                      </div>
                      <h3 className="text-sm md:text-base font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 flex-1">
                        {excerpt}
                        {excerpt ? "..." : ""}
                      </p>
                      <div className="mt-3 text-orange-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                        Читати →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Новини прослід...</p>
          </div>
        )}
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════
  // MOBILE BOTTOM SHEETS
  // ═══════════════════════════════════════════════════════════════
  const MobileMenuSheet = () => (
    <>
      {/* Overlay */}
      {showMenuSheet && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setShowMenuSheet(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-purple-500/40 rounded-t-3xl z-40 md:hidden transition-transform duration-300 ${
          showMenuSheet ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Handle bar */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1 bg-purple-500/40 rounded-full"></div>
          </div>

          {/* Menu title */}
          <h3 className="text-lg font-black text-white mb-4">Навігація</h3>

          {/* Menu items */}
          <div className="space-y-3 mb-4">
            <Link
              href="/news"
              onClick={() => setShowMenuSheet(false)}
              className="block px-4 py-3 text-white font-semibold bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition"
            >
              📰 Новини
            </Link>
            <Link
              href="/schedule"
              onClick={() => setShowMenuSheet(false)}
              className="block px-4 py-3 text-white font-semibold bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition"
            >
              📅 Розклад
            </Link>
            <Link
              href="/standings"
              onClick={() => setShowMenuSheet(false)}
              className="block px-4 py-3 text-white font-semibold bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition"
            >
              🏆 Змагання
            </Link>
            <Link
              href="/leaders"
              onClick={() => setShowMenuSheet(false)}
              className="block px-4 py-3 text-white font-semibold bg-gradient-to-r from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-lg hover:bg-pink-500/30 transition"
            >
              ⭐ Лідери
            </Link>
            <Link
              href="/teams"
              onClick={() => setShowMenuSheet(false)}
              className="block px-4 py-3 text-white font-semibold bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition"
            >
              👥 Команди
            </Link>
            <Link
              href="/players"
              onClick={() => setShowMenuSheet(false)}
              className="block px-4 py-3 text-white font-semibold bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition"
            >
              👤 Гравці
            </Link>
            <Link
              href="/contacts"
              onClick={() => setShowMenuSheet(false)}
              className="block px-4 py-3 text-white font-semibold bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition"
            >
              📞 Контакти
            </Link>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowMenuSheet(false)}
            className="w-full px-4 py-3 text-gray-300 font-semibold bg-slate-800 border border-gray-500/20 rounded-lg hover:bg-slate-700 transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </>
  );

  const MobileServicesSheet = () => (
    <>
      {/* Overlay */}
      {showServicesSheet && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setShowServicesSheet(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-cyan-500/40 rounded-t-3xl z-40 md:hidden transition-transform duration-300 ${
          showServicesSheet ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Handle bar */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1 bg-cyan-500/40 rounded-full"></div>
          </div>

          {/* Services title */}
          <h3 className="text-lg font-black text-white mb-4">Сервіси</h3>

          {/* Services items */}
          <div className="space-y-3 mb-4">
            <Link
              href="/marketplace"
              onClick={() => setShowServicesSheet(false)}
              className="flex items-center justify-center px-4 py-3 text-white font-semibold bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition"
            >
              🏪 Барахолка
            </Link>
            <Link
              href="/courses"
              onClick={() => setShowServicesSheet(false)}
              className="flex items-center justify-center px-4 py-3 text-white font-semibold bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition"
            >
              🎓 Курси
            </Link>
            <Link
              href="/shop"
              onClick={() => setShowServicesSheet(false)}
              className="flex items-center justify-center px-4 py-3 text-white font-semibold bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition"
            >
              🛍️ Магазин
            </Link>
            <Link
              href="/media"
              onClick={() => setShowServicesSheet(false)}
              className="flex items-center justify-center px-4 py-3 text-white font-semibold bg-gradient-to-r from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-lg hover:bg-pink-500/30 transition"
            >
              📸 Медіа
            </Link>
            <Link
              href="/reviews"
              onClick={() => setShowServicesSheet(false)}
              className="flex items-center justify-center px-4 py-3 text-white font-semibold bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition"
            >
              ⭐ Відгуки
            </Link>
            <button
              onClick={() => setShowServicesSheet(false)}
              className="w-full flex items-center justify-center px-4 py-3 text-white font-semibold bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition"
            >
              👨‍👩‍👧‍👦 Чат батьків
            </button>
            <button
              onClick={() => setShowServicesSheet(false)}
              className="w-full flex items-center justify-center px-4 py-3 text-white font-semibold bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition"
            >
              ❤️ Допомогти клубу
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowServicesSheet(false)}
            className="w-full px-4 py-3 text-gray-300 font-semibold bg-slate-800 border border-gray-500/20 rounded-lg hover:bg-slate-700 transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="bg-black min-h-screen text-white overflow-hidden">
      <HeroSection />
      <LiveScoresTicker />
      <StandingsSection />
      <LiveSection />
      <HonorBoardSection />
      <NewsSection />

      {/* Mobile Menu & Services Bottom Sheets */}
      <MobileMenuSheet />
      <MobileServicesSheet />

      {/* Floating Chat Button — MOBILE ONLY */}
      <button
        onClick={() => router.push('/chat')}
        className="fixed bottom-6 right-4 md:hidden w-14 h-14 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-xl rounded-full shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/80 active:scale-95 transition-all duration-300 z-50 flex items-center justify-center cursor-pointer"
        title="Відкрити чат"
      >
        💬
      </button>

      {/* Global styles */}
      <style jsx global>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 77, 0, 0.5) rgba(15, 23, 42, 1);
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 1);
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255, 77, 0, 0.5);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 77, 0, 0.8);
        }
      `}</style>
    </div>
  );
}
