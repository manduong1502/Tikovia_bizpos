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
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (e) {
        setData({ today_revenue: 0, today_orders: 0, today_returns: 0, monthly_revenue: 0, prev_month_revenue: 0, daily_revenues: [], top_products: [], top_customers: [], recent_orders: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
  const maxRev = Math.max(...revenues.map(r => r.revenue || 0), 1);

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6">
      {/* Left Panel */}
      <div className="flex flex-col gap-6">
        {/* Today Summary */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Kết quả bán hàng hôm nay</h2>
          <div className="flex gap-10">
            <div>
              <div className="text-sm text-gray-500 mb-1">Doanh thu</div>
              <div className="text-2xl font-bold text-primary">{fmt(d.todayStats?.revenue || 0)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Đơn hàng</div>
              <div className="text-2xl font-bold text-gray-800">{d.todayStats?.orders || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Trả hàng</div>
              <div className="text-2xl font-bold text-warning">{d.todayStats?.returns || 0}</div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-5">
            <div className="flex items-baseline gap-3">
              <h3 className="text-lg font-bold text-gray-800 m-0">Doanh thu thuần</h3>
              <span className="text-xl font-bold text-primary">{fmt(d.monthly_revenue)}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {isUp ? <TrendingUp size={12} className="inline mr-0.5" /> : <TrendingDown size={12} className="inline mr-0.5" />}
                {pct}%
              </span>
            </div>
            <Dropdown
              value={filterRev}
              options={[
                { value: 'Tháng này', label: 'Tháng này' },
                { value: 'Tháng trước', label: 'Tháng trước' },
              ]}
              onChange={setFilterRev}
            />
          </div>

          {/* Tab control */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex bg-gray-50 border border-gray-100 rounded-lg p-1">
              {[
                { key: 'daily', label: 'Theo ngày' },
                { key: 'hourly', label: 'Theo giờ' },
                { key: 'weekday', label: 'Theo thứ' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simple CSS bar chart */}
          <div className="flex items-end gap-[3px] h-[180px] px-2">
            {revenues.map((r, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-blue-100 group-hover:bg-primary rounded-t transition-colors min-h-[2px]"
                  style={{ height: `${Math.max((r.revenue / maxRev) * 160, 2)}px` }}
                  title={`Ngày ${r.day}: ${fmt(r.revenue)}`}
                />
                <span className="text-[10px] text-gray-400 group-hover:text-primary transition-colors">{String(r.day).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-2 gap-5">
          {/* Top Products */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 m-0">Top hàng bán chạy</h3>
              <Dropdown
                value={filterProd}
                options={[
                  { value: 'Tháng này', label: 'Tháng này' },
                ]}
                onChange={setFilterProd}
              />
            </div>
            <div className="space-y-3">
              {(d.top_products || []).slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-primary transition-colors">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.total_sold} sp</span>
                  <span className="text-xs font-medium text-primary">{fmt(p.total_revenue)}</span>
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
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 m-0">Top khách chi tiêu</h3>
              <Dropdown
                value={filterCust}
                options={[
                  { value: 'Tháng này', label: 'Tháng này' },
                ]}
                onChange={setFilterCust}
              />
            </div>
            <div className="space-y-3">
              {(d.top_customers || []).slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-50 text-gray-400'
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-primary transition-colors">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.order_count} đơn</span>
                  <span className="text-xs font-medium text-primary">{fmt(c.total_spent)}</span>
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
      <div className="flex flex-col gap-4">
        {/* Quick cards */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group">
          <div className="w-12 h-12 bg-blue-50 group-hover:bg-primary rounded-xl flex items-center justify-center text-primary group-hover:text-white transition-colors"><QrCode size={22} /></div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors">Thanh toán</div>
            <div className="text-xs text-gray-500 mt-0.5">Cài đặt QR ting ting miễn phí</div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-green-500/20 transition-all group">
          <div className="w-12 h-12 bg-green-50 group-hover:bg-green-500 rounded-xl flex items-center justify-center text-green-600 group-hover:text-white transition-colors"><PlusCircle size={22} /></div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800 group-hover:text-green-600 transition-colors">Vay vốn</div>
            <div className="text-xs text-gray-500 mt-0.5">Tăng tốc kinh doanh đón Tết 2026</div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-green-600 transition-colors" />
        </div>

        {/* Security alert */}
        <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
          <div className="text-[13px] text-gray-700 flex-1 leading-relaxed">
            Có <b>1</b> hoạt động đăng nhập <br /><b>khác thường</b> cần kiểm tra.
          </div>
        </div>

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
