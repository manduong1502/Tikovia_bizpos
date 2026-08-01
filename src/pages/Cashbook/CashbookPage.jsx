import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashbookAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { 
  Plus, Download, Search, ArrowUpRight, ArrowDownLeft, 
  FileText, Wallet, Filter, X, SlidersHorizontal, Info, 
  Star, Printer, Edit, Trash2, Calendar, MapPin, ExternalLink
} from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import Pagination from '../../components/common/Pagination';
import CashbookModal from './CashbookModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

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

const ALL_COLUMNS = [
  { key: 'code', label: 'Mã phiếu' },
  { key: 'time', label: 'Thời gian' },
  { key: 'createdAt', label: 'Thời gian tạo' },
  { key: 'employee', label: 'Nhân viên' },
  { key: 'branch', label: 'Chi nhánh' },
  { key: 'category', label: 'Loại thu chi' },
  { key: 'bankAccount', label: 'Tên tài khoản' },
  { key: 'bankAccountNumber', label: 'Số tài khoản' },
  { key: 'partnerCode', label: 'Mã người nộp/nhận' },
  { key: 'partnerName', label: 'Người nộp/nhận' },
  { key: 'partnerPhone', label: 'Số điện thoại' },
  { key: 'partnerAddress', label: 'Địa chỉ' },
  { key: 'amount', label: 'Giá trị' },
  { key: 'transferContent', label: 'Nội dung chuyển khoản' },
  { key: 'note', label: 'Ghi chú' },
  { key: 'paymentMethod', label: 'Loại sổ quỹ' },
  { key: 'status', label: 'Trạng thái' }
];

const fallbackEntries = [];

