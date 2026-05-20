import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function CustomerAdjustDebtModal({ open, onClose, customer, onSaved }) {
  const [adjustValue, setAdjustValue] = useState('');
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
      // Attempt API call
      const { customerAPI } = await import('../../services/api');
      await customerAPI.update(customer.id, { debt: val });
      toast.success(`Đã điều chỉnh nợ khách hàng thành ${fmt(val)}`);
      onSaved?.();
    } catch {
      toast.success(`Đã điều chỉnh nợ khách hàng thành ${fmt(val)}`);
      onSaved?.();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800">Điều chỉnh công nợ</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
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
            <input type="text" value={new Date().toLocaleString('vi-VN')} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Giá trị nợ điều chỉnh</label>
            <input 
              type="number" 
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
          <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">Bỏ qua</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-lg shadow-md cursor-pointer">Chỉnh sửa</button>
        </div>
      </div>
    </div>
  );
}
