import { config } from "./config/index.js";
import { app } from "./app.js";
import { prisma } from "./config/database.js";

async function main() {
  await prisma.$connect();
  console.log("Database connected.");

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

main().catch((e) => {
  console.error("Failed to start server:", e);
  prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
