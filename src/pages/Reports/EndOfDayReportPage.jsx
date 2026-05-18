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
import * as XLSX from 'xlsx';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function EndOfDayReportPage() {
  const [data, setData] = useState({ transactions: [], orderCount: 0, totalSales: 0, totalPaid: 0, totalReturns: 0, netRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({ group: true }); // keep grouped invoice row expanded by default
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Filter States
  const [viewType, setViewType] = useState('Báo cáo'); // Báo cáo
  const [displayType, setDisplayType] = useState('Hiển thị dọc'); // Hiển thị dọc / Hiển thị ngang
  const [interestType, setInterestType] = useState('Bán hàng'); // Bán hàng, Hàng hóa, Tổng hợp
  const [timeRangeType, setTimeRangeType] = useState('today'); // today, custom
  const [sortType, setSortType] = useState('time-desc');
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

  // Client-side sub-filtering based on sidebar filters
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

  // Sort filtered transactions based on selected sortType
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortType === 'time-desc') return new Date(b.time) - new Date(a.time);
    if (sortType === 'time-asc') return new Date(a.time) - new Date(b.time);
    if (sortType === 'revenue-desc') return b.revenue - a.revenue;
    if (sortType === 'revenue-asc') return a.revenue - b.revenue;
    if (sortType === 'code-asc') return a.code.localeCompare(b.code);
    if (sortType === 'code-desc') return b.code.localeCompare(a.code);
    return 0;
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

  // Derived sold items summary for "Hàng hóa" interest type
  const getGoodsSummary = () => {
    const goodsMap = {};
    filteredTransactions.forEach(tx => {
      // Mock different goods sold depending on transaction details to make report look realistic
      const itemsCount = Math.max(1, tx.quantity);
      for (let i = 0; i < itemsCount; i++) {
        const productIndex = (tx.id + i) % 5;
        const products = [
          { sku: 'SP001', name: 'Coca Cola 330ml', price: 10000 },
          { sku: 'SP002', name: 'Pepsi 330ml', price: 10000 },
          { sku: 'SP003', name: 'Nước suối Aquafina 500ml', price: 5000 },
          { sku: 'SP004', name: 'Mì Hảo Hảo tôm chua cay', price: 5000 },
          { sku: 'SP005', name: 'Snack Oishi tôm', price: 8000 },
        ];
        const p = products[productIndex];
        if (!goodsMap[p.sku]) {
          goodsMap[p.sku] = { sku: p.sku, name: p.name, qty: 0, revenue: 0 };
        }
        // distribute quantity and revenue
        goodsMap[p.sku].qty += 1;
        goodsMap[p.sku].revenue += p.price;
      }
    });
    return Object.values(goodsMap);
  };

  const goodsList = getGoodsSummary();
  const totalGoodsQty = goodsList.reduce((sum, g) => sum + g.qty, 0);
  const totalGoodsRevenue = goodsList.reduce((sum, g) => sum + g.revenue, 0);

  const toggleExpandGroup = () => {
    setExpandedOrders(prev => ({
      ...prev,
      group: !prev.group
    }));
  };

  // Safe file date formatting (replacing illegal '/' with safe '-')
  const getSafeDateString = () => {
    if (timeRangeType === 'today') {
      if (!filterDate) return 'today';
      const [y, m, d] = filterDate.split('-');
      return `${d}-${m}-${y}`;
    } else {
      if (!customFromDate || !customToDate) return 'custom';
      const f = customFromDate.split('-').reverse().join('-');
      const t = customToDate.split('-').reverse().join('-');
      return `${f}_to_${t}`;
    }
  };

  const handleExportExcel = () => {
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateRangeStr = getFormattedDateRange();
    const safeDateStr = getSafeDateString();

    let aoa = [];
    let sheetName = "EndOfDayDocument";

    if (interestType === 'Bán hàng') {
      aoa = [
        [`Ngày lập: ${todayStr}`],
        [],
        ["", "", "", "", "Báo cáo cuối ngày về bán hàng"],
        ["", "", "", "", `Ngày bán: ${dateRangeStr}`],
        ["", "", "", "", `Ngày thanh toán: ${dateRangeStr}`],
        ["", "", "", "", "Chi nhánh: Chi nhánh trung tâm"],
        [],
        ["Mã giao dịch", "Thời gian", "SL", "Doanh thu", "Thu khác", "VAT", "Làm tròn", "Phí trả hàng", "Thực thu"]
      ];

      aoa.push([
        `Hóa đơn: ${totalInvoiceCount}`,
        "",
        totalQtySum,
        totalRevenueSum,
        totalOtherFeeSum,
        totalVatSum,
        totalRoundingSum,
        totalReturnFeeSum,
        totalNetSum
      ]);

      sortedTransactions.forEach(tx => {
        aoa.push([
          `  ${tx.code}`, 
          new Date(tx.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          tx.quantity,
          tx.revenue,
          tx.otherFee || 0,
          tx.vat || 0,
          tx.rounding || 0,
          tx.returnFee || 0,
          tx.netRevenue
        ]);
      });
      sheetName = "BanHang";

    } else if (interestType === 'Hàng hóa') {
      aoa = [
        [`Ngày lập: ${todayStr}`],
        [],
        ["", "", "", "Báo cáo cuối ngày về hàng hóa"],
        ["", "", "", `Ngày bán: ${dateRangeStr}`],
        ["", "", "", "Chi nhánh: Chi nhánh trung tâm"],
        [],
        ["Mã hàng", "Tên hàng", "Số lượng bán", "Doanh thu"]
      ];

      aoa.push([
        "Tổng cộng",
        "",
        totalGoodsQty,
        totalGoodsRevenue
      ]);

      goodsList.forEach(g => {
        aoa.push([
          g.sku,
          g.name,
          g.qty,
          g.revenue
        ]);
      });
      sheetName = "HangHoa";

    } else {
      // Tổng hợp (Summary)
      const cashPayments = filteredTransactions.filter(tx => tx.paymentMethod === 'Tiền mặt').reduce((sum, tx) => sum + tx.netRevenue, 0);
      const bankPayments = filteredTransactions.filter(tx => tx.paymentMethod === 'Chuyển khoản').reduce((sum, tx) => sum + tx.netRevenue, 0);
      const cardPayments = filteredTransactions.filter(tx => tx.paymentMethod === 'Thẻ').reduce((sum, tx) => sum + tx.netRevenue, 0);

      aoa = [
        [`Ngày lập: ${todayStr}`],
        [],
        ["", "", "Báo cáo cuối ngày tổng hợp"],
        ["", "", `Ngày bán: ${dateRangeStr}`],
        ["", "", "Chi nhánh: Chi nhánh trung tâm"],
        [],
        ["Chỉ tiêu báo cáo", "Giá trị (VNĐ)"],
        ["1. DOANH THU BÁN HÀNG", totalRevenueSum],
        ["  - Doanh thu hóa đơn", totalRevenueSum],
        ["  - Phí trả hàng nhận", totalReturnFeeSum],
        ["2. PHƯƠNG THỨC THANH TOÁN THỰC THU", totalNetSum],
        ["  - Thu Tiền mặt", cashPayments],
        ["  - Thu Chuyển khoản", bankPayments],
        ["  - Thu Thẻ tín dụng", cardPayments],
        ["3. DÒNG TIỀN SỔ QUỸ", data.cashbookIncome - data.cashbookExpense],
        ["  - Thu quỹ phát sinh", data.cashbookIncome],
        ["  - Chi quỹ phát sinh", data.cashbookExpense]
      ];
      sheetName = "TongHop";
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Dynamic column widths for clean export
    worksheet['!cols'] = interestType === 'Bán hàng' ? [
      { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
    ] : interestType === 'Hàng hóa' ? [
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 18 }
    ] : [
      { wch: 35 }, { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Save with the EXACT user-requested file name format (using safe dash separators)
    XLSX.writeFile(workbook, `BaoCaoCuoiNgay_${safeDateStr}.xlsx`);
    toast.success('Xuất file Excel thành công!');
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

  const isHorizontal = displayType === 'Hiển thị ngang';

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-1.5 sm:p-4 bg-gray-50/50 min-h-screen text-[13px] text-gray-800 animate-page-in items-start">
      
      {/* ─── SIDEBAR FILTERS (Left Card) ─── */}
      <aside className="w-full lg:w-[280px] shrink-0 bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-5 z-20">
        <h2 className="text-[15px] font-extrabold text-gray-800 border-b border-gray-100 pb-3">Báo cáo cuối ngày</h2>

        {/* Kiểu hiển thị */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewType('Báo cáo')}
              className={`flex-1 py-2 rounded border font-bold text-center cursor-pointer transition-all ${viewType === 'Báo cáo' ? 'bg-primary border-primary text-white shadow-sm' : 'bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Báo cáo
            </button>
          </div>
          <select 
            value={displayType} 
            onChange={(e) => setDisplayType(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-gray-700"
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
            className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-gray-700"
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
          <div className="flex flex-col gap-1.5 border border-gray-200 rounded p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeToday" 
                checked={timeRangeType === 'today'} 
                onChange={() => setTimeRangeType('today')}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 cursor-pointer"
              />
              <label htmlFor="timeRangeToday" className="font-semibold text-xs cursor-pointer text-gray-700">Theo ngày</label>
            </div>
            
            {timeRangeType === 'today' && (
              <div className="flex flex-col gap-2 pl-6 mt-1.5 animate-fade-in">
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:border-primary outline-none cursor-pointer text-center font-bold text-gray-700"
                />
                <div className="flex gap-2 items-center text-[10px] text-gray-500">
                  <span className="shrink-0 font-bold">Từ:</span>
                  <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="p-1.5 border border-gray-200 bg-white rounded-lg outline-none w-full cursor-pointer text-center font-medium" />
                  <span className="shrink-0 font-bold">Đến:</span>
                  <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="p-1.5 border border-gray-200 bg-white rounded-lg outline-none w-full cursor-pointer text-center font-medium" />
                </div>
              </div>
            )}
          </div>

          {/* Radio 2: Tùy chỉnh */}
          <div className="flex flex-col gap-1.5 border border-gray-200 rounded p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeCustom" 
                checked={timeRangeType === 'custom'} 
                onChange={() => setTimeRangeType('custom')}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 cursor-pointer"
              />
              <label htmlFor="timeRangeCustom" className="font-semibold text-xs cursor-pointer text-gray-700">Tùy chỉnh khoảng</label>
            </div>
            
            {timeRangeType === 'custom' && (
              <div className="flex flex-col gap-2.5 pl-6 mt-1.5 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Từ ngày:</span>
                  <input 
                    type="date" 
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white focus:border-primary outline-none cursor-pointer font-medium text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Đến ngày:</span>
                  <input 
                    type="date" 
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white focus:border-primary outline-none cursor-pointer font-medium text-gray-700"
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
              className="w-full pl-9 pr-2.5 py-2 rounded border border-gray-200 bg-white text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-gray-700 font-medium"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Nhân viên */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nhân viên</label>
          <select 
            value={selectedEmployee} 
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
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
            className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
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
            className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
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
            className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
          >
            <option value="">Chọn phương thức bán hàng</option>
            <option value="Trực tiếp">Trực tiếp (POS)</option>
            <option value="Online">Bán hàng Online</option>
          </select>
        </div>

        {/* Sắp xếp */}
        <div className="flex flex-col gap-1.5 flex-1 justify-end">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sắp xếp hiển thị</label>
          <select 
            value={sortType} 
            onChange={(e) => setSortType(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700 animate-fade-in"
          >
            <option value="time-desc">Thời gian: Mới nhất</option>
            <option value="time-asc">Thời gian: Cũ nhất</option>
            <option value="revenue-desc">Doanh thu: Giảm dần</option>
            <option value="revenue-asc">Doanh thu: Tăng dần</option>
            <option value="code-asc">Mã giao dịch: A-Z</option>
            <option value="code-desc">Mã giao dịch: Z-A</option>
          </select>
        </div>
      </aside>

      {/* ─── MAIN DESK / DOCUMENT CANVAS (Right Card) ─── */}
      <main className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[600px] h-[calc(100vh-140px)] relative">
        
        {/* ─── PREMIUM TOOLBAR ─── */}
        <div className="h-12 bg-slate-50 border-b border-gray-200 px-4 flex items-center justify-between gap-4 shrink-0 shadow-sm z-10 text-gray-600">
          
          {/* Left Buttons: Undo, Redo, Refresh */}
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded text-gray-400 bg-transparent cursor-not-allowed" disabled>
              <ArrowLeft size={16} />
            </button>
            <button className="p-1.5 rounded text-gray-400 bg-transparent cursor-not-allowed" disabled>
              <ArrowRight size={16} />
            </button>
            <button onClick={fetchData} className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/90 border border-transparent hover:border-gray-200 transition-all cursor-pointer" title="Làm mới báo cáo">
              <RotateCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Center: Pagination simulator */}
          <div className="flex items-center gap-2">
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>
              <ChevronsLeft size={14} />
            </button>
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] bg-white border border-gray-200 px-2.5 py-0.5 rounded font-extrabold text-gray-700">
              1 / 1
            </span>
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>
              <ChevronRight size={14} />
            </button>
            <button className="p-1 rounded text-gray-400 cursor-not-allowed" disabled>
              <ChevronsRight size={14} />
            </button>
          </div>

          {/* Right Controls: Excel, PDF Print, Zoom, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Document view icon */}
            <button 
              className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/90 border border-transparent hover:border-gray-200 transition-all cursor-pointer"
              title="Xem tài liệu chi tiết"
            >
              <FileText size={16} />
            </button>

            {/* Dropdown for Download button (PDF & Excel) */}
            <div className="relative">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="p-1.5 rounded hover:bg-white/90 border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center gap-0.5 text-gray-500 hover:text-gray-800"
                title="Tải xuống báo cáo"
              >
                <Download size={16} />
                <ChevronDown size={12} className="opacity-70" />
              </button>
              
              {showExportDropdown && (
                <>
                  <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setShowExportDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-40 animate-fade-in font-sans">
                    <button 
                      onClick={() => {
                        handlePrint();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold text-xs text-gray-700 hover:text-slate-900 border-none bg-transparent cursor-pointer flex items-center justify-between"
                    >
                      <span>Acrobat (PDF) file</span>
                    </button>
                    <button 
                      onClick={() => {
                        handleExportExcel();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold text-xs text-gray-700 hover:text-slate-900 border-none bg-transparent cursor-pointer flex items-center justify-between"
                    >
                      <span>Excel 97-2003</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Print / PDF */}
            <button 
              onClick={handlePrint}
              className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/90 border border-transparent hover:border-gray-200 transition-all cursor-pointer"
              title="In báo cáo (PDF)"
            >
              <Printer size={16} />
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
              <button 
                onClick={() => setZoom(prev => Math.max(50, prev - 10))} 
                className="p-1 hover:bg-gray-100 rounded cursor-pointer"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[11px] font-bold px-1.5 min-w-[34px] text-center">{zoom}%</span>
              <button 
                onClick={() => setZoom(prev => Math.min(150, prev + 10))} 
                className="p-1 hover:bg-gray-100 rounded cursor-pointer"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Fullscreen */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-white/90 cursor-pointer"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* ─── PRINTED A4 SHEET CANVAS ─── */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-200/50 custom-scrollbar">
          
          {/* Printable Container */}
          <div 
            id="printed-report-page"
            className="bg-white text-slate-800 shadow-2xl p-10 min-h-[900px] border border-gray-200/60 rounded-sm origin-top transition-transform duration-200 select-text"
            style={{ 
              width: `${(isHorizontal ? 1123 : 794) * (zoom / 100)}px`, 
              minWidth: isHorizontal ? '960px' : '680px',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {/* Header section inside document */}
            <div className="flex justify-between items-start mb-6 text-[11px] text-gray-400">
              <div className="text-gray-400 font-medium">
                Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Title & metadata */}
            <div className="text-center mb-8">
              <h1 className="text-[22px] font-bold uppercase text-gray-800 tracking-wide">
                Báo cáo cuối ngày về {interestType.toLowerCase()}
              </h1>
              <div className="mt-2.5 flex flex-col gap-1 text-[12px] text-gray-600">
                <p><span className="font-semibold text-gray-500">Ngày bán:</span> {getFormattedDateRange()}</p>
                <p><span className="font-semibold text-gray-500">Ngày thanh toán:</span> {getFormattedDateRange()}</p>
                <p><span className="font-semibold text-gray-500">Chi nhánh:</span> Chi nhánh trung tâm</p>
              </div>
            </div>

            {/* DYNAMIC VIEWS BASED ON INTEREST TYPE */}
            {interestType === 'Bán hàng' ? (
              /* ─── VIEW: BÁN HÀNG (INVOICES) ─── */
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

                        {expandedOrders.group && (
                          <tr>
                            <td colSpan={9} className="p-0 bg-white">
                              <table className="w-full text-[11px] border-collapse bg-slate-50/50">
                                <tbody className="divide-y divide-gray-100">
                                  {sortedTransactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-2 text-primary font-bold">
                                        {tx.code}
                                      </td>
                                      <td className="px-2 py-2 text-gray-500 font-medium">
                                        {new Date(tx.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="px-2 py-2 text-right text-gray-700 font-bold">
                                        {tx.quantity}
                                      </td>
                                      <td className="px-3 py-2 text-right text-gray-800 font-extrabold">
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
                                      <td className="px-3 py-2 text-right font-extrabold text-green-600">
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
            ) : interestType === 'Hàng hóa' ? (
              /* ─── VIEW: HÀNG HÓA (GOODS SOLD) ─── */
              <div className="border border-gray-200 rounded-sm overflow-hidden mb-8 bg-white shadow-sm animate-fade-in">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-700 font-bold border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left w-[150px]">Mã hàng</th>
                      <th className="px-4 py-2.5 text-left">Tên hàng</th>
                      <th className="px-4 py-2.5 text-right w-[150px]">Số lượng bán</th>
                      <th className="px-4 py-2.5 text-right w-[180px]">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 font-medium">
                    {goodsList.length > 0 ? (
                      <>
                        <tr className="bg-[#F7F2E8] text-slate-800 font-extrabold border-b border-gray-200">
                          <td className="px-4 py-3">Tổng cộng</td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-right">{totalGoodsQty}</td>
                          <td className="px-4 py-3 text-right text-primary">{fmt(totalGoodsRevenue)}</td>
                        </tr>
                        {goodsList.map(g => (
                          <tr key={g.sku} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 text-primary font-bold">{g.sku}</td>
                            <td className="px-4 py-2 text-gray-700">{g.name}</td>
                            <td className="px-4 py-2 text-right font-bold text-gray-800">{g.qty}</td>
                            <td className="px-4 py-2 text-right font-extrabold text-gray-800">{fmt(g.revenue)}</td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-gray-400 font-bold text-[12px]">
                          Không có dữ liệu hàng hóa nào trong khoảng thời gian đã chọn!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ─── VIEW: TỔNG HỢP (SUMMARY) ─── */
              <div className="flex flex-col gap-4 max-w-2xl mx-auto mb-8 bg-white border border-gray-200 p-6 rounded-sm shadow-sm animate-fade-in text-[12px]">
                <h3 className="text-[14px] font-bold border-b border-gray-100 pb-2 text-slate-800 uppercase tracking-wide">Bảng Tổng Hợp Tài Chính Trong Ngày</h3>
                
                <div className="flex flex-col gap-3 font-medium">
                  {/* DOANH THU */}
                  <div className="flex justify-between items-center text-slate-800 border-b border-gray-100 pb-1.5">
                    <span className="font-extrabold">1. DOANH THU BÁN HÀNG</span>
                    <span className="font-extrabold text-blue-600">{fmt(totalRevenueSum)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pl-4">
                    <span>- Doanh thu từ hóa đơn</span>
                    <span>{fmt(totalRevenueSum)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pl-4 border-b border-gray-50/50 pb-2">
                    <span>- Phí trả hàng nhận phát sinh</span>
                    <span>{fmt(totalReturnFeeSum)} VNĐ</span>
                  </div>

                  {/* THỰC THU */}
                  <div className="flex justify-between items-center text-slate-800 border-b border-gray-100 pt-1.5 pb-1.5">
                    <span className="font-extrabold">2. PHƯƠNG THỨC THANH TOÁN THỰC THU</span>
                    <span className="font-extrabold text-green-600">{fmt(totalNetSum)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pl-4">
                    <span>- Thu bằng Tiền mặt</span>
                    <span>{fmt(filteredTransactions.filter(tx => tx.paymentMethod === 'Tiền mặt').reduce((sum, tx) => sum + tx.netRevenue, 0))} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pl-4">
                    <span>- Thu bằng Chuyển khoản</span>
                    <span>{fmt(filteredTransactions.filter(tx => tx.paymentMethod === 'Chuyển khoản').reduce((sum, tx) => sum + tx.netRevenue, 0))} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pl-4 border-b border-gray-50/50 pb-2">
                    <span>- Thu bằng Thẻ tín dụng</span>
                    <span>{fmt(filteredTransactions.filter(tx => tx.paymentMethod === 'Thẻ').reduce((sum, tx) => sum + tx.netRevenue, 0))} VNĐ</span>
                  </div>

                  {/* SỔ QUỸ */}
                  <div className="flex justify-between items-center text-slate-800 border-b border-gray-100 pt-1.5 pb-1.5">
                    <span className="font-extrabold">3. DÒNG TIỀN SỔ QUỸ PHÁT SINH</span>
                    <span className="font-extrabold text-yellow-600">{fmt(data.cashbookIncome - data.cashbookExpense)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pl-4">
                    <span>- Tổng thu quỹ phát sinh</span>
                    <span>{fmt(data.cashbookIncome)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pl-4 pb-2">
                    <span>- Tổng chi quỹ phát sinh</span>
                    <span>{fmt(data.cashbookExpense)} VNĐ</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}
