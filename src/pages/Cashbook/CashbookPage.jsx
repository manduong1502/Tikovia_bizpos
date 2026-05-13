import { useState, useEffect, useCallback } from 'react';
import { cashbookAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Plus, Download, Search, ArrowUpRight, ArrowDownLeft, FileText, Wallet } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import CashbookModal from './CashbookModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CashbookPage() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('thu');

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
    <div className="flex flex-col gap-6 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Sổ quỹ</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openModal('thu')} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none">Tạo phiếu thu</Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openModal('chi')} className="shadow-md hover:shadow-lg bg-gradient-to-r from-red-500 to-orange-500 border-none text-white">Tạo phiếu chi</Button>
          <Button icon={<Download size={16} />} className="shadow-sm" onClick={handleExport}>Xuất file</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowDownLeft size={64} className="text-green-600" /></div>
          <div className="text-[13px] font-bold text-gray-500 mb-2">Tổng thu</div>
          <div className="text-3xl font-extrabold text-green-600 tracking-tight">{fmt(totalIn)}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowUpRight size={64} className="text-red-500" /></div>
          <div className="text-[13px] font-bold text-gray-500 mb-2">Tổng chi</div>
          <div className="text-3xl font-extrabold text-red-500 tracking-tight">{fmt(totalOut)}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={64} className="text-blue-600" /></div>
          <div className="text-[13px] font-bold text-gray-500 mb-2">Tồn quỹ</div>
          <div className="text-3xl font-extrabold text-primary tracking-tight">{fmt(totalIn - totalOut)}</div>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Loại phiếu</span>
              <div className="flex gap-1.5">
                {[{ val: '', label: 'Tất cả' }, { val: 'thu', label: 'Thu' }, { val: 'chi', label: 'Chi' }].map(t => (
                  <button key={t.val} onClick={() => setFilterType(t.val)} className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterType === t.val ? 'bg-blue-50 text-primary border-primary/30 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} className="text-gray-400" />} placeholder="Theo mã phiếu" value={search} onChange={e => setSearch(e.target.value)} className="bg-white" /></div>
          </div>
          <table className="w-full text-sm">
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
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {entries.length} phiếu</span>
          </div>
        </div>
      </div>

      <CashbookModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload} type={modalType} />
    </div>
  );
}
