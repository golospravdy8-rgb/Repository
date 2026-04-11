import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const products = JSON.parse(fs.readFileSync('scripts/balls-data.json', 'utf8'))

  console.log(`🏀 Importing ${products.length} basketball products...`)

  let created = 0
  let skipped = 0

  for (const p of products) {
    if (!p.title || p.title === 'Помилка завантаження' || p.price === 0) {
      console.log(`⏭ Skipping: ${p.title} (price=${p.price})`)
      skipped++
      continue
    }

    try {
      const product = await prisma.shopProduct.create({
        data: {
          name: p.title,
          description: p.description || p.title,
          price: Math.max(1, p.price || 1000), // min 1 UAH if price is missing
          category: 'М\'ячі',
          emoji: '🏀',
          imageUrl: p.imageUrl || null,
          sizes: p.size ? p.size.toString() : null,
          inStock: true,
          showInChat: true,
          chatPriority: false,
          sortOrder: created,
        }
      })
      console.log(`✅ Created: "${p.title}" (id: ${product.id}, price: ${product.price} грн)`)
      created++
    } catch (e) {
      console.error(`❌ Error creating "${p.title}": ${e.message}`)
      skipped++
    }
  }

  await prisma.$disconnect()
  console.log(`\n✅ Import complete! Created: ${created}, Skipped: ${skipped}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
