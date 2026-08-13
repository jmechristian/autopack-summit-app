#!/usr/bin/env node
/**
 * Copy Rive web runtime WASM + Hub hero .riv into /public so Expo static
 * export serves them same-origin (EAS Hosting / production).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const wasmSrc = path.join(root, 'node_modules/@rive-app/canvas/rive.wasm');
const rivSrc = path.join(root, 'assets/hub_header.riv');

fs.mkdirSync(publicDir, { recursive: true });

if (!fs.existsSync(wasmSrc)) {
  console.warn('[sync-rive-web-assets] missing', wasmSrc);
} else {
  fs.copyFileSync(wasmSrc, path.join(publicDir, 'rive.wasm'));
  console.log('[sync-rive-web-assets] wrote public/rive.wasm');
}

if (!fs.existsSync(rivSrc)) {
  console.warn('[sync-rive-web-assets] missing', rivSrc);
} else {
  fs.copyFileSync(rivSrc, path.join(publicDir, 'hub_header.riv'));
  console.log('[sync-rive-web-assets] wrote public/hub_header.riv');
}
