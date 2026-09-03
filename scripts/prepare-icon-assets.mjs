import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const tauriCli = join('node_modules', '@tauri-apps', 'cli', 'tauri.js');
const masterIcon = join('branding', 'dots-icon-master.png');
const nativeIcons = join('src-tauri', 'icons');
const staleAndroidIcons = join(nativeIcons, 'android');
const androidRes = join('src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res');
const scratch = join('.icon-assets-tmp');

function runIcon(input, output, extraArgs = []) {
  const result = spawnSync(process.execPath, [tauriCli, 'icon', input, '--output', output, ...extraArgs], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(`Tauri icon generation failed for ${input}`);
  }
}

function copy(source, destination) {
  if (!existsSync(source)) {
    throw new Error(`Missing generated icon asset: ${source}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { force: true });
}

function findPngs(root) {
  if (!existsSync(root)) return [];
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...findPngs(path));
    else if (entry.isFile() && entry.name.endsWith('.png')) result.push(path);
  }
  return result;
}

function customPng(size, destination) {
  const output = join(scratch, String(size));
  rmSync(output, { recursive: true, force: true });
  runIcon(masterIcon, output, ['--png', String(size)]);
  const pngs = findPngs(output);
  if (pngs.length !== 1) {
    throw new Error(`Expected one ${size}px PNG, found ${pngs.length}`);
  }
  copy(pngs[0], destination);
}

function requireAsset(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing generated icon asset: ${path}`);
  }
}

if (!existsSync(masterIcon)) {
  throw new Error(`Missing raster master icon: ${masterIcon}`);
}

rmSync(staleAndroidIcons, { recursive: true, force: true });
rmSync(scratch, { recursive: true, force: true });
runIcon(masterIcon, nativeIcons);

customPng(512, join('public', 'icon-512.png'));
copy(join('public', 'icon-512.png'), join('public', 'icon-maskable-512.png'));
customPng(192, join('public', 'icon-192.png'));
customPng(180, join('public', 'apple-touch-icon.png'));
copy(join(nativeIcons, '32x32.png'), join('public', 'favicon-32.png'));

if (existsSync(androidRes)) {
  for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    requireAsset(join(androidRes, `mipmap-${density}`, 'ic_launcher.png'));
    requireAsset(join(androidRes, `mipmap-${density}`, 'ic_launcher_foreground.png'));
    requireAsset(join(androidRes, `mipmap-${density}`, 'ic_launcher_round.png'));
  }
}

rmSync(scratch, { recursive: true, force: true });