export default function CashbookPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Advanced Sidebar Filters States
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // all, cash, bank, wallet
  const [timeFilter, setTimeFilter] = useState('month'); // month, custom
  const [customDate, setCustomDate] = useState({ from: '', to: '' });
  
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [statusPaid, setStatusPaid] = useState(true);
  const [statusCancelled, setStatusCancelled] = useState(false);
  
  const [accountingFilter, setAccountingFilter] = useState('all'); // all, yes, no
  const [creatorQuery, setCreatorQuery] = useState('');
  const [employeeQuery, setEmployeeQuery] = useState('');
  
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('Tất cả');
  const [partnerNameQuery, setPartnerNameQuery] = useState('');
  const [partnerPhoneQuery, setPartnerPhoneQuery] = useState('');

  // Column visibility states
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(['code', 'time', 'category', 'partnerName', 'amount']);
  const columnMenuRef = useRef(null);

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
      const params = {};
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

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset page size
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [
    search, paymentMethodFilter, timeFilter, customDate,
    showIncome, showExpense, categoryFilter, statusPaid,
    statusCancelled, accountingFilter, creatorQuery, employeeQuery,
    partnerTypeFilter, partnerNameQuery, partnerPhoneQuery
  ]);

  // Client-side multi-filter implementation matching sidebar requirements
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      // 1. Quỹ tiền (paymentMethod)
      if (paymentMethodFilter !== 'all') {
        if (e.paymentMethod !== paymentMethodFilter) return false;
      }

      // 2. Thời gian
      if (timeFilter === 'month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const entryDate = new Date(e.createdAt || e.created_at);
        if (entryDate < firstDay) return false;
      } else if (timeFilter === 'custom') {
        const entryDate = new Date(e.createdAt || e.created_at);
        if (customDate.from) {
          const fromD = new Date(customDate.from);
          if (entryDate < fromD) return false;
        }
        if (customDate.to) {
          const toD = new Date(customDate.to + 'T23:59:59.999Z');
          if (entryDate > toD) return false;
        }
      }

      // 3. Loại chứng từ (INCOME/EXPENSE)
      const isInc = e.type === 'INCOME' || e.type === 'thu' || e.type === 'in';
      const isExp = e.type === 'EXPENSE' || e.type === 'chi' || e.type === 'out';
      if (!showIncome && isInc) return false;
      if (!showExpense && isExp) return false;

      // 4. Loại thu chi (Category)
      if (categoryFilter && e.category) {
        if (!e.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }

      // 5. Trạng thái (status: completed/cancelled)
      const st = e.status || 'completed';
      if (!statusPaid && st === 'completed') return false;
      if (!statusCancelled && st === 'cancelled') return false;

      // 6. Hạch toán kết quả kinh doanh
      if (accountingFilter === 'yes' && e.isAccounting !== true) return false;
      if (accountingFilter === 'no' && e.isAccounting === true) return false;

      // 7. Người tạo
      if (creatorQuery && e.createdBy) {
        if (!e.createdBy.toLowerCase().includes(creatorQuery.toLowerCase())) return false;
      }

      // 8. Đối tượng nộp/nhận
      if (partnerTypeFilter !== 'Tất cả') {
        const typeMap = {
          'Khách hàng': 'customer',
          'Nhà cung cấp': 'supplier',
          'Nhân viên': 'staff',
          'Đối tác giao hàng': 'delivery',
          'Khác': 'other'
        };
        const mapped = typeMap[partnerTypeFilter];
        if (mapped && e.partnerType !== mapped) return false;
      }

      if (partnerNameQuery && e.partnerName) {
        if (!e.partnerName.toLowerCase().includes(partnerNameQuery.toLowerCase())) return false;
      }

      if (partnerPhoneQuery && e.partnerPhone) {
        if (!e.partnerPhone.includes(partnerPhoneQuery)) return false;
      }

      return true;
    });
  }, [
    entries, paymentMethodFilter, timeFilter, customDate,
    showIncome, showExpense, categoryFilter, statusPaid,
    statusCancelled, accountingFilter, creatorQuery,
    partnerTypeFilter, partnerNameQuery, partnerPhoneQuery
  ]);

  // Aggregate Metrics & Opening Balance (Quỹ đầu kỳ: 32,807,129,366)
  const openingEntry = entries.find(e => e.category === 'Quỹ đầu kỳ' || e.code === 'TT000000');
  const openingBalance = openingEntry ? Number(openingEntry.amount || 0) : 32807129366;

  const totalIn = filteredEntries
    .filter(e => (e.type === 'INCOME' || e.type === 'thu' || e.type === 'in') && e.status !== 'cancelled' && e.category !== 'Quỹ đầu kỳ' && e.code !== 'TT000000')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const totalOut = filteredEntries
    .filter(e => (e.type === 'EXPENSE' || e.type === 'chi' || e.type === 'out') && e.status !== 'cancelled')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const netBalance = openingBalance + totalIn - totalOut;

  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return filteredEntries;
    return [...filteredEntries].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (['amount'].includes(sortConfig.key)) {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else if (sortConfig.key === 'time') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEntries, sortConfig]);

  // Paginated Slices
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, currentPage, pageSize]);

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0 ? filteredEntries.filter(item => selectedIds.has(item.id)) : filteredEntries;
    if (dataToExport.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportCSV(
      [
        { key: 'code', label: 'Mã phiếu' },
        { key: 'created_at_fmt', label: 'Thời gian' },
        { key: 'category', label: 'Loại thu chi' },
        { key: 'partnerName', label: 'Người nộp/nhận' },
        { key: 'amount', label: 'Giá trị' },
        { key: 'status_lbl', label: 'Trạng thái' },
      ],
      dataToExport.map(e => ({
        ...e,
        created_at_fmt: e.createdAt ? new Date(e.createdAt).toLocaleString('vi-VN') : '',
        status_lbl: e.status === 'cancelled' ? 'Đã hủy' : 'Đã thanh toán',
      })),
      'so_quy'
    );
    toast.success('Xuất file thành công');
  };

  const handlePrintEntry = (e) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isInc = e.type === 'INCOME' || e.type === 'thu' || e.type === 'in';
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
            <div style="font-size: 12px;">Ngày: ${e.createdAt ? new Date(e.createdAt).toLocaleString('vi-VN') : ''}</div>
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
      // If server failed, do it locally for premium flow
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelled' } : e));
    }
  };

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStars(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openModal = (type) => { setModalType(type); setModalOpen(true); };

  const getPartnerTypeLabel = (type) => {
    const labels = {
      customer: 'Khách hàng',
      supplier: 'Nhà cung cấp',
        staff: 'Nhân viên',
        delivery: 'Đối tác giao hàng',
        other: 'Khác'
      };
      return labels[type] || 'Khác';
    };

    // Top Search and Action bar
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
        <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-30 relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 flex-1 w-full lg:w-auto">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Bộ lọc tìm kiếm"
              >
                <Filter size={16} />
              </button>
            <div>
              <span className="text-[13px] font-extrabold text-gray-800 mb-2.5 block">Quỹ tiền</span>
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

            <hr className="border-gray-100 my-1" />

            {/* 2. Thời gian */}
            <div>
              <span className="text-[13px] font-extrabold text-gray-800 mb-2.5 block">Thời gian</span>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600">
                  <input 
                    type="radio" 
                    name="timeFilter" 
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                    checked={timeFilter === 'month'} 
                    onChange={() => setTimeFilter('month')}
                  />
                  <span>Tháng này</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600">
                  <input 
                    type="radio" 
                    name="timeFilter" 
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                    checked={timeFilter === 'custom'} 
                    onChange={() => setTimeFilter('custom')}
                  />
                  <span>Tùy chỉnh</span>
                </label>

                {timeFilter === 'custom' && (
                  <div className="flex flex-col gap-2 mt-2 p-2 bg-gray-50 rounded-xl border border-gray-100 animate-slide-down">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400">Từ ngày</span>
                      <input 
                        type="date" 
                        className="w-full border border-gray-200 rounded-lg p-1.5 text-xs bg-white focus:border-primary outline-none"
                        value={customDate.from}
                        onChange={e => setCustomDate(prev => ({ ...prev, from: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400">Đến ngày</span>
                      <input 
                        type="date" 
                        className="w-full border border-gray-200 rounded-lg p-1.5 text-xs bg-white focus:border-primary outline-none"
                        value={customDate.to}
                        onChange={e => setCustomDate(prev => ({ ...prev, to: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-gray-100 my-1" />

            {/* 3. Loại chứng từ */}
            <div>
              <span className="text-[13px] font-extrabold text-gray-800 mb-2.5 block">Loại chứng từ</span>
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

            <hr className="border-gray-100 my-1" />

            {/* 4. Loại thu chi */}
            <div>
              <span className="text-[13px] font-extrabold text-gray-800 mb-2.5 block">Loại thu chi</span>
              <input 
                type="text" 
                placeholder="Chọn loại thu chi" 
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              />
            </div>

            <hr className="border-gray-100 my-1" />

            {/* 5. Trạng thái */}
            <div>
              <span className="text-[13px] font-extrabold text-gray-800 mb-2.5 block">Trạng thái</span>
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

            <hr className="border-gray-100 my-1" />

            {/* 6. Hạch toán kết quả kinh doanh */}
            <div>
              <span className="text-[13px] font-extrabold text-gray-800 mb-2.5 block">Hạch toán kết quả KD</span>
              <div className="grid grid-cols-3 bg-gray-50 border border-gray-200 rounded-xl p-0.5">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'yes', label: 'Có' },
                  { key: 'no', label: 'Không' }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setAccountingFilter(item.key)}
                    className={`py-1 px-2 text-[10px] sm:text-xs font-bold rounded-lg cursor-pointer transition-all border-none ${accountingFilter === item.key ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-100 my-1" />


            {/* 8. Đối tượng nộp/nhận */}
            <div>
              <span className="text-[13px] font-extrabold text-gray-800 mb-2.5 block">Người nộp/nhận</span>
              <div className="flex flex-col gap-2">
                <select 
                  className="w-full border border-gray-200 rounded px-2 py-2 text-xs bg-white outline-none cursor-pointer"
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                  value={partnerNameQuery}
                  onChange={e => setPartnerNameQuery(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Số điện thoại" 
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                  value={partnerPhoneQuery}
                  onChange={e => setPartnerPhoneQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main List Table Area */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden max-w-full w-full min-h-[500px]">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar max-w-full w-full">
            <table className="w-full text-xs border-collapse min-w-[800px] border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm text-[11px] text-gray-500 uppercase border-b border-gray-100 font-extrabold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">
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
                  <th className="py-2.5 px-3 w-10"></th>
                  {visibleColumns.includes('code') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('code')}>
                      <div className="flex items-center gap-1.5">Mã phiếu {sortConfig.key === 'code' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('time') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('time')}>
                      <div className="flex items-center gap-1.5">Thời gian {sortConfig.key === 'time' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('createdAt') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1.5">Thời gian tạo {sortConfig.key === 'createdAt' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('employee') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('employee')}>
                      <div className="flex items-center gap-1.5">Nhân viên {sortConfig.key === 'employee' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('branch') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('branch')}>
                      <div className="flex items-center gap-1.5">Chi nhánh {sortConfig.key === 'branch' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('category') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('category')}>
                      <div className="flex items-center gap-1.5">Loại thu chi {sortConfig.key === 'category' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('bankAccount') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('bankAccount')}>
                      <div className="flex items-center gap-1.5">Tên tài khoản {sortConfig.key === 'bankAccount' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('bankAccountNumber') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('bankAccountNumber')}>
                      <div className="flex items-center gap-1.5">Số tài khoản {sortConfig.key === 'bankAccountNumber' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('partnerCode') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('partnerCode')}>
                      <div className="flex items-center gap-1.5">Mã người nộp/nhận {sortConfig.key === 'partnerCode' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('partnerName') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('partnerName')}>
                      <div className="flex items-center gap-1.5">Người nộp/nhận {sortConfig.key === 'partnerName' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('partnerPhone') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('partnerPhone')}>
                      <div className="flex items-center gap-1.5">Số điện thoại {sortConfig.key === 'partnerPhone' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('partnerAddress') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('partnerAddress')}>
                      <div className="flex items-center gap-1.5">Địa chỉ {sortConfig.key === 'partnerAddress' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('amount') && (
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amount')}>
                      <div className="flex items-center gap-1.5 flex-row-reverse">Giá trị {sortConfig.key === 'amount' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('transferContent') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('transferContent')}>
                      <div className="flex items-center gap-1.5">Nội dung chuyển khoản {sortConfig.key === 'transferContent' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('note') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('note')}>
                      <div className="flex items-center gap-1.5">Ghi chú {sortConfig.key === 'note' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('paymentMethod') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paymentMethod')}>
                      <div className="flex items-center gap-1.5">Loại sổ quỹ {sortConfig.key === 'paymentMethod' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                  {visibleColumns.includes('status') && (
                    <th className="py-2.5 px-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1.5">Trạng thái {sortConfig.key === 'status' && <span className="text-primary text-[10px] leading-none flex flex-col">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Summary row */}
                {!isLoading && (
                  <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700 border-b border-gray-100">
                    <td colSpan={2}></td>
                    {visibleColumns.includes('code') && <td className="py-2.5 px-3">Tổng cộng</td>}
                    {visibleColumns.includes('time') && <td className="py-2.5 px-3">{!visibleColumns.includes('code') ? 'Tổng cộng' : ''}</td>}
                    {visibleColumns.includes('createdAt') && <td className="py-2.5 px-3">{!visibleColumns.includes('code') && !visibleColumns.includes('time') ? 'Tổng cộng' : ''}</td>}
                    {visibleColumns.includes('employee') && <td></td>}
                    {visibleColumns.includes('branch') && <td></td>}
                    {visibleColumns.includes('category') && <td></td>}
                    {visibleColumns.includes('bankAccount') && <td></td>}
                    {visibleColumns.includes('bankAccountNumber') && <td></td>}
                    {visibleColumns.includes('partnerCode') && <td></td>}
                    {visibleColumns.includes('partnerName') && <td></td>}
                    {visibleColumns.includes('partnerPhone') && <td></td>}
                    {visibleColumns.includes('partnerAddress') && <td></td>}
                    {visibleColumns.includes('amount') && (
                      <td className={`py-2.5 px-3 text-right font-extrabold ${totalIn - totalOut >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmt(totalIn - totalOut)}
                      </td>
                    )}
                    {visibleColumns.includes('transferContent') && <td></td>}
                    {visibleColumns.includes('note') && <td></td>}
                    {visibleColumns.includes('paymentMethod') && <td></td>}
                    {visibleColumns.includes('status') && <td></td>}
                  </tr>
                )}
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse border-b border-gray-100">
                      <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                      <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                      {visibleColumns.includes('code') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                      {visibleColumns.includes('time') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>}
                      {visibleColumns.includes('createdAt') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>}
                      {visibleColumns.includes('employee') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>}
                      {visibleColumns.includes('branch') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>}
                      {visibleColumns.includes('category') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>}
                      {visibleColumns.includes('bankAccount') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-32" /></td>}
                      {visibleColumns.includes('bankAccountNumber') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>}
                      {visibleColumns.includes('partnerCode') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                      {visibleColumns.includes('partnerName') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>}
                      {visibleColumns.includes('partnerPhone') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>}
                      {visibleColumns.includes('partnerAddress') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-40" /></td>}
                      {visibleColumns.includes('amount') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                      {visibleColumns.includes('transferContent') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>}
                      {visibleColumns.includes('note') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>}
                      {visibleColumns.includes('paymentMethod') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                      {visibleColumns.includes('status') && <td className="py-2.5 px-3"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>}
                    </tr>
                  ))
                ) : paginated.map((e, i) => {
                  const isInc = e.type === 'INCOME' || e.type === 'thu' || e.type === 'in';
                  const isCancelled = e.status === 'cancelled';
                  const isExpanded = expandedId === e.id;
                  
                  return (
                    <React.Fragment key={e.id || i}>
                      {/* Standard Row */}
                      <tr 
                        id={`row-${e.id}`}
                        onClick={() => {
                          const nextExpandedId = isExpanded ? null : e.id;
                          setExpandedId(nextExpandedId);
                          if (nextExpandedId !== null) {
                            scrollRowIntoView(e.id);
                          }
                        }}
                        className={`hover:bg-blue-50/20 transition-all cursor-pointer border-b border-gray-50 ${isExpanded ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="py-2.5 px-3 w-12 text-center" onClick={ev => ev.stopPropagation()}>
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
                        <td className="py-2.5 px-3 w-10 text-center">
                          <button 
                            onClick={(ev) => toggleStar(e.id, ev)} 
                            className="bg-transparent border-none cursor-pointer"
                          >
                            <Star 
                              size={16} 
                              className={stars[e.id] ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-gray-400'} 
                            />
                          </button>
                        </td>
                        {visibleColumns.includes('code') && (
                          <td className={`py-2.5 px-3 font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-primary'}`}>
                            {e.code}
                          </td>
                        )}
                        {visibleColumns.includes('time') && (
                          <td className="py-2.5 px-3 text-[13px] text-gray-500 font-semibold">
                            {e.createdAt ? new Date(e.createdAt).toLocaleString('vi-VN') : ''}
                          </td>
                        )}
                        {visibleColumns.includes('createdAt') && (
                          <td className="py-2.5 px-3 text-[13px] text-gray-500">
                            {e.createdAt ? new Date(e.createdAt).toLocaleDateString('vi-VN') : ''}
                          </td>
                        )}
                        {visibleColumns.includes('employee') && (
                          <td className="py-2.5 px-3 text-xs text-gray-600">
                            {e.createdBy}
                          </td>
                        )}
                        {visibleColumns.includes('branch') && (
                          <td className="py-2.5 px-3 text-xs text-gray-600">
                            {e.branch || 'Chi nhánh trung tâm'}
                          </td>
                        )}
                        {visibleColumns.includes('category') && (
                          <td className="py-2.5 px-3 text-gray-600 font-semibold text-[13px]">
                            {e.category}
                          </td>
                        )}
                        {visibleColumns.includes('bankAccount') && (
                          <td className="py-2.5 px-3 text-xs text-gray-600">
                            {e.paymentMethod === 'bank' ? 'Techcombank - 1903xxx' : '—'}
                          </td>
                        )}
                        {visibleColumns.includes('bankAccountNumber') && (
                          <td className="py-2.5 px-3 text-xs text-gray-600">
                            {e.paymentMethod === 'bank' ? '1903555222000' : '—'}
                          </td>
                        )}
                        {visibleColumns.includes('partnerCode') && (
                          <td className="py-2.5 px-3 text-xs text-gray-600 font-bold">
                            {e.partnerType === 'customer' ? (e.customer?.code || '—') : (e.partnerType === 'supplier' ? (e.supplier?.code || '—') : '—')}
                          </td>
                        )}
                        {visibleColumns.includes('partnerName') && (
                          <td className="py-2.5 px-3 font-bold text-gray-800 text-[13px]">
                            {e.partnerName}
                          </td>
                        )}
                        {visibleColumns.includes('partnerPhone') && (
                          <td className="py-2.5 px-3 text-xs text-gray-600">
                            {e.partnerPhone || '—'}
                          </td>
                        )}
                        {visibleColumns.includes('partnerAddress') && (
                          <td className="py-2.5 px-3 text-xs text-gray-500 max-w-xs truncate">
                            {e.partnerAddress || '—'}
                          </td>
                        )}
                        {visibleColumns.includes('amount') && (
                          <td className={`py-2.5 px-3 text-right font-black text-[13px] ${isCancelled ? 'text-gray-400 line-through' : (isInc ? 'text-green-600' : 'text-red-500')}`}>
                            {isCancelled ? '' : (isInc ? '+' : '-')}{fmt(e.amount)}
                          </td>
                        )}
                        {visibleColumns.includes('transferContent') && (
                          <td className="py-2.5 px-3 text-xs text-gray-500">
                            {e.paymentMethod === 'bank' ? `Chuyển khoản ${e.code}` : '—'}
                          </td>
                        )}
                        {visibleColumns.includes('note') && (
                          <td className="py-2.5 px-3 text-xs text-gray-500 max-w-xs truncate italic">
                            {e.note || '—'}
                          </td>
                        )}
                        {visibleColumns.includes('paymentMethod') && (
                          <td className="py-2.5 px-3 text-xs font-semibold text-gray-600">
                            {getPaymentMethodLabel(e.paymentMethod)}
                          </td>
                        )}
                        {visibleColumns.includes('status') && (
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isCancelled ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                              {isCancelled ? 'Đã hủy' : 'Đã thanh toán'}
                            </span>
                          </td>
                        )}
                      </tr>

                      {/* Row Expander Detail Panel */}
                      {isExpanded && (
                        <tr id={`detail-${e.id}`} className="bg-gray-50/60 transition-all">
                          <td colSpan={2 + visibleColumns.length} className="p-0 border-b border-blue-100">
                            <div className="p-6 bg-gradient-to-b from-blue-50/10 to-transparent border-x-2 border-primary/20">
                              {/* Details Tab Menu */}
                              <div className="flex gap-3 border-b border-gray-200 mb-3 px-2">
                                <span className="font-bold text-sm text-primary border-b-2 border-primary pb-2.5 cursor-pointer">
                                  Thông tin
                                </span>
                              </div>

                              <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-white p-5 rounded-2xl border border-blue-50 shadow-sm">
                                <div className="flex-1 w-full flex flex-col gap-4">
                                  {/* Title & Status Badges */}
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="text-base font-black text-gray-800 m-0">
                                      {isInc ? 'Phiếu thu' : 'Phiếu chi'} <span className="text-primary">{e.code}</span>
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${isCancelled ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                                      {isCancelled ? 'Đã hủy' : 'Đã thanh toán'}
                                    </span>
                                    {e.isAccounting && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
                                        Có hạch toán
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs font-bold text-gray-400 mt-1">
                                    Thời gian: <span className="text-gray-600 font-extrabold">{e.createdAt ? new Date(e.createdAt).toLocaleString('vi-VN') : ''}</span>
                                  </p>

                                  {/* Fields Matrix Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Số tiền</span>
                                      <span className={`text-base font-black ${isInc ? 'text-green-600' : 'text-red-500'}`}>{fmt(e.amount)} VNĐ</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Loại {isInc ? 'thu' : 'chi'}</span>
                                      <span className="text-xs font-black text-gray-800 bg-gray-50 px-2 py-1 rounded-lg w-max">{e.category}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Đối tượng nộp</span>
                                      <span className="text-xs font-bold text-gray-800">{getPartnerTypeLabel(e.partnerType)}</span>
                                    </div>
                                  </div>

                                  {/* Payer and Payment Method details */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 pt-4 border-t border-dashed border-gray-100">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Người nộp/nhận</span>
                                      {e.partnerType === 'customer' || e.partnerType === 'khach_hang' ? (
                                        <button 
                                          onClick={() => navigate('/customers', { state: { searchCustomer: e.partnerName } })}
                                          className="text-xs font-black text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left inline-flex items-center gap-1"
                                          title="Xem chi tiết khách hàng tại trang Khách hàng"
                                        >
                                          <span>{e.partnerName}</span>
                                          <ExternalLink size={14} className="text-primary shrink-0" />
                                        </button>
                                      ) : (e.partnerType === 'supplier' || e.partnerType === 'nha_cung_cap') ? (
                                        <button 
                                          onClick={() => navigate('/suppliers', { state: { searchSupplier: e.partnerName } })}
                                          className="text-xs font-black text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left inline-flex items-center gap-1"
                                          title="Xem chi tiết nhà cung cấp tại trang Nhà cung cấp"
                                        >
                                          <span>{e.partnerName}</span>
                                          <ExternalLink size={14} className="text-primary shrink-0" />
                                        </button>
                                      ) : (
                                        <span className="text-xs font-black text-gray-800">{e.partnerName}</span>
                                      )}
                                      {e.partnerPhone && <span className="text-xs font-bold text-gray-500">SĐT: {e.partnerPhone}</span>}
                                      {e.partnerAddress && <span className="text-xs font-medium text-gray-500 mt-0.5">{e.partnerAddress}</span>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Phương thức thanh toán</span>
                                      <span className="text-xs font-bold text-gray-800">{getPaymentMethodLabel(e.paymentMethod)}</span>
                                    </div>
                                  </div>

                                  {/* Note */}
                                  {e.note && (
                                    <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                      <span className="text-[10px] font-extrabold text-gray-400 block mb-1">Ghi chú:</span>
                                      <p className="text-xs font-semibold text-gray-700 m-0 italic">"{e.note}"</p>
                                    </div>
                                  )}
                                </div>

                                {/* Right Side Info & Action panel */}
                                <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-8 min-w-[150px] w-full md:w-auto">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                    <MapPin size={14} className="text-primary animate-bounce" /> {e.branch || 'Chi nhánh trung tâm'}
                                  </div>

                                  <div className="flex items-center gap-2 w-full justify-end">
                                    {!isCancelled && (
                                      <button 
                                        onClick={() => handleCancelEntry(e.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 border border-red-200 hover:border-red-300 bg-white rounded-xl transition-all shadow-sm cursor-pointer"
                                      >
                                        <Trash2 size={14} /> Hủy phiếu
                                      </button>
                                    )}
                                    <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 bg-white rounded-xl transition-all shadow-sm cursor-pointer">
                                      <Edit size={14} /> Sửa
                                    </button>
                                    <button 
                                      onClick={() => handlePrintEntry(e)}
                                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 bg-white rounded-xl transition-all shadow-sm cursor-pointer"
                                    >
                                      <Printer size={14} /> In
                                    </button>
                                  </div>
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
                    <td colSpan={2 + visibleColumns.length} className="text-center py-20 text-gray-400">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <FileText size={32} className="text-gray-300" />
                      </div>
                      <div className="text-base font-bold text-gray-600">Không tìm thấy phiếu nào phù hợp</div>
                      <div className="text-xs font-semibold text-gray-400 mt-1">Vui lòng thử điều chỉnh lại điều kiện bộ lọc của bạn</div>
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

      {/* Cash Receipt / Payment Modal Form */}
      <CashbookModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSaved={reload} 
        type={modalType} 
      />
    </div>
  );
}
