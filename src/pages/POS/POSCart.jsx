import { useState, useRef, useEffect } from 'react';
import { usePOS } from './POSContext';
import { Trash2, Edit2, Plus, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import NumericInput from '../../components/ui/NumericInput';

export default function POSCart() {
  const { 
    currentInvoice, 
    updateCartItemQuantity, 
    removeFromCart, 
    updateCurrentInvoice, 
    saleMode,
    addWeighingSubRow,
    updateWeighingSubRow,
    removeWeighingSubRow
  } = usePOS();
  
  const cart = currentInvoice?.cart || [];
  const [editingItemId, setEditingItemId] = useState(null);
  const noteRef = useRef(null);

  useEffect(() => {
    if (noteRef.current) {
      noteRef.current.style.height = 'auto';
      const newHeight = Math.min(120, Math.max(24, noteRef.current.scrollHeight));
      noteRef.current.style.height = `${newHeight}px`;
    }
  }, [currentInvoice?.note]);

  const handleNoteChange = (e) => {
    updateCurrentInvoice({ note: e.target.value });
  };
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

  // Calculate cart totals across all weighings
  const calcSubtotal = () => {
    return cart.reduce((s, i) => {
      const weighings = i.weighings && i.weighings.length > 0 
        ? i.weighings 
        : [{ quantity: i.quantity, price: i.price, discount: i.discount }];
      return s + weighings.reduce((ws, w) => ws + (Number(w.price || 0) - Number(w.discount || 0)) * (parseFloat(w.quantity) || 0), 0);
    }, 0);
  };

  const calcTotalCount = () => {
    const raw = cart.reduce((s, i) => {
      const weighings = i.weighings && i.weighings.length > 0 
        ? i.weighings 
        : [{ quantity: i.quantity }];
      return s + weighings.reduce((ws, w) => ws + (parseFloat(w.quantity) || 0), 0);
    }, 0);
    return Math.round(raw * 1000) / 1000;
  };

  return (
    <div className="pos-cart-panel">
      <div className="pos-cart-list" id="pos-cart-list">
        {cart.length === 0 ? (
          <div className="pos-cart-empty">Chưa có sản phẩm trong đơn hàng</div>
        ) : (
          cart.map((item, idx) => {
            const weighings = item.weighings && item.weighings.length > 0 
              ? item.weighings 
              : [{ id: 1, quantity: item.quantity, price: item.price, discount: item.discount }];
              
            return (
              <div key={item.product.id} className="pos-cart-item-group bg-white rounded-xl border border-blue-300 shadow-sm p-3 mb-3 flex flex-col gap-2 transition-all hover:border-primary">
                {weighings.map((w, wIdx) => {
                  const finalPrice = (w.price || 0) - (w.discount || 0);
                  const qty = parseFloat(w.quantity) || 0;
                  const lineTotal = finalPrice * qty;
                  const isFirstRow = wIdx === 0;

                  return (
                    <div key={w.id || wIdx} className="flex flex-col gap-2">
                      {wIdx > 0 && <hr className="border-t border-dashed border-gray-200 my-1" />}
                      
                      <div className="flex items-center justify-between gap-2 text-xs">
                        {/* Left info: STT, Delete, SKU, Name */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isFirstRow ? (
                            <>
                              <span className="w-6 text-center font-extrabold text-gray-600 text-sm shrink-0">{idx + 1}</span>
                              <button 
                                className="text-gray-400 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer shrink-0"
                                onClick={(e) => { e.stopPropagation(); removeWeighingSubRow(item.product.id, w.id); }}
                                title="Xóa dòng sản phẩm/định lượng"
                              >
                                <Trash2 size={18} />
                              </button>
                              <span className="font-extrabold text-blue-600 hover:underline cursor-pointer shrink-0 text-sm">
                                <a href={`/products?editSku=${item.product.sku}`} target="_blank" rel="noopener noreferrer">
                                  {item.product.sku || ''}
                                </a>
                              </span>
                              <span className="font-extrabold text-gray-900 truncate text-[15px] flex items-center gap-1.5">
                                {item.product.name}
                                <span className="text-xs text-gray-500 font-semibold shrink-0">
                                  (Tồn: {Number(item.product.stock || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })})
                                </span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-6 text-center shrink-0"></span>
                              <button 
                                className="text-gray-400 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer shrink-0"
                                onClick={(e) => { e.stopPropagation(); removeWeighingSubRow(item.product.id, w.id); }}
                                title="Xóa dòng định lượng cân này"
                              >
                                <Trash2 size={18} />
                              </button>
                              <div className="flex-1"></div>
                            </>
                          )}
                        </div>

                        {/* Right controls: Unit, Qty, Price, Subtotal, + Button, Menu */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {isFirstRow && item.product.unit && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-extrabold border border-blue-200 shrink-0">
                              {item.product.unit}
                            </span>
                          )}

                          {/* Qty Controls */}
                          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-xl p-1 shadow-sm">
                            <button 
                              className="w-9 h-9 flex items-center justify-center bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-800 font-black text-base border border-gray-200 cursor-pointer shrink-0 transition-transform active:scale-95"
                              onClick={(e) => { e.stopPropagation(); updateWeighingSubRow(item.product.id, w.id, { quantity: Math.max(0.001, (parseFloat(w.quantity) || 0) - 1) }); }}
                              title="Giảm số lượng"
                            >
                              −
                            </button>
                            <input 
                              type="text" 
                              className="w-16 py-1 text-center font-black text-red-600 bg-transparent border-b-2 border-red-500 outline-none text-base cursor-text"
                              value={w.quantity}
                              onClick={(e) => { e.stopPropagation(); e.target.select(); }}
                              onChange={(e) => updateWeighingSubRow(item.product.id, w.id, { quantity: e.target.value })}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val <= 0) updateWeighingSubRow(item.product.id, w.id, { quantity: 1 });
                              }}
                            />
                            <button 
                              className="w-9 h-9 flex items-center justify-center bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-800 font-black text-base border border-gray-200 cursor-pointer shrink-0 transition-transform active:scale-95"
                              onClick={(e) => { e.stopPropagation(); updateWeighingSubRow(item.product.id, w.id, { quantity: (parseFloat(w.quantity) || 0) + 1 }); }}
                              title="Tăng số lượng"
                            >
                              +
                            </button>
                          </div>

                          {/* Unit Price & Cost Price Warning */}
                          <div 
                            className="flex flex-col items-end shrink-0 cursor-text py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                            onClick={(e) => {
                              const inp = e.currentTarget.querySelector('input');
                              if (inp) {
                                inp.focus();
                                inp.select();
                              }
                            }}
                          >
                            <div className="w-32 text-right">
                              <NumericInput 
                                value={w.price}
                                onChange={(e) => {
                                  const newPrice = Number(e.target.value);
                                  const costPrice = Number(item.product.costPrice || item.product.cost_price || 0);
                                  if (costPrice > 0 && newPrice < costPrice) {
                                    toast.error(`⚠️ Cảnh báo: Giá bán (${new Intl.NumberFormat('vi-VN').format(newPrice)}đ) thấp hơn Giá vốn (${new Intl.NumberFormat('vi-VN').format(costPrice)}đ)!`, { id: `cost-warn-${item.product.id}` });
                                  }
                                  updateWeighingSubRow(item.product.id, w.id, { price: newPrice });
                                }}
                                className={`w-full text-right font-black text-base bg-transparent border-b-2 outline-none focus:border-primary transition-all py-0.5 ${
                                  (Number(item.product.costPrice || item.product.cost_price || 0) > 0 && Number(w.price || 0) < Number(item.product.costPrice || item.product.cost_price || 0))
                                    ? 'border-red-500 text-red-600 font-extrabold bg-red-50/80 px-1 rounded'
                                    : 'border-gray-300 text-gray-900'
                                }`}
                              />
                            </div>
                            {Number(item.product.costPrice || item.product.cost_price || 0) > 0 && Number(w.price || 0) < Number(item.product.costPrice || item.product.cost_price || 0) && (
                              <span className="text-xs font-extrabold text-red-600 bg-red-100/90 border border-red-300 rounded px-1.5 py-0.5 mt-0.5 whitespace-nowrap animate-pulse">
                                ⚠️ &lt; Giá vốn ({new Intl.NumberFormat('vi-VN').format(item.product.costPrice || item.product.cost_price)})
                              </span>
                            )}
                          </div>

                          {/* Subtotal */}
                          <span className="w-28 text-right font-black text-gray-900 text-base">
                            {new Intl.NumberFormat('vi-VN').format(lineTotal)}
                          </span>

                          {/* Plus (+) Button for creating a new weighing sub-row */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); addWeighingSubRow(item.product.id); }}
                            className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-primary hover:bg-blue-50 border border-gray-300 hover:border-primary rounded-lg transition-all cursor-pointer font-black text-lg bg-white shadow-sm shrink-0"
                            title="Tạo thêm định lượng cân khác cho sản phẩm này"
                          >
                            +
                          </button>

                          <button className="p-1 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer shrink-0">
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              {new Intl.NumberFormat('vi-VN').format(Math.round(calcSubtotal() * (currentInvoice?.discount || 0) / 100))}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#333' }}>Khách cần trả</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1a73e8' }}>
              {new Intl.NumberFormat('vi-VN').format(calcSubtotal() - Math.round(calcSubtotal() * (currentInvoice?.discount || 0) / 100))}
            </span>
          </div>
        </div>
      )}

      <div className="pos-cart-footer">
        <div 
          className="pos-note-input"
          onClick={() => noteRef.current?.focus()}
        >
          <span className="text-gray-400 text-sm select-none shrink-0">✏️</span>
          <textarea 
            ref={noteRef}
            placeholder="Ghi chú đơn hàng" 
            value={currentInvoice?.note || ''}
            onChange={handleNoteChange}
            rows={1}
          />
        </div>
        <div className="pos-total-summary">
          <span>Tổng tiền hàng</span>
          <span id="pos-item-count">{calcTotalCount()}</span>
          <span className="pos-total-amount" id="pos-total-display">
            {new Intl.NumberFormat('vi-VN').format(calcSubtotal())}
          </span>
        </div>
      </div>
    </div>
  );
}
