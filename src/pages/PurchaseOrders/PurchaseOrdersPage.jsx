import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Download, Search } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get('/api/purchase-orders').then(r => setOrders(Array.isArray(r.data) ? r.data : (r.data.data || []))).catch(() => setOrders([]));
  }, []);

  const filtered = search ? orders.filter(o => (o.code || '').toLowerCase().includes(search.toLowerCase())) : orders;
  const totalAmount = filtered.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Nhập hàng</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={16} />}>Nhập hàng</Button>
          <Button icon={<Download size={16} />}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Trạng thái</span>
            <div className="flex flex-wrap gap-1">
              {['Tất cả', 'Phiếu tạm', 'Đã nhập hàng'].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-xs rounded border cursor-pointer ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">NCC</span>
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm"><option>Tất cả NCC</option></select>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Thanh toán</span>
            <div className="flex gap-1">
              {['Tất cả', 'Đã thanh toán', 'Chưa TT'].map((t, i) => (
                <button key={t} className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-border rounded">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} />} placeholder="Theo mã phiếu nhập" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr><th className="px-3 py-3 w-10"><input type="checkbox" className="w-4 h-4" /></th><th className="px-3 py-3 text-left">Mã nhập hàng</th><th className="px-3 py-3 text-left">Thời gian</th><th className="px-3 py-3 text-left">Nhà cung cấp</th><th className="px-3 py-3 text-right">Cần trả NCC</th><th className="px-3 py-3 text-left">Trạng thái</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-gray-50/60 text-xs font-semibold text-gray-600"><td></td><td colSpan={3}></td><td className="px-3 py-2 text-right">{fmt(totalAmount)}</td><td></td></tr>
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-3 py-3"><input type="checkbox" className="w-4 h-4" /></td>
                  <td className="px-3 py-3 font-medium text-primary">{o.code || `PN${String(o.id).padStart(5,'0')}`}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="px-3 py-3">{o.supplier_name || ''}</td>
                  <td className="px-3 py-3 text-right font-medium">{fmt(o.total)}</td>
                  <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-medium ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status === 'completed' ? 'Đã nhập hàng' : 'Phiếu tạm'}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chưa có phiếu nhập hàng</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
