import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.js";

const prisma = new PrismaClient();
const app = createApp(prisma);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`The Royal Knot API Server running on port ${PORT}`);
});
