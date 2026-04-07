#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('📱 Setup Real Admin for VIP\n');

    // Show current admins
    const currentAdmins = await prisma.guestContact.findMany({
      where: { role: 'admin' },
      select: { id: true, phone: true, firstName: true, lastName: true, vipStatus: true },
    });

    console.log('Current admin accounts:');
    if (currentAdmins.length === 0) {
      console.log('  None found');
    } else {
      currentAdmins.forEach((admin) => {
        console.log(`  ID: ${admin.id}, Phone: ${admin.phone}, Name: ${admin.firstName} ${admin.lastName}, VIP: ${admin.vipStatus}`);
      });
    }

    console.log('\n');

    // Show all parent users
    const parents = await prisma.guestContact.findMany({
      where: { role: 'parent' },
      select: { id: true, phone: true, firstName: true, lastName: true },
    });

    console.log('Parent users (can be promoted to admin):');
    if (parents.length === 0) {
      console.log('  None found');
    } else {
      parents.forEach((parent) => {
        console.log(`  ID: ${parent.id}, Phone: ${parent.phone}, Name: ${parent.firstName} ${parent.lastName}`);
      });
    }

    console.log('\n');

    // Get phone number
    const phone = await question('Enter real admin phone number (e.g., +380XXXXXXXXX): ');

    if (!phone || !phone.match(/^\+\d{10,}/)) {
      console.error('❌ Invalid phone number format');
      rl.close();
      return;
    }

    // Check if admin exists
    let admin = await prisma.guestContact.findUnique({
      where: { phone },
    });

    if (!admin) {
      const firstName = await question('First name (default: Admin): ');
      const lastName = await question('Last name (default: Basket): ');

      admin = await prisma.guestContact.create({
        data: {
          phone,
          firstName: firstName || 'Admin',
          lastName: lastName || 'Basket',
          role: 'admin',
          displayName: 'Адміністратор',
        },
      });
      console.log(`✅ Created new admin account: ${phone}`);
    } else {
      if (admin.role !== 'admin') {
        admin = await prisma.guestContact.update({
          where: { phone },
          data: { role: 'admin' },
        });
        console.log(`✅ Promoted ${phone} to admin role`);
      } else {
        console.log(`✅ Admin account already exists: ${phone}`);
      }
    }

    // Activate VIP
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const updated = await prisma.guestContact.update({
      where: { id: admin.id },
      data: {
        vipStatus: true,
        vipExpiresAt: expiresAt,
      },
    });

    console.log(`\n✅ VIP activated for admin:`);
    console.log(`  Phone: ${updated.phone}`);
    console.log(`  Role: ${updated.role}`);
    console.log(`  VIP Status: ${updated.vipStatus}`);
    console.log(`  Expires: ${updated.vipExpiresAt}`);

    console.log(`\n📖 Next steps:`);
    console.log(`  1. Set env var: ADMIN_PHONE_NUMBER="${phone}"`);
    console.log(`  2. Set cookie: user_phone=${phone}`);
    console.log(`  3. Open: http://localhost:3006/vip`);

    // Delete test admin if it exists
    const testAdmin = await prisma.guestContact.findUnique({
      where: { phone: '+380999999999' },
    });

    if (testAdmin) {
      const shouldDelete = await question('\nDelete test admin account (+380999999999)? (y/n): ');
      if (shouldDelete.toLowerCase() === 'y') {
        await prisma.guestContact.delete({
          where: { id: testAdmin.id },
        });
        console.log('✅ Test admin account deleted');
      }
    }

    rl.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
  } finally {
    await prisma.$disconnect();
  }
}

main();
