import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initDb, seedDb } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import { authenticate } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { config } from "./config.js";

await initDb();
await seedDb();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authenticate, userRoutes);
app.use("/api/assets", authenticate, assetRoutes);
app.use("/api/tickets", authenticate, ticketRoutes);

app.use(errorHandler);

export default app;
