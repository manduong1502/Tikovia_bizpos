import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashbookAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { 
  Plus, Download, Search, ArrowUpRight, ArrowDownLeft, 
  FileText, Wallet, Filter, X, SlidersHorizontal, Info, 
  Star, Printer, Edit, Trash2, Calendar, MapPin, ExternalLink, User, ChevronDown
} from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import Pagination from '../../components/common/Pagination';
import CashbookModal from './CashbookModal';
import DateFilter from '../../components/ui/DateFilter';
import { getRangeByCreatedLabel, inDateRange } from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

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

export default function CashbookPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Advanced Sidebar Filters States
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // all, cash, bank, wallet
  const [timeFilter, setTimeFilter] = useState({ mode: 'all', label: 'Tháng này' });
  
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [statusPaid, setStatusPaid] = useState(true);
  const [statusCancelled, setStatusCancelled] = useState(false);
  
  const [accountingFilter, setAccountingFilter] = useState('all'); // all, yes, no
  
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('Tất cả');
  const [partnerNameQuery, setPartnerNameQuery] = useState('');
  const [partnerPhoneQuery, setPartnerPhoneQuery] = useState('');

  // Row selection & Details expander
  const [expandedId, setExpandedId] = useState(null);
  const [stars, setStars] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('thu');
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

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 500000 };
      if (search) params.search = search;
      
      const r = await cashbookAPI.getAll(params);
      const data = r.data || (Array.isArray(r) ? r : []);
      
      setEntries(Array.isArray(data) ? data : []);
    } catch { 
      setEntries([]); 
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => { 
    reload();
    const handleDataChanged = (e) => {
      if (!e.detail || e.detail.type === 'cashbook' || e.detail.type === 'order' || e.detail.type === 'purchase_order' || e.detail.type === 'general') {
        reload();
      }
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => window.removeEventListener('app:data-changed', handleDataChanged);
  }, [reload]);

  const openModal = (type) => { setModalType(type); setModalOpen(true); };

  const handlePrintEntry = (e) => {
    const isInc = e.type === 'INCOME' || e.type === 'thu' || e.type === 'in';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Phiếu ${isInc ? 'thu' : 'chi'} - ${e.code}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .code { font-size: 14px; font-style: italic; color: #666; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .info-table td { padding: 8px 12px; border: 1px solid #e5e7eb; }
            .info-table td.label { font-weight: bold; background-color: #f9fafb; width: 35%; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; }
            .sig-box { text-align: center; width: 45%; }
            .sig-title { font-weight: bold; margin-bottom: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PHIẾU ${isInc ? 'THU' : 'CHI'}</div>
            <div class="code">Số: ${e.code}</div>
            <div style="font-size: 12px;">Ngày: ${formatDateTime(e.createdAt)}</div>
          </div>
          <table class="info-table">
            <tr><td class="label">Người ${isInc ? 'nộp tiền' : 'nhận tiền'}</td><td>${e.partnerName || '---'}</td></tr>
            <tr><td class="label">Số điện thoại</td><td>${e.partnerPhone || '---'}</td></tr>
            <tr><td class="label">Địa chỉ</td><td>${e.partnerAddress || '---'}</td></tr>
            <tr><td class="label">Loại thu chi</td><td>${e.category || '---'}</td></tr>
            <tr><td class="label">Số tiền</td><td><strong>${fmt(e.amount)} VNĐ</strong></td></tr>
            <tr><td class="label">Ghi chú</td><td>${e.note || '---'}</td></tr>
            <tr><td class="label">Chi nhánh</td><td>${e.branch || 'Chi nhánh trung tâm'}</td></tr>
          </table>
          <div class="footer-sig">
            <div class="sig-box">
              <div class="sig-title">Người ${isInc ? 'nộp' : 'nhận'} tiền</div>
              <div>(Ký, ghi rõ họ tên)</div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Thủ quỹ</div>
              <div>(Ký, ghi rõ họ tên)</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCancelEntry = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy phiếu này không?')) return;
    const tid = toast.loading('Đang hủy phiếu quỹ...');
    try {
      await cashbookAPI.cancel(id);
      toast.success('Hủy phiếu thành công', { id: tid });
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi hủy phiếu quỹ', { id: tid });
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelled' } : e));
    }
  };

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStars(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Advanced Filtering Logic
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const isInc = e.type === 'INCOME' || e.type === 'thu' || e.type === 'in';
      const isExp = e.type === 'EXPENSE' || e.type === 'chi' || e.type === 'out';
      const isCancelled = e.status === 'cancelled';
      const isPaid = !isCancelled;

      // 1. Payment Method
      if (paymentMethodFilter === 'cash' && e.paymentMethod !== 'cash' && e.paymentMethod !== 'cashbook') return false;
      if (paymentMethodFilter === 'bank' && e.paymentMethod !== 'bank') return false;
      if (paymentMethodFilter === 'wallet' && e.paymentMethod !== 'wallet') return false;

      // 2. Time Filter using DateFilter & inDateRange
      let range = null;
      if (timeFilter?.mode === 'custom' && (timeFilter?.start || timeFilter?.end)) {
        range = { start: timeFilter.start, end: timeFilter.end };
      } else if (timeFilter?.label && timeFilter?.label !== 'Toàn thời gian') {
        range = getRangeByCreatedLabel(timeFilter.label);
      }
      if (range && !inDateRange(e.createdAt || e.created_at || e.date, range)) {
        return false;
      }

      // 3. Document type (Phiếu thu / Phiếu chi)
      if (!showIncome && isInc) return false;
      if (!showExpense && isExp) return false;

      // 4. Category filter
      if (categoryFilter && !(e.category || '').toLowerCase().includes(categoryFilter.toLowerCase())) {
        return false;
      }

      // 5. Status
      if (!statusPaid && isPaid) return false;
      if (!statusCancelled && isCancelled) return false;

      // 6. Accounting filter
      if (accountingFilter === 'yes' && e.isAccounting === false) return false;
      if (accountingFilter === 'no' && e.isAccounting === true) return false;

      // 7. Partner filters
      if (partnerTypeFilter !== 'Tất cả') {
        const pType = (e.partnerType || '').toLowerCase();
        if (partnerTypeFilter === 'Khách hàng' && pType !== 'customer') return false;
        if (partnerTypeFilter === 'Nhà cung cấp' && pType !== 'supplier') return false;
        if (partnerTypeFilter === 'Nhân viên' && pType !== 'staff') return false;
        if (partnerTypeFilter === 'Đối tác giao hàng' && pType !== 'delivery') return false;
        if (partnerTypeFilter === 'Khác' && pType !== 'other' && pType !== '') return false;
      }

      if (partnerNameQuery) {
        const q = partnerNameQuery.toLowerCase();
        const pName = (e.partnerName || '').toLowerCase();
        const pCode = (e.partnerCode || '').toLowerCase();
        if (!pName.includes(q) && !pCode.includes(q)) return false;
      }

      if (partnerPhoneQuery) {
        const q = partnerPhoneQuery.toLowerCase();
        const pPhone = (e.partnerPhone || '').toLowerCase();
        if (!pPhone.includes(q)) return false;
      }

      // Global search
      if (search) {
        const q = search.toLowerCase();
        const code = (e.code || '').toLowerCase();
        const name = (e.partnerName || '').toLowerCase();
        const note = (e.note || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !note.includes(q)) return false;
      }

      return true;
    });
  }, [
    entries, paymentMethodFilter, timeFilter, showIncome, showExpense,
    categoryFilter, statusPaid, statusCancelled, accountingFilter,
    partnerTypeFilter, partnerNameQuery, partnerPhoneQuery, search
  ]);

  // Sort
  const sortedEntries = useMemo(() => {
    if (!sortConfig.key) return filteredEntries;
    return [...filteredEntries].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'time' || sortConfig.key === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      } else if (sortConfig.key === 'amount') {
        aVal = Number(a.amount || 0);
        bVal = Number(b.amount || 0);
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEntries, sortConfig]);

  // Summary Metrics Calculation
  const { totalIn, totalOut } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    filteredEntries.forEach(e => {
      if (e.status === 'cancelled') return;
      const isInc = e.type === 'INCOME' || e.type === 'thu' || e.type === 'in';
      const amt = Number(e.amount || 0);
      if (isInc) inSum += amt;
      else outSum += amt;
    });
    return { totalIn: inSum, totalOut: outSum };
  }, [filteredEntries]);

  // Pagination
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  return (
    <div className="p-3 sm:p-4 max-w-[1600px] mx-auto space-y-3 font-sans text-gray-800">
      
      {/* Top Header & Actions Bar (Matching KiotViet Image 3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            {paymentMethodFilter === 'cash' ? 'Sổ quỹ tiền mặt' : paymentMethodFilter === 'bank' ? 'Sổ quỹ ngân hàng' : 'Sổ quỹ'}
          </h1>
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Theo mã phiếu..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-primary outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('thu')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white hover:bg-primary-dark font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none"
          >
            <Plus size={15} /> Phiếu thu
          </button>
          <button
            onClick={() => openModal('chi')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-primary border border-primary hover:bg-blue-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Plus size={15} /> Phiếu chi
          </button>
          <button
            onClick={() => exportCSV(filteredEntries, 'so_quy_tiem_mat')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Download size={14} /> Xuất file
          </button>
        </div>
      </div>

      {/* Summary Metric Cards Banner (Matching KiotViet Top Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Quỹ đầu kỳ</div>
          <div className="text-base sm:text-lg font-black text-gray-800 mt-0.5">34.303.020.927</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Tổng thu</div>
          <div className="text-base sm:text-lg font-black text-blue-600 mt-0.5">{fmt(totalIn)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Tổng chi</div>
          <div className="text-base sm:text-lg font-black text-red-500 mt-0.5">-{fmt(totalOut)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Tồn quỹ</div>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
            {fmt(34303020927 + totalIn - totalOut)}
          </div>
        </div>
      </div>

      {/* Main Content Layout: Sidebar + Table */}
      <div className="flex flex-col lg:flex-row gap-3 items-start w-full">
        
        {/* Left Sidebar Filters (Matching KiotViet Image 3) */}
        <div className={`w-full lg:w-64 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 shrink-0 space-y-4 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          
          {/* 1. Quỹ tiền */}
          <div>
            <span className="text-xs font-extrabold text-gray-900 mb-2 block uppercase tracking-wider">Quỹ tiền</span>
            <div className="flex flex-col gap-2">
              {[
                { key: 'cash', label: 'Tiền mặt' },
                { key: 'bank', label: 'Ngân hàng' },
                { key: 'wallet', label: 'Ví điện tử' },
                { key: 'all', label: 'Tổng quỹ' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-900">
                  <input 
                    type="radio" 
                    name="paymentMethodFilter" 
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                    checked={paymentMethodFilter === item.key} 
                    onChange={() => setPaymentMethodFilter(item.key)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 2. Thời gian */}
          <div>
            <span className="text-xs font-extrabold text-gray-900 mb-2 block uppercase tracking-wider">Thời gian</span>
            <DateFilter
              label="Thời gian tạo"
              type="created"
              value={timeFilter}
              onChange={val => setTimeFilter(val)}
            />
          </div>

          <hr className="border-gray-100" />

          {/* 3. Loại chứng từ */}
          <div>
            <span className="text-xs font-extrabold text-gray-900 mb-2 block uppercase tracking-wider">Loại chứng từ</span>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                  checked={showIncome} 
                  onChange={e => setShowIncome(e.target.checked)}
                />
                <span>Phiếu thu</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                  checked={showExpense} 
                  onChange={e => setShowExpense(e.target.checked)}
                />
                <span>Phiếu chi</span>
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 4. Loại thu chi */}
          <div>
            <span className="text-xs font-extrabold text-gray-900 mb-2 block uppercase tracking-wider">Loại thu chi</span>
            <input 
              type="text" 
              placeholder="Chọn loại thu chi..." 
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            />
          </div>

          <hr className="border-gray-100" />

          {/* 5. Trạng thái */}
          <div>
            <span className="text-xs font-extrabold text-gray-900 mb-2 block uppercase tracking-wider">Trạng thái</span>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                  checked={statusPaid} 
                  onChange={e => setStatusPaid(e.target.checked)}
                />
                <span>Đã thanh toán</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                  checked={statusCancelled} 
                  onChange={e => setStatusCancelled(e.target.checked)}
                />
                <span>Đã hủy</span>
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 6. Hạch toán kết quả KD */}
          <div>
            <span className="text-xs font-extrabold text-gray-900 mb-2 block uppercase tracking-wider">Hạch toán kết quả KD</span>
            <div className="grid grid-cols-3 bg-gray-50 border border-gray-200 rounded-xl p-0.5">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'yes', label: 'Có' },
                { key: 'no', label: 'Không' }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setAccountingFilter(item.key)}
                  className={`py-1 px-2 text-[11px] font-bold rounded-lg cursor-pointer transition-all border-none ${accountingFilter === item.key ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 7. Người nộp/nhận */}
          <div>
            <span className="text-xs font-extrabold text-gray-900 mb-2 block uppercase tracking-wider">Người nộp/nhận</span>
            <div className="flex flex-col gap-2">
              <select 
                className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white outline-none cursor-pointer"
                value={partnerTypeFilter}
                onChange={e => setPartnerTypeFilter(e.target.value)}
              >
                <option>Tất cả</option>
                <option>Khách hàng</option>
                <option>Nhà cung cấp</option>
                <option>Nhân viên</option>
                <option>Đối tác giao hàng</option>
                <option>Khác</option>
              </select>
              <input 
                type="text" 
                placeholder="Tên, mã người nộp/nhận" 
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-primary outline-none"
                value={partnerNameQuery}
                onChange={e => setPartnerNameQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Table Section */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden w-full min-h-[500px]">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] custom-scrollbar w-full">
            <table className="w-full text-xs border-collapse min-w-[750px]">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm text-[11px] text-gray-500 uppercase border-b border-gray-100 font-extrabold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      checked={paginated.length > 0 && paginated.every(item => selectedIds.has(item.id))}
                      onChange={(ev) => {
                        const next = new Set(selectedIds);
                        if (ev.target.checked) {
                          paginated.forEach(item => next.add(item.id));
                        } else {
                          paginated.forEach(item => next.delete(item.id));
                        }
                        setSelectedIds(next);
                      }}
                    />
                  </th>
                  <th className="py-2.5 px-3 w-8"></th>
                  <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('code')}>
                    Mã phiếu {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('time')}>
                    Thời gian {sortConfig.key === 'time' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('category')}>
                    Loại thu chi {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('partnerName')}>
                    Người nộp/nhận {sortConfig.key === 'partnerName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amount')}>
                    Giá trị {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                
                {/* Summary Row at Top of Table */}
                {!isLoading && (
                  <tr className="bg-gray-50/80 text-xs font-extrabold text-gray-800 border-b border-gray-100">
                    <td colSpan={2}></td>
                    <td className="py-2.5 px-3">Tổng cộng</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className={`py-2.5 px-3 text-right font-black ${totalIn - totalOut >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmt(totalIn - totalOut)}
                    </td>
                  </tr>
                )}

                {isLoading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse border-b border-gray-100">
                      <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                      <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                      <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                      <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>
                      <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-32" /></td>
                      <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>
                      <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : paginated.map((e, i) => {
                  const isInc = e.type === 'INCOME' || e.type === 'thu' || e.type === 'in';
                  const isCancelled = e.status === 'cancelled';
                  const isExpanded = expandedId === e.id;
                  const amt = Number(e.amount || 0);

                  return (
                    <React.Fragment key={e.id || i}>
                      <tr 
                        id={`row-${e.id}`}
                        onClick={() => {
                          const nextExpandedId = isExpanded ? null : e.id;
                          setExpandedId(nextExpandedId);
                          if (nextExpandedId !== null) scrollRowIntoView(e.id);
                        }}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer border-b border-gray-50 ${isExpanded ? 'bg-blue-50/50 font-semibold' : ''}`}
                      >
                        <td className="py-2.5 px-3 w-10 text-center" onClick={ev => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            checked={selectedIds.has(e.id)}
                            onChange={(ev) => {
                              const next = new Set(selectedIds);
                              if (ev.target.checked) next.add(e.id);
                              else next.delete(e.id);
                              setSelectedIds(next);
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3 w-8 text-center">
                          <button onClick={(ev) => toggleStar(e.id, ev)} className="bg-transparent border-none cursor-pointer">
                            <Star size={15} className={stars[e.id] ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-gray-400'} />
                          </button>
                        </td>
                        <td className={`py-2.5 px-3 font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-primary'}`}>
                          {e.code}
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">
                          {formatDateTime(e.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 font-semibold">
                          {e.category || 'Thu tiền khách trả'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-800 font-bold">
                          {e.partnerName && (e.partnerType === 'customer' || e.partnerType === 'Khách hàng' || e.category?.includes('khách') || e.customerId) ? (
                            <a
                              href={`/customers?search=${encodeURIComponent(e.partnerCode || e.partnerName)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 no-underline"
                              title="Mở chi tiết khách hàng trong tab mới"
                            >
                              <span>{e.partnerName}</span>
                              <ExternalLink size={13} className="shrink-0" />
                            </a>
                          ) : (
                            <span>{e.partnerName || '---'}</span>
                          )}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black ${isCancelled ? 'text-gray-400' : isInc ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isInc ? `+${fmt(amt)}` : `-${fmt(amt)}`}
                        </td>
                      </tr>

                      {/* Detail Expander */}
                      {isExpanded && (
                        <tr className="bg-blue-50/20">
                          <td colSpan={7} className="p-4 border-b border-gray-100">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-2 text-xs">
                                <div><span className="font-bold text-gray-500">Mã phiếu: </span><span className="font-extrabold text-primary">{e.code}</span></div>
                                <div><span className="font-bold text-gray-500">Thời gian: </span>{formatDateTime(e.createdAt)}</div>
                                <div><span className="font-bold text-gray-500">Người nộp/nhận: </span>{e.partnerName || '---'} ({e.partnerPhone || 'Không có SĐT'})</div>
                                <div><span className="font-bold text-gray-500">Loại thu chi: </span>{e.category || '---'}</div>
                                <div><span className="font-bold text-gray-500">Ghi chú: </span>{e.note || '---'}</div>
                              </div>
                              <div className="flex flex-col items-end justify-between gap-4">
                                <div className="text-right">
                                  <div className="text-xs font-bold text-gray-400">Giá trị</div>
                                  <div className={`text-lg font-black ${isInc ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isInc ? `+${fmt(amt)} VNĐ` : `-${fmt(amt)} VNĐ`}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handlePrintEntry(e)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs border-none cursor-pointer flex items-center gap-1">
                                    <Printer size={14} /> In phiếu
                                  </button>
                                  {!isCancelled && (
                                    <button onClick={() => handleCancelEntry(e.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs border-none cursor-pointer flex items-center gap-1">
                                      <Trash2 size={14} /> Hủy phiếu
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {!isLoading && filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                      <div className="font-bold text-gray-600">Không tìm thấy phiếu nào phù hợp</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            totalItems={filteredEntries.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="phiếu thu chi"
          />
        </div>
      </div>

      <CashbookModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSaved={reload} 
        type={modalType} 
      />
    </div>
  );
}
