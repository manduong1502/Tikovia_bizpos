import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, MapPin, Package, Edit2, Truck, ChevronDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function POSDeliveryPanel() {
  const { currentInvoice, updateCurrentInvoice, clearCurrentInvoice, setSaleMode } = usePOS();
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [activeTab, setActiveTab] = useState('self'); // 'kiotviet' or 'self'
  const [codEnabled, setCodEnabled] = useState(true);

  const cart = currentInvoice?.cart || [];
  const customer = currentInvoice?.customer;
  const subtotal = cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0);
  const discountAmount = Math.round(subtotal * (currentInvoice?.discount || 0) / 100);
  const total = subtotal - discountAmount;

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Chưa có sản phẩm trong đơn hàng');
      return;
    }
    
    // In a real app, we would validate customer and delivery info here
    try {
      const orderData = {
        customerId: customer?.id || null,
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.price,
          discount: i.discount
        })),
        paymentMethod: 'COD', // Delivery usually defaults to COD
        discountPercent: currentInvoice.discount || 0,
        discountAmount: discountAmount,
        paidAmount: 0, // Unpaid until delivered
        note: currentInvoice.note,
        status: 'SHIPPING' // Custom status for delivery
      };

      const res = await api.post('/orders', orderData);
      
      toast.success('Tạo đơn giao hàng thành công!');
      clearCurrentInvoice();
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo đơn giao hàng');
    }
  };

  return (
    <div className="pos-delivery-panel">
      <div className="pos-delivery-tabs">
        <button className="pos-del-tab active">Giao hàng <span>1</span></button>
        <button className="pos-del-tab">Nhận tại cửa hàng</button>
        <button className="pos-del-tab">Giao sau</button>
      </div>
      
      <div className="pos-delivery-form">
        {customer ? (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', padding: '12px', background: 'var(--pos-surface-muted)', borderRadius: 'var(--pos-radius-md)' }}>
            <span style={{ color: 'var(--pos-text-muted)', marginRight: '12px' }}><User size={20} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--pos-primary)' }}>{customer.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--pos-text-muted)', marginTop: '2px' }}>{customer.phone || ''}</div>
            </div>
            <button onClick={() => updateCurrentInvoice({ customer: null })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pos-text-muted)', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--pos-danger)'} onMouseOut={e=>e.currentTarget.style.color='var(--pos-text-muted)'}><X size={18} /></button>
          </div>
        ) : (
          <div className="pos-customer-search-input-wrapper" style={{ marginBottom: '16px' }}>
            <Search size={16} color="var(--pos-text-muted)" />
            <input 
              type="text" 
              id="pos-cust-input" 
              placeholder="Tìm khách hàng (F4)" 
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: 'var(--pos-text-main)', background: 'transparent' }}
            />
            <button className="pos-add-customer-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pos-text-muted)' }}><Plus size={18} /></button>
          </div>
        )}
        
        <input type="text" className="pos-input" placeholder="Người nhận" defaultValue={customer?.name || ''} />
        <input type="text" className="pos-input" placeholder="Số điện thoại" defaultValue={customer?.phone || ''} />
        <input type="text" className="pos-input" placeholder="Địa chỉ chi tiết" />
        <select className="pos-select"><option>Tỉnh/Thành phố</option></select>
        <select className="pos-select"><option>Quận/Huyện</option></select>
        <select className="pos-select"><option>Phường/Xã</option></select>

        <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>Đối tác giao hàng</div>
          <select className="pos-select"><option>Chọn đối tác giao hàng</option></select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <input type="text" className="pos-input" placeholder="Phí giao hàng" style={{ flex: 1, marginBottom: 0 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} /> Thu hộ tiền (COD)
            </label>
          </div>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <div className="pos-payment-row">
            <span className="label">Khách thanh toán</span>
            <span className="value">
              <input type="text" value={new Intl.NumberFormat('vi-VN').format(total)} readOnly style={{ width: '100px', textAlign: 'right', border: 'none', borderBottom: '1px solid #e0e0e0', outline: 'none', fontSize: '14px', fontWeight: '600', padding: '2px 0' }} />
            </span>
          </div>
          <div style={{ padding: '8px 0', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
              <input type="radio" name="pay-method-del" value="cash" defaultChecked /> Tiền mặt
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
              <input type="radio" name="pay-method-del" value="transfer" /> Chuyển khoản
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
              <input type="radio" name="pay-method-del" value="card" /> Thẻ
            </label>
          </div>
        </div>
      </div>
      
      <button 
        className="pos-pay-button" 
        onClick={handleSubmit}
        style={{ width: 'calc(100% - 32px)', margin: '16px', padding: '14px', background: '#3b5fe4', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', letterSpacing: '1px' }}
      >
        GIAO HÀNG
      </button>
    </div>
  );
}
