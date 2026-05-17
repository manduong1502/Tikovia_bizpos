import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, Users, Package } from 'lucide-react';
import Button from '../../components/ui/Button';
import { exportCSV } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const TABS = [
  { key: 'revenue', label: 'Doanh thu', icon: DollarSign },
  { key: 'profit', label: 'Lợi nhuận', icon: TrendingUp },
  { key: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
  { key: 'products', label: 'Hàng hóa', icon: Package },
  { key: 'customers', label: 'Khách hàng', icon: Users },
  { key: 'employees', label: 'Nhân viên', icon: BarChart3 },
];

import Dropdown from '../../components/ui/Dropdown';

export default function ReportsPage() {
  const [tab, setTab] = useState('revenue');
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState('Hôm nay');

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setData(r.data)).catch(() => {});
  }, []);

  const d = data || {};

  return (
    <div className="flex flex-col gap-6 animate-page-in p-1.5 sm:p-6 max-w-full overflow-x-hidden bg-gray-50/50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 max-w-full mb-1">
        <h1 className="text-lg sm:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3 m-0">Báo cáo</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Dropdown
            value={timeRange}
            options={[
              { value: 'Hôm nay', label: 'Hôm nay' },
              { value: 'Tuần này', label: 'Tuần này' },
              { value: 'Tháng này', label: 'Tháng này' },
              { value: 'Năm nay', label: 'Năm nay' },
            ]}
            onChange={setTimeRange}
          />
          <Button icon={<Download size={16} />} className="shadow-sm w-full sm:w-auto justify-center text-xs sm:text-sm whitespace-nowrap cursor-pointer" onClick={() => { const rows = (d.top_products || []).map(p => ({ name: p.name, quantity: p.quantity || p.total_quantity, revenue: p.revenue || p.total_revenue })); exportCSV([{key:'name',label:'Sản phẩm'},{key:'quantity',label:'SL bán'},{key:'revenue',label:'Doanh thu'}], rows, 'bao_cao'); toast.success('Xuất file thành công'); }}>Xuất file</Button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1.5 w-full overflow-x-auto shadow-sm custom-scrollbar">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-[13px] rounded-lg transition-all cursor-pointer font-bold whitespace-nowrap shrink-0 ${tab === t.key ? 'bg-blue-50 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              <Icon size={16} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={64} className="text-blue-600" /></div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-500 mb-1 sm:mb-2 truncate">Doanh thu</div>
          <div className="text-xl sm:text-3xl font-extrabold text-gray-800 tracking-tight truncate">{fmt(d.monthly_revenue || 0)}</div>
          <div className="text-[11px] sm:text-[13px] font-bold text-green-600 mt-2 flex items-center gap-1 sm:gap-1.5"><TrendingUp size={14} />+12.5% so với kỳ trước</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={64} className="text-green-600" /></div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-500 mb-1 sm:mb-2 truncate">Lợi nhuận gộp</div>
          <div className="text-xl sm:text-3xl font-extrabold text-green-600 tracking-tight truncate">{fmt((d.monthly_revenue || 0) * 0.35)}</div>
          <div className="text-[11px] sm:text-[13px] font-bold text-green-600 mt-2 flex items-center gap-1 sm:gap-1.5"><TrendingUp size={14} />35% biên lợi nhuận</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ShoppingCart size={64} className="text-indigo-600" /></div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-500 mb-1 sm:mb-2 truncate">Đơn hàng</div>
          <div className="text-xl sm:text-3xl font-extrabold text-gray-800 tracking-tight truncate">{d.today_orders || 0}</div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-400 mt-2 truncate">Hôm nay</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Package size={64} className="text-orange-500" /></div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-500 mb-1 sm:mb-2 truncate">Trả hàng</div>
          <div className="text-xl sm:text-3xl font-extrabold text-orange-500 tracking-tight truncate">{d.today_returns || 0}</div>
          <div className="text-xs sm:text-[13px] font-bold text-gray-400 mt-2 truncate">Hôm nay</div>
        </div>
      </div>

      {/* Chart area */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm overflow-x-auto max-w-full">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6 tracking-tight min-w-[500px]">Biểu đồ {TABS.find(t => t.key === tab)?.label || ''}</h3>
        <div className="flex items-end gap-1 sm:gap-1.5 h-[200px] sm:h-[260px] px-1 sm:px-2 min-w-[500px]">
          {(d.daily_revenues || []).map((r, i) => {
            const maxRev = Math.max(...(d.daily_revenues || []).map(x => x.revenue || 0), 1);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full bg-gradient-to-t from-blue-500/80 to-blue-400 group-hover:from-blue-600 group-hover:to-blue-500 rounded-t-sm transition-all min-h-[4px] relative" style={{ height: `${Math.max((r.revenue / maxRev) * 200, 4)}px` }}>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                    {fmt(r.revenue)}
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400">{String(r.day).padStart(2, '0')}</span>
              </div>
            );
          })}
          {(!d.daily_revenues || d.daily_revenues.length === 0) && <div className="flex-1 text-center text-gray-400 py-16 font-medium min-w-[500px]">Chưa có dữ liệu biểu đồ</div>}
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto max-w-full mb-8">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4 text-left">Ngày</th>
              <th className="px-6 py-4 text-right">Doanh thu</th>
              <th className="px-6 py-4 text-right">Giá vốn</th>
              <th className="px-6 py-4 text-right">Lợi nhuận gộp</th>
              <th className="px-6 py-4 text-right">Số đơn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(d.daily_revenues || []).map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-800">Ngày {r.day}</td>
                <td className="px-6 py-4 text-right font-extrabold text-primary">{fmt(r.revenue)}</td>
                <td className="px-6 py-4 text-right font-medium text-gray-600">{fmt(r.revenue * 0.65)}</td>
                <td className="px-6 py-4 text-right text-green-600 font-extrabold">{fmt(r.revenue * 0.35)}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-700">{Math.ceil(r.revenue / 50000)}</td>
              </tr>
            ))}
            {(!d.daily_revenues || d.daily_revenues.length === 0) && <tr><td colSpan={5} className="text-center py-12 text-gray-400 font-medium">Không có dữ liệu chi tiết</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
