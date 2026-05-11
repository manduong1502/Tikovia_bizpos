import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Download, Search, Phone, Mail, MapPin } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    axios.get('/api/suppliers').then(r => setSuppliers(Array.isArray(r.data) ? r.data : [])).catch(() => setSuppliers([]));
  }, []);

  const filtered = search ? suppliers.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase())) : suppliers;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Nhà cung cấp</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={16} />}>Thêm nhà cung cấp</Button>
          <Button icon={<Download size={16} />}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Nhóm NCC</span>
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm"><option>Tất cả</option></select>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Trạng thái</span>
            <div className="flex gap-1">
              {['Tất cả', 'Đang giao dịch', 'Ngừng giao dịch'].map((t, i) => (
                <button key={t} className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-border rounded">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} />} placeholder="Tìm nhà cung cấp" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr><th className="px-3 py-3 w-10"><input type="checkbox" className="w-4 h-4" /></th><th className="px-3 py-3 text-left">Mã NCC</th><th className="px-3 py-3 text-left">Tên nhà cung cấp</th><th className="px-3 py-3 text-left">Điện thoại</th><th className="px-3 py-3 text-left">Email</th><th className="px-3 py-3 text-right">Nợ hiện tại</th><th className="px-3 py-3 text-right">Tổng mua</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr key={s.id} className={`cursor-pointer transition-colors ${expandedId === s.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="w-4 h-4" /></td>
                  <td className="px-3 py-3 font-medium text-primary">NCC{String(s.id).padStart(4,'0')}</td>
                  <td className="px-3 py-3 font-medium">{s.name}</td>
                  <td className="px-3 py-3 text-gray-500">{s.phone || ''}</td>
                  <td className="px-3 py-3 text-gray-500">{s.email || ''}</td>
                  <td className="px-3 py-3 text-right">{fmt(s.debt || 0)}</td>
                  <td className="px-3 py-3 text-right font-medium">{fmt(s.total_purchase || 0)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không có nhà cung cấp</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
