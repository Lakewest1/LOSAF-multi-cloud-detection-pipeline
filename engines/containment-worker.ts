import { v4 as uuidv4 } from "uuid";
import { prisma } from "../utils/prisma";

import { graphClient } from "../graph/graphClient";
import { calculateMLRisk } from "../engines/ml-risk-engine";
import { determineResponseTier } from "../engines/response-tier-engine";
import { queueRetry } from "../queues/retry-worker";
import { IncidentStates } from "./incident-state-engine";
import { logEvent } from "../utils/logger";



export async function containmentWorker(event: any) {

  // =========================
  // 0. INPUT VALIDATION
  // FIX: Moved outside try block so it fails fast before any DB/network calls.
  // The original code placed this after uuidv4() calls but before try{},
  // meaning a throw here would be an uncaught exception in some runtimes.
  // =========================
  const userId = event.userId;
  const incidentId = event.incidentId;

  if (!userId || userId.trim() === "") {
    throw new Error(`Missing userId. Incident=${incidentId}`);
  }

  if (!incidentId || incidentId.trim() === "") {
    throw new Error("Missing incidentId.");
  }

  const executionId = uuidv4();
  const correlationId = uuidv4();
  const rollbackId = uuidv4();

  try {

    // =========================
    // 1. IDEMPOTENCY CHECK
    // FIX: Kept single idempotency check here. The original code had a
    // duplicate check later ("existing") that re-queried the same record
    // after the upsert — both redundant and misleading. One early guard is enough.
    // =========================
    const alreadyContained = await prisma.incidents.findFirst({
      where: {
        incident_id: incidentId,
        status: IncidentStates.CONTAINED
      }
    });

    if (alreadyContained) {
      console.log("🟡 Already contained — skipping");
      return;
    }

    // =========================
    // 2. ML + TIERING ENGINE
    // =========================
    const risk = await calculateMLRisk(event);
    const tier = determineResponseTier(risk.mlThreatScore);

    logEvent("INCIDENT_TRIAGED", {
      incidentId,
      riskScore: risk.mlThreatScore,
      tier
    });

    // =========================
    // 3. INCIDENT LOGGING
    // =========================
    await prisma.incidents.upsert({
      where: { incident_id: incidentId },
      create: {
        incident_id: incidentId,
        execution_id: executionId,
        correlation_id: correlationId,
        severity: tier,
        risk_score: risk.mlThreatScore,
        status: IncidentStates.TRIAGED,
        user_email: userId,
        source_ip: event.sourceIp
      },
      update: {
        status: IncidentStates.TRIAGED,
        risk_score: risk.mlThreatScore,
        severity: tier
      }
    });

    // =========================
    // 4. LOW / MEDIUM HANDLING
    // FIX: LOW tier now sets status to CLOSED instead of leaving it at
    // TRIAGED. A LOW incident that takes no action is resolved, not pending.
    // =========================
    if (tier === "LOW") {
      console.log("🟢 LOW RISK — NO ACTION REQUIRED");
      await prisma.incidents.update({
        where: { incident_id: incidentId },
        data: { status: IncidentStates.CLOSED }
      });
      return;
    }

    if (tier === "MEDIUM") {
      await prisma.workflow_executions.upsert({
        where: { execution_id: executionId },
        create: {
          execution_id: executionId,
          incident_id: incidentId,
          correlation_id: correlationId,
          workflow_step: "ANALYST_APPROVAL",
          status: "WAITING"
        },
        update: {
          status: "WAITING"
        }
      });

      console.log("🟡 MEDIUM RISK — SENT TO ANALYST");
      await prisma.incidents.update({
        where: { incident_id: incidentId },
        data: { status: IncidentStates.ANALYST_REVIEW }
      });
      return;
    }

    // =========================
    // 5. HIGH / CRITICAL — WORKFLOW TRACKING (start)
    // =========================
    await prisma.workflow_executions.create({
      data: {
        execution_id: executionId,
        incident_id: incidentId,
        correlation_id: correlationId,
        workflow_step: "CONTAINMENT_STARTED",
        status: "RUNNING"
      }
    });

    // =========================
    // 6. FETCH CURRENT USER STATE FROM GRAPH
    // =========================
    const currentUser = await graphClient
      .api(`/users/${encodeURIComponent(userId)}`)
      .get();

    // =========================
    // 7. CREATE ROLLBACK RECORD
    // FIX: logEvent("ROLLBACK_RECORD_CREATED") now fires AFTER the DB write,
    // not before. Original code logged the event before the record existed,
    // which would produce a false audit trail if the create threw.
    // =========================
    await prisma.rollback_records.create({
      data: {
        rollback_id: rollbackId,
        execution_id: executionId,
        correlation_id: correlationId,
        user_id: currentUser.id,
        username: currentUser.userPrincipalName,
        old_account_enabled: currentUser.accountEnabled,
        rollback_status: "READY",
        status: "ACTIVE"
      }
    });

    logEvent("ROLLBACK_RECORD_CREATED", {
      rollbackId,
      incidentId,
      userId
    });

    console.log("🔍 TARGET USER:", userId);
    console.log("📡 SOURCE IP:", event.sourceIp);

    await prisma.incidents.update({
      where: { incident_id: incidentId },
      data: { status: IncidentStates.CONTAINMENT_PENDING }
    });

    // =========================
    // 8. CONTAINMENT ACTIONS
    // FIX: logEvent("USER_DISABLED") moved to AFTER both Graph calls complete.
    // Original code fired the log between disable and session revoke, meaning
    // the log claimed full containment while sessions were still active.
    // FIX: Added logEvent("SESSION_REVOKED") which was missing entirely —
    // the audit-events Service Bus consumer expects this event.
    // =========================
    await graphClient
      .api(`/users/${encodeURIComponent(userId)}`)
      .update({ accountEnabled: false });

    await graphClient
      .api(`/users/${encodeURIComponent(userId)}/revokeSignInSessions`)
      .post({});

    console.log("🔒 ACCOUNT DISABLED + SESSIONS REVOKED");

    logEvent("USER_DISABLED", {
      userId,
      incidentId,
      executionId
    });

    logEvent("SESSION_REVOKED", {
      userId,
      incidentId,
      executionId,
      correlationId
    });

    // =========================
    // 9. WORKFLOW TRACKING (complete)
    // =========================
    await prisma.workflow_executions.upsert({
      where: { execution_id: executionId },
      create: {
        execution_id: executionId,
        incident_id: incidentId,
        correlation_id: correlationId,
        workflow_step: "CONTAINMENT",
        status: "SUCCESS"
      },
      update: {
        status: "SUCCESS"
      }
    });

    await prisma.incidents.update({
      where: { incident_id: incidentId },
      data: { status: IncidentStates.CONTAINED }
    });

    // =========================
    // 10. AUDIT LOG
    // =========================
    await prisma.audit_logs.create({
      data: {
        action: "USER_CONTAINED",
        incident_id: incidentId,
        execution_id: executionId,
        correlation_id: correlationId,
        result: "SUCCESS",
        metadata: {
          userId,
          riskScore: risk.mlThreatScore,
          tier,
          executionId,
          correlationId,
          rollbackId,
          sourceIp: event.sourceIp
        }
      }
    });

    console.log("📦 AUDIT EVENT GENERATED");
    console.log("🔴 USER CONTAINED SUCCESSFULLY");

    logEvent("CONTAINMENT_SUCCESS", {
      incidentId,
      userId,
      executionId,
      correlationId
    });

    return {
      status: "contained",
      userId,
      incidentId,
      riskScore: risk.mlThreatScore,
      tier
    };

  } catch (error) {

    console.error("❌ CONTAINMENT FAILED:", error);

    await queueRetry({
      action: "CONTAINMENT",
      userId,
      executionId,
      correlationId,
      error: String(error)
    });

    // FIX: Removed the duplicate updateMany that immediately preceded this
    // update call. Both targeted the same incident_id, making updateMany
    // redundant and adding an unnecessary DB round-trip.
    await prisma.workflow_executions.upsert({
      where: { execution_id: executionId },
      create: {
        execution_id: executionId,
        incident_id: incidentId,
        correlation_id: correlationId,
        workflow_step: "CONTAINMENT",
        status: "FAILED"
      },
      update: {
        status: "FAILED"
      }
    });

    await prisma.incidents.update({
      where: { incident_id: incidentId },
      data: { status: IncidentStates.FAILED }
    });

    logEvent("CONTAINMENT_FAILED", {
      incidentId,
      userId,
      executionId,
      error: String(error)
    });

    throw error;
  }
}