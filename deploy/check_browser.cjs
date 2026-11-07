const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  require("/opt/artex/skills/api-recon/scripts/node_modules/puppeteer-core");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent("<title>ARTEX preflight</title>");
    assert.equal(await page.title(), "ARTEX preflight");
    console.log("Chromium 检查通过。");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error("Chromium 检查失败：", error.message);
  process.exit(1);
});
