import "dotenv/config";
import { deliverEmails } from "../src/lib/email";
import { prisma } from "../src/lib/prisma";

deliverEmails().then((result) => {
  console.log(result);
  if (result.failed) process.exitCode = 1;
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
