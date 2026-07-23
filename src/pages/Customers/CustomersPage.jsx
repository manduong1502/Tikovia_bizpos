import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { customerAPI, orderAPI, cashbookAPI, returnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, User, Edit, Trash2, Star, Filter, Columns3, Settings, HelpCircle, Copy, Save, Printer, MoreHorizontal, AlertCircle, X, Upload, SlidersHorizontal
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
import { getRangeByCreatedLabel, inDateRange, buildCustomRange } from '../../utils/dateFilterUtils';
import NumericInput from '../../components/ui/NumericInput';

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


const ALL_COLUMNS = [
  { key: 'code', label: 'Mã KH', default: true },
  { key: 'name', label: 'Tên khách hàng', default: true },
  { key: 'phone', label: 'Điện thoại', default: true },
  { key: 'email', label: 'Email', default: false },
  { key: 'address', label: 'Địa chỉ', default: true },
  { key: 'note', label: 'Ghi chú', default: true },
  { key: 'debt', label: 'Nợ hiện tại', default: true, align: 'right' },
  { key: 'total_spent', label: 'Tổng bán', default: true, align: 'right' },
];

export default function CustomersPage() {
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchNote, setSearchNote] = useState('');
  const [searchOrderCode, setSearchOrderCode] = useState('');
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState({ totalRows: 0, validItems: [], invalidItems: [] });
  const [orders, setOrders] = useState([]);
  const [cashbooks, setCashbooks] = useState([]);
  const [returns, setReturns] = useState([]);

  // Customer debt modal states
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportModalCustomer, setExportModalCustomer] = useState(null);

  const [selectedTx, setSelectedTx] = useState(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustModalCustomer, setAdjustModalCustomer] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState(null);

  const handleOpenOrder = async (orderId, partnerName, defaultData = null) => {
    if (!orderId) {
      if (defaultData) setSelectedTx({ ...defaultData, type: 'Bán hàng', partnerName });
      return;
    }
    const tid = toast.loading('Đang tải chi tiết hóa đơn...');
    try {
      const realId = typeof orderId === 'string' && orderId.includes('-')
        ? Number(orderId.split('-')[0])
        : orderId;
      const detail = await orderAPI.getById(realId);
      if (detail) {
        setSelectedTx({
          ...defaultData,
          ...detail,
          type: 'Bán hàng',
          partnerName: partnerName
        });
      } else if (defaultData) {
        setSelectedTx({ ...defaultData, type: 'Bán hàng', partnerName });
      } else {
        toast.error('Không tìm thấy chi tiết hóa đơn');
      }
    } catch (err) {
      console.error(err);
      if (defaultData) {
        setSelectedTx({ ...defaultData, type: 'Bán hàng', partnerName });
      } else {
        toast.error('Không thể tải chi tiết hóa đơn');
      }
    } finally {
      toast.dismiss(tid);
    }
  };

  const handleOpenReturn = async (returnId, partnerName, defaultData = null) => {
    if (!returnId) {
      if (defaultData) setSelectedTx({ ...defaultData, type: 'Trả hàng', partnerName });
      return;
    }
    const tid = toast.loading('Đang tải chi tiết phiếu trả hàng...');
    try {
      const realId = typeof returnId === 'string' && returnId.includes('-')
        ? Number(returnId.split('-')[0])
        : returnId;
      const detail = await returnAPI.getById(realId);
      if (detail) {
        setSelectedTx({
          ...defaultData,
          ...detail,
          type: 'Trả hàng',
          partnerName: partnerName
        });
      } else if (defaultData) {
        setSelectedTx({ ...defaultData, type: 'Trả hàng', partnerName });
      } else {
        toast.error('Không tìm thấy chi tiết phiếu trả hàng');
      }
    } catch (err) {
      console.error(err);
      if (defaultData) {
        setSelectedTx({ ...defaultData, type: 'Trả hàng', partnerName });
      } else {
        toast.error('Không thể tải chi tiết phiếu trả hàng');
      }
    } finally {
      toast.dismiss(tid);
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

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 2000 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (debouncedEmail.trim()) params.email = debouncedEmail.trim();
      if (debouncedAddress.trim()) params.address = debouncedAddress.trim();
      if (debouncedNote.trim()) params.note = debouncedNote.trim();
      if (debouncedOrderCode.trim()) params.orderCode = debouncedOrderCode.trim();

      const res = await customerAPI.getAll(params);
      const rawList = Array.isArray(res) ? res : (res?.data || []);
      if (rawList.length === 0) {
        const mockCustomers = [
          { id: 1, code: 'KH000001', name: 'Anh Tuấn', phone: '0901234567', email: 'tuan@gmail.com', address: 'Q.1, TP.HCM', debt: 500000, total_spent: 4500000, gender: 'Nam', type: 'individual' },
          { id: 2, code: 'KH000002', name: 'Chị Mai', phone: '0912345678', email: 'mai@yahoo.com', address: 'Q.3, TP.HCM', debt: 0, total_spent: 12500000, gender: 'Nữ', type: 'individual' },
          { id: 3, code: 'KH000003', name: 'Công ty TNHH Alpha', phone: '0287654321', email: 'contact@alpha.vn', address: 'Q.7, TP.HCM', debt: 2500000, total_spent: 35000000, gender: 'Khác', type: 'company' },
        ];
        setCustomers(mockCustomers);
      } else {
        setCustomers(rawList);
      }

      // Load orders for debt tab
      try {
        const [ordRes, cbRes, retRes] = await Promise.all([
          orderAPI.getAll({ limit: 1000 }).catch(() => ({ data: [] })),
          cashbookAPI.getAll({ partnerType: 'customer' }).catch(() => ({ data: [] })),
          returnAPI.getAll().catch(() => [])
        ]);
        const rawOrders = Array.isArray(ordRes) ? ordRes : (ordRes?.data || []);
        setOrders(rawOrders);
        const rawCBs = Array.isArray(cbRes) ? cbRes : (cbRes?.data || []);
        setCashbooks(rawCBs);
        const rawReturns = Array.isArray(retRes) ? retRes : (retRes?.data || []);
        setReturns(rawReturns);
      } catch {
        setOrders([]);
        setCashbooks([]);
        setReturns([]);
      }
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, debouncedEmail, debouncedAddress, debouncedNote, debouncedOrderCode]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const searchFromState = location.state?.searchCustomer || location.state?.customerCode || location.state?.customerName;
    const idFromState = location.state?.customerId;

    if (searchFromState) {
      setSearch(searchFromState);
    }

    if (!isLoading && customers.length > 0) {
      if (idFromState) {
        const found = customers.find(c => c.id === Number(idFromState) || String(c.id) === String(idFromState));
        if (found) {
          setExpandedId(found.id);
          scrollRowIntoView(found.id);
        }
      } else if (searchFromState) {
        const q = String(searchFromState).toLowerCase();
        const found = customers.find(c => (c.name && c.name.toLowerCase().includes(q)) || (c.code && c.code.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q)));
        if (found) {
          setExpandedId(found.id);
          scrollRowIntoView(found.id);
        }
      }
    }
  }, [location.state, customers, isLoading]);

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
        if (range && !inDateRange(c.created_at || c.createdAt, range)) return false;
      } else if (filterDate && filterDate.mode === 'custom' && filterDate.start) {
        const range = buildCustomRange(filterDate.start, filterDate.end);
        if (range && !inDateRange(c.created_at || c.createdAt, range)) return false;
      }

      // 3.4. Loại khách hàng (Tất cả, Cá nhân, Công ty)
      if (filterType !== 'Tất cả') {
        const type = c.customerType || 'Cá nhân';
        if (filterType === 'Cá nhân' && type !== 'Cá nhân') return false;
        if (filterType === 'Công ty' && type !== 'Công ty') return false;
      }

      // 3.5. Giới tính (Tất cả, Nam, Nữ)
      if (filterGender !== 'Tất cả') {
        const g = (c.gender || '').toLowerCase();
        if (filterGender === 'Nam' && g !== 'nam' && g !== 'male') return false;
        if (filterGender === 'Nữ' && g !== 'nữ' && g !== 'female') return false;
      }

      // 3.6. Sinh nhật (DateFilter)
      if (filterBirthdayDate && filterBirthdayDate.mode === 'all' && filterBirthdayDate.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filterBirthdayDate.label);
        if (range && !inDateRange(c.birthday || c.birthDate, range)) return false;
      } else if (filterBirthdayDate && filterBirthdayDate.mode === 'custom' && filterBirthdayDate.start) {
        const range = buildCustomRange(filterBirthdayDate.start, filterBirthdayDate.end);
        if (range && !inDateRange(c.birthday || c.birthDate, range)) return false;
      }

      // 3.7. Ngày giao dịch cuối (DateFilter)
      const lastTx = c.lastTransaction || c.last_transaction;
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

  const renderDetail = (c) => {
    const currentNote = custNotes[c.id] ?? c.note ?? '';
    const code = c.code || `KH${String(c.id).padStart(6, '0')}`;

    const baseAmt = Number(c.total_spent || c.totalSpent || 0);
    const dVal = Number(c.debt || c.totalDebt || 0);
    
    // Get orders for this customer
    const custId = c.id;
    const custCode = c.code || `KH${String(c.id).padStart(6, '0')}`;
    const custOrders = orders.filter(o => {
      const oCustId = o.customerId || o.customer_id || o.customer?.id;
      if (oCustId) return oCustId === custId;
      const oCustCode = o.customer_code || o.customer?.code;
      if (oCustCode) return oCustCode === custCode;
      return o.customer_name === c.name;
    }).filter(o => o.status !== 'CANCELLED' && o.status !== 'cancelled');

    // Get returns for this customer
    const custReturns = returns.filter(r => {
      const rCustId = r.customerId || r.customer_id || r.customer?.id;
      if (rCustId) return rCustId === custId;
      const rCustCode = r.customer_code || r.customer?.code;
      if (rCustCode) return rCustCode === custCode;
      return r.customer_name === c.name;
    }).filter(r => r.status !== 'CANCELLED' && r.status !== 'cancelled');

    // Build transactions for debt tab from real orders
    const debtTransactions = [
      ...custOrders.flatMap(o => {
        const total = Number(o.total || 0);
        const paid = Number(o.paid_amount || o.paid || 0);
        const txs = [
          {
            id: `${o.id}-sale`,
            code: o.order_code || o.code,
            type: 'Bán hàng',
            date: o.created_at || o.createdAt,
            total: total,
            paid: 0,
            debt: total,
          }
        ];
        if (paid > 0) {
          const matchedCB = cashbooks.find(cb => cb.orderId === o.id || cb.order_id === o.id);
          txs.push({
            id: matchedCB ? matchedCB.id : `${o.id}-payment`,
            code: matchedCB ? matchedCB.code : `PT${o.order_code || o.code}`,
            type: 'Thanh toán',
            cashbookType: matchedCB ? matchedCB.type : 'INCOME',
            status: matchedCB ? matchedCB.status : 'completed',
            note: matchedCB ? matchedCB.note : 'Thanh toán công nợ',
            date: o.created_at || o.createdAt,
            total: paid,
            paid: paid,
            debt: -paid,
          });
        }
        return txs;
      }),
      ...custReturns.map(r => {
        const total = Number(r.total || 0);
        const paid = Number(r.paid || 0);
        return {
          id: r.id,
          code: r.code,
          type: 'Trả hàng',
          date: r.created_at || r.createdAt,
          total: paid > 0 ? paid : total,
          paid: paid,
          debt: paid > 0 ? -paid : -total,
        };
      }),
      ...cashbooks.filter(cb => {
        if (cb.partnerType !== 'customer') return false;
        if (cb.category === 'Chi tiền trả hàng') return false;
        if (cb.category === 'Thu tiền khách trả') return false; // Filter out order checkout payments
        const cbCustId = cb.customerId || cb.supplierId;
        if (cbCustId) return cbCustId === custId;
        const cbCustCode = cb.customer_code || cb.supplier_code;
        if (cbCustCode) return cbCustCode === custCode;
        return cb.partnerName === c.name;
      }).filter(cb => cb.status === 'completed').map(cb => ({
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
      }))
    ].sort((a, b) => {
      const timeDiff = new Date(b.date) - new Date(a.date);
      if (timeDiff !== 0) return timeDiff;
      const getPriority = (type) => {
        if (type === 'Thanh toán') return 1;
        if (type === 'Trả hàng') return 2;
        if (type === 'Bán hàng') return 3;
        return 4;
      };
      return getPriority(a.type) - getPriority(b.type);
    });

    // Calculate running debt backwards from the current debt
    const currentFinalDebt = Number(c.debt || c.totalDebt || 0);
    const sortedNewFirst = [...debtTransactions].sort((a, b) => {
      const timeDiff = new Date(b.date) - new Date(a.date);
      if (timeDiff !== 0) return timeDiff;
      const getPriority = (type) => {
        if (type === 'Thanh toán') return 1;
        if (type === 'Trả hàng') return 2;
        if (type === 'Bán hàng') return 3;
        return 4;
      };
      return getPriority(a.type) - getPriority(b.type);
    });
    let tempDebt = currentFinalDebt;
    const transactionsWithDebt = sortedNewFirst.map(tx => {
      const runningDebt = tempDebt;
      tempDebt -= tx.debt;
      return { ...tx, runningDebt };
    });

    return (
      <tr key={`detail-${c.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in">
        <td colSpan={visibleColumns.length + 3} className="p-0">
          <div className="p-4 bg-gray-50/10">
            {/* Top Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mb-4 px-2">
              {[
                { key: 'info', label: 'Thông tin' },
                { key: 'history', label: 'Lịch sử mua hàng' },
                { key: 'address', label: 'Địa chỉ nhận hàng' },
                { key: 'debt', label: 'Nợ cần thu từ khách' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setDetailTab(t.key)}
                  className={`py-1.5 px-0.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    detailTab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {detailTab === 'info' && (
              <div className="flex flex-col gap-3">
                {/* Header Info */}
                <div className="flex items-center justify-between bg-blue-50/50 p-3 px-4 rounded-lg border border-blue-100 text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-gray-800 tracking-tight">{c.name}</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                      {code}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm">
                    <div><span className="text-gray-500">Điện thoại:</span> <span className="font-bold text-gray-800">{c.phone || '---'}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-bold text-gray-800">{c.email || '---'}</span></div>
                    <div><span className="text-gray-500">Địa chỉ:</span> <span className="font-bold text-gray-800">{c.address || '---'}</span></div>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 sm:p-4 bg-gray-50/50 rounded-lg border border-gray-200 text-xs">
                  <div><span className="text-gray-500 font-medium block mb-0.5">Nhóm khách hàng</span><span className="font-bold text-gray-800 truncate block">Khách hàng chung</span></div>
                  <div><span className="text-gray-500 font-medium block mb-0.5">Loại khách hàng</span><span className="font-bold text-gray-800 truncate block">{c.type === 'company' ? 'Công ty' : 'Cá nhân'}</span></div>
                  <div><span className="text-gray-500 font-medium block mb-0.5">Giới tính</span><span className="font-bold text-gray-800 truncate block">{c.gender || '---'}</span></div>
                  <div><span className="text-gray-500 font-medium block mb-0.5">Ngày sinh</span><span className="font-bold text-gray-800 truncate block">---</span></div>
                </div>

                {/* Bottom Section: Note & Summary Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start text-xs mt-1">
                  <div className="sm:col-span-2">
                    <textarea
                      placeholder="Ghi chú..."
                      className="w-full h-16 sm:h-20 border border-gray-300 rounded-lg p-2.5 text-xs sm:text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                      value={currentNote}
                      onChange={(e) => setCustNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                    />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-1.5 text-xs shadow-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng bán</span><span className="font-bold text-gray-800">{fmt(c.total_spent || c.totalSpent || 0)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng bán trừ trả hàng</span><span className="font-bold text-gray-800">{fmt(c.total_spent || c.totalSpent || 0)}</span></div>
                    <div className="flex justify-between items-center text-xs sm:text-sm border-t border-gray-200 pt-2 mt-0.5"><span className="font-bold text-gray-800">Nợ hiện tại</span><span className={`font-extrabold ${(c.debt || c.totalDebt || 0) > 0 ? 'text-red-600' : (c.debt || c.totalDebt || 0) < 0 ? 'text-green-600' : 'text-gray-700'}`}>{fmt(c.debt || c.totalDebt || 0)}</span></div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-200 pt-3 mt-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <Button variant="danger" onClick={() => handleDelete(c.id)} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Trash2 size={13} /> Xóa khách hàng
                    </Button>
                    <Button variant="secondary" className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Copy size={13} /> Sao chép
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Download size={13} /> Xuất file
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <Button variant="primary" onClick={() => { setEditCustomer(c); setModalOpen(true); }} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-4 shadow-md font-bold bg-primary hover:bg-primary-hover whitespace-nowrap text-white">
                      <Edit size={13} /> Chỉnh sửa
                    </Button>
                    <Button variant="secondary" onClick={() => handleSaveNote(c.id, currentNote)} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Save size={13} /> Lưu
                    </Button>
                    <Button variant="secondary" onClick={() => { setPaymentModalCustomer(c); setPaymentModalOpen(true); }} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold text-green-600 border-green-200 hover:bg-green-50 whitespace-nowrap">
                      Thanh toán nợ
                    </Button>
                    <Button variant="secondary" onClick={() => handlePrintCustomer(c)} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Printer size={13} /> In
                    </Button>
                    <Button variant="secondary" className="p-1.5 shadow-sm flex-none">
                      <MoreHorizontal size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'history' && (() => {
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
                  paid: -Number(r.paid || 0),
                  status: r.status,
                  raw: r
                }))
              ].sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
              });

              return (
                <div className="flex flex-col gap-3 p-1">
                  {/* Micro metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 shadow-sm flex flex-col justify-center">
                      <span className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-0.5">Tổng giao dịch</span>
                      <span className="text-sm sm:text-base font-extrabold text-gray-800">{combinedHistory.length} giao dịch</span>
                    </div>
                    <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-2.5 shadow-sm flex flex-col justify-center">
                      <span className="text-blue-600 font-bold text-xs uppercase tracking-wider mb-0.5">Tổng tiền mua</span>
                      <span className="text-sm sm:text-base font-extrabold text-primary">{fmt(baseAmt)}</span>
                    </div>
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-2.5 shadow-sm flex flex-col justify-center">
                      <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider mb-0.5">Khách đã trả</span>
                      <span className="text-sm sm:text-base font-extrabold text-emerald-600">{fmt(custOrders.reduce((s, o) => s + Number(o.paid || 0), 0))}</span>
                    </div>
                    <div className="bg-rose-50/40 border border-rose-100 rounded-lg p-2.5 shadow-sm flex flex-col justify-center">
                      <span className="text-rose-600 font-bold text-xs uppercase tracking-wider mb-0.5">Còn nợ lại</span>
                      <span className={`text-sm sm:text-base font-extrabold ${dVal > 0 ? 'text-rose-600' : 'text-gray-400'}`}>{fmt(dVal)}</span>
                    </div>
                  </div>

                  {combinedHistory.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm bg-white max-h-56 overflow-y-auto">
                      <table className="w-full text-xs min-w-[700px] border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 text-gray-500 border-b border-gray-200 text-left font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                            <th className="py-2.5 px-3.5">Mã hóa đơn</th>
                            <th className="py-2.5 px-3.5">Thời gian</th>
                            <th className="py-2.5 px-3.5">Chi nhánh</th>
                            <th className="py-2.5 px-3.5">Loại</th>
                            <th className="py-2.5 px-3.5 text-right">Tổng tiền</th>
                            <th className="py-2.5 px-3.5 text-right">Khách đã trả</th>
                            <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {combinedHistory.map((item, i) => (
                            <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                              <td
                                className="py-2 px-3.5 text-primary font-bold hover:underline cursor-pointer"
                                onClick={() => item.type === 'Bán hàng' ? handleOpenOrder(item.id, c.name, item.raw) : handleOpenReturn(item.id, c.name, item.raw)}
                              >
                                {item.code}
                              </td>
                              <td className="py-2 px-3.5 text-gray-500">{item.date ? new Date(item.date).toLocaleString('vi-VN') : ''}</td>
                              <td className="py-2 px-3.5 text-gray-600">{item.branch}</td>
                              <td className="py-2 px-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'Bán hàng' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                  {item.typeName}
                                </span>
                              </td>
                              <td className={`py-2 px-3.5 text-right font-extrabold ${item.total < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                {item.total < 0 ? '-' : ''}{fmt(Math.abs(item.total))}
                              </td>
                              <td className={`py-2 px-3.5 text-right font-extrabold ${item.paid < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {item.paid < 0 ? '-' : ''}{fmt(Math.abs(item.paid))}
                              </td>
                              <td className="py-2 px-3.5 text-center">
                                {item.status === 'CANCELLED' || item.status === 'cancelled' ? (
                                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                    Đã hủy
                                  </span>
                                ) : item.type === 'Trả hàng' ? (
                                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                    Hoàn thành
                                  </span>
                                ) : (() => {
                                  const total = Number(item.total || 0);
                                  const paid = Number(item.paid);
                                  if (paid >= total && total > 0) {
                                    return (
                                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                        Hoàn thành
                                      </span>
                                    );
                                  } else if (paid > 0 && paid < total) {
                                    return (
                                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">
                                        Một phần
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                        Chưa trả
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50/50 border border-gray-200 rounded-lg text-gray-400 font-medium">
                      <User size={36} className="mx-auto mb-2 text-gray-300" />
                      Khách hàng chưa phát sinh hóa đơn giao dịch nào
                    </div>
                  )}
                </div>
              );
            })()}

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
                  <div className="bg-gradient-to-br from-blue-50/20 to-blue-50/5 border border-primary/20 rounded-lg p-4 shadow-sm relative overflow-hidden flex flex-col gap-1.5">
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

            {detailTab === 'debt' && (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col animate-fade-in text-xs max-h-72 overflow-y-auto">
                <div className="p-2.5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                  <span className="font-extrabold text-gray-800 text-xs sm:text-sm">Nợ cần thu từ khách</span>
                  <select 
                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none bg-white font-bold text-gray-700"
                    onChange={(e) => {
                      const tbody = e.target.closest('.border').querySelector('tbody');
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
                    }}
                  >
                    <option value="all">Tất cả giao dịch</option>
                    <option value="Bán hàng">Bán hàng</option>
                    <option value="Trả hàng">Trả hàng</option>
                    <option value="Thanh toán">Thanh toán</option>
                  </select>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                        <th className="py-2.5 px-3.5">Mã phiếu</th>
                        <th className="py-2.5 px-3.5">Thời gian</th>
                        <th className="py-2.5 px-3.5">Loại</th>
                        <th className="py-2.5 px-3.5 text-right">Giá trị</th>
                        <th className="py-2.5 px-3.5 text-right">Dư nợ khách hàng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {transactionsWithDebt.map((tx, idx) => (
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
                          <td className="py-2 px-3.5 text-gray-500">{tx.date ? new Date(tx.date).toLocaleString('vi-VN') : ''}</td>
                          <td className="py-2 px-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${tx.type === 'Bán hàng' ? 'bg-blue-100 text-blue-700' : tx.type === 'Trả hàng' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={`py-2 px-3.5 text-right font-extrabold ${tx.debt > 0 ? 'text-red-600' : tx.debt < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {tx.debt > 0 ? '+' : tx.debt < 0 ? '-' : ''}{fmt(Math.abs(tx.debt))}
                          </td>
                          <td className={`py-2 px-3.5 text-right font-extrabold ${tx.runningDebt > 0 ? 'text-red-600' : tx.runningDebt < 0 ? 'text-green-600' : 'text-gray-700'}`}>{fmt(tx.runningDebt)}</td>
                        </tr>
                      ))}
                      {transactionsWithDebt.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-gray-400">Không có giao dịch nào</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportModalCustomer(c);
                        setExportModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                    >
                      <Download size={13} /> Xuất file công nợ
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportModalCustomer(c);
                        setExportModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                    >
                      <Download size={13} /> Xuất file
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="primary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentModalCustomer(c);
                        setPaymentModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                    >
                      <DollarSign size={13} /> Thanh toán
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdjustModalCustomer(c);
                        setAdjustModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                    >
                      <Pen size={13} /> Điều chỉnh
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
                      <Percent size={13} /> Chiết khấu
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
                      Tạo QR
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const sumDebt = filtered.reduce((s, c) => s + Number(c.debt || c.totalDebt || 0), 0);
  const sumTotalSpent = filtered.reduce((s, c) => s + Number(c.total_spent || c.totalSpent || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-10 relative">
        <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">
          Khách hàng
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
                placeholder="Tìm khách hàng"
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
                  <div>
                    <input 
                      type="text" 
                      placeholder="Theo mã hóa đơn" 
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-medium text-gray-800" 
                      value={searchOrderCode} 
                      onChange={e => setSearchOrderCode(e.target.value)} 
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => { setSearch(''); setSearchEmail(''); setSearchAddress(''); setSearchNote(''); setSearchOrderCode(''); }} 
                      className="text-xs text-gray-500 hover:text-red-500 bg-transparent border-none cursor-pointer font-bold transition-colors"
                    >
                      Xóa bộ lọc
                    </button>
                    <Button 
                      variant="primary" 
                      onClick={() => setSearchOpen(false)} 
                      className="text-xs py-2 px-6 rounded-lg font-bold bg-primary hover:bg-primary-hover shadow-md text-white border-none cursor-pointer"
                    >
                      Tìm kiếm
                    </Button>
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
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Filter Sidebar */}
        <div className={`fixed top-14 bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-64 lg:p-4 lg:shadow-sm lg:border lg:border-gray-100 lg:rounded-2xl lg:overflow-y-auto lg:h-full lg:flex-none lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col gap-3 font-sans`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          
          {/* Nhóm khách hàng */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-extrabold text-gray-800 tracking-tight">Nhóm khách hàng</span>
              <button onClick={() => toast.success('Mở form tạo nhóm mới')} className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer font-bold">+ Tạo mới</button>
            </div>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 min-h-[42px] text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white cursor-pointer"
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
            >
              <option value="">Tất cả các nhóm</option>
              <option value="all">Khách hàng chung</option>
              <option value="vip">Khách hàng VIP</option>
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
            <div className="flex flex-wrap gap-2">
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
            <div className="flex flex-wrap gap-2">
              {['Tất cả', 'Nam', 'Nữ'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterGender(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition-all cursor-pointer ${filterGender === t ? 'bg-primary/10 text-primary border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'}`}
                >
                  {t}
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
              type="birthday"
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
              type="lastTransaction"
              value={filterLastTransactionDate}
              onChange={setFilterLastTransactionDate}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Tổng bán */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Tổng bán</span>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-8">Từ</span>
                <NumericInput
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium text-gray-800"
                  value={filterTotalFrom}
                  onChange={e => setFilterTotalFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-8">Tới</span>
                <NumericInput
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium text-gray-800"
                  value={filterTotalTo}
                  onChange={e => setFilterTotalTo(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-xs font-bold text-gray-500 mb-1 block">Thời gian</span>
              <DateFilter
                label="Thời gian mua"
                type="spentTime"
                value={filterSpentTime}
                onChange={setFilterSpentTime}
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Nợ hiện tại */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Nợ hiện tại</span>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-8">Từ</span>
                <NumericInput
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium text-gray-800"
                  value={filterDebtFrom}
                  onChange={e => setFilterDebtFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-8">Tới</span>
                <NumericInput
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary font-medium text-gray-800"
                  value={filterDebtTo}
                  onChange={e => setFilterDebtTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Khu vực giao hàng */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Khu vực giao hàng</span>
            <input 
              type="text" 
              placeholder="Chọn Tỉnh/TP - Quận/Huyện" 
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white font-medium text-gray-800" 
              value={filterDeliveryArea} 
              onChange={e => setFilterDeliveryArea(e.target.value)} 
            />
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
            <table className="w-full text-xs min-w-[800px]">
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
                      className={`py-2.5 px-3 font-extrabold cursor-pointer hover:bg-gray-100 transition-colors ${c.align === 'right' ? 'text-right' : 'text-left'}`}
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
                <th className="py-2.5 px-3 text-center w-24 font-extrabold">Thao tác</th>
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
                        <td className="py-2.5 px-3 text-gray-700">{c.address || '---'}</td>
                      )}
                      {visibleColumns.includes('note') && (
                        <td className="py-2.5 px-3 text-gray-700 max-w-[200px] truncate" title={c.note || ''}>{c.note || '---'}</td>
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

          // Title & Date (Merged dynamically later)
          let row5 = createRow(); row5[0] = 'Công nợ chi tiết khách hàng'; exportData.push(row5);
          let row6 = createRow(); row6[0] = dateStr; exportData.push(row6);

          // Customer & Debt Summary Info
          let row7 = createRow(); row7[0] = 'Khách hàng'; row7[1] = c.name; row7[totalCols - 2] = 'Nợ đầu kỳ'; row7[totalCols - 1] = noDauKy; exportData.push(row7);
          let row8 = createRow(); row8[0] = 'Mã KH'; row8[1] = custCode; row8[totalCols - 4] = 'Phát sinh trong'; row8[totalCols - 3] = totalGhiNo; row8[totalCols - 2] = totalGhiCo; exportData.push(row8);
          let row9 = createRow(); row9[0] = 'Điện thoại'; row9[1] = c.phone || ''; row9[totalCols - 2] = 'Nợ cuối kỳ'; row9[totalCols - 1] = noCuoiKy; exportData.push(row9);
          exportData.push(createRow()); // Empty Row 10
          
          // Table Headers
          const headerRowIndex = 10; // 0-based, so Row 11
          exportData.push(headerRow);

          transactions.forEach(tx => {
            const txTime = `${formatDate(tx.date)} ${String(tx.date.getHours()).padStart(2,'0')}:${String(tx.date.getMinutes()).padStart(2,'0')}`;
            
            let ghiNo = tx.debt > 0 ? tx.debt : 0;
            let ghiCo = tx.debt < 0 ? Math.abs(tx.debt) : 0;

            const summaryRow = createRow();
            summaryRow[0] = txTime;
            summaryRow[1] = tx.code;
            summaryRow[2] = tx.type;
            summaryRow[totalCols - 3] = ghiNo || '';
            summaryRow[totalCols - 2] = ghiCo || '';
            summaryRow[totalCols - 1] = tx.runningDebt || 0;
            exportData.push(summaryRow);

            
            // Build item rows
            if (columns.detail && tx.items && tx.items.length > 0) {
              tx.items.forEach(it => {
                const itemRow = createRow();
                itemRow[1] = it.product_sku || it.sku || '';
                itemRow[2] = it.product_name || it.name || '';
                let colIdx = 3;
                if (columns.unit) itemRow[colIdx++] = it.unit || 'Cái';
                if (columns.quantity) itemRow[colIdx++] = it.quantity || 0;
                if (columns.price) itemRow[colIdx++] = it.unit_price || it.price || 0;
                if (columns.discount) itemRow[colIdx++] = it.discount || 0;
                itemRow[colIdx++] = 0; // VAT
                if (columns.importPrice) itemRow[colIdx++] = it.unit_price || it.price || 0;
                if (columns.total) itemRow[colIdx++] = it.total || ((it.unit_price || it.price || 0) * (it.quantity || 0));
                if (columns.note) itemRow[colIdx++] = it.note || '';
                exportData.push(itemRow);
              });
            }
          });

          if (transactions.length === 0) { toast.error('Không có giao dịch nào'); return; }

          exportData.push(createRow());
          let dateRow = createRow();
          dateRow[totalCols - 2] = `Ngày ${now.getDate()} tháng ${now.getMonth()+1} năm ${now.getFullYear()}`;
          exportData.push(dateRow);
          exportData.push(createRow());
          
          let signRow1 = createRow();
          signRow1[0] = 'Khách hàng';
          signRow1[Math.floor(totalCols / 2)] = 'Người lập biểu';
          signRow1[totalCols - 2] = 'TM Công ty';
          exportData.push(signRow1);

          let signRow2 = createRow();
          signRow2[0] = '(Ký, họ tên)';
          signRow2[Math.floor(totalCols / 2)] = '(Ký, họ tên)';
          signRow2[totalCols - 2] = '(Ký, họ tên)';
          exportData.push(signRow2);

          try {
            const XLSX = await import('xlsx-js-style');
            const { applyDebtExcelStyles } = await import('../../utils/exportCSV');
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            
            const autoCols = [];
            autoCols.push({ wch: 14 }); // Thời gian
            autoCols.push({ wch: 14 }); // Mã
            autoCols.push({ wch: 28 }); // Diễn giải
            if (columns.detail) {
               if (columns.unit) autoCols.push({ wch: 8 });
               if (columns.quantity) autoCols.push({ wch: 8 });
               if (columns.price) autoCols.push({ wch: 12 });
               if (columns.discount) autoCols.push({ wch: 10 });
               autoCols.push({ wch: 8 }); // VAT
               if (columns.importPrice) autoCols.push({ wch: 14 });
               if (columns.total) autoCols.push({ wch: 14 });
               if (columns.note) autoCols.push({ wch: 14 });
            }
            autoCols.push({ wch: 14 }, { wch: 14 }, { wch: 16 }); // Ghi nợ, Ghi có, Dư nợ
            
            // Dynamic merges for Title and Date
            const merges = [
              { s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
              { s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } }
            ];

            applyDebtExcelStyles(ws, autoCols, headerRowIndex, merges);
            
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
