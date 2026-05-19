import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';

export default function Navbar({ mobileMenuOpen, setMobileMenuOpen }) {
  const location = useLocation();
  const page = location.pathname;

  const [mobileSubmenu, setMobileSubmenu] = useState(null);

  const navItemBase = "relative self-stretch flex items-center px-3 lg:px-4 text-white/85 text-[13px] font-medium cursor-pointer transition-all no-underline hover:bg-white/10 hover:text-white group whitespace-nowrap";
  const navItemActive = "bg-white/15 text-white font-semibold after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1/2 after:h-[3px] after:bg-[#F59E0B] after:rounded-t-full";

  const dropdownWrapper = "absolute top-full left-0 pt-1 z-50 opacity-0 invisible translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0";
  const dropdownBox = "bg-white min-w-[200px] border border-gray-100 rounded-xl shadow-xl text-gray-800 flex overflow-hidden";
  const dropdownItem = "block px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors no-underline font-medium";
  const dropdownHeading = "px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100";

  const toggleSubmenu = (menu) => {
    setMobileSubmenu(mobileSubmenu === menu ? null : menu);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex h-[46px] bg-[#1E3A8A] items-center px-4 lg:px-6 sticky top-14 z-[90] shadow-sm border-t border-white/10 max-w-full overflow-visible">
        <div className="flex items-center h-full flex-1 gap-0.5 lg:gap-1 min-w-max">
          <Link className={`${navItemBase} ${page === '/dashboard' ? navItemActive : ''}`} to="/dashboard">Tổng quan</Link>

          <div className={`${navItemBase} ${['/products', '/pricebook', '/categories'].includes(page) ? navItemActive : ''}`}>
            Hàng hóa
            <div className={dropdownWrapper}>
              <div className={`${dropdownBox} flex-col !min-w-[160px] py-1`}>
                <Link className={dropdownItem} to="/products">Danh sách hàng hóa</Link>
                <Link className={dropdownItem} to="/pricebook">Thiết lập giá</Link>
                <Link className={dropdownItem} to="/categories">Nhóm hàng</Link>
              </div>
            </div>
          </div>

          <div className={`${navItemBase} ${['/suppliers', '/purchase-orders', '/purchase-returns'].includes(page) ? navItemActive : ''}`}>
            Mua hàng
            <div className={dropdownWrapper}>
              <div className={`${dropdownBox} flex-col !min-w-[160px] py-1`}>
                <Link className={dropdownItem} to="/purchase-orders">Nhập hàng</Link>
                <Link className={dropdownItem} to="/purchase-returns">Trả hàng nhập</Link>
                <Link className={dropdownItem} to="/suppliers">Nhà cung cấp</Link>
              </div>
            </div>
          </div>

          <div className={`${navItemBase} ${['/invoices', '/returns'].includes(page) ? navItemActive : ''}`}>
            Đơn hàng
            <div className={dropdownWrapper}>
              <div className={`${dropdownBox} flex-col !min-w-[160px] py-1`}>
                <Link className={dropdownItem} to="/invoices">Hóa đơn</Link>
                <Link className={dropdownItem} to="/returns">Trả hàng</Link>
              </div>
            </div>
          </div>

          <Link className={`${navItemBase} ${page === '/customers' ? navItemActive : ''}`} to="/customers">Khách hàng</Link>
          <Link className={`${navItemBase} ${page === '/cashbook' ? navItemActive : ''}`} to="/cashbook">Sổ quỹ</Link>

          <div className={`${navItemBase} ${page.startsWith('/reports') ? navItemActive : ''}`}>
            Báo cáo
            <div className={dropdownWrapper}>
              <div className={dropdownBox}>
                <div className="w-[180px] py-1">
                  <div className={dropdownHeading}>BÁO CÁO</div>
                  <Link className={dropdownItem} to="/reports/end-of-day">Cuối ngày</Link>
                  <Link className={dropdownItem} to="/reports/sales">Bán hàng</Link>
                  <Link className={dropdownItem} to="/reports/products">Hàng hóa</Link>
                  <Link className={dropdownItem} to="/reports/customers">Khách hàng</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Link to="/pos" target="_blank" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-none rounded-lg px-3 lg:px-4 py-2 flex items-center gap-1.5 text-[13px] font-bold cursor-pointer transition-all no-underline shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ml-3 shrink-0">
          <ShoppingCart size={16} /> BÁN HÀNG
        </Link>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col z-50 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-[#1E3A8A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center font-bold text-white text-[15px]">T</div>
                <span className="font-bold text-[16px] tracking-tight">Tiko BizPOS</span>
              </div>
              <Link 
                to="/pos" 
                target="_blank" 
                className="bg-amber-500 hover:bg-amber-600 text-white border-none rounded-lg px-3 py-1.5 flex items-center gap-1 text-[12px] font-bold no-underline shadow-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart size={14} /> BÁN
              </Link>
            </div>

            <div className="flex flex-col py-2 px-3 gap-1">
              <Link 
                to="/dashboard" 
                className={`flex items-center px-3 py-2.5 rounded-xl text-[14px] font-medium no-underline transition-colors ${page === '/dashboard' ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Tổng quan
              </Link>

              {/* Hàng hóa */}
              <div>
                <button 
                  onClick={() => toggleSubmenu('products')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium bg-transparent border-none cursor-pointer transition-colors ${['/products', '/pricebook', '/categories'].includes(page) ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <span>Hàng hóa</span>
                  {mobileSubmenu === 'products' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {mobileSubmenu === 'products' && (
                  <div className="flex flex-col pl-6 pr-2 py-1 gap-1 border-l-2 border-gray-100 ml-4 my-1">
                    <Link to="/products" className={`py-1.5 text-[13px] no-underline ${page === '/products' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Danh sách hàng hóa</Link>
                    <Link to="/pricebook" className={`py-1.5 text-[13px] no-underline ${page === '/pricebook' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Thiết lập giá</Link>
                    <Link to="/categories" className={`py-1.5 text-[13px] no-underline ${page === '/categories' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Nhóm hàng</Link>
                  </div>
                )}
              </div>

              {/* Mua hàng */}
              <div>
                <button 
                  onClick={() => toggleSubmenu('purchase')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium bg-transparent border-none cursor-pointer transition-colors ${['/suppliers', '/purchase-orders', '/purchase-returns'].includes(page) ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <span>Mua hàng</span>
                  {mobileSubmenu === 'purchase' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {mobileSubmenu === 'purchase' && (
                  <div className="flex flex-col pl-6 pr-2 py-1 gap-1 border-l-2 border-gray-100 ml-4 my-1">
                    <Link to="/purchase-orders" className={`py-1.5 text-[13px] no-underline ${page === '/purchase-orders' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Nhập hàng</Link>
                    <Link to="/purchase-returns" className={`py-1.5 text-[13px] no-underline ${page === '/purchase-returns' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Trả hàng nhập</Link>
                    <Link to="/suppliers" className={`py-1.5 text-[13px] no-underline ${page === '/suppliers' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Nhà cung cấp</Link>
                  </div>
                )}
              </div>

              {/* Đơn hàng */}
              <div>
                <button 
                  onClick={() => toggleSubmenu('orders')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium bg-transparent border-none cursor-pointer transition-colors ${['/invoices', '/returns'].includes(page) ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <span>Đơn hàng</span>
                  {mobileSubmenu === 'orders' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {mobileSubmenu === 'orders' && (
                  <div className="flex flex-col pl-6 pr-2 py-1 gap-1 border-l-2 border-gray-100 ml-4 my-1">
                    <Link to="/invoices" className={`py-1.5 text-[13px] no-underline ${page === '/invoices' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Hóa đơn</Link>
                    <Link to="/returns" className={`py-1.5 text-[13px] no-underline ${page === '/returns' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Trả hàng</Link>
                  </div>
                )}
              </div>

              <Link 
                to="/customers" 
                className={`flex items-center px-3 py-2.5 rounded-xl text-[14px] font-medium no-underline transition-colors ${page === '/customers' ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Khách hàng
              </Link>

              <Link 
                to="/cashbook" 
                className={`flex items-center px-3 py-2.5 rounded-xl text-[14px] font-medium no-underline transition-colors ${page === '/cashbook' ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sổ quỹ
              </Link>

              {/* Báo cáo */}
              <div>
                <button 
                  onClick={() => toggleSubmenu('reports')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium bg-transparent border-none cursor-pointer transition-colors ${page.startsWith('/reports') ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <span>Báo cáo</span>
                  {mobileSubmenu === 'reports' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {mobileSubmenu === 'reports' && (
                  <div className="flex flex-col pl-6 pr-2 py-1 gap-1 border-l-2 border-gray-100 ml-4 my-1">
                    <Link to="/reports/end-of-day" className={`py-1.5 text-[13px] no-underline ${page === '/reports/end-of-day' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Cuối ngày</Link>
                    <Link to="/reports/sales" className={`py-1.5 text-[13px] no-underline ${page === '/reports/sales' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Bán hàng</Link>
                    <Link to="/reports/products" className={`py-1.5 text-[13px] no-underline ${page === '/reports/products' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Hàng hóa</Link>
                    <Link to="/reports/customers" className={`py-1.5 text-[13px] no-underline ${page === '/reports/customers' ? 'text-[#1E3A8A] font-bold' : 'text-gray-600'}`} onClick={() => setMobileMenuOpen(false)}>Khách hàng</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
