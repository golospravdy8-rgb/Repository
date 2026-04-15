const bcrypt = require('bcryptjs');

// Создаём новый хешированный пароль для админа
const testPassword = 'Admin123!@#';
const hashedPassword = bcrypt.hashSync(testPassword, 10);

console.log('📋 Данные для входа в админ-панель:');
console.log('');
console.log('Email:', 'admin@basket.lviv.ua');
console.log('Password:', testPassword);
console.log('');
console.log('Хешированный пароль для БД:');
console.log(hashedPassword);
console.log('');
console.log('URL админ-панели: http://localhost:3006/admin/dashboard');
