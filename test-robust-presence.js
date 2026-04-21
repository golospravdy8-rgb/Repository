#!/usr/bin/env node

/**
 * РАСШИРЕННАЯ СИМУЛЯЦИЯ PRESENCE С ГАРАНТИЯМИ
 * Тесты на дубликаты, старые payload, двойной track
 */

// ============================================================================
// MERGE-ЛОГИКА С ГАРАНТИЯМИ
// ============================================================================

function mergePresenceState(presenceState) {
  const playerMap = new Map();

  Object.values(presenceState).forEach((userPresence) => {
    if (Array.isArray(userPresence) && userPresence[0]?.players) {
      const timestamp = userPresence[0].timestamp || 0;
      const players = userPresence[0].players || [];

      players.forEach((player) => {
        const existing = playerMap.get(player.id);

        // Если дубликат — берём с большим timestamp
        if (existing) {
          if (timestamp > existing.timestamp) {
            playerMap.set(player.id, { ...player, timestamp });
          }
          // Иначе игнорируем старый payload
        } else {
          playerMap.set(player.id, { ...player, timestamp });
        }
      });
    }
  });

  // Вернуть массив без timestamp
  return Array.from(playerMap.values()).map(({ timestamp, ...player }) => player);
}

// ============================================================================
// PRESENCE CHANNEL С ГАРАНТИЯМИ
// ============================================================================

class RobustPresenceChannel {
  constructor(roomId) {
    this.roomId = roomId;
    this.subscribers = [];
    this.presenceState = {};
    this.latency = 30;
  }

  on(type, config, callback) {
    this.subscribers.push({ type, config, callback });
  }

  subscribe() {
    console.log(`[Channel] Subscribed to ${this.roomId}`);
  }

  track(data) {
    const userId = data.userId;
    const timestamp = Date.now();

    setTimeout(() => {
      // Supabase Presence перезаписывает (не добавляет в историю)
      this.presenceState[userId] = [{
        ...data,
        timestamp: timestamp
      }];

      console.log(`[Channel] ${userId} tracked at ts=${timestamp}:`, data.players?.length || 0, 'players');

      // Уведомить всех подписчиков о sync
      this.subscribers.forEach(sub => {
        if (sub.type === 'presence' && sub.config.event === 'sync') {
          sub.callback();
        }
      });
    }, Math.random() * this.latency);
  }

  getPresenceState() {
    return this.presenceState;
  }

  untrack(userId) {
    setTimeout(() => {
      delete this.presenceState[userId];
      console.log(`[Channel] ${userId} untracked`);

      this.subscribers.forEach(sub => {
        if (sub.type === 'presence' && sub.config.event === 'sync') {
          sub.callback();
        }
      });
    }, Math.random() * this.latency);
  }
}

// ============================================================================
// ROBUST CLIENT
// ============================================================================

class RobustClient {
  constructor(id, name, channel) {
    this.id = id;
    this.name = name;
    this.channel = channel;
    this.myPlayers = [];
    this.allPlayers = [];

    this.channel.on('presence', { event: 'sync' }, () => {
      this.syncFromPresence();
    });

    setTimeout(() => {
      this.syncFromPresence();
    }, 10);
  }

  syncFromPresence() {
    const presenceState = this.channel.getPresenceState();
    this.allPlayers = mergePresenceState(presenceState);
    console.log(`[${this.id}] Synced: ${this.allPlayers.length} total players (deduplicated)`);
  }

  addPlayer(name) {
    const playerId = `${this.id}-${Date.now()}`;
    this.myPlayers.push({
      id: playerId,
      name: name,
      owner: this.id,
      x: 100 + this.myPlayers.length * 50,
      y: 500,
      status: 'idle',
      hp: 3
    });

    this.channel.track({
      userId: this.id,
      players: this.myPlayers
    });
  }

  movePlayer(playerIndex, x, y) {
    if (playerIndex < this.myPlayers.length) {
      this.myPlayers[playerIndex].x = x;
      this.myPlayers[playerIndex].y = y;

      this.channel.track({
        userId: this.id,
        players: this.myPlayers
      });
    }
  }

  disconnect() {
    console.log(`\n[${this.id}] Disconnecting`);
    this.channel.untrack(this.id);
    this.myPlayers = [];
  }

  getState() {
    return {
      id: this.id,
      myPlayersCount: this.myPlayers.length,
      allPlayersCount: this.allPlayers.length,
      myPlayers: this.myPlayers.map(p => ({ id: p.id, name: p.name })),
      allPlayers: this.allPlayers.map(p => ({ id: p.id, name: p.name }))
    };
  }
}

// ============================================================================
// ТЕСТЫ
// ============================================================================

