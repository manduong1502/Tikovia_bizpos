import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalPopover from './PortalPopover';

export default function Dropdown({ label, value, options = [], onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || 'Tất cả';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded border text-sm transition-colors cursor-pointer ${
          open ? 'border-primary bg-blue-50/50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <span className="text-gray-700 truncate">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <PortalPopover anchorEl={ref.current} open={open} widthMatch={true}>
        <div className="mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 py-1 max-h-[240px] overflow-y-auto">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer ${
                value === opt.value
                  ? 'bg-blue-50 text-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      </PortalPopover>
    </div>
  );
}
