import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, CheckCircle, ChevronLeft } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function POSPaymentPanel() {
  const { currentInvoice, updateCurrentInvoice, togglePaymentMode, clearCurrentInvoice } = usePOS();
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [paidAmountStr, setPaidAmountStr] = useState('');
  
  if (!currentInvoice?.isPaymentMode) return null;

  const cart = currentInvoice.cart || [];
  const customer = currentInvoice.customer;
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
      const res = await api.get(`/customers/search?q=${val}`);
      setCustomerSuggestions(res.data?.data || res.data || []);
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
        customerId: customer?.id || null,
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.price,
          discount: i.discount
        })),
        paymentMethod: 'CASH', // Hardcoded for now
        discountPercent: currentInvoice.discount || 0,
        discountAmount: discountAmount,
        paidAmount: isDebt ? paidAmount : total, // if change is positive, we only record they paid `total` to us
        note: currentInvoice.note
      };

      const res = await api.post('/orders', orderData);
      const newOrder = res.data?.data || res.data;
      
      toast.success(`Tạo đơn hàng thành công! ${isDebt ? `(Ghi nợ: ${new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount))})` : ''}`);
      
      // Clear and return
      clearCurrentInvoice();
      togglePaymentMode(false);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo đơn hàng');
    }
  };

  return (
    <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in slide-in-from-right-8 duration-200">
      {/* Header */}
      <div className="h-[50px] border-b border-gray-200 flex items-center px-4 shrink-0 bg-gray-50">
        <button 
          onClick={() => togglePaymentMode(false)}
          className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
        >
          <ChevronLeft size={20} className="mr-1" /> Quay lại
        </button>
        <div className="ml-auto font-bold text-[16px] text-gray-800">Thanh toán</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        {/* Customer Section */}
        <div className="mb-6">
          <label className="block text-[13px] font-medium text-gray-700 mb-2">Khách hàng</label>
          
          {customer ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-[14px]">{customer.name}</div>
                  <div className="text-[12px] text-gray-500">{customer.phone || 'Chưa có số ĐT'}</div>
                  {(customer.totalDebt || 0) > 0 && (
                    <div className="text-[12px] text-red-500 font-medium mt-0.5">Nợ hiện tại: {new Intl.NumberFormat('vi-VN').format(customer.totalDebt)}</div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => updateCurrentInvoice({ customer: null })}
                className="text-gray-400 hover:text-red-500 p-2"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm khách hàng (Tên, SĐT)..."
                className="w-full h-10 pl-10 pr-3 rounded border border-gray-300 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={customerSearch}
                onChange={handleCustomerSearch}
              />
              
              {customerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded shadow-lg border border-gray-200 z-50 max-h-[200px] overflow-y-auto">
                  {customerSuggestions.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="text-[13px] font-medium text-gray-800">{c.name}</div>
                        <div className="text-[11px] text-gray-500">{c.phone}</div>
                      </div>
                      {(c.totalDebt || 0) > 0 && (
                        <div className="text-[11px] text-red-500 font-medium">Nợ: {new Intl.NumberFormat('vi-VN').format(c.totalDebt)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex justify-between items-center mb-3 text-[14px]">
            <span className="text-gray-600">Tổng tiền hàng ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            <span className="font-semibold text-gray-800">{new Intl.NumberFormat('vi-VN').format(subtotal)}</span>
          </div>
          
          <div className="flex justify-between items-center mb-3 text-[14px]">
            <span className="text-gray-600">Giảm giá (%)</span>
            <input 
              type="number"
              min="0"
              max="100"
              value={currentInvoice.discount}
              onChange={(e) => updateCurrentInvoice({ discount: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
              className="w-20 text-right border-b border-gray-300 bg-transparent outline-none focus:border-blue-500 text-gray-800 font-semibold"
            />
          </div>

          <div className="h-px bg-gray-200 my-4"></div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-[16px] font-bold text-gray-800">Khách cần trả</span>
            <span className="text-[20px] font-bold text-[#1a73e8]">{new Intl.NumberFormat('vi-VN').format(total)}</span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-[14px] font-medium text-gray-700">Khách thanh toán</span>
            <input 
              type="text"
              value={paidAmountStr === '' ? new Intl.NumberFormat('vi-VN').format(total) : paidAmountStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setPaidAmountStr(raw ? new Intl.NumberFormat('vi-VN').format(raw) : '0');
              }}
              onFocus={() => {
                if (paidAmountStr === '') {
                  setPaidAmountStr(total.toString());
                }
              }}
              className="w-32 text-right border-b border-blue-400 bg-transparent outline-none focus:border-blue-600 text-[16px] font-bold text-gray-800 pb-1"
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <span className="text-[14px] font-medium text-gray-700">{isDebt ? 'Tính vào công nợ' : 'Tiền thừa trả khách'}</span>
            <span className={`text-[16px] font-bold ${isDebt ? 'text-red-500' : 'text-gray-800'}`}>
              {new Intl.NumberFormat('vi-VN').format(Math.abs(changeAmount))}
            </span>
          </div>
        </div>

        {/* Submit */}
        <button 
          onClick={handleSubmitOrder}
          className="w-full bg-[#1a73e8] hover:bg-blue-600 text-white py-4 rounded-xl font-bold text-[16px] flex justify-center items-center gap-2 shadow-md transition-all active:scale-[0.98]"
        >
          <CheckCircle size={20} /> HOÀN THÀNH (F9)
        </button>
      </div>
    </div>
  );
}
