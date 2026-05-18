import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { productAPI, categoryAPI, brandAPI, supplierAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, X, ImagePlus, ChevronDown, ChevronUp, Info } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useRef } from 'react';

const Accordion = ({ title, description, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg mb-4 bg-white overflow-hidden">
      <div 
        className="px-4 py-3 flex justify-between items-center cursor-pointer bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div>
          <h3 className="font-bold text-gray-800 text-[15px]">{title}</h3>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
      </div>
      {open && <div className="p-4 border-t border-gray-100 bg-white">{children}</div>}
    </div>
  );
};

export default function ProductModal({ open, onClose, product = null, onSaved }) {
  const isEdit = !!product;
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info | desc
  
  const [form, setForm] = useState({
    name: '', sku: '', categoryId: '', brandId: '', supplierId: '',
    sellPrice: '', costPrice: '',
    stock: '', minStock: '0', maxStock: '999999999',
    location: '', weight: '', weightUnit: 'g',
    description: '', note: '', image: '', directSale: true,
  });

  useEffect(() => {
    if (open) {
      categoryAPI.getAll().then(res => {
        let cats = [];
        if (res && res.roots) {
          const flatten = (list, prefix = '') => {
            let res = [];
            for (let c of list) {
              res.push({ ...c, name: prefix + c.name });
              if (c.children && c.children.length > 0) {
                res = res.concat(flatten(c.children, prefix + '— '));
              }
            }
            return res;
          };
          cats = flatten(res.roots);
        } else if (Array.isArray(res)) {
          cats = res;
        }
        setCategories(cats);
      }).catch(() => {});
      brandAPI.getAll().then(b => setBrands(Array.isArray(b) ? b : [])).catch(() => {});
      supplierAPI.getAll().then(s => setSuppliers(Array.isArray(s) ? s : (s?.data || []))).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        categoryId: product.categoryId || '',
        brandId: product.brandId || '',
        supplierId: product.supplierId || product.supplier_id || product.supplier?.id || '',
        sellPrice: product.sellPrice || '',
        costPrice: product.costPrice || '',
        stock: product.stock || '',
        minStock: product.minStock || '0',
        maxStock: product.maxStock || '999999999',
        location: product.location || '',
        weight: product.weight || '',
        weightUnit: product.weightUnit || 'g',
        description: product.description || '',
        note: product.note || '',
        image: product.image || '',
        directSale: product.directSale !== false,
      });
      setActiveTab('info');
    } else {
      setForm({ 
        name: '', sku: '', categoryId: '', brandId: '', supplierId: '',
        sellPrice: '', costPrice: '', stock: '', minStock: '0', maxStock: '999999999', 
        location: '', weight: '', weightUnit: 'g', description: '', note: '', image: '', directSale: true 
      });
      setActiveTab('info');
    }
  }, [product, open]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async (createAnother = false) => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên hàng'); return; }
    
    setSaving(true);
    try {
      const data = { 
        ...form, 
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        brandId: form.brandId ? Number(form.brandId) : null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        sellPrice: Number(form.sellPrice) || 0, 
        costPrice: Number(form.costPrice) || 0, 
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        maxStock: Number(form.maxStock) || 999999999,
        weight: form.weight ? Number(form.weight) : null,
      };
      
      if (isEdit) {
        await productAPI.update(product.id, data);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await productAPI.create(data);
        toast.success('Tạo sản phẩm thành công');
      }
      onSaved?.();
      
      if (createAnother && !isEdit) {
        setForm({ ...form, name: '', sku: '', image: '' }); // Reset some fields
      } else {
        onClose();
      }
    } catch (e) {
      // Error handled by API interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = window.prompt('Nhập tên nhóm hàng mới:');
    if (name && name.trim()) {
      try {
        const res = await categoryAPI.create({ name: name.trim() });
        setCategories(prev => [...prev, res]);
        update('categoryId', res.id);
        toast.success('Đã tạo nhóm hàng mới');
      } catch (e) { }
    }
  };

  const handleCreateBrand = async () => {
    const name = window.prompt('Nhập tên thương hiệu mới:');
    if (name && name.trim()) {
      try {
        const res = await brandAPI.create({ name: name.trim() });
        setBrands(prev => [...prev, res]);
        update('brandId', res.id);
        toast.success('Đã tạo thương hiệu mới');
      } catch (e) { }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      update('image', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const modules = { toolbar: [ [{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline'], [{'list': 'ordered'}, {'list': 'bullet'}], ['link', 'image'] ] };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa hàng hóa' : 'Tạo hàng hóa'}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={form.directSale} onChange={e => update('directSale', e.target.checked)} />
            <span className="text-[14px] text-gray-700 font-medium">Bán trực tiếp</span>
            <Info size={14} className="text-gray-400" />
          </label>
          
          <div className="flex gap-2">
            <button className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded text-[14px] hover:bg-gray-50 font-medium" onClick={onClose}>
              Bỏ qua
            </button>
            {!isEdit && (
              <button 
                className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded text-[14px] hover:bg-gray-50 flex items-center gap-2 font-medium"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                Lưu & Tạo thêm hàng <ChevronDown size={14} />
              </button>
            )}
            <button 
              className="px-6 py-1.5 bg-[#0065ff] text-white rounded text-[14px] hover:bg-blue-700 font-medium min-w-[80px]"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-[calc(85vh-160px)] bg-gray-50 -mx-6 -mt-4 -mb-4">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          <button 
            className={`px-4 py-3 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
          </button>
          <button 
            className={`px-4 py-3 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'desc' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('desc')}
          >
            Mô tả
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'info' ? (
            <div className="flex gap-4">
              {/* Left Column: Form */}
              <div className="flex-1 space-y-4">
                {/* Basic Info */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Mã hàng</label>
                      <input className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={form.sku} onChange={e => update('sku', e.target.value)} placeholder="Tự động" />
                    </div>
                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Tên hàng <span className="text-red-500">*</span></label>
                      <input className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Bắt buộc" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[13px] text-gray-600">Nhóm hàng</label>
                          <button onClick={handleCreateCategory} className="text-[13px] text-blue-600 hover:underline">Tạo mới</button>
                        </div>
                        <select className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-blue-500 outline-none bg-white" value={form.categoryId} onChange={e => update('categoryId', e.target.value)}>
                          <option value="">Chọn nhóm hàng</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[13px] text-gray-600">Thương hiệu</label>
                          <button onClick={handleCreateBrand} className="text-[13px] text-blue-600 hover:underline">Tạo mới</button>
                        </div>
                        <select className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-blue-500 outline-none bg-white" value={form.brandId} onChange={e => update('brandId', e.target.value)}>
                          <option value="">Chọn thương hiệu</option>
                          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Nhà cung cấp</label>
                      <select
                        className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-blue-500 outline-none bg-white"
                        value={form.supplierId}
                        onChange={e => update('supplierId', e.target.value)}
                      >
                        <option value="">Chọn nhà cung cấp</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <Accordion title="Giá vốn, giá bán">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Giá vốn</label>
                      <input type="number" className="w-full border-b border-gray-300 px-1 py-1 text-[14px] focus:border-blue-500 outline-none text-right font-medium" value={form.costPrice} onChange={e => update('costPrice', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[13px] text-gray-600">Giá bán</label>
                        <button className="text-[12px] text-blue-600 hover:underline flex items-center gap-1"><Info size={12}/> Thiết lập giá</button>
                      </div>
                      <input type="number" className="w-full border-b border-gray-300 px-1 py-1 text-[14px] focus:border-blue-500 outline-none text-right font-medium" value={form.sellPrice} onChange={e => update('sellPrice', e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </Accordion>

                <Accordion title="Tồn kho" description="Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo từ KiotViet.">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Tồn kho</label>
                      <input type="number" className="w-full border-b border-gray-300 px-1 py-1 text-[14px] focus:border-blue-500 outline-none text-right" value={form.stock} onChange={e => update('stock', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Định mức tồn thấp nhất</label>
                      <input type="number" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] focus:border-blue-500 outline-none text-right" value={form.minStock} onChange={e => update('minStock', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Định mức tồn cao nhất</label>
                      <input type="number" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] focus:border-blue-500 outline-none text-right" value={form.maxStock} onChange={e => update('maxStock', e.target.value)} placeholder="999,999,999" />
                    </div>
                  </div>
                </Accordion>

                <Accordion title="Vị trí, trọng lượng" description="Quản lý việc sắp xếp kho, vị trí bán hàng hoặc trọng lượng hàng hóa">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[13px] text-gray-600">Vị trí</label>
                        <button className="text-[13px] text-blue-600 hover:underline">Tạo mới</button>
                      </div>
                      <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-blue-500 outline-none" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Chọn vị trí" />
                    </div>
                    <div>
                      <label className="text-[13px] text-gray-600 mb-1 block">Trọng lượng</label>
                      <div className="flex">
                        <input type="number" className="flex-1 border border-r-0 border-gray-300 rounded-l px-3 py-2 text-[14px] focus:border-blue-500 outline-none text-right" value={form.weight} onChange={e => update('weight', e.target.value)} placeholder="0" />
                        <select className="border border-gray-300 rounded-r bg-gray-50 px-2 py-2 text-[14px] outline-none" value={form.weightUnit} onChange={e => update('weightUnit', e.target.value)}>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Accordion>
              </div>

              {/* Right Column: Image */}
              <div className="w-[200px] shrink-0">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 border-dashed">
                  <div 
                    className="aspect-square bg-white border border-gray-200 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 mb-2 overflow-hidden relative group"
                    onClick={() => !form.image && fileInputRef.current?.click()}
                  >
                    {form.image ? (
                      <>
                        <img src={form.image} alt="Product" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={(e) => { e.stopPropagation(); update('image', ''); fileInputRef.current.value = ''; }} className="text-white text-xs bg-red-500 px-2 py-1 rounded">Xóa ảnh</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" className="text-[13px] py-1 px-3 bg-white mb-1"><ImagePlus size={14} className="mr-1 inline" />Thêm ảnh</Button>
                      </>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  <p className="text-[11px] text-gray-500 text-center mb-3">Mỗi ảnh không quá 2 MB</p>
                  
                  {/* Thumbnails mockup */}
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-square bg-white border border-gray-200 rounded flex items-center justify-center">
                        <ImagePlus size={12} className="text-gray-300" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] text-gray-500 mb-1 block">URL Ảnh (Tuỳ chọn)</label>
                    <input className="w-full border border-gray-300 rounded px-2 py-1 text-[12px] outline-none focus:border-blue-500" value={form.image} onChange={e => update('image', e.target.value)} placeholder="Nhập link ảnh..." />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-4">
                  <span className="text-[13px] font-bold text-gray-700">Mô tả</span>
                </div>
                <div>
                  <ReactQuill theme="snow" value={form.description} onChange={val => update('description', val)} modules={modules} className="min-h-[200px]" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-[13px] font-bold text-gray-700">Mẫu ghi chú (hóa đơn, đặt hàng)</span>
                </div>
                <textarea 
                  className="w-full p-4 text-[14px] outline-none min-h-[100px] resize-y" 
                  value={form.note} 
                  onChange={e => update('note', e.target.value)} 
                  placeholder="Nhập ghi chú..." 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

