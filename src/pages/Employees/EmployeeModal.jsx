import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../services/api';

export default function EmployeeModal({ open, onClose, onSaved, employee }) {
  const [form, setForm] = useState({ name: '', phone: '', id_card: '', note: '', salary: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({ name: employee.name || '', phone: employee.phone || '', id_card: employee.id_card || '', note: employee.note || '', salary: employee.salary || '', status: employee.status || 'active' });
    } else {
      setForm({ name: '', phone: '', id_card: '', note: '', salary: '', status: 'active' });
    }
  }, [employee, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên nhân viên'); return; }
    setSaving(true);
    try {
      if (employee) {
        await employeeAPI.update(employee.id, form);
        toast.success('Cập nhật nhân viên thành công');
      } else {
        await employeeAPI.create(form);
        toast.success('Tạo nhân viên thành công');
      }
      onSaved?.();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">{employee ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Tên nhân viên *</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Nhập tên nhân viên" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Điện thoại</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="0xxx xxx xxx" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">CMND/CCCD</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.id_card} onChange={e => f('id_card', e.target.value)} /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Lương</label><input type="number" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={form.salary} onChange={e => f('salary', e.target.value)} placeholder="0" /></div>
          <div><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Trạng thái</label><select className="w-full border border-gray-200 rounded px-3 py-2 min-h-[42px] text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm cursor-pointer" value={form.status} onChange={e => f('status', e.target.value)}><option value="active">Đang làm</option><option value="inactive">Đã nghỉ</option></select></div>
          <div className="col-span-2"><label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Ghi chú</label><textarea className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-y min-h-[70px]" value={form.note} onChange={e => f('note', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose}>Bỏ qua</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} className="shadow-md bg-gradient-to-r from-primary to-blue-600 border-none">{saving ? 'Đang lưu...' : (employee ? 'Cập nhật' : 'Thêm mới')}</Button>
        </div>
      </div>
    </div>
  );
}
