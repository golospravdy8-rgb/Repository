#!/usr/bin/env node

/**
 * РАСШИРЕННАЯ СИМУЛЯЦИЯ МУЛЬТИПЛЕЕРА
 * С асинхронностью, задержками и edge cases
 */

class AsyncMockChannel {
  constructor(roomId) {
    this.roomId = roomId;
    this.subscribers = [];
    this.eventQueue = [];
    this.latency = 50; // ms
  }

  on(type, config, callback) {
    this.subscribers.push({ type, config, callback });
  }

  subscribe() {
    console.log(`[Channel] Subscribed to ${this.roomId}`);
  }

  track(data) {}

  send(data) {
    // Асинхронная доставка с задержкой
    setTimeout(() => {
      this.subscribers.forEach(sub => {
        if (sub.type === 'broadcast' && sub.config.event === 'game') {
          sub.callback({ payload: data.payload });
        }
      });
    }, Math.random() * this.latency);
  }
}

class AsyncClient {
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
    this.eventLog = [];

    this.channel.on('broadcast', { event: 'game' }, (ev) => {
      this.handleGameEvent(ev.payload);
    });
  }

  handleGameEvent(ev) {
    this.eventLog.push({ action: ev.action, time: Date.now() });

    if (ev.action === 'addPlayer' && ev.player) {
      if (!this.gs.players.find(p => p.owner === ev.player.owner && p.name === ev.player.name)) {
        const idx = this.gs.players.length;
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
      }
    }

    if (ev.action === 'syncPositions' && ev.players) {
      for (const pos of ev.players) {
        const p = this.gs.players[pos.idx];
        if (p && p.owner !== this.id) {
          p.x = pos.x;
          p.y = pos.y;
        }
      }
    }

    if (ev.action === 'shoot' && ev.idx !== undefined && ev.ball) {
      const p = this.gs.players[ev.idx];
      if (p && p.owner !== this.id) {
        this.gs.shootStates[ev.idx].ball = ev.ball;
        this.gs.shootStates[ev.idx].phase = 'flying';
      }
    }

    if (ev.action === 'start') {
      this.gs.state = 'playing';
    }
  }

  addPlayer(name) {
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
// ТЕСТ 6: АСИНХРОННОЕ ДОБАВЛЕНИЕ (реалистичное)
// ============================================================================

async function test6() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 6: АСИНХРОННОЕ ДОБАВЛЕНИЕ (с задержками)');
  console.log('═'.repeat(80));

  const channel = new AsyncMockChannel('general');
  const clientA = new AsyncClient('A', 'Петро', channel);
  const clientB = new AsyncClient('B', 'Марко', channel);

  clientA.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 100));
  clientB.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 200));

  console.log('\nAfter async adds:');
  console.log('A:', clientA.getState());
  console.log('B:', clientB.getState());

  const stateA = clientA.getState();
  const stateB = clientB.getState();
  const pass = stateA.playerCount === stateB.playerCount && stateA.playerCount === 2;
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 6: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

// ============================================================================
// ТЕСТ 7: БЫСТРЫЕ СОБЫТИЯ (race condition с задержками)
// ============================================================================

async function test7() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 7: БЫСТРЫЕ СОБЫТИЯ (addPlayer + shoot одновременно)');
  console.log('═'.repeat(80));

  const channel = new AsyncMockChannel('general');
  const clientC = new AsyncClient('C', 'Іван', channel);
  const clientD = new AsyncClient('D', 'Ольга', channel);

  // C добавляет игрока
  clientC.addPlayer('Іван');
  await new Promise(r => setTimeout(r, 50));

  // D добавляет игрока
  clientD.addPlayer('Ольга');
  await new Promise(r => setTimeout(r, 50));

  // C сразу же стреляет (может быть до того как D получит addPlayer)
  clientC.shoot(0);
  await new Promise(r => setTimeout(r, 200));

  console.log('\nAfter fast events:');
  console.log('C:', clientC.getState());
  console.log('D:', clientD.getState());

  const stateC = clientC.getState();
  const stateD = clientD.getState();
  const pass = stateC.playerCount === stateD.playerCount;
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 7: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

// ============================================================================
// ТЕСТ 8: ПЕРЕПОДКЛЮЧЕНИЕ (новый клиент присоединяется к игре)
// ============================================================================

