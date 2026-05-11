import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Download, Search } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/returns').then(r => setReturns(Array.isArray(r.data) ? r.data : (r.data?.data || []))).catch(() => setReturns([]));
  }, []);

  return (
    <div className="flex flex-col gap-4 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Trả hàng</h1>
        <Button icon={<Download size={16} />}>Xuất file</Button>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Trạng thái</span>
            <div className="flex gap-1">
              {['Tất cả', 'Đã trả', 'Phiếu tạm'].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-xs rounded border cursor-pointer ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Thời gian</span>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="rt-date" defaultChecked /> Toàn thời gian</label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="rt-date" /> Tùy chỉnh</label>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-border rounded">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} />} placeholder="Theo mã phiếu trả" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr><th className="px-3 py-3 w-10"><input type="checkbox" className="w-4 h-4" /></th><th className="px-3 py-3 text-left">Mã trả hàng</th><th className="px-3 py-3 text-left">Thời gian</th><th className="px-3 py-3 text-left">Khách hàng</th><th className="px-3 py-3 text-left">Mã hóa đơn gốc</th><th className="px-3 py-3 text-right">Tổng tiền trả</th><th className="px-3 py-3 text-left">Trạng thái</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {returns.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-3 py-3"><input type="checkbox" className="w-4 h-4" /></td>
                  <td className="px-3 py-3 font-medium text-primary">{r.code || `TH${String(r.id).padStart(5, '0')}`}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="px-3 py-3">{r.customer_name || 'Khách lẻ'}</td>
                  <td className="px-3 py-3 text-primary">{r.order_code || ''}</td>
                  <td className="px-3 py-3 text-right font-medium text-red-500">{fmt(r.total)}</td>
                  <td className="px-3 py-3"><span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[11px]">Đã trả</span></td>
                </tr>
              ))}
              {returns.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-gray-300"><div className="text-4xl mb-2">↩️</div>Chưa có phiếu trả hàng</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
