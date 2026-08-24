import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { 
  Store, Users, CreditCard, Bell, Palette, Printer, Globe, Lock, Database, HardDrive, 
  Settings as SettingsIcon, Plus, Edit, Trash2, Shield, ShieldCheck, Smartphone, Monitor, 
  Laptop, CheckCircle2, AlertCircle, Clock, Mail, Phone, LockKeyhole, Search, RefreshCw 
} from 'lucide-react';
import { userAPI, authAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import UserModal from './UserModal';
import UserDevicesModal from './UserDevicesModal';
import toast from 'react-hot-toast';

const SECTIONS = [
  { key: 'store', label: 'Cửa hàng', icon: Store },
  { key: 'users', label: 'Quản lý tài khoản & Phân quyền', icon: Users },
  { key: 'security', label: 'Bảo mật & Thiết bị tin cậy', icon: Lock },
  { key: 'payment', label: 'Thanh toán', icon: CreditCard },
  { key: 'notification', label: 'Thông báo', icon: Bell },
  { key: 'display', label: 'Giao diện', icon: Palette },
  { key: 'printer', label: 'Máy in', icon: Printer },
  { key: 'pos', label: 'Bán hàng', icon: Globe },
  { key: 'data', label: 'Dữ liệu', icon: Database },
  { key: 'backup', label: 'Sao lưu', icon: HardDrive },
];

const ROLE_MAP = {
  ADMIN: { label: 'Quản trị viên', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  MANAGER: { label: 'Quản lý', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  STAFF: { label: 'Nhân viên bán hàng', color: 'bg-green-50 text-green-700 border-green-200' },
  CASHIER: { label: 'Thu ngân', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCOUNTANT: { label: 'Kế toán', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 -mx-2 rounded-lg transition-colors">
      <div>
        <div className="text-sm font-bold text-gray-800">{label}</div>
        {desc && <div className="text-xs font-medium text-gray-500 mt-1">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ defaultChecked = false, checked, onChange }) {
  const [internalOn, setInternalOn] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internalOn;

  const handleToggle = () => {
    if (isControlled) {
      onChange?.(!checked);
    } else {
      setInternalOn(!internalOn);
      onChange?.(!internalOn);
    }
  };

  return (
    <button 
      type="button"
      onClick={handleToggle} 
      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border-none shadow-inner ${on ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${on ? 'left-5.5' : 'left-0.5'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState('users');
  const currentUser = useAppStore(s => s.user);

  // Users management state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Device modal state
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [deviceUser, setDeviceUser] = useState(null);

  // Security tab state (My Devices)
  const [myDevices, setMyDevices] = useState([]);
  const [loadingMyDevices, setLoadingMyDevices] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await userAPI.getAll();
      setUsers(Array.isArray(res) ? res : (res?.users || []));
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách tài khoản');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchMyDevices = useCallback(async () => {
    setLoadingMyDevices(true);
    try {
      const res = await authAPI.getDevices();
      setMyDevices(Array.isArray(res) ? res : (res?.devices || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyDevices(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'users') {
      fetchUsers();
    } else if (section === 'security') {
      fetchMyDevices();
    }
  }, [section, fetchUsers, fetchMyDevices]);

  const handleDeleteUser = async (u) => {
    if (u.id === currentUser?.id) {
      toast.error('Bạn không thể xóa chính tài khoản đang đăng nhập');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.fullName || u.username}"?`)) return;

    try {
      await userAPI.delete(u.id);
      toast.success('Xóa tài khoản thành công');
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể xóa tài khoản');
    }
  };

  const handleToggleUserActive = async (u) => {
    if (u.id === currentUser?.id) {
      toast.error('Bạn không thể khóa tài khoản của chính mình');
      return;
    }

    try {
      const res = await userAPI.toggleActive(u.id);
      toast.success(res.message || 'Cập nhật trạng thái thành công');
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleRevokeMyDevice = async (deviceId, deviceName) => {
    if (!confirm(`Bạn có chắc muốn hủy tin cậy thiết bị "${deviceName}"?`)) return;

    setRevokingDeviceId(deviceId);
    try {
      await authAPI.revokeDevice(deviceId);
      toast.success('Đã hủy tin cậy thiết bị');
      fetchMyDevices();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi hủy thiết bị');
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (
      (u.fullName || '').toLowerCase().includes(term) ||
      (u.username || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.phone || '').toLowerCase().includes(term)
    );
  });

  const getDeviceIcon = (deviceName = '') => {
    const lower = deviceName.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android') || lower.includes('ios')) {
      return <Smartphone className="text-blue-500" size={18} />;
    }
    if (lower.includes('mac') || lower.includes('laptop')) {
      return <Laptop className="text-purple-500" size={18} />;
    }
    return <Monitor className="text-indigo-500" size={18} />;
  };

  const getRemainingDays = (trustedUntil) => {
    if (!trustedUntil) return 0;
    const diffMs = new Date(trustedUntil).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="flex flex-col gap-4 animate-page-in p-3 sm:p-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Cài đặt hệ thống</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start max-w-full">
        {/* Sidebar */}
        <div className="w-full lg:w-[270px] shrink-0 bg-white border border-gray-100 rounded-2xl overflow-x-auto shadow-sm flex lg:flex-col py-2 custom-scrollbar max-w-full">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = section === s.key;
            return (
              <button 
                key={s.key} 
                onClick={() => setSection(s.key)} 
                className={`w-auto lg:w-full flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 text-xs sm:text-[13px] transition-all cursor-pointer border-none text-left whitespace-nowrap shrink-0 lg:shrink ${
                  isActive 
                    ? 'bg-blue-50/70 text-primary font-bold lg:border-l-[3px] lg:border-l-primary border-b-[3px] border-b-primary lg:border-b-0' 
                    : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-800 lg:border-l-[3px] lg:border-l-transparent border-b-[3px] border-b-transparent lg:border-b-0'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-primary' : 'text-gray-400'} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 sm:p-7 shadow-sm min-h-[600px] max-w-full w-full">
          
          {/* USERS & ROLES SECTION */}
          {section === 'users' && (
            <div className="animate-fade-in flex flex-col gap-5 max-w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 tracking-tight m-0 flex items-center gap-2">
                    <Users className="text-primary" size={22} />
                    Quản lý tài khoản & Phân quyền
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Cấu hình tài khoản, phân quyền vai trò và Gmail nhận mã OTP xác thực 2 lớp cho từng nhân viên.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="primary" 
                    icon={<Plus size={16} />} 
                    onClick={() => {
                      setSelectedUser(null);
                      setUserModalOpen(true);
                    }}
                    className="shadow-md bg-gradient-to-r from-primary to-blue-600 text-xs sm:text-sm"
                  >
                    Thêm tài khoản
                  </Button>
                </div>
              </div>

              {/* Search and stats bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search size={15} className="absolute left-3.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, username, email..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
                <button
                  onClick={fetchUsers}
                  className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer bg-white flex items-center gap-1.5 text-xs font-semibold"
                  title="Tải lại danh sách"
                >
                  <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="border border-gray-100 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4 text-left">Tên đăng nhập</th>
                      <th className="py-3 px-4 text-left">Họ và tên</th>
                      <th className="py-3 px-4 text-left">Gmail nhận mã OTP (2FA)</th>
                      <th className="py-3 px-4 text-left">Vai trò</th>
                      <th className="py-3 px-4 text-left">Thiết bị tin cậy</th>
                      <th className="py-3 px-4 text-left">Trạng thái</th>
                      <th className="py-3 px-4 text-center w-[120px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span className="text-xs">Đang tải danh sách tài khoản...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          Không tìm thấy tài khoản nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: 'bg-gray-100 text-gray-700 border-gray-200' };
                        const deviceCount = u._count?.trustedDevices !== undefined ? u._count.trustedDevices : (u.trustedDevices?.length || 0);
                        return (
                          <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-gray-800">
                              {u.username}
                              {u.id === currentUser?.id && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">
                                  Bạn
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-700">{u.fullName || u.name}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Mail size={13} className="text-primary shrink-0" />
                                <span className="font-mono">{u.email || 'Chưa thiết lập'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleInfo.color}`}>
                                {roleInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => {
                                  setDeviceUser(u);
                                  setDevicesModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-primary border border-gray-200 transition-colors cursor-pointer"
                                title="Xem và quản lý thiết bị tin cậy"
                              >
                                <Smartphone size={13} />
                                <span>{deviceCount} thiết bị</span>
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleUserActive(u)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-all ${
                                  u.isActive 
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200' 
                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                                }`}
                                title={u.isActive ? 'Bấm để khóa tài khoản' : 'Bấm để mở khóa tài khoản'}
                              >
                                {u.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setUserModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-primary transition-colors cursor-pointer border-none bg-transparent"
                                  title="Chỉnh sửa tài khoản"
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer border-none bg-transparent"
                                  title="Xóa tài khoản"
                                  disabled={u.id === currentUser?.id}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECURITY & TRUSTED DEVICES SECTION */}
          {section === 'security' && (
            <div className="animate-fade-in flex flex-col gap-6 max-w-full">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 tracking-tight m-0 flex items-center gap-2">
                  <ShieldCheck className="text-primary" size={22} />
                  Bảo mật & Thiết bị tin cậy
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Quản lý cơ chế xác thực 2 lớp (2FA qua Gmail) và danh sách thiết bị tin cậy trong 30 ngày của bạn.
                </p>
              </div>

              {/* 2FA Banner */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-extrabold text-gray-800">
                        Xác thực 2 lớp qua Gmail (2FA)
                      </span>
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[11px] font-bold">
                        Đang bảo vệ
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-2xl">
                      Mỗi khi đăng nhập trên trình duyệt hoặc máy tính lạ, hệ thống sẽ tự động gửi mã OTP 6 số về Gmail của bạn. Sau khi nhập đúng mã OTP, thiết bị sẽ được lưu tin cậy trong <b>30 ngày</b> mà không cần hỏi lại.
                    </p>
                  </div>
                </div>
              </div>

              {/* My Trusted Devices List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-gray-800 m-0 flex items-center gap-2">
                    <Monitor size={18} className="text-primary" />
                    Thiết bị tin cậy của tôi ({myDevices.length})
                  </h3>
                  <button
                    onClick={fetchMyDevices}
                    className="p-1.5 text-xs text-gray-500 hover:text-primary flex items-center gap-1 border-none bg-transparent cursor-pointer font-semibold"
                  >
                    <RefreshCw size={13} className={loadingMyDevices ? 'animate-spin' : ''} />
                    Làm mới
                  </button>
                </div>

                {loadingMyDevices ? (
                  <div className="py-12 text-center text-gray-400">
                    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs">Đang tải thiết bị tin cậy...</span>
                  </div>
                ) : myDevices.length === 0 ? (
                  <div className="py-10 bg-gray-50/60 rounded-xl border border-gray-100 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                    <Monitor size={28} className="text-gray-300" />
                    <span className="text-xs font-medium">Chưa có thiết bị tin cậy nào được lưu</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    {myDevices.map(d => {
                      const remainingDays = getRemainingDays(d.trustedUntil);
                      return (
                        <div key={d.id} className="p-4 bg-white hover:bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                          <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                              {getDeviceIcon(d.deviceName)}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-gray-800">
                                  {d.deviceName || 'Trình duyệt Web'}
                                </span>
                                <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold rounded-full">
                                  Tin cậy 30 ngày
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Globe size={13} className="text-gray-400" />
                                  IP: {d.ipAddress || '---'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={13} className="text-gray-400" />
                                  Còn {remainingDays} ngày tin cậy
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400">
                                Đăng nhập gần nhất: {new Date(d.lastUsedAt || d.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </div>

                          <div className="sm:self-center shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeMyDevice(d.id, d.deviceName)}
                              disabled={revokingDeviceId === d.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Trash2 size={14} />
                              {revokingDeviceId === d.id ? 'Đang hủy...' : 'Hủy tin cậy'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STORE INFO SECTION */}
          {section === 'store' && (
            <div className="animate-fade-in max-w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Thông tin cửa hàng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 bg-gray-50/50 p-4 sm:p-6 rounded-xl border border-gray-100">
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Tên cửa hàng</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="Tiko BizPOS" /></div>
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Mã cửa hàng</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-bold text-gray-500 bg-gray-100 cursor-not-allowed" readOnly defaultValue="TIKO001" /></div>
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Điện thoại</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="1900 0000" /></div>
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Email</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="admin@tiko.vn" /></div>
                <div className="sm:col-span-2"><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Địa chỉ</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="123 Nguyễn Huệ, Q.1, TP.HCM" /></div>
              </div>
            </div>
          )}

          {/* DISPLAY SECTION */}
          {section === 'display' && (
            <div className="animate-fade-in max-w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Giao diện</h2>
              <div className="bg-gray-50/50 p-4 sm:p-6 rounded-xl border border-gray-100 flex flex-col gap-2">
                <SettingRow label="Hiển thị ảnh sản phẩm" desc="Hiện ảnh thumbnail trong danh sách hàng hóa"><Toggle defaultChecked /></SettingRow>
                <SettingRow label="Sidebar thu gọn" desc="Thu gọn sidebar khi không cần thiết"><Toggle /></SettingRow>
              </div>
            </div>
          )}

          {/* NOTIFICATION SECTION */}
          {section === 'notification' && (
            <div className="animate-fade-in max-w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Thông báo</h2>
              <div className="bg-gray-50/50 p-4 sm:p-6 rounded-xl border border-gray-100 flex flex-col gap-2">
                <SettingRow label="Thông báo đơn hàng mới" desc="Nhận thông báo khi có đơn hàng mới"><Toggle defaultChecked /></SettingRow>
                <SettingRow label="Thông báo hết hàng" desc="Nhận thông báo khi sản phẩm hết hàng"><Toggle defaultChecked /></SettingRow>
                <SettingRow label="Âm thanh thông báo" desc="Phát âm thanh khi có thông báo mới"><Toggle /></SettingRow>
              </div>
            </div>
          )}

          {/* OTHER PLACEHOLDER SECTIONS */}
          {!['store', 'users', 'security', 'display', 'notification'].includes(section) && (
            <div className="text-center py-16 sm:py-24 text-gray-400 animate-fade-in flex flex-col items-center max-w-full">
              <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                <SettingsIcon size={40} className="text-gray-300 animate-[spin_4s_linear_infinite]" />
              </div>
              <div className="text-base sm:text-lg font-bold text-gray-600 mb-2">Đang phát triển</div>
              <div className="text-xs sm:text-sm font-medium text-gray-500">Phần cài đặt "{SECTIONS.find(s => s.key === section)?.label}" sẽ sớm ra mắt</div>
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      <UserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSaved={fetchUsers}
        user={selectedUser}
      />

      <UserDevicesModal
        open={devicesModalOpen}
        onClose={() => setDevicesModalOpen(false)}
        user={deviceUser}
      />
    </div>
  );
}
