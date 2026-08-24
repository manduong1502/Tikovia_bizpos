import React, { useState, useEffect, useMemo } from 'react';
import { 
  reportAPI, employeeAPI, orderAPI, returnAPI, productAPI, purchaseOrderAPI, loadInitialCache 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Download, Printer, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  ChevronDown, ChevronRight, FileSpreadsheet, Calendar, 
  Search, Users, DollarSign, ArrowLeft, ArrowRight,
  ChevronLeft, ChevronsLeft, ChevronsRight, FileText, Filter
} from 'lucide-react';
import SalesOrderDetailModal from '../../components/modals/SalesOrderDetailModal';
import ReportTimeFilter, { formatDateVN, formatDateYMD } from '../../components/ui/ReportTimeFilter';
import { 
  getRangeByCreatedLabel, formatWorkingHoursDateTime, formatLocalYMD, 
  getWorkingHoursYMD, getWorkingHoursDMY, formatWorkingHoursTime, buildCustomRange 
} from '../../utils/dateFilterUtils';

const fmt = (n) => {
  const val = Math.round(Number(n || 0));
  if (val < 0) {
    return `-${new Intl.NumberFormat('vi-VN').format(Math.abs(val))}`;
  }
  return new Intl.NumberFormat('vi-VN').format(val);
};

const fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(n || 0));

