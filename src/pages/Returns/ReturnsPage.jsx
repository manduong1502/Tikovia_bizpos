import { useState, useEffect, useCallback } from 'react';
import { returnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Download, Search, Undo2, Filter, X, SlidersHorizontal } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const r = await returnAPI.getAll(params);
      setReturns(Array.isArray(r) ? r : (r.data || []));
    } catch { setReturns([]); }
  }, [filterStatus, search]);

  useEffect(() => { reload(); }, [reload]);

  const handleExport = () => {
    exportCSV(
      [
        { key: 'return_code', label: 'Mã trả hàng' },
        { key: 'created_at_fmt', label: 'Thời gian' },
        { key: 'customer_name', label: 'Khách hàng' },
        { key: 'order_code', label: 'Mã HĐ gốc' },
        { key: 'total', label: 'Tổng tiền' },
        { key: 'status', label: 'Trạng thái' },
      ],
      returns.map(r => ({ ...r, customer_name: r.customer_name || 'Khách lẻ', created_at_fmt: r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '' })),
      'tra_hang'
    );
    toast.success('Xuất file thành công');
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in p-1.5 sm:p-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 max-w-full">
        <h1 className="text-lg sm:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3 m-0">
          Trả hàng
        </h1>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
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
                placeholder="Theo mã phiếu trả"
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all shadow-sm font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute right-2.5 top-1.5 sm:top-2 p-1 sm:p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors cursor-pointer lg:hidden"
                title="Bộ lọc"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            <Button variant="secondary" onClick={handleExport} className="flex items-center justify-center gap-1 sm:gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold p-2 sm:py-2.5 sm:px-4 rounded-xl shadow-sm text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer">
              <Download size={16} /> <span className="hidden sm:inline">Xuất file</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start max-w-full relative">
        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Filter Sidebar */}
        <div className={`fixed top-14 md:top-[102px] bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-[240px] lg:p-0 lg:shadow-none lg:bg-transparent lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col gap-5`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Trạng thái</span>
              <div className="flex flex-wrap gap-1.5">
                {[{ val: '', label: 'Tất cả' }, { val: 'completed', label: 'Đã trả' }, { val: 'draft', label: 'Phiếu tạm' }].map(t => (
                  <button key={t.val} onClick={() => setFilterStatus(t.val)} className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterStatus === t.val ? 'bg-blue-50 text-primary border-primary/30 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto max-w-full w-full min-h-[500px]">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-left">Mã trả hàng</th>
                <th className="px-4 py-3.5 text-left">Thời gian</th>
                <th className="px-4 py-3.5 text-left">Khách hàng</th>
                <th className="px-4 py-3.5 text-left">Mã hóa đơn gốc</th>
                <th className="px-4 py-3.5 text-right">Tổng tiền trả</th>
                <th className="px-4 py-3.5 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {returns.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5 font-bold text-primary">{r.return_code || `TH${String(r.id).padStart(5, '0')}`}</td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-500 font-medium">{r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-800">{r.customer_name || 'Khách lẻ'}</td>
                  <td className="px-4 py-3.5 font-bold text-primary">{r.order_code || ''}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-red-500">{fmt(r.total)}</td>
                  <td className="px-4 py-3.5"><span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status === 'completed' ? 'Đã trả' : 'Phiếu tạm'}</span></td>
                </tr>
              ))}
              {returns.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><Undo2 size={32} className="text-gray-300" /></div><div className="text-base font-medium text-gray-500">Chưa có phiếu trả hàng</div></td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium min-w-[700px]">
            <span>Hiển thị {returns.length} phiếu trả hàng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
