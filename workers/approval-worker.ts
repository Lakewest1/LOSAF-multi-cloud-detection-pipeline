import { prisma } from "../utils/prisma";
import { sendApprovalEmail } from "../utils/email";
import { randomUUID } from "crypto";

function generateId() {
  return randomUUID();
}

function buildServiceNowUrl(incidentId: string) {
  return `https://dev392345.service-now.com/nav_to.do?uri=task.do?sysparm_query=number=${incidentId}`;
}

export async function approvalWorker(event: any) {
  const executionId = event.executionId || generateId();
  const incidentId = event.incidentId || generateId();

  try {
    if (!event.approverEmail) {
      throw new Error("Missing approverEmail in event");
    }

    const existing = await prisma.workflow_executions.findUnique({
      where: { execution_id: executionId },
    });

    if (existing) {
      console.log("⚠️ Duplicate execution ignored");
      return;
    }

    await prisma.workflow_executions.create({
      data: {
        execution_id: executionId,
        incident_id: incidentId,
        workflow_step: "ANALYST_APPROVAL",
        status: "PENDING_APPROVAL",
      },
    });

    const approveUrl = buildServiceNowUrl(incidentId);
    const rejectUrl = buildServiceNowUrl(incidentId);

    console.log("📨 Sending approval email to:", event.approverEmail);

    await sendApprovalEmail({
      to: event.approverEmail,
      subject: `SOAR Approval Required - Incident ${incidentId}`,
      html: `
        <h2>SOAR Incident Approval</h2>
        <p>Incident ID: ${incidentId}</p>

        <a href="${approveUrl}" style="padding:10px;background:green;color:white;">
          APPROVE
        </a>

        <a href="${rejectUrl}" style="padding:10px;background:red;color:white;">
          REJECT
        </a>
      `,
    });

    await prisma.audit_logs.create({
      data: {
        event_type: "APPROVAL_EMAIL_SENT",
        reference_id: executionId,
        payload: event,
      },
    });

    console.log("📧 Approval email sent");
  } catch (error) {
    console.error("❌ Approval worker error:", error);
    throw error;
  }
}