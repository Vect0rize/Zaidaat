import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure relative paths (data/, uploads/, client/dist/) resolve inside app root under lsnode/Passenger.
if (process.cwd() !== __dirname) {
  try {
    process.chdir(__dirname);
  } catch (err) {
    console.error('[zaidaat] Failed to chdir to app root:', err);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[zaidaat] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[zaidaat] Unhandled Rejection:', reason);
});

if (!process.env.SERVE_CLIENT) {
  process.env.SERVE_CLIENT = 'true';
}
if (!process.env.TRUST_PROXY) {
  process.env.TRUST_PROXY = 'true';
}

function ensureBuiltBundles() {
  const serverEntry = path.join(__dirname, 'dist', 'server', 'index.js');
  const clientEntry = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(serverEntry) && fs.existsSync(clientEntry)) {
    return;
  }
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  if (!fs.existsSync(path.join(__dirname, 'client', 'node_modules', 'vite'))) {
    console.log('[zaidaat] Installing client dependencies...');
    execFileSync(npmBin, ['--prefix', 'client', 'install', '--include=dev', '--no-audit', '--no-fund'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }
  console.log('[zaidaat] Compiling server and client bundles...');
  execFileSync(npmBin, ['run', 'build'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

async function boot() {
  await import('node:sqlite');
  ensureBuiltBundles();
  const { startServer } = await import('./dist/server/index.js');
  if (process.env.ZAIDAAT_NO_LISTEN !== '1') {
    startServer();
  }
}

// Avoid top-level await so Node 22 require(esm) and Hostinger lsnode load cleanly.
if (process.env.ZAIDAAT_NO_LISTEN !== '1') {
  boot().catch((err) => {
    console.error('[zaidaat] Fatal startup failure:', err);
    process.exit(1);
  });
}
