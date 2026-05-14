import React, { useState, useEffect, useMemo, useRef } from 'react';
import { orderAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Download, Search, Trash2, Copy, Save, RotateCcw, Printer, Receipt } from 'lucide-react';
import { exportCSV, copyToClipboard, printHTML } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const STATUS_TAGS = [
  { val: '', label: 'Tất cả' },
  { val: 'paid', label: 'Đã thanh toán' },
  { val: 'partial', label: 'Thanh toán 1 phần' },
  { val: 'unpaid', label: 'Chưa thanh toán' },
];
const METHOD_TAGS = [
  { val: '', label: 'Tất cả' },
  { val: 'cash', label: 'Tiền mặt' },
  { val: 'transfer', label: 'Chuyển khoản' },
  { val: 'card', label: 'Quẹt thẻ' },
];
const PAY_LABEL = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Quẹt thẻ' };

function Badge({ status }) {
  const map = {
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    unpaid: 'bg-red-100 text-red-600',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const labels = { paid: 'Hoàn thành', partial: '1 phần', unpaid: 'Chưa TT', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>{labels[status] || status}</span>;
}

function TagButton({ active, children, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${active ? 'bg-blue-50 text-primary border-primary/30 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}>
      {children}
    </button>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [expandedId, setExpandedId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  const reload = async () => {
    try {
      const params = { page: 1, limit: 200 };
      if (filterStatus) params.payment_status = filterStatus;
      if (filterPayment) params.payment_method = filterPayment;
      if (search) params.search = search;
      const r = await orderAPI.getAll(params);
      setOrders(Array.isArray(r) ? r : (r.data || []));
    } catch { setOrders([]); }
  };

  useEffect(() => { reload(); }, [filterStatus, filterPayment, search]);

  const filtered = orders;
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const sumTotal = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const sumDiscount = filtered.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
  const sumPaid = filtered.reduce((s, o) => s + Number(o.paid_amount || 0), 0);

  const loadDetail = async (id) => {
    try {
      const r = await orderAPI.getById(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, _items: r.items || [], subtotal: r.subtotal, note: r.note } : o));
    } catch {}
  };

  const handleCancel = async (o) => {
    if (o.status === 'cancelled') return toast.error('Đơn hàng đã bị hủy');
    if (!confirm(`Bạn có chắc muốn hủy hóa đơn ${o.order_code}? Thao tác này sẽ hoàn lại tồn kho.`)) return;
    try {
      await orderAPI.cancel(o.id);
      toast.success('Hủy hóa đơn thành công');
      setExpandedId(null);
      reload();
    } catch {}
  };

  const handleReturn = async (o) => {
    if (o.status === 'cancelled' || o.status === 'returned') return toast.error('Không thể trả hàng cho đơn này');
    const reason = prompt('Lý do trả hàng:');
    if (reason === null) return;
    try {
      const r = await orderAPI.return(o.id, { reason });
      toast.success(`Trả hàng thành công! Mã phiếu: ${r.return_code}`);
      setExpandedId(null);
      reload();
    } catch {}
  };

  const handleCopy = async (o) => {
    await copyToClipboard(o.order_code);
    toast.success(`Đã sao chép mã: ${o.order_code}`);
  };

  const handleSaveNote = async (o, noteEl) => {
    const note = noteEl?.value || '';
    try {
      await orderAPI.update(o.id, { note });
      toast.success('Lưu ghi chú thành công');
    } catch {}
  };

  const handleExportAll = () => {
    exportCSV(
      [
        { key: 'order_code', label: 'Mã hóa đơn' },
        { key: 'created_at', label: 'Thời gian' },
        { key: 'customer_name', label: 'Khách hàng' },
        { key: 'total', label: 'Tổng tiền' },
        { key: 'discount_amount', label: 'Giảm giá' },
        { key: 'paid_amount', label: 'Khách đã trả' },
        { key: 'payment_method', label: 'PTTT' },
        { key: 'payment_status', label: 'Trạng thái' },
      ],
      filtered.map(o => ({ ...o, customer_name: o.customer_name || 'Khách lẻ', created_at: o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '' })),
      'hoa_don'
    );
    toast.success('Xuất file thành công');
  };

  const handlePrint = (o) => {
    const items = o._items || [];
    const rows = items.map(it => `<tr><td>${it.product_name}</td><td class="text-right">${it.quantity}</td><td class="text-right">${fmt(it.unit_price)}</td><td class="text-right">${fmt(it.total)}</td></tr>`).join('');
    printHTML(`
      <h2>HÓA ĐƠN BÁN HÀNG</h2>
      <div class="info">
        <strong>Mã HĐ:</strong> ${o.order_code}<br/>
        <strong>Ngày:</strong> ${o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}<br/>
        <strong>Khách hàng:</strong> ${o.customer_name || 'Khách lẻ'}<br/>
        <strong>Người bán:</strong> ${o.user_name || 'Admin'}
      </div>
      <table><thead><tr><th>Tên hàng</th><th class="text-right">SL</th><th class="text-right">Đơn giá</th><th class="text-right">Thành tiền</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total-row" style="text-align:right;margin-top:10px;">Tổng cộng: ${fmt(o.total)}</div>
      <div style="text-align:right;">Khách trả: ${fmt(o.paid_amount || 0)}</div>
    `, `Hóa đơn ${o.order_code}`);
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Hóa đơn</h1>
        <div className="flex items-center gap-3">
          <Button icon={<Download size={16} />} className="shadow-sm" onClick={handleExportAll}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Thời gian</span>
              <div className="flex flex-col gap-2.5 text-[13px] font-medium">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-primary transition-colors">
                  <input type="radio" name="time" defaultChecked className="text-primary focus:ring-primary h-4 w-4" /> Toàn thời gian
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-primary transition-colors">
                  <input type="radio" name="time" className="text-primary focus:ring-primary h-4 w-4" /> Tùy chỉnh
                </label>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Trạng thái thanh toán</span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_TAGS.map(s => <TagButton key={s.val} active={filterStatus === s.val} onClick={() => { setFilterStatus(s.val); setPage(1); }}>{s.label}</TagButton>)}
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Phương thức thanh toán</span>
              <div className="flex flex-wrap gap-1.5">
                {METHOD_TAGS.map(m => <TagButton key={m.val} active={filterPayment === m.val} onClick={() => { setFilterPayment(m.val); setPage(1); }}>{m.label}</TagButton>)}
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Kênh bán</span>
              <div className="flex gap-1.5">
                <TagButton active>Tất cả</TagButton>
                <TagButton>Bán trực tiếp</TagButton>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2 block">Người bán</span>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium text-gray-700 bg-gray-50/50 cursor-pointer">
                <option>Tất cả</option>
                <option>Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-white border border-gray-100 rounded-xl min-h-[500px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1/3">
              <Input icon={<Search size={16} className="text-gray-400" />} placeholder="Theo mã hóa đơn, tên khách hàng" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="bg-white" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /></th>
                  <th className="px-4 py-3.5">Mã hóa đơn</th>
                  <th className="px-4 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Mã KH</th>
                  <th className="px-4 py-3.5">Khách hàng</th>
                  <th className="px-4 py-3.5 text-right">Tổng tiền hàng</th>
                  <th className="px-4 py-3.5 text-right">Giảm giá</th>
                  <th className="px-4 py-3.5 text-right">Khách đã trả</th>
                  <th className="px-4 py-3.5 pl-5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700">
                  <td></td><td colSpan={4}></td>
                  <td className="px-4 py-2.5 text-right text-primary">{fmt(sumTotal)}</td>
                  <td className="px-4 py-2.5 text-right text-primary">{fmt(sumDiscount)}</td>
                  <td className="px-4 py-2.5 text-right text-primary">{fmt(sumPaid)}</td>
                  <td></td>
                </tr>
                {pageItems.map(o => (
                  <React.Fragment key={o.id}>
                    <tr className={`cursor-pointer transition-colors ${expandedId === o.id ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                        onClick={() => { if (expandedId === o.id) setExpandedId(null); else { setExpandedId(o.id); setDetailTab('info'); loadDetail(o.id); } }}>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /></td>
                      <td className="px-4 py-3.5 font-bold text-primary">{o.order_code}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 font-medium">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 font-medium">{o.customer_code || ''}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-800">{o.customer_name || <span className="text-gray-400">Khách lẻ</span>}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-800">{fmt(o.total)}</td>
                      <td className="px-4 py-3.5 text-right text-gray-500 font-medium">{o.discount_amount > 0 ? fmt(o.discount_amount) : ''}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-700">{fmt(o.paid_amount)}</td>
                      <td className="px-4 py-3.5 pl-5"><Badge status={o.payment_status || o.status} /></td>
                    </tr>
                    {expandedId === o.id && (
                      <tr><td colSpan={9} className="p-0 border-x-2 border-b-2 border-primary/20 bg-white shadow-inner" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2 border-b border-gray-100 px-6 pt-2">
                          {['info', 'payment'].map(t => (
                            <button key={t} onClick={() => setDetailTab(t)} className={`px-4 py-2.5 text-[13px] border-b-2 transition-all cursor-pointer ${detailTab === t ? 'text-primary border-primary font-bold' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>
                              {t === 'info' ? 'Thông tin' : 'Lịch sử thanh toán'}
                            </button>
                          ))}
                        </div>
                        {detailTab === 'info' ? (
                          <div>
                            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-50">
                              <div className="flex items-center gap-4">
                                <span className="text-lg font-bold text-gray-800">{o.customer_name || 'Khách lẻ'}</span>
                                <span className="text-sm text-primary font-semibold">{o.order_code}</span>
                                <Badge status={o.payment_status || o.status} />
                              </div>
                              <span className="text-[13px] font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-md">Chi nhánh trung tâm</span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-6 gap-y-3 px-8 py-4 text-[13px] border-b border-gray-50 bg-gray-50/30">
                              <div><span className="text-gray-500 mr-2">Người tạo:</span> <span className="font-medium text-gray-800">{o.user_name || 'Admin'}</span></div>
                              <div><span className="text-gray-500 mr-2">Ngày bán:</span> <span className="font-medium text-gray-800">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</span></div>
                              <div><span className="text-gray-500 mr-2">PTTT:</span> <span className="font-medium text-gray-800">{PAY_LABEL[o.payment_method] || o.payment_method || ''}</span></div>
                            </div>
                            {o._items && o._items.length > 0 ? (
                              <div className="px-8 py-4">
                                <table className="w-full text-[13px]">
                                  <thead>
                                    <tr className="text-gray-500 border-b border-gray-200">
                                      <th className="py-2.5 text-left font-semibold">Mã hàng</th>
                                      <th className="py-2.5 text-left font-semibold">Tên hàng</th>
                                      <th className="py-2.5 text-right font-semibold">SL</th>
                                      <th className="py-2.5 text-right font-semibold">Đơn giá</th>
                                      <th className="py-2.5 text-right font-semibold">Giảm giá</th>
                                      <th className="py-2.5 text-right text-primary font-bold">Thành tiền</th>
                                    </tr>
                                  </thead>
                                <tbody>{o._items.map((it, i) => (
                                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 text-primary font-medium">{it.product_sku}</td>
                                    <td className="py-3 font-medium text-gray-800">{it.product_name}</td>
                                    <td className="py-3 text-right font-medium text-gray-700">{it.quantity}</td>
                                    <td className="py-3 text-right text-gray-600">{fmt(it.unit_price)}</td>
                                    <td className="py-3 text-right text-gray-500">{it.discount > 0 ? fmt(it.discount) : ''}</td>
                                    <td className="py-3 text-right text-primary font-bold">{fmt(it.total)}</td>
                                  </tr>
                                ))}</tbody></table>
                              </div>
                            ) : <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" /> Đang tải...</div>}
                            <div className="flex gap-8 px-8 py-5 border-t border-gray-100 bg-gray-50/30">
                              <div className="flex-1">
                                <span className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú hóa đơn</span>
                                <textarea data-order-id={o.id} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[80px] outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white shadow-sm" placeholder="Nhập ghi chú (nếu có)..." defaultValue={o.note || ''} />
                              </div>
                              <div className="min-w-[280px] text-[13px] space-y-2 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center"><span className="text-gray-500">Tổng tiền ({o._items?.reduce((s, it) => s + it.quantity, 0) || 0}):</span><span className="font-semibold text-gray-800">{fmt(o.subtotal || o.total)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500">Giảm giá:</span><span className="font-medium text-gray-800">{fmt(o.discount_amount || 0)}</span></div>
                                <div className="h-[1px] bg-gray-100 my-1" />
                                <div className="flex justify-between items-center font-bold text-[15px]"><span className="text-gray-800">Khách cần trả:</span><span className="text-primary">{fmt(o.total)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500">Khách đã trả:</span><span className="font-semibold text-gray-700">{fmt(o.paid_amount || 0)}</span></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-8 py-5">
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className="text-gray-500 border-b border-gray-200">
                                  <th className="py-2.5 text-left font-semibold">Thời gian</th>
                                  <th className="py-2.5 text-left font-semibold">Phương thức</th>
                                  <th className="py-2.5 text-right font-semibold">Số tiền</th>
                                  <th className="py-2.5 text-left font-semibold pl-6">Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="hover:bg-gray-50/50 transition-colors">
                                  <td className="py-3 font-medium text-gray-800">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                                  <td className="py-3 text-gray-600">{PAY_LABEL[o.payment_method] || ''}</td>
                                  <td className="py-3 text-right font-bold text-gray-800">{fmt(o.paid_amount)}</td>
                                  <td className="py-3 pl-6"><Badge status="completed" /></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-8 py-4 border-t border-gray-100">
                          {o.status !== 'cancelled' && <Button variant="danger" size="sm" icon={<Trash2 size={14} />} className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold bg-white border-red-200" onClick={() => handleCancel(o)}>Hủy hóa đơn</Button>}
                          <Button size="sm" icon={<Copy size={14} className="text-gray-400" />} className="bg-white border-gray-200 text-gray-700 shadow-sm hover:border-primary hover:text-primary transition-all" onClick={() => handleCopy(o)}>Sao chép</Button>
                          <div className="flex-1" />
                          <Button size="sm" icon={<Save size={14} />} className="bg-white border-gray-200 text-gray-700 shadow-sm hover:border-primary hover:text-primary transition-all" onClick={() => handleSaveNote(o, document.querySelector(`textarea[data-order-id="${o.id}"]`))}>Lưu ghi chú</Button>
                          {o.status !== 'cancelled' && o.status !== 'returned' && <Button size="sm" icon={<RotateCcw size={14} />} className="bg-white border-gray-200 text-gray-700 shadow-sm hover:border-primary hover:text-primary transition-all" onClick={() => handleReturn(o)}>Trả hàng</Button>}
                          <Button size="sm" icon={<Printer size={14} />} className="bg-white border-gray-200 text-gray-700 shadow-sm hover:border-primary hover:text-primary transition-all" onClick={() => handlePrint(o)}>In</Button>
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
                {pageItems.length === 0 && <tr><td colSpan={9} className="text-center py-16 text-gray-400"><Receipt size={48} className="mx-auto mb-4 text-gray-300" /><div className="text-base font-medium text-gray-500">Không có hóa đơn</div></td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {filtered.length} hóa đơn</span>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 flex items-center justify-center text-xs rounded-lg border cursor-pointer font-bold transition-all ${page === i + 1 ? 'bg-primary text-white border-primary shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50 hover:text-primary hover:border-primary/50'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
