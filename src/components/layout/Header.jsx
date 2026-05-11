import { Link } from 'react-router-dom';
import { Truck, HelpCircle, MessageSquare, Bell, Settings } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-12 bg-white flex items-center px-5 border-b border-gray-200 sticky top-0 z-[100]">
      <Link className="flex items-center gap-2 mr-6 cursor-pointer no-underline" to="/dashboard">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-green-500 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">T</div>
        <span className="text-[15px] font-bold text-primary tracking-tight">Tiko BizPOS</span>
      </Link>
      
      <div className="ml-auto flex items-center gap-3">
        <button className="bg-transparent border-none cursor-pointer text-gray-500 text-[13px] flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-gray-100 hover:text-gray-800" title="Giao hàng">
          <Truck size={16} /> Giao hàng
        </button>
        <button className="bg-transparent border-none cursor-pointer text-gray-500 text-[13px] flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-gray-100 hover:text-gray-800" title="Hỗ trợ">
          <HelpCircle size={15} /> Hỗ trợ
        </button>
        <button className="bg-transparent border-none cursor-pointer text-gray-500 text-[13px] flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-gray-100 hover:text-gray-800" title="Góp ý">
          <MessageSquare size={15} /> Góp ý
        </button>
        
        <div className="relative">
          <button className="bg-transparent border-none cursor-pointer text-gray-500 flex items-center justify-center p-1.5 rounded transition-colors hover:bg-gray-100 hover:text-gray-800 relative" title="Thông báo">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center">0</span>
          </button>
        </div>
        
        <button className="bg-transparent border-none cursor-pointer text-gray-500 flex items-center justify-center p-1.5 rounded transition-colors hover:bg-gray-100 hover:text-gray-800" title="Cài đặt">
          <Settings size={18} />
        </button>
        
        <div className="flex items-center gap-1.5 cursor-pointer ml-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">A</div>
          <span className="text-[13px] text-gray-700 font-medium hidden sm:block">Admin</span>
        </div>
      </div>
    </header>
  );
}
