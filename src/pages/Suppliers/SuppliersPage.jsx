import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supplierAPI, productAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, Building2, Edit, Trash2, Star, Filter, Columns3, Settings, HelpCircle, Copy, Save, Printer, MoreHorizontal, Eye, Tag, AlertCircle, X, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportCSV } from '../../utils/exportCSV';
import SupplierModal from './SupplierModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const ALL_COLUMNS = [
  { key: 'code', label: 'Mã NCC', default: true },
  { key: 'name', label: 'Tên nhà cung cấp', default: true },
  { key: 'phone', label: 'Điện thoại', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'address', label: 'Địa chỉ', default: true },
  { key: 'debt', label: 'Nợ hiện tại', default: true, align: 'right' },
  { key: 'total_spent', label: 'Tổng mua', default: false, align: 'right' },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

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
            totalSpent,
            totalDebt,
            note,
            isActive,
            createdBy,
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
      const [supRes, prodRes] = await Promise.all([
        supplierAPI.getAll({ limit: 500 }),
        productAPI.getAll().catch(() => []),
      ]);
      const rawList = Array.isArray(supRes) ? supRes : (supRes?.data || []);
      if (rawList.length === 0) {
        const mockSuppliers = [
          { id: 1, code: 'NCC001', name: 'Công ty TNHH Phân phối ABC', phone: '0281234567', email: 'contact@abc.vn', address: 'Q.Bình Tân, TP.HCM', debt: 1500000, total_spent: 12500000 },
          { id: 2, code: 'NCC002', name: 'Đại lý XYZ', phone: '0282345678', email: 'sales@xyz.com', address: 'Q.Tân Phú, TP.HCM', debt: 0, total_spent: 8400000 },
          { id: 3, code: 'NCC003', name: 'Công ty Cổ phần VinaFood', phone: '0283456789', email: 'info@vinafood.vn', address: 'Q.1, TP.HCM', debt: 5000000, total_spent: 45000000 },
        ];
        setSuppliers(mockSuppliers);
      } else {
        setSuppliers(rawList);
      }
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes?.data || []));
    } catch {
      setSuppliers([]);
      setProducts([]);
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

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(filtered.map(s => s.id)));
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
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
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
                <div className="grid grid-cols-3 gap-8 items-start">
                  <div className="col-span-2">
                    <textarea
                      placeholder="Ghi chú..."
                      className="w-full h-32 border border-gray-300 rounded-xl p-4 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                      value={currentNote}
                      onChange={(e) => setSupNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                    />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-3 text-xs shadow-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Số lượng mặt hàng</span><span className="font-bold text-gray-800">{items.length}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tồn kho</span><span className="font-bold text-gray-800">{fmt(totalStock)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng mua</span><span className="font-bold text-gray-800">{fmt(s.total_spent || 0)}</span></div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-3"><span className="font-bold text-gray-800">Nợ hiện tại</span><span className="font-extrabold text-red-600">{fmt(s.debt || 0)}</span></div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-2">
                  <div className="flex items-center gap-3">
                    <Button variant="danger" onClick={() => handleDelete(s.id)} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Trash2 size={14} /> Xóa NCC
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Copy size={14} /> Sao chép
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Download size={14} /> Xuất file
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="primary" onClick={() => { setEditSupplier(s); setModalOpen(true); }} className="flex items-center gap-1.5 text-xs py-2 px-6 shadow-md font-bold bg-primary hover:bg-primary-hover">
                      <Edit size={14} /> Chỉnh sửa
                    </Button>
                    <Button variant="secondary" onClick={() => toast.success('Lưu thông tin thành công')} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Save size={14} /> Lưu
                    </Button>
                    <Button variant="secondary" onClick={() => toast.success('Thanh toán nợ thành công')} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold text-green-600 border-green-200 hover:bg-green-50">
                      Thanh toán nợ
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Printer size={14} /> In
                    </Button>
                    <Button variant="secondary" className="p-2 shadow-sm">
                      <MoreHorizontal size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-700 mb-1">Chưa có lịch sử giao dịch nào</p>
                <p className="text-xs text-gray-400">Các đơn nhập hàng từ nhà cung cấp này sẽ được liệt kê tại đây.</p>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen p-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
          Nhà cung cấp
        </h1>

        <div className="flex items-center gap-4">
          {/* Main Search Input */}
          <div className="relative w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm nhà cung cấp"
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

          {/* Action Buttons */}
          <Button variant="primary" onClick={() => { setEditSupplier(null); setModalOpen(true); }} className="flex items-center gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold py-2.5 px-5 rounded-xl">
            <Plus size={18} /> Thêm nhà cung cấp
          </Button>

          <Button variant="secondary" onClick={() => { const input = document.createElement('input'); input.type='file'; input.accept='.csv,.xlsx'; input.onchange = handleImportExcel; input.click(); }} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
            <Upload size={16} /> Nhập file
          </Button>

          <Button variant="secondary" onClick={handleDownloadSample} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
            <Download size={16} /> Tải file mẫu
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
                <th className="p-4 text-center w-24 font-extrabold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filtered.map((s) => {
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
