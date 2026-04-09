#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = 'vcp_5nG3a3TEqKaRJgW9JTRmxtrCN67KKh4HBNvOee6bPT5KFTMdm52xDf3v';
const PROJECT_SLUG = 'basket-lviv';

function httpsRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: body } });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function addPublicVars() {
  const vars = [
    { key: 'NEXT_PUBLIC_MONOBANK_JAR_ID', value: '6Wm6ypKDNBz7vZ8E3kPq4m' },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://dzsvgyetmdgykmujmxuu.supabase.co' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'sb_publishable_086iusJsMoX5QOr6FxqKFA_WBM1LMdB' },
  ];

  for (const { key, value } of vars) {
    const payload = {
      key: key,
      value: value,
      target: ['production', 'preview', 'development'],
      type: 'plain',
    };

    const apiPath = `/v9/projects/${PROJECT_SLUG}/env`;
    const result = await httpsRequest('POST', apiPath, payload);

    if (result.status === 200 || result.status === 201) {
      console.log(`✅ Added ${key}`);
    } else {
      console.log(`❌ ${key} (${result.status}): ${result.data.error?.message || 'error'}`);
    }
  }
}

addPublicVars().catch(e => console.error(e));
