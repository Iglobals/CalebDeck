const fs = require('fs');
const file = 'c:/Users/Great Nation/OneDrive/Documents/CalebDeck/src/app/pages/admin/AdminLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "    Store\r\n} from 'lucide-react';",
  "    Store,\r\n    Shirt\r\n} from 'lucide-react';"
);

content = content.replace(
  "    { label: 'CalebNet', keywords: ['calebnet', 'clubkonnect', 'nellobyte', 'airtime', 'data', 'recharge', 'topup'], path: '/admin/calebnet', icon: '📶' },",
  "    { label: 'CalebNet', keywords: ['calebnet', 'clubkonnect', 'nellobyte', 'airtime', 'data', 'recharge', 'topup'], path: '/admin/calebnet', icon: '📶' },\n    { label: 'Fashion Inventory', keywords: ['fashion', 'clothes', 'shoes', 'apparel', 'merch', 'brand', 'clothing'], path: '/admin/fashion', icon: '👕' },"
);

content = content.replace(
  "        { id: 'mart-inventory', path: '/admin/mart/inventory', icon: <Package className=\"w-5 h-5\" />, label: 'Mart Inventory' },",
  "        { id: 'mart-inventory', path: '/admin/mart/inventory', icon: <Package className=\"w-5 h-5\" />, label: 'Mart Inventory' },\n        { id: 'fashion-inventory', path: '/admin/fashion', icon: <Shirt className=\"w-5 h-5\" />, label: 'Fashion Inventory' },"
);

fs.writeFileSync(file, content);
console.log('Done');
