import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import interviewRoutes from "./routes/interview.routes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cookieParser());
app.use(express.json());
app.use(cors(
  {
    origin: (origin, callback) => {
      // Allow non-browser requests/tools with no origin header.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }
));

app.get("/", (req, res) => {
  res.send("Welcome to the Resume Builder API");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRoutes);

export default app;
