import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { orderAPI } from '../../services/api';
import { exportCSV } from '../../utils/exportCSV';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import {
  Search, SlidersHorizontal, Download, Plus, Upload, Star, Receipt, ChevronDown, Filter, Columns3, Settings, HelpCircle
} from 'lucide-react';
import OrderSidebar from './OrderSidebar';
import OrderDetail from './OrderDetail';
import {
  getRangeByCreatedLabel,
  getRangeByExpectedLabel,
  inDateRange,
  buildCustomRange,
} from '../../utils/dateFilterUtils';

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const ALL_COLUMNS = [
  { key: 'order_code', label: 'Mã hóa đơn', default: true },
  { key: 'created_at', label: 'Thời gian', default: true },
  { key: 'return_code', label: 'Mã trả hàng', default: true },
  { key: 'customer_code', label: 'Mã KH', default: true },
  { key: 'customer_name', label: 'Khách hàng', default: true },
  { key: 'total', label: 'Tổng tiền hàng', default: true, align: 'right' },
  { key: 'discount_amount', label: 'Giảm giá', default: true, align: 'right' },
  { key: 'paid_amount', label: 'Khách đã trả', default: true, align: 'right' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [starred, setStarred] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [filters, setFilters] = useState({
    orderDate: { mode: 'all', label: 'Tháng này', start: null, end: null },
    status: '',
    deliveryStatus: '',
    deliveryPartner: '',
    deliveryDate: { mode: 'all', label: 'Toàn thời gian', start: null, end: null },
  });

  const columnMenuRef = useRef(null);
  const searchPanelRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const params = { page: 1, limit: 500 };
      if (filters.status) params.status = filters.status;
      const r = await orderAPI.getAll(params);
      const rawList = Array.isArray(r) ? r : (r?.data || []);
      if (rawList.length === 0) {
        const mockOrders = [
          { id: 1, order_code: 'HD000042', created_at: '2026-05-12T14:30:00Z', customer_code: 'KH000001', customer_name: 'Anh Tuấn', total: 1550000, discount_amount: 50000, paid_amount: 1500000, payment_status: 'paid', status: 'completed', items: [{ product_sku: 'SP001', product_name: 'Gà ta sạch', quantity: 10, unit_price: 155000, discount: 5000, total: 1500000 }] },
          { id: 2, order_code: 'HD000041', created_at: '2026-05-11T10:15:00Z', customer_code: 'KH000002', customer_name: 'Chị Mai', total: 3200000, discount_amount: 200000, paid_amount: 3000000, payment_status: 'paid', status: 'completed', items: [{ product_sku: 'SP002', product_name: 'Gà ác làm sạch', quantity: 40, unit_price: 80000, discount: 5000, total: 3000000 }] },
          { id: 3, order_code: 'HD000040', created_at: '2026-05-10T09:00:00Z', customer_code: '', customer_name: 'Khách lẻ', total: 450000, discount_amount: 0, paid_amount: 450000, payment_status: 'paid', status: 'completed', items: [{ product_sku: 'SP003', product_name: 'Trứng gà sạch', quantity: 15, unit_price: 30000, discount: 0, total: 450000 }] },
        ];
        setOrders(mockOrders);
      } else {
        setOrders(rawList);
      }
    } catch {
      setOrders([]);
    }
  }, [filters.status]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) setShowColumnMenu(false);
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qCode = searchCode.trim().toLowerCase();
    const qCust = searchCustomer.trim().toLowerCase();
    const qProd = searchProduct.trim().toLowerCase();

    return orders.filter((o) => {
      if (q && !(o.order_code || '').toLowerCase().includes(q) && !(o.customer_name || '').toLowerCase().includes(q) && !(o.customer_code || '').toLowerCase().includes(q)) return false;
      if (qCode && !(o.order_code || '').toLowerCase().includes(qCode)) return false;
      if (qCust && !(o.customer_name || '').toLowerCase().includes(qCust) && !(o.customer_code || '').toLowerCase().includes(qCust)) return false;
      if (qProd && !o.items?.some(it => (it.product_sku || '').toLowerCase().includes(qProd) || (it.product_name || '').toLowerCase().includes(qProd))) return false;

      if (filters.deliveryStatus && o.delivery_status !== filters.deliveryStatus) return false;
      if (filters.deliveryPartner && o.delivery_partner !== filters.deliveryPartner) return false;

      if (filters.orderDate && filters.orderDate.mode === 'all' && filters.orderDate.label !== 'Toàn thời gian') {
        const range = getRangeByCreatedLabel(filters.orderDate.label);
        if (range && !inDateRange(o.created_at || o.createdAt, range)) return false;
      } else if (filters.orderDate && filters.orderDate.mode === 'custom' && filters.orderDate.start) {
        const range = buildCustomRange(filters.orderDate.start, filters.orderDate.end);
        if (range && !inDateRange(o.created_at || o.createdAt, range)) return false;
      }

      if (filters.deliveryDate && filters.deliveryDate.mode === 'all' && filters.deliveryDate.label !== 'Toàn thời gian') {
        const range = getRangeByExpectedLabel(filters.deliveryDate.label);
        if (range && !inDateRange(o.delivery_date || o.deliveryDate || o.expected_delivery_date, range)) return false;
      } else if (filters.deliveryDate && filters.deliveryDate.mode === 'custom' && filters.deliveryDate.start) {
        const range = buildCustomRange(filters.deliveryDate.start, filters.deliveryDate.end);
        if (range && !inDateRange(o.delivery_date || o.deliveryDate || o.expected_delivery_date, range)) return false;
      }

      return true;
    });
  }, [orders, search, searchCode, searchCustomer, searchProduct, filters]);

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(filtered.map(o => o.id)));
    else setSelectedIds(new Set());
  };

  const toggleOne = (id, checked) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const toggleStar = (e, id) => {
    e.stopPropagation();
    const next = new Set(starred);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarred(next);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportCSV('hoa_don', ['Mã hóa đơn', 'Thời gian', 'Khách hàng', 'Tổng tiền', 'Giảm giá', 'Khách trả'],
      filtered.map(o => [o.order_code, o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '', o.customer_name || 'Khách lẻ', o.total || 0, o.discount_amount || 0, o.paid_amount || 0])
    );
  };

  const loadDetail = async (id) => {
    try {
      const r = await orderAPI.getById(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, _items: r.items || o.items || [], subtotal: r.subtotal || o.total, note: r.note || o.note } : o));
    } catch {
      // Mock fallback
    }
  };

  const sumTotal = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const sumDiscount = filtered.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
  const sumPaid = filtered.reduce((s, o) => s + Number(o.paid_amount || 0), 0);

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen p-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
          Hóa đơn
        </h1>

        <div className="flex items-center gap-4">
          {/* Main Search Input */}
          <div className="relative w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Theo mã hóa đơn, khách hàng"
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white transition-all shadow-sm font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`absolute right-2.5 top-2 p-1.5 rounded-lg transition-colors cursor-pointer ${searchOpen ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
            >
              <Filter size={16} />
            </button>

            {/* Advanced Search Popover */}
            {searchOpen && (
              <div ref={searchPanelRef} className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 flex flex-col gap-4 animate-fade-in">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="font-bold text-gray-800 text-sm">Tìm kiếm nâng cao</span>
                  <button onClick={() => setSearchOpen(false)} className="text-xs text-primary hover:underline">Đóng</button>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Mã hóa đơn</label>
                  <input type="text" placeholder="Nhập mã hóa đơn" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Khách hàng (Tên / Mã)</label>
                  <input type="text" placeholder="Tên hoặc mã khách hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Hàng hóa (Tên / Mã)</label>
                  <input type="text" placeholder="Tên hoặc mã hàng hóa" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button variant="secondary" onClick={() => { setSearchCode(''); setSearchCustomer(''); setSearchProduct(''); }} className="text-xs py-1.5 px-3">Xóa bộ lọc</Button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <Button variant="primary" onClick={() => window.open('/pos', '_blank')} className="flex items-center gap-2 shadow-md bg-primary hover:bg-primary-hover font-bold py-2.5 px-5 rounded-xl">
            <Plus size={18} /> Bán hàng
          </Button>

          <Button variant="secondary" className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
            <Upload size={16} /> Import file
          </Button>

          <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm">
            <Download size={16} /> Xuất file
          </Button>

          {/* Column Visibility Menu */}
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer"
            >
              <Columns3 size={18} />
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 animate-fade-in">
                <div className="text-xs font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Ẩn/hiện cột</div>
                <div className="flex flex-col gap-2.5">
                  {ALL_COLUMNS.map(c => (
                    <label key={c.key} className="flex items-center gap-3 text-xs font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        checked={visibleColumns.includes(c.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisibleColumns([...visibleColumns, c.key]);
                          else setVisibleColumns(visibleColumns.filter(k => k !== c.key));
                        }}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer">
            <Settings size={18} />
          </button>
          <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 bg-white shadow-sm transition-colors cursor-pointer">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left Filter Sidebar */}
        <OrderSidebar filters={filters} onFilterChange={setFilters} />

        {/* Main Table Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="p-4 w-12 text-center"><Star size={16} className="text-gray-400 mx-auto" /></th>
                {ALL_COLUMNS.map(c => {
                  if (!visibleColumns.includes(c.key)) return null;
                  return (
                    <th key={c.key} className={`p-4 font-extrabold ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {c.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {/* Summary row */}
              <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700 border-b border-gray-100">
                <td colSpan={2}></td>
                {visibleColumns.includes('order_code') && <td></td>}
                {visibleColumns.includes('created_at') && <td></td>}
                {visibleColumns.includes('return_code') && <td></td>}
                {visibleColumns.includes('customer_code') && <td></td>}
                {visibleColumns.includes('customer_name') && <td></td>}
                {visibleColumns.includes('total') && <td className="p-4 text-right text-primary font-extrabold">{fmt(sumTotal)}</td>}
                {visibleColumns.includes('discount_amount') && <td className="p-4 text-right text-primary font-extrabold">{fmt(sumDiscount)}</td>}
                {visibleColumns.includes('paid_amount') && <td className="p-4 text-right text-primary font-extrabold">{fmt(sumPaid)}</td>}
              </tr>

              {filtered.map((o) => {
                const isSelected = selectedIds.has(o.id);
                const isStarred = starred.has(o.id);
                const isExpanded = expandedId === o.id;

                return (
                  <>
                    <tr
                      key={o.id}
                      onClick={() => {
                        if (isExpanded) setExpandedId(null);
                        else { setExpandedId(o.id); loadDetail(o.id); }
                      }}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''} ${isExpanded ? 'bg-blue-50/80 font-semibold' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleOne(o.id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4 text-center" onClick={e => toggleStar(e, o.id)}>
                        <Star size={16} className={`mx-auto cursor-pointer transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                      </td>

                      {visibleColumns.includes('order_code') && (
                        <td className="p-4 font-bold text-primary">{o.order_code}</td>
                      )}
                      {visibleColumns.includes('created_at') && (
                        <td className="p-4 text-gray-700">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                      )}
                      {visibleColumns.includes('return_code') && (
                        <td className="p-4 text-gray-400">---</td>
                      )}
                      {visibleColumns.includes('customer_code') && (
                        <td className="p-4 text-gray-700">{o.customer_code || `KH${String(o.id).padStart(6, '0')}`}</td>
                      )}
                      {visibleColumns.includes('customer_name') && (
                        <td className="p-4 font-bold text-gray-800">{o.customer_name || 'Khách lẻ'}</td>
                      )}
                      {visibleColumns.includes('total') && (
                        <td className="p-4 text-right font-extrabold text-gray-800">{fmt(o.total)}</td>
                      )}
                      {visibleColumns.includes('discount_amount') && (
                        <td className="p-4 text-right text-gray-600">{Number(o.discount_amount) > 0 ? fmt(o.discount_amount) : '0'}</td>
                      )}
                      {visibleColumns.includes('paid_amount') && (
                        <td className="p-4 text-right font-extrabold text-primary">{fmt(o.paid_amount)}</td>
                      )}
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <tr>
                        <OrderDetail order={o} onReload={reload} onClose={() => setExpandedId(null)} />
                      </tr>
                    )}
                  </>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="p-12 text-center text-gray-400 font-medium">
                    <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
                    Không tìm thấy hóa đơn nào phù hợp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
