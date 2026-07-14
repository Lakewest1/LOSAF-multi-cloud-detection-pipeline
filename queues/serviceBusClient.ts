import { ServiceBusClient } from "@azure/service-bus";

if (!process.env.SERVICE_BUS_CONNECTION) {
  throw new Error("Missing SERVICE_BUS_CONNECTION");
}

export const sbClient = new ServiceBusClient(
  process.env.SERVICE_BUS_CONNECTION
);