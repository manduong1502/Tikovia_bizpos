import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { Store, Users, CreditCard, Bell, Palette, Printer, Globe, Lock, Database, HardDrive, Settings as SettingsIcon } from 'lucide-react';

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
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 -mx-2 rounded-lg transition-colors">
      <div>
        <div className="text-sm font-bold text-gray-800">{label}</div>
        {desc && <div className="text-xs font-medium text-gray-500 mt-1">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button onClick={() => setOn(!on)} className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border-none shadow-inner ${on ? 'bg-primary' : 'bg-gray-200'}`}>
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${on ? 'left-5.5' : 'left-0.5'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState('store');
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <div className="flex flex-col gap-6 animate-page-in p-3 sm:p-6 max-w-full overflow-x-hidden">
      <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Thiết lập</h1>
      <div className="flex flex-col lg:flex-row gap-6 items-start max-w-full">
        {/* Sidebar */}
        <div className="w-full lg:w-[260px] shrink-0 bg-white border border-gray-100 rounded-xl overflow-x-auto shadow-sm flex lg:flex-col py-2 custom-scrollbar max-w-full">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setSection(s.key)} className={`w-auto lg:w-full flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 text-xs sm:text-[13px] transition-all cursor-pointer border-none text-left whitespace-nowrap shrink-0 lg:shrink ${section === s.key ? 'bg-blue-50/50 text-primary font-bold lg:border-l-[3px] lg:border-l-primary border-b-[3px] border-b-primary lg:border-b-0' : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-800 lg:border-l-[3px] lg:border-l-transparent border-b-[3px] border-b-transparent lg:border-b-0'}`}>
                <Icon size={18} className={section === s.key ? 'text-primary' : 'text-gray-400'} />{s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 sm:p-8 shadow-sm min-h-[600px] max-w-full w-full">
          {section === 'store' && (
            <div className="animate-fade-in max-w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Thông tin cửa hàng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-gray-50/50 p-4 sm:p-6 rounded-xl border border-gray-100">
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Tên cửa hàng</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="Tiko BizPOS" /></div>
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Mã cửa hàng</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-bold text-gray-500 bg-gray-100 cursor-not-allowed" readOnly defaultValue="TIKO001" /></div>
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Điện thoại</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="1900 0000" /></div>
                <div><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Email</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="admin@tiko.vn" /></div>
                <div className="sm:col-span-2"><label className="text-xs sm:text-[13px] font-bold text-gray-700 mb-1.5 block">Địa chỉ</label><input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] font-medium text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm bg-white" defaultValue="123 Nguyễn Huệ, Q.1, TP.HCM" /></div>
              </div>
            </div>
          )}
          {section === 'display' && (
            <div className="animate-fade-in max-w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Giao diện</h2>
              <div className="bg-gray-50/50 p-4 sm:p-6 rounded-xl border border-gray-100 flex flex-col gap-2">
                <SettingRow label="Chế độ tối" desc="Sử dụng giao diện tối cho ứng dụng">
                  <button onClick={toggleDarkMode} className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border-none shadow-inner ${darkMode ? 'bg-primary' : 'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${darkMode ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </SettingRow>
                <SettingRow label="Hiển thị ảnh sản phẩm" desc="Hiện ảnh thumbnail trong danh sách hàng hóa"><Toggle defaultChecked /></SettingRow>
                <SettingRow label="Sidebar thu gọn" desc="Thu gọn sidebar khi không cần thiết"><Toggle /></SettingRow>
              </div>
            </div>
          )}
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
          {section === 'security' && (
            <div className="animate-fade-in max-w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Bảo mật</h2>
              <div className="bg-gray-50/50 p-4 sm:p-6 rounded-xl border border-gray-100 flex flex-col gap-2">
                <SettingRow label="Xác thực 2 lớp" desc="Yêu cầu xác thực OTP khi đăng nhập"><Toggle /></SettingRow>
                <SettingRow label="Tự động đăng xuất" desc="Tự động đăng xuất sau 30 phút không hoạt động"><Toggle defaultChecked /></SettingRow>
                <SettingRow label="Ghi log hoạt động" desc="Lưu lại tất cả hoạt động trong hệ thống"><Toggle defaultChecked /></SettingRow>
              </div>
            </div>
          )}
          {!['store','display','notification','security'].includes(section) && (
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
    </div>
  );
}
