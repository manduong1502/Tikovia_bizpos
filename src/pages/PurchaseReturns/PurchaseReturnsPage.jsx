import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseReturnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';
import {
  Plus, Download, Search, ClipboardList, Star, Filter, Columns3, ChevronDown, Trash2, Copy, Printer, MoreHorizontal, Save, Calendar, ChevronRight, Eye
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [starred, setStarred] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const [filters, setFilters] = useState({
    statuses: new Set(['PENDING', 'COMPLETED']), // Mặc định chọn Phiếu tạm và Đã trả hàng theo ảnh 3
    dateRange: { mode: 'all', label: 'Tháng này', start: null, end: null },
    createdBy: '',
    receivedBy: '',
  });

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter(o => {
      if (q && !o.code.toLowerCase().includes(q) && !o.supplier_name.toLowerCase().includes(q)) return false;
      if (!filters.statuses.has(o.status)) return false;
      if (filters.createdBy && o.createdBy.toLowerCase() !== filters.createdBy.toLowerCase()) return false;
      if (filters.receivedBy && o.receivedBy.toLowerCase() !== filters.receivedBy.toLowerCase()) return false;
      if (filters.dateRange.start && filters.dateRange.end) {
        if (!inDateRange(o.created_at, filters.dateRange.start, filters.dateRange.end)) return false;
      }
      return true;
    });
  }, [returns, search, filters]);

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
    <div className="flex h-[calc(100vh-90px)] -m-5 font-sans bg-gray-100">
      {/* Left Sidebar Filters */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-10 shrink-0 shadow-sm">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          <h2 className="font-extrabold text-xs uppercase tracking-wider text-gray-700">Bộ lọc trả hàng</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
          {/* Status Filter */}
          <div>
            <label className="font-extrabold text-gray-800 block mb-2 uppercase tracking-wide text-[11px]">Trạng thái</label>
            <div className="space-y-2">
              {[
                { value: 'PENDING', label: 'Phiếu tạm' },
                { value: 'COMPLETED', label: 'Đã trả hàng' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ].map(st => (
                <label key={st.value} className="flex items-center gap-2 text-gray-700 hover:text-primary cursor-pointer font-medium">
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

          <hr className="border-gray-200" />

          {/* Date Filter */}
          <div>
            <label className="font-extrabold text-gray-800 block mb-2 uppercase tracking-wide text-[11px]">Thời gian</label>
            <DateFilter 
              value={filters.dateRange}
              onChange={(val) => setFilters(prev => ({ ...prev, dateRange: val }))}
              buttonClassName="w-full justify-between border-gray-300 text-xs py-2 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"
            />
          </div>

          <hr className="border-gray-200" />

          {/* Created By Filter */}
          <div>
            <label className="font-extrabold text-gray-800 block mb-2 uppercase tracking-wide text-[11px]">Người tạo</label>
            <input 
              type="text"
              placeholder="Chọn người tạo"
              value={filters.createdBy}
              onChange={(e) => setFilters(prev => ({ ...prev, createdBy: e.target.value }))}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-primary shadow-inner placeholder-gray-400"
            />
          </div>

          <hr className="border-gray-200" />

          {/* Received By Filter */}
          <div>
            <label className="font-extrabold text-gray-800 block mb-2 uppercase tracking-wide text-[11px]">Người trả</label>
            <input 
              type="text"
              placeholder="Chọn người trả"
              value={filters.receivedBy}
              onChange={(e) => setFilters(prev => ({ ...prev, receivedBy: e.target.value }))}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-primary shadow-inner placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <h1 className="text-xl font-black text-gray-800 tracking-tight shrink-0">Trả hàng nhập</h1>
            <div className="relative flex-1">
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Theo mã phiếu trả" 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold focus:outline-none focus:bg-white focus:border-primary transition-all shadow-inner placeholder-gray-400"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => navigate('/purchase-orders')} className="flex items-center gap-2 text-xs py-2 px-4 shadow-md font-extrabold bg-primary hover:bg-primary-hover border-none cursor-pointer">
              <Plus size={16} /> Trả hàng nhập
            </Button>
            <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 text-xs py-2 px-4 shadow-sm font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer">
              <Download size={16} /> Xuất file
            </Button>
          </div>
        </div>

        {/* Table & Details Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 text-[11px] font-black uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                    <th className="py-3 px-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 w-12 text-center"></th>
                    <th className="py-3 px-4">Mã trả hàng nhập</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Nhà cung cấp</th>
                    <th className="py-3 px-4 text-right">Tổng tiền hàng</th>
                    <th className="py-3 px-4 text-right">Giảm giá</th>
                    <th className="py-3 px-4 text-right">NCC cần trả</th>
                    <th className="py-3 px-4 text-right">NCC đã trả</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-100">
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
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelect(o.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => toggleStar(o.id, e)}>
                          <Star size={16} className={`mx-auto cursor-pointer transition-transform hover:scale-110 ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-gray-400'}`} />
                        </td>
                        <td className="py-3 px-4 font-extrabold text-primary">{o.code}</td>
                        <td className="py-3 px-4 font-medium text-gray-600">
                          {o.created_at ? new Date(o.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800">{o.supplier_name}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-gray-900">{fmt(o.total)}</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-600">{fmt(o.discount)}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-amber-600">{fmt(o.supplier_must_pay)}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-600">{fmt(o.paid)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block py-1 px-2.5 rounded-full text-[11px] ${STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[o.status] || o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="10" className="py-16 text-center text-gray-400 font-medium">
                        <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
                        Không tìm thấy phiếu trả hàng nhập nào phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Bar */}
            <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-600 font-bold shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span>Hiển thị</span>
                <select className="border border-gray-300 rounded px-2 py-1 bg-gray-50 font-bold focus:outline-none focus:border-primary">
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
    </div>
  );
}
