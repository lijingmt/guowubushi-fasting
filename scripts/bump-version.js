const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json version
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Update app.json
const appJsonPath = path.join(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = version;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// Update iOS Info.plist
const infoPlistPath = path.join(__dirname, '../ios/app/Info.plist');
let infoPlist = fs.readFileSync(infoPlistPath, 'utf8');
infoPlist = infoPlist.replace(
  /<key>CFBundleShortVersionString<\/key>\s*<string>[\d.]+<\/string>/,
  `<key>CFBundleShortVersionString</key>\n\t<string>${version}</string>`
);
fs.writeFileSync(infoPlistPath, infoPlist);

// Update iOS Expo.plist
const expoPlistPath = path.join(__dirname, '../ios/app/Supporting/Expo.plist');
let expoPlist = fs.readFileSync(expoPlistPath, 'utf8');
expoPlist = expoPlist.replace(
  /<key>EXUpdatesRuntimeVersion<\/key>\s*<string>[\d.]+<\/string>/,
  `<key>EXUpdatesRuntimeVersion</key>\n\t<string>${version}</string>`
);
fs.writeFileSync(expoPlistPath, expoPlist);

console.log(`Version synced to ${version}`);
