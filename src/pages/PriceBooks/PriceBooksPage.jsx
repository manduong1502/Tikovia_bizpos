import React, { useState, useEffect } from 'react';
import { productAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Dropdown from '../../components/ui/Dropdown';
import { exportProducts } from '../../utils/exportCSV';
import toast from 'react-hot-toast';
import { Search, Plus, Download, Upload, X, ChevronDown, ChevronUp, Info, HelpCircle } from 'lucide-react';

const STOCK_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'under', label: 'Dưới định mức tồn' },
  { value: 'over', label: 'Vượt định mức tồn' },
  { value: 'in', label: 'Còn hàng trong kho' },
  { value: 'out', label: 'Hết hàng trong kho' },
];

const PRICE_COND_OPTIONS = [
  { value: '', label: 'Chọn điều kiện' },
  { value: '<', label: 'Nhỏ hơn' },
  { value: '<=', label: 'Nhỏ hơn hoặc bằng' },
  { value: '=', label: 'Bằng' },
  { value: '>', label: 'Lớn hơn' },
];

const PRICE_COMPARE_OPTIONS = [
  { value: '', label: 'Chọn giá so sánh' },
  { value: 'costPrice', label: 'Giá vốn' },
  { value: 'lastImport', label: 'Giá nhập cuối' },
];

