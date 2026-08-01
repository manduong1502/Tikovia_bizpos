import { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Users, ShoppingCart, RotateCcw, Package, TrendingUp, TrendingDown, 
  Eye, EyeOff, Calendar, ChevronDown, Plus, AlertTriangle, ArrowUpRight, 
  Layers, CreditCard, Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Dropdown from '../../components/ui/Dropdown';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const fmtSmart = (n) => {
  const num = Number(n || 0);
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)} tỷ`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)} triệu`;
  }
  return `${fmt(num)} đ`;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  // Time filters
  const [timeRange, setTimeRange] = useState('Tháng này');
  const [tab, setTab] = useState('daily');
  const [filterRev, setFilterRev] = useState('Tháng này');
  const [filterProd, setFilterProd] = useState('Tháng này');
  const [filterCust, setFilterCust] = useState('Tháng này');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(
          `/dashboard?timeRange=${encodeURIComponent(timeRange)}&timeProd=${encodeURIComponent(filterProd)}&timeCust=${encodeURIComponent(filterCust)}`
        );
        setData(res.data);
      } catch (e) {
        setData({ 
          todayStats: { revenue: 0, orders: 0, returns: 0 }, 
          periodStats: { orderCount: 0, revenue: 0, profit: 0, returnCount: 0, returnAmount: 0 },
          overview: { totalProducts: 0, lowStockProducts: 0, totalCustomers: 0 }, 
          monthly_revenue: 0, 
          prev_month_revenue: 0, 
          daily_revenues: [], 
          top_products: [], 
          top_customers: [], 
          recentOrders: [] 
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange, filterProd, filterCust]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-bold text-gray-500 tracking-wide">Đang tải dữ liệu tổng quan...</div>
        </div>
      </div>
    );
  }

  const d = data || {};
  const period = d.periodStats || {
    orderCount: d.todayStats?.orders || 0,
    revenue: d.monthly_revenue || 0,
    profit: Math.round((d.monthly_revenue || 0) * 0.18),
    returnCount: d.todayStats?.returns || 0,
    returnAmount: 0
  };

  const pct = d.prev_month_revenue > 0 ? ((d.monthly_revenue / d.prev_month_revenue - 1) * 100).toFixed(1) : '0';
  const isUp = parseFloat(pct) >= 0;

  const revenues = d.daily_revenues || [];
  const maxRev = Math.max(...revenues.map(r => r.revenue), 1);

  const TIME_OPTIONS = [
    { value: 'Hôm nay', label: 'Hôm nay' },
    { value: 'Hôm qua', label: 'Hôm qua' },
    { value: '7 ngày qua', label: '7 ngày qua' },
    { value: 'Tháng này', label: 'Tháng này' },
    { value: 'Tháng trước', label: 'Tháng trước' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-full font-sans pb-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 m-0">
            Tổng quan kinh doanh <Sparkles size={18} className="text-amber-500" />
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium m-0">
            Theo dõi doanh thu, hóa đơn & lợi nhuận thời gian thực
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white text-xs font-extrabold rounded-xl shadow-md transition-all border-none cursor-pointer"
          >
            <Plus size={16} /> Bán hàng POS
          </button>
          <button
            onClick={() => navigate('/purchase-orders/create')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
          >
            <ShoppingCart size={15} /> Nhập hàng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 min-w-0">
        {/* Left Area */}
        <div className="flex flex-col gap-5 min-w-0">
          
          {/* Main KiotViet Overview Card (Hóa đơn, Doanh thu, Lợi nhuận, Đơn trả hàng) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 transition-all hover:shadow-md">
            {/* Top Bar: Range Filter Selector */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                Kết quả bán hàng
              </span>

              <div className="w-36">
                <Dropdown
                  value={timeRange}
                  options={TIME_OPTIONS}
                  onChange={setTimeRange}
                />
              </div>
            </div>

            {/* Metrics Row: Revenue & Profit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Revenue & Invoices */}
              <div className="flex flex-col gap-1">
                <span className="text-xs sm:text-sm font-semibold text-gray-500">
                  {fmt(period.orderCount)} hoá đơn
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                    {fmtSmart(period.revenue)}
                  </span>
                </div>
              </div>

              {/* Profit & Toggle */}
              <div className="flex flex-col gap-1 sm:border-l sm:border-gray-100 sm:pl-8">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-500">
                    Lợi nhuận
                  </span>
                  <button
                    onClick={() => setShowProfit(!showProfit)}
                    className="p-1 text-gray-400 hover:text-primary rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                    title={showProfit ? 'Ẩn lợi nhuận' : 'Hiện lợi nhuận'}
                  >
                    {showProfit ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                    {showProfit ? fmtSmart(period.profit) : '••••••••'}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider & Returns Row */}
            <div className="border-t border-gray-100 pt-3.5 mt-5 flex items-center justify-between text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <RotateCcw size={15} className="text-amber-500" />
                <span>
                  <strong>{period.returnCount}</strong> đơn trả hàng – <strong className="text-gray-900">{fmtSmart(period.returnAmount)}</strong>
                </span>
              </div>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                {timeRange}
              </span>
            </div>
          </div>

          {/* Today Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="text-[11px] sm:text-xs font-bold text-gray-500 mb-1">Doanh thu hôm nay</div>
              <div className="text-base sm:text-xl font-black text-primary truncate">{fmt(d.todayStats?.revenue || 0)}</div>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="text-[11px] sm:text-xs font-bold text-gray-500 mb-1">Đơn hôm nay</div>
              <div className="text-base sm:text-xl font-black text-gray-800">{d.todayStats?.orders || 0}</div>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="text-[11px] sm:text-xs font-bold text-gray-500 mb-1">Trả hàng hôm nay</div>
              <div className="text-base sm:text-xl font-black text-amber-600">{d.todayStats?.returns || 0}</div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-extrabold text-gray-900 m-0">Doanh thu thuần</h3>
                <span className="text-lg font-black text-primary">{fmt(d.monthly_revenue)}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-0.5 ${isUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {pct}%
                </span>
              </div>
              <div className="w-36 self-end sm:self-auto">
                <Dropdown
                  value={filterRev}
                  options={[
                    { value: 'Tháng này', label: 'Tháng này' },
                    { value: 'Tháng trước', label: 'Tháng trước' },
                  ]}
                  onChange={setFilterRev}
                />
              </div>
            </div>

            {/* Tab control */}
            <div className="flex justify-center mb-5 overflow-x-auto pb-1">
              <div className="inline-flex bg-gray-100/70 p-1 rounded-xl whitespace-nowrap gap-1">
                {[
                  { key: 'daily', label: 'Theo ngày' },
                  { key: 'hourly', label: 'Theo giờ' },
                  { key: 'weekday', label: 'Theo thứ' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${
                      tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800 bg-transparent'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-[3px] sm:gap-[4px] h-[150px] sm:h-[180px] px-1 sm:px-2 overflow-x-auto custom-scrollbar">
              {revenues.map((r, i) => (
                <div key={i} className="flex-1 min-w-[12px] sm:min-w-[16px] flex flex-col items-center gap-1 group cursor-pointer">
                  <div
                    className="w-full bg-blue-100 group-hover:bg-primary rounded-t-sm transition-all duration-200 min-h-[4px]"
                    style={{ height: `${Math.max((r.revenue / maxRev) * 140, 4)}px` }}
                    title={`Ngày ${r.day}: ${fmt(r.revenue)} đ`}
                  />
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 group-hover:text-primary transition-colors">{String(r.day).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products & Top Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Top Products */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 m-0">Top hàng bán chạy</h3>
                <div className="w-32">
                  <Dropdown
                    value={filterProd}
                    options={[
                      { value: 'Hôm nay', label: 'Hôm nay' },
                      { value: 'Hôm qua', label: 'Hôm qua' },
                      { value: '7 ngày qua', label: '7 ngày qua' },
                      { value: 'Tháng này', label: 'Tháng này' },
                      { value: 'Tháng trước', label: 'Tháng trước' },
                    ]}
                    onChange={setFilterProd}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {(d.top_products || []).slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50/80 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="flex-1 text-xs sm:text-sm font-bold text-gray-800 truncate">{p.name}</span>
                    <span className="text-[11px] font-semibold text-gray-500 shrink-0">{p.total_sold} sp</span>
                    <span className="text-xs font-extrabold text-primary shrink-0">{fmt(p.total_revenue)}</span>
                  </div>
                ))}
                {(!d.top_products || d.top_products.length === 0) && (
                  <div className="text-center py-6 text-gray-400 text-xs font-medium">
                    <Package size={24} className="mx-auto text-gray-300 mb-1.5" />
                    Chưa có dữ liệu hàng hóa
                  </div>
                )}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 m-0">Top khách chi tiêu</h3>
                <div className="w-32">
                  <Dropdown
                    value={filterCust}
                    options={[
                      { value: 'Hôm nay', label: 'Hôm nay' },
                      { value: 'Hôm qua', label: 'Hôm qua' },
                      { value: '7 ngày qua', label: '7 ngày qua' },
                      { value: 'Tháng này', label: 'Tháng này' },
                      { value: 'Tháng trước', label: 'Tháng trước' },
                    ]}
                    onChange={setFilterCust}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {(d.top_customers || []).slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50/80 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="flex-1 text-xs sm:text-sm font-bold text-gray-800 truncate">{c.name}</span>
                    <span className="text-[11px] font-semibold text-gray-500 shrink-0">{c.order_count} đơn</span>
                    <span className="text-xs font-extrabold text-primary shrink-0">{fmt(c.total_spent)}</span>
                  </div>
                ))}
                {(!d.top_customers || d.top_customers.length === 0) && (
                  <div className="text-center py-6 text-gray-400 text-xs font-medium">
                    <Users size={24} className="mx-auto text-gray-300 mb-1.5" />
                    Chưa có dữ liệu khách hàng
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Area Sidebar */}
        <div className="flex flex-col gap-5 min-w-0">
          
          {/* Quick Overview Mini Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/products" className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:border-primary/40 transition-all no-underline">
              <div className="flex items-center justify-between mb-2">
                <Package size={18} className="text-primary" />
                <ArrowUpRight size={14} className="text-gray-400" />
              </div>
              <div className="text-xs font-bold text-gray-500">Sản phẩm</div>
              <div className="text-base font-black text-gray-900 mt-0.5">{d.overview?.totalProducts || 0}</div>
            </Link>

            <Link to="/customers" className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:border-primary/40 transition-all no-underline">
              <div className="flex items-center justify-between mb-2">
                <Users size={18} className="text-emerald-600" />
                <ArrowUpRight size={14} className="text-gray-400" />
              </div>
              <div className="text-xs font-bold text-gray-500">Khách hàng</div>
              <div className="text-base font-black text-gray-900 mt-0.5">{d.overview?.totalCustomers || 0}</div>
            </Link>
          </div>

          {/* Recent Activities */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 m-0">Hoạt động gần đây</h3>
              <Link to="/orders" className="text-xs font-bold text-primary hover:underline no-underline">Xem tất cả</Link>
            </div>
            <div className="space-y-3.5 overflow-y-auto pr-1 custom-scrollbar flex-1 max-h-[500px]">
              {(d.recentOrders || []).map((o, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50/80 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {o.status === 'COMPLETED' ? <ShoppingCart size={15} /> : <RotateCcw size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-700 font-medium leading-snug">
                      <span className="font-extrabold text-gray-900">{o.user?.fullName || 'Admin'}</span> vừa 
                      <Link to="/orders" className="text-primary hover:underline font-bold mx-1 no-underline">
                        {o.status === 'COMPLETED' ? 'bán đơn hàng' : 'trả đơn hàng'}
                      </Link> 
                      giá trị <span className="font-extrabold text-gray-900">{fmt(o.total)} đ</span>
                    </div>
                    <div className="text-[10px] font-semibold text-gray-400 mt-1">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              ))}
              {(!d.recentOrders || d.recentOrders.length === 0) && (
                <div className="text-center py-8 text-gray-400 text-xs font-medium">
                  <ShoppingCart size={28} className="mx-auto text-gray-200 mb-2" />
                  Chưa có hoạt động nào gần đây
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
