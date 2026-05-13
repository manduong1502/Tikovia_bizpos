import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, Plus, X, Menu, User, LogOut } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useNavigate } from 'react-router-dom';

export default function POSHeader() {
  const { invoices, activeTabId, addTab, removeTab, switchTab, addToCart, products } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const user = useAppStore(s => s.user);
  const logout = useAppStore(s => s.logout);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    
    if (val.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const s = val.toLowerCase();
    
    // Check exact match first
    const exact = products.find(p => p.barcode === s || p.sku?.toLowerCase() === s);
    if (exact) {
      addToCart(exact);
      setSearchTerm('');
      setSuggestions([]);
      return;
    }

    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(s) || 
      p.sku?.toLowerCase().includes(s) || 
      p.barcode?.includes(s)
    ).slice(0, 8);
    
    setSuggestions(filtered);
  };

  const handleSelectProduct = (product) => {
    addToCart(product);
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-[50px] bg-[#004e9a] flex items-center shrink-0">
      <div className="flex items-center h-full">
        {/* Menu Toggle */}
        <button className="h-full px-4 text-white hover:bg-black/10 transition-colors flex items-center justify-center">
          <Menu size={20} />
        </button>

        {/* Search Bar */}
        <div className="w-[300px] relative ml-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Thêm hàng hóa vào đơn (F3)"
              className="w-full h-8 pl-9 pr-3 rounded text-[13px] border-none outline-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-400"
              value={searchTerm}
              onChange={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchTerm('');
                  setSuggestions([]);
                }
              }}
            />
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-[400px] mt-1 bg-white rounded shadow-lg border border-gray-200 z-50 max-h-[300px] overflow-y-auto">
              {suggestions.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="flex items-center p-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3 overflow-hidden shrink-0">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-xs">Ảnh</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-gray-800 truncate">{p.name}</div>
                    <div className="text-[11px] text-gray-500">{p.sku}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-[13px] font-bold text-[#1a73e8]">
                      {new Intl.NumberFormat('vi-VN').format(p.sellPrice)}
                    </div>
                    <div className={`text-[11px] ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      Tồn: {p.stock}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Tabs */}
      <div className="flex-1 flex items-end h-full px-2 overflow-x-auto overflow-y-hidden ml-4 pb-0 scrollbar-hide">
        {invoices.map((inv, idx) => (
          <div 
            key={inv.id}
            onClick={() => switchTab(inv.id)}
            className={`
              relative h-[36px] flex items-center px-4 min-w-[120px] max-w-[180px] rounded-t-lg cursor-pointer transition-colors mx-0.5 group
              ${activeTabId === inv.id ? 'bg-white text-gray-800' : 'bg-[#154ba3] text-white/80 hover:bg-[#1f5fbd]'}
            `}
          >
            <span className="text-[13px] font-medium truncate flex-1">{inv.label}</span>
            {invoices.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); removeTab(inv.id); }}
                className={`ml-2 p-0.5 rounded-full ${activeTabId === inv.id ? 'hover:bg-gray-200' : 'hover:bg-black/20'} opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        
        {invoices.length < 10 && (
          <button 
            onClick={addTab}
            className="h-[36px] px-3 ml-1 text-white/80 hover:text-white flex items-center"
            title="Thêm hóa đơn mới"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="flex items-center px-4 h-full text-white shrink-0 gap-4">
        <div className="text-[13px] font-medium flex items-center gap-2 cursor-pointer hover:bg-black/10 px-2 py-1 rounded transition-colors">
          <User size={16} />
          {user?.fullName || 'Nhân viên'}
        </div>
        <button 
          onClick={handleLogout}
          className="text-white/80 hover:text-white"
          title="Đăng xuất"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
