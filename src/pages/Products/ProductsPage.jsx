import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { productAPI, categoryAPI, supplierAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Download, Upload, Settings, Search, Star, ChevronUp, ChevronDown, Package, Trash2, Copy, Edit, Tag, MoreHorizontal } from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import ProductModal from './ProductModal';
import { exportProducts } from '../../utils/exportCSV';

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
      setCategories(Array.isArray(c) ? c : []);
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
      list = list.filter(p => filters.selectedCategories.has(p.category_id));
    }
    if (filters.filterStock === 'in') list = list.filter(p => p.stock_quantity > 0);
    else if (filters.filterStock === 'out') list = list.filter(p => !p.stock_quantity);
    else if (filters.filterStock === 'under') list = list.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10);
    else if (filters.filterStock === 'over') list = list.filter(p => p.stock_quantity > 100);

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
  const totalStock = filtered.reduce((a, p) => a + (p.stock_quantity || 0), 0);

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
    });
    setPage(1);
  };

  // Inline detail panel content
  const renderDetail = (p) => {
    const tabs = [
      { key: 'info', label: 'Thông tin' },
      { key: 'desc', label: 'Mô tả, ghi chú' },
      { key: 'stock_card', label: 'Thẻ kho' },
      { key: 'inventory', label: 'Tồn kho' },
    ];

    return (
      <tr>
        <td colSpan={11} className="p-0 border-2 border-blue-200 bg-white">
          <div className="px-4">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-200 mb-3">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={(e) => { e.stopPropagation(); setDetailTab(t.key); }}
                  className={`px-4 py-2.5 text-[13px] border-b-2 transition-colors cursor-pointer ${
                    detailTab === t.key
                      ? 'text-primary border-primary font-semibold'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {detailTab === 'info' && (
              <div className="flex gap-5 pb-3">
                <div className="w-[120px] h-[120px] bg-gray-100 rounded-lg flex items-center justify-center text-5xl shrink-0">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : '📦'}
                </div>
                <div className="flex-1">
                  <div className="text-base font-semibold mb-1">{p.name}</div>
                  <div className="text-xs text-gray-500 mb-2">Nhóm hàng: <span className="text-primary">{catName(p.category_id)}</span></div>
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-primary rounded text-[11px]">Hàng hóa thường</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-primary rounded text-[11px]">Bán trực tiếp</span>
                    <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[11px]">Không tích điểm</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    {[
                      ['Mã hàng', p.sku || ''],
                      ['Mã vạch', p.barcode || '---'],
                      ['Tồn kho', p.stock_quantity || 0],
                      ['Định mức tồn', '0 - 10'],
                      ['Giá vốn', fmt(p.cost_price || 0)],
                      ['Giá bán', fmt(p.sell_price)],
                      ['Thương hiệu', p.brand || 'Chưa có'],
                      ['Vị trí', p.location || 'Chưa có'],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div className="text-gray-400">{label}</div>
                        <div className="font-medium text-gray-700">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {detailTab === 'desc' && (
              <div className="py-3 text-sm text-gray-500">
                {p.description || <em className="text-gray-300">Chưa có mô tả</em>}
              </div>
            )}
            {detailTab === 'stock_card' && (
              <div className="text-center py-8 text-gray-300">
                <div className="text-3xl mb-2">📋</div>
                Không tìm thấy kết quả nào phù hợp
              </div>
            )}
            {detailTab === 'inventory' && (
              <table className="w-full text-xs mb-3">
                <thead><tr className="text-gray-400 border-b">
                  <th className="py-2 text-left font-medium">Chi nhánh</th>
                  <th className="py-2 text-right font-medium">Tồn kho</th>
                  <th className="py-2 text-right font-medium">KH đặt</th>
                  <th className="py-2 text-left font-medium">Dự kiến hết hàng</th>
                  <th className="py-2 text-left font-medium">Trạng thái</th>
                </tr></thead>
                <tbody>
                  <tr className="bg-gray-50 font-semibold border-b"><td></td><td className="text-right py-2">{p.stock_quantity || 0}</td><td className="text-right py-2">0</td><td></td><td></td></tr>
                  <tr><td className="py-2">Chi nhánh trung tâm</td><td className="text-right py-2">{p.stock_quantity || 0}</td><td className="text-right py-2">0</td><td className="py-2">---</td><td className="py-2 text-green-600">Đang kinh doanh</td></tr>
                </tbody>
              </table>
            )}

            {/* Action bar */}
            <div className="flex items-center py-3 border-t border-gray-200 gap-2" onClick={e => e.stopPropagation()}>
              <Button variant="default" size="sm" icon={<Trash2 size={14} />} onClick={() => deleteProduct(p.id)}>Xóa</Button>
              <Button variant="default" size="sm" icon={<Copy size={14} />} onClick={() => toast.success('Đã sao chép')}>Sao chép</Button>
              <div className="flex-1" />
              <Button variant="primary" size="sm" icon={<Edit size={14} />} onClick={() => { setEditProduct(p); setModalOpen(true); }}>Chỉnh sửa</Button>
              <Button variant="default" size="sm" icon={<Tag size={14} />} onClick={() => toast.success('In tem mã...')}>In tem mã</Button>
              <Button variant="default" size="sm" icon={<MoreHorizontal size={14} />} />
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-page-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Hàng hóa</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-primary font-semibold text-sm">Đã chọn {selected.size}</span>
              <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none">✕</button>
              <div className="flex-1" />
              <Button icon={<Download size={16} />} onClick={() => exportProducts(filtered)}>Xuất file</Button>
              <Button icon={<Tag size={16} />}>In tem mã</Button>
            </>
          ) : (
            <>
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditProduct(null); setModalOpen(true); }}>Tạo mới</Button>
              <Button icon={<Download size={16} />} onClick={() => exportProducts(filtered)}>Xuất file</Button>
              <Button icon={<Upload size={16} />}>Nhập file</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Sidebar Filter */}
        <FilterSidebar
          categories={categories}
          products={products}
          suppliers={suppliers}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Data Panel */}
        <div className="flex-1 bg-white border border-border rounded min-h-[500px]">
          {/* Search bar */}
          <div className="p-3 border-b border-border flex items-center gap-3 bg-gray-50/50">
            <div className="w-1/3">
              <Input
                icon={<Search size={16} />}
                placeholder="Theo mã, tên hàng"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Button variant="ghost" icon={<Settings size={16} />} className="ml-auto" onClick={resetFilters} />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" className="w-4 h-4" onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  <th className="px-1 py-3 w-7 text-center">☆</th>
                  <th className="px-2 py-3 w-12"></th>
                  <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('sku')}>Mã hàng <SortArrow col="sku" /></th>
                  <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('name')}>Tên hàng <SortArrow col="name" /></th>
                  <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('sell_price')}>Giá bán <SortArrow col="sell_price" /></th>
                  <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('cost_price')}>Giá vốn <SortArrow col="cost_price" /></th>
                  <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('stock_quantity')}>Tồn kho <SortArrow col="stock_quantity" /></th>
                  <th className="px-3 py-3 text-right">Khách đặt</th>
                  <th className="px-3 py-3">Thời gian tạo</th>
                  <th className="px-3 py-3">Dự kiến hết hàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Summary row */}
                <tr className="bg-gray-50/60 text-xs font-semibold text-gray-600">
                  <td colSpan={7} className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right">{totalStock}</td>
                  <td className="px-3 py-2 text-right">0</td>
                  <td colSpan={2}></td>
                </tr>

                {pageItems.map(p => {
                  const isExpanded = expandedId === p.id;
                  const isChecked = selected.has(p.id);
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50 border-l-[3px] border-l-primary' :
                          isChecked ? 'bg-blue-50/30' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => { setExpandedId(isExpanded ? null : p.id); setDetailTab('info'); }}
                      >
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4" checked={isChecked} onChange={e => toggleOne(p.id, e.target.checked)} />
                        </td>
                        <td className="px-1 py-3 text-center text-gray-300 text-base" onClick={e => e.stopPropagation()}>
                          <Star size={16} />
                        </td>
                        <td className="px-2 py-3">
                          <div className="w-9 h-9 bg-gray-100 rounded flex items-center justify-center text-lg">
                            {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover rounded" /> : <Package size={18} className="text-gray-400" />}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-medium text-primary">{p.sku || ''}</td>
                        <td className="px-3 py-3">{p.name}</td>
                        <td className="px-3 py-3 text-right font-medium">{fmt(p.sell_price)}</td>
                        <td className="px-3 py-3 text-right">{fmt(p.cost_price || 0)}</td>
                        <td className="px-3 py-3 text-right">{p.stock_quantity || 0}</td>
                        <td className="px-3 py-3 text-right">0</td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') + ' ' + new Date(p.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-400">---</td>
                      </tr>
                      {isExpanded && renderDetail(p)}
                    </React.Fragment>
                  );
                })}

                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">📦</div>
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-gray-600">
            <div className="flex items-center gap-2">
              Hiển thị
              <select
                value={perPage}
                onChange={(e) => { setPerPage(+e.target.value); setPage(1); }}
                className="border border-gray-300 rounded px-2 py-1 text-xs"
              >
                {[15, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              dòng
            </div>
            <div className="text-xs">
              {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} trong {filtered.length} hàng hóa
            </div>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(1)} className="px-2 py-1 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed">⟨⟨</button>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed">⟨</button>
              <input
                className="w-9 text-center border border-gray-200 rounded text-xs py-1"
                value={page}
                onChange={(e) => setPage(Math.max(1, Math.min(+e.target.value || 1, totalPages)))}
              />
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed">⟩</button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed">⟩⟩</button>
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
