import { Link } from 'react-router-dom';
import { Truck, HelpCircle, MessageSquare, Bell, Settings } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-14 bg-white/80 backdrop-blur-md flex items-center px-6 border-b border-gray-100 sticky top-0 z-[100] shadow-sm">
      <Link className="flex items-center gap-3 mr-8 cursor-pointer no-underline group" to="/dashboard">
        <div className="w-9 h-9 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center text-white font-extrabold text-[15px] shadow-sm group-hover:shadow-md transition-shadow">T</div>
        <span className="text-[16px] font-bold text-gray-800 tracking-tight group-hover:text-primary transition-colors">Tiko BizPOS</span>
      </Link>
      
      <div className="ml-auto flex items-center gap-2.5">
        <button className="bg-transparent border-none cursor-pointer text-gray-500 text-[13px] font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-50 hover:text-primary" title="Giao hàng">
          <Truck size={16} /> Giao hàng
        </button>
        <button className="bg-transparent border-none cursor-pointer text-gray-500 text-[13px] font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-50 hover:text-primary" title="Hỗ trợ">
          <HelpCircle size={16} /> Hỗ trợ
        </button>
        <button className="bg-transparent border-none cursor-pointer text-gray-500 text-[13px] font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-50 hover:text-primary" title="Góp ý">
          <MessageSquare size={16} /> Góp ý
        </button>
        
        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>
        
        <div className="relative flex items-center">
          <button className="bg-transparent border-none cursor-pointer text-gray-500 flex items-center justify-center p-2 rounded-xl transition-all hover:bg-gray-50 hover:text-primary relative" title="Thông báo">
            <Bell size={20} />
            <span className="absolute top-1 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white">0</span>
          </button>
        </div>
        
        <button className="bg-transparent border-none cursor-pointer text-gray-500 flex items-center justify-center p-2 rounded-xl transition-all hover:bg-gray-50 hover:text-primary" title="Cài đặt">
          <Settings size={20} />
        </button>
        
        <div className="flex items-center gap-2.5 cursor-pointer ml-2 hover:bg-gray-50 p-1.5 rounded-xl transition-colors">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-cyan-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">A</div>
          <div className="hidden sm:flex flex-col items-start pr-1">
            <span className="text-[13px] text-gray-800 font-bold leading-tight">Admin</span>
            <span className="text-[11px] text-gray-400 font-medium">Quản lý</span>
          </div>
        </div>
      </div>
    </header>
  );
}
