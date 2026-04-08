const fs = require('fs');

const data = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = data.structure || {};

// Выведем содержимое admin layout из backup
const layoutKey = 'app\\admin\\layout.tsx';
const content = structure[layoutKey];

if (content) {
  console.log('='.repeat(100));
  console.log(`CONTENT OF: ${layoutKey}`);
  console.log('='.repeat(100));
  console.log(content);
} else {
  console.log(`NOT FOUND: ${layoutKey}`);
  console.log('\nAvailable admin files:');
  Object.keys(structure).filter(k => k.includes('admin\\layout')).forEach(k => {
    console.log(`  ${k}`);
  });
}