// ─── INTERACTIVE SALES REPORT CHART (Exact KiotViet Style) ───
const SalesReportChart = ({ groupedDates, interestType, displayType, grandTotals }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const chartData = useMemo(() => {
    return [...groupedDates].sort((a, b) => {
      const [d1, m1, y1] = a.dateStr.split('/');
      const [d2, m2, y2] = b.dateStr.split('/');
      return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });
  }, [groupedDates]);

  const maxScaleVal = useMemo(() => {
    let max = 1000000;
    chartData.forEach(d => {
      if (interestType === 'Thời gian') {
        max = Math.max(max, d.revenue || 0, d.returnValue || 0);
      } else if (interestType === 'Lợi nhuận') {
        max = Math.max(max, d.revenue || 0, d.grossProfit || 0, d.costPriceSum || 0);
      } else if (interestType === 'Trả hàng') {
        max = Math.max(max, d.returnValue || 0);
      }
    });
    return max * 1.15;
  }, [chartData, interestType]);

  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(maxScaleVal * r));

  const formatTickLabel = (num) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1).replace('.0', '')} tỷ`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)} tr`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)} k`;
    return String(num);
  };

  const chartTitle = useMemo(() => {
    if (interestType === 'Thời gian') return "Biểu đồ doanh thu theo thời gian";
    if (interestType === 'Lợi nhuận') return "Biểu đồ lợi nhuận theo thời gian";
    if (interestType === 'Trả hàng') return "Biểu đồ trả hàng theo thời gian";
    return "Biểu đồ bán hàng";
  }, [interestType]);

  return (
    <div className="flex-1 bg-white p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar select-none animate-fade-in">
      {/* Top Header & Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">{chartTitle}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Số liệu được cập nhật theo khoảng thời gian đã chọn</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          {interestType === 'Thời gian' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#0077CC]" />
                <span className="text-gray-700">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#EF4444]" />
                <span className="text-gray-700">Giá trị trả</span>
              </div>
            </>
          )}

          {interestType === 'Lợi nhuận' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#0077CC]" />
                <span className="text-gray-700">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#10B981]" />
                <span className="text-gray-700">Lợi nhuận gộp</span>
              </div>
            </>
          )}

          {interestType === 'Trả hàng' && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#EF4444]" />
              <span className="text-gray-700">Tổng tiền trả</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {interestType === 'Thời gian' && (
          <>
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-lg">
              <span className="text-xs font-bold text-blue-700 uppercase">Tổng Doanh thu</span>
              <p className="text-xl font-extrabold text-blue-900 mt-1">{fmt(grandTotals.revenue)} đ</p>
            </div>
            <div className="p-4 bg-red-50/60 border border-red-100 rounded-lg">
              <span className="text-xs font-bold text-red-700 uppercase">Tổng Giá trị trả</span>
              <p className="text-xl font-extrabold text-red-900 mt-1">{fmt(grandTotals.returnValue)} đ</p>
            </div>
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-lg">
              <span className="text-xs font-bold text-emerald-700 uppercase">Doanh thu thuần</span>
              <p className="text-xl font-extrabold text-emerald-900 mt-1">{fmt(grandTotals.netRevenue)} đ</p>
            </div>
          </>
        )}

        {interestType === 'Lợi nhuận' && (
          <>
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-lg">
              <span className="text-xs font-bold text-blue-700 uppercase">Tổng Doanh thu</span>
              <p className="text-xl font-extrabold text-blue-900 mt-1">{fmt(grandTotals.revenue)} đ</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs font-bold text-slate-700 uppercase">Tổng Giá vốn</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{fmt(grandTotals.costPrice)} đ</p>
            </div>
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-lg">
              <span className="text-xs font-bold text-emerald-700 uppercase">Lợi nhuận gộp</span>
              <p className="text-xl font-extrabold text-emerald-900 mt-1">{fmt(grandTotals.grossProfit)} đ</p>
            </div>
          </>
        )}

        {interestType === 'Trả hàng' && (
          <>
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-lg">
              <span className="text-xs font-bold text-blue-700 uppercase">Tổng Số lượng trả</span>
              <p className="text-xl font-extrabold text-blue-900 mt-1">{fmtQty(grandTotals.returnQty)}</p>
            </div>
            <div className="p-4 bg-red-50/60 border border-red-100 rounded-lg">
              <span className="text-xs font-bold text-red-700 uppercase">Tổng Tiền trả</span>
              <p className="text-xl font-extrabold text-red-900 mt-1">{fmt(grandTotals.returnValue)} đ</p>
            </div>
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-lg">
              <span className="text-xs font-bold text-emerald-700 uppercase">Đã thanh toán trả</span>
              <p className="text-xl font-extrabold text-emerald-900 mt-1">{fmt(grandTotals.returnPaid)} đ</p>
            </div>
          </>
        )}
      </div>

      {/* ─── Column / Bar Chart ─── */}
      {displayType === 'Hiển thị dọc' ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 relative min-h-[420px] flex flex-col justify-end">
          <div className="absolute inset-x-6 top-6 bottom-14 pointer-events-none flex flex-col justify-between">
            {gridTicks.slice().reverse().map((tick, idx) => (
              <div key={idx} className="w-full border-b border-gray-150 flex items-end justify-between relative">
                <span className="absolute -top-3 left-0 text-[11px] font-medium text-gray-400">
                  {formatTickLabel(tick)}
                </span>
              </div>
            ))}
          </div>

          <div className="relative z-10 pl-16 pr-4 h-[300px] flex items-end justify-around gap-2">
            {chartData.length > 0 ? (
              chartData.map((item, idx) => {
                const dateLabel = item.dateStr.split('/').slice(0, 2).join('/');
                const revPct = Math.min(100, Math.max(0, ((item.revenue || 0) / maxScaleVal) * 100));
                const retPct = Math.min(100, Math.max(0, ((item.returnValue || 0) / maxScaleVal) * 100));
                const profitPct = Math.min(100, Math.max(0, ((item.grossProfit || 0) / maxScaleVal) * 100));
                const isHovered = hoveredIdx === idx;

                return (
                  <div 
                    key={item.dateStr}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {isHovered && (
                      <div className="absolute bottom-full mb-3 z-30 bg-slate-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs flex flex-col gap-1 pointer-events-none whitespace-nowrap animate-fade-in font-sans">
                        <div className="font-bold border-b border-slate-700 pb-1 text-slate-200">{item.dateStr}</div>
                        {interestType === 'Thời gian' && (
                          <>
                            <div className="flex justify-between gap-4"><span className="text-blue-300">Doanh thu:</span><span className="font-bold">{fmt(item.revenue)} đ</span></div>
                            <div className="flex justify-between gap-4"><span className="text-red-300">Giá trị trả:</span><span className="font-bold">{fmt(item.returnValue)} đ</span></div>
                          </>
                        )}
                        {interestType === 'Lợi nhuận' && (
                          <>
                            <div className="flex justify-between gap-4"><span className="text-blue-300">Doanh thu:</span><span className="font-bold">{fmt(item.revenue)} đ</span></div>
                            <div className="flex justify-between gap-4"><span className="text-slate-300">Giá vốn:</span><span className="font-bold">{fmt(item.costPriceSum)} đ</span></div>
                            <div className="flex justify-between gap-4 border-t border-slate-700 pt-0.5"><span className="text-emerald-300">Lợi nhuận gộp:</span><span className="font-bold">{fmt(item.grossProfit)} đ</span></div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="w-full flex items-end justify-center gap-1 h-full pb-2">
                      {interestType === 'Thời gian' && (
                        <>
                          <div className="w-5 bg-[#0077CC] rounded-t-sm transition-all group-hover:brightness-110" style={{ height: `${revPct}%` }} />
                          {item.returnValue > 0 && <div className="w-5 bg-[#EF4444] rounded-t-sm transition-all group-hover:brightness-110" style={{ height: `${retPct}%` }} />}
                        </>
                      )}
                      {interestType === 'Lợi nhuận' && (
                        <>
                          <div className="w-5 bg-[#0077CC] rounded-t-sm transition-all group-hover:brightness-110" style={{ height: `${revPct}%` }} />
                          <div className="w-5 bg-[#10B981] rounded-t-sm transition-all group-hover:brightness-110" style={{ height: `${profitPct}%` }} />
                        </>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500 group-hover:text-slate-900 transition-colors">{dateLabel}</span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Không có dữ liệu biểu đồ</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4">
          {chartData.length > 0 ? (
            chartData.map(item => {
              const revPct = Math.min(100, Math.max(0, ((item.revenue || 0) / maxScaleVal) * 100));
              const profitPct = Math.min(100, Math.max(0, ((item.grossProfit || 0) / maxScaleVal) * 100));
              return (
                <div key={item.dateStr} className="flex items-center gap-4 w-full">
                  <span className="w-20 shrink-0 text-right text-xs font-semibold text-gray-600">{item.dateStr}</span>
                  <div className="flex-1 flex flex-col gap-1 bg-gray-50 p-2 rounded border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="h-4 bg-[#0077CC] rounded-xs" style={{ width: `${revPct}%` }} />
                      <span className="text-[11px] font-bold text-gray-700">{fmt(item.revenue)}</span>
                    </div>
                    {interestType === 'Lợi nhuận' && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 bg-[#10B981] rounded-xs" style={{ width: `${profitPct}%` }} />
                        <span className="text-[11px] font-bold text-emerald-700">LN: {fmt(item.grossProfit)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-400 font-medium">Không có dữ liệu biểu đồ</div>
          )}
        </div>
      )}
    </div>
  );
};

const LoadingStateRow = ({ colSpan, text = "Đang tải dữ liệu báo cáo, vui lòng đợi trong giây lát..." }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-16 text-gray-500 font-medium">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-blue-100 border-t-[#0077CC] rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-700">{text}</span>
        <span className="text-[11px] text-gray-400">Hệ thống đang xử lý và tổng hợp số liệu...</span>
      </div>
    </td>
  </tr>
);

export default function SalesReportPage() {
  const [productsList, setProductsList] = useState(() => loadInitialCache('products:all', []));
  const [purchaseOrdersList, setPurchaseOrdersList] = useState(() => loadInitialCache('purchase_orders', []));
  const [data, setData] = useState({ transactions: [], returns: [], orderCount: 0, totalSales: 0, totalPaid: 0, totalReturns: 0, netRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState({});
  const [singleDayExpanded, setSingleDayExpanded] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);

  // Filter States matching KiotViet
  const [viewType, setViewType] = useState('Báo cáo');
  const [displayType, setDisplayType] = useState('Hiển thị dọc');
  const [interestType, setInterestType] = useState('Lợi nhuận');
  const [priceBook, setPriceBook] = useState('');
  const [taxMode, setTaxMode] = useState('withoutTax');
  const [salesMethod, setSalesMethod] = useState('');
  const [salesChannel, setSalesChannel] = useState('');
  const [seller, setSeller] = useState('');

  // Date & Time Filter States matching EndOfDayReportPage
  const [timeRangeType, setTimeRangeType] = useState('date');
  const [selectedSingleDate, setSelectedSingleDate] = useState(new Date());
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  const [employees, setEmployees] = useState(() => loadInitialCache('employees', []));

  useEffect(() => {
    employeeAPI.getAll().then(res => setEmployees(res || [])).catch(() => {});
  }, []);

  // Compute Moving Weighted Average Cost Map
  const purchaseCostMap = useMemo(() => {
    const acc = {};
    (purchaseOrdersList || []).forEach(po => {
      if (po.status === 'CANCELLED' || po.status === 'cancelled' || po.isCancelled) return;
      (po.items || po._items || po.details || []).forEach(it => {
        const sku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
        const name = it.product_name || it.name || '';
        const qty = Number(it.quantity || it.qty || 0);
        const price = Number(it.unit_price ?? it.price ?? it.cost_price ?? it.import_price ?? 0);
        if (qty > 0 && price > 0) {
          [sku, String(sku).trim().toLowerCase(), name, String(name).trim().toLowerCase()].forEach(k => {
            if (!k) return;
            if (!acc[k]) acc[k] = { totalQty: 0, totalVal: 0 };
            acc[k].totalQty += qty;
            acc[k].totalVal += (qty * price);
          });
        }
      });
    });

    const costMap = {};
    Object.keys(acc).forEach(k => {
      if (acc[k].totalQty > 0) {
        costMap[k] = Math.round(acc[k].totalVal / acc[k].totalQty);
      }
    });
    return costMap;
  }, [purchaseOrdersList]);

  // Product Master Cost Map
  const productInfoMap = useMemo(() => {
    const map = {};
    let allProds = [...(productsList || [])];
    allProds.forEach(p => {
      if (!p) return;
      const cost = Number(p.costPrice ?? p.cost_price ?? p.cost ?? p.lastImportPrice ?? p.last_import_price ?? p.import_price ?? p.importPrice ?? p.gia_von ?? p.giaVon ?? 0);
      const info = { cost, name: p.name, sku: p.sku || p.code };
      if (p.id) { map[p.id] = info; map[String(p.id)] = info; }
      if (p.code) { map[p.code] = info; map[String(p.code).trim().toLowerCase()] = info; }
      if (p.sku) { map[p.sku] = info; map[String(p.sku).trim().toLowerCase()] = info; }
      if (p.name) { map[p.name] = info; map[String(p.name).trim().toLowerCase()] = info; }
    });
    return map;
  }, [productsList]);

  const fetchData = async () => {
    setLoading(true);
    let params = {};
    if (timeRangeType === 'date') {
      const d = new Date(selectedSingleDate);
      const prevDay = new Date(d); prevDay.setDate(prevDay.getDate() - 1);
      const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
      params.fromDate = formatLocalYMD(prevDay);
      params.toDate = formatLocalYMD(nextDay);
      params.date = formatLocalYMD(selectedSingleDate);
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
      const [endOfDayRes, ordersRes, returnsRes, prodsRes, poRes] = await Promise.all([
        reportAPI.getEndOfDay(params).catch(() => null),
        orderAPI.getAll({ limit: 5000 }).catch(() => []),
        returnAPI.getAll({ limit: 5000 }).catch(() => []),
        productAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll().catch(() => [])
      ]);

      const rawOrderList = Array.isArray(ordersRes?.data) ? ordersRes.data : (Array.isArray(ordersRes) ? ordersRes : []);
      const rawReturnList = Array.isArray(returnsRes?.data) ? returnsRes.data : (Array.isArray(returnsRes) ? returnsRes : []);
      const prods = Array.isArray(prodsRes?.data) ? prodsRes.data : (Array.isArray(prodsRes) ? prodsRes : []);
      const poList = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes) ? poRes : []);

      setProductsList(prods);
      setPurchaseOrdersList(poList);

      // Build local cost maps directly from fresh poList & prods to avoid React state lag
      const localPurchaseCostMap = {};
      const acc = {};
      (poList || []).forEach(po => {
        if (po.status === 'CANCELLED' || po.status === 'cancelled' || po.isCancelled) return;
        (po.items || po._items || po.details || []).forEach(it => {
          const sku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
          const name = it.product_name || it.name || '';
          const qty = Number(it.quantity || it.qty || 0);
          const price = Number(it.unit_price ?? it.price ?? it.cost_price ?? it.import_price ?? 0);
          if (qty > 0 && price > 0) {
            [sku, String(sku).trim().toLowerCase(), name, String(name).trim().toLowerCase()].forEach(k => {
              if (!k) return;
              if (!acc[k]) acc[k] = { totalQty: 0, totalVal: 0 };
              acc[k].totalQty += qty;
              acc[k].totalVal += (qty * price);
            });
          }
        });
      });
      Object.keys(acc).forEach(k => {
        if (acc[k].totalQty > 0) {
          localPurchaseCostMap[k] = Math.round(acc[k].totalVal / acc[k].totalQty);
        }
      });

      const localProductInfoMap = {};
      (prods || []).forEach(p => {
        if (!p) return;
        const cost = Number(p.costPrice ?? p.cost_price ?? p.cost ?? p.lastImportPrice ?? p.last_import_price ?? p.import_price ?? p.importPrice ?? p.gia_von ?? p.giaVon ?? 0);
        const info = { cost, name: p.name, sku: p.sku || p.code };
        if (p.id) { localProductInfoMap[p.id] = info; localProductInfoMap[String(p.id)] = info; }
        if (p.code) { localProductInfoMap[p.code] = info; localProductInfoMap[String(p.code).trim().toLowerCase()] = info; }
        if (p.sku) { localProductInfoMap[p.sku] = info; localProductInfoMap[String(p.sku).trim().toLowerCase()] = info; }
        if (p.name) { localProductInfoMap[p.name] = info; localProductInfoMap[String(p.name).trim().toLowerCase()] = info; }
      });

      const orderItemsMap = {};
      rawOrderList.forEach(o => {
        const code = o.code || (o.id ? `HD${String(o.id).padStart(5, '0')}` : '');
        const items = o.items || o._items || o.order_items || o.details || [];
        if (code) orderItemsMap[code] = { items, order: o };
        if (o.id) orderItemsMap[o.id] = { items, order: o };
      });

      const returnItemsMap = {};
      rawReturnList.forEach(r => {
        const code = r.code || (r.id ? `TH${String(r.id).padStart(5, '0')}` : '');
        const items = r.items || r._items || r.return_items || r.details || [];
        if (code) returnItemsMap[code] = { items, returnOrder: r };
        if (r.id) returnItemsMap[r.id] = { items, returnOrder: r };
      });

      let rawTx = (endOfDayRes?.transactions && endOfDayRes.transactions.length > 0) ? endOfDayRes.transactions : rawOrderList;
      let rawRet = (endOfDayRes?.returns && endOfDayRes.returns.length > 0) ? endOfDayRes.returns : rawReturnList;

      const combinedTransactions = rawTx.map(tx => {
        const code = tx.code || (tx.id ? `HD${String(tx.id).padStart(5, '0')}` : '---');
        const lookup = orderItemsMap[code] || orderItemsMap[tx.id] || {};
        let items = (Array.isArray(tx.items) && tx.items.length > 0) ? tx.items : (lookup.items || tx._items || tx.details || []);
        const fullOrder = lookup.order || tx;

        const revenue = Number(fullOrder.total || tx.revenue || 0);
        const itemTotal = items.reduce((sum, it) => sum + (Number(it.quantity || it.qty || 0) * Number(it.price || it.unit_price || 0)), 0);
        const discount = Number(fullOrder.discount || fullOrder.discount_amount || (itemTotal > revenue ? itemTotal - revenue : 0));
        const rawTotal = itemTotal > 0 ? itemTotal : (revenue + discount);
        const time = tx.time || tx.created_at || tx.createdAt || tx.date || new Date().toISOString();
        const customerName = tx.customerName || tx.customer_name || tx.customer?.name || fullOrder.customerName || 'Khách lẻ';
        const createdBy = tx.createdBy || tx.created_by || fullOrder.createdBy || 'Admin';

        let totalCost = 0;
        if (items.length > 0) {
          items.forEach(it => {
            const rawSku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
            const rawName = it.product_name || it.name || it.title || '';
            const qty = Number(it.quantity || it.qty || 0);
            const price = Number(it.price || it.unit_price || 0);

            let unitCost = localPurchaseCostMap[rawSku] || localPurchaseCostMap[String(rawSku).trim().toLowerCase()] || localPurchaseCostMap[rawName] || localProductInfoMap[rawSku]?.cost || 0;
            if (!unitCost || unitCost <= 0) unitCost = Number(it.cost_price || it.costPrice || 0);
            if (!unitCost || unitCost <= 0) unitCost = Math.round(price * 0.9491);
            totalCost += (qty * unitCost);
          });
        } else {
          totalCost = Math.round(revenue * 0.9491);
        }

        return {
          ...tx,
          id: tx.id || code,
          code,
          time,
          customerName,
          createdBy,
          revenue,
          rawTotal,
          discount,
          costPrice: totalCost,
          grossProfit: revenue - totalCost,
          quantity: tx.quantity !== undefined ? Number(tx.quantity) : items.reduce((s, it) => s + Number(it.quantity || it.qty || 0), 0),
          items
        };
      });

      const combinedReturns = rawRet.map(ret => {
        const code = ret.code || (ret.id ? `TH${String(ret.id).padStart(5, '0')}` : '---');
        const lookup = returnItemsMap[code] || returnItemsMap[ret.id] || {};
        let items = (Array.isArray(ret.items) && ret.items.length > 0) ? ret.items : (lookup.items || ret._items || ret.details || []);
        const revenue = Math.abs(Number(ret.revenue || ret.total || 0));
        const time = ret.time || ret.created_at || ret.createdAt || ret.date || new Date().toISOString();
        const customerName = ret.customerName || ret.customer_name || 'Khách lẻ';

        let totalCost = 0;
        items.forEach(it => {
          const rawSku = it.product_sku || it.sku || (it.productId ? `SP${it.productId}` : '') || '';
          let unitCost = localPurchaseCostMap[rawSku] || localProductInfoMap[rawSku]?.cost || 0;
          if (!unitCost || unitCost <= 0) unitCost = Math.round((Number(it.price || it.returnPrice || 0)) * 0.9491);
          totalCost += (Number(it.quantity || it.qty || 0) * unitCost);
        });
        if (totalCost === 0) totalCost = Math.round(revenue * 0.9491);

        return {
          ...ret,
          id: ret.id || code,
          code,
          time,
          customerName,
          revenue,
          paid: Math.abs(Number(ret.paid || revenue)),
          quantity: Number(ret.quantity || (items.length > 0 ? items.reduce((s, it) => s + Number(it.quantity || it.qty || 0), 0) : 1)),
          costPrice: totalCost,
          items
        };
      });

      setData({ transactions: combinedTransactions, returns: combinedReturns });
    } catch (err) {
      console.error("Error loading sales report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRangeType, selectedSingleDate, customFromDate, customToDate]);

  // Filter transactions with dynamic reactive cost calculation
  const filteredTransactions = useMemo(() => {
    let txList = data.transactions || [];
    const targetYMD = formatDateYMD(selectedSingleDate);

    if (timeRangeType === 'date') {
      txList = txList.filter(tx => getWorkingHoursYMD(tx.time) === targetYMD);
    } else {
      if (customFromDate) txList = txList.filter(tx => { const ymd = getWorkingHoursYMD(tx.time); return !ymd || ymd >= customFromDate; });
      if (customToDate) txList = txList.filter(tx => { const ymd = getWorkingHoursYMD(tx.time); return !ymd || ymd <= customToDate; });
    }

    if (timeFrom) txList = txList.filter(tx => { const t = formatWorkingHoursTime(tx.time); return !t || t >= timeFrom; });
    if (timeTo) txList = txList.filter(tx => { const t = formatWorkingHoursTime(tx.time); return !t || t <= timeTo; });
    if (seller) txList = txList.filter(tx => tx.createdBy === seller);

    return txList.map(tx => {
      let totalCost = 0;
      const items = tx.items || [];
      if (items.length > 0) {
        items.forEach(it => {
          const rawSku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
          const rawName = it.product_name || it.name || it.title || '';
          const qty = Number(it.quantity || it.qty || 0);
          const price = Number(it.price || it.unit_price || 0);

          let unitCost = purchaseCostMap[rawSku] || purchaseCostMap[String(rawSku).trim().toLowerCase()] || purchaseCostMap[rawName] || productInfoMap[rawSku]?.cost || 0;
          if (!unitCost || unitCost <= 0) unitCost = Number(it.cost_price || it.costPrice || 0);
          if (!unitCost || unitCost <= 0) unitCost = Math.round(price * 0.9491);
          totalCost += (qty * unitCost);
        });
      } else {
        totalCost = Math.round(Number(tx.revenue || 0) * 0.9491);
      }

      return {
        ...tx,
        costPrice: totalCost,
        grossProfit: Number(tx.revenue || 0) - totalCost
      };
    });
  }, [data.transactions, purchaseCostMap, productInfoMap, timeRangeType, selectedSingleDate, customFromDate, customToDate, timeFrom, timeTo, seller]);

  // Filter returns
  const filteredReturns = useMemo(() => {
    let retList = data.returns || [];
    const targetYMD = formatDateYMD(selectedSingleDate);

    if (timeRangeType === 'date') {
      retList = retList.filter(ret => getWorkingHoursYMD(ret.time) === targetYMD);
    } else {
      if (customFromDate) retList = retList.filter(ret => { const ymd = getWorkingHoursYMD(ret.time); return !ymd || ymd >= customFromDate; });
      if (customToDate) retList = retList.filter(ret => { const ymd = getWorkingHoursYMD(ret.time); return !ymd || ymd <= customToDate; });
    }

    if (timeFrom) retList = retList.filter(ret => { const t = formatWorkingHoursTime(ret.time); return !t || t >= timeFrom; });
    if (timeTo) retList = retList.filter(ret => { const t = formatWorkingHoursTime(ret.time); return !t || t <= timeTo; });
    if (seller) retList = retList.filter(ret => ret.createdBy === seller);

    return retList;
  }, [data.returns, timeRangeType, selectedSingleDate, customFromDate, customToDate, timeFrom, timeTo, seller]);

  // Group by Date
  const groupedDates = useMemo(() => {
    const datesMap = {};
    filteredTransactions.forEach(tx => {
      const dateStr = getWorkingHoursDMY(tx.time);
      if (!datesMap[dateStr]) {
        datesMap[dateStr] = { dateStr, rawTotal: 0, discount: 0, revenue: 0, returnValue: 0, netRevenue: 0, costPriceSum: 0, grossProfit: 0, soldQty: 0, orders: [], returns: [] };
      }
      datesMap[dateStr].rawTotal += tx.rawTotal;
      datesMap[dateStr].discount += tx.discount;
      datesMap[dateStr].revenue += tx.revenue;
      datesMap[dateStr].soldQty += tx.quantity || 0;
      datesMap[dateStr].orders.push(tx);
    });

    filteredReturns.forEach(ret => {
      const dateStr = getWorkingHoursDMY(ret.time);
      if (!datesMap[dateStr]) {
        datesMap[dateStr] = { dateStr, rawTotal: 0, discount: 0, revenue: 0, returnValue: 0, netRevenue: 0, costPriceSum: 0, grossProfit: 0, soldQty: 0, orders: [], returns: [] };
      }
      datesMap[dateStr].returnValue += ret.revenue;
      datesMap[dateStr].returns.push(ret);
    });

    Object.values(datesMap).forEach(item => {
      item.netRevenue = item.revenue - (item.returnValue || 0);
      item.costPriceSum = item.orders.reduce((s, t) => s + t.costPrice, 0) - item.returns.reduce((s, r) => s + r.costPrice, 0);
      item.grossProfit = item.netRevenue - item.costPriceSum;
    });

    return Object.values(datesMap).sort((a, b) => {
      const [d1, m1, y1] = a.dateStr.split('/');
      const [d2, m2, y2] = b.dateStr.split('/');
      return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
    });
  }, [filteredTransactions, filteredReturns]);

  // Group by Employee
  const groupedEmployees = useMemo(() => {
    const empMap = {};
    filteredTransactions.forEach(tx => {
      const name = tx.createdBy || 'Admin';
      if (!empMap[name]) empMap[name] = { name, txCount: 0, revenue: 0, returnValue: 0, netRevenue: 0 };
      empMap[name].txCount++;
      empMap[name].revenue += tx.revenue;
    });
    filteredReturns.forEach(ret => {
      const name = ret.createdBy || 'Admin';
      if (!empMap[name]) empMap[name] = { name, txCount: 0, revenue: 0, returnValue: 0, netRevenue: 0 };
      empMap[name].returnValue += ret.revenue;
    });
    Object.values(empMap).forEach(e => e.netRevenue = e.revenue - e.returnValue);
    return Object.values(empMap).sort((a, b) => b.netRevenue - a.netRevenue);
  }, [filteredTransactions, filteredReturns]);

  const isSingleDay = timeRangeType === 'date' || (customFromDate && customToDate && customFromDate === customToDate);

  // Grand Totals
  const grandTotalRawTotal = filteredTransactions.reduce((s, t) => s + t.rawTotal, 0);
  const grandTotalDiscount = filteredTransactions.reduce((s, t) => s + t.discount, 0);
  const grandTotalRevenue = filteredTransactions.reduce((s, t) => s + t.revenue, 0);
  const grandTotalReturnValue = filteredReturns.reduce((s, r) => s + r.revenue, 0);
  const grandTotalNetRevenue = grandTotalRevenue - grandTotalReturnValue;
  const grandTotalCostPrice = filteredTransactions.reduce((s, t) => s + t.costPrice, 0) - filteredReturns.reduce((s, r) => s + r.costPrice, 0);
  const grandTotalGrossProfit = grandTotalNetRevenue - grandTotalCostPrice;
  const grandTotalSoldQty = filteredTransactions.reduce((s, t) => s + (t.quantity || 0), 0);
  const grandTotalReturnQty = filteredReturns.reduce((s, r) => s + (r.quantity || 1), 0);
  const grandTotalReturnPaid = filteredReturns.reduce((s, r) => s + (r.paid || r.revenue || 0), 0);

  const toggleExpandDate = (dateStr) => setExpandedDates(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  const handleInvoiceClick = (tx) => setSelectedOrderForModal({ ...tx, createdAt: tx.time, status: 'COMPLETED', total: tx.revenue, items: tx.items || [] });

  const getFormattedDateRange = () => {
    if (timeRangeType === 'date') return formatDateVN(selectedSingleDate);
    if (customFromDate && customToDate) return `${customFromDate.split('-').reverse().join('/')} đến ngày ${customToDate.split('-').reverse().join('/')}`;
    return 'Toàn thời gian';
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateRangeStr = getFormattedDateRange();

    let titleStr = "Báo cáo bán hàng theo thời gian";
    if (interestType === 'Lợi nhuận') titleStr = isSingleDay ? "Báo cáo lợi nhuận theo hóa đơn" : "Báo cáo lợi nhuận theo thời gian";
    if (interestType === 'Nhân viên') titleStr = "Báo cáo bán hàng theo nhân viên";
    if (interestType === 'Giảm giá HĐ') titleStr = "Báo cáo giảm giá hóa đơn";
    if (interestType === 'Trả hàng') titleStr = "Báo cáo trả hàng theo thời gian";

    let aoa = [
      [`Ngày lập: ${todayStr}`],
      [],
      ["", titleStr],
      ["", `Từ ngày ${dateRangeStr}`],
      ["", "Chi nhánh: Chi nhánh trung tâm"],
      ["", `Bảng giá: ${priceBook || 'Tất cả'}`],
      ["", "(Đã phân bổ giảm giá hóa đơn, giảm giá phiếu trả)"],
      []
    ];

    if (interestType === 'Lợi nhuận') {
      if (isSingleDay) {
        aoa.push(["Mã giao dịch", "Thời gian", "Tổng tiền hàng", "Giảm giá HĐ", "Doanh thu", "Tổng giá vốn", "Lợi nhuận gộp"]);
        aoa.push([`SL giao dịch: ${filteredTransactions.length}`, "", grandTotalRawTotal, grandTotalDiscount, grandTotalRevenue, grandTotalCostPrice, grandTotalGrossProfit]);
        filteredTransactions.forEach(tx => {
          aoa.push([tx.code, formatWorkingHoursDateTime(tx.time), tx.rawTotal, tx.discount, tx.revenue, tx.costPrice, tx.grossProfit]);
        });
      } else {
        aoa.push(["Thời gian", "Tổng tiền hàng", "Giảm giá", "Doanh thu", "Tổng giá vốn", "Lợi nhuận gộp"]);
        aoa.push(["Tổng cộng", grandTotalRawTotal, grandTotalDiscount, grandTotalRevenue, grandTotalCostPrice, grandTotalGrossProfit]);
        groupedDates.forEach(d => {
          aoa.push([d.dateStr, d.rawTotal, d.discount, d.revenue, d.costPriceSum, d.grossProfit]);
        });
      }
    } else if (interestType === 'Thời gian') {
      aoa.push(["Thời gian", "SL Giao dịch", "SL Bán", "Doanh thu", "SL Trả", "Giá trị trả", "Doanh thu thuần"]);
      aoa.push(["Tổng cộng", filteredTransactions.length, grandTotalSoldQty, grandTotalRevenue, grandTotalReturnQty, grandTotalReturnValue, grandTotalNetRevenue]);
      groupedDates.forEach(d => {
        aoa.push([d.dateStr, d.orders.length, d.soldQty, d.revenue, d.returns?.length || 0, d.returnValue, d.netRevenue]);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCao");
    XLSX.writeFile(workbook, `BaoCao_${Date.now()}.xlsx`);
    toast.success('Xuất file Excel thành công!');
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 bg-transparent font-sans w-full relative animate-page-in text-[13px] text-gray-800">
      
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

      {/* ─── SIDEBAR FILTERS (Left Card) ─── */}
      <aside className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex w-full lg:w-[280px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex-col gap-3.5 z-20`}>
        <button 
          onClick={handleExportExcel}
          className="w-full py-1.5 px-3 bg-white border border-gray-300 hover:border-[#0077CC] text-gray-700 hover:text-[#0077CC] rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
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
              className={`flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer transition-all ${viewType === 'Biểu đồ' ? 'bg-[#0077CC] border-[#0077CC] text-white shadow-sm' : 'bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Biểu đồ
            </button>
            <button 
              onClick={() => setViewType('Báo cáo')}
              className={`flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer transition-all ${viewType === 'Báo cáo' ? 'bg-[#0077CC] border-[#0077CC] text-white shadow-sm' : 'bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Báo cáo
            </button>
          </div>
          <div className="mt-1">
            <select 
              value={displayType} 
              onChange={(e) => setDisplayType(e.target.value)}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700"
            >
              <option value="Hiển thị dọc">Hiển thị dọc</option>
              <option value="Hiển thị ngang">Hiển thị ngang</option>
            </select>
          </div>
        </div>

        {/* Mối quan tâm */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mối quan tâm</label>
          <select 
            value={interestType} 
            onChange={(e) => setInterestType(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700"
          >
            <option value="Lợi nhuận">Lợi nhuận</option>
            <option value="Thời gian">Thời gian</option>
            <option value="Nhân viên">Nhân viên</option>
            <option value="Giảm giá HĐ">Giảm giá HĐ</option>
            <option value="Trả hàng">Trả hàng</option>
          </select>
        </div>

        {/* Bảng giá */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bảng giá</label>
          <select 
            value={priceBook} 
            onChange={(e) => setPriceBook(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-medium text-gray-700"
          >
            <option value="">Chọn bảng giá</option>
            <option value="Bảng giá chung">Bảng giá chung</option>
            <option value="Giá sỉ">Giá sỉ</option>
            <option value="Giá lẻ">Giá lẻ</option>
          </select>
        </div>

        {/* Thời gian */}
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

        {/* Người bán */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Người bán</label>
          <select 
            value={seller} 
            onChange={(e) => setSeller(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-medium text-gray-700"
          >
            <option value="">Chọn người bán</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.username || emp.name}>{emp.name || emp.username}</option>
            ))}
          </select>
        </div>
      </aside>

      {/* ─── MAIN REPORT CANVAS ─── */}
      <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-visible sm:overflow-hidden min-h-[600px] h-auto sm:h-[calc(100vh-140px)] relative w-full">
        
        {/* Top Action Toolbar (#475569) */}
        <div className="h-11 bg-[#475569] border-b border-slate-600 px-4 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar shrink-0 shadow-sm z-10 text-white select-none whitespace-nowrap">
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer" title="Hoàn tác"><ArrowLeft size={15} /></button>
            <button className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer" title="Làm lại"><ArrowRight size={15} /></button>
            <button onClick={fetchData} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer transition-all" title="Làm mới báo cáo">
              <RotateCcw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-600/60 rounded px-1.5 py-0.5 border border-slate-500/30">
            <button className="p-1 rounded text-slate-400 cursor-not-allowed"><ChevronsLeft size={14} /></button>
            <button className="p-1 rounded text-slate-400 cursor-not-allowed"><ChevronLeft size={14} /></button>
            <div className="flex items-center gap-1 px-1">
              <span className="w-8 text-center text-xs bg-white text-slate-900 rounded font-bold py-0.5">1</span>
              <span className="text-xs font-semibold text-slate-200">/ 1</span>
            </div>
            <button className="p-1 rounded text-slate-400 cursor-not-allowed"><ChevronRight size={14} /></button>
            <button className="p-1 rounded text-slate-400 cursor-not-allowed"><ChevronsRight size={14} /></button>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer" title="Cấu hình trang"><FileText size={15} /></button>
            <div className="relative">
              <button onClick={() => setShowExportDropdown(!showExportDropdown)} className="p-1.5 rounded hover:bg-slate-600 cursor-pointer flex items-center gap-0.5 text-slate-300 hover:text-white">
                <Download size={15} />
                <ChevronDown size={12} className="opacity-80" />
              </button>
              {showExportDropdown && (
                <>
                  <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setShowExportDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white text-slate-800 border border-gray-200 rounded-lg shadow-xl py-1 z-40 font-sans">
                    <button onClick={() => { handlePrint(); setShowExportDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-xs text-gray-700 bg-transparent border-none cursor-pointer">Acrobat (PDF) file</button>
                    <button onClick={() => { handleExportExcel(); setShowExportDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-xs text-gray-700 bg-transparent border-none cursor-pointer flex items-center justify-between">
                      <span>Excel file (.xlsx)</span>
                      <FileSpreadsheet size={13} className="text-green-600" />
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={handlePrint} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer" title="In báo cáo"><Printer size={15} /></button>
            <div className="h-4 w-px bg-slate-500 mx-1" />
            <button onClick={() => setZoom(prev => Math.max(50, prev - 10))} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer" title="Thu nhỏ"><ZoomOut size={15} /></button>
            <span className="text-xs font-bold text-slate-200 w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(prev => Math.min(150, prev + 10))} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer" title="Phóng to"><ZoomIn size={15} /></button>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer"
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

        {/* ─── BODY (Report Canvas or Chart) ─── */}
        {viewType === 'Biểu đồ' ? (
          <SalesReportChart 
            groupedDates={groupedDates}
            interestType={interestType}
            displayType={displayType}
            grandTotals={{
              revenue: grandTotalRevenue,
              returnValue: grandTotalReturnValue,
              netRevenue: grandTotalNetRevenue,
              costPrice: grandTotalCostPrice,
              grossProfit: grandTotalGrossProfit,
              returnQty: grandTotalReturnQty,
              returnPaid: grandTotalReturnPaid
            }}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-2 sm:p-8 flex justify-center items-start bg-[#808a95] custom-scrollbar w-full max-w-full">
            <div 
              id="printed-report-page"
              className="bg-white text-slate-900 shadow-2xl p-3 sm:p-10 min-h-[600px] sm:min-h-[850px] h-fit border border-gray-300 rounded-sm origin-top select-text mb-6 sm:mb-12 w-full max-w-full sm:max-w-[880px] box-border"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', fontFamily: 'Segoe UI, Arial, sans-serif' }}
            >
              {/* Timestamp */}
              <div className="flex justify-between items-start mb-4 text-[11px] text-gray-500">
                <div>Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              {/* Title */}
              <div className="text-center mb-6 px-1">
                <h1 className="text-base sm:text-[20px] font-bold uppercase text-slate-900 tracking-tight leading-tight">
                  {interestType === 'Lợi nhuận' && (isSingleDay ? "Báo cáo lợi nhuận theo hóa đơn" : "Báo cáo lợi nhuận theo thời gian")}
                  {interestType === 'Thời gian' && "Báo cáo bán hàng theo thời gian"}
                  {interestType === 'Nhân viên' && "Báo cáo bán hàng theo nhân viên"}
                  {interestType === 'Giảm giá HĐ' && "Báo cáo giảm giá hóa đơn"}
                  {interestType === 'Trả hàng' && "Báo cáo trả hàng theo thời gian"}
                </h1>
                <div className="mt-2 flex flex-col gap-0.5 text-[11px] sm:text-[12px] text-gray-600 font-medium">
                  <p>Từ ngày {getFormattedDateRange()}</p>
                  <p>Chi nhánh: Chi nhánh trung tâm</p>
                  <p>Bảng giá: {priceBook || 'Tất cả'}</p>
                  {interestType === 'Lợi nhuận' && (
                    <p className="text-[11px] text-gray-500 italic mt-0.5">(Đã phân bổ giảm giá hóa đơn, giảm giá phiếu trả)</p>
                  )}
                </div>
              </div>

              {/* ─── DESKTOP TABLE VIEW ─── */}
              <div className="hidden sm:block border border-gray-300 rounded-sm overflow-x-auto mb-6 bg-white shadow-sm w-full custom-scrollbar">
                <table className="w-full text-[12px] border-collapse min-w-[650px]">
                  
                  {/* ─── 1. LỢI NHUẬN TABLE ─── */}
                  {interestType === 'Lợi nhuận' && (
                    isSingleDay ? (
                      /* SINGLE DAY: Theo Hóa đơn (7 Cột KiotViet) */
                      <>
                        <thead>
                          <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300 text-[11.5px]">
                            <th className="px-3 py-2 text-left w-[130px]">Mã giao dịch</th>
                            <th className="px-3 py-2 text-left w-[140px]">Thời gian</th>
                            <th className="px-3 py-2 text-right">Tổng tiền hàng</th>
                            <th className="px-3 py-2 text-right">Giảm giá HĐ</th>
                            <th className="px-3 py-2 text-right">Doanh thu</th>
                            <th className="px-3 py-2 text-right">Tổng giá vốn</th>
                            <th className="px-3 py-2 text-right font-bold">Lợi nhuận gộp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium text-[11.5px]">
                          <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                            <td className="px-3 py-2 font-bold" colSpan={2}>SL giao dịch: {filteredTransactions.length}</td>
                            <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalRawTotal)}</td>
                            <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalDiscount)}</td>
                            <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalRevenue)}</td>
                            <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalCostPrice)}</td>
                            <td className="px-3 py-2 text-right font-extrabold text-[#0077CC]">{fmt(grandTotalGrossProfit)}</td>
                          </tr>

                          {filteredTransactions.length > 0 ? (
                            filteredTransactions.map(tx => (
                              <tr key={tx.id || tx.code} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-1.5">
                                  <button onClick={() => handleInvoiceClick(tx)} className="text-[#0077CC] hover:underline font-bold text-left bg-transparent border-none p-0 cursor-pointer">
                                    {tx.code}
                                  </button>
                                </td>
                                <td className="px-3 py-1.5 text-gray-600">{formatWorkingHoursDateTime(tx.time)}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-slate-800">{fmt(tx.rawTotal)}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-gray-600">{fmt(tx.discount)}</td>
                                <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{fmt(tx.revenue)}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-gray-600">{fmt(tx.costPrice)}</td>
                                <td className="px-3 py-1.5 text-right font-bold text-[#0077CC]">{fmt(tx.grossProfit)}</td>
                              </tr>
                            ))
                          ) : (
                            loading ? (
                              <LoadingStateRow colSpan={7} />
                            ) : (
                              <tr><td colSpan={7} className="py-12 text-center text-gray-400 font-medium">Báo cáo không có dữ liệu</td></tr>
                            )
                          )}
                        </tbody>
                      </>
                    ) : (
                      /* MULTIPLE DAYS: Theo Thời gian (6 Cột KiotViet) */
                      <>
                        <thead>
                          <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300 text-[11.5px]">
                            <th className="px-4 py-2 text-left">Thời gian</th>
                            <th className="px-4 py-2 text-right">Tổng tiền hàng</th>
                            <th className="px-4 py-2 text-right">Giảm giá</th>
                            <th className="px-4 py-2 text-right">Doanh thu</th>
                            <th className="px-4 py-2 text-right">Tổng giá vốn</th>
                            <th className="px-4 py-2 text-right font-bold">Lợi nhuận gộp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium text-[11.5px]">
                          <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                            <td className="px-4 py-2 font-bold">Tổng cộng</td>
                            <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalRawTotal)}</td>
                            <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalDiscount)}</td>
                            <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalRevenue)}</td>
                            <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalCostPrice)}</td>
                            <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">{fmt(grandTotalGrossProfit)}</td>
                          </tr>

                          {groupedDates.length > 0 ? (
                            groupedDates.map(group => (
                              <React.Fragment key={group.dateStr}>
                                <tr onClick={() => toggleExpandDate(group.dateStr)} className="hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-gray-200 font-bold">
                                  <td className="px-4 py-2 text-[#0077CC] font-bold flex items-center gap-1.5 select-none">
                                    <span className="text-gray-700 font-mono text-xs">{expandedDates[group.dateStr] ? '[−]' : '[+]'}</span>
                                    <span>{group.dateStr}</span>
                                  </td>
                                  <td className="px-4 py-2 text-right text-gray-800 font-semibold">{fmt(group.rawTotal)}</td>
                                  <td className="px-4 py-2 text-right text-gray-800 font-semibold">{fmt(group.discount)}</td>
                                  <td className="px-4 py-2 text-right text-gray-800 font-semibold">{fmt(group.revenue)}</td>
                                  <td className="px-4 py-2 text-right text-gray-800 font-semibold">{fmt(group.costPriceSum)}</td>
                                  <td className="px-4 py-2 text-right text-[#0077CC] font-bold">{fmt(group.grossProfit)}</td>
                                </tr>

                                {expandedDates[group.dateStr] && (
                                  <tr>
                                    <td colSpan={6} className="p-0 bg-slate-50/50">
                                      <div className="border-t border-b border-gray-200 overflow-hidden">
                                        <table className="w-full text-[11px] border-collapse bg-white">
                                          <thead>
                                            <tr className="bg-[#E2F0D9] text-slate-800 font-bold border-b border-gray-300">
                                              <th className="px-6 py-1.5 text-left w-[140px]">Mã hóa đơn</th>
                                              <th className="px-3 py-1.5 text-left">Khách hàng</th>
                                              <th className="px-3 py-1.5 text-right">Tổng tiền hàng</th>
                                              <th className="px-3 py-1.5 text-right">Giảm giá HĐ</th>
                                              <th className="px-3 py-1.5 text-right">Doanh thu</th>
                                              <th className="px-3 py-1.5 text-right">Tổng giá vốn</th>
                                              <th className="px-4 py-1.5 text-right">Lợi nhuận gộp</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-150">
                                            {group.orders.map(tx => (
                                              <tr key={tx.id || tx.code} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-6 py-1.5">
                                                  <button onClick={() => handleInvoiceClick(tx)} className="text-[#0077CC] hover:underline font-bold text-left bg-transparent border-none p-0 cursor-pointer">
                                                    {tx.code}
                                                  </button>
                                                </td>
                                                <td className="px-3 py-1.5 text-gray-700 font-medium">{tx.customerName}</td>
                                                <td className="px-3 py-1.5 text-right text-gray-700">{fmt(tx.rawTotal)}</td>
                                                <td className="px-3 py-1.5 text-right text-gray-500">{fmt(tx.discount)}</td>
                                                <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{fmt(tx.revenue)}</td>
                                                <td className="px-3 py-1.5 text-right text-gray-600">{fmt(tx.costPrice)}</td>
                                                <td className="px-4 py-1.5 text-right font-bold text-[#0077CC]">{fmt(tx.grossProfit)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))
                          ) : (
                            loading ? (
                              <LoadingStateRow colSpan={6} />
                            ) : (
                              <tr><td colSpan={6} className="py-12 text-center text-gray-400 font-medium">Báo cáo không có dữ liệu</td></tr>
                            )
                          )}
                        </tbody>
                      </>
                    )
                  )}

                  {/* ─── 2. THỜI GIAN TABLE ─── */}
                  {interestType === 'Thời gian' && (
                    <>
                      <thead>
                        <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300 text-[11.5px]">
                          <th className="px-4 py-2 text-left">Thời gian</th>
                          <th className="px-3 py-2 text-right">SL Giao dịch</th>
                          <th className="px-3 py-2 text-right">SL Bán</th>
                          <th className="px-3 py-2 text-right">Doanh thu</th>
                          <th className="px-3 py-2 text-right">SL Trả</th>
                          <th className="px-3 py-2 text-right">Giá trị trả</th>
                          <th className="px-4 py-2 text-right font-bold">Doanh thu thuần</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium text-[11.5px]">
                        <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                          <td className="px-4 py-2">Tổng cộng</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{filteredTransactions.length}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmtQty(grandTotalSoldQty)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalRevenue)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmtQty(grandTotalReturnQty)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalReturnValue)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">{fmt(grandTotalNetRevenue)}</td>
                        </tr>

                        {groupedDates.length > 0 ? (
                          groupedDates.map(group => (
                            <React.Fragment key={group.dateStr}>
                              <tr onClick={() => toggleExpandDate(group.dateStr)} className="hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-gray-200 font-bold">
                                <td className="px-4 py-2 text-[#0077CC] font-bold flex items-center gap-1.5 select-none">
                                  <span className="text-gray-700 font-mono text-xs">{expandedDates[group.dateStr] ? '[−]' : '[+]'}</span>
                                  <span>{group.dateStr}</span>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-800">{group.orders.length}</td>
                                <td className="px-3 py-2 text-right text-gray-800">{fmtQty(group.soldQty)}</td>
                                <td className="px-3 py-2 text-right text-gray-800 font-semibold">{fmt(group.revenue)}</td>
                                <td className="px-3 py-2 text-right text-gray-800">{group.returns?.length || 0}</td>
                                <td className="px-3 py-2 text-right text-gray-800">{fmt(group.returnValue)}</td>
                                <td className="px-4 py-2 text-right text-[#0077CC] font-bold">{fmt(group.netRevenue)}</td>
                              </tr>

                              {expandedDates[group.dateStr] && (
                                <tr>
                                  <td colSpan={7} className="p-0 bg-slate-50/50">
                                    <div className="border-t border-b border-gray-200 overflow-hidden">
                                      <table className="w-full text-[11px] border-collapse bg-white">
                                        <thead>
                                          <tr className="bg-[#E2F0D9] text-slate-800 font-bold border-b border-gray-300">
                                            <th className="px-6 py-1.5 text-left w-[160px]">Mã hóa đơn</th>
                                            <th className="px-4 py-1.5 text-left w-[130px]">Thời gian</th>
                                            <th className="px-4 py-1.5 text-left">Khách hàng</th>
                                            <th className="px-4 py-1.5 text-right w-[100px]">Số lượng</th>
                                            <th className="px-6 py-1.5 text-right w-[150px]">Doanh thu</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-150">
                                          {group.orders.map(tx => (
                                            <tr key={tx.id || tx.code} className="hover:bg-blue-50/50 transition-colors">
                                              <td className="px-6 py-1.5">
                                                <button onClick={() => handleInvoiceClick(tx)} className="text-[#0077CC] hover:underline font-bold text-left bg-transparent border-none p-0 cursor-pointer">
                                                  {tx.code}
                                                </button>
                                              </td>
                                              <td className="px-4 py-1.5 text-gray-600">{formatWorkingHoursDateTime(tx.time)}</td>
                                              <td className="px-4 py-1.5 text-gray-700 font-medium">{tx.customerName}</td>
                                              <td className="px-4 py-1.5 text-right text-gray-800">{fmtQty(tx.quantity)}</td>
                                              <td className="px-6 py-1.5 text-right font-semibold text-slate-900">{fmt(tx.revenue)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                        loading ? (
                          <LoadingStateRow colSpan={7} />
                        ) : (
                          <tr><td colSpan={7} className="py-12 text-center text-gray-400 font-medium">Báo cáo không có dữ liệu</td></tr>
                        )
                      )}
                      </tbody>
                    </>
                  )}

                  {/* ─── 3. NHÂN VIÊN TABLE ─── */}
                  {interestType === 'Nhân viên' && (
                    <>
                      <thead>
                        <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300 text-[11.5px]">
                          <th className="px-4 py-2 text-left">Tên nhân viên</th>
                          <th className="px-4 py-2 text-right w-[140px]">SL Giao dịch</th>
                          <th className="px-4 py-2 text-right w-[160px]">Doanh thu</th>
                          <th className="px-4 py-2 text-right w-[140px]">Giá trị trả</th>
                          <th className="px-4 py-2 text-right w-[160px] font-bold">Doanh thu thuần</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium text-[11.5px]">
                        <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                          <td className="px-4 py-2">Tổng cộng</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">{filteredTransactions.length}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalRevenue)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalReturnValue)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">{fmt(grandTotalNetRevenue)}</td>
                        </tr>
                        {groupedEmployees.length > 0 ? (
                          groupedEmployees.map(emp => (
                            <tr key={emp.name} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2 text-[#0077CC] font-bold">{emp.name}</td>
                              <td className="px-4 py-2 text-right text-gray-800">{emp.txCount}</td>
                              <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmt(emp.revenue)}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{fmt(emp.returnValue)}</td>
                              <td className="px-4 py-2 text-right font-bold text-[#0077CC]">{fmt(emp.netRevenue)}</td>
                            </tr>
                          ))
                        ) : (
                          loading ? (
                            <LoadingStateRow colSpan={5} />
                          ) : (
                            <tr><td colSpan={5} className="py-12 text-center text-gray-400 font-medium">Báo cáo không có dữ liệu</td></tr>
                          )
                        )}
                      </tbody>
                    </>
                  )}

                  {/* ─── 4. GIẢM GIÁ HÓA ĐƠN TABLE ─── */}
                  {interestType === 'Giảm giá HĐ' && (
                    <>
                      <thead>
                        <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300 text-[11.5px]">
                          <th className="px-4 py-2 text-left w-[140px]">Mã giao dịch</th>
                          <th className="px-4 py-2 text-left w-[140px]">Thời gian</th>
                          <th className="px-4 py-2 text-left">Khách hàng</th>
                          <th className="px-4 py-2 text-right w-[140px]">Tổng tiền hàng</th>
                          <th className="px-4 py-2 text-right w-[140px]">Giảm giá HĐ</th>
                          <th className="px-4 py-2 text-right w-[150px] font-bold">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium text-[11.5px]">
                        <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                          <td className="px-4 py-2 font-bold" colSpan={3}>SL giao dịch: {filteredTransactions.length}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalRawTotal)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalDiscount)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">{fmt(grandTotalRevenue)}</td>
                        </tr>
                        {filteredTransactions.length > 0 ? (
                          filteredTransactions.map(tx => (
                            <tr key={tx.id || tx.code} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-1.5">
                                <button onClick={() => handleInvoiceClick(tx)} className="text-[#0077CC] hover:underline font-bold text-left bg-transparent border-none p-0 cursor-pointer">
                                  {tx.code}
                                </button>
                              </td>
                              <td className="px-4 py-1.5 text-gray-600">{formatWorkingHoursDateTime(tx.time)}</td>
                              <td className="px-4 py-1.5 text-gray-700 font-medium">{tx.customerName}</td>
                              <td className="px-4 py-1.5 text-right font-medium text-slate-800">{fmt(tx.rawTotal)}</td>
                              <td className="px-4 py-1.5 text-right text-gray-600">{fmt(tx.discount)}</td>
                              <td className="px-4 py-1.5 text-right font-bold text-[#0077CC]">{fmt(tx.revenue)}</td>
                            </tr>
                          ))
                        ) : (
                          loading ? (
                            <LoadingStateRow colSpan={6} />
                          ) : (
                            <tr><td colSpan={6} className="py-12 text-center text-gray-400 font-medium">Báo cáo không có dữ liệu</td></tr>
                          )
                        )}
                      </tbody>
                    </>
                  )}

                  {/* ─── 5. TRẢ HÀNG TABLE ─── */}
                  {interestType === 'Trả hàng' && (
                    <>
                      <thead>
                        <tr className="bg-[#BFE3F9] text-slate-900 font-bold border-b border-gray-300 text-[11.5px]">
                          <th className="px-4 py-2 text-left w-[140px]">Mã phiếu trả</th>
                          <th className="px-4 py-2 text-left w-[140px]">Thời gian</th>
                          <th className="px-4 py-2 text-left">Khách hàng</th>
                          <th className="px-4 py-2 text-right w-[110px]">Số lượng trả</th>
                          <th className="px-4 py-2 text-right w-[140px]">Tổng tiền trả</th>
                          <th className="px-4 py-2 text-right w-[140px] font-bold">Đã thanh toán</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium text-[11.5px]">
                        <tr className="bg-[#EDE7D6] text-slate-900 font-extrabold border-b border-gray-300">
                          <td className="px-4 py-2 font-bold" colSpan={3}>Tổng cộng</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmtQty(grandTotalReturnQty)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">{fmt(grandTotalReturnValue)}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-[#0077CC]">{fmt(grandTotalReturnPaid)}</td>
                        </tr>
                        {filteredReturns.length > 0 ? (
                          filteredReturns.map(r => (
                            <tr key={r.id || r.code} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-1.5 text-red-700 font-bold">{r.code}</td>
                              <td className="px-4 py-1.5 text-gray-600">{formatWorkingHoursDateTime(r.time)}</td>
                              <td className="px-4 py-1.5 text-gray-700 font-medium">{r.customerName}</td>
                              <td className="px-4 py-1.5 text-right font-medium text-slate-800">{fmtQty(r.quantity)}</td>
                              <td className="px-4 py-1.5 text-right font-semibold text-red-700">{fmt(r.revenue)}</td>
                              <td className="px-4 py-1.5 text-right font-bold text-slate-800">{fmt(r.paid || r.revenue)}</td>
                            </tr>
                          ))
                        ) : (
                          loading ? (
                            <LoadingStateRow colSpan={6} />
                          ) : (
                            <tr><td colSpan={6} className="py-12 text-center text-gray-400 font-medium">Báo cáo không có dữ liệu</td></tr>
                          )
                        )}
                      </tbody>
                    </>
                  )}

                </table>
              </div>

              {/* ─── MOBILE SMART CARDS VIEW (Matching EndOfDayReportPage) ─── */}
              <div className="block sm:hidden flex flex-col gap-2.5 mb-6">
                
                {/* 1. LỢI NHUẬN MOBILE */}
                {interestType === 'Lợi nhuận' && (
                  isSingleDay ? (
                    <>
                      {filteredTransactions.length > 0 && (
                        <div className="bg-[#F7F2E8] border border-[#e5dcbc] rounded-lg p-3 shadow-xs">
                          <div 
                            onClick={() => setSingleDayExpanded(!singleDayExpanded)}
                            className="flex items-center justify-between cursor-pointer font-bold text-slate-900 pb-2 border-b border-[#e5dcbc]"
                          >
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-mono text-[#0077CC] font-bold">{singleDayExpanded ? '[−]' : '[+]'}</span>
                              <span className="font-extrabold">Hóa đơn: {filteredTransactions.length} đơn</span>
                            </div>
                            <span className="text-xs text-slate-800 font-extrabold">SL: {fmtQty(grandTotalSoldQty || filteredTransactions.length)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                            <div>
                              <span className="text-gray-500 block text-[10px]">Doanh thu</span>
                              <span className="font-extrabold text-slate-900">{fmt(grandTotalRevenue)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-500 block text-[10px]">Lợi nhuận gộp</span>
                              <span className="font-extrabold text-emerald-700">{fmt(grandTotalGrossProfit)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {singleDayExpanded && (
                        filteredTransactions.length > 0 ? (
                          filteredTransactions.map(tx => (
                            <div key={tx.id || tx.code} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                              <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                                <button 
                                  onClick={() => handleInvoiceClick(tx)}
                                  className="text-[#0077CC] font-extrabold text-left bg-transparent border-none p-0 cursor-pointer hover:underline text-xs"
                                >
                                  {tx.code}
                                </button>
                                <span className="text-gray-500 text-[11px] font-normal">
                                  {formatWorkingHoursTime(tx.time)}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <span className="text-gray-400 text-[10px] block">Số lượng</span>
                                  <span className="font-semibold text-gray-800">{fmtQty(tx.quantity || 1)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-[10px] block">Doanh thu</span>
                                  <span className="font-semibold text-slate-900">{fmt(tx.revenue)}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-400 text-[10px] block">Lợi nhuận</span>
                                  <span className="font-bold text-[#0077CC]">{fmt(tx.grossProfit)}</span>
                                </div>
                              </div>
                              {tx.customerName && tx.customerName !== 'Khách lẻ' && (
                                <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-150 text-[11px] text-gray-600 truncate">
                                  <span className="text-gray-400">Khách: </span>{tx.customerName}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            {loading ? "Đang tải dữ liệu..." : "Báo cáo không có dữ liệu"}
                          </div>
                        )
                      )}
                    </>
                  ) : (
                    <>
                      {groupedDates.length > 0 ? (
                        groupedDates.map(group => (
                          <div key={group.dateStr} className="flex flex-col gap-2">
                            <div className="bg-[#F7F2E8] border border-[#e5dcbc] rounded-lg p-3 shadow-xs">
                              <div 
                                onClick={() => toggleExpandDate(group.dateStr)}
                                className="flex items-center justify-between cursor-pointer font-bold text-slate-900 pb-2 border-b border-[#e5dcbc]"
                              >
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="font-mono text-[#0077CC] font-bold">{expandedDates[group.dateStr] ? '[−]' : '[+]'}</span>
                                  <span className="font-extrabold">{group.dateStr}</span>
                                </div>
                                <span className="text-xs text-slate-800 font-extrabold">{group.orders.length} đơn</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                                <div>
                                  <span className="text-gray-500 block text-[10px]">Doanh thu</span>
                                  <span className="font-extrabold text-slate-900">{fmt(group.revenue)}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-500 block text-[10px]">Lợi nhuận gộp</span>
                                  <span className="font-extrabold text-emerald-700">{fmt(group.grossProfit)}</span>
                                </div>
                              </div>
                            </div>

                            {expandedDates[group.dateStr] && group.orders.map(tx => (
                              <div key={tx.id || tx.code} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                                <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                                  <button 
                                    onClick={() => handleInvoiceClick(tx)}
                                    className="text-[#0077CC] font-extrabold text-left bg-transparent border-none p-0 cursor-pointer hover:underline text-xs"
                                  >
                                    {tx.code}
                                  </button>
                                  <span className="text-gray-500 text-[11px] font-normal">
                                    {formatWorkingHoursTime(tx.time)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <span className="text-gray-400 text-[10px] block">Tiền hàng</span>
                                    <span className="font-semibold text-gray-800">{fmt(tx.rawTotal)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 text-[10px] block">Doanh thu</span>
                                    <span className="font-semibold text-slate-900">{fmt(tx.revenue)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-gray-400 text-[10px] block">Lợi nhuận</span>
                                    <span className="font-bold text-[#0077CC]">{fmt(tx.grossProfit)}</span>
                                  </div>
                                </div>
                                {tx.customerName && tx.customerName !== 'Khách lẻ' && (
                                  <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-150 text-[11px] text-gray-600 truncate">
                                    <span className="text-gray-400">Khách: </span>{tx.customerName}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          {loading ? "Đang tải dữ liệu..." : "Báo cáo không có dữ liệu"}
                        </div>
                      )}
                    </>
                  )
                )}

                {/* 2. THỜI GIAN MOBILE */}
                {interestType === 'Thời gian' && (
                  <>
                    {groupedDates.length > 0 ? (
                      groupedDates.map(group => (
                        <div key={group.dateStr} className="flex flex-col gap-2">
                          <div className="bg-[#F7F2E8] border border-[#e5dcbc] rounded-lg p-3 shadow-xs">
                            <div 
                              onClick={() => toggleExpandDate(group.dateStr)}
                              className="flex items-center justify-between cursor-pointer font-bold text-slate-900 pb-2 border-b border-[#e5dcbc]"
                            >
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-mono text-[#0077CC] font-bold">{expandedDates[group.dateStr] ? '[−]' : '[+]'}</span>
                                <span className="font-extrabold">{group.dateStr}</span>
                              </div>
                              <span className="text-xs text-slate-800 font-extrabold">SL: {fmtQty(group.soldQty)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                              <div>
                                <span className="text-gray-500 block text-[10px]">Doanh thu ({group.orders.length} đơn)</span>
                                <span className="font-extrabold text-slate-900">{fmt(group.revenue)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-500 block text-[10px]">Doanh thu thuần</span>
                                <span className="font-extrabold text-[#0077CC]">{fmt(group.netRevenue)}</span>
                              </div>
                            </div>
                          </div>

                          {expandedDates[group.dateStr] && group.orders.map(tx => (
                            <div key={tx.id || tx.code} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                              <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                                <button 
                                  onClick={() => handleInvoiceClick(tx)}
                                  className="text-[#0077CC] font-extrabold text-left bg-transparent border-none p-0 cursor-pointer hover:underline text-xs"
                                >
                                  {tx.code}
                                </button>
                                <span className="text-gray-500 text-[11px] font-normal">
                                  {formatWorkingHoursTime(tx.time)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-400 text-[10px] block">Số lượng</span>
                                  <span className="font-semibold text-gray-800">{fmtQty(tx.quantity || 1)}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-400 text-[10px] block">Doanh thu</span>
                                  <span className="font-extrabold text-slate-900">{fmt(tx.revenue)}</span>
                                </div>
                              </div>
                              {tx.customerName && (
                                <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-150 text-[11px] text-gray-600 truncate">
                                  <span className="text-gray-400">Khách: </span>{tx.customerName}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        {loading ? "Đang tải dữ liệu..." : "Báo cáo không có dữ liệu"}
                      </div>
                    )}
                  </>
                )}

                {/* 3. NHÂN VIÊN MOBILE */}
                {interestType === 'Nhân viên' && (
                  <>
                    {groupedEmployees.length > 0 ? (
                      groupedEmployees.map(emp => (
                        <div key={emp.name} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                          <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                            <span className="text-[#0077CC] font-bold">{emp.name}</span>
                            <span className="text-gray-500 text-[11px] font-normal">{emp.txCount} giao dịch</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400 text-[10px] block">Doanh thu</span>
                              <span className="font-semibold text-slate-900">{fmt(emp.revenue)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 text-[10px] block">Doanh thu thuần</span>
                              <span className="font-extrabold text-[#0077CC]">{fmt(emp.netRevenue)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        {loading ? "Đang tải dữ liệu..." : "Báo cáo không có dữ liệu"}
                      </div>
                    )}
                  </>
                )}

                {/* 4. GIẢM GIÁ HÓA ĐƠN MOBILE */}
                {interestType === 'Giảm giá HĐ' && (
                  <>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map(tx => (
                        <div key={tx.id || tx.code} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                          <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                            <button 
                              onClick={() => handleInvoiceClick(tx)}
                              className="text-[#0077CC] font-extrabold text-left bg-transparent border-none p-0 cursor-pointer hover:underline text-xs"
                            >
                              {tx.code}
                            </button>
                            <span className="text-gray-500 text-[11px] font-normal">{formatWorkingHoursTime(tx.time)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-gray-400 text-[10px] block">Tiền hàng</span>
                              <span className="font-semibold text-slate-800">{fmt(tx.rawTotal)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 text-[10px] block">Giảm giá</span>
                              <span className="font-semibold text-gray-600">{fmt(tx.discount)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 text-[10px] block">Doanh thu</span>
                              <span className="font-extrabold text-[#0077CC]">{fmt(tx.revenue)}</span>
                            </div>
                          </div>
                          {tx.customerName && (
                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-150 text-[11px] text-gray-600 truncate">
                              <span className="text-gray-400">Khách: </span>{tx.customerName}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        {loading ? "Đang tải dữ liệu..." : "Báo cáo không có dữ liệu"}
                      </div>
                    )}
                  </>
                )}

                {/* 5. TRẢ HÀNG MOBILE */}
                {interestType === 'Trả hàng' && (
                  <>
                    {filteredReturns.length > 0 ? (
                      filteredReturns.map(r => (
                        <div key={r.id || r.code} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs text-xs">
                          <div className="flex items-center justify-between font-bold border-b border-gray-100 pb-1.5 mb-2">
                            <span className="text-red-700 font-bold">{r.code}</span>
                            <span className="text-gray-500 text-[11px] font-normal">{formatWorkingHoursTime(r.time)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-gray-400 text-[10px] block">Số lượng trả</span>
                              <span className="font-semibold text-slate-800">{fmtQty(r.quantity)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 text-[10px] block">Tiền trả</span>
                              <span className="font-semibold text-red-700">{fmt(r.revenue)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 text-[10px] block">Đã thanh toán</span>
                              <span className="font-extrabold text-slate-900">{fmt(r.paid || r.revenue)}</span>
                            </div>
                          </div>
                          {r.customerName && (
                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-150 text-[11px] text-gray-600 truncate">
                              <span className="text-gray-400">Khách: </span>{r.customerName}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        {loading ? "Đang tải dữ liệu..." : "Báo cáo không có dữ liệu"}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sales Order Detail Modal */}
      {selectedOrderForModal && (
        <SalesOrderDetailModal 
          open={!!selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
          data={selectedOrderForModal}
        />
      )}
    </div>
  );
}
