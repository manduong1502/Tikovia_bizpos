import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, User, UserCheck, Phone, MapPin, AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { customerAPI, orderAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { formatWorkingHoursDateTime } from '../../utils/dateFilterUtils';
import CustomerModal from '../../pages/Customers/CustomerModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function AssignCustomerModal({ open, onClose, order, onSuccess }) {
  if (!open || !order) return null;

  const orderId = order.id || order.order_id || order.code;
  const orderCode = order.order_code || order.code || order.id;
  const orderTotal = Number(order.total || 0);
  const orderPaid = Number(order.paid || order.paid_amount || 0);
  const unpaid = orderTotal - orderPaid;
  const currentCustomerName = order.customer_name || order.customer?.name || 'Khách lẻ';
  const receiverName = order.receiver_name || order.receiverName || '';
  const receiverPhone = order.receiver_phone || order.receiverPhone || '';

  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const inputRef = useRef(null);

  // Auto pre-populate search query based on receiverName or receiverPhone if available
  useEffect(() => {
    if (open) {
      const initialQuery = receiverPhone || receiverName || '';
      setSearch(initialQuery);
      setSelectedCustomer(null);
      fetchCustomers(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, receiverName, receiverPhone]);

  const fetchCustomers = async (query = '') => {
    setLoading(true);
    try {
      const res = await customerAPI.getAll({ search: query.trim(), limit: 15 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCustomers(list);
      
      // Auto select if exact match on name or phone
      if (list.length > 0 && query.trim()) {
        const q = query.trim().toLowerCase();
        const exact = list.find(c => 
          (c.phone && c.phone.includes(q)) || 
          (c.name && c.name.toLowerCase() === q) ||
          (c.code && c.code.toLowerCase() === q)
        );
        if (exact) {
          setSelectedCustomer(exact);
        }
      }
    } catch (err) {
      console.error('Error fetching customers for assignment:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchCustomers(val);
  };

  const handleAssign = async () => {
    if (!selectedCustomer) {
      toast.error('Vui lòng chọn khách hàng cần gán');
      return;
    }

    setSubmitting(true);
    const tid = toast.loading(`Đang gán hóa đơn ${orderCode} cho ${selectedCustomer.name}...`);
    try {
      const res = await orderAPI.update(orderId, { customerId: selectedCustomer.id });
      toast.success(`Đã gán hóa đơn ${orderCode} cho khách hàng ${selectedCustomer.name} thành công!`, { id: tid });
      
      // Dispatch app:data-changed to trigger instant UI reload across Orders and Customers pages
      window.dispatchEvent(new CustomEvent('app:data-changed', {
        detail: {
          type: 'order',
          orderId: orderId,
          customerId: selectedCustomer.id
        }
      }));

      if (onSuccess) onSuccess(res || { ...order, customerId: selectedCustomer.id, customer_name: selectedCustomer.name });
      onClose();
    } catch (err) {
      console.error('Error assigning customer to order:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi gán khách hàng', { id: tid });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans text-left" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[92vh] overflow-hidden flex flex-col custom-scrollbar" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <UserCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                Gán khách hàng cho hóa đơn
                <span className="px-2 py-0.5 text-xs font-extrabold bg-blue-100 text-primary rounded-md border border-blue-200">
                  {orderCode}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cập nhật chủ sở hữu đơn hàng và tự động đồng bộ công nợ vào danh bạ khách hàng
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/80 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Invoice Summary Info Card */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500 font-medium block mb-0.5">Khách hiện tại</span>
              <span className="font-extrabold text-gray-800 truncate block" title={currentCustomerName}>
                {currentCustomerName}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium block mb-0.5">Thời gian bán</span>
              <span className="font-bold text-gray-700 block">
                {order.created_at || order.createdAt ? formatWorkingHoursDateTime(order.created_at || order.createdAt) : '---'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium block mb-0.5">Tổng tiền đơn</span>
              <span className="font-extrabold text-gray-900 block">{fmt(orderTotal)} đ</span>
            </div>
            <div>
              <span className="text-gray-500 font-medium block mb-0.5">Chưa thanh toán</span>
              <span className={`font-extrabold block ${unpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(unpaid)} đ
              </span>
            </div>
          </div>

          {(receiverName || receiverPhone) && (
            <div className="mt-2.5 px-3.5 py-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs flex items-center justify-between text-amber-900">
              <span className="font-medium">
                📍 Ghi chú người nhận đơn: <strong>{receiverName || '---'}</strong> {receiverPhone && `(${receiverPhone})`}
              </span>
              {receiverName && !search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch(receiverName);
                    fetchCustomers(receiverName);
                  }}
                  className="text-primary hover:underline font-bold ml-2 cursor-pointer shrink-0"
                >
                  Tìm theo tên này
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm theo Tên, Số điện thoại hoặc Mã KH..."
              className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchCustomers('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2.5 bg-blue-50 text-primary border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            title="Thêm khách hàng mới nếu chưa có trong danh bạ"
          >
            <Plus size={15} />
            <span>Thêm mới</span>
          </button>
        </div>

        {/* Customer Results List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 max-h-[300px] custom-scrollbar space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs">Đang tìm kiếm khách hàng...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <AlertCircle size={28} className="text-gray-400 mb-1" />
              <span className="text-xs font-semibold text-gray-600">Không tìm thấy khách hàng phù hợp</span>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[280px]">
                Hãy thử tìm bằng từ khóa khác hoặc bấm nút <strong>"Thêm mới"</strong> ở trên để tạo hồ sơ khách hàng.
              </p>
            </div>
          ) : (
            customers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              const debt = Number(cust.totalDebt || cust.debt || 0);

              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/80 border-primary shadow-sm ring-1 ring-primary/30'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isSelected ? <CheckCircle2 size={20} /> : <User size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-gray-800 truncate">
                          {cust.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded">
                          {cust.code || `KH${String(cust.id).padStart(6, '0')}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                        {cust.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} className="text-gray-400" />
                            {cust.phone}
                          </span>
                        )}
                        {cust.address && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[200px]" title={cust.address}>
                            <MapPin size={11} className="text-gray-400 shrink-0" />
                            {cust.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-gray-400 block font-medium">Nợ hiện tại</span>
                    <span className={`font-extrabold text-xs ${debt > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {fmt(debt)} đ
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Customer Preview & Impact Message */}
        {selectedCustomer && (
          <div className="px-6 pt-2 pb-1">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-start gap-2.5 text-emerald-950">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Khách hàng được chọn: {selectedCustomer.name}</span>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  {unpaid > 0
                    ? `Sau khi gán, công nợ chưa trả (${fmt(unpaid)} đ) sẽ tự động được cộng vào tab "Nợ cần thu từ khách" của ${selectedCustomer.name}.`
                    : `Hóa đơn này sẽ được chuyển vào lịch sử mua hàng của ${selectedCustomer.name}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold rounded-xl"
          >
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            disabled={!selectedCustomer || submitting}
            className="px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <UserCheck size={15} />
                <span>Xác nhận gán</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Embedded CustomerModal if user wants to create a new customer on the spot */}
      {showCreateModal && (
        <CustomerModal
          open={showCreateModal}
          customer={{ name: search || receiverName || '', phone: receiverPhone || '' }}
          onClose={() => setShowCreateModal(false)}
          onSaved={(newCust) => {
            if (newCust && newCust.id) {
              setCustomers(prev => [newCust, ...prev]);
              setSelectedCustomer(newCust);
              toast.success(`Đã tạo khách hàng "${newCust.name}" thành công!`);
            }
            setShowCreateModal(false);
          }}
        />
      )}
    </div>,
    document.body
  );
}
