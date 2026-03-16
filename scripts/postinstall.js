import { execSync } from "node:child_process";

const shouldInstallChrome = Boolean(process.env.RENDER) ||
  process.env.INSTALL_PUPPETEER_CHROME === "true";

if (!shouldInstallChrome) {
  console.log("[postinstall] Skipping Chrome install (not Render and INSTALL_PUPPETEER_CHROME != true).");
  process.exit(0);
}

try {
  console.log("[postinstall] Installing Chrome for Puppeteer...");
  execSync("npx puppeteer browsers install chrome", {
    stdio: "inherit",
    env: process.env,
  });
  console.log("[postinstall] Chrome install complete.");
} catch (error) {
  console.error("[postinstall] Failed to install Chrome for Puppeteer.");
  console.error(error?.message || error);
  process.exit(1);
}
