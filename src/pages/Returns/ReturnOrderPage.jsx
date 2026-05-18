import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Printer, Eye, AlertCircle, Edit2, User, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI, returnAPI } from '../../services/api';
import '../POS/pos.css'; // Import styles from POS

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

  useEffect(() => {
    // Add light background for POS UI
    document.body.style.backgroundColor = '#f0f2f5';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await orderAPI.getById(orderId);
        setOrder(data);
        if (data.customer) {
          setCustomer(data.customer);
        } else if (data.customer_name) {
          setCustomer({ id: data.customerId, name: data.customer_name, phone: data.customer_phone });
        }
        
        if (Array.isArray(data.items)) {
          setItems(data.items.map((it, idx) => {
            const boughtQty = Number(it.quantity || 0);
            const unitPrice = Number(it.price || it.unit_price || 0);
            const itemDiscount = Number(it.discount || 0);
            const pricePerUnit = unitPrice - (itemDiscount / boughtQty); // Giá thực tế khách đã trả cho 1 SP
            
            return {
              id: it.productId || it.product?.id || it.id,
              sku: it.product?.sku || it.product_sku || `SP00${idx+1}`,
              name: it.product?.name || it.product_name || '',
              unit: it.product?.unit || it.unit || 'Cái',
              max_quantity: boughtQty,
              return_quantity: boughtQty, // Mặc định trả hết
              return_price: pricePerUnit,
              note: '',
            };
          }));
        }
      } catch (err) {
        toast.error('Không tìm thấy đơn hàng');
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId, navigate]);

  const totalReturnGoods = items.reduce((acc, it) => acc + (it.return_quantity * it.return_price), 0);
  const returnFee = Number(discountStr.replace(/\D/g, '')) || 0; 
  const customerMustReceive = Math.max(0, totalReturnGoods - returnFee);
  
  const actualPaid = paidAmountStr === '' ? customerMustReceive : (Number(paidAmountStr.replace(/\D/g, '')) || 0);
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

  const handleIncQty = (id) => {
    setItems(prev => prev.map(it => {
      if (it.id === id && it.return_quantity < it.max_quantity) {
        return { ...it, return_quantity: it.return_quantity + 1 };
      }
      return it;
    }));
  };

  const handleDecQty = (id) => {
    setItems(prev => prev.map(it => {
      if (it.id === id && it.return_quantity > 0) {
        return { ...it, return_quantity: it.return_quantity - 1 };
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

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleSaveReturn = async () => {
    const validItems = items.filter(it => it.return_quantity > 0);
    if (validItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm có số lượng trả > 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        orderId: Number(order.id),
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
      navigate('/returns');
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

  const validItems = items.filter(it => it.return_quantity > 0);

  return (
    <div className="pos-fullscreen">
      {/* ─── Top Bar ─── */}
      <div className="pos-topbar" style={{ backgroundColor: '#1E3A8A' }}>
        <button 
          className="pos-add-tab-btn border-none hover:bg-white/10" 
          onClick={() => navigate('/invoices')}
        >
          <ArrowLeft size={16} /> Trở về
        </button>
        
        <div className="pos-search-box ml-4">
          <Search className="search-icon" />
          <input type="text" placeholder="Tìm hàng hóa" disabled />
        </div>

        <div className="pos-invoice-tabs">
          <button className="pos-invoice-tab active">
            Trả hàng: {order?.order_code || order?.code}
          </button>
        </div>

        <div className="pos-toolbar-right">
          <button className="pos-toolbar-btn"><Printer size={18} /></button>
          <button className="pos-toolbar-btn"><Eye size={18} /></button>
          <span className="pos-user-display">Quản trị viên</span>
        </div>
      </div>

      <div className="pos-body">
        {/* ─── Cart Panel (Left) ─── */}
        <div className="pos-cart-panel">
          <div className="pos-cart-list">
            {items.map((it, idx) => (
              <div key={it.id} className="pos-cart-item">
                <div className="pos-cart-item-top">
                  <span className="pos-cart-item-stt">{idx + 1}</span>
                  <button className="pos-cart-item-delete" onClick={() => handleRemoveItem(it.id)}>
                    <Trash2 />
                  </button>
                  <span className="pos-cart-item-sku">{it.sku}</span>
                  <span className="pos-cart-item-name">{it.name} <span className="text-gray-400 font-normal text-xs ml-2">[Mua: {it.max_quantity}]</span></span>
                  
                  <div className="pos-cart-item-actions">
                    <div className="pos-qty-control">
                      <button className="pos-qty-btn" onClick={() => handleDecQty(it.id)}>-</button>
                      <input 
                        type="number" 
                        className="pos-cart-item-qty" 
                        value={it.return_quantity}
                        onChange={(e) => handleQuantityChange(it.id, e.target.value)}
                      />
                      <button className="pos-qty-btn" onClick={() => handleIncQty(it.id)}>+</button>
                    </div>
                    
                    <div className="pos-cart-item-price">
                      <input 
                        type="text"
                        value={fmt(it.return_price)}
                        onChange={(e) => handlePriceChange(it.id, e.target.value)}
                        className="w-24 text-right bg-transparent border-none outline-none font-medium text-gray-700"
                        style={{ borderBottom: '1px dashed #ccc' }}
                      />
                      <Edit2 size={12} className="inline ml-1 text-gray-400" />
                    </div>
                    
                    <span className="pos-cart-item-total text-primary">{fmt(it.return_quantity * it.return_price)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="pos-cart-empty">
                Chưa có sản phẩm nào để trả
              </div>
            )}
          </div>
          
          <div className="pos-cart-footer">
            <div className="pos-note-input">
              <Edit2 size={16} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Ghi chú phiếu trả hàng" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="pos-total-summary">
              <span>Tổng tiền hàng trả</span>
              <span id="pos-item-count">{validItems.length}</span>
              <span className="pos-total-amount text-primary">{fmt(totalReturnGoods)}</span>
            </div>
          </div>
        </div>

        {/* ─── Right Panel ─── */}
        <div className="pos-right-panel narrow">
          <div className="pos-payment-panel">
            <div className="pos-seller-info">
              <span className="pos-seller-name"><User size={14} className="inline mr-1"/> Admin</span>
              <span className="pos-seller-date">{new Date(returnDate).toLocaleString('vi-VN')}</span>
            </div>
            
            <div className="pos-customer-search">
              <div className="pos-customer-search-input-wrapper">
                <Search size={16} className="text-gray-400" />
                <input type="text" placeholder="Tìm khách hàng (F4)" value={customer?.name || 'Khách lẻ'} disabled />
              </div>
            </div>

            <div className="pos-payment-rows">
              <div className="pos-payment-row">
                <span className="label">Mã trả hàng</span>
                <span className="value text-gray-500 font-normal">Mã phiếu tự động</span>
              </div>
              <div className="pos-payment-row">
                <span className="label">Tổng tiền hàng</span>
                <span className="value">{fmt(totalReturnGoods)}</span>
              </div>
              <div className="pos-payment-row">
                <span className="label">Phí trả hàng</span>
                <span className="value">
                  <input 
                    type="text" 
                    value={discountStr === '0' ? '' : discountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setDiscountStr(val === '' ? '0' : fmt(Number(val)));
                    }}
                    placeholder="0"
                  />
                </span>
              </div>
              <div className="pos-payment-row total">
                <span className="label text-primary">Khách cần trả (hoàn lại)</span>
                <span className="value text-primary">{fmt(customerMustReceive)}</span>
              </div>
              <div className="pos-payment-row">
                <span className="label">Tiền đã trả khách</span>
                <span className="value">
                  <input 
                    type="text" 
                    value={paidAmountStr === '' ? fmt(customerMustReceive) : paidAmountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPaidAmountStr(val === '' ? '0' : fmt(Number(val)));
                    }}
                  />
                </span>
              </div>
              
              <div className="flex items-center gap-4 mt-2 mb-2 text-sm text-gray-600 pl-2">
                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="payment" defaultChecked /> Tiền mặt</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="payment" /> Chuyển khoản</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="payment" /> Thẻ</label>
              </div>

              <div className="pos-payment-row change mt-4">
                <span className="label">Tính vào công nợ</span>
                <span className="value font-bold text-danger" style={{ color: debtCalculation > 0 ? '#EF4444' : '#475569' }}>
                  {fmt(debtCalculation)}
                </span>
              </div>
            </div>

            <button 
              className="pos-pay-button" 
              onClick={handleSaveReturn}
              disabled={saving}
            >
              {saving ? 'ĐANG XỬ LÝ...' : 'HOÀN THÀNH TRẢ HÀNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
