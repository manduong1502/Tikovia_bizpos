const fs = require('fs');
let content = fs.readFileSync('src/pages/Products/ProductsPage.jsx', 'utf8');
content = content.replace(
  /<div className=\"flex flex-col lg:flex-row gap-6 items-start max-w-full relative\">/g,
  '<div className=\"flex flex-col lg:flex-row gap-6 items-start max-w-full relative lg:h-[calc(100vh-160px)]\">'
);
content = content.replace(
  /<div className=\"flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-w-full w-full\">/g,
  '<div className=\"flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-w-full w-full lg:h-full\">'
);
content = content.replace(
  /<div className=\"overflow-x-auto max-w-full w-full\">/g,
  '<div className=\"overflow-x-auto overflow-y-auto flex-1 max-w-full w-full custom-scrollbar\">'
);
fs.writeFileSync('src/pages/Products/ProductsPage.jsx', content);

