import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { cashbookAPI } from '../../services/api';
import NumericInput from '../../components/ui/NumericInput';

export default function CashbookModal({ open, onClose, onSaved, type = 'thu' }) {
  const [form, setForm] = useState({ amount: '', category: '', payment_method: 'cash', payer_name: '', note: '' });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const isThu = type === 'thu';

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Số tiền phải > 0'); return; }
    setSaving(true);
    try {
      await cashbookAPI.create({ ...form, type, amount: Number(form.amount) });
      toast.success(`Tạo phiếu ${isThu ? 'thu' : 'chi'} thành công`);
      setForm({ amount: '', category: '', payment_method: 'cash', payer_name: '', note: '' });
      onSaved?.();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[480px]" onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isThu ? 'border-green-100' : 'border-red-100'}`}>
          <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">{isThu ? 'Tạo phiếu thu' : 'Tạo phiếu chi'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Số tiền *</label><NumericInput className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.amount} onChange={e => f('amount', e.target.value)} placeholder="Nhập số tiền" autoFocus /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">{isThu ? 'Người nộp' : 'Người nhận'}</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.payer_name} onChange={e => f('payer_name', e.target.value)} /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Loại thu/chi</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.category} onChange={e => f('category', e.target.value)} placeholder={isThu ? 'VD: Thu tiền bán hàng' : 'VD: Chi mua hàng'} /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Hình thức</label>
            <select className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm cursor-pointer" value={form.payment_method} onChange={e => f('payment_method', e.target.value)}>
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="card">Quẹt thẻ</option>
            </select>
          </div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Ghi chú</label><textarea className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-y min-h-[60px]" value={form.note} onChange={e => f('note', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose}>Bỏ qua</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} className={`shadow-md border-none ${isThu ? 'bg-gradient-to-r from-primary to-blue-600' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>{saving ? 'Đang lưu...' : `Tạo phiếu ${isThu ? 'thu' : 'chi'}`}</Button>
        </div>
      </div>
    </div>
  );
}
