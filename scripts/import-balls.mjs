import https from 'https'
import http from 'http'

const URLS = [
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-meteor-cellular-7-korychnevyj-kremovyj',
  'https://sportmaydan.com.ua/index.php?route=product/product&product_id=20483',
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-8p-bvv-n-100-4498-085',
  'https://sportmaydan.com.ua/index.php?route=product/product&product_id=20429',
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-next-nature-8p-n-100-7037-973',
  'https://sportmaydan.com.ua/m-yach-basketbolniy-nike-jordan-bb-ultimate-8p-white-university-blue-university-red',
  'https://sportmaydan.com.ua/index.php?route=product/product&product_id=20430',
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-fiba-3x3-mini-wtb1733',
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-nba-drv-pro',
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-elevate-vtx-bskt-orange-blue',
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-ncaa-elevate-bskt-wz3007001',
  'https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-reaction-pro-295',
]

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'uk,en;q=0.9',
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function parseProduct(html, url) {
  // Extract title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
                     html.match(/<title>([^<|]+)/)
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g,' ') : 'Невідома назва'

  // Extract price - sportmaydan uses format like "1 260.00 грн."
  const priceMatch = html.match(/<span[^>]*class="h4"[^>]*>([^<]+)<\/span>/) ||
                     html.match(/(\d[\d\s.]*)\s*(?:грн|₴|UAH)/i) ||
                     html.match(/"price"[^>]*>(\d+)/)
  let price = 0
  if (priceMatch) {
    const priceStr = priceMatch[1].replace(/\s/g, '').replace(',', '.')
    const parsedPrice = parseFloat(priceStr)
    price = isNaN(parsedPrice) ? 0 : Math.round(parsedPrice)
  }

  // Extract main image
  const imgMatch = html.match(/(?:og:image|product.*image)[^>]*content="([^"]+)"/) ||
                   html.match(/<img[^>]+(?:main|product|gallery)[^>]+src="([^"]+\.(jpg|png|webp))"/) ||
                   html.match(/image_main[^>]*src="([^"]+)"/) ||
                   html.match(/"image":"([^"]+(?:jpg|png|webp)[^"]*)"/)
  let imageUrl = imgMatch ? imgMatch[1] : ''
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = 'https://sportmaydan.com.ua' + imageUrl
  }

  // Extract description
  const descMatch = html.match(/(?:og:description|description)[^>]*content="([^"]{20,300})"/) ||
                    html.match(/<div[^>]*(?:description|about)[^>]*>([^<]{20,300})/)
  const description = descMatch ? descMatch[1].trim() : ''

  // Extract size from title or description
  const sizeMatch = (title + ' ' + description).match(/розмір\s*[:\-]?\s*(\d+)|size\s*[:\-]?\s*(\d+)|\b([5-7])\s*розмір|\b(3x3)\b/i)
  const size = sizeMatch ? (sizeMatch[1]||sizeMatch[2]||sizeMatch[3]||sizeMatch[4]) : ''

  return { title, price, imageUrl, description, size, sourceUrl: url }
}

async function main() {
  const products = []

  for (const url of URLS) {
    try {
      console.log(`Fetching: ${url}`)
      const html = await fetchPage(url)
      const product = parseProduct(html, url)
      products.push(product)
      console.log(`✓ ${product.title} | ${product.price} грн | img: ${product.imageUrl ? '✓' : '✗'}`)
    } catch (e) {
      console.error(`✗ Error for ${url}: ${e.message}`)
      products.push({ title: 'Помилка завантаження', price: 0, imageUrl: '', description: '', size: '', sourceUrl: url })
    }
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 1000))
  }

  // Save results
  const fs = await import('fs')
  fs.writeFileSync('scripts/balls-data.json', JSON.stringify(products, null, 2))
  console.log('\n✅ Дані збережено в scripts/balls-data.json')
  console.log('Знайдено товарів:', products.length)
  products.forEach((p,i) => console.log(`${i+1}. ${p.title} | ${p.price}грн | розмір: ${p.size || 'не вказано'}`))
}

main()
