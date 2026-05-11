import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { productAPI, categoryAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, X, ImagePlus } from 'lucide-react';

export default function ProductModal({ open, onClose, product = null, onSaved }) {
  const isEdit = !!product;
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', category_id: '', sell_price: '', cost_price: '',
    stock_quantity: '', description: '', brand: '', location: '', image_url: '',
  });

  useEffect(() => {
    categoryAPI.getAll().then(c => setCategories(Array.isArray(c) ? c : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        sell_price: product.sell_price || '',
        cost_price: product.cost_price || '',
        stock_quantity: product.stock_quantity || '',
        description: product.description || '',
        brand: product.brand || '',
        location: product.location || '',
        image_url: product.image_url || '',
      });
    } else {
      setForm({ name: '', sku: '', barcode: '', category_id: '', sell_price: '', cost_price: '', stock_quantity: '', description: '', brand: '', location: '', image_url: '' });
    }
  }, [product, open]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên hàng'); return; }
    if (!form.sell_price) { toast.error('Vui lòng nhập giá bán'); return; }
    setSaving(true);
    try {
      const data = { ...form, sell_price: +form.sell_price, cost_price: +form.cost_price || 0, stock_quantity: +form.stock_quantity || 0 };
      if (isEdit) {
        await productAPI.update(product.id, data);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await productAPI.create(data);
        toast.success('Tạo sản phẩm thành công');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      // Error handled by API interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}
      size="lg"
      footer={
        <>
          <Button variant="default" onClick={onClose} icon={<X size={14} />}>Bỏ qua</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving} icon={<Save size={14} />}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_180px] gap-6">
        <div className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Tên hàng <span className="text-red-500">*</span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Nhập tên hàng hóa" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Mã hàng</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" value={form.sku} onChange={e => update('sku', e.target.value)} placeholder="Mã tự động" />
            </div>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Nhóm hàng</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" value={form.category_id} onChange={e => update('category_id', e.target.value)}>
                <option value="">Chọn nhóm hàng</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Mã vạch</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" value={form.barcode} onChange={e => update('barcode', e.target.value)} placeholder="Nhập mã vạch" />
            </div>
          </div>
          {/* Row 3: Prices */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Giá bán <span className="text-red-500">*</span></label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-semibold" value={form.sell_price} onChange={e => update('sell_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Giá vốn</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" value={form.cost_price} onChange={e => update('cost_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Tồn kho</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" value={form.stock_quantity} onChange={e => update('stock_quantity', e.target.value)} placeholder="0" />
            </div>
          </div>
          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Thương hiệu</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="Nhập thương hiệu" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Vị trí</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Kệ A1" />
            </div>
          </div>
          {/* Description */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Mô tả</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none resize-y min-h-[80px]" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Mô tả sản phẩm..." rows={3} />
          </div>
        </div>

        {/* Image upload area */}
        <div className="flex flex-col items-center gap-3">
          <label className="text-sm text-gray-600">Ảnh sản phẩm</label>
          <div className="w-[160px] h-[160px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50/30 transition-colors group">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <ImagePlus size={32} className="text-gray-300 group-hover:text-primary transition-colors mb-2" />
                <span className="text-xs text-gray-400 group-hover:text-primary">Thêm ảnh</span>
              </>
            )}
          </div>
          {form.image_url && (
            <button onClick={() => update('image_url', '')} className="text-xs text-red-500 hover:underline cursor-pointer">Xóa ảnh</button>
          )}
          <input className="w-full border border-gray-300 rounded px-2 py-1 text-xs" value={form.image_url} onChange={e => update('image_url', e.target.value)} placeholder="URL ảnh" />
        </div>
      </div>
    </Modal>
  );
}
