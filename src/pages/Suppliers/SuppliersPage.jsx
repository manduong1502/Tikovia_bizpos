import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supplierAPI, productAPI, purchaseOrderAPI, purchaseReturnAPI, cashbookAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, Building2, Edit, Trash2, Star, Filter, Columns3, Settings, HelpCircle, Copy, Save, Printer, MoreHorizontal, Eye, Tag, AlertCircle, X, Upload, SlidersHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { exportCSV, applyExcelStyles, applyDebtExcelStyles } from '../../utils/exportCSV';
import SupplierModal from './SupplierModal';
import PaymentModal from './PaymentModal';
import AdjustDebtModal from './AdjustDebtModal';
import ExportDebtModal from './ExportDebtModal';
import PurchaseOrderDetailModal from '../../components/modals/PurchaseOrderDetailModal';
import PurchaseReturnDetailModal from '../../components/modals/PurchaseReturnDetailModal';
import PaymentDetailModal from '../../components/modals/PaymentDetailModal';
import Pagination from '../../components/common/Pagination';
import { Pen, DollarSign, Percent } from 'lucide-react';

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
  { key: 'code', label: 'Mã NCC', default: true },
  { key: 'name', label: 'Tên nhà cung cấp', default: true },
  { key: 'phone', label: 'Điện thoại', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'address', label: 'Địa chỉ', default: true },
  { key: 'debt', label: 'Nợ hiện tại', default: true, align: 'right' },
  { key: 'total_spent', label: 'Tổng mua', default: true, align: 'right' },
  { key: 'net_purchase', label: 'Tổng mua trừ trả hàng', default: false, align: 'right' },
  { key: 'isActive', label: 'Trạng thái', default: false },
  { key: 'note', label: 'Ghi chú', default: false },
  { key: 'created_at', label: 'Ngày tạo', default: false },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [cashbooks, setCashbooks] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
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
  const [editSupplier, setEditSupplier] = useState(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportModalSupplier, setExportModalSupplier] = useState(null);
  
  const [selectedTx, setSelectedTx] = useState(null);

  const handleOpenTransaction = async (tx, partnerName) => {
    if (!tx || !tx.id) {
      setSelectedTx(tx ? { ...tx, partnerName } : null);
      return;
    }
    const tid = toast.loading('Đang tải chi tiết giao dịch...');
    try {
      let detail = null;
      if (tx.type === 'import') {
        detail = await purchaseOrderAPI.getById(tx.id);
        if (detail) {
          setSelectedTx({
            ...detail,
            type: 'import',
            partnerName: partnerName
          });
        } else {
          setSelectedTx({ ...tx, partnerName });
        }
      } else if (tx.type === 'return') {
        detail = await purchaseReturnAPI.getById(tx.id);
        if (detail) {
          // Ensure return items have SKU and product name
          const detailItems = (detail?.items || []).map(it => {
            const prod = products.find(p => p.id === it.productId || p.id === it.product_id);
            return {
              ...it,
              product_sku: it.product_sku || it.sku || prod?.sku || '',
              product_name: it.product_name || it.name || prod?.name || '',
            };
          });
          setSelectedTx({
            ...detail,
            items: detailItems,
            type: 'return',
            partnerName: partnerName
          });
        } else {
          setSelectedTx({ ...tx, partnerName });
        }
      } else {
        setSelectedTx({ ...tx, partnerName });
      }
    } catch (err) {
      console.error(err);
      setSelectedTx({ ...tx, partnerName });
    } finally {
      toast.dismiss(tid);
    }
  };

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustModalSupplier, setAdjustModalSupplier] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalSupplier, setPaymentModalSupplier] = useState(null);

  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState({ totalRows: 0, validItems: [], invalidItems: [] });

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

          const code = String(findVal(['mã nhà cung cấp', 'mã ncc', 'ma ncc', 'code', 'ma_ncc']) || '').trim();
          const name = String(findVal(['tên nhà cung cấp', 'ten nha cung cap', 'name', 'tên_nhà_cung_cấp', 'tên ncc', 'ten ncc']) || '').trim();
          const phone = String(findVal(['điện thoại', 'dien thoai', 'phone', 'sđt', 'sdt']) || '').trim();
          const email = String(findVal(['email']) || '').trim();
          const address = String(findVal(['địa chỉ', 'dia chi', 'address']) || '').trim();
          const totalSpent = Number(String(findVal(['tổng mua', 'tong mua', 'total_spent']) || '').replace(/[^0-9.-]/g, '')) || 0;
          const totalDebt = Number(String(findVal(['nợ cần trả hiện tại', 'no can tra hien tai', 'công nợ', 'cong no', 'debt', 'nợ', 'no']) || '').replace(/[^0-9.-]/g, '')) || 0;
          const note = String(findVal(['ghi chú', 'ghi chu', 'note']) || '').trim();
          
          const rawStatus = String(findVal(['trạng thái', 'trang thai', 'status', 'is_active', 'active']) || '').trim();
          const isActive = rawStatus === '0' || rawStatus.toLowerCase() === 'false' || rawStatus.toLowerCase() === 'ngừng hoạt động' ? false : true;

          const rawNetVal = findVal(['tổng mua trừ trả hàng', 'tong mua tru tra hang', 'net_purchase']);
          let netPurchase = totalSpent;
          let totalReturn = 0;
          if (rawNetVal !== '') {
            netPurchase = Number(String(rawNetVal).replace(/[^0-9.-]/g, '')) || 0;
            totalReturn = totalSpent - netPurchase;
          }

          const createdBy = String(findVal(['người tạo', 'nguoi tao', 'created_by']) || '').trim();
          const createdAt = String(findVal(['ngày tạo', 'ngay tao', 'created_at']) || '').trim();

          if (!name) {
            invalidItems.push({ row: i + 1, sku: code || '[Trống]', reason: 'Tên nhà cung cấp không được để trống' });
            continue;
          }

          validItems.push({
            code,
            name,
            phone,
            email,
            address,
            debt: totalDebt,
            totalDebt: totalDebt,
            total_spent: totalSpent,
            totalSpent: totalSpent,
            total_return: totalReturn,
            totalReturn: totalReturn,
            net_purchase: netPurchase,
            netPurchase: netPurchase,
            note,
            isActive,
            created_by: createdBy,
            createdBy: createdBy,
            created_at: createdAt,
            createdAt: createdAt,
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
  };

  const handleConfirmImport = async () => {
    if (importSummary.validItems.length === 0) {
      toast.error('Không có dữ liệu hợp lệ để import!');
      return;
    }
    const tid = toast.loading('Đang xử lý import dữ liệu...');
    try {
      const res = await supplierAPI.importExcel({ items: importSummary.validItems });
      toast.success(res?.message || 'Import dữ liệu thành công!', { id: tid });
      setImportSummaryOpen(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi import dữ liệu', { id: tid });
    }
  };

  const handleDownloadSample = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Mã NCC', 'Tên nhà cung cấp', 'Điện thoại', 'Email', 'Địa chỉ', 'Công nợ', 'Ghi chú'];
    const sampleData = [
      headers,
      ['NCC00001', 'Công ty TNHH Thực phẩm Sạch', '0912345678', 'contact@thucpham.vn', '123 Nguyễn Văn Linh, Q.7, TP.HCM', 1500000, 'Nhà cung cấp uy tín'],
      ['NCC00002', 'Đại lý Nước giải khát Miền Nam', '0987654321', 'sales@ngk.com', '456 Lê Lợi, Q.1, TP.HCM', 0, 'Giao hàng nhanh'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'SuppliersTemplate');
    XLSX.writeFile(wb, 'MauFileNhaCungCap.xlsx');
  };

  const [filterGroup, setFilterGroup] = useState('');
  const [filterDebt, setFilterDebt] = useState('all'); // 'all' | 'has_debt' | 'no_debt'

  const [detailTab, setDetailTab] = useState('info');
  const [detailSearchSku, setDetailSearchSku] = useState('');
  const [detailSearchName, setDetailSearchName] = useState('');
  const [supNotes, setSupNotes] = useState({});

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const [supRes, prodRes, poRes, prRes, cbRes] = await Promise.all([
        supplierAPI.getAll({ limit: 500 }),
        productAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll({ limit: 500 }).catch(() => []),
        purchaseReturnAPI.getAll({ limit: 500 }).catch(() => []),
        cashbookAPI.getAll({ partnerType: 'supplier' }).catch(() => [])
      ]);
      const rawList = Array.isArray(supRes) ? supRes : (supRes?.data || []);
      
      const rawCBs = Array.isArray(cbRes) ? cbRes : (cbRes?.data || []);
      setCashbooks(rawCBs);
      
      if (rawList.length === 0) {
        const mockSuppliers = [
          { id: 1, code: 'NCC001', name: 'Công ty TNHH Phân phối ABC', phone: '0281234567', email: 'contact@abc.vn', address: 'Q.Bình Tân, TP.HCM', debt: 1500000, total_spent: 12500000, total_return: 1305000, net_purchase: 11195000 },
          { id: 2, code: 'NCC002', name: 'Đại lý XYZ', phone: '0282345678', email: 'sales@xyz.com', address: 'Q.Tân Phú, TP.HCM', debt: 0, total_spent: 8400000, total_return: 0, net_purchase: 8400000 },
          { id: 3, code: 'NCC003', name: 'Công ty Cổ phần VinaFood', phone: '0283456789', email: 'info@vinafood.vn', address: 'Q.1, TP.HCM', debt: 5000000, total_spent: 45000000, total_return: 0, net_purchase: 45000000 },
        ];
        setSuppliers(mockSuppliers);
      } else {
        setSuppliers(rawList);
      }
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes?.data || []));

      const rawPOs = Array.isArray(poRes) ? poRes : (poRes?.data || []);
      const normalizedPOs = rawPOs.map(o => ({
        ...o,
        id: o.id,
        supplierId: o.supplierId || o.supplier_id || o.supplier?.id || null,
        po_code: o.po_code || o.code || '',
        created_at: o.created_at || o.createdAt || null,
        supplier_code: o.supplier_code || o.supplier?.code || '',
        supplier_name: o.supplier_name || o.supplier?.name || '',
        total: Number(o.total || 0),
        paid_amount: Number(o.paid_amount || o.paidAmount || o.paid || 0),
        payment_status: o.payment_status || o.paymentStatus || (o.status === 'PENDING' ? 'partial' : 'paid'),
        status: o.status || 'COMPLETED',
        items: Array.isArray(o.items) ? o.items.map(it => ({
          ...it,
          product_sku: it.product_sku || it.product?.sku || '',
          product_name: it.product_name || it.product?.name || '',
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || it.price || 0),
          discount: Number(it.discount || 0),
          total: Number(it.total || (it.quantity * (it.price || it.unit_price || 0)))
        })) : []
      }));

      const rawPRs = Array.isArray(prRes) ? prRes : (prRes?.data || []);
      const normalizedPRs = rawPRs.map(o => ({
        ...o,
        id: o.id,
        supplierId: o.supplierId || o.supplier_id || o.supplier?.id || null,
        code: o.code || '',
        created_at: o.createdAt || o.created_at || null,
        supplier_code: o.supplier_code || o.supplier?.code || '',
        supplier_name: o.supplier?.name || o.supplier_name || '',
        total: Number(o.total || 0),
        discount: Number(o.discount || 0),
        supplier_must_pay: Math.max(0, Number(o.total || 0) - Number(o.discount || 0)),
        paid: Number(o.paid || 0),
        status: o.status || 'COMPLETED',
        createdBy: o.createdBy || 'Võ Thành Huy',
        receivedBy: o.receivedBy || 'Võ Thành Huy',
        items: Array.isArray(o.items) ? o.items : []
      }));

      setPurchaseOrders(normalizedPOs);
      setPurchaseReturns(normalizedPRs);
    } catch {
      setSuppliers([]);
      setProducts([]);
      setPurchaseOrders([]);
      setPurchaseReturns([]);
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
    const qName = searchName.trim().toLowerCase();
    const qPhone = searchPhone.trim().toLowerCase();

    return suppliers.filter((s) => {
      if (q && !(s.name || '').toLowerCase().includes(q) && !(s.code || '').toLowerCase().includes(q) && !(s.phone || '').toLowerCase().includes(q)) return false;
      if (qCode && !(s.code || '').toLowerCase().includes(qCode)) return false;
      if (qName && !(s.name || '').toLowerCase().includes(qName)) return false;
      if (qPhone && !(s.phone || '').toLowerCase().includes(qPhone)) return false;

      if (filterGroup && filterGroup !== 'all') return false;

      if (filterDebt === 'has_debt' && (Number(s.debt) || 0) <= 0) return false;
      if (filterDebt === 'no_debt' && (Number(s.debt) || 0) > 0) return false;

      return true;
    });
  }, [suppliers, search, searchCode, searchName, searchPhone, filterGroup, filterDebt]);

  // Reset currentPage when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, searchCode, searchName, searchPhone, filterGroup, filterDebt]);

  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (['debt', 'total_spent', 'net_purchase'].includes(sortConfig.key)) {
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
    if (checked) setSelectedIds(new Set(paginated.map(s => s.id)));
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
    const dataToExport = selectedIds.size > 0 ? filtered.filter(item => selectedIds.has(item.id)) : filtered;
    
    if (dataToExport.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportCSV('nha_cung_cap', ['Mã NCC', 'Tên nhà cung cấp', 'Điện thoại', 'Email', 'Địa chỉ', 'Nợ hiện tại', 'Tổng mua'],
      dataToExport.map(s => [s.code || `NCC${String(s.id).padStart(3, '0')}`, s.name, s.phone || '', s.email || '', s.address || '', s.debt || 0, s.total_spent || 0])
    );
  };

  const handleExportDebt = async (timeRange, columns) => {
    if (!exportModalSupplier) return;
    const s = exportModalSupplier;
    const supCode = s.code || `NCC${String(s.id).padStart(3, '0')}`;
    const supId = s.id;
    const supPOs = purchaseOrders.filter(po => {
      const poSupId = po.supplierId || po.supplier_id || po.supplier?.id;
      if (poSupId) return poSupId === supId;
      const poSupCode = po.supplier_code || po.supplier?.code;
      if (poSupCode) return poSupCode === supCode;
      return po.supplier_name === s.name;
    });
    const supPRs = purchaseReturns.filter(pr => {
      const prSupId = pr.supplierId || pr.supplier_id || pr.supplier?.id;
      if (prSupId) return prSupId === supId;
      const prSupCode = pr.supplier_code || pr.supplier?.code;
      if (prSupCode) return prSupCode === supCode;
      return pr.supplier_name === s.name;
    });

    const tid = toast.loading('Đang chuẩn bị dữ liệu xuất, vui lòng đợi...');

    try {
      // Fetch detailed items for purchase orders
      for (let i = 0; i < supPOs.length; i++) {
        try {
          const detail = await purchaseOrderAPI.getById(supPOs[i].id);
          if (detail) {
            supPOs[i].items = detail.items || [];
          }
        } catch (e) {
          console.warn(`Lỗi khi lấy chi tiết đơn nhập ${supPOs[i].po_code}`, e);
        }
      }

      // Fetch detailed items for purchase returns and fill product details
      for (let i = 0; i < supPRs.length; i++) {
        try {
          const detail = await purchaseReturnAPI.getById(supPRs[i].id);
          if (detail) {
            supPRs[i].items = (detail.items || []).map(it => {
              const prod = products.find(p => p.id === it.productId || p.id === it.product_id);
              return {
                ...it,
                product_sku: it.product_sku || it.sku || prod?.sku || '',
                product_name: it.product_name || it.name || prod?.name || '',
              };
            });
          }
        } catch (e) {
          console.warn(`Lỗi khi lấy chi tiết đơn trả ${supPRs[i].code}`, e);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      toast.dismiss(tid);
    }

    const now = new Date();
    let startDate = new Date(0);
    let endDate = new Date();
    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'this_week') {
      const day = now.getDay() || 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    } else if (timeRange === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
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

    const supCashbooks = cashbooks.filter(cb => {
      if (cb.partnerType !== 'supplier') return false;
      const cbSupId = cb.supplierId || cb.customerId;
      if (cbSupId) return cbSupId === supId;
      const cbSupCode = cb.supplier_code || cb.customer_code;
      if (cbSupCode) return cbSupCode === supCode;
      return cb.partnerName === s.name;
    });

    const noDauKy = [
      ...supPOs.filter(po => po.status !== 'CANCELLED').map(po => ({ 
        date: new Date(po.created_at || po.createdAt), debtIncrease: Number(po.total || 0) - Number(po.paid_amount || po.paid || 0), debtDecrease: 0
      })),
      ...supPRs.filter(pr => pr.status !== 'CANCELLED').map(pr => ({ 
        date: new Date(pr.created_at || pr.createdAt), debtIncrease: 0, debtDecrease: pr.paid > 0 ? Number(pr.paid) : Number(pr.total || 0)
      })),
      ...supCashbooks.filter(cb => cb.status === 'completed' && cb.category !== 'Thu tiền trả hàng' && cb.category !== 'Trả tiền nhà cung cấp').map(cb => ({
        date: new Date(cb.createdAt || cb.created_at || cb.date), debtIncrease: cb.type === 'INCOME' ? Number(cb.amount || 0) : 0, debtDecrease: cb.type === 'EXPENSE' ? Number(cb.amount || 0) : 0
      }))
    ].filter(tx => tx.date < startDate).reduce((sum, tx) => sum + tx.debtIncrease - tx.debtDecrease, 0);

    const transactions = [
      ...supPOs.filter(po => po.status !== 'CANCELLED').map(po => {
        const total = Number(po.total || 0);
        const paid = Number(po.paid_amount || po.paid || 0);
        return { 
          code: po.po_code || po.code, type: 'Nhập hàng', date: new Date(po.created_at || po.createdAt), 
          total: total - paid, paid: paid, items: po.items || [] 
        };
      }),
      ...supPRs.filter(pr => pr.status !== 'CANCELLED').map(pr => ({ 
        code: pr.code, type: 'Trả hàng', date: new Date(pr.created_at || pr.createdAt), 
        total: pr.paid > 0 ? Number(pr.paid) : Number(pr.total || 0), paid: 0, items: pr.items || [] 
      })),
      ...supCashbooks.filter(cb => cb.status === 'completed' && cb.category !== 'Thu tiền trả hàng' && cb.category !== 'Trả tiền nhà cung cấp').map(cb => ({
        code: cb.code, type: 'Thanh toán', date: new Date(cb.createdAt || cb.created_at || cb.date),
        total: Number(cb.amount || 0), 
        paid: 0, items: [], cashbookType: cb.type
      }))
    ].filter(tx => {
      if (timeRange === 'all') return true;
      if (timeRange === 'last_month') return tx.date >= startDate && tx.date <= endDate;
      if (typeof timeRange === 'object' && timeRange !== null && timeRange.mode === 'custom') {
        return tx.date >= startDate && tx.date <= endDate;
      }
      return tx.date >= startDate;
    }).sort((a, b) => a.date - b.date);

    // 1. Build headers to know total columns
    const headerRow = ['Thời gian', 'Mã', 'Diễn giải'];
    if (columns.detail) {
       if (columns.unit) headerRow.push('ĐVT');
       if (columns.quantity) headerRow.push('SL');
       if (columns.price) headerRow.push('Đơn giá');
       if (columns.discount) headerRow.push('Giảm giá');
       headerRow.push('VAT');
       if (columns.importPrice) headerRow.push('Giá nhập/trả');
       if (columns.total) headerRow.push('Thành tiền');
       if (columns.note) headerRow.push('Ghi chú');
    }
    headerRow.push('Ghi nợ', 'Ghi có');
    const totalCols = headerRow.length;

    const createRow = () => new Array(totalCols).fill('');

    const exportData = [];
    
    // Header section (Store Info)
    let row1 = createRow(); row1[0] = 'vohuy123'; exportData.push(row1);
    let row2 = createRow(); row2[0] = 'Địa chỉ'; exportData.push(row2);
    let row3 = createRow(); row3[0] = 'Điện thoại'; row3[1] = '+84387564952'; exportData.push(row3);
    
    const formatDate = (date) => {
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    let dateStr = `Từ ngày ${formatDate(startDate)} đến ngày ${formatDate(endDate)}`;
    if (timeRange === 'all') dateStr = `Toàn thời gian`;

    // Title & Date (Merged dynamically later)
    let row4 = createRow(); row4[0] = 'Công nợ chi tiết nhà cung cấp'; exportData.push(row4);
    let row5 = createRow(); row5[0] = dateStr; exportData.push(row5);

    // Calculate totals for header
    const totalGhiNo = transactions.reduce((s, tx) => {
      if (tx.type === 'Nhập hàng') return s + tx.total;
      if (tx.type === 'Thanh toán' && tx.cashbookType === 'INCOME') return s + tx.total;
      return s;
    }, 0);
    const totalGhiCo = transactions.reduce((s, tx) => {
      if (tx.type === 'Trả hàng') return s + tx.total;
      if (tx.type === 'Thanh toán' && tx.cashbookType === 'EXPENSE') return s + tx.total;
      return s;
    }, 0);
    const noCuoiKy = noDauKy + totalGhiNo - totalGhiCo;

    // Supplier & Debt Summary Info
    let row6 = createRow(); row6[0] = 'Tên NCC'; row6[1] = s.name; row6[totalCols - 3] = 'Nợ đầu kỳ'; row6[totalCols - 2] = noDauKy; exportData.push(row6);
    let row7 = createRow(); row7[0] = 'Mã NCC'; row7[1] = supCode; row7[totalCols - 3] = 'Phát sinh trong'; row7[totalCols - 2] = totalGhiNo; row7[totalCols - 1] = totalGhiCo; exportData.push(row7);
    let row8 = createRow(); row8[0] = 'Điện thoại'; row8[1] = s.phone || ''; row8[totalCols - 3] = 'Nợ cuối kỳ'; row8[totalCols - 2] = noCuoiKy; exportData.push(row8);
    exportData.push(createRow()); // Empty Row 9
    
    // Table Headers
    const headerRowIndex = 9; // 0-based, so Row 10
    exportData.push(headerRow);
    
    transactions.forEach(tx => {
      // Dòng phiếu (Summary row)
      const txTimeStr = `${formatDate(tx.date)} ${String(tx.date.getHours()).padStart(2, '0')}:${String(tx.date.getMinutes()).padStart(2, '0')}`;
      
      let ghiNo = 0;
      let ghiCo = 0;
      if (tx.type === 'Nhập hàng') {
        ghiNo = tx.total;
        ghiCo = 0;
      } else if (tx.type === 'Trả hàng') {
        ghiNo = 0;
        ghiCo = tx.total;
      } else if (tx.type === 'Thanh toán') {
        ghiNo = tx.cashbookType === 'INCOME' ? tx.total : 0;
        ghiCo = tx.cashbookType === 'EXPENSE' ? tx.total : 0;
      }

      const summaryRow = createRow();
      summaryRow[0] = txTimeStr;
      summaryRow[1] = tx.code;
      summaryRow[2] = tx.type;
      summaryRow[totalCols - 2] = ghiNo || '';
      summaryRow[totalCols - 1] = ghiCo || '';
      exportData.push(summaryRow);

      // Dòng sản phẩm (Item rows)
      if (columns.detail && tx.items && tx.items.length > 0) {
        tx.items.forEach(it => {
            const sku = it.product_sku || it.product?.sku || it.sku || '';
            const name = it.product_name || it.product?.name || it.name || '';
            
            const itemRow = createRow();
            itemRow[1] = sku;
            itemRow[2] = name;
            let colIdx = 3;
            if (columns.unit) itemRow[colIdx++] = it.product?.unit || it.unit || 'Cái';
            if (columns.quantity) itemRow[colIdx++] = it.quantity || 0;
            if (columns.price) itemRow[colIdx++] = it.price || it.unit_price || 0;
            if (columns.discount) itemRow[colIdx++] = it.discount || 0;
            itemRow[colIdx++] = 0; // VAT
            if (columns.importPrice) itemRow[colIdx++] = it.returnPrice || it.price || it.unit_price || 0;
            if (columns.total) itemRow[colIdx++] = it.total || ((it.price || it.unit_price || 0) * (it.quantity || 0));
            if (columns.note) itemRow[colIdx++] = it.note || '';
            exportData.push(itemRow);
        });
      }
    });

    if (transactions.length === 0) {
      toast.error('Không có giao dịch nào trong khoảng thời gian này');
      return;
    }

    // Footer
    exportData.push(createRow());
    let dateRow = createRow();
    dateRow[totalCols - 2] = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
    exportData.push(dateRow);
    exportData.push(createRow());
    
    let signRow1 = createRow();
    signRow1[0] = 'Nhà cung cấp';
    signRow1[Math.floor(totalCols / 2)] = 'Người lập biểu';
    signRow1[totalCols - 2] = 'TM Công ty';
    exportData.push(signRow1);

    let signRow2 = createRow();
    signRow2[0] = '(Ký, họ tên)';
    signRow2[Math.floor(totalCols / 2)] = '(Ký, họ tên)';
    signRow2[totalCols - 2] = '(Ký, họ tên)';
    exportData.push(signRow2);

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
    autoCols.push({ wch: 14 }, { wch: 14 }); // Ghi nợ, Ghi có
    
    // Dynamic merges for Title and Date
    const merges = [
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } }
    ];

    applyDebtExcelStyles(ws, autoCols, headerRowIndex, merges);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CongNo');
    XLSX.writeFile(wb, `CongNoChiTietNhaCungCap_${supCode}.xlsx`);
    toast.success('Đã xuất file công nợ');
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa nhà cung cấp này?')) return;
    try {
      await supplierAPI.delete(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      setExpandedId(null);
      toast.success('Xóa nhà cung cấp thành công');
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Lỗi khi xóa nhà cung cấp';
      toast.error(`Xóa nhà cung cấp thất bại: ${serverMsg}`);
    }
  };

  const handleCopySupplier = (s) => {
    const text = `Mã NCC: ${s.code || `NCC${String(s.id).padStart(3, '0')}`}\nTên NCC: ${s.name}\nSĐT: ${s.phone || '---'}\nEmail: ${s.email || '---'}\nĐịa chỉ: ${s.address || '---'}\nNợ hiện tại: ${fmt(s.debt || 0)}`;
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép thông tin nhà cung cấp');
  };

  const handlePrintSupplier = (s) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Thông tin nhà cung cấp - ${s.code || `NCC${String(s.id).padStart(3, '0')}`}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1e3a8a; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .info-table td { padding: 8px 12px; border: 1px solid #e5e7eb; }
            .info-table td.label { font-weight: bold; background-color: #f9fafb; width: 30%; }
          </style>
        </head>
        <body>
          <h2>THÔNG TIN NHÀ CUNG CẤP</h2>
          <table class="info-table">
            <tr><td class="label">Mã NCC</td><td>${s.code || `NCC${String(s.id).padStart(3, '0')}`}</td></tr>
            <tr><td class="label">Tên nhà cung cấp</td><td>${s.name}</td></tr>
            <tr><td class="label">Điện thoại</td><td>${s.phone || '---'}</td></tr>
            <tr><td class="label">Email</td><td>${s.email || '---'}</td></tr>
            <tr><td class="label">Địa chỉ</td><td>${s.address || '---'}</td></tr>
            <tr><td class="label">Nợ hiện tại</td><td>${fmt(s.debt || 0)} VNĐ</td></tr>
            <tr><td class="label">Tổng mua</td><td>${fmt(s.total_spent || 0)} VNĐ</td></tr>
            <tr><td class="label">Ghi chú</td><td>${s.note || '---'}</td></tr>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  const renderDetail = (s) => {
    const supCode = s.code || `NCC${String(s.id).padStart(3, '0')}`;
    const supId = s.id;
    
    // Match by supplierId OR supplier_code OR supplier_name strictly
    const supPOs = purchaseOrders.filter(po => {
      const poSupId = po.supplierId || po.supplier_id || po.supplier?.id;
      if (poSupId) return poSupId === supId;
      const poSupCode = po.supplier_code || po.supplier?.code;
      if (poSupCode) return poSupCode === supCode;
      return po.supplier_name === s.name;
    });
    const supPRs = purchaseReturns.filter(pr => {
      const prSupId = pr.supplierId || pr.supplier_id || pr.supplier?.id;
      if (prSupId) return prSupId === supId;
      const prSupCode = pr.supplier_code || pr.supplier?.code;
      if (prSupCode) return prSupCode === supCode;
      return pr.supplier_name === s.name;
    });

    const transactions = [
      ...supPOs.filter(po => po.status !== 'CANCELLED').map(po => {
        const total = Number(po.total || 0);
        const paid = Number(po.paid_amount || po.paid || 0);
        return {
          id: po.id,
          code: po.po_code,
          type: 'import',
          typeName: 'Nhập hàng',
          date: po.created_at,
          total: total - paid,
          paid: paid,
          debt: total - paid,
          status: po.payment_status,
          items: po.items || []
        };
      }),
      ...supPRs.filter(pr => pr.status !== 'CANCELLED').map(pr => ({
        id: pr.id,
        code: pr.code,
        type: 'return',
        typeName: 'Trả hàng',
        date: pr.created_at,
        total: pr.paid > 0 ? pr.paid : pr.total,
        paid: pr.paid || 0,
        debt: pr.paid > 0 ? -Number(pr.paid) : -Number(pr.total || 0),
        status: pr.status,
        items: pr.items || []
      })),
      ...cashbooks.filter(cb => {
        if (cb.partnerType !== 'supplier') return false;
        if (cb.category === 'Thu tiền trả hàng') return false;
        if (cb.category === 'Trả tiền nhà cung cấp') return false; // Filter out order checkout payments
        const cbSupId = cb.supplierId || cb.customerId;
        if (cbSupId) return cbSupId === supId;
        const cbSupCode = cb.supplier_code || cb.customer_code;
        if (cbSupCode) return cbSupCode === supCode;
        return cb.partnerName === s.name;
      }).filter(cb => cb.status === 'completed').map(cb => ({
        id: cb.id || cb.code,
        code: cb.code,
        type: 'payment',
        typeName: 'Thanh toán',
        date: cb.createdAt || cb.created_at || cb.date,
        total: cb.amount,
        paid: cb.amount,
        debt: cb.type === 'INCOME' ? Number(cb.amount || 0) : -Number(cb.amount || 0),
        status: 'completed',
        items: []
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const itemStats = {};
    supPOs.forEach(po => {
      po.items?.forEach(it => {
        const sku = it.product_sku || 'N/A';
        if (!itemStats[sku]) {
          itemStats[sku] = {
            sku: sku,
            name: it.product_name || 'N/A',
            qty: 0,
            amount: 0
          };
        }
        itemStats[sku].qty += it.quantity || 0;
        itemStats[sku].amount += it.total || 0;
      });
    });

    supPRs.forEach(pr => {
      if (pr.status === 'CANCELLED') return;
      pr.items?.forEach(it => {
        const sku = it.product_sku || 'N/A';
        if (!itemStats[sku]) {
          itemStats[sku] = {
            sku: sku,
            name: it.product_name || 'N/A',
            qty: 0,
            amount: 0
          };
        }
        itemStats[sku].qty -= it.quantity || 0;
        itemStats[sku].amount -= it.total || 0;
      });
    });

    const statsList = Object.values(itemStats).filter(it => it.qty > 0 || it.amount > 0);

    // Derive product list from purchase order items (products table doesn't have supplierId)
    const productMap = {};
    supPOs.forEach(po => {
      po.items?.forEach(it => {
        const sku = it.product_sku || it.product?.sku || 'N/A';
        const productId = it.productId || it.product_id || it.product?.id;
        const key = productId || sku;
        if (!productMap[key]) {
          // Find matching product from full product list for price/stock
          const fullProduct = products.find(p => p.id === productId || p.sku === sku);
          productMap[key] = {
            sku: sku,
            name: it.product_name || it.product?.name || 'N/A',
            cost_price: fullProduct?.cost_price || fullProduct?.costPrice || it.unit_price || it.price || 0,
            sell_price: fullProduct?.sell_price || fullProduct?.sellPrice || 0,
            stock: fullProduct?.stock || fullProduct?.stock_quantity || 0,
          };
        }
      });
    });
    const supProducts = Object.values(productMap);
    const items = supProducts.filter(p => {
      if (detailSearchSku && !(p.sku || '').toLowerCase().includes(detailSearchSku.toLowerCase())) return false;
      if (detailSearchName && !(p.name || '').toLowerCase().includes(detailSearchName.toLowerCase())) return false;
      return true;
    });

    const totalStock = items.reduce((sum, p) => sum + (p.stock || p.stock_quantity || 0), 0);
    const totalCost = items.reduce((sum, p) => sum + (p.cost_price || p.costPrice || 0), 0);
    const currentNote = supNotes[s.id] ?? s.note ?? '';

    return (
      <tr key={`detail-${s.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in">
        <td colSpan={visibleColumns.length + 3} className="p-0">
          <div className="p-4 bg-gray-50/10">
            {/* Top Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mb-4 px-2">
              <button
                onClick={() => setDetailTab('info')}
                className={`py-1.5 px-0.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  detailTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Thông tin
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`py-1.5 px-0.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  detailTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Lịch sử nhập/trả hàng
              </button>
              <button
                onClick={() => setDetailTab('debt')}
                className={`py-1.5 px-0.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  detailTab === 'debt' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Nợ cần trả nhà cung cấp
              </button>
            </div>

            {detailTab === 'info' && (
              <div className="flex flex-col gap-3">
                {/* Header Info */}
                <div className="flex items-center justify-between bg-blue-50/50 p-3 px-4 rounded-lg border border-blue-100 text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-gray-800 tracking-tight">{s.name}</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                      {s.code || `NCC${String(s.id).padStart(3, '0')}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm">
                    <div><span className="text-gray-500">Điện thoại:</span> <span className="font-bold text-gray-800">{s.phone || '---'}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-bold text-gray-800">{s.email || '---'}</span></div>
                    <div><span className="text-gray-500">Địa chỉ:</span> <span className="font-bold text-gray-800">{s.address || '---'}</span></div>
                  </div>
                </div>

                {/* Items Table Section */}
                <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm max-w-full w-full max-h-56 overflow-y-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 border-b border-gray-200 bg-gray-50/50 gap-2 min-w-[700px]">
                    <div className="flex flex-wrap items-center gap-2 flex-1 w-full sm:w-auto">
                      <div className="relative w-full sm:w-48">
                        <Search size={12} className="absolute left-2.5 top-2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm mã hàng"
                          className="w-full pl-8 pr-2 py-1 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                          value={detailSearchSku}
                          onChange={e => setDetailSearchSku(e.target.value)}
                        />
                      </div>
                      <div className="relative w-full sm:w-48">
                        <Search size={12} className="absolute left-2.5 top-2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm tên hàng"
                          className="w-full pl-8 pr-2 py-1 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                          value={detailSearchName}
                          onChange={e => setDetailSearchName(e.target.value)}
                        />
                      </div>
                    </div>
                    <a href="/pricebook" target="_blank" className="text-primary text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer">
                      <Tag size={12} /> Thiết lập giá
                    </a>
                  </div>

                  <table className="w-full text-xs min-w-[700px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                        <th className="py-2.5 px-3.5">Mã hàng</th>
                        <th className="py-2.5 px-3.5">Tên hàng</th>
                        <th className="py-2.5 px-3.5 text-right">Giá vốn</th>
                        <th className="py-2.5 px-3.5 text-right">Giá bán</th>
                        <th className="py-2.5 px-3.5 text-right">Tồn kho</th>
                        <th className="py-2.5 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {items.map((p, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2 px-3.5 text-primary font-bold">{p.sku}</td>
                          <td className="py-2 px-3.5 text-gray-800">{p.name}</td>
                          <td className="py-2 px-3.5 text-right text-gray-600">{fmt(p.cost_price || p.costPrice || 0)}</td>
                          <td className="py-2 px-3.5 text-right text-gray-800 font-bold">{fmt(p.sell_price || p.sellPrice || 0)}</td>
                          <td className="py-2 px-3.5 text-right text-primary font-bold">{fmt(p.stock || p.stock_quantity || 0)}</td>
                          <td className="py-2 text-center">
                            <button className="p-0.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer border-none bg-transparent">
                              <Eye size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr><td colSpan={6} className="p-4 text-center text-gray-400">Không tìm thấy mặt hàng nào từ nhà cung cấp này</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Section: Note & Summary Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start text-xs mt-1">
                  <div className="sm:col-span-2">
                    <textarea
                      placeholder="Ghi chú..."
                      className="w-full h-16 sm:h-20 border border-gray-300 rounded-lg p-2.5 text-xs sm:text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                      value={currentNote}
                      onChange={(e) => setSupNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                    />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-1.5 text-xs shadow-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Số lượng mặt hàng</span><span className="font-bold text-gray-800">{items.length}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tồn kho</span><span className="font-bold text-gray-800">{fmt(totalStock)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng mua</span><span className="font-bold text-gray-800">{fmt(s.total_spent || 0)}</span></div>
                    <div className="flex justify-between items-center text-xs sm:text-sm border-t border-gray-200 pt-2 mt-0.5"><span className="font-bold text-gray-800">Nợ hiện tại</span><span className="font-extrabold text-red-600">{fmt(s.debt || 0)}</span></div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-200 pt-3 mt-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <Button variant="danger" onClick={() => handleDelete(s.id)} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Trash2 size={13} /> Xóa NCC
                    </Button>
                    <Button variant="secondary" onClick={() => handleCopySupplier(s)} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Copy size={13} /> Sao chép
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Download size={13} /> Xuất file
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <Button variant="primary" onClick={() => { setEditSupplier(s); setModalOpen(true); }} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-4 shadow-md font-bold bg-primary hover:bg-primary-hover whitespace-nowrap text-white">
                      <Edit size={13} /> Chỉnh sửa
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const noteText = supNotes[s.id] ?? s.note ?? '';
                        try {
                          await supplierAPI.update(s.id, { ...s, note: noteText });
                          toast.success('Lưu thông tin thành công');
                          reload();
                        } catch (err) {
                          toast.error(err.response?.data?.message || err.message || 'Lỗi khi lưu thông tin');
                        }
                      }}
                      className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap"
                    >
                      <Save size={13} /> Lưu
                    </Button>
                    <Button variant="secondary" onClick={() => { setPaymentModalSupplier(s); setPaymentModalOpen(true); }} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold text-green-600 border-green-200 hover:bg-green-50 whitespace-nowrap">
                      Thanh toán nợ
                    </Button>
                    <Button variant="secondary" onClick={() => handlePrintSupplier(s)} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold whitespace-nowrap">
                      <Printer size={13} /> In
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const nextActive = s.isActive === false ? true : false;
                        try {
                          await supplierAPI.update(s.id, { ...s, isActive: nextActive });
                          toast.success(`Đã ${nextActive ? 'cho phép hoạt động' : 'ngừng hoạt động'} nhà cung cấp`);
                          reload();
                        } catch (err) {
                          toast.error(err.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái');
                        }
                      }}
                      title={s.isActive === false ? "Cho phép hoạt động" : "Ngừng hoạt động"}
                      className="p-1.5 shadow-sm flex-none"
                    >
                      <MoreHorizontal size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {detailTab === 'history' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in text-xs">
                {/* Lịch sử giao dịch */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col max-h-56 overflow-y-auto">
                  <div className="p-2.5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                    <span className="font-extrabold text-gray-800 text-xs sm:text-sm">Lịch sử giao dịch nhập/trả</span>
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary font-bold rounded-full">{transactions.length} giao dịch</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider sticky top-[31px] bg-white z-10">
                          <th className="py-2.5 px-3.5">Mã đơn</th>
                          <th className="py-2.5 px-3.5">Loại</th>
                          <th className="py-2.5 px-3.5">Thời gian</th>
                          <th className="py-2.5 px-3.5 text-right">Giá trị</th>
                          <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2 px-3.5 font-bold text-primary cursor-pointer hover:underline" onClick={() => handleOpenTransaction(tx, s.name)}>{tx.code}</td>
                            <td className="py-2 px-3.5">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${tx.type === 'import' ? 'bg-blue-100 text-blue-700' : tx.type === 'return' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {tx.typeName}
                              </span>
                            </td>
                            <td className="py-2 px-3.5 text-gray-500">
                              {tx.date ? new Date(tx.date).toLocaleString('vi-VN') : ''}
                            </td>
                            <td className={`py-2 px-3.5 text-right font-extrabold ${tx.type === 'import' ? 'text-primary' : tx.type === 'return' ? 'text-red-600' : 'text-green-600'}`}>
                              {tx.type === 'import' ? '' : '-'}{fmt(Math.abs(tx.total))}
                            </td>
                            <td className="py-2 px-3.5 text-center">
                              <span className={`inline-block py-0.5 px-2 rounded-full text-[10px] font-bold ${
                                tx.status === 'paid' || tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                tx.status === 'partial' || tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-600'
                              }`}>
                                {tx.status === 'paid' || tx.status === 'COMPLETED' ? 'Hoàn thành' :
                                 tx.status === 'partial' || tx.status === 'PENDING' ? 'Phiếu tạm' :
                                 'Đã hủy'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {transactions.length === 0 && (
                          <tr><td colSpan={5} className="p-4 text-center text-gray-400">Không có giao dịch nào từ nhà cung cấp này</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Thống kê hàng nhập */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col max-h-56 overflow-y-auto">
                  <div className="p-2.5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                    <span className="font-extrabold text-gray-800 text-xs sm:text-sm">Thống kê hàng đã nhập từ NCC này</span>
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 font-bold rounded-full">
                      {statsList.reduce((sum, it) => sum + it.qty, 0)} sản phẩm
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider sticky top-[31px] bg-white z-10">
                          <th className="py-2.5 px-3.5">Mã hàng</th>
                          <th className="py-2.5 px-3.5">Tên hàng</th>
                          <th className="py-2.5 px-3.5 text-right">Tổng số lượng đã nhập</th>
                          <th className="py-2.5 px-3.5 text-right">Tổng giá trị đã nhập</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {statsList.map((stat, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2 px-3.5 font-bold text-gray-700">{stat.sku}</td>
                            <td className="py-2 px-3.5 text-gray-800 font-bold">{stat.name}</td>
                            <td className="py-2 px-3.5 text-right font-extrabold text-primary">{fmt(stat.qty)}</td>
                            <td className="py-2 px-3.5 text-right font-extrabold text-emerald-600">{fmt(stat.amount)}</td>
                          </tr>
                        ))}
                        {statsList.length === 0 && (
                          <tr><td colSpan={4} className="p-4 text-center text-gray-400">Chưa nhập mặt hàng nào từ nhà cung cấp này</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'debt' && (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col animate-fade-in text-xs max-h-72 overflow-y-auto">
                <div className="p-2.5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                  <span className="font-extrabold text-gray-800 text-xs sm:text-sm">Nợ cần trả nhà cung cấp</span>
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
                    <option value="Nhập hàng">Nhập hàng</option>
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
                        <th className="py-2.5 px-3.5 text-right">Nợ cần trả nhà cung cấp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {(() => {
                        // Calculate running debt backwards from the current debt
                        const currentFinalDebt = Number(s.debt || s.totalDebt || 0);
                        const sortedNewFirst = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
                        let tempDebt = currentFinalDebt;
                        const withDebt = sortedNewFirst.map(tx => {
                          const runningDebt = tempDebt;
                          tempDebt -= tx.debt;
                          return { ...tx, runningDebt };
                        });
                        return withDebt.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2 px-3.5 font-bold text-primary cursor-pointer hover:underline" onClick={() => handleOpenTransaction(tx, s.name)}>{tx.code}</td>
                          <td className="py-2 px-3.5 text-gray-500">{tx.date ? new Date(tx.date).toLocaleString('vi-VN') : ''}</td>
                          <td className="py-2 px-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${tx.type === 'import' ? 'bg-blue-100 text-blue-700' : tx.type === 'return' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {tx.typeName}
                            </span>
                          </td>
                          <td className={`py-2 px-3.5 text-right font-extrabold ${tx.type === 'payment' ? 'text-green-600' : tx.type === 'return' ? 'text-red-600' : 'text-primary'}`}>{fmt(Math.abs(tx.debt))}</td>
                          <td className="py-2 px-3.5 text-right font-extrabold text-red-600">{fmt(tx.runningDebt)}</td>
                        </tr>
                      ))})()}
                      {transactions.length === 0 && (
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
                        setExportModalSupplier(s);
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
                        setExportModalSupplier(s);
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
                        setAdjustModalSupplier(s);
                        setAdjustModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white border-none"
                    >
                      <Pen size={13} /> Điều chỉnh
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentModalSupplier(s);
                        setPaymentModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white shadow-sm border-gray-300"
                    >
                      <DollarSign size={13} /> Thanh toán
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white shadow-sm border-gray-300"
                    >
                      <Percent size={13} /> Chiết khấu
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

  const sumDebt = filtered.reduce((s, sup) => s + Number(sup.debt || 0), 0);
  const sumTotalSpent = filtered.reduce((s, sup) => s + Number(sup.total_spent || 0), 0);
  const sumNetPurchase = filtered.reduce((s, sup) => s + Number(sup.net_purchase ?? sup.total_spent ?? 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-10 relative">
        <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">
          Nhà cung cấp
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
                placeholder="Tìm nhà cung cấp"
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
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Mã NCC</label>
                    <input type="text" placeholder="Nhập mã NCC" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Tên nhà cung cấp</label>
                    <input type="text" placeholder="Nhập tên nhà cung cấp" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchName} onChange={e => setSearchName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Điện thoại</label>
                    <input type="text" placeholder="Nhập số điện thoại" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => { setSearchCode(''); setSearchName(''); setSearchPhone(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="primary" onClick={() => { setEditSupplier(null); setModalOpen(true); }} className="flex items-center justify-center gap-1 shadow-md bg-primary hover:bg-primary-hover font-bold py-1.5 px-3 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer">
              <Plus size={16} /> <span className="hidden sm:inline">Thêm nhà cung cấp</span>
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
        <div className={`fixed top-14 bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-64 lg:p-4 lg:shadow-sm lg:border lg:border-gray-100 lg:rounded-2xl lg:overflow-y-auto lg:h-full lg:flex-none lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col gap-2 font-sans`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          {/* Group Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Nhóm nhà cung cấp</span>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 min-h-[42px] text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white cursor-pointer"
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
            >
              <option value="">Tất cả các nhóm</option>
              <option value="all">Nhóm NCC chung</option>
            </select>
          </div>

          <hr className="border-gray-100" />

          {/* Debt Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Công nợ</span>
            <div className="flex flex-col gap-2.5">
              {[
                { value: 'all', label: 'Tất cả' },
                { value: 'has_debt', label: 'Có nợ' },
                { value: 'no_debt', label: 'Không nợ' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="radio"
                    name="debt_filter"
                    className="rounded-full border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={filterDebt === opt.value}
                    onChange={() => setFilterDebt(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
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
                    checked={paginated.length > 0 && paginated.every(s => selectedIds.has(s.id))}
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
                {visibleColumns.includes('debt') && <td className="py-2.5 px-3 text-right text-red-500 font-extrabold">{fmt(sumDebt)}</td>}
                {visibleColumns.includes('total_spent') && <td className="py-2.5 px-3 text-right text-primary font-extrabold">{fmt(sumTotalSpent)}</td>}
                {visibleColumns.includes('net_purchase') && <td className="py-2.5 px-3 text-right text-emerald-600 font-extrabold">{fmt(sumNetPurchase)}</td>}
                {visibleColumns.includes('isActive') && <td></td>}
                {visibleColumns.includes('note') && <td></td>}
                {visibleColumns.includes('created_at') && <td></td>}
                <td></td>
              </tr>
              {paginated.map((s) => {
                const isSelected = selectedIds.has(s.id);
                const isStarred = starred.has(s.id);
                const isExpanded = expandedId === s.id;

                return (
                  <>
                    <tr
                      key={s.id}
                      id={`row-${s.id}`}
                      onClick={() => {
                        const nextId = isExpanded ? null : s.id;
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
                          onChange={(e) => toggleOne(s.id, e.target.checked)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={e => toggleStar(e, s.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>

                      {visibleColumns.includes('code') && (
                        <td className="py-2.5 px-3 font-bold text-primary">{s.code || `NCC${String(s.id).padStart(3, '0')}`}</td>
                      )}
                      {visibleColumns.includes('name') && (
                        <td className="py-2.5 px-3 font-bold text-gray-800">{s.name}</td>
                      )}
                      {visibleColumns.includes('phone') && (
                        <td className="py-2.5 px-3 text-gray-700">{s.phone || '---'}</td>
                      )}
                      {visibleColumns.includes('email') && (
                        <td className="py-2.5 px-3 text-gray-700">{s.email || '---'}</td>
                      )}
                      {visibleColumns.includes('address') && (
                        <td className="py-2.5 px-3 text-gray-700">{s.address || '---'}</td>
                      )}
                      {visibleColumns.includes('debt') && (
                        <td className={`py-2.5 px-3 text-right font-extrabold ${(s.debt || 0) > 0 ? 'text-red-500' : 'text-gray-700'}`}>{fmt(s.debt || 0)}</td>
                      )}
                      {visibleColumns.includes('total_spent') && (
                        <td className="py-2.5 px-3 text-right font-extrabold text-primary">{fmt(s.total_spent || 0)}</td>
                      )}
                      {visibleColumns.includes('net_purchase') && (
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">{fmt(s.net_purchase ?? s.total_spent ?? 0)}</td>
                      )}
                      {visibleColumns.includes('isActive') && (
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.isActive !== false ? 'Hoạt động' : 'Ngừng hoạt động'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('note') && (
                        <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate">{s.note || '---'}</td>
                      )}
                      {visibleColumns.includes('created_at') && (
                        <td className="py-2.5 px-3 text-gray-500 text-xs">{s.created_at || '2026-05-15'}</td>
                      )}
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditSupplier(s); setModalOpen(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Sửa"><Edit size={15} className="text-gray-400 hover:text-primary" /></button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Xóa"><Trash2 size={15} className="text-gray-400 hover:text-red-500" /></button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && renderDetail(s)}
                  </>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="p-12 text-center text-gray-400 font-medium">
                    <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
                    Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc
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
          itemName="nhà cung cấp"
        />
      </div>
    </div>

      <ExportDebtModal 
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportDebt}
      />
      <AdjustDebtModal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        supplier={adjustModalSupplier}
        onSaved={() => {
          reload();
          setAdjustModalOpen(false);
        }}
      />
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        supplier={paymentModalSupplier}
        purchaseOrders={purchaseOrders.filter(po => po.supplier_code === (paymentModalSupplier?.code || `NCC${String(paymentModalSupplier?.id).padStart(3, '0')}`) && po.status !== 'CANCELLED' && (po.total - (po.paid_amount || po.paid || 0)) > 0)}
        onSaved={() => {
          reload();
          setPaymentModalOpen(false);
        }}
      />
      <SupplierModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload} supplier={editSupplier} />

      {/* Import Summary Modal */}
      {importSummaryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 flex items-center justify-between text-white shadow-md">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">Kết quả kiểm tra dữ liệu Excel nhà cung cấp</h2>
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
                    Nhà cung cấp hợp lệ sẵn sàng import ({importSummary.validItems.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                          <th className="py-2.5 px-4 w-28">Mã NCC</th>
                          <th className="py-2.5 px-4 flex-1">Tên nhà cung cấp</th>
                          <th className="py-2.5 px-4 w-32">Điện thoại</th>
                          <th className="py-2.5 px-4 w-40">Email</th>
                          <th className="py-2.5 px-4 w-28 text-right">Công nợ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {importSummary.validItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/80">
                            <td className="py-2 px-4 font-bold text-gray-900">{it.code || '[Tự động tạo]'}</td>
                            <td className="py-2 px-4 text-gray-800 font-bold">{it.name}</td>
                            <td className="py-2 px-4 text-gray-600">{it.phone || '---'}</td>
                            <td className="py-2 px-4 text-gray-600">{it.email || '---'}</td>
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
                          <th className="py-2 px-4 w-32">Mã NCC</th>
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
      <PurchaseOrderDetailModal 
        open={!!selectedTx && selectedTx.type === 'import'} 
        onClose={() => setSelectedTx(null)} 
        data={selectedTx} 
        partnerName={selectedTx?.partnerName} 
      />
      <PurchaseReturnDetailModal 
        open={!!selectedTx && selectedTx.type === 'return'} 
        onClose={() => setSelectedTx(null)} 
        data={selectedTx} 
        partnerName={selectedTx?.partnerName} 
      />
      <PaymentDetailModal 
        open={!!selectedTx && selectedTx.type === 'payment'} 
        onClose={() => setSelectedTx(null)} 
        data={selectedTx} 
        partnerName={selectedTx?.partnerName} 
      />

    </div>
  );
}
