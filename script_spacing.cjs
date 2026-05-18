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

  // 1. Change page wrapper padding
  content = content.replace(/\bp-1\.5 sm:p-6\b/g, 'p-1.5 sm:p-4');
  
  // 2. Change margin bottom of top header bar
  content = content.replace(/\bmb-4 sm:mb-6\b/g, 'mb-3 sm:mb-4');
  
  // 3. Change gap between sidebar and table (flex-col lg:flex-row gap-6)
  content = content.replace(/\bgap-6\b/g, 'gap-4');
  
  // 4. Change gap in reports (gap-5) to gap-4
  // Wait, let's only replace gap-5 on the main wrappers. Let's just blindly replace gap-5 with gap-4? 
  // Maybe safer to do it specifically for the wrapper line.
  content = content.replace(/className="flex flex-col lg:flex-row gap-5/g, 'className="flex flex-col lg:flex-row gap-4');

  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
    console.log(`Updated spacing in ${file}`);
  }
}
console.log(`Updated ${count} files.`);
