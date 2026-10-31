/**
 * GitHub-a birbaşa Node.js vasitəsilə Push etmək üçün skript (Git quraşdırılması tələb etmir!)
 * 
 * İstifadə qaydası:
 * node push-to-github.js <GITHUB_REPO_URL> <GITHUB_TOKEN>
 * 
 * Məsələn:
 * node push-to-github.js https://github.com/istifadeci/restoran-rms.git ghp_sizinTokeniniz123
 */

const fs = require('fs');
const http = require('isomorphic-git/http/node');
const git = require('isomorphic-git');

async function pushToGitHub() {
  const repoUrl = process.argv[2];
  const token = process.argv[3];

  if (!repoUrl || !token) {
    console.log('XƏTA: Zəhmət olmasa GitHub repozitoriya linkini və Tokeninizi daxil edin.');
    console.log('İstifadə: node push-to-github.js <REPO_URL> <GITHUB_TOKEN>');
    console.log('Nümunə:  node push-to-github.js https://github.com/myname/restoran-rms.git ghp_xxxxxx');
    process.exit(1);
  }

  const repoDir = __dirname;
  console.log(`1. GitHub repozitoriyasına qoşulur: ${repoUrl}`);

  await git.push({
    fs,
    http,
    dir: repoDir,
    remote: 'origin',
    url: repoUrl,
    ref: 'main',
    onAuth: () => ({ username: token }),
    onProgress: (p) => {
      console.log(`Yüklənir: ${p.phase} - ${p.loaded}/${p.total || '...'}`);
    }
  });

  console.log('\n🎉 TƏBRİKLƏR! Layihə uğurla GitHub səhifənizə yükləndi!');
}

pushToGitHub().catch((err) => {
  console.error('\nPush xətası:', err.message);
});
