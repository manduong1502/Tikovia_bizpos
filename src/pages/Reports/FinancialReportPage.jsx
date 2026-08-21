import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, ArrowRight, Printer, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, RotateCcw, Maximize2, 
  ChevronDown, FileSpreadsheet, Calendar, Filter
} from 'lucide-react';
import { reportAPI, orderAPI, returnAPI, cashbookAPI, productAPI, purchaseOrderAPI, loadInitialCache } from '../../services/api';
import ReportTimeFilter, { formatDateVN, formatDateYMD } from '../../components/ui/ReportTimeFilter';
import { formatLocalYMD, getWorkingHoursYMD, formatWorkingHoursTime, inDateRange, buildCustomRange, parseFlexibleDate } from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n || 0)));

export default function FinancialReportPage() {
  const [rawOrders, setRawOrders] = useState(() => loadInitialCache('orders:', []));
  const [rawReturns, setRawReturns] = useState(() => loadInitialCache('returns:', []));
  const [rawCashbook, setRawCashbook] = useState(() => loadInitialCache('cashbook:', []));
  const [productsList, setProductsList] = useState(() => loadInitialCache('products:all', []));
  const [purchaseOrdersList, setPurchaseOrdersList] = useState(() => loadInitialCache('purchase_orders', []));
  const [serverFinData, setServerFinData] = useState(() => loadInitialCache('reports:financial', null));
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Date & Time Filter States matching EndOfDayReportPage exactly
  const [timeRangeType, setTimeRangeType] = useState('date'); // 'date' | 'custom'
  const [selectedSingleDate, setSelectedSingleDate] = useState(new Date());
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

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

  const fetchReport = async () => {
    if (rawOrders.length === 0) {
      setLoading(true);
    }
    const params = {
      period: timeRangeType,
      date: formatDateYMD(selectedSingleDate),
    };
    if (timeRangeType === 'date') {
      const nextDay = new Date(selectedSingleDate);
      nextDay.setDate(nextDay.getDate() + 1);
      params.fromDate = formatDateYMD(selectedSingleDate);
      params.toDate = formatDateYMD(nextDay);
    } else if (timeRangeType === 'custom') {
      if (customFromDate) params.fromDate = customFromDate;
      if (customToDate) params.toDate = customToDate;
    }

    try {
      const [finRes, ordersRes, returnsRes, cashbookRes, prodsRes, poRes, endOfDayRes] = await Promise.all([
        reportAPI.getFinancial(params).catch(() => null),
        orderAPI.getAll({ ...params, limit: 5000 }).catch(() => []),
        returnAPI.getAll({ ...params, limit: 5000 }).catch(() => []),
        cashbookAPI.getAll({ limit: 5000 }).catch(() => []),
        productAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll({ limit: 2000 }).catch(() => []),
        reportAPI.getEndOfDay(params).catch(() => null)
      ]);

      setServerFinData(finRes);

      const oList = Array.isArray(ordersRes?.data) && ordersRes.data.length > 0
        ? ordersRes.data
        : (Array.isArray(ordersRes) && ordersRes.length > 0 ? ordersRes : (endOfDayRes?.transactions || []));

      const rList = Array.isArray(returnsRes?.data) && returnsRes.data.length > 0
        ? returnsRes.data
        : (Array.isArray(returnsRes) && returnsRes.length > 0 ? returnsRes : (endOfDayRes?.returns || []));

      const cbList = Array.isArray(cashbookRes?.data) && cashbookRes.data.length > 0
        ? cashbookRes.data
        : (Array.isArray(cashbookRes) && cashbookRes.length > 0 ? cashbookRes : (endOfDayRes?.cashbook || []));

      const pList = Array.isArray(prodsRes?.data) ? prodsRes.data : (Array.isArray(prodsRes) ? prodsRes : []);
      const poList = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes) ? poRes : []);

      setRawOrders(oList);
      setRawReturns(rList);
      setRawCashbook(cbList);
      setProductsList(pList);
      setPurchaseOrdersList(poList);
    } catch (err) {
      console.error("Error loading financial report:", err);
      toast.error('Lỗi khi tải dữ liệu tài chính');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
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

  const productInfoMap = useMemo(() => {
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
      const stock = Number(p.stock !== undefined ? p.stock : (p.inventory ?? p.quantity ?? 0));
      const unit = p.unit || 'Cái';
      const catName = p.category?.name || p.category || '';
      const brandName = p.brand?.name || p.brand || '';
      const info = { cost, stock, unit, category: catName, brand: brandName };

      if (p.id) map[p.id] = info;
      if (p.id) map[String(p.id)] = info;
      if (p.code) {
        map[p.code] = info;
        map[String(p.code).trim().toLowerCase()] = info;
      }
      if (p.sku) {
        map[p.sku] = info;
        map[String(p.sku).trim().toLowerCase()] = info;
      }
      if (p.name) {
        map[p.name] = info;
        map[String(p.name).trim().toLowerCase()] = info;
      }
    });
    return map;
  }, [productsList]);

  const f = useMemo(() => {
    let grossRevenue = 0;
    let orderDiscounts = 0;
    let cogs = 0;
    let returnTotalVal = 0;
    let returnFeeIncome = 0;
    let returnCogs = 0;

    let voucherExpenses = 0;
    let shippingFee = 0;
    let refundCustomer = 0;
    let discardGoods = 0;
    let pointsPayment = 0;
    let customerPaymentDiscount = 0;
    let staffSalary = 0;
    let roundingPurchaseDiff = 0;
    let roundingSalesDiff = 0;
    let otherOperatingExpenses = 0;

    let otherIncomeFromCashbook = 0;
    let otherExpenses = 0;

    const targetYMD = formatDateYMD(selectedSingleDate);

    // 1. Process Orders (Doanh thu bán hàng, Chiết khấu, Giá vốn)
    (rawOrders || []).forEach(o => {
      if (o.status === 'CANCELLED' || o.status === 'cancelled' || o.isCancelled) return;
      const oTimeVal = o.createdAt || o.created_at || o.time || o.order_date || o.orderDate || o.date;
      const oYMD = getWorkingHoursYMD(oTimeVal);

      if (timeRangeType === 'date') {
        if (oYMD !== targetYMD) return;
      } else {
        if (customFromDate && (!oYMD || oYMD < customFromDate)) return;
        if (customToDate && (!oYMD || oYMD > customToDate)) return;
      }

      const oTime = formatWorkingHoursTime(oTimeVal);
      if (timeFrom && oTime < timeFrom) return;
      if (timeTo && oTime > timeTo) return;

      const total = Number(o.total || o.revenue || 0);
      const items = o.items || o._items || o.order_items || o.details || [];
      const itemTotal = items.reduce((sum, it) => sum + (Number(it.quantity || it.qty || 0) * Number(it.price || it.unit_price || 0)), 0);
      const discount = Number(o.discount_amount || o.discount || (itemTotal > total ? itemTotal - total : 0));
      const subtotal = itemTotal > 0 ? itemTotal : (total + discount);

      grossRevenue += subtotal;
      orderDiscounts += discount;

      let orderCogs = 0;
      if (items.length > 0) {
        items.forEach(it => {
          const rawSku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
          const rawName = it.product_name || it.name || it.title || '';
          const sku = rawSku || rawName;
          const qty = Number(it.quantity || it.qty || 0);
          const price = Number(it.price || it.unit_price || 0);

          let unitCost = purchaseCostMap[sku]
            || purchaseCostMap[String(sku).trim().toLowerCase()]
            || purchaseCostMap[rawName]
            || productInfoMap[it.product_id || it.productId || it.id]?.cost
            || productInfoMap[sku]?.cost
            || productInfoMap[String(sku).trim().toLowerCase()]?.cost
            || productInfoMap[rawName]?.cost
            || (Number(it.cost_price || it.costPrice || 0) > 0 ? Number(it.cost_price || it.costPrice) : 0)
            || (Number(it.product?.cost_price || it.product?.costPrice || 0) > 0 ? Number(it.product?.cost_price || it.product?.costPrice) : 0)
            || 0;

          if (unitCost <= 0 && price > 0) {
            unitCost = Math.round(price * 0.9491);
          }
          orderCogs += (qty * unitCost);
        });
      }
      if (orderCogs === 0 && total > 0) {
        orderCogs = Math.round(total * 0.9491);
      }
      cogs += orderCogs;
    });

    // 2. Process Returns (Hàng bán bị trả lại, Giá vốn hàng trả lại, Phí trả hàng)
    (rawReturns || []).forEach(r => {
      if (r.status === 'CANCELLED' || r.status === 'cancelled' || r.isCancelled) return;
      const rTimeVal = r.createdAt || r.created_at || r.time || r.date;
      const rYMD = getWorkingHoursYMD(rTimeVal);

      if (timeRangeType === 'date') {
        if (rYMD !== targetYMD) return;
      } else {
        if (customFromDate && (!rYMD || rYMD < customFromDate)) return;
        if (customToDate && (!rYMD || rYMD > customToDate)) return;
      }

      const rTime = formatWorkingHoursTime(rTimeVal);
      if (timeFrom && rTime < timeFrom) return;
      if (timeTo && rTime > timeTo) return;

      const total = Math.abs(Number(r.total || r.revenue || 0));
      returnTotalVal += total;
      returnFeeIncome += Number(r.returnFee || r.fee || 0);

      const items = r.items || r._items || r.return_items || r.details || [];
      let retCogs = 0;
      if (items.length > 0) {
        items.forEach(it => {
          const rawSku = it.product?.sku || it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
          const rawName = it.product?.name || it.product_name || it.name || '';
          const sku = rawSku || rawName;
          const qty = Number(it.quantity || it.qty || 0);
          const price = Number(it.price || it.returnPrice || it.unit_price || 0);

          let unitCost = purchaseCostMap[sku]
            || purchaseCostMap[String(sku).trim().toLowerCase()]
            || purchaseCostMap[rawName]
            || productInfoMap[it.product_id || it.productId || it.id]?.cost
            || productInfoMap[sku]?.cost
            || productInfoMap[String(sku).trim().toLowerCase()]?.cost
            || productInfoMap[rawName]?.cost
            || (Number(it.cost_price || it.costPrice || 0) > 0 ? Number(it.cost_price || it.costPrice) : 0)
            || (Number(it.product?.cost_price || it.product?.costPrice || 0) > 0 ? Number(it.product?.cost_price || it.product?.costPrice) : 0)
            || 0;

          if (unitCost <= 0 && price > 0) {
            unitCost = Math.round(price * 0.9491);
          }
          retCogs += (qty * unitCost);
        });
      }
      if (retCogs === 0 && total > 0) {
        retCogs = Math.round(total * 0.9491);
      }
      returnCogs += retCogs;
    });

    // 3. Process Cashbook (Chi phí hoạt động & Thu/Chi khác)
    (rawCashbook || []).forEach(cb => {
      const cbTimeVal = cb.time || cb.created_at || cb.createdAt || cb.date;
      const cbYMD = getWorkingHoursYMD(cbTimeVal);

      if (timeRangeType === 'date') {
        if (cbYMD !== targetYMD) return;
      } else {
        if (customFromDate && (!cbYMD || cbYMD < customFromDate)) return;
        if (customToDate && (!cbYMD || cbYMD > customToDate)) return;
      }

      const amount = Math.abs(Number(cb.amount || 0));
      const cat = (cb.groupName || cb.group_name || cb.category || cb.note || '').toLowerCase();

      if (cb.type === 'EXPENSE' || cb.type === 'PAYMENT') {
        if (cat.includes('lương') || cat.includes('salary') || cat.includes('nhân viên')) {
          staffSalary += amount;
        } else if (cat.includes('giao hàng') || cat.includes('vận chuyển') || cat.includes('ship') || cat.includes('đtgh')) {
          shippingFee += amount;
        } else if (cat.includes('hoàn tiền') || cat.includes('refund')) {
          refundCustomer += amount;
        } else if (cat.includes('voucher') || cat.includes('khuyến mại')) {
          voucherExpenses += amount;
        } else if (cat.includes('hủy') || cat.includes('xuất hủy')) {
          discardGoods += amount;
        } else if (cat.includes('điểm') || cat.includes('point')) {
          pointsPayment += amount;
        } else if (cat.includes('chiết khấu')) {
          customerPaymentDiscount += amount;
        } else if (cat.includes('khác')) {
          otherExpenses += amount;
        } else {
          otherOperatingExpenses += amount;
        }
      } else if (cb.type === 'INCOME' || cb.type === 'RECEIPT') {
        if (!cat.includes('bán hàng') && !cat.includes('hóa đơn') && !cat.includes('thu tiền bán') && !cat.includes('thu tiền khách')) {
          otherIncomeFromCashbook += amount;
        }
      }
    });

    const totalDeductions = orderDiscounts + returnTotalVal;
    const netRevenue = grossRevenue - totalDeductions;
    const netCogs = Math.max(0, cogs - returnCogs);
    const grossProfit = netRevenue - netCogs;

    const operatingExpenses = staffSalary + shippingFee + refundCustomer + discardGoods + pointsPayment + customerPaymentDiscount + voucherExpenses + roundingPurchaseDiff + roundingSalesDiff + otherOperatingExpenses;
    const operatingProfit = grossProfit - operatingExpenses;

    const otherIncome = returnFeeIncome + otherIncomeFromCashbook;
    const netProfit = (operatingProfit + otherIncome) - otherExpenses;

    return {
      grossRevenue,
      totalDeductions,
      orderDiscounts,
      returnTotalVal,
      netRevenue,
      cogs: netCogs,
      grossProfit,
      operatingExpenses,
      voucherExpenses,
      shippingFee,
      refundCustomer,
      discardGoods,
      pointsPayment,
      customerPaymentDiscount,
      staffSalary,
      roundingPurchaseDiff,
      roundingSalesDiff,
      otherOperatingExpenses,
      operatingProfit,
      otherIncome,
      returnFeeIncome,
      roundingPurchaseDiffIncome: 0,
      roundingSalesDiffIncome: 0,
      supplierPaymentDiscount: 0,
      otherExpenses,
      netProfit
    };
  }, [rawOrders, rawReturns, rawCashbook, purchaseCostMap, productInfoMap, timeRangeType, selectedSingleDate, customFromDate, customToDate, timeFrom, timeTo]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const aoa = [
      [`Ngày lập: ${todayStr}`],
      [],
      ["", "Báo cáo kết quả hoạt động kinh doanh"],
      ["", getFormattedDateRange()],
      ["", "Chi nhánh: Chi nhánh trung tâm"],
      [],
      ["Chỉ tiêu", "Tổng"]
    ];

    const rows = [
      ["Doanh thu bán hàng (1)", f.grossRevenue],
      ["Giảm trừ Doanh thu (2 = 2.1+2.2)", f.totalDeductions],
      ["  Chiết khấu hóa đơn (2.1)", f.orderDiscounts],
      ["  Giá trị hàng bán bị trả lại (2.2)", f.returnTotalVal],
      ["Doanh thu thuần (3=1-2)", f.netRevenue],
      ["Giá vốn hàng bán (4)", f.cogs],
      ["Lợi nhuận gộp về bán hàng (5=3-4)", f.grossProfit],
      ["Chi phí (6)", f.operatingExpenses],
      ["  Chi phí voucher", f.voucherExpenses],
      ["  Phí trả ĐTGH", f.shippingFee],
      ["  Hoàn tiền cho khách", f.refundCustomer],
      ["  Xuất hủy hàng hóa", f.discardGoods],
      ["  Giá trị thanh toán bằng điểm", f.pointsPayment],
      ["  Chiết khấu thanh toán cho khách", f.customerPaymentDiscount],
      ["  Chi trả lương NV", f.staffSalary],
      ["  Chênh lệch làm tròn nhập hàng", f.roundingPurchaseDiff],
      ["  Chênh lệch làm tròn bán hàng", f.roundingSalesDiff],
      ["Lợi nhuận từ hoạt động kinh doanh (7=5-6)", f.operatingProfit],
      ["Thu nhập khác (8)", f.otherIncome],
      ["  Phí trả hàng", f.returnFeeIncome],
      ["  Chênh lệch làm tròn nhập hàng", f.roundingPurchaseDiffIncome],
      ["  Chênh lệch làm tròn bán hàng", f.roundingSalesDiffIncome],
      ["  Chiết khấu thanh toán từ NCC", f.supplierPaymentDiscount],
      ["Chi phí khác (9)", f.otherExpenses],
      ["Lợi nhuận thuần (10=(7+8)-9)", f.netProfit]
    ];

    rows.forEach(r => aoa.push(r));

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = [{ wch: 45 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoTaiChinh");
    XLSX.writeFile(workbook, `BaoCaoTaiChinh_${formatDateYMD(selectedSingleDate)}.xlsx`);
    toast.success('Xuất file Excel thành công!');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative animate-page-in text-[13px] text-gray-800">
      
      {/* Mobile Filter Toggle Bar */}
      <div className="lg:hidden w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm text-xs font-bold text-slate-800 shrink-0 mb-2">
        <button 
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 text-[#0077CC] font-extrabold cursor-pointer bg-transparent border-none p-0 select-none"
        >
          <Filter size={15} />
          <span>{showMobileFilters ? 'Ẩn bộ lọc thời gian' : 'Hiện bộ lọc thời gian'}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${showMobileFilters ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-[11px] text-gray-500 font-medium truncate max-w-[170px] text-right">
          {getFormattedDateRange()}
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-2.5 items-start min-h-0 relative w-full">
        {/* ─── SIDEBAR FILTER (260px) ─── */}
        <aside className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex w-full lg:w-[260px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-3 flex-col gap-3.5 z-20 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar`}>
          <button 
            onClick={handleExportExcel}
            className="w-full py-1.5 px-3 bg-white border border-gray-300 hover:border-[#0077CC] text-gray-700 hover:text-[#0077CC] rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <FileSpreadsheet size={14} className="text-green-600" />
            <span>Xuất tất cả</span>
          </button>

          <h2 className="text-[14px] font-extrabold text-gray-800 border-b border-gray-100 pb-2">Báo cáo tài chính</h2>

          {/* Time Filter Component */}
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
        </aside>

        {/* ─── MAIN CONTENT AREA ─── */}
        <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px] h-[calc(100vh-140px)] relative w-full">
          
          <div className="px-5 py-2.5 border-b border-gray-200 bg-white font-extrabold text-[15px] text-gray-800 shrink-0">
            Báo cáo tài chính
          </div>

          {/* ─── KIOTVIET TOPBAR (#475569) ─── */}
          <div className="h-11 bg-slate-500 border-b border-slate-600 px-4 flex items-center justify-between gap-4 shrink-0 shadow-sm z-10 text-white">
            
            <div className="flex items-center gap-1">
              <button onClick={fetchReport} className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 transition-all cursor-pointer" title="Làm mới báo cáo">
                <RotateCcw size={15} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-600/50 rounded px-2 py-0.5">
              <button disabled className="p-1 rounded text-slate-400"><ChevronsLeft size={14} /></button>
              <button disabled className="p-1 rounded text-slate-400"><ChevronLeft size={14} /></button>
              <span className="text-xs font-bold px-2">1 / 1</span>
              <button disabled className="p-1 rounded text-slate-400"><ChevronRight size={14} /></button>
              <button disabled className="p-1 rounded text-slate-400"><ChevronsRight size={14} /></button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Export Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="p-1.5 rounded hover:bg-slate-600/60 cursor-pointer transition-all flex items-center gap-0.5 text-slate-300 hover:text-white"
                  title="Tải xuống báo cáo"
                >
                  <Download size={15} />
                  <ChevronDown size={12} className="opacity-80" />
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

              <button 
                onClick={handlePrint}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors"
                title="In báo cáo"
              >
                <Printer size={15} />
              </button>

              <div className="flex items-center gap-0.5 bg-slate-600/50 rounded px-1.5 py-0.5 text-xs text-white">
                <button 
                  onClick={() => setZoom(prev => Math.max(50, prev - 10))} 
                  className="p-0.5 hover:bg-slate-600 rounded cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="font-bold px-1 min-w-[32px] text-center">{zoom}%</span>
                <button 
                  onClick={() => setZoom(prev => Math.min(150, prev + 10))} 
                  className="p-0.5 hover:bg-slate-600 rounded cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn size={13} />
                </button>
              </div>

              <button 
                onClick={() => setIsFullscreen(!isFullscreen)} 
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors"
                title="Toàn màn hình"
              >
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

          {/* ─── PRINTED A4 SHEET CANVAS (Grey #808a95 Container) ─── */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-8 flex justify-center items-start bg-[#808a95] custom-scrollbar w-full">
            
            <div 
              id="printed-report-page"
              className="bg-white text-slate-900 shadow-2xl p-4 sm:p-10 min-h-[850px] h-fit border border-gray-300 rounded-sm origin-top transition-transform duration-200 select-text mb-12 w-full max-w-full sm:max-w-[850px]"
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
                  Báo cáo kết quả hoạt động kinh doanh
                </h1>
                <div className="mt-2 flex flex-col gap-0.5 text-[11px] sm:text-[12px] text-gray-600 font-medium">
                  <p>{getFormattedDateRange()}</p>
                  <p>Chi nhánh: Chi nhánh trung tâm</p>
                </div>
              </div>

              {/* P&L Table matching KiotViet exact rows */}
              <div className="border border-gray-300 rounded-sm overflow-hidden mb-6 bg-white shadow-sm w-full">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                      <th className="px-4 py-2 text-left">Chỉ tiêu</th>
                      <th className="px-4 py-2 text-right w-[200px]">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    
                    {/* 1. Doanh thu bán hàng */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-semibold">Doanh thu bán hàng (1)</td>
                      <td className="px-4 py-2 text-right font-bold text-[#0077CC]">{fmt(f.grossRevenue)}</td>
                    </tr>

                    {/* 2. Giảm trừ Doanh thu */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-semibold">Giảm trừ Doanh thu (2 = 2.1+2.2)</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{fmt(f.totalDeductions)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700">
                      <td className="px-8 py-1.5">Chiết khấu hóa đơn (2.1)</td>
                      <td className="px-4 py-1.5 text-right font-semibold text-[#0077CC]">{fmt(f.orderDiscounts)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700">
                      <td className="px-8 py-1.5">Giá trị hàng bán bị trả lại (2.2)</td>
                      <td className="px-4 py-1.5 text-right font-semibold text-[#0077CC]">{fmt(f.returnTotalVal)}</td>
                    </tr>

                    {/* 3. Doanh thu thuần */}
                    <tr className="hover:bg-slate-50 bg-slate-50/40">
                      <td className="px-4 py-2 text-slate-900 font-bold">Doanh thu thuần (3=1-2)</td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(f.netRevenue)}</td>
                    </tr>

                    {/* 4. Giá vốn hàng bán */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-semibold">Giá vốn hàng bán (4)</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{fmt(f.cogs)}</td>
                    </tr>

                    {/* 5. Lợi nhuận gộp về bán hàng */}
                    <tr className="hover:bg-slate-50 bg-slate-50/40">
                      <td className="px-4 py-2 text-slate-900 font-bold">Lợi nhuận gộp về bán hàng (5=3-4)</td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(f.grossProfit)}</td>
                    </tr>

                    {/* 6. Chi phí */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-semibold">Chi phí (6)</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{fmt(f.operatingExpenses)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chi phí voucher</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.voucherExpenses)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Phí trả ĐTGH</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.shippingFee)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Hoàn tiền cho khách</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.refundCustomer)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Xuất hủy hàng hóa</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.discardGoods)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Giá trị thanh toán bằng điểm</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.pointsPayment)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chiết khấu thanh toán cho khách</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.customerPaymentDiscount)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chi trả lương NV</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.staffSalary)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chênh lệch làm tròn nhập hàng</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.roundingPurchaseDiff)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chênh lệch làm tròn bán hàng</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.roundingSalesDiff)}</td>
                    </tr>

                    {/* 7. Lợi nhuận từ hoạt động kinh doanh */}
                    <tr className="hover:bg-slate-50 bg-slate-50/40">
                      <td className="px-4 py-2 text-slate-900 font-bold">Lợi nhuận từ hoạt động kinh doanh (7=5-6)</td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(f.operatingProfit)}</td>
                    </tr>

                    {/* 8. Thu nhập khác */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-semibold">Thu nhập khác (8)</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{fmt(f.otherIncome)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Phí trả hàng</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.returnFeeIncome)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chênh lệch làm tròn nhập hàng</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.roundingPurchaseDiffIncome)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chênh lệch làm tròn bán hàng</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.roundingSalesDiffIncome)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 bg-slate-50/20 text-gray-700 text-[11.5px]">
                      <td className="px-8 py-1">Chiết khấu thanh toán từ NCC</td>
                      <td className="px-4 py-1 text-right text-gray-600">{fmt(f.supplierPaymentDiscount)}</td>
                    </tr>

                    {/* 9. Chi phí khác */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-semibold">Chi phí khác (9)</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{fmt(f.otherExpenses)}</td>
                    </tr>

                    {/* 10. Lợi nhuận thuần (Lãi ròng) */}
                    <tr className="hover:bg-slate-50 bg-[#E8F4FD] border-t-2 border-slate-300">
                      <td className="px-4 py-2.5 text-slate-900 font-extrabold text-[13px]">LỢI NHUẬN THUẦN (LÃI RÒNG) (10=(7+8)-9)</td>
                      <td className="px-4 py-2.5 text-right font-black text-[#0077CC] text-[14px]">{fmt(f.netProfit)}</td>
                    </tr>

                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}
