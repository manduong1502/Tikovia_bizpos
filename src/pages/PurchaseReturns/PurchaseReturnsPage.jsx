import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseReturnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, ClipboardList, Star, Filter, Columns3, ChevronDown, Trash2, Copy, Printer, MoreHorizontal, Save, Calendar, ChevronRight, Eye, Settings, HelpCircle
} from 'lucide-react';
import { exportCSV } from '../../utils/exportCSV';
import { inDateRange } from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
const STATUS_BADGE = { COMPLETED: 'bg-green-100 text-green-700 font-bold', PENDING: 'bg-yellow-100 text-yellow-700 font-bold', CANCELLED: 'bg-red-100 text-red-600 font-bold' };
const STATUS_LABEL = { COMPLETED: 'Đã trả hàng', PENDING: 'Phiếu tạm', CANCELLED: 'Đã hủy' };

const ALL_COLUMNS = [
  { key: 'code', label: 'Mã trả hàng nhập', default: true },
  { key: 'created_at', label: 'Thời gian', default: true },
  { key: 'supplier_name', label: 'Nhà cung cấp', default: true },
  { key: 'total', label: 'Tổng tiền hàng', default: true, align: 'right' },
  { key: 'discount', label: 'Giảm giá', default: true, align: 'right' },
  { key: 'supplier_must_pay', label: 'NCC cần trả', default: true, align: 'right' },
  { key: 'paid', label: 'NCC đã trả', default: true, align: 'right' },
  { key: 'status', label: 'Trạng thái', default: true },
];

const normalizePR = (o) => ({
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
  items: Array.isArray(o.items) ? o.items : [],
});

