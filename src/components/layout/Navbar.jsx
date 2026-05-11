import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const page = location.pathname;

  const navItemBase = "relative h-full flex items-center px-4 text-white/85 text-[13px] cursor-pointer transition-colors no-underline hover:bg-white/10 hover:text-white group";
  const navItemActive = "bg-[#154ba3] text-white font-medium after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-[#f29900]";

  const dropdownBase = "absolute top-full left-0 bg-white min-w-[200px] border border-gray-200 rounded-b shadow-lg opacity-0 invisible translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 z-50 text-gray-800 flex";
  const dropdownItem = "block px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors no-underline";
  const dropdownHeading = "px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100";

  return (
    <nav className="h-[42px] bg-sidebar flex items-center px-5 sticky top-12 z-50">
      <div className="flex items-center h-full flex-1">
        <Link className={`${navItemBase} ${page === '/dashboard' ? navItemActive : ''}`} to="/dashboard">Tổng quan</Link>

        <div className={`${navItemBase} ${['/products', '/pricebook', '/categories'].includes(page) ? navItemActive : ''}`}>
          Hàng hóa
          <div className={`${dropdownBase}`}>
            <div className="w-[180px] border-r border-gray-100">
              <div className={dropdownHeading}>Hàng hóa</div>
              <Link className={dropdownItem} to="/products">Danh sách hàng hóa</Link>
              <Link className={dropdownItem} to="/pricebook">Thiết lập giá</Link>
            </div>
            <div className="w-[180px]">
              <div className={dropdownHeading}>Kho hàng</div>
              <Link className={dropdownItem} to="/categories">Nhóm hàng</Link>
              <Link className={dropdownItem} to="/inventory-check">Kiểm kho</Link>
              <Link className={dropdownItem} to="/stock-transfer">Chuyển kho</Link>
            </div>
          </div>
        </div>

        <div className={`${navItemBase} ${['/suppliers', '/purchase-orders'].includes(page) ? navItemActive : ''}`}>
          Mua hàng
          <div className={`${dropdownBase}`}>
            <div className="w-[180px] border-r border-gray-100">
              <div className={dropdownHeading}>Nhà cung cấp</div>
              <Link className={dropdownItem} to="/suppliers">Nhà cung cấp</Link>
            </div>
            <div className="w-[180px]">
              <div className={dropdownHeading}>Mua hàng</div>
              <Link className={dropdownItem} to="/purchase-orders">Nhập hàng</Link>
            </div>
          </div>
        </div>

        <div className={`${navItemBase} ${['/orders', '/returns'].includes(page) ? navItemActive : ''}`}>
          Đơn hàng
          <div className={`${dropdownBase} flex-col`}>
            <Link className={dropdownItem} to="/orders">Hóa đơn</Link>
            <Link className={dropdownItem} to="/returns">Trả hàng</Link>
          </div>
        </div>

        <Link className={`${navItemBase} ${page === '/customers' ? navItemActive : ''}`} to="/customers">Khách hàng</Link>
        <Link className={`${navItemBase} ${page === '/employees' ? navItemActive : ''}`} to="/employees">Nhân viên</Link>
        <Link className={`${navItemBase} ${page === '/cashbook' ? navItemActive : ''}`} to="/cashbook">Sổ quỹ</Link>

        <div className={`${navItemBase} ${page === '/reports' ? navItemActive : ''}`}>
          Báo cáo
          <div className={`${dropdownBase}`}>
            <div className="w-[180px] border-r border-gray-100">
              <div className={dropdownHeading}>Báo cáo</div>
              <Link className={dropdownItem} to="/reports">Cuối ngày</Link>
              <Link className={dropdownItem} to="/reports">Bán hàng</Link>
              <Link className={dropdownItem} to="/reports">Hàng hóa</Link>
              <Link className={dropdownItem} to="/reports">Khách hàng</Link>
            </div>
            <div className="w-[180px]">
              <div className={dropdownHeading}>&nbsp;</div>
              <Link className={dropdownItem} to="/reports">Nhà cung cấp</Link>
              <Link className={dropdownItem} to="/reports">Nhân viên</Link>
              <Link className={dropdownItem} to="/reports">Tài chính</Link>
            </div>
          </div>
        </div>
      </div>
      <button className="bg-success hover:bg-green-600 text-white border-none rounded px-3 py-1.5 flex items-center gap-1.5 text-[13px] font-medium cursor-pointer transition-colors">
        <ShoppingCart size={16} /> Bán hàng
      </button>
    </nav>
  );
}
