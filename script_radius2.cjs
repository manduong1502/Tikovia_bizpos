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

  // Find all <select ... </select> or <select ... /> blocks
  content = content.replace(/<select[\s\S]*?(?:<\/select>|\/>)/g, (match) => {
    // Inside this select block, replace rounded-xl/lg/md with rounded
    let newMatch = match.replace(/\brounded-(xl|lg|2xl|md|sm)\b/g, 'rounded');
    // Also adjust padding for selects
    newMatch = newMatch.replace(/\bpx-3\.5\s+py-2\.5\b/g, 'px-3 py-2 min-h-[42px]');
    return newMatch;
  });

  // Let's also find buttons in the sidebar. 
  // In EndOfDayReportPage, there's a button group for Kiểu hiển thị:
  // <button className="flex-1 py-2 rounded-xl ...
  // We can just replace rounded-xl with rounded in anything inside <aside ... </aside>
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
    console.log(`Updated select in ${file}`);
  }
}
console.log(`Updated ${count} files.`);
