import { PrismaClient } from "@prisma/client";
import { graphClient } from "../graph/graphClient";

const prisma = new PrismaClient();

export async function rollbackWorker(
  rollbackId: string
) {

  const rollback =
    await prisma.rollback_records.findUnique({
      where: {
        rollback_id: rollbackId
      }
    });

  if (!rollback) {
    throw new Error("Rollback not found");
  }

  await graphClient
    .api(`/users/${rollback.user_id}`)
    .update({
      accountEnabled:
        rollback.old_account_enabled
    });

  await prisma.rollback_records.update({
    where: {
      rollback_id: rollbackId
    },
    data: {
      rollback_status: "COMPLETED"
    }
  });

  console.log("✅ USER RESTORED");
}