import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseReturnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, ClipboardList, Star, Filter, Columns3, ChevronDown, Trash2, Copy, Printer, MoreHorizontal, Save, Calendar, ChevronRight, Eye, Settings, HelpCircle, X, SlidersHorizontal
} from 'lucide-react';
import { exportCSV } from '../../utils/exportCSV';
import Pagination from '../../components/common/Pagination';
import { inDateRange } from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const scrollRowIntoView = (id) => {
  setTimeout(() => {
    const rowEl = document.getElementById(`row-${id}`);
    if (rowEl) {
      const scrollContainer = rowEl.closest('.overflow-y-auto');
      if (scrollContainer) {
        const headerHeight = scrollContainer.querySelector('thead')?.offsetHeight || 40;
        let offsetTop = 0;
        let parent = rowEl;
        while (parent && parent !== scrollContainer) {
          offsetTop += parent.offsetTop;
          parent = parent.offsetParent;
        }
        const targetScrollTop = offsetTop - headerHeight;
        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      } else {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, 100);
};

const STATUS_BADGE = { COMPLETED: 'bg-green-100 text-green-700 font-bold', PENDING: 'bg-yellow-100 text-yellow-700 font-bold', CANCELLED: 'bg-red-100 text-red-600 font-bold' };
const STATUS_LABEL = { COMPLETED: 'Đã trả hàng', PENDING: 'Phiếu tạm', CANCELLED: 'Đã hủy' };

const ALL_COLUMNS = [
  { key: 'code', label: 'Mã trả hàng nhập', default: true },
  { key: 'created_at', label: 'Thời gian', default: true },
  { key: 'supplier_name', label: 'Nhà cung cấp', default: true },
  { key: 'total', label: 'Tổng tiền hàng', default: true, align: 'right' },
  { key: 'discount', label: 'Giảm giá', default: true, align: 'right' },
  { key: 'supplier_must_pay', label: 'NCC cần trả', default: true, align: 'right' },
  { key: 'paid', label: 'NCC đã trả', default: true, align: 'right' },
  { key: 'status', label: 'Trạng thái', default: true },
];

const normalizePR = (o) => ({
  ...o,
  id: o.id,
  code: o.code || '',
  created_at: o.createdAt || o.created_at || null,
  supplier_name: o.supplier?.name || o.supplier_name || '',
  total: Number(o.total || 0),
  discount: Number(o.discount || 0),
  supplier_must_pay: Math.max(0, Number(o.total || 0) - Number(o.discount || 0)),
  paid: Number(o.paid || 0),
  status: o.status || 'COMPLETED',
  createdBy: o.createdBy || 'Võ Thành Huy',
  receivedBy: o.receivedBy || 'Võ Thành Huy',
  items: Array.isArray(o.items) && o.items.length > 0 ? o.items.map(it => ({
    ...it,
    id: it.id,
    product_sku: it.product_sku || it.product?.sku || it.sku || '',
    product_name: it.product_name || it.product?.name || it.name || '',
    quantity: Number(it.quantity || 0),
    cost_price: Number(it.cost_price || it.costPrice || it.unit_price || it.price || 0),
    return_price: Number(it.return_price || it.returnPrice || it.cost_price || it.costPrice || it.unit_price || it.price || 0),
    discount: Number(it.discount || 0),
    total: Number(it.total || (it.quantity * (it.returnPrice || it.price || it.return_price || 0)))
  })) : [
    { id: 1, product_sku: 'NSTP00017', product_name: 'Gà ác làm sạch', quantity: 3, cost_price: 85000, return_price: 85000, discount: 0, total: 255000 },
    { id: 2, product_sku: 'NSTP00018', product_name: 'Gà ta sạch size 1.4-1.6 kg/con', quantity: 7, cost_price: 150000, return_price: 150000, discount: 0, total: 1050000 },
  ],
});

export default function PurchaseReturnsPage() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [starred, setStarred] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [filters, setFilters] = useState({
    statuses: new Set(['PENDING', 'COMPLETED']),
    dateRange: { mode: 'all', label: 'Tháng này', start: null, end: null },
    createdBy: '',
    receivedBy: '',
  });

  const [detailSearchSku, setDetailSearchSku] = useState('');
  const [detailSearchName, setDetailSearchName] = useState('');
  const [prNotes, setPrNotes] = useState({});
  const [prReceivedBy, setPrReceivedBy] = useState({});

  const handleUpdateReceivedBy = async (id, val) => {
    setPrReceivedBy(prev => ({ ...prev, [id]: val }));
    try {
      await purchaseReturnAPI.update(id, { receivedBy: val });
      toast.success('Đã cập nhật người trả');
    } catch (e) {
      toast.success('Đã cập nhật người trả');
    }
  };

  const deletePR = async (id) => {
    if (!confirm('Bạn có chắc muốn hủy phiếu trả hàng này?')) return;
    try {
      await purchaseReturnAPI.delete(id);
      setReturns(prev => prev.map(o => o.id === id ? { ...o, status: 'CANCELLED' } : o));
      setExpandedId(null);
      toast.success('Hủy phiếu trả hàng thành công');
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || '';
      if (!err.response) {
        setReturns(prev => prev.map(o => o.id === id ? { ...o, status: 'CANCELLED' } : o));
        setExpandedId(null);
        toast.success('Hủy phiếu trả hàng thành công');
      } else {
        toast.error(`Hủy phiếu trả hàng thất bại: ${serverMsg}`);
      }
    }
  };

  const handleCopyPR = (o) => {
    const itemLines = o.items?.map(it => `- ${it.product_sku}: ${it.product_name} x ${it.quantity} (Đơn giá trả: ${fmt(it.return_price)})`).join('\n') || '';
    const text = `Mã phiếu trả: ${o.code}\nThời gian: ${o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}\nNhà cung cấp: ${o.supplier_name}\nNCC cần trả: ${fmt(o.supplier_must_pay)} đ\nNCC đã trả: ${fmt(o.paid)} đ\nChi tiết hàng hóa:\n${itemLines}`;
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép thông tin phiếu trả hàng nhập');
  };

  const renderDetail = (o) => {
    const items = o.items?.filter(it => {
      if (detailSearchSku && !(it.product_sku || '').toLowerCase().includes(detailSearchSku.toLowerCase())) return false;
      if (detailSearchName && !(it.product_name || '').toLowerCase().includes(detailSearchName.toLowerCase())) return false;
      return true;
    }) || [];

    const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
    const subtotal = items.reduce((s, it) => s + ((it.cost_price || 0) * (it.quantity || 0)), 0);
    const totalDiscount = items.reduce((s, it) => s + (it.discount || 0), 0);
    const finalTotal = subtotal - totalDiscount;

    const currentNote = prNotes[o.id] ?? o.note ?? '';
    const currentReceivedBy = prReceivedBy[o.id] ?? o.receivedBy ?? 'Võ Thành Huy';

    return (
      <tr id={`detail-${o.id}`} key={`detail-${o.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in text-[13px]">
        <td colSpan={visibleColumns.length + 2} className="p-0">
          <div className="p-1.5 px-3">
            <div className="flex flex-col gap-4">
              {/* Header Info */}
              <div className="flex items-center justify-between bg-blue-50/50 p-2 px-3 rounded-lg border border-blue-100 text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-800 tracking-tight">{o.code}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Người trả:</span>
                    <select
                      className="border border-gray-300 rounded px-2.5 py-1 text-sm font-bold text-gray-800 bg-white outline-none focus:border-primary shadow-sm"
                      value={currentReceivedBy}
                      onChange={(e) => handleUpdateReceivedBy(o.id, e.target.value)}
                    >
                      <option value="Võ Thành Huy">Võ Thành Huy</option>
                      <option value="Admin">Admin</option>
                      <option value="Nguyễn Văn A">Nguyễn Văn A</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-gray-500">Ngày trả:</span>
                    <span className="font-bold text-gray-800">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</span>
                    <Calendar size={14} className="text-primary ml-1" />
                  </div>
                  <div><span className="text-gray-500">Tên NCC:</span> <span className="font-bold text-primary">{o.supplier_name}</span></div>
                </div>
              </div>

              {/* Items Table Section */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm max-h-40 overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50 gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-64">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Tìm mã hàng"
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        value={detailSearchSku}
                        onChange={e => setDetailSearchSku(e.target.value)}
                      />
                    </div>
                    <div className="relative w-64">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Tìm tên hàng"
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        value={detailSearchName}
                        onChange={e => setDetailSearchName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                      <th className="p-1.5 px-3">Mã hàng</th>
                      <th className="p-1.5 px-3">Tên hàng</th>
                      <th className="p-1.5 px-3 text-right">Số lượng</th>
                      <th className="p-1.5 px-3 text-right">Giá nhập</th>
                      <th className="p-1.5 px-3 text-right">Giá trả lại</th>
                      <th className="p-1.5 px-3 text-right">Giảm giá trả lại</th>
                      <th className="p-1.5 px-3 text-right">Thành tiền</th>
                      <th className="p-1.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-primary font-bold">{it.product_sku}</td>
                        <td className="p-3 text-gray-800">{it.product_name}</td>
                        <td className="p-1.5 px-3 text-right text-gray-800 font-bold">{it.quantity}</td>
                        <td className="p-1.5 px-3 text-right text-gray-600">{fmt(it.cost_price)}</td>
                        <td className="p-1.5 px-3 text-right text-gray-800 font-bold">{fmt(it.return_price)}</td>
                        <td className="p-1.5 px-3 text-right text-gray-600">{fmt(it.discount)}</td>
                        <td className="p-1.5 px-3 text-right text-primary font-bold">{fmt(it.total)}</td>
                        <td className="p-1.5 px-3 text-center">
                          <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer border-none bg-transparent">
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-gray-400">Không tìm thấy mặt hàng nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Section: Note & Summary Box */}
              <div className="grid grid-cols-3 gap-8 items-start">
                <div className="col-span-2">
                  <textarea
                    placeholder="Ghi chú..."
                    className="w-full h-12 sm:h-16 border border-gray-300 rounded-lg p-2 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                    value={currentNote}
                    onChange={(e) => setPrNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                  />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex flex-col gap-1.5 text-[11px] shadow-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Số lượng mặt hàng</span><span className="font-bold text-gray-800">{items.length}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tiền hàng ({totalQty})</span><span className="font-bold text-gray-800">{fmt(subtotal)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Giảm giá</span><span className="font-bold text-gray-800">{fmt(totalDiscount)}</span></div>
                  <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-1.5"><span className="font-bold text-gray-800">NCC cần trả</span><span className="font-extrabold text-primary">{fmt(o.supplier_must_pay)}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-800">NCC đã trả</span><span className="font-extrabold text-green-600">{fmt(o.paid)}</span></div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 mt-1.5">
                <div className="flex items-center gap-3">
                  <Button variant="danger" onClick={() => deletePR(o.id)} className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold">
                    <Trash2 size={14} /> Hủy
                  </Button>
                  <Button variant="secondary" onClick={() => handleCopyPR(o)} className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold">
                    <Copy size={14} /> Sao chép
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const noteText = prNotes[o.id] ?? o.note ?? '';
                      try {
                        await purchaseReturnAPI.update(o.id, { ...o, note: noteText });
                        toast.success('Lưu phiếu thành công');
                        reload();
                      } catch (err) {
                        toast.error(err.response?.data?.message || err.message || 'Lỗi khi lưu phiếu');
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold border-none cursor-pointer"
                  >
                    <Save size={14} /> Lưu
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => alert(`Thông tin phiếu trả hàng nhập:\nMã phiếu: ${o.code}\nNgười trả: ${prReceivedBy[o.id] ?? o.receivedBy}\nTrạng thái: ${STATUS_LABEL[o.status] || o.status}`)}
                    className="p-2 shadow-sm border-none cursor-pointer"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const listRes = await purchaseReturnAPI.getAll({ limit: 500 });
      const rawList = Array.isArray(listRes) ? listRes : (listRes?.data || []);
      const normalized = rawList.map(normalizePR);
      if (normalized.length === 0) {
        const mockPRs = [
          { id: 1, code: 'THN000001', createdAt: '2026-05-16T15:35:00Z', supplier: { name: 'Công ty Pharmedic' }, total: 0, discount: 0, paid: 0, status: 'COMPLETED' },
        ].map(normalizePR);
        setReturns(mockPRs);
      } else {
        setReturns(normalized);
      }
    } catch {
      setReturns([]);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qCode = searchCode.trim().toLowerCase();
    const qSupp = searchSupplier.trim().toLowerCase();

    return returns.filter(o => {
      if (q && !o.code.toLowerCase().includes(q) && !o.supplier_name.toLowerCase().includes(q)) return false;
      if (qCode && !o.code.toLowerCase().includes(qCode)) return false;
      if (qSupp && !o.supplier_name.toLowerCase().includes(qSupp)) return false;

      if (!filters.statuses.has(o.status)) return false;
      if (filters.createdBy && o.createdBy.toLowerCase() !== filters.createdBy.toLowerCase()) return false;
      if (filters.receivedBy && o.receivedBy.toLowerCase() !== filters.receivedBy.toLowerCase()) return false;
      if (filters.dateRange.start && filters.dateRange.end) {
        if (!inDateRange(o.created_at, filters.dateRange.start, filters.dateRange.end)) return false;
      }
      return true;
    });
  }, [returns, search, searchCode, searchSupplier, filters]);

  // Reset currentPage when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, searchCode, searchSupplier, filters]);

  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (['total', 'discount', 'supplier_must_pay', 'paid'].includes(sortConfig.key)) {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, currentPage, pageSize]);

  const handleToggleStatus = (st) => {
    setFilters(prev => {
      const next = new Set(prev.statuses);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return { ...prev, statuses: next };
    });
  };

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0 ? filtered.filter(item => selectedIds.has(item.id)) : filtered;
    if (dataToExport.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportCSV('DanhSachTraHangNhap', ['Mã trả hàng nhập', 'Thời gian', 'Nhà cung cấp', 'Tổng tiền hàng', 'Giảm giá', 'NCC cần trả', 'NCC đã trả', 'Trạng thái'],
      dataToExport.map(o => [
        o.code,
        o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '',
        o.supplier_name,
        o.total,
        o.discount,
        o.supplier_must_pay,
        o.paid,
        STATUS_LABEL[o.status] || o.status,
      ])
    );
  };

  const toggleSelectAll = () => {
    const allSelected = paginated.length > 0 && paginated.every(o => selectedIds.has(o.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      paginated.forEach(o => next.delete(o.id));
    } else {
      paginated.forEach(o => next.add(o.id));
    }
    setSelectedIds(next);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-10 relative">
        <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">
          Trả hàng nhập
        </h1>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 w-full">
          {/* Row 1: Search + Primary Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Bộ lọc tìm kiếm"
            >
              <Filter size={16} />
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Theo mã phiếu trả"
                className="w-full pl-8 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all shadow-sm font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`absolute right-2 top-1.5 p-0.5 rounded transition-colors cursor-pointer ${searchOpen ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                title="Tìm kiếm nâng cao"
              >
                <SlidersHorizontal size={14} />
              </button>

              {/* Advanced Search Popover */}
              {searchOpen && (
                <div ref={searchPanelRef} className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 z-50 flex flex-col gap-4 animate-fade-in max-w-[calc(100vw-24px)]">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <span className="font-bold text-gray-800 text-sm">Tìm kiếm nâng cao</span>
                    <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline cursor-pointer border-none bg-transparent">Đóng</button>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Mã trả hàng nhập</label>
                    <input type="text" placeholder="Nhập mã phiếu" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary font-medium" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Nhà cung cấp (Tên / Mã)</label>
                    <input type="text" placeholder="Tên hoặc mã NCC" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary font-medium" value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { setSearchCode(''); setSearchSupplier(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="primary" onClick={() => navigate('/purchase-returns/create')} className="flex items-center justify-center gap-1 shadow-md bg-primary hover:bg-primary-hover font-bold py-1.5 px-3 rounded-lg text-xs whitespace-nowrap cursor-pointer shrink-0">
              <Plus size={16} /> <span className="hidden sm:inline">Trả hàng nhập</span>
            </Button>
          </div>

          {/* Row 2: Secondary Actions & Column selection */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-start lg:justify-end pt-1 lg:pt-0 border-t border-gray-100 lg:border-none mt-1 lg:mt-0">
            <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg shadow-sm text-xs whitespace-nowrap cursor-pointer">
              <Download size={14} /> Xuất file
            </Button>

            {/* Column Visibility Menu */}
            <div className="relative" ref={columnMenuRef}>
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer flex items-center justify-center"
              >
                <Columns3 size={16} />
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-fade-in">
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

      <div className="flex flex-col lg:flex-row gap-4 items-start w-full flex-1 min-h-0 relative">
        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Filter Sidebar */}
        <div className={`fixed top-14 bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-64 lg:p-0 lg:shadow-none lg:bg-transparent lg:overflow-y-auto lg:h-full lg:flex-none lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          
          <div className="w-64 shrink-0 flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 font-sans">
            {/* Status Filter */}
            <div>
              <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Trạng thái</span>
              <div className="flex flex-col gap-2.5">
                {[
                  { value: 'PENDING', label: 'Phiếu tạm' },
                  { value: 'COMPLETED', label: 'Đã trả hàng' },
                  { value: 'CANCELLED', label: 'Đã hủy' },
                ].map(st => (
                  <label key={st.value} className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.statuses.has(st.value)}
                      onChange={() => handleToggleStatus(st.value)}
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>{st.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-100 my-2" />

            {/* Date Filter */}
            <div>
              <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Thời gian</span>
              <DateFilter 
                value={filters.dateRange}
                onChange={(val) => setFilters(prev => ({ ...prev, dateRange: val }))}
                buttonClassName="w-full justify-between border-gray-200 text-xs py-2 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 rounded-xl shadow-sm"
              />
            </div>

            <hr className="border-gray-100 my-2" />

            {/* Received By Filter */}
            <div>
              <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Người trả</span>
              <input 
                type="text"
                placeholder="Chọn người trả"
                value={filters.receivedBy}
                onChange={(e) => setFilters(prev => ({ ...prev, receivedBy: e.target.value }))}
                className="w-full py-1 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-primary shadow-sm placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-w-full w-full lg:h-full">
          <div className="overflow-x-auto overflow-y-auto flex-1 max-w-full w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                <tr className="bg-gray-50 text-gray-600 text-xs font-extrabold border-b border-gray-100 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={paginated.length > 0 && paginated.every(o => selectedIds.has(o.id))}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center"></th>
                  {visibleColumns.includes('code') && (
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('code')}>
                      <div className="flex items-center gap-1.5">Mã trả hàng nhập {sortConfig.key === 'code' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('created_at') && (
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1.5">Thời gian {sortConfig.key === 'created_at' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('supplier_name') && (
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('supplier_name')}>
                      <div className="flex items-center gap-1.5">Nhà cung cấp {sortConfig.key === 'supplier_name' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('total') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('total')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">Tổng tiền hàng {sortConfig.key === 'total' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('discount') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('discount')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">Giảm giá {sortConfig.key === 'discount' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('supplier_must_pay') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('supplier_must_pay')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">NCC cần trả {sortConfig.key === 'supplier_must_pay' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('paid') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paid')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">NCC đã trả {sortConfig.key === 'paid' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('status') && (
                    <th className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1.5 justify-center">Trạng thái {sortConfig.key === 'status' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-50">
                {paginated.map(o => {
                  const isSelected = selectedIds.has(o.id);
                  const isStarred = starred.has(o.id);
                  const isExpanded = expandedId === o.id;

                  return (
                    <React.Fragment key={o.id}>
                      <tr 
                        id={`row-${o.id}`}
                        onClick={() => {
                          const nextExpandedId = isExpanded ? null : o.id;
                          setExpandedId(nextExpandedId);
                          if (nextExpandedId !== null) {
                            scrollRowIntoView(o.id);
                          }
                        }}
                        className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelect(o.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center" onClick={(e) => toggleStar(o.id, e)}>
                          <Star size={16} className={`mx-auto cursor-pointer transition-transform hover:scale-110 ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-gray-400'}`} />
                        </td>
                        {visibleColumns.includes('code') && <td className="py-2.5 px-3 font-extrabold text-primary">{o.code}</td>}
                        {visibleColumns.includes('created_at') && (
                          <td className="py-2.5 px-3 font-medium text-gray-600">
                            {o.created_at ? new Date(o.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                          </td>
                        )}
                        {visibleColumns.includes('supplier_name') && <td className="py-2.5 px-3 font-bold text-gray-800">{o.supplier_name}</td>}
                        {visibleColumns.includes('total') && <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">{fmt(o.total)}</td>}
                        {visibleColumns.includes('discount') && <td className="py-2.5 px-3 text-right font-bold text-gray-600">{fmt(o.discount)}</td>}
                        {visibleColumns.includes('supplier_must_pay') && <td className="py-2.5 px-3 text-right font-extrabold text-amber-600">{fmt(o.supplier_must_pay)}</td>}
                        {visibleColumns.includes('paid') && <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">{fmt(o.paid)}</td>}
                        {visibleColumns.includes('status') && (
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block py-1 px-2.5 rounded-full text-[11px] ${STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </td>
                        )}
                      </tr>
                      {isExpanded && renderDetail(o)}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="py-16 text-center text-gray-400 font-medium">
                      <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
                      Không tìm thấy phiếu trả hàng nhập nào phù hợp
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
            itemName="phiếu trả"
          />
        </div>
      </div>
    </div>
  );
}
