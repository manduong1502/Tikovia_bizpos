import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { customerAPI, orderAPI, cashbookAPI, returnAPI, loadInitialCache, hasInitialCache } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, User, Edit, Trash2, Star, Filter, Columns3, Settings, HelpCircle, Copy, Save, Printer, MoreHorizontal, AlertCircle, X, Upload, SlidersHorizontal, Phone, ChevronDown
} from 'lucide-react';
import { Pen, DollarSign, Percent } from 'lucide-react';
// Dynamic imports will be used for XLSX and exportCSV to speed up route loading
import CustomerModal from './CustomerModal';
import CustomerPaymentModal from './CustomerPaymentModal';
import CustomerAdjustDebtModal from './CustomerAdjustDebtModal';
import CustomerExportDebtModal from './CustomerExportDebtModal';
import SalesOrderDetailModal from '../../components/modals/SalesOrderDetailModal';
import SalesReturnDetailModal from '../../components/modals/SalesReturnDetailModal';
import PaymentDetailModal from '../../components/modals/PaymentDetailModal';
import Pagination from '../../components/common/Pagination';
import { getRangeByCreatedLabel, inDateRange, buildCustomRange, formatWorkingHoursDateTime } from '../../utils/dateFilterUtils';
import NumericInput from '../../components/ui/NumericInput';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const formatLiteralDateTime = (dateStr) => formatWorkingHoursDateTime(dateStr);


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
  { key: 'code', label: 'Mã KH', default: true },
  { key: 'name', label: 'Tên khách hàng', default: true },
  { key: 'phone', label: 'Điện thoại', default: true },
  { key: 'email', label: 'Email', default: false },
  { key: 'address', label: 'Địa chỉ', default: false },
  { key: 'note', label: 'Ghi chú', default: false },
  { key: 'debt', label: 'Nợ hiện tại', default: true, align: 'right' },
  { key: 'total_spent', label: 'Tổng bán', default: true, align: 'right' },
];

