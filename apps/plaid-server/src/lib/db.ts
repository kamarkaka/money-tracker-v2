import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Verify DB connection on startup
prisma.$connect().catch((err) => {
  console.error("Database connection failed:", err);
  process.exit(1);
});

// Graceful shutdown
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
