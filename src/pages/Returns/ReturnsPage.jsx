import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { returnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, ClipboardList, Star, Filter, Columns3, Trash2, Copy, Save, MoreHorizontal, Calendar, X, SlidersHorizontal, Eye, Printer
} from 'lucide-react';
// Dynamic imports will be used for exportCSV to speed up route loading
import { copyToClipboard } from '../../utils/exportUtils';
import Pagination from '../../components/common/Pagination';
import { inDateRange, getRangeByCreatedLabel, buildCustomRange } from '../../utils/dateFilterUtils';

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
const STATUS_LABEL = { COMPLETED: 'Đã trả', PENDING: 'Phiếu tạm', CANCELLED: 'Đã hủy' };

const ALL_COLUMNS = [
  { key: 'code', label: 'Mã trả hàng', default: true },
  { key: 'created_at', label: 'Thời gian', default: true },
  { key: 'customer_code', label: 'Mã KH', default: true },
  { key: 'customer_name', label: 'Khách hàng', default: true },
  { key: 'total', label: 'Tổng tiền hàng', default: true, align: 'right' },
  { key: 'must_pay_customer', label: 'Cần trả khách', default: true, align: 'right' },
  { key: 'paid_customer', label: 'Đã trả khách', default: true, align: 'right' },
  { key: 'status', label: 'Trạng thái', default: true, align: 'center' },
];

const normalizeReturn = (o) => {
  const total = Number(o.total || 0);
  return {
    ...o,
    id: o.id,
    code: o.code || '',
    user_name: o.order?.user?.fullName || o.createdBy || 'Admin',
    created_at: o.createdAt || o.created_at || null,
    customer_code: o.customer?.code || o.customer_code || (o.customer?.id ? `KH${String(o.customer.id).padStart(6, '0')}` : '---'),
    customer_name: o.customer?.name || o.customer_name || 'Khách lẻ',
    total,
    must_pay_customer: total,
    paid_customer: o.status === 'COMPLETED' ? total : 0,
    status: o.status || 'COMPLETED',
    items: Array.isArray(o.items) && o.items.length > 0 ? o.items.map(it => ({
      ...it,
      id: it.id,
      product_sku: it.product?.sku || it.sku || '',
      product_name: it.product?.name || it.name || '',
      unit: it.unit || it.product?.unit || 'Cái',
      quantity: Number(it.quantity || 0),
      price: Number(it.price || 0),
      total: Number(it.total || (it.quantity * it.price))
    })) : [],
  };
};

