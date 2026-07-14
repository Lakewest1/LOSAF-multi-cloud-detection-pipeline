import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  const count =
    await prisma.incidents.count();

  console.log(count);

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());