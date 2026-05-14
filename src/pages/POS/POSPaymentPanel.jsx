import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, CheckCircle, ChevronLeft, Pin, ChevronDown, Plus } from 'lucide-react';
import api, { customerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { printHTML } from '../../utils/exportUtils';

export default function POSPaymentPanel({ forceShow = false }) {
  const { currentInvoice, updateCurrentInvoice, togglePaymentMode, clearCurrentInvoice, saleMode } = usePOS();
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [salesChannel, setSalesChannel] = useState('Bán trực tiếp');
  
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
      const data = await customerAPI.getAll({ search: val, limit: 10 });
      setCustomerSuggestions(Array.isArray(data) ? data : (data.data || []));
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
        customerId: customer?.id ? Number(customer.id) : null,
        items: cart.map(i => ({
          productId: Number(i.product.id),
          quantity: Number(i.quantity),
          price: Number(i.price),
          discount: Number(i.discount || 0)
        })),
        paymentMethod: 'CASH',
        discount: Number(discountAmount || 0),
        paid: Number(isDebt ? paidAmount : total),
        note: currentInvoice.note || null
      };

      const res = await api.post('/orders', orderData);
      const newOrder = res.data?.data || res.data;
      
      toast.success(`Tạo đơn hàng thành công! ${isDebt ? `(Ghi nợ: ${new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount))})` : ''}`);
      
      const invoiceHTML = `
        <div style="width: 300px; margin: 0 auto; text-align: center; font-family: monospace;">
          <h2 style="margin: 5px 0;">BIZPOS CỬA HÀNG</h2>
          <p style="margin: 5px 0;">123 Đường ABC, Quận X, TP Y</p>
          <p style="margin: 5px 0;">SĐT: 0909.123.456</p>
          <hr style="border-top: 1px dashed #000; margin: 10px 0;" />
          <h3 style="margin: 10px 0;">HÓA ĐƠN BÁN HÀNG</h3>
          <p style="text-align: left; margin: 5px 0;">Ngày: ${new Date().toLocaleString('vi-VN')}</p>
          <p style="text-align: left; margin: 5px 0;">Kênh: ${salesChannel}</p>
          ${customer ? `<p style="text-align: left; margin: 5px 0;">Khách hàng: ${customer.name}</p>` : ''}
          <hr style="border-top: 1px dashed #000; margin: 10px 0;" />
          <table style="width: 100%; text-align: left; border: none; font-size: 12px;">
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th>Tên SP</th>
                <th style="text-align: right;">SL</th>
                <th style="text-align: right;">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map(i => `
                <tr>
                  <td style="padding-top: 5px;">${i.product.name}</td>
                  <td style="text-align: right; padding-top: 5px;">${i.quantity}</td>
                  <td style="text-align: right; padding-top: 5px;">${new Intl.NumberFormat('vi-VN').format((i.price - i.discount) * i.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <hr style="border-top: 1px dashed #000; margin: 10px 0;" />
          <div style="font-size: 12px;">
            <p style="display: flex; justify-content: space-between; margin: 5px 0;"><span>Tổng tiền:</span> <strong>${new Intl.NumberFormat('vi-VN').format(subtotal)}</strong></p>
            <p style="display: flex; justify-content: space-between; margin: 5px 0;"><span>Giảm giá:</span> <span>${new Intl.NumberFormat('vi-VN').format(discountAmount)}</span></p>
            <p style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 16px;"><span>Khách cần trả:</span> <strong>${new Intl.NumberFormat('vi-VN').format(total)}</strong></p>
            <p style="display: flex; justify-content: space-between; margin: 5px 0;"><span>Khách thanh toán:</span> <span>${new Intl.NumberFormat('vi-VN').format(paidAmount)}</span></p>
            <p style="display: flex; justify-content: space-between; margin: 5px 0;"><span>Tiền thừa:</span> <span>${new Intl.NumberFormat('vi-VN').format(Math.max(0, changeAmount))}</span></p>
            ${isDebt ? `<p style="display: flex; justify-content: space-between; margin: 5px 0; color: red;"><span>Ghi nợ:</span> <span>${new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount))}</span></p>` : ''}
          </div>
          <hr style="border-top: 1px dashed #000; margin: 10px 0;" />
          <p style="margin: 10px 0; font-size: 12px;">Cảm ơn quý khách và hẹn gặp lại!</p>
        </div>
      `;
      printHTML(invoiceHTML, 'In Hóa Đơn');
      
      // Clear and return
      clearCurrentInvoice();
      togglePaymentMode(false);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo đơn hàng');
    }
  };

  const user = { fullName: 'Admin' };

  return (
    <div className="pos-payment-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--pos-border-light)', backgroundColor: '#f8f9fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} className="text-gray-500" />
          <select style={{ border: 'none', background: 'transparent', fontWeight: '600', fontSize: '13px', outline: 'none', cursor: 'pointer', color: '#333' }}>
            <option>{user.fullName}</option>
            <option>Nhân viên bán hàng 1</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select value={salesChannel} onChange={(e) => setSalesChannel(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '4px 8px', fontSize: '13px', outline: 'none', cursor: 'pointer', background: '#fff' }}>
            <option value="Bán trực tiếp">Bán trực tiếp</option>
            <option value="Facebook">Facebook</option>
            <option value="Shopee">Shopee</option>
            <option value="Zalo">Zalo</option>
          </select>
        </div>
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
        <div className="pos-customer-search" style={{ position: 'relative' }}>
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
