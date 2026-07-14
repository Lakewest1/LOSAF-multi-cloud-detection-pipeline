import "dotenv/config";
import { ServiceBusClient } from "@azure/service-bus";
import { approvalWorker } from "./approval-worker";

if (!process.env.SERVICE_BUS_CONNECTION) {
  throw new Error("Missing SERVICE_BUS_CONNECTION");
}

const sbClient = new ServiceBusClient(
  process.env.SERVICE_BUS_CONNECTION
);

const receiver = sbClient.createReceiver("analyst-approval");

console.log("🟡 APPROVAL LISTENER RUNNING...");

receiver.subscribe({
  processMessage: async (message) => {
    const event = message.body;

    console.log("📥 APPROVAL EVENT:", event);

    try {
      await approvalWorker(event);

      await receiver.completeMessage(message);

      console.log("✅ APPROVAL COMPLETED");
    } catch (error: any) {
      console.error("❌ APPROVAL FAILURE:", error);

      // 🔁 RETRY + DLQ STRATEGY
      if (message.deliveryCount > 5) {
        await receiver.deadLetterMessage(message, {
          deadLetterReason: "Approval failed after retries",
        });

        console.log("☠️ SENT TO DLQ");
      } else {
        await receiver.abandonMessage(message);
      }
    }
  },

  processError: async (args) => {
    console.error("🚨 SERVICE BUS ERROR:", args.error);
  },
});

// 🧹 GRACEFUL SHUTDOWN
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down approval worker...");

  await receiver.close();
  await sbClient.close();

  process.exit(0);
});