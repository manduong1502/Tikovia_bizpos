import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import NumericInput from '../../components/ui/NumericInput';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function CustomerAdjustDebtModal({ open, onClose, customer, onSaved }) {
  const getNowLocalStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [adjustValue, setAdjustValue] = useState('');
  const [adjustTime, setAdjustTime] = useState(getNowLocalStr());
  const [description, setDescription] = useState('');

  if (!open || !customer) return null;

  const currentDebt = Number(customer.debt || customer.totalDebt || 0);

  const handleSubmit = async () => {
    const val = Number(adjustValue);
    if (isNaN(val) || val < 0) {
      toast.error('Giá trị nợ điều chỉnh không hợp lệ');
      return;
    }
    try {
      const { customerAPI, cashbookAPI } = await import('../../services/api');
      const diff = val - currentDebt;

      // 1. Update customer totalDebt directly to exact val
      await customerAPI.update(customer.id, { debt: val });

      // 2. Create cashbook entry for history display only without double-subtracting debt (isAccounting: false)
      if (diff !== 0) {
        const type = diff > 0 ? 'EXPENSE' : 'INCOME';
        const absVal = Math.abs(diff);
        const codePrefix = type === 'INCOME' ? 'TTM' : 'TCM';
        await cashbookAPI.create({
          code: `${codePrefix}${String(Date.now()).slice(-6)}`,
          type,
          amount: absVal,
          category: 'Điều chỉnh công nợ',
          partnerType: 'other', // Use 'other' so cashbookController won't mutate customer debt a second time
          customerId: customer.id,
          partnerName: customer.name,
          paymentMethod: 'cash',
          isAccounting: false,
          status: 'completed',
          createdAt: adjustTime ? new Date(adjustTime).toISOString() : new Date().toISOString(),
          note: description || `Điều chỉnh công nợ khách hàng ${customer.name} từ ${fmt(currentDebt)} thành ${fmt(val)}`
        }).catch(() => {});
      }

      toast.success(`Đã điều chỉnh nợ khách hàng thành ${fmt(val)}`);
      window.dispatchEvent(new CustomEvent('app:data-changed', { detail: { type: 'customer', customerId: customer.id } }));
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi điều chỉnh công nợ');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800">Điều chỉnh công nợ</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
            <span className="text-sm font-bold text-gray-600">Nợ cần thu hiện tại</span>
            <span className="text-lg font-extrabold text-red-600">{fmt(currentDebt)}</span>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Thời gian điều chỉnh</label>
            <input 
              type="datetime-local" 
              value={adjustTime} 
              onChange={e => setAdjustTime(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none font-semibold text-gray-800" 
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Giá trị nợ điều chỉnh</label>
            <NumericInput 
              value={adjustValue}
              onChange={e => setAdjustValue(e.target.value)}
              placeholder={String(currentDebt)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Mô tả</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Nhập lý do điều chỉnh..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border-none bg-transparent">Bỏ qua</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-lg shadow-md cursor-pointer border-none">Chỉnh sửa</button>
        </div>
      </div>
    </div>
  );
}
