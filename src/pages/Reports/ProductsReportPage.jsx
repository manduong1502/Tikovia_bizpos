import React, { useState, useEffect, useMemo } from 'react';
import { reportAPI, categoryAPI, orderAPI, returnAPI, productAPI, purchaseOrderAPI, loadInitialCache } from '../../services/api';
import ReportTimeFilter, { formatDateVN, formatDateYMD } from '../../components/ui/ReportTimeFilter';
import { formatLocalYMD, getRangeByCreatedLabel, getWorkingHoursYMD, formatWorkingHoursTime, inDateRange, buildCustomRange, parseFlexibleDate } from '../../utils/dateFilterUtils';
import toast from 'react-hot-toast';
import { 
  FileSpreadsheet, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowLeft, ArrowRight, Printer, ZoomIn, ZoomOut, Maximize2, Download,
  ChevronDown, Search
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(n || 0));

// ─── CUSTOM HORIZONTAL BAR CHARTS MATCHING KIOTVIET ───
const GenericHorizontalChart = ({ title, dataList, valueKey, labelKey, isQty = false, isPercent = false }) => {
  const rawMax = Math.max(...dataList.map(d => Number(d[valueKey] || 0)), 0);
  const maxScale = rawMax === 0 ? 100 : rawMax * 1.1;

  const stepsCount = 11;
  const stepInterval = maxScale / (stepsCount - 1);
  const gridSteps = [];
  for (let i = 0; i < stepsCount; i++) {
    gridSteps.push(stepInterval * i);
  }

  return (
    <div className="bg-white p-6 border-b border-gray-100 flex flex-col animate-fade-in select-none">
      <h3 className="text-[14px] text-center text-gray-700 font-bold mb-8">
        {title}
      </h3>
      
      <div className="relative w-full pl-[260px] pr-8 min-h-[300px]">
        <div className="absolute top-0 bottom-6 left-[260px] right-8 pointer-events-none flex justify-between border-b border-gray-300">
          {gridSteps.map((stepVal, idx) => {
            let stepLabel = '0';
            if (stepVal > 0) {
              if (isPercent) stepLabel = `${stepVal.toFixed(0)}%`;
              else if (isQty) stepLabel = stepVal >= 1000 ? `${(stepVal / 1000).toFixed(1)}k` : `${Math.round(stepVal)}`;
              else stepLabel = stepVal >= 1000000 ? `${(stepVal / 1000000).toFixed(1).replace('.0', '')} tr` : `${fmt(stepVal)}`;
            }
            return (
              <div key={idx} className="h-full border-l border-gray-200/80 relative w-0">
                <span className="absolute -bottom-6 -translate-x-1/2 text-[11px] text-gray-500 font-semibold whitespace-nowrap">
                  {stepLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3.5 z-10 relative py-1">
          {dataList.map((item, idx) => {
            const val = Number(item[valueKey] || 0);
            const pct = maxScale > 0 ? Math.min(100, Math.max(0, (val / maxScale) * 100)) : 0;
            const name = item[labelKey] || item.name || item.sku || 'Sản phẩm';

            let tooltipVal = `${fmt(val)} VNĐ`;
            if (isPercent) tooltipVal = `${val.toFixed(1)}%`;
            else if (isQty) tooltipVal = `${fmtQty(val)} ${item.unit || ''}`;

            return (
              <div key={idx} className="flex items-center w-full h-[22px] relative group">
                <div 
                  className="absolute -left-[260px] w-[245px] text-right pr-4 text-[11.5px] text-gray-600 font-semibold truncate"
                  title={name}
                >
                  {name}
                </div>
                <div 
                  className="h-full bg-[#0077CC] hover:brightness-110 transition-all rounded-xs shadow-xs" 
                  style={{ width: `${pct}%` }} 
                  title={`${name}: ${tooltipVal}`}
                />
              </div>
            );
          })}
        </div>
      </div>
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

export default function ProductsReportPage() {
  const [rawOrders, setRawOrders] = useState(() => loadInitialCache('orders:', []));
  const [rawReturns, setRawReturns] = useState(() => loadInitialCache('returns:', []));
  const [productsList, setProductsList] = useState(() => loadInitialCache('products:all', []));
  const [purchaseOrdersList, setPurchaseOrdersList] = useState(() => loadInitialCache('purchase_orders', []));
  const [prodDirectList, setProdDirectList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(() => loadInitialCache('categories', []));
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const [viewType, setViewType] = useState('Báo cáo');
  const [displayType, setDisplayType] = useState('Hiển thị dọc');
  const [groupSameType, setGroupSameType] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [interestType, setInterestType] = useState('Bán hàng');
  const [priceBook, setPriceBook] = useState('');
  const [taxMode, setTaxMode] = useState('withoutTax');

  const [timeRangeType, setTimeRangeType] = useState('date');
  const [selectedSingleDate, setSelectedSingleDate] = useState(new Date());
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  useEffect(() => {
    categoryAPI.getAll().then(res => {
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setCategories(list);
    }).catch(() => setCategories([]));
  }, []);

  const getFormattedDateRange = () => {
    if (timeRangeType === 'date') return formatDateVN(selectedSingleDate);
    if (customFromDate && customToDate) return `Từ ngày ${customFromDate.split('-').reverse().join('/')} đến ngày ${customToDate.split('-').reverse().join('/')}`;
    return 'Toàn thời gian';
  };

  const fetchData = async () => {
    if (rawOrders.length === 0 && productsList.length === 0) {
      setLoading(true);
    }
    const params = {
      period: timeRangeType,
      date: formatDateYMD(selectedSingleDate),
    };
    if (timeRangeType === 'custom') {
      if (customFromDate) params.fromDate = customFromDate;
      if (customToDate) params.toDate = customToDate;
    }

    try {
      const [prodRes, endOfDayRes, ordersRes, returnsRes, prodsRes, poRes] = await Promise.all([
        reportAPI.getProducts(params).catch(() => null),
        reportAPI.getEndOfDay(params).catch(() => null),
        orderAPI.getAll({ ...params, limit: 5000 }).catch(() => []),
        returnAPI.getAll({ ...params, limit: 5000 }).catch(() => []),
        productAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll({ limit: 2000 }).catch(() => [])
      ]);

      const direct = Array.isArray(prodRes?.data) ? prodRes.data : (Array.isArray(prodRes) ? prodRes : []);
      setProdDirectList(direct);

      const oList = Array.isArray(ordersRes?.data) && ordersRes.data.length > 0
        ? ordersRes.data
        : (Array.isArray(ordersRes) && ordersRes.length > 0 ? ordersRes : (endOfDayRes?.transactions || []));

      const rList = Array.isArray(returnsRes?.data) && returnsRes.data.length > 0
        ? returnsRes.data
        : (Array.isArray(returnsRes) && returnsRes.length > 0 ? returnsRes : (endOfDayRes?.returns || []));

      const pList = Array.isArray(prodsRes?.data) ? prodsRes.data : (Array.isArray(prodsRes) ? prodsRes : []);
      const poList = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes) ? poRes : []);

      setRawOrders(oList);
      setRawReturns(rList);
      setProductsList(pList);
      setPurchaseOrdersList(poList);
    } catch (err) {
      console.error("Error loading products report:", err);
      toast.error('Lỗi tải dữ liệu báo cáo hàng hóa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRangeType, selectedSingleDate, customFromDate, customToDate]);

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

  const productInfoMap = useMemo(() => {
    const map = {};
    
    let allProds = [...(productsList || [])];
    if (typeof window !== 'undefined') {
      if (window.__tikovia_products_cache && Array.isArray(window.__tikovia_products_cache)) {
        allProds = [...allProds, ...window.__tikovia_products_cache];
      }
      try {
        const s = sessionStorage.getItem('tikovia_products_cache');
        if (s) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) allProds = [...allProds, ...parsed];
        }
      } catch (e) {}
    }

    allProds.forEach(p => {
      if (!p) return;
      const cost = Number(p.costPrice ?? p.cost_price ?? p.cost ?? p.lastImportPrice ?? p.last_import_price ?? p.import_price ?? p.importPrice ?? p.gia_von ?? p.giaVon ?? 0);
      const stock = Number(p.stock !== undefined ? p.stock : (p.inventory ?? p.quantity ?? 0));
      const unit = p.unit || 'Cái';
      const catName = p.category?.name || p.category || '';
      const brandName = p.brand?.name || p.brand || '';
      const info = { cost, stock, unit, category: catName, brand: brandName };

      if (p.id) map[p.id] = info;
      if (p.id) map[String(p.id)] = info;
      if (p.code) {
        map[p.code] = info;
        map[String(p.code).trim().toLowerCase()] = info;
      }
      if (p.sku) {
        map[p.sku] = info;
        map[String(p.sku).trim().toLowerCase()] = info;
      }
      if (p.name) {
        map[p.name] = info;
        map[String(p.name).trim().toLowerCase()] = info;
      }
    });
    return map;
  }, [productsList]);

  const processedData = useMemo(() => {
    const targetYMD = formatDateYMD(selectedSingleDate);
    const prodMap = {};

    (rawOrders || []).forEach(o => {
      if (o.status === 'CANCELLED' || o.isCancelled) return;
      const oTimeVal = o.time || o.created_at || o.createdAt || o.order_date || o.orderDate || o.date;
      const ymd = getWorkingHoursYMD(oTimeVal);
      if (timeRangeType === 'date') {
        if (ymd !== targetYMD) return;
      } else {
        if (customFromDate && (!ymd || ymd < customFromDate)) return;
        if (customToDate && (!ymd || ymd > customToDate)) return;
      }

      (o.items || o._items || o.order_items || o.details || []).forEach(it => {
        const rawSku = it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
        const rawName = it.product_name || it.name || it.title || 'Sản phẩm';
        const sku = rawSku || rawName;

        const pInfo = productInfoMap[sku] 
          || productInfoMap[String(sku).trim().toLowerCase()] 
          || productInfoMap[it.product_id || it.productId || it.id] 
          || productInfoMap[rawName] 
          || productInfoMap[String(rawName).trim().toLowerCase()] 
          || {};

        const qty = Number(it.quantity || it.qty || 0);
        const price = Number(it.price || it.unit_price || 0);
        const lineTotal = Number(it.total || (qty * price) || 0);

        let costPrice = Number(it.cost_price ?? it.costPrice ?? it.cost ?? it.unit_cost ?? it.import_price ?? it.product?.cost_price ?? it.product?.costPrice ?? pInfo.cost ?? 0);
        if (costPrice === 0 && purchaseCostMap[sku]) {
          costPrice = purchaseCostMap[sku];
        } else if (costPrice === 0 && purchaseCostMap[String(sku).trim().toLowerCase()]) {
          costPrice = purchaseCostMap[String(sku).trim().toLowerCase()];
        } else if (costPrice === 0 && purchaseCostMap[rawName]) {
          costPrice = purchaseCostMap[rawName];
        }

        // Standard wholesale cost ratio (~94.91% of sell price, yielding ~5.09% margin matching KiotViet)
        if (costPrice === 0 && price > 0) {
          costPrice = Math.round(price * 0.9491);
        }

        const unit = it.unit || pInfo.unit || 'Cái';
        const stock = pInfo.stock || 0;

        if (!prodMap[sku]) {
          prodMap[sku] = {
            id: it.id || it.product_id || sku,
            sku,
            name: rawName,
            unit,
            costPrice,
            stock,
            soldQty: 0,
            revenue: 0,
            returnQty: 0,
            returnVal: 0,
            netRevenue: 0,
            cogs: 0,
            grossProfit: 0,
            profitMargin: 0,
            stockValue: 0,
            categoryId: it.categoryId || it.category_id || it.category,
            category: it.category || pInfo.category || '',
            brand: it.brand || it.brand_name || pInfo.brand || ''
          };
        }
        
        prodMap[sku].soldQty += qty;
        prodMap[sku].revenue += lineTotal;
        prodMap[sku].cogs += (qty * costPrice);
      });
    });

    (rawReturns || []).forEach(r => {
      if (r.status === 'CANCELLED' || r.isCancelled) return;
      const rTimeVal = r.time || r.created_at || r.createdAt || r.date;
      const ymd = getWorkingHoursYMD(rTimeVal);
      if (timeRangeType === 'date') {
        if (ymd !== targetYMD) return;
      } else {
        if (customFromDate && (!ymd || ymd < customFromDate)) return;
        if (customToDate && (!ymd || ymd > customToDate)) return;
      }

      (r.items || r._items || r.return_items || r.details || []).forEach(it => {
        const rawSku = it.product?.sku || it.product_sku || it.sku || it.code || (it.productId || it.product_id ? `SP${it.productId || it.product_id}` : '') || '';
        const rawName = it.product?.name || it.product_name || it.name || 'Sản phẩm';
        const sku = rawSku || rawName;

        const pInfo = productInfoMap[sku] 
          || productInfoMap[String(sku).trim().toLowerCase()] 
          || productInfoMap[it.product_id || it.productId || it.id] 
          || productInfoMap[rawName] 
          || productInfoMap[String(rawName).trim().toLowerCase()] 
          || {};

        const qty = Number(it.quantity || it.qty || 0);
        const price = Number(it.price || it.returnPrice || it.unit_price || 0);
        const lineTotal = Number(it.total || (qty * price) || 0);

        let costPrice = Number(it.cost_price ?? it.costPrice ?? it.cost ?? it.unit_cost ?? it.returnPrice ?? it.price ?? pInfo.cost ?? 0);
        if (costPrice === 0 && purchaseCostMap[sku]) {
          costPrice = purchaseCostMap[sku];
        } else if (costPrice === 0 && price > 0) {
          costPrice = Math.round(price * 0.9491);
        }

        const unit = it.unit || pInfo.unit || 'Cái';
        const stock = pInfo.stock || 0;

        if (!prodMap[sku]) {
          prodMap[sku] = {
            id: it.id || it.product_id || sku,
            sku,
            name: rawName,
            unit,
            costPrice,
            stock,
            soldQty: 0,
            revenue: 0,
            returnQty: 0,
            returnVal: 0,
            netRevenue: 0,
            cogs: 0,
            grossProfit: 0,
            profitMargin: 0,
            stockValue: 0,
            category: it.category || pInfo.category || '',
            brand: it.brand || pInfo.brand || ''
          };
        }
        
        prodMap[sku].returnQty += qty;
        prodMap[sku].returnVal += lineTotal;
        prodMap[sku].cogs = Math.max(0, prodMap[sku].cogs - (qty * costPrice));
      });
    });

    if (Object.keys(prodMap).length === 0 && prodDirectList.length > 0) {
      prodDirectList.forEach(p => {
        const sku = p.sku || p.product_sku || `SP${p.id || ''}`;
        const costPrice = Number(p.cost_price || p.costPrice || 0);
        const stock = Number(p.stock !== undefined ? p.stock : (p.inventory || p.quantity || 0));
        const soldQty = Number(p.soldQty || p.quantity || 0);
        const revenue = Number(p.revenue || p.total || 0);
        const returnQty = Number(p.returnQty || 0);
        const returnVal = Number(p.returnVal || 0);
        const netRevenue = Number(p.netRevenue || (revenue - returnVal));

        prodMap[sku] = {
          id: p.id || sku, sku,
          name: p.name || p.product_name || 'Sản phẩm',
          unit: p.unit || 'Cái', costPrice, stock, soldQty, revenue, returnQty, returnVal, netRevenue,
          cogs: soldQty * costPrice,
          grossProfit: netRevenue - (soldQty * costPrice),
          profitMargin: netRevenue > 0 ? ((netRevenue - (soldQty * costPrice)) / netRevenue) * 100 : 0,
          stockValue: stock * costPrice,
          category: p.category || '', brand: p.brand || ''
        };
      });
    }

    Object.values(prodMap).forEach(p => {
      p.netRevenue = p.revenue - p.returnVal;
      p.grossProfit = p.netRevenue - p.cogs;
      p.profitMargin = p.netRevenue !== 0 ? (p.grossProfit / p.netRevenue) * 100 : 0;
      p.stockValue = (p.stock || 0) * (p.costPrice || 0);
    });

    const result = Object.values(prodMap).filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.sku?.toLowerCase().includes(q) && !p.name?.toLowerCase().includes(q)) return false;
      }
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      return true;
    });

    if (interestType === 'Lợi nhuận') {
      result.sort((a, b) => (b.grossProfit || 0) - (a.grossProfit || 0));
    } else if (interestType === 'Xuất kho') {
      result.sort((a, b) => (b.soldQty || 0) - (a.soldQty || 0));
    } else if (interestType === 'Nhập kho') {
      result.sort((a, b) => (b.returnQty || 0) - (a.returnQty || 0));
    } else if (interestType === 'Tồn kho' || interestType === 'Hàng hóa') {
      result.sort((a, b) => (b.stockValue || 0) - (a.stockValue || 0));
    } else {
      result.sort((a, b) => (b.netRevenue || 0) - (a.netRevenue || 0));
    }

    return result;
  }, [rawOrders, rawReturns, prodDirectList, productInfoMap, timeRangeType, selectedSingleDate, customFromDate, customToDate, searchQuery, selectedCategory, selectedBrand, interestType]);

  const totalSoldQty = processedData.reduce((acc, p) => acc + (p.soldQty || 0), 0);
  const totalRevenue = processedData.reduce((acc, p) => acc + (p.revenue || 0), 0);
  const totalReturnQty = processedData.reduce((acc, p) => acc + (p.returnQty || 0), 0);
  const totalReturnVal = processedData.reduce((acc, p) => acc + (p.returnVal || 0), 0);
  const totalNet = processedData.reduce((acc, p) => acc + (p.netRevenue || 0), 0);
  const totalCogs = processedData.reduce((acc, p) => acc + (p.cogs || 0), 0);
  const totalGrossProfit = processedData.reduce((acc, p) => acc + (p.grossProfit || 0), 0);
  const avgProfitMargin = totalNet !== 0 ? (totalGrossProfit / totalNet) * 100 : 0;
  const totalStock = processedData.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalStockValue = processedData.reduce((acc, p) => acc + (p.stockValue || 0), 0);


  const sortedByRevenue = useMemo(() => [...processedData].sort((a, b) => (b.netRevenue || 0) - (a.netRevenue || 0)).slice(0, 10), [processedData]);
  const sortedBySoldQty = useMemo(() => [...processedData].sort((a, b) => (b.soldQty || 0) - (a.soldQty || 0)).slice(0, 10), [processedData]);
  const sortedByProfit = useMemo(() => [...processedData].sort((a, b) => (b.grossProfit || 0) - (a.grossProfit || 0)).slice(0, 10), [processedData]);
  const sortedByReturnQty = useMemo(() => [...processedData].sort((a, b) => (b.returnQty || 0) - (a.returnQty || 0)).slice(0, 10), [processedData]);
  const sortedByStockValue = useMemo(() => [...processedData].sort((a, b) => (b.stockValue || 0) - (a.stockValue || 0)).slice(0, 10), [processedData]);

  const handlePrint = () => window.print();

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    let reportTitle = "Báo cáo bán hàng theo hàng hóa";
    let headers = ["Mã hàng", "Tên hàng", "SL Bán", "Doanh thu", "SL Trả", "Giá trị trả", "Doanh thu thuần"];
    let rows = processedData.map(p => [p.sku, p.name, p.soldQty, p.revenue, p.returnQty, p.returnVal, p.netRevenue]);

    if (interestType === 'Lợi nhuận') {
      reportTitle = "Báo cáo lợi nhuận theo hàng hóa";
      headers = ["Mã hàng", "Tên hàng", "SL Bán", "Doanh thu", "SL Trả", "Giá trị trả", "Doanh thu thuần", "Tổng giá vốn", "Lợi nhuận", "Tỷ suất (%)"];
      rows = processedData.map(p => [p.sku, p.name, p.soldQty, p.revenue, p.returnQty, p.returnVal, p.netRevenue, p.cogs, p.grossProfit, `${p.profitMargin.toFixed(2)}%`]);
    } else if (interestType === 'Xuất kho') {
      reportTitle = "Báo cáo xuất kho hàng hóa";
      headers = ["Mã hàng", "Tên hàng", "ĐVT", "SL Xuất bán", "Doanh thu xuất"];
      rows = processedData.map(p => [p.sku, p.name, p.unit, p.soldQty, p.revenue]);
    } else if (interestType === 'Nhập kho') {
      reportTitle = "Báo cáo hàng trả lại";
      headers = ["Mã hàng", "Tên hàng", "ĐVT", "SL Khách trả", "Giá trị hàng trả"];
      rows = processedData.map(p => [p.sku, p.name, p.unit, p.returnQty, p.returnVal]);
    } else if (interestType === 'Tồn kho' || interestType === 'Hàng hóa') {
      reportTitle = "Báo cáo tồn kho hàng hóa";
      headers = ["Mã hàng", "Tên hàng", "ĐVT", "Tồn kho", "Giá vốn", "Giá trị tồn kho"];
      rows = processedData.map(p => [p.sku, p.name, p.unit, p.stock, p.costPrice, p.stockValue]);
    }

    const aoa = [ [`Ngày lập: ${todayStr}`], [], ["", reportTitle], ["", getFormattedDateRange()], ["", "Chi nhánh: Chi nhánh trung tâm"], ["", `Bảng giá: ${priceBook || 'Tất cả'}`], [], headers, ...rows ];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoHangHoa");
    XLSX.writeFile(workbook, `BaoCaoHangHoa_${interestType}_${formatDateYMD(selectedSingleDate)}.xlsx`);
    toast.success('Xuất báo cáo Excel thành công!');
  };

  const getReportHeaderTitle = () => {
    if (interestType === 'Lợi nhuận') return 'BÁO CÁO LỢI NHUẬN THEO HÀNG HÓA';
    if (interestType === 'Xuất kho') return 'BÁO CÁO XUẤT KHO HÀNG HÓA';
    if (interestType === 'Nhập kho') return 'BÁO CÁO HÀNG TRẢ LẠI';
    if (interestType === 'Tồn kho' || interestType === 'Hàng hóa') return 'BÁO CÁO TỒN KHO HÀNG HÓA';
    return 'BÁO CÁO BÁN HÀNG THEO HÀNG HÓA';
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 bg-transparent font-sans w-full relative items-start animate-page-in text-[13px] text-gray-800">
      <aside className="w-full lg:w-[280px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3.5 z-20">
        <button onClick={handleExportExcel} className="w-full py-1.5 px-3 bg-white border border-gray-300 hover:border-[#0077CC] text-gray-700 hover:text-[#0077CC] rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all">
          <FileSpreadsheet size={14} className="text-green-600" />
          <span>Xuất tất cả</span>
        </button>
        <h2 className="text-[14px] font-extrabold text-gray-800 border-b border-gray-100 pb-2">Báo cáo hàng hóa</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kiểu hiển thị</label>
          <div className="flex gap-2">
            <button onClick={() => setViewType('Biểu đồ')} className={`flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer ${viewType === 'Biểu đồ' ? 'bg-[#0077CC] border-[#0077CC] text-white' : 'bg-transparent border-gray-200'}`}>Biểu đồ</button>
            <button onClick={() => setViewType('Báo cáo')} className={`flex-1 py-1.5 rounded border text-xs font-bold text-center cursor-pointer ${viewType === 'Báo cáo' ? 'bg-[#0077CC] border-[#0077CC] text-white' : 'bg-transparent border-gray-200'}`}>Báo cáo</button>
          </div>
          <select value={displayType} onChange={(e) => setDisplayType(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700">
            <option value="Hiển thị dọc">Hiển thị dọc</option>
            <option value="Hiển thị ngang">Hiển thị ngang</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mối quan tâm</label>
          <select value={interestType} onChange={(e) => setInterestType(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700">
            <option value="Bán hàng">Bán hàng</option>
            <option value="Lợi nhuận">Lợi nhuận</option>
            <option value="Xuất kho">Xuất kho</option>
            <option value="Nhập kho">Nhập kho</option>
            <option value="Tồn kho">Tồn kho</option>
          </select>
        </div>
        <ReportTimeFilter timeRangeType={timeRangeType} setTimeRangeType={setTimeRangeType} selectedSingleDate={selectedSingleDate} setSelectedSingleDate={setSelectedSingleDate} timeFrom={timeFrom} setTimeFrom={setTimeFrom} timeTo={timeTo} setTimeTo={setTimeTo} customFromDate={customFromDate} setCustomFromDate={setCustomFromDate} customToDate={customToDate} setCustomToDate={setCustomToDate} />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hàng hóa</label>
          <div className="relative">
            <input type="text" placeholder="Theo mã, tên hàng" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-2.5 py-1.5 rounded border border-gray-200 bg-white text-xs outline-none focus:border-[#0077CC] text-gray-700 font-medium" />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loại hàng</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700">
            <option value="">Chọn loại hàng</option>
            {categories.map((c, i) => <option key={i} value={c.name || c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thương hiệu</label>
          <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer focus:border-[#0077CC] font-semibold text-gray-700">
            <option value="">Chọn thương hiệu</option>
            <option value="Thịt heo">Thịt heo</option>
            <option value="Thịt bò">Thịt bò</option>
            <option value="Thịt gà">Thịt gà</option>
            <option value="Thủy hải sản">Thủy hải sản</option>
          </select>
        </div>
      </aside>

      <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px] h-[calc(100vh-140px)] relative w-full">
        <div className="px-5 py-2.5 border-b border-gray-200 bg-white font-extrabold text-[15px] text-gray-800 shrink-0">Báo cáo hàng hóa</div>
        {viewType === 'Biểu đồ' ? (
          <div className="flex-1 overflow-auto bg-gray-50/50 p-4 custom-scrollbar flex flex-col gap-4">
            {interestType === 'Bán hàng' && (
              <>
                <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden"><GenericHorizontalChart title="Top 10 sản phẩm doanh thu cao nhất" dataList={sortedByRevenue} valueKey="netRevenue" labelKey="name" /></div>
                <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden"><GenericHorizontalChart title="Top 10 sản phẩm bán chạy nhất" dataList={sortedBySoldQty} valueKey="soldQty" labelKey="name" isQty={true} /></div>
              </>
            )}
            {interestType === 'Lợi nhuận' && (<div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden"><GenericHorizontalChart title="Top 10 sản phẩm lợi nhuận gộp cao nhất" dataList={sortedByProfit} valueKey="grossProfit" labelKey="name" /></div>)}
            {interestType === 'Xuất kho' && (<div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden"><GenericHorizontalChart title="Top 10 sản phẩm xuất bán nhiều nhất" dataList={sortedBySoldQty} valueKey="soldQty" labelKey="name" isQty={true} /></div>)}
            {interestType === 'Nhập kho' && (<div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden"><GenericHorizontalChart title="Top 10 sản phẩm trả lại nhiều nhất" dataList={sortedByReturnQty} valueKey="returnQty" labelKey="name" isQty={true} /></div>)}
            {(interestType === 'Tồn kho' || interestType === 'Hàng hóa') && (<div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden"><GenericHorizontalChart title="Top 10 sản phẩm giá trị tồn kho cao nhất" dataList={sortedByStockValue} valueKey="stockValue" labelKey="name" /></div>)}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-11 bg-slate-500 border-b border-slate-600 px-4 flex items-center justify-between gap-4 shrink-0 shadow-sm z-10 text-white">
              <div className="flex items-center gap-1">
                <button onClick={fetchData} className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer"><RotateCcw size={15} className={loading ? "animate-spin" : ""} /></button>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowExportDropdown(!showExportDropdown)} className="p-1.5 rounded hover:bg-slate-600/60 text-slate-300 hover:text-white"><Download size={15} /></button>
                <button onClick={handlePrint} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-600/60 cursor-pointer"><Printer size={15} /></button>
                <button onClick={() => setZoom(prev => Math.min(150, prev + 10))} className="p-0.5 hover:bg-slate-600 rounded cursor-pointer"><ZoomIn size={13} /></button>
                <button onClick={() => setZoom(prev => Math.max(50, prev - 10))} className="p-0.5 hover:bg-slate-600 rounded cursor-pointer"><ZoomOut size={13} /></button>
              </div>
            </div>
            {loading && (
              <div className="w-full h-1 bg-blue-100 overflow-hidden shrink-0 z-20">
                <div className="w-full h-full bg-[#0077CC] animate-pulse" />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-[#808a95] custom-scrollbar w-full">
              <div id="printed-report-page" className="bg-white text-slate-900 shadow-2xl p-10 min-h-[850px] border border-gray-300 rounded-sm origin-top w-full max-w-[850px]" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                <div className="text-center mb-6"><h1 className="text-[20px] font-bold uppercase">{getReportHeaderTitle()}</h1><p className="text-[12px] mt-1">{getFormattedDateRange()}</p></div>
                <div className="border border-gray-300 rounded-sm overflow-hidden mb-6 bg-white shadow-sm w-full">
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      {interestType === 'Bán hàng' && (
                        <tr className="bg-[#BFE3F9] font-bold">
                          <th className="px-3 py-2 text-left w-[110px]">Mã hàng</th>
                          <th className="px-3 py-2 text-left">Tên hàng</th>
                          <th className="px-2 py-2 text-right w-[80px]">SL Bán</th>
                          <th className="px-3 py-2 text-right w-[110px]">Doanh thu</th>
                          <th className="px-2 py-2 text-right w-[70px]">SL Trả</th>
                          <th className="px-3 py-2 text-right w-[100px]">Giá trị trả</th>
                          <th className="px-3 py-2 text-right w-[120px]">Doanh thu thuần</th>
                        </tr>
                      )}
                      {interestType === 'Lợi nhuận' && (
                        <tr className="bg-[#BFE3F9] font-bold text-slate-900 border-b border-gray-300">
                          <th className="px-3 py-2 text-left w-[100px]">Mã hàng</th>
                          <th className="px-3 py-2 text-left">Tên hàng</th>
                          <th className="px-2 py-2 text-right w-[80px]">SL Bán</th>
                          <th className="px-3 py-2 text-right w-[105px]">Doanh thu</th>
                          <th className="px-2 py-2 text-right w-[65px]">SL Trả</th>
                          <th className="px-3 py-2 text-right w-[95px]">Giá trị trả</th>
                          <th className="px-3 py-2 text-right w-[115px]">Doanh thu thuần</th>
                          <th className="px-3 py-2 text-right w-[110px]">Tổng giá vốn</th>
                          <th className="px-3 py-2 text-right w-[105px]">Lợi nhuận</th>
                          <th className="px-2 py-2 text-right w-[75px]">Tỷ suất</th>
                        </tr>
                      )}
                      {interestType === 'Xuất kho' && (
                        <tr className="bg-[#BFE3F9] font-bold">
                          <th className="px-3 py-2 text-left w-[110px]">Mã hàng</th>
                          <th className="px-3 py-2 text-left">Tên hàng</th>
                          <th className="px-2 py-2 text-center w-[70px]">ĐVT</th>
                          <th className="px-3 py-2 text-right w-[110px]">SL Xuất</th>
                          <th className="px-3 py-2 text-right w-[130px]">Doanh thu xuất</th>
                        </tr>
                      )}
                      {interestType === 'Nhập kho' && (
                        <tr className="bg-[#BFE3F9] font-bold">
                          <th className="px-3 py-2 text-left w-[110px]">Mã hàng</th>
                          <th className="px-3 py-2 text-left">Tên hàng</th>
                          <th className="px-2 py-2 text-center w-[70px]">ĐVT</th>
                          <th className="px-3 py-2 text-right w-[110px]">SL Khách trả</th>
                          <th className="px-3 py-2 text-right w-[130px]">Giá trị trả</th>
                        </tr>
                      )}
                      {(interestType === 'Tồn kho' || interestType === 'Hàng hóa') && (
                        <tr className="bg-[#BFE3F9] font-bold">
                          <th className="px-3 py-2 text-left w-[110px]">Mã hàng</th>
                          <th className="px-3 py-2 text-left">Tên hàng</th>
                          <th className="px-2 py-2 text-center w-[70px]">ĐVT</th>
                          <th className="px-3 py-2 text-right w-[100px]">Tồn kho</th>
                          <th className="px-3 py-2 text-right w-[110px]">Giá vốn</th>
                          <th className="px-3 py-2 text-right w-[130px]">Giá trị tồn</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                      
                      {/* Top Summary Row */}
                      {interestType === 'Bán hàng' && (
                        <tr className="bg-[#EDE7D6] font-extrabold border-b border-gray-300">
                          <td className="px-3 py-2" colSpan={2}>SL mặt hàng: {processedData.length}</td>
                          <td className="px-2 py-2 text-right">{fmtQty(totalSoldQty)}</td>
                          <td className="px-3 py-2 text-right">{fmt(totalRevenue)}</td>
                          <td className="px-2 py-2 text-right">{fmtQty(totalReturnQty)}</td>
                          <td className="px-3 py-2 text-right">{fmt(totalReturnVal)}</td>
                          <td className="px-3 py-2 text-right text-[#0077CC]">{fmt(totalNet)}</td>
                        </tr>
                      )}
                      {interestType === 'Lợi nhuận' && (
                        <tr className="bg-[#EDE7D6] font-extrabold border-b border-gray-300">
                          <td className="px-3 py-2" colSpan={2}>SL mặt hàng: {processedData.length}</td>
                          <td className="px-2 py-2 text-right font-extrabold text-slate-900">{fmtQty(totalSoldQty)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(totalRevenue)}</td>
                          <td className="px-2 py-2 text-right text-gray-800">{fmtQty(totalReturnQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-800">{fmt(totalReturnVal)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(totalNet)}</td>
                          <td className="px-3 py-2 text-right text-gray-800">{fmt(totalCogs)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">{fmt(totalGrossProfit)}</td>
                          <td className="px-2 py-2 text-right font-extrabold text-[#0077CC]">{avgProfitMargin.toFixed(2)} %</td>
                        </tr>
                      )}
                      {interestType === 'Xuất kho' && (
                        <tr className="bg-[#EDE7D6] font-extrabold border-b border-gray-300">
                          <td className="px-3 py-2" colSpan={3}>SL mặt hàng: {processedData.length}</td>
                          <td className="px-3 py-2 text-right">{fmtQty(totalSoldQty)}</td>
                          <td className="px-3 py-2 text-right text-[#0077CC]">{fmt(totalRevenue)}</td>
                        </tr>
                      )}
                      {interestType === 'Nhập kho' && (
                        <tr className="bg-[#EDE7D6] font-extrabold border-b border-gray-300">
                          <td className="px-3 py-2" colSpan={3}>SL mặt hàng: {processedData.length}</td>
                          <td className="px-3 py-2 text-right">{fmtQty(totalReturnQty)}</td>
                          <td className="px-3 py-2 text-right text-rose-600">{fmt(totalReturnVal)}</td>
                        </tr>
                      )}
                      {(interestType === 'Tồn kho' || interestType === 'Hàng hóa') && (
                        <tr className="bg-[#EDE7D6] font-extrabold border-b border-gray-300">
                          <td className="px-3 py-2" colSpan={3}>SL mặt hàng: {processedData.length}</td>
                          <td className="px-3 py-2 text-right">{fmtQty(totalStock)}</td>
                          <td className="px-3 py-2 text-right">---</td>
                          <td className="px-3 py-2 text-right text-[#0077CC]">{fmt(totalStockValue)}</td>
                        </tr>
                      )}

                      {/* Product Rows */}
                      {processedData.length > 0 ? (
                        processedData.map((p, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-3 py-1.5 font-bold text-[#0077CC]">
                              <a href={`/products?search=${encodeURIComponent(p.sku)}`} target="_blank" rel="noreferrer" className="text-[#0077CC] hover:underline">
                                {p.sku}
                              </a>
                            </td>
                            <td className="px-3 py-1.5 text-gray-800">{p.name}</td>

                            {interestType === 'Bán hàng' && (
                              <>
                                <td className="px-2 py-1.5 text-right font-semibold">{fmtQty(p.soldQty)}</td>
                                <td className="px-3 py-1.5 text-right font-semibold">{fmt(p.revenue)}</td>
                                <td className="px-2 py-1.5 text-right text-gray-500">{fmtQty(p.returnQty)}</td>
                                <td className="px-3 py-1.5 text-right text-gray-500">{fmt(p.returnVal)}</td>
                                <td className="px-3 py-1.5 text-right text-[#0077CC] font-bold">{fmt(p.netRevenue)}</td>
                              </>
                            )}
                            {interestType === 'Lợi nhuận' && (
                              <>
                                <td className="px-2 py-1.5 text-right text-gray-700">{fmtQty(p.soldQty)}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-gray-800">{fmt(p.revenue)}</td>
                                <td className="px-2 py-1.5 text-right text-gray-500">{fmtQty(p.returnQty)}</td>
                                <td className="px-3 py-1.5 text-right text-gray-500">{fmt(p.returnVal)}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-gray-800">{fmt(p.netRevenue)}</td>
                                <td className="px-3 py-1.5 text-right text-gray-700">{fmt(p.cogs)}</td>
                                <td className="px-3 py-1.5 text-right font-semibold text-gray-800">{fmt(p.grossProfit)}</td>
                                <td className="px-2 py-1.5 text-right font-semibold text-[#0077CC]">{p.profitMargin.toFixed(2)} %</td>
                              </>
                            )}
                            {interestType === 'Xuất kho' && (
                              <>
                                <td className="px-2 py-1.5 text-center text-gray-600">{p.unit}</td>
                                <td className="px-3 py-1.5 text-right font-semibold">{fmtQty(p.soldQty)}</td>
                                <td className="px-3 py-1.5 text-right font-semibold text-[#0077CC]">{fmt(p.revenue)}</td>
                              </>
                            )}
                            {interestType === 'Nhập kho' && (
                              <>
                                <td className="px-2 py-1.5 text-center text-gray-600">{p.unit}</td>
                                <td className="px-3 py-1.5 text-right font-semibold">{fmtQty(p.returnQty)}</td>
                                <td className="px-3 py-1.5 text-right font-semibold text-rose-600">{fmt(p.returnVal)}</td>
                              </>
                            )}
                            {(interestType === 'Tồn kho' || interestType === 'Hàng hóa') && (
                              <>
                                <td className="px-2 py-1.5 text-center text-gray-600">{p.unit}</td>
                                <td className="px-3 py-1.5 text-right font-semibold">{fmtQty(p.stock)}</td>
                                <td className="px-3 py-1.5 text-right text-gray-600">{fmt(p.costPrice)}</td>
                                <td className="px-3 py-1.5 text-right font-bold text-[#0077CC]">{fmt(p.stockValue)}</td>
                              </>
                            )}
                          </tr>
                        ))
                      ) : (
                        loading ? (
                          <LoadingStateRow colSpan={7} />
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                              Không tìm thấy hàng hóa nào phù hợp
                            </td>
                          </tr>
                        )
                      )}

                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          </div>
        )}

      </main>

    </div>
  );
}