export default function ReturnsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [starred, setStarred] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const expandedIdRef = useRef(null);
  expandedIdRef.current = expandedId;

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [filters, setFilters] = useState({
    statuses: new Set(['COMPLETED']),
    dateRange: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
    createdBy: '',
    receivedBy: '',
  });

  const [detailSearchSku, setDetailSearchSku] = useState('');
  const [detailSearchName, setDetailSearchName] = useState('');
  const [returnNotes, setReturnNotes] = useState({});

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await returnAPI.getAll({ limit: 500 });
      const rawList = Array.isArray(r) ? r : (r.data || []);
      setReturns(prev => {
        const nextList = rawList.map(normalizeReturn);
        return nextList.map(item => {
          const prevItem = prev.find(p => p.id === item.id);
          if (prevItem && prevItem.items && prevItem.items.length > 0) {
            const prevTime = prevItem.updatedAt ? new Date(prevItem.updatedAt).getTime() : 0;
            const currTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
            if (prevTime !== currTime) {
              if (expandedIdRef.current === item.id) {
                setTimeout(() => loadDetail(item.id), 50);
              }
              return item;
            }
            return { ...item, items: prevItem.items };
          }
          return item;
        });
      });
    } catch {
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const codeFromState = location.state?.openReturnCode;
    const params = new URLSearchParams(location.search);
    const codeFromQuery = params.get('returnCode');
    const code = codeFromState || codeFromQuery;
    
    if (!code || returns.length === 0) return;

    const matchedReturn = returns.find(r => String(r.code).toLowerCase() === String(code).toLowerCase());
    if (matchedReturn) {
      setFilters(prev => ({
        ...prev,
        dateRange: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
        statuses: new Set(['COMPLETED', 'CANCELLED'])
      }));
      setSearch(code);
      setExpandedId(matchedReturn.id);
      loadDetail(matchedReturn.id);
      scrollRowIntoView(matchedReturn.id);
      
      if (codeFromState) {
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [location.state?.openReturnCode, location.search, returns, navigate, location.pathname]);

  const loadDetail = async (id) => {
    try {
      const r = await returnAPI.getById(id);
      if (r) {
        setReturns(prev => prev.map(o => o.id === id ? normalizeReturn({ ...o, ...r }) : o));
      }
    } catch (err) {
      console.error("Lỗi khi tải chi tiết phiếu trả hàng:", err);
    }
  };

  const handleSaveNote = async (id) => {
    const note = returnNotes[id] ?? '';
    try {
      await returnAPI.update(id, { reason: note });
      toast.success('Lưu ghi chú thành công');
      reload();
    } catch (err) {
      toast.error('Lỗi khi lưu ghi chú');
    }
  };

  const handleCancelReturn = async (id, code) => {
    if (!confirm(`Hủy phiếu trả hàng ${code}?`)) return;
    try {
      await returnAPI.cancel(id);
      toast.success('Hủy phiếu trả hàng thành công');
      reload();
      setExpandedId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi hủy phiếu trả hàng');
    }
  };

  const handleCopyCode = async (code) => {
    await copyToClipboard(code);
    toast.success(`Đã sao chép mã phiếu: ${code}`);
  };

  const handleCloneReturn = (o) => {
    navigate('/returns/new', { state: { cloneFrom: o } });
    toast.success('Đang tạo phiếu trả hàng mới từ dữ liệu sao chép');
  };

  const handlePrintReturn = (o) => {
    const f = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '';
    const customerName = o.customer_name || 'Khách lẻ';
    const items = o.items || [];
    
    const returnHTML = `
        <style>
          .inv-wrap { width: 70mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; line-height: 1.4; padding: 10px 2mm 0 2mm; box-sizing: border-box; }
          .inv-logo-container { text-align: center; margin-bottom: 5px; }
          .inv-logo-img { width: 220px; max-width: 100%; object-fit: contain; }
          .inv-info { text-align: center; font-size: 11px; margin: 2px 0; }
          .inv-title { text-align: center; font-size: 14px; font-weight: bold; margin: 15px 0 2px; }
          .inv-code-date { text-align: center; font-size: 10px; margin-bottom: 10px; color: #333; }
          .inv-customer-info { font-size: 11px; margin-bottom: 8px; line-height: 1.5; }
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
          .inv-table th, .inv-table td { border: 1px solid #000 !important; padding: 4px 2px; }
          .inv-table th { font-weight: bold; text-align: center; }
          .inv-summary { width: 100%; font-size: 11px; margin-bottom: 15px; border-collapse: collapse; }
          .inv-summary td { padding: 3px 0; border: none !important; }
          .inv-summary .label { text-align: right; padding-right: 15px; }
          .inv-summary .value { text-align: right; width: 70px; }
          .inv-footer { font-size: 11px; line-height: 1.5; font-weight: bold; margin-bottom: 15px; }
          .inv-thanks { text-align: center; font-size: 11px; font-style: italic; margin-top: 20px; }
          @media print {
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
            .inv-wrap { padding: 5mm 4mm 0 4mm; width: 70mm; margin: 0 auto; }
          }
        </style>
        <div class="inv-wrap">
          <div class="inv-logo-container">
            <img src="${window.location.origin}/logovuong.png" class="inv-logo-img" alt="TIKOVIA" />
          </div>
          <div class="inv-info" style="margin-top: 10px;">ĐC: 82 Trần Tử Bình, Hòa Châu, Hòa Vang, ĐN</div>
          <div class="inv-info">Điện Thoại: 0796.637.194</div>
          <div class="inv-title">PHIẾU TRẢ HÀNG</div>
          <div class="inv-code-date">${o.code} - ${dateStr}</div>

          <div class="inv-customer-info">
            <div>Khách hàng: ${customerName}</div>
            <div>SĐT: ${o.customer?.phone || ''}</div>
          </div>

          <table class="inv-table">
            <thead>
              <tr>
                <th style="text-align: left;">Mặt hàng</th>
                <th style="width: 25px;">SL</th>
                <th style="text-align: right;">Đơn giá</th>
                <th style="text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => `
                <tr>
                  <td>${it.product_name || ''} ${it.unit ? `(${it.unit})` : ''}</td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">${f(it.price || 0)}</td>
                  <td style="text-align: right;">${f(it.total || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="inv-summary">
            <tr>
              <td class="label">Tổng tiền hàng trả:</td>
              <td class="value">${f(o.total)}</td>
            </tr>
            <tr>
              <td class="label">Phí trả hàng:</td>
              <td class="value">${f(o.discount || 0)}</td>
            </tr>
            <tr>
              <td class="label">Tiền trả khách:</td>
              <td class="value">${f(o.paid || 0)}</td>
            </tr>
          </table>

          <div class="inv-footer">
            <div style="margin-top: 5px;">Ghi chú: ${o.reason || o.note || ''}</div>
          </div>
        </div>
      `;
    
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`<html><head><title>In phiếu trả hàng</title></head><body onload="window.print();window.close();">${returnHTML}</body></html>`);
      printWin.document.close();
    }
  };

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

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
    const qCust = searchCustomer.trim().toLowerCase();

    return returns.filter(o => {
      if (q && !o.code.toLowerCase().includes(q) && !o.customer_name.toLowerCase().includes(q)) return false;
      if (qCode && !o.code.toLowerCase().includes(qCode)) return false;
      if (qCust && !o.customer_name.toLowerCase().includes(qCust)) return false;

      if (!filters.statuses.has(o.status)) return false;
      if (filters.createdBy && o.user_name.toLowerCase() !== filters.createdBy.toLowerCase()) return false;
      if (filters.dateRange && filters.dateRange.mode === 'all' && filters.dateRange.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filters.dateRange.label);
        if (range && !inDateRange(o.created_at, range)) return false;
      } else if (filters.dateRange && filters.dateRange.mode === 'custom' && filters.dateRange.start) {
        const range = buildCustomRange(filters.dateRange.start, filters.dateRange.end);
        if (range && !inDateRange(o.created_at, range)) return false;
      }
      return true;
    });
  }, [returns, search, searchCode, searchCustomer, filters]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, searchCode, searchCustomer, filters]);

  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'created_at') {
        const timeA = new Date(valA || 0).getTime();
        const timeB = new Date(valB || 0).getTime();
        if (timeA < timeB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (timeA > timeB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      if (['total', 'must_pay_customer', 'paid_customer'].includes(sortConfig.key)) {
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

  const handleExport = async () => {
    const dataToExport = selectedIds.size > 0 ? filtered.filter(item => selectedIds.has(item.id)) : filtered;
    if (dataToExport.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    const { exportCSV } = await import('../../utils/exportCSV');
    exportCSV('tra_hang', ['Mã trả hàng', 'Thời gian', 'Mã KH', 'Khách hàng', 'Tổng tiền hàng', 'Cần trả khách', 'Đã trả khách', 'Trạng thái'],
      dataToExport.map(o => [
        o.code,
        o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '',
        o.customer_code || '---',
        o.customer_name || 'Khách lẻ',
        o.total || 0,
        o.must_pay_customer || 0,
        o.paid_customer || 0,
        STATUS_LABEL[o.status] || o.status
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

  const renderDetail = (o) => {
    const items = o.items?.filter(it => {
      if (detailSearchSku && !(it.product_sku || '').toLowerCase().includes(detailSearchSku.toLowerCase())) return false;
      if (detailSearchName && !(it.product_name || '').toLowerCase().includes(detailSearchName.toLowerCase())) return false;
      return true;
    }) || [];

    const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
    const subtotal = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
    const currentNote = returnNotes[o.id] ?? o.reason ?? o.note ?? '';

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
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-gray-500">Ngày trả:</span>
                    <span className="font-bold text-gray-800">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</span>
                    <Calendar size={14} className="text-primary ml-1" />
                  </div>
                  <div>
                    <span className="text-gray-500">Khách hàng:</span>{' '}
                    <span 
                      onClick={() => {
                        if (o.customer_name && o.customer_name !== 'Khách lẻ') {
                          navigate('/customers', { state: { searchCustomer: o.customer_code || o.customer_name, customerId: o.customerId || o.customer_id } });
                        }
                      }}
                      className={`font-bold ${o.customer_name && o.customer_name !== 'Khách lẻ' ? 'text-primary hover:underline cursor-pointer' : 'text-gray-800'}`}
                    >
                      {o.customer_name}
                    </span>
                  </div>
                  {o.order && (
                    <div>
                      <span className="text-gray-500">Hóa đơn liên kết:</span>{' '}
                      <span 
                        onClick={() => navigate(`/orders?orderCode=${o.order.order_code || o.order.code}`)}
                        className="font-bold text-primary hover:underline cursor-pointer"
                      >
                        {o.order.order_code || o.order.code}
                      </span>
                    </div>
                  )}
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
                      <th className="p-1.5 px-3 text-right">Đơn giá</th>
                      <th className="p-1.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-primary font-bold hover:underline cursor-pointer">
                          <a href={`/products?editSku=${it.product_sku}`} target="_blank" rel="noopener noreferrer">
                            {it.product_sku}
                          </a>
                        </td>
                        <td className="p-3 text-gray-800">{it.product_name} {it.unit ? `(${it.unit})` : ''}</td>
                        <td className="p-1.5 px-3 text-right text-gray-800 font-bold">{it.quantity}</td>
                        <td className="p-1.5 px-3 text-right text-gray-600">{fmt(it.price)}</td>
                        <td className="p-1.5 px-3 text-right text-primary font-bold">{fmt(it.total)}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-400">Không có mặt hàng nào</td></tr>
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
                    onChange={(e) => setReturnNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                  />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex flex-col gap-1.5 text-[11px] shadow-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Số lượng mặt hàng</span><span className="font-bold text-gray-800">{items.length}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tiền hàng ({totalQty})</span><span className="font-bold text-gray-800">{fmt(subtotal)}</span></div>
                  <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-1.5"><span className="font-bold text-gray-800">Khách cần trả</span><span className="font-extrabold text-primary">{fmt(o.must_pay_customer)}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-800">Khách đã trả</span><span className="font-extrabold text-green-600">{fmt(o.paid_customer)}</span></div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 mt-1.5">
                <div className="flex items-center gap-2">
                  {o.status !== 'CANCELLED' && (
                    <Button 
                      variant="danger" 
                      onClick={() => handleCancelReturn(o.id, o.code)} 
                      className="flex items-center gap-1.5 text-xs py-1 px-3 shadow-sm font-bold whitespace-nowrap"
                    >
                      <Trash2 size={14} /> Hủy phiếu
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    onClick={() => handleCloneReturn(o)} 
                    className="flex items-center gap-1.5 text-xs py-1 px-3 shadow-sm font-bold whitespace-nowrap"
                  >
                    <Copy size={14} /> Sao chép
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => handleSaveNote(o.id)} 
                    className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold whitespace-nowrap"
                  >
                    <Save size={14} /> Lưu
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => handlePrintReturn(o)} 
                    className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold whitespace-nowrap"
                  >
                    <Printer size={14} /> In
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const sumTotal = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const sumMustPay = filtered.reduce((s, o) => s + Number(o.must_pay_customer || 0), 0);
  const sumPaid = filtered.reduce((s, o) => s + Number(o.paid_customer || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-10 relative">
        <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">
          Trả hàng
        </h1>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer flex items-center justify-center shrink-0"
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
              >
                <SlidersHorizontal size={14} />
              </button>

              {searchOpen && (
                <div ref={searchPanelRef} className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 z-50 flex flex-col gap-4 animate-fade-in max-w-[calc(100vw-24px)]">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <span className="font-bold text-gray-800 text-sm">Tìm kiếm nâng cao</span>
                    <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline cursor-pointer border-none bg-transparent">Đóng</button>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Mã trả hàng</label>
                    <input type="text" placeholder="Nhập mã phiếu" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary font-medium" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Khách hàng (Tên)</label>
                    <input type="text" placeholder="Tên khách hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary font-medium" value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { setSearchCode(''); setSearchCustomer(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                  </div>
                </div>
              )}
            </div>
            
            <Button variant="primary" onClick={() => navigate('/returns/new')} className="flex items-center justify-center gap-1 shadow-md bg-primary hover:bg-primary-hover font-bold py-1.5 px-3 rounded-lg text-xs whitespace-nowrap cursor-pointer shrink-0">
              <Plus size={16} /> <span className="hidden sm:inline">Trả hàng</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-start lg:justify-end pt-1 lg:pt-0 border-t border-gray-100 lg:border-none mt-1 lg:mt-0">
            <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg shadow-sm text-xs whitespace-nowrap cursor-pointer">
              <Download size={14} /> Xuất file
            </Button>

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
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        <div className={`fixed top-14 bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-64 lg:p-0 lg:shadow-none lg:bg-transparent lg:overflow-y-auto lg:h-full lg:flex-none lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          
          <div className="w-64 shrink-0 flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 font-sans">
            <div>
              <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Trạng thái</span>
              <div className="flex flex-col gap-2.5">
                {[
                  { value: 'COMPLETED', label: 'Đã trả' },
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

            <div>
              <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Thời gian</span>
              <DateFilter 
                value={filters.dateRange}
                onChange={(val) => setFilters(prev => ({ ...prev, dateRange: val }))}
                buttonClassName="w-full justify-between border-gray-200 text-xs py-2 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 rounded-xl shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-w-full w-full lg:h-full">
          <div className="overflow-x-auto overflow-y-auto flex-1 max-w-full w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
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
                      <div className="flex items-center gap-1.5">Mã trả hàng {sortConfig.key === 'code' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('created_at') && (
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1.5">Thời gian {sortConfig.key === 'created_at' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('customer_code') && (
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('customer_code')}>
                      <div className="flex items-center gap-1.5">Mã KH {sortConfig.key === 'customer_code' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('customer_name') && (
                    <th className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('customer_name')}>
                      <div className="flex items-center gap-1.5">Khách hàng {sortConfig.key === 'customer_name' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('total') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('total')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">Tổng tiền hàng {sortConfig.key === 'total' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('must_pay_customer') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('must_pay_customer')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">Cần trả khách {sortConfig.key === 'must_pay_customer' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('paid_customer') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paid_customer')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">Đã trả khách {sortConfig.key === 'paid_customer' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
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
                {/* Summary row */}
                <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700 border-b border-gray-100">
                  <td colSpan={2}></td>
                  {visibleColumns.includes('code') && <td></td>}
                  {visibleColumns.includes('created_at') && <td></td>}
                  {visibleColumns.includes('customer_code') && <td></td>}
                  {visibleColumns.includes('customer_name') && <td></td>}
                  {visibleColumns.includes('total') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumTotal)}</td>}
                  {visibleColumns.includes('must_pay_customer') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumMustPay)}</td>}
                  {visibleColumns.includes('paid_customer') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumPaid)}</td>}
                  {visibleColumns.includes('status') && <td></td>}
                </tr>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`skeleton-${rowIndex}`} className="animate-pulse border-b border-gray-100">
                      <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                      <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                      {visibleColumns.includes('code') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                      {visibleColumns.includes('created_at') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>}
                      {visibleColumns.includes('customer_code') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                      {visibleColumns.includes('customer_name') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>}
                      {visibleColumns.includes('total') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                      {visibleColumns.includes('must_pay_customer') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                      {visibleColumns.includes('paid_customer') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                      {visibleColumns.includes('status') && <td className="py-2.5 px-3"><div className="h-5 bg-gray-200 rounded-full w-20 mx-auto" /></td>}
                    </tr>
                  ))
                ) : paginated.map(o => {
                  const isSelected = selectedIds.has(o.id);
                  const isStarred = starred.has(o.id);
                  const isExpanded = expandedId === o.id;

                  return (
                    <React.Fragment key={o.id}>
                      <tr 
                        id={`row-${o.id}`}
                        onClick={() => {
                          const nextId = isExpanded ? null : o.id;
                          setExpandedId(nextId);
                          if (nextId) {
                            loadDetail(nextId);
                            scrollRowIntoView(nextId);
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
                        {visibleColumns.includes('code') && <td className="py-2.5 px-3 font-bold text-primary">{o.code}</td>}
                        {visibleColumns.includes('created_at') && (
                          <td className="py-2.5 px-3 font-medium text-gray-600">
                            {o.created_at ? new Date(o.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                          </td>
                        )}
                        {visibleColumns.includes('customer_code') && (
                          <td 
                            className={`py-2.5 px-3 font-bold ${o.customer_name && o.customer_name !== 'Khách lẻ' ? 'text-primary hover:underline cursor-pointer' : 'text-gray-600'}`}
                            onClick={(e) => {
                              if (o.customer_name && o.customer_name !== 'Khách lẻ') {
                                e.stopPropagation();
                                navigate('/customers', { state: { searchCustomer: o.customer_code || o.customer_name, customerId: o.customerId || o.customer_id } });
                              }
                            }}
                          >
                            {o.customer_code}
                          </td>
                        )}
                        {visibleColumns.includes('customer_name') && (
                          <td 
                            className={`py-2.5 px-3 font-bold ${o.customer_name && o.customer_name !== 'Khách lẻ' ? 'text-primary hover:underline cursor-pointer' : 'text-gray-800'}`}
                            onClick={(e) => {
                              if (o.customer_name && o.customer_name !== 'Khách lẻ') {
                                e.stopPropagation();
                                navigate('/customers', { state: { searchCustomer: o.customer_code || o.customer_name, customerId: o.customerId || o.customer_id } });
                              }
                            }}
                          >
                            {o.customer_name}
                          </td>
                        )}
                        {visibleColumns.includes('total') && <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">{fmt(o.total)}</td>}
                        {visibleColumns.includes('must_pay_customer') && <td className="py-2.5 px-3 text-right font-extrabold text-amber-600">{fmt(o.must_pay_customer)}</td>}
                        {visibleColumns.includes('paid_customer') && <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">{fmt(o.paid_customer)}</td>}
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
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="py-16 text-center text-gray-400 font-medium">
                      <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
                      Không tìm thấy phiếu trả hàng nào phù hợp
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
