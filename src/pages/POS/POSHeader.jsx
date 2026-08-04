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

    const norm = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    const s = norm(val);
    
    // Check exact match first
    const exact = products.find(p => p.barcode === val.trim() || norm(p.sku) === s);
    if (exact) {
      addToCart(exact);
      setSearchTerm('');
      setSuggestions([]);
      return;
    }

    const filtered = products.filter(p => 
      norm(p.name).includes(s) || 
      norm(p.sku).includes(s) || 
      norm(p.barcode).includes(s)
    ).slice(0, 12);
    
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

      <div 
        className="pos-search-box cursor-text" 
        style={{ position: 'relative' }}
        onClick={(e) => {
          if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
            const inp = e.currentTarget.querySelector('input');
            if (inp) {
              inp.focus();
              inp.select();
            }
          }
        }}
      >
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
          <div className="absolute top-full left-0 w-[480px] sm:w-[540px] mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] max-h-[380px] overflow-y-auto p-1 font-sans">
            {suggestions.map(p => (
              <div 
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="flex items-center justify-between p-2.5 border-b border-gray-100 hover:bg-blue-50/80 rounded-lg cursor-pointer text-left transition-colors group"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="text-[15px] font-extrabold text-gray-900 group-hover:text-blue-600 truncate leading-snug">
                    {p.name} {p.unit ? `(${p.unit})` : ''}
                  </div>
                  <div className="text-xs font-extrabold text-blue-600 hover:underline mt-0.5">
                    <a 
                      href={`/products?editSku=${p.sku}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {p.sku}
                    </a>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-[#0070F4]">
                    {new Intl.NumberFormat('vi-VN').format(p.sellPrice)}
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${p.stock > 0 ? 'text-emerald-600 font-extrabold' : 'text-red-600 font-extrabold'}`}>
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
