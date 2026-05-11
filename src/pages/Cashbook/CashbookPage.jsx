import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Download, Search, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CashbookPage() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get('/api/cashbook').then(r => setEntries(Array.isArray(r.data) ? r.data : (r.data.data || []))).catch(() => setEntries([]));
  }, []);

  const totalIn = entries.filter(e => e.type === 'in').reduce((s, e) => s + (e.amount || 0), 0);
  const totalOut = entries.filter(e => e.type === 'out').reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Sổ quỹ</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={16} />}>Tạo phiếu thu</Button>
          <Button icon={<Plus size={16} />}>Tạo phiếu chi</Button>
          <Button icon={<Download size={16} />}>Xuất file</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Tổng thu</div>
          <div className="text-xl font-bold text-green-600">{fmt(totalIn)}</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Tổng chi</div>
          <div className="text-xl font-bold text-red-500">{fmt(totalOut)}</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Tồn quỹ</div>
          <div className="text-xl font-bold text-primary">{fmt(totalIn - totalOut)}</div>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Thời gian</span>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="cb-time" defaultChecked /> Hôm nay</label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="cb-time" /> Tùy chỉnh</label>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Loại phiếu</span>
            <div className="flex gap-1">
              {['Tất cả', 'Thu', 'Chi'].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-xs rounded border cursor-pointer ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-border rounded">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} />} placeholder="Theo mã phiếu" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr>
                <th className="px-3 py-3 text-left">Mã phiếu</th>
                <th className="px-3 py-3 text-left">Thời gian</th>
                <th className="px-3 py-3 text-left">Loại</th>
                <th className="px-3 py-3 text-left">Đối tượng</th>
                <th className="px-3 py-3 text-right">Giá trị</th>
                <th className="px-3 py-3 text-left">Người tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium text-primary">{e.code || `PT${String(i+1).padStart(4,'0')}`}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${e.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {e.type === 'in' ? <><ArrowDownLeft size={10} /> Thu</> : <><ArrowUpRight size={10} /> Chi</>}
                    </span>
                  </td>
                  <td className="px-3 py-3">{e.target || e.description || ''}</td>
                  <td className={`px-3 py-3 text-right font-medium ${e.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>{e.type === 'in' ? '+' : '-'}{fmt(e.amount)}</td>
                  <td className="px-3 py-3 text-gray-500">{e.user_name || 'Admin'}</td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chưa có phiếu thu chi</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
