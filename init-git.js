const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');

async function initRepo() {
  const repoDir = __dirname;
  console.log('1. Git repozitoriyası inisializasiya edilir (.git)...');
  await git.init({ fs, dir: repoDir, defaultBranch: 'main' });

  console.log('2. Layihə faylları indeksə əlavə edilir (git add)...');

  // Ignored patterns
  const ignored = [
    'node_modules',
    '.git',
    'dist',
    'dev.db',
    'dev.db-journal',
    '.env'
  ];

  function getFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      if (ignored.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getFiles(fullPath));
      } else {
        const relPath = path.relative(repoDir, fullPath).replace(/\\/g, '/');
        files.push(relPath);
      }
    }
    return files;
  }

  const allFiles = getFiles(repoDir);
  console.log(`Cəmi ${allFiles.length} ədəd fayl aşkarlandı.`);

  for (const file of allFiles) {
    await git.add({ fs, dir: repoDir, filepath: file });
  }

  console.log('3. İlkin commit yaradılır (git commit)...');
  const sha = await git.commit({
    fs,
    dir: repoDir,
    author: {
      name: 'Restaurant RMS Developer',
      email: 'developer@restaurant-rms.local'
    },
    message: 'feat: Initial commit - Naxçıvan Restoran İdarəetmə Sistemi (RMS)'
  });

  console.log('✓ Uğurlu commit yaradıldı! SHA:', sha);
  console.log('✓ Lokal Git repozitoriyası tam hazırdır!');
}

initRepo().catch(console.error);
