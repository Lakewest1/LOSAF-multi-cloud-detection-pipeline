import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { graphClient } from "./graph/graphClient";
import { v4 as uuidv4 } from "uuid";
import { queueRetry } from "./retry-worker";

const prisma = new PrismaClient();

const userId =
  "badguy@olamilake95gmail.onmicrosoft.com";

async function main() {

  // GET CURRENT USER STATE
  const currentUser = await graphClient
    .api(`/users/${userId}`)
    .get();

  // GENERATE EXECUTION + ROLLBACK IDS
  const rollbackId = uuidv4();
  const executionId = uuidv4();

  // SAVE ROLLBACK RECORD
  await prisma.rollback_records.create({
    data: {
      rollback_id: rollbackId,
      execution_id: executionId,
      user_id: currentUser.id,
      username: currentUser.userPrincipalName,
      old_account_enabled: currentUser.accountEnabled,
      rollback_status: "READY"
    }
  });

  try {

    // DISABLE ACCOUNT
    await graphClient
      .api(`/users/${userId}`)
      .update({
        accountEnabled: false,
      });

    console.log(
      "ACCOUNT DISABLED SUCCESSFULLY"
    );

  } catch (error) {

    console.error(
      "CONTAINMENT FAILED"
    );

    // SEND TO RETRY QUEUE
    await queueRetry({
      executionId,
      userId,
      action: "CONTAINMENT",
      error: String(error)
    });

    // SAVE FAILURE STATE
    await prisma.workflow_executions.create({
      data: {
        execution_id: executionId,
        incident_id: rollbackId,
        workflow_step: "CONTAINMENT",
        status: "FAILED",
        retry_count: 1
      }
    });

    throw error;
  }

  // SAVE SUCCESS STATE
  await prisma.workflow_executions.create({
    data: {
      execution_id: executionId,
      incident_id: rollbackId,
      workflow_step: "CONTAINMENT",
      status: "SUCCESS",
      retry_count: 0
    }
  });

  console.log({
    rollbackId,
    executionId
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });