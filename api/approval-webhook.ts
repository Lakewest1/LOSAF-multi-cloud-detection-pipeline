import { prisma } from "../utils/prisma";

export async function approvalWebhook(req: any, res: any) {
  const { incident, decision } = req.query;

  if (!incident || !decision) {
    return res.status(400).send("Missing parameters");
  }

  await prisma.workflow_executions.updateMany({
    where: { incident_id: incident },
    data: {
      status:
        decision === "approve"
          ? "APPROVED"
          : "REJECTED",
    },
  });

  await prisma.audit_logs.create({
    data: {
      event_type: "SERVICE_NOW_APPROVAL",
      reference_id: incident,
      payload: { decision },
    },
  });

  return res.send("OK");
}