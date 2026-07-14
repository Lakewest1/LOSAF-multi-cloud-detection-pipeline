import "dotenv/config";

import { v4 as uuidv4 } from "uuid";

import {
  ServiceBusClient
} from "@azure/service-bus";

const sbClient = new ServiceBusClient(
  process.env.SERVICE_BUS_CONNECTION!
);

export async function routeEvent(
  event: any,
  tier: string,
  mlResult: any
) {

  const incidentId = uuidv4();

  let queueName = "audit-log";

  // -----------------------------
  // ROUTING DECISION
  // -----------------------------
  if (
    tier === "HIGH" ||
    tier === "CRITICAL"
  ) {
    queueName = "containment-actions";
  }

  else if (tier === "MEDIUM") {
    queueName = "analyst-approval";
  }

  const sender =
    sbClient.createSender(queueName);

  // -----------------------------
  // DISPATCH PAYLOAD
  // -----------------------------
  const payload = {
    incidentId,
    action: tier,

    userId: event.userId,

    sourceIp:
      event.sourceIp || "0.0.0.0",

    country: event.country,
    device: event.device,

    usualCountries:
      event.usualCountries || [],

    usualDevices:
      event.usualDevices || [],

    countryChangedWithin1Hour:
      event.countryChangedWithin1Hour || false,

    mfaUsed:
      event.mfaUsed || false,

    isNewAdminAction:
      event.isNewAdminAction || false,

    vtDetections:
      event.vtDetections || 0,

    abuseConfidence:
      event.abuseConfidence || 0,

    isAdmin:
      event.isAdmin || false,

    persistenceDetected:
      event.persistenceDetected || false,

    uebaScore:
      event.uebaScore?.uebaScore || 0,

    mlThreatScore:
      mlResult.mlThreatScore || 0,

    timestamp:
      new Date().toISOString()
  };

  // -----------------------------
  // SEND TO SERVICE BUS
  // -----------------------------
  await sender.sendMessages({
    body: payload
  });

  console.log(
    `📤 SENT TO ${queueName.toUpperCase()}`
  );

  await sender.close();
}