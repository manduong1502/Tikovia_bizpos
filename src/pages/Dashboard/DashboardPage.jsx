import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, ShoppingCart, RotateCcw, Package, TrendingUp, TrendingDown, 
  Eye, EyeOff, Calendar, ChevronDown, Plus, AlertTriangle, ArrowUpRight, 
  Layers, CreditCard, Sparkles, RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Dropdown from '../../components/ui/Dropdown';
import DashboardDateDropdown from '../../components/ui/DashboardDateDropdown';
import { 
  orderAPI, returnAPI, productAPI, customerAPI, purchaseOrderAPI, 
  reportAPI, loadInitialCache 
} from '../../services/api';
import { 
  getRangeByCreatedLabel, getWorkingHoursYMD, formatLocalYMD, 
  parseFlexibleDate 
} from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n || 0)));

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
  const [loading, setLoading] = useState(false);
  const [showProfit, setShowProfit] = useState(true);

  // Time filters
  const [timeRange, setTimeRange] = useState({ mode: 'all', label: 'Tháng này', start: null, end: null });
  const [tab, setTab] = useState('daily');
  const [filterRev, setFilterRev] = useState('Tháng này');
  const [filterProd, setFilterProd] = useState('Tháng này');
  const [filterCust, setFilterCust] = useState('Tháng này');

  // Live Data State
  const [rawOrders, setRawOrders] = useState(() => loadInitialCache('orders:', []));
  const [rawReturns, setRawReturns] = useState(() => loadInitialCache('returns:', []));
  const [productsList, setProductsList] = useState(() => loadInitialCache('products:all', []));
  const [purchaseOrdersList, setPurchaseOrdersList] = useState(() => loadInitialCache('purchase_orders', []));
  const [customersList, setCustomersList] = useState(() => loadInitialCache('customers:', []));

  const loadData = async () => {
    try {
      const [ordersRes, returnsRes, prodsRes, poRes, custsRes] = await Promise.all([
        orderAPI.getAll({ limit: 5000 }).catch(() => []),
        returnAPI.getAll({ limit: 5000 }).catch(() => []),
        productAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll({ limit: 2000 }).catch(() => []),
        customerAPI.getAll({ limit: 1000 }).catch(() => [])
      ]);

      const oList = Array.isArray(ordersRes?.data) ? ordersRes.data : (Array.isArray(ordersRes) ? ordersRes : []);
      const rList = Array.isArray(returnsRes?.data) ? returnsRes.data : (Array.isArray(returnsRes) ? returnsRes : []);
      const pList = Array.isArray(prodsRes?.data) ? prodsRes.data : (Array.isArray(prodsRes) ? prodsRes : []);
      const poList = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes) ? poRes : []);
      const cList = Array.isArray(custsRes?.data) ? custsRes.data : (Array.isArray(custsRes) ? custsRes : []);

      setRawOrders(oList);
      setRawReturns(rList);
      setProductsList(pList);
      setPurchaseOrdersList(poList);
      setCustomersList(cList);
    } catch (e) {
      console.warn("Dashboard sync warning:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Purchase Cost Map (Moving Weighted Average)
  const purchaseCostMap = useMemo(() => {
    const acc = {};
    (purchaseOrdersList || []).forEach(po => {
      if (po.status === 'CANCELLED' || po.status === 'cancelled' || po.isCancelled) return;
      (po.items || po._items || po.details || []).forEach(it => {
        const sku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
        const name = it.product_name || it.name || '';
        const qty = Number(it.quantity || it.qty || 0);
        const price = Number(it.unit_price ?? it.price ?? it.cost_price ?? it.import_price ?? 0);
        if (qty > 0 && price > 0) {
          [sku, String(sku).trim().toLowerCase(), name, String(name).trim().toLowerCase()].forEach(k => {
            if (!k) return;
            if (!acc[k]) acc[k] = { totalQty: 0, totalVal: 0 };
            acc[k].totalQty += qty;
            acc[k].totalVal += (qty * price);
          });
        }
      });
    });

    const costMap = {};
    Object.keys(acc).forEach(k => {
      if (acc[k].totalQty > 0) {
        costMap[k] = Math.round(acc[k].totalVal / acc[k].totalQty);
      }
    });
    return costMap;
  }, [purchaseOrdersList]);

  // Product Info Map
  const productInfoMap = useMemo(() => {
    const map = {};
    (productsList || []).forEach(p => {
      if (!p) return;
      const cost = Number(p.costPrice ?? p.cost_price ?? p.cost ?? p.lastImportPrice ?? p.last_import_price ?? p.import_price ?? p.importPrice ?? p.gia_von ?? p.giaVon ?? 0);
      const info = { cost, name: p.name, sku: p.sku || p.code };
      if (p.id) { map[p.id] = info; map[String(p.id)] = info; }
      if (p.code) { map[p.code] = info; map[String(p.code).trim().toLowerCase()] = info; }
      if (p.sku) { map[p.sku] = info; map[String(p.sku).trim().toLowerCase()] = info; }
      if (p.name) { map[p.name] = info; map[String(p.name).trim().toLowerCase()] = info; }
    });
    return map;
  }, [productsList]);

  // Normalized Orders with real profit & cost
  const normalizedOrders = useMemo(() => {
    return (rawOrders || []).map(o => {
      if (o.status === 'CANCELLED' || o.status === 'cancelled' || o.isCancelled) return null;
      const revenue = Number(o.total || o.revenue || 0);
      const items = (Array.isArray(o.items) && o.items.length > 0) ? o.items : (o._items || o.order_items || o.details || []);
      const timeVal = o.createdAt || o.created_at || o.time || o.order_date || o.orderDate || o.date;
      const dateObj = parseFlexibleDate(timeVal) || new Date();
      const ymd = getWorkingHoursYMD(timeVal);

      let totalCost = 0;
      if (items.length > 0) {
        items.forEach(it => {
          const rawSku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
          const rawName = it.product_name || it.name || it.title || '';
          const qty = Number(it.quantity || it.qty || 0);
          const price = Number(it.price || it.unit_price || 0);

          let unitCost = purchaseCostMap[rawSku] || purchaseCostMap[String(rawSku).trim().toLowerCase()] || purchaseCostMap[rawName] || productInfoMap[rawSku]?.cost || 0;
          if (!unitCost || unitCost <= 0) unitCost = Number(it.cost_price || it.costPrice || 0);
          if (!unitCost || unitCost <= 0) unitCost = Math.round(price * 0.9491);
          totalCost += (qty * unitCost);
        });
      } else {
        totalCost = Math.round(revenue * 0.9491);
      }

      return {
        ...o,
        revenue,
        items,
        dateObj,
        ymd,
        totalCost,
        profit: revenue - totalCost
      };
    }).filter(Boolean);
  }, [rawOrders, purchaseCostMap, productInfoMap]);

  // Normalized Returns
  const normalizedReturns = useMemo(() => {
    return (rawReturns || []).map(r => {
      if (r.status === 'CANCELLED' || r.status === 'cancelled' || r.isCancelled) return null;
      const amount = Math.abs(Number(r.total || r.revenue || 0));
      const timeVal = r.createdAt || r.created_at || r.time || r.date;
      const dateObj = parseFlexibleDate(timeVal) || new Date();
      const ymd = getWorkingHoursYMD(timeVal);
      return {
        ...r,
        amount,
        dateObj,
        ymd
      };
    }).filter(Boolean);
  }, [rawReturns]);

  // Filter helper
  const filterByRange = (items, rangeFilter) => {
    if (!rangeFilter) return items;

    // String label (e.g. 'Tháng này')
    if (typeof rangeFilter === 'string') {
      if (rangeFilter === 'Toàn thời gian') return items;
      const range = getRangeByCreatedLabel(rangeFilter);
      if (!range || !range.start || !range.end) return items;
      const startYMD = formatLocalYMD(range.start);
      const endYMD = formatLocalYMD(range.end);
      return items.filter(it => {
        const itYMD = it.ymd || formatLocalYMD(it.dateObj);
        return itYMD >= startYMD && itYMD <= endYMD;
      });
    }

    // Custom date range object
    if (rangeFilter.mode === 'custom' && rangeFilter.start) {
      const startYMD = formatLocalYMD(new Date(rangeFilter.start));
      const endYMD = formatLocalYMD(new Date(rangeFilter.end || rangeFilter.start));
      return items.filter(it => {
        const itYMD = it.ymd || formatLocalYMD(it.dateObj);
        return itYMD >= startYMD && itYMD <= endYMD;
      });
    }

    // Preset object with label
    const label = rangeFilter.label || 'Tháng này';
    if (label === 'Toàn thời gian') return items;
    const range = getRangeByCreatedLabel(label);
    if (!range || !range.start || !range.end) return items;
    const startYMD = formatLocalYMD(range.start);
    const endYMD = formatLocalYMD(range.end);
    return items.filter(it => {
      const itYMD = it.ymd || formatLocalYMD(it.dateObj);
      return itYMD >= startYMD && itYMD <= endYMD;
    });
  };

  // Main Card Metrics (Selected timeRange)
  const period = useMemo(() => {
    const matchedOrders = filterByRange(normalizedOrders, timeRange);
    const matchedReturns = filterByRange(normalizedReturns, timeRange);

    const orderCount = matchedOrders.length;
    const revenue = matchedOrders.reduce((sum, o) => sum + o.revenue, 0);
    const profit = matchedOrders.reduce((sum, o) => sum + o.profit, 0);
    const returnCount = matchedReturns.length;
    const returnAmount = matchedReturns.reduce((sum, r) => sum + r.amount, 0);

    return {
      orderCount,
      revenue,
      profit,
      returnCount,
      returnAmount
    };
  }, [normalizedOrders, normalizedReturns, timeRange]);

  // Monthly Revenue Chart Data
  const { chartRevenue, prevChartRevenue, chartData, pct, isUp } = useMemo(() => {
    const matchedOrders = filterByRange(normalizedOrders, filterRev);
    const totalRev = matchedOrders.reduce((sum, o) => sum + o.revenue, 0);

    // Previous period
    const prevRangeLabel = filterRev === 'Tháng này' ? 'Tháng trước' : (filterRev === 'Hôm nay' ? 'Hôm qua' : 'Tháng trước');
    const prevOrders = filterByRange(normalizedOrders, prevRangeLabel);
    const prevTotalRev = prevOrders.reduce((sum, o) => sum + o.revenue, 0);

    const percent = prevTotalRev > 0 ? (((totalRev - prevTotalRev) / prevTotalRev) * 100).toFixed(1) : (totalRev > 0 ? '+100' : '0');
    const up = parseFloat(percent) >= 0;

    // Build Chart breakdown
    let breakdown = [];
    if (tab === 'hourly') {
      const hoursMap = {};
      for (let h = 6; h <= 22; h++) hoursMap[h] = 0;
      matchedOrders.forEach(o => {
        const h = o.dateObj ? o.dateObj.getHours() : 0;
        if (hoursMap[h] !== undefined) hoursMap[h] += o.revenue;
      });
      breakdown = Object.keys(hoursMap).map(h => ({
        day: `${h}h`,
        revenue: hoursMap[h]
      }));
    } else if (tab === 'weekday') {
      const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const daysMap = { 'T2': 0, 'T3': 0, 'T4': 0, 'T5': 0, 'T6': 0, 'T7': 0, 'CN': 0 };
      matchedOrders.forEach(o => {
        const dayIdx = o.dateObj ? o.dateObj.getDay() : 0;
        const dayName = weekdays[dayIdx];
        if (daysMap[dayName] !== undefined) daysMap[dayName] += o.revenue;
      });
      breakdown = Object.keys(daysMap).map(d => ({
        day: d,
        revenue: daysMap[d]
      }));
    } else {
      // Daily breakdown
      const dayMap = {};
      // Initialize all days of current month or 31 days
      for (let d = 1; d <= 31; d++) dayMap[d] = 0;
      matchedOrders.forEach(o => {
        const day = o.dateObj ? o.dateObj.getDate() : 1;
        dayMap[day] = (dayMap[day] || 0) + o.revenue;
      });
      breakdown = Object.keys(dayMap).map(d => ({
        day: Number(d),
        revenue: dayMap[d]
      }));
    }

    return {
      chartRevenue: totalRev,
      prevChartRevenue: prevTotalRev,
      chartData: breakdown,
      pct: percent,
      isUp: up
    };
  }, [normalizedOrders, filterRev, tab]);

  const maxRev = useMemo(() => {
    return Math.max(...chartData.map(r => r.revenue), 1);
  }, [chartData]);

  // Top Products
  const topProducts = useMemo(() => {
    const matchedOrders = filterByRange(normalizedOrders, filterProd);
    const map = {};

    matchedOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const rawSku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
        const name = it.product_name || it.name || it.title || 'Sản phẩm';
        const key = rawSku || name;
        const qty = Number(it.quantity || it.qty || 0);
        const price = Number(it.price || it.unit_price || 0);
        const lineTotal = Number(it.total || (qty * price) || 0);

        if (!map[key]) {
          map[key] = { name, total_sold: 0, total_revenue: 0 };
        }
        map[key].total_sold += qty;
        map[key].total_revenue += lineTotal;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);
  }, [normalizedOrders, filterProd]);

  // Top Customers
  const topCustomers = useMemo(() => {
    const matchedOrders = filterByRange(normalizedOrders, filterCust);
    const map = {};

    matchedOrders.forEach(o => {
      const name = o.customerName || o.customer_name || o.customer?.name || 'Khách lẻ';
      const key = o.customer_id || o.customerId || name;

      if (!map[key]) {
        map[key] = { name, order_count: 0, total_spent: 0 };
      }
      map[key].order_count += 1;
      map[key].total_spent += o.revenue;
    });

    return Object.values(map)
      .filter(c => c.name !== 'Khách lẻ')
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5);
  }, [normalizedOrders, filterCust]);

  // Recent Activities
  const recentOrders = useMemo(() => {
    const list = [...(rawOrders || [])].slice(0, 10);
    return list;
  }, [rawOrders]);

  const TIME_OPTIONS = [
    { value: 'Hôm nay', label: 'Hôm nay' },
    { value: 'Hôm qua', label: 'Hôm qua' },
    { value: '7 ngày qua', label: '7 ngày qua' },
    { value: '30 ngày qua', label: '30 ngày qua' },
    { value: 'Tuần này', label: 'Tuần này' },
    { value: 'Tuần trước', label: 'Tuần trước' },
    { value: 'Tháng này', label: 'Tháng này' },
    { value: 'Tháng trước', label: 'Tháng trước' },
    { value: 'Quý này', label: 'Quý này' },
    { value: 'Quý trước', label: 'Quý trước' },
    { value: 'Năm nay', label: 'Năm nay' },
    { value: 'Toàn thời gian', label: 'Toàn thời gian' },
  ];

  const timeLabel = typeof timeRange === 'string' ? timeRange : (timeRange?.label || 'Tháng này');

  const handleNavigateInvoices = () => {
    navigate('/invoices', {
      state: {
        orderDate: timeRange,
        dateFilter: timeRange
      }
    });
  };

  const handleNavigateReturns = () => {
    navigate('/returns', {
      state: {
        dateRange: timeRange
      }
    });
  };

  const handleNavigateFinancial = () => {
    navigate('/reports/financial', {
      state: {
        dateFilter: timeRange,
        orderDate: timeRange,
        timeRange: timeRange
      }
    });
  };

  return (
    <div className="flex flex-col gap-5 max-w-full font-sans pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 min-w-0">
        {/* Left Area */}
        <div className="flex flex-col gap-5 min-w-0">
          
          {/* Main Overview Card (Hóa đơn, Doanh thu, Lợi nhuận, Đơn trả hàng) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 transition-all hover:shadow-md">
            {/* Top Bar: Range Filter Selector */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                Kết quả bán hàng
              </span>

              <div className="min-w-[140px]">
                <DashboardDateDropdown
                  value={timeRange}
                  onChange={setTimeRange}
                />
              </div>
            </div>

            {/* Metrics Row: Revenue & Profit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Revenue & Invoices (Clickable -> Invoices Page with active filter) */}
              <div 
                onClick={handleNavigateInvoices}
                className="flex flex-col gap-1 cursor-pointer group p-3 -m-3 rounded-2xl hover:bg-blue-50/70 transition-all border border-transparent hover:border-blue-200 select-none"
                title={`Bấm để mở danh sách ${fmt(period.orderCount)} hóa đơn (${timeLabel})`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-gray-500 group-hover:text-primary transition-colors">
                    {fmt(period.orderCount)} hoá đơn
                  </span>
                  <ArrowUpRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-primary group-hover:text-blue-700 tracking-tight transition-colors">
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
                    type="button"
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

            {/* Divider & Returns Row (Clickable -> Returns Page with active filter) */}
            <div className="border-t border-gray-100 pt-3.5 mt-5 flex items-center justify-between text-xs text-gray-600 font-medium">
              <div 
                onClick={handleNavigateReturns}
                className="flex items-center gap-2 cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-amber-50/70 transition-all select-none"
                title={`Bấm để mở danh sách ${period.returnCount} đơn trả hàng (${timeLabel})`}
              >
                <RotateCcw size={15} className="text-amber-500 group-hover:rotate-[-45deg] transition-transform" />
                <span>
                  <strong className="group-hover:text-amber-700 group-hover:underline">{period.returnCount}</strong> đơn trả hàng – <strong className="text-gray-900 group-hover:text-amber-700">{fmtSmart(period.returnAmount)}</strong>
                </span>
                <ArrowUpRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-amber-600 transition-opacity" />
              </div>
              <span className="text-[11px] text-gray-400 hidden sm:inline font-semibold">
                {timeLabel}
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div 
              onClick={handleNavigateFinancial}
              className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/40 hover:bg-blue-50/20 transition-all group"
              title={`Xem Báo cáo tài chính (${timeLabel})`}
            >
              <div className="text-[11px] sm:text-xs font-bold text-gray-500 mb-1 group-hover:text-primary transition-colors flex items-center justify-between">
                <span>{timeLabel === 'Hôm nay' ? 'Doanh thu hôm nay' : `Doanh thu (${timeLabel.toLowerCase()})`}</span>
                <ArrowUpRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-base sm:text-xl font-black text-primary truncate">{fmt(period.revenue)} đ</div>
            </div>
            <div 
              onClick={handleNavigateInvoices}
              className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/40 hover:bg-blue-50/20 transition-all group"
              title={`Xem danh sách đơn bán (${timeLabel})`}
            >
              <div className="text-[11px] sm:text-xs font-bold text-gray-500 mb-1 group-hover:text-primary transition-colors flex items-center justify-between">
                <span>{timeLabel === 'Hôm nay' ? 'Đơn hôm nay' : `Đơn (${timeLabel.toLowerCase()})`}</span>
                <ArrowUpRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-base sm:text-xl font-black text-gray-800">{period.orderCount}</div>
            </div>
            <div 
              onClick={handleNavigateReturns}
              className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-400/50 hover:bg-amber-50/20 transition-all group"
              title={`Xem danh sách trả hàng (${timeLabel})`}
            >
              <div className="text-[11px] sm:text-xs font-bold text-gray-500 mb-1 group-hover:text-amber-700 transition-colors flex items-center justify-between">
                <span>{timeLabel === 'Hôm nay' ? 'Trả hàng hôm nay' : `Trả hàng (${timeLabel.toLowerCase()})`}</span>
                <ArrowUpRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-base sm:text-xl font-black text-amber-600">{period.returnCount}</div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-extrabold text-gray-900 m-0">Doanh thu thuần</h3>
                <span className="text-lg font-black text-primary">{fmt(chartRevenue)} đ</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-0.5 ${isUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {pct}%
                </span>
              </div>
              <div className="w-36 self-end sm:self-auto">
                <Dropdown
                  value={filterRev}
                  options={[
                    { value: 'Hôm nay', label: 'Hôm nay' },
                    { value: '7 ngày qua', label: '7 ngày qua' },
                    { value: 'Tháng này', label: 'Tháng này' },
                    { value: 'Tháng trước', label: 'Tháng trước' },
                    { value: 'Năm nay', label: 'Năm nay' },
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
              {chartData.map((r, i) => (
                <div key={i} className="flex-1 min-w-[12px] sm:min-w-[16px] flex flex-col items-center gap-1 group cursor-pointer">
                  <div
                    className="w-full bg-blue-100 group-hover:bg-primary rounded-t-sm transition-all duration-200 min-h-[4px]"
                    style={{ height: `${Math.max((r.revenue / maxRev) * 140, 4)}px` }}
                    title={`${r.day}: ${fmt(r.revenue)} đ`}
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
                {(topProducts || []).map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50/80 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="flex-1 text-xs sm:text-sm font-bold text-gray-800 truncate">{p.name}</span>
                    <span className="text-[11px] font-semibold text-gray-500 shrink-0">{p.total_sold} sp</span>
                    <span className="text-xs font-extrabold text-primary shrink-0">{fmt(p.total_revenue)}</span>
                  </div>
                ))}
                {(!topProducts || topProducts.length === 0) && (
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
                {(topCustomers || []).map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50/80 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="flex-1 text-xs sm:text-sm font-bold text-gray-800 truncate">{c.name}</span>
                    <span className="text-[11px] font-semibold text-gray-500 shrink-0">{c.order_count} đơn</span>
                    <span className="text-xs font-extrabold text-primary shrink-0">{fmt(c.total_spent)}</span>
                  </div>
                ))}
                {(!topCustomers || topCustomers.length === 0) && (
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
              <div className="text-base font-black text-gray-900 mt-0.5">{productsList?.length || 0}</div>
            </Link>

            <Link to="/customers" className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:border-primary/40 transition-all no-underline">
              <div className="flex items-center justify-between mb-2">
                <Users size={18} className="text-emerald-600" />
                <ArrowUpRight size={14} className="text-gray-400" />
              </div>
              <div className="text-xs font-bold text-gray-500">Khách hàng</div>
              <div className="text-base font-black text-gray-900 mt-0.5">{customersList?.length || 0}</div>
            </Link>
          </div>

          {/* Recent Activities */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 m-0">Hoạt động gần đây</h3>
              <Link to="/orders" className="text-xs font-bold text-primary hover:underline no-underline">Xem tất cả</Link>
            </div>
            <div className="space-y-3.5 overflow-y-auto pr-1 custom-scrollbar flex-1 max-h-[500px]">
              {(recentOrders || []).map((o, i) => {
                const isReturn = o.status === 'RETURNED' || o.type === 'RETURN';
                return (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50/80 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isReturn ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isReturn ? <RotateCcw size={15} /> : <ShoppingCart size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-700 font-medium leading-snug">
                        <span className="font-extrabold text-gray-900">{o.createdBy || o.seller?.name || o.user?.fullName || 'Quản trị viên'}</span> vừa 
                        <Link to="/orders" className="text-primary hover:underline font-bold mx-1 no-underline">
                          {isReturn ? 'trả đơn hàng' : 'bán đơn hàng'}
                        </Link> 
                        giá trị <span className="font-extrabold text-gray-900">{fmt(o.total || o.revenue)} đ</span>
                      </div>
                      <div className="text-[10px] font-semibold text-gray-400 mt-1">
                        {o.createdAt || o.time ? new Date(o.createdAt || o.time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!recentOrders || recentOrders.length === 0) && (
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
