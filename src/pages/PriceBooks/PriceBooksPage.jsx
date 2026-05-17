import React, { useEffect, useMemo, useRef, useState } from 'react';
import { productAPI, categoryAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Dropdown from '../../components/ui/Dropdown';
import CategoryFilter from '../../components/ui/CategoryFilter';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  Search, Plus, Download, Upload, ChevronDown, ChevronUp, Info, HelpCircle, Columns3, Settings, Filter, X, SlidersHorizontal
} from 'lucide-react';

const STOCK_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'under', label: 'Dưới định mức tồn' },
  { value: 'over', label: 'Vượt định mức tồn' },
  { value: 'in', label: 'Còn hàng trong kho' },
  { value: 'out', label: 'Hết hàng trong kho' },
];

const PRICE_COND_OPTIONS = [
  { value: '', label: 'Chọn điều kiện' },
  { value: '<', label: 'Nhỏ hơn' },
  { value: '<=', label: 'Nhỏ hơn hoặc bằng' },
  { value: '=', label: 'Bằng' },
  { value: '>', label: 'Lớn hơn' },
];

const PRICE_COMPARE_OPTIONS = [
  { value: '', label: 'Chọn giá so sánh' },
  { value: 'costPrice', label: 'Giá vốn' },
  { value: 'lastImport', label: 'Giá nhập cuối' },
];

const ALL_COLUMNS = [
  { key: 'sku', label: 'Mã hàng', defaultVisible: true },
  { key: 'name', label: 'Tên hàng', defaultVisible: true },
  { key: 'costPrice', label: 'Giá vốn', defaultVisible: true, align: 'right' },
  { key: 'lastImportPrice', label: 'Giá nhập cuối', defaultVisible: true, align: 'right' },
  { key: 'sellPrice', label: 'Bảng giá chung', defaultVisible: true, align: 'right' },
];

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

function comparePriceByCondition(cond, left, right) {
  if (cond === '<') return left < right;
  if (cond === '<=') return left <= right;
  if (cond === '=') return left === right;
  if (cond === '>') return left > right;
  return true;
}

function normalizeProduct(p) {
  return {
    ...p,
    id: p.id,
    sku: p.sku || p.code || '',
    name: p.name || '',
    stock: Number(p.stock ?? p.on_hand ?? 0) || 0,
    minStock: Number(p.minStock ?? p.min_stock ?? 10) || 10,
    maxStock: Number(p.maxStock ?? p.max_stock ?? 100) || 100,
    costPrice: Number(p.costPrice ?? p.cost_price ?? 0) || 0,
    lastImportPrice: Number(p.lastImportPrice ?? p.last_import_price ?? p.costPrice ?? p.cost_price ?? 0) || 0,
    sellPrice: Number(p.sellPrice ?? p.sell_price ?? 0) || 0,
    sell_price: Number(p.sellPrice ?? p.sell_price ?? 0) || 0,
  };
}

