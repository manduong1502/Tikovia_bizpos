import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { customerAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, User, Edit, Trash2, Star, Filter, Columns3, Settings, HelpCircle, Copy, Save, Printer, MoreHorizontal
} from 'lucide-react';
import { exportCSV } from '../../utils/exportCSV';
import CustomerModal from './CustomerModal';
import { getRangeByCreatedLabel, inDateRange, buildCustomRange } from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const ALL_COLUMNS = [
  { key: 'code', label: 'Mã KH', default: true },
  { key: 'name', label: 'Tên khách hàng', default: true },
  { key: 'phone', label: 'Điện thoại', default: true },
  { key: 'email', label: 'Email', default: false },
  { key: 'address', label: 'Địa chỉ', default: true },
  { key: 'debt', label: 'Nợ hiện tại', default: true, align: 'right' },
  { key: 'total_spent', label: 'Tổng bán', default: true, align: 'right' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
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
  const [editCustomer, setEditCustomer] = useState(null);

  // Filter states
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState({ mode: 'all', label: 'Toàn thời gian', start: null, end: null });
  const [filterType, setFilterType] = useState('Tất cả');
  const [filterGender, setFilterGender] = useState('Tất cả');
  const [filterTotalFrom, setFilterTotalFrom] = useState('');
  const [filterTotalTo, setFilterTotalTo] = useState('');

  const [detailTab, setDetailTab] = useState('info');
  const [custNotes, setCustNotes] = useState({});

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const res = await customerAPI.getAll({ limit: 500 });
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
    } catch {
      setCustomers([]);
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

    return customers.filter((c) => {
      if (q && !(c.name || '').toLowerCase().includes(q) && !(c.code || '').toLowerCase().includes(q) && !(c.phone || '').toLowerCase().includes(q)) return false;
      if (qCode && !(c.code || '').toLowerCase().includes(qCode)) return false;
      if (qName && !(c.name || '').toLowerCase().includes(qName)) return false;
      if (qPhone && !(c.phone || '').toLowerCase().includes(qPhone)) return false;

      if (filterGroup && filterGroup !== 'all') return false;

      if (filterType !== 'Tất cả') {
        if (filterType === 'Cá nhân' && c.type === 'company') return false;
      }

      if (filterGender !== 'Tất cả') {
        const g = (c.gender || '').toLowerCase();
        if (filterGender === 'Nam' && g !== 'nam' && g !== 'male') return false;
        if (filterGender === 'Nữ' && g !== 'nữ' && g !== 'female') return false;
      }

      if (filterTotalFrom) {
        const from = Number(filterTotalFrom) || 0;
        if (Number(c.totalSpent || c.total_spent || 0) < from) return false;
      }
      if (filterTotalTo) {
        const to = Number(filterTotalTo) || 0;
        if (Number(c.totalSpent || c.total_spent || 0) > to) return false;
      }

      if (filterDate && filterDate.mode === 'all' && filterDate.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filterDate.label);
        if (range && !inDateRange(c.created_at || c.createdAt, range)) return false;
      } else if (filterDate && filterDate.mode === 'custom' && filterDate.start) {
        const range = buildCustomRange(filterDate.start, filterDate.end);
        if (range && !inDateRange(c.created_at || c.createdAt, range)) return false;
      }

      return true;
    });
  }, [customers, search, searchCode, searchName, searchPhone, filterGroup, filterType, filterGender, filterTotalFrom, filterTotalTo, filterDate]);

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(filtered.map(c => c.id)));
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
    exportCSV('khach_hang', ['Mã KH', 'Tên khách hàng', 'Điện thoại', 'Email', 'Địa chỉ', 'Nợ hiện tại', 'Tổng bán'],
      filtered.map(c => [c.code || `KH${String(c.id).padStart(6, '0')}`, c.name, c.phone || '', c.email || '', c.address || '', c.debt || c.totalDebt || 0, c.total_spent || c.totalSpent || 0])
    );
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    try {
      await customerAPI.delete(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setExpandedId(null);
      toast.success('Xóa khách hàng thành công');
    } catch {
      setCustomers(prev => prev.filter(c => c.id !== id));
      setExpandedId(null);
      toast.success('Xóa khách hàng thành công');
    }
  };

  const renderDetail = (c) => {
    const currentNote = custNotes[c.id] ?? c.note ?? '';
    const code = c.code || `KH${String(c.id).padStart(6, '0')}`;

    return (
      <tr key={`detail-${c.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in">
        <td colSpan={visibleColumns.length + 3} className="p-0">
          <div className="p-6">
            {/* Top Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6 px-2">
              {[
                { key: 'info', label: 'Thông tin' },
                { key: 'history', label: 'Lịch sử mua hàng' },
                { key: 'address', label: 'Địa chỉ nhận hàng' },
                { key: 'debt', label: 'Nợ cần thu từ khách' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setDetailTab(t.key)}
                  className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    detailTab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {detailTab === 'info' && (
              <div className="flex flex-col gap-6">
                {/* Header Info */}
                <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-extrabold text-gray-800 tracking-tight">{c.name}</span>
                    <span className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                      {code}
                    </span>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div><span className="text-gray-500">Điện thoại:</span> <span className="font-bold text-gray-800">{c.phone || '---'}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-bold text-gray-800">{c.email || '---'}</span></div>
                    <div><span className="text-gray-500">Địa chỉ:</span> <span className="font-bold text-gray-800">{c.address || '---'}</span></div>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-4 gap-6 p-6 bg-gray-50/50 rounded-xl border border-gray-200 text-xs">
                  <div><span className="text-gray-500 font-medium block mb-1">Nhóm khách hàng</span><span className="font-bold text-gray-800">Khách hàng chung</span></div>
                  <div><span className="text-gray-500 font-medium block mb-1">Loại khách hàng</span><span className="font-bold text-gray-800">{c.type === 'company' ? 'Công ty' : 'Cá nhân'}</span></div>
                  <div><span className="text-gray-500 font-medium block mb-1">Giới tính</span><span className="font-bold text-gray-800">{c.gender || '---'}</span></div>
                  <div><span className="text-gray-500 font-medium block mb-1">Ngày sinh</span><span className="font-bold text-gray-800">---</span></div>
                </div>

                {/* Bottom Section: Note & Summary Box */}
                <div className="grid grid-cols-3 gap-8 items-start">
                  <div className="col-span-2">
                    <textarea
                      placeholder="Ghi chú..."
                      className="w-full h-32 border border-gray-300 rounded-xl p-4 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                      value={currentNote}
                      onChange={(e) => setCustNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                    />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-3 text-xs shadow-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng bán</span><span className="font-bold text-gray-800">{fmt(c.total_spent || c.totalSpent || 0)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng bán trừ trả hàng</span><span className="font-bold text-gray-800">{fmt(c.total_spent || c.totalSpent || 0)}</span></div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-3"><span className="font-bold text-gray-800">Nợ hiện tại</span><span className="font-extrabold text-red-600">{fmt(c.debt || c.totalDebt || 0)}</span></div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-2">
                  <div className="flex items-center gap-3">
                    <Button variant="danger" onClick={() => handleDelete(c.id)} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Trash2 size={14} /> Xóa khách hàng
                    </Button>
                    <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Copy size={14} /> Sao chép
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                      <Download size={14} /> Xuất file
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="primary" onClick={() => { setEditCustomer(c); setModalOpen(true); }} className="flex items-center gap-1.5 text-xs py-2 px-6 shadow-md font-bold bg-primary hover:bg-primary-hover">
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
            )}

            {detailTab === 'history' && (
              <div className="p-8">
                {c.orders && c.orders.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                        <th className="py-3">Mã đơn</th>
                        <th className="py-3">Thời gian</th>
                        <th className="py-3">Trạng thái</th>
                        <th className="py-3 text-right">Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.orders.map((o, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors font-medium">
                          <td className="py-3 text-primary font-bold">{o.order_code}</td>
                          <td className="py-3 text-gray-700">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {o.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-extrabold text-gray-800">{fmt(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-gray-400 font-medium">
                    <User size={48} className="mx-auto mb-3 text-gray-300" />
                    Chưa có lịch sử mua hàng nào
                  </div>
                )}
              </div>
            )}

            {detailTab === 'address' && (
              <div className="p-12 text-center text-gray-400 font-medium">
                <User size={48} className="mx-auto mb-3 text-gray-300" />
                Chưa có địa chỉ nhận hàng
              </div>
            )}

            {detailTab === 'debt' && (
              <div className="p-8">
                <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-gray-200">
                  <div className="text-sm font-bold text-gray-600 mb-2">Nợ hiện tại</div>
                  <div className={`text-3xl font-extrabold tracking-tight ${(c.debt || c.totalDebt || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {(c.debt || c.totalDebt || 0) > 0 ? fmt(c.debt || c.totalDebt) : 'Không có nợ'}
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
    <div className="flex-1 bg-gray-50/50 min-h-screen p-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
          Khách hàng
        </h1>

        <div className="flex items-center gap-4">
          {/* Main Search Input */}
          <div className="relative w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm khách hàng"
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
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Mã KH</label>
                  <input type="text" placeholder="Nhập mã KH" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Tên khách hàng</label>
                  <input type="text" placeholder="Nhập tên khách hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchName} onChange={e => setSearchName(e.target.value)} />
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
          <Button variant="primary" onClick={() => { setEditCustomer(null); setModalOpen(true); }} className="flex items-center gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold py-2.5 px-5 rounded-xl">
            <Plus size={18} /> Thêm khách hàng
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
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Nhóm khách hàng</span>
            <select
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white cursor-pointer"
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
            >
              <option value="">Tất cả các nhóm</option>
              <option value="all">Khách hàng chung</option>
            </select>
          </div>

          <hr className="border-gray-100" />

          {/* Time Filter */}
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

          {/* Type Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Loại khách hàng</span>
            <div className="flex gap-2">
              {['Tất cả', 'Cá nhân'].map(t => (
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

          {/* Gender Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Giới tính</span>
            <div className="flex gap-2">
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

          {/* Total Spent Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Tổng bán</span>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-8">Từ</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary"
                  value={filterTotalFrom}
                  onChange={e => setFilterTotalFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-8">Tới</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary"
                  value={filterTotalTo}
                  onChange={e => setFilterTotalTo(e.target.value)}
                />
              </div>
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
              {filtered.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const isStarred = starred.has(c.id);
                const isExpanded = expandedId === c.id;

                return (
                  <>
                    <tr
                      key={c.id}
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleOne(c.id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4 text-center" onClick={e => toggleStar(e, c.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>

                      {visibleColumns.includes('code') && (
                        <td className="p-4 font-bold text-primary">{c.code || `KH${String(c.id).padStart(6, '0')}`}</td>
                      )}
                      {visibleColumns.includes('name') && (
                        <td className="p-4 font-bold text-gray-800">{c.name}</td>
                      )}
                      {visibleColumns.includes('phone') && (
                        <td className="p-4 text-gray-700">{c.phone || '---'}</td>
                      )}
                      {visibleColumns.includes('email') && (
                        <td className="p-4 text-gray-700">{c.email || '---'}</td>
                      )}
                      {visibleColumns.includes('address') && (
                        <td className="p-4 text-gray-700">{c.address || '---'}</td>
                      )}
                      {visibleColumns.includes('debt') && (
                        <td className={`p-4 text-right font-extrabold ${(c.debt || c.totalDebt || 0) > 0 ? 'text-red-500' : 'text-gray-700'}`}>{fmt(c.debt || c.totalDebt || 0)}</td>
                      )}
                      {visibleColumns.includes('total_spent') && (
                        <td className="p-4 text-right font-extrabold text-primary">{fmt(c.total_spent || c.totalSpent || 0)}</td>
                      )}
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditCustomer(c); setModalOpen(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Sửa"><Edit size={15} className="text-gray-400 hover:text-primary" /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Xóa"><Trash2 size={15} className="text-gray-400 hover:text-red-500" /></button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && renderDetail(c)}
                  </>
                );
              })}

              {filtered.length === 0 && (
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
      </div>

      <CustomerModal open={modalOpen} onClose={() => setModalOpen(false)} customer={editCustomer} onSaved={reload} />
    </div>
  );
}
