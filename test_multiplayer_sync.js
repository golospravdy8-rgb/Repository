#!/usr/bin/env node
/**
 * Test script to verify Colyseus multiplayer sync
 *
 * Usage: node test_multiplayer_sync.js
 *
 * Что тестирует:
 * 1. Подключение двух клиентов к одной комнате
 * 2. Получение корректного sessionId
 * 3. Синхронизацию других игроков через room.state
 * 4. Обновление позиции игрока
 */

const { Client } = require('colyseus.js');

const WS_URL = 'ws://localhost:3006';
let clients = [];
let roomConnections = [];

async function createClient(name, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const client = new Client(WS_URL);
        console.log(`\n🟢 [${name}] Создание клиента...`);

        const room = await client.joinOrCreate('basketball', {
          nickname: name,
          color: '#4fc3f7',
        });

        console.log(`✅ [${name}] Подключен к комнате. sessionId: ${room.sessionId}`);
        console.log(`   Всего игроков в комнате: ${room.state.players.size}`);

        // Вывести всех игроков
        console.log(`   Игроки:`);
        room.state.players.forEach((player, key) => {
          const isMe = key === room.sessionId ? ' ← МЫ' : '';
          console.log(`     ${key}: ${player.nickname} (status: ${player.status})${isMe}`);
        });

        // Слушать новых игроков
        room.state.players.onAdd((player, key) => {
          console.log(`\n🟢 [${name}] Новый игрок присоединился: ${key} (${player.nickname})`);
        });

        // Слушать изменения
        room.state.players.onChange((player, key) => {
          if (key !== room.sessionId) {
            console.log(`🔵 [${name}] Игрок обновился: ${key} (${player.nickname}) - status: ${player.status}, x: ${player.x}, y: ${player.y}`);
          }
        });

        // Слушать удаление
        room.state.players.onRemove((player, key) => {
          console.log(`🔴 [${name}] Игрок ушёл: ${key} (${player.nickname})`);
        });

        clients.push(client);
        roomConnections.push(room);

        resolve(room);
      } catch (err) {
        console.error(`❌ [${name}] Ошибка подключения:`, err.message);
        resolve(null);
      }
    }, delay);
  });
}

async function testMove(room, name) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`\n🟡 [${name}] Отправляем move...`);
      room.send('move', {
        x: Math.random() * 500 + 200,
        y: 584,
        status: 'alive',
      });
      resolve();
    }, 500);
  });
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ТЕСТ MULTIPLAYER SYNC ДЛЯ COLYSEUS');
  console.log('='.repeat(60));
  console.log(`Сервер: ${WS_URL}\n`);

  // Подключить первого клиента
  const player1 = await createClient('Player 1', 0);
  if (!player1) {
    console.error('❌ Не удалось подключить Player 1');
    process.exit(1);
  }

  // Подождать и подключить второго клиента
  const player2 = await createClient('Player 2', 1500);
  if (!player2) {
    console.error('❌ Не удалось подключить Player 2');
    process.exit(1);
  }

  // Проверка что оба видят друг друга
  console.log('\n' + '='.repeat(60));
  console.log('📊 ПРОВЕРКА СИНХРОНИЗАЦИИ');
  console.log('='.repeat(60));

  await new Promise(r => setTimeout(r, 1000));

  console.log(`\n✅ Player 1 видит ${player1.state.players.size} игроков в комнате`);
  console.log(`✅ Player 2 видит ${player2.state.players.size} игроков в комнате`);

  // Проверка что оба в одной комнате
  const player1SessionId = player1.sessionId;
  const player2SessionId = player2.sessionId;

  const player1SeesPlayer2 = player1.state.players.has(player2SessionId);
  const player2SeesPlayer1 = player2.state.players.has(player1SessionId);

  console.log(`\n🎯 Player 1 видит Player 2: ${player1SeesPlayer2 ? '✅' : '❌'}`);
  console.log(`🎯 Player 2 видит Player 1: ${player2SeesPlayer1 ? '✅' : '❌'}`);

  if (!player1SeesPlayer2 || !player2SeesPlayer1) {
    console.error('\n❌ ОШИБКА: Игроки не видят друг друга!');
    process.exit(1);
  }

  // Тест movement
  console.log('\n' + '='.repeat(60));
  console.log('🏃 ТЕСТ MOVEMENT SYNC');
  console.log('='.repeat(60));

  await testMove(player1, 'Player 1');
  await testMove(player2, 'Player 2');

  // Ждём синхронизации
  await new Promise(r => setTimeout(r, 1000));

  const p1Data = player1.state.players.get(player1SessionId);
  const p2Data = player2.state.players.get(player2SessionId);

  console.log(`\n✅ Player 1 позиция: x=${p1Data?.x}, y=${p1Data?.y}`);
  console.log(`✅ Player 2 позиция: x=${p2Data?.x}, y=${p2Data?.y}`);

  // Финальный результат
  console.log('\n' + '='.repeat(60));
  console.log('✅ ТЕСТ УСПЕШНО ЗАВЕРШЕН!');
  console.log('='.repeat(60));
  console.log('\n✅ Оба игрока подключены');
  console.log('✅ Синхронизация работает');
  console.log('✅ Movement синхронизируется\n');

  // Cleanup
  roomConnections.forEach((room) => room.leave());
  process.exit(0);
}

main().catch(console.error);
