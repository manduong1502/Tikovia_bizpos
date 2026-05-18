import { useState, useEffect } from 'react';
import { reportAPI, employeeAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Download, Printer, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  ChevronDown, ChevronRight, FileSpreadsheet, Calendar, 
  Search, Users, DollarSign, ArrowLeft, ArrowRight,
  ChevronLeft, ChevronsLeft, ChevronsRight, FileText
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { exportCSV } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function EndOfDayReportPage() {
  const [data, setData] = useState({ transactions: [], orderCount: 0, totalSales: 0, totalPaid: 0, totalReturns: 0, netRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({ group: true }); // keep grouped invoice row expanded by default
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter States
  const [viewType, setViewType] = useState('Báo cáo'); // Báo cáo
  const [displayType, setDisplayType] = useState('Hiển thị dọc'); // Hiển thị dọc
  const [interestType, setInterestType] = useState('Bán hàng'); // Bán hàng, Hàng hóa, Tổng hợp
  const [timeRangeType, setTimeRangeType] = useState('today'); // today, custom
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [salesMethod, setSalesMethod] = useState('');

  const [employees, setEmployees] = useState([]);

  // Fetch employees/users list
  useEffect(() => {
    employeeAPI.getAll().then(setEmployees).catch(() => {});
  }, []);

  // Fetch report data
  const fetchData = () => {
    setLoading(true);
    let params = {};

    if (timeRangeType === 'today') {
      if (filterDate) {
        // convert YYYY-MM-DD to DD/MM/YYYY
        const [y, m, d] = filterDate.split('-');
        params.date = `${d}/${m}/${y}`;
      }
    } else {
      if (customFromDate) params.fromDate = customFromDate;
      if (customToDate) params.toDate = customToDate;
    }

    reportAPI.getEndOfDay(params)
      .then(res => {
        if (res) {
          setData(res);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching report:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [timeRangeType, filterDate, customFromDate, customToDate]);

  // Client-side sub-filtering based on side bar filters
  const filteredTransactions = (data.transactions || []).filter(tx => {
    // Filter customer
    if (customerQuery) {
      const q = customerQuery.toLowerCase();
      const nameMatch = tx.customerName?.toLowerCase().includes(q);
      const phoneMatch = tx.customerPhone?.includes(q);
      const codeMatch = tx.code?.toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !codeMatch) return false;
    }
    // Filter employee
    if (selectedEmployee && tx.createdBy !== selectedEmployee) {
      return false;
    }
    // Filter creator
    if (selectedCreator && tx.createdBy !== selectedCreator) {
      return false;
    }
    // Filter payment method
    if (paymentMethod && tx.paymentMethod !== paymentMethod) {
      return false;
    }
    return true;
  });

  // Calculate totals for currently displayed transactions
  const totalInvoiceCount = filteredTransactions.length;
  const totalQtySum = filteredTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
  const totalRevenueSum = filteredTransactions.reduce((sum, tx) => sum + (tx.revenue || 0), 0);
  const totalOtherFeeSum = filteredTransactions.reduce((sum, tx) => sum + (tx.otherFee || 0), 0);
  const totalVatSum = filteredTransactions.reduce((sum, tx) => sum + (tx.vat || 0), 0);
  const totalRoundingSum = filteredTransactions.reduce((sum, tx) => sum + (tx.rounding || 0), 0);
  const totalReturnFeeSum = filteredTransactions.reduce((sum, tx) => sum + (tx.returnFee || 0), 0);
  const totalNetSum = filteredTransactions.reduce((sum, tx) => sum + (tx.netRevenue || 0), 0);

  const toggleExpandGroup = () => {
    setExpandedOrders(prev => ({
      ...prev,
      group: !prev.group
    }));
  };

  const handleExportExcel = () => {
    const rows = filteredTransactions.map(tx => ({
      code: tx.code,
      time: new Date(tx.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      customer: tx.customerName,
      quantity: tx.quantity,
      revenue: tx.revenue,
      otherFee: tx.otherFee,
      vat: tx.vat,
      rounding: tx.rounding,
      returnFee: tx.returnFee,
      net: tx.netRevenue,
      paymentMethod: tx.paymentMethod,
      creator: tx.createdBy
    }));

    exportCSV([
      { key: 'code', label: 'Mã giao dịch' },
      { key: 'time', label: 'Thời gian' },
      { key: 'customer', label: 'Khách hàng' },
      { key: 'quantity', label: 'Số lượng' },
      { key: 'revenue', label: 'Doanh thu' },
      { key: 'otherFee', label: 'Thu khác' },
      { key: 'vat', label: 'VAT' },
      { key: 'rounding', label: 'Làm tròn' },
      { key: 'returnFee', label: 'Phí trả hàng' },
      { key: 'net', label: 'Thực thu' },
      { key: 'paymentMethod', label: 'Phương thức TT' },
      { key: 'creator', label: 'Người tạo' },
    ], rows, `bao_cao_cuoi_ngay_${filterDate}`);

    toast.success('Xuất file báo cáo thành công!');
  };

  const handlePrint = () => {
    window.print();
  };

  // Format today display
  const getFormattedDateRange = () => {
    if (timeRangeType === 'today') {
      if (!filterDate) return '';
      const [y, m, d] = filterDate.split('-');
      return `${d}/${m}/${y}`;
    } else {
      if (!customFromDate || !customToDate) return '';
      const f = customFromDate.split('-').reverse().join('/');
      const t = customToDate.split('-').reverse().join('/');
      return `${f} - ${t}`;
    }
  };

  return (
    <div className="flex bg-[#F2F4F7] min-h-screen text-[13px] text-gray-800">
      
      {/* ─── SIDEBAR FILTERS (Left) ─── */}
      <aside className="w-[300px] shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-46px)] sticky top-[46px] custom-scrollbar z-20">
        <h2 className="text-[16px] font-bold text-gray-800 mb-1">Báo cáo cuối ngày</h2>

        {/* Kiểu hiển thị */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewType('Báo cáo')}
              className={`flex-1 py-1.5 rounded-lg border font-bold text-center cursor-pointer transition-all ${viewType === 'Báo cáo' ? 'bg-[#0070F3] border-[#0070F3] text-white shadow-sm' : 'bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Báo cáo
            </button>
          </div>
          <select 
            value={displayType} 
            onChange={(e) => setDisplayType(e.target.value)}
            className="w-full mt-1.5 p-2 rounded-lg border border-gray-200 bg-white text-[13px] font-medium outline-none focus:border-[#0070F3] transition-colors cursor-pointer"
          >
            <option value="Hiển thị dọc">Hiển thị dọc</option>
            <option value="Hiển thị ngang">Hiển thị ngang</option>
          </select>
        </div>

        {/* Mối quan tâm */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mối quan tâm</label>
          <select 
            value={interestType} 
            onChange={(e) => setInterestType(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 bg-white text-[13px] font-medium outline-none focus:border-[#0070F3] transition-colors cursor-pointer"
          >
            <option value="Bán hàng">Bán hàng</option>
            <option value="Hàng hóa">Hàng hóa</option>
            <option value="Tổng hợp">Tổng hợp</option>
          </select>
        </div>

        {/* Thời gian */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Thời gian</label>
          
          {/* Radio 1: Hôm nay / Ngày cụ thể */}
          <div className="flex flex-col gap-1.5 border border-gray-150 rounded-xl p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeToday" 
                checked={timeRangeType === 'today'} 
                onChange={() => setTimeRangeType('today')}
                className="w-4 h-4 text-[#0070F3] border-gray-300 focus:ring-[#0070F3] cursor-pointer"
              />
              <label htmlFor="timeRangeToday" className="font-bold cursor-pointer text-gray-700">Theo ngày</label>
            </div>
            
            {timeRangeType === 'today' && (
              <div className="flex flex-col gap-1.5 pl-6 mt-1 animate-fade-in">
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="p-1.5 border border-gray-200 bg-white rounded-lg outline-none text-[12px] font-semibold w-full text-center cursor-pointer"
                />
                <div className="flex gap-1.5 items-center mt-1 text-[11px]">
                  <span className="text-gray-400 shrink-0">Từ:</span>
                  <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="p-1 border border-gray-200 bg-white rounded outline-none w-full cursor-pointer" />
                  <span className="text-gray-400 shrink-0">Đến:</span>
                  <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="p-1 border border-gray-200 bg-white rounded outline-none w-full cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* Radio 2: Tùy chỉnh */}
          <div className="flex flex-col gap-1.5 border border-gray-150 rounded-xl p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeCustom" 
                checked={timeRangeType === 'custom'} 
                onChange={() => setTimeRangeType('custom')}
                className="w-4 h-4 text-[#0070F3] border-gray-300 focus:ring-[#0070F3] cursor-pointer"
              />
              <label htmlFor="timeRangeCustom" className="font-bold cursor-pointer text-gray-700">Tùy chỉnh khoảng</label>
            </div>
            
            {timeRangeType === 'custom' && (
              <div className="flex flex-col gap-1.5 pl-6 mt-1 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Từ ngày:</span>
                  <input 
                    type="date" 
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="p-1.5 border border-gray-200 bg-white rounded-lg outline-none text-[12px] cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Đến ngày:</span>
                  <input 
                    type="date" 
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="p-1.5 border border-gray-200 bg-white rounded-lg outline-none text-[12px] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Khách hàng */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Khách hàng</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Theo mã, tên, số điện thoại" 
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-gray-200 bg-white text-[13px] outline-none focus:border-[#0070F3] transition-colors"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Nhân viên */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nhân viên</label>
          <select 
            value={selectedEmployee} 
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 bg-white text-[13px] outline-none focus:border-[#0070F3] cursor-pointer"
          >
            <option value="">Chọn nhân viên</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.name}>{emp.name} ({emp.code})</option>
            ))}
          </select>
        </div>

        {/* Người tạo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Người tạo</label>
          <select 
            value={selectedCreator} 
            onChange={(e) => setSelectedCreator(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 bg-white text-[13px] outline-none focus:border-[#0070F3] cursor-pointer"
          >
            <option value="">Chọn người tạo</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.name}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Phương thức thanh toán */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phương thức thanh toán</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 bg-white text-[13px] outline-none focus:border-[#0070F3] cursor-pointer"
          >
            <option value="">Chọn phương thức thanh toán</option>
            <option value="Tiền mặt">Tiền mặt</option>
            <option value="Chuyển khoản">Chuyển khoản</option>
            <option value="Thẻ">Thẻ tín dụng</option>
          </select>
        </div>

        {/* Phương thức bán hàng */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phương thức bán hàng</label>
          <select 
            value={salesMethod} 
            onChange={(e) => setSalesMethod(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 bg-white text-[13px] outline-none focus:border-[#0070F3] cursor-pointer"
          >
            <option value="">Chọn phương thức bán hàng</option>
            <option value="Trực tiếp">Trực tiếp (POS)</option>
            <option value="Online">Bán hàng Online</option>
          </select>
        </div>
      </aside>

      {/* ─── MAIN DESK / DOCUMENT CANVAS (Right) ─── */}
      <main className="flex-1 flex flex-col max-h-[calc(100vh-46px)] overflow-hidden">
        
        {/* ─── PREMIUM TOOLBAR ─── */}
        <div className="h-12 bg-[#8C9BA5] border-b border-gray-300 px-4 flex items-center justify-between gap-4 shrink-0 shadow-md z-10 text-white">
          
          {/* Left Buttons: Undo, Redo, Refresh */}
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded text-white/50 bg-transparent cursor-not-allowed" disabled>
              <ArrowLeft size={16} />
            </button>
            <button className="p-1.5 rounded text-white/50 bg-transparent cursor-not-allowed" disabled>
              <ArrowRight size={16} />
            </button>
            <button onClick={fetchData} className="p-1.5 rounded text-white hover:text-white hover:bg-white/20 transition-colors cursor-pointer" title="Làm mới báo cáo">
              <RotateCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Center: Pagination simulator */}
          <div className="flex items-center gap-2">
            <button className="p-1 rounded text-white/40 cursor-not-allowed" disabled>
              <ChevronsLeft size={14} />
            </button>
            <button className="p-1 rounded text-white/40 cursor-not-allowed" disabled>
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] bg-white border border-gray-300 px-2.5 py-0.5 rounded font-bold text-gray-700">
              1 / 1
            </span>
            <button className="p-1 rounded text-white/40 cursor-not-allowed" disabled>
              <ChevronRight size={14} />
            </button>
            <button className="p-1 rounded text-white/40 cursor-not-allowed" disabled>
              <ChevronsRight size={14} />
            </button>
          </div>

          {/* Right Controls: Excel, PDF Print, Zoom, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Document export icon */}
            <button 
              onClick={handleExportExcel}
              className="p-1.5 rounded text-white hover:bg-white/25 transition-all flex items-center gap-1 cursor-pointer"
              title="Xem tài liệu chi tiết"
            >
              <FileText size={16} />
            </button>

            {/* Cloud download / export icon */}
            <button 
              onClick={handleExportExcel}
              className="p-1.5 rounded text-white hover:bg-white/25 transition-all flex items-center gap-1 cursor-pointer"
              title="Xuất file báo cáo"
            >
              <Download size={16} />
            </button>

            {/* Print / PDF */}
            <button 
              onClick={handlePrint}
              className="p-1.5 rounded text-white hover:bg-white/25 transition-all flex items-center gap-1 cursor-pointer"
              title="In báo cáo (PDF)"
            >
              <Printer size={16} />
            </button>

            <div className="w-px h-5 bg-white/20 mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#8C9BA5] border border-white/30 rounded px-1 text-white">
              <button 
                onClick={() => setZoom(prev => Math.max(50, prev - 10))} 
                className="p-1 hover:bg-white/25 rounded cursor-pointer"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[11px] font-bold px-1 min-w-[34px] text-center">{zoom}%</span>
              <button 
                onClick={() => setZoom(prev => Math.min(150, prev + 10))} 
                className="p-1 hover:bg-white/25 rounded cursor-pointer"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Fullscreen */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-1.5 rounded text-white hover:bg-white/25 cursor-pointer"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* ─── PRINTED A4 SHEET CANVAS ─── */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-[#8492A6]/40 custom-scrollbar">
          
          {/* Printable Container */}
          <div 
            id="printed-report-page"
            className="bg-white text-slate-800 shadow-2xl p-10 min-h-[900px] border border-gray-200/60 rounded-sm origin-top transition-transform duration-200 select-text"
            style={{ 
              width: `${794 * (zoom / 100)}px`, 
              minWidth: '680px',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {/* Header section inside document */}
            <div className="flex justify-between items-start mb-6 text-[11px] text-gray-400">
              <div className="text-gray-400">
                Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Title & metadata */}
            <div className="text-center mb-8">
              <h1 className="text-[22px] font-bold uppercase text-gray-800 tracking-wide">
                Báo cáo cuối ngày về bán hàng
              </h1>
              <div className="mt-2.5 flex flex-col gap-1 text-[12px] text-gray-600">
                <p><span className="font-semibold text-gray-500">Ngày bán:</span> {getFormattedDateRange()}</p>
                <p><span className="font-semibold text-gray-500">Ngày thanh toán:</span> {getFormattedDateRange()}</p>
                <p><span className="font-semibold text-gray-500">Chi nhánh:</span> Chi nhánh trung tâm</p>
              </div>
            </div>

            {/* Main report grid */}
            <div className="border border-gray-200 rounded-sm overflow-hidden mb-8 bg-white shadow-sm">
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr className="bg-[#BFE3F9] text-slate-700 font-bold border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left w-[180px]">Mã giao dịch</th>
                    <th className="px-2 py-2.5 text-left w-[100px]">Thời gian</th>
                    <th className="px-2 py-2.5 text-right w-[60px]">SL</th>
                    <th className="px-3 py-2.5 text-right">Doanh thu</th>
                    <th className="px-2 py-2.5 text-right">Thu khác</th>
                    <th className="px-2 py-2.5 text-right">VAT</th>
                    <th className="px-2 py-2.5 text-right">Làm tròn</th>
                    <th className="px-2 py-2.5 text-right">Phí trả hàng</th>
                    <th className="px-3 py-2.5 text-right">Thực thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white font-medium">
                  
                  {/* Grouped Row: [+] Hóa đơn */}
                  {totalInvoiceCount > 0 ? (
                    <>
                      <tr 
                        onClick={toggleExpandGroup}
                        className="bg-[#F7F2E8] hover:bg-[#ebdcc4] transition-colors cursor-pointer border-b border-white text-slate-800"
                      >
                        <td className="px-3 py-3 text-slate-800 font-extrabold flex items-center gap-1 select-none">
                          {expandedOrders.group ? '[−]' : '[+]'} Hóa đơn: {totalInvoiceCount}
                        </td>
                        <td className="px-2 py-3 text-gray-500"></td>
                        <td className="px-2 py-3 text-right font-extrabold text-slate-800">
                          {totalQtySum}
                        </td>
                        <td className="px-3 py-3 text-right font-extrabold text-slate-800">
                          {fmt(totalRevenueSum)}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-600">
                          {totalOtherFeeSum ? fmt(totalOtherFeeSum) : '0'}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-600">
                          {totalVatSum ? fmt(totalVatSum) : '0'}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-600">
                          {totalRoundingSum ? fmt(totalRoundingSum) : '0'}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-600">
                          {totalReturnFeeSum ? fmt(totalReturnFeeSum) : '0'}
                        </td>
                        <td className="px-3 py-3 text-right font-extrabold text-slate-800">
                          {fmt(totalNetSum)}
                        </td>
                      </tr>

                      {/* Expanded Invoices list */}
                      {expandedOrders.group && (
                        <tr>
                          <td colSpan={9} className="p-0 bg-white">
                            <table className="w-full text-[11px] border-collapse bg-slate-50/50">
                              <tbody className="divide-y divide-gray-100">
                                {filteredTransactions.map(tx => (
                                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-2 text-[#0070F3] font-semibold">
                                      {tx.code}
                                    </td>
                                    <td className="px-2 py-2 text-gray-500">
                                      {new Date(tx.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-2 py-2 text-right text-gray-700">
                                      {tx.quantity}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-700">
                                      {fmt(tx.revenue)}
                                    </td>
                                    <td className="px-2 py-2 text-right text-gray-400">
                                      {tx.otherFee ? fmt(tx.otherFee) : '0'}
                                    </td>
                                    <td className="px-2 py-2 text-right text-gray-400">
                                      {tx.vat ? fmt(tx.vat) : '0'}
                                    </td>
                                    <td className="px-2 py-2 text-right text-gray-400">
                                      {tx.rounding ? fmt(tx.rounding) : '0'}
                                    </td>
                                    <td className="px-2 py-2 text-right text-gray-400">
                                      {tx.returnFee ? fmt(tx.returnFee) : '0'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-green-600">
                                      {fmt(tx.netRevenue)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400 font-bold text-[12px]">
                        Không có dữ liệu hóa đơn nào trong khoảng thời gian đã chọn!
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
