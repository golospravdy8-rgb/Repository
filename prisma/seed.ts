import { restoreCurrent } from "../scripts/restore-current";

async function main() {
  console.log("🌱 Running seed...");

  // Restore current state from backup file
  await restoreCurrent();

  console.log("✅ Seed completed");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  });
