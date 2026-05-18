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

  // Change calc(100vh-160px) to calc(100vh-144px)
  content = content.replace(/100vh-160px/g, '100vh-144px');

  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
    console.log(`Updated height in ${file}`);
  }
}
console.log(`Updated ${count} files.`);
