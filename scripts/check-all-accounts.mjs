import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAll() {
  try {
    // Check GuestContact admins
    const guestAdmins = await prisma.guestContact.findMany({
      where: { role: 'admin' },
      select: { id: true, phone: true, firstName: true, lastName: true },
    });

    // Check AdminUser table
    const adminUsers = await prisma.adminUser.findMany({
      select: { id: true, email: true, name: true },
    });

    // Get first VIP user
    const vipUser = await prisma.guestContact.findFirst({
      where: { role: 'vip' },
      select: { id: true, phone: true, firstName: true, lastName: true },
    });

    console.log('=== ADMIN ACCOUNTS ===');
    console.log('GuestContact (role=admin):', guestAdmins);
    console.log('\nAdminUser table:', adminUsers);
    console.log('\nFirst VIP user:', vipUser);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAll();
