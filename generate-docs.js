// generate-docs.js
// 將 docs-structure.json 轉成實體 Markdown 檔案與資料夾結構
// 不會覆蓋已存在的 .md 檔案，除非使用 FORCE=1 或帶入 --force
//
// 使用方式：
//   node generate-docs.js
//   node generate-docs.js --force    ← 覆蓋同名 .md 檔

const fs = require('fs');
const path = require('path');

const STRUCTURE_FILE = path.join(__dirname, 'docs-structure.json');
const OUTPUT_ROOT = path.join(__dirname, 'docs');

const args = process.argv.slice(2);
const FORCE =
  args.includes('--force') ||
  process.env.FORCE === '1' ||
  process.env.FORCE === 'true';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeMarkdownFile(filePath, content) {
  ensureDir(path.dirname(filePath));

  if (!FORCE && fs.existsSync(filePath)) {
    console.log(`[skip] 已存在，未覆蓋：${path.relative(process.cwd(), filePath)}`);
    return;
  }

  fs.writeFileSync(filePath, content || '', 'utf8');
  console.log(`[write] ${path.relative(process.cwd(), filePath)}`);
}

function normalizeRelPath(p) {
  if (!p || p === '/') return '';
  return p.replace(/^\/+/, '').replace(/\/+$/, '');
}

function getPageFileInfo(nodePath, isRootPage) {
  if (isRootPage || !nodePath || nodePath === '/') {
    return {
      dir: OUTPUT_ROOT,
      fileName: 'README.md',
    };
  }

  const normalized = normalizeRelPath(nodePath);
  const segments = normalized.split('/');
  const fileSlug = segments.pop() || 'index';
  const dir = segments.length
    ? path.join(OUTPUT_ROOT, segments.join(path.sep))
    : OUTPUT_ROOT;

  return {
    dir,
    fileName: `${fileSlug}.md`,
  };
}

function processNode(node) {
  const isRoot = !node.path || node.path === '/';

  if (node.type === 'folder') {
    const rel = normalizeRelPath(node.path);
    const folderDir = rel ? path.join(OUTPUT_ROOT, rel) : OUTPUT_ROOT;
    ensureDir(folderDir);

    // 若 folder 也帶有 content，寫成 README.md
    if (node.content) {
      const readmePath = path.join(folderDir, 'README.md');
      writeMarkdownFile(readmePath, node.content);
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(child => processNode(child));
    }
  } else if (node.type === 'page') {
    const { dir, fileName } = getPageFileInfo(node.path, isRoot);
    const filePath = path.join(dir, fileName);
    const content =
      node.content && node.content.trim().length > 0
        ? node.content
        : `# ${node.title || fileName.replace(/\.md$/, '')}\n`;

    writeMarkdownFile(filePath, content);

    if (Array.isArray(node.children) && node.children.length > 0) {
      node.children.forEach(child => processNode(child));
    }
  } else {
    console.warn(`[warn] 未知 type，已略過：${node.type} (${node.title})`);
  }
}

function main() {
  if (!fs.existsSync(STRUCTURE_FILE)) {
    console.error(`找不到 docs-structure.json：${STRUCTURE_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(STRUCTURE_FILE, 'utf8');
  let rootNode;
  try {
    rootNode = JSON.parse(raw);
  } catch (err) {
    console.error('解析 docs-structure.json 失敗：', err.message);
    process.exit(1);
  }

  ensureDir(OUTPUT_ROOT);
  processNode(rootNode);

  console.log('generate-docs 完成。');
}

main();
