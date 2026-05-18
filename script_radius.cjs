const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/pages');

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace rounded-xl / rounded-lg / rounded-2xl with rounded in <select> elements
  content = content.replace(/<select\b([^>]*)className=(["'])(.*?)\2([^>]*)>/g, (match, before, quote, cls, after) => {
    let newCls = cls.replace(/\brounded-(xl|lg|2xl|md|sm)\b/g, 'rounded');
    newCls = newCls.replace(/\bpx-3\.5\s+py-2\.5\b/g, 'px-3 py-2 min-h-[42px]');
    return `<select${before}className=${quote}${newCls}${quote}${after}>`;
  });

  // Also replace in DateFilter if it has any differences? DateFilter uses rounded, so no need.
  // Also check if there's any <input type="text"> in sidebars that need to match?
  // Let's just do <select> first, as it covers "Người tạo", "Người nhập" etc.

  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
    console.log(`Updated ${file}`);
  }
}
console.log(`Updated ${count} files.`);
