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
];

import Dropdown from '../../components/ui/Dropdown';

export default function ReportsPage() {
  const [tab, setTab] = useState('revenue');
  const [finData, setFinData] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [timeRange, setTimeRange] = useState('Tháng này');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let fromDate = '';
    let toDate = '';
    const now = new Date();

    if (timeRange === 'Hôm nay') {
      const dStr = now.toISOString().split('T')[0];
      fromDate = dStr;
      toDate = dStr;
    } else if (timeRange === 'Tuần này') {
      const first = now.getDate() - now.getDay() + 1;
      const firstDay = new Date(now.setDate(first)).toISOString().split('T')[0];
      fromDate = firstDay;
      toDate = new Date().toISOString().split('T')[0];
    } else if (timeRange === 'Tháng này') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      fromDate = `${y}-${m}-01`;
      toDate = new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (timeRange === 'Năm nay') {
      const y = now.getFullYear();
      fromDate = `${y}-01-01`;
      toDate = `${y}-12-31`;
    }

    Promise.all([
      axios.get('/api/reports/financial', { params: { fromDate, toDate } }).catch(() => ({ data: null })),
      axios.get('/api/reports/sales', { params: { days: 30 } }).catch(() => ({ data: [] }))
    ]).then(([finRes, salesRes]) => {
      setFinData(finRes.data || null);
      setSalesData(Array.isArray(salesRes.data) ? salesRes.data : []);
    }).finally(() => {
      setLoading(false);
    });
  }, [timeRange]);

  const f = finData || {
    grossRevenue: 0,
    totalDeductions: 0,
    orderDiscounts: 0,
    returnTotalVal: 0,
    netRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    operatingProfit: 0,
    otherIncome: 0,
    otherExpenses: 0,
    netProfit: 0,
    profitMargin: 0
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative pb-10">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-3 bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-gray-100 flex-none z-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3 m-0">
              Báo cáo Kết quả Hoạt động Kinh doanh
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-semibold">Theo chuẩn công thức KiotViet (Doanh thu, Giá vốn, Lợi nhuận gộp & Lãi ròng)</p>
          </div>
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
            <Button 
              icon={<Download size={16} />} 
              className="shadow-sm w-full sm:w-auto justify-center text-xs sm:text-sm whitespace-nowrap cursor-pointer font-extrabold" 
              onClick={() => { 
                const rows = [
                  { stt: '(1)', name: 'Doanh thu bán hàng', val: f.grossRevenue },
                  { stt: '(2)', name: 'Giảm trừ doanh thu', val: f.totalDeductions },
                  { stt: '(3)', name: 'Doanh thu thuần', val: f.netRevenue },
                  { stt: '(4)', name: 'Giá vốn hàng bán', val: f.cogs },
                  { stt: '(5)', name: 'Lợi nhuận gộp', val: f.grossProfit },
                  { stt: '(6)', name: 'Chi phí hoạt động', val: f.operatingExpenses },
                  { stt: '(7)', name: 'Lợi nhuận từ HĐKD', val: f.operatingProfit },
                  { stt: '(8)', name: 'Lợi nhuận thuần (Lãi ròng)', val: f.netProfit },
                ]; 
                exportCSV([{key:'stt',label:'STT'},{key:'name',label:'Chỉ tiêu'},{key:'val',label:'Số tiền (VNĐ)'}], rows, 'bao_cao_tai_chinh'); 
                toast.success('Xuất file Báo cáo tài chính thành công'); 
              }}
            >
              Xuất Báo cáo Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="text-xs font-extrabold text-gray-500 mb-1">1. Doanh thu thuần</div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight">{fmt(f.netRevenue)} đ</div>
          <div className="text-[11px] font-semibold text-gray-400 mt-1">Doanh thu bán - Hàng trả/Giảm giá</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="text-xs font-extrabold text-gray-500 mb-1">2. Giá vốn hàng bán</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">{fmt(f.cogs)} đ</div>
          <div className="text-[11px] font-semibold text-gray-400 mt-1">Tổng tiền gốc sản phẩm xuất kho</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="text-xs font-extrabold text-gray-500 mb-1">3. Lợi nhuận gộp</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">{fmt(f.grossProfit)} đ</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp size={14} />{f.netRevenue > 0 ? ((f.grossProfit / f.netRevenue) * 100).toFixed(1) : '0'}% Biên LN gộp
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="text-xs font-extrabold text-gray-500 mb-1">4. Lợi nhuận thuần (Lãi ròng)</div>
          <div className="text-xl sm:text-2xl font-black text-primary tracking-tight">{fmt(f.netProfit)} đ</div>
          <div className="text-[11px] font-bold text-primary mt-1 flex items-center gap-1">
            <TrendingUp size={14} />{f.profitMargin.toFixed(1)}% Biên LN thuần
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1.5 bg-white border border-gray-100 rounded-xl p-1.5 w-full overflow-x-auto shadow-sm custom-scrollbar mb-4">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button 
              key={t.key} 
              onClick={() => setTab(t.key)} 
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-[13px] rounded-lg transition-all cursor-pointer font-bold whitespace-nowrap shrink-0 ${
                tab === t.key ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Financial Statement Table (Standard KiotViet 10-line Statement) */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-black text-gray-900 m-0">
            Bảng Kê Chi Tiết Kết Quả Bán Hàng & Lợi Nhuận
          </h3>
          <span className="text-xs font-extrabold text-primary bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
            Kỳ báo cáo: {timeRange}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-xs font-black text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5 w-16 text-center">STT</th>
                <th className="px-5 py-3.5">Chỉ tiêu báo cáo</th>
                <th className="px-5 py-3.5 text-right">Số tiền (VNĐ)</th>
                <th className="px-5 py-3.5">Công thức / Giải thích nguồn gốc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold">
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3.5 text-center font-bold text-gray-400">(1)</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">Doanh thu bán hàng</td>
                <td className="px-5 py-3.5 text-right font-extrabold text-gray-900">{fmt(f.grossRevenue)} đ</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">Tổng giá trị niêm yết của tất cả đơn bán phát sinh trong kỳ</td>
              </tr>
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3.5 text-center font-bold text-gray-400">(2)</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">Giảm trừ doanh thu</td>
                <td className="px-5 py-3.5 text-right font-extrabold text-red-600">-{fmt(f.totalDeductions)} đ</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">(2.1) Chiết khấu HD + (2.2) Giá trị hàng khách trả lại</td>
              </tr>
              <tr className="bg-blue-50/40 font-extrabold">
                <td className="px-5 py-3.5 text-center text-primary">(3)</td>
                <td className="px-5 py-3.5 text-primary text-base">DOANH THU THUẦN</td>
                <td className="px-5 py-3.5 text-right text-primary text-base font-black">{fmt(f.netRevenue)} đ</td>
                <td className="px-5 py-3.5 text-xs text-primary font-bold">(3) = (1) - (2) (Số tiền thu thực tế từ bán hàng)</td>
              </tr>
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3.5 text-center font-bold text-gray-400">(4)</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">Giá vốn hàng bán (COGS)</td>
                <td className="px-5 py-3.5 text-right font-extrabold text-amber-600">-{fmt(f.cogs)} đ</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">Tổng giá gốc nhập hàng của tất cả sản phẩm bán ra trừ bớt giá vốn hàng trả lại</td>
              </tr>
              <tr className="bg-emerald-50/50 font-extrabold">
                <td className="px-5 py-3.5 text-center text-emerald-700">(5)</td>
                <td className="px-5 py-3.5 text-emerald-800 text-base">LỢI NHUẬN GỘP VỀ BÁN HÀNG</td>
                <td className="px-5 py-3.5 text-right text-emerald-700 text-base font-black">{fmt(f.grossProfit)} đ</td>
                <td className="px-5 py-3.5 text-xs text-emerald-700 font-bold">(5) = (3) - (4) (Lợi nhuận trực tiếp từ chênh lệch bán - giá gốc)</td>
              </tr>
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3.5 text-center font-bold text-gray-400">(6)</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">Chi phí hoạt động (Sổ quỹ)</td>
                <td className="px-5 py-3.5 text-right font-extrabold text-red-600">-{fmt(f.operatingExpenses)} đ</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">Các phiếu chi vận hành trong Sổ quỹ (Lương, mặt bằng, điện nước, vận chuyển...)</td>
              </tr>
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3.5 text-center font-bold text-gray-400">(7)</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">Lợi nhuận từ HĐKD</td>
                <td className="px-5 py-3.5 text-right font-extrabold text-gray-900">{fmt(f.operatingProfit)} đ</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">(7) = (5) - (6) (Lợi nhuận kinh doanh sau khi trừ chi phí vận hành)</td>
              </tr>
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3.5 text-center font-bold text-gray-400">(8)</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">Thu nhập khác</td>
                <td className="px-5 py-3.5 text-right font-extrabold text-emerald-600">+{fmt(f.otherIncome)} đ</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">Các khoản thu ngoài bán hàng (Thưởng, thanh lý, chiết khấu...)</td>
              </tr>
              <tr className="bg-primary/10 font-extrabold">
                <td className="px-5 py-4 text-center text-primary font-black">(10)</td>
                <td className="px-5 py-4 text-primary text-base font-black">LỢI NHUẬN THUẦN (LÃI RÒNG)</td>
                <td className="px-5 py-4 text-right text-primary text-lg font-black">{fmt(f.netProfit)} đ</td>
                <td className="px-5 py-4 text-xs text-primary font-bold">(10) = (7) + (8) - (9) (Lợi nhuận bỏ túi cuối cùng của cửa hàng)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily breakdown chart & table */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
        <h3 className="text-base font-black text-gray-900 mb-4">Biểu đồ Doanh thu & Lợi nhuận 30 ngày gần nhất</h3>
        <div className="flex items-end gap-1.5 h-[220px] px-2 min-w-[500px] overflow-x-auto">
          {salesData.map((r, i) => {
            const maxVal = Math.max(...salesData.map(x => Math.max(x.revenue || 0, x.profit || 0)), 1);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex items-end justify-center gap-0.5 h-[180px]">
                  <div 
                    className="w-1/2 bg-blue-500 group-hover:bg-blue-600 rounded-t-sm transition-all relative"
                    style={{ height: `${Math.max((r.revenue / maxVal) * 170, 4)}px` }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md">
                      DT: {fmt(r.revenue)}
                    </div>
                  </div>
                  <div 
                    className="w-1/2 bg-emerald-500 group-hover:bg-emerald-600 rounded-t-sm transition-all relative"
                    style={{ height: `${Math.max((r.profit / maxVal) * 170, 4)}px` }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-emerald-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md">
                      LN: {fmt(r.profit)}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400">{String(r.day).padStart(2, '0')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto max-w-full">
        <table className="w-full text-xs">
          <thead className="text-[11px] font-black text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3.5 text-left">Ngày</th>
              <th className="px-5 py-3.5 text-right">Doanh thu thuần</th>
              <th className="px-5 py-3.5 text-right">Giá vốn</th>
              <th className="px-5 py-3.5 text-right">Lợi nhuận gộp</th>
              <th className="px-5 py-3.5 text-right">Số đơn hàng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-semibold">
            {salesData.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 font-bold text-gray-900">Ngày {r.day}</td>
                <td className="px-5 py-3.5 text-right font-extrabold text-blue-600">{fmt(r.revenue)} đ</td>
                <td className="px-5 py-3.5 text-right font-bold text-amber-600">{fmt(r.cogs)} đ</td>
                <td className="px-5 py-3.5 text-right font-black text-emerald-600">{fmt(r.profit)} đ</td>
                <td className="px-5 py-3.5 text-right font-bold text-gray-700">{r.count} đơn</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
