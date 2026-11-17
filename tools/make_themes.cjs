// Draws the generated 1080x1920 theme backgrounds in assets/themes/ as SVG, then PNG.
// (assets/themes/gta6.png is supplied artwork and is not produced here.)
// Dev tool only (needs Playwright): node tools/make_themes.cjs
// The renderer cuts the gameplay window out of these at render time, so the
// art only has to look good above y=420 and below y=1240.

const { chromium } = require("playwright");
const { mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const W = 1080, H = 1920;
const WIN_TOP = 420, WIN_BOTTOM = 1240;

function valorant() {
  const red = "#ff4655", navy = "#0f1923", ink = "#16232f", cream = "#ece8e1";
  let dots = "";
  for (let y = WIN_BOTTOM + 60; y < H; y += 44) {
    for (let x = 62; x < W; x += 44) {
      dots += `<circle cx="${x}" cy="${y}" r="2.2"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="hatch" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)">
      <rect width="26" height="26" fill="${navy}"/><rect width="9" height="26" fill="${ink}"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${navy}" stop-opacity="0"/><stop offset="1" stop-color="${navy}" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#hatch)"/>
  <!-- top: a red slab cutting in from the left, with a cream edge line -->
  <polygon points="0,0 760,0 500,${WIN_TOP + 40} 0,${WIN_TOP + 40}" fill="${red}"/>
  <polygon points="760,0 790,0 530,${WIN_TOP + 40} 500,${WIN_TOP + 40}" fill="${cream}"/>
  <polygon points="830,0 846,0 586,${WIN_TOP + 40} 570,${WIN_TOP + 40}" fill="${red}" opacity="0.75"/>
  <polygon points="1080,96 1080,150 900,150 934,96" fill="${red}"/>
  <rect x="902" y="170" width="178" height="6" fill="${cream}" opacity="0.8"/>
  <!-- bottom: dotted field and a red slab from the right -->
  <g fill="${cream}" opacity="0.16">${dots}</g>
  <rect y="${WIN_BOTTOM}" width="${W}" height="${H - WIN_BOTTOM}" fill="url(#fade)"/>
  <polygon points="1080,1600 1080,1920 330,1920 560,1600" fill="${red}"/>
  <polygon points="560,1600 530,1600 300,1920 330,1920" fill="${cream}"/>
  <polygon points="0,${WIN_BOTTOM - 20} 150,${WIN_BOTTOM - 20} 96,${WIN_BOTTOM + 56} 0,${WIN_BOTTOM + 56}" fill="${red}"/>
  <rect x="0" y="${WIN_BOTTOM + 72}" width="210" height="6" fill="${cream}" opacity="0.8"/>
</svg>`;
}

(async () => {
  const outDir = path.join(__dirname, "..", "assets", "themes");
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const [name, svg] of [["valorant", valorant()]]) {
    writeFileSync(`${outDir}/${name}.svg`, svg);
    await page.setContent(`<body style="margin:0;background:#000">${svg}</body>`);
    await page.screenshot({ path: `${outDir}/${name}.png`, clip: { x: 0, y: 0, width: W, height: H } });
    console.log("wrote", name);
  }
  await browser.close();
})();
