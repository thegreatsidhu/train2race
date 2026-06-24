import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const entries = await prisma.teamChallengeEntry.deleteMany({});
const challenges = await prisma.teamChallenge.deleteMany({});
console.log(`Deleted ${entries.count} entries and ${challenges.count} challenges.`);
await prisma.$disconnect();