export default function PriceBooksPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSku, setSearchSku] = useState('');
  const [searchName, setSearchName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [pricebookName, setPricebookName] = useState('');
  const [pricebooks, setPricebooks] = useState([{ id: 1, name: 'Bảng giá chung' }]);

  const [filters, setFilters] = useState({
    selectedCategories: new Set(),
    stock: '',
    priceCond: '',
    priceComp: '',
  });

  const [expandedSections, setExpandedSections] = useState({
    date: true,
    formula: true,
    settings: true,
  });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const init = {};
    ALL_COLUMNS.forEach((c) => {
      init[c.key] = c.defaultVisible;
    });
    return init;
  });

  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const toggleSection = (sec) => setExpandedSections((p) => ({ ...p, [sec]: !p[sec] }));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) setColumnMenuOpen(false);
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c] = await Promise.all([
          productAPI.getAll().catch(() => []),
          categoryAPI.getAll().catch(() => []),
        ]);
        const list = Array.isArray(p) ? p : (p?.data || []);
        if (list.length === 0) {
          const mockProducts = [
            { id: 1, sku: 'SP000001', name: 'Gà ta thả vườn làm sạch', sellPrice: 155000, costPrice: 120000, lastImportPrice: 120000, stock: 50, categoryId: 1 },
            { id: 2, sku: 'SP000002', name: 'Gà ác làm sạch nguyên con', sellPrice: 85000, costPrice: 65000, lastImportPrice: 65000, stock: 30, categoryId: 1 },
            { id: 3, sku: 'SP000003', name: 'Trứng gà ta sạch (Hộp 10 quả)', sellPrice: 35000, costPrice: 25000, lastImportPrice: 25000, stock: 100, categoryId: 2 },
          ];
          setProducts(mockProducts.map(normalizeProduct));
        } else {
          setProducts(list.map(normalizeProduct));
        }

        let cats = [];
        if (c && c.roots) {
          const flatten = (list, prefix = '') => {
            let res = [];
            for (let item of list) {
              res.push({ ...item, name: prefix + item.name });
              if (item.children && item.children.length > 0) {
                res = res.concat(flatten(item.children, prefix + '— '));
              }
            }
            return res;
          };
          cats = flatten(c.roots);
        } else if (Array.isArray(c)) {
          cats = c;
        }
        setCategories(cats);
      } catch (e) {
        setProducts([]);
      }
    };
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    const q = search.trim().toLowerCase();
    const qSku = searchSku.trim().toLowerCase();
    const qName = searchName.trim().toLowerCase();

    if (q) {
      list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
    }
    if (qSku) list = list.filter(p => (p.sku || '').toLowerCase().includes(qSku));
    if (qName) list = list.filter(p => (p.name || '').toLowerCase().includes(qName));

    if (filters.selectedCategories && filters.selectedCategories.size > 0) {
      list = list.filter(p => {
        const categoryId = p.category_id ?? p.categoryId ?? p.category?.id;
        return filters.selectedCategories.has(categoryId);
      });
    }

    if (filters.stock === 'in') list = list.filter((p) => p.stock > 0);
    if (filters.stock === 'out') list = list.filter((p) => p.stock <= 0);
    if (filters.stock === 'under') list = list.filter((p) => p.stock > 0 && p.stock < p.minStock);
    if (filters.stock === 'over') list = list.filter((p) => p.stock > p.maxStock);

    if (filters.priceCond && filters.priceComp) {
      list = list.filter((p) => {
        const sell = Number(p.sellPrice || 0);
        const comp = filters.priceComp === 'costPrice' ? Number(p.costPrice || 0) : Number(p.lastImportPrice || 0);
        return comparePriceByCondition(filters.priceCond, sell, comp);
      });
    }

    return list;
  }, [products, search, searchSku, searchName, filters]);

  const shownColumns = ALL_COLUMNS.filter((c) => visibleColumns[c.key]);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;

        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const skuKeys = ['sku', 'ma_hang', 'mã hàng', 'ma hang', 'mã_hàng'];
        const priceKeys = ['sellprice', 'sell_price', 'bang_gia', 'bảng giá', 'gia_ban', 'giá bán'];

        const normalizeKey = (k) => String(k || '').trim().toLowerCase();

        const updates = rows
          .map((r) => {
            const keys = Object.keys(r);
            const skuKey = keys.find((k) => skuKeys.includes(normalizeKey(k)));
            const priceKey = keys.find((k) => priceKeys.includes(normalizeKey(k)));
            if (!skuKey || !priceKey) return null;
            const sku = String(r[skuKey] || '').trim();
            const price = Number(String(r[priceKey]).replace(/[^0-9.-]/g, ''));
            if (!sku || Number.isNaN(price)) return null;
            return { sku, price };
          })
          .filter(Boolean);

        if (updates.length === 0) {
          toast.error('File không có dữ liệu hợp lệ (cần cột SKU và Giá bán)');
          return;
        }

        const mapUpdate = new Map(updates.map((u) => [u.sku.toLowerCase(), u.price]));
        let changed = 0;

        setProducts((prev) =>
          prev.map((p) => {
            const key = String(p.sku || '').toLowerCase();
            if (!mapUpdate.has(key)) return p;
            changed += 1;
            const newPrice = mapUpdate.get(key);
            return { ...p, sellPrice: newPrice, sell_price: newPrice };
          })
        );

        toast.success(`Import thành công. Cập nhật ${changed} sản phẩm.`);
      } catch (e) {
        toast.error('Lỗi khi import file');
      }
    };
    input.click();
  };

  const handleExport = () => {
    try {
      const rows = filteredProducts.map((p) => {
        const row = {};
        shownColumns.forEach((c) => {
          if (c.key === 'sku') row[c.label] = p.sku || '';
          if (c.key === 'name') row[c.label] = p.name || '';
          if (c.key === 'costPrice') row[c.label] = p.costPrice || 0;
          if (c.key === 'lastImportPrice') row[c.label] = p.lastImportPrice || 0;
          if (c.key === 'sellPrice') row[c.label] = p.sellPrice || 0;
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BangGia');
      XLSX.writeFile(wb, 'bang_gia.xlsx');
      toast.success('Xuất file thành công');
    } catch {
      toast.error('Lỗi khi xuất file');
    }
  };

  const handlePriceChange = async (id, newPriceStr) => {
    const num = Number(String(newPriceStr).replace(/[^0-9.-]+/g, ''));
    if (Number.isNaN(num)) return;

    try {
      if (productAPI.update) {
        await productAPI.update(id, { sellPrice: num, sell_price: num });
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, sellPrice: num, sell_price: num } : p))
      );
      toast.success('Cập nhật giá thành công');
    } catch (e) {
      toast.error('Lỗi khi cập nhật giá');
    }
  };

  const handleCreatePricebook = () => {
    const name = pricebookName.trim();
    if (!name) {
      toast.error('Vui lòng nhập tên bảng giá');
      return;
    }
    const exists = pricebooks.some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error('Tên bảng giá đã tồn tại');
      return;
    }

    setPricebooks((prev) => [...prev, { id: Date.now(), name }]);
    setPricebookName('');
    setModalOpen(false);
    toast.success('Tạo bảng giá thành công');
  };

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen p-1.5 sm:p-6 font-sans max-w-full overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 max-w-full">
        <h1 className="text-lg sm:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3 m-0">
          Bảng giá chung
        </h1>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
          {/* Row 1: Search + Primary Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 sm:p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Bộ lọc tìm kiếm"
            >
              <Filter size={18} />
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Theo mã, tên hàng"
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all shadow-sm font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`absolute right-2.5 top-1.5 sm:top-2 p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer ${searchOpen ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                title="Tìm kiếm nâng cao"
              >
                <SlidersHorizontal size={16} />
              </button>

              {/* Advanced Search Popover */}
              {searchOpen && (
                <div ref={searchPanelRef} className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 z-50 flex flex-col gap-4 animate-fade-in max-w-[calc(100vw-24px)]">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <span className="font-bold text-gray-800 text-sm">Tìm kiếm nâng cao</span>
                    <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer">Đóng</button>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Mã hàng</label>
                    <input type="text" placeholder="Nhập mã hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchSku} onChange={e => setSearchSku(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Tên hàng hóa</label>
                    <input type="text" placeholder="Nhập tên hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchName} onChange={e => setSearchName(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { setSearchSku(''); setSearchName(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="primary" onClick={() => setModalOpen(true)} className="flex items-center justify-center gap-1 sm:gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold p-2 sm:py-2.5 sm:px-5 rounded-xl text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer">
              <Plus size={18} /> <span className="hidden sm:inline">Bảng giá</span>
            </Button>

            <Button variant="secondary" onClick={handleImport} className="flex items-center justify-center gap-1 sm:gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold p-2 sm:py-2.5 sm:px-4 rounded-xl shadow-sm text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer">
              <Upload size={16} /> <span className="hidden sm:inline">Import</span>
            </Button>
          </div>

          {/* Row 2: Secondary Actions & Column selection */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-start lg:justify-end pt-1 lg:pt-0 border-t border-gray-100 lg:border-none mt-1 lg:mt-0">
            <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl shadow-sm text-xs sm:text-sm whitespace-nowrap cursor-pointer">
              <Download size={16} /> Xuất file
            </Button>

            {/* Column Visibility Menu */}
            <div className="relative" ref={columnMenuRef}>
              <button
                onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                className="p-2 sm:p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer flex items-center justify-center"
              >
                <Columns3 size={18} />
              </button>

              {columnMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 animate-fade-in">
                  <div className="text-xs font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Ẩn/hiện cột</div>
                  <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                    {ALL_COLUMNS.map(c => (
                      <label key={c.key} className="flex items-center gap-3 text-xs font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={!!visibleColumns[c.key]}
                          onChange={(e) => setVisibleColumns((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                        />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="hidden sm:flex p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer items-center justify-center">
              <Settings size={18} />
            </button>
            <button className="hidden sm:flex p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer items-center justify-center">
              <HelpCircle size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start max-w-full relative">
        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Filter Sidebar */}
        <div className={`fixed top-14 md:top-[102px] bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-64 lg:p-4 lg:shadow-sm lg:border lg:border-gray-100 lg:rounded-2xl lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col gap-2 font-sans`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          {/* Nhóm hàng */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-extrabold text-gray-800 tracking-tight">Nhóm hàng</span>
              <button className="text-primary text-xs font-bold hover:underline cursor-pointer bg-transparent border-none">Tạo mới</button>
            </div>
            <CategoryFilter
              categories={categories}
              products={products}
              selectedIds={filters.selectedCategories}
              onApply={(ids) => setFilters((prev) => ({ ...prev, selectedCategories: ids }))}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Tồn kho */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Tồn kho</span>
            <Dropdown
              value={filters.stock}
              options={STOCK_OPTIONS}
              onChange={(v) => setFilters((prev) => ({ ...prev, stock: v }))}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Giá bán */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Giá bán</span>
            <div className="flex flex-col gap-3">
              <Dropdown
                value={filters.priceCond}
                options={PRICE_COND_OPTIONS}
                onChange={(v) => setFilters((prev) => ({ ...prev, priceCond: v }))}
              />
              <Dropdown
                value={filters.priceComp}
                options={PRICE_COMPARE_OPTIONS}
                onChange={(v) => setFilters((prev) => ({ ...prev, priceComp: v }))}
              />
            </div>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto max-w-full w-full">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                {shownColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`p-4 font-extrabold ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors font-medium">
                  {shownColumns.map((col) => {
                    if (col.key === 'sku') {
                      return (
                        <td key={col.key} className="p-4 text-primary font-bold">
                          {p.sku || `SP${p.id}`}
                        </td>
                      );
                    }
                    if (col.key === 'name') {
                      return (
                        <td key={col.key} className="p-4 font-bold text-gray-800">
                          {p.name}
                        </td>
                      );
                    }
                    if (col.key === 'costPrice') {
                      return (
                        <td key={col.key} className="p-4 text-right text-gray-600">
                          {fmt(p.costPrice)}
                        </td>
                      );
                    }
                    if (col.key === 'lastImportPrice') {
                      return (
                        <td key={col.key} className="p-4 text-right text-gray-600">
                          {fmt(p.lastImportPrice)}
                        </td>
                      );
                    }
                    if (col.key === 'sellPrice') {
                      return (
                        <td key={col.key} className="p-4 text-right">
                          <input
                            type="text"
                            className="w-32 border border-gray-200 rounded-xl px-3 py-1.5 text-right text-sm font-bold text-gray-800 focus:border-primary outline-none focus:ring-1 focus:ring-primary shadow-sm bg-white transition-all float-right"
                            defaultValue={fmt(p.sellPrice)}
                            onBlur={(e) => {
                              const newVal = e.target.value;
                              if (newVal !== fmt(p.sellPrice)) {
                                handlePriceChange(p.id, newVal);
                              }
                            }}
                          />
                        </td>
                      );
                    }
                    return null;
                  })}
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={Math.max(1, shownColumns.length)} className="p-12 text-center text-gray-400 font-medium">
                    Không tìm thấy dữ liệu hàng hóa nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tạo bảng giá"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="px-4 py-2 font-bold">Bỏ qua</Button>
            <Button variant="primary" onClick={handleCreatePricebook} className="px-6 py-2 bg-primary hover:bg-primary-hover font-bold shadow-md">
              Lưu
            </Button>
          </>
        }
      >
        <div className="mb-6 flex border-b border-gray-200 gap-6 px-2">
          <button
            className={`py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
          </button>
          <button
            className={`py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'scope' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('scope')}
          >
            Phạm vi áp dụng
          </button>
        </div>

        {activeTab === 'info' && (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-extrabold text-gray-700 mb-2 block tracking-tight">Tên bảng giá</label>
              <input
                type="text"
                placeholder="Nhập tên bảng giá"
                value={pricebookName}
                onChange={(e) => setPricebookName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none shadow-sm"
              />
              {pricebooks.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 font-medium">
                  Hiện có: <span className="font-bold text-gray-700">{pricebooks.map((p) => p.name).join(', ')}</span>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50/80 cursor-pointer select-none border-b border-gray-100" onClick={() => toggleSection('date')}>
                <div className="font-extrabold text-sm text-gray-800">Hiệu lực</div>
                {expandedSections.date ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </div>
              {expandedSections.date && (
                <div className="p-5 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <div className="w-full sm:w-24 text-xs font-bold text-gray-600">Hiệu lực</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3.5 py-2 bg-white shadow-sm w-full sm:w-auto">
                        <input type="text" defaultValue="15/05/2026 14:09" className="text-xs font-bold outline-none w-32 text-gray-800" />
                        <div className="flex items-center gap-2 text-gray-400"><Info size={14} /><HelpCircle size={14} /></div>
                      </div>
                      <span className="text-gray-500 text-xs font-bold self-center sm:self-auto">đến</span>
                      <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3.5 py-2 bg-white shadow-sm w-full sm:w-auto">
                        <input type="text" defaultValue="15/05/2027 14:09" className="text-xs font-bold outline-none w-32 text-gray-800" />
                        <div className="flex items-center gap-2 text-gray-400"><Info size={14} /><HelpCircle size={14} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50/80 cursor-pointer select-none border-b border-gray-100" onClick={() => toggleSection('formula')}>
                <div className="font-extrabold text-sm text-gray-800">Công thức giá</div>
                {expandedSections.formula ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </div>
              {expandedSections.formula && (
                <div className="p-5 bg-white font-medium text-xs text-gray-500">
                  Tạo công thức dựa trên giá vốn, giá nhập hoặc giá bán ở các bảng giá khác
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50/80 cursor-pointer select-none border-b border-gray-100" onClick={() => toggleSection('settings')}>
                <div className="font-extrabold text-sm text-gray-800">Khi thu ngân lên đơn với bảng giá này</div>
                {expandedSections.settings ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </div>
              {expandedSections.settings && (
                <div className="p-5 bg-white font-medium text-xs text-gray-600">
                  Thiết lập nâng cao có thể mở rộng thêm theo nghiệp vụ.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scope' && (
          <div className="space-y-4 text-sm text-gray-700 font-medium">
            <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">Phạm vi áp dụng theo chi nhánh / nhóm khách hàng / người tạo giao dịch.</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
