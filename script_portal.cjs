const fs = require('fs');

// 1. Update PortalPopover.jsx
let content = fs.readFileSync('src/components/ui/PortalPopover.jsx', 'utf8');
content = content.replace(
  /export default function PortalPopover\({ anchorEl, open, widthMatch = true, children, className = '' }\) {/,
  "import { useRef } from 'react';\nexport default function PortalPopover({ anchorEl, open, onClose, widthMatch = true, children, className = '' }) {\n  const popoverRef = useRef(null);"
);
content = content.replace(
  /const \[style, setStyle\] = useState\({}\);/,
  "const [style, setStyle] = useState({});\n\n  useEffect(() => {\n    if (!open) return;\n    const handleClickOutside = (e) => {\n      if (anchorEl && anchorEl.contains(e.target)) return;\n      if (popoverRef.current && popoverRef.current.contains(e.target)) return;\n      if (onClose) onClose();\n    };\n    document.addEventListener('mousedown', handleClickOutside);\n    return () => document.removeEventListener('mousedown', handleClickOutside);\n  }, [open, anchorEl, onClose]);"
);
content = content.replace(
  /<div style={style} className={className}>/,
  "<div style={style} className={className} ref={popoverRef}>"
);
fs.writeFileSync('src/components/ui/PortalPopover.jsx', content);

// 2. Update Dropdown.jsx
content = fs.readFileSync('src/components/ui/Dropdown.jsx', 'utf8');
content = content.replace(/\s*useEffect\(\(\) => \{[\s\S]*?document\.removeEventListener\('mousedown', handleClick\);\s*\}, \[\]\);/, '');
content = content.replace(
  /<PortalPopover anchorEl={ref\.current} open={open} widthMatch={true}>/,
  "<PortalPopover anchorEl={ref.current} open={open} onClose={() => setOpen(false)} widthMatch={true}>"
);
fs.writeFileSync('src/components/ui/Dropdown.jsx', content);

// 3. Update CategoryFilter.jsx
content = fs.readFileSync('src/components/ui/CategoryFilter.jsx', 'utf8');
content = content.replace(/\s*useEffect\(\(\) => \{[\s\S]*?document\.removeEventListener\('mousedown', handleClick\);\s*\}, \[open\]\);/, '');
content = content.replace(
  /<PortalPopover anchorEl={ref\.current} open={open} widthMatch={false}>/,
  "<PortalPopover anchorEl={ref.current} open={open} onClose={() => setOpen(false)} widthMatch={false}>"
);
content = content.replace(/<div className="fixed inset-0 z-40" onClick=\{\(\) => setOpen\(false\)\} \/>/, '');
fs.writeFileSync('src/components/ui/CategoryFilter.jsx', content);

// 4. Update DateFilter.jsx
content = fs.readFileSync('src/components/ui/DateFilter.jsx', 'utf8');
content = content.replace(/\s*useEffect\(\(\) => \{[\s\S]*?document\.removeEventListener\('mousedown', handleClick\);\s*\}, \[\]\);/, '');
content = content.replace(
  /<PortalPopover anchorEl={ref\.current} open=\{popover === 'preset'\} widthMatch=\{false\}>/,
  "<PortalPopover anchorEl={ref.current} open={popover === 'preset'} onClose={() => setPopover(null)} widthMatch={false}>"
);
content = content.replace(
  /<PortalPopover anchorEl={ref\.current} open=\{popover === 'calendar'\} widthMatch=\{false\}>/,
  "<PortalPopover anchorEl={ref.current} open={popover === 'calendar'} onClose={() => setPopover(null)} widthMatch={false}>"
);
fs.writeFileSync('src/components/ui/DateFilter.jsx', content);

// 5. Update MultiSelectFilter.jsx
content = fs.readFileSync('src/components/ui/MultiSelectFilter.jsx', 'utf8');
content = content.replace(/\s*useEffect\(\(\) => \{[\s\S]*?document\.removeEventListener\('mousedown', handleClick\);\s*\}, \[open\]\);/, '');
content = content.replace(
  /<PortalPopover anchorEl={ref\.current} open={open} widthMatch={false}>/,
  "<PortalPopover anchorEl={ref.current} open={open} onClose={() => setOpen(false)} widthMatch={false}>"
);
content = content.replace(/<div className="fixed inset-0 z-40" onClick=\{\(\) => setOpen\(false\)\} \/>/, '');
fs.writeFileSync('src/components/ui/MultiSelectFilter.jsx', content);

console.log('Finished updating files.');
