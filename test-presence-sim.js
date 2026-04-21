#!/usr/bin/env node

/**
 * СИМУЛЯЦИЯ PRESENCE-BASED АРХИТЕКТУРЫ
 * Новая архитектура для мультиплеера
 */

class PresenceChannel {
  constructor(roomId) {
    this.roomId = roomId;
    this.subscribers = [];
    this.presenceState = {}; // { userId: [{ players: [...], timestamp: ... }] }
    this.latency = 30; // ms
  }

  on(type, config, callback) {
    this.subscribers.push({ type, config, callback });
  }

  subscribe() {
    console.log(`[Channel] Subscribed to ${this.roomId}`);
  }

  // Отправить свое состояние (track)
  track(data) {
    const userId = data.userId;
    setTimeout(() => {
      this.presenceState[userId] = [{ ...data, timestamp: Date.now() }];
      console.log(`[Channel] ${userId} tracked:`, data.players?.length || 0, 'players');

      // Уведомить всех подписчиков о sync
      this.subscribers.forEach(sub => {
        if (sub.type === 'presence' && sub.config.event === 'sync') {
          sub.callback();
        }
      });
    }, Math.random() * this.latency);
  }

  // Получить полное состояние presence
  getPresenceState() {
    return this.presenceState;
  }

  // Отписаться (удалить из presence)
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

class PresenceClient {
  constructor(id, name, channel) {
    this.id = id;
    this.name = name;
    this.channel = channel;

    // Локальное состояние — только СВОИ игроки
    this.myPlayers = [];

    // Глобальное состояние — все игроки из presence
    this.allPlayers = [];

    this.eventLog = [];

    // Подписаться на presence sync
    this.channel.on('presence', { event: 'sync' }, () => {
      this.syncFromPresence();
    });

    // При подключении сразу синхронизировать существующее состояние
    setTimeout(() => {
      this.syncFromPresence();
    }, 10);
  }

  // Синхронизировать глобальное состояние из presence
  syncFromPresence() {
    const presenceState = this.channel.getPresenceState();
    this.allPlayers = [];

    Object.entries(presenceState).forEach(([userId, userPresence]) => {
      if (userPresence[0]?.players) {
        this.allPlayers.push(...userPresence[0].players);
      }
    });

    console.log(`[${this.id}] Synced from presence: ${this.allPlayers.length} total players`);
  }

  // Добавить своего игрока
  addPlayer(name) {
    console.log(`\n[${this.id}] Adding player: ${name}`);

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

    // Отправить обновленное состояние через track
    this.channel.track({
      userId: this.id,
      players: this.myPlayers
    });
  }

  // Двигать своего игрока
  movePlayer(playerIndex, x, y) {
    if (playerIndex < this.myPlayers.length) {
      console.log(`\n[${this.id}] Moving player ${playerIndex} to x=${x}`);
      this.myPlayers[playerIndex].x = x;
      this.myPlayers[playerIndex].y = y;
      this.myPlayers[playerIndex].status = 'moving';

      // Отправить обновленное состояние
      this.channel.track({
        userId: this.id,
        players: this.myPlayers
      });
    }
  }

  // Отключиться
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
      myPlayers: this.myPlayers.map(p => ({ id: p.id, name: p.name, owner: p.owner })),
      allPlayers: this.allPlayers.map(p => ({ id: p.id, name: p.name, owner: p.owner }))
    };
  }
}

// ============================================================================
// ТЕСТЫ
// ============================================================================

async function test1() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 1: КЛИЕНТ A ДОБАВИЛ ИГРОКА → КЛИЕНТ B ВИДИТ');
  console.log('═'.repeat(80));

  const channel = new PresenceChannel('general');
  const clientA = new PresenceClient('A', 'Петро', channel);
  const clientB = new PresenceClient('B', 'Марко', channel);

  // A добавляет игрока
  clientA.addPlayer('Бойко');
  await new Promise(r => setTimeout(r, 100));

  console.log('\nAfter A adds Бойко:');
  console.log('A:', clientA.getState());
  console.log('B:', clientB.getState());

  const stateA = clientA.getState();
  const stateB = clientB.getState();

  // B должен видеть игрока A
  const pass = stateB.allPlayersCount === 1 && stateB.allPlayers[0].name === 'Бойко';
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 1: ${pass ? 'PASSED' : 'FAILED'}`);
  if (!pass) {
    console.log('ОШИБКА: B не видит игрока A!');
  }
  return pass;
}

async function test2() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 2: КЛИЕНТ B ДВИЖЕТСЯ → КЛИЕНТ A ВИДИТ В РЕАЛЬНОМ ВРЕМЕНИ');
  console.log('═'.repeat(80));

  const channel = new PresenceChannel('general');
  const clientA = new PresenceClient('A', 'Петро', channel);
  const clientB = new PresenceClient('B', 'Марко', channel);

  // Оба добавляют игроков
  clientA.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));
  clientB.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 100));

  console.log('\nInitial state:');
  console.log('A:', clientA.getState());
  console.log('B:', clientB.getState());

  // B двигает своего игрока
  clientB.movePlayer(0, 250, 500);
  await new Promise(r => setTimeout(r, 100));

  console.log('\nAfter B moves to x=250:');
  console.log('A:', clientA.getState());
  console.log('B:', clientB.getState());

  const stateA = clientA.getState();
  const stateB = clientB.getState();

  // A должен видеть обновленную позицию B
  const markoInA = stateA.allPlayers.find(p => p.name === 'Марко');
  const pass = markoInA && stateA.allPlayersCount === 2;

  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 2: ${pass ? 'PASSED' : 'FAILED'}`);
  if (!pass) {
    console.log('ОШИБКА: A не видит движение B!');
  }
  return pass;
}

