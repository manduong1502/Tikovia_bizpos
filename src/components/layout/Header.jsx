import { Link } from 'react-router-dom';
import { Truck, HelpCircle, MessageSquare, Bell, Settings, Menu, X } from 'lucide-react';

export default function Header({ mobileMenuOpen, setMobileMenuOpen }) {
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
        
        <div className="relative flex items-center">
          <button className="bg-transparent border-none cursor-pointer text-gray-500 flex items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all hover:bg-gray-50 hover:text-primary relative" title="Thông báo">
            <Bell size={20} />
            <span className="absolute top-1 right-1 sm:right-1.5 bg-red-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white">0</span>
          </button>
        </div>
        
        <button className="hidden sm:flex bg-transparent border-none cursor-pointer text-gray-500 items-center justify-center p-2 rounded-xl transition-all hover:bg-gray-50 hover:text-primary" title="Cài đặt">
          <Settings size={20} />
        </button>
        
        <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer ml-1 sm:ml-2 hover:bg-gray-50 p-1 sm:p-1.5 rounded-xl transition-colors">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-cyan-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-sm">A</div>
          <div className="hidden sm:flex flex-col items-start pr-1">
            <span className="text-[13px] text-gray-800 font-bold leading-tight">Admin</span>
            <span className="text-[11px] text-gray-400 font-medium">Quản lý</span>
          </div>
        </div>
      </div>
    </header>
  );
}
