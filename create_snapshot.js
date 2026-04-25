const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Game-related files to include
const gameFiles = [
  'components/public/RucheekGameCanvas.tsx',
  'components/public/basketball-physics-engine.ts',
  'components/public/basketball-physics-engine.test.ts',
];

// Get git log
let gitLog = '';
try {
  gitLog = execSync('git log --oneline -20', { cwd: 'D:\\n8n\\basket-lviv', encoding: 'utf8' });
} catch (e) {
  gitLog = 'Git log not available';
}

// Get last commit hash
let lastCommit = '';
try {
  lastCommit = execSync('git rev-parse HEAD', { cwd: 'D:\\n8n\\basket-lviv', encoding: 'utf8' }).trim().slice(0, 8);
} catch (e) {
  lastCommit = 'unknown';
}

// Read all game files
const filesContent = [];
gameFiles.forEach(file => {
  const filePath = path.join('D:\\n8n\\basket-lviv', file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    filesContent.push({
      name: path.basename(file),
      path: file,
      ext: path.extname(file),
      size: content.length,
      lines: content.split('\n').length,
      content: content
    });
  } catch (e) {
    console.error(`Failed to read ${file}: ${e.message}`);
  }
});

// Read SHOT_AUDIT if exists
let shotAudit = '';
try {
  shotAudit = fs.readFileSync('D:\\n8n\\SHOT_AUDIT_2026.md', 'utf8');
} catch (e) {
  console.warn('SHOT_AUDIT_2026.md not found');
}

// Extract constants from RucheekGameCanvas
const ruche = filesContent.find(f => f.name === 'RucheekGameCanvas.tsx');
const constants = [];
if (ruche) {
  const matches = ruche.content.match(/const\s+([A-Z_]+)\s*=\s*([^;]+);/g) || [];
  matches.slice(0, 30).forEach(m => constants.push(m));
}

// Build table of contents
const toc = filesContent.map(f =>
  `<li><a href="#file-${f.name.replace(/\./g, '-')}">${f.name}</a> (${f.lines} lines, ${(f.size/1024).toFixed(1)}KB)</li>`
).join('\n');

// Escape HTML
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Get language class for syntax highlighting
function getLangClass(ext) {
  const map = {
    '.tsx': 'typescript',
    '.ts': 'typescript',
    '.md': 'markdown',
    '.js': 'javascript'
  };
  return map[ext] || 'plaintext';
}

// Build file sections
const fileSections = filesContent.map(f => {
  const lang = getLangClass(f.ext);
  const escaped = escapeHtml(f.content);
  return `
  <section id="file-${f.name.replace(/\./g, '-')}" class="file-section">
    <h2>${f.name}</h2>
    <div class="file-meta">
      <span>${f.lines} lines</span>
      <span>${(f.size/1024).toFixed(1)} KB</span>
      <button class="copy-btn" onclick="copyCode(this)">📋 Копировать</button>
    </div>
    <pre><code class="language-${lang}">${escaped}</code></pre>
  </section>
  `;
}).join('\n');

// Build shot audit section
const auditSection = shotAudit ? `
  <section id="shot-audit" class="audit-section">
    <h2>🎯 Shot Audit 2026-04-25</h2>
    <pre><code class="language-markdown">${escapeHtml(shotAudit)}</code></pre>
  </section>
` : '';

// Build constants section
const constantsSection = `
  <section id="constants" class="constants-section">
    <h2>🎮 Game Constants</h2>
    <h3>Key Physics Parameters</h3>
    <table>
      <tr><th>Constant</th><th>Value</th><th>Description</th></tr>
      <tr><td>G</td><td>0.102</td><td>Gravity (px/frame²)</td></tr>
      <tr><td>HOOP_X</td><td>110 * scaleX</td><td>Hoop X coordinate</td></tr>
      <tr><td>HOOP_Y</td><td>307 * scaleY</td><td>Hoop Y coordinate (upper area)</td></tr>
      <tr><td>P_START</td><td>W * 0.65</td><td>Player starting X position</td></tr>
      <tr><td>P_START_Y</td><td>584 * scaleY</td><td>Player starting Y position</td></tr>
      <tr><td>BALL_RADIUS</td><td>12 * scaleX</td><td>Ball collision radius</td></tr>
      <tr><td>HOOP_RADIUS</td><td>22 * scaleX</td><td>Hoop collision radius</td></tr>
      <tr><td>MIN_BALL_SPEED</td><td>5.0</td><td>Minimum launch speed</td></tr>
      <tr><td>MAX_BALL_SPEED</td><td>16.0</td><td>Maximum launch speed</td></tr>
    </table>
    <h3>Power Meter Formulas</h3>
    <ul>
      <li><strong>Power Multiplier:</strong> 0.3 + (power / 200) * 1.7</li>
      <li><strong>Base Speed:</strong> 10 + (distToHoop / 500) * 8</li>
      <li><strong>Launch Speed:</strong> baseSpeed * powerMultiplier</li>
      <li><strong>Velocity X:</strong> -cos(angle) * launchSpeed (negative = leftward)</li>
      <li><strong>Velocity Y:</strong> -sin(angle) * launchSpeed (negative = upward)</li>
    </ul>
  </section>
`;

