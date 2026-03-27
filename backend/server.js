require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimiter = require("./middleware/rateLimiter");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimiter(300));
app.use((req, _, next) => { console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`); next(); });

app.use("/api/feed", require("./routes/feed"));
app.use("/api/markets", require("./routes/markets"));
app.use("/api/trader", require("./routes/traders"));
app.use("/api/leaderboard", require("./routes/leaderboard"));
app.use("/api/social", require("./routes/social"));
app.use("/api/trade", require("./routes/trading"));
// app.use("/api/vault", require("./routes/vault"));
// app.use("/api/builder", require("./routes/builder"));

app.get("/health", (_, res) => res.json({ status: "ok", version: "2.0.0", ts: Date.now() }));
app.use((_, res) => res.status(404).json({ success: false, error: "Not found" }));
app.use((err, _, res, __) => res.status(500).json({ success: false, error: err.message }));

app.listen(PORT, () => {
  console.log(`
  ██╗  ██╗ █████╗ ██╗   ██╗ █████╗ ██╗     v2.0
  ██║  ██║██╔══██╗╚██╗ ██╔╝██╔══██╗██║
  ███████║███████║ ╚████╔╝ ███████║██║
  ██╔══██║██╔══██║  ╚██╔╝  ██╔══██║██║
  ██║  ██║██║  ██║   ██║   ██║  ██║██║
  
  🚀 http://localhost:${PORT}
  💰 Fee address : ${process.env.HAYAI_FEE_ADDRESS || "NOT SET — set HAYAI_FEE_ADDRESS"}
  🏦 Vault address: ${process.env.HAYAI_VAULT_ADDRESS || "NOT SET — create vault first"}
  📈 Fee (tenths-bps): ${process.env.HAYAI_FEE_TENTHS_BPS || 10}
  `);
});
