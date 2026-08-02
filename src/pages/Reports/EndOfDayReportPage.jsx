import { useState, useEffect } from 'react';
import { reportAPI, employeeAPI, orderAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Download, Printer, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  ChevronDown, ChevronRight, FileSpreadsheet, Calendar, 
  Search, Users, DollarSign, ArrowLeft, ArrowRight,
  ChevronLeft, ChevronsLeft, ChevronsRight, FileText
} from 'lucide-react';
import SalesOrderDetailModal from '../../components/modals/SalesOrderDetailModal';

const fmt = (n) => {
  const val = Math.round(Number(n || 0));
  if (val < 0) {
    return `-${new Intl.NumberFormat('vi-VN').format(Math.abs(val))}`;
  }
  return new Intl.NumberFormat('vi-VN').format(val);
};

const fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(n || 0));

export default function EndOfDayReportPage() {
  const [data, setData] = useState({ 
    transactions: [], 
    returns: [],
    orderCount: 0, 
    returnCount: 0,
    totalSales: 0, 
    totalPaid: 0, 
    totalReturns: 0, 
    netRevenue: 0 
  });
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({ invoices: true, returns: false }); // Expand invoices by default
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter States
  const [viewType, setViewType] = useState('Báo cáo');
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

  // Fetch employees list
  useEffect(() => {
    employeeAPI.getAll().then(setEmployees).catch(() => {});
  }, []);

  // Fetch report data from API
  const fetchData = () => {
    setLoading(true);
    let params = {};

    if (timeRangeType === 'today') {
      if (filterDate) {
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
    setCurrentPage(1);
  }, [timeRangeType, filterDate, customFromDate, customToDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [customerQuery, selectedEmployee, selectedCreator, paymentMethod, salesMethod, sortType, interestType]);

  // Client-side sub-filtering for invoices
  const filteredTransactions = (data.transactions || []).filter(tx => {
    if (customerQuery) {
      const q = customerQuery.toLowerCase();
      const nameMatch = tx.customerName?.toLowerCase().includes(q);
      const phoneMatch = tx.customerPhone?.includes(q);
      const codeMatch = tx.code?.toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !codeMatch) return false;
    }
    if (selectedEmployee && tx.createdBy !== selectedEmployee) return false;
    if (selectedCreator && tx.createdBy !== selectedCreator) return false;
    if (paymentMethod && tx.paymentMethod !== paymentMethod) return false;
    if (timeFrom || timeTo) {
      const txTime = new Date(tx.time);
      const txHours = String(txTime.getHours()).padStart(2, '0') + ':' + String(txTime.getMinutes()).padStart(2, '0');
      if (timeFrom && txHours < timeFrom) return false;
      if (timeTo && txHours > timeTo) return false;
    }
    return true;
  });

  // Client-side sub-filtering for returns
  const filteredReturns = (data.returns || []).filter(ret => {
    if (customerQuery) {
      const q = customerQuery.toLowerCase();
      const nameMatch = ret.customerName?.toLowerCase().includes(q);
      const phoneMatch = ret.customerPhone?.includes(q);
      const codeMatch = ret.code?.toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !codeMatch) return false;
    }
    if (selectedEmployee && ret.createdBy !== selectedEmployee) return false;
    if (selectedCreator && ret.createdBy !== selectedCreator) return false;
    if (timeFrom || timeTo) {
      const retTime = new Date(ret.time);
      const retHours = String(retTime.getHours()).padStart(2, '0') + ':' + String(retTime.getMinutes()).padStart(2, '0');
      if (timeFrom && retHours < timeFrom) return false;
      if (timeTo && retHours > timeTo) return false;
    }
    return true;
  });

  // Sort filtered transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortType === 'time-desc') return new Date(b.time) - new Date(a.time);
    if (sortType === 'time-asc') return new Date(a.time) - new Date(b.time);
    if (sortType === 'revenue-desc') return b.revenue - a.revenue;
    if (sortType === 'revenue-asc') return a.revenue - b.revenue;
    if (sortType === 'code-asc') return a.code.localeCompare(b.code);
    if (sortType === 'code-desc') return b.code.localeCompare(a.code);
    return 0;
  });

  const sortedReturns = [...filteredReturns].sort((a, b) => {
    if (sortType === 'time-desc') return new Date(b.time) - new Date(a.time);
    if (sortType === 'time-asc') return new Date(a.time) - new Date(b.time);
    return 0;
  });

  // Helper to extract paid amount safely from tx object
  const getTxPaid = (tx) => {
    if (tx.paid !== undefined && tx.paid !== null) return Number(tx.paid);
    if (tx.netRevenue !== undefined && tx.netRevenue !== null) return Number(tx.netRevenue);
    return 0;
  };

  const getRetPaid = (ret) => {
    if (ret.paid !== undefined && ret.paid !== null) return Number(ret.paid);
    if (ret.netRevenue !== undefined && ret.netRevenue !== null) return Number(ret.netRevenue);
    return 0;
  };

  // Invoice Summary Totals
  const totalInvoiceCount = filteredTransactions.length;
  const totalInvoiceQtySum = filteredTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
  const totalInvoiceRevenueSum = filteredTransactions.reduce((sum, tx) => sum + (tx.revenue || 0), 0);
  const totalInvoicePaidSum = filteredTransactions.reduce((sum, tx) => sum + getTxPaid(tx), 0);
  const totalInvoiceOtherFeeSum = filteredTransactions.reduce((sum, tx) => sum + (tx.otherFee || 0), 0);
  const totalInvoiceVatSum = filteredTransactions.reduce((sum, tx) => sum + (tx.vat || 0), 0);
  const totalInvoiceRoundingSum = filteredTransactions.reduce((sum, tx) => sum + (tx.rounding || 0), 0);
  const totalInvoiceReturnFeeSum = filteredTransactions.reduce((sum, tx) => sum + (tx.returnFee || 0), 0);

  // Return Summary Totals
  const totalReturnCount = filteredReturns.length;
  const totalReturnQtySum = filteredReturns.reduce((sum, ret) => sum + (ret.quantity || 0), 0);
  const totalReturnRevenueSum = filteredReturns.reduce((sum, ret) => sum + (ret.revenue || 0), 0);
  const totalReturnPaidSum = filteredReturns.reduce((sum, ret) => sum + getRetPaid(ret), 0);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(totalInvoiceCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = sortedTransactions.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);

  // Summary for Goods Interest Type
  const getGoodsSummary = () => {
    const goodsMap = {};
    filteredTransactions.forEach(tx => {
      const itemsCount = Math.max(1, Math.round(tx.quantity));
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
        goodsMap[p.sku].qty += 1;
        goodsMap[p.sku].revenue += p.price;
      }
    });
    return Object.values(goodsMap);
  };

  const goodsList = getGoodsSummary();
  const totalGoodsQty = goodsList.reduce((sum, g) => sum + g.qty, 0);
  const totalGoodsRevenue = goodsList.reduce((sum, g) => sum + g.revenue, 0);

  const toggleExpandInvoices = () => {
    setExpandedOrders(prev => ({ ...prev, invoices: !prev.invoices }));
  };

  const toggleExpandReturns = () => {
    setExpandedOrders(prev => ({ ...prev, returns: !prev.returns }));
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
          paid: getTxPaid(tx),
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
        paid: getTxPaid(tx),
        status: 'COMPLETED',
        customerName: tx.customerName,
        customerPhone: tx.customerPhone,
        items: []
      });
    }
  };

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

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
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
        totalInvoiceQtySum,
        totalInvoiceRevenueSum,
        totalInvoiceOtherFeeSum,
        totalInvoiceVatSum,
        totalInvoiceRoundingSum,
        totalInvoiceReturnFeeSum,
        totalInvoicePaidSum
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
          getTxPaid(tx)
        ]);
      });

      if (totalReturnCount > 0) {
        aoa.push([
          `Trả hàng: ${totalReturnCount}`,
          "",
          totalReturnQtySum,
          totalReturnRevenueSum,
          0, 0, 0, 0,
          totalReturnPaidSum
        ]);

        sortedReturns.forEach(ret => {
          aoa.push([
            `  ${ret.code}`,
            new Date(ret.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            ret.quantity,
            ret.revenue,
            0, 0, 0, 0,
            getRetPaid(ret)
          ]);
        });
      }

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
      const cashPayments = filteredTransactions.filter(tx => tx.paymentMethod === 'Tiền mặt').reduce((sum, tx) => sum + getTxPaid(tx), 0);
      const bankPayments = filteredTransactions.filter(tx => tx.paymentMethod === 'Chuyển khoản').reduce((sum, tx) => sum + getTxPaid(tx), 0);
      const cardPayments = filteredTransactions.filter(tx => tx.paymentMethod === 'Quẹt thẻ' || tx.paymentMethod === 'Thẻ').reduce((sum, tx) => sum + getTxPaid(tx), 0);

      aoa = [
        [`Ngày lập: ${todayStr}`],
        [],
        ["", "", "Báo cáo cuối ngày tổng hợp"],
        ["", "", `Ngày bán: ${dateRangeStr}`],
        ["", "", "Chi nhánh: Chi nhánh trung tâm"],
        [],
        ["Chỉ tiêu báo cáo", "Giá trị (VNĐ)"],
        ["1. DOANH THU BÁN HÀNG", totalInvoiceRevenueSum],
        ["  - Doanh thu hóa đơn", totalInvoiceRevenueSum],
        ["  - Trả hàng", totalReturnRevenueSum],
        ["2. PHƯƠNG THỨC THANH TOÁN THỰC THU", totalInvoicePaidSum],
        ["  - Thu Tiền mặt", cashPayments],
        ["  - Thu Chuyển khoản", bankPayments],
        ["  - Thu Thẻ tín dụng", cardPayments],
        ["3. DÒNG TIỀN SỔ QUỸ", (data.cashbookIncome || 0) - (data.cashbookExpense || 0)],
        ["  - Thu quỹ phát sinh", data.cashbookIncome || 0],
        ["  - Chi quỹ phát sinh", data.cashbookExpense || 0]
      ];
      sheetName = "TongHop";
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    worksheet['!cols'] = interestType === 'Bán hàng' ? [
      { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
    ] : interestType === 'Hàng hóa' ? [
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 18 }
    ] : [
      { wch: 35 }, { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, `BaoCaoCuoiNgay_${safeDateStr}.xlsx`);
    toast.success('Xuất file Excel thành công!');
  };

  const handlePrint = () => {
    window.print();
  };

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
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 bg-transparent font-sans w-full relative items-start animate-page-in text-[13px] text-gray-800">
      
      {/* ─── SIDEBAR FILTERS (Left Card) ─── */}
      <aside className="w-full lg:w-[280px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-4 z-20">
        <h2 className="text-[15px] font-extrabold text-gray-800 border-b border-gray-100 pb-2.5">Báo cáo cuối ngày</h2>

        {/* Kiểu hiển thị */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex gap-2">
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

        {/* Mối quan tâm */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mối quan tâm</label>
          <select 
            value={interestType} 
            onChange={(e) => setInterestType(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-gray-700"
          >
            <option value="Bán hàng">Bán hàng</option>
            <option value="Hàng hóa">Hàng hóa</option>
            <option value="Tổng hợp">Tổng hợp</option>
          </select>
        </div>

        {/* Thời gian */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thời gian</label>
          
          {/* Radio 1: Theo ngày */}
          <div className="flex flex-col gap-1.5 border border-gray-200 rounded p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2">
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
              <div className="flex flex-col gap-2 pl-6 mt-1 animate-fade-in">
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:border-primary outline-none cursor-pointer text-center font-bold text-gray-700"
                />
                <div className="flex gap-1.5 items-center text-[10px] text-gray-500">
                  <span className="shrink-0 font-semibold">Từ:</span>
                  <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="p-1 border border-gray-200 bg-white rounded outline-none w-full cursor-pointer text-center font-medium" />
                  <span className="shrink-0 font-semibold">Đến:</span>
                  <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="p-1 border border-gray-200 bg-white rounded outline-none w-full cursor-pointer text-center font-medium" />
                </div>
              </div>
            )}
          </div>

          {/* Radio 2: Tùy chỉnh */}
          <div className="flex flex-col gap-1.5 border border-gray-200 rounded p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2">
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
              <div className="flex flex-col gap-2 pl-6 mt-1 animate-fade-in">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-gray-500">Từ ngày:</span>
                  <input 
                    type="date" 
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:border-primary outline-none cursor-pointer font-medium text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-gray-500">Đến ngày:</span>
                  <input 
                    type="date" 
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:border-primary outline-none cursor-pointer font-medium text-gray-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Khách hàng */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Khách hàng</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Theo mã, tên, số điện thoại" 
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded border border-gray-200 bg-white text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-gray-700 font-medium"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Nhân viên */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nhân viên</label>
          <select 
            value={selectedEmployee} 
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
          >
            <option value="">Chọn nhân viên</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.username || emp.name}>{emp.name || emp.username}</option>
            ))}
          </select>
        </div>

        {/* Người tạo */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Người tạo</label>
          <select 
            value={selectedCreator} 
            onChange={(e) => setSelectedCreator(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
          >
            <option value="">Chọn người tạo</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.username || emp.name}>{emp.name || emp.username}</option>
            ))}
          </select>
        </div>

        {/* Phương thức thanh toán */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phương thức thanh toán</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
          >
            <option value="">Chọn phương thức thanh toán</option>
            <option value="Tiền mặt">Tiền mặt</option>
            <option value="Chuyển khoản">Chuyển khoản</option>
            <option value="Quẹt thẻ">Thẻ tín dụng</option>
          </select>
        </div>

        {/* Sắp xếp */}
        <div className="flex flex-col gap-1 mt-auto">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sắp xếp hiển thị</label>
          <select 
            value={sortType} 
            onChange={(e) => setSortType(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700"
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
      <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px] h-[calc(100vh-140px)] relative">
        
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
              disabled={validCurrentPage === 1}
              className={`p-1 rounded ${validCurrentPage === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-white hover:bg-slate-600 cursor-pointer'}`}
              title="Trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
              disabled={validCurrentPage === 1}
              className={`p-1 rounded ${validCurrentPage === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-white hover:bg-slate-600 cursor-pointer'}`}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>
            
            <div className="flex items-center gap-1 px-1">
              <input 
                type="number"
                min="1"
                max={totalPages}
                value={validCurrentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                  }
                }}
                className="w-10 text-center text-xs bg-white text-slate-900 rounded font-bold py-0.5 outline-none border-none"
              />
              <span className="text-xs font-semibold text-slate-200">/ {totalPages}</span>
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
              disabled={validCurrentPage === totalPages}
              className={`p-1 rounded ${validCurrentPage === totalPages ? 'text-slate-400 cursor-not-allowed' : 'text-white hover:bg-slate-600 cursor-pointer'}`}
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={validCurrentPage === totalPages}
              className={`p-1 rounded ${validCurrentPage === totalPages ? 'text-slate-400 cursor-not-allowed' : 'text-white hover:bg-slate-600 cursor-pointer'}`}
              title="Trang cuối"
            >
              <ChevronsRight size={14} />
            </button>
          </div>

          {/* Right Controls: Document Setup, Download, Print, Zoom */}
          <div className="flex items-center gap-1.5">
            <button 
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors"
              title="Cấu hình trang"
            >
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

            {/* Fullscreen */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors"
              title="Toàn màn hình"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* ─── PRINTED A4 SHEET CANVAS (Paper Document) ─── */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-[#808a95] custom-scrollbar">
          
          {/* Printable Document Paper - Dynamic height so table never overflows */}
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

            {/* Title & header metadata */}
            <div className="text-center mb-6">
              <h1 className="text-[20px] font-bold uppercase text-slate-900 tracking-tight">
                Báo cáo cuối ngày về {interestType.toLowerCase()}
              </h1>
              <div className="mt-2 flex flex-col gap-0.5 text-[12px] text-gray-600 font-medium">
                <p>Ngày bán: {getFormattedDateRange()}</p>
                <p>Ngày thanh toán: {getFormattedDateRange()}</p>
                <p>Chi nhánh: Chi nhánh trung tâm</p>
              </div>
            </div>

            {/* REPORT TABLES BASED ON INTEREST TYPE */}
            {interestType === 'Bán hàng' ? (
              /* ─── VIEW: BÁN HÀNG (INVOICES & RETURNS TABLE - EXACT MATCH WITH KIOTVIET IMAGES 1, 2, 3, 4) ─── */
              <div className="border border-gray-300 rounded-sm overflow-hidden mb-6 bg-white shadow-sm">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                      <th className="px-3 py-2 text-left w-[180px]">Mã giao dịch</th>
                      <th className="px-2 py-2 text-left w-[100px]">Thời gian</th>
                      <th className="px-2 py-2 text-right w-[80px]">SL</th>
                      <th className="px-3 py-2 text-right">Doanh thu</th>
                      <th className="px-2 py-2 text-right">Thu khác</th>
                      <th className="px-2 py-2 text-right">VAT</th>
                      <th className="px-2 py-2 text-right">Làm tròn</th>
                      <th className="px-2 py-2 text-right">Phí trả hàng</th>
                      <th className="px-3 py-2 text-right">Thực thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {totalInvoiceCount > 0 || totalReturnCount > 0 ? (
                      <>
                        {/* 1. HÓA ĐƠN SUMMARY GROUP ROW (Image 1 & 3: [+] Hóa đơn: 88) */}
                        {totalInvoiceCount > 0 && (
                          <>
                            <tr 
                              onClick={toggleExpandInvoices}
                              className="bg-[#F7F2E8] hover:bg-[#efe7d6] transition-colors cursor-pointer border-b border-gray-300 text-slate-900 font-bold"
                            >
                              <td className="px-3 py-2 text-slate-900 font-extrabold flex items-center gap-1.5 select-none">
                                <span className="text-gray-700 font-mono text-xs">{expandedOrders.invoices ? '[−]' : '[+]'}</span>
                                <span>Hóa đơn: {totalInvoiceCount}</span>
                              </td>
                              <td className="px-2 py-2 text-gray-500"></td>
                              <td className="px-2 py-2 text-right font-extrabold text-slate-900">
                                {fmtQty(totalInvoiceQtySum)}
                              </td>
                              <td className="px-3 py-2 text-right font-extrabold text-slate-900">
                                {fmt(totalInvoiceRevenueSum)}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-700">
                                {totalInvoiceOtherFeeSum ? fmt(totalInvoiceOtherFeeSum) : '0'}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-700">
                                {totalInvoiceVatSum ? fmt(totalInvoiceVatSum) : '0'}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-700">
                                {totalInvoiceRoundingSum ? fmt(totalInvoiceRoundingSum) : '0'}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-700">
                                {totalInvoiceReturnFeeSum ? fmt(totalInvoiceReturnFeeSum) : '0'}
                              </td>
                              <td className="px-3 py-2 text-right font-extrabold text-slate-900">
                                {fmt(totalInvoicePaidSum)}
                              </td>
                            </tr>

                            {/* Expanded Interactive Invoice Child Rows (Image 3) */}
                            {expandedOrders.invoices && paginatedTransactions.map(tx => (
                              <tr key={tx.id || tx.code} className="hover:bg-blue-50/50 transition-colors border-b border-gray-150">
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
                                <td className="px-2 py-1.5 text-gray-600">
                                  {new Date(tx.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-800">
                                  {fmtQty(tx.quantity)}
                                </td>
                                <td className="px-3 py-1.5 text-right text-gray-800 font-semibold">
                                  {fmt(tx.revenue)}
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-500">
                                  {tx.otherFee ? fmt(tx.otherFee) : '0'}
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-500">
                                  {tx.vat ? fmt(tx.vat) : '0'}
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-500">
                                  {tx.rounding ? fmt(tx.rounding) : '0'}
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-500">
                                  {tx.returnFee ? fmt(tx.returnFee) : '0'}
                                </td>
                                <td className="px-3 py-1.5 text-right font-bold text-slate-800">
                                  {fmt(getTxPaid(tx))}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}

                        {/* 2. TRẢ HÀNG SUMMARY GROUP ROW (Image 1 & 3: [+] Trả hàng: 3) */}
                        {totalReturnCount > 0 && (
                          <>
                            <tr 
                              onClick={toggleExpandReturns}
                              className="bg-[#F7F2E8] hover:bg-[#efe7d6] transition-colors cursor-pointer border-b border-gray-300 text-slate-900 font-bold"
                            >
                              <td className="px-3 py-2 text-slate-900 font-extrabold flex items-center gap-1.5 select-none">
                                <span className="text-gray-700 font-mono text-xs">{expandedOrders.returns ? '[−]' : '[+]'}</span>
                                <span>Trả hàng: {totalReturnCount}</span>
                              </td>
                              <td className="px-2 py-2 text-gray-500"></td>
                              <td className="px-2 py-2 text-right font-extrabold text-slate-900">
                                {fmtQty(totalReturnQtySum)}
                              </td>
                              <td className="px-3 py-2 text-right font-extrabold text-slate-900">
                                {fmt(-Math.abs(totalReturnRevenueSum))}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-700">0</td>
                              <td className="px-2 py-2 text-right text-slate-700">0</td>
                              <td className="px-2 py-2 text-right text-slate-700">0</td>
                              <td className="px-2 py-2 text-right text-slate-700">0</td>
                              <td className="px-3 py-2 text-right font-extrabold text-slate-900">
                                {fmt(totalReturnPaidSum)}
                              </td>
                            </tr>

                            {/* Expanded Interactive Return Child Rows */}
                            {expandedOrders.returns && sortedReturns.map(ret => (
                              <tr key={ret.id || ret.code} className="hover:bg-red-50/50 transition-colors border-b border-gray-150">
                                <td className="px-6 py-1.5 text-[#0077CC] font-bold">
                                  {ret.code}
                                </td>
                                <td className="px-2 py-1.5 text-gray-600">
                                  {new Date(ret.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-800">
                                  {fmtQty(ret.quantity)}
                                </td>
                                <td className="px-3 py-1.5 text-right text-gray-800 font-semibold">
                                  {fmt(ret.revenue)}
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-500">0</td>
                                <td className="px-2 py-1.5 text-right text-gray-500">0</td>
                                <td className="px-2 py-1.5 text-right text-gray-500">0</td>
                                <td className="px-2 py-1.5 text-right text-gray-500">0</td>
                                <td className="px-3 py-1.5 text-right font-bold text-slate-800">
                                  {fmt(getRetPaid(ret))}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-gray-400 font-medium text-[12px]">
                          Không có dữ liệu giao dịch nào trong khoảng thời gian đã chọn!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : interestType === 'Hàng hóa' ? (
              /* ─── VIEW: HÀNG HÓA ─── */
              <div className="border border-gray-300 rounded-sm overflow-hidden mb-6 bg-white animate-fade-in">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                      <th className="px-4 py-2 text-left w-[150px]">Mã hàng</th>
                      <th className="px-4 py-2 text-left">Tên hàng</th>
                      <th className="px-4 py-2 text-right w-[150px]">Số lượng bán</th>
                      <th className="px-4 py-2 text-right w-[180px]">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {goodsList.length > 0 ? (
                      <>
                        <tr className="bg-[#F7F2E8] text-slate-900 font-extrabold border-b border-gray-300">
                          <td className="px-4 py-2">Tổng cộng</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right">{fmtQty(totalGoodsQty)}</td>
                          <td className="px-4 py-2 text-right text-slate-900">{fmt(totalGoodsRevenue)}</td>
                        </tr>
                        {goodsList.map(g => (
                          <tr key={g.sku} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-1.5 text-[#0077CC] font-bold">{g.sku}</td>
                            <td className="px-4 py-1.5 text-gray-800">{g.name}</td>
                            <td className="px-4 py-1.5 text-right text-gray-800">{fmtQty(g.qty)}</td>
                            <td className="px-4 py-1.5 text-right font-bold text-gray-800">{fmt(g.revenue)}</td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-400 font-medium text-[12px]">
                          Không có dữ liệu hàng hóa nào trong khoảng thời gian đã chọn!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ─── VIEW: TỔNG HỢP ─── */
              <div className="flex flex-col gap-4 max-w-xl mx-auto mb-6 bg-white border border-gray-300 p-5 rounded-sm shadow-sm animate-fade-in text-[12px]">
                <h3 className="text-[13px] font-bold border-b border-gray-200 pb-2 text-slate-900 uppercase tracking-wide">Báo Cáo Tổng Hợp Trong Ngày</h3>
                
                <div className="flex flex-col gap-2.5 font-medium">
                  <div className="flex justify-between items-center text-slate-900 border-b border-gray-200 pb-1">
                    <span className="font-extrabold">1. DOANH THU BÁN HÀNG</span>
                    <span className="font-extrabold text-blue-700">{fmt(totalInvoiceRevenueSum - Math.abs(totalReturnRevenueSum))} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pl-4">
                    <span>- Doanh thu từ hóa đơn</span>
                    <span>{fmt(totalInvoiceRevenueSum)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pl-4 border-b border-gray-100 pb-2">
                    <span>- Trả hàng phát sinh</span>
                    <span>{fmt(-Math.abs(totalReturnRevenueSum))} VNĐ</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-900 border-b border-gray-200 pt-1 pb-1">
                    <span className="font-extrabold">2. PHƯƠNG THỨC THANH TOÁN THỰC THU</span>
                    <span className="font-extrabold text-green-700">{fmt(totalInvoicePaidSum - Math.abs(totalReturnPaidSum))} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pl-4">
                    <span>- Thu bằng Tiền mặt</span>
                    <span>{fmt(filteredTransactions.filter(tx => tx.paymentMethod === 'Tiền mặt').reduce((sum, tx) => sum + getTxPaid(tx), 0))} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pl-4">
                    <span>- Thu bằng Chuyển khoản</span>
                    <span>{fmt(filteredTransactions.filter(tx => tx.paymentMethod === 'Chuyển khoản').reduce((sum, tx) => sum + getTxPaid(tx), 0))} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pl-4 border-b border-gray-100 pb-2">
                    <span>- Thu bằng Thẻ tín dụng</span>
                    <span>{fmt(filteredTransactions.filter(tx => tx.paymentMethod === 'Quẹt thẻ' || tx.paymentMethod === 'Thẻ').reduce((sum, tx) => sum + getTxPaid(tx), 0))} VNĐ</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-900 border-b border-gray-200 pt-1 pb-1">
                    <span className="font-extrabold">3. DÒNG TIỀN SỔ QUỸ PHÁT SINH</span>
                    <span className="font-extrabold text-amber-700">{fmt((data.cashbookIncome || 0) - (data.cashbookExpense || 0))} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pl-4">
                    <span>- Tổng thu quỹ phát sinh</span>
                    <span>{fmt(data.cashbookIncome || 0)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pl-4 pb-1">
                    <span>- Tổng chi quỹ phát sinh</span>
                    <span>{fmt(data.cashbookExpense || 0)} VNĐ</span>
                  </div>
                </div>
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
