import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Resetting admin password...");

  const email = "admin@basket.lviv.ua";
  const newPassword = "Admin123!@#";

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update admin
  const admin = await prisma.adminUser.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log("✅ Admin password reset successfully!");
  console.log("");
  console.log("📋 NEW Login credentials:");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${newPassword}`);
  console.log("");
  console.log(`🌐 Admin panel: http://localhost:3006/admin/dashboard`);
  console.log("");
  console.log("Admin ID:", admin.id);
  console.log("Admin Name:", admin.name);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
