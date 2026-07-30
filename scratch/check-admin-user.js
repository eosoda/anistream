const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.adminUser.findMany();
  console.log('Admin Users count:', users.length);
  for (const u of users) {
    console.log('User:', u.email, u.name);
  }
}

main().finally(() => prisma.$disconnect());
