import { usePOS } from './POSContext';
import { Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function POSCart() {
  const { currentInvoice, updateCartItemQuantity, removeFromCart, updateCurrentInvoice } = usePOS();
  
  const cart = currentInvoice?.cart || [];

  const handleQtyChange = (productId, e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      updateCartItemQuantity(productId, val);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Table Header */}
      <div className="flex items-center px-4 py-2 border-b border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-600 shrink-0">
        <div className="w-8 text-center">STT</div>
        <div className="flex-1 px-2">Tên hàng hóa</div>
        <div className="w-20 text-center">Số lượng</div>
        <div className="w-24 text-right">Đơn giá</div>
        <div className="w-24 text-right pr-4">Thành tiền</div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-[13px] flex-col gap-2">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <p>Chưa có sản phẩm trong đơn hàng</p>
          </div>
        ) : (
          <div className="pb-4">
            {cart.map((item, index) => {
              const product = item.product;
              const lineTotal = item.quantity * (item.price - item.discount);
              
              return (
                <div key={product.id} className="group flex items-center px-4 py-3 border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <div className="w-8 text-center text-[13px] text-gray-500 font-medium">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 px-2 min-w-0">
                    <div className="text-[13px] font-medium text-gray-800 truncate" title={product.name}>
                      {product.name}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {product.sku}
                    </div>
                  </div>
                  
                  <div className="w-20 text-center">
                    <input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => handleQtyChange(product.id, e)}
                      className="w-16 h-7 text-center border border-gray-300 rounded text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      min="0.1"
                      step="1"
                    />
                  </div>
                  
                  <div className="w-24 text-right text-[13px] text-gray-700">
                    {new Intl.NumberFormat('vi-VN').format(item.price)}
                  </div>
                  
                  <div className="w-24 text-right pr-2 text-[13px] font-bold text-[#1a73e8]">
                    {new Intl.NumberFormat('vi-VN').format(lineTotal)}
                  </div>

                  <button 
                    onClick={() => removeFromCart(product.id)}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all absolute right-2"
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Area */}
      <div className="flex items-center px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2 text-gray-500 w-1/2">
          <Edit2 size={14} />
          <input 
            type="text" 
            placeholder="Ghi chú đơn hàng" 
            value={currentInvoice?.note || ''}
            onChange={(e) => updateCurrentInvoice({ note: e.target.value })}
            className="flex-1 border-none outline-none text-[13px] text-gray-700 placeholder-gray-400"
          />
        </div>
        
        <div className="flex justify-end items-center w-1/2 gap-4">
          <span className="text-[14px] text-gray-700">Tổng tiền hàng <span className="font-semibold text-gray-900 ml-1">{cart.reduce((s, i) => s + i.quantity, 0)}</span></span>
          <span className="text-[16px] font-bold text-gray-900">
            {new Intl.NumberFormat('vi-VN').format(cart.reduce((s, i) => s + (i.price - i.discount) * i.quantity, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
