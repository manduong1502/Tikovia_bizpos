import { useState, useEffect } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, CheckCircle, ChevronLeft, Pin, ChevronDown, Plus } from 'lucide-react';
import api, { customerAPI, orderAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { printHTML } from '../../utils/exportUtils';
import { useNavigate } from 'react-router-dom';
import CustomerModal from '../Customers/CustomerModal';

export default function POSPaymentPanel({ forceShow = false }) {
  const { currentInvoice, updateCurrentInvoice, togglePaymentMode, clearCurrentInvoice, saleMode, removeTab, activeTabId } = usePOS();
  const navigate = useNavigate();
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [isPaidAmountFocused, setIsPaidAmountFocused] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [overpayMode, setOverpayMode] = useState('change');
  
  const isEditMode = !!(currentInvoice?._editOrderId);
  
  const customerRef = currentInvoice?.customer;
  useEffect(() => {
    if (customerRef && (customerRef.totalDebt || customerRef.debt || 0) > 0) {
      setOverpayMode('debt');
    } else {
      setOverpayMode('change');
    }
  }, [customerRef]);
  
  if (!currentInvoice?.isPaymentMode && !forceShow && saleMode !== 'fast') return null;

  const cart = currentInvoice?.cart || [];
  const customer = currentInvoice?.customer;
  const subtotal = cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0);
  const discountAmount = Math.round(subtotal * (currentInvoice.discount || 0) / 100);
  const total = subtotal - discountAmount;
  
  const paidAmount = paidAmountStr === '' ? 0 : Number(paidAmountStr.replace(/\D/g, ''));
  const changeAmount = paidAmount - total;
  const isDebt = changeAmount < 0;
  const oldDebt = customer ? Number(customer.totalDebt || customer.debt || 0) : 0;

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

    // If edit mode, show confirmation dialog first
    if (isEditMode && !showUpdateModal) {
      setShowUpdateModal(true);
      return;
    }

    if (isDebt && !customer) {
      toast.error('Vui lòng chọn khách hàng để ghi nợ');
      return;
    }

    try {
      const activeOverpayMode = paidAmount < total ? 'debt' : overpayMode;
      let finalPaid = total;
      if (paidAmount < total) {
        finalPaid = paidAmount;
      } else if (activeOverpayMode === 'debt') {
        finalPaid = paidAmount;
      } else {
        finalPaid = total;
      }

      const isDeliveryMode = saleMode === 'delivery' || finalPaid < total;

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
        paid: finalPaid,
        note: currentInvoice.note || null,
        status: isDeliveryMode ? (finalPaid >= total ? 'COMPLETED' : 'SHIPPING') : 'COMPLETED',
        deliveryAddress: isDeliveryMode ? (currentInvoice.deliveryAddress || customer?.address || '') : null,
        receiverName: isDeliveryMode ? (currentInvoice.receiverName || customer?.name || '') : null,
        receiverPhone: isDeliveryMode ? (currentInvoice.receiverPhone || customer?.phone || '') : null,
        driverId: isDeliveryMode ? (currentInvoice.driverId || '') : null,
        driverName: isDeliveryMode ? (currentInvoice.driverName || 'Chưa gán') : null,
        deliveryStatus: isDeliveryMode ? (currentInvoice.deliveryStatus || 'ASSIGNED') : null,
        latitude: isDeliveryMode ? (customer?.latitude ? Number(customer.latitude) : null) : null,
        longitude: isDeliveryMode ? (customer?.longitude ? Number(customer.longitude) : null) : null,
      };
      
      console.log('Sending orderData to API:', JSON.stringify(orderData, null, 2));

      let newOrder;
      if (isEditMode) {
        newOrder = await orderAPI.update(currentInvoice._editOrderId, orderData);
      } else {
        newOrder = await orderAPI.create(orderData);
      }
      
      toast.success(isEditMode 
        ? `Cập nhật hóa đơn thành công! (${currentInvoice._editOrderCode})` 
        : customer 
          ? 'Tạo đơn giao hàng thành công!' 
          : `Tạo đơn hàng thành công! ${isDebt ? `(Ghi nợ: ${new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount))})` : ''}`
      );
      
      const dateStr = new Date().toLocaleString('vi-VN');
      const orderCode = newOrder?.code || newOrder?.order_code || 'HD' + Date.now().toString().slice(-6);
      const oldDebt = customer ? Number(customer.totalDebt || customer.debt || 0) : 0;
      const totalDebt = oldDebt + total;
      const remainingDebt = totalDebt - finalPaid;
      const actualChange = !customer && paidAmount > total ? paidAmount - total : 0;

      const invoiceHTML = `
        <style>
          .inv-wrap { width: 70mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; line-height: 1.4; padding: 10px 2mm 0 2mm; box-sizing: border-box; }
          .inv-logo-container { text-align: center; margin-bottom: 5px; }
          .inv-logo-img { width: 220px; max-width: 100%; object-fit: contain; }
          .inv-company { text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; }
          .inv-info { text-align: center; font-size: 12px; margin: 2px 0; }
          .inv-stk { text-align: center; font-size: 12px; font-weight: bold; margin: 2px 0; }
          .inv-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0 2px; }
          .inv-code-date { text-align: center; font-size: 11px; margin-bottom: 10px; color: #333; }
          .inv-customer-info { font-size: 12px; margin-bottom: 8px; line-height: 1.5; }
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
          .inv-table th, .inv-table td { border: 1px solid #000 !important; padding: 4px 2px; }
          .inv-table th { font-weight: bold; text-align: center; }
          .inv-summary { width: 100%; font-size: 12px; margin-bottom: 15px; border-collapse: collapse; }
          .inv-summary td { padding: 3px 0; border: none !important; }
          .inv-summary .label { text-align: right; padding-right: 15px; }
          .inv-summary .value { text-align: right; width: 90px; }
          .inv-footer { font-size: 12px; line-height: 1.5; font-weight: bold; margin-bottom: 15px; }
          .inv-thanks { text-align: center; font-size: 12px; font-style: italic; margin-top: 20px; }
          @media print {
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
            .inv-wrap { padding: 5mm 4mm 0 4mm; width: 70mm; margin: 0 auto; }
          }
        </style>
        <div class="inv-wrap">
          <div class="inv-logo-container">
            <img src="${window.location.origin}/logovuong.png" class="inv-logo-img" alt="TIKOVIA" />
          </div>
          <div class="inv-company">CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ TIKOVIA</div>
          <div class="inv-info" style="margin-top: 10px;">ĐC: 82 Trần Tử Bình, Hòa Châu, Hòa Vang, ĐN</div>
          <div class="inv-info">Điện Thoại: 0796.637.194</div>
          <div class="inv-stk">STK : 8282688686</div>
          <div class="inv-stk">Ngân hàng: TMCP Quân Đội (MB<br/>Bank)</div>
 
          <div class="inv-title">HÓA ĐƠN BÁN HÀNG</div>
          <div class="inv-code-date">${orderCode} - ${dateStr}</div>
 
          <div class="inv-customer-info">
            <div>Khách hàng: ${customer ? customer.name : 'Khách lẻ'}</div>
            <div>SĐT: ${customer?.phone || ''}</div>
            <div>ĐC: ${customer?.address || ''}</div>
          </div>
 
          <table class="inv-table">
            <thead>
              <tr>
                <th style="text-align: left;">Mặt hàng</th>
                <th style="width: 20px;">SL</th>
                <th style="width: 25px;">ĐVT</th>
                <th style="text-align: right;">Giá</th>
                <th style="text-align: right;">CK</th>
                <th style="text-align: right;">Thành<br/>tiền</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map(i => {
                const itemTotal = (i.price - (i.discount || 0)) * i.quantity;
                return `
                <tr>
                  <td>${i.product.name} ${i.product.unit ? `(${i.product.unit})` : ''}</td>
                  <td style="text-align: center;">${i.quantity}</td>
                  <td style="text-align: center;">${i.product.unit || 'cái'}</td>
                  <td style="text-align: right;">${new Intl.NumberFormat('vi-VN').format(i.price)}</td>
                  <td style="text-align: right;">${new Intl.NumberFormat('vi-VN').format(i.discount || 0)}</td>
                  <td style="text-align: right;">${new Intl.NumberFormat('vi-VN').format(itemTotal)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
 
          <table class="inv-summary">
            <tr>
              <td class="label">Tổng đơn hàng:</td>
              <td class="value">${new Intl.NumberFormat('vi-VN').format(total)}</td>
            </tr>
            <tr>
              <td class="label">Nợ cũ:</td>
              <td class="value">${new Intl.NumberFormat('vi-VN').format(oldDebt)}</td>
            </tr>
            <tr>
              <td class="label">Tổng Nợ:</td>
              <td class="value">${new Intl.NumberFormat('vi-VN').format(totalDebt)}</td>
            </tr>
            <tr>
              <td class="label">Khách đã trả:</td>
              <td class="value">${new Intl.NumberFormat('vi-VN').format(paidAmount)}</td>
            </tr>
            ${actualChange > 0 ? `
            <tr>
              <td class="label">Tiền thừa trả khách:</td>
              <td class="value">${new Intl.NumberFormat('vi-VN').format(actualChange)}</td>
            </tr>
            ` : ''}
            <tr>
              <td class="label">Dư nợ sau khi trả:</td>
              <td class="value">${new Intl.NumberFormat('vi-VN').format(remainingDebt)}</td>
            </tr>
          </table>
 
          <div class="inv-footer" style="text-align: right; font-size: 12px; font-weight: bold; margin-top: 10px;">
            <div style="margin-bottom: 5px;">Chữ ký Khách Hàng :</div>
            <div style="white-space: pre-wrap;">Ghi chú: ${currentInvoice.note || ''}</div>
          </div>
 
          <div class="inv-thanks">
            Cảm ơn và hẹn gặp lại!
          </div>
        </div>
      `;
      printHTML(invoiceHTML, 'In Hóa Đơn');
      
      // Clear and return
      clearCurrentInvoice();
      togglePaymentMode(false);
      if (isEditMode) {
        removeTab(activeTabId);
      }
      setShowUpdateModal(false);
      navigate('/invoices');
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo đơn hàng');
    }
  };

  const user = { fullName: 'Admin' };

  return (
    <div className="pos-payment-panel">
      {/* Back button for non-fast modes */}
      {saleMode !== 'fast' && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--pos-border-light)', backgroundColor: '#fff' }}>
          <button 
            onClick={() => togglePaymentMode(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: 'var(--pos-primary)', cursor: 'pointer', fontWeight: '500', fontSize: '14px', padding: 0 }}
          >
            <ChevronLeft size={18} /> Quay lại
          </button>
        </div>
      )}
      

      {customer ? (
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--pos-border-light)' }}>
          <span style={{ color: 'var(--pos-text-muted)', marginRight: '12px' }}><User size={20} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--pos-primary)' }}>{customer.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              {(customer.totalDebt || 0) > 0 && <span style={{ fontSize: '12px', color: 'var(--pos-danger)', fontWeight: '500' }}>Nợ: {new Intl.NumberFormat('vi-VN').format(customer.totalDebt)}</span>}
              <button 
                type="button" 
                onClick={() => setShowCustomerModal(true)} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  border: 'none', 
                  background: 'none', 
                  padding: 0, 
                  cursor: 'pointer', 
                  fontSize: '11px', 
                  fontWeight: '700',
                  color: (!customer.latitude || !customer.longitude) ? '#ef4444' : '#3b5fe4' 
                }}
              >
                <Pin size={12} className={(!customer.latitude || !customer.longitude) ? 'animate-bounce' : ''} />
                {(!customer.latitude || !customer.longitude) ? 'Cập nhật vị trí' : 'Sửa / Xem vị trí'}
              </button>
            </div>
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
          <button className="pos-add-customer-btn" title="Thêm khách hàng" onClick={() => setShowCustomerModal(true)}><Plus size={18} /></button>
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
        {customer && (
          <div className="pos-payment-row">
            <span className="label" style={{ color: '#666' }}>Nợ cũ</span>
            <span className="value" style={{ color: (customer.totalDebt || 0) > 0 ? '#e53935' : '#2e7d32', fontWeight: '600' }}>
              {new Intl.NumberFormat('vi-VN').format(customer.totalDebt || 0)}
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
                  value={
                    isPaidAmountFocused 
                      ? paidAmountStr.replace(/\D/g, '') 
                      : (paidAmountStr ? new Intl.NumberFormat('vi-VN').format(Number(paidAmountStr.replace(/\D/g, ''))) : '')
                  }
                  placeholder="0"
                  onFocus={() => setIsPaidAmountFocused(true)}
                  onBlur={() => setIsPaidAmountFocused(false)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setPaidAmountStr(raw);
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
                <input 
                  type="radio" 
                  name="pay-change-mode" 
                  value="change" 
                  checked={paidAmount >= total && overpayMode === 'change'}
                  onChange={() => {
                    setOverpayMode('change');
                  }} 
                />
                <span>Tiền thừa trả khách</span>
                <span style={{ marginLeft: 'auto', fontWeight: '600' }}>
                  {new Intl.NumberFormat('vi-VN').format(
                    paidAmount >= total 
                      ? (overpayMode === 'change' ? (paidAmount - total) : 0)
                      : 0
                  )}
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                <input 
                  type="radio" 
                  name="pay-change-mode" 
                  value="debt" 
                  checked={paidAmount < total || overpayMode === 'debt'}
                  onChange={() => {
                    setOverpayMode('debt');
                  }} 
                />
                <span>Tính vào công nợ</span>
                <span style={{ marginLeft: 'auto', fontWeight: '600', color: (oldDebt + total - paidAmount) > 0 ? '#e53935' : '#2e7d32' }}>
                  {new Intl.NumberFormat('vi-VN').format(
                    paidAmount < total 
                      ? (oldDebt + total - paidAmount) 
                      : (overpayMode === 'debt' 
                          ? (oldDebt + total - paidAmount) 
                          : oldDebt)
                  )}
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
          {isEditMode ? 'CẬP NHẬT HÓA ĐƠN' : 'THANH TOÁN'}
        </button>
      </div>

      {/* Update Confirmation Modal */}
      {showUpdateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 32px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: '#ef4444', fontSize: '18px', fontWeight: '700', margin: '0 0 16px' }}>Cập nhật hóa đơn</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#333' }}>
              <p style={{ margin: '0 0 8px' }}>Khi thay đổi thông tin trên hóa đơn, hệ thống sẽ:</p>
              <p style={{ margin: '0 0 4px' }}>- Hủy hóa đơn cũ và tạo hóa đơn mới</p>
              <p style={{ margin: '0 0 4px' }}>- Tất cả các phiếu thanh toán của hóa đơn cũ sẽ được gắn với hóa đơn mới</p>
              <p style={{ margin: '0 0 12px' }}>- Nếu bạn thay đổi số lượng hàng hóa, cần đảm bảo tồn kho của cửa hàng vẫn đáp ứng đủ, hệ thống sẽ không kiểm tra lại.</p>
              <p style={{ margin: '0', fontWeight: '500' }}>Bạn có muốn tiếp tục?</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => { setShowUpdateModal(false); handleSubmitOrder(); }} style={{ padding: '10px 32px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Đồng ý</button>
              <button onClick={() => setShowUpdateModal(false)} style={{ padding: '10px 32px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Bỏ qua</button>
            </div>
          </div>
        </div>
      )}
      
      {showCustomerModal && (
        <CustomerModal 
          open={showCustomerModal} 
          customer={customer}
          onClose={() => setShowCustomerModal(false)}
          onSaved={(newCustomer) => {
            if (newCustomer) {
              updateCurrentInvoice({ customer: newCustomer });
            }
          }}
        />
      )}
    </div>
  );
}
