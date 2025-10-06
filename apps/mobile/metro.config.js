const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '../..');

// Watch all files in the monorepo
defaultConfig.watchFolders = [workspaceRoot];

// Resolve node_modules from workspace root
defaultConfig.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = defaultConfig;