import React, { useState, useEffect } from 'react';
import { reportAPI, categoryAPI } from '../../services/api';
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
    <div className="bg-white border-b border-gray-100 flex flex-col pt-8 pb-10 animate-fade-in">
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
          <div className="flex flex-col gap-4 z-10 relative mt-2 mb-2">
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

export default function ProductsReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [viewType, setViewType] = useState('Biểu đồ'); // Biểu đồ / Báo cáo
  const [interestType, setInterestType] = useState('Bán hàng');
  const [timeRangeType, setTimeRangeType] = useState('week'); // week, custom
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('revenue-desc');
  const [categories, setCategories] = useState([]);
  const [selectedProductType, setSelectedProductType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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

    reportAPI.getProducts(params)
      .then(res => {
        const rawList = res || [];
        const safeData = rawList.map(item => ({
          ...item,
          soldQty: Number(item.soldQty !== undefined ? item.soldQty : (item.soldQuantity || 0)),
          revenue: Number(item.revenue || 0),
          returnQty: Number(item.returnQty || 0),
          returnVal: Number(item.returnVal || 0),
          netRevenue: Number(item.netRevenue !== undefined ? item.netRevenue : (item.revenue || 0))
        }));
        setData(safeData);
      })
      .catch(err => toast.error('Lỗi tải dữ liệu báo cáo'))
      .finally(() => setLoading(false));
      
    categoryAPI.getAll().then(res => {
      let cats = [];
      if (res && res.roots) {
        const flatten = (list, prefix = '') => {
          let flattened = [];
          for (let item of list) {
            flattened.push({ ...item, name: prefix + item.name });
            if (item.children && item.children.length > 0) {
              flattened = flattened.concat(flatten(item.children, prefix + '— '));
            }
          }
          return flattened;
        };
        cats = flatten(res.roots);
      } else if (Array.isArray(res)) {
        cats = res;
      }
      setCategories(cats);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, [timeRangeType, customFromDate, customToDate]);

  const getFilteredData = () => {
    let list = [...data];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    
    if (selectedProductType) {
      list = list.filter(p => selectedProductType === 'product' ? p.type !== 'service' : p.type === 'service');
    }
    
    if (selectedCategory) {
      list = list.filter(p => String(p.categoryId) === String(selectedCategory));
    }
    
    // Core sorting
    list.sort((a, b) => {
      if (sortType === 'revenue-desc') return b.netRevenue - a.netRevenue;
      if (sortType === 'revenue-asc') return a.netRevenue - b.netRevenue;
      if (sortType === 'qty-desc') return (b.soldQty - b.returnQty) - (a.soldQty - a.returnQty);
      if (sortType === 'qty-asc') return (a.soldQty - a.returnQty) - (b.soldQty - b.returnQty);
      if (sortType === 'name-asc') return a.name?.localeCompare(b.name);
      if (sortType === 'name-desc') return b.name?.localeCompare(a.name);
      if (sortType === 'sku-asc') return a.sku?.localeCompare(b.sku);
      if (sortType === 'sku-desc') return b.sku?.localeCompare(a.sku);
      return 0;
    });
    
    return list;
  };

  const processedData = getFilteredData();
  
  // Aggregate summaries
  const totalSoldQty = processedData.reduce((s, d) => s + d.soldQty, 0);
  const totalRevenue = processedData.reduce((s, d) => s + d.revenue, 0);
  const totalReturnQty = processedData.reduce((s, d) => s + d.returnQty, 0);
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
      ["", "", "Báo cáo bán hàng theo hàng hóa"],
      ["", "", `Từ ngày ${getFormattedDateRange()}`],
      ["", "", "Chi nhánh: Chi nhánh trung tâm"],
      ["", "", "Bảng giá: Tất cả"],
      [],
      ["", "", "", "", "(Đã phân bổ giảm giá hóa đơn, giảm giá phiếu trả)"]
    ];

    aoa.push(["Mã hàng", "Tên hàng", "SL Bán", "Doanh thu", "SL Trả", "Giá trị trả", "Doanh thu thuần"]);
    
    aoa.push(["Tổng cộng", "", totalSoldQty, totalRevenue, totalReturnQty, totalReturnVal, totalNet]);

    processedData.forEach(p => {
      aoa.push([ p.sku, p.name, p.soldQty, p.revenue, p.returnQty, p.returnVal, p.netRevenue ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoHangHoa");
    XLSX.writeFile(workbook, `BaoCaoHangHoa_${Date.now()}.xlsx`);
    toast.success('Xuất báo cáo Excel thành công!');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-1.5 sm:p-4 bg-gray-50/50 min-h-screen text-[13px] text-gray-800 animate-page-in items-start">
      
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
            <label className="flex items-center gap-2 mt-2 text-[12px] text-gray-700 cursor-pointer font-medium">
              <input type="checkbox" className="w-3.5 h-3.5 text-primary rounded border-gray-300" /> Gộp hàng hóa cùng loại
            </label>
            <label className="flex items-center gap-2 mt-1 text-[12px] text-gray-700 cursor-pointer font-medium">
              <input type="checkbox" className="w-3.5 h-3.5 text-primary rounded border-gray-300" /> Gộp theo nhóm hàng
            </label>
          </div>
        )}

        {viewType === 'Biểu đồ' && (
          <div className="flex flex-col gap-2 mt-[-5px]">
            <label className="flex items-center gap-2 mt-2 text-[12px] text-gray-700 cursor-pointer font-medium">
              <input type="checkbox" className="w-3.5 h-3.5 text-primary rounded border-gray-300" /> Gộp hàng hóa cùng loại
            </label>
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
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hàng hóa</label>
          <input type="text" placeholder="Theo mã, tên hàng" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white outline-none focus:border-primary placeholder:text-gray-400 font-medium text-gray-700" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Loại hàng</label>
          <select value={selectedProductType} onChange={e => setSelectedProductType(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary font-medium text-gray-700">
            <option value="">Tất cả loại hàng</option>
            <option value="product">Hàng hóa</option>
            <option value="service">Dịch vụ</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nhóm hàng</label>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary font-medium text-gray-700">
            <option value="">Tất cả nhóm hàng</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-4 pb-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sắp xếp hiển thị</label>
          <select value={sortType} onChange={e => setSortType(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-2 text-xs bg-white outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium text-gray-700 animate-fade-in shadow-sm">
            <option value="revenue-desc">Doanh thu: Giảm dần</option>
            <option value="revenue-asc">Doanh thu: Tăng dần</option>
            <option value="qty-desc">Số lượng: Giảm dần</option>
            <option value="qty-asc">Số lượng: Tăng dần</option>
            <option value="name-asc">Tên hàng: Tăng dần (A-Z)</option>
            <option value="name-desc">Tên hàng: Giảm dần (Z-A)</option>
            <option value="sku-asc">Mã hàng: Tăng dần (A-Z)</option>
            <option value="sku-desc">Mã hàng: Giảm dần (Z-A)</option>
          </select>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 w-full flex flex-col relative z-10 min-w-0">
        
        {viewType === 'Biểu đồ' ? (
          <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-2">
            <HorizontalChart 
              title={
                sortType.includes('qty') ? "Top 10 sản phẩm bán chạy theo số lượng (đã trừ trả hàng)" :
                sortType.includes('name') ? "Top 10 sản phẩm theo tên" :
                sortType.includes('sku') ? "Top 10 sản phẩm theo mã hàng" :
                "Top 10 sản phẩm doanh thu cao nhất (đã trừ trả hàng)"
              }
              dataList={processedData.slice(0, 10)} 
              valueKey={sortType.includes('qty') ? "soldQty" : "netRevenue"} 
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
                    Báo cáo bán hàng theo hàng hóa
                  </h1>
                  <div className="mt-1 flex flex-col gap-1.5 text-[13px] text-gray-600 font-sans">
                    <p>Từ {getFormattedDateRange()}</p>
                    <p>Chi nhánh: Chi nhánh trung tâm</p>
                    <p>Bảng giá: Tất cả</p>
                  </div>
                </div>

                <div className="text-right text-[11px] italic text-gray-500 mb-2 font-sans">
                  (Đã phân bổ giảm giá hóa đơn, giảm giá phiếu trả)
                </div>

                <table className="w-full text-[12px] border-collapse font-sans border-t border-b border-gray-300">
                  <thead>
                    <tr className="bg-[#BFE3F9] text-slate-700 font-bold border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left w-[120px]">Mã hàng</th>
                      <th className="px-3 py-2.5 text-left">Tên hàng</th>
                      <th className="px-2 py-2.5 text-right w-[70px]">SL Bán</th>
                      <th className="px-3 py-2.5 text-right w-[100px]">Doanh thu</th>
                      <th className="px-2 py-2.5 text-right w-[70px]">SL Trả</th>
                      <th className="px-3 py-2.5 text-right w-[100px]">Giá trị trả</th>
                      <th className="px-3 py-2.5 text-right w-[120px]">Doanh thu thuần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    <tr className="bg-[#F7F2E8] text-slate-800 font-extrabold border-b border-gray-200">
                      <td className="px-3 py-2.5" colSpan={2}>Tổng cộng</td>
                      <td className="px-2 py-2.5 text-right">{totalSoldQty}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(totalRevenue)}</td>
                      <td className="px-2 py-2.5 text-right">{totalReturnQty}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(totalReturnVal)}</td>
                      <td className="px-3 py-2.5 text-right text-[#0070F4]">{fmt(totalNet)}</td>
                    </tr>
                    
                    {processedData.length > 0 ? processedData.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-[#0070F4] font-bold">{item.sku}</td>
                        <td className="px-3 py-2.5 text-gray-700">{item.name}</td>
                        <td className="px-2 py-2.5 text-right text-gray-800">{item.soldQty}</td>
                        <td className="px-3 py-2.5 text-right text-gray-800">{fmt(item.revenue)}</td>
                        <td className="px-2 py-2.5 text-right text-gray-600">{item.returnQty}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{fmt(item.returnVal)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-800 font-bold">{fmt(item.netRevenue)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400 font-medium">
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
