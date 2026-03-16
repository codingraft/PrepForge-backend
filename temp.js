import { generateInterviewReport } from "./src/services/ai.service.js";

const testData = {
  resume: `John Doe
Full Stack Developer | 2 years experience

Skills: JavaScript, React, Node.js, Express, MongoDB, HTML, CSS, Git
Education: B.Tech in Computer Science, XYZ University (2022)

Experience:
- Junior Developer at TechCorp (2022-2024)
  - Built REST APIs with Node.js and Express
  - Developed frontend dashboards using React
  - Worked with MongoDB for data storage
  - Collaborated in agile sprints

Projects:
- E-commerce platform (React, Node.js, Stripe integration)
- Task management app (MERN stack)`,

  selfDescription: `I am a passionate full stack developer with 2 years of hands-on experience building web applications. I enjoy working with JavaScript across the stack and have strong problem-solving skills. I am looking to transition into a senior role and am eager to learn new technologies like TypeScript and cloud services.`,

  jobDescription: `Senior Full Stack Developer - ABC Company

Requirements:
- 3+ years of experience in full stack web development
- Strong proficiency in React, TypeScript, and Node.js
- Experience with cloud services (AWS or GCP)
- Familiarity with CI/CD pipelines and Docker
- Experience with SQL and NoSQL databases
- Strong understanding of RESTful APIs and GraphQL
- Excellent problem-solving and communication skills

Responsibilities:
- Design and develop scalable web applications
- Lead code reviews and mentor junior developers
- Collaborate with product and design teams
- Implement and maintain CI/CD workflows
- Write unit and integration tests`,
};

console.log("Generating interview report...\n");

try {
  const report = await generateInterviewReport(testData);
  console.log("\n=== Interview Preparation Report ===\n");
  console.log(`Match Score: ${report.matchScore}/100\n`);

  console.log("--- Technical Questions ---");
  report.technicalQuestions.forEach((q, i) => {
    console.log(`${i + 1}. ${typeof q === "string" ? q : q.question}`);
  });

  console.log("\n--- Behavioral Questions ---");
  report.behavioralQuestions.forEach((q, i) => {
    console.log(`${i + 1}. ${typeof q === "string" ? q : q.question}`);
  });

  console.log("\n--- Skill Gaps ---");
  report.skillGaps.forEach((g) => {
    console.log(`- ${g.skill} (${g.severity})`);
  });

  console.log("\n--- Preparation Plan ---");
  report.preparationPlan.forEach((d) => {
    console.log(`Day ${d.day}: ${d.focus}`);
    d.tasks.forEach((t) => console.log(`  • ${t}`));
  });
} catch (err) {
  console.error("Test failed:", err.message);
}
