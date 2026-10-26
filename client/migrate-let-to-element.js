/**
 * 批量将 let-ui 组件替换为 element-ui
 * 在 client 目录下运行: node migrate-let-to-element.js
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') walkDir(filePath, fileList);
    } else if (file.endsWith('.vue') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const replacements = [
  // 先处理 table-operation -> el-button (保留属性)
  [/<let-table-operation(\s)/g, '<el-button size="mini" type="text"$1'],
  [/<\/let-table-operation>/g, '</el-button>'],
  // let-modal -> el-dialog (v-model 改为 :visible.sync)
  [/<let-modal\b/g, '<el-dialog'],
  [/<\/let-modal>/g, '</el-dialog>'],
  // 先替换 :title= 为 :label= (table-column)
  [/:title="/g, ':label="'],
  [/:title='/g, ":label='"],
  // empty-msg -> empty-text
  [/\bempty-msg\b/g, 'empty-text'],
  // theme="primary" -> type="primary"
  [/theme="primary"/g, 'type="primary"'],
  [/theme='primary'/g, "type='primary'"],
  // theme="danger" -> type="danger"
  [/theme="danger"/g, 'type="danger"'],
  [/theme='danger'/g, "type='danger'"],
  // footShow="false" -> 无 footer 时 el-dialog 用 :show-close="true"，不显示 footer 用自定义
  [/\bfootShow="false"\b/g, ':show-footer="false"'],
  [/\bfootShow='false'/g, ":show-footer='false'"],
  // 组件名 let- -> el-
  [/\blet-form\b/g, 'el-form'],
  [/\blet-form-item\b/g, 'el-form-item'],
  [/\blet-input\b/g, 'el-input'],
  [/\blet-button\b/g, 'el-button'],
  [/\blet-table\b/g, 'el-table'],
  [/\blet-table-column\b/g, 'el-table-column'],
  [/\blet-checkbox\b/g, 'el-checkbox'],
  [/\blet-select\b/g, 'el-select'],
  [/\blet-option\b/g, 'el-option'],
  [/\blet-radio\b/g, 'el-radio'],
  [/\blet-tooltip\b/g, 'el-tooltip'],
  [/\blet-pagination\b/g, 'el-pagination'],
  // CSS 类名 .let_modal -> .el-dialog (用于样式)
  [/\.let_modal\b/g, '.el-dialog'],
  [/let_modal/g, 'el-dialog'],
  [/let-form-item__label/g, 'el-form-item__label'],
  [/let-label__position_top/g, 'el-form-item__label--top'],
  [/let-box/g, 'el-form'],
];

// el-dialog 使用 :visible.sync 而非 v-model，需在 template 里把 v-model 改为 :visible.sync
// 但 el-dialog 在 element-ui 2.x 中用的是 :visible.sync
function fixElDialog(content) {
  // <el-dialog ... v-model="xxx" -> <el-dialog ... :visible.sync="xxx"
  return content.replace(
    /<el-dialog([^>]*)\sv-model="([^"]+)"/g,
    '<el-dialog$1 :visible.sync="$2"'
  ).replace(
    /<el-dialog([^>]*)\sv-model='([^']+)'/g,
    "<el-dialog$1 :visible.sync='$2'"
  );
}

const files = walkDir(srcDir);
let changed = 0;
files.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  replacements.forEach(([from, to]) => {
    if (typeof to === 'function') return;
    content = content.replace(from, to);
  });
  content = fixElDialog(content);
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    changed++;
    console.log('Updated:', path.relative(__dirname, filePath));
  }
});
// 第二遍：修复 el-pagination API (:page -> :current-page, @change -> @current-change)
const paginationReplacements = [
  [/:page="/g, ':current-page="'],
  [/:page='/g, ':current-page=\''],
  [/@change="gotoPage"/g, '@current-change="gotoPage"'],
  [/@change="changePage"/g, '@current-change="changePage"'],
  [/@change="changePackagePage"/g, '@current-change="changePackagePage"'],
  [/@change="changeHistoryPage"/g, '@current-change="changeHistoryPage"'],
  [/@change="gotoServerPage"/g, '@current-change="gotoServerPage"'],
  [/@change="handleCurrentChange"/g, '@current-change="handleCurrentChange"'],
  [/@change="changeNotifyPage"/g, '@current-change="changeNotifyPage"'],
];
files.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  paginationReplacements.forEach(([from, to]) => {
    content = content.replace(from, to);
  });
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    changed++;
    console.log('Updated pagination:', path.relative(__dirname, filePath));
  }
});
console.log('Done. Changed', changed, 'files.');
