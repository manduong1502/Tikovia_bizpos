import React, { useState, useEffect, useMemo, useRef } from 'react';
import { reportAPI, employeeAPI, orderAPI } from '../../services/api';
import PortalPopover from '../../components/ui/PortalPopover';
import SalesOrderDetailModal from '../../components/modals/SalesOrderDetailModal';
import toast from 'react-hot-toast';
import { 
  Download, Printer, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  ChevronDown, Search, ArrowLeft, ArrowRight, Clock, Calendar,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Info, Filter
} from 'lucide-react';
import { 
  formatWorkingHoursDateTime, 
  formatWorkingHoursTime, 
  getWorkingHoursYMD, 
  getWorkingHoursDMY 
} from '../../utils/dateFilterUtils';

const fmt = (n) => {
  const val = Math.round(Number(n || 0));
  if (val < 0) {
    return `-${new Intl.NumberFormat('vi-VN').format(Math.abs(val))}`;
  }
  return new Intl.NumberFormat('vi-VN').format(val);
};

const fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(n || 0));

function formatDateVN(d) {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateYMD(d) {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export default function EndOfDayReportPage() {
  const [data, setData] = useState({ 
    transactions: [], 
    returns: [],
    cashbook: [],
    productsSummary: [],
    orderCount: 0, 
    returnCount: 0,
    totalSales: 0, 
    totalPaid: 0, 
    totalReturns: 0, 
    totalReturnPaid: 0,
    cashbookIncome: 0,
    cashbookExpense: 0,
    netRevenue: 0 
  });
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({ invoices: true, returns: false });
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Pagination State inside Document Toolbar (Default 1000 to display all invoices of the day)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);

  // Filter States - Matching KiotViet 100%
  const [viewType, setViewType] = useState('Báo cáo');
  const [displayType, setDisplayType] = useState('Hiển thị dọc'); // Hiển thị dọc / Hiển thị ngang
  const [interestType, setInterestType] = useState('Bán hàng'); // Bán hàng, Thu chi, Hàng hóa, Tổng hợp
  
  // Date & Time Filter States (Exact KiotViet UI)
  const [timeRangeType, setTimeRangeType] = useState('date'); // 'date' (Theo ngày) | 'custom' (Tùy chỉnh)
  const [selectedSingleDate, setSelectedSingleDate] = useState(new Date());
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [openSingleCal, setOpenSingleCal] = useState(false);
  const singleDateRef = useRef(null);

  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  
  // Custom Range State (Matching KiotViet Dual Calendar Popover)
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState(new Date());
  const [rangeEndDate, setRangeEndDate] = useState(new Date());
  const [leftCalMonth, setLeftCalMonth] = useState(new Date());
  const [rightCalMonth, setRightCalMonth] = useState(new Date());
  const [openCustomCal, setOpenCustomCal] = useState(false);
  const customDateRef = useRef(null);

  const [taxMode, setTaxMode] = useState('without'); // without (Chưa bao gồm thuế) | with (Đã bao gồm thuế)
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  const [employees, setEmployees] = useState([]);

  // Fetch employees list
  useEffect(() => {
    employeeAPI.getAll().then(setEmployees).catch(() => {});
  }, []);

  // Fetch report data from API
  const fetchData = () => {
    setLoading(true);
    let params = {};

    if (timeRangeType === 'date') {
      const d = new Date(selectedSingleDate);
      const prevDay = new Date(d); prevDay.setDate(prevDay.getDate() - 1);
      const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
      params.fromDate = formatDateYMD(prevDay);
      params.toDate = formatDateYMD(nextDay);
      params.date = formatDateYMD(selectedSingleDate);
    } else {
      if (customFromDate) {
        const d = new Date(customFromDate);
        const prevDay = new Date(d); prevDay.setDate(prevDay.getDate() - 1);
        params.fromDate = formatDateYMD(prevDay);
      }
      if (customToDate) {
        const d = new Date(customToDate);
        const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
        params.toDate = formatDateYMD(nextDay);
      }
    }

    reportAPI.getEndOfDay(params)
      .then(res => {
        if (res) {
          setData(res);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching end of day report:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [timeRangeType, selectedSingleDate, customFromDate, customToDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [customerQuery, selectedEmployee, selectedCreator, paymentMethodFilter, interestType, displayType]);

  // Client-side filtering for invoices matching exact working hours date & time
  const filteredTransactions = useMemo(() => {
    const targetYMD = formatDateYMD(selectedSingleDate);

    return (data.transactions || []).filter(tx => {
      const txYMD = getWorkingHoursYMD(tx.time || tx.createdAt || tx.date);
      const txTimeStr = formatWorkingHoursTime(tx.time || tx.createdAt || tx.date);

      // 1. Date Filter
      if (timeRangeType === 'date') {
        if (txYMD !== targetYMD) return false;
      } else {
        if (customFromDate && txYMD < customFromDate) return false;
        if (customToDate && txYMD > customToDate) return false;
      }

      // 2. Time Filter
      if (timeFrom && txTimeStr < timeFrom) return false;
      if (timeTo && txTimeStr > timeTo) return false;

      // 3. Search & Attributes
      if (customerQuery) {
        const q = customerQuery.toLowerCase();
        const nameMatch = (tx.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (tx.customerPhone || '').includes(q);
        const codeMatch = (tx.code || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !codeMatch) return false;
      }
      if (selectedEmployee && tx.createdBy !== selectedEmployee) return false;
      if (selectedCreator && tx.createdBy !== selectedCreator) return false;
      if (paymentMethodFilter) {
        if (paymentMethodFilter === 'Tiền mặt' && tx.paymentMethod !== 'Tiền mặt') return false;
        if (paymentMethodFilter === 'Chuyển khoản' && tx.paymentMethod !== 'Chuyển khoản') return false;
        if (paymentMethodFilter === 'Quẹt thẻ' && tx.paymentMethod !== 'Quẹt thẻ' && tx.paymentMethod !== 'Thẻ') return false;
      }
      return true;
    });
  }, [data.transactions, timeRangeType, selectedSingleDate, customFromDate, customToDate, timeFrom, timeTo, customerQuery, selectedEmployee, selectedCreator, paymentMethodFilter]);

  // Client-side filtering for returns matching exact working hours date & time
  const filteredReturns = useMemo(() => {
    const targetYMD = formatDateYMD(selectedSingleDate);

    return (data.returns || []).filter(ret => {
      const retYMD = getWorkingHoursYMD(ret.time || ret.createdAt || ret.date);
      const retTimeStr = formatWorkingHoursTime(ret.time || ret.createdAt || ret.date);

      // 1. Date Filter
      if (timeRangeType === 'date') {
        if (retYMD !== targetYMD) return false;
      } else {
        if (customFromDate && retYMD < customFromDate) return false;
        if (customToDate && retYMD > customToDate) return false;
      }

      // 2. Time Filter
      if (timeFrom && retTimeStr < timeFrom) return false;
      if (timeTo && retTimeStr > timeTo) return false;

      // 3. Search & Attributes
      if (customerQuery) {
        const q = customerQuery.toLowerCase();
        const nameMatch = (ret.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (ret.customerPhone || '').includes(q);
        const codeMatch = (ret.code || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !codeMatch) return false;
      }
      if (selectedEmployee && ret.createdBy !== selectedEmployee) return false;
      if (selectedCreator && ret.createdBy !== selectedCreator) return false;
      return true;
    });
  }, [data.returns, timeRangeType, selectedSingleDate, customFromDate, customToDate, timeFrom, timeTo, customerQuery, selectedEmployee, selectedCreator]);

  // Client-side filtering for cashbook entries matching exact working hours date & time
  const filteredCashbook = useMemo(() => {
    const targetYMD = formatDateYMD(selectedSingleDate);

    return (data.cashbook || []).filter(cb => {
      const cbYMD = getWorkingHoursYMD(cb.time || cb.createdAt || cb.date);
      if (timeRangeType === 'date') {
        if (cbYMD !== targetYMD) return false;
      } else {
        if (customFromDate && cbYMD < customFromDate) return false;
        if (customToDate && cbYMD > customToDate) return false;
      }

      if (selectedEmployee && cb.createdBy !== selectedEmployee) return false;
      if (selectedCreator && cb.createdBy !== selectedCreator) return false;
      if (paymentMethodFilter) {
        if (paymentMethodFilter === 'Tiền mặt' && cb.paymentMethod !== 'Tiền mặt') return false;
        if (paymentMethodFilter === 'Chuyển khoản' && cb.paymentMethod !== 'Chuyển khoản') return false;
        if (paymentMethodFilter === 'Quẹt thẻ' && cb.paymentMethod !== 'Quẹt thẻ') return false;
      }
      return true;
    });
  }, [data.cashbook, timeRangeType, selectedSingleDate, customFromDate, customToDate, selectedEmployee, selectedCreator, paymentMethodFilter]);

  // Helper to extract paid amount safely
  const getTxPaid = (tx) => Number(tx.paid ?? tx.netRevenue ?? tx.revenue ?? 0);
  const getRetPaid = (ret) => Number(ret.paid ?? ret.netRevenue ?? ret.revenue ?? 0);

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
  const paginatedTransactions = filteredTransactions.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);

  // Goods Summary List
  const goodsList = useMemo(() => {
    const map = {};
    filteredTransactions.forEach(tx => {
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach(it => {
          const sku = it.sku || `SP${it.productId || '0'}`;
          const name = it.name || 'Sản phẩm';
          const qty = Number(it.quantity || 0);
          const rev = Number(it.price || 0) * qty;
          if (!map[sku]) map[sku] = { sku, name, soldQty: 0, revenue: 0 };
          map[sku].soldQty += qty;
          map[sku].revenue += rev;
        });
      } else {
        const sku = 'SP001';
        const name = 'Hàng hóa tổng hợp';
        if (!map[sku]) map[sku] = { sku, name, soldQty: 0, revenue: 0 };
        map[sku].soldQty += Number(tx.quantity || 1);
        map[sku].revenue += Number(tx.revenue || 0);
      }
    });
    return Object.values(map);
  }, [filteredTransactions]);

  const totalGoodsQty = goodsList.reduce((sum, g) => sum + g.soldQty, 0);
  const totalGoodsRevenue = goodsList.reduce((sum, g) => sum + g.revenue, 0);

  // Summary Metrics Breakdown by Payment Method for Summary (Tổng hợp) View
  const paymentBreakdown = useMemo(() => {
    let cashSales = 0, bankSales = 0, cardSales = 0, walletSales = 0;
    let cashReturns = 0, bankReturns = 0, cardReturns = 0, walletReturns = 0;
    let cashCount = 0, bankCount = 0, cardCount = 0, walletCount = 0;

    filteredTransactions.forEach(tx => {
      const amt = getTxPaid(tx);
      const pm = (tx.paymentMethod || '').toLowerCase();
      if (pm.includes('chuyển khoản') || pm.includes('bank') || pm.includes('transfer')) {
        bankSales += amt;
        bankCount++;
      } else if (pm.includes('thẻ') || pm.includes('card')) {
        cardSales += amt;
        cardCount++;
      } else if (pm.includes('ví') || pm.includes('wallet')) {
        walletSales += amt;
        walletCount++;
      } else {
        cashSales += amt;
        cashCount++;
      }
    });

    filteredReturns.forEach(ret => {
      const amt = Math.abs(getRetPaid(ret));
      const pm = (ret.paymentMethod || '').toLowerCase();
      if (pm.includes('chuyển khoản') || pm.includes('bank')) {
        bankReturns += amt;
      } else if (pm.includes('thẻ') || pm.includes('card')) {
        cardReturns += amt;
      } else if (pm.includes('ví') || pm.includes('wallet')) {
        walletReturns += amt;
      } else {
        cashReturns += amt;
      }
    });

    let cashIncome = 0, bankIncome = 0, cardIncome = 0;
    let cashExpense = 0, bankExpense = 0, cardExpense = 0;

    filteredCashbook.forEach(cb => {
      const amt = Number(cb.amount || 0);
      const pm = (cb.paymentMethod || '').toLowerCase();
      if (cb.type === 'INCOME') {
        if (pm.includes('chuyển khoản') || pm.includes('bank')) bankIncome += amt;
        else if (pm.includes('thẻ') || pm.includes('card')) cardIncome += amt;
        else cashIncome += amt;
      } else {
        if (pm.includes('chuyển khoản') || pm.includes('bank')) bankExpense += amt;
        else if (pm.includes('thẻ') || pm.includes('card')) cardExpense += amt;
        else cashExpense += amt;
      }
    });

    return {
      cashSales, bankSales, cardSales, walletSales,
      cashReturns, bankReturns, cardReturns, walletReturns,
      cashCount, bankCount, cardCount, walletCount,
      cashIncome, bankIncome, cardIncome,
      cashExpense, bankExpense, cardExpense,
      totalIncome: cashIncome + bankIncome + cardIncome,
      totalExpense: cashExpense + bankExpense + cardExpense,
    };
  }, [filteredTransactions, filteredReturns, filteredCashbook]);

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

  const getFormattedDateRange = () => {
    if (timeRangeType === 'date') {
      return formatDateVN(selectedSingleDate);
    } else {
      if (!customFromDate || !customToDate) return formatDateVN(new Date());
      const f = customFromDate.split('-').reverse().join('/');
      const t = customToDate.split('-').reverse().join('/');
      return `${f} - ${t}`;
    }
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateRangeStr = getFormattedDateRange();

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

      filteredTransactions.forEach(tx => {
        aoa.push([
          `  ${tx.code}`, 
          formatWorkingHoursTime(tx.time || tx.createdAt || tx.date),
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

        filteredReturns.forEach(ret => {
          aoa.push([
            `  ${ret.code}`,
            formatWorkingHoursTime(ret.time || ret.createdAt || ret.date),
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
          g.soldQty,
          g.revenue
        ]);
      });
      sheetName = "HangHoa";

    } else {
      aoa = [
        [`Ngày lập: ${todayStr}`],
        [],
        ["", "", "Báo cáo cuối ngày tổng hợp"],
        ["", "", `Ngày bán: ${dateRangeStr}`],
        ["", "", "Chi nhánh: Chi nhánh trung tâm"],
        [],
        ["Chỉ tiêu báo cáo", "Giá trị (VNĐ)"],
        ["1. DOANH THU BÁN HÀNG", totalInvoiceRevenueSum - Math.abs(totalReturnRevenueSum)],
        ["  - Doanh thu hóa đơn", totalInvoiceRevenueSum],
        ["  - Trả hàng", totalReturnRevenueSum],
        ["2. PHƯƠNG THỨC THANH TOÁN THỰC THU", totalInvoicePaidSum - Math.abs(totalReturnPaidSum)],
        ["  - Thu Tiền mặt", paymentBreakdown.cashSales],
        ["  - Thu Chuyển khoản", paymentBreakdown.bankSales],
        ["  - Thu Thẻ tín dụng", paymentBreakdown.cardSales],
        ["3. DÒNG TIỀN SỔ QUỸ", paymentBreakdown.totalIncome - paymentBreakdown.totalExpense],
        ["  - Thu quỹ phát sinh", paymentBreakdown.totalIncome],
        ["  - Chi quỹ phát sinh", paymentBreakdown.totalExpense]
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

    XLSX.writeFile(workbook, `BaoCaoCuoiNgay_${dateRangeStr.replace(/\//g, '-')}.xlsx`);
    toast.success('Xuất file Excel thành công!');
  };

  const handlePrint = () => {
    window.print();
  };

  // Single Calendar Cell Generator matching KiotViet exact popover
  const renderSingleCalendarGrid = (viewDate, activeDate, onSelect) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const today = new Date();

    const cells = [];
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`prev-${i}`} className="text-center py-1.5 text-xs text-gray-300">{prevDays - offset + i + 1}</div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const cur = new Date(year, month, i);
      const isSelected = activeDate && cur.getDate() === activeDate.getDate() && cur.getMonth() === activeDate.getMonth() && cur.getFullYear() === activeDate.getFullYear();
      const isToday = cur.getDate() === today.getDate() && cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear();
      cells.push(
        <button
          key={i}
          type="button"
          onClick={() => onSelect(cur)}
          style={isSelected ? { backgroundColor: '#1890ff', color: '#ffffff' } : {}}
          className={`w-8 h-8 mx-auto flex items-center justify-center text-xs cursor-pointer transition-all ${
            isSelected 
              ? 'bg-blue-600 text-white font-extrabold shadow-md rounded-full' 
              : isToday 
              ? 'border border-blue-500 text-blue-600 font-bold hover:bg-blue-50 rounded-full' 
              : 'text-gray-700 hover:bg-gray-100 rounded-full'
          }`}
        >
          {i}
        </button>
      );
    }
    const rem = (offset + daysInMonth) % 7;
    if (rem > 0) {
      for (let i = 1; i <= 7 - rem; i++) {
        cells.push(<div key={`next-${i}`} className="text-center py-1.5 text-xs text-gray-300">{i}</div>);
      }
    }
    return cells;
  };

  // Range Calendar Cell Generator matching KiotViet exact Dual Calendar Popover (Guaranteed Blue Circle styling)
  const renderRangeCalendarGrid = (viewDate, startDate, endDate, onSelectDay) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`prev-${i}`} className="text-center py-1.5 text-xs text-gray-300">{prevDays - offset + i + 1}</div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const cur = new Date(year, month, i);

      const isStart = startDate && cur.getFullYear() === startDate.getFullYear() && cur.getMonth() === startDate.getMonth() && cur.getDate() === startDate.getDate();
      const isEnd = endDate && cur.getFullYear() === endDate.getFullYear() && cur.getMonth() === endDate.getMonth() && cur.getDate() === endDate.getDate();
      
      let inRange = false;
      if (startDate && endDate) {
        const cTime = new Date(year, month, i).getTime();
        const sTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const eTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        const min = Math.min(sTime, eTime);
        const max = Math.max(sTime, eTime);
        inRange = cTime >= min && cTime <= max;
      }

      const isSelected = isStart || isEnd;

      cells.push(
        <button
          key={i}
          type="button"
          onClick={() => onSelectDay(cur)}
          style={
            isSelected 
              ? { backgroundColor: '#1890ff', color: '#ffffff', borderRadius: '9999px' } 
              : inRange 
              ? { backgroundColor: '#e6f7ff', color: '#1890ff' } 
              : {}
          }
          className={`w-8 h-8 mx-auto flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-600 text-white font-extrabold shadow-md rounded-full'
              : inRange
              ? 'bg-blue-100 text-blue-600 font-bold rounded-none'
              : 'text-gray-700 hover:bg-gray-100 rounded-full'
          }`}
        >
          {i}
        </button>
      );
    }
    const rem = (offset + daysInMonth) % 7;
    if (rem > 0) {
      for (let i = 1; i <= 7 - rem; i++) {
        cells.push(<div key={`next-${i}`} className="text-center py-1.5 text-xs text-gray-300">{i}</div>);
      }
    }
    return cells;
  };

  const isHorizontal = displayType === 'Hiển thị ngang';

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 bg-transparent font-sans w-full relative items-start animate-page-in text-[13px] text-gray-800">
      
      {/* Mobile Filter Toggle Bar */}
      <div className="lg:hidden w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm text-xs font-bold text-slate-800 shrink-0">
        <button 
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 text-[#0077CC] font-extrabold cursor-pointer bg-transparent border-none p-0 select-none"
        >
          <Filter size={15} />
          <span>{showMobileFilters ? 'Ẩn bộ lọc báo cáo' : 'Hiện bộ lọc báo cáo'}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${showMobileFilters ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-[11px] text-gray-500 font-medium truncate max-w-[170px] text-right">
          {interestType} • {getFormattedDateRange()}
        </span>
      </div>

      {/* ─── SIDEBAR FILTERS (Left Panel - Collapsible on mobile) ─── */}
      <aside className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex w-full lg:w-[280px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex-col gap-4 z-20`}>
        
        {/* Kiểu hiển thị */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewType('Báo cáo')}
              style={{ backgroundColor: viewType === 'Báo cáo' ? '#0077CC' : 'transparent' }}
              className={`flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer transition-all ${viewType === 'Báo cáo' ? 'bg-[#0077CC] border-[#0077CC] text-white shadow-sm' : 'bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Báo cáo
            </button>
          </div>
          <select 
            value={displayType} 
            onChange={(e) => setDisplayType(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] focus:ring-1 focus:ring-[#0077CC]/20 transition-all font-semibold text-gray-700"
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
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] focus:ring-1 focus:ring-[#0077CC]/20 transition-all font-semibold text-gray-700"
          >
            <option value="Bán hàng">Bán hàng</option>
            <option value="Thu chi">Thu chi</option>
            <option value="Hàng hóa">Hàng hóa</option>
            <option value="Tổng hợp">Tổng hợp</option>
          </select>
        </div>

        {/* Thời gian - Matching KiotViet Exact Popover & Dual Calendar Range */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thời gian</label>
          
          {/* Radio 1: Theo ngày */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeDate" 
                checked={timeRangeType === 'date'} 
                onChange={() => setTimeRangeType('date')}
                className="w-4 h-4 text-[#0077CC] focus:ring-[#0077CC] border-gray-300 cursor-pointer shrink-0"
              />
              
              {/* Single Date Picker Input Box */}
              <div className="relative flex-1" ref={singleDateRef}>
                <button 
                  type="button"
                  onClick={() => {
                    setTimeRangeType('date');
                    setOpenSingleCal(!openSingleCal);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded border text-xs font-semibold text-gray-700 transition-all cursor-pointer ${timeRangeType === 'date' ? 'border-[#0077CC] ring-1 ring-[#0077CC]/20 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <span>{formatDateVN(selectedSingleDate)}</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>

                {/* Popover Single Date Calendar (KiotViet Style) */}
                {openSingleCal && (
                  <PortalPopover anchorEl={singleDateRef.current} open={openSingleCal} onClose={() => setOpenSingleCal(false)} widthMatch={false}>
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-[290px] z-[10000] font-sans">
                      <div className="text-xs font-bold text-slate-800 border-b border-gray-100 pb-2.5 mb-3">
                        Chọn ngày: {formatDateVN(selectedSingleDate)}
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <button 
                          type="button" 
                          onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1))}
                          className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-bold text-gray-800">
                          Tháng {calViewDate.getMonth() + 1} {calViewDate.getFullYear()}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1))}
                          className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      
                      {/* Calendar Grid Header */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
                        <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {renderSingleCalendarGrid(calViewDate, selectedSingleDate, (d) => {
                          setSelectedSingleDate(d);
                          setCalViewDate(d);
                          setOpenSingleCal(false);
                        })}
                      </div>
                    </div>
                  </PortalPopover>
                )}
              </div>
            </div>

            {/* Side-by-side Time Pickers (Từ --:-- 🕒  Đến --:-- 🕒) */}
            {timeRangeType === 'date' && (
              <div className="flex gap-2 items-center pl-6 animate-fade-in">
                <div className="flex-1 border border-gray-200 rounded px-2 py-1 bg-white flex items-center justify-between focus-within:border-[#0077CC]">
                  <input 
                    type="time" 
                    value={timeFrom} 
                    onChange={e => setTimeFrom(e.target.value)} 
                    placeholder="Từ"
                    className="w-full text-xs font-medium bg-transparent outline-none cursor-pointer text-center text-gray-700" 
                  />
                  <Clock size={13} className="text-gray-400 shrink-0 ml-0.5" />
                </div>
                <div className="flex-1 border border-gray-200 rounded px-2 py-1 bg-white flex items-center justify-between focus-within:border-[#0077CC]">
                  <input 
                    type="time" 
                    value={timeTo} 
                    onChange={e => setTimeTo(e.target.value)} 
                    placeholder="Đến"
                    className="w-full text-xs font-medium bg-transparent outline-none cursor-pointer text-center text-gray-700" 
                  />
                  <Clock size={13} className="text-gray-400 shrink-0 ml-0.5" />
                </div>
              </div>
            )}
          </div>

          {/* Radio 2: Tùy chỉnh (KiotViet Dual Calendar Popover) */}
          <div className="flex items-center gap-2">
            <input 
              type="radio" 
              name="timeRangeType" 
              id="timeRangeCustom" 
              checked={timeRangeType === 'custom'} 
              onChange={() => setTimeRangeType('custom')}
              className="w-4 h-4 text-[#0077CC] focus:ring-[#0077CC] border-gray-300 cursor-pointer shrink-0"
            />
            <div className="relative flex-1" ref={customDateRef}>
              <button 
                type="button"
                onClick={() => {
                  setTimeRangeType('custom');
                  if (customFromDate) {
                    const parts = customFromDate.split('-');
                    if (parts.length === 3) {
                      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                      setRangeStartDate(d);
                      setLeftCalMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
                    }
                  }
                  if (customToDate) {
                    const parts = customToDate.split('-');
                    if (parts.length === 3) {
                      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                      setRangeEndDate(d);
                      setRightCalMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
                    }
                  }
                  setOpenCustomCal(!openCustomCal);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded border text-xs font-semibold text-gray-700 transition-all cursor-pointer ${timeRangeType === 'custom' ? 'border-[#0077CC] ring-1 ring-[#0077CC]/20 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <span className="truncate">
                  {customFromDate && customToDate 
                    ? `${customFromDate.split('-').reverse().join('/')} - ${customToDate.split('-').reverse().join('/')}` 
                    : 'Tùy chỉnh'}
                </span>
                <Calendar size={14} className="text-gray-400 shrink-0" />
              </button>

              {/* Popover Custom Range Dual Calendar (Matching KiotViet Exact Image 100%) */}
              {openCustomCal && (
                <PortalPopover anchorEl={customDateRef.current} open={openCustomCal} onClose={() => setOpenCustomCal(false)} widthMatch={false}>
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 w-[560px] max-w-[95vw] z-[10000] font-sans">
                    
                    {/* Header text */}
                    <div className="text-xs font-bold text-slate-700 mb-4">
                      Từ ngày: <span className="text-slate-900 font-extrabold">{formatDateVN(rangeStartDate)}</span> - Đến ngày: <span className="text-slate-900 font-extrabold">{formatDateVN(rangeEndDate)}</span>
                    </div>

                    {/* Dual Side-by-Side Calendars */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                      
                      {/* Left Calendar Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <button 
                            type="button" 
                            onClick={() => setLeftCalMonth(new Date(leftCalMonth.getFullYear(), leftCalMonth.getMonth() - 1, 1))}
                            className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-xs font-bold text-gray-800">
                            Tháng {leftCalMonth.getMonth() + 1} {leftCalMonth.getFullYear()}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setLeftCalMonth(new Date(leftCalMonth.getFullYear(), leftCalMonth.getMonth() + 1, 1))}
                            className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
                          <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {renderRangeCalendarGrid(leftCalMonth, rangeStartDate, rangeEndDate, (d) => {
                            if (!rangeStartDate || (rangeStartDate && rangeEndDate && rangeStartDate.getTime() !== rangeEndDate.getTime())) {
                              setRangeStartDate(d);
                              setRangeEndDate(d);
                            } else if (d < rangeStartDate) {
                              setRangeEndDate(rangeStartDate);
                              setRangeStartDate(d);
                            } else {
                              setRangeEndDate(d);
                            }
                          })}
                        </div>
                      </div>

                      {/* Right Calendar Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <button 
                            type="button" 
                            onClick={() => setRightCalMonth(new Date(rightCalMonth.getFullYear(), rightCalMonth.getMonth() - 1, 1))}
                            className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-xs font-bold text-gray-800">
                            Tháng {rightCalMonth.getMonth() + 1} {rightCalMonth.getFullYear()}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setRightCalMonth(new Date(rightCalMonth.getFullYear(), rightCalMonth.getMonth() + 1, 1))}
                            className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
                          <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {renderRangeCalendarGrid(rightCalMonth, rangeStartDate, rangeEndDate, (d) => {
                            if (!rangeStartDate || (rangeStartDate && rangeEndDate && rangeStartDate.getTime() !== rangeEndDate.getTime())) {
                              setRangeStartDate(d);
                              setRangeEndDate(d);
                            } else if (d < rangeStartDate) {
                              setRangeEndDate(rangeStartDate);
                              setRangeStartDate(d);
                            } else {
                              setRangeEndDate(d);
                            }
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Footer Bar matching KiotViet exact buttons with Guaranteed Inline Color Styling */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3.5 mt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setRangeStartDate(now);
                          setRangeEndDate(now);
                        }}
                        style={{ color: '#1890ff' }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        Hôm nay
                      </button>

                      <div className="flex items-center gap-2">
                        <button 
                          type="button" 
                          onClick={() => setOpenCustomCal(false)}
                          className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          Bỏ qua
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setCustomFromDate(formatDateYMD(rangeStartDate));
                            setCustomToDate(formatDateYMD(rangeEndDate));
                            setTimeRangeType('custom');
                            setOpenCustomCal(false);
                          }} 
                          style={{ backgroundColor: '#1890ff', color: '#ffffff' }}
                          className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all cursor-pointer border-none"
                        >
                          Tạo báo cáo
                        </button>
                      </div>
                    </div>

                  </div>
                </PortalPopover>
              )}
            </div>
          </div>
        </div>

        {/* Hiển thị số liệu (When Bán hàng or Hàng hóa is active) */}
        {(interestType === 'Bán hàng' || interestType === 'Hàng hóa') && (
          <div className="flex flex-col gap-1.5 border border-gray-200 rounded p-2.5 bg-gray-50/30">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <span>Hiển thị số liệu</span>
            </label>
            <div className="flex flex-col gap-1 pl-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="taxMode" 
                  checked={taxMode === 'without'} 
                  onChange={() => setTaxMode('without')} 
                  className="w-3.5 h-3.5 text-[#0077CC] focus:ring-[#0077CC]" 
                />
                <span>Chưa bao gồm thuế</span>
                <Info size={12} className="text-gray-400" title="Doanh thu chưa tính VAT" />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="taxMode" 
                  checked={taxMode === 'with'} 
                  onChange={() => setTaxMode('with')} 
                  className="w-3.5 h-3.5 text-[#0077CC] focus:ring-[#0077CC]" 
                />
                <span>Đã bao gồm thuế</span>
                <Info size={12} className="text-gray-400" title="Doanh thu gồm VAT" />
              </label>
            </div>
          </div>
        )}

        {/* Khách hàng */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Khách hàng</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Theo mã, tên, số điện thoại" 
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded border border-gray-200 bg-white text-xs outline-none focus:border-[#0077CC] focus:ring-1 focus:ring-[#0077CC]/20 transition-all text-gray-700 font-medium"
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
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] focus:ring-1 focus:ring-[#0077CC]/20 font-medium text-gray-700"
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
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] focus:ring-1 focus:ring-[#0077CC]/20 font-medium text-gray-700"
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
            value={paymentMethodFilter} 
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] focus:ring-1 focus:ring-[#0077CC]/20 font-medium text-gray-700"
          >
            <option value="">Chọn phương thức thanh toán</option>
            <option value="Tiền mặt">Tiền mặt</option>
            <option value="Chuyển khoản">Chuyển khoản</option>
            <option value="Quẹt thẻ">Thẻ tín dụng</option>
          </select>
        </div>

      </aside>

      {/* ─── MAIN DESK / DOCUMENT CANVAS (Right Area - Matching KiotViet Topbar & A4 Sheet) ─── */}
      <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-visible sm:overflow-hidden min-h-[600px] h-auto sm:h-[calc(100vh-140px)] relative w-full">
        
        {/* ─── PREMIUM KIOTVIET TOP ACTION TOOLBAR (#5c6b73 / #475569) ─── */}
        <div className="min-h-11 bg-[#475569] border-b border-slate-600 px-2 sm:px-4 py-1 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar shrink-0 shadow-sm z-10 text-white select-none whitespace-nowrap">
          
          {/* Left Buttons: Undo, Redo, Refresh */}
          <div className="flex items-center gap-1 shrink-0">
            <button className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors" title="Hoàn tác">
              <ArrowLeft size={15} />
            </button>
            <button className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer transition-colors" title="Làm lại">
              <ArrowRight size={15} />
            </button>
            <button onClick={fetchData} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 transition-all cursor-pointer" title="Làm mới báo cáo">
              <RotateCcw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Center: Interactive Working Pagination */}
          <div className="flex items-center gap-1 bg-slate-600/60 rounded px-1.5 py-0.5 border border-slate-500/30 shrink-0">
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
                className="w-9 text-center text-xs bg-white text-slate-900 rounded font-bold py-0.5 outline-none border-none"
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
          <div className="flex items-center gap-1 shrink-0">
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

            <div className="w-px h-4 bg-slate-400/40 mx-0.5" />

            {/* Zoom Controls */}
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

        {/* ─── PRINTED A4 SHEET CANVAS (Grey #808a95 Container) ─── */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 flex justify-center items-start bg-[#808a95] custom-scrollbar w-full max-w-full">
          
          {/* Printable Document Paper */}
          <div 
            id="printed-report-page"
            className="bg-white text-slate-900 shadow-2xl p-3 sm:p-8 min-h-[600px] h-fit border border-gray-300 rounded-sm origin-top transition-transform duration-200 select-text mb-6 sm:mb-12 w-full max-w-full box-border"
            style={{ 
              maxWidth: '100%',
              width: '100%',
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
                Báo cáo cuối ngày về {interestType.toLowerCase()}
              </h1>
              <div className="mt-2 flex flex-col gap-0.5 text-[11px] sm:text-[12px] text-gray-600 font-medium">
                <p>Ngày bán: {getFormattedDateRange()}</p>
                {interestType === 'Bán hàng' && <p>Ngày thanh toán: {getFormattedDateRange()}</p>}
                <p>Chi nhánh: Chi nhánh trung tâm</p>
              </div>
            </div>

            {/* REPORT TABLES BASED ON INTEREST TYPE */}
            {interestType === 'Bán hàng' ? (
              /* ─── VIEW 1: BÁN HÀNG ─── */
              <>
                {/* Desktop Multi-column Table View */}
                <div className="hidden sm:block border border-gray-300 rounded-sm overflow-x-auto custom-scrollbar mb-6 bg-white shadow-sm w-full">
                  <table className="w-full text-[11.5px] border-collapse min-w-[620px] sm:min-w-full">
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
                          {/* 1. HÓA ĐƠN SUMMARY GROUP ROW ([+] Hóa đơn: X) */}
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

                              {/* Expanded Interactive Invoice Child Rows (Renders ALL invoices for the day) */}
                              {expandedOrders.invoices && filteredTransactions.map(tx => (
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
                                    {formatWorkingHoursTime(tx.time || tx.createdAt || tx.date)}
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

                          {/* 2. TRẢ HÀNG SUMMARY GROUP ROW ([+] Trả hàng: Y) */}
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
                              {expandedOrders.returns && filteredReturns.map(ret => (
                                <tr key={ret.id || ret.code} className="hover:bg-red-50/50 transition-colors border-b border-gray-150">
                                  <td className="px-6 py-1.5 text-[#0077CC] font-bold">
                                    {ret.code}
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-600">
                                    {formatWorkingHoursTime(ret.time || ret.createdAt || ret.date)}
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
                            Báo cáo không có dữ liệu
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Zero-Scroll Smart Cards View */}
                <div className="block sm:hidden flex flex-col gap-2.5 mb-6">
                  {totalInvoiceCount > 0 && (
                    <div className="bg-[#F7F2E8] border border-[#e5dcbc] rounded-lg p-3 shadow-xs">
                      <div 
                        onClick={toggleExpandInvoices}
                        className="flex items-center justify-between cursor-pointer font-bold text-slate-900 pb-2 border-b border-[#e5dcbc]"
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono text-[#0077CC] font-bold">{expandedOrders.invoices ? '[−]' : '[+]'}</span>
                          <span className="font-extrabold">Hóa đơn: {totalInvoiceCount} đơn</span>
                        </div>
                        <span className="text-xs text-slate-800 font-extrabold">SL: {fmtQty(totalInvoiceQtySum)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                        <div>
                          <span className="text-gray-500 block text-[10px]">Doanh thu</span>
                          <span className="font-extrabold text-slate-900">{fmt(totalInvoiceRevenueSum)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 block text-[10px]">Thực thu</span>
                          <span className="font-extrabold text-green-700">{fmt(totalInvoicePaidSum)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedOrders.invoices && filteredTransactions.map(tx => (
                    <div key={tx.id || tx.code} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                      <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                        <button 
                          onClick={() => handleInvoiceClick(tx)}
                          className="text-[#0077CC] hover:underline font-bold text-left bg-transparent border-none p-0 cursor-pointer"
                        >
                          {tx.code}
                        </button>
                        <span className="text-gray-500 text-[11px]">
                          {formatWorkingHoursTime(tx.time || tx.createdAt || tx.date)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-gray-400 text-[10px] block">Số lượng</span>
                          <span className="font-semibold text-gray-800">{fmtQty(tx.quantity)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] block">Doanh thu</span>
                          <span className="font-semibold text-gray-800">{fmt(tx.revenue)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 text-[10px] block">Thực thu</span>
                          <span className="font-bold text-[#0077CC]">{fmt(getTxPaid(tx))}</span>
                        </div>
                      </div>
                      {(tx.otherFee > 0 || tx.vat > 0 || tx.rounding > 0 || tx.returnFee > 0) && (
                        <div className="mt-2 pt-1.5 border-t border-dashed border-gray-150 text-[10px] text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
                          {tx.otherFee > 0 && <span>Thu khác: {fmt(tx.otherFee)}</span>}
                          {tx.vat > 0 && <span>VAT: {fmt(tx.vat)}</span>}
                          {tx.rounding > 0 && <span>Làm tròn: {fmt(tx.rounding)}</span>}
                          {tx.returnFee > 0 && <span>Phí trả: {fmt(tx.returnFee)}</span>}
                        </div>
                      )}
                    </div>
                  ))}

                  {totalReturnCount > 0 && (
                    <div className="bg-[#F7F2E8] border border-[#e5dcbc] rounded-lg p-3 shadow-xs mt-2">
                      <div 
                        onClick={toggleExpandReturns}
                        className="flex items-center justify-between cursor-pointer font-bold text-slate-900 pb-2 border-b border-[#e5dcbc]"
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono text-red-600 font-bold">{expandedOrders.returns ? '[−]' : '[+]'}</span>
                          <span className="font-extrabold text-red-800">Trả hàng: {totalReturnCount} đơn</span>
                        </div>
                        <span className="text-xs text-slate-800 font-extrabold">SL: {fmtQty(totalReturnQtySum)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                        <div>
                          <span className="text-gray-500 block text-[10px]">Doanh thu</span>
                          <span className="font-extrabold text-red-700">{fmt(-Math.abs(totalReturnRevenueSum))}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 block text-[10px]">Thực chi trả</span>
                          <span className="font-extrabold text-slate-900">{fmt(totalReturnPaidSum)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedOrders.returns && filteredReturns.map(ret => (
                    <div key={ret.id || ret.code} className="bg-red-50/40 border border-red-200 rounded-lg p-3 shadow-xs text-xs">
                      <div className="flex items-center justify-between font-bold border-b border-red-100 pb-1.5 mb-2">
                        <span className="text-red-700 font-bold">{ret.code}</span>
                        <span className="text-gray-500 text-[11px]">
                          {formatWorkingHoursTime(ret.time || ret.createdAt || ret.date)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-gray-400 text-[10px] block">Số lượng</span>
                          <span className="font-semibold text-gray-800">{fmtQty(ret.quantity)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] block">Doanh thu</span>
                          <span className="font-semibold text-red-700">{fmt(ret.revenue)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 text-[10px] block">Thực chi</span>
                          <span className="font-bold text-slate-800">{fmt(getRetPaid(ret))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>

            ) : interestType === 'Thu chi' ? (
              /* ─── VIEW 2: THU CHI ─── */
              <>
                <div className="hidden sm:block border border-gray-300 rounded-sm overflow-x-auto custom-scrollbar mb-6 bg-white shadow-sm w-full">
                  <table className="w-full text-[11.5px] border-collapse min-w-[620px] sm:min-w-full">
                    <thead>
                      <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                        <th className="px-3 py-2 text-left w-[140px]">Mã phiếu thu / chi</th>
                        <th className="px-3 py-2 text-left">Loại thu chi</th>
                        <th className="px-3 py-2 text-left">Nhân viên</th>
                        <th className="px-3 py-2 text-left">Người nộp/nhận</th>
                        <th className="px-2 py-2 text-center w-[70px]">Thu/Chi</th>
                        <th className="px-2 py-2 text-left w-[90px]">Thời gian</th>
                        <th className="px-3 py-2 text-right w-[110px]">T.Toán</th>
                        <th className="px-3 py-2 text-left w-[120px]">Mã chứng từ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                      {filteredCashbook.length > 0 ? (
                        filteredCashbook.map(cb => (
                          <tr key={cb.id || cb.code} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5 text-[#0077CC] font-bold">{cb.code}</td>
                            <td className="px-3 py-1.5 text-gray-800">{cb.category}</td>
                            <td className="px-3 py-1.5 text-gray-700">{(!cb.createdBy || cb.createdBy === 'Võ Thành Huy' || cb.createdBy.includes('Huy')) ? 'admin' : cb.createdBy}</td>
                            <td className="px-3 py-1.5 text-gray-700">{cb.partnerName}</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cb.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {cb.type === 'INCOME' ? 'Thu' : 'Chi'}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-gray-600">
                              {formatWorkingHoursTime(cb.createdAt || cb.time || cb.date)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-slate-800">{fmt(cb.amount)}</td>
                            <td className="px-3 py-1.5 text-gray-500">{cb.code}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-gray-400 font-medium text-[12px]">
                            Báo cáo không có dữ liệu
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for View 2 */}
                <div className="block sm:hidden flex flex-col gap-2 mb-6">
                  {filteredCashbook.length > 0 ? (
                    filteredCashbook.map(cb => (
                      <div key={cb.id || cb.code} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                        <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                          <span className="text-[#0077CC] font-extrabold">{cb.code}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cb.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {cb.type === 'INCOME' ? 'Thu' : 'Chi'} {fmt(cb.amount)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-gray-700">
                          <div><span className="text-gray-400 text-[10px] block">Loại thu chi</span><span className="font-medium text-slate-900">{cb.category}</span></div>
                          <div><span className="text-gray-400 text-[10px] block">Nhân viên</span><span className="font-medium">{(!cb.createdBy || cb.createdBy === 'Võ Thành Huy' || cb.createdBy.includes('Huy')) ? 'admin' : cb.createdBy}</span></div>
                          <div><span className="text-gray-400 text-[10px] block">Người nộp/nhận</span><span className="font-medium">{cb.partnerName || '---'}</span></div>
                          <div><span className="text-gray-400 text-[10px] block">Thời gian</span><span className="font-medium">{formatWorkingHoursTime(cb.createdAt || cb.time || cb.date)}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-xs font-medium">
                      Báo cáo không có dữ liệu
                    </div>
                  )}
                </div>
              </>

            ) : interestType === 'Hàng hóa' ? (
              /* ─── VIEW 3: HÀNG HÓA ─── */
              <>
                <div className="hidden sm:block border border-gray-300 rounded-sm overflow-x-auto custom-scrollbar mb-6 bg-white shadow-sm w-full">
                  <table className="w-full text-[11.5px] border-collapse min-w-[500px] sm:min-w-full">
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
                              <td className="px-4 py-1.5 text-right text-gray-800">{fmtQty(g.soldQty)}</td>
                              <td className="px-4 py-1.5 text-right font-bold text-gray-800">{fmt(g.revenue)}</td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-gray-400 font-medium text-[12px]">
                            Báo cáo không có dữ liệu
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for View 3 */}
                <div className="block sm:hidden flex flex-col gap-2 mb-6">
                  {goodsList.length > 0 ? (
                    <>
                      <div className="bg-[#F7F2E8] border border-[#e5dcbc] rounded-lg p-3 shadow-xs text-xs font-bold text-slate-900 flex justify-between items-center">
                        <span>Tổng cộng: {fmtQty(totalGoodsQty)} SP</span>
                        <span className="text-[#0077CC] text-sm">{fmt(totalGoodsRevenue)}</span>
                      </div>
                      {goodsList.map(g => (
                        <div key={g.sku} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                          <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1 mb-1.5">
                            <span className="text-[#0077CC]">{g.sku}</span>
                            <span className="text-gray-500 font-semibold">SL: {fmtQty(g.soldQty)}</span>
                          </div>
                          <p className="text-gray-800 font-semibold text-xs mb-1.5">{g.name}</p>
                          <div className="text-right">
                            <span className="text-gray-400 text-[10px] mr-2">Doanh thu:</span>
                            <span className="font-extrabold text-slate-900">{fmt(g.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-xs font-medium">
                      Báo cáo không có dữ liệu
                    </div>
                  )}
                </div>
              </>

            ) : (
              /* ─── VIEW 4: TỔNG HỢP (MATCHING KIOTVIET IMAGE 4 SUMMARY TABLES) ─── */
              <>
                {/* Desktop View */}
                <div className="hidden sm:flex flex-col gap-6 mb-6">
                  {/* 1. Bảng: Tổng kết thu chi */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[12px] font-bold text-slate-800">Tổng kết thu chi</h3>
                    <div className="border border-gray-300 rounded-sm overflow-x-auto custom-scrollbar bg-white shadow-sm w-full">
                      <table className="w-full text-[11.5px] border-collapse min-w-[560px] sm:min-w-full">
                        <thead>
                          <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                            <th className="px-3 py-2 text-left">Thu/Chi</th>
                            <th className="px-3 py-2 text-right">Tiền mặt</th>
                            <th className="px-3 py-2 text-right">CK</th>
                            <th className="px-3 py-2 text-right">Thẻ</th>
                            <th className="px-3 py-2 text-right">Ví</th>
                            <th className="px-3 py-2 text-right">Điểm</th>
                            <th className="px-3 py-2 text-right">Voucher</th>
                            <th className="px-3 py-2 text-right font-extrabold">Tổng thực thu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium">
                          <tr>
                            <td className="px-3 py-1.5 text-slate-900 font-bold">Tổng thu</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cashIncome)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.bankIncome)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cardIncome)}</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right font-extrabold text-[#0077CC]">{fmt(paymentBreakdown.totalIncome)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-slate-900 font-bold">Tổng chi</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cashExpense)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.bankExpense)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cardExpense)}</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right font-extrabold text-amber-700">{fmt(paymentBreakdown.totalExpense)}</td>
                          </tr>
                          <tr className="bg-slate-50 font-bold">
                            <td className="px-3 py-1.5 text-slate-900">Thu - Chi</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cashIncome - paymentBreakdown.cashExpense)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.bankIncome - paymentBreakdown.bankExpense)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cardIncome - paymentBreakdown.cardExpense)}</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right font-extrabold text-slate-900">{fmt(paymentBreakdown.totalIncome - paymentBreakdown.totalExpense)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. Bảng: Tổng kết bán hàng */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[12px] font-bold text-slate-800">Tổng kết bán hàng</h3>
                    <div className="border border-gray-300 rounded-sm overflow-x-auto custom-scrollbar bg-white shadow-sm w-full">
                      <table className="w-full text-[11.5px] border-collapse min-w-[560px] sm:min-w-full">
                        <thead>
                          <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300">
                            <th className="px-3 py-2 text-left">Giao dịch</th>
                            <th className="px-3 py-2 text-right">Giá trị</th>
                            <th className="px-3 py-2 text-right">Tiền mặt</th>
                            <th className="px-3 py-2 text-right">CK</th>
                            <th className="px-3 py-2 text-right">Thẻ</th>
                            <th className="px-3 py-2 text-right">Ví</th>
                            <th className="px-3 py-2 text-right">Điểm</th>
                            <th className="px-3 py-2 text-right">Voucher</th>
                            <th className="px-3 py-2 text-right font-extrabold">Tổng thực thu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium">
                          <tr>
                            <td className="px-3 py-1.5 text-slate-900 font-bold">Bán hàng</td>
                            <td className="px-3 py-1.5 text-right">{fmt(totalInvoiceRevenueSum)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cashSales)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.bankSales)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cardSales)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.walletSales)}</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right">0</td>
                            <td className="px-3 py-1.5 text-right font-extrabold text-[#0077CC]">{fmt(totalInvoicePaidSum)}</td>
                          </tr>
                          {totalReturnCount > 0 && (
                            <tr>
                              <td className="px-3 py-1.5 text-slate-900 font-bold">Trả hàng</td>
                              <td className="px-3 py-1.5 text-right">{fmt(totalReturnRevenueSum)}</td>
                              <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cashReturns)}</td>
                              <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.bankReturns)}</td>
                              <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.cardReturns)}</td>
                              <td className="px-3 py-1.5 text-right">{fmt(paymentBreakdown.walletReturns)}</td>
                              <td className="px-3 py-1.5 text-right">0</td>
                              <td className="px-3 py-1.5 text-right">0</td>
                              <td className="px-3 py-1.5 text-right font-extrabold text-amber-700">{fmt(totalReturnPaidSum)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mobile Cards for View 4 */}
                <div className="block sm:hidden flex flex-col gap-3 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                    <h4 className="font-bold text-slate-900 mb-2 border-b pb-1">1. Tổng kết thu chi</h4>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tổng thu:</span><span className="font-extrabold text-[#0077CC]">{fmt(paymentBreakdown.totalIncome)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tổng chi:</span><span className="font-extrabold text-amber-700">{fmt(paymentBreakdown.totalExpense)}</span></div>
                      <div className="flex justify-between items-center pt-1 border-t border-gray-100 font-bold"><span className="text-slate-900">Thu - Chi:</span><span className="text-slate-900">{fmt(paymentBreakdown.totalIncome - paymentBreakdown.totalExpense)}</span></div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                    <h4 className="font-bold text-slate-900 mb-2 border-b pb-1">2. Tổng kết bán hàng</h4>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Giá trị bán:</span><span className="font-semibold text-slate-900">{fmt(totalInvoiceRevenueSum)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Tổng thực thu:</span><span className="font-extrabold text-[#0077CC]">{fmt(totalInvoicePaidSum)}</span></div>
                      {totalReturnCount > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t border-gray-100"><span className="text-red-700 font-medium">Trả hàng ({totalReturnCount} đơn):</span><span className="font-bold text-red-700">{fmt(totalReturnRevenueSum)}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Document Footer */}
            <div className="mt-8 text-center text-[11px] text-gray-500 font-medium border-t border-gray-200 pt-4">
              Chi nhánh trung tâm
            </div>

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
