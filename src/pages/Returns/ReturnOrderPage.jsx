import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Printer, Eye, AlertCircle, Edit2, Search, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI, returnAPI, customerAPI } from '../../services/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function ReturnOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  
  const [returnDate, setReturnDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  
  const [discountStr, setDiscountStr] = useState('0'); // Phí trả hàng (khách chịu)
  const [paidAmountStr, setPaidAmountStr] = useState(''); // Tiền đã trả khách
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // New state for searching
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const loadInitialData = async () => {
    try {
      const [custRes, ordRes] = await Promise.all([
        customerAPI.getAll().catch(() => []),
        orderAPI.getAll({ limit: 500 }).catch(() => [])
      ]);
      setCustomers(Array.isArray(custRes?.data) ? custRes.data : (Array.isArray(custRes) ? custRes : []));
      setOrders(Array.isArray(ordRes?.data) ? ordRes.data : (Array.isArray(ordRes) ? ordRes : []));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadOrderDetails = async (id) => {
    try {
      setLoading(true);
      const data = await orderAPI.getById(id);
      setOrder(data);
      if (data.customer) {
        setCustomer(data.customer);
      } else if (data.customer_name) {
        setCustomer({ id: data.customerId || data.customer_id, name: data.customer_name, phone: data.customer_phone, debt: data.customer?.debt || 0 });
      }
      
      if (Array.isArray(data.items)) {
        setItems(data.items.map((it, idx) => {
          const boughtQty = Number(it.quantity || 0);
          const unitPrice = Number(it.price || it.unit_price || 0);
          const itemDiscount = Number(it.discount || 0);
          const pricePerUnit = unitPrice - (itemDiscount / boughtQty);
          
          return {
            id: it.productId || it.product?.id || it.id,
            sku: it.product?.sku || it.product_sku || `SP00${idx+1}`,
            name: it.product?.name || it.product_name || '',
            unit: it.product?.unit || it.unit || 'Cái',
            max_quantity: boughtQty,
            return_quantity: boughtQty,
            return_price: pricePerUnit,
            note: '',
          };
        }));
      }
    } catch (err) {
      toast.error('Không tìm thấy đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadOrderDetails(orderId);
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.code || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [customerSearch, customers]);

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return [];
    const q = orderSearch.toLowerCase();
    return orders.filter(o => {
      // If a customer is selected, only show their orders
      if (customer && customer.id) {
         if (o.customer_id !== customer.id && o.customerId !== customer.id) return false;
      }
      return (o.order_code || o.code || '').toLowerCase().includes(q);
    }).slice(0, 6);
  }, [orderSearch, orders, customer]);

  const handleSelectCustomer = (c) => {
    setCustomer(c);
    setCustomerSearch('');
  };

  const handleSelectOrder = (o) => {
    setOrderSearch('');
    loadOrderDetails(o.id);
  };

  const handleCreateCustomer = async () => {
    const name = window.prompt('Nhập tên khách hàng mới:');
    if (!name || !name.trim()) return;
    try {
      const res = await customerAPI.create({ 
        name: name.trim(), 
        code: `KH${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        phone: '0901234567',
      });
      setCustomers(prev => [...prev, res]);
      setCustomer(res);
      setCustomerSearch('');
      toast.success('Đã tạo khách hàng mới');
    } catch (e) {
      toast.error('Lỗi khi tạo khách hàng');
    }
  };

  const currentDebt = customer ? Number(customer.debt || customer.totalDebt || customer.total_debt || 0) : 0;

  const totalReturnGoods = items.reduce((acc, it) => acc + (it.return_quantity * it.return_price), 0);
  const returnFee = Number(discountStr.replace(/\D/g, '')) || 0; 
  const customerMustReceive = Math.max(0, totalReturnGoods - returnFee);
  
  const actualPaid = paidAmountStr === '' ? Math.max(0, customerMustReceive - currentDebt) : (Number(paidAmountStr.replace(/\D/g, '')) || 0);
  const debtCalculation = customerMustReceive - actualPaid;

  const handleQuantityChange = (id, val) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        const num = val === '' ? 0 : Math.min(it.max_quantity, Math.max(0, Number(val) || 0));
        return { ...it, return_quantity: num };
      }
      return it;
    }));
  };

  const handlePriceChange = (id, val) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        return { ...it, return_price: Number(val.replace(/\D/g, '')) || 0 };
      }
      return it;
    }));
  };

  const handleNoteChange = (id, val) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        return { ...it, note: val };
      }
      return it;
    }));
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleSaveReturn = async () => {
    const validItems = items.filter(it => it.return_quantity > 0);
    if (validItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm có số lượng trả > 0');
      return;
    }

    if (debtCalculation > currentDebt) {
      toast.error(`Số tiền tính vào công nợ (${fmt(debtCalculation)}) vượt quá nợ hiện tại (${fmt(currentDebt)}). Vui lòng điều chỉnh lại.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        orderId: order ? Number(order.id) : null,
        customerId: customer?.id ? Number(customer.id) : null,
        items: validItems.map(it => ({
          productId: it.id,
          quantity: Number(it.return_quantity),
          price: Number(it.return_price)
        })),
        reason: note || ''
      };

      const res = await returnAPI.create(payload);
      toast.success(`Tạo phiếu trả hàng thành công! Mã: ${res?.code || ''}`);
      navigate('/invoices');
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      toast.error(`Lỗi khi lưu phiếu trả hàng: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50">Đang tải thông tin đơn hàng...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] -m-5 bg-gray-100 font-sans">
      {/* Top Action Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-700 hover:text-primary font-extrabold text-lg tracking-tight cursor-pointer transition-colors border-none bg-transparent"
          >
            <ArrowLeft size={20} className="text-gray-500" />
            <span>Trả hàng</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="In phiếu"><Printer size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="Ẩn/hiện cột"><Eye size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors text-amber-600 border-none bg-transparent" title="Thông tin trợ giúp"><AlertCircle size={18} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Table Section */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden m-4 rounded-2xl shadow-sm border border-gray-200">
          {items.length > 0 ? (
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-700 text-xs font-bold border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                    <th className="py-3.5 px-4 w-12 text-center"></th>
                    <th className="py-3.5 px-4 w-16 text-center">STT</th>
                    <th className="py-3.5 px-4 w-32">Mã hàng</th>
                    <th className="py-3.5 px-4 flex-1">Tên hàng</th>
                    <th className="py-3.5 px-4 w-24 text-center">ĐVT</th>
                    <th className="py-3.5 px-4 w-36 text-right">Số lượng</th>
                    <th className="py-3.5 px-4 w-32 text-right">Giá trả lại</th>
                    <th className="py-3.5 px-4 w-36 text-right font-extrabold text-primary">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-100">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                          title="Xóa dòng"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">{it.sku}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 mb-1">{it.name}</div>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="text"
                            value={it.note}
                            onChange={(e) => handleNoteChange(it.id, e.target.value)}
                            placeholder="Ghi chú..." 
                            className="text-[11px] text-gray-500 italic bg-transparent border-b border-dashed border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 w-48 font-medium"
                          />
                          <Edit2 size={12} className="text-gray-400" />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 font-medium">{it.unit}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input 
                            type="number"
                            value={it.return_quantity}
                            onChange={(e) => handleQuantityChange(it.id, e.target.value)}
                            className="w-16 py-1 px-2 text-right font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                          />
                          <span className="text-gray-400 font-medium">/{it.max_quantity}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input 
                          type="text"
                          value={fmt(it.return_price)}
                          onChange={(e) => handlePriceChange(it.id, e.target.value)}
                          className="w-24 py-1 px-2 text-right font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-primary text-sm">
                        {fmt(it.return_quantity * it.return_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 font-bold">
              Chưa có sản phẩm nào để trả. Vui lòng chọn hóa đơn!
            </div>
          )}
        </div>

        {/* Right Panel Section */}
        <div className="w-[380px] bg-white border-l border-gray-200 p-6 flex flex-col justify-between shadow-lg z-10 shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <div className="flex items-center gap-3 justify-end">
              <input 
                type="datetime-local" 
                value={returnDate} 
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-36 py-2 px-2 bg-gray-50 border border-gray-300 rounded-xl text-[11px] font-bold text-gray-700 focus:outline-none focus:border-primary shadow-sm"
              />
            </div>

            {/* Customer Search / Info */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Khách hàng</label>
              <div className="relative">
                {customer ? (
                  <div className="flex items-center justify-between bg-blue-50/50 border border-blue-200 rounded-xl p-2.5 shadow-inner">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-gray-800">{customer.name}</span>
                      <span className="text-xs text-gray-500 font-medium">{customer.phone || customer.code}</span>
                    </div>
                    <button 
                      onClick={() => setCustomer(null)} 
                      className="p-1.5 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors text-gray-500 border-none bg-transparent"
                      title="Xóa khách hàng"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 shadow-inner gap-2">
                    <Search size={16} className="text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Tìm khách hàng" 
                      className="w-full bg-transparent text-sm outline-none font-medium text-gray-800"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                    />
                    <button 
                      onClick={handleCreateCustomer}
                      className="p-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg cursor-pointer transition-colors border-none"
                      title="Thêm khách hàng mới"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}

                {!customer && filteredCustomers.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-50 divide-y divide-gray-50">
                    {filteredCustomers.map(c => (
                      <div 
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-3 hover:bg-blue-50/60 cursor-pointer flex flex-col transition-colors"
                      >
                        <span className="font-extrabold text-sm text-gray-800">{c.name}</span>
                        <span className="text-xs text-gray-500 font-medium">{c.phone} - {c.code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Search */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Chọn hóa đơn bán (Tùy chọn)</label>
              <div className="relative">
                {order ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 shadow-inner">
                    <span className="font-extrabold text-sm text-emerald-800">{order.order_code || order.code}</span>
                    <button 
                      onClick={() => {
                        setOrder(null);
                        setItems([]);
                        setCustomer(null);
                      }} 
                      className="p-1.5 hover:bg-emerald-100 rounded-xl cursor-pointer transition-colors text-emerald-600 border-none bg-transparent"
                      title="Bỏ chọn hóa đơn"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 shadow-inner gap-2">
                    <Search size={16} className="text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Tìm theo mã hóa đơn..." 
                      className="w-full bg-transparent text-sm outline-none font-medium text-gray-800"
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                    />
                  </div>
                )}

                {!order && filteredOrders.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-50 divide-y divide-gray-50">
                    {filteredOrders.map(o => (
                      <div 
                        key={o.id}
                        onClick={() => handleSelectOrder(o)}
                        className="p-3 hover:bg-blue-50/60 cursor-pointer flex flex-col transition-colors"
                      >
                        <span className="font-extrabold text-sm text-gray-800">{o.order_code || o.code}</span>
                        <span className="text-xs text-gray-500 font-medium">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''} - {o.customer_name || o.customer?.name || 'Khách lẻ'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Return Code */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Mã trả hàng</label>
              <input 
                type="text" 
                disabled 
                placeholder="Mã phiếu tự động" 
                className="w-full py-2 px-3.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 placeholder-gray-400 shadow-inner cursor-not-allowed"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Trạng thái</label>
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 py-1.5 px-3.5 rounded-xl inline-block shadow-sm">
                Đã trả hàng
              </div>
            </div>

            <hr className="border-gray-100 my-2" />

            {/* Financial Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-bold">Tổng tiền hàng trả</span>
                <span className="font-extrabold text-gray-900 text-sm">{fmt(totalReturnGoods)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-bold">Phí trả hàng</span>
                <input 
                  type="text" 
                  value={discountStr === '0' ? '' : discountStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setDiscountStr(val === '' ? '0' : fmt(Number(val)));
                  }}
                  placeholder="0"
                  className="w-28 py-1.5 px-3 text-right font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                <span className="text-gray-800 font-extrabold">Khách cần trả (hoàn lại)</span>
                <span className="font-extrabold text-primary text-base">{fmt(customerMustReceive)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="text-gray-800 font-extrabold">Tiền đã trả khách</span>
                  <span className="text-[10px] text-gray-400 font-medium">Tiền mặt</span>
                </div>
                <input 
                  type="text" 
                  value={paidAmountStr === '' ? fmt(Math.max(0, customerMustReceive - currentDebt)) : paidAmountStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPaidAmountStr(val === '' ? '0' : fmt(Number(val)));
                  }}
                  className="w-32 py-2 px-3 text-right font-extrabold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary shadow-sm bg-blue-50/30 text-sm"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                <span className="text-gray-800 font-bold flex items-center gap-2">
                  Tính vào công nợ
                  <span className="text-[10px] text-gray-400 font-normal">(Nợ hiện tại: {fmt(currentDebt)})</span>
                </span>
                <span className={`font-extrabold text-sm ${debtCalculation > currentDebt ? 'text-red-500' : 'text-gray-900'}`}>{fmt(debtCalculation)}</span>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Ghi chú</label>
              <textarea 
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Ghi chú phiếu trả hàng..."
                className="w-full py-2 px-3 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner resize-none"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button 
              disabled={saving}
              onClick={handleSaveReturn}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? 'ĐANG XỬ LÝ...' : 'HOÀN THÀNH TRẢ HÀNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
