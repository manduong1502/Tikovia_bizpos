import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { customerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, X } from 'lucide-react';

export default function CustomerModal({ open, onClose, customer = null, onSaved }) {
  const isEdit = !!customer;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', phone: '', phone2: '', email: '', address: '',
    birthday: '', gender: '', facebook: '', note: '', group: '',
    tax_name: '', tax_code: '', tax_address: '', customer_type: 'personal',
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '', code: customer.code || '', phone: customer.phone || '',
        phone2: '', email: customer.email || '', address: customer.address || '',
        birthday: '', gender: '', facebook: '', note: customer.note || '', group: '',
        tax_name: '', tax_code: '', tax_address: '', customer_type: 'personal',
      });
    } else {
      setForm({ name: '', code: '', phone: '', phone2: '', email: '', address: '', birthday: '', gender: '', facebook: '', note: '', group: '', tax_name: '', tax_code: '', tax_address: '', customer_type: 'personal' });
    }
  }, [customer, open]);

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return; }
    setSaving(true);
    try {
      const data = { name: form.name, phone: form.phone, email: form.email, address: form.address, note: form.note };
      if (isEdit) {
        await customerAPI.update(customer.id, data);
        toast.success('Cập nhật khách hàng thành công');
      } else {
        await customerAPI.create(data);
        toast.success('Tạo khách hàng thành công');
      }
      onSaved?.();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  const F = ({ label, required, children }) => (
    <div>
      <label className="text-sm text-gray-600 mb-1 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
  const inp = (key, placeholder, type = 'text') => (
    <input type={type} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors" value={form[key]} onChange={e => u(key, e.target.value)} placeholder={placeholder} />
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Sửa khách hàng' : 'Tạo khách hàng'} size="lg"
      footer={<><Button onClick={onClose} icon={<X size={14} />}>Bỏ qua</Button><Button variant="primary" onClick={handleSave} disabled={saving} icon={<Save size={14} />}>{saving ? 'Đang lưu...' : 'Lưu'}</Button></>}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <F label="Tên khách hàng" required>{inp('name', 'Nhập tên khách hàng')}</F>
          <F label="Mã khách hàng">{inp('code', 'Mã mặc định')}</F>
          <F label="Điện thoại 1">{inp('phone', 'Nhập số điện thoại', 'tel')}</F>
          <F label="Điện thoại 2">{inp('phone2', 'Nhập số điện thoại', 'tel')}</F>
          <F label="Sinh nhật">{inp('birthday', '', 'date')}</F>
          <F label="Giới tính">
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" value={form.gender} onChange={e => u('gender', e.target.value)}>
              <option value="">Chọn giới tính</option><option value="male">Nam</option><option value="female">Nữ</option>
            </select>
          </F>
          <F label="Email">{inp('email', 'email@gmail.com', 'email')}</F>
          <F label="Facebook">{inp('facebook', 'facebook.com/username')}</F>
        </div>

        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold px-2">Địa chỉ</legend>
          <F label="Địa chỉ">{inp('address', 'Nhập địa chỉ')}</F>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <F label="Khu vực"><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" placeholder="Chọn Tỉnh/Thành phố" /></F>
            <F label="Phường/Xã"><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" placeholder="Chọn Phường/Xã" /></F>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold px-2">Nhóm khách hàng, ghi chú</legend>
          <F label="Nhóm khách hàng"><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" placeholder="Chọn nhóm khách hàng" /></F>
          <div className="mt-3"><F label="Ghi chú"><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y min-h-[60px]" value={form.note} onChange={e => u('note', e.target.value)} placeholder="Nhập ghi chú" rows={2} /></F></div>
        </fieldset>

        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold px-2">Thông tin xuất hóa đơn</legend>
          <div className="flex gap-4 mb-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="ctype" checked={form.customer_type === 'personal'} onChange={() => u('customer_type', 'personal')} /> Cá nhân</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="ctype" checked={form.customer_type === 'business'} onChange={() => u('customer_type', 'business')} /> Tổ chức/ Hộ kinh doanh</label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Tên người mua">{inp('tax_name', 'Nhập tên người mua')}</F>
            <F label="Mã số thuế">
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" value={form.tax_code} onChange={e => u('tax_code', e.target.value)} placeholder="Nhập MST" />
                <Button size="sm" variant="primary" className="whitespace-nowrap text-xs">Tra cứu MST</Button>
              </div>
            </F>
          </div>
          <div className="mt-3"><F label="Địa chỉ">{inp('tax_address', 'Nhập địa chỉ')}</F></div>
        </fieldset>
      </div>
    </Modal>
  );
}
