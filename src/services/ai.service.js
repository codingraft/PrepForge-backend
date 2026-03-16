import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
dotenv.config();

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .describe(
      "A score between 0 and 100 indicating how well the candidate's resume or self-description match the job description.",
    ),
  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question asked during the interview."),
        intention: z
          .string()
          .describe("The intention behind asking the technical question."),
        answer: z
          .string()
          .describe(
            "How to answer the technical question effectively, including key points to cover.",
          ),
      }),
    )
    .describe(
      "A list of technical questions that may be asked during the interview, along with their intentions and effective answers.",
    ),
  behavioralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The behavioral question asked during the interview."),
        intention: z
          .string()
          .describe("The intention behind asking the behavioral question."),
        answer: z
          .string()
          .describe(
            "How to answer the behavioral question effectively, including key points to cover.",
          ),
      }),
    )
    .describe(
      "A list of behavioral questions that may be asked during the interview, along with their intentions and effective answers.",
    ),
  skillGaps: z
    .array(
      z.object({
        skill: z
          .string()
          .describe(
            "The skill that the candidate may be lacking based on their resume and self-description.",
          ),
        severity: z
          .enum(["low", "medium", "high"])
          .describe(
            "The severity of the skill gap, indicating how critical it is for the job role.",
          ),
      }),
    )
    .describe(
      "A list of potential skill gaps identified based on the candidate's resume and self-description, along with their severity levels.",
    ),
  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe("The day number in the preparation plan, starting from 1."),
        focus: z
          .string()
          .describe("The main focus or topic for that day of preparation."),
        tasks: z
          .array(z.string())
          .describe(
            "A list of specific tasks or activities to complete on that day to prepare for the interview.",
          ),
      }),
    )
    .describe(
      "A structured preparation plan outlining daily focus areas and tasks to help the candidate effectively prepare for the interview, especially addressing any identified skill gaps.",
    ),
  title: z.string().describe("The title of the interview preparation report."),
});

export const generateInterviewReport = async ({
  resume,
  selfDescription,
  jobDescription,
}) => {
  try {
    const candidateBackground = [
      resume ? `Resume:\n${resume}` : "",
      selfDescription ? `Self-Description:\n${selfDescription}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt = `You are an expert career coach specializing in preparing candidates for job interviews. Based on the following information, generate a comprehensive interview preparation report that includes:

1. Match Score: A score between 0 and 100 indicating how well the candidate's resume or self-description match the job description.

2. Technical Questions: A list of technical questions that may be asked during the interview, along with their intentions and effective answers.

3. Behavioral Questions: A list of behavioral questions that may be asked during the interview, along with their intentions and effective answers.

4. Skill Gaps: A list of potential skill gaps identified based on the candidate's background, along with their severity levels (low, medium, high).

5. Preparation Plan: A structured preparation plan outlining daily focus areas and tasks to help the candidate effectively prepare for the interview, especially addressing any identified skill gaps.

Candidate Background:
${candidateBackground}

Job Description:
${jobDescription}

Please provide the interview preparation report in a structured JSON format adhering to the following schema:
${JSON.stringify(z.toJSONSchema(interviewReportSchema))}`;

    const res = await client.chat.complete({
      model: "mistral-small-latest",
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert career coach. Always respond with valid JSON only, no extra text.",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = JSON.parse(res.choices[0].message.content);
    // console.dir(parsed, { depth: null });
    return parsed;
  } catch (error) {
    console.error("Error generating interview report:", error);
    throw new Error("Failed to generate interview report");
  }
};

const generatePdfFromHtml = async (html) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "6mm",
        right: "6mm",
        bottom: "6mm",
        left: "6mm",
      },
    });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF from HTML:", error);
    throw new Error("Failed to generate PDF from HTML");
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const looksLikeEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const looksLikeUrlLike = (value = "") =>
  /^(https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})/i.test(value.trim());

const extractHost = (value = "") => {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(`https://${raw}`);
    return (url.hostname || "").toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

const isMeaningfulContactToken = (value = "") => {
  const raw = value.trim();
  if (!raw) return false;
  if (looksLikeEmail(raw)) return true;

  const lower = raw.toLowerCase();
  const host = extractHost(lower);
  const hasPath = /\//.test(lower.replace(/^https?:\/\//, ""));

  const blockedExact = new Set([
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "next.js",
    "node.js",
    "express.js",
    "react.js",
    "vue.js",
    "angular.js",
    "nestjs.com",
  ]);

  if (blockedExact.has(lower) || blockedExact.has(host)) return false;
  if (host.endsWith(".js")) return false;

  const allowHosts = new Set([
    "linkedin.com",
    "github.com",
    "gitlab.com",
    "leetcode.com",
    "stackoverflow.com",
    "medium.com",
    "x.com",
    "twitter.com",
  ]);

  const tld = host.split(".").pop() || "";
  const allowTlds = new Set(["dev", "app", "io", "me", "ai", "xyz"]);

  if (/^https?:\/\//.test(lower) || /^www\./.test(lower)) {
    return !host.endsWith(".js");
  }

  if (allowHosts.has(host)) return true;
  if (hasPath && /\./.test(host)) return true;
  if (allowTlds.has(tld)) return true;

  return false;
};

const toHref = (value = "") => {
  const raw = value.trim();
  if (!raw) return null;
  if (looksLikeEmail(raw)) return `mailto:${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/.*)?$/i.test(raw)) {
    return `https://${raw}`;
  }
  return null;
};

const extractReferenceLinks = (rawResume = "") => {
  if (!rawResume) return [];

  const found = [];
  const regexes = [
    /https?:\/\/[^\s|,;]+/gi,
    /\bwww\.[^\s|,;]+/gi,
    /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|,;]*)?/gi,
    /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/gi,
  ];

  for (const re of regexes) {
    const matches = rawResume.match(re) || [];
    for (const token of matches) {
      const clean = token.replace(/[)\].,;]+$/g, "");
      if (clean && isMeaningfulContactToken(clean)) found.push(clean);
    }
  }

  const unique = [];
  const seen = new Set();
  for (const token of found) {
    const key = token.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(token);
    }
  }
  return unique;
};

