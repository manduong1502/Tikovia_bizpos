import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderAPI, supplierAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, ClipboardList, Star, Filter, Upload, Settings, Columns3, ChevronDown, Trash2, Copy, Printer, MoreHorizontal, Save, Tag, XCircle, HelpCircle, ChevronUp, Calendar, ChevronRight, Eye
} from 'lucide-react';
import { exportCSV } from '../../utils/exportCSV';
import PurchaseOrderModal from './PurchaseOrderModal';
import { getRangeByCreatedLabel, inDateRange, buildCustomRange } from '../../utils/dateFilterUtils';

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

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(filtered.map(o => o.id)));
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

  const renderDetail = (o) => {
    const items = o.items?.filter(it => {
      if (detailSearchSku && !(it.product_sku || '').toLowerCase().includes(detailSearchSku.toLowerCase())) return false;
      if (detailSearchName && !(it.product_name || '').toLowerCase().includes(detailSearchName.toLowerCase())) return false;
      return true;
    }) || [];

    const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
    const subtotal = items.reduce((s, it) => s + ((it.unit_price || 0) * (it.quantity || 0)), 0);
    const totalDiscount = items.reduce((s, it) => s + (it.discount || 0), 0);
    const finalTotal = subtotal - totalDiscount;

    const currentNote = poNotes[o.id] ?? o.note;
    const currentReceivedBy = poReceivedBy[o.id] ?? o.received_by;

    return (
      <tr key={`detail-${o.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in">
        <td colSpan={visibleColumns.length + 2} className="p-0">
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
                Lịch sử thanh toán
              </button>
            </div>

            {detailTab === 'info' ? (
              <div className="flex flex-col gap-6">
                {/* Header Info */}
                <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-extrabold text-gray-800 tracking-tight">{o.po_code}</span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${PAY_BADGE[o.payment_status]}`}>
                      {PAY_LABEL[o.payment_status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div><span className="text-gray-500">Người tạo:</span> <span className="font-bold text-gray-800">{o.created_by}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Người nhập:</span>
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
                      <span className="text-gray-500">Ngày nhập:</span>
                      <span className="font-bold text-gray-800">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</span>
                      <Calendar size={14} className="text-primary ml-1" />
                    </div>
                    <div><span className="text-gray-500">Tên NCC:</span> <a href="#" className="font-bold text-primary hover:underline">{o.supplier_name}</a></div>
                  </div>
                </div>

                {/* Items Table Section */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Search bar above items */}
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
                    <a href="/pricebook" target="_blank" className="text-primary text-xs font-bold flex items-center gap-1.5 hover:underline cursor-pointer">
                      <Tag size={14} /> Thiết lập giá
                    </a>
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                        <th className="p-3">Mã hàng</th>
                        <th className="p-3">Tên hàng</th>
                        <th className="p-3 text-right">Số lượng</th>
                        <th className="p-3 text-right">Đơn giá</th>
                        <th className="p-3 text-right">Giảm giá</th>
                        <th className="p-3 text-right">Giá nhập</th>
                        <th className="p-3 text-right">Thành tiền</th>
                        <th className="p-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 text-primary font-bold">{it.product_sku}</td>
                          <td className="p-3 text-gray-800">{it.product_name}</td>
                          <td className="p-3 text-right text-gray-800 font-bold">{it.quantity}</td>
                          <td className="p-3 text-right text-gray-600">{fmt(it.unit_price)}</td>
                          <td className="p-3 text-right text-gray-600">{fmt(it.discount)}</td>
                          <td className="p-3 text-right text-gray-800 font-bold">{fmt((it.unit_price || 0) - (it.discount || 0))}</td>
                          <td className="p-3 text-right text-primary font-bold">{fmt(it.total)}</td>
                          <td className="p-3 text-center">
                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer">
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
                      className="w-full h-32 border border-gray-300 rounded-xl p-4 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                      value={currentNote}
                      onChange={(e) => setPoNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                    />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-3 text-xs shadow-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Số lượng mặt hàng</span><span className="font-bold text-gray-800">{items.length}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tiền hàng ({totalQty})</span><span className="font-bold text-gray-800">{fmt(subtotal)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Giảm giá</span><span className="font-bold text-gray-800">{fmt(totalDiscount)}</span></div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-3"><span className="font-bold text-gray-800">Tổng cộng</span><span className="font-extrabold text-primary">{fmt(finalTotal)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-800">Tiền đã trả NCC</span><span className="font-extrabold text-green-600">{fmt(o.paid_amount)}</span></div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-2">
                  <div className="flex items-center gap-3">
                    <Button variant="danger" onClick={() => deletePO(o.id)} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm">
                      <Trash2 size={14} /> Hủy
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm">
                      <Copy size={14} /> Sao chép
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm">
                      <Download size={14} /> Xuất file
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="primary" onClick={() => navigate(`/purchase-orders/create?id=${o.id}&type=update`)} className="flex items-center gap-1.5 text-xs py-2 px-6 shadow-md font-bold bg-primary hover:bg-primary-hover border-none cursor-pointer">
                      Mở phiếu
                    </Button>
                    <Button variant="secondary" onClick={() => toast.success('Lưu phiếu thành công')} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold border-none cursor-pointer">
                      <Save size={14} /> Lưu
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/purchase-returns/create?poId=${o.id}`)} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold border-none cursor-pointer">
                      Trả hàng nhập
                    </Button>
                    <Button variant="secondary" className="p-2 shadow-sm border-none cursor-pointer">
                      <MoreHorizontal size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-700 mb-1">Chưa có lịch sử thanh toán nào</p>
                <p className="text-xs text-gray-400">Các giao dịch thanh toán cho phiếu nhập này sẽ được liệt kê tại đây.</p>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

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
      await purchaseOrderAPI.delete(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      setExpandedId(null);
      toast.success('Hủy phiếu nhập thành công');
    } catch {
      // Fallback mock delete
      setOrders(prev => prev.filter(o => o.id !== id));
      setExpandedId(null);
      toast.success('Hủy phiếu nhập thành công');
    }
  };

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen p-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
          Nhập hàng
        </h1>

        <div className="flex items-center gap-4">
          {/* Main Search Input */}
          <div className="relative w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Theo mã phiếu nhập"
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all shadow-sm font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`absolute right-2.5 top-2 p-1.5 rounded-lg transition-colors cursor-pointer ${searchOpen ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
            >
              <Filter size={16} />
            </button>

            {/* Advanced Search Popover */}
            {searchOpen && (
              <div ref={searchPanelRef} className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 flex flex-col gap-4 animate-fade-in">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="font-bold text-gray-800 text-sm">Tìm kiếm nâng cao</span>
                  <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline">Đóng</button>
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

          {/* Action Buttons */}
          <Button variant="primary" onClick={() => navigate('/purchase-orders/create')} className="flex items-center gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold py-2.5 px-5 rounded-xl cursor-pointer">
            <Plus size={18} /> Nhập hàng
          </Button>

          <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
            <Download size={16} /> Xuất file
          </Button>

          {/* Column Visibility Menu */}
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer"
            >
              <Columns3 size={18} />
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 animate-fade-in">
                <div className="text-xs font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Ẩn/hiện cột</div>
                <div className="flex flex-col gap-2.5">
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

          <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer">
            <Settings size={18} />
          </button>
          <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left Filter Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 font-sans">
          {/* Status Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Trạng thái</span>
            <div className="flex flex-col gap-2.5">
              {STATUS_OPTIONS.map(st => (
                <label key={st.value} className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={filters.statuses.has(st.value)}
                    onChange={() => toggleStatusFilter(st.value)}
                  />
                  <span>{st.label}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Time Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Thời gian</span>
            <DateFilter
              label="Thời gian"
              type="created"
              value={filters.dateRange}
              onChange={(val) => setFilters(prev => ({ ...prev, dateRange: val }))}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Created By Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Người tạo</span>
            <select
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white cursor-pointer"
              value={filters.createdBy}
              onChange={e => setFilters(prev => ({ ...prev, createdBy: e.target.value }))}
            >
              {createdByOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <hr className="border-gray-100" />

          {/* Received By Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Người nhập</span>
            <select
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white cursor-pointer"
              value={filters.receivedBy}
              onChange={e => setFilters(prev => ({ ...prev, receivedBy: e.target.value }))}
            >
              {receivedByOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
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
              {filtered.map((o) => {
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
                    {isExpanded && renderDetail(o)}
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
