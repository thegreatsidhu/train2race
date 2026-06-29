import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
config();

const p = new PrismaClient();
const u = await p.user.update({
  where: { email: "thegreatsidhu@gmail.com" },
  data: { role: "superadmin" },
});
console.log("Updated:", u.email, "role ->", u.role);
await p.$disconnect();