const renderContactItem = (value = "") => {
  if (!isMeaningfulContactToken(value)) return "";
  const text = escapeHtml(value);
  const href = toHref(value);
  if (!href) return `<span>${text}</span>`;
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

const clampText = (value = "", max = 120) => {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
};

const compactResumeData = (raw = {}) => {
  const skills = (raw.skills || []).slice(0, 4).map((group) => ({
    category: clampText(group?.category || "Skills", 24),
    items: (group?.items || []).slice(0, 8).map((item) => clampText(item, 24)),
  }));

  const experience = (raw.experience || []).slice(0, 3).map((item) => ({
    role: clampText(item?.role || "", 48),
    company: clampText(item?.company || "", 48),
    location: clampText(item?.location || "", 36),
    startDate: clampText(item?.startDate || "", 18),
    endDate: clampText(item?.endDate || "", 18),
    bullets: (item?.bullets || []).slice(0, 4).map((b) => clampText(b, 135)),
  }));

  const projects = (raw.projects || []).slice(0, 2).map((item) => ({
    name: clampText(item?.name || "Project", 50),
    link: clampText(item?.link || "", 42),
    bullets: (item?.bullets || []).slice(0, 3).map((b) => clampText(b, 120)),
  }));

  const education = (raw.education || []).slice(0, 2).map((item) => ({
    degree: clampText(item?.degree || "", 60),
    institute: clampText(item?.institute || "", 56),
    startDate: clampText(item?.startDate || "", 18),
    endDate: clampText(item?.endDate || "", 18),
  }));

  const certifications = (raw.certifications || [])
    .slice(0, 3)
    .map((item) => ({
      name: clampText(item?.name || "", 56),
      issuer: clampText(item?.issuer || "", 44),
    }));

  return {
    fullName: clampText(raw.fullName || "Candidate Name", 42),
    headline: clampText(raw.headline || "Professional Profile", 90),
    location: clampText(raw.location || "", 42),
    contact: (raw.contact || []).slice(0, 6).map((c) => clampText(c, 50)),
    summary: clampText(raw.summary || "", 650),
    skills,
    experience,
    projects,
    education,
    certifications,
  };
};

const applyResumeOverrides = (base = {}, overrides = {}) => {
  const merged = { ...base };

  const stringFields = ["fullName", "headline", "location", "summary"];
  for (const key of stringFields) {
    if (typeof overrides[key] === "string" && overrides[key].trim()) {
      merged[key] = overrides[key].trim();
    }
  }

  if (Array.isArray(overrides.contact) && overrides.contact.length > 0) {
    merged.contact = overrides.contact.filter(Boolean);
  }

  if (Array.isArray(overrides.skills) && overrides.skills.length > 0) {
    merged.skills = overrides.skills;
  }

  if (Array.isArray(overrides.experience) && overrides.experience.length > 0) {
    merged.experience = overrides.experience;
  }

  if (Array.isArray(overrides.projects) && overrides.projects.length > 0) {
    merged.projects = overrides.projects;
  }

  if (Array.isArray(overrides.education) && overrides.education.length > 0) {
    merged.education = overrides.education;
  }

  if (
    Array.isArray(overrides.certifications) &&
    overrides.certifications.length > 0
  ) {
    merged.certifications = overrides.certifications;
  }

  return merged;
};

const renderList = (items = [], className = "") =>
  items
    .filter(Boolean)
    .map((item) => `<li class="${className}">${escapeHtml(item)}</li>`)
    .join("");

const renderResumeHtml = (resumeData, rawResume = "") => {
  const normalized = compactResumeData(resumeData);
  const {
    fullName,
    headline,
    location,
    contact,
    summary,
    skills,
    experience,
    projects,
    education,
    certifications,
  } = normalized;

  const aiContact = (Array.isArray(contact) ? contact : []).filter(Boolean);
  const sourceLinks = extractReferenceLinks(rawResume);
  const mergedContact = [...aiContact, ...sourceLinks, location].filter(Boolean);

  const dedupedContact = [];
  const seenContact = new Set();
  for (const item of mergedContact) {
    const key = String(item).trim().toLowerCase();
    if (!seenContact.has(key)) {
      seenContact.add(key);
      dedupedContact.push(String(item).trim());
    }
  }

  const contactLine = dedupedContact
    .filter((item) => isMeaningfulContactToken(item))
    .map((item) => renderContactItem(item))
    .filter(Boolean)
    .join(" <span>•</span> ");

  const highlightChips = [
    ...skills.flatMap((group) => group?.items || []),
    ...experience.flatMap((role) => role?.bullets || []),
  ]
    .filter(Boolean)
    .slice(0, 5)
    .map((item) => `<span class="chip">${escapeHtml(clampText(item, 42))}</span>`)
    .join("");

  const skillsHtml = (skills || [])
    .map((group) => {
      const title = escapeHtml(group?.category || "Skills");
      const items = (group?.items || []).map((i) => escapeHtml(i)).join(", ");
      return `<p><strong>${title}:</strong> ${items}</p>`;
    })
    .join("");

  const expHtml = (experience || [])
    .map((item) => {
      const role = escapeHtml(item?.role || "");
      const company = escapeHtml(item?.company || "");
      const locationText = escapeHtml(item?.location || "");
      const duration = [item?.startDate, item?.endDate]
        .filter(Boolean)
        .map((d) => escapeHtml(d))
        .join(" - ");

      return `
        <article class="entry">
          <div class="entry__row">
            <h3>${role}${company ? ` - ${company}` : ""}</h3>
            <span class="entry__meta">${duration}</span>
          </div>
          ${locationText ? `<p class="entry__location">${locationText}</p>` : ""}
          <ul>${renderList(item?.bullets || [])}</ul>
        </article>
      `;
    })
    .join("");

  const projectHtml = (projects || [])
    .map((item) => {
      const name = escapeHtml(item?.name || "Project");
      const link = item?.link ? escapeHtml(item.link) : "";
      return `
        <article class="entry">
          <div class="entry__row">
            <h3>${name}</h3>
            ${link ? `<span class="entry__meta">${link}</span>` : ""}
          </div>
          <ul>${renderList(item?.bullets || [])}</ul>
        </article>
      `;
    })
    .join("");

  const eduHtml = (education || [])
    .map((item) => {
      const degree = escapeHtml(item?.degree || "");
      const institute = escapeHtml(item?.institute || "");
      const duration = [item?.startDate, item?.endDate]
        .filter(Boolean)
        .map((d) => escapeHtml(d))
        .join(" - ");
      return `
        <article class="entry">
          <div class="entry__row">
            <h3>${degree}</h3>
            <span class="entry__meta">${duration}</span>
          </div>
          <p class="entry__location">${institute}</p>
        </article>
      `;
    })
    .join("");

  const certHtml = (certifications || [])
    .map((item) => {
      const name = escapeHtml(item?.name || "");
      const issuer = escapeHtml(item?.issuer || "");
      return `<p><strong>${name}</strong>${issuer ? ` - ${issuer}` : ""}</p>`;
    })
    .join("");

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        color: #111827;
        background: #ffffff;
      }
      .resume {
        padding: 18px 16px;
        line-height: 1.42;
        min-height: 1110px;
      }
      .header {
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 12px;
        margin-bottom: 12px;
      }
      .name {
        margin: 0;
        font-size: 34px;
        font-weight: 750;
        letter-spacing: -0.5px;
        color: #0f172a;
      }
      .headline {
        margin: 6px 0 10px;
        font-size: 16px;
        color: #1d4ed8;
        font-weight: 600;
      }
      .contact {
        margin: 0;
        font-size: 12.5px;
        color: #374151;
        display: flex;
        flex-wrap: wrap;
        gap: 6px 10px;
      }
      .contact a {
        color: #1d4ed8;
        text-decoration: none;
      }
      .contact a:hover {
        text-decoration: underline;
      }
      section {
        margin-top: 14px;
        break-inside: avoid;
      }
      .highlights {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chip {
        font-size: 11.6px;
        font-weight: 600;
        color: #1d4ed8;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        padding: 3px 10px;
      }
      .section-title {
        margin: 0 0 8px;
        font-size: 14px;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        font-weight: 700;
      }
      .section-body p {
        margin: 0 0 6px;
        font-size: 12.8px;
      }
      .entry {
        margin-bottom: 9px;
      }
      .entry__row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
      }
      .entry h3 {
        margin: 0;
        font-size: 13.2px;
        font-weight: 700;
        color: #111827;
      }
      .entry__meta {
        font-size: 11.3px;
        color: #4b5563;
        white-space: nowrap;
      }
      .entry__location {
        margin: 2px 0 5px;
        font-size: 11.4px;
        color: #4b5563;
      }
      ul {
        margin: 6px 0 0 16px;
        padding: 0;
      }
      li {
        margin: 0 0 4px;
        font-size: 12.2px;
      }
      .summary {
        font-size: 12.8px;
      }
    </style>
  </head>
  <body>
    <main class="resume">
      <header class="header">
        <h1 class="name">${escapeHtml(fullName || "Candidate Name")}</h1>
        <p class="headline">${escapeHtml(headline || "Professional Profile")}</p>
        <p class="contact">${contactLine}</p>
      </header>

      <section>
        <h2 class="section-title">Summary</h2>
        <div class="section-body">
          <p class="summary">${escapeHtml(summary || "")}</p>
          ${highlightChips ? `<div class="highlights">${highlightChips}</div>` : ""}
        </div>
      </section>

      <section>
        <h2 class="section-title">Technical Skills</h2>
        <div class="section-body">${skillsHtml}</div>
      </section>

      <section>
        <h2 class="section-title">Work Experience</h2>
        <div class="section-body">${expHtml}</div>
      </section>

      <section>
        <h2 class="section-title">Projects</h2>
        <div class="section-body">${projectHtml}</div>
      </section>

      <section>
        <h2 class="section-title">Education</h2>
        <div class="section-body">${eduHtml}</div>
      </section>

      <section>
        <h2 class="section-title">Certifications</h2>
        <div class="section-body">${certHtml}</div>
      </section>
    </main>
  </body>
</html>`;
};

export const generateResumePdf = async ({
  resume,
  selfDescription,
  jobDescription,
  resumeData,
}) => {
  try {
    const resumePdfSchema = z.object({
      fullName: z.string().describe("Candidate full name"),
      headline: z.string().describe("One-line professional headline"),
      location: z.string().describe("City, State, Country or current location"),
      contact: z
        .array(z.string())
        .describe(
          "Contact details like email, phone, LinkedIn, GitHub, portfolio in plain text",
        ),
      summary: z
        .string()
        .describe("4-6 line ATS-friendly professional summary tailored to job"),
      skills: z.array(
        z.object({
          category: z.string(),
          items: z.array(z.string()),
        }),
      ),
      experience: z.array(
        z.object({
          role: z.string(),
          company: z.string(),
          location: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          bullets: z.array(z.string()),
        }),
      ),
      projects: z.array(
        z.object({
          name: z.string(),
          link: z.string().optional(),
          bullets: z.array(z.string()),
        }),
      ),
      education: z.array(
        z.object({
          degree: z.string(),
          institute: z.string(),
          startDate: z.string(),
          endDate: z.string(),
        }),
      ),
      certifications: z.array(
        z.object({
          name: z.string(),
          issuer: z.string(),
        }),
      ),
    });

    const prompt = `You are an expert resume writer. Based on the information below, generate a professional ATS-focused resume in structured JSON. Prioritize relevance to the job description and use concise, achievement-focused bullet points.

Candidate Background:
Resume:
${resume}

Self-Description:
${selfDescription}

Job Description:
${jobDescription}

Constraints:
- Use plain text only (no markdown, no HTML).
- Keep bullets concise and measurable when possible.
- Keep formatting consistent and recruiter-friendly.
- Preserve all available contact links/handles from source resume in the contact array (email, phone, LinkedIn, GitHub, portfolio, LeetCode, etc.).
- Do not omit URLs/domains if present in source text.
- Target a strict one-page resume: concise sections, limited bullets, highest-impact content only.
- Keep experience to max 3 roles, max 4 bullets each; projects max 2 with 3 bullets each.
- Summary must be 4-5 lines and impact-focused.

Return JSON matching this schema exactly:
${JSON.stringify(z.toJSONSchema(resumePdfSchema))}`;

    const res = await client.chat.complete({
      model: "mistral-small-latest",
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer. Always respond with valid JSON only, no extra text.",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = JSON.parse(res.choices[0].message.content);
    const finalResumeData = applyResumeOverrides(parsed, resumeData || {});
    const html = renderResumeHtml(finalResumeData, resume || "");
    const pdfBuffer = await generatePdfFromHtml(html);
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating resume PDF:", error);
    throw new Error("Failed to generate resume PDF");
  }
};
