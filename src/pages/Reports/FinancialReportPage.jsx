import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, ArrowRight, Printer, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, RotateCcw, Maximize2, 
  ChevronDown, FileSpreadsheet, Calendar
} from 'lucide-react';
import { reportAPI, orderAPI, returnAPI, cashbookAPI, productAPI, loadInitialCache } from '../../services/api';
import ReportTimeFilter, { formatDateVN, formatDateYMD } from '../../components/ui/ReportTimeFilter';
import { formatLocalYMD, getWorkingHoursYMD, formatWorkingHoursTime, inDateRange, buildCustomRange, parseFlexibleDate } from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n || 0)));

export default function FinancialReportPage() {
  const [serverFinData, setServerFinData] = useState(() => loadInitialCache('reports:financial', null));
  const [rawOrders, setRawOrders] = useState(() => loadInitialCache('orders:', []));
  const [rawReturns, setRawReturns] = useState(() => loadInitialCache('returns:', []));
  const [rawCashbook, setRawCashbook] = useState(() => loadInitialCache('cashbook:', []));
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

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
    if (!serverFinData && rawOrders.length === 0) {
      setLoading(true);
    }
    let params = {};
    if (timeRangeType === 'date') {
      const d = (selectedSingleDate instanceof Date) ? selectedSingleDate : new Date(selectedSingleDate);
      const prevDay = new Date(d); prevDay.setDate(prevDay.getDate() - 1);
      const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
      params.fromDate = formatLocalYMD(prevDay);
      params.toDate = formatLocalYMD(nextDay);
      params.date = formatLocalYMD(d);
    } else {
      if (customFromDate) {
        const d = new Date(customFromDate);
        const prevDay = new Date(d); prevDay.setDate(prevDay.getDate() - 1);
        params.fromDate = formatLocalYMD(prevDay);
      }
      if (customToDate) {
        const d = new Date(customToDate);
        const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
        params.toDate = formatLocalYMD(nextDay);
      }
    }

    try {
      const [finRes, ordersRes, returnsRes, cashbookRes, endOfDayRes] = await Promise.all([
        reportAPI.getFinancial(params).catch(() => null),
        orderAPI.getAll({ limit: 1000 }).catch(() => []),
        returnAPI.getAll({ limit: 1000 }).catch(() => []),
        cashbookAPI.getAll({ limit: 1000 }).catch(() => []),
        reportAPI.getEndOfDay(params).catch(() => null)
      ]);

      setServerFinData(finRes);

      const oList = endOfDayRes?.transactions && endOfDayRes.transactions.length > 0
        ? endOfDayRes.transactions
        : (Array.isArray(ordersRes?.data) ? ordersRes.data : (Array.isArray(ordersRes) ? ordersRes : []));

      const rList = endOfDayRes?.returns && endOfDayRes.returns.length > 0
        ? endOfDayRes.returns
        : (Array.isArray(returnsRes?.data) ? returnsRes.data : (Array.isArray(returnsRes) ? returnsRes : []));

      const cbList = endOfDayRes?.cashbook && endOfDayRes.cashbook.length > 0
        ? endOfDayRes.cashbook
        : (Array.isArray(cashbookRes?.data) ? cashbookRes.data : (Array.isArray(cashbookRes) ? cashbookRes : []));

      setRawOrders(oList);
      setRawReturns(rList);
      setRawCashbook(cbList);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu tài chính');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeRangeType, selectedSingleDate, customFromDate, customToDate]);

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
      const oYMD = getWorkingHoursYMD(o.createdAt || o.created_at || o.time || o.date);
      const oTime = formatWorkingHoursTime(o.createdAt || o.created_at || o.time || o.date);

      if (timeRangeType === 'date') {
        if (oYMD !== targetYMD) return;
      } else {
        if (customFromDate && oYMD < customFromDate) return;
        if (customToDate && oYMD > customToDate) return;
      }

      if (timeFrom && oTime < timeFrom) return;
      if (timeTo && oTime > timeTo) return;

      const discount = Number(o.discount_amount || o.discount || 0);
      const total = Number(o.total || 0);
      const subtotal = Number(o.subtotal || (total + discount));

      grossRevenue += subtotal;
      orderDiscounts += discount;

      const orderCogs = (o.items || []).reduce((s, it) => s + (Number(it.cost_price || it.costPrice || 0) * Number(it.quantity || 0)), 0);
      cogs += orderCogs;
    });

    // 2. Process Returns (Hàng bán bị trả lại, Giá vốn hàng trả lại, Phí trả hàng)
    (rawReturns || []).forEach(r => {
      const rYMD = getWorkingHoursYMD(r.createdAt || r.created_at || r.time || r.date);
      const rTime = formatWorkingHoursTime(r.createdAt || r.created_at || r.time || r.date);

      if (timeRangeType === 'date') {
        if (rYMD !== targetYMD) return;
      } else {
        if (customFromDate && rYMD < customFromDate) return;
        if (customToDate && rYMD > customToDate) return;
      }

      if (timeFrom && rTime < timeFrom) return;
      if (timeTo && rTime > timeTo) return;

      const total = Math.abs(Number(r.total || 0));
      returnTotalVal += total;
      returnFeeIncome += Number(r.returnFee || r.fee || 0);

      const rCogs = (r.items || []).reduce((s, it) => s + (Number(it.cost_price || it.costPrice || 0) * Number(it.quantity || 0)), 0);
      returnCogs += rCogs;
    });

    // 3. Process Cashbook (Chi phí hoạt động & Thu/Chi khác)
    (rawCashbook || []).forEach(cb => {
      const cbYMD = getWorkingHoursYMD(cb.time || cb.createdAt || cb.date);
      const cbTime = formatWorkingHoursTime(cb.time || cb.createdAt || cb.date);

      if (timeRangeType === 'date') {
        if (cbYMD !== targetYMD) return;
      } else {
        if (customFromDate && cbYMD < customFromDate) return;
        if (customToDate && cbYMD > customToDate) return;
      }

      if (timeFrom && cbTime < timeFrom) return;
      if (timeTo && cbTime > timeTo) return;

      const amount = Math.abs(Number(cb.amount || 0));
      const isExpense = cb.type === 'EXPENSE' || cb.type === 'expense' || cb.type === 'CHI' || cb.type === 'chi';
      const cat = (cb.category || cb.group || cb.description || '').toLowerCase();

      if (isExpense) {
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
      } else {
        // Non-sales income
        if (!cat.includes('bán hàng') && !cat.includes('hóa đơn') && !cat.includes('thu tiền bán')) {
          otherIncomeFromCashbook += amount;
        }
      }
    });

    const totalDeductions = orderDiscounts + returnTotalVal;
    const netRevenue = grossRevenue - totalDeductions;
    const netCogs = cogs;
    const grossProfit = netRevenue - netCogs;

    const operatingExpenses = staffSalary + shippingFee + refundCustomer + discardGoods + pointsPayment + customerPaymentDiscount + voucherExpenses + roundingPurchaseDiff + roundingSalesDiff + otherOperatingExpenses;
    const operatingProfit = grossProfit - operatingExpenses;

    const otherIncome = returnFeeIncome + otherIncomeFromCashbook;
    const netProfit = (operatingProfit + otherIncome) - otherExpenses;

    // If server returned valid fin data and client calculation is empty, use serverFinData
    if (grossRevenue === 0 && serverFinData && (serverFinData.grossRevenue || serverFinData.totalSales)) {
      return {
        grossRevenue: Number(serverFinData.grossRevenue ?? serverFinData.totalSales ?? 0),
        totalDeductions: Number(serverFinData.totalDeductions ?? (Number(serverFinData.orderDiscounts || 0) + Number(serverFinData.returnTotalVal || 0))),
        orderDiscounts: Number(serverFinData.orderDiscounts ?? 0),
        returnTotalVal: Number(serverFinData.returnTotalVal ?? 0),
        netRevenue: Number(serverFinData.netRevenue ?? serverFinData.netSales ?? 0),
        cogs: Number(serverFinData.cogs ?? 0),
        grossProfit: Number(serverFinData.grossProfit ?? 0),
        operatingExpenses: Number(serverFinData.operatingExpenses ?? 0),
        voucherExpenses: Number(serverFinData.voucherExpenses ?? 0),
        shippingFee: Number(serverFinData.shippingFee ?? 0),
        refundCustomer: Number(serverFinData.refundCustomer ?? 0),
        discardGoods: Number(serverFinData.discardGoods ?? 0),
        pointsPayment: Number(serverFinData.pointsPayment ?? 0),
        customerPaymentDiscount: Number(serverFinData.customerPaymentDiscount ?? 0),
        staffSalary: Number(serverFinData.staffSalary ?? 0),
        roundingPurchaseDiff: 0,
        roundingSalesDiff: 0,
        otherOperatingExpenses: 0,
        operatingProfit: Number(serverFinData.operatingProfit ?? 0),
        otherIncome: Number(serverFinData.otherIncome ?? 0),
        returnFeeIncome: Number(serverFinData.returnFeeIncome ?? 0),
        roundingPurchaseDiffIncome: 0,
        roundingSalesDiffIncome: 0,
        supplierPaymentDiscount: 0,
        otherExpenses: Number(serverFinData.otherExpenses ?? 0),
        netProfit: Number(serverFinData.netProfit ?? 0)
      };
    }

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
  }, [rawOrders, rawReturns, rawCashbook, serverFinData, timeRangeType, selectedSingleDate, customFromDate, customToDate, timeFrom, timeTo]);

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
    XLSX.writeFile(workbook, `BaoCaoTaiChinh_${Date.now()}.xlsx`);
    toast.success('Xuất file Excel thành công!');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 bg-transparent font-sans w-full relative items-start animate-page-in text-[13px] text-gray-800">
      
      {/* ─── SIDEBAR FILTERS (Left Card - Exact Match with KiotViet Screenshot 4) ─── */}
      <aside className="w-full lg:w-[280px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-4 z-20">
        
        <h2 className="text-[14px] font-extrabold text-gray-800 border-b border-gray-100 pb-2">Báo cáo tài chính</h2>

        {/* Kiểu hiển thị */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex gap-2">
            <button 
              className="flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer transition-all bg-[#0077CC] border-[#0077CC] text-white shadow-sm"
            >
              Báo cáo
            </button>
          </div>
        </div>

        {/* Thời gian - Matching EndOfDayReportPage */}
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

      {/* ─── MAIN DESK / DOCUMENT CANVAS (Right Area - Exact Match with KiotViet Screenshot 4) ─── */}
      <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px] h-[calc(100vh-140px)] relative w-full">
        
        {/* Top Header Bar Title */}
        <div className="px-5 py-2.5 border-b border-gray-200 bg-white font-extrabold text-[15px] text-gray-800 shrink-0">
          Báo cáo tài chính
        </div>

        {/* ─── PREMIUM KIOTVIET TOPBAR (#475569) ─── */}
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
  );
}
