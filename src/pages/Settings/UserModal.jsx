import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Dropdown from '../../components/ui/Dropdown';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Shield, Eye, EyeOff } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Quản trị viên (Toàn quyền)' },
  { value: 'MANAGER', label: 'Quản lý cửa hàng' },
  { value: 'STAFF', label: 'Nhân viên bán hàng' },
  { value: 'CASHIER', label: 'Thu ngân' },
  { value: 'ACCOUNTANT', label: 'Kế toán' },
];

export default function UserModal({ open, onClose, onSaved, user }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'STAFF',
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(user?.id);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        password: '',
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'STAFF',
        isActive: user.isActive !== undefined ? user.isActive : true,
      });
    } else {
      setFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'STAFF',
        isActive: true,
      });
    }
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast.error('Vui lòng nhập tên đăng nhập');
      return;
    }
    if (!isEditing && !formData.password) {
      toast.error('Vui lòng nhập mật khẩu cho tài khoản mới');
      return;
    }
    if (!formData.fullName.trim()) {
      toast.error('Vui lòng nhập họ tên nhân viên');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Vui lòng nhập email hợp lệ (Gmail để nhận mã OTP bảo mật 2FA)');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await userAPI.update(user.id, payload);
        toast.success('Cập nhật tài khoản thành công');
      } else {
        await userAPI.create(formData);
        toast.success('Thêm tài khoản nhân viên mới thành công');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi lưu tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Sửa thông tin tài khoản' : 'Thêm tài khoản nhân viên'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <User size={14} className="text-gray-400" />
            Tên đăng nhập <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value })}
            placeholder="vd: nguyenvana"
            disabled={isEditing}
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Lock size={14} className="text-gray-400" />
            {isEditing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'} <span className="text-red-500">{!isEditing && '*'}</span>
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEditing ? 'Nhập mật khẩu mới...' : 'Mật khẩu đăng nhập'}
              required={!isEditing}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer flex items-center justify-center focus:outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">
            Họ và tên nhân viên <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.fullName}
            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="vd: Nguyễn Văn A"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Mail size={14} className="text-primary" />
            Gmail nhận mã xác thực OTP (2FA) <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="vd: nhanvien@gmail.com"
            required
          />
          <p className="text-[11px] text-gray-500 mt-1">
            * Khi đăng nhập trên thiết bị lạ, hệ thống sẽ gửi mã OTP 6 số vào Gmail này.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Phone size={14} className="text-gray-400" />
            Số điện thoại
          </label>
          <Input
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="vd: 0987654321"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Shield size={14} className="text-gray-400" />
            Phân quyền vai trò (Role)
          </label>
          <Dropdown
            value={formData.role}
            options={ROLE_OPTIONS}
            onChange={val => setFormData({ ...formData, role: val })}
          />
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700">Trạng thái hoạt động</span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
            />
            {formData.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
          </label>
        </div>
      </form>
    </Modal>
  );
}
