import "dotenv/config";

import { ServiceBusClient } from "@azure/service-bus";

import { containmentWorker } from "../engines/containment-worker";

if (!process.env.SERVICE_BUS_CONNECTION) {
  throw new Error(
    "Missing SERVICE_BUS_CONNECTION"
  );
}

const sbClient = new ServiceBusClient(
  process.env.SERVICE_BUS_CONNECTION
);

const receiver = sbClient.createReceiver(
  "containment-actions"
);

console.log(
  "🔴 CONTAINMENT LISTENER RUNNING..."
);

receiver.subscribe({
  processMessage: async (message) => {

    try {

      const event = message.body;

      console.log(
        "📥 CONTAINMENT EVENT:",
        event
      );

      await containmentWorker(event);

      await receiver.completeMessage(
        message
      );

      console.log(
        "✅ MESSAGE COMPLETED"
      );

    } catch (error) {

      console.error(
        "❌ CONTAINMENT FAILURE:",
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