import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

if (process.env.ZAIDAAT_SKIP_POSTINSTALL === '1') {
  process.exit(0);
}

const rootDir = process.cwd();
const clientDir = path.join(rootDir, 'client');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, args, cwd = rootDir) {
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ZAIDAAT_SKIP_POSTINSTALL: '1' },
  });
}

const hasTscNow = () =>
  fs.existsSync(path.join(rootDir, 'node_modules', 'typescript')) ||
  fs.existsSync(path.join(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'));

if (!hasTscNow()) {
  console.log('[zaidaat] Installing build tooling (devDependencies)...');
  run(npmBin, ['install', '--include=dev', '--no-audit', '--no-fund']);
}

const clientModules = path.join(clientDir, 'node_modules');
const hasVite =
  fs.existsSync(path.join(clientModules, 'vite')) ||
  fs.existsSync(path.join(clientModules, '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite'));

if (!hasVite) {
  console.log('[zaidaat] Installing client workspace dependencies...');
  run(npmBin, ['--prefix', 'client', 'install', '--include=dev', '--no-audit', '--no-fund']);
}

const serverDistExists = fs.existsSync(path.join(rootDir, 'dist', 'server', 'index.js'));
const clientDistExists = fs.existsSync(path.join(clientDir, 'dist', 'index.html'));

if (hasTscNow() && (!serverDistExists || !clientDistExists || process.env.CI || process.env.npm_lifecycle_event === 'postinstall')) {
  console.log('[zaidaat] Building server and client production bundles...');
  run(npmBin, ['run', 'build']);
}
