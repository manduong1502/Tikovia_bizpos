import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Plus, Download, Search, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function InventoryCheckPage() {
  const [checks, setChecks] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/inventory-checks').then(r => setChecks(Array.isArray(r.data) ? r.data : [])).catch(() => setChecks([]));
  }, []);

  const statusMap = {
    completed: { label: 'Đã cân bằng kho', icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
    processing: { label: 'Đang xử lý', icon: Clock, cls: 'bg-yellow-100 text-yellow-700' },
    draft: { label: 'Phiếu tạm', icon: AlertCircle, cls: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div className="flex flex-col gap-4 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Kiểm kho</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => toast.success('Tạo phiếu kiểm kho mới')}>Kiểm kho</Button>
          <Button icon={<Download size={16} />}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Trạng thái</span>
            <div className="flex flex-wrap gap-1">
              {['Tất cả', 'Phiếu tạm', 'Đã cân bằng'].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-xs rounded border cursor-pointer ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Thời gian</span>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="ic-date" defaultChecked /> Toàn thời gian</label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="ic-date" /> Tùy chỉnh</label>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-border rounded">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} />} placeholder="Theo mã phiếu kiểm" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr><th className="px-3 py-3 w-10"><input type="checkbox" className="w-4 h-4" /></th><th className="px-3 py-3 text-left">Mã kiểm kho</th><th className="px-3 py-3 text-left">Thời gian</th><th className="px-3 py-3 text-left">Chi nhánh</th><th className="px-3 py-3 text-right">Tổng SL thực tế</th><th className="px-3 py-3 text-right">Tổng chênh lệch</th><th className="px-3 py-3 text-left">Trạng thái</th><th className="px-3 py-3 text-left">Ghi chú</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {checks.map(c => {
                const s = statusMap[c.status] || statusMap.draft;
                const Icon = s.icon;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-3 py-3"><input type="checkbox" className="w-4 h-4" /></td>
                    <td className="px-3 py-3 font-medium text-primary">{c.code || `KK${String(c.id).padStart(5, '0')}`}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : ''}</td>
                    <td className="px-3 py-3">Chi nhánh trung tâm</td>
                    <td className="px-3 py-3 text-right">{c.actual_qty || 0}</td>
                    <td className="px-3 py-3 text-right font-medium">{c.difference || 0}</td>
                    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${s.cls}`}><Icon size={11} />{s.label}</span></td>
                    <td className="px-3 py-3 text-xs text-gray-400">{c.note || ''}</td>
                  </tr>
                );
              })}
              {checks.length === 0 && <tr><td colSpan={8} className="text-center py-16 text-gray-300"><div className="text-4xl mb-2">📋</div>Chưa có phiếu kiểm kho</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
