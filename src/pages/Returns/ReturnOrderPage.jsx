import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, returnAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ChevronLeft, Search, Trash2, Package } from 'lucide-react';
import Button from '../../components/ui/Button';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function ReturnOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // returnItems[itemId] = quantity to return
  const [returnItems, setReturnItems] = useState({});
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await orderAPI.getById(orderId);
        setOrder(data);
        const initialReturnItems = {};
        if (data.items) {
          data.items.forEach(it => {
            initialReturnItems[it.id] = 0; // default to 0 return
          });
        }
        setReturnItems(initialReturnItems);
      } catch (err) {
        toast.error('Không tìm thấy đơn hàng');
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId, navigate]);

  const handleQtyChange = (itemId, maxQty, val) => {
    const num = Number(val);
    if (isNaN(num)) return;
    if (num < 0) return;
    if (num > maxQty) return;
    
    setReturnItems(prev => ({ ...prev, [itemId]: num }));
  };

  const handleSetMax = (itemId, maxQty) => {
    setReturnItems(prev => ({ ...prev, [itemId]: maxQty }));
  };

  const handleSubmit = async () => {
    const itemsToReturn = [];
    if (!order?.items) return;

    for (const it of order.items) {
      const returnQty = returnItems[it.id] || 0;
      if (returnQty > 0) {
        itemsToReturn.push({
          productId: it.productId,
          quantity: returnQty,
          price: it.price - (it.discount || 0) / it.quantity // adjust for item discount if any
        });
      }
    }

    if (itemsToReturn.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để trả hàng');
      return;
    }

    try {
      const data = {
        orderId: order.id,
        customerId: order.customerId,
        reason: reason,
        items: itemsToReturn
      };
      
      const res = await returnAPI.create(data);
      toast.success('Lập phiếu trả hàng thành công');
      // Go back to the invoice page
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi trả hàng');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải thông tin hóa đơn...</div>;
  }

  if (!order) return null;

  let totalReturnAmount = 0;
  order.items?.forEach(it => {
    const returnQty = returnItems[it.id] || 0;
    const finalPrice = it.price - ((it.discount || 0) / it.quantity);
    totalReturnAmount += returnQty * finalPrice;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold">Trả hàng hóa đơn:</span>
            <span className="font-medium bg-white/20 px-2 py-0.5 rounded text-sm">{order.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>Khách hàng: <strong className="ml-1">{order.customer?.name || 'Khách lẻ'}</strong></span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Items list */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm hàng trong đơn..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-primary shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="space-y-3">
              {order.items?.map(it => {
                const maxQty = it.quantity;
                const returnQty = returnItems[it.id] || 0;
                return (
                  <div key={it.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 text-sm mb-1">{it.product.name}</div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                          <span>Mã: <span className="text-gray-700">{it.product.sku}</span></span>
                          <span>Giá bán: <span className="text-primary font-bold">{fmt(it.price)}</span></span>
                          {it.discount > 0 && <span>Giảm giá: {fmt(it.discount)}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Đã mua</span>
                        <span className="text-sm font-bold text-gray-700">{maxQty}</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-primary uppercase tracking-wider font-bold mb-1">SL Trả</span>
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-8">
                          <button 
                            className="px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold border-r border-gray-300 cursor-pointer h-full"
                            onClick={() => handleQtyChange(it.id, maxQty, Math.max(0, returnQty - 1))}
                          >-</button>
                          <input 
                            type="text" 
                            className="w-12 text-center text-sm font-bold text-gray-800 outline-none h-full"
                            value={returnQty}
                            onChange={(e) => handleQtyChange(it.id, maxQty, e.target.value)}
                          />
                          <button 
                            className="px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold border-l border-gray-300 cursor-pointer h-full"
                            onClick={() => handleQtyChange(it.id, maxQty, Math.min(maxQty, returnQty + 1))}
                          >+</button>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleSetMax(it.id, maxQty)}
                        className="text-xs font-bold text-primary hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        Trả hết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú trả hàng</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Lý do khách trả hàng..."
                className="w-full h-24 p-3 text-sm border border-gray-300 rounded-xl bg-white outline-none focus:border-primary resize-none shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Summary */}
        <div className="w-80 bg-gray-50 flex flex-col shrink-0">
          <div className="p-5 flex-1 flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Thông tin thanh toán</h3>
              
              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between text-gray-600">
                  <span>Tổng giá gốc hàng mua</span>
                  <span className="font-bold text-gray-900">{fmt(order.total)}</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Tổng tiền hàng trả</span>
                  <span className="font-bold text-gray-900">{fmt(totalReturnAmount)}</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Phí trả hàng</span>
                  <span className="font-bold text-gray-900">0</span>
                </div>
                
                <div className="pt-3 border-t border-gray-200 border-dashed flex justify-between items-center mt-2">
                  <span className="font-bold text-gray-800 text-base">Cần trả khách</span>
                  <span className="font-extrabold text-primary text-xl">{fmt(totalReturnAmount)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button 
              onClick={handleSubmit}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-base shadow-lg shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              HOÀN TẤT TRẢ HÀNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
