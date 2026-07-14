import { ServiceBusClient } from "@azure/service-bus"

const sbClient =
  new ServiceBusClient(
    process.env.SERVICE_BUS_CONNECTION!
  )

const sender =
  sbClient.createSender("retry-queue")

export async function queueRetry(payload: any) {

  await sender.sendMessages({
    body: payload
  })

  console.log("RETRY QUEUED")
}