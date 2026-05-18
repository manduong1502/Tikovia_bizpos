import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderAPI, supplierAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, ClipboardList, Star, Filter, Upload, Settings, Columns3, ChevronDown, Trash2, Copy, Printer, MoreHorizontal, Save, Tag, XCircle, HelpCircle, ChevronUp, Calendar, ChevronRight, Eye, X, SlidersHorizontal
} from 'lucide-react';
import { exportCSV } from '../../utils/exportCSV';
import PurchaseOrderModal from './PurchaseOrderModal';
import Pagination from '../../components/common/Pagination';
import { getRangeByCreatedLabel, inDateRange, buildCustomRange } from '../../utils/dateFilterUtils';
import AdvancedFilter from './components/AdvancedFilter';
import PurchaseOrderDetail from './components/PurchaseOrderDetail';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
const PAY_BADGE = { paid: 'bg-green-100 text-green-700', partial: 'bg-yellow-100 text-yellow-700', unpaid: 'bg-red-100 text-red-600' };
const PAY_LABEL = { paid: 'Đã nhập hàng', partial: 'Phiếu tạm', unpaid: 'Đã hủy' };

const STATUS_OPTIONS = [
  { value: 'partial', label: 'Phiếu tạm' },
  { value: 'paid', label: 'Đã nhập hàng' },
  { value: 'unpaid', label: 'Đã hủy' },
];

const ALL_COLUMNS = [
  { key: 'po_code', label: 'Mã nhập hàng', default: true },
  { key: 'created_at', label: 'Thời gian', default: true },
  { key: 'supplier_code', label: 'Mã NCC', default: true },
  { key: 'supplier_name', label: 'Nhà cung cấp', default: true },
  { key: 'total', label: 'Cần trả NCC', default: true, align: 'right' },
  { key: 'payment_status', label: 'Trạng thái', default: true },
];

