import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function approvalWorker(event: any) {
  const executionId = event.executionId || crypto.randomUUID();

  console.log("🟡 APPROVAL REQUEST RECEIVED:", event);

  await prisma.workflow_executions.create({
    data: {
      execution_id: executionId,
      incident_id: event.incidentId,
      workflow_step: "ANALYST_APPROVAL",
      status: "PENDING_APPROVAL"
    }
  });

  console.log("📨 APPROVAL RECORDED (WAITING HUMAN DECISION)");
}