import "dotenv/config";

import { ServiceBusClient } from "@azure/service-bus";

import { auditWorker } from "./audit-worker";

if (!process.env.SERVICE_BUS_CONNECTION) {
  throw new Error(
    "Missing SERVICE_BUS_CONNECTION"
  );
}

const sbClient = new ServiceBusClient(
  process.env.SERVICE_BUS_CONNECTION
);

const receiver = sbClient.createReceiver(
  "audit-log"
);

console.log(
  "🟢 AUDIT LISTENER RUNNING..."
);

receiver.subscribe({
  processMessage: async (message) => {

    try {

      const event = message.body;

      console.log(
        "📥 AUDIT EVENT:",
        event
      );

      await auditWorker(event);

      await receiver.completeMessage(
        message
      );

      console.log(
        "✅ AUDIT COMPLETED"
      );

    } catch (error) {

      console.error(
        "❌ AUDIT FAILURE:",
        error
      );

      await receiver.abandonMessage(
        message
      );
    }
  },

  processError: async (args) => {

    console.error(
      "SERVICE BUS ERROR:",
      args.error
    );
  }
});

process.on("SIGINT", async () => {

  await receiver.close();

  await sbClient.close();

  process.exit(0);
});