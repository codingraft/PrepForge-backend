import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import interviewRoutes from "./routes/interview.routes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(cors(
  {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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
