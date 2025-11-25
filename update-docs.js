// update-docs.js
// 一鍵：重新生成 docs/ + git add + git commit + git push
//
// 使用方式：
//   node update-docs.js
//   node update-docs.js "更新說明"
// 會自動呼叫：node generate-docs.js

const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = __dirname;
const GENERATOR = path.join(REPO_ROOT, 'generate-docs.js');
const DEFAULT_COMMIT_MESSAGE = 'Update docs from docs-structure.json';
const GIT_BRANCH = 'main';

function run(cmd, options = {}) {
  const finalOpts = {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    ...options,
  };
  execSync(cmd, finalOpts);
}

function getGitStatus() {
  try {
    const output = execSync('git status --porcelain', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return output.trim();
  } catch (err) {
    console.error('取得 git 狀態失敗：', err.message);
    process.exit(1);
  }
}

function main() {
  const msgFromCli = process.argv.slice(2).join(' ').trim();
  const commitMessage = msgFromCli || DEFAULT_COMMIT_MESSAGE;

  console.log('步驟 1：重新生成 docs/ ...');
  run(`node "${GENERATOR}"`);

  console.log('步驟 2：檢查是否有變更...');
  const status = getGitStatus();
  if (!status) {
    console.log('目前沒有任何變更，不需要 commit。');
    return;
  }

  console.log('步驟 3：git add .');
  run('git add .');

  console.log(`步驟 4：git commit -m "${commitMessage}"`);
  try {
    run(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
  } catch (err) {
    console.error('git commit 失敗：', err.message);
    return;
  }

  console.log(`步驟 5：git push origin ${GIT_BRANCH}`);
  try {
    run(`git push origin ${GIT_BRANCH}`);
  } catch (err) {
    console.error('git push 失敗：', err.message);
    process.exit(1);
  }

  console.log('完成，遠端 repo 已更新，GitBook 會自動同步。');
}

main();
