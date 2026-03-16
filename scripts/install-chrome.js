import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const shouldInstallChrome = Boolean(process.env.RENDER) ||
  process.env.INSTALL_PUPPETEER_CHROME === "true";

if (!shouldInstallChrome) {
  console.log("[chrome-install] Skipping Chrome install (not Render and INSTALL_PUPPETEER_CHROME != true).");
  process.exit(0);
}

const cacheDir = process.env.PUPPETEER_CACHE_DIR ||
  path.join(process.cwd(), ".cache", "puppeteer");

try {
  mkdirSync(cacheDir, { recursive: true });

  console.log(`[chrome-install] Using cache dir: ${cacheDir}`);
  console.log("[chrome-install] Installing Chrome for Puppeteer...");

  execSync("npx puppeteer browsers install chrome", {
    stdio: "inherit",
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: cacheDir,
    },
  });

  console.log("[chrome-install] Chrome install complete.");
} catch (error) {
  console.error("[chrome-install] Failed to install Chrome for Puppeteer.");
  console.error(error?.message || error);
  process.exit(1);
}
