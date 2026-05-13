import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { supplierAPI } from '../../services/api';

export default function SupplierModal({ open, onClose, onSaved, supplier }) {
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', tax_code: '', note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({ name: supplier.name || '', contact_person: supplier.contact_person || '', phone: supplier.phone || '', email: supplier.email || '', address: supplier.address || '', tax_code: supplier.tax_code || '', note: supplier.note || '' });
    } else {
      setForm({ name: '', contact_person: '', phone: '', email: '', address: '', tax_code: '', note: '' });
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
    } catch {} finally { setSaving(false); }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">{supplier ? 'Cập nhật NCC' : 'Thêm nhà cung cấp'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Tên NCC *</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Nhập tên nhà cung cấp" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Người liên hệ</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.contact_person} onChange={e => f('contact_person', e.target.value)} /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Điện thoại</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Email</label><input type="email" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.email} onChange={e => f('email', e.target.value)} /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Mã số thuế</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.tax_code} onChange={e => f('tax_code', e.target.value)} /></div>
          <div className="col-span-2"><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Địa chỉ</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.address} onChange={e => f('address', e.target.value)} /></div>
          <div className="col-span-2"><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Ghi chú</label><textarea className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-y min-h-[70px]" value={form.note} onChange={e => f('note', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose}>Bỏ qua</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} className="shadow-md bg-gradient-to-r from-primary to-blue-600 border-none">{saving ? 'Đang lưu...' : (supplier ? 'Cập nhật' : 'Thêm mới')}</Button>
        </div>
      </div>
    </div>
  );
}
