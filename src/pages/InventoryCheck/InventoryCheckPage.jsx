import { useState, useEffect, useCallback } from 'react';
import { inventoryCheckAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Plus, Download, Search, ClipboardCheck } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import InventoryCheckModal from './InventoryCheckModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const STATUS_BADGE = { balanced: 'bg-green-100 text-green-700', draft: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-gray-100 text-gray-500' };
const STATUS_LABEL = { balanced: 'Đã cân bằng', draft: 'Phiếu tạm', cancelled: 'Đã hủy' };

export default function InventoryCheckPage() {
  const [checks, setChecks] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const r = await inventoryCheckAPI.getAll(params);
      setChecks(Array.isArray(r) ? r : (r.data || []));
    } catch { setChecks([]); }
  }, [filterStatus, search]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = checks;

  const handleExport = () => {
    exportCSV(
      [
        { key: 'code', label: 'Mã phiếu' },
        { key: 'created_at_fmt', label: 'Thời gian' },
        { key: 'total_items', label: 'Số SP' },
        { key: 'total_increase', label: 'Tăng' },
        { key: 'total_decrease', label: 'Giảm' },
        { key: 'status', label: 'Trạng thái' },
      ],
      filtered.map(c => ({ ...c, created_at_fmt: c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : '' })),
      'kiem_kho'
    );
    toast.success('Xuất file thành công');
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Kiểm kho</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none">Kiểm kho</Button>
          <Button icon={<Download size={16} />} className="shadow-sm" onClick={handleExport}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Trạng thái</span>
              <div className="flex flex-wrap gap-1.5">
                {[{ val: '', label: 'Tất cả' }, { val: 'balanced', label: 'Đã cân bằng' }, { val: 'draft', label: 'Phiếu tạm' }].map(t => (
                  <button key={t.val} onClick={() => setFilterStatus(t.val)} className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterStatus === t.val ? 'bg-blue-50 text-primary border-primary/30 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}>{t.label}</button>
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
                <th className="px-4 py-3.5 text-left">Mã phiếu</th>
                <th className="px-4 py-3.5 text-left">Thời gian</th>
                <th className="px-4 py-3.5 text-right">Số SP</th>
                <th className="px-4 py-3.5 text-right">SL tăng</th>
                <th className="px-4 py-3.5 text-right">SL giảm</th>
                <th className="px-4 py-3.5 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-primary">{c.code}</td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-500 font-medium">{c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-gray-700">{c.total_items || 0}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-green-600">{c.total_increase > 0 ? `+${c.total_increase}` : '0'}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-red-500">{c.total_decrease > 0 ? `-${c.total_decrease}` : '0'}</td>
                  <td className="px-4 py-3.5"><span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-500'}`}>{STATUS_LABEL[c.status] || c.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><ClipboardCheck size={32} className="text-gray-300" /></div><div className="text-base font-medium text-gray-500">Không có phiếu kiểm kho</div></td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {filtered.length} phiếu kiểm kho</span>
          </div>
        </div>
      </div>

      <InventoryCheckModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload} />
    </div>
  );
}
