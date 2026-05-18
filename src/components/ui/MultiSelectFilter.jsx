import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import PortalPopover from './PortalPopover';

export default function MultiSelectFilter({
  items = [],
  selectedValues = [],
  onApply,
  placeholder = 'Chọn',
  searchPlaceholder = 'Tìm kiếm',
  panelTitle = 'Chọn',
  maxInlineTags = 3,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState(new Set(selectedValues || []));
  const ref = useRef(null);

  useEffect(() => {
    setChecked(new Set(selectedValues || []));
  }, [selectedValues]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const mapByValue = useMemo(() => {
    const m = new Map();
    items.forEach((it) => m.set(String(it.value), it));
    return m;
  }, [items]);

  const selectedList = useMemo(
    () => [...checked].map((v) => mapByValue.get(String(v))).filter(Boolean),
    [checked, mapByValue]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => String(it.label || '').toLowerCase().includes(q));
  }, [items, search]);

  const toggleCheck = (value) => {
    const key = String(value);
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const removeTag = (value, autoApply = false) => {
    const key = String(value);
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(key);
      if (autoApply) onApply?.(Array.from(next));
      return next;
    });
  };

  const clearAll = () => setChecked(new Set());

  const apply = () => {
    onApply?.(Array.from(checked));
    setOpen(false);
  };

  const visibleTags = selectedList.slice(0, maxInlineTags);
  const restCount = Math.max(0, selectedList.length - visibleTags.length);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full min-h-[42px] rounded border px-2.5 py-2 text-left transition-colors cursor-pointer ${
          selectedList.length > 0
            ? 'border-primary bg-blue-50/40'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {selectedList.length === 0 ? (
              <span className="text-sm text-gray-500">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleTags.map((it) => (
                  <span
                    key={String(it.value)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {it.label}
                    <button
                      type="button"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(it.value, true);
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {restCount > 0 && (
                  <span className="inline-flex items-center rounded-md border border-blue-200 bg-white px-2 py-0.5 text-xs font-semibold text-primary">
                    +{restCount} khác
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown size={14} className={`mt-1 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <PortalPopover anchorEl={ref.current} open={open} widthMatch={false}>
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="mt-1 w-[320px] rounded-lg border border-gray-200 bg-white shadow-xl z-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">{panelTitle}</span>
            </div>

            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full rounded border border-gray-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-[260px] overflow-y-auto py-1">
              {filteredItems.map((it) => {
                const isChecked = checked.has(String(it.value));
                return (
                  <button
                    type="button"
                    key={String(it.value)}
                    onClick={() => toggleCheck(it.value)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check size={10} />}
                    </span>
                    <span className="flex-1 text-left text-gray-700 truncate">{it.label}</span>
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-400">Không có dữ liệu</div>
              )}
            </div>

            {selectedList.length > 0 && (
              <div className="px-3 pb-2">
                <div className="flex flex-wrap gap-1.5 rounded border border-blue-200 p-2">
                  {selectedList.map((it) => (
                    <span key={String(it.value)} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                      {it.label}
                      <button type="button" className="cursor-pointer" onClick={() => removeTag(it.value)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
              <button type="button" onClick={clearAll} className="text-xs font-medium text-primary hover:underline">
                Bỏ chọn tất cả
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </>
      </PortalPopover>
    </div>
  );
}
