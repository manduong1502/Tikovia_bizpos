import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { orderAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { useSocket } from '../../context/SocketContext';
import {
  Search, SlidersHorizontal, Download, Plus, Upload, Star, Receipt, ChevronDown, Filter, Columns3, Settings, HelpCircle, AlertCircle, X, Pencil
} from 'lucide-react';
import OrderSidebar from './OrderSidebar';
import OrderDetail from './OrderDetail';
import Pagination from '../../components/common/Pagination';
import {
  getRangeByCreatedLabel,
  getRangeByExpectedLabel,
  inDateRange,
  buildCustomRange,
} from '../../utils/dateFilterUtils';

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

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
  { key: 'order_code', label: 'Mã hóa đơn', default: true },
  { key: 'created_at', label: 'Thời gian', default: true },
  { key: 'return_code', label: 'Mã trả hàng', default: true },
  { key: 'customer_code', label: 'Mã KH', default: true },
  { key: 'customer_name', label: 'Khách hàng', default: true },
  { key: 'total', label: 'Tổng tiền hàng', default: true, align: 'right' },
  { key: 'discount_amount', label: 'Giảm giá', default: true, align: 'right' },
  { key: 'paid_amount', label: 'Khách đã trả', default: true, align: 'right' },
  { key: 'payment_status', label: 'Trạng thái thanh toán', default: true },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { registerOrderUpdateCallback, unregisterOrderUpdateCallback } = useSocket() || {};

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
  const expandedIdRef = useRef(null);
  expandedIdRef.current = expandedId;

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState({ totalRows: 0, validItems: [], invalidItems: [] });

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // 1. Read sheet as 2D array of rows
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

        // 3. Extract headers
        const headers = rawRows[headerRowIndex].map(h => String(h || '').trim().toLowerCase());

        const ordersMap = new Map();
        const invalidItems = [];
        let totalProcessedRows = 0;

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          const isEmptyRow = row.every(cell => String(cell || '').trim() === '');
          if (isEmptyRow) continue;

          totalProcessedRows++;

          const findVal = (possibleKeys) => {
            const colIdx = headers.findIndex(h => possibleKeys.includes(h));
            return colIdx !== -1 ? row[colIdx] : '';
          };

          const order_code = String(findVal(['mã hóa đơn', 'ma hoa don', 'order_code', 'mã hd', 'ma hd']) || '').trim();
          const customer_code = String(findVal(['mã khách hàng', 'mã kh', 'ma kh', 'customer_code']) || '').trim();
          const customer_raw = String(findVal(['tên khách hàng', 'ten khach hang', 'customer_name', 'khách hàng', 'khach hang']) || '').trim();
          
          // KiotViet customer column often contains "Name - Phone" e.g. "Ông Nghĩnh Trần Tử Bình - 0905817561"
          let customer_name = customer_raw;
          let customer_phone = String(findVal(['điện thoại', 'dien thoai', 'phone', 'sđt', 'sdt']) || '').trim();
          if (customer_raw.includes(' - ')) {
            const parts = customer_raw.split(' - ');
            customer_name = parts[0].trim();
            if (!customer_phone && parts.length > 1) {
              customer_phone = parts[1].trim();
            }
          }

          const branch = String(findVal(['chi nhánh', 'chi nhanh', 'branch']) || '').trim();
          const priceBook = String(findVal(['bảng giá', 'bang gia', 'price_book']) || '').trim();
          const channel = String(findVal(['kênh bán', 'kenh ban', 'channel']) || '').trim();
          const note = String(findVal(['ghi chú', 'ghi chu', 'note']) || '').trim();

          const total = Number(String(findVal(['khách cần trả', 'khach can tra', 'tổng tiền', 'tong tien', 'total']) || '').replace(/[^0-9.-]/g, '')) || 0;
          const subtotal = Number(String(findVal(['tổng tiền hàng', 'tong tien hang', 'subtotal']) || '').replace(/[^0-9.-]/g, '')) || total;
          const discount = Number(String(findVal(['giảm giá hóa đơn', 'giam gia hoa don', 'giảm giá', 'discount']) || '').replace(/[^0-9.-]/g, '')) || 0;
          const paid = Number(String(findVal(['khách đã trả', 'khach da tra', 'paid']) || '').replace(/[^0-9.-]/g, '')) || total;
          const createdAt = String(findVal(['thời gian', 'thoi gian', 'created_at', 'ngày tạo']) || '').trim();

          // Item fields
          const product_sku = String(findVal(['mã hàng', 'ma hang', 'product_sku', 'sku']) || '').trim();
          const product_name = String(findVal(['tên hàng', 'ten hang', 'product_name', 'tên sản phẩm']) || '').trim();
          const unit = String(findVal(['đvt', 'dvt', 'unit']) || '').trim() || 'Cái';
          const quantity = Number(String(findVal(['số lượng', 'so luong', 'quantity']) || '').replace(/[^0-9.-]/g, '')) || 1;
          const price = Number(String(findVal(['đơn giá', 'don gia', 'price']) || '').replace(/[^0-9.-]/g, '')) || subtotal;
          const item_total = Number(String(findVal(['thành tiền', 'thanh tien', 'item_total']) || '').replace(/[^0-9.-]/g, '')) || (quantity * price);

          if (!order_code) {
            invalidItems.push({ row: i + 1, sku: '[Trống]', reason: 'Mã hóa đơn không được để trống' });
            continue;
          }

          const itemObj = {
            product_sku: product_sku || `SP-HD-${order_code}-${i}`,
            product_name: product_name || 'Hàng hóa chung',
            unit,
            quantity,
            price,
            total: item_total
          };

          if (ordersMap.has(order_code)) {
            ordersMap.get(order_code).items.push(itemObj);
          } else {
            ordersMap.set(order_code, {
              code: order_code,
              customer_code,
              customer_name: customer_name || 'Khách lẻ',
              customer_phone,
              branch,
              priceBook,
              channel,
              note,
              subtotal,
              discount,
              total,
              paid,
              createdAt,
              items: [itemObj]
            });
          }
        }

        const validItems = Array.from(ordersMap.values());

        setImportSummary({ totalRows: totalProcessedRows, validItems, invalidItems });
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
      const res = await orderAPI.importExcel({ items: importSummary.validItems });
      toast.success(res?.message || 'Import dữ liệu thành công!', { id: tid });
      setImportSummaryOpen(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi import dữ liệu', { id: tid });
    }
  };

  const handleDownloadSample = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const headers = [
        'Mã hóa đơn', 'Mã KH', 'Tên khách hàng', 
        'Mã hàng', 'Tên hàng', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền',
        'Tổng tiền hàng', 'Giảm giá', 'Khách đã trả', 'Ghi chú'
      ];
      const sampleData = [
        headers,
        ['HD000101', 'KH000001', 'Nguyễn Văn A', 'SP000001', 'Gà ta thả vườn làm sạch', 'Kg', 2, 150000, 300000, 300000, 20000, 280000, 'Giao hàng buổi chiều'],
        ['HD000101', 'KH000001', 'Nguyễn Văn A', 'SP000002', 'Trứng gà ta sạch', 'Hộp', 1, 35000, 35000, 300000, 20000, 280000, 'Giao hàng buổi chiều'],
        ['HD000102', 'KH000002', 'Trần Thị B', 'SP000003', 'Gà ác làm sạch nguyên con', 'Con', 1, 85000, 85000, 85000, 0, 85000, 'Khách quen'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      ws['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 25 }, 
        { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
        { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 25 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'OrdersTemplate');
      XLSX.writeFile(wb, 'MauFileHoaDon.xlsx');
    } catch (err) {
      toast.error('Không thể tải thư viện xử lý Excel');
    }
  };

  const [filters, setFilters] = useState({
    orderDate: { mode: 'all', label: 'Tháng này', start: null, end: null },
    statuses: new Set(['completed', 'pending', 'processing', 'failed', 'shipping']),
    deliveryStatus: '',
    deliveryPartner: '',
    deliveryDate: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
  });

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page: 1, limit: 150 };
      const r = await orderAPI.getAll(params);
      const rawList = Array.isArray(r) ? r : (r?.data || []);
      if (rawList.length === 0) {
        const mockOrders = [
          { id: 1, order_code: 'HD000042', created_at: '2026-05-12T14:30:00Z', customer_code: 'KH000001', customer_name: 'Anh Tuấn', total: 1550000, discount_amount: 50000, paid_amount: 1500000, payment_status: 'paid', status: 'completed', items: [{ product_sku: 'SP001', product_name: 'Gà ta sạch', quantity: 10, unit_price: 155000, discount: 5000, total: 1500000 }] },
          { id: 2, order_code: 'HD000041', created_at: '2026-05-11T10:15:00Z', customer_code: 'KH000002', customer_name: 'Chị Mai', total: 3200000, discount_amount: 200000, paid_amount: 3000000, payment_status: 'paid', status: 'completed', items: [{ product_sku: 'SP002', product_name: 'Gà ác làm sạch', quantity: 40, unit_price: 80000, discount: 5000, total: 3000000 }] },
          { id: 3, order_code: 'HD000040', created_at: '2026-05-10T09:00:00Z', customer_code: '', customer_name: 'Khách lẻ', total: 450000, discount_amount: 0, paid_amount: 450000, payment_status: 'paid', status: 'completed', items: [{ product_sku: 'SP003', product_name: 'Trứng gà sạch', quantity: 15, unit_price: 30000, discount: 0, total: 450000 }] },
        ];
        setOrders(mockOrders);
      } else {
        setOrders(prev => {
          return rawList.map(item => {
            const prevItem = prev.find(p => p.id === item.id);
            if (prevItem && prevItem._items) {
              const prevTime = prevItem.updatedAt ? new Date(prevItem.updatedAt).getTime() : 0;
              const currTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
              if (prevTime !== currTime) {
                if (expandedIdRef.current === item.id) {
                  setTimeout(() => loadDetail(item.id), 50);
                }
                return item;
              }
              return { ...item, _items: prevItem._items };
            }
            return item;
          });
        });
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const codeFromState = location.state?.openOrderCode;
    const params = new URLSearchParams(location.search);
    const codeFromQuery = params.get('orderCode');
    const code = codeFromState || codeFromQuery;
    
    if (!code || orders.length === 0) return;

    const matchedOrder = orders.find(o => String(o.order_code).toLowerCase() === String(code).toLowerCase());
    if (matchedOrder) {
      setFilters(prev => ({
        ...prev,
        orderDate: { mode: 'all', label: 'Toàn thời gian', start: null, end: null }
      }));
      setSearch(code);
      setExpandedId(matchedOrder.id);
      loadDetail(matchedOrder.id);
      scrollRowIntoView(matchedOrder.id);
      
      if (codeFromState) {
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [location.state?.openOrderCode, location.search, orders, navigate, location.pathname]);

  useEffect(() => {
    if (!registerOrderUpdateCallback) return;
    const handleRealtimeOrderUpdate = (data) => {
      console.log("⚡ Nhận sự kiện cập nhật đơn hàng từ Socket.io:", data);
      reload();
    };
    registerOrderUpdateCallback(handleRealtimeOrderUpdate);
    return () => {
      unregisterOrderUpdateCallback(handleRealtimeOrderUpdate);
    };
  }, [registerOrderUpdateCallback, unregisterOrderUpdateCallback, reload]);

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
    const qProd = searchProduct.trim().toLowerCase();

    return orders.filter((o) => {
      if (q && !(o.order_code || '').toLowerCase().includes(q) && !(o.customer_name || '').toLowerCase().includes(q) && !(o.customer_code || '').toLowerCase().includes(q)) return false;
      if (qCode && !(o.order_code || '').toLowerCase().includes(qCode)) return false;
      if (qCust && !(o.customer_name || '').toLowerCase().includes(qCust) && !(o.customer_code || '').toLowerCase().includes(qCust)) return false;
      if (qProd && !o.items?.some(it => (it.product_sku || '').toLowerCase().includes(qProd) || (it.product_name || '').toLowerCase().includes(qProd))) return false;

      if (filters.statuses && !filters.statuses.has(o.status || 'completed')) return false;

      if (filters.deliveryStatus && o.delivery_status !== filters.deliveryStatus) return false;
      if (filters.deliveryPartner && o.delivery_partner !== filters.deliveryPartner) return false;

      if (filters.orderDate && filters.orderDate.mode === 'all' && filters.orderDate.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filters.orderDate.label);
        if (range && !inDateRange(o.created_at || o.createdAt, range)) return false;
      } else if (filters.orderDate && filters.orderDate.mode === 'custom' && filters.orderDate.start) {
        const range = buildCustomRange(filters.orderDate.start, filters.orderDate.end);
        if (range && !inDateRange(o.created_at || o.createdAt, range)) return false;
      }

      if (filters.deliveryDate && filters.deliveryDate.mode === 'all' && filters.deliveryDate.label !== 'Toàn thời gian') {
        const range = getRangeByExpectedLabel(filters.deliveryDate.label);
        if (range && !inDateRange(o.delivery_date || o.deliveryDate || o.expected_delivery_date, range)) return false;
      } else if (filters.deliveryDate && filters.deliveryDate.mode === 'custom' && filters.deliveryDate.start) {
        const range = buildCustomRange(filters.deliveryDate.start, filters.deliveryDate.end);
        if (range && !inDateRange(o.delivery_date || o.deliveryDate || o.expected_delivery_date, range)) return false;
      }

      return true;
    });
  }, [orders, search, searchCode, searchCustomer, searchProduct, filters]);

  // Reset currentPage when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, searchCode, searchCustomer, searchProduct, filters]);

  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (['total', 'discount_amount', 'paid_amount'].includes(sortConfig.key)) {
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

  const handleExport = async () => {
    const dataToExport = selectedIds.size > 0 ? filtered.filter(item => selectedIds.has(item.id)) : filtered;
    if (dataToExport.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    try {
      const { exportCSV } = await import('../../utils/exportCSV');
      exportCSV('hoa_don', ['Mã hóa đơn', 'Thời gian', 'Khách hàng', 'Tổng tiền', 'Giảm giá', 'Khách trả'],
        dataToExport.map(o => [o.order_code, o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '', o.customer_name || 'Khách lẻ', o.total || 0, o.discount_amount || 0, o.paid_amount || 0])
      );
    } catch (err) {
      toast.error('Không thể tải thư viện xuất CSV');
    }
  };

  const loadDetail = async (id) => {
    try {
      const r = await orderAPI.getById(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...r, _items: r.items || o.items || [], subtotal: r.subtotal || o.total, note: r.note || o.note } : o));
    } catch {
      // Mock fallback
    }
  };

  const sumTotal = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const sumDiscount = filtered.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
  const sumPaid = filtered.reduce((s, o) => s + Number(o.paid_amount || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-10 relative">
        <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">
          Hóa đơn
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
                placeholder="Theo mã hóa đơn, khách hàng"
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
                    <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer">Đóng</button>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Mã hóa đơn</label>
                    <input type="text" placeholder="Nhập mã hóa đơn" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Khách hàng (Tên / Mã)</label>
                    <input type="text" placeholder="Tên hoặc mã khách hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Hàng hóa (Tên / Mã)</label>
                    <input type="text" placeholder="Tên hoặc mã hàng hóa" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { setSearchCode(''); setSearchCustomer(''); setSearchProduct(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="primary" onClick={() => navigate('/pos')} className="flex items-center justify-center gap-1 shadow-md bg-primary hover:bg-primary-hover font-bold py-1.5 px-3 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer">
              <Plus size={16} /> <span className="hidden sm:inline">Bán hàng</span>
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
        <div className={`fixed top-14 bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-64 lg:p-0 lg:shadow-none lg:bg-transparent lg:overflow-y-auto lg:h-full lg:flex-none lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          <OrderSidebar filters={filters} onFilterChange={setFilters} />
        </div>

        {/* Main Table Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden w-full h-full min-w-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 w-full custom-scrollbar relative">
            <table className="w-full text-xs border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={paginated.length > 0 && paginated.every(o => selectedIds.has(o.id))}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {/* Summary row */}
              <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700 border-b border-gray-100">
                <td colSpan={2}></td>
                {visibleColumns.includes('order_code') && <td></td>}
                {visibleColumns.includes('created_at') && <td></td>}
                {visibleColumns.includes('return_code') && <td></td>}
                {visibleColumns.includes('customer_code') && <td></td>}
                {visibleColumns.includes('customer_name') && <td></td>}
                {visibleColumns.includes('total') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumTotal)}</td>}
                {visibleColumns.includes('discount_amount') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumDiscount)}</td>}
                {visibleColumns.includes('paid_amount') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumPaid)}</td>}
                {visibleColumns.includes('payment_status') && <td></td>}
              </tr>

              {isLoading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="animate-pulse border-b border-gray-100">
                    <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                    {visibleColumns.includes('order_code') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                    {visibleColumns.includes('created_at') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-28" /></td>}
                    {visibleColumns.includes('return_code') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                    {visibleColumns.includes('customer_code') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>}
                    {visibleColumns.includes('customer_name') && <td className="py-2.5 px-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>}
                    {visibleColumns.includes('total') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                    {visibleColumns.includes('discount_amount') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-12 ml-auto" /></td>}
                    {visibleColumns.includes('paid_amount') && <td className="py-2.5 px-3 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto" /></td>}
                    {visibleColumns.includes('payment_status') && <td className="py-2.5 px-3"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>}
                  </tr>
                ))
              ) : paginated.map((o) => {
                const isSelected = selectedIds.has(o.id);
                const isStarred = starred.has(o.id);
                const isExpanded = expandedId === o.id;

                return (
                  <React.Fragment key={o.id}>
                    <tr
                      id={`row-${o.id}`}
                      onClick={() => {
                        if (isExpanded) setExpandedId(null);
                        else { 
                          setExpandedId(o.id); 
                          loadDetail(o.id); 
                          scrollRowIntoView(o.id);
                        }
                      }}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleOne(o.id, e.target.checked)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={e => toggleStar(e, o.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>

                      {visibleColumns.includes('order_code') && (
                        <td className="py-2.5 px-3 font-bold text-primary">{o.order_code}</td>
                      )}
                      {visibleColumns.includes('created_at') && (
                        <td className="py-2.5 px-3 text-gray-700">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                      )}
                      {visibleColumns.includes('return_code') && (
                        <td className="py-2.5 px-3 text-gray-500 font-medium">{o.return_code || '---'}</td>
                      )}
                      {visibleColumns.includes('customer_code') && (
                        <td className="py-2.5 px-3 text-gray-700">{o.customer_code || `KH${String(o.id).padStart(6, '0')}`}</td>
                      )}
                      {visibleColumns.includes('customer_name') && (
                        <td className="py-2.5 px-3 font-bold text-gray-800">{o.customer_name || 'Khách lẻ'}</td>
                      )}
                      {visibleColumns.includes('total') && (
                        <td className="py-2.5 px-3 text-right font-extrabold text-gray-800">{fmt(o.total)}</td>
                      )}
                      {visibleColumns.includes('discount_amount') && (
                        <td className="py-2.5 px-3 text-right text-gray-600">{Number(o.discount_amount) > 0 ? fmt(o.discount_amount) : '0'}</td>
                      )}
                      {visibleColumns.includes('paid_amount') && (
                        <td className="py-2.5 px-3 text-right font-extrabold text-primary">{fmt(o.paid_amount)}</td>
                      )}
                      {visibleColumns.includes('payment_status') && (
                        <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                          {(() => {
                            const total = Number(o.total || 0);
                            const paid = Number(o.paid_amount || 0);
                            let text = 'Chưa trả';
                            let badgeClass = 'bg-red-50 text-red-600 border border-red-200';
                            
                            if (paid >= total && total > 0) {
                              text = 'Hoàn thành';
                              badgeClass = 'bg-green-50 text-green-700 border border-green-200';
                            } else if (paid > 0 && paid < total) {
                              text = 'Một phần';
                              badgeClass = 'bg-yellow-50 text-yellow-700 border border-yellow-200';
                            }

                            return (
                              <div className="relative group/status flex items-center gap-1.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeClass}`}>
                                  {text}
                                </span>
                                <button
                                  onClick={async (evt) => {
                                    evt.stopPropagation();
                                    const newPaid = prompt(`Cập nhật số tiền khách thanh toán cho đơn ${o.order_code}:`, o.paid_amount);
                                    if (newPaid !== null) {
                                      const cleanStr = String(newPaid).replace(/[^0-9.-]/g, '');
                                      const num = Number(cleanStr) || 0;
                                      try {
                                        await orderAPI.update(o.id, { paid: num });
                                        toast.success('Cập nhật trạng thái thanh toán thành công!');
                                        reload();
                                      } catch (err) {
                                        toast.error(err.response?.data?.message || err.message || 'Cập nhật trạng thái thanh toán thất bại!');
                                      }
                                    }
                                  }}
                                  className="opacity-0 group-hover/status:opacity-100 p-1 hover:bg-gray-100 rounded-md transition-all cursor-pointer text-primary"
                                  title="Cập nhật nhanh trạng thái thanh toán"
                                >
                                  <Pencil size={11} />
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                      )}
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <tr id={`detail-${o.id}`}>
                        <OrderDetail order={o} onReload={reload} onClose={() => setExpandedId(null)} colSpan={visibleColumns.length + 2} />
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="p-12 text-center text-gray-400 font-medium">
                    <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
                    Không tìm thấy hóa đơn nào phù hợp với bộ lọc
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
          itemName="hóa đơn"
        />
      </div>
    </div>

      {/* Import Summary Modal */}
      {importSummaryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 flex items-center justify-between text-white shadow-md">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">Kết quả kiểm tra dữ liệu Excel hóa đơn</h2>
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
                    Hóa đơn hợp lệ sẵn sàng import ({importSummary.validItems.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                          <th className="py-2.5 px-4 w-28">Mã hóa đơn</th>
                          <th className="py-2.5 px-4 flex-1">Khách hàng</th>
                          <th className="py-2.5 px-4 w-28 text-right">Tổng tiền</th>
                          <th className="py-2.5 px-4 w-28 text-right">Giảm giá</th>
                          <th className="py-2.5 px-4 w-28 text-right">Đã trả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {importSummary.validItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/80">
                            <td className="py-1 px-3.5 font-bold text-primary">{it.order_code}</td>
                            <td className="py-1 px-3.5 text-gray-800 font-bold">{it.customer_name} {it.customer_code ? `(${it.customer_code})` : ''}</td>
                            <td className="py-1 px-3.5 text-right font-extrabold text-gray-900">{fmt(it.total)}</td>
                            <td className="py-1 px-3.5 text-right text-gray-600">{fmt(it.discount_amount)}</td>
                            <td className="py-1 px-3.5 text-right font-extrabold text-emerald-600">{fmt(it.paid_amount)}</td>
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
                          <th className="py-1 px-3.5 w-20 text-center">Dòng Excel</th>
                          <th className="py-1 px-3.5 w-32">Mã hóa đơn</th>
                          <th className="py-1 px-3.5 flex-1">Chi tiết lỗi / Nguyên nhân</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white font-medium">
                        {importSummary.invalidItems.map((err, i) => (
                          <tr key={i} className="hover:bg-rose-50/30 text-rose-900">
                            <td className="py-1 px-3.5 text-center font-bold text-rose-700">#{err.row}</td>
                            <td className="py-1 px-3.5 font-bold">{err.sku}</td>
                            <td className="py-1 px-3.5 flex items-center gap-1.5 text-rose-600">
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
    </div>
  );
}
