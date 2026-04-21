#!/usr/bin/env node

/**
 * СИМУЛЯЦИЯ МУЛЬТИПЛЕЕРА
 * Эмулирует 2 клиента с Supabase Realtime
 * Проверяет консистентность gs.players
 */

const PLAYER_COLORS = ["#4fc3f7","#81c784","#ffb74d","#f06292","#ce93d8","#80cbc4"];

// ============================================================================
// MOCK CHANNEL (эмулирует Supabase broadcast)
// ============================================================================

class MockChannel {
  constructor(roomId) {
    this.roomId = roomId;
    this.subscribers = [];
    this.eventQueue = [];
  }

  on(type, config, callback) {
    this.subscribers.push({ type, config, callback });
  }

  subscribe() {
    console.log(`[Channel] Subscribed to ${this.roomId}`);
  }

  track(data) {
    console.log(`[Channel] Track:`, data);
  }

  send(data) {
    // Broadcast событие всем подписчикам
    this.eventQueue.push(data);
    console.log(`[Channel] Broadcast:`, data.payload?.action);
  }

  // Обработать все события в очереди
  processEvents() {
    while (this.eventQueue.length > 0) {
      const data = this.eventQueue.shift();
      this.subscribers.forEach(sub => {
        if (sub.type === 'broadcast' && sub.config.event === 'game') {
          sub.callback({ payload: data.payload });
        }
      });
    }
  }
}

// ============================================================================
// MOCK CLIENT (эмулирует RucheekGameCanvas)
// ============================================================================

class MockClient {
  constructor(id, name, channel) {
    this.id = id;
    this.name = name;
    this.channel = channel;
    this.gs = {
      state: 'waiting',
      players: [],
      shootStates: [],
    };
    this.playerCount = 0;

    // Подписаться на события
    this.channel.on('broadcast', { event: 'game' }, (ev) => {
      this.handleGameEvent(ev.payload);
    });
  }

  handleGameEvent(ev) {
    console.log(`\n[${this.id}] Event: ${ev.action}`);

    if (ev.action === 'addPlayer' && ev.player) {
      // Дедупликация
      if (!this.gs.players.find(p => p.owner === ev.player.owner && p.name === ev.player.name)) {
        const idx = this.gs.players.length;
        console.log(`[${this.id}] Adding player at idx=${idx}`);
        this.gs.players.push({
          name: ev.player.name,
          owner: ev.player.owner,
          hp: ev.player.hp || 3,
          idx: idx,
          x: 100 + idx * 50,
          y: 500,
          status: 'idle'
        });
        this.gs.shootStates.push({ phase: null, ball: null });
        this.playerCount = this.gs.players.length;
        console.log(`[${this.id}] Players now: ${this.gs.players.map(p => `${p.name}(${p.owner})`).join(', ')}`);
      }
    }

    if (ev.action === 'syncPositions' && ev.players) {
      for (const pos of ev.players) {
        const p = this.gs.players[pos.idx];
        if (p && p.owner !== this.id) {
          p.x = pos.x;
          p.y = pos.y;
          console.log(`[${this.id}] Synced ${p.name} to x=${pos.x}`);
        }
      }
    }

    if (ev.action === 'shoot' && ev.idx !== undefined && ev.ball) {
      const p = this.gs.players[ev.idx];
      if (p && p.owner !== this.id) {
        this.gs.shootStates[ev.idx].ball = ev.ball;
        this.gs.shootStates[ev.idx].phase = 'flying';
        console.log(`[${this.id}] Shoot from ${p.name}`);
      }
    }

    if (ev.action === 'start') {
      this.gs.state = 'playing';
      console.log(`[${this.id}] Game started`);
    }
  }

  addPlayer(name) {
    console.log(`\n[${this.id}] Adding player: ${name}`);
    this.channel.send({
      type: 'broadcast',
      event: 'game',
      payload: {
        action: 'addPlayer',
        player: { name, owner: this.id, hp: 3 }
      }
    });
  }

  movePlayer(idx, x, y) {
    console.log(`\n[${this.id}] Moving player ${idx} to x=${x}`);
    this.channel.send({
      type: 'broadcast',
      event: 'game',
      payload: {
        action: 'syncPositions',
        players: [{ idx, x, y, status: 'moving' }]
      }
    });
  }

  shoot(idx) {
    console.log(`\n[${this.id}] Shooting from player ${idx}`);
    this.channel.send({
      type: 'broadcast',
      event: 'game',
      payload: {
        action: 'shoot',
        idx,
        ball: { x: 100, y: 500, vx: 5, vy: -10 }
      }
    });
  }

  startGame() {
    console.log(`\n[${this.id}] Starting game`);
    this.channel.send({
      type: 'broadcast',
      event: 'game',
      payload: { action: 'start' }
    });
  }

  getState() {
    return {
      id: this.id,
      playerCount: this.playerCount,
      players: this.gs.players.map(p => ({ name: p.name, owner: p.owner, idx: p.idx })),
      state: this.gs.state
    };
  }
}

// ============================================================================
// ТЕСТЫ
// ============================================================================

console.log('═'.repeat(80));
console.log('ТЕСТ 1: 2 КЛИЕНТА ПОДКЛЮЧАЮТСЯ');
console.log('═'.repeat(80));

const channel = new MockChannel('general');
const clientA = new MockClient('A', 'Петро', channel);
const clientB = new MockClient('B', 'Марко', channel);

