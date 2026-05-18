const fs = require('fs');
const files = [
  'src/pages/Products/ProductsPage.jsx',
  'src/pages/Orders/OrdersPage.jsx',
  'src/pages/Returns/ReturnsPage.jsx',
  'src/pages/Suppliers/SuppliersPage.jsx',
  'src/pages/Customers/CustomersPage.jsx',
  'src/pages/PurchaseOrders/PurchaseOrdersPage.jsx',
  'src/pages/PurchaseReturns/PurchaseReturnsPage.jsx',
  'src/pages/PriceBooks/PriceBooksPage.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Add lg:h-[calc(100vh-160px)]
  content = content.replace(
    /<div className=\"flex flex-col lg:flex-row gap-6 items-start max-w-full relative\">/g,
    '<div className=\"flex flex-col lg:flex-row gap-6 items-start max-w-full relative lg:h-[calc(100vh-160px)]\">'
  );

  // Add lg:h-full
  content = content.replace(
    /<div className=\"flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-w-full w-full\">/g,
    '<div className=\"flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-w-full w-full lg:h-full\">'
  );

  // Add flex-1 overflow-y-auto to the table wrapper
  content = content.replace(
    /<div className=\"overflow-x-auto max-w-full w-full\">/g,
    '<div className=\"overflow-x-auto overflow-y-auto flex-1 max-w-full w-full custom-scrollbar\">'
  );
  content = content.replace(
    /<div className=\"overflow-x-auto overflow-y-auto max-h-\[calc\(100vh-230px\)\] custom-scrollbar max-w-full w-full\">/g,
    '<div className=\"overflow-x-auto overflow-y-auto flex-1 max-w-full w-full custom-scrollbar\">'
  );

  // Remove Settings and Help buttons
  content = content.replace(/<button className=\"hidden sm:flex p-2\.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer items-center justify-center\">\s*<Settings size=\{18\} \/>\s*<\/button>/g, '');
  content = content.replace(/<button className=\"hidden sm:flex p-2\.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer items-center justify-center\">\s*<HelpCircle size=\{18\} \/>\s*<\/button>/g, '');

  fs.writeFileSync(file, content);
  console.log('Updated', file);
});

