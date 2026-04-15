import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Adding admin user...");

  const email = "admin@basket.lviv.ua";
  const password = "Admin123!@#";
  const name = "Адміністратор";

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    console.log(`⚠️ Admin user already exists: ${email}`);
    console.log(`   ID: ${existing.id}`);
    return;
  }

  // Create new admin
  const admin = await prisma.adminUser.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log("");
  console.log("📋 Login credentials:");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log("");
  console.log(`🌐 Admin panel: http://localhost:3006/admin/dashboard`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
