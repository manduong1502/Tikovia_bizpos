import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, CheckCircle, ChevronLeft, Pin, ChevronDown, Plus } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function POSPaymentPanel({ forceShow = false }) {
  const { currentInvoice, updateCurrentInvoice, togglePaymentMode, clearCurrentInvoice, saleMode } = usePOS();
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [paidAmountStr, setPaidAmountStr] = useState('');
  
  if (!currentInvoice?.isPaymentMode && !forceShow) return null;

  const cart = currentInvoice?.cart || [];
  const customer = currentInvoice?.customer;
  const subtotal = cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0);
  const discountAmount = Math.round(subtotal * (currentInvoice.discount || 0) / 100);
  const total = subtotal - discountAmount;
  
  const paidAmount = paidAmountStr === '' ? total : Number(paidAmountStr.replace(/\D/g, ''));
  const changeAmount = paidAmount - total;
  const isDebt = changeAmount < 0;

  const handleCustomerSearch = async (e) => {
    const val = e.target.value;
    setCustomerSearch(val);
    
    if (val.trim().length === 0) {
      setCustomerSuggestions([]);
      return;
    }

    try {
      const res = await api.get(`/customers/search?q=${val}`);
      setCustomerSuggestions(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCustomer = (cust) => {
    updateCurrentInvoice({ customer: cust });
    setCustomerSearch('');
    setCustomerSuggestions([]);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error('Chưa có sản phẩm trong đơn hàng');
      return;
    }

    if (isDebt && !customer) {
      toast.error('Vui lòng chọn khách hàng để ghi nợ');
      return;
    }

    try {
      const orderData = {
        customerId: customer?.id || null,
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.price,
          discount: i.discount
        })),
        paymentMethod: 'CASH', // Hardcoded for now
        discountPercent: currentInvoice.discount || 0,
        discountAmount: discountAmount,
        paidAmount: isDebt ? paidAmount : total, // if change is positive, we only record they paid `total` to us
        note: currentInvoice.note
      };

      const res = await api.post('/orders', orderData);
      const newOrder = res.data?.data || res.data;
      
      toast.success(`Tạo đơn hàng thành công! ${isDebt ? `(Ghi nợ: ${new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount))})` : ''}`);
      
      // Clear and return
      clearCurrentInvoice();
      togglePaymentMode(false);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo đơn hàng');
    }
  };

  const user = useAppStore?.(s => s.user) || null;

  return (
    <div className="pos-payment-panel">
      <div className="pos-seller-info">
        <span className="pos-seller-name">{user ? user.fullName : 'Nhân viên'}</span>
        <div className="pos-seller-icons">
          <button title="Ghim"><Pin size={16} /></button>
          <button><ChevronDown size={16} /></button>
        </div>
        <span className="pos-seller-date">{new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>
      
      {customer ? (
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--pos-border-light)' }}>
          <span style={{ color: 'var(--pos-text-muted)', marginRight: '12px' }}><User size={20} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--pos-primary)' }}>{customer.name}</div>
            {(customer.totalDebt || 0) > 0 && <div style={{ fontSize: '12px', color: 'var(--pos-danger)', marginTop: '4px', fontWeight: '500' }}>Nợ: {new Intl.NumberFormat('vi-VN').format(customer.totalDebt)}</div>}
          </div>
          <button onClick={() => updateCurrentInvoice({ customer: null })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pos-text-muted)', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--pos-danger)'} onMouseOut={e=>e.currentTarget.style.color='var(--pos-text-muted)'}><X size={18} /></button>
        </div>
      ) : (
        <div className="pos-customer-search">
          <div className="pos-customer-search-input-wrapper">
            <Search size={16} color="var(--pos-text-muted)" />
            <input
              type="text"
              id="pos-cust-input"
              placeholder="Tìm khách hàng (F4)"
              value={customerSearch}
              onChange={handleCustomerSearch}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <button className="pos-add-customer-btn" title="Thêm khách hàng"><Plus size={18} /></button>
          {customerSuggestions.length > 0 && (
            <div id="pos-cust-suggest" className="pos-customer-suggestions" style={{ position: 'absolute', top: '100%', left: '16px', right: '16px', background: 'var(--pos-surface)', zIndex: 50, border: '1px solid var(--pos-border)', borderRadius: 'var(--pos-radius-md)', boxShadow: 'var(--pos-shadow-md)', marginTop: '4px' }}>
              {customerSuggestions.map(c => (
                <div key={c.id} className="pos-customer-suggestion" onClick={() => handleSelectCustomer(c)} style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s', borderBottom: '1px solid var(--pos-border-light)' }}>
                  <div style={{ fontWeight: '500', color: 'var(--pos-text-main)' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--pos-text-muted)' }}>{c.phone}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="pos-payment-rows">
        <div className="pos-payment-row">
          <span className="label">Tổng tiền hàng</span>
          <span className="value" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span id="pos-item-count2" style={{ color: '#666', minWidth: '30px', textAlign: 'center' }}>
              {cart.reduce((s,i)=>s+i.quantity,0)}
            </span>
            <span id="pay-subtotal">{new Intl.NumberFormat('vi-VN').format(subtotal)}</span>
          </span>
        </div>
        <div className="pos-payment-row">
          <span className="label">Giảm giá</span>
          <span className="value">
            <input 
              type="text" 
              value={discountAmount} 
              style={{ width: '80px', textAlign: 'right', border: 'none', borderBottom: '1px solid #e0e0e0', outline: 'none', fontSize: '14px', padding: '2px 0' }}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                updateCurrentInvoice({ discount: (val / subtotal) * 100 });
              }}
            />
          </span>
        </div>
        {customer && (customer.totalDebt || 0) > 0 && (
          <div className="pos-payment-row">
            <span className="label" style={{ color: '#e53935' }}>Nợ cũ</span>
            <span className="value" style={{ color: '#e53935', fontWeight: '600' }}>
              {new Intl.NumberFormat('vi-VN').format(customer.totalDebt)}
            </span>
          </div>
        )}
        <div className="pos-payment-row total">
          <span className="label" style={{ fontWeight: '700' }}>Khách cần trả <span style={{ cursor: 'pointer', color: '#999' }} title="Chi tiết">ⓘ</span></span>
          <span className="value" id="pay-total" style={{ fontWeight: '700', fontSize: '18px', color: '#1a73e8' }}>
            {new Intl.NumberFormat('vi-VN').format(total)}
          </span>
        </div>
        
        {total > 0 && (
          <>
            <div className="pos-payment-row">
              <span className="label" style={{ fontWeight: '600' }}>Khách thanh toán</span>
              <span className="value">
                <input 
                  type="text" 
                  value={paidAmountStr === '' ? new Intl.NumberFormat('vi-VN').format(total) : paidAmountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setPaidAmountStr(raw ? new Intl.NumberFormat('vi-VN').format(raw) : '0');
                  }}
                  onFocus={() => {
                    if (paidAmountStr === '') setPaidAmountStr(total.toString());
                  }}
                  style={{ width: '100px', textAlign: 'right', border: 'none', borderBottom: '1px solid #e0e0e0', outline: 'none', fontSize: '14px', fontWeight: '600', padding: '2px 0' }}
                />
              </span>
            </div>
            <div style={{ padding: '8px 0', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}><input type="radio" name="pay-method" value="cash" defaultChecked /> Tiền mặt</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}><input type="radio" name="pay-method" value="transfer" /> Chuyển khoản</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}><input type="radio" name="pay-method" value="card" /> Thẻ</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}><input type="radio" name="pay-method" value="wallet" /> Ví</label>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>⋮</button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 0' }}>
              {[total, Math.ceil(total/1000)*1000+1000, 20000, 50000, 100000, 200000, 500000].filter(a => a > 0).filter((v, i, a) => a.indexOf(v) === i).slice(0, 7).map(a => (
                <button 
                  key={a}
                  onClick={() => setPaidAmountStr(a.toString())}
                  style={{ padding: '6px 12px', border: '1px solid #e0e0e0', background: '#fff', borderRadius: '16px', fontSize: '12px', cursor: 'pointer', color: '#333', whiteSpace: 'nowrap' }}
                >
                  {new Intl.NumberFormat('vi-VN').format(a)}
                </button>
              ))}
            </div>

            <div style={{ padding: '4px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                <input type="radio" name="pay-change-mode" value="change" defaultChecked />
                <span>Tiền thừa trả khách</span>
                <span style={{ marginLeft: 'auto', fontWeight: '600' }}>
                  {changeAmount >= 0 ? new Intl.NumberFormat('vi-VN').format(changeAmount) : 0}
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                <input type="radio" name="pay-change-mode" value="debt" />
                <span>Tính vào công nợ</span>
                <span style={{ marginLeft: 'auto', fontWeight: '600', color: '#e53935' }}>
                  {changeAmount < 0 ? new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount)) : 0}
                </span>
              </label>
            </div>
          </>
        )}
      </div>
      
      <div className="pos-bank-section">
        <div>Bạn chưa có tài khoản ngân hàng</div>
        <a onClick={() => toast.info('Tính năng đang phát triển')}>+ Thêm tài khoản</a>
      </div>
      
      <div style={{ padding: '0 16px 16px' }}>
        <button 
          className="pos-pay-button-right" 
          onClick={handleSubmitOrder}
          style={{ width: '100%', padding: '14px', background: '#3b5fe4', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', letterSpacing: '1px' }}
        >
          THANH TOÁN
        </button>
      </div>
    </div>
  );
}
