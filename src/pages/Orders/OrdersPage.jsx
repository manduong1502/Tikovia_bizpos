import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Download, MoreHorizontal, Settings, Search, Trash2, Copy, Edit, Save, RotateCcw, Printer, QrCode } from 'lucide-react';

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
    <button onClick={onClick} className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'}`}>
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

  useEffect(() => {
    const load = async () => {
      try {
        const params = { page: 1, limit: 200 };
        if (filterStatus) params.payment_status = filterStatus;
        if (filterPayment) params.payment_method = filterPayment;
        if (search) params.search = search;
        const r = await axios.get('/api/orders', { params });
        setOrders(Array.isArray(r.data) ? r.data : (r.data.data || []));
      } catch { setOrders([]); }
    };
    load();
  }, [filterStatus, filterPayment, search]);

  const filtered = orders;
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const sumTotal = filtered.reduce((s, o) => s + (o.total || 0), 0);
  const sumDiscount = filtered.reduce((s, o) => s + (o.discount_amount || 0), 0);
  const sumPaid = filtered.reduce((s, o) => s + (o.paid_amount || 0), 0);

  const loadDetail = async (id) => {
    try {
      const r = await axios.get(`/api/orders/${id}`);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, _items: r.data.items, subtotal: r.data.subtotal, note: r.data.note } : o));
    } catch {}
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Hóa đơn</h1>
        <div className="flex items-center gap-2">
          <Button icon={<Download size={16} />}>Xuất file</Button>
          <Button icon={<MoreHorizontal size={16} />} className="px-2" />
          <Button icon={<Settings size={16} />} className="px-2" />
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Sidebar */}
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Thời gian</span>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="time" defaultChecked className="text-primary" /> Toàn thời gian</label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="time" className="text-primary" /> Tùy chỉnh</label>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Trạng thái thanh toán</span>
            <div className="flex flex-wrap gap-1">
              {STATUS_TAGS.map(s => <TagButton key={s.val} active={filterStatus === s.val} onClick={() => { setFilterStatus(s.val); setPage(1); }}>{s.label}</TagButton>)}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Phương thức thanh toán</span>
            <div className="flex flex-wrap gap-1">
              {METHOD_TAGS.map(m => <TagButton key={m.val} active={filterPayment === m.val} onClick={() => { setFilterPayment(m.val); setPage(1); }}>{m.label}</TagButton>)}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Kênh bán</span>
            <div className="flex gap-1">
              <TagButton active>Tất cả</TagButton>
              <TagButton>Bán trực tiếp</TagButton>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Người bán</span>
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm"><option>Tất cả</option><option>Admin</option></select>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-white border border-border rounded min-h-[500px]">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3">
              <Input icon={<Search size={16} />} placeholder="Theo mã hóa đơn, tên khách hàng" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-10"><input type="checkbox" className="w-4 h-4" /></th>
                  <th className="px-3 py-3">Mã hóa đơn</th>
                  <th className="px-3 py-3">Thời gian</th>
                  <th className="px-3 py-3">Mã KH</th>
                  <th className="px-3 py-3">Khách hàng</th>
                  <th className="px-3 py-3 text-right">Tổng tiền hàng</th>
                  <th className="px-3 py-3 text-right">Giảm giá</th>
                  <th className="px-3 py-3 text-right">Khách đã trả</th>
                  <th className="px-3 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-gray-50/60 text-xs font-semibold text-gray-600">
                  <td></td><td colSpan={4}></td>
                  <td className="px-3 py-2 text-right">{fmt(sumTotal)}</td>
                  <td className="px-3 py-2 text-right">{fmt(sumDiscount)}</td>
                  <td className="px-3 py-2 text-right">{fmt(sumPaid)}</td>
                  <td></td>
                </tr>
                {pageItems.map(o => (
                  <React.Fragment key={o.id}>
                    <tr className={`cursor-pointer transition-colors ${expandedId === o.id ? 'bg-blue-50 border-l-[3px] border-l-primary' : 'hover:bg-gray-50'}`}
                        onClick={() => { if (expandedId === o.id) setExpandedId(null); else { setExpandedId(o.id); setDetailTab('info'); loadDetail(o.id); } }}>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="w-4 h-4" /></td>
                      <td className="px-3 py-3 font-medium text-primary">{o.order_code}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                      <td className="px-3 py-3 text-xs">{o.customer_code || ''}</td>
                      <td className="px-3 py-3">{o.customer_name || <span className="text-gray-400">Khách lẻ</span>}</td>
                      <td className="px-3 py-3 text-right font-medium">{fmt(o.total)}</td>
                      <td className="px-3 py-3 text-right">{o.discount_amount > 0 ? fmt(o.discount_amount) : ''}</td>
                      <td className="px-3 py-3 text-right">{fmt(o.paid_amount)}</td>
                      <td className="px-3 py-3"><Badge status={o.payment_status || o.status} /></td>
                    </tr>
                    {expandedId === o.id && (
                      <tr><td colSpan={9} className="p-0 border-2 border-blue-200 bg-white" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0 border-b border-gray-200">
                          {['info', 'payment'].map(t => (
                            <button key={t} onClick={() => setDetailTab(t)} className={`px-4 py-2.5 text-[13px] border-b-2 transition-colors cursor-pointer ${detailTab === t ? 'text-primary border-primary font-semibold' : 'text-gray-500 border-transparent'}`}>
                              {t === 'info' ? 'Thông tin' : 'Lịch sử thanh toán'}
                            </button>
                          ))}
                        </div>
                        {detailTab === 'info' ? (
                          <div>
                            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                              <div className="flex items-center gap-3">
                                <span className="text-base font-semibold">{o.customer_name || 'Khách lẻ'}</span>
                                <span className="text-xs text-primary">{o.order_code}</span>
                                <Badge status={o.payment_status || o.status} />
                              </div>
                              <span className="text-xs text-gray-400">Chi nhánh trung tâm</span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-6 gap-y-2 px-5 py-3 text-[13px] border-b border-gray-100">
                              <div><span className="text-gray-400">Người tạo:</span> {o.user_name || 'Admin'}</div>
                              <div><span className="text-gray-400">Ngày bán:</span> {o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</div>
                              <div><span className="text-gray-400">PTTT:</span> {PAY_LABEL[o.payment_method] || o.payment_method || ''}</div>
                            </div>
                            {o._items && o._items.length > 0 ? (
                              <div className="px-5 py-3">
                                <table className="w-full text-xs"><thead><tr className="text-gray-400 border-b"><th className="py-2 text-left text-primary">Mã hàng</th><th className="py-2 text-left">Tên hàng</th><th className="py-2 text-right">SL</th><th className="py-2 text-right">Đơn giá</th><th className="py-2 text-right">Giảm giá</th><th className="py-2 text-right text-primary font-bold">Thành tiền</th></tr></thead>
                                <tbody>{o._items.map((it, i) => (
                                  <tr key={i} className="border-b border-gray-50"><td className="py-2 text-primary">{it.product_sku}</td><td className="py-2">{it.product_name}</td><td className="py-2 text-right">{it.quantity}</td><td className="py-2 text-right">{fmt(it.unit_price)}</td><td className="py-2 text-right">{it.discount > 0 ? fmt(it.discount) : ''}</td><td className="py-2 text-right text-primary font-semibold">{fmt(it.total)}</td></tr>
                                ))}</tbody></table>
                              </div>
                            ) : <div className="text-center py-6 text-gray-300 text-sm">Đang tải...</div>}
                            <div className="flex gap-5 px-5 py-3 border-t border-gray-100">
                              <textarea className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm resize-y min-h-[60px] outline-none focus:border-primary" placeholder="Ghi chú..." defaultValue={o.note || ''} />
                              <div className="min-w-[240px] text-[13px] space-y-1">
                                <div className="flex justify-between"><span>Tổng tiền ({o._items?.reduce((s, it) => s + it.quantity, 0) || 0}):</span><span>{fmt(o.subtotal || o.total)}</span></div>
                                <div className="flex justify-between"><span>Giảm giá:</span><span>{fmt(o.discount_amount || 0)}</span></div>
                                <div className="flex justify-between font-bold"><span>Khách cần trả:</span><span>{fmt(o.total)}</span></div>
                                <div className="flex justify-between"><span>Khách đã trả:</span><span>{fmt(o.paid_amount || 0)}</span></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-5 py-3">
                            <table className="w-full text-xs"><thead><tr className="text-gray-400 border-b"><th className="py-2 text-left">Thời gian</th><th className="py-2 text-left">Phương thức</th><th className="py-2 text-right">Số tiền</th><th className="py-2 text-left">Trạng thái</th></tr></thead>
                            <tbody><tr><td className="py-2">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td><td className="py-2">{PAY_LABEL[o.payment_method] || ''}</td><td className="py-2 text-right">{fmt(o.paid_amount)}</td><td className="py-2"><Badge status="completed" /></td></tr></tbody></table>
                          </div>
                        )}
                        <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100">
                          <Button variant="danger" size="sm" icon={<Trash2 size={14} />}>Hủy</Button>
                          <Button size="sm" icon={<Copy size={14} />}>Sao chép</Button>
                          <Button size="sm" icon={<Download size={14} />}>Xuất file</Button>
                          <div className="flex-1" />
                          <Button variant="primary" size="sm" icon={<Edit size={14} />}>Chỉnh sửa</Button>
                          <Button size="sm" icon={<Save size={14} />}>Lưu</Button>
                          <Button size="sm" icon={<RotateCcw size={14} />}>Trả hàng</Button>
                          <Button size="sm" icon={<Printer size={14} />}>In</Button>
                          <Button size="sm" icon={<QrCode size={14} />}>Tạo QR</Button>
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
                {pageItems.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">🧾</div>Không có hóa đơn</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-gray-600">
            <span>{filtered.length} hóa đơn</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`px-2.5 py-1 text-xs rounded border cursor-pointer ${page === i + 1 ? 'bg-primary text-white border-primary' : 'border-gray-200 hover:bg-gray-50'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
