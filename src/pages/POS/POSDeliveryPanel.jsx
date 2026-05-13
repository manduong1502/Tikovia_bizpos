import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, User, X, MapPin, Package, Edit2, Truck, ChevronDown } from 'lucide-react';
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
    <div className="flex h-full w-full bg-white divide-x divide-gray-200">
      {/* Middle Column: Customer & Delivery Info */}
      <div className="w-1/2 flex flex-col p-4 overflow-y-auto">
        {/* Customer Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-800">{customer?.name || 'Khách lẻ'}</span>
            <div className="flex items-center text-gray-500 cursor-pointer hover:text-blue-600">
              <User size={16} className="mr-1" />
              <ChevronDown size={14} />
            </div>
          </div>
          <span className="text-[13px] text-gray-500">13/05/2026 13:59</span>
        </div>

        {/* Customer Search / Selected */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm khách hàng (F4)"
              className="w-full h-8 pl-9 pr-3 rounded border border-gray-300 text-[13px] outline-none focus:border-blue-500"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
            +
          </button>
          <div className="h-8 flex items-center px-3 border border-gray-300 rounded text-[13px] bg-gray-50 cursor-pointer">
            Bảng giá chung <ChevronDown size={14} className="ml-2" />
          </div>
        </div>

        {/* Delivery Form */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-blue-600 font-medium text-[14px]">
            <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            </div>
            {customer?.phone || '+84935693861'}
            <ChevronDown size={14} className="ml-auto text-gray-400" />
          </div>
          <div className="text-red-500 text-[12px] ml-6 mb-4">Vui lòng thêm địa chỉ lấy hàng mới</div>

          <div className="flex items-start gap-2 mb-4">
            <MapPin size={16} className="text-green-500 mt-2 shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <input type="text" placeholder="Tên người nhận" className="border-b border-gray-300 pb-1 outline-none focus:border-blue-500 text-[13px]" />
              <input type="text" placeholder="Số điện thoại" className="border-b border-gray-300 pb-1 outline-none focus:border-blue-500 text-[13px]" />
              <input type="text" placeholder="Địa chỉ chi tiết (Số nhà, ngõ, đường)" className="col-span-2 border-b border-gray-300 pb-1 outline-none focus:border-blue-500 text-[13px] mt-2" />
              <input type="text" placeholder="Khu vực" className="col-span-2 border-b border-gray-300 pb-1 outline-none focus:border-blue-500 text-[13px] mt-2" />
              <input type="text" placeholder="Phường/Xã" className="col-span-2 border-b border-gray-300 pb-1 outline-none focus:border-blue-500 text-[13px] mt-2" />
            </div>
          </div>

          <div className="flex items-start gap-2 mb-4">
            <Package size={16} className="text-gray-500 mt-2 shrink-0" />
            <div className="flex-1 flex flex-col gap-3">
              <div className="text-[13px] font-medium mt-1">1 kiện</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-b border-gray-300 pb-1">
                  <input type="text" defaultValue="500" className="w-10 outline-none text-[13px] font-medium" />
                  <span className="text-[13px] text-gray-500 flex items-center">gram <ChevronDown size={14} className="ml-1"/></span>
                </div>
                <div className="flex items-center gap-2 border-b border-gray-300 pb-1 text-[13px] text-gray-500">
                  <input type="text" defaultValue="10" className="w-6 text-center outline-none text-black font-medium" /> ×
                  <input type="text" defaultValue="10" className="w-6 text-center outline-none text-black font-medium" /> ×
                  <input type="text" defaultValue="10" className="w-6 text-center outline-none text-black font-medium" />
                  <span className="flex items-center ml-1">cm <ChevronDown size={14} className="ml-1"/></span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 mb-4">
            <Edit2 size={16} className="text-gray-500 mt-1 shrink-0" />
            <input type="text" placeholder="Ghi chú cho bưu tá" className="flex-1 border-b border-gray-300 pb-1 outline-none focus:border-blue-500 text-[13px]" />
          </div>

          <div className="mt-auto flex justify-between items-center pt-4 font-medium text-[14px]">
            <div className="flex items-center gap-2 text-gray-700">
              Thu hộ tiền (COD)
              <div 
                className={`w-8 h-4 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${codEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                onClick={() => setCodEnabled(!codEnabled)}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${codEnabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </div>
            <span className="font-bold text-[16px] text-gray-900">{new Intl.NumberFormat('vi-VN').format(codEnabled ? total : 0)}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Shipping Partner & Payment */}
      <div className="w-1/2 flex flex-col bg-gray-50/50">
        <div className="flex border-b border-gray-200">
          <div 
            onClick={() => setActiveTab('kiotviet')}
            className={`flex-1 py-3 text-center text-[13px] font-medium cursor-pointer flex justify-center items-center gap-2 ${activeTab === 'kiotviet' ? 'bg-white border-t-2 border-t-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Truck size={16} /> Cổng KiotViet
          </div>
          <div 
            onClick={() => setActiveTab('self')}
            className={`flex-1 py-3 text-center text-[13px] font-medium cursor-pointer flex justify-center items-center gap-2 ${activeTab === 'self' ? 'bg-white border-t-2 border-t-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <User size={16} /> Tự giao hàng
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-white">
          {activeTab === 'self' ? (
            <div className="flex items-center gap-4 text-[13px]">
              <span className="text-gray-700 whitespace-nowrap">Đối tác giao hàng</span>
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Chọn đối tác" 
                  className="w-full border-b border-gray-300 pb-1 outline-none focus:border-blue-500 pr-6" 
                />
                <ChevronDown size={14} className="absolute right-0 top-1 text-gray-400" />
              </div>
              <button className="text-gray-400 hover:text-blue-600">+</button>
            </div>
          ) : (
            <div className="text-center text-gray-500 text-[13px] mt-10">
              Tính năng kết nối Cổng vận chuyển KiotViet đang phát triển.
            </div>
          )}
        </div>

        <div className="p-4 bg-white mt-auto">
          <button 
            onClick={handleSubmit}
            className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white py-3.5 rounded font-bold text-[15px] shadow-sm transition-colors"
          >
            THANH TOÁN
          </button>
        </div>
      </div>
    </div>
  );
}
