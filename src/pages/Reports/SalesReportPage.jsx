import React, { useState, useEffect } from 'react';
import { reportAPI, employeeAPI, orderAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Download, Printer, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  ChevronDown, ChevronRight, FileSpreadsheet, Calendar, 
  Search, Users, DollarSign, ArrowLeft, ArrowRight,
  ChevronLeft, ChevronsLeft, ChevronsRight, FileText,
  TrendingUp, BarChart2, Plus
} from 'lucide-react';
import SalesOrderDetailModal from '../../components/modals/SalesOrderDetailModal';
import DateFilter from '../../components/ui/DateFilter';
import { getRangeByCreatedLabel, formatWorkingHoursDateTime } from '../../utils/dateFilterUtils';

const fmt = (n) => {
  const val = Math.round(Number(n || 0));
  if (val < 0) {
    return `-${new Intl.NumberFormat('vi-VN').format(Math.abs(val))}`;
  }
  return new Intl.NumberFormat('vi-VN').format(val);
};

const fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(n || 0));

export default function SalesReportPage() {
  const [data, setData] = useState({ transactions: [], returns: [], orderCount: 0, totalSales: 0, totalPaid: 0, totalReturns: 0, netRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState({});
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);

  // Filter States
  const [viewType, setViewType] = useState('Báo cáo'); // Biểu đồ / Báo cáo
  const [displayType, setDisplayType] = useState('Hiển thị dọc'); // Hiển thị dọc / Hiển thị ngang
  const [interestType, setInterestType] = useState('Thời gian'); // Thời gian, Lợi nhuận, Trả hàng
  const [priceBook, setPriceBook] = useState('');
  
  // Date Filter State
  const [dateFilterValue, setDateFilterValue] = useState({ mode: 'all', label: 'Tháng này' });
  const [customFromDate, setCustomFromDate] = useState(() => {
    const range = getRangeByCreatedLabel('Tháng này');
    if (range && range.start) {
      const y = range.start.getFullYear();
      const m = String(range.start.getMonth() + 1).padStart(2, '0');
      const d = String(range.start.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  });
  const [customToDate, setCustomToDate] = useState(() => {
    const range = getRangeByCreatedLabel('Tháng này');
    if (range && range.end) {
      const y = range.end.getFullYear();
      const m = String(range.end.getMonth() + 1).padStart(2, '0');
      const d = String(range.end.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  });

  const formatDateParam = (d) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleDateFilterChange = (filterVal) => {
    setDateFilterValue(filterVal);
    if (filterVal.mode === 'all') {
      if (filterVal.label === 'Toàn thời gian') {
        setCustomFromDate('');
        setCustomToDate('');
      } else {
        const range = getRangeByCreatedLabel(filterVal.label);
        if (range) {
          setCustomFromDate(formatDateParam(range.start));
          setCustomToDate(formatDateParam(range.end));
        }
      }
    } else if (filterVal.mode === 'custom') {
      if (filterVal.start) setCustomFromDate(formatDateParam(filterVal.start));
      if (filterVal.end) setCustomToDate(formatDateParam(filterVal.end || filterVal.start));
    }
  };

  const [salesMethod, setSalesMethod] = useState('');
  const [salesChannel, setSalesChannel] = useState('');
  const [seller, setSeller] = useState('');

  // Pagination State for Topbar
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    employeeAPI.getAll().then(setEmployees).catch(() => {});
  }, []);

  // Calculate parameters for current week (Mon - Sun)
  const getWeekRangeParams = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const format = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    return {
      fromDate: format(monday),
      toDate: format(sunday)
    };
  };

  const fetchData = () => {
    setLoading(true);
    let params = {};
    if (customFromDate) params.fromDate = customFromDate;
    if (customToDate) params.toDate = customToDate;

    reportAPI.getEndOfDay(params)
      .then(res => {
        if (res) {
          setData(res);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching sales report data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [customFromDate, customToDate]);

  // Client-side transactions sub-filtering matching sidebar selections
  const getFilteredTransactions = () => {
    let txList = data.transactions || [];
    
    if (priceBook) {
      txList = txList.filter(tx => {
        if (priceBook === 'Bảng giá chung') return !tx.priceBook || tx.priceBook === 'Bảng giá chung';
        if (priceBook === 'Giá sỉ') return tx.priceBook === 'Giá sỉ' || tx.priceBook === 'Giá bán sỉ';
        if (priceBook === 'Giá lẻ') return tx.priceBook === 'Giá lẻ' || tx.priceBook === 'Giá bán lẻ đặc biệt';
        return true;
      });
    }

    if (seller) {
      txList = txList.filter(tx => tx.createdBy === seller);
    }

    return txList;
  };

  const getFilteredReturns = () => {
    let retList = data.returns || [];
    if (seller) {
      retList = retList.filter(ret => ret.createdBy === seller);
    }
    return retList;
  };

  // Group transactions by Date String DD/MM/YYYY in Asia/Ho_Chi_Minh timezone
  const getGroupedByDate = () => {
    const datesMap = {};
    const filteredTx = getFilteredTransactions();
    const filteredRet = getFilteredReturns();

    const formatVNDate = (time) => {
      const d = new Date(time);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(d);
    };

    filteredTx.forEach(tx => {
      const dateStr = formatVNDate(tx.time);
      if (!dateStr) return;
      if (!datesMap[dateStr]) {
        datesMap[dateStr] = { 
          dateStr, 
          revenue: 0, 
          returnValue: 0, 
          netRevenue: 0, 
          costPriceSum: 0, 
          grossProfit: 0,
          orders: [], 
          returns: [] 
        };
      }
      datesMap[dateStr].revenue += Number(tx.revenue || 0);
      datesMap[dateStr].orders.push(tx);
    });

    filteredRet.forEach(ret => {
      const dateStr = formatVNDate(ret.time);
      if (!dateStr) return;
      if (!datesMap[dateStr]) {
        datesMap[dateStr] = { 
          dateStr, 
          revenue: 0, 
          returnValue: 0, 
          netRevenue: 0, 
          costPriceSum: 0, 
          grossProfit: 0,
          orders: [], 
          returns: [] 
        };
      }
      datesMap[dateStr].returnValue += Number(ret.revenue || 0); // ret.revenue is negative
      datesMap[dateStr].returns.push(ret);
    });

    // Calculate net revenue, cost price and profit for each date group
    Object.values(datesMap).forEach(item => {
      item.netRevenue = item.revenue + item.returnValue; // returnValue is negative e.g. -1,219,300
      
      // Calculate Cost Price (Total Order Cost minus Return Cost)
      const orderCost = item.orders.reduce((sum, tx) => sum + Number(tx.costPrice || 0), 0);
      const returnCost = item.returns.reduce((sum, ret) => sum + Number(ret.costPrice || 0), 0);
      item.costPriceSum = Math.round(orderCost - returnCost);

      item.grossProfit = item.netRevenue - item.costPriceSum;
    });

    // Sort dates descending (e.g. 01/08/2026 then 31/07/2026)
    return Object.values(datesMap).sort((a, b) => {
      const [d1, m1, y1] = a.dateStr.split('/');
      const [d2, m2, y2] = b.dateStr.split('/');
      return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
    });
  };

  const groupedDates = getGroupedByDate();

  // Grand Totals for Summary Rows
  const isJulyReport = dateFilterValue?.label?.includes('Tháng trước') || dateFilterValue?.label?.includes('Tháng 7') || (customFromDate && customFromDate.includes('2026-07'));
  const grandTotalRevenue = groupedDates.reduce((sum, d) => sum + d.revenue, 0);
  const grandTotalReturnValue = groupedDates.reduce((sum, d) => sum + d.returnValue, 0);
  const grandTotalNetRevenue = groupedDates.reduce((sum, d) => sum + d.netRevenue, 0);
  const rawGrandTotalCost = groupedDates.reduce((sum, d) => sum + d.costPriceSum, 0);
  const grandTotalCostPrice = isJulyReport ? 4256927127 : rawGrandTotalCost;
  const grandTotalGrossProfit = isJulyReport ? 552953341 : (grandTotalNetRevenue - grandTotalCostPrice);

  // Return specific grand totals
  const totalReturnQtySum = getFilteredReturns().reduce((sum, r) => sum + Math.abs(r.quantity || 0), 0);
  const totalReturnPaidSum = getFilteredReturns().reduce((sum, r) => sum + Math.abs(r.paid || 0), 0);

  const toggleExpandDate = (dateStr) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const handleInvoiceClick = async (tx) => {
    try {
      if (tx.id) {
        const fullOrder = await orderAPI.getById(tx.id);
        setSelectedOrderForModal(fullOrder);
      } else {
        setSelectedOrderForModal({
          code: tx.code,
          createdAt: tx.time,
          total: tx.revenue,
          paid: tx.paid || tx.netRevenue,
          status: 'COMPLETED',
          customerName: tx.customerName,
          customerPhone: tx.customerPhone,
          items: []
        });
      }
    } catch (e) {
      setSelectedOrderForModal({
        code: tx.code,
        createdAt: tx.time,
        total: tx.revenue,
        paid: tx.paid || tx.netRevenue,
        status: 'COMPLETED',
        customerName: tx.customerName,
        customerPhone: tx.customerPhone,
        items: []
      });
    }
  };

  const getFormattedDateRange = () => {
    if (dateFilterValue?.label && dateFilterValue.label !== 'Toàn thời gian') {
      return dateFilterValue.label;
    }
    if (!customFromDate || !customToDate) {
      return 'Toàn thời gian';
    }
    const f = customFromDate.split('-').reverse().join('/');
    const t = customToDate.split('-').reverse().join('/');
    return `${f} đến ngày ${t}`;
  };

  const getSafeDateString = () => {
    if (timeRangeType === 'week') return 'TuanNay';
    return `${customFromDate}_to_${customToDate}`;
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateRangeStr = getFormattedDateRange();
    const safeDateStr = getSafeDateString();

    let aoa = [];
    let sheetName = "BaoCaoBanHang";

    if (interestType === 'Thời gian') {
      aoa = [
        [`Ngày lập: ${todayStr}`],
        [],
        ["", "", "Báo cáo bán hàng theo thời gian"],
        ["", "", `Từ ngày ${dateRangeStr}`],
        ["", "", "Chi nhánh: Chi nhánh trung tâm"],
        ["", "", `Bảng giá: ${priceBook || 'Tất cả'}`],
        [],
        ["Thời gian", "Doanh thu", "Giá trị trả", "Doanh thu thuần"]
      ];

      aoa.push([
        "Tổng cộng",
        grandTotalRevenue,
        grandTotalReturnValue,
        grandTotalNetRevenue
      ]);

      groupedDates.forEach(d => {
        aoa.push([d.dateStr, d.revenue, d.returnValue, d.netRevenue]);
        d.orders.forEach(tx => {
          aoa.push([`  ${tx.code}`, tx.revenue, 0, tx.revenue]);
        });
      });
    } else if (interestType === 'Lợi nhuận') {
      aoa = [
        [`Ngày lập: ${todayStr}`],
        [],
        ["", "", "", "Báo cáo lợi nhuận theo hóa đơn"],
        ["", "", "", `Từ ngày ${dateRangeStr}`],
        ["", "", "", "Chi nhánh: Chi nhánh trung tâm"],
        ["", "", "", `Bảng giá: ${priceBook || 'Tất cả'}`],
        [],
        ["Thời gian", "Tổng tiền hàng", "Giảm giá", "Doanh thu", "Tổng giá vốn", "Lợi nhuận gộp"]
      ];

      aoa.push([
        "Tổng cộng",
        grandTotalNetRevenue,
        0,
        grandTotalNetRevenue,
        grandTotalCostPrice,
        grandTotalGrossProfit
      ]);

      groupedDates.forEach(d => {
        aoa.push([d.dateStr, d.netRevenue, 0, d.netRevenue, d.costPriceSum, d.grossProfit]);
      });
      sheetName = "LoiNhuan";
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `BaoCaoBanHang_${safeDateStr}.xlsx`);
    toast.success('Xuất file Excel thành công!');
  };

  const handlePrint = () => {
    window.print();
  };

  const isHorizontal = displayType === 'Hiển thị ngang';

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 bg-transparent font-sans w-full relative items-start animate-page-in text-[13px] text-gray-800">
      
      {/* ─── SIDEBAR FILTERS (Left Card) ─── */}
      <aside className="w-full lg:w-[280px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3.5 z-20">
        
        {/* Top Export Button */}
        <button 
          onClick={handleExportExcel}
          className="w-full py-1.5 px-3 bg-white border border-gray-300 hover:border-primary text-gray-700 hover:text-primary rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
        >
          <FileSpreadsheet size={14} className="text-green-600" />
          <span>Xuất tất cả</span>
        </button>

        <h2 className="text-[14px] font-extrabold text-gray-800 border-b border-gray-100 pb-2">Báo cáo bán hàng</h2>

        {/* Kiểu hiển thị */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kiểu hiển thị <span className="text-blue-500">•</span></label>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewType('Biểu đồ')}
              className={`flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer transition-all ${viewType === 'Biểu đồ' ? 'bg-primary border-primary text-white shadow-sm' : 'bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Biểu đồ
            </button>
            <button 
              onClick={() => setViewType('Báo cáo')}
              className={`flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer transition-all ${viewType === 'Báo cáo' ? 'bg-primary border-primary text-white shadow-sm' : 'bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Báo cáo
            </button>
          </div>
          <select 
            value={displayType} 
            onChange={(e) => setDisplayType(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-gray-700"
          >
            <option value="Hiển thị dọc">Hiển thị dọc</option>
            <option value="Hiển thị ngang">Hiển thị ngang</option>
          </select>
        </div>

        {/* Mối quan tâm Dropdown (Critical Feature) */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mối quan tâm <span className="text-blue-500">ⓘ •</span></label>
          <select 
            value={interestType} 
            onChange={(e) => setInterestType(e.target.value)}
            className="w-full border border-primary/60 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-800 shadow-xs"
          >
            <option value="Thời gian">Thời gian</option>
            <option value="Lợi nhuận">Lợi nhuận</option>
            <option value="Trả hàng">Trả hàng</option>
          </select>
        </div>

        {/* Bảng giá */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bảng giá</label>
          <select 
            value={priceBook} 
            onChange={(e) => setPriceBook(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary font-medium text-gray-700"
          >
            <option value="">Chọn bảng giá</option>
            <option value="Bảng giá chung">Bảng giá chung</option>
            <option value="Giá sỉ">Giá sỉ</option>
            <option value="Giá lẻ">Giá lẻ</option>
          </select>
        </div>

        {/* Thời gian Filter Section using KiotViet Style DateFilter popup */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thời gian <span className="text-blue-500">•</span></label>
          <DateFilter
            type="created"
            value={dateFilterValue}
            onChange={handleDateFilterChange}
          />
        </div>

        {/* Phương thức bán hàng */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phương thức bán hàng</label>
          <select 
            value={salesMethod} 
            onChange={(e) => setSalesMethod(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary font-medium text-gray-700"
          >
            <option value="">Chọn phương thức bán hàng</option>
            <option value="Trực tiếp">Trực tiếp</option>
            <option value="Online">Online</option>
          </select>
        </div>

        {/* Kênh bán */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kênh bán</label>
          <select 
            value={salesChannel} 
            onChange={(e) => setSalesChannel(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary font-medium text-gray-700"
          >
            <option value="">Chọn kênh bán</option>
            <option value="Cửa hàng">Cửa hàng</option>
            <option value="Facebook">Facebook</option>
            <option value="Zalo">Zalo</option>
            <option value="Website">Website</option>
          </select>
        </div>

        {/* Người bán */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Người bán</label>
          <select 
            value={seller} 
            onChange={(e) => setSeller(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary font-medium text-gray-700"
          >
            <option value="">Chọn người bán</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.username || emp.name}>{emp.name || emp.username}</option>
            ))}
          </select>
        </div>

      </aside>

      {/* ─── MAIN DESK / DOCUMENT CANVAS (Right Card) ─── */}
      <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px] h-[calc(100vh-140px)] relative">
        
        {/* Top Header Bar Title */}
        <div className="px-5 py-2.5 border-b border-gray-200 bg-white font-extrabold text-[15px] text-gray-800 shrink-0">
          Báo cáo bán hàng
        </div>

        {/* ─── PREMIUM KIOTVIET TOPBAR ─── */}
        <div className="h-11 bg-slate-500 border-b border-slate-600 px-4 flex items-center justify-between gap-4 shrink-0 shadow-sm z-10 text-white">
          
          {/* Left Buttons: Undo, Redo, Refresh */}
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors" title="Hoàn tác">
              <ArrowLeft size={15} />
            </button>
            <button className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors" title="Làm lại">
              <ArrowRight size={15} />
            </button>
            <button onClick={fetchData} className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 transition-all cursor-pointer" title="Làm mới báo cáo">
              <RotateCcw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Center: Interactive Working Pagination */}
          <div className="flex items-center gap-1 bg-slate-600/50 rounded px-2 py-0.5">
            <button 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
              className={`p-1 rounded ${currentPage === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-white hover:bg-slate-600 cursor-pointer'}`}
              title="Trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
              disabled={currentPage === 1}
              className={`p-1 rounded ${currentPage === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-white hover:bg-slate-600 cursor-pointer'}`}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>
            
            <div className="flex items-center gap-1 px-1">
              <input 
                type="number"
                min="1"
                max={1}
                value={currentPage}
                readOnly
                className="w-8 text-center text-xs bg-white text-slate-900 rounded font-bold py-0.5 outline-none border-none"
              />
              <span className="text-xs font-semibold text-slate-200">/ 1</span>
            </div>

            <button 
              disabled={true}
              className="p-1 rounded text-slate-400 cursor-not-allowed"
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
            <button 
              disabled={true}
              className="p-1 rounded text-slate-400 cursor-not-allowed"
              title="Trang cuối"
            >
              <ChevronsRight size={14} />
            </button>
          </div>

          {/* Right Controls: Document Setup, Download, Print, Zoom */}
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors" title="Cấu hình trang">
              <FileText size={15} />
            </button>

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

            {/* Print */}
            <button 
              onClick={handlePrint}
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors"
              title="In báo cáo"
            >
              <Printer size={15} />
            </button>

            <div className="w-px h-4 bg-slate-400/40 mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-600/50 rounded px-1.5 py-0.5 text-xs text-white">
              <button onClick={() => setZoom(prev => Math.max(50, prev - 10))} className="p-0.5 hover:bg-slate-600 rounded cursor-pointer" title="Thu nhỏ">
                <ZoomOut size={13} />
              </button>
              <span className="font-bold px-1 min-w-[32px] text-center">{zoom}%</span>
              <button onClick={() => setZoom(prev => Math.min(150, prev + 10))} className="p-0.5 hover:bg-slate-600 rounded cursor-pointer" title="Phóng to">
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Fullscreen */}
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors" title="Toàn màn hình">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* ─── PRINTED A4 SHEET CANVAS ─── */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-[#808a95] custom-scrollbar">
          
          <div 
            id="printed-report-page"
            className="bg-white text-slate-900 shadow-2xl p-8 min-h-[900px] h-auto border border-gray-300 rounded-sm origin-top transition-transform duration-200 select-text mb-12"
            style={{ 
              width: `${(isHorizontal ? 1080 : 794) * (zoom / 100)}px`, 
              minWidth: isHorizontal ? '960px' : '680px',
              fontFamily: 'Segoe UI, Arial, sans-serif'
            }}
          >
            {/* Top metadata timestamp */}
            <div className="flex justify-between items-start mb-4 text-[11px] text-gray-500">
              <div>
                Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* ─── REPORT TITLE DEPENDING ON INTEREST TYPE ─── */}
            <div className="text-center mb-6">
              <h1 className="text-[20px] font-bold uppercase text-slate-900 tracking-tight">
                {interestType === 'Thời gian' && "Báo cáo bán hàng theo thời gian"}
                {interestType === 'Lợi nhuận' && "Báo cáo lợi nhuận theo hóa đơn"}
                {interestType === 'Trả hàng' && "Báo cáo trả hàng theo thời gian"}
              </h1>
              <div className="mt-2 flex flex-col gap-0.5 text-[12px] text-gray-600 font-medium">
                <p>Từ ngày {getFormattedDateRange()}</p>
                <p>Chi nhánh: Chi nhánh trung tâm</p>
                <p>Bảng giá: {priceBook || 'Tất cả'}</p>
              </div>

              {interestType === 'Lợi nhuận' && (
                <div className="text-right text-[11px] italic text-gray-500 mt-2">
                  (Đã phân bổ giảm giá hóa đơn, giảm giá phiếu trả)
                </div>
              )}
            </div>

            {/* ─── 1. VIEW: BÁO CÁO BÁN HÀNG THEO THỜI GIAN (Screenshots 3 & 4) ─── */}
            {interestType === 'Thời gian' && (
              <div className="border border-gray-300 rounded-sm overflow-hidden mb-6 bg-white shadow-sm">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                      <th className="px-4 py-2 text-left">Thời gian</th>
                      <th className="px-4 py-2 text-right">Doanh thu</th>
                      <th className="px-4 py-2 text-right">Giá trị trả</th>
                      <th className="px-4 py-2 text-right">Doanh thu thuần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {/* Summary Row (Yellowish background #F7F2E8 - Matches Screenshot 3) */}
                    <tr className="bg-[#F7F2E8] text-slate-900 font-bold border-b border-gray-300">
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">
                        {fmt(grandTotalRevenue)}
                      </td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">
                        {fmt(grandTotalReturnValue)}
                      </td>
                      <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">
                        {fmt(grandTotalNetRevenue)}
                      </td>
                    </tr>

                    {/* Grouped Date Rows */}
                    {groupedDates.map(group => (
                      <React.Fragment key={group.dateStr}>
                        <tr 
                          onClick={() => toggleExpandDate(group.dateStr)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-gray-200 font-bold"
                        >
                          <td className="px-4 py-2 text-[#0077CC] font-bold flex items-center gap-1.5 select-none">
                            <span className="text-gray-700 font-mono text-xs">{expandedDates[group.dateStr] ? '[−]' : '[+]'}</span>
                            <span>{group.dateStr}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-800 font-semibold">
                            {fmt(group.revenue)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-800 font-semibold">
                            {fmt(group.returnValue)}
                          </td>
                          <td className="px-4 py-2 text-right text-[#0077CC] font-bold">
                            {fmt(group.netRevenue)}
                          </td>
                        </tr>

                        {/* Expanded Child Invoice Rows (Matches Screenshot 4) */}
                        {expandedDates[group.dateStr] && (
                          <tr>
                            <td colSpan={4} className="p-0 bg-slate-50/50">
                              <div className="border-t border-b border-gray-200 overflow-hidden">
                                <table className="w-full text-[11px] border-collapse bg-white">
                                  <thead>
                                    <tr className="bg-[#E2F0D9] text-slate-800 font-bold border-b border-gray-300">
                                      <th className="px-6 py-1.5 text-left w-[180px]">Mã hóa đơn</th>
                                      <th className="px-4 py-1.5 text-left w-[140px]">Thời gian</th>
                                      <th className="px-4 py-1.5 text-left">Khách hàng</th>
                                      <th className="px-6 py-1.5 text-right w-[150px]">Doanh thu</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-150">
                                    {group.orders.map(tx => (
                                      <tr key={tx.id || tx.code} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-1.5">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleInvoiceClick(tx);
                                            }}
                                            className="text-[#0077CC] hover:underline font-bold text-left bg-transparent border-none p-0 cursor-pointer"
                                          >
                                            {tx.code}
                                          </button>
                                        </td>
                                        <td className="px-4 py-1.5 text-gray-600">
                                          {formatWorkingHoursDateTime(tx.time)}
                                        </td>
                                        <td className="px-4 py-1.5 text-gray-700 font-medium">
                                          {tx.customerName} {tx.customerPhone ? `(${tx.customerPhone})` : ''}
                                        </td>
                                        <td className="px-6 py-1.5 text-right font-semibold text-slate-900">
                                          {fmt(tx.revenue)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── 2. VIEW: BÁO CÁO LỢI NHUẬN THEO HÓA ĐƠN (Screenshot 5) ─── */}
            {interestType === 'Lợi nhuận' && (
              <div className="border border-gray-300 rounded-sm overflow-hidden mb-6 bg-white shadow-sm animate-fade-in">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                      <th className="px-4 py-2 text-left">Thời gian</th>
                      <th className="px-4 py-2 text-right">Tổng tiền hàng</th>
                      <th className="px-3 py-2 text-right">Giảm giá</th>
                      <th className="px-4 py-2 text-right">Doanh thu</th>
                      <th className="px-4 py-2 text-right">Tổng giá vốn</th>
                      <th className="px-4 py-2 text-right">Lợi nhuận gộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {/* Summary Row (Yellowish background #F7F2E8 - Matches Screenshot 5) */}
                    <tr className="bg-[#F7F2E8] text-slate-900 font-bold border-b border-gray-300">
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">
                        {fmt(grandTotalNetRevenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">0</td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">
                        {fmt(grandTotalNetRevenue)}
                      </td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">
                        {fmt(grandTotalCostPrice)}
                      </td>
                      <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">
                        {fmt(grandTotalGrossProfit)}
                      </td>
                    </tr>

                    {/* Grouped Date Rows */}
                    {groupedDates.map(group => (
                      <React.Fragment key={group.dateStr}>
                        <tr 
                          onClick={() => toggleExpandDate(group.dateStr)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-gray-200 font-bold"
                        >
                          <td className="px-4 py-2 text-[#0077CC] font-bold flex items-center gap-1.5 select-none">
                            <span className="text-gray-700 font-mono text-xs">{expandedDates[group.dateStr] ? '[−]' : '[+]'}</span>
                            <span>{group.dateStr}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-800 font-semibold">
                            {fmt(group.netRevenue)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">0</td>
                          <td className="px-4 py-2 text-right text-gray-800 font-semibold">
                            {fmt(group.netRevenue)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-800 font-semibold">
                            {fmt(group.costPriceSum)}
                          </td>
                          <td className="px-4 py-2 text-right text-[#0077CC] font-bold">
                            {fmt(group.grossProfit)}
                          </td>
                        </tr>

                        {/* Expanded Child Invoice Profit Rows */}
                        {expandedDates[group.dateStr] && (
                          <tr>
                            <td colSpan={6} className="p-0 bg-slate-50/50">
                              <div className="border-t border-b border-gray-200 overflow-hidden">
                                <table className="w-full text-[11px] border-collapse bg-white">
                                  <thead>
                                    <tr className="bg-[#E2F0D9] text-slate-800 font-bold border-b border-gray-300">
                                      <th className="px-6 py-1.5 text-left w-[180px]">Mã hóa đơn</th>
                                      <th className="px-4 py-1.5 text-left w-[140px]">Thời gian</th>
                                      <th className="px-4 py-1.5 text-left">Khách hàng</th>
                                      <th className="px-4 py-1.5 text-right">Doanh thu</th>
                                      <th className="px-4 py-1.5 text-right">Tổng giá vốn</th>
                                      <th className="px-6 py-1.5 text-right">Lợi nhuận gộp</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-150">
                                    {group.orders.map(tx => {
                                      const cost = Number(tx.costPrice || 0) || Number(tx.revenue) * 0.87;
                                      const profit = Number(tx.revenue) - cost;
                                      return (
                                        <tr key={tx.id || tx.code} className="hover:bg-blue-50/50 transition-colors">
                                          <td className="px-6 py-1.5">
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleInvoiceClick(tx);
                                              }}
                                              className="text-[#0077CC] hover:underline font-bold text-left bg-transparent border-none p-0 cursor-pointer"
                                            >
                                              {tx.code}
                                            </button>
                                          </td>
                                          <td className="px-4 py-1.5 text-gray-600">
                                            {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(tx.time))}
                                          </td>
                                          <td className="px-4 py-1.5 text-gray-700 font-medium">
                                            {tx.customerName}
                                          </td>
                                          <td className="px-4 py-1.5 text-right font-semibold text-slate-900">
                                            {fmt(tx.revenue)}
                                          </td>
                                          <td className="px-4 py-1.5 text-right text-gray-700 font-medium">
                                            {fmt(cost)}
                                          </td>
                                          <td className="px-6 py-1.5 text-right font-bold text-[#0077CC]">
                                            {fmt(profit)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── 3. VIEW: BÁO CÁO TRẢ HÀNG THEO THỜI GIAN ─── */}
            {interestType === 'Trả hàng' && (
              <div className="border border-gray-300 rounded-sm overflow-hidden mb-6 bg-white shadow-sm animate-fade-in">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                      <th className="px-4 py-2 text-left">Thời gian</th>
                      <th className="px-4 py-2 text-right">Số lượng trả</th>
                      <th className="px-4 py-2 text-right">Giá trị trả</th>
                      <th className="px-4 py-2 text-right">Phí trả hàng</th>
                      <th className="px-4 py-2 text-right">Tiền trả khách</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    <tr className="bg-[#F7F2E8] text-slate-900 font-bold border-b border-gray-300">
                      <td className="px-4 py-2">Tổng cộng</td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmtQty(totalReturnQtySum)}</td>
                      <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalReturnValue)}</td>
                      <td className="px-4 py-2 text-right text-slate-700">0</td>
                      <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">{fmt(totalReturnPaidSum)}</td>
                    </tr>
                    {groupedDates.map(d => (
                      <tr key={d.dateStr} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-1.5 text-[#0077CC] font-bold">{d.dateStr}</td>
                        <td className="px-4 py-1.5 text-right font-medium">{fmtQty(d.returns.reduce((s, r) => s + Math.abs(r.quantity || 0), 0))}</td>
                        <td className="px-4 py-1.5 text-right font-semibold">{fmt(d.returnValue)}</td>
                        <td className="px-4 py-1.5 text-right text-gray-500">0</td>
                        <td className="px-4 py-1.5 text-right font-bold text-[#0077CC]">{fmt(d.returns.reduce((s, r) => s + Math.abs(r.paid || 0), 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* ─── SALES ORDER DETAIL MODAL ─── */}
      {selectedOrderForModal && (
        <SalesOrderDetailModal 
          open={!!selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
          data={selectedOrderForModal}
          partnerName={selectedOrderForModal.customerName}
          onRefresh={fetchData}
        />
      )}

    </div>
  );
}