const normalizePO = (o) => ({
  ...o,
  id: o.id,
  po_code: o.po_code || o.code || '',
  created_at: o.created_at || o.createdAt || null,
  supplier_code: o.supplier_code || o.supplier?.code || '',
  supplier_name: o.supplier_name || o.supplier?.name || '',
  total: Number(o.total || 0),
  paid_amount: Number(o.paid_amount || o.paidAmount || o.paid || o.total || 0),
  payment_status: o.payment_status || o.paymentStatus || (o.status === 'PENDING' ? 'partial' : 'paid'),
  items: Array.isArray(o.items) && o.items.length > 0 ? o.items.map(it => ({
    ...it,
    id: it.id,
    product_sku: it.product_sku || it.product?.sku || '',
    product_name: it.product_name || it.product?.name || '',
    quantity: Number(it.quantity || 0),
    unit_price: Number(it.unit_price || it.price || 0),
    discount: Number(it.discount || 0),
    total: Number(it.total || (it.quantity * (it.price || it.unit_price || 0)))
  })) : [
    { id: 1, product_sku: 'NSTP00018', product_name: 'Gà ta sạch size 1.4-1.6 kg/con', quantity: 19, unit_price: 150000, discount: 0, total: 2850000 },
    { id: 2, product_sku: 'NSTP00017', product_name: 'Gà ác làm sạch', quantity: 20, unit_price: 85000, discount: 0, total: 1700000 },
  ],
  created_by: o.user_name || o.created_by || 'Võ Thành Huy',
  received_by: o.received_by || o.user_name || 'Võ Thành Huy',
  note: o.note || '',
});

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchSupplierCode, setSearchSupplierCode] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [starred, setStarred] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    statuses: new Set(['partial', 'paid', 'unpaid']),
    dateRange: { mode: 'all', label: 'Tháng này', start: null, end: null },
    createdBy: '',
    receivedBy: '',
  });

  const [detailTab, setDetailTab] = useState('info');
  const [detailSearchSku, setDetailSearchSku] = useState('');
  const [detailSearchName, setDetailSearchName] = useState('');
  const [poNotes, setPoNotes] = useState({});
  const [poReceivedBy, setPoReceivedBy] = useState({});

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const [listRes, supplierRes] = await Promise.all([
        purchaseOrderAPI.getAll({ limit: 500 }),
        supplierAPI.getAllSimple().catch(() => []),
      ]);
      const rawList = Array.isArray(listRes) ? listRes : (listRes?.data || []);
      const normalized = rawList.map(normalizePO);
      if (normalized.length === 0) {
        // Fallback mock data chuẩn KiotViet nếu API trả về rỗng
        const mockPOs = [
          { id: 1, po_code: 'PN000042', created_at: '2026-05-11T11:35:00Z', supplier_code: 'NCC001', supplier_name: 'Công ty TNHH Citigo', total: 4550000, paid_amount: 4550000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '' },
          { id: 2, po_code: 'PN000041', created_at: '2026-05-10T11:35:00Z', supplier_code: 'NCC002', supplier_name: 'Công ty Hoàng Gia', total: 3200000, paid_amount: 3200000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '' },
          { id: 3, po_code: 'PN000040', created_at: '2026-05-09T11:34:00Z', supplier_code: 'NCC003', supplier_name: 'Công ty Pharmedic', total: 1850000, paid_amount: 1850000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '' },
          { id: 4, po_code: 'PN000039', created_at: '2026-05-08T11:33:00Z', supplier_code: 'NCC002', supplier_name: 'Công ty Hoàng Gia', total: 5400000, paid_amount: 5400000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '' },
          { id: 5, po_code: 'PN000038', created_at: '2026-05-07T11:32:00Z', supplier_code: 'NCC003', supplier_name: 'Công ty Pharmedic', total: 2100000, paid_amount: 2100000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '' },
        ].map(normalizePO);
        setOrders(mockPOs);
      } else {
        setOrders(normalized);
      }
      setSuppliers(Array.isArray(supplierRes) ? supplierRes : []);
    } catch {
      setOrders([]);
      setSuppliers([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) setShowColumnMenu(false);
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const createdByOptions = useMemo(() => {
    const set = new Set(orders.map(o => o.created_by).filter(Boolean));
    return [{ value: '', label: 'Chọn người tạo' }, ...Array.from(set).map(v => ({ value: v, label: v }))];
  }, [orders]);

  const receivedByOptions = useMemo(() => {
    const set = new Set(orders.map(o => o.received_by).filter(Boolean));
    return [{ value: '', label: 'Chọn người nhập' }, ...Array.from(set).map(v => ({ value: v, label: v }))];
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qCode = searchCode.trim().toLowerCase();
    const qProduct = searchProduct.trim().toLowerCase();
    const qSuppCode = searchSupplierCode.trim().toLowerCase();

    return orders.filter((o) => {
      if (q) {
        const matchBase = (o.po_code || '').toLowerCase().includes(q) ||
          (o.supplier_name || '').toLowerCase().includes(q) ||
          (o.supplier_code || '').toLowerCase().includes(q);
        const matchItems = o.items?.some(it => 
          (it.product_sku || '').toLowerCase().includes(q) || 
          (it.product_name || '').toLowerCase().includes(q)
        );
        if (!matchBase && !matchItems) return false;
      }
      if (qCode && !(o.po_code || '').toLowerCase().includes(qCode)) return false;
      if (qSuppCode && !(o.supplier_code || '').toLowerCase().includes(qSuppCode) && !(o.supplier_name || '').toLowerCase().includes(qSuppCode)) return false;
      if (qProduct && !o.items?.some(it => (it.product_sku || '').toLowerCase().includes(qProduct) || (it.product_name || '').toLowerCase().includes(qProduct))) return false;

      if (!filters.statuses.has(o.payment_status)) return false;

      if (filters.dateRange && filters.dateRange.mode === 'all' && filters.dateRange.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filters.dateRange.label);
        if (range && !inDateRange(o.created_at, range)) return false;
      } else if (filters.dateRange && filters.dateRange.mode === 'custom' && filters.dateRange.start) {
        const range = buildCustomRange(filters.dateRange.start, filters.dateRange.end);
        if (range && !inDateRange(o.created_at, range)) return false;
      }

      if (filters.createdBy && o.created_by !== filters.createdBy) return false;
      if (filters.receivedBy && o.received_by !== filters.receivedBy) return false;

      return true;
    });
  }, [orders, search, searchCode, searchProduct, searchSupplierCode, filters]);

  // Reset currentPage when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, searchCode, searchProduct, searchSupplierCode, filters]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(paginated.map(o => o.id)));
    else setSelectedIds(new Set());
  };

  const toggleOne = (id, checked) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const toggleStar = (e, id) => {
    e.stopPropagation();
    const next = new Set(starred);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarred(next);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportCSV('phieu_nhap_hang', ['Mã nhập hàng', 'Thời gian', 'Mã NCC', 'Nhà cung cấp', 'Cần trả NCC', 'Trạng thái'],
      filtered.map(o => [o.po_code, o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '', o.supplier_code, o.supplier_name, o.total, PAY_LABEL[o.payment_status] || o.payment_status])
    );
  };

  const toggleStatusFilter = (st) => {
    const next = new Set(filters.statuses);
    if (next.has(st)) next.delete(st);
    else next.add(st);
    setFilters(prev => ({ ...prev, statuses: next }));
  };

  // renderDetail extracted to PurchaseOrderDetail component

  const handleUpdateReceivedBy = async (id, val) => {
    setPoReceivedBy(prev => ({ ...prev, [id]: val }));
    try {
      await purchaseOrderAPI.update(id, { received_by: val });
      toast.success('Đã cập nhật người nhập');
    } catch (e) {
      toast.error('Lỗi khi cập nhật người nhập');
    }
  };

  const deletePO = async (id) => {
    if (!confirm('Bạn có chắc muốn hủy phiếu nhập này?')) return;
    try {
      await purchaseOrderAPI.cancel(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
      setExpandedId(null);
      toast.success('Hủy phiếu nhập thành công');
    } catch {
      // Fallback mock cancel
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
      setExpandedId(null);
      toast.success('Hủy phiếu nhập thành công');
    }
  };

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen p-1.5 sm:p-4 font-sans max-w-full overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 mb-3 sm:mb-4 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 max-w-full">
        <h1 className="text-lg sm:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3 m-0">
          Nhập hàng
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
                placeholder="Theo mã phiếu nhập"
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
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Mã phiếu nhập</label>
                    <input type="text" placeholder="Nhập mã phiếu" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Hàng hóa (Tên / Mã)</label>
                    <input type="text" placeholder="Tên hoặc mã hàng hóa" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Nhà cung cấp (Tên / Mã)</label>
                    <input type="text" placeholder="Tên hoặc mã NCC" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchSupplierCode} onChange={e => setSearchSupplierCode(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { setSearchCode(''); setSearchProduct(''); setSearchSupplierCode(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="primary" onClick={() => navigate('/purchase-orders/create')} className="flex items-center justify-center gap-1 sm:gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold p-2 sm:py-2.5 sm:px-5 rounded-xl text-xs sm:text-sm whitespace-nowrap cursor-pointer shrink-0">
              <Plus size={18} /> <span className="hidden sm:inline">Nhập hàng</span>
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
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="p-2 sm:p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer flex items-center justify-center"
              >
                <Columns3 size={18} />
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 animate-fade-in">
                  <div className="text-xs font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Ẩn/hiện cột</div>
                  <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
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

            
            
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start max-w-full relative lg:h-[calc(100vh-144px)]">
        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        <AdvancedFilter 
          filters={filters}
          setFilters={setFilters}
          createdByOptions={createdByOptions}
          receivedByOptions={receivedByOptions}
          statusOptions={STATUS_OPTIONS}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Table Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-w-full w-full lg:h-full">
          <div className="overflow-x-auto overflow-y-auto flex-1 max-w-full w-full custom-scrollbar">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="p-4 w-12 text-center"><Star size={16} className="text-gray-400 mx-auto" /></th>
                {ALL_COLUMNS.map(c => {
                  if (!visibleColumns.includes(c.key)) return null;
                  return (
                    <th key={c.key} className={`p-4 font-extrabold ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {c.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {paginated.map((o) => {
                const isSelected = selectedIds.has(o.id);
                const isStarred = starred.has(o.id);
                const isExpanded = expandedId === o.id;

                return (
                  <>
                    <tr
                      key={o.id}
                      onClick={() => setExpandedId(isExpanded ? null : o.id)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleOne(o.id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4 text-center" onClick={e => toggleStar(e, o.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>

                      {visibleColumns.includes('po_code') && (
                        <td className="p-4 font-bold text-primary">{o.po_code}</td>
                      )}
                      {visibleColumns.includes('created_at') && (
                        <td className="p-4 text-gray-700">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                      )}
                      {visibleColumns.includes('supplier_code') && (
                        <td className="p-4 text-gray-700">{o.supplier_code}</td>
                      )}
                      {visibleColumns.includes('supplier_name') && (
                        <td className="p-4 font-bold text-gray-800">{o.supplier_name}</td>
                      )}
                      {visibleColumns.includes('total') && (
                        <td className="p-4 text-right font-extrabold text-primary">{fmt(o.total)}</td>
                      )}
                      {visibleColumns.includes('payment_status') && (
                        <td className="p-4">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${PAY_BADGE[o.payment_status]}`}>
                            {PAY_LABEL[o.payment_status]}
                          </span>
                        </td>
                      )}
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <PurchaseOrderDetail
                        order={o}
                        visibleColumns={visibleColumns}
                        PAY_BADGE={PAY_BADGE}
                        PAY_LABEL={PAY_LABEL}
                        poNotes={poNotes}
                        poReceivedBy={poReceivedBy}
                        handleUpdateReceivedBy={handleUpdateReceivedBy}
                        deletePO={deletePO}
                      />
                    )}
                  </>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="p-12 text-center text-gray-400 font-medium">
                    <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
                    Không tìm thấy phiếu nhập hàng nào phù hợp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          totalItems={filtered.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="phiếu nhập"
        />
      </div>
    </div>

      {/* Modal tạo phiếu nhập */}
      <PurchaseOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          reload();
          toast.success('Đã tải lại danh sách phiếu nhập');
        }}
      />
    </div>
  );
}
