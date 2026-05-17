import { useState, useEffect, useCallback } from 'react';
import { cashbookAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Plus, Download, Search, ArrowUpRight, ArrowDownLeft, FileText, Wallet, Filter, X, SlidersHorizontal } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import CashbookModal from './CashbookModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CashbookPage() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('thu');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (search) params.search = search;
      const r = await cashbookAPI.getAll(params);
      const data = r.data || (Array.isArray(r) ? r : []);
      setEntries(data);
    } catch { setEntries([]); }
  }, [filterType, search]);

  useEffect(() => { reload(); }, [reload]);

  const totalIn = entries.filter(e => e.type === 'thu' || e.type === 'in').reduce((s, e) => s + (e.amount || 0), 0);
  const totalOut = entries.filter(e => e.type === 'chi' || e.type === 'out').reduce((s, e) => s + (e.amount || 0), 0);

  const handleExport = () => {
    exportCSV(
      [
        { key: 'code', label: 'Mã phiếu' },
        { key: 'created_at_fmt', label: 'Thời gian' },
        { key: 'type_label', label: 'Loại' },
        { key: 'payer_name', label: 'Đối tượng' },
        { key: 'amount', label: 'Giá trị' },
        { key: 'user_name', label: 'Người tạo' },
      ],
      entries.map(e => ({
        ...e,
        created_at_fmt: e.created_at ? new Date(e.created_at).toLocaleString('vi-VN') : '',
        type_label: (e.type === 'thu' || e.type === 'in') ? 'Thu' : 'Chi',
      })),
      'so_quy'
    );
    toast.success('Xuất file thành công');
  };

  const openModal = (type) => { setModalType(type); setModalOpen(true); };

  return (
    <div className="flex flex-col gap-6 animate-page-in p-1.5 sm:p-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 max-w-full">
        <h1 className="text-lg sm:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3 m-0">
          Sổ quỹ
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
                placeholder="Theo mã phiếu"
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

            <Button variant="primary" icon={<Plus size={16} />} onClick={() => openModal('thu')} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none flex-1 sm:flex-none justify-center text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer">
              <span className="hidden sm:inline">Tạo</span> phiếu thu
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => openModal('chi')} className="shadow-md hover:shadow-lg bg-gradient-to-r from-red-500 to-orange-500 border-none text-white flex-1 sm:flex-none justify-center text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer">
              <span className="hidden sm:inline">Tạo</span> phiếu chi
            </Button>
            <Button icon={<Download size={16} />} className="shadow-sm w-full sm:w-auto justify-center text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer" onClick={handleExport}>
              <span className="hidden sm:inline">Xuất file</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowDownLeft size={64} className="text-green-600" /></div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-500 mb-1 sm:mb-2 truncate">Tổng thu</div>
          <div className="text-xl sm:text-3xl font-extrabold text-green-600 tracking-tight truncate">{fmt(totalIn)}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowUpRight size={64} className="text-red-500" /></div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-500 mb-1 sm:mb-2 truncate">Tổng chi</div>
          <div className="text-xl sm:text-3xl font-extrabold text-red-500 tracking-tight truncate">{fmt(totalOut)}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={64} className="text-blue-600" /></div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-500 mb-1 sm:mb-2 truncate">Tồn quỹ</div>
          <div className="text-xl sm:text-3xl font-extrabold text-primary tracking-tight truncate">{fmt(totalIn - totalOut)}</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start max-w-full relative">
        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Filter Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:static lg:w-[240px] lg:p-0 lg:shadow-none lg:bg-transparent lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col gap-5`}>
          <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
            <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={20} /></button>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Loại phiếu</span>
              <div className="flex flex-wrap gap-1.5">
                {[{ val: '', label: 'Tất cả' }, { val: 'thu', label: 'Thu' }, { val: 'chi', label: 'Chi' }].map(t => (
                  <button key={t.val} onClick={() => setFilterType(t.val)} className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterType === t.val ? 'bg-blue-50 text-primary border-primary/30 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto max-w-full w-full min-h-[500px]">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Mã phiếu</th>
                <th className="px-6 py-4 text-left">Thời gian</th>
                <th className="px-6 py-4 text-left">Loại</th>
                <th className="px-6 py-4 text-left">Đối tượng</th>
                <th className="px-6 py-4 text-right">Giá trị</th>
                <th className="px-6 py-4 text-left">Người tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e, i) => {
                const isIn = e.type === 'thu' || e.type === 'in';
                return (
                  <tr key={e.id || i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{e.code || `PT${String(i + 1).padStart(4, '0')}`}</td>
                    <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{e.created_at ? new Date(e.created_at).toLocaleString('vi-VN') : ''}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {isIn ? <><ArrowDownLeft size={12} /> Thu</> : <><ArrowUpRight size={12} /> Chi</>}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{e.payer_name || e.target || e.description || ''}</td>
                    <td className={`px-6 py-4 text-right font-extrabold ${isIn ? 'text-green-600' : 'text-red-500'}`}>{isIn ? '+' : '-'}{fmt(e.amount)}</td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{e.user_name || 'Admin'}</td>
                  </tr>
                );
              })}
              {entries.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><FileText size={32} className="text-gray-300" /></div><div className="text-base font-medium text-gray-500">Chưa có phiếu thu chi</div></td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium min-w-[700px]">
            <span>Hiển thị {entries.length} phiếu</span>
          </div>
        </div>
      </div>

      <CashbookModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload} type={modalType} />
    </div>
  );
}
