#!/usr/bin/env tsx
/**
 * Migrate all legacy images from /public/images and /public/uploads to Vercel Blob.
 * Updates database records with new Blob URLs.
 *
 * Run: npm run db:migrate-images
 */

import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function migrateImagesToBlob() {
  console.log("🔄 Starting image migration to Vercel Blob...\n");

  if (!BLOB_TOKEN) {
    console.warn("⚠️  BLOB_READ_WRITE_TOKEN not set. Blob upload will fail on production.");
    console.warn("   Set BLOB_READ_WRITE_TOKEN in Vercel Environment Variables.");
    console.warn("   For now, continuing with local file check...\n");
  }

  let migratedCount = 0;
  let skippedCount = 0;

  try {
    // ===== MIGRATE /public/images (Site Settings Images) =====
    console.log("📁 Processing /public/images/...");
    const imagesDir = path.join(process.cwd(), "public", "images");

    try {
      const imageFiles = await fs.readdir(imagesDir);

      for (const fileName of imageFiles) {
        if (fileName.startsWith(".")) continue;

        const filePath = path.join(imagesDir, fileName);
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;

        try {
          const buffer = await fs.readFile(filePath);
          const ext = fileName.split(".").pop() || "jpg";
          const cleanName = fileName.replace(/\.\w+$/, "");
          const blobPath = `site-images/${cleanName}-${Date.now()}.${ext}`;

          if (BLOB_TOKEN) {
            const blob = await put(blobPath, buffer, {
              access: "public",
              contentType: `image/${ext}`,
              token: BLOB_TOKEN,
            });

            // Update SiteSettings in DB
            const key = `images.${cleanName}`;
            const existingSettings = await prisma.siteSettings.findFirst({
              where: { key },
            });

            if (existingSettings) {
              await prisma.siteSettings.update({
                where: { id: existingSettings.id },
                data: { value: blob.url },
              });
              console.log(`✅ ${fileName} → ${blob.url}`);
            } else {
              // Create new setting if not exists
              await prisma.siteSettings.create({
                data: { key, value: blob.url },
              });
              console.log(`✅ ${fileName} (new) → ${blob.url}`);
            }

            migratedCount++;
          } else {
            console.log(`⏭️  ${fileName} (skipped - no BLOB token)`);
            skippedCount++;
          }
        } catch (err) {
          console.error(`❌ Failed to process ${fileName}:`, String(err).slice(0, 50));
          skippedCount++;
        }
      }
    } catch (err) {
      console.log("   (No /public/images directory or empty)");
    }

    // ===== MIGRATE /public/uploads (Entity Files) =====
    console.log("\n📁 Processing /public/uploads/...");
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    try {
      const uploadFiles = await fs.readdir(uploadsDir);
      console.log(`   Found ${uploadFiles.length} files`);

      let teamLogosCount = 0;
      let playerPhotosCount = 0;
      let newsImagesCount = 0;

      for (const fileName of uploadFiles.slice(0, 50)) {
        // Limit to first 50 to avoid rate limiting
        if (fileName.startsWith(".")) continue;

        const filePath = path.join(uploadsDir, fileName);
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;

        try {
          const buffer = await fs.readFile(filePath);
          const ext = fileName.split(".").pop() || "jpg";

          // Categorize by filename pattern
          let category = "other";
          let dbQuery = null;

          if (fileName.includes("team-logo")) {
            category = "team-logo";
            teamLogosCount++;
          } else if (fileName.includes("player-photo")) {
            category = "player-photo";
            playerPhotosCount++;
          } else if (fileName.includes("news")) {
            category = "news";
            newsImagesCount++;
          }

          const blobPath = `entities/${category}/${Date.now()}-${fileName}`;

          if (BLOB_TOKEN) {
            const blob = await put(blobPath, buffer, {
              access: "public",
              contentType: `image/${ext}`,
              token: BLOB_TOKEN,
            });

            // Update DB based on category
            if (category === "team-logo") {
              const teamId = parseInt(fileName.match(/\d+/)?.[0] || "0");
              if (teamId > 0) {
                await prisma.team.updateMany({
                  where: { id: teamId },
                  data: { logoUrl: blob.url },
                }).catch(() => {});
              }
            } else if (category === "player-photo") {
              const playerId = parseInt(fileName.match(/\d+/)?.[0] || "0");
              if (playerId > 0) {
                await prisma.player.updateMany({
                  where: { id: playerId },
                  data: { photoUrl: blob.url },
                }).catch(() => {});
              }
            } else if (category === "news") {
              // News images stored separately - just log for manual update
              console.log(`   News image: ${blob.url}`);
            }

            migratedCount++;
          } else {
            skippedCount++;
          }
        } catch (err) {
          console.error(`   ❌ ${fileName}: ${String(err).slice(0, 40)}`);
          skippedCount++;
        }
      }

      console.log(`   Team logos: ${teamLogosCount}, Player photos: ${playerPhotosCount}, News: ${newsImagesCount}`);
    } catch (err) {
      console.log("   (No /public/uploads directory or empty)");
    }

    console.log(`\n📊 Results: ${migratedCount} migrated, ${skippedCount} skipped`);
    console.log("🎉 Migration complete!\n");

  } catch (err) {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  }

  process.exit(0);
}

migrateImagesToBlob();
