import { useState } from 'react';
import { usePOS } from './POSContext';
import { Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import NumericInput from '../../components/ui/NumericInput';

export default function POSCart() {
  const { currentInvoice, updateCartItemQuantity, removeFromCart, updateCurrentInvoice, saleMode } = usePOS();
  const cart = currentInvoice?.cart || [];
  const [editingItemId, setEditingItemId] = useState(null);
  const [popoverUnitPrice, setPopoverUnitPrice] = useState(0);
  const [popoverDiscount, setPopoverDiscount] = useState(0);
  const [popoverDiscountType, setPopoverDiscountType] = useState('VND'); // 'VND' | '%'

  const handleSavePrice = (productId) => {
    let finalDiscountVal = Number(popoverDiscount || 0);
    if (popoverDiscountType === '%') {
      finalDiscountVal = Math.round(Number(popoverUnitPrice || 0) * Number(popoverDiscount || 0) / 100);
    }
    
    updateCurrentInvoice({
      cart: cart.map(i => 
        i.product.id === productId 
          ? { ...i, price: Number(popoverUnitPrice || 0), discount: finalDiscountVal } 
          : i
      )
    });
    setEditingItemId(null);
    toast.success('Thương lượng giá hữu nghị thành công!');
  };

  const handleQtyChange = (productId, e) => {
    // handled inline now
  };

  return (
    <div className="pos-cart-panel">
      <div className="pos-cart-list" id="pos-cart-list">
        {cart.length === 0 ? (
          <div className="pos-cart-empty">Chưa có sản phẩm trong đơn hàng</div>
        ) : (
          cart.map((item, idx) => {
            const finalPrice = item.price - item.discount;
            const qty = parseFloat(item.quantity) || 0;
            const total = finalPrice * qty;
            
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
                    {item.product.name} {item.product.unit ? `(${item.product.unit})` : ''}
                    <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px', fontWeight: 'normal' }}>
                      (Tồn: {Number(item.product.stock || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })})
                    </span>
                  </span>
                  
                  <div className="pos-cart-item-actions">
                    {item.product.unit && (
                      <span className="pos-cart-item-unit-badge">{item.product.unit}</span>
                    )}
                    <div className="pos-qty-control">
                      <button 
                        className="pos-qty-btn"
                        onClick={(e) => { e.stopPropagation(); updateCartItemQuantity(item.product.id, (parseFloat(item.quantity) || 0) - 1); }}
                      >
                        −
                      </button>
                      <input 
                        type="text" 
                        className="pos-cart-item-qty"
                        value={item.quantity}
                        onClick={(e) => { e.stopPropagation(); e.target.select(); }}
                        onChange={(e) => {
                          updateCartItemQuantity(item.product.id, e.target.value);
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val <= 0) {
                            updateCartItemQuantity(item.product.id, 1);
                          } else {
                            updateCartItemQuantity(item.product.id, val);
                          }
                        }}
                      />
                      <button 
                        className="pos-qty-btn"
                        onClick={(e) => { e.stopPropagation(); updateCartItemQuantity(item.product.id, (parseFloat(item.quantity) || 0) + 1); }}
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="relative flex items-center justify-end flex-1">
                      <span 
                        className="pos-cart-item-price cursor-pointer hover:text-primary hover:underline transition-colors flex items-center justify-end gap-1 font-bold text-gray-700 select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingItemId === item.product.id) {
                            setEditingItemId(null);
                          } else {
                            setEditingItemId(item.product.id);
                            setPopoverUnitPrice(item.price);
                            setPopoverDiscount(item.discount || 0);
                            setPopoverDiscountType('VND');
                          }
                        }}
                        title="Click để thương lượng giá bán hữu nghị"
                      >
                        {new Intl.NumberFormat('vi-VN').format(finalPrice)}
                        <Edit2 size={12} className="opacity-40 hover:opacity-100" />
                      </span>

                      {editingItemId === item.product.id && (() => {
                        const costPrice = Number(item.product.costPrice || item.product.cost_price || 3000);
                        const computedDiscount = popoverDiscountType === 'VND' 
                          ? Number(popoverDiscount || 0)
                          : Math.round(Number(popoverUnitPrice || 0) * Number(popoverDiscount || 0) / 100);
                        const computedFinalPrice = Math.max(0, Number(popoverUnitPrice || 0) - computedDiscount);
                        const isLowerThanCost = computedFinalPrice < costPrice;

                        return (
                          <div 
                            className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50 flex flex-col gap-3.5 text-xs text-gray-700 animate-fade-in"
                            onClick={e => e.stopPropagation()}
                            style={{ minWidth: '280px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                          >
                            {/* Alert header if price is lower than cost */}
                            {isLowerThanCost && (
                              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-2.5 rounded-xl flex items-start gap-1.5 text-[11px] leading-relaxed font-semibold">
                                <span className="text-amber-500 text-sm">⚠️</span>
                                <div>
                                  Giá bán đang thấp hơn giá vốn ({new Intl.NumberFormat('vi-VN').format(costPrice)})
                                </div>
                              </div>
                            )}

                            {/* Đơn giá row */}
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-600 text-[11px]">Đơn giá</span>
                              <NumericInput 
                                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                                value={popoverUnitPrice}
                                onChange={e => setPopoverUnitPrice(Number(e.target.value))}
                                placeholder="0"
                              />
                            </div>

                            {/* Giảm giá row */}
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-600 text-[11px]">Giảm giá</span>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  {popoverDiscountType === 'VND' ? (
                                    <NumericInput 
                                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                                      value={popoverDiscount}
                                      onChange={e => setPopoverDiscount(Number(e.target.value))}
                                      placeholder="0"
                                    />
                                  ) : (
                                    <input 
                                      type="number"
                                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                                      value={popoverDiscount}
                                      onChange={e => setPopoverDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                      placeholder="0"
                                      min="0"
                                      max="100"
                                    />
                                  )}
                                </div>
                                <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-0.5">
                                  <button 
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${popoverDiscountType === 'VND' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                    onClick={() => {
                                      setPopoverDiscountType('VND');
                                      setPopoverDiscount(0);
                                    }}
                                  >
                                    VND
                                  </button>
                                  <button 
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${popoverDiscountType === '%' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                    onClick={() => {
                                      setPopoverDiscountType('%');
                                      setPopoverDiscount(0);
                                    }}
                                  >
                                    %
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Giá bán row */}
                            <div className="flex justify-between items-center border-t border-gray-100 pt-2.5 mt-0.5">
                              <span className="font-bold text-gray-600 text-[11px]">Giá bán</span>
                              <span className="font-extrabold text-xs text-gray-800">
                                {new Intl.NumberFormat('vi-VN').format(computedFinalPrice)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end border-t border-gray-100 pt-2.5">
                              <button 
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-bold cursor-pointer text-[10px]"
                                onClick={() => setEditingItemId(null)}
                              >
                                Hủy
                              </button>
                              <button 
                                className="px-3.5 py-1 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-bold shadow-sm cursor-pointer text-[10px]"
                                onClick={() => handleSavePrice(item.product.id)}
                              >
                                Áp dụng
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
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
              {new Intl.NumberFormat('vi-VN').format(cart.reduce((s, i) => s + i.discount * (parseFloat(i.quantity) || 0), 0) + Math.round(cart.reduce((s, i) => s + i.price * (parseFloat(i.quantity) || 0), 0) * (currentInvoice?.discount || 0) / 100))}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#333' }}>Khách cần trả</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1a73e8' }}>
              {new Intl.NumberFormat('vi-VN').format(cart.reduce((s, i) => s + (i.price - i.discount) * (parseFloat(i.quantity) || 0), 0) - Math.round(cart.reduce((s, i) => s + i.price * (parseFloat(i.quantity) || 0), 0) * (currentInvoice?.discount || 0) / 100))}
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
          <span id="pos-item-count">{cart.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0)}</span>
          <span className="pos-total-amount" id="pos-total-display">
            {new Intl.NumberFormat('vi-VN').format(cart.reduce((s, i) => s + (i.price - i.discount) * (parseFloat(i.quantity) || 0), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
