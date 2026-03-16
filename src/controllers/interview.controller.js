import { PDFParse } from "pdf-parse";
import mongoose from "mongoose";
import {
  generateInterviewReport,
  generateResumePdf,
} from "../services/ai.service.js";
import InterviewReport from "../models/interviewReport.model.js";

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const generateInterviewReportController = async (req, res) => {
  try {
    const resumeFile = req.file;
    const { selfDescription, jobDescription } = req.body;

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ message: "Job description is required" });
    }

    let resumeContent = null;
    if (resumeFile) {
      const parser = new PDFParse({ data: resumeFile.buffer });
      await parser.load();
      resumeContent = (await parser.getText()).text;
    }

    if (!resumeContent && !selfDescription) {
      return res
        .status(400)
        .json({ message: "Please provide a resume or self-description" });
    }

    const report = await generateInterviewReport({
      resume: resumeContent,
      selfDescription,
      jobDescription,
    });

    const interviewReport = await InterviewReport.create({
      user: req.user.id,
      resume: resumeContent,
      selfDescription,
      jobDescription,
      matchScore: report.matchScore,
      interviewQuestions: report.technicalQuestions,
      behavioralQuestions: report.behavioralQuestions,
      skillGaps: report.skillGaps,
      preparationPlans: report.preparationPlan,
      title: report.title,
    });

    res.status(201).json({
      message: "Interview report generated successfully",
      report: interviewReport,
    });
  } catch (error) {
    console.error("Error generating interview report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getInterviewReportController = async (req, res) => {
  try {
    const { interviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ message: "Invalid interview report id" });
    }

    const interviewReport = await InterviewReport.findOne({
      _id: interviewId,
      user: req.user.id,
    });

    if (!interviewReport) {
      return res.status(404).json({ message: "Interview report not found" });
    }

    res.json({
      message: "Interview report fetched successfully",
      report: interviewReport,
    });
  } catch (error) {
    console.error("Error fetching interview report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const allInterviewReportsController = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 8), 50);
    const skip = (page - 1) * limit;

    const query = { user: req.user.id };

    const [interviewReports, total] = await Promise.all([
      InterviewReport.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlans",
        ),
      InterviewReport.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      message: "Interview reports fetched successfully",
      reports: interviewReports,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching interview reports:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const generateResumePdfController = async (req, res) => {
  try {
    const { interviewReportId } = req.params;
    const { resumeData } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(interviewReportId)) {
      return res.status(400).json({ message: "Invalid interview report id" });
    }

    const interviewReport = await InterviewReport.findOne({
      _id: interviewReportId,
      user: req.user.id,
    });

    if (!interviewReport) {
      return res.status(404).json({ message: "Interview report not found" });
    }

    const { resume, selfDescription, jobDescription } = interviewReport;
    const pdfBuffer = await generateResumePdf({
      resume,
      selfDescription,
      jobDescription,
      resumeData,
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resume_${interviewReportId}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating resume PDF:", error);
    const message = /Failed to generate PDF from HTML/i.test(error?.message || "")
      ? "Resume PDF generation failed on server. Please retry in a moment."
      : "Internal server error";
    res.status(500).json({ message });
  }
};
