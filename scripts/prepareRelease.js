const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing required file: ${source}`);
  }
  fs.copyFileSync(source, target);
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version;

  if (!version) {
    throw new Error('Unable to determine version from package.json');
  }

  const releaseDir = path.join(rootDir, 'release', `PlayNexus_IPTV_v${version}`);
  ensureDir(releaseDir);

  console.log(`Preparing release folder at ${releaseDir}`);

  const docsToCopy = [
    { source: 'README_PlayNexus.txt', target: 'README_PlayNexus.txt' },
    { source: 'README.md', target: 'README.md' },
    { source: 'CHANGELOG.txt', target: 'CHANGELOG.txt' },
    { source: 'version.json', target: 'version.json' },
    { source: 'config_template.json', target: 'config_template.json' },
    { source: 'env.example', target: '.env.example' },
    { source: 'SETUP_INSTRUCTIONS.txt', target: 'SETUP_INSTRUCTIONS.txt' }
  ];

  docsToCopy.forEach(({ source: sourceName, target: targetName }) => {
    const source = path.join(rootDir, sourceName);
    const target = path.join(releaseDir, targetName);
    copyFile(source, target);
  });

  const obfuscatedOutput = path.join(releaseDir, 'app.obf.js');
  console.log('Running javascript-obfuscator for renderer bundle...');
  execSync(
    `npx javascript-obfuscator app.js --config obfuscator.config.json --output "${obfuscatedOutput}"`,
    {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    }
  );

  console.log('Release folder prepared successfully.');
}

main();

