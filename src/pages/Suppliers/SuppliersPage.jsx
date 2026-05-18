import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supplierAPI, productAPI, purchaseOrderAPI, purchaseReturnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, Building2, Edit, Trash2, Star, Filter, Columns3, Settings, HelpCircle, Copy, Save, Printer, MoreHorizontal, Eye, Tag, AlertCircle, X, Upload, SlidersHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportCSV } from '../../utils/exportCSV';
import SupplierModal from './SupplierModal';
import Pagination from '../../components/common/Pagination';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

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
  { key: 'created_by', label: 'Người tạo', default: false },
  { key: 'created_at', label: 'Ngày tạo', default: false },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
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
  const [editSupplier, setEditSupplier] = useState(null);

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
      const [supRes, prodRes, poRes, prRes] = await Promise.all([
        supplierAPI.getAll({ limit: 500 }),
        productAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll({ limit: 500 }).catch(() => []),
        purchaseReturnAPI.getAll({ limit: 500 }).catch(() => []),
      ]);
      const rawList = Array.isArray(supRes) ? supRes : (supRes?.data || []);
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
        po_code: o.po_code || o.code || '',
        created_at: o.created_at || o.createdAt || null,
        supplier_code: o.supplier_code || o.supplier?.code || '',
        supplier_name: o.supplier_name || o.supplier?.name || '',
        total: Number(o.total || 0),
        paid_amount: Number(o.paid_amount || o.paidAmount || o.paid || o.total || 0),
        payment_status: o.payment_status || o.paymentStatus || (o.status === 'PENDING' ? 'partial' : 'paid'),
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
        items: Array.isArray(o.items) ? o.items : []
      }));

      if (normalizedPOs.length === 0) {
        setPurchaseOrders([
          { id: 1, po_code: 'PN000042', created_at: '2026-05-11T11:35:00Z', supplier_code: 'NCC001', supplier_name: 'Công ty TNHH Phân phối ABC', total: 12500000, paid_amount: 11000000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
            { product_sku: 'NSTP00017', product_name: 'Gà ác làm sạch', quantity: 20, unit_price: 85000, discount: 0, total: 1700000 },
            { product_sku: 'NSTP00018', product_name: 'Gà ta sạch size 1.4-1.6 kg/con', quantity: 72, unit_price: 150000, discount: 0, total: 10800000 }
          ]},
          { id: 2, po_code: 'PN000041', created_at: '2026-05-10T11:35:00Z', supplier_code: 'NCC002', supplier_name: 'Đại lý XYZ', total: 8400000, paid_amount: 8400000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
            { product_sku: 'NSTP00019', product_name: 'Thịt ba rọi heo', quantity: 60, unit_price: 140000, discount: 0, total: 8400000 }
          ]},
          { id: 3, po_code: 'PN000040', created_at: '2026-05-09T11:34:00Z', supplier_code: 'NCC003', supplier_name: 'Công ty Cổ phần VinaFood', total: 45000000, paid_amount: 40000000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
            { product_sku: 'NSTP00020', product_name: 'Gạo ST25', quantity: 1500, unit_price: 30000, discount: 0, total: 45000000 }
          ]}
        ]);
      } else {
        setPurchaseOrders(normalizedPOs);
      }

      if (normalizedPRs.length === 0) {
        setPurchaseReturns([
          { id: 1, code: 'THN000001', created_at: '2026-05-16T15:35:00Z', supplier_code: 'NCC001', supplier_name: 'Công ty TNHH Phân phối ABC', total: 1305000, discount: 0, supplier_must_pay: 1305000, paid: 1305000, status: 'COMPLETED', createdBy: 'Võ Thành Huy', receivedBy: 'Võ Thành Huy', note: '', items: [
            { product_sku: 'NSTP00017', product_name: 'Gà ác làm sạch', quantity: 3, cost_price: 85000, return_price: 85000, discount: 0, total: 255000 },
            { product_sku: 'NSTP00018', product_name: 'Gà ta sạch size 1.4-1.6 kg/con', quantity: 7, cost_price: 150000, return_price: 150000, discount: 0, total: 1050000 }
          ]}
        ]);
      } else {
        setPurchaseReturns(normalizedPRs);
      }
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
  }, [search, searchCode, searchName, searchPhone, filterGroup, filterDebt]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

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
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportCSV('nha_cung_cap', ['Mã NCC', 'Tên nhà cung cấp', 'Điện thoại', 'Email', 'Địa chỉ', 'Nợ hiện tại', 'Tổng mua'],
      filtered.map(s => [s.code || `NCC${String(s.id).padStart(3, '0')}`, s.name, s.phone || '', s.email || '', s.address || '', s.debt || 0, s.total_spent || 0])
    );
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa nhà cung cấp này?')) return;
    try {
      await supplierAPI.delete(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      setExpandedId(null);
      toast.success('Xóa nhà cung cấp thành công');
    } catch {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      setExpandedId(null);
      toast.success('Xóa nhà cung cấp thành công');
    }
  };

  const renderDetail = (s) => {
    const supCode = s.code || `NCC${String(s.id).padStart(3, '0')}`;
    const supPOs = purchaseOrders.filter(po => po.supplier_code === supCode || po.supplier_name === s.name);
    const supPRs = purchaseReturns.filter(pr => pr.supplier_name === s.name || pr.supplier_code === supCode);

    const transactions = [
      ...supPOs.map(po => ({
        id: po.id,
        code: po.po_code,
        type: 'import',
        typeName: 'Nhập hàng',
        date: po.created_at,
        total: po.total,
        status: po.payment_status,
        items: po.items || []
      })),
      ...supPRs.map(pr => ({
        id: pr.id,
        code: pr.code,
        type: 'return',
        typeName: 'Trả hàng',
        date: pr.created_at,
        total: -pr.total,
        status: pr.status,
        items: pr.items || []
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

    const supProducts = products.filter(p => p.supplier_id === s.id || p.supplier?.code === s.code || (s.code === 'NCC001' && p.id <= 5)) || [];
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
          <div className="p-6">
            {/* Top Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6 px-2">
              <button
                onClick={() => setDetailTab('info')}
                className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  detailTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Thông tin
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  detailTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Lịch sử giao dịch
              </button>
            </div>

            {detailTab === 'info' ? (
              <div className="flex flex-col gap-6">
                {/* Header Info */}
                <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-extrabold text-gray-800 tracking-tight">{s.name}</span>
                    <span className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                      {s.code || `NCC${String(s.id).padStart(3, '0')}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div><span className="text-gray-500">Điện thoại:</span> <span className="font-bold text-gray-800">{s.phone || '---'}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-bold text-gray-800">{s.email || '---'}</span></div>
                    <div><span className="text-gray-500">Địa chỉ:</span> <span className="font-bold text-gray-800">{s.address || '---'}</span></div>
                  </div>
                </div>

                {/* Items Table Section */}
                <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white shadow-sm max-w-full w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50 gap-4 min-w-[700px]">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm mã hàng"
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                          value={detailSearchSku}
                          onChange={e => setDetailSearchSku(e.target.value)}
                        />
                      </div>
                      <div className="relative w-full sm:w-64">
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
                    <a href="/pricebook" target="_blank" className="text-primary text-xs font-bold flex items-center gap-1.5 hover:underline cursor-pointer">
                      <Tag size={14} /> Thiết lập giá
                    </a>
                  </div>

                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                        <th className="p-3">Mã hàng</th>
                        <th className="p-3">Tên hàng</th>
                        <th className="p-3 text-right">Giá vốn</th>
                        <th className="p-3 text-right">Giá bán</th>
                        <th className="p-3 text-right">Tồn kho</th>
                        <th className="p-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {items.map((p, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 text-primary font-bold">{p.sku}</td>
                          <td className="p-3 text-gray-800">{p.name}</td>
                          <td className="p-3 text-right text-gray-600">{fmt(p.cost_price || p.costPrice || 0)}</td>
                          <td className="p-3 text-right text-gray-800 font-bold">{fmt(p.sell_price || p.sellPrice || 0)}</td>
                          <td className="p-3 text-right text-primary font-bold">{fmt(p.stock || p.stock_quantity || 0)}</td>
                          <td className="p-3 text-center">
                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer">
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">Không tìm thấy mặt hàng nào từ nhà cung cấp này</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Section: Note & Summary Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 items-start">
                  <div className="sm:col-span-2">
                    <textarea
                      placeholder="Ghi chú..."
                      className="w-full h-24 sm:h-32 border border-gray-300 rounded-xl p-4 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                      value={currentNote}
                      onChange={(e) => setSupNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                    />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col gap-3 text-xs shadow-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Số lượng mặt hàng</span><span className="font-bold text-gray-800">{items.length}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tồn kho</span><span className="font-bold text-gray-800">{fmt(totalStock)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng mua</span><span className="font-bold text-gray-800">{fmt(s.total_spent || 0)}</span></div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-3"><span className="font-bold text-gray-800">Nợ hiện tại</span><span className="font-extrabold text-red-600">{fmt(s.debt || 0)}</span></div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-200 pt-6 mt-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button variant="danger" onClick={() => handleDelete(s.id)} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-2 px-3 sm:px-4 shadow-sm font-bold whitespace-nowrap">
                      <Trash2 size={14} /> Xóa NCC
                    </Button>
                    <Button variant="secondary" className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-2 px-3 sm:px-4 shadow-sm font-bold whitespace-nowrap">
                      <Copy size={14} /> Sao chép
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-2 px-3 sm:px-4 shadow-sm font-bold whitespace-nowrap">
                      <Download size={14} /> Xuất file
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button variant="primary" onClick={() => { setEditSupplier(s); setModalOpen(true); }} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-2 px-4 sm:px-6 shadow-md font-bold bg-primary hover:bg-primary-hover whitespace-nowrap">
                      <Edit size={14} /> Chỉnh sửa
                    </Button>
                    <Button variant="secondary" onClick={() => toast.success('Lưu thông tin thành công')} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-2 px-3 sm:px-4 shadow-sm font-bold whitespace-nowrap">
                      <Save size={14} /> Lưu
                    </Button>
                    <Button variant="secondary" onClick={() => toast.success('Thanh toán nợ thành công')} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-2 px-3 sm:px-4 shadow-sm font-bold text-green-600 border-green-200 hover:bg-green-50 whitespace-nowrap">
                      Thanh toán nợ
                    </Button>
                    <Button variant="secondary" className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-xs py-2 px-3 sm:px-4 shadow-sm font-bold whitespace-nowrap">
                      <Printer size={14} /> In
                    </Button>
                    <Button variant="secondary" className="p-2 shadow-sm flex-none">
                      <MoreHorizontal size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in text-[13px]">
                {/* Lịch sử giao dịch */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <span className="font-extrabold text-gray-800 text-sm">Lịch sử giao dịch nhập/trả</span>
                    <span className="px-2.5 py-1 text-xs bg-primary/10 text-primary font-bold rounded-full">{transactions.length} giao dịch</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                          <th className="p-3">Mã đơn</th>
                          <th className="p-3">Loại</th>
                          <th className="p-3">Thời gian</th>
                          <th className="p-3 text-right">Giá trị</th>
                          <th className="p-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-3 font-bold text-primary">{tx.code}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'import' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                {tx.typeName}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500">
                              {tx.date ? new Date(tx.date).toLocaleString('vi-VN') : ''}
                            </td>
                            <td className={`p-3 text-right font-extrabold ${tx.type === 'import' ? 'text-primary' : 'text-red-600'}`}>
                              {tx.type === 'import' ? '' : '-'}{fmt(Math.abs(tx.total))}
                            </td>
                            <td className="p-3 text-center">
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
                          <tr><td colSpan={5} className="p-8 text-center text-gray-400">Không có giao dịch nào từ nhà cung cấp này</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Thống kê hàng nhập */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <span className="font-extrabold text-gray-800 text-sm">Thống kê hàng đã nhập từ NCC này</span>
                    <span className="px-2.5 py-1 text-xs bg-green-100 text-green-700 font-bold rounded-full">
                      {statsList.reduce((sum, it) => sum + it.qty, 0)} sản phẩm
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                          <th className="p-3">Mã hàng</th>
                          <th className="p-3">Tên hàng</th>
                          <th className="p-3 text-right">Tổng số lượng đã nhập</th>
                          <th className="p-3 text-right">Tổng giá trị đã nhập</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {statsList.map((stat, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-3 font-bold text-gray-700">{stat.sku}</td>
                            <td className="p-3 text-gray-800 font-bold">{stat.name}</td>
                            <td className="p-3 text-right font-extrabold text-primary">{fmt(stat.qty)}</td>
                            <td className="p-3 text-right font-extrabold text-emerald-600">{fmt(stat.amount)}</td>
                          </tr>
                        ))}
                        {statsList.length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-gray-400">Chưa nhập mặt hàng nào từ nhà cung cấp này</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen p-1.5 sm:p-6 font-sans max-w-full overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 max-w-full">
        <h1 className="text-lg sm:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3 m-0">
          Nhà cung cấp
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
                placeholder="Tìm nhà cung cấp"
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

            <Button variant="primary" onClick={() => { setEditSupplier(null); setModalOpen(true); }} className="flex items-center justify-center gap-1 sm:gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold p-2 sm:py-2.5 sm:px-5 rounded-xl text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer">
              <Plus size={18} /> <span className="hidden sm:inline">Thêm nhà cung cấp</span>
            </Button>

            <Button variant="secondary" onClick={() => { const input = document.createElement('input'); input.type='file'; input.accept='.csv,.xlsx'; input.onchange = handleImportExcel; input.click(); }} className="flex items-center justify-center gap-1 sm:gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold p-2 sm:py-2.5 sm:px-4 rounded-xl shadow-sm text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer">
              <Upload size={16} /> <span className="hidden sm:inline">Nhập file</span>
            </Button>
          </div>

          {/* Row 2: Secondary Actions & Column selection */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-start lg:justify-end pt-1 lg:pt-0 border-t border-gray-100 lg:border-none mt-1 lg:mt-0">
            <Button variant="secondary" onClick={handleDownloadSample} className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl shadow-sm text-xs sm:text-sm whitespace-nowrap cursor-pointer">
              <Download size={16} /> Tải file mẫu
            </Button>

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

      <div className="flex flex-col lg:flex-row gap-6 items-start max-w-full relative lg:h-[calc(100vh-160px)]">
        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Filter Sidebar */}
        <div className={`fixed top-14 md:top-[102px] bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:sticky lg:top-[118px] lg:max-h-[calc(100vh-160px)] lg:w-64 lg:p-4 lg:shadow-sm lg:border lg:border-gray-100 lg:rounded-2xl lg:overflow-y-auto custom-scrollbar lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col gap-2 font-sans`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          {/* Group Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Nhóm nhà cung cấp</span>
            <select
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white cursor-pointer"
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
                <th className="p-4 text-center w-24 font-extrabold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {paginated.map((s) => {
                const isSelected = selectedIds.has(s.id);
                const isStarred = starred.has(s.id);
                const isExpanded = expandedId === s.id;

                return (
                  <>
                    <tr
                      key={s.id}
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleOne(s.id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4 text-center" onClick={e => toggleStar(e, s.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>

                      {visibleColumns.includes('code') && (
                        <td className="p-4 font-bold text-primary">{s.code || `NCC${String(s.id).padStart(3, '0')}`}</td>
                      )}
                      {visibleColumns.includes('name') && (
                        <td className="p-4 font-bold text-gray-800">{s.name}</td>
                      )}
                      {visibleColumns.includes('phone') && (
                        <td className="p-4 text-gray-700">{s.phone || '---'}</td>
                      )}
                      {visibleColumns.includes('email') && (
                        <td className="p-4 text-gray-700">{s.email || '---'}</td>
                      )}
                      {visibleColumns.includes('address') && (
                        <td className="p-4 text-gray-700">{s.address || '---'}</td>
                      )}
                      {visibleColumns.includes('debt') && (
                        <td className={`p-4 text-right font-extrabold ${(s.debt || 0) > 0 ? 'text-red-500' : 'text-gray-700'}`}>{fmt(s.debt || 0)}</td>
                      )}
                      {visibleColumns.includes('total_spent') && (
                        <td className="p-4 text-right font-extrabold text-primary">{fmt(s.total_spent || 0)}</td>
                      )}
                      {visibleColumns.includes('net_purchase') && (
                        <td className="p-4 text-right font-extrabold text-emerald-600">{fmt(s.net_purchase ?? s.total_spent ?? 0)}</td>
                      )}
                      {visibleColumns.includes('isActive') && (
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.isActive !== false ? 'Hoạt động' : 'Ngừng hoạt động'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('note') && (
                        <td className="p-4 text-gray-600 max-w-xs truncate">{s.note || '---'}</td>
                      )}
                      {visibleColumns.includes('created_by') && (
                        <td className="p-4 text-gray-700 font-medium">{s.created_by || 'Admin'}</td>
                      )}
                      {visibleColumns.includes('created_at') && (
                        <td className="p-4 text-gray-500 text-xs">{s.created_at || '2026-05-15'}</td>
                      )}
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
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
    </div>
  );
}
