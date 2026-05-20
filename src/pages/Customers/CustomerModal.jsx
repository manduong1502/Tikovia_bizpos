import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { customerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, X } from 'lucide-react';

const FormField = ({ label, required, children }) => (
  <div>
    <label className="text-sm font-bold text-gray-700 mb-1.5 block tracking-tight">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);

export default function CustomerModal({ open, onClose, customer = null, onSaved }) {
  const isEdit = !!customer;
  const [saving, setSaving] = useState(false);
  const [existingNames, setExistingNames] = useState([]);
  const [nameError, setNameError] = useState('');

  const [form, setForm] = useState({
    name: '', code: '', phone: '', email: '', address: '', note: '',
    customerType: 'Cá nhân', branch: 'Chi nhánh trung tâm',
    totalDebt: 0, totalSpent: 0, isActive: true,
  });

  useEffect(() => {
    if (open) {
      customerAPI.getAllSimple().then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setExistingNames(list.map(c => c.name.trim().toLowerCase()));
      }).catch(() => {});
    }
  }, [open]);

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

  const handleNameBlur = () => {
    const val = form.name.trim().toLowerCase();
    if (val) {
      const isDuplicate = existingNames.includes(val) && val !== (customer?.name || '').trim().toLowerCase();
      if (isDuplicate) {
        setNameError('Tên khách hàng đã tồn tại');
      } else {
        setNameError('');
      }
    } else {
      setNameError('Vui lòng nhập tên khách hàng');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return; }
    if (nameError) { toast.error('Tên khách hàng đã tồn tại'); return; }
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
        const res = await customerAPI.update(customer.id, data);
        toast.success('Cập nhật khách hàng thành công');
        onSaved?.(res);
      } else {
        const res = await customerAPI.create(data);
        toast.success('Tạo khách hàng thành công');
        onSaved?.(res);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu khách hàng');
    } finally { setSaving(false); }
  };

  const inp = (key, placeholder, type = 'text') => (
    <input type={type} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" value={form[key]} onChange={e => u(key, e.target.value)} placeholder={placeholder} />
  );

  const nameInput = (
    <div>
      <input 
        type="text" 
        className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors font-medium text-gray-800 ${nameError ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' : 'border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary/30'}`} 
        value={form.name} 
        onChange={e => { u('name', e.target.value); setNameError(''); }} 
        onBlur={handleNameBlur}
        placeholder="Nhập tên khách hàng" 
      />
      {nameError && <p className="text-red-500 text-[11px] font-bold mt-1.5">{nameError}</p>}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Sửa khách hàng' : 'Tạo khách hàng'} size="lg"
      footer={<><Button onClick={onClose} icon={<X size={14} />}>Bỏ qua</Button><Button variant="primary" onClick={handleSave} disabled={saving} icon={<Save size={14} />}>{saving ? 'Đang lưu...' : 'Lưu'}</Button></>}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-4 font-sans">
          <FormField label="Tên khách hàng" required>{nameInput}</FormField>
          <FormField label="Mã khách hàng">{inp('code', 'Mã mặc định')}</FormField>
          <FormField label="Điện thoại">{inp('phone', 'Nhập số điện thoại', 'tel')}</FormField>
          <FormField label="Email">{inp('email', 'email@gmail.com', 'email')}</FormField>
          
          <div className="md:col-span-2">
            <FormField label="Địa chỉ">{inp('address', 'Nhập địa chỉ')}</FormField>
          </div>

          <FormField label="Loại khách hàng">
            <select 
              className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white font-medium cursor-pointer text-gray-800" 
              value={form.customerType} 
              onChange={e => u('customerType', e.target.value)}
            >
              <option value="Cá nhân">Cá nhân</option>
              <option value="Công ty">Công ty</option>
            </select>
          </FormField>
          <FormField label="Chi nhánh">
            {inp('branch', 'Nhập chi nhánh')}
          </FormField>

          <FormField label="Nợ hiện tại">
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" 
              value={form.totalDebt} 
              onChange={e => u('totalDebt', e.target.value)} 
              placeholder="0" 
            />
          </FormField>
          <FormField label="Tổng bán">
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" 
              value={form.totalSpent} 
              onChange={e => u('totalSpent', e.target.value)} 
              placeholder="0" 
            />
          </FormField>

          <FormField label="Trạng thái">
            <select 
              className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white font-medium cursor-pointer text-gray-800" 
              value={form.isActive ? 'active' : 'inactive'} 
              onChange={e => u('isActive', e.target.value === 'active')}
            >
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Ghi chú">
              <textarea 
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors resize-y min-h-[80px] font-medium text-gray-800" 
                value={form.note} 
                onChange={e => u('note', e.target.value)} 
                placeholder="Nhập ghi chú khách hàng" 
                rows={3} 
              />
            </FormField>
          </div>
        </div>
      </div>
    </Modal>
  );
}