export default function PurchaseReturnsPage() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [starred, setStarred] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [filters, setFilters] = useState({
    statuses: new Set(['PENDING', 'COMPLETED']),
    dateRange: { mode: 'all', label: 'Tháng này', start: null, end: null },
    createdBy: '',
    receivedBy: '',
  });

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const listRes = await purchaseReturnAPI.getAll({ limit: 500 });
      const rawList = Array.isArray(listRes) ? listRes : (listRes?.data || []);
      const normalized = rawList.map(normalizePR);
      if (normalized.length === 0) {
        const mockPRs = [
          { id: 1, code: 'THN000001', createdAt: '2026-05-16T15:35:00Z', supplier: { name: 'Công ty Pharmedic' }, total: 0, discount: 0, paid: 0, status: 'COMPLETED' },
        ].map(normalizePR);
        setReturns(mockPRs);
      } else {
        setReturns(normalized);
      }
    } catch {
      setReturns([]);
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
    const qSupp = searchSupplier.trim().toLowerCase();

    return returns.filter(o => {
      if (q && !o.code.toLowerCase().includes(q) && !o.supplier_name.toLowerCase().includes(q)) return false;
      if (qCode && !o.code.toLowerCase().includes(qCode)) return false;
      if (qSupp && !o.supplier_name.toLowerCase().includes(qSupp)) return false;

      if (!filters.statuses.has(o.status)) return false;
      if (filters.createdBy && o.createdBy.toLowerCase() !== filters.createdBy.toLowerCase()) return false;
      if (filters.receivedBy && o.receivedBy.toLowerCase() !== filters.receivedBy.toLowerCase()) return false;
      if (filters.dateRange.start && filters.dateRange.end) {
        if (!inDateRange(o.created_at, filters.dateRange.start, filters.dateRange.end)) return false;
      }
      return true;
    });
  }, [returns, search, searchCode, searchSupplier, filters]);

  const handleToggleStatus = (st) => {
    setFilters(prev => {
      const next = new Set(prev.statuses);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return { ...prev, statuses: next };
    });
  };

  const handleExport = () => {
    const data = filtered.map(o => ({
      'Mã trả hàng nhập': o.code,
      'Thời gian': o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '',
      'Nhà cung cấp': o.supplier_name,
      'Tổng tiền hàng': o.total,
      'Giảm giá': o.discount,
      'NCC cần trả': o.supplier_must_pay,
      'NCC đã trả': o.paid,
      'Trạng thái': STATUS_LABEL[o.status] || o.status,
    }));
    exportCSV(data, 'DanhSachTraHangNhap');
    toast.success('Xuất file thành công');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(o => o.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
          Trả hàng nhập
        </h1>

        <div className="flex items-center gap-4">
          {/* Main Search Input */}
          <div className="relative w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Theo mã phiếu trả"
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
                  <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline cursor-pointer border-none bg-transparent">Đóng</button>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Mã trả hàng nhập</label>
                  <input type="text" placeholder="Nhập mã phiếu" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary font-medium" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Nhà cung cấp (Tên / Mã)</label>
                  <input type="text" placeholder="Tên hoặc mã NCC" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary font-medium" value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button variant="secondary" onClick={() => { setSearchCode(''); setSearchSupplier(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <Button variant="primary" onClick={() => navigate('/purchase-returns/create')} className="flex items-center gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold py-2.5 px-5 rounded-xl cursor-pointer">
            <Plus size={18} /> Trả hàng nhập
          </Button>

          <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm cursor-pointer">
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
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-fade-in">
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
              {[
                { value: 'PENDING', label: 'Phiếu tạm' },
                { value: 'COMPLETED', label: 'Đã trả hàng' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ].map(st => (
                <label key={st.value} className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.statuses.has(st.value)}
                    onChange={() => handleToggleStatus(st.value)}
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <span>{st.label}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* Date Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Thời gian</span>
            <DateFilter 
              value={filters.dateRange}
              onChange={(val) => setFilters(prev => ({ ...prev, dateRange: val }))}
              buttonClassName="w-full justify-between border-gray-200 text-xs py-2 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 rounded-xl shadow-sm"
            />
          </div>

          <hr className="border-gray-100 my-2" />

          {/* Created By Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Người tạo</span>
            <input 
              type="text"
              placeholder="Chọn người tạo"
              value={filters.createdBy}
              onChange={(e) => setFilters(prev => ({ ...prev, createdBy: e.target.value }))}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-primary shadow-sm placeholder-gray-400"
            />
          </div>

          <hr className="border-gray-100 my-2" />

          {/* Received By Filter */}
          <div>
            <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Người trả</span>
            <input 
              type="text"
              placeholder="Chọn người trả"
              value={filters.receivedBy}
              onChange={(e) => setFilters(prev => ({ ...prev, receivedBy: e.target.value }))}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-primary shadow-sm placeholder-gray-400"
            />
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-600 text-xs font-extrabold border-b border-gray-100 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 w-12 text-center"></th>
                  {visibleColumns.includes('code') && <th className="py-3.5 px-4">Mã trả hàng nhập</th>}
                  {visibleColumns.includes('created_at') && <th className="py-3.5 px-4">Thời gian</th>}
                  {visibleColumns.includes('supplier_name') && <th className="py-3.5 px-4">Nhà cung cấp</th>}
                  {visibleColumns.includes('total') && <th className="py-3.5 px-4 text-right">Tổng tiền hàng</th>}
                  {visibleColumns.includes('discount') && <th className="py-3.5 px-4 text-right">Giảm giá</th>}
                  {visibleColumns.includes('supplier_must_pay') && <th className="py-3.5 px-4 text-right">NCC cần trả</th>}
                  {visibleColumns.includes('paid') && <th className="py-3.5 px-4 text-right">NCC đã trả</th>}
                  {visibleColumns.includes('status') && <th className="py-3.5 px-4 text-center">Trạng thái</th>}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-50">
                {filtered.map(o => {
                  const isSelected = selectedIds.has(o.id);
                  const isStarred = starred.has(o.id);
                  const isExpanded = expandedId === o.id;

                  return (
                    <tr 
                      key={o.id}
                      onClick={() => setExpandedId(isExpanded ? null : o.id)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelect(o.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => toggleStar(o.id, e)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-transform hover:scale-110 ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-gray-400'}`} />
                      </td>
                      {visibleColumns.includes('code') && <td className="py-3.5 px-4 font-extrabold text-primary">{o.code}</td>}
                      {visibleColumns.includes('created_at') && (
                        <td className="py-3.5 px-4 font-medium text-gray-600">
                          {o.created_at ? new Date(o.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                        </td>
                      )}
                      {visibleColumns.includes('supplier_name') && <td className="py-3.5 px-4 font-bold text-gray-800">{o.supplier_name}</td>}
                      {visibleColumns.includes('total') && <td className="py-3.5 px-4 text-right font-extrabold text-gray-900">{fmt(o.total)}</td>}
                      {visibleColumns.includes('discount') && <td className="py-3.5 px-4 text-right font-bold text-gray-600">{fmt(o.discount)}</td>}
                      {visibleColumns.includes('supplier_must_pay') && <td className="py-3.5 px-4 text-right font-extrabold text-amber-600">{fmt(o.supplier_must_pay)}</td>}
                      {visibleColumns.includes('paid') && <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">{fmt(o.paid)}</td>}
                      {visibleColumns.includes('status') && (
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block py-1 px-2.5 rounded-full text-[11px] ${STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[o.status] || o.status}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="py-16 text-center text-gray-400 font-medium">
                      <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
                      Không tìm thấy phiếu trả hàng nhập nào phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Bar */}
          <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-4 flex items-center justify-between text-xs text-gray-600 font-bold shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-2">
              <span>Hiển thị</span>
              <select className="border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-bold focus:outline-none focus:border-primary shadow-sm cursor-pointer">
                <option>15 dòng</option>
                <option>20 dòng</option>
                <option>50 dòng</option>
              </select>
            </div>

            <div>
              Tổng số <span className="font-extrabold text-primary">{filtered.length}</span> bản ghi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
