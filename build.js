/**
 * QuantWP SideCart – Asset Watcher & Builder
 * Run with: bun run watch
 *
 * Watches assets/js and assets/css for changes and rebuilds
 * the minified files automatically using terser + lightningcss.
 */

import { watch } from "fs";
import { $ } from "bun";

async function buildJS() {
  console.log("[build] Minifying JS...");
  await $`bunx terser assets/js/side-cart.js  -o assets/js/side-cart.min.js  -c -m`;
  await $`bunx terser assets/js/cross-sells.js -o assets/js/cross-sells.min.js -c -m`;
  await $`bunx terser assets/js/admin.js       -o assets/js/admin.min.js       -c -m`;
  console.log("[build] JS done.");
}

async function buildCSS() {
  console.log("[build] Minifying CSS...");
  await $`bunx clean-css-cli -o assets/css/side-cart.min.css assets/css/side-cart.css`;
  await $`bunx clean-css-cli -o assets/css/admin.min.css     assets/css/admin.css`;
  console.log("[build] CSS done.");
}

// Initial build on start
console.log("[build] Running initial build...");
await buildJS();
await buildCSS();
console.log("[watch] Watching assets/js and assets/css for changes...\n");

// Watch JS — skip .min.js files to avoid feedback loops
watch("assets/js", async (_, filename) => {
  if (filename && !filename.endsWith(".min.js")) {
    console.log(`[watch] JS changed: ${filename}`);
    await buildJS();
  }
});

// Watch CSS — skip .min.css files
watch("assets/css", async (_, filename) => {
  if (filename && !filename.endsWith(".min.css")) {
    console.log(`[watch] CSS changed: ${filename}`);
    await buildCSS();
  }
});