// Build git log section
const gitSection = `
  <section id="git-history" class="git-section">
    <h2>📝 Recent Commits (Last 20)</h2>
    <pre><code class="language-bash">${escapeHtml(gitLog)}</code></pre>
  </section>
`;

// Build HTML
const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🏀 Basketball Game Snapshot — 2026-04-25</title>

  <!-- Highlight.js for syntax highlighting -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    header h1 {
      margin: 0;
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    header p {
      margin: 5px 0;
      opacity: 0.9;
      font-size: 1.1em;
    }

    nav#toc {
      background: #f8f9fa;
      padding: 30px;
      border-bottom: 3px solid #667eea;
    }

    nav#toc h2 {
      margin-top: 0;
      color: #667eea;
    }

    nav#toc ul {
      list-style: none;
      padding: 0;
      column-count: 2;
      gap: 40px;
    }

    nav#toc li {
      margin: 10px 0;
    }

    nav#toc a {
      color: #667eea;
      text-decoration: none;
      transition: all 0.2s;
    }

    nav#toc a:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    main {
      padding: 40px;
    }

    section {
      margin-bottom: 60px;
      scroll-margin-top: 100px;
    }

    section h2 {
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 20px;
      font-size: 1.8em;
    }

    section h3 {
      color: #764ba2;
      margin-top: 20px;
    }

    .file-meta {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 0.9em;
      color: #666;
    }

    .copy-btn {
      margin-left: auto;
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      transition: all 0.2s;
    }

    .copy-btn:hover {
      background: #764ba2;
      transform: translateY(-2px);
    }

    .copy-btn:active {
      transform: translateY(0);
    }

    pre {
      background: #282c34;
      border-radius: 8px;
      overflow-x: auto;
      padding: 15px;
      margin: 15px 0;
    }

    code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85em;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    table th {
      background: #667eea;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }

    table td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }

    table tr:hover {
      background: #f8f9fa;
    }

    .hljs {
      background: #282c34 !important;
      color: #abb2bf;
    }

    .git-section pre,
    .audit-section pre {
      max-height: 400px;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      body { padding: 10px; }
      header { padding: 20px; }
      header h1 { font-size: 1.8em; }
      main { padding: 20px; }
      nav#toc ul { column-count: 1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏀 Basketball.lviv.ua — Game Snapshot</h1>
      <p>Дата: 25 апреля 2026 | Коммит: ${lastCommit}</p>
      <p>Полна документація всіх ігрових файлів та констант</p>
    </header>

    <nav id="toc">
      <h2>📑 Оглавлення</h2>
      <ul>
        <li><a href="#git-history">📝 Git Історія</a></li>
        <li><a href="#constants">🎮 Ігрові Константи</a></li>
        ${toc}
        <li><a href="#shot-audit">🎯 Shot Audit</a></li>
      </ul>
    </nav>

    <main>
      ${gitSection}

      ${constantsSection}

      ${fileSections}

      ${auditSection}
    </main>
  </div>

  <script>
    // Initialize syntax highlighting
    document.querySelectorAll('pre code').forEach(el => {
      hljs.highlightElement(el);
    });

    // Copy to clipboard function
    function copyCode(btn) {
      const codeBlock = btn.closest('section').querySelector('code');
      const text = codeBlock.textContent;

      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '✅ Скопійовано!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }).catch(() => {
        alert('Помилка копіювання');
      });
    }

    // Search functionality (browser Ctrl+F integration)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const query = prompt('Пошук:');
        if (query) {
          document.body.innerHTML = document.body.innerHTML.replace(
            new RegExp(query, 'gi'),
            match => \`<mark>\${match}</mark>\`
          );
        }
      }
    });
  </script>
</body>
</html>
`;

// Write HTML file
const outputPath = path.join('D:\\n8n\\basket-lviv', 'GAME_SNAPSHOT_2026_04_25.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`✅ Snapshot created: ${outputPath}`);
console.log(`📊 Files included: ${filesContent.length}`);
console.log(`📝 Total lines: ${filesContent.reduce((sum, f) => sum + f.lines, 0)}`);
console.log(`💾 File size: ${(html.length / 1024 / 1024).toFixed(2)} MB`);
