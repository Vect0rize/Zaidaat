import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const safeReal = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const isDirectEntry = Boolean(process.argv[1]) && safeReal(process.argv[1]) === safeReal(__filename);

// On Node 22.5 - 22.12, `node:sqlite` requires --experimental-sqlite.
async function ensureSqliteSupport() {
  try {
    await import('node:sqlite');
    return true;
  } catch (err) {
    if (
      isDirectEntry &&
      !process.execArgv.includes('--experimental-sqlite') &&
      !process.env.ZAIDAAT_SQLITE_RETRY
    ) {
      console.log('[zaidaat] Enabling --experimental-sqlite for Node 22 compatibility...');
      const child = spawn(process.execPath, ['--experimental-sqlite', __filename, ...process.argv.slice(2)], {
        stdio: 'inherit',
        env: { ...process.env, ZAIDAAT_SQLITE_RETRY: '1' },
      });
      child.on('exit', (code, signal) => {
        if (signal) process.kill(process.pid, signal);
        process.exit(code ?? 0);
      });
      return false;
    }
    throw new Error(
      `Node.js sqlite module is unavailable (${err?.message || err}). Please use Node 22.13+ or Node 24+.`
    );
  }
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

if (!process.env.SERVE_CLIENT) {
  process.env.SERVE_CLIENT = 'true';
}
if (!process.env.TRUST_PROXY) {
  process.env.TRUST_PROXY = 'true';
}

let exportedApp = null;
const ready = await ensureSqliteSupport();
if (ready) {
  ensureBuiltBundles();
  const { createApp, startServer } = await import('./dist/server/index.js');
  if (isDirectEntry) {
    startServer();
  } else {
    exportedApp = createApp();
  }
}

export default exportedApp;
