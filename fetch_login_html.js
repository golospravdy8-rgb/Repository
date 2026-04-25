/**
 * Fetch login page HTML to find input selectors
 */

const http = require('http');

function getLoginHTML() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/login',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function main() {
  try {
    console.log('📖 Завантажую /login HTML...\n');
    const html = await getLoginHTML();

    // Find all input elements
    const inputMatches = html.match(/<input[^>]*>/gi) || [];
    console.log(`✅ Знайдено ${inputMatches.length} input елементів:\n`);

    inputMatches.forEach((input, idx) => {
      console.log(`[${idx}]: ${input}\n`);
    });

    // Find all button elements
    const buttonMatches = html.match(/<button[^>]*>.*?<\/button>/gi) || [];
    console.log(`\n✅ Знайдено ${buttonMatches.length} button елементів:\n`);

    buttonMatches.forEach((btn, idx) => {
      console.log(`[${idx}]: ${btn}\n`);
    });

    // Find form
    const formMatch = html.match(/<form[^>]*>.*?<\/form>/is);
    if (formMatch) {
      console.log(`\n✅ Форма знайдена:\n`);
      console.log(formMatch[0].substring(0, 500) + '...\n');
    }

  } catch (err) {
    console.error('❌ Помилка:', err.message);
  }
}

main();
