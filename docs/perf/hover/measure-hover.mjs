// D-071 step 4: time from a click on the Scan nav item until the Scan page
// shows, with and without hovering the item first. Scan is used because its
// code is not preloaded in idle time, so only the hover can fetch it early.
//
// Uses puppeteer-core (it ships with Lighthouse; pass its folder as PUPPETEER)
// and the local Chrome, headless, with a fresh empty cache per run.
// Usage: PUPPETEER=<path to puppeteer-core> node measure-hover.mjs <url> [runs]
const { default: puppeteer } = await import(process.env.PUPPETEER);
const url = process.argv[2] ?? "http://localhost:4173/v2/home";
const runs = Number(process.argv[3] ?? 5);
// Typical time between the pointer arriving on a button and the click.
const HOVER_DWELL_MS = 300;

// Same network and CPU profiles as the Lighthouse recording (run.sh).
const profiles = {
  "mobile-4g": { latency: 165, download: 8100, upload: 1350, cpu: 4 },
  "mobile-slow4g": { latency: 562.5, download: 1474.56, upload: 675, cpu: 4 },
};

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const results = {};

for (let run = 1; run <= runs; run++) {
  for (const [name, profile] of Object.entries(profiles)) {
    for (const mode of ["click", "hover+click"]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      const cdp = await page.createCDPSession();
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: profile.latency,
        downloadThroughput: (profile.download * 1024) / 8,
        uploadThroughput: (profile.upload * 1024) / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

      await page.goto(url, { waitUntil: "load", timeout: 120_000 });
      await page.waitForSelector("img.browser-card__image", { timeout: 120_000 });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (mode === "hover+click") {
        const scanButton = (await page.$$(".nav-bar--desktop .nav-item"))[2];
        await scanButton.hover();
        await new Promise((resolve) => setTimeout(resolve, HOVER_DWELL_MS));
      }

      // Click and wait for the Scan page, timed with the page's own clock.
      // element.click() fires no pointer events, so "click" mode gets no
      // hover preload.
      const elapsed = await page.evaluate(async () => {
        const scanButton = document.querySelectorAll(".nav-bar--desktop .nav-item")[2];
        const isScanShown = () =>
          document.querySelector("main")?.innerText.includes("Scan a card") ?? false;
        const start = performance.now();
        scanButton.click();
        await new Promise((resolve) => {
          if (isScanShown()) return resolve();
          const observer = new MutationObserver(() => {
            if (isScanShown()) {
              observer.disconnect();
              resolve();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        });
        return performance.now() - start;
      });

      (results[`${name} ${mode}`] ??= []).push(Math.round(elapsed));
      await context.close();
    }
  }
}
await browser.close();

for (const [key, values] of Object.entries(results)) {
  const sorted = [...values].sort((a, b) => a - b);
  console.log(`${key}: median ${sorted[Math.floor(sorted.length / 2)]} ms (runs ${values.join(", ")})`);
}
