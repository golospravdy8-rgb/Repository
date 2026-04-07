import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmins() {
  try {
    console.log('Fetching all users with role "admin"...\n');

    const admins = await prisma.guestContact.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        vipStatus: true,
        vipExpiresAt: true,
      },
    });

    console.log(`Found ${admins.length} admin(s):`);
    console.log(JSON.stringify(admins, null, 2));

    console.log('\n\nAll users by role:');
    const byRole = {
      admin: await prisma.guestContact.findMany({ where: { role: 'admin' } }),
      vip: await prisma.guestContact.findMany({ where: { role: 'vip' } }),
      parent: await prisma.guestContact.findMany({ where: { role: 'parent' } }),
      guest: await prisma.guestContact.findMany({ where: { role: 'guest' } }),
      player: await prisma.guestContact.findMany({ where: { role: 'player' } }),
    };

    console.log(`Admin: ${byRole.admin.length}`);
    console.log(`VIP: ${byRole.vip.length}`);
    console.log(`Parent: ${byRole.parent.length}`);
    console.log(`Guest: ${byRole.guest.length}`);
    console.log(`Player: ${byRole.player.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmins();
