#!/usr/bin/env node

/**
 * GHOST PLAYER DEDUPLICATION TEST
 * Симулює Pusher eventi напряму — без браузера, без авторизації
 * Тестує чи deduplication logic працює правильно
 */

console.log('\n🧪 GHOST PLAYER DEDUPLICATION TEST (Direct Pusher Event Simulation)\n');
console.log('='.repeat(80));

// Симулюємо Map і логіку з RucheekGameCanvas.tsx
const remotePlayersRef = { current: new Map() };
const playerIdRef = { current: 'player_TEST_LOCAL' };
let passed = 0;
let failed = 0;

function test(name, fn) {
  remotePlayersRef.current.clear();
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch(e) {
    console.log(`❌ FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Копія логіки з player-joined handler (RucheekGameCanvas.tsx lines 98-137)
function onPlayerJoined(data) {
  // Skip local player
  if (data.playerId === playerIdRef.current ||
      data.playerId.startsWith(playerIdRef.current + '_')) return;

  // Extract base player ID
  const baseId = data.playerId.split('_').slice(0, -1).join('_');
  if (baseId === playerIdRef.current) return;

  // ✅ DELETE all sub-ID entries of this player if they exist (prevent duplicates)
  remotePlayersRef.current.forEach((_, key) => {
    if (key.startsWith(data.playerId + '_')) {
      remotePlayersRef.current.delete(key);
    }
  });

  remotePlayersRef.current.set(data.playerId, {
    name: data.nickname,
    basePlayerId: baseId,
    status: 'alive',
  });
}

// Копія логіки з player-move handler (RucheekGameCanvas.tsx lines 140-170)
function onPlayerMove(data) {
  // Skip local player
  if (data.playerId === playerIdRef.current ||
      data.playerId.startsWith(playerIdRef.current + '_')) return;

  // Extract base player ID
  const baseId = data.playerId.split('_').slice(0, -1).join('_');
  if (baseId === playerIdRef.current) return;

  // ✅ DELETE base ID and all old sub-IDs for this player (prevent duplicates)
  const baseId2 = data.playerId.split('_').slice(0, -1).join('_');
  remotePlayersRef.current.forEach((_, key) => {
    // Delete base ID or any sub-ID of the same player
    if (key === baseId2 || key.startsWith(baseId2 + '_')) {
      remotePlayersRef.current.delete(key);
    }
  });

  const existing = remotePlayersRef.current.get(data.playerId);
  remotePlayersRef.current.set(data.playerId, {
    ...(existing || {}),
    name: data.name || 'Player',
    status: 'alive',
    x: data.x,
    y: data.y,
  });
}

// === ТЕСТИ ===

test('Сценарій 1: base-ID потім sub-ID → тільки sub-ID залишається', () => {
  onPlayerJoined({ playerId: 'player_ABC_999', nickname: 'Назар' });
  assert(remotePlayersRef.current.size === 1, 'після joined має бути 1');
  assert(remotePlayersRef.current.has('player_ABC_999'), 'base ID має бути в Map');

  onPlayerMove({ playerId: 'player_ABC_999_0', name: 'Назар', x: 100, y: 200 });
  const keys = [...remotePlayersRef.current.keys()];
  assert(remotePlayersRef.current.size === 1, `після move має бути 1, але є ${remotePlayersRef.current.size}: ${keys.join(', ')}`);
  assert(!remotePlayersRef.current.has('player_ABC_999'), 'base ID має бути видалений');
  assert(remotePlayersRef.current.has('player_ABC_999_0'), 'sub-ID має бути в Map');
});

test('Сценарій 2: тільки sub-ID → один запис', () => {
  onPlayerMove({ playerId: 'player_ABC_999_0', name: 'Назар', x: 100, y: 200 });
  assert(remotePlayersRef.current.size === 1, 'має бути 1 запис');
  assert(remotePlayersRef.current.has('player_ABC_999_0'), 'sub-ID має бути в Map');
});

test('Сценарій 3: local player ігнорується', () => {
  onPlayerJoined({ playerId: 'player_TEST_LOCAL', nickname: 'Я' });
  onPlayerMove({ playerId: 'player_TEST_LOCAL_0', name: 'Я', x: 100, y: 200 });
  assert(remotePlayersRef.current.size === 0, 'local player не має додаватись');
});

test('Сценарій 4: два різних гравці → два записи', () => {
  onPlayerJoined({ playerId: 'player_AAA_111', nickname: 'Гравець1' });
  onPlayerJoined({ playerId: 'player_BBB_222', nickname: 'Гравець2' });
  assert(remotePlayersRef.current.size === 2, `має бути 2 гравці, є ${remotePlayersRef.current.size}`);
});

test('Сценарій 5: ghost player scenario — base+sub одночасно видає 1', () => {
  onPlayerJoined({ playerId: 'player_GHOST_001', nickname: 'Призрак' });
  onPlayerMove({ playerId: 'player_GHOST_001_0', name: 'Призрак', x: 50, y: 50 });
  onPlayerMove({ playerId: 'player_GHOST_001_0', name: 'Призрак', x: 55, y: 55 });
  const keys = [...remotePlayersRef.current.keys()];
  assert(keys.length === 1, `Ghost! Map має ${keys.length} записів: ${keys.join(', ')}`);
  assert(remotePlayersRef.current.has('player_GHOST_001_0'), 'тільки sub-ID має залишитись');
});

test('Сценарій 6: множина sub-ID від одного гравця → тільки останній залишається', () => {
  onPlayerJoined({ playerId: 'player_MULTI_001', nickname: 'Жоня' });
  onPlayerMove({ playerId: 'player_MULTI_001_0', name: 'Жоня', x: 0, y: 0 });
  assert(remotePlayersRef.current.size === 1, 'після першого move: 1 запис');

  onPlayerMove({ playerId: 'player_MULTI_001_1', name: 'Жоня', x: 10, y: 10 });
  const keys1 = [...remotePlayersRef.current.keys()];
  assert(remotePlayersRef.current.size === 1, `після другого move: 1 запис, є ${keys1.join(', ')}`);
  assert(!remotePlayersRef.current.has('player_MULTI_001_0'), '_0 має бути видалений');
  assert(remotePlayersRef.current.has('player_MULTI_001_1'), '_1 має бути в Map');

  onPlayerMove({ playerId: 'player_MULTI_001_2', name: 'Жоня', x: 20, y: 20 });
  const keys2 = [...remotePlayersRef.current.keys()];
  assert(remotePlayersRef.current.size === 1, `після третього move: 1 запис, є ${keys2.join(', ')}`);
  assert(!remotePlayersRef.current.has('player_MULTI_001_1'), '_1 має бути видалений');
  assert(remotePlayersRef.current.has('player_MULTI_001_2'), '_2 має бути в Map');
});

test('Сценарій 7: повторна base-ID подія після sub-ID → видалює sub-ID', () => {
  onPlayerJoined({ playerId: 'player_REJOIN_001', nickname: 'Гравець' });
  onPlayerMove({ playerId: 'player_REJOIN_001_0', name: 'Гравець', x: 100, y: 100 });
  assert(remotePlayersRef.current.has('player_REJOIN_001_0'), 'sub-ID в Map');
  assert(!remotePlayersRef.current.has('player_REJOIN_001'), 'base ID видалений');

  // Гравець переходить в лобі, знову отримуємо base-ID
  onPlayerJoined({ playerId: 'player_REJOIN_001', nickname: 'Гравець' });
  const keys = [...remotePlayersRef.current.keys()];
  assert(remotePlayersRef.current.size === 1, `після повторної joined: 1 запис, є ${keys.join(', ')}`);
  assert(remotePlayersRef.current.has('player_REJOIN_001'), 'base ID повинен бути в Map');
  assert(!remotePlayersRef.current.has('player_REJOIN_001_0'), 'sub-ID повинен бути видалений');
});

test('Сценарій 8: три гравці з різними sub-ID → три записи без дублів', () => {
  onPlayerJoined({ playerId: 'player_P1_001', nickname: 'P1' });
  onPlayerJoined({ playerId: 'player_P2_002', nickname: 'P2' });
  onPlayerJoined({ playerId: 'player_P3_003', nickname: 'P3' });

  onPlayerMove({ playerId: 'player_P1_001_0', name: 'P1', x: 10, y: 10 });
  onPlayerMove({ playerId: 'player_P2_002_1', name: 'P2', x: 20, y: 20 });
  onPlayerMove({ playerId: 'player_P3_003_2', name: 'P3', x: 30, y: 30 });

  assert(remotePlayersRef.current.size === 3, `має бути 3 записи, є ${remotePlayersRef.current.size}`);
  const keys = [...remotePlayersRef.current.keys()];
  assert(keys.includes('player_P1_001_0'), 'P1 sub-ID має бути');
  assert(keys.includes('player_P2_002_1'), 'P2 sub-ID має бути');
  assert(keys.includes('player_P3_003_2'), 'P3 sub-ID має бути');
  assert(!keys.includes('player_P1_001'), 'P1 base ID не має бути');
  assert(!keys.includes('player_P2_002'), 'P2 base ID не має бути');
  assert(!keys.includes('player_P3_003'), 'P3 base ID не має бути');
});

console.log('\n' + '='.repeat(80));
console.log('📊 РЕЗУЛЬТАТ');
console.log('='.repeat(80));
console.log(`✅ ПРОЙШЛО: ${passed}`);
console.log(`❌ ПРОВАЛИЛОСЬ: ${failed}`);
console.log(`📈 ВСЬОГО: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 ВСІ ТЕСТИ ПРОЙШЛИ — GHOST PLAYER ВИПРАВЛЕНО!\n');
  process.exit(0);
} else {
  console.log('\n🚨 ТЕСТИ ПРОВАЛИЛИСЬ — ПРОБЛЕМА ЩЕ ІСНУЄ!\n');
  process.exit(1);
}
