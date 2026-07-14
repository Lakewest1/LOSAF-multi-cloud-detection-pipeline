import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function auditWorker(event: any) {
  const executionId = event.executionId || crypto.randomUUID();

  console.log("🟢 AUDIT EVENT RECEIVED:", event);

  await prisma.audit_logs.create({
    data: {
      action: "SOAR_AUDIT_EVENT",
      result: JSON.stringify({
        userId: event.userId,
        risk: event.mlThreatScore,
        tier: event.tier,
        timestamp: new Date().toISOString()
      })
    }
  });

  await prisma.workflow_executions.create({
    data: {
      execution_id: executionId,
      incident_id: event.incidentId,
      workflow_step: "AUDIT_ONLY",
      status: "RECORDED"
    }
  });
}