import express from "express";
import { prisma } from "../utils/prisma";

const router = express.Router();

/*
=====================================================
SERVICE NOW TICKET CREATED
=====================================================
*/

router.post("/update-servicenow", async (req, res) => {

  try {

    const {
      incidentId,
      ticketNumber
    } = req.body;

    if (!incidentId) {
      return res.status(400).json({
        success: false,
        error: "incidentId is required"
      });
    }

    await prisma.incidents.update({
      where: {
        incident_id: incidentId
      },
      data: {
        servicenow_ticket: ticketNumber,

        analyst_decision: "PENDING",

        approval_deadline: new Date(
          Date.now() + 30 * 60 * 1000
        ),

        soc_decision: "PENDING",

        timeout_deadline: new Date(
          Date.now() + 30 * 60 * 1000
        )
      }
    });

    return res.json({
      success: true
    });

  } catch (error) {

    console.error("UPDATE SERVICENOW ERROR:", error);

    return res.status(500).json({
      success: false,
      error: String(error)
    });

  }

});

/*
=====================================================
SOC APPROVE / REJECT CALLBACK
=====================================================
*/

router.post("/soc-decision", async (req, res) => {

  try {

    const {
      incidentId,
      decision
    } = req.body;

    if (!incidentId) {
      return res.status(400).json({
        success: false,
        error: "incidentId is required"
      });
    }

    if (
      decision !== "APPROVED" &&
      decision !== "REJECTED"
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid decision"
      });
    }

    const incident =
      await prisma.incidents.findUnique({
        where: {
          incident_id: incidentId
        }
      });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: "Incident not found"
      });
    }

    /*
    ============================================
    DUPLICATE PROCESSING PROTECTION
    ============================================
    */

    if (
      incident.status === "CONTAINED" ||
      incident.soc_decision === "TIMEOUT"
    ) {
      return res.json({
        success: true,
        message: "Already processed"
      });
    }

    /*
    ============================================
    APPROVED
    ============================================
    */

    if (decision === "APPROVED") {

      const { containmentWorker } =
        await import("../engines/containment-worker");

      await containmentWorker({
        userId: incident.user_email,
        incidentId: incident.incident_id,
        sourceIp: incident.source_ip
      });

      await prisma.incidents.update({
        where: {
          incident_id: incidentId
        },
        data: {
          soc_decision: "APPROVED",
          decision_time: new Date(),
          containment_reason: "SOC_APPROVED",
          status: "CONTAINED"
        }
      });

      /*
      ============================================
      LOGIC APP EMAIL NOTIFICATION
      ============================================
      */

      if (process.env.LOGICAPP_URL) {

        await fetch(process.env.LOGICAPP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            eventType: "APPROVED",
            incidentId,
            user: incident.user_email,
            timestamp: new Date().toISOString()
          })
        });

      }

      return res.json({
        success: true,
        decision: "APPROVED",
        incidentId
      });

    }

    /*
    ============================================
    REJECTED
    ============================================
    */

    if (decision === "REJECTED") {

      await prisma.incidents.update({
        where: {
          incident_id: incidentId
        },
        data: {
          soc_decision: "REJECTED",
          decision_time: new Date(),
          containment_reason: "SOC_REJECTED",
          status: "CLOSED"
        }
      });

      /*
      ============================================
      LOGIC APP EMAIL NOTIFICATION
      ============================================
      */

      if (process.env.LOGICAPP_URL) {

        await fetch(process.env.LOGICAPP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            eventType: "REJECTED",
            incidentId,
            user: incident.user_email,
            timestamp: new Date().toISOString()
          })
        });

      }

      return res.json({
        success: true,
        decision: "REJECTED",
        incidentId
      });

    }

  } catch (error) {

    console.error("SOC DECISION ERROR:", error);

    return res.status(500).json({
      success: false,
      error: String(error)
    });

  }

});

export default router;