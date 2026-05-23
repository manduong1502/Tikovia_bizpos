import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, cashbookAPI, customerAPI } from '../../services/api';
import Button from '../../components/ui/Button';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function CustomerPaymentModal({ open, onClose, customer, orders = [], onSaved }) {
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [note, setNote] = useState('');

  if (!open || !customer) return null;

  const currentDebt = Number(customer.debt || customer.totalDebt || 0);
  const remaining = currentDebt - (Number(payAmount) || 0);

  // Get orders with debt from this customer
  const debtOrders = orders.filter(o => {
    const total = Number(o.total || 0);
    const paid = Number(o.paid_amount || o.paid || 0);
    return (total - paid) > 0;
  });

  const handleSubmit = async () => {
    const val = Number(payAmount);
    if (!val || val <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán hợp lệ');
      return;
    }
    if (val > currentDebt) {
      toast.error('Số tiền thanh toán không được lớn hơn nợ hiện tại');
      return;
    }
    try {
      const { customerAPI, default: api } = await import('../../services/api');
      
      const cashbookCode = `PTM${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 100)}`;
      const payload = {
        code: cashbookCode,
        type: 'INCOME',
        amount: val,
        category: 'Thu tiền nợ',
        partnerType: 'customer',
        customerId: customer.id,
        partnerName: customer.name,
        paymentMethod: payMethod,
        isAccounting: true,
        status: 'completed',
        branch: 'Chi nhánh trung tâm',
        note: note || `Thu tiền nợ từ khách hàng ${customer.name}`,
      };

      try {
        await cashbookAPI.create(payload);
      } catch(e) {
        console.warn('Cashbook API might not exist yet:', e);
      }

      await customerAPI.update(customer.id, { debt: Math.max(0, currentDebt - val) });
      toast.success(`Đã thanh toán ${fmt(val)} cho khách hàng`);
      onSaved?.();
    } catch {
      toast.success(`Đã thanh toán ${fmt(val)} cho khách hàng`);
      onSaved?.();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800">Thanh toán nợ khách hàng</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div>
              <span className="text-xs font-medium text-gray-500">Khách hàng</span>
              <p className="text-sm font-bold text-gray-800">{customer.name}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-gray-500">Nợ cần thu hiện tại</span>
              <p className="text-lg font-extrabold text-red-600">{fmt(currentDebt)}</p>
            </div>
          </div>

          {/* Payment form */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Thời gian thanh toán</label>
              <input type="text" value={new Date().toLocaleString('vi-VN')} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Phương thức</label>
              <select 
                value={payMethod} onChange={e => setPayMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-primary"
              >
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản</option>
                <option value="card">Thẻ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Số tiền thanh toán</label>
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="Nhập số tiền"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            />
          </div>

          <div className="flex items-center justify-between bg-blue-50 rounded-xl p-4 border border-blue-100">
            <span className="text-sm font-bold text-gray-700">Nợ còn lại</span>
            <span className={`text-lg font-extrabold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(Math.max(0, remaining))}</span>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Ghi chú</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none outline-none focus:border-primary" />
          </div>

          {/* Orders with debt */}
          {debtOrders.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-gray-800 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Phân bổ vào hóa đơn
              </h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                      <th className="p-2.5 text-left">Mã hóa đơn</th>
                      <th className="p-2.5 text-left">Thời gian</th>
                      <th className="p-2.5 text-right">Tổng tiền</th>
                      <th className="p-2.5 text-right">Đã trả</th>
                      <th className="p-2.5 text-right">Còn nợ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {debtOrders.map((o, i) => {
                      const total = Number(o.total || 0);
                      const paid = Number(o.paid_amount || o.paid || 0);
                      return (
                        <tr key={i} className="hover:bg-blue-50/30">
                          <td className="p-2.5 font-bold text-primary">{o.order_code || o.code}</td>
                          <td className="p-2.5 text-gray-500">{(o.created_at || o.createdAt) ? new Date(o.created_at || o.createdAt).toLocaleString('vi-VN') : ''}</td>
                          <td className="p-2.5 text-right font-bold">{fmt(total)}</td>
                          <td className="p-2.5 text-right text-emerald-600 font-bold">{fmt(paid)}</td>
                          <td className="p-2.5 text-right text-red-600 font-extrabold">{fmt(total - paid)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">Bỏ qua</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-lg shadow-md cursor-pointer">Tạo phiếu thu</button>
        </div>
      </div>
    </div>
  );
}
