import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import plaidRoutes from "./routes/plaid.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Trust first proxy (load balancer / reverse proxy) so req.ip reflects the real client IP
app.set("trust proxy", 1);

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
if (process.env.NODE_ENV !== "production") {
  app.use(cors());
}
app.use(express.json({ limit: "16kb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/auth", authRoutes);
app.use("/plaid", plaidRoutes);

app.listen(PORT, () => {
  console.log(`Plaid server listening on port ${PORT}`);
});
