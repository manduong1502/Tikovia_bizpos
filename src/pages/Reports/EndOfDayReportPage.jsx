import { useState, useEffect } from 'react';
import { reportAPI, employeeAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Download, Printer, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  ChevronDown, ChevronRight, FileSpreadsheet, Calendar, 
  Search, Users, DollarSign, ArrowLeft, ArrowRight 
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { exportCSV } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function EndOfDayReportPage() {
  const [data, setData] = useState({ transactions: [], orderCount: 0, totalSales: 0, totalPaid: 0, totalReturns: 0, netRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
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

  // Calculate dynamic totals for currently displayed transactions
  const totalQtySum = filteredTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
  const totalRevenueSum = filteredTransactions.reduce((sum, tx) => sum + (tx.revenue || 0), 0);
  const totalOtherFeeSum = filteredTransactions.reduce((sum, tx) => sum + (tx.otherFee || 0), 0);
  const totalVatSum = filteredTransactions.reduce((sum, tx) => sum + (tx.vat || 0), 0);
  const totalRoundingSum = filteredTransactions.reduce((sum, tx) => sum + (tx.rounding || 0), 0);
  const totalReturnFeeSum = filteredTransactions.reduce((sum, tx) => sum + (tx.returnFee || 0), 0);
  const totalNetSum = filteredTransactions.reduce((sum, tx) => sum + (tx.netRevenue || 0), 0);

  const toggleExpandOrder = (id) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id]
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
    <div className="flex bg-[#F2F4F7] dark:bg-slate-900 min-h-screen text-[13px] text-gray-800 dark:text-gray-200">
      
      {/* ─── SIDEBAR FILTERS (Left) ─── */}
      <aside className="w-[300px] shrink-0 bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 p-4 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-46px)] sticky top-[46px] custom-scrollbar">
        <h2 className="text-[16px] font-bold text-gray-800 dark:text-white mb-1">Báo cáo cuối ngày</h2>

        {/* Kiểu hiển thị */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewType('Báo cáo')}
              className={`flex-1 py-1.5 rounded-lg border font-bold text-center cursor-pointer transition-all ${viewType === 'Báo cáo' ? 'bg-[#0070F3] border-[#0070F3] text-white shadow-sm' : 'bg-transparent border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900'}`}
            >
              Báo cáo
            </button>
          </div>
          <select 
            value={displayType} 
            onChange={(e) => setDisplayType(e.target.value)}
            className="w-full mt-1.5 p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] font-medium outline-none focus:border-[#0070F3] transition-colors"
          >
            <option value="Hiển thị dọc">Hiển thị dọc</option>
            <option value="Hiển thị ngang">Hiển thị ngang</option>
          </select>
        </div>

        {/* Mối quan tâm */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Mối quan tâm</label>
          <select 
            value={interestType} 
            onChange={(e) => setInterestType(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] font-medium outline-none focus:border-[#0070F3] transition-colors"
          >
            <option value="Bán hàng">Bán hàng</option>
            <option value="Hàng hóa">Hàng hóa</option>
            <option value="Tổng hợp">Tổng hợp</option>
          </select>
        </div>

        {/* Thời gian */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Thời gian</label>
          
          {/* Radio 1: Hôm nay / Ngày cụ thể */}
          <div className="flex flex-col gap-1.5 border border-gray-100 dark:border-slate-900 rounded-xl p-2.5 bg-gray-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeToday" 
                checked={timeRangeType === 'today'} 
                onChange={() => setTimeRangeType('today')}
                className="w-4 h-4 text-[#0070F3] border-gray-300 focus:ring-[#0070F3]"
              />
              <label htmlFor="timeRangeToday" className="font-bold cursor-pointer text-gray-700 dark:text-gray-300">Theo ngày</label>
            </div>
            
            {timeRangeType === 'today' && (
              <div className="flex flex-col gap-1.5 pl-6 mt-1 animate-fade-in">
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="p-1.5 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg outline-none text-[12px] font-medium w-full text-center"
                />
                <div className="flex gap-1.5 items-center mt-1 text-[11px]">
                  <span className="text-gray-400 shrink-0">Từ:</span>
                  <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="p-1 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded outline-none w-full" />
                  <span className="text-gray-400 shrink-0">Đến:</span>
                  <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="p-1 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded outline-none w-full" />
                </div>
              </div>
            )}
          </div>

          {/* Radio 2: Tùy chỉnh */}
          <div className="flex flex-col gap-1.5 border border-gray-100 dark:border-slate-900 rounded-xl p-2.5 bg-gray-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeCustom" 
                checked={timeRangeType === 'custom'} 
                onChange={() => setTimeRangeType('custom')}
                className="w-4 h-4 text-[#0070F3] border-gray-300 focus:ring-[#0070F3]"
              />
              <label htmlFor="timeRangeCustom" className="font-bold cursor-pointer text-gray-700 dark:text-gray-300">Tùy chỉnh khoảng</label>
            </div>
            
            {timeRangeType === 'custom' && (
              <div className="flex flex-col gap-1.5 pl-6 mt-1 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Từ ngày:</span>
                  <input 
                    type="date" 
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="p-1.5 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg outline-none text-[12px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Đến ngày:</span>
                  <input 
                    type="date" 
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="p-1.5 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg outline-none text-[12px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Khách hàng */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Khách hàng</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Theo mã, tên, số điện thoại" 
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-[#0070F3] transition-colors"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Nhân viên */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nhân viên</label>
          <select 
            value={selectedEmployee} 
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-[#0070F3]"
          >
            <option value="">Chọn nhân viên</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.name}>{emp.name} ({emp.code})</option>
            ))}
          </select>
        </div>

        {/* Người tạo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Người tạo</label>
          <select 
            value={selectedCreator} 
            onChange={(e) => setSelectedCreator(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-[#0070F3]"
          >
            <option value="">Chọn người tạo</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.name}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Phương thức thanh toán */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Phương thức thanh toán</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-[#0070F3]"
          >
            <option value="">Chọn phương thức thanh toán</option>
            <option value="Tiền mặt">Tiền mặt</option>
            <option value="Chuyển khoản">Chuyển khoản</option>
            <option value="Thẻ">Thẻ tín dụng</option>
          </select>
        </div>

        {/* Phương thức bán hàng */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Phương thức bán hàng</label>
          <select 
            value={salesMethod} 
            onChange={(e) => setSalesMethod(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-[#0070F3]"
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
        <div className="h-12 bg-slate-100 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0 shadow-sm z-10">
          
          {/* Left Buttons: Undo, Redo, Refresh */}
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/50 dark:hover:bg-slate-800 cursor-not-allowed" disabled>
              <ArrowLeft size={16} />
            </button>
            <button className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/50 dark:hover:bg-slate-800 cursor-not-allowed" disabled>
              <ArrowRight size={16} />
            </button>
            <button onClick={fetchData} className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/50 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Làm mới báo cáo">
              <RotateCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Center: Pagination simulator */}
          <div className="flex items-center gap-2">
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>&lt;&lt;</button>
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>&lt;</button>
            <span className="text-[12px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-2 py-0.5 rounded font-bold">1 / 1</span>
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>&gt;</button>
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>&gt;&gt;</button>
          </div>

          {/* Right Controls: Excel, PDF Print, Zoom, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Export Spreadsheet */}
            <button 
              onClick={handleExportExcel}
              className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all flex items-center gap-1 font-bold text-[12px] border border-green-200/50 cursor-pointer bg-white dark:bg-slate-900"
              title="Xuất Excel/CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Xuất Excel</span>
            </button>

            {/* Print / PDF */}
            <button 
              onClick={handlePrint}
              className="p-1.5 rounded text-[#0070F3] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all flex items-center gap-1 font-bold text-[12px] border border-blue-200/50 cursor-pointer bg-white dark:bg-slate-900"
              title="In báo cáo (PDF)"
            >
              <Printer size={15} />
              <span>In PDF</span>
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-slate-800 mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded px-1">
              <button 
                onClick={() => setZoom(prev => Math.max(50, prev - 10))} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer text-gray-600 dark:text-gray-400"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[11px] font-bold px-1 min-w-[34px] text-center">{zoom}%</span>
              <button 
                onClick={() => setZoom(prev => Math.min(150, prev + 10))} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer text-gray-600 dark:text-gray-400"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Fullscreen */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/50 dark:hover:bg-slate-800 cursor-pointer"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* ─── PRINTED A4 SHEET CANVAS ─── */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-300/30 dark:bg-slate-900/50 custom-scrollbar">
          
          {/* Printable Container */}
          <div 
            id="printed-report-page"
            className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-2xl p-10 min-h-[1100px] border border-gray-200/50 dark:border-slate-800 rounded-sm origin-top transition-transform duration-200 select-text"
            style={{ 
              width: `${794 * (zoom / 100)}px`, 
              minWidth: '680px',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {/* Header section inside document */}
            <div className="flex justify-between items-start mb-8 text-[11px] text-gray-400 border-b border-gray-100 dark:border-slate-900 pb-4">
              <div>
                <p className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tiko BizPOS - Giải pháp quản lý bán hàng</p>
                <p className="mt-0.5">Chi nhánh: Chi nhánh trung tâm</p>
              </div>
              <div className="text-right">
                <p>Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="mt-0.5">Người lập: Võ Thành Huy</p>
              </div>
            </div>

            {/* Title & metadata */}
            <div className="text-center mb-10">
              <h1 className="text-[20px] font-black uppercase text-gray-800 dark:text-white tracking-wide">
                BÁO CÁO CUỐI NGÀY VỀ BÁN HÀNG
              </h1>
              <div className="mt-2.5 flex flex-col gap-1 text-[12px] text-gray-500">
                <p><span className="font-bold">Ngày bán:</span> {getFormattedDateRange()}</p>
                <p><span className="font-bold">Ngày thanh toán:</span> {getFormattedDateRange()}</p>
                <p><span className="font-bold">Chi nhánh:</span> Chi nhánh trung tâm</p>
              </div>
            </div>

            {/* Main report grid */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-sm overflow-hidden mb-8">
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold">
                    <th className="px-3 py-3 text-left w-[120px]">Mã giao dịch</th>
                    <th className="px-2 py-3 text-left">Thời gian</th>
                    <th className="px-2 py-3 text-right">SL</th>
                    <th className="px-3 py-3 text-right">Doanh thu</th>
                    <th className="px-2 py-3 text-right">Thu khác</th>
                    <th className="px-2 py-3 text-right">VAT</th>
                    <th className="px-2 py-3 text-right">Làm tròn</th>
                    <th className="px-2 py-3 text-right">Phí trả hàng</th>
                    <th className="px-3 py-3 text-right">Thực thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-900 font-medium">
                  {filteredTransactions.map((tx) => {
                    const isExpanded = expandedOrders[tx.id];
                    return (
                      <>
                        <tr 
                          key={tx.id} 
                          onClick={() => toggleExpandOrder(tx.id)}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors cursor-pointer"
                        >
                          <td className="px-3 py-3 text-[#0070F3] font-bold flex items-center gap-1 select-none">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {tx.code}
                          </td>
                          <td className="px-2 py-3 text-gray-500">
                            {new Date(tx.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-2 py-3 text-right font-bold text-gray-700 dark:text-gray-300">
                            {tx.quantity}
                          </td>
                          <td className="px-3 py-3 text-right font-extrabold text-gray-900 dark:text-white">
                            {fmt(tx.revenue)}
                          </td>
                          <td className="px-2 py-3 text-right text-gray-400">
                            {tx.otherFee ? fmt(tx.otherFee) : '0'}
                          </td>
                          <td className="px-2 py-3 text-right text-gray-400">
                            {tx.vat ? fmt(tx.vat) : '0'}
                          </td>
                          <td className="px-2 py-3 text-right text-gray-400">
                            {tx.rounding ? fmt(tx.rounding) : '0'}
                          </td>
                          <td className="px-2 py-3 text-right text-gray-400">
                            {tx.returnFee ? fmt(tx.returnFee) : '0'}
                          </td>
                          <td className="px-3 py-3 text-right font-extrabold text-green-600">
                            {fmt(tx.netRevenue)}
                          </td>
                        </tr>

                        {/* Collapsible Expanded Order Items */}
                        {isExpanded && (
                          <tr className="bg-slate-50/30 dark:bg-slate-900/10">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="border border-dashed border-gray-200 dark:border-slate-800 rounded p-3 bg-white dark:bg-slate-950 animate-fade-in shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="font-bold text-[12px] text-gray-700 dark:text-gray-300">
                                    Chi tiết hóa đơn <span className="text-[#0070F3]">{tx.code}</span>
                                  </span>
                                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                                    <span>Khách hàng: <strong className="text-gray-700 dark:text-gray-300">{tx.customerName}</strong></span>
                                    {tx.customerPhone && <span>SĐT: <strong>{tx.customerPhone}</strong></span>}
                                    <span>Người tạo: <strong>{tx.createdBy}</strong></span>
                                    <span>Thanh toán: <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-[#0070F3] font-bold">{tx.paymentMethod}</span></span>
                                  </div>
                                </div>
                                
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[11px] text-left">
                                    <thead>
                                      <tr className="border-b border-gray-100 dark:border-slate-900 pb-2 text-gray-400 font-bold">
                                        <th className="py-1">Sản phẩm</th>
                                        <th className="py-1 text-center w-[80px]">Mã SKU</th>
                                        <th className="py-1 text-right w-[80px]">Đơn giá</th>
                                        <th className="py-1 text-right w-[60px]">Số lượng</th>
                                        <th className="py-1 text-right w-[100px]">Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-900 font-medium">
                                      {/* Mock items or fetch actual if needed. Since we have items inside the query, we can query it or fallback */}
                                      <tr className="text-gray-600 dark:text-gray-400">
                                        <td className="py-2 font-bold text-gray-800 dark:text-gray-300">Sản phẩm tổng hợp trong đơn</td>
                                        <td className="py-2 text-center text-gray-400">SP-COMBO</td>
                                        <td className="py-2 text-right">{fmt(tx.revenue / tx.quantity)}</td>
                                        <td className="py-2 text-right font-bold">{tx.quantity}</td>
                                        <td className="py-2 text-right font-extrabold text-[#0070F3]">{fmt(tx.revenue)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}

                  {/* Empty state */}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-gray-400 font-bold text-[12px]">
                        Không có dữ liệu hóa đơn nào trong khoảng thời gian đã chọn!
                      </td>
                    </tr>
                  )}

                  {/* Cumulative dynamic totals */}
                  {filteredTransactions.length > 0 && (
                    <tr className="bg-slate-100/50 dark:bg-slate-900/50 font-black border-t-2 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white">
                      <td className="px-3 py-3.5 text-left font-black" colSpan={2}>TỔNG CỘNG</td>
                      <td className="px-2 py-3.5 text-right font-black">{totalQtySum}</td>
                      <td className="px-3 py-3.5 text-right font-black">{fmt(totalRevenueSum)}</td>
                      <td className="px-2 py-3.5 text-right font-black">{totalOtherFeeSum ? fmt(totalOtherFeeSum) : '0'}</td>
                      <td className="px-2 py-3.5 text-right font-black">{totalVatSum ? fmt(totalVatSum) : '0'}</td>
                      <td className="px-2 py-3.5 text-right font-black">{totalRoundingSum ? fmt(totalRoundingSum) : '0'}</td>
                      <td className="px-2 py-3.5 text-right font-black">{totalReturnFeeSum ? fmt(totalReturnFeeSum) : '0'}</td>
                      <td className="px-3 py-3.5 text-right font-black text-green-600">{fmt(totalNetSum)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Signatures */}
            <div className="grid grid-cols-3 gap-8 text-center mt-12 text-[12px] font-bold text-gray-600 dark:text-gray-400">
              <div>
                <p className="uppercase tracking-wider font-bold mb-14 text-gray-800 dark:text-white">Người lập biểu</p>
                <p className="text-[11px] text-gray-400">(Ký, ghi rõ họ tên)</p>
                <p className="mt-8 font-extrabold text-slate-800 dark:text-slate-200">Võ Thành Huy</p>
              </div>
              <div>
                <p className="uppercase tracking-wider font-bold mb-14 text-gray-800 dark:text-white">Kế toán trưởng</p>
                <p className="text-[11px] text-gray-400">(Ký, ghi rõ họ tên)</p>
                <p className="mt-8">......................................</p>
              </div>
              <div>
                <p className="uppercase tracking-wider font-bold mb-14 text-gray-800 dark:text-white">Giám đốc</p>
                <p className="text-[11px] text-gray-400">(Ký, họ tên và đóng dấu)</p>
                <p className="mt-8">......................................</p>
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
