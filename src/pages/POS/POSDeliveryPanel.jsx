import { useState, useEffect } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, MapPin, Package, Edit2, Truck, ChevronDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function POSDeliveryPanel() {
  const { currentInvoice, updateCurrentInvoice, clearCurrentInvoice, setSaleMode } = usePOS();
  const navigate = useNavigate();
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [activeTab, setActiveTab] = useState('self'); // 'kiotviet' or 'self'
  const [codEnabled, setCodEnabled] = useState(true);

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const cart = currentInvoice?.cart || [];
  const customer = currentInvoice?.customer;
  const subtotal = cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0);
  const discountAmount = Math.round(subtotal * (currentInvoice?.discount || 0) / 100);
  const total = subtotal - discountAmount;

  useEffect(() => {
    setReceiverName(customer?.name || '');
    setReceiverPhone(customer?.phone || '');
    setDeliveryAddress(customer?.address || '');
  }, [customer]);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Chưa có sản phẩm trong đơn hàng');
      return;
    }
    if (!receiverName.trim()) {
      toast.error('Vui lòng nhập tên người nhận');
      return;
    }
    if (!receiverPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại người nhận');
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ giao hàng chi tiết');
      return;
    }
    
    const toastId = toast.loading('Đang định vị địa chỉ giao hàng...');
    let resolvedLat = null;
    let resolvedLng = null;
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(deliveryAddress)}&limit=1`, {
        headers: {
          'Accept-Language': 'vi-VN',
          'User-Agent': 'TikoBizPOS/1.0 (contact@tikovia.vn)'
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        resolvedLat = parseFloat(data[0].lat);
        resolvedLng = parseFloat(data[0].lon);
      }
    } catch (err) {
      console.error('Nominatim geocoding error during POS checkout:', err);
    }
    
    try {
      const orderData = {
        customerId: customer?.id || null,
        items: cart.map(i => ({
          productId: Number(i.product.id),
          quantity: Number(i.quantity),
          price: Number(i.price),
          discount: Number(i.discount || 0)
        })),
        paymentMethod: 'CASH', // Delivery COD is CASH
        discount: Number(discountAmount || 0),
        paid: 0, // Unpaid until delivered
        note: currentInvoice.note || '',
        status: 'SHIPPING',
        deliveryAddress: deliveryAddress,
        receiverName: receiverName,
        receiverPhone: receiverPhone,
        driverId: '',
        driverName: 'Chưa gán',
        deliveryStatus: 'ASSIGNED',
        latitude: resolvedLat,
        longitude: resolvedLng
      };

      await api.post('/orders', orderData);
      
      toast.success('Tạo đơn giao hàng thành công!', { id: toastId });
      clearCurrentInvoice();
      navigate('/invoices');
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo đơn giao hàng', { id: toastId });
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
        
        <input 
          type="text" 
          className="pos-input" 
          placeholder="Người nhận" 
          value={receiverName} 
          onChange={(e) => setReceiverName(e.target.value)} 
        />
        <input 
          type="text" 
          className="pos-input" 
          placeholder="Số điện thoại" 
          value={receiverPhone} 
          onChange={(e) => setReceiverPhone(e.target.value)} 
        />
        <input 
          type="text" 
          className="pos-input" 
          placeholder="Địa chỉ chi tiết" 
          value={deliveryAddress} 
          onChange={(e) => setDeliveryAddress(e.target.value)} 
        />
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