async function test8() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 8: ПЕРЕПОДКЛЮЧЕНИЕ (новый клиент присоединяется)');
  console.log('═'.repeat(80));

  const channel = new AsyncMockChannel('general');
  const clientE = new AsyncClient('E', 'Петро', channel);
  const clientF = new AsyncClient('F', 'Марко', channel);

  // E и F добавляют игроков
  clientE.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));
  clientF.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 100));

  console.log('\nInitial state (E and F):');
  console.log('E:', clientE.getState());
  console.log('F:', clientF.getState());

  // Новый клиент G присоединяется ПОСЛЕ того как E и F уже добавили игроков
  const clientG = new AsyncClient('G', 'Ольга', channel);
  await new Promise(r => setTimeout(r, 150));

  console.log('\nAfter G joins (should see E and F players):');
  console.log('G:', clientG.getState());

  // G должен видеть 2 игроков (Петро и Марко)
  const stateG = clientG.getState();
  const pass = stateG.playerCount === 2;
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 8: ${pass ? 'PASSED' : 'FAILED'}`);
  if (!pass) {
    console.log('⚠️  ПРОБЛЕМА: Новый клиент не видит существующих игроков!');
    console.log('Это происходит потому что нет механизма fullState при подключении');
  }
  return pass;
}

// ============================================================================
// ТЕСТ 9: ДВИЖЕНИЕ ПОСЛЕ ДОБАВЛЕНИЯ
// ============================================================================

async function test9() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 9: ДВИЖЕНИЕ ПОСЛЕ ДОБАВЛЕНИЯ');
  console.log('═'.repeat(80));

  const channel = new AsyncMockChannel('general');
  const clientH = new AsyncClient('H', 'Петро', channel);
  const clientI = new AsyncClient('I', 'Марко', channel);

  clientH.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));
  clientI.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 100));

  // H двигает своего игрока
  clientH.movePlayer(0, 200, 500);
  await new Promise(r => setTimeout(r, 150));

  console.log('\nAfter H moves player:');
  console.log('H:', clientH.getState());
  console.log('I:', clientI.getState());

  const stateH = clientH.getState();
  const stateI = clientI.getState();
  const pass = stateH.playerCount === stateI.playerCount && stateH.playerCount === 2;
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 9: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

// ============================================================================
// ТЕСТ 10: СТАРТ ИГРЫ (playerCount должен быть >= 2)
// ============================================================================

async function test10() {
  console.log('\n' + '═'.repeat(80));
  console.log('ТЕСТ 10: СТАРТ ИГРЫ (playerCount >= 2)');
  console.log('═'.repeat(80));

  const channel = new AsyncMockChannel('general');
  const clientJ = new AsyncClient('J', 'Петро', channel);
  const clientK = new AsyncClient('K', 'Марко', channel);

  clientJ.addPlayer('Петро');
  await new Promise(r => setTimeout(r, 50));
  clientK.addPlayer('Марко');
  await new Promise(r => setTimeout(r, 100));

  console.log('\nBefore start:');
  console.log('J.playerCount:', clientJ.playerCount, '(should be 2)');
  console.log('K.playerCount:', clientK.playerCount, '(should be 2)');

  const pass = clientJ.playerCount >= 2 && clientK.playerCount >= 2;
  console.log(`\n${pass ? '✅' : '❌'} ТЕСТ 10: ${pass ? 'PASSED' : 'FAILED'}`);
  return pass;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const results = [];

  results.push(await test6());
  results.push(await test7());
  results.push(await test8());
  results.push(await test9());
  results.push(await test10());

  console.log('\n' + '═'.repeat(80));
  console.log('ИТОГОВЫЙ ОТЧЁТ (АСИНХРОННЫЕ ТЕСТЫ)');
  console.log('═'.repeat(80));

  const passCount = results.filter(r => r).length;
  const totalTests = results.length;

  console.log(`\nПройдено тестов: ${passCount}/${totalTests}`);
  console.log(`Статус: ${passCount === totalTests ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' : '❌ ЕСТЬ ОШИБКИ'}`);

  if (passCount !== totalTests) {
    console.log('\n⚠️  ПРОБЛЕМЫ НАЙДЕНЫ:');
    if (!results[2]) {
      console.log('- ТЕСТ 8 FAILED: Новый клиент не получает состояние существующих игроков');
      console.log('  Причина: нет механизма fullState при подключении');
      console.log('  Решение: реализовать Presence или улучшить fullState логику');
    }
  }

  process.exit(passCount === totalTests ? 0 : 1);
}

main();
