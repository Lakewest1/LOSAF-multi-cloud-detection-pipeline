import { Router } from "express";
import { prisma } from "../utils/prisma";
const router = Router();


router.get("/incidents", async (_, res) => {

  try {

    const incidents =
      await prisma.incidents.findMany({
        orderBy: {
          created_at: "desc"
        },
        select: {
          incident_id: true,
          severity: true,
          risk_score: true,
          status: true,
          user_email: true,
          source_ip: true,
          created_at: true
        }
      });

    res.json(incidents);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: String(error)
    });

  }

});

export default router;