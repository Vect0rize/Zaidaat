import { spawn } from 'node:child_process';

const TARGET_URL = process.env.APP_URL || 'http://localhost:3000';
const API_HEALTH = `http://127.0.0.1:${process.env.PORT || 4000}/api/health`;
const MAX_WAIT_MS = 35000;

async function isUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const [webUp, apiUp] = await Promise.all([isUp(TARGET_URL), isUp(API_HEALTH)]);
    if (webUp && apiUp) {
      if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', TARGET_URL], { detached: true, stdio: 'ignore' }).unref();
      }
      console.log(`\n[ZAIDAAT] Website ready at ${TARGET_URL}\n`);
      return;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

main();
