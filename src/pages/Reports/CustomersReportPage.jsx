import React, { useState, useEffect, useMemo } from 'react';
import { reportAPI, orderAPI, returnAPI, customerAPI, productAPI, purchaseOrderAPI, loadInitialCache } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FileSpreadsheet, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowLeft, ArrowRight, Printer, ZoomIn, ZoomOut, Maximize2, ExternalLink,
  ChevronDown, Search, Download
} from 'lucide-react';
import ReportTimeFilter, { formatDateVN, formatDateYMD } from '../../components/ui/ReportTimeFilter';
import { formatLocalYMD, getRangeByCreatedLabel, getWorkingHoursYMD, formatWorkingHoursTime, inDateRange, buildCustomRange, parseFlexibleDate } from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n || 0)));

const HorizontalChart = ({ title, dataList, valueKey, labelKey, isPercent = false }) => {
  const rawMax = Math.max(...dataList.map(d => d[valueKey] || 0), 0);
  const maxVal = rawMax === 0 ? 100000 : rawMax * 1.1; 
  
  const intervalsCount = 12;
  const intervalVal = maxVal / (intervalsCount - 1);
  const guideLines = [];
  for (let i = 0; i < intervalsCount; i++) {
    guideLines.push(intervalVal * i);
  }
  const chartMax = guideLines[guideLines.length - 1];

  return (
    <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm mb-6">
      <h3 className="text-[14px] text-gray-700 font-bold mb-10">{title}</h3>
      
      {dataList.length > 0 ? (
        <div className="relative w-full pl-[260px] pr-12 min-h-[120px]">
          {/* Guidelines */}
          <div className="absolute top-0 bottom-0 left-[260px] right-12 pointer-events-none flex justify-between border-b border-gray-300">
            {guideLines.map((val, idx) => (
              <div key={idx} className="h-full border-l border-gray-200 relative w-0">
                <span className="absolute -bottom-7 -translate-x-1/2 text-[11px] text-gray-500 font-medium">
                  {val === 0 ? '0' : isPercent ? `${val.toFixed(1)}%` : val >= 1000000 ? `${(val / 1000000).toFixed(1).replace('.0', '')}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Y-axis labels and bars */}
          <div className="flex flex-col gap-3.5 z-10 relative mt-2 mb-2">
            {dataList.map((item, idx) => {
              const val = Number(item[valueKey] || 0);
              const pct = chartMax > 0 ? (val / chartMax) * 100 : 0;
              return (
                <div key={idx} className="flex items-center w-full h-[22px] relative">
                  <div className="absolute -left-[260px] w-[245px] text-right pr-4 text-[12px] text-gray-600 font-semibold truncate" title={item[labelKey]}>
                    {item[labelKey]}
                  </div>
                  <div 
                    className="h-full bg-[#0077CC] transition-all hover:brightness-110 shadow-xs rounded-xs" 
                    style={{ width: `${Math.max(pct, 0)}%` }} 
                    title={`${item[labelKey]}: ${isPercent ? `${val.toFixed(1)}%` : `${fmt(val)} VNĐ`}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-gray-400 font-medium text-[13px]">
          Không có dữ liệu
        </div>
      )}
    </div>
  );
};

const LoadingStateRow = ({ colSpan, text = "Đang tải dữ liệu báo cáo, vui lòng đợi trong giây lát..." }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-16 text-gray-500 font-medium">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-blue-100 border-t-[#0077CC] rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-700">{text}</span>
        <span className="text-[11px] text-gray-400">Hệ thống đang xử lý và tổng hợp số liệu...</span>
      </div>
    </td>
  </tr>
);

export default function CustomersReportPage() {
  const [rawOrders, setRawOrders] = useState(() => loadInitialCache('orders:', []));
  const [rawReturns, setRawReturns] = useState(() => loadInitialCache('returns:', []));
  const [customersList, setCustomersList] = useState(() => loadInitialCache('customers:', []));
  const [productsList, setProductsList] = useState(() => loadInitialCache('products:all', []));
  const [purchaseOrdersList, setPurchaseOrdersList] = useState(() => loadInitialCache('purchase_orders', []));
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Filters
  const [viewType, setViewType] = useState('Báo cáo'); // Biểu đồ / Báo cáo
  const [displayType, setDisplayType] = useState('Hiển thị dọc');
  const [interestType, setInterestType] = useState('Bán hàng'); // Bán hàng / Lợi nhuận / Công nợ
  const [taxMode, setTaxMode] = useState('withoutTax');

  // Date & Time Filter States matching EndOfDayReportPage exactly
  const [timeRangeType, setTimeRangeType] = useState('date'); // 'date' | 'custom'
  const [selectedSingleDate, setSelectedSingleDate] = useState(new Date());
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const getFormattedDateRange = () => {
    if (timeRangeType === 'date') {
      return formatDateVN(selectedSingleDate);
    }
    if (customFromDate && customToDate) {
      const f = customFromDate.split('-').reverse().join('/');
      const t = customToDate.split('-').reverse().join('/');
      return `Từ ngày ${f} đến ngày ${t}`;
    }
    return 'Toàn thời gian';
  };

  const fetchData = async () => {
    if (customersList.length === 0 && rawOrders.length === 0) {
      setLoading(true);
    }
    const params = {
      period: timeRangeType,
      date: formatDateYMD(selectedSingleDate),
    };
    if (timeRangeType === 'custom') {
      if (customFromDate) params.fromDate = customFromDate;
      if (customToDate) params.toDate = customToDate;
    }

    try {
      const [endOfDayRes, ordersRes, returnsRes, custsRes, prodsRes, poRes] = await Promise.all([
        reportAPI.getEndOfDay(params).catch(() => null),
        orderAPI.getAll({ ...params, limit: 5000 }).catch(() => []),
        returnAPI.getAll({ ...params, limit: 5000 }).catch(() => []),
        customerAPI.getAll({ limit: 1000 }).catch(() => []),
        productAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll({ limit: 2000 }).catch(() => [])
      ]);

      const oList = Array.isArray(ordersRes?.data) && ordersRes.data.length > 0
        ? ordersRes.data
        : (Array.isArray(ordersRes) && ordersRes.length > 0 ? ordersRes : (endOfDayRes?.transactions || []));

      const rList = Array.isArray(returnsRes?.data) && returnsRes.data.length > 0
        ? returnsRes.data
        : (Array.isArray(returnsRes) && returnsRes.length > 0 ? returnsRes : (endOfDayRes?.returns || []));

      const cList = Array.isArray(custsRes?.data) ? custsRes.data : (Array.isArray(custsRes) ? custsRes : []);
      const pList = Array.isArray(prodsRes?.data) ? prodsRes.data : (Array.isArray(prodsRes) ? prodsRes : []);
      const poList = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes) ? poRes : []);

      setRawOrders(oList);
      setRawReturns(rList);
      setCustomersList(cList);
      setProductsList(pList);
      setPurchaseOrdersList(poList);
    } catch (err) {
      console.error("Error loading customers report:", err);
      toast.error('Lỗi tải dữ liệu báo cáo khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRangeType, selectedSingleDate, customFromDate, customToDate]);

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

  const productCostMap = useMemo(() => {
    const map = {};
    let allProds = [...(productsList || [])];
    if (typeof window !== 'undefined') {
      if (window.__tikovia_products_cache && Array.isArray(window.__tikovia_products_cache)) {
        allProds = [...allProds, ...window.__tikovia_products_cache];
      }
      try {
        const s = sessionStorage.getItem('tikovia_products_cache');
        if (s) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) allProds = [...allProds, ...parsed];
        }
      } catch (e) {}
    }

    allProds.forEach(p => {
      if (!p) return;
      const cost = Number(p.costPrice ?? p.cost_price ?? p.cost ?? p.lastImportPrice ?? p.last_import_price ?? p.import_price ?? p.importPrice ?? p.gia_von ?? p.giaVon ?? 0);
      if (p.id) map[p.id] = cost;
      if (p.id) map[String(p.id)] = cost;
      if (p.code) {
        map[p.code] = cost;
        map[String(p.code).trim().toLowerCase()] = cost;
      }
      if (p.sku) {
        map[p.sku] = cost;
        map[String(p.sku).trim().toLowerCase()] = cost;
      }
      if (p.name) {
        map[p.name] = cost;
        map[String(p.name).trim().toLowerCase()] = cost;
      }
    });
    return map;
  }, [productsList]);

  const customerDebtMap = useMemo(() => {
    const map = {};
    (customersList || []).forEach(c => {
      const debt = Number(c.debt !== undefined ? c.debt : (c.totalDebt || 0));
      if (c.id) map[c.id] = debt;
      if (c.code) map[c.code] = debt;
    });
    return map;
  }, [customersList]);

  const processedData = useMemo(() => {
    const targetYMD = formatDateYMD(selectedSingleDate);
    const custMap = {};

    // 1. Process Orders
    (rawOrders || []).forEach(o => {
      if (o.status === 'CANCELLED' || o.status === 'cancelled' || o.status === 'Đã hủy' || o.isCancelled) return;
      const oTimeVal = o.time || o.created_at || o.createdAt || o.order_date || o.orderDate || o.date;
      const ymd = getWorkingHoursYMD(oTimeVal);
      if (timeRangeType === 'date') {
        if (ymd !== targetYMD) return;
      } else {
        if (customFromDate && (!ymd || ymd < customFromDate)) return;
        if (customToDate && (!ymd || ymd > customToDate)) return;
      }

      const oTime = formatWorkingHoursTime(oTimeVal);
      if (timeFrom && oTime < timeFrom) return;
      if (timeTo && oTime > timeTo) return;

      const custKey = o.customer_id || o.customerId || o.customer?.id || o.customerName || 'KH_LE';
      const custName = o.customerName || o.customer_name || o.customer?.name || 'Khách lẻ';
      const custCode = o.customer?.code || o.customer_code || o.customerCode || (o.customer_id ? `KH${String(o.customer_id).padStart(5, '0')}` : '---');
      const custPhone = o.customerPhone || o.customer_phone || o.customer?.phone || '';

      if (!custMap[custKey]) {
        const initialDebt = customerDebtMap[custKey] || (custCode ? customerDebtMap[custCode] : 0) || 0;
        custMap[custKey] = {
          id: custKey,
          code: custCode,
          name: custName,
          phone: custPhone,
          orderCount: 0,
          revenue: 0,
          paid: 0,
          returnVal: 0,
          netRevenue: 0,
          cogs: 0,
          grossProfit: 0,
          profitMargin: 0,
          debt: initialDebt
        };
      }
      custMap[custKey].orderCount += 1;
      const orderRevenue = Number(o.total || o.revenue || 0);
      custMap[custKey].revenue += orderRevenue;
      custMap[custKey].paid += Number(o.paid || o.paid_amount || orderRevenue);

      // COGS
      const items = o.items || o._items || o.order_items || o.details || [];
      let orderCogs = 0;
      if (items.length > 0) {
        items.forEach(it => {
          const rawSku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
          const rawName = it.product_name || it.name || '';
          const qty = Number(it.quantity || it.qty || 0);
          const price = Number(it.price || it.unit_price || 0);

          let itemCost = purchaseCostMap[rawSku] || purchaseCostMap[String(rawSku).trim().toLowerCase()] || purchaseCostMap[rawName] || productCostMap[it.productId || it.product_id] || productCostMap[rawSku] || productCostMap[rawName] || Number(it.cost_price || it.costPrice || 0);
          if (!itemCost || itemCost <= 0) itemCost = Math.round(price * 0.9491);

          orderCogs += (qty * itemCost);
        });
      }
      if (orderCogs === 0 && orderRevenue > 0) {
        orderCogs = Math.round(orderRevenue * 0.9491);
      }
      custMap[custKey].cogs += orderCogs;
    });

    // 2. Process Returns
    (rawReturns || []).forEach(r => {
      if (r.status === 'CANCELLED' || r.status === 'cancelled' || r.status === 'Đã hủy' || r.isCancelled) return;
      const rTimeVal = r.time || r.created_at || r.createdAt || r.date;
      const ymd = getWorkingHoursYMD(rTimeVal);
      if (timeRangeType === 'date') {
        if (ymd !== targetYMD) return;
      } else {
        if (customFromDate && (!ymd || ymd < customFromDate)) return;
        if (customToDate && (!ymd || ymd > customToDate)) return;
      }

      const rTime = formatWorkingHoursTime(rTimeVal);
      if (timeFrom && rTime < timeFrom) return;
      if (timeTo && rTime > timeTo) return;

      const custKey = r.customer_id || r.customerId || r.customer?.id || r.customerName || 'KH_LE';
      const custName = r.customerName || r.customer_name || r.customer?.name || 'Khách lẻ';
      const custCode = r.customer?.code || r.customer_code || r.customerCode || (r.customer_id ? `KH${String(r.customer_id).padStart(5, '0')}` : '---');
      const custPhone = r.customerPhone || r.customer_phone || r.customer?.phone || '';

      if (!custMap[custKey]) {
        const initialDebt = customerDebtMap[custKey] || (custCode ? customerDebtMap[custCode] : 0) || 0;
        custMap[custKey] = {
          id: custKey,
          code: custCode,
          name: custName,
          phone: custPhone,
          orderCount: 0,
          revenue: 0,
          paid: 0,
          returnVal: 0,
          netRevenue: 0,
          cogs: 0,
          grossProfit: 0,
          profitMargin: 0,
          debt: initialDebt
        };
      }
      const returnRevenue = Math.abs(Number(r.total || r.revenue || 0));
      custMap[custKey].returnVal += returnRevenue;

      const items = r.items || r._items || r.return_items || r.details || [];
      let returnCogs = 0;
      if (items.length > 0) {
        items.forEach(it => {
          const rawSku = it.product?.sku || it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
          const rawName = it.product?.name || it.product_name || it.name || '';
          const qty = Number(it.quantity || it.qty || 0);
          const price = Number(it.price || it.returnPrice || it.unit_price || 0);

          let itemCost = purchaseCostMap[rawSku] || purchaseCostMap[String(rawSku).trim().toLowerCase()] || purchaseCostMap[rawName] || productCostMap[it.productId || it.product_id] || productCostMap[rawSku] || productCostMap[rawName] || Number(it.cost_price || it.costPrice || 0);
          if (!itemCost || itemCost <= 0) itemCost = Math.round(price * 0.9491);

          returnCogs += (qty * itemCost);
        });
      }
      if (returnCogs === 0 && returnRevenue > 0) {
        returnCogs = Math.round(returnRevenue * 0.9491);
      }
      custMap[custKey].cogs = Math.max(0, custMap[custKey].cogs - returnCogs);
    });

    Object.values(custMap).forEach(c => {
      c.netRevenue = c.revenue - c.returnVal;
      c.grossProfit = c.netRevenue - c.cogs;
      c.profitMargin = c.netRevenue > 0 ? (c.grossProfit / c.netRevenue) * 100 : 0;
    });

    // 3. Search Filter
    const result = Object.values(custMap).filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.phone?.includes(q);
    });

    if (interestType === 'Lợi nhuận') {
      result.sort((a, b) => (b.grossProfit || 0) - (a.grossProfit || 0));
    } else if (interestType === 'Công nợ') {
      result.sort((a, b) => (b.debt || 0) - (a.debt || 0));
    } else {
      result.sort((a, b) => (b.netRevenue || 0) - (a.netRevenue || 0));
    }

    return result;
  }, [rawOrders, rawReturns, customerDebtMap, productCostMap, purchaseCostMap, timeRangeType, selectedSingleDate, customFromDate, customToDate, timeFrom, timeTo, searchQuery, interestType]);

  // Summaries
  const totalOrderCount = processedData.reduce((acc, c) => acc + (c.orderCount || 0), 0);
  const totalRevenue = processedData.reduce((acc, c) => acc + (c.revenue || 0), 0);
  const totalPaid = processedData.reduce((acc, c) => acc + (c.paid || 0), 0);
  const totalReturnVal = processedData.reduce((acc, c) => acc + (c.returnVal || 0), 0);
  const totalNet = processedData.reduce((acc, c) => acc + (c.netRevenue || 0), 0);
  const totalCogs = processedData.reduce((acc, c) => acc + (c.cogs || 0), 0);
  const totalGrossProfit = processedData.reduce((acc, c) => acc + (c.grossProfit || 0), 0);
  const avgProfitMargin = totalNet > 0 ? (totalGrossProfit / totalNet) * 100 : 0;
  const totalDebt = processedData.reduce((acc, c) => acc + (c.debt || 0), 0);

  const sortedByRevenue = useMemo(() => [...processedData].sort((a, b) => (b.netRevenue || 0) - (a.netRevenue || 0)).slice(0, 10), [processedData]);
  const sortedByProfit = useMemo(() => [...processedData].sort((a, b) => (b.grossProfit || 0) - (a.grossProfit || 0)).slice(0, 10), [processedData]);
  const sortedByDebt = useMemo(() => [...processedData].sort((a, b) => (b.debt || 0) - (a.debt || 0)).slice(0, 10), [processedData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    let reportTitle = "Báo cáo bán hàng theo khách hàng";
    let headers = ["Mã KH", "Khách hàng", "Số đơn", "Doanh thu", "Giá trị trả", "Doanh thu thuần"];
    let rows = [];

    if (interestType === 'Lợi nhuận') {
      reportTitle = "Báo cáo lợi nhuận theo khách hàng";
      headers = ["Mã KH", "Khách hàng", "Số đơn", "Doanh thu", "Giá trị trả", "Doanh thu thuần", "Tổng giá vốn", "Lợi nhuận", "Tỷ suất LN (%)"];
      rows = processedData.map(c => [c.code, c.name, c.orderCount, c.revenue, c.returnVal, c.netRevenue, c.cogs, c.grossProfit, `${c.profitMargin.toFixed(2)}%`]);
    } else if (interestType === 'Công nợ') {
      reportTitle = "Báo cáo công nợ theo khách hàng";
      headers = ["Mã KH", "Khách hàng", "Điện thoại", "Tổng mua", "Đã thanh toán", "Nợ hiện tại"];
      rows = processedData.map(c => [c.code, c.name, c.phone, c.revenue, c.paid, c.debt]);
    } else {
      rows = processedData.map(c => [c.code, c.name, c.orderCount, c.revenue, c.returnVal, c.netRevenue]);
    }

    const aoa = [
      [`Ngày lập: ${todayStr}`],
      [],
      ["", reportTitle],
      ["", getFormattedDateRange()],
      ["", "Chi nhánh: Chi nhánh trung tâm"],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoKhachHang");
    XLSX.writeFile(wb, `BaoCaoKhachHang_${interestType}_${formatDateYMD(selectedSingleDate)}.xlsx`);
  };

  const getReportHeaderTitle = () => {
    if (interestType === 'Lợi nhuận') return 'BÁO CÁO LỢI NHUẬN THEO KHÁCH HÀNG';
    if (interestType === 'Công nợ') return 'BÁO CÁO CÔNG NỢ KHÁCH HÀNG';
    return 'BÁO CÁO BÁN HÀNG THEO KHÁCH HÀNG';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-30 relative">
        <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">
          Báo cáo khách hàng
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2.5 items-start min-h-0 relative">
        
        {/* Left Sidebar Filters */}
        <aside className="w-full lg:w-[260px] bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-3.5 flex-none overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          
          {/* Kiểu hiển thị */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kiểu hiển thị</label>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100/80 rounded-lg">
              <button 
                onClick={() => setViewType('Biểu đồ')}
                className={`py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewType === 'Biểu đồ' ? 'bg-white text-[#0077CC] shadow-xs' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Biểu đồ
              </button>
              <button 
                onClick={() => setViewType('Báo cáo')}
                className={`py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewType === 'Báo cáo' ? 'bg-white text-[#0077CC] shadow-xs' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Báo cáo
              </button>
            </div>
            
            {viewType === 'Biểu đồ' && (
              <div className="mt-1">
                <select 
                  value={displayType} 
                  onChange={(e) => setDisplayType(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700"
                >
                  <option value="Hiển thị dọc">Hiển thị dọc</option>
                  <option value="Hiển thị ngang">Hiển thị ngang</option>
                </select>
              </div>
            )}
          </div>

          {/* Mối quan tâm */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mối quan tâm</label>
            <select 
              value={interestType} 
              onChange={(e) => setInterestType(e.target.value)}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700"
            >
              <option value="Bán hàng">Bán hàng</option>
              <option value="Lợi nhuận">Lợi nhuận</option>
              <option value="Công nợ">Công nợ</option>
            </select>
          </div>

          {/* Thời gian */}
          <ReportTimeFilter 
            timeRangeType={timeRangeType}
            setTimeRangeType={setTimeRangeType}
            selectedSingleDate={selectedSingleDate}
            setSelectedSingleDate={setSelectedSingleDate}
            timeFrom={timeFrom}
            setTimeFrom={setTimeFrom}
            timeTo={timeTo}
            setTimeTo={setTimeTo}
            customFromDate={customFromDate}
            setCustomFromDate={setCustomFromDate}
            customToDate={customToDate}
            setCustomToDate={setCustomToDate}
          />

          {/* Hiển thị số liệu */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hiển thị số liệu</label>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="custTaxMode" 
                  checked={taxMode === 'withoutTax'} 
                  onChange={() => setTaxMode('withoutTax')} 
                  className="w-3.5 h-3.5 text-[#0077CC] focus:ring-[#0077CC]" 
                />
                <span>Chưa bao gồm thuế</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="custTaxMode" 
                  checked={taxMode === 'withTax'} 
                  onChange={() => setTaxMode('withTax')} 
                  className="w-3.5 h-3.5 text-[#0077CC] focus:ring-[#0077CC]" 
                />
                <span>Đã bao gồm thuế</span>
              </label>
            </div>
          </div>

          {/* Khách hàng Search */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Khách hàng</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Theo mã, tên, số điện thoại" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded border border-gray-200 bg-white text-xs outline-none focus:border-[#0077CC] text-gray-700 font-medium"
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px] h-[calc(100vh-140px)] relative w-full">
          
          {viewType === 'Biểu đồ' ? (
            <div className="flex-1 overflow-y-auto bg-gray-50/40 custom-scrollbar p-6">
              {interestType === 'Bán hàng' && (
                <HorizontalChart 
                  title="Top 10 khách hàng doanh thu cao nhất (đã trừ trả hàng)"
                  dataList={sortedByRevenue}
                  valueKey="netRevenue"
                  labelKey="name"
                />
              )}
              {interestType === 'Lợi nhuận' && (
                <HorizontalChart 
                  title="Top 10 khách hàng lợi nhuận cao nhất"
                  dataList={sortedByProfit}
                  valueKey="grossProfit"
                  labelKey="name"
                />
              )}
              {interestType === 'Công nợ' && (
                <HorizontalChart 
                  title="Top 10 khách hàng nợ nhiều nhất"
                  dataList={sortedByDebt}
                  valueKey="debt"
                  labelKey="name"
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-[#808a95]">
              {/* Document Toolbar */}
              <div className="h-10 bg-[#475569] text-white flex items-center justify-between px-3 shrink-0 select-none shadow-sm z-10 w-full">
                
                {/* Left Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button onClick={fetchData} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer" title="Làm mới">
                    <RotateCcw size={15} />
                  </button>
                </div>

                {/* Right Action Tools */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="flex items-center gap-1 bg-[#0077CC] hover:bg-[#0066b3] text-white text-xs font-semibold px-2.5 py-1 rounded transition-colors shadow-xs cursor-pointer"
                    >
                      <Download size={13} />
                      <ChevronDown size={13} />
                    </button>
                    
                    {showExportDropdown && (
                      <>
                        <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setShowExportDropdown(false)} />
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white text-slate-800 border border-gray-200 rounded-lg shadow-xl py-1 z-40 animate-fade-in font-sans">
                          <button 
                            onClick={() => {
                              handlePrint();
                              setShowExportDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-xs text-gray-700 border-none bg-transparent cursor-pointer"
                          >
                            Acrobat (PDF) file
                          </button>
                          <button 
                            onClick={() => {
                              handleExportExcel();
                              setShowExportDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-xs text-gray-700 border-none bg-transparent cursor-pointer"
                          >
                            Excel 97-2003
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={handlePrint} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer" title="In báo cáo">
                    <Printer size={15} />
                  </button>

                  <div className="flex items-center gap-0.5 bg-slate-600/50 rounded px-1.5 py-0.5 text-xs text-white">
                    <button onClick={() => setZoom(prev => Math.max(50, prev - 10))} className="p-0.5 hover:bg-slate-600 rounded cursor-pointer" title="Thu nhỏ">
                      <ZoomOut size={13} />
                    </button>
                    <span className="font-bold px-1 min-w-[32px] text-center">{zoom}%</span>
                    <button onClick={() => setZoom(prev => Math.min(150, prev + 10))} className="p-0.5 hover:bg-slate-600 rounded cursor-pointer" title="Phóng to">
                      <ZoomIn size={13} />
                    </button>
                  </div>

                  <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer" title="Toàn màn hình">
                    <Maximize2 size={14} />
                  </button>
                </div>

              </div>

              {/* Top Loading Progress Bar */}
              {loading && (
                <div className="w-full h-1 bg-blue-100 overflow-hidden shrink-0 z-20">
                  <div className="w-full h-full bg-[#0077CC] animate-pulse" />
                </div>
              )}

              {/* Document Canvas Container (#808a95) */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-6 flex justify-center items-start bg-[#808a95] custom-scrollbar w-full">
                
                <div 
                  id="printed-report-page"
                  className="bg-white text-slate-900 shadow-2xl p-3 sm:px-6 sm:py-8 min-h-[850px] h-fit border border-gray-300 rounded-sm origin-top transition-transform duration-200 select-text mb-12 w-full max-w-full sm:max-w-[960px] box-border"
                  style={{ 
                    transform: `scale(${zoom / 100})`, 
                    transformOrigin: 'top center',
                    fontFamily: 'Segoe UI, Arial, sans-serif'
                  }}
                >
                  {/* Top metadata timestamp */}
                  <div className="flex justify-between items-start mb-4 text-[11px] text-gray-500">
                    <div>
                      Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Title & header metadata */}
                  <div className="text-center mb-6 px-1">
                    <h1 className="text-base sm:text-[20px] font-bold uppercase text-slate-900 tracking-tight leading-tight break-words">
                      {getReportHeaderTitle()}
                    </h1>
                    <div className="mt-2 flex flex-col gap-0.5 text-[11px] sm:text-[12px] text-gray-600 font-medium">
                      <p>{getFormattedDateRange()}</p>
                      <p>Chi nhánh: Chi nhánh trung tâm</p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-gray-300 rounded-sm overflow-x-auto mb-6 bg-white shadow-sm w-full custom-scrollbar">
                    <table className="w-full text-[12px] border-collapse min-w-[680px]">
                      <thead>
                        {interestType === 'Bán hàng' && (
                          <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                            <th className="px-2.5 py-2 text-left w-[90px]">Mã KH</th>
                            <th className="px-2.5 py-2 text-left min-w-[160px]">Khách hàng</th>
                            <th className="px-2 py-2 text-right w-[75px]">Số đơn</th>
                            <th className="px-2.5 py-2 text-right w-[110px]">Doanh thu</th>
                            <th className="px-2.5 py-2 text-right w-[100px]">Giá trị trả</th>
                            <th className="px-2.5 py-2 text-right w-[120px]">Doanh thu thuần</th>
                          </tr>
                        )}
                        {interestType === 'Lợi nhuận' && (
                          <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                            <th className="px-2.5 py-2 text-left w-[85px]">Mã KH</th>
                            <th className="px-2.5 py-2 text-left min-w-[150px]">Khách hàng</th>
                            <th className="px-2 py-2 text-right w-[65px]">Số đơn</th>
                            <th className="px-2.5 py-2 text-right w-[105px]">Doanh thu</th>
                            <th className="px-2.5 py-2 text-right w-[95px]">Giá trị trả</th>
                            <th className="px-2.5 py-2 text-right w-[110px]">Doanh thu thuần</th>
                            <th className="px-2.5 py-2 text-right w-[105px]">Tổng giá vốn</th>
                            <th className="px-2.5 py-2 text-right w-[105px]">Lợi nhuận</th>
                            <th className="px-2 py-2 text-right w-[75px]">Tỷ suất</th>
                          </tr>
                        )}
                        {interestType === 'Công nợ' && (
                          <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                            <th className="px-2.5 py-2 text-left w-[90px]">Mã KH</th>
                            <th className="px-2.5 py-2 text-left min-w-[160px]">Khách hàng</th>
                            <th className="px-2 py-2 text-left w-[100px]">Điện thoại</th>
                            <th className="px-2.5 py-2 text-right w-[115px]">Tổng mua</th>
                            <th className="px-2.5 py-2 text-right w-[115px]">Đã thanh toán</th>
                            <th className="px-2.5 py-2 text-right w-[125px]">Nợ hiện tại</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium">
                        
                        {/* Top Summary Row (#EDE7D6 Gold Bar) */}
                        {interestType === 'Bán hàng' && (
                          <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                            <td className="px-2.5 py-2" colSpan={2}>
                              SL khách hàng: {processedData.length}
                            </td>
                            <td className="px-2 py-2 text-right font-extrabold text-slate-900">
                              {totalOrderCount}
                            </td>
                            <td className="px-2.5 py-2 text-right font-extrabold text-slate-900">
                              {fmt(totalRevenue)}
                            </td>
                            <td className="px-2.5 py-2 text-right text-gray-800">
                              {fmt(totalReturnVal)}
                            </td>
                            <td className="px-2.5 py-2 text-right font-extrabold text-[#0077CC]">
                              {fmt(totalNet)}
                            </td>
                          </tr>
                        )}

                        {interestType === 'Lợi nhuận' && (
                          <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                            <td className="px-2.5 py-2" colSpan={2}>
                              SL khách hàng: {processedData.length}
                            </td>
                            <td className="px-2 py-2 text-right font-extrabold text-slate-900">
                              {totalOrderCount}
                            </td>
                            <td className="px-2.5 py-2 text-right font-extrabold text-slate-900">
                              {fmt(totalRevenue)}
                            </td>
                            <td className="px-2.5 py-2 text-right text-gray-800">
                              {fmt(totalReturnVal)}
                            </td>
                            <td className="px-2.5 py-2 text-right font-extrabold text-slate-900">
                              {fmt(totalNet)}
                            </td>
                            <td className="px-2.5 py-2 text-right text-gray-800">
                              {fmt(totalCogs)}
                            </td>
                            <td className="px-2.5 py-2 text-right font-extrabold text-slate-900">
                              {fmt(totalGrossProfit)}
                            </td>
                            <td className="px-2 py-2 text-right font-extrabold text-[#0077CC]">
                              {avgProfitMargin.toFixed(2)} %
                            </td>
                          </tr>
                        )}

                        {interestType === 'Công nợ' && (
                          <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                            <td className="px-2.5 py-2" colSpan={3}>
                              SL khách hàng: {processedData.length}
                            </td>
                            <td className="px-2.5 py-2 text-right font-extrabold text-slate-900">
                              {fmt(totalRevenue)}
                            </td>
                            <td className="px-2.5 py-2 text-right text-emerald-700 font-extrabold">
                              {fmt(totalPaid)}
                            </td>
                            <td className="px-2.5 py-2 text-right font-extrabold text-rose-600">
                              {fmt(totalDebt)}
                            </td>
                          </tr>
                        )}

                        {/* Customer Rows */}
                        {processedData.length > 0 ? (
                          processedData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                              <td className="px-2.5 py-2 font-bold text-[#0077CC]">
                                <a 
                                  href={`/customers?search=${encodeURIComponent(item.code || item.name)}`}
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[#0077CC] hover:underline"
                                >
                                  {item.code || `KH${String(item.id).padStart(5, '0')}`}
                                </a>
                              </td>
                              <td className="px-2.5 py-2 text-gray-800 font-medium max-w-[240px] break-words">
                                {item.name}
                              </td>

                              {interestType === 'Bán hàng' && (
                                <>
                                  <td className="px-2 py-2 text-right text-gray-700">
                                    {item.orderCount}
                                  </td>
                                  <td className="px-2.5 py-2 text-right text-gray-800 font-semibold">
                                    {fmt(item.revenue)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right text-gray-500">
                                    {fmt(item.returnVal)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right text-gray-800 font-bold">
                                    {fmt(item.netRevenue)}
                                  </td>
                                </>
                              )}

                              {interestType === 'Lợi nhuận' && (
                                <>
                                  <td className="px-2 py-2 text-right text-gray-700">
                                    {item.orderCount}
                                  </td>
                                  <td className="px-2.5 py-2 text-right font-medium text-gray-800">
                                    {fmt(item.revenue)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right text-gray-500">
                                    {fmt(item.returnVal)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right font-medium text-gray-800">
                                    {fmt(item.netRevenue)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right text-gray-700">
                                    {fmt(item.cogs)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right font-semibold text-gray-800">
                                    {fmt(item.grossProfit)}
                                  </td>
                                  <td className="px-2 py-2 text-right font-semibold text-[#0077CC]">
                                    {item.profitMargin.toFixed(2)} %
                                  </td>
                                </>
                              )}

                              {interestType === 'Công nợ' && (
                                <>
                                  <td className="px-2 py-2 text-left text-gray-600">
                                    {item.phone || '---'}
                                  </td>
                                  <td className="px-2.5 py-2 text-right text-gray-800 font-semibold">
                                    {fmt(item.revenue)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right text-emerald-700 font-medium">
                                    {fmt(item.paid)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right font-bold text-rose-600">
                                    {fmt(item.debt)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        ) : (
                          loading ? (
                            <LoadingStateRow colSpan={6} />
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                                Không tìm thấy khách hàng nào phù hợp
                              </td>
                            </tr>
                          )
                        )}

                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            </div>
          )}

        </main>

      </div>

    </div>
  );
}

