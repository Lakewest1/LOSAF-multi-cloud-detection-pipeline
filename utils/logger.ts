export function logEvent(
  event: string,
  data: any
) {
  console.log(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...data
    })
  );
}