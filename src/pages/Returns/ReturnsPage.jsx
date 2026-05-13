import { useState, useEffect, useCallback } from 'react';
import { returnAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Download, Search, Undo2 } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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
    <div className="flex flex-col gap-5 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Trả hàng</h1>
        <Button icon={<Download size={16} />} className="shadow-sm" onClick={handleExport}>Xuất file</Button>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
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

        <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} className="text-gray-400" />} placeholder="Theo mã phiếu trả" value={search} onChange={e => setSearch(e.target.value)} className="bg-white" /></div>
          </div>
          <table className="w-full text-sm">
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
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {returns.length} phiếu trả hàng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
