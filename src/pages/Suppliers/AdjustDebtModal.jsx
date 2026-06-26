import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import Button from '../../components/ui/Button';
import { supplierAPI } from '../../services/api';
import toast from 'react-hot-toast';
import NumericInput from '../../components/ui/NumericInput';

const toLocalISOString = (dateOrStr) => {
  const d = dateOrStr ? new Date(dateOrStr) : new Date();
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function AdjustDebtModal({ open, onClose, supplier, onSaved }) {
  const [adjustDate, setAdjustDate] = useState('');
  const [debtValue, setDebtValue] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && supplier) {
      setDebtValue(String(supplier.debt || supplier.totalDebt || 0));
      setNote('');
      setAdjustDate(toLocalISOString(new Date()));
    }
  }, [open, supplier]);

  if (!open || !supplier) return null;

  const handleSave = async () => {
    if (debtValue === '') {
      toast.error('Vui lòng nhập giá trị nợ điều chỉnh');
      return;
    }

    setLoading(true);
    try {
      await supplierAPI.update(supplier.id, {
        debt: Number(debtValue),
        // Có thể lưu thêm note vào một nơi nào đó nếu cần thiết, 
        // tạm thời API supplier.update chỉ nhận note chung của NCC.
        // Để làm đúng chuẩn, sau này cần bảng DebtAdjustment riêng.
      });
      toast.success('Điều chỉnh công nợ thành công');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi điều chỉnh công nợ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800">Điều chỉnh</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-500 border-none bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1">
          <div className="flex items-center">
            <span className="w-40 text-sm font-bold text-gray-700">Nợ cần trả hiện tại:</span>
            <span className="text-sm font-bold text-gray-800">{new Intl.NumberFormat('vi-VN').format(supplier.debt || supplier.totalDebt || 0)}</span>
          </div>

          <div className="flex items-center">
            <span className="w-40 text-sm font-bold text-gray-700">Ngày điều chỉnh:</span>
            <div className="relative flex-1">
              <input 
                type="datetime-local" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary shadow-sm"
                value={adjustDate}
                onChange={e => setAdjustDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center">
            <span className="w-40 text-sm font-bold text-gray-700">Giá trị nợ điều chỉnh:</span>
            <NumericInput 
              className="flex-1 border border-primary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary shadow-sm text-primary font-bold"
              value={debtValue}
              onChange={e => setDebtValue(String(e.target.value))}
              placeholder="Nhập giá trị nợ mới"
            />
          </div>

          <div className="flex items-start mt-2">
            <span className="w-40 text-sm font-bold text-gray-700 pt-2">Mô tả:</span>
            <textarea 
              className="flex-1 border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-primary shadow-sm min-h-[80px] resize-none"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Nhập mô tả"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
          <Button variant="secondary" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white cursor-pointer hover:bg-gray-50 border-gray-200">
            Bỏ qua
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading} className="px-8 py-2.5 rounded-xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer border-none bg-blue-500 hover:bg-blue-600 text-white">
            {loading ? 'Đang lưu...' : 'Chỉnh sửa'}
          </Button>
        </div>
      </div>
    </div>
  );
}