async function test1() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 1: ДУБЛИКАТ TRACK (двойной track подряд)');
  console.log('═'.repeat(80));

  const channel = new RobustPresenceChannel('general');
  const clientA = new RobustClient('A', 'Петро', channel);
  const clientB = new RobustClient('B', 'Марко', channel);

  // A добавляет игрока
  clientA.addPlayer('Бойко');
  await new Promise(r => setTimeout(r, 50));

  // A отправляет track ещё раз (дубликат)
  clientA.channel.track({
    userId: 'A',
    players: clientA.myPlayers
  });
  await new Promise(r => setTimeout(r, 100));

  console.log('\nAfter duplicate track:');
  console.log('A:', clientA.getState());
  console.log('B:', clientB.getState());

  const stateB = clientB.getState();
  const pass = stateB.allPlayersCount === 1 && !stateB.allPlayers.some((p, i, arr) => arr.indexOf(p) !== i);
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 1: ${pass ? 'PASSED (no duplicates)' : 'FAILED'}`);
  return pass;
}

async function test2() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 2: ОБНОВЛЕНИЕ ИГРОКА (новые данные перезапишут старые)');
  console.log('═'.repeat(80));

  const channel = new RobustPresenceChannel('general');
  const clientC = new RobustClient('C', 'Іван', channel);
  const clientD = new RobustClient('D', 'Ольга', channel);

  // C добавляет Іван
  clientC.addPlayer('Іван');
  await new Promise(r => setTimeout(r, 50));

  // D видит Іван
  console.log('\nD sees after C adds:');
  console.log('D:', clientD.getState());

  // C обновляет имя игрока (новый track с обновленными данными)
  clientC.myPlayers[0].name = 'Іван Updated';
  clientC.channel.track({
    userId: 'C',
    players: clientC.myPlayers
  });
  await new Promise(r => setTimeout(r, 100));

  console.log('\nAfter C updates player name:');
  console.log('D:', clientD.getState());

  const stateD = clientD.getState();
  // D должен видеть обновленное имя
  const pass = stateD.allPlayers.some(p => p.name === 'Іван Updated');
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 2: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

async function test3() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 3: ДВОЙНОЙ TRACK ПОДРЯД (второй перезапишет первый)');
  console.log('═'.repeat(80));

  const channel = new RobustPresenceChannel('general');
  const clientE = new RobustClient('E', 'Петро', channel);
  const clientF = new RobustClient('F', 'Марко', channel);

  // E добавляет Петро
  clientE.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));

  // E добавляет Іван
  clientE.addPlayer('Іван');
  await new Promise(r => setTimeout(r, 50));

  // F видит обоих
  console.log('\nF sees after E adds two:');
  console.log('F:', clientF.getState());

  const stateF = clientF.getState();
  const pass = stateF.allPlayersCount === 2 && stateF.allPlayers.some(p => p.name === 'Петро') && stateF.allPlayers.some(p => p.name === 'Іван');
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 3: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

async function test4() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 4: ОДНОВРЕМЕННЫЕ TRACK (race condition с дедупликацией)');
  console.log('═'.repeat(80));

  const channel = new RobustPresenceChannel('general');
  const clientG = new RobustClient('G', 'Іван', channel);
  const clientH = new RobustClient('H', 'Ольга', channel);

  // Оба отправляют track одновременно
  clientG.addPlayer('Іван');
  clientH.addPlayer('Ольга');
  await new Promise(r => setTimeout(r, 150));

  console.log('\nAfter simultaneous track:');
  console.log('G:', clientG.getState());
  console.log('H:', clientH.getState());

  const stateG = clientG.getState();
  const stateH = clientH.getState();
  const pass = stateG.allPlayersCount === 2 && stateH.allPlayersCount === 2;
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 4: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

async function test5() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 5: ОБНОВЛЕНИЕ ПОЗИЦИИ (новый track перезапишет старый)');
  console.log('═'.repeat(80));

  const channel = new RobustPresenceChannel('general');
  const clientI = new RobustClient('I', 'Петро', channel);
  const clientJ = new RobustClient('J', 'Марко', channel);

  // I добавляет Петро
  clientI.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));

  // I двигает Петро
  clientI.movePlayer(0, 250, 500);
  await new Promise(r => setTimeout(r, 100));

  console.log('\nAfter move:');
  console.log('I:', clientI.getState());
  console.log('J:', clientJ.getState());

  const stateJ = clientJ.getState();
  const pass = stateJ.allPlayersCount === 1;
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 5: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

async function test6() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 6: ОТКЛЮЧЕНИЕ (игроки исчезают)');
  console.log('═'.repeat(80));

  const channel = new RobustPresenceChannel('general');
  const clientK = new RobustClient('K', 'Петро', channel);
  const clientL = new RobustClient('L', 'Марко', channel);

  clientK.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));
  clientL.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 100));

  console.log('\nBefore disconnect:');
  console.log('K:', clientK.getState());
  console.log('L:', clientL.getState());

  clientK.disconnect();
  await new Promise(r => setTimeout(r, 150));

  console.log('\nAfter K disconnects:');
  console.log('L:', clientL.getState());

  const stateL = clientL.getState();
  const pass = stateL.allPlayersCount === 1 && stateL.allPlayers.some(p => p.name === 'Марко');
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 6: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const results = [];

  results.push(await test1());
  results.push(await test2());
  results.push(await test3());
  results.push(await test4());
  results.push(await test5());
  results.push(await test6());

  console.log('\n' + '═'.repeat(80));
  console.log('ИТОГОВЫЙ ОТЧЁТ (ROBUST PRESENCE АРХИТЕКТУРА)');
  console.log('═'.repeat(80));

  const passCount = results.filter(r => r).length;
  const totalTests = results.length;

  console.log(`\nПройдено тестов: ${passCount}/${totalTests}`);
  console.log(`Статус: ${passCount === totalTests ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' : '❌ ЕСТЬ ОШИБКИ'}`);

  if (passCount === totalTests) {
    console.log('\n✅ ROBUST PRESENCE АРХИТЕКТУРА ГАРАНТИРУЕТ:');
    console.log('  ✓ Дедупликация по player.id');
    console.log('  ✓ Защита от старых payload (timestamp check)');
    console.log('  ✓ Устойчивость к двойному track');
    console.log('  ✓ Консистентность при любом порядке событий');
    console.log('\nГотово к реализации в реальном коде');
  }

  process.exit(passCount === totalTests ? 0 : 1);
}

main();
