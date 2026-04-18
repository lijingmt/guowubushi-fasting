#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '../app.json');
const PROJECT_PBXPROJ_PATH = path.join(__dirname, '../ios/app.xcodeproj/project.pbxproj');

// Parse version string (e.g., "1.0.3")
function parseVersion(versionStr) {
  const parts = versionStr.split('.').map(Number);
  return {
    major: parts[0] || 1,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

// Format version object to string
function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

// Increment version
function incrementVersion(versionStr, type = 'patch') {
  const version = parseVersion(versionStr);

  switch (type) {
    case 'major':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      break;
    case 'minor':
      version.minor++;
      version.patch = 0;
      break;
    case 'patch':
    default:
      version.patch++;
      break;
  }

  return formatVersion(version);
}

// Update app.json version
function updateAppJson(newVersion) {
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const oldVersion = appJson.expo.version;
  appJson.expo.version = newVersion;
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✓ app.json: ${oldVersion} → ${newVersion}`);
}

// Update iOS project MARKETING_VERSION
function updateIosVersion(newVersion) {
  const projectPbxproj = fs.readFileSync(PROJECT_PBXPROJ_PATH, 'utf8');
  const oldVersionRegex = /MARKETING_VERSION = (\d+\.\d+\.\d+)/;
  const match = projectPbxproj.match(oldVersionRegex);

  if (match) {
    const oldVersion = match[1];
    const updated = projectPbxproj.replace(
      oldVersionRegex,
      `MARKETING_VERSION = ${newVersion}`
    );
    fs.writeFileSync(PROJECT_PBXPROJ_PATH, updated);
    console.log(`✓ iOS MARKETING_VERSION: ${oldVersion} → ${newVersion}`);
  }
}

// Get build number from Xcode project
function getBuildNumber() {
  const projectPbxproj = fs.readFileSync(PROJECT_PBXPROJ_PATH, 'utf8');
  const match = projectPbxproj.match(/CURRENT_PROJECT_VERSION = (\d+)/);
  return match ? parseInt(match[1]) : 1;
}

// Update build number
function updateBuildNumber(newBuildNumber) {
  const projectPbxproj = fs.readFileSync(PROJECT_PBXPROJ_PATH, 'utf8');
  const oldBuildRegex = /CURRENT_PROJECT_VERSION = (\d+)/;
  const match = projectPbxproj.match(oldBuildRegex);

  if (match) {
    const oldBuild = match[1];
    const updated = projectPbxproj.replace(
      oldBuildRegex,
      `CURRENT_PROJECT_VERSION = ${newBuildNumber}`
    );
    fs.writeFileSync(PROJECT_PBXPROJ_PATH, updated);
    console.log(`✓ iOS Build number: ${oldBuild} → ${newBuildNumber}`);
  }
}

// Main
const args = process.argv.slice(2);
const type = args[0] || 'patch'; // major, minor, or patch
const customVersion = args[1]; // optional custom version like "1.2.3"
const customBuild = args[2]; // optional custom build number

// Read current version
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
const currentVersion = appJson.expo.version;
const currentBuild = getBuildNumber();

console.log('\n📱 Version Bump Tool');
console.log('==================');
console.log(`Current Version: ${currentVersion}`);
console.log(`Current Build: ${currentBuild}`);
console.log('');

let newVersion;
if (customVersion) {
  newVersion = customVersion;
} else {
  newVersion = incrementVersion(currentVersion, type);
}

const newBuild = customBuild ? parseInt(customBuild) : currentBuild + 1;

console.log(`\nNew Version: ${newVersion}`);
console.log(`New Build: ${newBuild}`);
console.log('');

updateAppJson(newVersion);
updateIosVersion(newVersion);
updateBuildNumber(newBuild);

console.log('\n✅ Done! Commit with:');
console.log(`git add app.json ios/app.xcodeproj/project.pbxproj`);
console.log(`git commit -m "chore: bump version to ${newVersion}"`);
console.log('');