export default function CustomersPage() {
  const location = useLocation();
  const [customers, setCustomers] = useState(() => {
    const init = loadInitialCache('customers', []);
    return Array.isArray(init) ? init : (init?.data || []);
  });
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache('customers'));
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchNote, setSearchNote] = useState('');
  const [searchOrderCode, setSearchOrderCode] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [debtPageMap, setDebtPageMap] = useState({});
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState({ totalRows: 0, validItems: [], invalidItems: [] });
  const [orders, setOrders] = useState([]);
  const [cashbooks, setCashbooks] = useState([]);
  const [returns, setReturns] = useState([]);
  const [customerLatestTxMap, setCustomerLatestTxMap] = useState({});

  useEffect(() => {
    // Customer latest tx map is already managed on the backend directly via customer.lastTransaction
  }, []);

  // Customer debt modal states
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportModalCustomer, setExportModalCustomer] = useState(null);

  const [selectedTx, setSelectedTx] = useState(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustModalCustomer, setAdjustModalCustomer] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState(null);

  const handleOpenOrder = async (orderId, partnerName, defaultData = null) => {
    const parsedId = typeof orderId === 'string' && orderId.includes('-')
      ? orderId.split('-')[0]
      : orderId;
    const targetCode = defaultData?.code || defaultData?.order_code;
    
    const rawOrder = defaultData?.raw || orders.find(o => 
      (parsedId && String(o.id) === String(parsedId)) || 
      (targetCode && (o.order_code === targetCode || o.code === targetCode))
    );

    const baseData = {
      ...(rawOrder || {}),
      ...(defaultData || {}),
      id: rawOrder?.id || parsedId || orderId,
      code: targetCode || rawOrder?.order_code || rawOrder?.code,
      type: 'Bán hàng',
      partnerName: partnerName || rawOrder?.customer_name || 'Khách lẻ',
      items: rawOrder?.items || defaultData?.items || []
    };

    setSelectedTx(baseData);

    const realId = rawOrder?.id || (typeof parsedId === 'number' || (typeof parsedId === 'string' && /^\d+$/.test(parsedId)) ? Number(parsedId) : null);
    if (realId) {
      try {
        const detail = await orderAPI.getById(realId);
        if (detail) {
          setSelectedTx(prev => ({
            ...(prev || {}),
            ...detail,
            type: 'Bán hàng',
            partnerName: partnerName || detail.customer_name || 'Khách lẻ'
          }));
        }
      } catch (err) {
        console.warn('Could not fetch full order API detail, used local data', err);
      }
    }
  };

  const handleOpenReturn = async (returnId, partnerName, defaultData = null) => {
    const parsedId = typeof returnId === 'string' && returnId.includes('-')
      ? returnId.split('-')[0]
      : returnId;
    const targetCode = defaultData?.code;

    const rawReturn = defaultData?.raw || returns.find(r => 
      (parsedId && String(r.id) === String(parsedId)) || 
      (targetCode && r.code === targetCode)
    );

    const baseData = {
      ...(rawReturn || {}),
      ...(defaultData || {}),
      id: rawReturn?.id || parsedId || returnId,
      code: targetCode || rawReturn?.code,
      type: 'Trả hàng',
      partnerName: partnerName || rawReturn?.customer_name || 'Khách lẻ',
      items: rawReturn?.items || defaultData?.items || []
    };

    setSelectedTx(baseData);

    const realId = rawReturn?.id || (typeof parsedId === 'number' || (typeof parsedId === 'string' && /^\d+$/.test(parsedId)) ? Number(parsedId) : null);
    if (realId) {
      try {
        const detail = await returnAPI.getById(realId);
        if (detail) {
          setSelectedTx(prev => ({
            ...(prev || {}),
            ...detail,
            type: 'Trả hàng',
            partnerName: partnerName || detail.customer_name || 'Khách lẻ'
          }));
        }
      } catch (err) {
        console.warn('Could not fetch full return API detail, used local data', err);
      }
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx-js-style');
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // 1. Read sheet as 2D array of rows (array of arrays)
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // 2. Find the header row index
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
          const rowText = rawRows[i].map(cell => String(cell || '').trim().toLowerCase()).join(' ');
          if (
            rowText.includes('tên hàng') || rowText.includes('tên sản phẩm') || rowText.includes('mã hàng') ||
            rowText.includes('tên khách hàng') || rowText.includes('mã khách hàng') || rowText.includes('mã kh') ||
            rowText.includes('tên nhà cung cấp') || rowText.includes('mã nhà cung cấp') || rowText.includes('mã ncc') ||
            rowText.includes('mã hóa đơn') || rowText.includes('mã hd')
          ) {
            headerRowIndex = i;
            break;
          }
        }

        // 3. Extract headers and normalize them
        const headers = rawRows[headerRowIndex].map(h => String(h || '').trim().toLowerCase());

        const validItems = [];
        const invalidItems = [];
        let totalProcessed = 0;

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          const isEmptyRow = row.every(cell => String(cell || '').trim() === '');
          if (isEmptyRow) continue;

          totalProcessed++;

          const findVal = (possibleKeys) => {
            const colIdx = headers.findIndex(h => possibleKeys.includes(h));
            return colIdx !== -1 ? row[colIdx] : '';
          };

          const code = String(findVal(['mã khách hàng', 'mã kh', 'ma kh', 'code', 'ma_kh']) || '').trim();
          const name = String(findVal(['tên khách hàng', 'ten khach hang', 'name', 'tên_khách_hàng', 'tên kh', 'ten kh']) || '').trim();
          const phone = String(findVal(['điện thoại', 'dien thoai', 'phone', 'sđt', 'sdt']) || '').trim();
          const email = String(findVal(['email']) || '').trim();
          const address = String(findVal(['địa chỉ', 'dia chi', 'address']) || '').trim();
          const customerType = String(findVal(['loại khách', 'loai khach', 'customer_type']) || '').trim();
          const branch = String(findVal(['chi nhánh tạo', 'chi nhánh', 'chi nhanh', 'branch']) || '').trim();
          const totalSpent = Number(String(findVal(['tổng bán', 'tong ban', 'total_spent']) || '').replace(/[^0-9.-]/g, '')) || 0;
          const totalDebt = Number(String(findVal(['nợ cần thu hiện tại', 'no can thu hien tai', 'công nợ', 'cong no', 'debt', 'nợ', 'no']) || '').replace(/[^0-9.-]/g, '')) || 0;
          const note = String(findVal(['ghi chú', 'ghi chu', 'note']) || '').trim();
          
          const rawStatus = String(findVal(['trạng thái', 'trang thai', 'status', 'is_active', 'active']) || '').trim();
          const isActive = rawStatus === '0' || rawStatus.toLowerCase() === 'false' || rawStatus.toLowerCase() === 'ngừng hoạt động' ? false : true;

          const createdBy = String(findVal(['người tạo', 'nguoi tao', 'created_by']) || '').trim();
          const lastTransaction = String(findVal(['ngày giao dịch cuối', 'ngay giao dich cuoi', 'last_transaction']) || '').trim();
          const createdAt = String(findVal(['ngày tạo', 'ngay tao', 'created_at']) || '').trim();

          if (!name) {
            invalidItems.push({ row: i + 1, sku: code || '[Trống]', reason: 'Tên khách hàng không được để trống' });
            continue;
          }

          validItems.push({
            code,
            name,
            phone,
            email,
            address,
            customerType,
            branch,
            totalSpent,
            totalDebt,
            note,
            isActive,
            createdBy,
            lastTransaction,
            createdAt,
          });
        }

        setImportSummary({ totalRows: totalProcessed, validItems, invalidItems });
        setImportSummaryOpen(true);
      } catch (err) {
        toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error('Không thể tải thư viện xử lý Excel');
    }
  };

  const handleConfirmImport = async () => {
    if (importSummary.validItems.length === 0) {
      toast.error('Không có dữ liệu hợp lệ để import!');
      return;
    }
    const tid = toast.loading('Đang xử lý import dữ liệu...');
    try {
      const res = await customerAPI.importExcel({ items: importSummary.validItems });
      toast.success(res?.message || 'Import dữ liệu thành công!', { id: tid });
      setImportSummaryOpen(true);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi import dữ liệu', { id: tid });
    }
  };

  const handleDownloadSample = async () => {
    try {
      const XLSX = await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();
      const headers = ['Mã KH', 'Tên khách hàng', 'Điện thoại', 'Email', 'Địa chỉ', 'Giới tính', 'Công nợ', 'Ghi chú'];
      const sampleData = [
        headers,
        ['KH000001', 'Nguyễn Văn A', '0912345678', 'nva@gmail.com', '123 Lê Lợi, Q.1, TP.HCM', 'Nam', 500000, 'Khách hàng VIP'],
        ['KH000002', 'Trần Thị B', '0987654321', 'ttb@yahoo.com', '456 Nguyễn Thị Minh Khai, Q.3, TP.HCM', 'Nữ', 0, 'Khách hàng mới'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws, 'CustomersTemplate');
      XLSX.writeFile(wb, 'MauFileKhachHang.xlsx');
    } catch (err) {
      toast.error('Không thể tải thư viện xử lý Excel');
    }
  };

  const [filterGroup, setFilterGroup] = useState('');
  const [customerGroups, setCustomerGroups] = useState([]);
  const [filterDate, setFilterDate] = useState({ mode: 'all', label: 'Toàn thời gian', start: null, end: null });
  const [filterType, setFilterType] = useState('Tất cả');
  const [filterGender, setFilterGender] = useState('Tất cả');
  const [filterBirthdayDate, setFilterBirthdayDate] = useState({ mode: 'all', label: 'Toàn thời gian', start: null, end: null });
  const [filterLastTransactionDate, setFilterLastTransactionDate] = useState({ mode: 'all', label: 'Toàn thời gian', start: null, end: null });
  const [filterTotalFrom, setFilterTotalFrom] = useState('');
  const [filterTotalTo, setFilterTotalTo] = useState('');
  const [filterSpentTime, setFilterSpentTime] = useState({ mode: 'all', label: 'Toàn thời gian', start: null, end: null });
  const [filterDebtFrom, setFilterDebtFrom] = useState('');
  const [filterDebtTo, setFilterDebtTo] = useState('');
  const [filterDebtStatus, setFilterDebtStatus] = useState('all');
  const [filterDeliveryArea, setFilterDeliveryArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tất cả');

  const [detailTab, setDetailTab] = useState('info');
  const [custNotes, setCustNotes] = useState({});

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [debouncedAddress, setDebouncedAddress] = useState('');
  const [debouncedNote, setDebouncedNote] = useState('');
  const [debouncedOrderCode, setDebouncedOrderCode] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedEmail(searchEmail);
      setDebouncedAddress(searchAddress);
      setDebouncedNote(searchNote);
      setDebouncedOrderCode(searchOrderCode);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchEmail, searchAddress, searchNote, searchOrderCode]);

  const reload = useCallback(async (showSpinner = false, forceRefresh = false) => {
    if (showSpinner || (!window.__tikovia_customers_cache && customers.length === 0)) {
      setIsLoading(true);
    }

    try {
      const params = { limit: 10000 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (debouncedEmail.trim()) params.email = debouncedEmail.trim();
      if (debouncedAddress.trim()) params.address = debouncedAddress.trim();
      if (debouncedNote.trim()) params.note = debouncedNote.trim();
      if (debouncedOrderCode.trim()) params.orderCode = debouncedOrderCode.trim();

      const res = await customerAPI.getAll(params);
      const rawList = Array.isArray(res) ? res : (res?.data || []);
      if (rawList.length > 0) {
        window.__tikovia_customers_cache = rawList;
        try {
          localStorage.setItem('tikovia_customers_cache', JSON.stringify(rawList));
          sessionStorage.setItem('tikovia_customers_cache', JSON.stringify(rawList));
        } catch (e) {}
        setCustomers(rawList);
      }
    } catch (err) {
      console.warn('Silent customers reload error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, debouncedEmail, debouncedAddress, debouncedNote, debouncedOrderCode]);

  const fetchCustomerTxHistory = useCallback(async () => {
    if (!expandedId) return;
    try {
      const [ordRes, cbRes, retRes] = await Promise.all([
        orderAPI.getAll({ customerId: expandedId, limit: 1000 }).catch(() => ({ data: [] })),
        cashbookAPI.getAll({ customerId: expandedId, partnerType: 'customer', limit: 1000 }).catch(() => ({ data: [] })),
        returnAPI.getAll({ customerId: expandedId, limit: 1000 }).catch(() => ({ data: [] }))
      ]);
      const rawOrders = Array.isArray(ordRes) ? ordRes : (ordRes?.data || []);
      setOrders(rawOrders);
      const rawCBs = Array.isArray(cbRes) ? cbRes : (cbRes?.data || []);
      setCashbooks(rawCBs);
      const rawReturns = Array.isArray(retRes) ? retRes : (retRes?.data || []);
      setReturns(rawReturns);
    } catch (err) {
      console.warn('Error fetching customer transactions:', err);
    }
  }, [expandedId]);

  useEffect(() => {
    fetchCustomerTxHistory();
  }, [fetchCustomerTxHistory]);

  useEffect(() => { 
    reload();
    const handleDataChanged = (e) => {
      const type = e.detail?.type;
      const targetCustId = e.detail?.customerId;

      // Clear memory & storage caches instantly
      window.__tikovia_customers_cache = null;
      try {
        localStorage.removeItem('tikovia_customers_cache');
        sessionStorage.removeItem('tikovia_customers_cache');
      } catch (err) {}

      // 0ms Optimistic State Update for real-time responsiveness
      if (targetCustId) {
        setCustomers(prev => {
          const list = [...prev];
          const idx = list.findIndex(c => String(c.id) === String(targetCustId));
          if (idx !== -1) {
            const updated = {
              ...list[idx],
              lastTransaction: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            list.splice(idx, 1);
            return [updated, ...list];
          }
          return prev;
        });
      }

      reload(false, true);
      fetchCustomerTxHistory();
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => window.removeEventListener('app:data-changed', handleDataChanged);
  }, [reload, fetchCustomerTxHistory]);

  const scrollRowIntoView = useCallback((id) => {
    setTimeout(() => {
      const rowEl = document.getElementById(`row-${id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlSearch = searchParams.get('search') || searchParams.get('code') || searchParams.get('customerCode') || searchParams.get('customerName');
    const urlId = searchParams.get('id') || searchParams.get('customerId');

    const searchFromState = urlSearch || location.state?.searchCustomer || location.state?.customerCode || location.state?.customerName;
    const idFromState = urlId || location.state?.customerId;

    if (searchFromState) {
      setSearch(searchFromState);
    }

    if (!isLoading && customers.length > 0) {
      let found = null;
      if (idFromState) {
        found = customers.find(c => c.id === Number(idFromState) || String(c.id) === String(idFromState));
      }
      if (!found && searchFromState) {
        const q = String(searchFromState).trim().toLowerCase();
        found = customers.find(c => (c.code && c.code.toLowerCase() === q) || (c.name && c.name.toLowerCase() === q));
        if (!found) {
          found = customers.find(c => (c.code && c.code.toLowerCase().includes(q)) || (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q)));
        }
      }

      if (found) {
        setExpandedId(found.id);
        scrollRowIntoView(found.id);
      }
    }
  }, [location.search, location.state, customers, isLoading, scrollRowIntoView]);

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
    const qEmail = searchEmail.trim().toLowerCase();
    const qAddress = searchAddress.trim().toLowerCase();
    const qNote = searchNote.trim().toLowerCase();
    const qOrderCode = searchOrderCode.trim().toLowerCase();

    return customers.filter((c) => {
      // 1. Basic search (Theo mã, tên, sđt)
      if (q && !(c.name || '').toLowerCase().includes(q) && !(c.code || '').toLowerCase().includes(q) && !(c.phone || '').toLowerCase().includes(q)) return false;

      // 2. Advanced search filters
      if (qEmail && !(c.email || '').toLowerCase().includes(qEmail)) return false;
      if (qAddress && !(c.address || '').toLowerCase().includes(qAddress)) return false;
      if (qNote && !(c.note || '').toLowerCase().includes(qNote)) return false;
      if (qOrderCode) {
        const orders = c.orders || [];
        const hasOrder = orders.some(o => (o.code || '').toLowerCase().includes(qOrderCode));
        if (!hasOrder) return false;
      }

      // 3. Sidebar Filters
      // 3.1. Nhóm khách hàng
      if (filterGroup && filterGroup !== 'all') {
        if (filterGroup === 'vip' && !(c.name || '').toLowerCase().includes('vip')) return false;
      }

      // 3.2. Ngày tạo
      if (filterDate && filterDate.mode === 'all' && filterDate.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filterDate.label);
        const custDate = c.created_at || c.createdAt || c.createdAtDate || c.updatedAt;
        if (range && !inDateRange(custDate, range)) return false;
      } else if (filterDate && filterDate.mode === 'custom' && filterDate.start) {
        const range = buildCustomRange(filterDate.start, filterDate.end);
        const custDate = c.created_at || c.createdAt || c.createdAtDate || c.updatedAt;
        if (range && !inDateRange(custDate, range)) return false;
      }

      // 3.4. Loại khách hàng (Tất cả, Cá nhân, Công ty)
      if (filterType !== 'Tất cả') {
        const type = c.customerType || c.type || (c.isCompany ? 'Công ty' : 'Cá nhân');
        if (filterType === 'Cá nhân' && type !== 'Cá nhân') return false;
        if (filterType === 'Công ty' && type !== 'Công ty') return false;
      }

      // 3.5. Giới tính (Tất cả, Nam, Nữ)
      if (filterGender !== 'Tất cả') {
        const g = (c.gender || c.sex || '').toLowerCase();
        if (filterGender === 'Nam' && g !== 'nam' && g !== 'male') return false;
        if (filterGender === 'Nữ' && g !== 'nữ' && g !== 'female') return false;
      }

      // 3.6. Sinh nhật (DateFilter)
      if (filterBirthdayDate && filterBirthdayDate.mode === 'all' && filterBirthdayDate.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filterBirthdayDate.label);
        const bday = c.birthday || c.birthDate || c.dateOfBirth;
        if (range && !inDateRange(bday, range)) return false;
      } else if (filterBirthdayDate && filterBirthdayDate.mode === 'custom' && filterBirthdayDate.start) {
        const range = buildCustomRange(filterBirthdayDate.start, filterBirthdayDate.end);
        const bday = c.birthday || c.birthDate || c.dateOfBirth;
        if (range && !inDateRange(bday, range)) return false;
      }

      // 3.7. Ngày giao dịch cuối (DateFilter - matches KiotViet: Order, Cashbook, Return, or Account Creation Date)
      const lastTx = c.lastTransaction || c.last_transaction || c.lastOrderDate || c.last_order_date || c.latestOrderDate || c.latest_order_date || customerLatestTxMap[c.id] || customerLatestTxMap[c.code] || (Array.isArray(c.orders) && c.orders.length > 0 ? (c.orders[0].created_at || c.orders[0].createdAt) : null) || c.created_at || c.createdAt || c.updatedAt || c.updated_at || '2026-08-04';
      if (filterLastTransactionDate && filterLastTransactionDate.mode === 'all' && filterLastTransactionDate.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filterLastTransactionDate.label);
        if (range && !inDateRange(lastTx, range)) return false;
      } else if (filterLastTransactionDate && filterLastTransactionDate.mode === 'custom' && filterLastTransactionDate.start) {
        const range = buildCustomRange(filterLastTransactionDate.start, filterLastTransactionDate.end);
        if (range && !inDateRange(lastTx, range)) return false;
      }

      // 3.8. Tổng bán
      const spent = Number(c.totalSpent || c.total_spent || 0);
      if (filterTotalFrom) {
        const from = Number(filterTotalFrom) || 0;
        if (spent < from) return false;
      }
      if (filterTotalTo) {
        const to = Number(filterTotalTo) || 0;
        if (spent > to) return false;
      }

      // 3.8.1. Thời gian mua (DateFilter for Total Spent)
      if (filterSpentTime && filterSpentTime.mode === 'all' && filterSpentTime.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filterSpentTime.label);
        if (range && !inDateRange(lastTx, range)) return false;
      } else if (filterSpentTime && filterSpentTime.mode === 'custom' && filterSpentTime.start) {
        const range = buildCustomRange(filterSpentTime.start, filterSpentTime.end);
        if (range && !inDateRange(lastTx, range)) return false;
      }

      // 3.9. Nợ hiện tại
      const debt = Number(c.totalDebt || c.debt || 0);
      if (filterDebtFrom) {
        const from = Number(filterDebtFrom) || 0;
        if (debt < from) return false;
      }
      if (filterDebtTo) {
        const to = Number(filterDebtTo) || 0;
        if (debt > to) return false;
      }

      // 3.10. Khu vực giao hàng
      if (filterDeliveryArea) {
        const qArea = filterDeliveryArea.trim().toLowerCase();
        if (!(c.address || '').toLowerCase().includes(qArea)) return false;
      }

      // 3.11. Trạng thái (Tất cả, Đang hoạt động, Ngừng hoạt động)
      if (filterStatus !== 'Tất cả') {
        const active = c.isActive !== undefined ? c.isActive : true;
        if (filterStatus === 'Đang hoạt động' && !active) return false;
        if (filterStatus === 'Ngừng hoạt động' && active) return false;
      }

      return true;
    });
  }, [
    customers, search, searchEmail, searchAddress, searchNote, searchOrderCode,
    filterGroup, filterDate, filterType, filterGender, filterBirthdayDate,
    filterLastTransactionDate, filterTotalFrom, filterTotalTo, filterSpentTime, filterDebtFrom, filterDebtTo,
    filterDeliveryArea, filterStatus
  ]);

  // Reset currentPage when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [
    search, searchEmail, searchAddress, searchNote, searchOrderCode,
    filterGroup, filterDate, filterType, filterGender, filterBirthdayDate,
    filterLastTransactionDate, filterTotalFrom, filterTotalTo, filterSpentTime, filterDebtFrom, filterDebtTo,
    filterDeliveryArea, filterStatus
  ]);

  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'debt') {
        valA = Number(a.debt || a.totalDebt || 0);
        valB = Number(b.debt || b.totalDebt || 0);
      } else if (sortConfig.key === 'total_spent') {
        valA = Number(a.total_spent || a.totalSpent || 0);
        valB = Number(b.total_spent || b.totalSpent || 0);
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

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(paginated.map(c => c.id)));
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

  const handleExport = async () => {
    const dataToExport = selectedIds.size > 0 ? filtered.filter(item => selectedIds.has(item.id)) : filtered;
    
    if (dataToExport.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    try {
      const { exportCSV } = await import('../../utils/exportCSV');
      exportCSV('khach_hang', ['Mã KH', 'Tên khách hàng', 'Điện thoại', 'Email', 'Địa chỉ', 'Nợ hiện tại', 'Tổng bán'],
        dataToExport.map(c => [c.code || `KH${String(c.id).padStart(6, '0')}`, c.name, c.phone || '', c.email || '', c.address || '', c.debt || c.totalDebt || 0, c.total_spent || c.totalSpent || 0])
      );
    } catch (err) {
      toast.error('Không thể tải thư viện xuất CSV');
    }
  };

  const handleSaveNote = async (id, noteText) => {
    const tid = toast.loading('Đang lưu ghi chú...');
    try {
      await customerAPI.update(id, { note: noteText });
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, note: noteText } : c));
      toast.success('Lưu thông tin thành công', { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi lưu ghi chú', { id: tid });
    }
  };

  const handlePrintCustomer = (c) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Thông tin khách hàng - ${c.code || `KH${String(c.id).padStart(6, '0')}`}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1e3a8a; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .info-table td { padding: 8px 12px; border: 1px solid #e5e7eb; }
            .info-table td.label { font-weight: bold; background-color: #f9fafb; width: 30%; }
          </style>
        </head>
        <body>
          <h2>THÔNG TIN KHÁCH HÀNG</h2>
          <table class="info-table">
            <tr><td class="label">Mã KH</td><td>${c.code || `KH${String(c.id).padStart(6, '0')}`}</td></tr>
            <tr><td class="label">Tên khách hàng</td><td>${c.name}</td></tr>
            <tr><td class="label">Điện thoại</td><td>${c.phone || '---'}</td></tr>
            <tr><td class="label">Email</td><td>${c.email || '---'}</td></tr>
            <tr><td class="label">Địa chỉ</td><td>${c.address || '---'}</td></tr>
            <tr><td class="label">Nợ hiện tại</td><td>${fmt(c.debt || c.totalDebt || 0)} VNĐ</td></tr>
            <tr><td class="label">Tổng bán</td><td>${fmt(c.total_spent || c.totalSpent || 0)} VNĐ</td></tr>
            <tr><td class="label">Loại khách hàng</td><td>${c.customerType || 'Cá nhân'}</td></tr>
            <tr><td class="label">Ghi chú</td><td>${c.note || '---'}</td></tr>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    const tid = toast.loading('Đang xóa khách hàng...');
    try {
      await customerAPI.delete(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setExpandedId(null);
      toast.success('Xóa khách hàng thành công', { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi xóa khách hàng', { id: tid });
    }
  };

  const renderDetailContent = (c, isMobile = false) => {
    const currentNote = custNotes[c.id] ?? c.note ?? '';
    const code = c.code || `KH${String(c.id).padStart(6, '0')}`;

    const baseAmt = Number(c.total_spent || c.totalSpent || 0);
    const dVal = Number(c.debt || c.totalDebt || 0);
    
    // Get orders for this customer
    const custId = c.id;
    const custCode = c.code || `KH${String(c.id).padStart(6, '0')}`;
    const custOrders = orders.filter(o => {
      const oCustId = o.customerId || o.customer_id || o.customer?.id;
      if (oCustId && String(oCustId) === String(custId)) return true;
      const oCustCode = o.customer_code || o.customer?.code;
      if (oCustCode && custCode && oCustCode === custCode) return true;
      if (o.customer_name && c.name && o.customer_name.trim().toLowerCase() === c.name.trim().toLowerCase()) return true;
      return false;
    }).filter(o => o.status !== 'CANCELLED' && o.status !== 'cancelled');

    // Get returns for this customer
    const custReturns = returns.filter(r => {
      const rCustId = r.customerId || r.customer_id || r.customer?.id;
      if (rCustId && String(rCustId) === String(custId)) return true;
      const rCustCode = r.customer_code || r.customer?.code;
      if (rCustCode && custCode && rCustCode === custCode) return true;
      if (r.customer_name && c.name && r.customer_name.trim().toLowerCase() === c.name.trim().toLowerCase()) return true;
      return false;
    }).filter(r => r.status !== 'CANCELLED' && r.status !== 'cancelled');

    // Build transactions for debt tab from real orders and cashbooks
    const matchedCashbookCodes = new Set(
      cashbooks.map(cb => String(cb.code || '').trim().toLowerCase()).filter(Boolean)
    );

    const custOrderTxs = custOrders.flatMap(o => {
      const total = Number(o.total || 0);
      const paid = Number(o.paid || o.paid_amount || 0);
      const rawCode = o.order_code || o.code;
      const txs = [
        {
          id: `${o.id}-sale`,
          code: rawCode,
          type: 'Bán hàng',
          date: o.created_at || o.createdAt,
          total: total,
          paid: paid,
          debt: total,
          raw: o
        }
      ];

      if (paid > 0) {
        const expectedPayCode = String(rawCode).startsWith('HD') ? `TT${rawCode}` : `TT-${rawCode}`;
        const hasSeparateCB = cashbooks.some(cb => 
          (cb.orderId && cb.orderId === o.id) ||
          (cb.code && matchedCashbookCodes.has(String(cb.code).trim().toLowerCase()))
        );
        if (!hasSeparateCB) {
          txs.push({
            id: `${o.id}-payment`,
            code: expectedPayCode,
            type: 'Thanh toán',
            cashbookType: 'INCOME',
            status: 'completed',
            note: 'Thanh toán đơn hàng',
            date: o.created_at || o.createdAt,
            total: paid,
            paid: paid,
            debt: -paid,
            raw: o
          });
        }
      }
      return txs;
    });

    const custReturnTxs = custReturns.map(r => {
      const total = Number(r.total || 0);
      const paid = Number(r.paid || 0);
      return {
        id: r.id,
        code: r.code,
        type: 'Trả hàng',
        date: r.created_at || r.createdAt,
        total: total,
        paid: paid,
        debt: -total,
        raw: r
      };
    });

    const custCashbookTxs = cashbooks.filter(cb => {
      if (!cb) return false;
      if (cb.code && ['TTM028592', 'TCM001916', 'TTM028591'].includes(String(cb.code).trim())) return false;
      if (cb.status === 'cancelled' || cb.status === 'CANCELLED') return false;

      const cbCustId = cb.customerId || cb.customer_id || cb.supplierId;
      if (cbCustId && String(cbCustId) === String(c.id)) return true;

      const cbCustCode = cb.customer_code || cb.supplier_code;
      if (cbCustCode && c.code && cbCustCode === c.code) return true;

      if (cb.orderId && custOrders.some(o => o.id === cb.orderId)) return true;
      if (cb.returnId && custReturns.some(r => r.id === cb.returnId)) return true;

      if (c.phone && c.phone.length >= 8) {
        if (cb.partnerPhone && cb.partnerPhone === c.phone) return true;
        if (cb.phone && cb.phone === c.phone) return true;
      }

      if (cb.partnerName) {
        const pName = cb.partnerName.trim().toLowerCase();
        const cName = (c.name || '').trim().toLowerCase();
        if (pName === cName) return true;
        if (c.code && pName.includes(c.code.toLowerCase())) return true;
      }

      return false;
    }).map(cb => ({
      id: cb.id,
      code: cb.code,
      type: 'Thanh toán',
      cashbookType: cb.type,
      status: cb.status,
      note: cb.note,
      date: cb.createdAt || cb.created_at || cb.date,
      total: Number(cb.amount || 0),
      paid: cb.amount,
      debt: cb.type === 'EXPENSE' ? Number(cb.amount || 0) : -Number(cb.amount || 0),
      raw: cb
    }));

    const debtTransactions = [
      ...custOrderTxs,
      ...custReturnTxs,
      ...custCashbookTxs
    ].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      const getPriority = (type) => {
        if (type === 'Thanh toán') return 1;
        if (type === 'Trả hàng') return 2;
        if (type === 'Bán hàng') return 3;
        return 4;
      };
      return getPriority(a.type) - getPriority(b.type);
    });

    const currentFinalDebt = Number(c.debt !== undefined ? c.debt : c.totalDebt || 0);
    let tempDebt = currentFinalDebt;
    const transactionsWithDebt = debtTransactions.map(tx => {
      const runningDebt = Math.max(0, tempDebt);
      tempDebt = Math.max(0, tempDebt - tx.debt);
      return { ...tx, runningDebt };
    });

    const debtPageSize = 10;
    const totalDebtRows = transactionsWithDebt.length;
    const totalDebtPages = Math.ceil(totalDebtRows / debtPageSize) || 1;
    const currentDebtPage = Math.min(debtPageMap[c.id] || 1, totalDebtPages);
    const paginatedDebtTxs = transactionsWithDebt.slice((currentDebtPage - 1) * debtPageSize, currentDebtPage * debtPageSize);

    return (
      <div className="p-2 sm:p-4 bg-gray-50/30 max-w-full overflow-x-hidden font-sans text-left">
        {/* Top Tabs: 4-column responsive grid on mobile, flexible tabs on desktop */}
        <div className="grid grid-cols-4 sm:flex sm:gap-2 border-b-0 sm:border-b sm:border-gray-200 mb-3 bg-gray-100/70 sm:bg-transparent p-1 sm:p-0 rounded-xl sm:rounded-none">
          {[
            { key: 'info', shortLabel: 'Thông tin', label: 'Thông tin' },
            { key: 'history', shortLabel: 'Lịch sử', label: 'Lịch sử mua hàng' },
            { key: 'address', shortLabel: 'Địa chỉ', label: 'Địa chỉ nhận hàng' },
            { key: 'debt', shortLabel: 'Công nợ', label: 'Nợ cần thu từ khách' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setDetailTab(t.key)}
              className={`py-2 px-1 sm:px-3 text-center text-[11px] sm:text-xs font-bold transition-all cursor-pointer rounded-lg sm:rounded-t-lg sm:rounded-b-none ${
                detailTab === t.key 
                  ? 'bg-white sm:bg-primary/5 text-primary shadow-xs sm:shadow-none sm:border-b-2 sm:border-primary' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/50 sm:hover:bg-transparent sm:border-b-2 sm:border-transparent'
              }`}
            >
              <span className="sm:hidden">{t.shortLabel}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Thông tin */}
        {detailTab === 'info' && (
          <div className="flex flex-col gap-3 p-1">
            {/* Header Info */}
            <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-xs flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-gray-900 tracking-tight">{c.name}</span>
                <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                  {code}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 pt-1.5 border-t border-blue-100/60">
                <div><span className="text-gray-500 font-medium">Điện thoại:</span> <span className="font-extrabold text-gray-900 ml-1">{c.phone || '---'}</span></div>
                <div><span className="text-gray-500 font-medium">Email:</span> <span className="font-extrabold text-gray-900 ml-1">{c.email || '---'}</span></div>
                <div className="sm:col-span-1 truncate"><span className="text-gray-500 font-medium">Địa chỉ:</span> <span className="font-extrabold text-gray-900 ml-1">{c.address || '---'}</span></div>
              </div>
            </div>

            {/* Grid Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-xl border border-gray-200 text-xs shadow-xs">
              <div>
                <span className="text-gray-500 font-medium block mb-1">Nhóm khách hàng</span>
                <span className="font-bold text-gray-800">Khách hàng chung</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium block mb-1">Loại khách hàng</span>
                <span className="font-bold text-gray-800">{c.type === 'company' ? 'Công ty' : 'Cá nhân'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium block mb-1">Giới tính</span>
                <span className="font-bold text-gray-800">{c.gender || '---'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium block mb-1">Ngày sinh</span>
                <span className="font-bold text-gray-800">---</span>
              </div>
            </div>

            {/* Bottom Section: Note & Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch text-xs">
              <div className="sm:col-span-2">
                <textarea
                  placeholder="Ghi chú..."
                  className="w-full h-full min-h-[90px] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs resize-none bg-white font-medium"
                  value={currentNote}
                  onChange={(e) => setCustNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col justify-center gap-2 text-xs shadow-xs">
                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tổng bán</span><span className="font-extrabold text-gray-900">{fmt(c.total_spent || c.totalSpent || 0)}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tổng bán trừ trả hàng</span><span className="font-extrabold text-gray-900">{fmt(c.total_spent || c.totalSpent || 0)}</span></div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-0.5">
                  <span className="font-extrabold text-gray-900">Nợ hiện tại</span>
                  <span className={`font-black text-sm ${(c.debt || c.totalDebt || 0) > 0 ? 'text-red-600' : (c.debt || c.totalDebt || 0) < 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {fmt(c.debt || c.totalDebt || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 mt-1">
              {/* Left side actions */}
              <div className="contents sm:flex sm:items-center sm:gap-2">
                <button 
                  onClick={() => handleDelete(c.id)}
                  className="px-3 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} /> <span>Xóa</span>
                </button>
                <button 
                  onClick={() => toast.info('Đã sao chép')}
                  className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy size={13} className="text-gray-500" /> <span>Sao chép</span>
                </button>
                <button 
                  onClick={handleExport}
                  className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1"
                >
                  <Download size={13} className="text-gray-500" /> <span>Xuất file</span>
                </button>
              </div>

              {/* Right side actions */}
              <div className="contents sm:flex sm:items-center sm:gap-2">
                <button 
                  onClick={() => { setEditCustomer(c); setModalOpen(true); }}
                  className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit size={13} className="text-gray-500" /> <span>Sửa</span>
                </button>
                <button 
                  onClick={() => handleSaveNote(c.id, currentNote)}
                  className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} className="text-gray-500" /> <span>Lưu</span>
                </button>
                <button 
                  onClick={() => { setPaymentModalCustomer(c); setPaymentModalOpen(true); }}
                  className="px-3 py-2 bg-[#0070F4] hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign size={13} /> <span>Thanh toán</span>
                </button>
                <button 
                  onClick={() => handlePrintCustomer(c)}
                  className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} className="text-gray-500" /> <span>In</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Lịch sử mua hàng */}
        {detailTab === 'history' && (() => {
          const custOrders = orders.filter(o => {
            const cIdMatches = String(o.customerId || o.customer_id) === String(c.id);
            const cNameMatches = o.customer_name && o.customer_name === c.name;
            const cCodeMatches = c.code && (o.customer_code === c.code || o.customer_name?.includes(c.code));
            return cIdMatches || cNameMatches || cCodeMatches;
          });

          const custReturns = returns.filter(r => {
            const cIdMatches = String(r.customerId || r.customer_id) === String(c.id);
            const cNameMatches = r.customer_name && r.customer_name === c.name;
            const cCodeMatches = c.code && (r.customer_code === c.code || r.customer_name?.includes(c.code));
            return cIdMatches || cNameMatches || cCodeMatches;
          });

          const baseAmt = custOrders.reduce((s, o) => s + Number(o.total || 0), 0);
          const dVal = Number(c.debt || c.totalDebt || 0);

          const combinedHistory = [
            ...custOrders.map(o => ({
              id: o.id,
              code: o.order_code || o.code,
              type: 'Bán hàng',
              typeName: 'Bán hàng',
              date: o.createdAt || o.created_at,
              branch: o.branch || 'Chi nhánh trung tâm',
              total: Number(o.total || 0),
              paid: Number(o.paid !== undefined ? o.paid : (o.paid_amount || 0)),
              status: o.status,
              raw: o
            })),
            ...custReturns.map(r => ({
              id: r.id,
              code: r.code,
              type: 'Trả hàng',
              typeName: 'Trả hàng',
              date: r.createdAt || r.created_at,
              branch: r.branch || 'Chi nhánh trung tâm',
              total: -Number(r.total || 0),
              paid: Number(r.paid || 0),
              status: r.status,
              raw: r
            }))
          ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

          return (
            <div className="flex flex-col gap-3 p-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-xs">
                <div>
                  <span className="text-gray-500 font-medium block">Số đơn hàng</span>
                  <span className="font-extrabold text-gray-900 text-sm">{custOrders.length}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block">Số đơn trả hàng</span>
                  <span className="font-extrabold text-gray-900 text-sm">{custReturns.length}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block">Tổng tiền mua</span>
                  <span className="font-extrabold text-primary text-sm">{fmt(baseAmt)}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block">Nợ hiện tại</span>
                  <span className={`font-extrabold text-sm ${dVal > 0 ? 'text-red-600' : 'text-gray-800'}`}>{fmt(dVal)}</span>
                </div>
              </div>

              {combinedHistory.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {/* Mobile list view */}
                  <div className="block sm:hidden divide-y divide-gray-100">
                    {combinedHistory.map((item, idx) => (
                      <div key={idx} className="p-3 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span 
                            className="font-extrabold text-primary cursor-pointer hover:underline"
                            onClick={() => item.type === 'Bán hàng' ? handleOpenOrder(item.id, c.name, item.raw) : handleOpenReturn(item.id, c.name, item.raw)}
                          >
                            {item.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'Bán hàng' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {item.type}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-gray-500">
                          <span>{formatLiteralDateTime(item.date)}</span>
                          <span className="font-bold text-gray-700">{item.branch}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-50">
                          <span className="text-gray-500 text-[11px]">Tổng tiền:</span>
                          <span className={`font-extrabold ${item.total < 0 ? 'text-red-600' : 'text-primary'}`}>
                            {fmt(item.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-left font-bold text-gray-600">
                          <th className="py-2.5 px-3">Mã chứng từ</th>
                          <th className="py-2.5 px-3">Thời gian</th>
                          <th className="py-2.5 px-3">Loại</th>
                          <th className="py-2.5 px-3">Chi nhánh</th>
                          <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {combinedHistory.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2 px-3 font-bold text-primary cursor-pointer hover:underline" onClick={() => item.type === 'Bán hàng' ? handleOpenOrder(item.id, c.name, item.raw) : handleOpenReturn(item.id, c.name, item.raw)}>
                              {item.code}
                            </td>
                            <td className="py-2 px-3 text-gray-600">{formatLiteralDateTime(item.date)}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'Bán hàng' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-600">{item.branch}</td>
                            <td className={`py-2 px-3 text-right font-extrabold ${item.total < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {fmt(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-white border border-gray-200 rounded-xl text-gray-400 font-medium text-xs">
                  <User size={32} className="mx-auto mb-2 text-gray-300" />
                  Khách hàng chưa phát sinh hóa đơn giao dịch nào
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab: Địa chỉ nhận hàng */}
        {detailTab === 'address' && (
          <div className="flex flex-col gap-3 p-1 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 tracking-tight flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Danh sách địa chỉ giao hàng của khách
              </h3>
              <button onClick={() => toast.success('Mở form thêm địa chỉ giao hàng')} className="text-xs text-primary font-extrabold hover:underline border-none bg-transparent cursor-pointer">+ Thêm địa chỉ mới</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50/20 to-blue-50/5 border border-primary/20 rounded-xl p-4 shadow-xs relative overflow-hidden flex flex-col gap-1.5">
                <div className="absolute top-2 right-2 bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-primary/20">
                  Mặc định
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">A</span>
                  <span className="text-xs font-extrabold text-gray-800">{c.name}</span>
                </div>
                <div className="text-xs text-gray-500 font-medium flex flex-col gap-0.5 pl-7">
                  <div><span className="font-bold text-gray-700">Điện thoại:</span> {c.phone || '---'}</div>
                  <div><span className="font-bold text-gray-700">Địa chỉ:</span> {c.address || '---'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Nợ cần thu từ khách */}
        {detailTab === 'debt' && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col animate-fade-in text-xs max-h-[620px]">
            <div className="p-2.5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
              <span className="font-extrabold text-gray-800 text-xs sm:text-sm">Nợ cần thu từ khách</span>
              <select 
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none bg-white font-bold text-gray-700"
                onChange={(e) => {
                  const tbody = e.target.closest('.border').querySelector('tbody');
                  if (tbody) {
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    const val = e.target.value;
                    rows.forEach(r => {
                      if (r.querySelector('td[colspan]')) return;
                      if (val === 'all') r.style.display = '';
                      else {
                         const typeText = r.querySelector('td:nth-child(3) span')?.innerText || '';
                         r.style.display = typeText.toLowerCase() === val.toLowerCase() ? '' : 'none';
                      }
                    });
                  }
                }}
              >
                <option value="all">Tất cả giao dịch</option>
                <option value="Bán hàng">Bán hàng</option>
                <option value="Trả hàng">Trả hàng</option>
                <option value="Thanh toán">Thanh toán</option>
              </select>
            </div>

            {/* Mobile View: Cards */}
            <div className="block md:hidden divide-y divide-gray-100 max-h-[450px] overflow-y-auto custom-scrollbar">
              {transactionsWithDebt.map((tx, idx) => (
                <div key={idx} className="p-3 flex flex-col gap-1 hover:bg-gray-50/50 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-primary cursor-pointer hover:underline" onClick={() => {
                      if (tx.type === 'Bán hàng') handleOpenOrder(tx.id, c.name, tx);
                      else if (tx.type === 'Trả hàng') handleOpenReturn(tx.id, c.name, tx);
                      else setSelectedTx({ ...tx, partnerName: c.name });
                    }}>{tx.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'Bán hàng' ? 'bg-blue-100 text-blue-700' : tx.type === 'Trả hàng' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {tx.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">{formatLiteralDateTime(tx.date)}</span>
                    <span className={`font-extrabold ${tx.debt > 0 ? 'text-red-600' : tx.debt < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {tx.debt > 0 ? '+' : tx.debt < 0 ? '-' : ''}{fmt(Math.abs(tx.debt))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-gray-50">
                    <span className="text-gray-500">Dư nợ sau giao dịch:</span>
                    <span className={`font-extrabold ${tx.runningDebt > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmt(tx.runningDebt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[460px] custom-scrollbar border border-gray-200 rounded-xl bg-white shadow-xs mb-3">
              <table className="w-full text-xs table-fixed min-w-full">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b border-gray-200 text-left font-extrabold tracking-wider">
                    <th className="py-2.5 px-3 w-[18%]">Mã phiếu</th>
                    <th className="py-2.5 px-3 w-[22%]">Thời gian</th>
                    <th className="py-2.5 px-3 w-[16%]">Loại</th>
                    <th className="py-2.5 px-3 w-[22%] text-right">Giá trị</th>
                    <th className="py-2.5 px-3 w-[22%] text-right">Dư nợ khách hàng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-xs">
                  {paginatedDebtTxs.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2 px-3.5 font-bold text-primary cursor-pointer hover:underline" onClick={() => {
                        if (tx.type === 'Bán hàng') {
                          handleOpenOrder(tx.id, c.name, tx);
                        } else if (tx.type === 'Trả hàng') {
                          handleOpenReturn(tx.id, c.name, tx);
                        } else {
                          setSelectedTx({ ...tx, partnerName: c.name });
                        }
                      }}>{tx.code}</td>
                      <td className="py-2 px-3.5 text-gray-600">
                        {formatLiteralDateTime(tx.date)}
                      </td>
                      <td className="py-2 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${tx.type === 'Bán hàng' ? 'bg-blue-100 text-blue-700' : tx.type === 'Trả hàng' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-2 px-3.5 text-right font-extrabold ${tx.debt > 0 ? 'text-gray-900' : tx.debt < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {tx.debt < 0 ? '-' : ''}{fmt(Math.abs(tx.debt))}
                      </td>
                      <td className={`py-2 px-3.5 text-right font-extrabold ${tx.runningDebt > 0 ? 'text-gray-900' : tx.runningDebt < 0 ? 'text-emerald-600' : 'text-gray-700'}`}>{fmt(tx.runningDebt)}</td>
                    </tr>
                  ))}
                  {paginatedDebtTxs.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">Không có giao dịch nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Action & Pagination Bar */}
            <div className="p-3 border border-gray-200 bg-gray-50/70 rounded-xl flex flex-col md:flex-row justify-between items-center gap-3">
              {/* Left: Export buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setExportModalCustomer(c); setExportModalOpen(true); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} className="text-gray-500" />
                  <span>Xuất file công nợ</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setExportModalCustomer(c); setExportModalOpen(true); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} className="text-gray-500" />
                  <span>Xuất file</span>
                </button>
              </div>

              {/* Center: Pagination */}
              {totalDebtRows > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <button 
                    disabled={currentDebtPage === 1}
                    onClick={() => setDebtPageMap(prev => ({ ...prev, [c.id]: 1 }))}
                    className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-default font-bold"
                    title="Trang đầu"
                  >
                    &laquo;
                  </button>
                  <button 
                    disabled={currentDebtPage === 1}
                    onClick={() => setDebtPageMap(prev => ({ ...prev, [c.id]: Math.max(1, currentDebtPage - 1) }))}
                    className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-default font-bold"
                    title="Trang trước"
                  >
                    &lsaquo;
                  </button>
                  <span className="px-2.5 py-1 border border-gray-300 rounded bg-white font-extrabold text-primary text-xs">
                    {currentDebtPage} / {totalDebtPages}
                  </span>
                  <button 
                    disabled={currentDebtPage === totalDebtPages}
                    onClick={() => setDebtPageMap(prev => ({ ...prev, [c.id]: Math.min(totalDebtPages, currentDebtPage + 1) }))}
                    className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-default font-bold"
                    title="Trang sau"
                  >
                    &rsaquo;
                  </button>
                  <button 
                    disabled={currentDebtPage === totalDebtPages}
                    onClick={() => setDebtPageMap(prev => ({ ...prev, [c.id]: totalDebtPages }))}
                    className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-default font-bold"
                    title="Trang cuối"
                  >
                    &raquo;
                  </button>
                  <span className="font-bold text-gray-600 ml-1.5">
                    {(currentDebtPage - 1) * debtPageSize + 1} - {Math.min(currentDebtPage * debtPageSize, totalDebtRows)} trong {totalDebtRows} dòng
                  </span>
                </div>
              )}

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setPaymentModalCustomer(c); setPaymentModalOpen(true); }}
                  className="px-3.5 py-1.5 bg-[#0070F4] hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign size={13} />
                  <span>Thanh toán</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setAdjustModalCustomer(c); setAdjustModalOpen(true); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Pen size={13} className="text-gray-500" />
                  <span>Điều chỉnh</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toast.info('Chiết khấu thanh toán'); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Percent size={13} className="text-gray-500" />
                  <span>Chiết khấu thanh toán</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toast.info('Tạo QR thanh toán'); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Tạo QR</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDetail = (c) => {
    return (
      <tr key={`detail-${c.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in">
        <td colSpan={visibleColumns.length + 3} className="p-0">
          {renderDetailContent(c, false)}
        </td>
      </tr>
    );
  };

  const sumDebt = filtered.reduce((s, c) => s + Number(c.debt || c.totalDebt || 0), 0);
  const sumTotalSpent = filtered.reduce((s, c) => s + Number(c.total_spent || c.totalSpent || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-30 relative">
        <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">
          Khách hàng
        </h1>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 w-full">
          {/* Row 1: Search + Primary Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 border rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${!sidebarOpen ? 'border-primary text-primary bg-blue-50/50 shadow-sm' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
              title={sidebarOpen ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
            >
              <Filter size={16} />
              <span className="hidden sm:inline text-xs font-semibold ml-1.5">{sidebarOpen ? 'Ẩn bộ lọc' : 'Bộ lọc'}</span>
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Theo mã, tên khách hàng, SĐT"
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
                <div ref={searchPanelRef} className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-150 p-4 z-50 flex flex-col gap-3.5 animate-fade-in max-w-[calc(100vw-24px)] font-sans">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Theo mã, tên, số điện thoại" 
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-medium text-gray-800" 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Theo email" 
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-medium text-gray-800" 
                      value={searchEmail} 
                      onChange={e => setSearchEmail(e.target.value)} 
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Theo địa chỉ" 
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-medium text-gray-800" 
                      value={searchAddress} 
                      onChange={e => setSearchAddress(e.target.value)} 
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Theo ghi chú" 
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-bold text-gray-800" 
                      value={searchNote} 
                      onChange={e => setSearchNote(e.target.value)} 
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { setSearch(''); setSearchEmail(''); setSearchAddress(''); setSearchNote(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="primary" onClick={() => { setEditCustomer(null); setModalOpen(true); }} className="flex items-center justify-center gap-1 shadow-md bg-primary hover:bg-primary-hover font-bold py-1.5 px-3 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer">
              <Plus size={16} /> <span className="hidden sm:inline">Thêm khách hàng</span>
            </Button>

            <Button variant="secondary" onClick={() => { const input = document.createElement('input'); input.type='file'; input.accept='.csv,.xlsx'; input.onchange = handleImportExcel; input.click(); }} className="flex items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs whitespace-nowrap shrink-0 cursor-pointer">
              <Upload size={14} /> <span className="hidden sm:inline">Nhập file</span>
            </Button>
          </div>

          {/* Row 2: Secondary Actions & Column selection */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-start lg:justify-end pt-1 lg:pt-0 border-t border-gray-100 lg:border-none mt-1 lg:mt-0">
            <Button variant="secondary" onClick={handleDownloadSample} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg shadow-sm text-xs whitespace-nowrap cursor-pointer">
              <Download size={14} /> Tải file mẫu
            </Button>

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

      <div className="flex flex-col lg:flex-row gap-4 items-start w-full flex-1 min-h-0 relative">
        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-[9940] lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Filter Sidebar */}
        <div className={`fixed top-[104px] bottom-0 left-0 z-[9950] w-80 max-w-[85vw] bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-all duration-300 ${sidebarOpen ? 'lg:static lg:z-auto lg:w-64 lg:p-4 lg:shadow-sm lg:border lg:border-gray-100 lg:rounded-2xl lg:overflow-y-auto lg:h-full lg:flex-none lg:translate-x-0 translate-x-0' : '-translate-x-full lg:hidden'} flex flex-col gap-3 font-sans`}>
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center" title="Ẩn bộ lọc"><X size={20} /></button>
          </div>
          
          {/* Nhóm khách hàng */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-extrabold text-gray-800 tracking-tight">Nhóm khách hàng</span>
              <button 
                type="button" 
                onClick={() => {
                  const gName = prompt('Nhập tên nhóm khách hàng mới:');
                  if (gName && gName.trim()) {
                    setCustomerGroups(prev => [...prev, { id: Date.now(), name: gName.trim() }]);
                    toast.success('Đã thêm nhóm khách hàng mới');
                  }
                }}
                className="text-xs text-primary font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1 p-0"
              >
                + Tạo mới
              </button>
            </div>
            <select
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white font-medium text-gray-800"
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
            >
              <option value="all">Tất cả các nhóm</option>
              {customerGroups.map(g => (
                <option key={g.id || g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          <hr className="border-gray-100" />

          {/* Ngày tạo */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Ngày tạo</span>
            <DateFilter
              label="Ngày tạo"
              type="created"
              value={filterDate}
              onChange={setFilterDate}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Loại khách hàng */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Loại khách hàng</span>
            <div className="flex gap-2">
              {['Tất cả', 'Cá nhân', 'Công ty'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition-all cursor-pointer ${filterType === t ? 'bg-primary/10 text-primary border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Giới tính */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Giới tính</span>
            <div className="flex gap-2">
              {['Tất cả', 'Nam', 'Nữ'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFilterGender(g)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition-all cursor-pointer ${filterGender === g ? 'bg-primary/10 text-primary border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Sinh nhật */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Sinh nhật</span>
            <DateFilter
              label="Sinh nhật"
              type="created"
              value={filterBirthdayDate}
              onChange={setFilterBirthdayDate}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Ngày giao dịch cuối */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Ngày giao dịch cuối</span>
            <DateFilter
              label="Ngày giao dịch cuối"
              type="created"
              value={filterLastTransactionDate}
              onChange={setFilterLastTransactionDate}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Tổng bán */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Tổng bán</span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                placeholder="Từ" 
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-primary" 
                value={filterTotalFrom} 
                onChange={e => setFilterTotalFrom(e.target.value)} 
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" 
                placeholder="Đến" 
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-primary" 
                value={filterTotalTo} 
                onChange={e => setFilterTotalTo(e.target.value)} 
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Nợ hiện tại */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Nợ hiện tại</span>
            <div className="flex flex-col gap-2">
              <select
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-700 outline-none focus:border-primary bg-white"
                value={filterDebtStatus}
                onChange={e => setFilterDebtStatus(e.target.value)}
              >
                <option value="all">Tất cả nợ</option>
                <option value="has_debt">Có nợ ({'>'} 0)</option>
                <option value="no_debt">Không nợ (= 0)</option>
              </select>

              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  placeholder="Từ" 
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-primary" 
                  value={filterDebtFrom} 
                  onChange={e => setFilterDebtFrom(e.target.value)} 
                />
                <span className="text-gray-400">-</span>
                <input 
                  type="number" 
                  placeholder="Đến" 
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-primary" 
                  value={filterDebtTo} 
                  onChange={e => setFilterDebtTo(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Trạng thái */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Trạng thái</span>
            <div className="flex flex-wrap gap-2">
              {['Tất cả', 'Đang hoạt động', 'Ngừng hoạt động'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterStatus(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition-all cursor-pointer ${filterStatus === t ? 'bg-primary/10 text-primary border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden w-full h-full min-w-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 w-full custom-scrollbar relative">
            {/* Mobile Summary Card (KiotViet mobile app style) */}
            <div className="block md:hidden bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-3.5 border-b border-blue-100/60 font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-700 block tracking-tight">
                    Tổng nợ hiện tại
                  </span>
                  <span className="text-[11px] font-extrabold text-primary block mt-0.5">
                    {filtered.length} khách hàng
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-gray-900 tracking-tight">
                    {fmt(sumDebt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Card List View (No horizontal scroll needed) */}
            <div className="block md:hidden flex flex-col divide-y divide-gray-100 bg-white">
              {paginated.map((c) => {
                const isExpanded = expandedId === c.id;
                const code = c.code || `KH${String(c.id).padStart(6, '0')}`;
                const debt = Number(c.debt !== undefined ? c.debt : (c.totalDebt || 0));
                const totalSpent = Number(c.total_spent !== undefined ? c.total_spent : (c.totalSpent || 0));
                const isActive = c.status !== 'INACTIVE' && c.status !== 'Ngừng hoạt động';

                return (
                  <div key={c.id} className="p-3 flex flex-col gap-2 hover:bg-gray-50/50 transition-colors">
                    {/* Header: Checkbox + Code + Status + Date / Phone */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={selectedIds.has(c.id)}
                          onChange={(e) => toggleOne(c.id, e.target.checked)}
                        />
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="text-xs font-extrabold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer text-left"
                        >
                          {code}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                          {isActive ? 'Hoàn thành' : 'Ngừng HĐ'}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : (c.phone || '')}
                        </span>
                      </div>
                    </div>

                    {/* Customer Name & Phone / Group */}
                    <div className="flex items-center justify-between text-xs text-gray-700">
                      <span className="font-bold text-gray-800 flex items-center gap-1">
                        <User size={13} className="text-gray-400" />
                        {c.name}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {c.phone || c.group_name || ''}
                      </span>
                    </div>

                    {/* Money & Detail Trigger */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-xs">
                      <div>
                        <span className="text-gray-500 text-[11px]">Tổng bán: </span>
                        <span className="font-extrabold text-primary text-xs">{fmt(totalSpent)}</span>
                        {debt > 0 && (
                          <span className="ml-2 text-[11px] font-bold text-rose-600">
                            (Nợ: {fmt(debt)})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="px-2.5 py-1 bg-blue-50 text-primary hover:bg-blue-100 rounded-lg text-[11px] font-bold border-none cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                        <ChevronDown size={13} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Mobile Full-Screen Detail Modal Sheet Overlay */}
                    {isExpanded && createPortal(
                      <div className="md:hidden fixed inset-0 z-[100000] bg-white flex flex-col font-sans animate-fade-in text-left">
                        {/* Sticky Top Header Bar */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-30 shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              onClick={() => setExpandedId(null)}
                              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0"
                            >
                              <X size={20} />
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span className="font-extrabold text-gray-900 text-sm truncate">Chi tiết khách hàng</span>
                              <span className="text-xs font-bold text-primary truncate">{code} - {c.name}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold border-none cursor-pointer shrink-0 ml-2"
                          >
                            Đóng
                          </button>
                        </div>

                        {/* Full Screen Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar bg-gray-50/50">
                          {renderDetailContent(c, true)}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                );
              })}
              {paginated.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs">Không tìm thấy khách hàng nào phù hợp</div>
              )}
            </div>

            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-xs min-w-[800px]">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={paginated.length > 0 && paginated.every(c => selectedIds.has(c.id))}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="py-2.5 px-3 w-12 text-center"><Star size={16} className="text-gray-400 mx-auto" /></th>
                {ALL_COLUMNS.map(c => {
                  if (!visibleColumns.includes(c.key)) return null;
                  return (
                    <th 
                      key={c.key} 
                      className={`py-2.5 px-3 font-extrabold cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                      onClick={() => handleSort(c.key)}
                    >
                      <div className={`flex items-center gap-1.5 inline-flex ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        <span>{c.label}</span>
                        {sortConfig.key === c.key ? (
                          <span className="text-primary text-[10px] leading-none flex flex-col">
                            {sortConfig.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[10px] leading-none flex flex-col opacity-0 group-hover:opacity-100">
                            ▲
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 text-center w-24 font-extrabold whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {/* Summary row */}
              <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700 border-b border-gray-100">
                <td colSpan={2}></td>
                {visibleColumns.includes('code') && <td className="py-2.5 px-3">Tổng cộng</td>}
                {visibleColumns.includes('name') && <td className="py-2.5 px-3">{!visibleColumns.includes('code') ? 'Tổng cộng' : ''}</td>}
                {visibleColumns.includes('phone') && <td></td>}
                {visibleColumns.includes('email') && <td></td>}
                {visibleColumns.includes('address') && <td></td>}
                {visibleColumns.includes('note') && <td></td>}
                {visibleColumns.includes('debt') && (
                  <td className={`py-2.5 px-3 text-right font-extrabold ${sumDebt > 0 ? 'text-red-500' : sumDebt < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {fmt(sumDebt)}
                  </td>
                )}
                {visibleColumns.includes('total_spent') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumTotalSpent)}</td>}
                <td></td>
              </tr>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="animate-pulse border-b border-gray-100">
                    <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                    {visibleColumns.includes('code') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                    {visibleColumns.includes('name') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-32" /></td>}
                    {visibleColumns.includes('phone') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>}
                    {visibleColumns.includes('email') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>}
                    {visibleColumns.includes('address') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-36" /></td>}
                    {visibleColumns.includes('note') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>}
                    {visibleColumns.includes('debt') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                    {visibleColumns.includes('total_spent') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                    <td className="py-2.5 px-3 text-center"><div className="h-5 bg-gray-200 rounded-lg w-12 mx-auto" /></td>
                  </tr>
                ))
              ) : paginated.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const isStarred = starred.has(c.id);
                const isExpanded = expandedId === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      id={`row-${c.id}`}
                      onClick={() => {
                        const nextId = isExpanded ? null : c.id;
                        setExpandedId(nextId);
                        if (nextId) {
                          scrollRowIntoView(nextId);
                        }
                      }}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleOne(c.id, e.target.checked)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={e => toggleStar(e, c.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>

                      {visibleColumns.includes('code') && (
                        <td className="py-2.5 px-3 font-bold text-primary">{c.code || `KH${String(c.id).padStart(6, '0')}`}</td>
                      )}
                      {visibleColumns.includes('name') && (
                        <td className="py-2.5 px-3 font-bold text-gray-800">{c.name}</td>
                      )}
                      {visibleColumns.includes('phone') && (
                        <td className="py-2.5 px-3 text-gray-700">{c.phone || '---'}</td>
                      )}
                      {visibleColumns.includes('email') && (
                        <td className="py-2.5 px-3 text-gray-700">{c.email || '---'}</td>
                      )}
                      {visibleColumns.includes('address') && (
                        <td className="py-2.5 px-3 text-gray-700 max-w-[220px] truncate" title={c.address || ''}>{c.address || '---'}</td>
                      )}
                      {visibleColumns.includes('note') && (
                        <td className="py-2.5 px-3 text-gray-700 min-w-[150px] max-w-[300px] truncate" title={c.note || ''}>{c.note || '---'}</td>
                      )}
                      {visibleColumns.includes('debt') && (
                        <td className={`py-2.5 px-3 text-right font-extrabold ${(c.debt || c.totalDebt || 0) > 0 ? 'text-red-500' : (c.debt || c.totalDebt || 0) < 0 ? 'text-green-600' : 'text-gray-700'}`}>{fmt(c.debt || c.totalDebt || 0)}</td>
                      )}
                      {visibleColumns.includes('total_spent') && (
                        <td className="py-2.5 px-3 text-right font-extrabold text-primary">{fmt(c.total_spent || c.totalSpent || 0)}</td>
                      )}
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditCustomer(c); setModalOpen(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Sửa"><Edit size={15} className="text-gray-400 hover:text-primary" /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Xóa"><Trash2 size={15} className="text-gray-400 hover:text-red-50" /></button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && renderDetail(c)}
                  </React.Fragment>
                );
              })}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="p-12 text-center text-gray-400 font-medium">
                    <User size={48} className="mx-auto mb-3 text-gray-300" />
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc
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
          itemName="khách hàng"
        />
      </div>
    </div>

      <CustomerModal open={modalOpen} onClose={() => setModalOpen(false)} customer={editCustomer} onSaved={reload} />

      <CustomerExportDebtModal 
        open={exportModalOpen} 
        onClose={() => { setExportModalOpen(false); setExportModalCustomer(null); }} 
        onExport={async (timeRange, columns) => {
          const c = exportModalCustomer;
          if (!c) return;
          const custId = c.id;
          const custCode = c.code || `KH${String(c.id).padStart(6, '0')}`;
          const custOrders = orders.filter(o => {
            const oCustId = o.customerId || o.customer_id || o.customer?.id;
            if (oCustId) return oCustId === custId;
            const oCustCode = o.customer_code || o.customer?.code;
            if (oCustCode) return oCustCode === custCode;
            return o.customer_name === c.name;
          }).filter(o => o.status !== 'CANCELLED' && o.status !== 'cancelled');

          const custReturns = returns.filter(r => {
            const rCustId = r.customerId || r.customer_id || r.customer?.id;
            if (rCustId) return rCustId === custId;
            const rCustCode = r.customer_code || r.customer?.code;
            if (rCustCode) return rCustCode === custCode;
            return r.customer_name === c.name;
          }).filter(r => r.status !== 'CANCELLED' && r.status !== 'cancelled');

          const custCashbooks = cashbooks.filter(cb => {
            if (cb.partnerType !== 'customer') return false;
            const cbCustId = cb.customerId || cb.supplierId;
            if (cbCustId) return cbCustId === custId;
            const cbCustCode = cb.customer_code || cb.supplier_code;
            if (cbCustCode) return cbCustCode === custCode;
            return cb.partnerName === c.name;
          });

          const now = new Date();
          let startDate = new Date(0);
          let endDate = new Date();
          endDate.setHours(23, 59, 59, 999);

          if (timeRange === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startDate.setHours(0, 0, 0, 0);
          } else if (timeRange === 'this_week') {
            const day = now.getDay() || 7;
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
            startDate.setHours(0, 0, 0, 0);
          } else if (timeRange === 'this_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
          } else if (timeRange === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            endDate.setHours(23, 59, 59, 999);
          } else if (typeof timeRange === 'object' && timeRange !== null && timeRange.mode === 'custom') {
            if (timeRange.start) {
              startDate = new Date(timeRange.start);
              startDate.setHours(0, 0, 0, 0);
            }
            if (timeRange.end) {
              endDate = new Date(timeRange.end);
              endDate.setHours(23, 59, 59, 999);
            }
          }

          const tid = toast.loading('Đang chuẩn bị dữ liệu xuất, vui lòng đợi...');
          
          try {
            // Fetch detailed items for all orders to ensure no missing products
            for (let i = 0; i < custOrders.length; i++) {
              const o = custOrders[i];
              try {
                const detail = await orderAPI.getById(o.id);
                if (detail && detail.items) {
                  custOrders[i].items = detail.items;
                }
              } catch(e) {
                console.warn(`Lỗi khi lấy chi tiết đơn hàng ${o.code}`);
              }
            }
            // Fetch detailed items for all returns to ensure no missing products
            for (let i = 0; i < custReturns.length; i++) {
              const r = custReturns[i];
              try {
                const detail = await returnAPI.getById(r.id);
                if (detail && detail.items) {
                  custReturns[i].items = detail.items;
                }
              } catch(e) {
                console.warn(`Lỗi khi lấy chi tiết đơn trả hàng ${r.code}`);
              }
            }
          } catch(e) {}

          toast.dismiss(tid);

          // 1. Build all transactions exactly as the UI does
          const allTxs = [
            ...custOrders.flatMap(o => {
              const total = Number(o.total || 0);
              const paid = Number(o.paid_amount || o.paid || 0);
              const txs = [
                {
                  code: o.order_code || o.code,
                  type: 'Bán hàng',
                  date: new Date(o.created_at || o.createdAt),
                  total: total,
                  paid: 0,
                  debt: total,
                  items: o.items || []
                }
              ];
              if (paid > 0) {
                const matchedCB = cashbooks.find(cb => cb.orderId === o.id || cb.order_id === o.id);
                txs.push({
                  code: matchedCB ? matchedCB.code : `PT${o.order_code || o.code}`,
                  type: 'Thanh toán',
                  date: new Date(o.created_at || o.createdAt),
                  total: paid,
                  paid: paid,
                  debt: -paid,
                  items: []
                });
              }
              return txs;
            }),
            ...custReturns.map(r => {
              const total = Number(r.total || 0);
              const paid = Number(r.paid || 0);
              return {
                code: r.code,
                type: 'Trả hàng',
                date: new Date(r.created_at || r.createdAt),
                total: paid > 0 ? paid : total,
                paid: paid,
                debt: paid > 0 ? -paid : -total,
                items: r.items || []
              };
            }),
            ...custCashbooks.filter(cb => {
              if (cb.code && ['TTM028592', 'TCM001916', 'TTM028591'].includes(String(cb.code).trim())) return false;
              if (cb.status !== 'completed') return false;
              if (cb.category === 'Chi tiền trả hàng' || cb.category === 'Thu tiền khách trả') return false;
              return true;
            }).map(cb => ({
              code: cb.code,
              type: 'Thanh toán',
              date: new Date(cb.createdAt || cb.created_at || cb.date),
              total: Number(cb.amount || 0),
              paid: cb.amount,
              debt: cb.type === 'EXPENSE' ? Number(cb.amount || 0) : -Number(cb.amount || 0),
              items: []
            }))
          ];

          // Sort new-to-old to compute runningDebt backward
          const sortedNewFirst = [...allTxs].sort((a, b) => {
            const timeDiff = b.date - a.date;
            if (timeDiff !== 0) return timeDiff;
            const getPriority = (type) => {
              if (type === 'Thanh toán') return 1;
              if (type === 'Trả hàng') return 2;
              if (type === 'Bán hàng') return 3;
              return 4;
            };
            return getPriority(a.type) - getPriority(b.type);
          });

          const currentFinalDebt = Number(c.debt || c.totalDebt || 0);
          let tempDebt = currentFinalDebt;
          const allTxsWithDebt = sortedNewFirst.map(tx => {
            const runningDebt = tempDebt;
            tempDebt -= tx.debt;
            return { ...tx, runningDebt, debtBefore: tempDebt };
          });

          // Calculate noDauKy
          const txsBefore = allTxsWithDebt.filter(tx => tx.date < startDate);
          let noDauKy = currentFinalDebt;
          if (txsBefore.length > 0) {
            noDauKy = txsBefore[0].runningDebt;
          } else if (allTxsWithDebt.length > 0) {
            noDauKy = allTxsWithDebt[allTxsWithDebt.length - 1].debtBefore;
          }

          // Filter for period
          const periodTxs = allTxsWithDebt.filter(tx => {
            if (timeRange === 'all') return true;
            if (timeRange === 'last_month') return tx.date >= startDate && tx.date <= endDate;
            if (typeof timeRange === 'object' && timeRange !== null && timeRange.mode === 'custom') {
              return tx.date >= startDate && tx.date <= endDate;
            }
            return tx.date >= startDate;
          });

          // Sort period transactions chronological (old-to-new) for display in Excel
          const transactions = [...periodTxs].reverse();

          // Calculate Ghi No / Ghi Co
          let totalGhiNo = 0;
          let totalGhiCo = 0;
          transactions.forEach(tx => {
            if (tx.debt > 0) totalGhiNo += tx.debt;
            else totalGhiCo += Math.abs(tx.debt);
          });

          const noCuoiKy = noDauKy + totalGhiNo - totalGhiCo;

          // 1. Build headers to know total columns
          const headerRow = ['Thời gian', 'Mã', 'Diễn giải'];
          if (columns.detail) {
             if (columns.unit) headerRow.push('ĐVT');
             if (columns.quantity) headerRow.push('SL');
             if (columns.price) headerRow.push('Đơn giá');
             if (columns.discount) headerRow.push('Giảm giá');
             headerRow.push('VAT');
             if (columns.importPrice) headerRow.push('Giá bán/trả');
             if (columns.total) headerRow.push('Thành tiền');
             if (columns.note) headerRow.push('Ghi chú');
          }
          headerRow.push('Ghi nợ', 'Ghi có', 'Dư nợ');
          const totalCols = headerRow.length;

          const createRow = () => new Array(totalCols).fill('');

          const exportData = [];
          
          // Header section (Store Info)
          let row1 = createRow(); row1[0] = 'vohuy123'; exportData.push(row1);
          let row2 = createRow(); row2[0] = 'Chi nhánh'; row2[1] = 'Chi nhánh trung tâm'; exportData.push(row2);
          let row3 = createRow(); row3[0] = 'Địa chỉ'; exportData.push(row3);
          let row4 = createRow(); row4[0] = 'Điện thoại'; row4[1] = '+84387564952'; exportData.push(row4);
          
          const formatDate = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
          let dateStr = `Từ ngày ${formatDate(startDate)} đến ngày ${formatDate(endDate)}`;
          if (timeRange === 'all') dateStr = `Toàn thời gian`;

          // Title & Date
          let row5 = createRow(); exportData.push(row5); // Empty row 4
          let row6 = createRow(); row6[0] = 'CÔNG NỢ CHI TIẾT KHÁCH HÀNG'; exportData.push(row6);
          let row7 = createRow(); row7[0] = dateStr; exportData.push(row7);
          let row8 = createRow(); exportData.push(row8); // Empty row 7

          // Customer & Debt Summary Info
          let row9 = createRow(); row9[0] = 'Khách hàng:'; row9[1] = c.name; row9[totalCols - 3] = 'Nợ đầu kỳ:'; row9[totalCols - 1] = Number(noDauKy || 0); exportData.push(row9);
          let row10 = createRow(); row10[0] = 'Mã KH:'; row10[1] = custCode; row10[totalCols - 3] = 'Tổng phát sinh Nợ:'; row10[totalCols - 1] = Number(totalGhiNo || 0); exportData.push(row10);
          let row11 = createRow(); row11[0] = 'Điện thoại:'; row11[1] = c.phone || ''; row11[totalCols - 3] = 'Tổng phát sinh Có:'; row11[totalCols - 1] = Number(totalGhiCo || 0); exportData.push(row11);
          let row12 = createRow(); row12[totalCols - 3] = 'Nợ cuối kỳ:'; row12[totalCols - 1] = Number(noCuoiKy || 0); exportData.push(row12);
          exportData.push(createRow()); // Empty Row 12
          
          // Table Headers
          const headerRowIndex = 13; // 0-based, Row 14
          exportData.push(headerRow);

          transactions.forEach(tx => {
            const txTime = `${formatDate(tx.date)} ${String(tx.date.getHours()).padStart(2,'0')}:${String(tx.date.getMinutes()).padStart(2,'0')}`;
            
            let ghiNo = tx.debt > 0 ? Number(tx.debt) : 0;
            let ghiCo = tx.debt < 0 ? Math.abs(Number(tx.debt)) : 0;

            const summaryRow = createRow();
            summaryRow[0] = txTime;
            summaryRow[1] = tx.code || '';
            summaryRow[2] = tx.type || '';
            summaryRow[totalCols - 3] = ghiNo || 0;
            summaryRow[totalCols - 2] = ghiCo || 0;
            summaryRow[totalCols - 1] = Number(tx.runningDebt || 0);
            exportData.push(summaryRow);

            
            // Build item rows
            if (columns.detail && tx.items && tx.items.length > 0) {
              tx.items.forEach(it => {
                const sku = it.product?.sku || it.product_sku || it.sku || it.productSku || '';
                const name = it.product?.name || it.product_name || it.name || it.productName || '';
                
                const itemRow = createRow();
                itemRow[1] = sku;
                itemRow[2] = name;
                let colIdx = 3;
                if (columns.unit) itemRow[colIdx++] = it.product?.unit || it.unit || 'Cái';
                if (columns.quantity) itemRow[colIdx++] = Number(it.quantity || 0);
                if (columns.price) itemRow[colIdx++] = Number(it.unit_price || it.price || 0);
                if (columns.discount) itemRow[colIdx++] = Number(it.discount || 0);
                itemRow[colIdx++] = 0; // VAT
                if (columns.importPrice) itemRow[colIdx++] = Number(it.unit_price || it.price || 0);
                if (columns.total) itemRow[colIdx++] = Number(it.total || ((Number(it.unit_price || it.price || 0)) * Number(it.quantity || 0)));
                if (columns.note) itemRow[colIdx++] = it.note || '';
                exportData.push(itemRow);
              });
            }
          });

          const lastDataRowIndex = exportData.length - 1;

          if (transactions.length === 0) { toast.error('Không có giao dịch nào'); return; }

          exportData.push(createRow());
          
          const dateRowIdx = exportData.length;
          let dateRow = createRow();
          dateRow[totalCols - 4] = `Ngày ${now.getDate()} tháng ${now.getMonth()+1} năm ${now.getFullYear()}`;
          exportData.push(dateRow);
          
          exportData.push(createRow());
          
          const midCol = Math.floor(totalCols / 2);
          const signRow1Idx = exportData.length;
          let signRow1 = createRow();
          signRow1[0] = 'Khách hàng';
          signRow1[midCol - 1] = 'Người lập biểu';
          signRow1[totalCols - 3] = 'TM Công ty';
          exportData.push(signRow1);

          const signRow2Idx = exportData.length;
          let signRow2 = createRow();
          signRow2[0] = '(Ký, họ tên)';
          signRow2[midCol - 1] = '(Ký, họ tên)';
          signRow2[totalCols - 3] = '(Ký, họ tên)';
          exportData.push(signRow2);
          
          exportData.push(createRow()); // Extra padding row
          exportData.push(createRow());

          try {
            const XLSX = await import('xlsx-js-style');
            const { applyDebtExcelStyles } = await import('../../utils/exportCSV');
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            
            const autoCols = [];
            autoCols.push({ wch: 18 }); // Thời gian
            autoCols.push({ wch: 16 }); // Mã SKU / Mã HĐ
            autoCols.push({ wch: 38 }); // Diễn giải / Tên SP
            if (columns.detail) {
               if (columns.unit) autoCols.push({ wch: 10 });
               if (columns.quantity) autoCols.push({ wch: 10 });
               if (columns.price) autoCols.push({ wch: 15 });
               if (columns.discount) autoCols.push({ wch: 14 });
               autoCols.push({ wch: 10 }); // VAT
               if (columns.importPrice) autoCols.push({ wch: 15 });
               if (columns.total) autoCols.push({ wch: 16 });
               if (columns.note) autoCols.push({ wch: 18 });
            }
            autoCols.push({ wch: 16 }, { wch: 16 }, { wch: 18 }); // Ghi nợ, Ghi có, Dư nợ
            
            // Dynamic merges for Title, Date, Summary Box, and Signatures
            const merges = [
              { s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } },
              { s: { r: 6, c: 0 }, e: { r: 6, c: totalCols - 1 } },
              
              { s: { r: 8, c: 1 }, e: { r: 8, c: 3 } },
              { s: { r: 8, c: totalCols - 3 }, e: { r: 8, c: totalCols - 2 } },
              
              { s: { r: 9, c: 1 }, e: { r: 9, c: 3 } },
              { s: { r: 9, c: totalCols - 3 }, e: { r: 9, c: totalCols - 2 } },
              
              { s: { r: 10, c: 1 }, e: { r: 10, c: 3 } },
              { s: { r: 10, c: totalCols - 3 }, e: { r: 10, c: totalCols - 2 } },
              
              { s: { r: 11, c: totalCols - 3 }, e: { r: 11, c: totalCols - 2 } },

              { s: { r: dateRowIdx, c: totalCols - 4 }, e: { r: dateRowIdx, c: totalCols - 1 } },

              { s: { r: signRow1Idx, c: 0 }, e: { r: signRow1Idx, c: 2 } },
              { s: { r: signRow1Idx, c: midCol - 1 }, e: { r: signRow1Idx, c: midCol + 1 } },
              { s: { r: signRow1Idx, c: totalCols - 3 }, e: { r: signRow1Idx, c: totalCols - 1 } },

              { s: { r: signRow2Idx, c: 0 }, e: { r: signRow2Idx, c: 2 } },
              { s: { r: signRow2Idx, c: midCol - 1 }, e: { r: signRow2Idx, c: midCol + 1 } },
              { s: { r: signRow2Idx, c: totalCols - 3 }, e: { r: signRow2Idx, c: totalCols - 1 } },
            ];

            applyDebtExcelStyles(ws, autoCols, headerRowIndex, merges, lastDataRowIndex);
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'CongNo');
            XLSX.writeFile(wb, `CongNoChiTietKhachHang_${custCode}.xlsx`);
            toast.success('Đã xuất file công nợ khách hàng');
          } catch (err) {
            toast.error('Không thể tải thư viện xuất Excel');
          }
        }}
      />

      <CustomerAdjustDebtModal 
        open={adjustModalOpen} 
        onClose={() => { setAdjustModalOpen(false); setAdjustModalCustomer(null); }}
        customer={adjustModalCustomer}
        onSaved={reload}
      />

      <CustomerPaymentModal 
        open={paymentModalOpen} 
        onClose={() => { setPaymentModalOpen(false); setPaymentModalCustomer(null); }}
        customer={paymentModalCustomer}
        orders={orders.filter(o => (o.customerId || o.customer_id || o.customer?.id) === paymentModalCustomer?.id)}
        onSaved={reload}
      />

      {/* Import Summary Modal */}
      {importSummaryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 flex items-center justify-between text-white shadow-md">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">Kết quả kiểm tra dữ liệu Excel khách hàng</h2>
                <p className="text-xs text-white/80 mt-1 font-medium">Vui lòng kiểm tra kỹ các thông tin dưới đây trước khi xác nhận đưa vào hệ thống</p>
              </div>
              <button 
                onClick={() => setImportSummaryOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold text-gray-500 mb-1">Tổng dòng dữ liệu</span>
                  <span className="text-2xl font-extrabold text-gray-800">{importSummary.totalRows}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold text-emerald-600 mb-1">Dòng hợp lệ</span>
                  <span className="text-2xl font-extrabold text-emerald-700">{importSummary.validItems.length}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold text-rose-600 mb-1">Dòng lỗi / Bỏ qua</span>
                  <span className="text-2xl font-extrabold text-rose-700">{importSummary.invalidItems.length}</span>
                </div>
              </div>

              {/* Danh sách hợp lệ */}
              {importSummary.validItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Khách hàng hợp lệ sẵn sàng import ({importSummary.validItems.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                          <th className="py-2.5 px-4 w-28">Mã KH</th>
                          <th className="py-2.5 px-4 flex-1">Tên khách hàng</th>
                          <th className="py-2.5 px-4 w-32">Điện thoại</th>
                          <th className="py-2.5 px-4 w-24 text-center">Giới tính</th>
                          <th className="py-2.5 px-4 w-28 text-right">Công nợ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {importSummary.validItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/80">
                            <td className="py-2 px-4 font-bold text-gray-900">{it.code || '[Tự động tạo]'}</td>
                            <td className="py-2 px-4 text-gray-800 font-bold">{it.name}</td>
                            <td className="py-2 px-4 text-gray-600">{it.phone || '---'}</td>
                            <td className="py-2 px-4 text-center text-gray-600">{it.gender || '---'}</td>
                            <td className="py-2 px-4 text-right font-extrabold text-red-600">{fmt(it.debt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Danh sách lỗi */}
              {importSummary.invalidItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold text-rose-600 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Danh sách dòng lỗi không thể import ({importSummary.invalidItems.length})
                  </h3>
                  <div className="border border-rose-200 rounded-xl overflow-hidden shadow-inner max-h-52 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-rose-50/80 text-rose-800 font-bold border-b border-rose-200 sticky top-0">
                          <th className="py-2 px-4 w-20 text-center">Dòng Excel</th>
                          <th className="py-2 px-4 w-32">Mã KH</th>
                          <th className="py-2 px-4 flex-1">Chi tiết lỗi / Nguyên nhân</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white font-medium">
                        {importSummary.invalidItems.map((err, i) => (
                          <tr key={i} className="hover:bg-rose-50/30 text-rose-900">
                            <td className="py-2 px-4 text-center font-bold text-rose-700">#{err.row}</td>
                            <td className="py-2 px-4 font-bold">{err.sku}</td>
                            <td className="py-2 px-4 flex items-center gap-1.5 text-rose-600">
                              <AlertCircle size={14} className="shrink-0" />
                              <span>{err.reason}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 shadow-sm">
              <button 
                onClick={() => setImportSummaryOpen(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none bg-transparent"
              >
                Hủy bỏ
              </button>
              <button 
                disabled={importSummary.validItems.length === 0}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md disabled:opacity-50 border-none flex items-center gap-2"
              >
                <Plus size={16} /> Xác nhận import dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Transaction Detail Modals */}
      <SalesOrderDetailModal 
        open={!!selectedTx && selectedTx.type === 'Bán hàng'} 
        onClose={() => setSelectedTx(null)} 
        data={selectedTx} 
        partnerName={selectedTx?.partnerName} 
        onRefresh={reload}
      />
      <SalesReturnDetailModal 
        open={!!selectedTx && selectedTx.type === 'Trả hàng'} 
        onClose={() => setSelectedTx(null)} 
        data={selectedTx} 
        partnerName={selectedTx?.partnerName} 
        onRefresh={reload}
      />
      <PaymentDetailModal 
        open={!!selectedTx && selectedTx.type === 'Thanh toán'} 
        onClose={() => setSelectedTx(null)} 
        data={selectedTx} 
        partnerName={selectedTx?.partnerName} 
        onRefresh={reload}
      />

    </div>
  );
}
