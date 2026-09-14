const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB, getDbStatus } = require("./config/db");
const introRoutes = require("./routes/introRoutes");
const schemaRoutes = require("./routes/schemaRoutes");
const profileRoutes = require("./routes/profileRoutes");
const projectRoutes = require("./routes/projectRoutes");
const skillRoutes = require("./routes/skillRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : ["http://localhost:3000", "http://localhost:5173"];

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();

    // Allow Vercel deployments (preview + production) over HTTPS.
    if (parsed.protocol === "https:" && hostname.endsWith(".vercel.app")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy blocked this origin"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

connectDB();

app.get("/", (req, res) => {
  res.json({
    message: "Resume API running",
    docs: "/api/health",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/system/status", (req, res) => {
  const backendUrl = `${req.protocol}://${req.get("host")}`;
  const nowIso = new Date().toISOString();
  res.json({
    status: "ok",
    backend: {
      url: backendUrl,
      uptime: Math.round(process.uptime()),
      timestamp: nowIso,
      healthcheckStatus: "ok",
      healthcheckLastSuccessAt: nowIso,
      healthcheckUrl: `${backendUrl}/api/health`,
    },
    database: getDbStatus(),
  });
});

app.use("/api/intros", introRoutes);
app.use("/api/schema", schemaRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/portfolio", portfolioRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
