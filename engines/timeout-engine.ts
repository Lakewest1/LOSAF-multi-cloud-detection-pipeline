
import { containmentWorker } from "./containment-worker";

import { prisma } from "../utils/prisma";

export async function processTimeouts() {

  try {

    const incidents =
      await prisma.incidents.findMany({
        where: {
          soc_decision: "PENDING"
        }
      });

    for (const incident of incidents) {

      if (
        incident.approval_deadline &&
        incident.approval_deadline < new Date()
      ) {

        console.log(
          "TIMEOUT CONTAINMENT:",
          incident.incident_id
        );

        try {

          await containmentWorker({
            userId: incident.user_email,
            incidentId: incident.incident_id,
            sourceIp: incident.source_ip
          });

          await prisma.incidents.update({
            where: {
              incident_id: incident.incident_id
            },
            data: {
              soc_decision: "TIMEOUT",
              analyst_decision: "TIMEOUT",
              containment_reason: "NO_SOC_RESPONSE",
              decision_time: new Date(),
              status: "CONTAINED"
            }
          });

          console.log(
            "AUTO CONTAINMENT SUCCESS:",
            incident.incident_id
          );

        } catch (containmentError) {

          console.error(
            "AUTO CONTAINMENT FAILED:",
            incident.incident_id,
            containmentError
          );

        }

      }

    }

  } catch (err) {

    console.error(
      "TIMEOUT ENGINE ERROR:",
      err
    );

  }

}