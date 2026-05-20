import { useState } from 'react';
import { usePOS } from './POSContext';
import { Search, Plus, X, Menu, User, LogOut, ScanBarcode, ArrowLeftRight, ChevronDown, Lock, Undo2, RotateCcw, Printer } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../Products/ProductModal';

export default function POSHeader() {
  const { invoices, activeTabId, addTab, removeTab, switchTab, addToCart, addProduct, products } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const user = useAppStore(s => s.user);
  const logout = useAppStore(s => s.logout);
  const navigate = useNavigate();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

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
    <div className="pos-topbar">
      <button 
        className="pos-toolbar-btn flex items-center justify-center gap-1.5 px-3 rounded-xl border border-red-500/30"
        style={{ height: '36px', width: 'auto', background: 'rgba(239, 68, 68, 0.25)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fee2e2', padding: '0 12px', fontSize: '13px', fontWeight: '600', marginRight: '6px', cursor: 'pointer' }}
        onClick={() => navigate('/orders')}
        title="Quay lại trang danh sách đơn hàng"
      >
        <Undo2 size={16} />
        <span>Trở về</span>
      </button>

      <div className="pos-search-box" style={{ position: 'relative' }}>
        <span className="search-icon"><Search size={16} /></span>
        <input
          type="text"
          placeholder="Tìm hàng hóa (F3)"
          value={searchTerm}
          onChange={handleSearch}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchTerm('');
              setSuggestions([]);
            }
          }}
        />
        <button 
          onClick={() => setIsProductModalOpen(true)}
          className="absolute right-2 top-1.5 p-1 text-primary hover:bg-blue-50 rounded"
          title="Thêm hàng hóa mới"
        >
          <Plus size={16} />
        </button>
        
        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-[400px] mt-1 bg-white rounded shadow-lg border border-gray-200 z-50 max-h-[300px] overflow-y-auto">
            {suggestions.map(p => (
              <div 
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="flex items-center p-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-800 truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-500">{p.sku}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-[13px] font-bold text-[#1a73e8]">
                    {new Intl.NumberFormat('vi-VN').format(p.sellPrice)}
                  </div>
                  <div className={`text-[11px] ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    Tồn: {Number(p.stock || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
        <input type="text" id="pos-quick-qty" defaultValue="1" style={{ width: '48px', height: '36px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600', outline: 'none' }} title="Số lượng" />
      </div>
      <button className="pos-barcode-btn" title="Quét mã vạch">
        <ScanBarcode size={18} />
      </button>

      <div className="pos-invoice-tabs">
        {invoices.map((inv, idx) => (
          <button 
            key={inv.id}
            onClick={() => switchTab(inv.id)}
            className={`pos-invoice-tab ${activeTabId === inv.id ? 'active' : ''}`}
          >
            <span className="tab-icon"><ArrowLeftRight size={14} /></span> {inv.label || `Hóa đơn ${idx + 1}`}
            {invoices.length > 1 && (
              <span 
                className="tab-close" 
                onClick={(e) => { e.stopPropagation(); removeTab(inv.id); }}
              >
                <X size={14} />
              </span>
            )}
          </button>
        ))}
      </div>
      <button className="pos-add-tab-btn" onClick={addTab}>
        <Plus size={16} /> <ChevronDown size={12} />
      </button>

      <div className="pos-toolbar-right">
        <button className="pos-toolbar-btn" title="Khóa màn hình"><Lock size={18} /></button>
        <button className="pos-toolbar-btn" title="Hoàn tác"><Undo2 size={18} /></button>
        <button className="pos-toolbar-btn" title="Làm mới"><RotateCcw size={18} /></button>
        <button className="pos-toolbar-btn" title="In hóa đơn"><Printer size={18} /></button>
        <span className="pos-user-display">{user?.fullName || 'Nhân viên'}</span>
        <button className="pos-menu-btn" title="Menu" onClick={handleLogout}><Menu size={22} /></button>
      </div>

      {isProductModalOpen && (
        <ProductModal 
          open={isProductModalOpen} 
          onClose={() => setIsProductModalOpen(false)} 
          onSaved={(newProduct) => {
            setIsProductModalOpen(false);
            if (newProduct) {
              addProduct(newProduct);
              addToCart(newProduct);
            }
          }} 
        />
      )}
    </div>
  );
}
