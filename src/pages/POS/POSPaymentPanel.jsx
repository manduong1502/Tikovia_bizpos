import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, CheckCircle, ChevronLeft, Pin, ChevronDown, Plus } from 'lucide-react';
import api, { customerAPI } from '../../services/api';
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
  const [salesChannel, setSalesChannel] = useState('Bán trực tiếp');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  const isEditMode = !!(currentInvoice?._editOrderId);
  
  if (!currentInvoice?.isPaymentMode && !forceShow && saleMode !== 'fast') return null;

  const cart = currentInvoice?.cart || [];
  const customer = currentInvoice?.customer;
  const subtotal = cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0);
  const discountAmount = Math.round(subtotal * (currentInvoice.discount || 0) / 100);
  const total = subtotal - discountAmount;
  
  const paidAmount = paidAmountStr === '' ? 0 : Number(paidAmountStr.replace(/\D/g, ''));
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

      let newOrder;
      if (isEditMode) {
        const res = await api.put(`/orders/${currentInvoice._editOrderId}`, orderData);
        newOrder = res.data?.data || res.data;
      } else {
        const res = await api.post('/orders', orderData);
        newOrder = res.data?.data || res.data;
      }
      
      toast.success(isEditMode 
        ? `Cập nhật hóa đơn thành công! (${currentInvoice._editOrderCode})` 
        : `Tạo đơn hàng thành công! ${isDebt ? `(Ghi nợ: ${new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount))})` : ''}`
      );
      
      const dateStr = new Date().toLocaleString('vi-VN');
      const orderCode = newOrder?.code || newOrder?.order_code || 'HD' + Date.now().toString().slice(-6);
      const oldDebt = customer ? Number(customer.totalDebt || customer.debt || 0) : 0;
      const totalDebt = oldDebt + total;
      const remainingDebt = Math.max(0, totalDebt - paidAmount);

      const invoiceHTML = `
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { 
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            padding: 0 !important; 
            width: 72mm; /* Printable width of 80mm paper is roughly 72mm */
            margin-left: auto; 
            margin-right: auto;
            color: #000;
          }
          .inv-wrap { width: 100%; box-sizing: border-box; padding: 10px 0; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .inv-company { font-size: 14px; font-weight: bold; margin: 0 0 5px 0; text-transform: uppercase; }
          .inv-info { font-size: 11px; margin: 2px 0; line-height: 1.4; }
          .inv-header-text { font-size: 16px; font-weight: bold; text-decoration: underline; margin: 15px 0 5px 0; }
          
          .inv-divider { border-top: 1px dashed #000; margin: 10px 0; }
          
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; border: none; }
          .inv-table th { padding: 4px 2px; border: none; border-bottom: 1px dashed #000; font-weight: bold; background: none; }
          .inv-table td { padding: 4px 2px; border: none; vertical-align: top; background: none; }
          
          .inv-item-row { border-bottom: 1px dashed #ccc; }
          
          .inv-totals { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          .inv-totals td { padding: 3px 0; }
          
          /* Non-print fallback (in case they view it on desktop first) */
          @media screen {
            body { width: 100%; max-width: 400px; padding: 20px !important; margin: 0 auto; background: #f5f5f5; }
            .inv-wrap { background: #fff; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          }
        </style>
        <div class="inv-wrap">
          
          <!-- Header -->
          <div class="text-center">
            <img src="${window.location.origin}/logovuong.png" alt="TIKOVIA" style="height: 50px; object-fit: contain; margin-bottom: 5px; filter: grayscale(100%);" />
            <h2 class="inv-company">CTY TNHH TM&DV TIKOVIA</h2>
            <p class="inv-info">Thửa 382, TBĐ 38, Quang Châu<br/>Hòa Xuân, Cẩm Lệ, Đà Nẵng</p>
            <p class="inv-info">ĐT: 0796.637.194</p>
          </div>

          <div class="text-center">
            <h3 class="inv-header-text">HÓA ĐƠN BÁN HÀNG</h3>
            <p class="inv-info font-bold">${orderCode}</p>
            <p class="inv-info">${dateStr}</p>
          </div>

          <div class="inv-divider"></div>

          <!-- Customer Info -->
          <div>
            <p class="inv-info">KH: <span class="font-bold">${customer ? customer.name : 'Khách lẻ'}</span></p>
            ${customer?.phone ? `<p class="inv-info">SĐT: ${customer.phone}</p>` : ''}
            ${customer?.address ? `<p class="inv-info">ĐC: ${customer.address}</p>` : ''}
          </div>

          <div class="inv-divider"></div>

          <!-- Table -->
          <table class="inv-table">
            <thead>
              <tr>
                <th class="text-left">Tên hàng</th>
                <th class="text-center" style="width: 30px;">SL</th>
                <th class="text-right">Đơn giá</th>
                <th class="text-right">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map(i => {
                const finalPrice = i.price - (i.discount || 0);
                const itemTotal = finalPrice * i.quantity;
                return `
                <tr class="inv-item-row">
                  <td class="text-left">${i.product.name}</td>
                  <td class="text-center">${i.quantity}</td>
                  <td class="text-right">${new Intl.NumberFormat('vi-VN').format(finalPrice)}</td>
                  <td class="text-right font-bold">${new Intl.NumberFormat('vi-VN').format(itemTotal)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <table class="inv-totals">
            <tbody>
              <tr>
                <td>Tổng tiền hàng:</td>
                <td class="text-right font-bold">${new Intl.NumberFormat('vi-VN').format(total)}</td>
              </tr>
              ${oldDebt > 0 ? `
              <tr>
                <td>Nợ cũ:</td>
                <td class="text-right">${new Intl.NumberFormat('vi-VN').format(oldDebt)}</td>
              </tr>
              <tr>
                <td>Tổng thanh toán:</td>
                <td class="text-right font-bold">${new Intl.NumberFormat('vi-VN').format(totalDebt)}</td>
              </tr>
              ` : ''}
              <tr>
                <td>Khách đã trả:</td>
                <td class="text-right font-bold">${new Intl.NumberFormat('vi-VN').format(paidAmount)}</td>
              </tr>
              ${remainingDebt > 0 ? `
              <tr>
                <td>Còn nợ:</td>
                <td class="text-right font-bold">${new Intl.NumberFormat('vi-VN').format(remainingDebt)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="inv-divider"></div>

          ${currentInvoice.note ? `
          <div>
            <p class="inv-info"><span class="font-bold">Ghi chú:</span> ${currentInvoice.note}</p>
          </div>
          <div class="inv-divider"></div>
          ` : ''}

          <!-- Footer -->
          <div class="text-center inv-info" style="margin-top: 15px;">
            <p>Cảm ơn quý khách và hẹn gặp lại!</p>
            <p style="font-size: 9px; margin-top: 10px; color: #555;">In bởi Tiko BizPOS</p>
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
                  value={paidAmountStr}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setPaidAmountStr(raw ? new Intl.NumberFormat('vi-VN').format(raw) : '');
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
                  checked={paidAmount >= total}
                  onChange={() => setPaidAmountStr(total.toString())} 
                />
                <span>Tiền thừa trả khách</span>
                <span style={{ marginLeft: 'auto', fontWeight: '600' }}>
                  {changeAmount >= 0 ? new Intl.NumberFormat('vi-VN').format(changeAmount) : 0}
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                <input 
                  type="radio" 
                  name="pay-change-mode" 
                  value="debt" 
                  checked={paidAmount < total}
                  onChange={() => setPaidAmountStr('0')} 
                />
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