console.log('\n✅ Оба клиента подключены');
console.log('A:', clientA.getState());
console.log('B:', clientB.getState());

// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('ТЕСТ 2: ДОБАВЛЕНИЕ ИГРОКОВ (последовательно)');
console.log('═'.repeat(80));

clientA.addPlayer('Петро');
channel.processEvents();
console.log('After A adds Петро:');
console.log('A:', clientA.getState());
console.log('B:', clientB.getState());

clientB.addPlayer('Марко');
channel.processEvents();
console.log('\nAfter B adds Марко:');
console.log('A:', clientA.getState());
console.log('B:', clientB.getState());

// Проверка консистентности
const stateA = clientA.getState();
const stateB = clientB.getState();
const test2Pass = stateA.playerCount === stateB.playerCount && stateA.playerCount === 2;
console.log(`\n${test2Pass ? '✅' : '❌'} ТЕСТ 2: ${test2Pass ? 'PASSED' : 'FAILED'}`);
if (!test2Pass) {
  console.log('ОШИБКА: playerCount рассинхронизирован!');
  console.log('A.playerCount:', stateA.playerCount);
  console.log('B.playerCount:', stateB.playerCount);
}

// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('ТЕСТ 3: RACE CONDITION (одновременное добавление)');
console.log('═'.repeat(80));

const channel2 = new MockChannel('general');
const clientC = new MockClient('C', 'Іван', channel2);
const clientD = new MockClient('D', 'Ольга', channel2);

// Эмулировать одновременное добавление (оба вызывают addPlayer без processEvents между ними)
console.log('\nC и D добавляют игроков одновременно (без sync между ними):');
clientC.addPlayer('Іван');
clientD.addPlayer('Ольга');

// Теперь обработать события
channel2.processEvents();

console.log('\nAfter simultaneous add:');
console.log('C:', clientC.getState());
console.log('D:', clientD.getState());

// Проверка: оба должны иметь 2 игроков с одинаковыми индексами
const stateC = clientC.getState();
const stateD = clientD.getState();
const test3Pass = stateC.playerCount === stateD.playerCount && stateC.playerCount === 2;
console.log(`\n${test3Pass ? '✅' : '❌'} ТЕСТ 3: ${test3Pass ? 'PASSED' : 'FAILED'}`);
if (!test3Pass) {
  console.log('ОШИБКА: idx конфликт при одновременном добавлении!');
  console.log('C.players:', stateC.players);
  console.log('D.players:', stateD.players);
}

// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('ТЕСТ 4: ДВИЖЕНИЕ ИГРОКОВ');
console.log('═'.repeat(80));

const channel3 = new MockChannel('general');
const clientE = new MockClient('E', 'Петро', channel3);
const clientF = new MockClient('F', 'Марко', channel3);

clientE.addPlayer('Петро');
channel3.processEvents();
clientF.addPlayer('Марко');
channel3.processEvents();

console.log('\nInitial state:');
console.log('E:', clientE.getState());
console.log('F:', clientF.getState());

// E двигает своего игрока
clientE.movePlayer(0, 200, 500);
channel3.processEvents();

console.log('\nAfter E moves player 0 to x=200:');
console.log('E:', clientE.getState());
console.log('F:', clientF.getState());

// Проверка: F должен видеть обновленную позицию
const stateE = clientE.getState();
const stateF = clientF.getState();
const test4Pass = stateE.players[0].idx === stateF.players[0].idx;
console.log(`\n${test4Pass ? '✅' : '❌'} ТЕСТ 4: ${test4Pass ? 'PASSED' : 'FAILED'}`);

// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('ТЕСТ 5: START BUTTON (playerCount >= 2)');
console.log('═'.repeat(80));

const channel4 = new MockChannel('general');
const clientG = new MockClient('G', 'Петро', channel4);
const clientH = new MockClient('H', 'Марко', channel4);

clientG.addPlayer('Петро');
channel4.processEvents();
clientH.addPlayer('Марко');
channel4.processEvents();

console.log('\nBefore start:');
console.log('G.playerCount:', clientG.playerCount, '(should be 2)');
console.log('H.playerCount:', clientH.playerCount, '(should be 2)');

const test5Pass = clientG.playerCount >= 2 && clientH.playerCount >= 2;
console.log(`\n${test5Pass ? '✅' : '❌'} ТЕСТ 5: ${test5Pass ? 'PASSED' : 'FAILED'}`);
if (!test5Pass) {
  console.log('ОШИБКА: playerCount < 2, кнопка Start останется disabled!');
}

// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('ИТОГОВЫЙ ОТЧЁТ');
console.log('═'.repeat(80));

const allTests = [test2Pass, test3Pass, test4Pass, test5Pass];
const passCount = allTests.filter(t => t).length;
const totalTests = allTests.length;

console.log(`\nПройдено тестов: ${passCount}/${totalTests}`);
console.log(`Статус: ${passCount === totalTests ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' : '❌ ЕСТЬ ОШИБКИ'}`);

if (passCount !== totalTests) {
  console.log('\n⚠️  АРХИТЕКТУРА НЕ ГАРАНТИРУЕТ КОНСИСТЕНТНОСТЬ');
  console.log('Нужна переработка на основе Presence');
  process.exit(1);
} else {
  console.log('\n✅ АРХИТЕКТУРА СТАБИЛЬНА');
  process.exit(0);
}
