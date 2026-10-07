import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Schema pushes need a direct (non-pooled) connection. Set DIRECT_URL to Neon's direct
    // connection string once DATABASE_URL is switched to the pooled one; falls back otherwise.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
