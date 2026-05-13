import { usePOS } from './POSContext';
import { Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function POSCart() {
  const { currentInvoice, updateCartItemQuantity, removeFromCart, updateCurrentInvoice, saleMode } = usePOS();
  
  const cart = currentInvoice?.cart || [];

  const handleQtyChange = (productId, e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      updateCartItemQuantity(productId, val);
    }
  };

  return (
    <div className="pos-cart-panel">
      <div className="pos-cart-list" id="pos-cart-list">
        {cart.length === 0 ? (
          <div className="pos-cart-empty">Chưa có sản phẩm trong đơn hàng</div>
        ) : (
          cart.map((item, idx) => {
            const finalPrice = item.price - item.discount;
            const total = finalPrice * item.quantity;
            
            return (
              <div key={item.product.id} className="pos-cart-item">
                <div className="pos-cart-item-top">
                  <span className="pos-cart-item-stt">{idx + 1}</span>
                  
                  <button 
                    className="pos-cart-item-delete"
                    onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id); }}
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                  
                  <span className="pos-cart-item-sku">{item.product.sku || ''}</span>
                  
                  <span className="pos-cart-item-name">
                    {item.product.name}
                  </span>
                  
                  <div className="pos-cart-item-actions">
                    <div className="pos-qty-control">
                      <button 
                        className="pos-qty-btn"
                        onClick={(e) => { e.stopPropagation(); updateCartItemQuantity(item.product.id, -1); }}
                      >
                        −
                      </button>
                      <input 
                        type="text" 
                        className="pos-cart-item-qty"
                        value={item.quantity}
                        onClick={(e) => { e.stopPropagation(); e.target.select(); }}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const diff = val - item.quantity;
                            updateCartItemQuantity(item.product.id, diff);
                          }
                        }}
                      />
                      <button 
                        className="pos-qty-btn"
                        onClick={(e) => { e.stopPropagation(); updateCartItemQuantity(item.product.id, 1); }}
                      >
                        +
                      </button>
                    </div>
                    
                    <span className="pos-cart-item-price">
                      {new Intl.NumberFormat('vi-VN').format(finalPrice)}
                    </span>
                    
                    <span className="pos-cart-item-total">
                      {new Intl.NumberFormat('vi-VN').format(total)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {saleMode === 'delivery' && (
        <div style={{ background: '#fff', padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>Giảm giá</span>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>
              {new Intl.NumberFormat('vi-VN').format(cart.reduce((s, i) => s + i.discount * i.quantity, 0) + Math.round(cart.reduce((s, i) => s + i.price * i.quantity, 0) * (currentInvoice?.discount || 0) / 100))}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#333' }}>Khách cần trả</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1a73e8' }}>
              {new Intl.NumberFormat('vi-VN').format(cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0) - Math.round(cart.reduce((s, i) => s + i.price * i.quantity, 0) * (currentInvoice?.discount || 0) / 100))}
            </span>
          </div>
        </div>
      )}

      <div className="pos-cart-footer">
        <div className="pos-note-input">
          <span>✏️</span>
          <input 
            type="text" 
            placeholder="Ghi chú đơn hàng" 
            value={currentInvoice?.note || ''}
            onChange={(e) => updateCurrentInvoice({ note: e.target.value })}
          />
        </div>
        <div className="pos-total-summary">
          <span>Tổng tiền hàng</span>
          <span id="pos-item-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          <span className="pos-total-amount" id="pos-total-display">
            {new Intl.NumberFormat('vi-VN').format(cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
