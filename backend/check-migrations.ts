
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations`;
  console.log(result);
}
main().finally(() => prisma.$disconnect());
