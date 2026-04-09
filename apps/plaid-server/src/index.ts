import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import plaidRoutes from "./routes/plaid.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json());

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
