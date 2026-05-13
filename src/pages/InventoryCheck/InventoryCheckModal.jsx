import { useState, useEffect } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { inventoryCheckAPI, productAPI } from '../../services/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function InventoryCheckModal({ open, onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      productAPI.getAll().then(r => setProducts(Array.isArray(r) ? r : (r.data || []))).catch(() => {});
      setItems([]);
      setNote('');
      setSearch('');
    }
  }, [open]);

  if (!open) return null;

  const filteredProducts = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const addItem = (product) => {
    if (items.find(i => i.product_id === product.id)) return;
    setItems([...items, { product_id: product.id, name: product.name, sku: product.sku, system_qty: product.stock_quantity || 0, actual_qty: product.stock_quantity || 0, diff: 0 }]);
    setSearch('');
  };

  const updateActual = (idx, val) => {
    const actual = Number(val) || 0;
    setItems(items.map((it, i) => i === idx ? { ...it, actual_qty: actual, diff: actual - it.system_qty } : it));
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async (status) => {
    if (items.length === 0) { toast.error('Chưa có sản phẩm nào'); return; }
    setSaving(true);
    try {
      const r = await inventoryCheckAPI.create({ items, note, status });
      toast.success(status === 'balanced' ? `Cân bằng kho thành công! Mã: ${r.code}` : `Lưu nháp thành công! Mã: ${r.code}`);
      onSaved?.();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">Kiểm kho</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div>
            <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Thêm sản phẩm kiểm kho</label>
            <div className="relative">
              <div className="flex items-center border border-gray-200 rounded-lg px-3.5 py-2.5 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary bg-white gap-2">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input className="flex-1 outline-none text-[13px] font-medium" placeholder="Tìm sản phẩm theo tên, mã..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {filteredProducts.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-[13px] font-medium cursor-pointer flex items-center justify-between transition-colors">
                      <span><span className="text-primary font-bold">{p.sku}</span> — {p.name}</span>
                      <span className="text-gray-500">Tồn: {p.stock_quantity || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {items.length > 0 && (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 text-left font-bold">Mã hàng</th>
                  <th className="py-2.5 text-left font-bold">Tên hàng</th>
                  <th className="py-2.5 text-right font-bold w-[80px]">Tồn kho</th>
                  <th className="py-2.5 text-right font-bold w-[100px]">Thực tế</th>
                  <th className="py-2.5 text-right font-bold w-[80px]">Chênh lệch</th>
                  <th className="py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2.5 text-primary font-bold">{it.sku}</td>
                    <td className="py-2.5 font-medium text-gray-800">{it.name}</td>
                    <td className="py-2.5 text-right text-gray-500 font-medium">{it.system_qty}</td>
                    <td className="py-2.5 text-right"><input type="number" min="0" className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-[13px] outline-none focus:border-primary" value={it.actual_qty} onChange={e => updateActual(i, e.target.value)} /></td>
                    <td className={`py-2.5 text-right font-bold ${it.diff > 0 ? 'text-green-600' : it.diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>{it.diff > 0 ? '+' : ''}{it.diff}</td>
                    <td className="py-2.5 text-center"><button onClick={() => removeItem(i)} className="p-1 hover:bg-red-50 rounded cursor-pointer"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div>
            <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Ghi chú</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-y min-h-[60px]" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose}>Bỏ qua</Button>
          <Button onClick={() => handleSubmit('draft')} disabled={saving}>Lưu nháp</Button>
          <Button variant="primary" onClick={() => handleSubmit('balanced')} disabled={saving} className="shadow-md bg-gradient-to-r from-primary to-blue-600 border-none">{saving ? 'Đang xử lý...' : 'Cân bằng kho'}</Button>
        </div>
      </div>
    </div>
  );
}
