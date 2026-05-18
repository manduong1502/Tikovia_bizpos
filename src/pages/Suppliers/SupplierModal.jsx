import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { supplierAPI } from '../../services/api';
import NumericInput from '../../components/ui/NumericInput';

export default function SupplierModal({ open, onClose, onSaved, supplier }) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    total_spent: 0,
    debt: 0,
    net_purchase: 0,
    isActive: true,
    note: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        code: supplier.code || '',
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        total_spent: Number(supplier.total_spent || 0),
        debt: Number(supplier.debt || 0),
        net_purchase: Number(supplier.net_purchase ?? supplier.total_spent ?? 0),
        isActive: supplier.isActive !== false,
        note: supplier.note || ''
      });
    } else {
      setForm({
        code: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        total_spent: 0,
        debt: 0,
        net_purchase: 0,
        isActive: true,
        note: ''
      });
    }
  }, [supplier, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên nhà cung cấp'); return; }
    setSaving(true);
    try {
      if (supplier) {
        await supplierAPI.update(supplier.id, form);
        toast.success('Cập nhật NCC thành công');
      } else {
        await supplierAPI.create(form);
        toast.success('Tạo nhà cung cấp thành công');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu');
    } finally { setSaving(false); }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[640px] max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary to-blue-600 text-white">
          <h2 className="text-lg font-extrabold tracking-tight m-0">{supplier ? 'Cập nhật NCC' : 'Thêm nhà cung cấp'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border-none bg-transparent"><X size={20} className="text-white" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Mã nhà cung cấp</label><input className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.code} onChange={e => f('code', e.target.value)} placeholder="Mã tự động nếu để trống" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Tên nhà cung cấp *</label><input className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Nhập tên nhà cung cấp" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Điện thoại</label><input className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="Số điện thoại" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Email</label><input type="email" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.email} onChange={e => f('email', e.target.value)} placeholder="Email liên hệ" /></div>
          <div className="col-span-2"><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Địa chỉ</label><input className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.address} onChange={e => f('address', e.target.value)} placeholder="Địa chỉ chi tiết" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Tổng mua</label><NumericInput className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.total_spent} onChange={e => f('total_spent', Number(e.target.value))} placeholder="0" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Nợ cần trả hiện tại</label><NumericInput className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.debt} onChange={e => f('debt', Number(e.target.value))} placeholder="0" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Tổng mua trừ trả hàng</label><NumericInput className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.net_purchase} onChange={e => f('net_purchase', Number(e.target.value))} placeholder="0" /></div>
          <div>
            <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Trạng thái</label>
            <select className="w-full border border-gray-200 rounded px-3 py-2 min-h-[42px] text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white cursor-pointer" value={form.isActive ? 'true' : 'false'} onChange={e => f('isActive', e.target.value === 'true')}>
              <option value="true">Hoạt động</option>
              <option value="false">Ngừng hoạt động</option>
            </select>
          </div>
          <div className="col-span-2"><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Ghi chú</label><textarea className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-y min-h-[70px]" value={form.note} onChange={e => f('note', e.target.value)} placeholder="Ghi chú thêm..." /></div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold cursor-pointer bg-white">Bỏ qua</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-xl shadow-md bg-gradient-to-r from-primary to-blue-600 hover:from-primary-hover hover:to-blue-700 text-white font-extrabold border-none cursor-pointer">{saving ? 'Đang lưu...' : (supplier ? 'Cập nhật' : 'Thêm mới')}</Button>
        </div>
      </div>
    </div>
  );
}
