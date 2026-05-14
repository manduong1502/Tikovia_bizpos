import React, { useState, useEffect } from 'react';
import { orderAPI } from '../../services/api';
import { exportCSV } from '../../utils/exportUtils';
import toast from 'react-hot-toast';
import { Search, SlidersHorizontal, Download, Plus, Upload, Star, Receipt, ChevronDown } from 'lucide-react';
import OrderSidebar from './OrderSidebar';
import OrderDetail from './OrderDetail';

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

function Badge({ status }) {
  const map = { completed: 'bg-green-100 text-green-700', paid: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500', partial: 'bg-yellow-100 text-yellow-700', unpaid: 'bg-red-100 text-red-600' };
  const labels = { completed: 'Hoàn thành', paid: 'Hoàn thành', cancelled: 'Đã hủy', partial: '1 phần', unpaid: 'Chưa TT' };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>{labels[status] || status}</span>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState('code');
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({ timeMode: 'month', status: '' });

  const reload = async () => {
    try {
      const params = { page: 1, limit: 200 };
      if (filters.status) params.status = filters.status;
      if (search) params.search = search;
      const r = await orderAPI.getAll(params);
      setOrders(Array.isArray(r) ? r : (r.data || []));
    } catch { setOrders([]); }
  };

  useEffect(() => { reload(); }, [filters.status, search]);

  const totalPages = Math.ceil(orders.length / perPage) || 1;
  const pageItems = orders.slice((page - 1) * perPage, page * perPage);
  const sumTotal = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const sumDiscount = orders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
  const sumPaid = orders.reduce((s, o) => s + Number(o.paid_amount || 0), 0);

  const loadDetail = async (id) => {
    try {
      const r = await orderAPI.getById(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, _items: r.items || [], subtotal: r.subtotal, note: r.note } : o));
    } catch {}
  };

  const handleExport = () => {
    exportCSV(
      [{ key: 'order_code', label: 'Mã HĐ' }, { key: 'created_at', label: 'Thời gian' }, { key: 'customer_name', label: 'Khách hàng' }, { key: 'total', label: 'Tổng tiền' }, { key: 'discount_amount', label: 'Giảm giá' }, { key: 'paid_amount', label: 'Đã trả' }],
      orders.map(o => ({ ...o, customer_name: o.customer_name || 'Khách lẻ', created_at: o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '' })),
      'hoa_don'
    );
    toast.success('Xuất file thành công');
  };

  const searchPlaceholders = {
    code: 'Theo mã hóa đơn',
    product: 'Theo mã, tên hàng',
    customer: 'Theo mã, tên, số điện thoại khách hàng',
  };

  return (
    <div className="flex flex-col gap-4 animate-page-in">
      {/* Page title + Top actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0">Hóa đơn</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"><Plus size={15} /> Tạo mới <ChevronDown size={14} /></button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"><Upload size={15} />Import file</button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"><Download size={15} />Xuất file</button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Sidebar */}
        <OrderSidebar filters={filters} onFilterChange={setFilters} />

        {/* Main content */}
        <div className="flex-1 bg-white border border-gray-100 rounded-xl min-h-[500px] shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex items-center gap-2" style={{ maxWidth: 420 }}>
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={searchPlaceholders[searchMode]} className="flex-1 outline-none text-sm" />
              </div>
              <button onClick={() => setShowSearchDrop(!showSearchDrop)} className="p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"><SlidersHorizontal size={16} className="text-gray-500" /></button>

              {showSearchDrop && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-20 p-2 text-sm">
                  {Object.entries(searchPlaceholders).map(([key, label]) => (
                    <div key={key} onClick={() => { setSearchMode(key); setShowSearchDrop(false); }}
                      className={`px-3 py-2 rounded cursor-pointer ${searchMode === key ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                      {label}
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                    <button onClick={() => setShowSearchDrop(false)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 cursor-pointer">Mở rộng</button>
                    <button onClick={() => { setShowSearchDrop(false); reload(); }} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">Tìm kiếm</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b font-bold tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-8"><input type="checkbox" className="w-4 h-4 rounded" /></th>
                  <th className="px-1 py-3 w-8"></th>
                  <th className="px-3 py-3">Mã hóa đơn</th>
                  <th className="px-3 py-3">Thời gian</th>
                  <th className="px-3 py-3">Mã trả hàng</th>
                  <th className="px-3 py-3">Mã KH</th>
                  <th className="px-3 py-3">Khách hàng</th>
                  <th className="px-3 py-3 text-right">Tổng tiền hàng</th>
                  <th className="px-3 py-3 text-right">Giảm giá</th>
                  <th className="px-3 py-3 text-right">Khách đã trả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Summary row */}
                <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700">
                  <td colSpan={7}></td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmt(sumTotal)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmt(sumDiscount)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmt(sumPaid)}</td>
                </tr>

                {pageItems.map(o => (
                  <React.Fragment key={o.id}>
                    <tr className={`cursor-pointer transition-colors ${expandedId === o.id ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                        onClick={() => { if (expandedId === o.id) setExpandedId(null); else { setExpandedId(o.id); loadDetail(o.id); } }}>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="w-4 h-4 rounded" /></td>
                      <td className="px-1 py-3 text-center"><Star size={14} className="text-gray-300 hover:text-yellow-400 cursor-pointer" /></td>
                      <td className="px-3 py-3 font-bold text-blue-600">{o.order_code}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                      <td className="px-3 py-3 text-xs text-gray-400"></td>
                      <td className="px-3 py-3 text-xs text-gray-600">{o.customer_code || ''}</td>
                      <td className="px-3 py-3 font-medium">{o.customer_name || <span className="text-gray-400">Khách lẻ</span>}</td>
                      <td className="px-3 py-3 text-right font-bold">{fmt(o.total)}</td>
                      <td className="px-3 py-3 text-right text-gray-500">{Number(o.discount_amount) > 0 ? fmt(o.discount_amount) : '0'}</td>
                      <td className="px-3 py-3 text-right font-medium">{fmt(o.paid_amount)}</td>
                    </tr>
                    {expandedId === o.id && (
                      <tr><OrderDetail order={o} onReload={reload} onClose={() => setExpandedId(null)} /></tr>
                    )}
                  </React.Fragment>
                ))}

                {pageItems.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                    <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
                    <div className="text-base font-medium text-gray-500">Không có hóa đơn</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-t text-sm text-gray-600 font-medium">
            <span>Hiển thị {orders.length} hóa đơn</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 flex items-center justify-center text-xs rounded-lg border cursor-pointer font-bold ${page === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
