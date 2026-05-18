import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, QrCode, PlusCircle, Monitor, ChevronRight, TrendingUp, TrendingDown, ShoppingCart, RotateCcw, AlertTriangle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import Dropdown from '../../components/ui/Dropdown';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(true);

  const [filterRev, setFilterRev] = useState('Tháng này');
  const [filterProd, setFilterProd] = useState('Tháng này');
  const [filterCust, setFilterCust] = useState('Tháng này');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/dashboard?timeProd=${encodeURIComponent(filterProd)}&timeCust=${encodeURIComponent(filterCust)}`);
        setData(res.data);
      } catch (e) {
        setData({ todayStats: { revenue: 0, orders: 0, returns: 0 }, overview: {}, monthly_revenue: 0, prev_month_revenue: 0, daily_revenues: [], top_products: [], top_customers: [], recentOrders: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filterProd, filterCust]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  const d = data;
  const pct = d.prev_month_revenue > 0 ? ((d.monthly_revenue / d.prev_month_revenue - 1) * 100).toFixed(1) : '0';
  const isUp = parseFloat(pct) >= 0;

  // Simple bar chart using CSS
  const revenues = d.daily_revenues || [];
  const maxRev = Math.max(...revenues.map(r => r.revenue), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 max-w-full">
      {/* Left Panel */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Today Summary */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Kết quả bán hàng hôm nay</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Doanh thu</div>
              <div className="text-base sm:text-2xl font-bold text-primary truncate">{fmt(d.todayStats?.revenue || 0)}</div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Đơn hàng</div>
              <div className="text-base sm:text-2xl font-bold text-gray-800">{d.todayStats?.orders || 0}</div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Trả hàng</div>
              <div className="text-base sm:text-2xl font-bold text-warning">{d.todayStats?.returns || 0}</div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-5 gap-2 sm:gap-0">
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 m-0">Doanh thu thuần</h3>
              <span className="text-lg sm:text-xl font-bold text-primary">{fmt(d.monthly_revenue)}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {isUp ? <TrendingUp size={12} className="inline mr-0.5" /> : <TrendingDown size={12} className="inline mr-0.5" />}
                {pct}%
              </span>
            </div>
            <div className="self-end sm:self-auto">
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
            <div className="inline-flex bg-gray-50 border border-gray-100 rounded-lg p-1 whitespace-nowrap">
              {[
                { key: 'daily', label: 'Theo ngày' },
                { key: 'hourly', label: 'Theo giờ' },
                { key: 'weekday', label: 'Theo thứ' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    tab === t.key ? 'bg-white text-primary shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simple CSS bar chart */}
          <div className="flex items-end gap-[2px] sm:gap-[3px] h-[150px] sm:h-[180px] px-1 sm:px-2 overflow-x-auto scrollbar-none">
            {revenues.map((r, i) => (
              <div key={i} className="flex-1 min-w-[12px] sm:min-w-[16px] flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-blue-100 group-hover:bg-primary rounded-t transition-colors min-h-[2px]"
                  style={{ height: `${Math.max((r.revenue / maxRev) * 140, 2)}px` }}
                  title={`Ngày ${r.day}: ${fmt(r.revenue)}`}
                />
                <span className="text-[9px] sm:text-[10px] text-gray-400 group-hover:text-primary transition-colors">{String(r.day).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top Products */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 sm:p-5 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 m-0">Top hàng bán chạy</h3>
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
            <div className="space-y-3">
              {(d.top_products || []).slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
                  <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-xs sm:text-sm text-gray-700 truncate group-hover:text-primary transition-colors">{p.name}</span>
                  <span className="text-[11px] sm:text-xs text-gray-500 shrink-0">{p.total_sold} sp</span>
                  <span className="text-[11px] sm:text-xs font-medium text-primary shrink-0">{fmt(p.total_revenue)}</span>
                </div>
              ))}
              {(!d.top_products || d.top_products.length === 0) && (
                <div className="text-center py-6">
                  <Package size={24} className="mx-auto text-gray-300 mb-2" />
                  <div className="text-gray-400 text-sm">Chưa có dữ liệu</div>
                </div>
              )}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 sm:p-5 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 m-0">Top khách chi tiêu</h3>
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
            <div className="space-y-3">
              {(d.top_customers || []).slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
                  <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-50 text-gray-400'
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-xs sm:text-sm text-gray-700 truncate group-hover:text-primary transition-colors">{c.name}</span>
                  <span className="text-[11px] sm:text-xs text-gray-500 shrink-0">{c.order_count} đơn</span>
                  <span className="text-[11px] sm:text-xs font-medium text-primary shrink-0">{fmt(c.total_spent)}</span>
                </div>
              ))}
              {(!d.top_customers || d.top_customers.length === 0) && (
                <div className="text-center py-6">
                  <Users size={24} className="mx-auto text-gray-300 mb-2" />
                  <div className="text-gray-400 text-sm">Chưa có dữ liệu</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col gap-4 min-h-[600px]">
        {/* Recent Activities */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 flex-1 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-5">Hoạt động gần đây</h3>
          <div className="space-y-4 max-h-[calc(100vh-380px)] overflow-y-auto pr-2 custom-scrollbar flex-1">
            {(d.recentOrders || []).map((o, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'
                }`}>
                  {o.status === 'COMPLETED' ? <ShoppingCart size={16} /> : <RotateCcw size={16} />}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">{o.user?.fullName || 'Admin'}</span> vừa 
                    <Link to="/orders" className="text-blue-600 hover:underline mx-1">
                      {o.status === 'COMPLETED' ? 'bán đơn hàng' : 'trả đơn hàng'}
                    </Link> 
                    với giá trị <span className="font-semibold">{fmt(o.total)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                  </div>
                </div>
              </div>
            ))}
            {(!d.recentOrders || d.recentOrders.length === 0) && (
              <div className="text-center py-10">
                <ShoppingCart size={32} className="mx-auto text-gray-200 mb-3" />
                <div className="text-gray-400 text-sm">Chưa có hoạt động nào gần đây</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
