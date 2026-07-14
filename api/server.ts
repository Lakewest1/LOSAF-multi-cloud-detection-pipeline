import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "../utils/prisma";

import { calculateUEBA } from "../engines/ueba-engine";
import { calculateMLRisk } from "../engines/ml-risk-engine";
import { determineResponseTier } from "../engines/response-tier-engine";

import { routeEvent } from "../queues/queueRouter";
import { containmentWorker } from "../engines/containment-worker";

import incidentsRoute from "./incidents";
import { approvalWebhook } from "./approval-webhook";
import updateServiceNow from "./update-servicenow";

//Detection for Multicloud//
import detectionsRoute from "./detections";

const app = express();

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// ROUTES
// =========================
app.use("/api/incidents", incidentsRoute);
app.post("/api/approval-webhook", approvalWebhook);
app.use("/api/update-servicenow", updateServiceNow);
app.use("/api/detections", detectionsRoute);

// =========================
// HEALTH CHECK
// =========================
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// =========================
// MAIN INGESTION PIPELINE
// =========================
app.post("/ingest", async (req, res) => {
  try {
    const event = req.body;

    if (!event || Object.keys(event).length === 0) {
      return res.status(400).json({
        status: "FAILED",
        error: "Empty event payload",
      });
    }

    console.log("📥 EVENT RECEIVED:", event);

    // =========================
    // 1. SINGLE SOURCE OF TRUTH ID
    // =========================
    const incidentId =
      event.incidentId ??
      event.incident_id ??
      `SIM-${Date.now()}`;

    // =========================
    // 2. ENRICHED EVENT (IMPORTANT FIX)
    // =========================
    const enrichedEvent = {
      ...event,
      incidentId,
    };

    // =========================
    // 3. UEBA + ML
    // =========================
    const ueba = await calculateUEBA(enrichedEvent);
    const mlResult = await calculateMLRisk(enrichedEvent);

    const tier = determineResponseTier(mlResult.mlThreatScore);

    console.log("🧠 UEBA:", ueba);
    console.log("📊 ML:", mlResult);
    console.log("⚡ TIER:", tier);

    // =========================
    // 4. DB UPSERT (FIXED FIELD MAPPING)
    // =========================
    await prisma.incidents.upsert({
      where: { incident_id: incidentId },
      update: {
        risk_score: mlResult.mlThreatScore,
        severity: tier,
        status: tier,

        user_email:
          enrichedEvent.userId ?? enrichedEvent.upn ?? null,

        source_ip: enrichedEvent.sourceIp ?? null,

        execution_id: enrichedEvent.executionId ?? null,
        correlation_id:
          enrichedEvent.correlationId ??
          enrichedEvent.correlationKey ??
          null,
      },
      create: {
        incident_id: incidentId,

        execution_id: enrichedEvent.executionId ?? null,
        correlation_id:
          enrichedEvent.correlationId ??
          enrichedEvent.correlationKey ??
          null,

        user_email:
          enrichedEvent.userId ?? enrichedEvent.upn ?? null,

        source_ip: enrichedEvent.sourceIp ?? null,

        risk_score: mlResult.mlThreatScore,
        severity: tier,
        status: tier,
      },
    });

    // =========================
// 5. AUTO CONTAINMENT (FIXED GUARANTEE)
// =========================

const safeUserId =
  enrichedEvent.userId || enrichedEvent.upn || null;

const validEvent =
  Boolean(safeUserId) &&
  Boolean(enrichedEvent.sourceIp) &&
  Boolean(incidentId);

if (
  tier === "CRITICAL" &&
  mlResult.mlThreatScore >= 85 &&
  ueba.uebaScore >= 70 &&
  validEvent
) {
  console.log("🚨 AUTO-CONTAINMENT TRIGGERED");

  await containmentWorker({
    ...enrichedEvent,
    userId: safeUserId, // 🔥 FIX: NEVER NULL
    incidentId,
    mlThreatScore: mlResult.mlThreatScore,
    uebaScore: ueba.uebaScore,
  });
}

    // =========================
    // 6. QUEUE ROUTING (FIXED)
    // =========================
    await routeEvent(
      {
        ...enrichedEvent,
        incidentId,
      },
      tier,
      mlResult
    );

    // =========================
    // 7. RESPONSE
    // =========================
    return res.json({
      status: "DISPATCHED",
      incidentId,
      uebaScore: ueba.uebaScore,
      mlThreatScore: mlResult.mlThreatScore,
      tier,
    });
  } catch (error) {
    console.error("❌ INGEST ERROR:", error);

    return res.status(500).json({
      status: "FAILED",
      error: String(error),
    });
  }
});

// =========================
// WARM DATABASE + START SERVER
// =========================

// Warm up the database connection before accepting requests, so a
// cold/idle Supabase pooler doesn't surface as a live request failure.
async function warmDatabase() {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection warm");
      return;
    } catch (err) {
      console.warn(`⏳ Database not ready (attempt ${attempt}/${maxAttempts}), retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.error("❌ Database still unreachable after retries — starting anyway");
}

warmDatabase().then(() => {
  app.listen(process.env.PORT || 3000, () => {
    console.log(
      `🚀 SOAR INGEST API RUNNING ON PORT ${process.env.PORT || 3000}`
    );
  });
});