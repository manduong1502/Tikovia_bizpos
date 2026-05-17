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
    name: '', code: '', phone: '', email: '', address: '', note: '',
    customerType: 'Cá nhân', branch: 'Chi nhánh trung tâm',
    totalDebt: 0, totalSpent: 0, isActive: true,
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        code: customer.code || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        note: customer.note || '',
        customerType: customer.customerType || 'Cá nhân',
        branch: customer.branch || 'Chi nhánh trung tâm',
        totalDebt: customer.totalDebt || customer.debt || 0,
        totalSpent: customer.totalSpent || customer.total_spent || 0,
        isActive: customer.isActive !== undefined ? customer.isActive : true,
      });
    } else {
      setForm({
        name: '', code: '', phone: '', email: '', address: '', note: '',
        customerType: 'Cá nhân', branch: 'Chi nhánh trung tâm',
        totalDebt: 0, totalSpent: 0, isActive: true,
      });
    }
  }, [customer, open]);

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        note: form.note.trim() || null,
        customerType: form.customerType,
        branch: form.branch.trim() || 'Chi nhánh trung tâm',
        totalDebt: Number(form.totalDebt) || 0,
        totalSpent: Number(form.totalSpent) || 0,
        isActive: form.isActive,
      };
      if (isEdit) {
        await customerAPI.update(customer.id, data);
        toast.success('Cập nhật khách hàng thành công');
      } else {
        await customerAPI.create(data);
        toast.success('Tạo khách hàng thành công');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu khách hàng');
    } finally { setSaving(false); }
  };

  const F = ({ label, required, children }) => (
    <div>
      <label className="text-sm font-bold text-gray-700 mb-1.5 block tracking-tight">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
  const inp = (key, placeholder, type = 'text') => (
    <input type={type} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" value={form[key]} onChange={e => u(key, e.target.value)} placeholder={placeholder} />
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Sửa khách hàng' : 'Tạo khách hàng'} size="lg"
      footer={<><Button onClick={onClose} icon={<X size={14} />}>Bỏ qua</Button><Button variant="primary" onClick={handleSave} disabled={saving} icon={<Save size={14} />}>{saving ? 'Đang lưu...' : 'Lưu'}</Button></>}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 font-sans">
          <F label="Tên khách hàng" required>{inp('name', 'Nhập tên khách hàng')}</F>
          <F label="Mã khách hàng">{inp('code', 'Mã mặc định')}</F>
          <F label="Điện thoại">{inp('phone', 'Nhập số điện thoại', 'tel')}</F>
          <F label="Email">{inp('email', 'email@gmail.com', 'email')}</F>
          
          <div className="md:col-span-2">
            <F label="Địa chỉ">{inp('address', 'Nhập địa chỉ')}</F>
          </div>

          <F label="Loại khách hàng">
            <select 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white font-medium cursor-pointer text-gray-800" 
              value={form.customerType} 
              onChange={e => u('customerType', e.target.value)}
            >
              <option value="Cá nhân">Cá nhân</option>
              <option value="Công ty">Công ty</option>
            </select>
          </F>
          <F label="Chi nhánh">
            {inp('branch', 'Nhập chi nhánh')}
          </F>

          <F label="Nợ hiện tại">
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" 
              value={form.totalDebt} 
              onChange={e => u('totalDebt', e.target.value)} 
              placeholder="0" 
            />
          </F>
          <F label="Tổng bán">
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" 
              value={form.totalSpent} 
              onChange={e => u('totalSpent', e.target.value)} 
              placeholder="0" 
            />
          </F>

          <F label="Trạng thái">
            <select 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white font-medium cursor-pointer text-gray-800" 
              value={form.isActive ? 'active' : 'inactive'} 
              onChange={e => u('isActive', e.target.value === 'active')}
            >
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </F>

          <div className="md:col-span-2">
            <F label="Ghi chú">
              <textarea 
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors resize-y min-h-[80px] font-medium text-gray-800" 
                value={form.note} 
                onChange={e => u('note', e.target.value)} 
                placeholder="Nhập ghi chú khách hàng" 
                rows={3} 
              />
            </F>
          </div>
        </div>
      </div>
    </Modal>
  );
}
