import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const page = location.pathname;

  const navItemBase = "relative h-full flex items-center px-4 text-white/85 text-[13px] font-medium cursor-pointer transition-all no-underline hover:bg-white/10 hover:text-white group";
  const navItemActive = "bg-white/15 text-white font-semibold after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1/2 after:h-[3px] after:bg-[#F59E0B] after:rounded-t-full";

  const dropdownBase = "absolute top-[calc(100%-2px)] left-0 bg-white min-w-[200px] border border-gray-100 rounded-xl shadow-xl opacity-0 invisible translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 z-50 text-gray-800 flex overflow-hidden";
  const dropdownItem = "block px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors no-underline font-medium";
  const dropdownHeading = "px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100";

  return (
    <nav className="h-[46px] bg-[#1E3A8A] flex items-center px-6 sticky top-14 z-40 shadow-sm border-t border-white/10">
      <div className="flex items-center h-full flex-1 gap-1">
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
          <div className={`${dropdownBase} flex-col !min-w-[160px]`}>
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
      <Link to="/pos" target="_blank" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-none rounded-lg px-4 py-2 flex items-center gap-2 text-[13px] font-bold cursor-pointer transition-all no-underline shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ml-4">
        <ShoppingCart size={16} /> BÁN HÀNG
      </Link>
    </nav>
  );
}
