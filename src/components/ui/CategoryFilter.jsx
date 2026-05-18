import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, GripVertical, Check, X } from 'lucide-react';
import PortalPopover from './PortalPopover';

export default function CategoryFilter({ categories = [], products = [], selectedIds, onApply }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const [checked, setChecked] = useState(new Set(selectedIds || []));
  const ref = useRef(null);

  useEffect(() => {
    setChecked(new Set(selectedIds || []));
  }, [selectedIds]);

  // Build tree
  const tree = useMemo(() => {
    const map = new Map();
    const roots = [];
    categories.forEach(c => map.set(c.id, { ...c, children: [] }));
    categories.forEach(c => {
      const node = map.get(c.id);
      if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id).children.push(node);
      else roots.push(node);
    });
    return roots;
  }, [categories]);

  const getCount = (catId) => products.filter(p => {
    const pid = p.category_id ?? p.categoryId ?? p.category?.id;
    return Number(pid) === Number(catId);
  }).length;

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCheck = (id, autoApply = false) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (autoApply) onApply(next);
      return next;
    });
  };

  const selectAll = () => {
    setChecked(new Set(categories.map(c => c.id)));
  };

  const handleApply = () => {
    onApply(checked);
    setOpen(false);
  };

  const selectedList = [...checked]
    .map((id) => categories.find((c) => Number(c.id) === Number(id)))
    .filter(Boolean);

  const visibleTags = selectedList.slice(0, 3);
  const restCount = Math.max(0, selectedList.length - visibleTags.length);

  const renderItem = (cat, depth = 0) => {
    const hasKids = cat.children && cat.children.length > 0;
    const isExpanded = expanded.has(cat.id);
    const isChecked = checked.has(cat.id);
    const count = getCount(cat.id);
    const matchSearch = !search || cat.name.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return null;

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <GripVertical size={12} className="text-gray-300 shrink-0" />
          <button
            onClick={(e) => { e.stopPropagation(); if (hasKids) toggleExpand(cat.id); }}
            className={`w-4 h-4 flex items-center justify-center shrink-0 ${hasKids ? 'text-gray-500' : 'text-transparent'}`}
          >
            {hasKids && (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
          </button>
          <button
            onClick={() => toggleCheck(cat.id)}
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
              isChecked ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'
            }`}
          >
            {isChecked && <Check size={10} />}
          </button>
          <span className="flex-1 truncate text-gray-700" onClick={() => toggleCheck(cat.id)}>{cat.name}</span>
          <span className="text-xs text-gray-400">({count})</span>
        </div>
        {hasKids && isExpanded && cat.children.map(ch => renderItem(ch, depth + 1))}
      </div>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full min-h-[42px] rounded border px-2.5 py-2 text-left transition-colors cursor-pointer ${
          checked.size > 0
            ? 'border-primary bg-blue-50/40'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {checked.size === 0 ? (
              <span className="text-sm text-gray-500">Chọn nhóm hàng</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleTags.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cat.name}
                    <button
                      type="button"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCheck(cat.id, true);
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

      <PortalPopover anchorEl={ref.current} open={open} onClose={() => setOpen(false)} widthMatch={false}>
        <>
          
          <div className="mt-1 w-[320px] bg-white border border-gray-200 rounded-lg shadow-xl z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-700">Nhóm hàng</span>
              <button className="text-primary text-xs font-medium hover:underline">+ Tạo mới</button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
                  placeholder="Tìm kiếm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-[260px] overflow-y-auto py-1">
              {tree.map(cat => renderItem(cat))}
              {tree.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">Chưa có nhóm hàng</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
              <button onClick={selectAll} className="text-primary text-xs font-medium hover:underline">Chọn tất cả</button>
              <button
                onClick={handleApply}
                className="bg-primary text-white text-xs font-medium px-4 py-1.5 rounded hover:bg-primary-hover transition-colors"
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