export default function PriceBooksPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  const [filters, setFilters] = useState({
    category: '',
    stock: '',
    priceCond: '',
    priceComp: ''
  });

  const [expandedSections, setExpandedSections] = useState({
    date: true,
    formula: true,
    settings: true
  });

  const toggleSection = (sec) => setExpandedSections(p => ({ ...p, [sec]: !p[sec] }));

  useEffect(() => {
    productAPI.getAll().then(res => setProducts(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  const filteredProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.sku || '').toLowerCase().includes(search.toLowerCase())) return false;
    
    if (filters.stock === 'in' && p.stock <= 0) return false;
    if (filters.stock === 'out' && p.stock > 0) return false;
    if (filters.stock === 'under' && p.stock >= 10) return false; // Giả sử định mức là 10
    if (filters.stock === 'over' && p.stock <= 10) return false;

    if (filters.priceCond && filters.priceComp) {
      const sell = p.sellPrice || 0;
      const comp = filters.priceComp === 'costPrice' ? (p.costPrice || 0) : 0; // lastImport mock is 0
      if (filters.priceCond === '<' && !(sell < comp)) return false;
      if (filters.priceCond === '<=' && !(sell <= comp)) return false;
      if (filters.priceCond === '=' && !(sell === comp)) return false;
      if (filters.priceCond === '>' && !(sell > comp)) return false;
    }

    return true;
  });

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    input.onchange = () => toast.success(`Đã chọn file: ${input.files[0]?.name}. Tính năng import đang phát triển.`);
    input.click();
  };

  const handlePriceChange = async (id, newPriceStr) => {
    const num = Number(newPriceStr.replace(/[^0-9.-]+/g, ""));
    if (isNaN(num)) return;
    
    try {
      if (productAPI.update) {
        await productAPI.update(id, { sell_price: num });
      }
      setProducts(prev => prev.map(p => p.id === id ? { ...p, sellPrice: num, sell_price: num } : p));
      toast.success('Cập nhật giá thành công');
    } catch (e) {
      toast.error('Lỗi khi cập nhật giá');
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-page-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200 -mx-6 -mt-6 mb-2">
        <h1 className="text-xl font-bold text-gray-800 m-0">Bảng giá chung</h1>
        <div className="flex items-center gap-3 w-1/3">
          <Input 
            icon={<Search size={16} className="text-gray-400" />} 
            placeholder="Theo mã, tên hàng" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 border-gray-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm">Bảng giá</Button>
          <Button icon={<Upload size={16} />} onClick={handleImport} className="bg-white border-gray-300 shadow-sm">Import</Button>
          <Button icon={<Download size={16} />} onClick={() => exportProducts(filteredProducts)} className="bg-white border-gray-300 shadow-sm">Xuất file</Button>
          <div className="h-8 w-px bg-gray-200 mx-1"></div>
          <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 bg-white"><HelpCircle size={16} /></button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar Filter */}
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          {/* Nhóm hàng */}
          <div>
            <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Nhóm hàng</span>
            <input 
              type="text" 
              placeholder="Chọn nhóm hàng" 
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" 
            />
          </div>

          {/* Tồn kho */}
          <div>
            <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Tồn kho</span>
            <Dropdown
              value={filters.stock}
              options={STOCK_OPTIONS}
              onChange={(v) => setFilters(prev => ({ ...prev, stock: v }))}
            />
          </div>

          {/* Giá bán */}
          <div>
            <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Giá bán</span>
            <div className="flex flex-col gap-2">
              <Dropdown
                value={filters.priceCond}
                options={PRICE_COND_OPTIONS}
                onChange={(v) => setFilters(prev => ({ ...prev, priceCond: v }))}
              />
              <Dropdown
                value={filters.priceComp}
                options={PRICE_COMPARE_OPTIONS}
                onChange={(v) => setFilters(prev => ({ ...prev, priceComp: v }))}
              />
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold text-gray-700 w-[120px]">Mã hàng</th>
                <th className="py-3 px-4 font-semibold text-gray-700">Tên hàng</th>
                <th className="py-3 px-4 font-semibold text-gray-700 text-right w-[120px]">Giá vốn</th>
                <th className="py-3 px-4 font-semibold text-gray-700 text-right w-[120px]">Giá nhập cuối</th>
                <th className="py-3 px-4 font-semibold text-gray-700 text-right w-[140px]">Bảng giá chung</th>
              </tr>
              <tr className="bg-white border-b border-gray-200">
                <th className="py-2 px-4"><input type="text" placeholder="Tìm mã hàng" className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500" value={search} onChange={e => setSearch(e.target.value)} /></th>
                <th className="py-2 px-4"><input type="text" placeholder="Tìm tên hàng" className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500" value={search} onChange={e => setSearch(e.target.value)} /></th>
                <th className="py-2 px-4"></th>
                <th className="py-2 px-4"></th>
                <th className="py-2 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-blue-600 font-medium">{p.sku || `SP${p.id}`}</td>
                  <td className="py-3 px-4 text-gray-800">{p.name}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{new Intl.NumberFormat('vi-VN').format(p.costPrice || 0)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{new Intl.NumberFormat('vi-VN').format(0)}</td>
                  <td className="py-3 px-4 text-right">
                    <input 
                      type="text" 
                      className="w-[100px] border border-gray-300 rounded px-2 py-1.5 text-right text-[13px] focus:border-blue-500 outline-none float-right"
                      defaultValue={new Intl.NumberFormat('vi-VN').format(p.sellPrice || p.sell_price || 0)} 
                      onBlur={(e) => {
                        const newVal = e.target.value;
                        if (newVal !== new Intl.NumberFormat('vi-VN').format(p.sellPrice || p.sell_price || 0)) {
                          handlePriceChange(p.id, newVal);
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500">Không có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tạo bảng giá Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo bảng giá" size="lg"
        footer={<>
          <Button onClick={() => setModalOpen(false)}>Bỏ qua</Button>
          <Button variant="primary" onClick={() => setModalOpen(false)} className="bg-blue-600">Lưu</Button>
        </>}
      >
        <div className="mb-4 flex border-b border-gray-200">
          <button className={`px-4 py-2 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`} onClick={() => setActiveTab('info')}>Thông tin</button>
          <button className={`px-4 py-2 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'scope' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`} onClick={() => setActiveTab('scope')}>Phạm vi áp dụng</button>
        </div>

        {activeTab === 'info' && (
          <div className="space-y-4">
            <div>
              <label className="text-[13px] text-gray-700 mb-1.5 block font-medium">Tên bảng giá</label>
              <input type="text" placeholder="Nhập tên bảng giá" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none" />
            </div>

            {/* Hiệu lực */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 cursor-pointer select-none" onClick={() => toggleSection('date')}>
                <div className="font-semibold text-[14px] text-gray-800">Hiệu lực</div>
                {expandedSections.date ? <ChevronUp size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-500"/>}
              </div>
              {expandedSections.date && (
                <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-[13px] text-gray-600">Hiệu lực</div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded px-3 py-1.5 bg-white">
                        <input type="text" defaultValue="15/05/2026 14:09" className="text-[13px] outline-none w-[120px]" />
                        <div className="flex items-center gap-2 text-gray-400"><Info size={14}/><HelpCircle size={14}/></div>
                      </div>
                      <span className="text-gray-500 text-[13px]">đến</span>
                      <div className="flex items-center border border-gray-300 rounded px-3 py-1.5 bg-white">
                        <input type="text" defaultValue="15/05/2027 14:09" className="text-[13px] outline-none w-[120px]" />
                        <div className="flex items-center gap-2 text-gray-400"><Info size={14}/><HelpCircle size={14}/></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-[13px] text-gray-600">Trạng thái</div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="status" defaultChecked className="w-4 h-4 text-blue-600" />
                        <span className="text-[13px]">Áp dụng</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="status" className="w-4 h-4 text-blue-600" />
                        <span className="text-[13px]">Chưa áp dụng</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Công thức giá */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 cursor-pointer select-none" onClick={() => toggleSection('formula')}>
                <div className="font-semibold text-[14px] text-gray-800">Công thức giá</div>
                {expandedSections.formula ? <ChevronUp size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-500"/>}
              </div>
              {expandedSections.formula && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="text-[13px] text-gray-500 mb-3">Tạo công thức dựa trên giá vốn, giá nhập hoặc giá bán ở các bảng giá khác</div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-[13px] font-medium text-gray-700">Giá mới =</span>
                    <select className="border border-gray-300 rounded px-3 py-1.5 text-[13px] outline-none bg-white min-w-[150px]">
                      <option>Chọn bảng giá</option>
                      <option>Giá vốn</option>
                      <option>Giá nhập cuối</option>
                    </select>
                    <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                      <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border-r border-gray-300 text-gray-600 font-bold">+</button>
                      <button className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-600 font-bold">−</button>
                    </div>
                    <div className="flex items-center flex-1">
                      <input type="text" defaultValue="0" className="w-full border border-gray-300 border-r-0 rounded-l px-3 py-1.5 text-[13px] outline-none text-right" />
                      <div className="flex text-[13px] border border-gray-300 rounded-r overflow-hidden">
                        <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium border-r border-gray-300">VND</button>
                        <button className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 font-medium">%</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Khi thu ngân lên đơn... */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 cursor-pointer select-none" onClick={() => toggleSection('settings')}>
                <div className="font-semibold text-[14px] text-gray-800">Khi thu ngân lên đơn với bảng giá này</div>
                {expandedSections.settings ? <ChevronUp size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-500"/>}
              </div>
              {expandedSections.settings && (
                <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="pos_setting" defaultChecked className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="text-[14px] font-medium text-gray-800">Được phép thêm hàng hóa không có trong bảng giá</div>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                        <span className="text-[13px] text-gray-600">Gửi cảnh báo khi thêm hàng hóa không có trong bảng giá</span>
                      </label>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="radio" name="pos_setting" className="w-4 h-4 text-blue-600" />
                    <div className="text-[14px] text-gray-800 flex items-center gap-1">Chỉ được thêm hàng hóa có trong bảng giá này <Info size={14} className="text-gray-400"/></div>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scope' && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="font-semibold text-[14px] text-gray-800 mb-3">Chi nhánh</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="branch" defaultChecked className="w-4 h-4 text-blue-600" />
                  <span className="text-[14px]">Toàn hệ thống</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="branch" className="w-4 h-4 text-blue-600" />
                  <span className="text-[14px]">Chi nhánh cụ thể</span>
                </label>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="font-semibold text-[14px] text-gray-800 mb-3">Nhóm khách hàng</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="customer_group" defaultChecked className="w-4 h-4 text-blue-600" />
                  <span className="text-[14px]">Tất cả</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="customer_group" className="w-4 h-4 text-blue-600" />
                  <span className="text-[14px]">Nhóm khách hàng cụ thể</span>
                </label>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="font-semibold text-[14px] text-gray-800 mb-3">Người tạo giao dịch</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="creator" defaultChecked className="w-4 h-4 text-blue-600" />
                  <span className="text-[14px]">Tất cả</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="creator" className="w-4 h-4 text-blue-600" />
                  <span className="text-[14px]">Người tạo giao dịch cụ thể</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
