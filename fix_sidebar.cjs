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

  // Change lg:h-[calc(100vh-142px)] to lg:max-h-[calc(100vh-160px)] in sidebar wrapper
  content = content.replace(
    /lg:h-\[calc\(100vh-142px\)\]/g,
    'lg:max-h-[calc(100vh-160px)]'
  );

  // Also replace lg:h-[calc(100vh-160px)] with lg:h-full or keep it?
  // If the sidebar is lg:max-h-[calc(100vh-160px)], it will shrink to fit content.

  fs.writeFileSync(file, content);
  console.log('Fixed sidebar in', file);
});