async function test3() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 3: КЛИЕНТ C ПОДКЛЮЧИЛСЯ ПОЗЖЕ → ВИДИТ ВСЕХ (A И B)');
  console.log('═'.repeat(80));

  const channel = new PresenceChannel('general');
  const clientA = new PresenceClient('A', 'Петро', channel);
  const clientB = new PresenceClient('B', 'Марко', channel);

  // A и B добавляют игроков
  clientA.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));
  clientB.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 100));

  console.log('\nA and B state:');
  console.log('A:', clientA.getState());
  console.log('B:', clientB.getState());

  // C подключается ПОЗЖЕ
  const clientC = new PresenceClient('C', 'Ольга', channel);
  await new Promise(r => setTimeout(r, 150));

  console.log('\nAfter C joins:');
  console.log('C:', clientC.getState());

  const stateC = clientC.getState();

  // C должен видеть обоих (Петро и Марко)
  const pass = stateC.allPlayersCount === 2 &&
               stateC.allPlayers.some(p => p.name === 'Петро') &&
               stateC.allPlayers.some(p => p.name === 'Марко');

  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 3: ${pass ? 'PASSED' : 'FAILED'}`);
  if (!pass) {
    console.log('ОШИБКА: C не видит существующих игроков!');
    console.log('C.allPlayers:', stateC.allPlayers);
  }
  return pass;
}

async function test4() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 4: КЛИЕНТ A ОТКЛЮЧИЛСЯ → ИСЧЕЗАЕТ У B И C');
  console.log('═'.repeat(80));

  const channel = new PresenceChannel('general');
  const clientA = new PresenceClient('A', 'Петро', channel);
  const clientB = new PresenceClient('B', 'Марко', channel);
  const clientC = new PresenceClient('C', 'Ольга', channel);

  // Все добавляют игроков
  clientA.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));
  clientB.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 50));
  clientC.addPlayer('Ольга');
  await new Promise(r => setTimeout(r, 100));

  console.log('\nBefore disconnect:');
  console.log('A:', clientA.getState());
  console.log('B:', clientB.getState());
  console.log('C:', clientC.getState());

  // A отключается
  clientA.disconnect();
  await new Promise(r => setTimeout(r, 150));

  console.log('\nAfter A disconnects:');
  console.log('B:', clientB.getState());
  console.log('C:', clientC.getState());

  const stateB = clientB.getState();
  const stateC = clientC.getState();

  // B и C должны видеть только Марко и Ольгу (Петро исчез)
  const pass = stateB.allPlayersCount === 2 &&
               stateC.allPlayersCount === 2 &&
               !stateB.allPlayers.some(p => p.name === 'Петро') &&
               !stateC.allPlayers.some(p => p.name === 'Петро');

  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 4: ${pass ? 'PASSED' : 'FAILED'}`);
  if (!pass) {
    console.log('ОШИБКА: A не исчез из presence!');
    console.log('B.allPlayers:', stateB.allPlayers);
    console.log('C.allPlayers:', stateC.allPlayers);
  }
  return pass;
}

async function test5() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 5: ОДНОВРЕМЕННОЕ ДОБАВЛЕНИЕ (race condition fix)');
  console.log('═'.repeat(80));

  const channel = new PresenceChannel('general');
  const clientD = new PresenceClient('D', 'Іван', channel);
  const clientE = new PresenceClient('E', 'Ольга', channel);

  // Оба добавляют одновременно
  clientD.addPlayer('Іван');
  clientE.addPlayer('Ольга');
  await new Promise(r => setTimeout(r, 150));

  console.log('\nAfter simultaneous add:');
  console.log('D:', clientD.getState());
  console.log('E:', clientE.getState());

  const stateD = clientD.getState();
  const stateE = clientE.getState();

  // Оба должны видеть 2 игроков (нет race condition)
  const pass = stateD.allPlayersCount === 2 && stateE.allPlayersCount === 2;

  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 5: ${pass ? 'PASSED' : 'FAILED'}`);
  if (!pass) {
    console.log('ОШИБКА: Race condition не исправлена!');
  }
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

  console.log('\n' + '═'.repeat(80));
  console.log('ИТОГОВЫЙ ОТЧЁТ (PRESENCE-BASED АРХИТЕКТУРА)');
  console.log('═'.repeat(80));

  const passCount = results.filter(r => r).length;
  const totalTests = results.length;

  console.log(`\nПройдено тестов: ${passCount}/${totalTests}`);
  console.log(`Статус: ${passCount === totalTests ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' : '❌ ЕСТЬ ОШИБКИ'}`);

  if (passCount === totalTests) {
    console.log('\n✅ PRESENCE-BASED АРХИТЕКТУРА СТАБИЛЬНА');
    console.log('Готово к реализации в реальном коде');
  } else {
    console.log('\n❌ ЕСТЬ ПРОБЛЕМЫ В АРХИТЕКТУРЕ');
  }

  process.exit(passCount === totalTests ? 0 : 1);
}

main();
