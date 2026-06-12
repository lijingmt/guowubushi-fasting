const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bumpType = process.argv[2];
const validBumpTypes = new Set(['patch', 'minor', 'major']);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function writeJson(relativePath, data) {
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(data, null, 2)}\n`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function writeText(relativePath, data) {
  fs.writeFileSync(path.join(root, relativePath), data);
}

function bumpVersion(version, type) {
  const parts = version.split('.').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else if (type === 'patch') {
    parts[2] += 1;
  }

  return parts.join('.');
}

if (bumpType && !validBumpTypes.has(bumpType)) {
  throw new Error(`Usage: node scripts/bump-version.js [patch|minor|major]`);
}

const packageJson = readJson('package.json');
const currentVersion = packageJson.version;
const version = bumpType ? bumpVersion(currentVersion, bumpType) : currentVersion;

const buildGradlePath = 'android/app/build.gradle';
let buildGradle = readText(buildGradlePath);
const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
const versionNameMatch = buildGradle.match(/versionName\s+"([^"]+)"/);
const currentAndroidVersionCode = versionCodeMatch ? Number(versionCodeMatch[1]) : 1;
const androidVersionCode = bumpType ? currentAndroidVersionCode + 1 : currentAndroidVersionCode;

const pbxprojPath = 'ios/app.xcodeproj/project.pbxproj';
let pbxproj = readText(pbxprojPath);
const iosBuildMatch = pbxproj.match(/CURRENT_PROJECT_VERSION = ([^;]+);/);
const currentIosBuild = iosBuildMatch ? Number(iosBuildMatch[1].replace(/"/g, '').trim()) : 1;
const iosBuild = bumpType ? currentIosBuild + 1 : currentIosBuild;

packageJson.version = version;
writeJson('package.json', packageJson);

const appJson = readJson('app.json');
appJson.expo.version = version;
appJson.expo.android = appJson.expo.android || {};
appJson.expo.android.versionCode = androidVersionCode;
appJson.expo.ios = appJson.expo.ios || {};
appJson.expo.ios.buildNumber = String(iosBuild);
writeJson('app.json', appJson);

if (fs.existsSync(path.join(root, 'package-lock.json'))) {
  const lockJson = readJson('package-lock.json');
  lockJson.version = version;
  if (lockJson.packages && lockJson.packages['']) {
    lockJson.packages[''].version = version;
  }
  writeJson('package-lock.json', lockJson);
}

if (versionCodeMatch) {
  buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${androidVersionCode}`);
}
if (versionNameMatch) {
  buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
}
writeText(buildGradlePath, buildGradle);

pbxproj = pbxproj
  .replace(/MARKETING_VERSION = "?[^";]+"?;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = "?[^";]+"?;/g, `CURRENT_PROJECT_VERSION = ${iosBuild};`);
writeText(pbxprojPath, pbxproj);

const infoPlistPath = 'ios/app/Info.plist';
if (fs.existsSync(path.join(root, infoPlistPath))) {
  let infoPlist = readText(infoPlistPath);
  infoPlist = infoPlist
    .replace(/(<key>CFBundleShortVersionString<\/key>\s*<string>)(.*?)(<\/string>)/, '$1$(MARKETING_VERSION)$3')
    .replace(/(<key>CFBundleVersion<\/key>\s*<string>)(.*?)(<\/string>)/, '$1$(CURRENT_PROJECT_VERSION)$3');
  writeText(infoPlistPath, infoPlist);
}

if (bumpType) {
  console.log(`Version bumped ${currentVersion} -> ${version}`);
  console.log(`Android versionCode ${currentAndroidVersionCode} -> ${androidVersionCode}`);
  console.log(`iOS build ${currentIosBuild} -> ${iosBuild}`);
} else {
  console.log(`Version config synced to ${version}`);
}
