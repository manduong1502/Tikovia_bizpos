import React, { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FileSpreadsheet, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowLeft, ArrowRight, Printer, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const HorizontalChart = ({ title, dataList, valueKey, labelKey }) => {
  const rawMax = Math.max(...dataList.map(d => d[valueKey]), 0);
  // Pad the max value so the bar doesn't touch the very edge, unless it's 0
  const maxVal = rawMax === 0 ? 100000 : rawMax * 1.1; 
  
  const intervalsCount = 12; // 12 lines for 11 segments
  const intervalVal = maxVal / (intervalsCount - 1);
  const guideLines = [];
  for (let i = 0; i < intervalsCount; i++) {
    guideLines.push(intervalVal * i);
  }
  const chartMax = guideLines[guideLines.length - 1];

  return (
    <div className="bg-white border-b border-gray-100 flex flex-col pt-8 pb-10 animate-fade-in h-full">
      <h3 className="text-[14px] text-center text-gray-600 font-medium mb-12">{title}</h3>
      
      {dataList.length > 0 ? (
        <div className="relative w-full pl-[260px] pr-12 min-h-[60px]">
          {/* Vertical Guidelines and X-axis Labels */}
          <div className="absolute top-0 bottom-0 left-[260px] right-12 pointer-events-none flex justify-between border-b border-gray-300">
            {guideLines.map((val, idx) => (
              <div key={idx} className="h-full border-l border-gray-200 relative w-0">
                <span className="absolute -bottom-7 -translate-x-1/2 text-[11px] text-gray-500 font-medium">
                  {val === 0 ? '0' : val >= 1000000 ? `${(val / 1000000).toFixed(1).replace('.0', '')}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Y-axis labels and bars */}
          <div className="flex flex-col gap-6 z-10 relative mt-2 mb-2">
            {dataList.map((item, idx) => {
              const pct = (item[valueKey] / chartMax) * 100;
              return (
                <div key={idx} className="flex items-center w-full h-[22px] relative">
                  {/* Y-axis Label */}
                  <div className="absolute -left-[260px] w-[240px] text-right pr-4 text-[12px] text-gray-500 font-medium truncate">
                    {item[labelKey]}
                  </div>
                  {/* Bar */}
                  <div 
                    className="h-full bg-[#0070F4] transition-all hover:brightness-110 shadow-sm" 
                    style={{ width: `${Math.max(pct, 0)}%` }} 
                    title={`${item[labelKey]}: ${fmt(item[valueKey])}`}
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

export default function CustomersReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [viewType, setViewType] = useState('Biểu đồ'); // Biểu đồ / Báo cáo
  const [interestType, setInterestType] = useState('Bán hàng');
  const [timeRangeType, setTimeRangeType] = useState('week'); // week, custom
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('netrevenue-desc');

  const fetchData = () => {
    setLoading(true);
    let params = {};
    if (timeRangeType === 'week') {
      const today = new Date();
      const first = today.getDate() - today.getDay() + 1; // Monday
      const f = new Date(today.setDate(first));
      const t = new Date(today.setDate(first + 6)); // Sunday
      params.fromDate = f.toISOString().split('T')[0];
      params.toDate = t.toISOString().split('T')[0];
    } else {
      if (customFromDate) params.fromDate = customFromDate;
      if (customToDate) params.toDate = customToDate;
    }

    reportAPI.getCustomers(params)
      .then(res => {
        const rawList = res || [];
        const safeData = rawList.map(item => ({
          ...item,
          revenue: Number(item.revenue || 0),
          returnVal: Number(item.returnVal || 0),
          netRevenue: Number(item.netRevenue !== undefined ? item.netRevenue : (item.revenue || 0))
        }));
        setData(safeData);
      })
      .catch(err => toast.error('Lỗi tải dữ liệu báo cáo'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [timeRangeType, customFromDate, customToDate]);

  const getFilteredData = () => {
    let list = [...data];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.phone?.includes(q));
    }
    
    // Core sorting
    list.sort((a, b) => {
      if (sortType === 'netrevenue-desc') return b.netRevenue - a.netRevenue;
      if (sortType === 'netrevenue-asc') return a.netRevenue - b.netRevenue;
      if (sortType === 'returnval-desc') return b.returnVal - a.returnVal;
      if (sortType === 'returnval-asc') return a.returnVal - b.returnVal;
      if (sortType === 'name-asc') return a.name?.localeCompare(b.name);
      if (sortType === 'name-desc') return b.name?.localeCompare(a.name);
      return 0;
    });
    
    return list;
  };

  const processedData = getFilteredData();
  
  // Aggregate summaries
  const totalRevenue = processedData.reduce((s, d) => s + d.revenue, 0);
  const totalReturnVal = processedData.reduce((s, d) => s + d.returnVal, 0);
  const totalNet = processedData.reduce((s, d) => s + d.netRevenue, 0);

  const getFormattedDateRange = () => {
    if (timeRangeType === 'week') {
      const today = new Date();
      const first = today.getDate() - today.getDay() + 1;
      const last = first + 6;
      const f = new Date(today.setDate(first)).toLocaleDateString('vi-VN');
      const t = new Date(today.setDate(last)).toLocaleDateString('vi-VN');
      return `${f} đến ngày ${t}`;
    } else {
      if (!customFromDate || !customToDate) return new Date().toLocaleDateString('vi-VN');
      return `${customFromDate.split('-').reverse().join('/')} đến ngày ${customToDate.split('-').reverse().join('/')}`;
    }
  };

  const handleExportExcel = () => {
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const aoa = [
      [`Ngày lập: ${todayStr}`],
      [],
      ["", "", "Báo cáo bán hàng theo khách hàng"],
      ["", "", `Từ ngày ${getFormattedDateRange()}`],
      ["", "", "Chi nhánh: Chi nhánh trung tâm"],
      ["", "", "Bảng giá: Tất cả"],
      [],
      ["", "", "", "(Đã phân bổ giảm giá hóa đơn, giảm giá phiếu trả)"]
    ];

    aoa.push(["Mã KH", "Khách hàng", "Doanh thu", "Giá trị trả", "Doanh thu thuần"]);
    
    aoa.push([`SL khách hàng: ${processedData.length}`, "", totalRevenue, totalReturnVal, totalNet]);

    processedData.forEach(p => {
      aoa.push([ p.code, p.name, p.revenue, p.returnVal, p.netRevenue ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoKhachHang");
    XLSX.writeFile(workbook, `BaoCaoKhachHang_${Date.now()}.xlsx`);
    toast.success('Xuất báo cáo Excel thành công!');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 p-1.5 sm:p-6 bg-gray-50/50 min-h-screen text-[13px] text-gray-800 animate-page-in items-start">
      
      {/* ─── SIDEBAR FILTERS ─── */}
      <aside className="w-full lg:w-[260px] shrink-0 bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col gap-5 z-20 sticky top-4">
        
        {viewType === 'Báo cáo' && (
          <button onClick={handleExportExcel} className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all border-dashed">
            <FileSpreadsheet size={16} className="text-green-600" />
            <span>Xuất tất cả</span>
          </button>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner mt-1">
            <button
              onClick={() => setViewType('Biểu đồ')}
              className={`flex-1 py-2 rounded-xl border font-bold text-center cursor-pointer transition-all text-xs ${viewType === 'Biểu đồ' ? 'bg-[#0070F4] border-[#0070F4] text-white shadow-sm' : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-200/50'}`}
            >
              Biểu đồ
            </button>
            <button
              onClick={() => setViewType('Báo cáo')}
              className={`flex-1 py-2 rounded-xl border font-bold text-center cursor-pointer transition-all text-xs ${viewType === 'Báo cáo' ? 'bg-[#0070F4] border-[#0070F4] text-white shadow-sm' : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-200/50'}`}
            >
              Báo cáo
            </button>
          </div>
        </div>

        {viewType === 'Báo cáo' && (
          <div className="flex flex-col gap-2 mt-[-5px]">
            <select className="w-full mt-1 border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-gray-700">
              <option>Hiển thị dọc</option>
              <option>Hiển thị ngang</option>
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mối quan tâm</label>
          <select value={interestType} onChange={(e) => setInterestType(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-gray-700">
            <option value="Bán hàng">Bán hàng</option>
            <option value="Lợi nhuận">Lợi nhuận</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Thời gian</label>
          
          {/* Radio 1: Tuần này */}
          <div className="flex flex-col gap-1.5 border border-gray-200 rounded-xl p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeWeek" 
                checked={timeRangeType === 'week'} 
                onChange={() => setTimeRangeType('week')}
                className="w-4 h-4 text-[#0070F4] focus:ring-[#0070F4] border-gray-300 cursor-pointer"
              />
              <label htmlFor="timeRangeWeek" className="font-semibold text-xs cursor-pointer text-gray-700">Tuần này</label>
            </div>
          </div>

          {/* Radio 2: Tùy chỉnh */}
          <div className="flex flex-col gap-1.5 border border-gray-200 rounded-xl p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <input 
                type="radio" 
                name="timeRangeType" 
                id="timeRangeCustom" 
                checked={timeRangeType === 'custom'} 
                onChange={() => setTimeRangeType('custom')}
                className="w-4 h-4 text-[#0070F4] focus:ring-[#0070F4] border-gray-300 cursor-pointer"
              />
              <label htmlFor="timeRangeCustom" className="font-semibold text-xs cursor-pointer text-gray-700">Tùy chỉnh</label>
            </div>
            
            {timeRangeType === 'custom' && (
              <div className="flex flex-col gap-2.5 pl-6 mt-1.5 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Từ ngày:</span>
                  <input 
                    type="date" 
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:border-primary outline-none cursor-pointer font-medium text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400">Đến ngày:</span>
                  <input 
                    type="date" 
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:border-primary outline-none cursor-pointer font-medium text-gray-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-4">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Khách hàng</label>
          <input type="text" placeholder="Theo mã, tên, số điện thoại" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white outline-none focus:border-primary placeholder:text-gray-400 font-medium text-gray-700" />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-4 pb-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sắp xếp hiển thị</label>
          <select value={sortType} onChange={e => setSortType(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700 animate-fade-in shadow-sm">
            <option value="netrevenue-desc">Doanh thu thuần: Giảm dần</option>
            <option value="netrevenue-asc">Doanh thu thuần: Tăng dần</option>
            <option value="returnval-desc">Giá trị trả: Giảm dần</option>
            <option value="returnval-asc">Giá trị trả: Tăng dần</option>
            <option value="name-asc">Tên khách hàng: Tăng dần (A-Z)</option>
            <option value="name-desc">Tên khách hàng: Giảm dần (Z-A)</option>
          </select>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 w-full flex flex-col relative z-10 min-w-0">
        
        {viewType === 'Biểu đồ' ? (
          <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-2">
            <HorizontalChart 
              title={
                sortType.includes('returnval') ? "Top 10 khách hàng trả hàng nhiều nhất" :
                sortType.includes('name') ? "Top 10 khách hàng theo tên" :
                "Top 10 khách hàng mua nhiều nhất (đã trừ trả hàng)"
              }
              dataList={processedData.slice(0, 10)} 
              valueKey={sortType.includes('returnval') ? "returnVal" : "netRevenue"} 
              labelKey="name" 
            />
          </div>
        ) : (
          <>
            {/* A4 REPORT TOOLBAR */}
            <div className="h-12 bg-[#F3F4F6] border border-gray-300 px-4 flex items-center justify-between gap-4 shrink-0 shadow-sm z-10 text-gray-600 rounded-t-sm">
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"><ArrowLeft size={16} /></button>
                <button className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"><ArrowRight size={16} /></button>
                <button onClick={fetchData} className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"><RotateCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 text-gray-400"><ChevronsLeft size={14} /></button>
                <button className="p-1 text-gray-400"><ChevronLeft size={14} /></button>
                <span className="text-[12px] bg-white border border-gray-300 px-2.5 py-0.5 rounded font-bold text-gray-700">1 / 1</span>
                <button className="p-1 text-gray-400"><ChevronRight size={14} /></button>
                <button className="p-1 text-gray-400"><ChevronsRight size={14} /></button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 text-gray-500 hover:text-gray-800"><Printer size={16} /></button>
                <button className="p-1 text-gray-500 hover:text-gray-800"><ZoomOut size={16} /></button>
                <button className="p-1 text-gray-500 hover:text-gray-800"><ZoomIn size={16} /></button>
                <button className="p-1 text-gray-500 hover:text-gray-800"><Maximize2 size={16} /></button>
              </div>
            </div>

            {/* A4 REPORT PAPER */}
            <div className="bg-[#525659] p-4 sm:p-8 flex-1 overflow-auto rounded-b-sm shadow-inner min-h-[700px] flex justify-center">
              <div className="bg-white w-[880px] min-h-[900px] shadow-2xl origin-top transition-transform p-[40px] pt-[50px] font-serif text-slate-800 animate-fade-in relative">
                
                {/* Print Header */}
                <div className="flex justify-between items-start mb-6 text-[12px] text-gray-500 font-sans">
                  <span>Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="text-center mb-8">
                  <h1 className="text-[24px] font-bold text-gray-800 tracking-wide font-sans mb-3">
                    Báo cáo bán hàng theo khách hàng
                  </h1>
                  <div className="mt-1 flex flex-col gap-1.5 text-[13px] text-gray-600 font-sans">
                    <p>Từ {getFormattedDateRange()}</p>
                    <p>Chi nhánh: Chi nhánh trung tâm</p>
                  </div>
                </div>

                <div className="text-right text-[11px] italic text-gray-500 mb-2 font-sans">
                  (Đã phân bổ giảm giá hóa đơn, giảm giá phiếu trả)
                </div>

                <table className="w-full text-[12px] border-collapse font-sans border-t border-b border-gray-300">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-700 font-bold border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left w-[120px]">Mã KH</th>
                      <th className="px-3 py-2.5 text-left">Khách hàng</th>
                      <th className="px-3 py-2.5 text-right w-[120px]">Doanh thu</th>
                      <th className="px-3 py-2.5 text-right w-[120px]">Giá trị trả</th>
                      <th className="px-3 py-2.5 text-right w-[120px]">Doanh thu thuần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    <tr className="bg-[#F7F2E8] text-slate-800 font-extrabold border-b border-gray-200">
                      <td className="px-3 py-2.5 font-bold" colSpan={2}>SL khách hàng: {processedData.length}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(totalRevenue)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(totalReturnVal)}</td>
                      <td className="px-3 py-2.5 text-right text-[#0070F4]">{fmt(totalNet)}</td>
                    </tr>
                    
                    {processedData.length > 0 ? processedData.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-[#0070F4] font-bold">{item.code || `KH${String(item.id).padStart(5,'0')}`}</td>
                        <td className="px-3 py-2.5 text-gray-700">{item.name}</td>
                        <td className="px-3 py-2.5 text-right text-gray-800">{fmt(item.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{fmt(item.returnVal)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-800 font-bold">{fmt(item.netRevenue)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400 font-medium">
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
