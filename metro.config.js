// Learn more https://docs.expo.io/guides/customizing-Metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Bundle Rive (.riv) files as assets so they can be loaded via require().
if (!config.resolver.assetExts.includes('riv')) {
  config.resolver.assetExts.push('riv');
}

// Expo web serves a classic (non-module) script. Package `exports` can resolve
 // ESM builds that contain bare `import.meta` (e.g. zustand/middleware), which
 // is a parse-time SyntaxError and prevents the entire client bundle from
 // running — login buttons appear but never hydrate.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
