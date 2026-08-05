import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Printer, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, 
  RotateCcw, Building2, FileText
} from 'lucide-react';
import Button from '../../components/ui/Button';
import DateFilter from '../../components/ui/DateFilter';
import { getRangeByCreatedLabel, formatLocalYMD } from '../../utils/dateFilterUtils';
import { exportCSV } from '../../utils/exportUtils';
import { reportAPI } from '../../services/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n || 0)));

export default function FinancialReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({ mode: 'all', label: 'Tháng này' });
  const [zoom, setZoom] = useState(100);

  // Compute date range strings based on DateFilter selection
  const getDates = () => {
    if (!dateFilter || dateFilter.label === 'Toàn thời gian') {
      return { fromDate: '', toDate: '', label: 'Toàn thời gian' };
    }

    if (dateFilter.mode === 'custom' && dateFilter.start && dateFilter.end) {
      const f = formatLocalYMD(dateFilter.start);
      const t = formatLocalYMD(dateFilter.end);
      return { 
        fromDate: f, 
        toDate: t, 
        label: `Từ ngày ${new Date(dateFilter.start).toLocaleDateString('vi-VN')} đến ngày ${new Date(dateFilter.end).toLocaleDateString('vi-VN')}` 
      };
    }

    const range = getRangeByCreatedLabel(dateFilter.label || 'Tháng này');
    if (range && range.start && range.end) {
      const f = formatLocalYMD(range.start);
      const t = formatLocalYMD(range.end);
      return { 
        fromDate: f, 
        toDate: t, 
        label: `Từ ngày ${range.start.toLocaleDateString('vi-VN')} đến ngày ${range.end.toLocaleDateString('vi-VN')}` 
      };
    }

    return { fromDate: '', toDate: '', label: 'Toàn thời gian' };
  };

  const { fromDate, toDate, label: dateRangeLabel } = getDates();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const reportData = await reportAPI.getFinancial(params);
      setData(reportData);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải báo cáo tài chính');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate]);

  const f = data || {
    grossRevenue: 0,
    totalDeductions: 0,
    orderDiscounts: 0,
    returnTotalVal: 0,
    netRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    operatingProfit: 0,
    otherIncome: 0,
    otherExpenses: 0,
    netProfit: 0
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const rows = [
      { stt: '1', name: 'Doanh thu bán hàng (1)', val: f.grossRevenue },
      { stt: '2', name: 'Giảm trừ Doanh thu (2 = 2.1+2.2)', val: f.totalDeductions },
      { stt: '2.1', name: '  Chiết khấu hóa đơn (2.1)', val: f.orderDiscounts },
      { stt: '2.2', name: '  Giá trị hàng bán bị trả lại (2.2)', val: f.returnTotalVal },
      { stt: '3', name: 'Doanh thu thuần (3 = 1-2)', val: f.netRevenue },
      { stt: '4', name: 'Giá vốn hàng bán (4)', val: f.cogs },
      { stt: '5', name: 'Lợi nhuận gộp về bán hàng (5 = 3-4)', val: f.grossProfit },
      { stt: '6', name: 'Chi phí (6)', val: f.operatingExpenses },
      { stt: '7', name: 'Lợi nhuận từ hoạt động kinh doanh (7 = 5-6)', val: f.operatingProfit },
      { stt: '8', name: 'Thu nhập khác (8)', val: f.otherIncome },
      { stt: '9', name: 'Chi phí khác (9)', val: f.otherExpenses },
      { stt: '10', name: 'Lợi nhuận thuần (10 = (7+8)-9)', val: f.netProfit },
    ];
    exportCSV(
      [
        { key: 'stt', label: 'STT' },
        { key: 'name', label: 'Chỉ tiêu' },
        { key: 'val', label: 'Số tiền (VNĐ)' }
      ],
      rows,
      `BaoCaoTaiChinh_${fromDate || 'All'}_${toDate || 'All'}`
    );
    toast.success('Đã xuất file báo cáo tài chính thành công');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 font-sans min-h-0 overflow-hidden">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm flex-none">
        <h1 className="text-xl font-extrabold text-gray-900 m-0 tracking-tight flex items-center gap-2">
          <FileText className="text-primary" size={24} />
          Báo cáo tài chính
        </h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchReport}
            icon={<RotateCcw size={15} />}
          >
            Làm mới
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Left Sidebar Filter */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 flex-none overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Kiểu hiển thị
            </label>
            <div className="bg-blue-50 text-primary border border-blue-200 rounded-lg px-3 py-2 text-xs font-extrabold flex items-center justify-between shadow-xs">
              <span>Báo cáo</span>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            </div>
          </div>

          <hr className="border-gray-100 my-0" />

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Thời gian
            </label>
            <DateFilter
              value={dateFilter}
              onChange={setDateFilter}
            />
          </div>

          <hr className="border-gray-100 my-0" />

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
              <Building2 size={14} className="text-gray-400" />
              Chi nhánh
            </label>
            <div className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
              Chi nhánh trung tâm
            </div>
          </div>
        </div>

        {/* Right Main Viewer (KiotViet A4 Document Canvas) */}
        <div className="flex-1 bg-[#7E8B9B] flex flex-col min-h-0 relative overflow-hidden">
          {/* Document Control Toolbar Bar */}
          <div className="bg-[#4E5968] text-white px-4 py-2 flex items-center justify-between shadow-md z-10 flex-none text-xs">
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-white border-none bg-transparent cursor-pointer"
                title="In báo cáo"
              >
                <Printer size={16} />
              </button>
              <button 
                onClick={handleExport}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-white border-none bg-transparent cursor-pointer flex items-center gap-1 font-bold"
                title="Xuất file Excel"
              >
                <Download size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded border border-white/10">
                <button 
                  onClick={() => setZoom(z => Math.max(z - 10, 60))}
                  className="hover:bg-white/10 p-0.5 rounded text-white border-none bg-transparent cursor-pointer"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="font-mono text-xs w-10 text-center font-bold">{zoom}%</span>
                <button 
                  onClick={() => setZoom(z => Math.min(z + 10, 150))}
                  className="hover:bg-white/10 p-0.5 rounded text-white border-none bg-transparent cursor-pointer"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-white/10 rounded disabled:opacity-30 border-none bg-transparent text-white cursor-pointer" disabled>
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold">1 / 1</span>
                <button className="p-1 hover:bg-white/10 rounded disabled:opacity-30 border-none bg-transparent text-white cursor-pointer" disabled>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Paper View Container */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start custom-scrollbar">
            <div 
              className="bg-white shadow-2xl rounded-sm p-10 text-gray-800 transition-transform origin-top duration-150 border border-gray-300 relative"
              style={{ 
                width: '820px', 
                minHeight: '1050px',
                transform: `scale(${zoom / 100})`,
                marginBottom: zoom > 100 ? `${(zoom - 100) * 10}px` : '0px'
              }}
            >
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
                    Đang tải dữ liệu báo cáo...
                  </div>
                </div>
              )}

              {/* Document Header */}
              <div className="text-center mb-8">
                <div className="text-[11px] text-gray-500 font-semibold mb-2 text-left">
                  Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase m-0">
                  Báo cáo kết quả hoạt động kinh doanh
                </h2>
                <div className="text-xs font-semibold text-gray-600 mt-1">
                  {dateRangeLabel}
                </div>
                <div className="text-xs font-semibold text-gray-500">
                  Chi nhánh trung tâm
                </div>
              </div>

              {/* Statement Table */}
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#B9E2FA] text-gray-900 font-black border-b border-gray-300">
                      <th className="py-2.5 px-4 text-left font-bold">Chỉ tiêu</th>
                      <th className="py-2.5 px-4 text-right font-bold w-44">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* 1. Doanh thu bán hàng */}
                    <tr className="hover:bg-blue-50/50">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">Doanh thu bán hàng (1)</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-[#0070F4]">{fmt(f.grossRevenue)}</td>
                    </tr>

                    {/* 2. Giảm trừ doanh thu */}
                    <tr className="hover:bg-blue-50/50">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">Giảm trừ Doanh thu (2 = 2.1+2.2)</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-gray-900">{fmt(f.totalDeductions)}</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chiết khấu hóa đơn (2.1)</td>
                      <td className="py-2 px-4 text-right font-semibold text-blue-600">{fmt(f.orderDiscounts)}</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Giá trị hàng bán bị trả lại (2.2)</td>
                      <td className="py-2 px-4 text-right font-semibold text-blue-600">{fmt(f.returnTotalVal)}</td>
                    </tr>

                    {/* 3. Doanh thu thuần */}
                    <tr className="hover:bg-blue-50/50 font-bold">
                      <td className="py-2.5 px-4 text-gray-900">Doanh thu thuần (3=1-2)</td>
                      <td className="py-2.5 px-4 text-right font-black text-gray-900">{fmt(f.netRevenue)}</td>
                    </tr>

                    {/* 4. Giá vốn hàng bán */}
                    <tr className="hover:bg-blue-50/50">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">Giá vốn hàng bán (4)</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-gray-900">{fmt(f.cogs)}</td>
                    </tr>

                    {/* 5. Lợi nhuận gộp */}
                    <tr className="hover:bg-blue-50/50 font-bold">
                      <td className="py-2.5 px-4 text-gray-900">Lợi nhuận gộp về bán hàng (5=3-4)</td>
                      <td className="py-2.5 px-4 text-right font-black text-gray-900">{fmt(f.grossProfit)}</td>
                    </tr>

                    {/* 6. Chi phí */}
                    <tr className="hover:bg-blue-50/50">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">Chi phí (6)</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-gray-900">{fmt(f.operatingExpenses)}</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chi phí voucher</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Phí trả ĐTGH</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Hoàn tiền cho khách</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Xuất hủy hàng hóa</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Giá trị thanh toán bằng điểm</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chiết khấu thanh toán cho khách</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chi trả lương NV</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chênh lệch làm tròn nhập hàng</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chênh lệch làm tròn bán hàng</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>

                    {/* 7. Lợi nhuận từ HĐKD */}
                    <tr className="hover:bg-blue-50/50 font-bold">
                      <td className="py-2.5 px-4 text-gray-900">Lợi nhuận từ hoạt động kinh doanh (7=5-6)</td>
                      <td className="py-2.5 px-4 text-right font-black text-gray-900">{fmt(f.operatingProfit)}</td>
                    </tr>

                    {/* 8. Thu nhập khác */}
                    <tr className="hover:bg-blue-50/50">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">Thu nhập khác (8)</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-gray-900">{fmt(f.otherIncome)}</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Phí trả hàng</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chênh lệch làm tròn nhập hàng</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chênh lệch làm tròn bán hàng</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>
                    <tr className="hover:bg-blue-50/50 text-[11px] text-gray-600">
                      <td className="py-2 px-8">Chiết khấu thanh toán từ NCC</td>
                      <td className="py-2 px-4 text-right">0</td>
                    </tr>

                    {/* 9. Chi phí khác */}
                    <tr className="hover:bg-blue-50/50">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">Chi phí khác (9)</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-gray-900">{fmt(f.otherExpenses)}</td>
                    </tr>

                    {/* 10. Lợi nhuận thuần (Lãi ròng) */}
                    <tr className="bg-emerald-50/80 font-black text-emerald-900 text-sm">
                      <td className="py-3 px-4">Lợi nhuận thuần (10=(7+8)-9)</td>
                      <td className="py-3 px-4 text-right text-base text-emerald-700 font-black">{fmt(f.netProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer notes */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-[11px] text-gray-400 text-right font-semibold">
                Báo cáo tài chính khởi tạo tự động từ hệ thống Tikovia BizPOS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
