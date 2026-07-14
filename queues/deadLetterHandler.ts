export async function handleDeadLetter(message: any) {
  console.log("☠️ DEAD LETTER MESSAGE:", {
    body: message.body,
    deliveryCount: message.deliveryCount,
  });

  // You can later push to:
  // - email alert
  // - Slack
  // - SIEM dashboard
}