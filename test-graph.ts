import { graphClient } from "./graph/graphClient";

async function main() {

  const result = await graphClient
    .api("/users")
    .top(1)
    .get();

  console.log(result);
}

main().catch(console.error);