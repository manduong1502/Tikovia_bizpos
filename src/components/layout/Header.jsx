import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Truck, HelpCircle, MessageSquare, Bell, Settings, Menu, X, LogOut } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAppStore } from '../../stores/appStore';

export default function Header({ mobileMenuOpen, setMobileMenuOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  
  const user = useAppStore(s => s.user);
  const logout = useAppStore(s => s.logout);

  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useSocket() || {
    notifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
    deleteNotification: () => {}
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Đăng xuất thành công');
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md flex items-center px-3 sm:px-6 border-b border-gray-100 sticky top-0 z-[100] shadow-sm max-w-full">
      <div className="flex items-center gap-2 sm:gap-3 mr-4 sm:mr-8 cursor-pointer no-underline group">
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="md:hidden bg-transparent border-none cursor-pointer text-gray-700 hover:text-primary p-1 rounded-lg transition-colors flex items-center justify-center mr-0.5"
          title="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link className="flex items-center gap-2 sm:gap-3 no-underline group" to="/dashboard">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center text-white font-extrabold text-[14px] sm:text-[15px] shadow-sm group-hover:shadow-md transition-shadow">T</div>
          <span className="text-[15px] sm:text-[16px] font-bold text-gray-800 tracking-tight group-hover:text-primary transition-colors">Tiko BizPOS</span>
        </Link>
      </div>
      
      <div className="ml-auto flex items-center gap-1 sm:gap-2.5">
        <button className="hidden lg:flex bg-transparent border-none cursor-pointer text-gray-500 text-[13px] font-medium items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-50 hover:text-primary" title="Giao hàng">
          <Truck size={16} /> Giao hàng
        </button>
        <button className="hidden lg:flex bg-transparent border-none cursor-pointer text-gray-500 text-[13px] font-medium items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-50 hover:text-primary" title="Hỗ trợ">
          <HelpCircle size={16} /> Hỗ trợ
        </button>
        <button className="hidden md:flex bg-transparent border-none cursor-pointer text-gray-500 text-[13px] font-medium items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-50 hover:text-primary" title="Góp ý">
          <MessageSquare size={16} /> Góp ý
        </button>
        
        <div className="hidden md:block h-6 w-[1px] bg-gray-200 mx-1"></div>
        
        <div ref={notifRef} className="relative flex items-center">
          <button 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="bg-transparent border-none cursor-pointer text-gray-500 flex items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all hover:bg-gray-50 hover:text-primary relative" 
            title="Thông báo"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 sm:right-1.5 bg-red-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-[110] animate-fadeIn max-h-[80vh] flex flex-col overflow-hidden max-w-[calc(100vw-24px)]">
              <div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-gray-800 tracking-tight">Thông báo</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Đánh dấu đọc tất cả
                  </button>
                )}
              </div>
              <div className="overflow-y-auto max-h-[50vh] custom-scrollbar divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 font-medium flex flex-col items-center justify-center gap-2">
                    <Bell size={32} className="text-gray-300" />
                    <span className="text-xs">Không có thông báo nào</span>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className={`p-3 flex gap-2 items-start transition-colors cursor-pointer relative group ${!n.isRead ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50'}`}
                    >
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1.5" />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className={`text-[12px] tracking-tight ${!n.isRead ? 'font-extrabold text-gray-800' : 'font-bold text-gray-700'}`}>
                          {n.title}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium leading-normal break-words">
                          {n.message}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold mt-1">
                          {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 text-gray-400 hover:text-red-600 rounded-md transition-all cursor-pointer border-none bg-transparent"
                        title="Xóa thông báo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <button className="hidden sm:flex bg-transparent border-none cursor-pointer text-gray-500 items-center justify-center p-2 rounded-xl transition-all hover:bg-gray-50 hover:text-primary" title="Cài đặt">
          <Settings size={20} />
        </button>
        
        {/* User Profile Dropdown */}
        <div ref={dropdownRef} className="relative">
          <div 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer ml-1 sm:ml-2 hover:bg-gray-50 p-1 sm:p-1.5 rounded-xl transition-colors select-none"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-cyan-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-sm">
              {(user?.fullName || 'Admin')[0].toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-start pr-1">
              <span className="text-[13px] text-gray-800 font-bold leading-tight">{user?.fullName || 'Admin'}</span>
              <span className="text-[11px] text-gray-400 font-medium">
                {user?.role === 'ADMIN' ? 'Quản lý' : (user?.role || 'Nhân viên')}
              </span>
            </div>
          </div>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-[110] animate-fadeIn">
              <div className="px-4 py-2 border-b border-gray-50">
                <p className="text-xs text-gray-400 font-medium">Tài khoản</p>
                <p className="text-[13px] font-bold text-gray-800">{user?.fullName || 'Admin'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer font-semibold"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
