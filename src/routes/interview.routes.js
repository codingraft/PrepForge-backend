import express from "express";
import { authUser } from "../middleware/auth.middleware.js";
import {
  allInterviewReportsController,
  generateInterviewReportController,
  generateResumePdfController,
  getInterviewReportController,
} from "../controllers/interview.controller.js";
import { upload } from "../middleware/file.middleware.js";
const router = express.Router();

router.post(
  "/generate",
  authUser,
  upload.single("resume"),
  generateInterviewReportController,
);

router.get("/report/:interviewId", authUser, getInterviewReportController);

router.get("/reports", authUser, allInterviewReportsController);

router.post(
  "/resume/pdf/:interviewReportId",
  authUser,
  generateResumePdfController,
);

export default router;
