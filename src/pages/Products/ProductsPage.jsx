import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { productAPI, categoryAPI, supplierAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Download, Upload, Settings, Search, Star, ChevronUp, ChevronDown, Package, Trash2, Copy, Edit, Tag, MoreHorizontal, ClipboardList, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

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
      setProducts(Array.isArray(p) ? p : []);
      
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

  // Filtered & sorted data
  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s));
    }
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
      const selected = new Set(filters.suppliers.map((v) => String(v)));
      list = list.filter((p) => {
        const supplierId = p.supplier_id ?? p.supplierId ?? p.supplier?.id;
        const supplierName = p.supplier_name || p.supplierName || p.supplier?.name;
        if (supplierId !== undefined && supplierId !== null) {
          return selected.has(String(supplierId));
        }
        return supplierName ? selected.has(String(supplierName)) : false;
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
  }, [products, search, filters, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const totalStock = filtered.reduce((a, p) => a + (p.stock || 0), 0);

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

  const catName = (catId) => categories.find(c => c.id === catId)?.name || 'Chưa phân nhóm';

  const deleteProduct = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await productAPI.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setExpandedId(null);
      toast.success('Xóa sản phẩm thành công');
    } catch {} // Error handled by API interceptor
  };

  const resetFilters = () => {
    setSearch('');
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
      <tr>
        <td colSpan={11} className="p-0 border-x-2 border-b-2 border-primary/20 bg-white shadow-inner">
          <div className="px-6 py-2">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-100 mb-4">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={(e) => { e.stopPropagation(); setDetailTab(t.key); }}
                  className={`px-4 py-2.5 text-[13px] border-b-2 transition-all cursor-pointer ${
                    detailTab === t.key
                      ? 'text-primary border-primary font-bold'
                      : 'text-gray-500 border-transparent hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {detailTab === 'info' && (
              <div className="flex gap-6 pb-4">
                <div className="w-[140px] h-[140px] bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-300 shrink-0 shadow-sm">
                  {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover rounded-xl" /> : <Package size={48} />}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-800 mb-1">{p.name}</div>
                  <div className="text-xs text-gray-500 mb-3">Nhóm hàng: <span className="text-primary font-medium">{catName(p.categoryId)}</span></div>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <span className="px-2.5 py-1 bg-blue-50 text-primary rounded-md text-[11px] font-medium">Hàng hóa thường</span>
                    <span className="px-2.5 py-1 bg-blue-50 text-primary rounded-md text-[11px] font-medium">Bán trực tiếp</span>
                    <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-md text-[11px] font-medium">Không tích điểm</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
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
                        <div className="text-gray-500 mb-1">{label}</div>
                        <div className="font-semibold text-gray-800">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {detailTab === 'desc' && (
              <div className="py-4 text-sm text-gray-600 leading-relaxed">
                {p.description ? (
                  <div dangerouslySetInnerHTML={{ __html: p.description }} />
                ) : (
                  <em className="text-gray-400">Chưa có mô tả</em>
                )}
              </div>
            )}
            {detailTab === 'stock_card' && (
              <div className="text-center py-10 text-gray-400">
                <ClipboardList size={32} className="mx-auto mb-3 text-gray-300" />
                Không tìm thấy kết quả nào phù hợp
              </div>
            )}
            {detailTab === 'inventory' && (
              <table className="w-full text-xs mb-4">
                <thead><tr className="text-gray-500 border-b border-gray-200">
                  <th className="py-2.5 text-left font-semibold">Chi nhánh</th>
                  <th className="py-2.5 text-right font-semibold">Tồn kho</th>
                  <th className="py-2.5 text-right font-semibold">KH đặt</th>
                  <th className="py-2.5 text-left font-semibold pl-4">Dự kiến hết hàng</th>
                  <th className="py-2.5 text-left font-semibold">Trạng thái</th>
                </tr></thead>
                <tbody>
                  <tr className="bg-gray-50 font-bold text-gray-800 border-b border-gray-100"><td className="py-2.5 pl-2">Tổng cộng</td><td className="text-right py-2.5">{p.stock || 0}</td><td className="text-right py-2.5">0</td><td></td><td></td></tr>
                  <tr className="hover:bg-gray-50 transition-colors"><td className="py-3 pl-2">Chi nhánh trung tâm</td><td className="text-right py-3 font-medium">{p.stock || 0}</td><td className="text-right py-3 text-gray-400">0</td><td className="py-3 pl-4 text-gray-400">---</td><td className="py-3 text-green-600 font-medium">Đang kinh doanh</td></tr>
                </tbody>
              </table>
            )}

            {/* Action bar */}
            <div className="flex items-center py-4 mt-2 border-t border-gray-100 gap-3" onClick={e => e.stopPropagation()}>
              <Button variant="default" size="sm" icon={<Trash2 size={14} />} onClick={() => deleteProduct(p.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">Xóa</Button>
              <Button variant="default" size="sm" icon={<Copy size={14} />} onClick={async () => { await copyToClipboard(`${p.sku} - ${p.name} - ${new Intl.NumberFormat('vi-VN').format(p.sellPrice||0)}`); toast.success('Đã sao chép thông tin sản phẩm'); }}>Sao chép</Button>
              <div className="flex-1" />
              <Button variant="primary" size="sm" icon={<Edit size={14} />} onClick={() => { setEditProduct(p); setModalOpen(true); }} className="shadow-sm">Chỉnh sửa</Button>
              <Button variant="default" size="sm" icon={<Tag size={14} />} onClick={() => printHTML(`<div style="text-align:center;padding:20px;"><h3 style="margin:0;">${p.name}</h3><p style="font-size:24px;font-weight:bold;margin:8px 0;">${p.sku || 'N/A'}</p><p style="color:#666;">${new Intl.NumberFormat('vi-VN').format(p.sellPrice||0)} đ</p></div>`, `Tem ${p.sku}`)}>In tem mã</Button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Hàng hóa</h1>
        <div className="flex items-center gap-3">
          {selected.size > 0 ? (
            <>
              <span className="text-primary font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg">Đã chọn {selected.size}</span>
              <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-red-500 cursor-pointer bg-transparent border-none p-1 transition-colors"><X size={18} /></button>
              <div className="flex-1" />
              <Button icon={<Download size={16} />} onClick={() => exportProducts(filtered)} className="shadow-sm">Xuất file</Button>
              <Button icon={<Tag size={16} />} className="shadow-sm" onClick={() => { const skus = [...selected].map(id => filtered.find(p=>p.id===id)).filter(Boolean).map(p => `<div style="text-align:center;padding:15px;border:1px dashed #ccc;margin:5px;"><strong>${p.name}</strong><br/><span style="font-size:20px;font-weight:bold;">${p.sku||'N/A'}</span><br/>${new Intl.NumberFormat('vi-VN').format(p.sellPrice||0)} đ</div>`).join(''); printHTML(`<div style="display:flex;flex-wrap:wrap;">${skus}</div>`, 'In tem mã'); }}>In tem mã</Button>
            </>
          ) : (
            <>
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditProduct(null); setModalOpen(true); }} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none">Tạo mới</Button>
              <Button icon={<Download size={16} />} onClick={() => exportProducts(filtered)} className="shadow-sm">Xuất file</Button>
              <Button icon={<Upload size={16} />} className="shadow-sm" onClick={() => { const input = document.createElement('input'); input.type='file'; input.accept='.csv,.xlsx'; input.onchange = () => toast.success(`Đã chọn file: ${input.files[0]?.name}. Tính năng nhập file đang phát triển.`); input.click(); }}>Nhập file</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar Filter */}
        <FilterSidebar
          categories={categories}
          products={products}
          suppliers={suppliers}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Data Panel */}
        <div className="flex-1 bg-white border border-gray-100 shadow-sm rounded-xl min-h-[500px] overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
            <div className="w-1/3">
              <Input
                icon={<Search size={16} className="text-gray-400" />}
                placeholder="Theo mã, tên hàng"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="bg-white"
              />
            </div>
            <Button variant="ghost" icon={<Settings size={16} />} className="ml-auto text-gray-500 hover:text-primary" onClick={resetFilters} />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  <th className="px-2 py-3.5 w-8 text-center"><Star size={14} className="mx-auto" /></th>
                  <th className="px-3 py-3.5 w-14"></th>
                  <th className="px-4 py-3.5 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort('sku')}>Mã hàng <SortArrow col="sku" /></th>
                  <th className="px-4 py-3.5 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort('name')}>Tên hàng <SortArrow col="name" /></th>
                  <th className="px-4 py-3.5 text-right cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort('sellPrice')}>Giá bán <SortArrow col="sellPrice" /></th>
                  <th className="px-4 py-3.5 text-right cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort('costPrice')}>Giá vốn <SortArrow col="costPrice" /></th>
                  <th className="px-4 py-3.5 text-right cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort('stock')}>Tồn kho <SortArrow col="stock" /></th>
                  <th className="px-4 py-3.5 text-right">Khách đặt</th>
                  <th className="px-4 py-3.5">Thời gian tạo</th>
                  <th className="px-4 py-3.5">Dự kiến hết hàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Summary row */}
                <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700">
                  <td colSpan={7} className="px-4 py-2.5"></td>
                  <td className="px-4 py-2.5 text-right text-primary">{totalStock}</td>
                  <td className="px-4 py-2.5 text-right text-primary">0</td>
                  <td colSpan={2}></td>
                </tr>

                {pageItems.map(p => {
                  const isExpanded = expandedId === p.id;
                  const isChecked = selected.has(p.id);
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50/30' :
                          isChecked ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => { setExpandedId(isExpanded ? null : p.id); setDetailTab('info'); }}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" checked={isChecked} onChange={e => toggleOne(p.id, e.target.checked)} />
                        </td>
                        <td className="px-2 py-3 text-center text-gray-300 hover:text-yellow-400 transition-colors" onClick={e => e.stopPropagation()}>
                          <Star size={16} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                            {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover rounded-lg" /> : <Package size={20} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">{p.sku || ''}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(p.sellPrice)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(p.costPrice || 0)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700">{p.stock || 0}</td>
                        <td className="px-4 py-3 text-right text-gray-500">0</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">
                          {(() => {
                            const created = parseFlexibleDate(p.created_at || p.createdAt || p.createdDate);
                            return created
                              ? created.toLocaleDateString('vi-VN') + ' ' + created.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : '';
                          })()}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-400">---</td>
                      </tr>
                      {isExpanded && renderDetail(p)}
                    </React.Fragment>
                  );
                })}

                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-gray-400">
                      <Package size={48} className="mx-auto mb-4 text-gray-300" />
                      <div className="text-base font-medium text-gray-500">Không có dữ liệu hàng hóa</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              Hiển thị
              <select
                value={perPage}
                onChange={(e) => { setPerPage(+e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {[15, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              dòng
            </div>
            <div className="text-xs font-medium">
              {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} trong {filtered.length} hàng hóa
            </div>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage(1)} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed">
                <ChevronLeft size={14} className="inline -ml-1 -mr-0.5" /><ChevronLeft size={14} className="inline -mr-1" />
              </button>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed">
                <ChevronLeft size={14} />
              </button>
              <input
                className="w-10 text-center border border-gray-200 rounded-md text-xs py-1.5 font-medium focus:border-primary outline-none focus:ring-1 focus:ring-primary"
                value={page}
                onChange={(e) => setPage(Math.max(1, Math.min(+e.target.value || 1, totalPages)))}
              />
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed">
                <ChevronRight size={14} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed">
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
