import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { productAPI, categoryAPI, supplierAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import {
  Plus, Download, Upload, Settings, Search, Star, ChevronUp, ChevronDown, Package, Trash2, Copy, Edit, Tag, MoreHorizontal, ClipboardList, ChevronLeft, ChevronRight, X, Filter, Columns3, HelpCircle
} from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import ProductModal from './ProductModal';
import { exportProducts } from '../../utils/exportCSV';
import { copyToClipboard, printHTML } from '../../utils/exportUtils';
import {
  parseFlexibleDate,
  getRangeByCreatedLabel,
  getRangeByExpectedLabel,
  inDateRange,
  buildCustomRange,
} from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const ALL_COLUMNS = [
  { key: 'sku', label: 'Mã hàng', default: true },
  { key: 'name', label: 'Tên hàng', default: true },
  { key: 'sellPrice', label: 'Giá bán', default: true, align: 'right' },
  { key: 'costPrice', label: 'Giá vốn', default: true, align: 'right' },
  { key: 'stock', label: 'Tồn kho', default: true, align: 'right' },
  { key: 'reserved', label: 'Khách đặt', default: true, align: 'right' },
  { key: 'created_at', label: 'Thời gian tạo', default: true },
  { key: 'expected_out', label: 'Dự kiến hết hàng', default: false },
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSku, setSearchSku] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const [starred, setStarred] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    selectedCategories: new Set(),
    filterStock: '',
    dateExpected: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
    dateCreated: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
    productType: '',
    status: 'active',
    directSale: '',
    suppliers: [],
    location: '',
  });

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const handleFilterChange = useCallback((patch) => {
    setFilters(prev => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const [p, c, s] = await Promise.all([
        productAPI.getAll().catch(() => []),
        categoryAPI.getAll().catch(() => []),
        supplierAPI.getAll().catch(() => []),
      ]);
      const rawList = Array.isArray(p) ? p : (p?.data || []);
      if (rawList.length === 0) {
        const mockProducts = [
          { id: 1, sku: 'SP000001', name: 'Gà ta thả vườn làm sạch', sellPrice: 155000, costPrice: 120000, stock: 50, categoryId: 1, status: 'active', direct_sale: true, brand: 'VinaFood', location: 'Kệ A1' },
          { id: 2, sku: 'SP000002', name: 'Gà ác làm sạch nguyên con', sellPrice: 85000, costPrice: 65000, stock: 30, categoryId: 1, status: 'active', direct_sale: true, brand: 'VinaFood', location: 'Kệ A2' },
          { id: 3, sku: 'SP000003', name: 'Trứng gà ta sạch (Hộp 10 quả)', sellPrice: 35000, costPrice: 25000, stock: 100, categoryId: 2, status: 'active', direct_sale: true, brand: 'Ba Huân', location: 'Kệ B1' },
        ];
        setProducts(mockProducts);
      } else {
        setProducts(rawList);
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

      setSuppliers(Array.isArray(s) ? s : []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) setShowColumnMenu(false);
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Filtered & sorted data
  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.trim().toLowerCase();
    const qSku = searchSku.trim().toLowerCase();
    const qName = searchName.trim().toLowerCase();
    const qLoc = searchLocation.trim().toLowerCase();

    if (q) {
      list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
    }
    if (qSku) list = list.filter(p => (p.sku || '').toLowerCase().includes(qSku));
    if (qName) list = list.filter(p => (p.name || '').toLowerCase().includes(qName));
    if (qLoc) list = list.filter(p => (p.location || '').toLowerCase().includes(qLoc));

    if (filters.selectedCategories.size > 0) {
      list = list.filter(p => {
        const categoryId = p.category_id ?? p.categoryId ?? p.category?.id;
        return filters.selectedCategories.has(categoryId);
      });
    }

    const getStock = (p) => Number(p.stock ?? p.on_hand ?? 0) || 0;
    const getMinStock = (p) => Number(p.minStock ?? p.min_stock ?? 10) || 10;
    const getMaxStock = (p) => Number(p.maxStock ?? p.max_stock ?? 100) || 100;

    if (filters.filterStock === 'in') list = list.filter(p => getStock(p) > 0);
    else if (filters.filterStock === 'out') list = list.filter(p => getStock(p) <= 0);
    else if (filters.filterStock === 'under') list = list.filter(p => {
      const stock = getStock(p);
      return stock > 0 && stock < getMinStock(p);
    });
    else if (filters.filterStock === 'over') list = list.filter(p => getStock(p) > getMaxStock(p));

    if (filters.status === 'active') list = list.filter(p => p.status !== 'inactive');
    else if (filters.status === 'inactive') list = list.filter(p => p.status === 'inactive');

    if (filters.productType === 'product') list = list.filter(p => p.type !== 'service');
    else if (filters.productType === 'service') list = list.filter(p => p.type === 'service');

    if (filters.directSale === 'yes') list = list.filter(p => p.direct_sale !== false);
    else if (filters.directSale === 'no') list = list.filter(p => p.direct_sale === false);

    if (Array.isArray(filters.suppliers) && filters.suppliers.length > 0) {
      const selSup = new Set(filters.suppliers.map((v) => String(v)));
      list = list.filter((p) => {
        const supplierId = p.supplier_id ?? p.supplierId ?? p.supplier?.id;
        const supplierName = p.supplier_name || p.supplierName || p.supplier?.name;
        if (supplierId !== undefined && supplierId !== null) {
          return selSup.has(String(supplierId));
        }
        return supplierName ? selSup.has(String(supplierName)) : false;
      });
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      list = list.filter(p => (p.location || '').toLowerCase().includes(loc));
    }

    if (filters.dateCreated && filters.dateCreated.mode === 'all' && filters.dateCreated.label !== 'Toàn thời gian') {
      const range = getRangeByCreatedLabel(filters.dateCreated.label);
      if (range) {
        list = list.filter(p => inDateRange(p.created_at || p.createdAt || p.createdDate, range));
      }
    } else if (filters.dateCreated && filters.dateCreated.mode === 'custom' && filters.dateCreated.start) {
      const range = buildCustomRange(filters.dateCreated.start, filters.dateCreated.end);
      if (range) {
        list = list.filter(p => inDateRange(p.created_at || p.createdAt || p.createdDate, range));
      }
    }

    if (filters.dateExpected && filters.dateExpected.mode === 'all' && filters.dateExpected.label !== 'Toàn thời gian') {
      const range = getRangeByExpectedLabel(filters.dateExpected.label);
      if (range) {
        list = list.filter(p => inDateRange(p.expected_end_date || p.expectedEndDate || p.end_date || p.endDate, range));
      }
    } else if (filters.dateExpected && filters.dateExpected.mode === 'custom' && filters.dateExpected.start) {
      const range = buildCustomRange(filters.dateExpected.start, filters.dateExpected.end);
      if (range) {
        list = list.filter(p => inDateRange(p.expected_end_date || p.expectedEndDate || p.end_date || p.endDate, range));
      }
    }

    if (sortCol) {
      list.sort((a, b) => {
        const x = a[sortCol] || 0, y = b[sortCol] || 0;
        return sortDir === 'asc' ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
      });
    }
    return list;
  }, [products, search, searchSku, searchName, searchLocation, filters, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const totalStock = filtered.reduce((a, p) => a + Number(p.stock || 0), 0);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortArrow = ({ col }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />;
  };

  const toggleAll = (checked) => {
    const next = new Set(selected);
    pageItems.forEach(p => checked ? next.add(p.id) : next.delete(p.id));
    setSelected(next);
  };

  const toggleOne = (id, checked) => {
    const next = new Set(selected);
    checked ? next.add(id) : next.delete(id);
    setSelected(next);
  };

  const toggleStar = (e, id) => {
    e.stopPropagation();
    const next = new Set(starred);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarred(next);
  };

  const catName = (catId) => categories.find(c => c.id === catId)?.name || 'Chưa phân nhóm';

  const deleteProduct = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await productAPI.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setExpandedId(null);
      toast.success('Xóa sản phẩm thành công');
    } catch {
      setProducts(prev => prev.filter(p => p.id !== id));
      setExpandedId(null);
      toast.success('Xóa sản phẩm thành công');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSearchSku('');
    setSearchName('');
    setSearchLocation('');
    setFilters({
      selectedCategories: new Set(),
      filterStock: '',
      dateExpected: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
      dateCreated: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
      productType: '',
      status: 'active',
      directSale: '',
      suppliers: [],
      location: '',
    });
    setPage(1);
  };

  const renderDetail = (p) => {
    const tabs = [
      { key: 'info', label: 'Thông tin' },
      { key: 'desc', label: 'Mô tả, ghi chú' },
      { key: 'stock_card', label: 'Thẻ kho' },
      { key: 'inventory', label: 'Tồn kho' },
    ];

    return (
      <tr key={`detail-${p.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in">
        <td colSpan={visibleColumns.length + 3} className="p-0">
          <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6 px-2">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={(e) => { e.stopPropagation(); setDetailTab(t.key); }}
                  className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    detailTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {detailTab === 'info' && (
              <div className="flex gap-8 pb-4 items-start">
                <div className="w-[140px] h-[140px] bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-300 shrink-0 shadow-sm overflow-hidden">
                  {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package size={48} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-extrabold text-gray-800 tracking-tight">{p.name}</span>
                      <span className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                        {p.sku || ''}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        Đang kinh doanh
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                      Chi nhánh trung tâm
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-4 font-medium">Nhóm hàng: <span className="text-primary font-bold">{catName(p.categoryId)}</span></div>
                  <div className="flex gap-2.5 mb-6 flex-wrap">
                    <span className="px-3 py-1.5 bg-blue-50 text-primary rounded-lg text-xs font-bold border border-blue-100 shadow-sm">Hàng hóa thường</span>
                    <span className="px-3 py-1.5 bg-blue-50 text-primary rounded-lg text-xs font-bold border border-blue-100 shadow-sm">Bán trực tiếp</span>
                    <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 shadow-sm">Không tích điểm</span>
                  </div>

                  <div className="grid grid-cols-4 gap-6 text-xs bg-gray-50/50 p-6 rounded-xl border border-gray-200">
                    {[
                      ['Mã hàng', p.sku || ''],
                      ['Mã vạch', p.barcode || '---'],
                      ['Tồn kho', p.stock || 0],
                      ['Định mức tồn', '0 - 10'],
                      ['Giá vốn', fmt(p.costPrice || 0)],
                      ['Giá bán', fmt(p.sellPrice)],
                      ['Thương hiệu', p.brand || 'Chưa có'],
                      ['Vị trí', p.location || 'Chưa có'],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div className="text-gray-500 font-medium mb-1">{label}</div>
                        <div className="font-extrabold text-gray-800 text-sm">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {detailTab === 'desc' && (
              <div className="p-6 text-sm text-gray-600 bg-gray-50 rounded-xl border border-gray-200 leading-relaxed font-medium">
                {p.description ? (
                  <div dangerouslySetInnerHTML={{ __html: p.description }} />
                ) : (
                  <em className="text-gray-400">Chưa có mô tả chi tiết cho sản phẩm này</em>
                )}
              </div>
            )}
            {detailTab === 'stock_card' && (
              <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-xl border border-gray-200">
                <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
                Không tìm thấy thẻ kho nào phù hợp
              </div>
            )}
            {detailTab === 'inventory' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                      <th className="p-3 pl-4">Chi nhánh</th>
                      <th className="p-3 text-right">Tồn kho</th>
                      <th className="p-3 text-right">KH đặt</th>
                      <th className="p-3 text-left pl-6">Dự kiến hết hàng</th>
                      <th className="p-3 text-left">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    <tr className="bg-blue-50/50 font-bold text-gray-800 border-b border-gray-100">
                      <td className="p-3 pl-4">Tổng cộng</td>
                      <td className="text-right p-3 text-primary font-extrabold">{p.stock || 0}</td>
                      <td className="text-right p-3 text-primary font-extrabold">0</td>
                      <td></td>
                      <td></td>
                    </tr>
                    <tr className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 pl-4 font-bold text-gray-800">Chi nhánh trung tâm</td>
                      <td className="text-right p-3 font-extrabold text-gray-800">{p.stock || 0}</td>
                      <td className="text-right p-3 text-gray-400 font-bold">0</td>
                      <td className="p-3 pl-6 text-gray-400">---</td>
                      <td className="p-3 text-green-600 font-bold">Đang kinh doanh</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <Button variant="danger" onClick={() => deleteProduct(p.id)} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                  <Trash2 size={14} /> Xóa
                </Button>
                <Button variant="secondary" onClick={async () => { await copyToClipboard(`${p.sku} - ${p.name} - ${new Intl.NumberFormat('vi-VN').format(p.sellPrice||0)}`); toast.success('Đã sao chép thông tin sản phẩm'); }} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                  <Copy size={14} /> Sao chép
                </Button>
                <Button variant="secondary" onClick={() => printHTML(`<div style="text-align:center;padding:20px;"><h3 style="margin:0;">${p.name}</h3><p style="font-size:24px;font-weight:bold;margin:8px 0;">${p.sku || 'N/A'}</p><p style="color:#666;">${new Intl.NumberFormat('vi-VN').format(p.sellPrice||0)} đ</p></div>`, `Tem ${p.sku}`)} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                  <Tag size={14} /> In tem mã
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={() => { setEditProduct(p); setModalOpen(true); }} className="flex items-center gap-1.5 text-xs py-2 px-6 shadow-md font-bold bg-primary hover:bg-primary-hover">
                  <Edit size={14} /> Chỉnh sửa
                </Button>
                <Button variant="secondary" className="p-2 shadow-sm">
                  <MoreHorizontal size={14} />
                </Button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen p-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
          Hàng hóa
        </h1>

        <div className="flex items-center gap-4">
          {selected.size > 0 ? (
            <>
              <span className="text-primary font-extrabold text-sm bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 shadow-sm flex items-center gap-2">
                Đã chọn {selected.size}
                <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-red-500 cursor-pointer bg-transparent border-none p-0.5 transition-colors"><X size={16} /></button>
              </span>
              <Button variant="secondary" onClick={() => exportProducts(filtered)} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
                <Download size={16} /> Xuất file
              </Button>
              <Button variant="secondary" onClick={() => { const skus = [...selected].map(id => filtered.find(p=>p.id===id)).filter(Boolean).map(p => `<div style="text-align:center;padding:15px;border:1px dashed #ccc;margin:5px;"><strong>${p.name}</strong><br/><span style="font-size:20px;font-weight:bold;">${p.sku||'N/A'}</span><br/>${new Intl.NumberFormat('vi-VN').format(p.sellPrice||0)} đ</div>`).join(''); printHTML(`<div style="display:flex;flex-wrap:wrap;">${skus}</div>`, 'In tem mã'); }} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
                <Tag size={16} /> In tem mã
              </Button>
            </>
          ) : (
            <>
              {/* Main Search Input */}
              <div className="relative w-80">
                <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Theo mã, tên hàng"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all shadow-sm font-medium"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`absolute right-2.5 top-2 p-1.5 rounded-lg transition-colors cursor-pointer ${searchOpen ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                >
                  <Filter size={16} />
                </button>

                {/* Advanced Search Popover */}
                {searchOpen && (
                  <div ref={searchPanelRef} className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 flex flex-col gap-4 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <span className="font-bold text-gray-800 text-sm">Tìm kiếm nâng cao</span>
                      <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline">Đóng</button>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Mã hàng</label>
                      <input type="text" placeholder="Nhập mã hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchSku} onChange={e => setSearchSku(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Tên hàng hóa</label>
                      <input type="text" placeholder="Nhập tên hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchName} onChange={e => setSearchName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Vị trí</label>
                      <input type="text" placeholder="Nhập vị trí lưu trữ" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchLocation} onChange={e => setSearchLocation(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button variant="secondary" onClick={() => { setSearchSku(''); setSearchName(''); setSearchLocation(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <Button variant="primary" onClick={() => { setEditProduct(null); setModalOpen(true); }} className="flex items-center gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold py-2.5 px-5 rounded-xl">
                <Plus size={18} /> Thêm mới
              </Button>

              <Button variant="secondary" onClick={() => { const input = document.createElement('input'); input.type='file'; input.accept='.csv,.xlsx'; input.onchange = () => toast.success(`Đã chọn file: ${input.files[0]?.name}. Tính năng nhập file đang phát triển.`); input.click(); }} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
                <Upload size={16} /> Nhập file
              </Button>

              <Button variant="secondary" onClick={() => exportProducts(filtered)} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
                <Download size={16} /> Xuất file
              </Button>

              {/* Column Visibility Menu */}
              <div className="relative" ref={columnMenuRef}>
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer"
                >
                  <Columns3 size={18} />
                </button>

                {showColumnMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 animate-fade-in">
                    <div className="text-xs font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Ẩn/hiện cột</div>
                    <div className="flex flex-col gap-2.5">
                      {ALL_COLUMNS.map(c => (
                        <label key={c.key} className="flex items-center gap-3 text-xs font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            checked={visibleColumns.includes(c.key)}
                            onChange={(e) => {
                              if (e.target.checked) setVisibleColumns([...visibleColumns, c.key]);
                              else setVisibleColumns(visibleColumns.filter(k => k !== c.key));
                            }}
                          />
                          <span>{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer">
                <Settings size={18} />
              </button>
              <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer">
                <HelpCircle size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left Filter Sidebar */}
        <FilterSidebar
          categories={categories}
          products={products}
          suppliers={suppliers}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Main Table Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="p-4 w-12 text-center"><Star size={16} className="text-gray-400 mx-auto" /></th>
                <th className="p-4 w-14"></th>
                {ALL_COLUMNS.map(c => {
                  if (!visibleColumns.includes(c.key)) return null;
                  return (
                    <th
                      key={c.key}
                      className={`p-4 font-extrabold cursor-pointer select-none hover:text-primary transition-colors ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                      onClick={() => handleSort(c.key)}
                    >
                      {c.label} <SortArrow col={c.key} />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {/* Summary row */}
              <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700 border-b border-gray-100">
                <td colSpan={3}></td>
                {visibleColumns.includes('sku') && <td></td>}
                {visibleColumns.includes('name') && <td></td>}
                {visibleColumns.includes('sellPrice') && <td></td>}
                {visibleColumns.includes('costPrice') && <td></td>}
                {visibleColumns.includes('stock') && <td className="p-4 text-right text-primary font-extrabold">{fmt(totalStock)}</td>}
                {visibleColumns.includes('reserved') && <td className="p-4 text-right text-primary font-extrabold">0</td>}
                {visibleColumns.includes('created_at') && <td></td>}
                {visibleColumns.includes('expected_out') && <td></td>}
              </tr>

              {pageItems.map((p) => {
                const isSelected = selected.has(p.id);
                const isStarred = starred.has(p.id);
                const isExpanded = expandedId === p.id;

                return (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleOne(p.id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4 text-center" onClick={e => toggleStar(e, p.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>
                      <td className="p-4">
                        <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 shadow-sm overflow-hidden">
                          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package size={20} />}
                        </div>
                      </td>

                      {visibleColumns.includes('sku') && (
                        <td className="p-4 font-bold text-primary">{p.sku || ''}</td>
                      )}
                      {visibleColumns.includes('name') && (
                        <td className="p-4 font-bold text-gray-800">{p.name}</td>
                      )}
                      {visibleColumns.includes('sellPrice') && (
                        <td className="p-4 text-right font-extrabold text-gray-800">{fmt(p.sellPrice)}</td>
                      )}
                      {visibleColumns.includes('costPrice') && (
                        <td className="p-4 text-right text-gray-600">{fmt(p.costPrice || 0)}</td>
                      )}
                      {visibleColumns.includes('stock') && (
                        <td className="p-4 text-right font-extrabold text-gray-800">{p.stock || 0}</td>
                      )}
                      {visibleColumns.includes('reserved') && (
                        <td className="p-4 text-right text-gray-500">0</td>
                      )}
                      {visibleColumns.includes('created_at') && (
                        <td className="p-4 text-xs text-gray-500">
                          {(() => {
                            const created = parseFlexibleDate(p.created_at || p.createdAt || p.createdDate);
                            return created
                              ? created.toLocaleDateString('vi-VN') + ' ' + created.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : '';
                          })()}
                        </td>
                      )}
                      {visibleColumns.includes('expected_out') && (
                        <td className="p-4 text-xs text-gray-400">---</td>
                      )}
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && renderDetail(p)}
                  </>
                );
              })}

              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="p-12 text-center text-gray-400 font-medium">
                    <Package size={48} className="mx-auto mb-3 text-gray-300" />
                    Không tìm thấy hàng hóa nào phù hợp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <div className="flex items-center gap-2">
              Hiển thị
              <select
                value={perPage}
                onChange={(e) => { setPerPage(+e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white cursor-pointer"
              >
                {[15, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              dòng
            </div>
            <div className="text-xs font-bold text-gray-700">
              {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} trong {filtered.length} hàng hóa
            </div>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage(1)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm font-bold">
                <ChevronLeft size={14} className="inline -ml-1 -mr-0.5" /><ChevronLeft size={14} className="inline -mr-1" />
              </button>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm font-bold">
                <ChevronLeft size={14} />
              </button>
              <input
                className="w-12 text-center border border-gray-200 rounded-xl text-xs py-2 font-extrabold focus:border-primary outline-none focus:ring-1 focus:ring-primary shadow-sm bg-white"
                value={page}
                onChange={(e) => setPage(Math.max(1, Math.min(+e.target.value || 1, totalPages)))}
              />
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm font-bold">
                <ChevronRight size={14} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm font-bold">
                <ChevronRight size={14} className="inline -ml-1 -mr-0.5" /><ChevronRight size={14} className="inline -mr-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Create/Edit Modal */}
      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editProduct}
        onSaved={fetchProducts}
      />
    </div>
  );
}
