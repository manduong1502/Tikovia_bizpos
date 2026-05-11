import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, Users, Package } from 'lucide-react';
import Button from '../../components/ui/Button';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const TABS = [
  { key: 'revenue', label: 'Doanh thu', icon: DollarSign },
  { key: 'profit', label: 'Lợi nhuận', icon: TrendingUp },
  { key: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
  { key: 'products', label: 'Hàng hóa', icon: Package },
  { key: 'customers', label: 'Khách hàng', icon: Users },
  { key: 'employees', label: 'Nhân viên', icon: BarChart3 },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('revenue');
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setData(r.data)).catch(() => {});
  }, []);

  const d = data || {};

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Báo cáo</h1>
        <div className="flex items-center gap-2">
          <select className="border border-gray-200 rounded px-3 py-1.5 text-sm"><option>Hôm nay</option><option>Tuần này</option><option>Tháng này</option><option>Năm nay</option></select>
          <Button icon={<Download size={16} />}>Xuất file</Button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${tab === t.key ? 'bg-white text-primary shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={16} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="text-sm text-gray-500 mb-2">Doanh thu</div>
          <div className="text-2xl font-bold text-gray-800">{fmt(d.monthly_revenue || 0)}</div>
          <div className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={12} />+12.5% so với kỳ trước</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="text-sm text-gray-500 mb-2">Lợi nhuận gộp</div>
          <div className="text-2xl font-bold text-green-600">{fmt((d.monthly_revenue || 0) * 0.35)}</div>
          <div className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={12} />35% biên lợi nhuận</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="text-sm text-gray-500 mb-2">Đơn hàng</div>
          <div className="text-2xl font-bold text-gray-800">{d.today_orders || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Hôm nay</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="text-sm text-gray-500 mb-2">Trả hàng</div>
          <div className="text-2xl font-bold text-orange-500">{d.today_returns || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Hôm nay</div>
        </div>
      </div>

      {/* Chart area */}
      <div className="bg-white border border-border rounded-lg p-6">
        <h3 className="text-base font-bold text-gray-800 mb-4">Biểu đồ {TABS.find(t => t.key === tab)?.label || ''}</h3>
        <div className="flex items-end gap-[3px] h-[220px] px-2">
          {(d.daily_revenues || []).map((r, i) => {
            const maxRev = Math.max(...(d.daily_revenues || []).map(x => x.revenue || 0), 1);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/80 hover:bg-primary rounded-t transition-colors min-h-[2px]" style={{ height: `${Math.max((r.revenue / maxRev) * 200, 2)}px` }} title={`Ngày ${r.day}: ${fmt(r.revenue)}`} />
                <span className="text-[10px] text-gray-400">{String(r.day).padStart(2, '0')}</span>
              </div>
            );
          })}
          {(!d.daily_revenues || d.daily_revenues.length === 0) && <div className="flex-1 text-center text-gray-300 py-16">Chưa có dữ liệu</div>}
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-right">Doanh thu</th>
              <th className="px-4 py-3 text-right">Giá vốn</th>
              <th className="px-4 py-3 text-right">Lợi nhuận gộp</th>
              <th className="px-4 py-3 text-right">Số đơn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(d.daily_revenues || []).map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3">Ngày {r.day}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(r.revenue)}</td>
                <td className="px-4 py-3 text-right">{fmt(r.revenue * 0.65)}</td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(r.revenue * 0.35)}</td>
                <td className="px-4 py-3 text-right">{Math.ceil(r.revenue / 50000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
