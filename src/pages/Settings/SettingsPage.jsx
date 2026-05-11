import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { Store, Users, CreditCard, Bell, Palette, Printer, Globe, Lock, Database, HardDrive } from 'lucide-react';

const SECTIONS = [
  { key: 'store', label: 'Cửa hàng', icon: Store },
  { key: 'users', label: 'Quản lý người dùng', icon: Users },
  { key: 'payment', label: 'Thanh toán', icon: CreditCard },
  { key: 'notification', label: 'Thông báo', icon: Bell },
  { key: 'display', label: 'Giao diện', icon: Palette },
  { key: 'printer', label: 'Máy in', icon: Printer },
  { key: 'pos', label: 'Bán hàng', icon: Globe },
  { key: 'security', label: 'Bảo mật', icon: Lock },
  { key: 'data', label: 'Dữ liệu', icon: Database },
  { key: 'backup', label: 'Sao lưu', icon: HardDrive },
];

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {desc && <div className="text-xs text-gray-400 mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button onClick={() => setOn(!on)} className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${on ? 'bg-primary' : 'bg-gray-300'}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState('store');
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-800 m-0">Thiết lập</h1>
      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <div className="w-[240px] shrink-0 bg-white border border-border rounded-lg overflow-hidden">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setSection(s.key)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors cursor-pointer ${section === s.key ? 'bg-blue-50 text-primary font-medium border-l-[3px] border-l-primary' : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-l-transparent'}`}>
                <Icon size={18} />{s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-border rounded-lg p-6">
          {section === 'store' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Thông tin cửa hàng</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-600 mb-1 block">Tên cửa hàng</label><input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" defaultValue="Tiko BizPOS" /></div>
                <div><label className="text-sm text-gray-600 mb-1 block">Mã cửa hàng</label><input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50" readOnly defaultValue="TIKO001" /></div>
                <div><label className="text-sm text-gray-600 mb-1 block">Điện thoại</label><input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" defaultValue="1900 0000" /></div>
                <div><label className="text-sm text-gray-600 mb-1 block">Email</label><input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" defaultValue="admin@tiko.vn" /></div>
                <div className="col-span-2"><label className="text-sm text-gray-600 mb-1 block">Địa chỉ</label><input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" defaultValue="123 Nguyễn Huệ, Q.1, TP.HCM" /></div>
              </div>
            </div>
          )}
          {section === 'display' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Giao diện</h2>
              <SettingRow label="Chế độ tối" desc="Sử dụng giao diện tối cho ứng dụng">
                <button onClick={toggleDarkMode} className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${darkMode ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow ${darkMode ? 'left-5' : 'left-0.5'}`} />
                </button>
              </SettingRow>
              <SettingRow label="Hiển thị ảnh sản phẩm" desc="Hiện ảnh thumbnail trong danh sách hàng hóa"><Toggle defaultChecked /></SettingRow>
              <SettingRow label="Sidebar thu gọn" desc="Thu gọn sidebar khi không cần thiết"><Toggle /></SettingRow>
            </div>
          )}
          {section === 'notification' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Thông báo</h2>
              <SettingRow label="Thông báo đơn hàng mới" desc="Nhận thông báo khi có đơn hàng mới"><Toggle defaultChecked /></SettingRow>
              <SettingRow label="Thông báo hết hàng" desc="Nhận thông báo khi sản phẩm hết hàng"><Toggle defaultChecked /></SettingRow>
              <SettingRow label="Âm thanh thông báo" desc="Phát âm thanh khi có thông báo mới"><Toggle /></SettingRow>
            </div>
          )}
          {section === 'security' && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Bảo mật</h2>
              <SettingRow label="Xác thực 2 lớp" desc="Yêu cầu xác thực OTP khi đăng nhập"><Toggle /></SettingRow>
              <SettingRow label="Tự động đăng xuất" desc="Tự động đăng xuất sau 30 phút không hoạt động"><Toggle defaultChecked /></SettingRow>
              <SettingRow label="Ghi log hoạt động" desc="Lưu lại tất cả hoạt động trong hệ thống"><Toggle defaultChecked /></SettingRow>
            </div>
          )}
          {!['store','display','notification','security'].includes(section) && (
            <div className="text-center py-16 text-gray-300">
              <div className="text-4xl mb-3">⚙️</div>
              <div className="text-sm">Phần cài đặt "{SECTIONS.find(s => s.key === section)?.label}" đang được phát triển</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
