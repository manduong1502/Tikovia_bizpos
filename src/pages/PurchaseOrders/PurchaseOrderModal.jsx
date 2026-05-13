import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { purchaseOrderAPI, supplierAPI, productAPI } from '../../services/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function PurchaseOrderModal({ open, onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supplierAPI.getAllSimple().then(r => setSuppliers(Array.isArray(r) ? r : [])).catch(() => {});
      productAPI.getAll().then(r => setProducts(Array.isArray(r) ? r : (r.data || []))).catch(() => {});
      setItems([]);
      setSupplierId('');
      setPaidAmount('');
      setNote('');
      setSearch('');
    }
  }, [open]);

  if (!open) return null;

  const filteredProducts = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const addItem = (product) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product_id: product.id, name: product.name, sku: product.sku, unit_price: product.cost_price || 0, quantity: 1 }]);
    }
    setSearch('');
  };

  const updateItem = (idx, key, val) => {
    setItems(items.map((it, i) => i === idx ? { ...it, [key]: Number(val) || 0 } : it));
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, it) => s + (it.unit_price * it.quantity), 0);

  const handleSubmit = async () => {
    if (!supplierId) { toast.error('Chưa chọn nhà cung cấp'); return; }
    if (items.length === 0) { toast.error('Chưa có sản phẩm nào'); return; }
    setSaving(true);
    try {
      const r = await purchaseOrderAPI.create({
        supplier_id: Number(supplierId),
        items: items.map(it => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })),
        paid_amount: Number(paidAmount) || 0,
        payment_status: Number(paidAmount) >= subtotal ? 'paid' : (Number(paidAmount) > 0 ? 'partial' : 'unpaid'),
        note,
      });
      toast.success(`Tạo phiếu nhập thành công! Mã: ${r.po_code}`);
      onSaved?.();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">Tạo phiếu nhập hàng</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Nhà cung cấp *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm cursor-pointer" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">-- Chọn NCC --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Ghi chú</label>
              <input className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Thêm sản phẩm</label>
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
                      <span className="text-gray-500">{fmt(p.cost_price || 0)}</span>
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
                  <th className="py-2.5 text-right font-bold w-[80px]">SL</th>
                  <th className="py-2.5 text-right font-bold w-[120px]">Đơn giá</th>
                  <th className="py-2.5 text-right font-bold w-[120px]">Thành tiền</th>
                  <th className="py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2.5 text-primary font-bold">{it.sku}</td>
                    <td className="py-2.5 font-medium text-gray-800">{it.name}</td>
                    <td className="py-2.5 text-right"><input type="number" min="1" className="w-16 text-right border border-gray-200 rounded px-2 py-1 text-[13px] outline-none focus:border-primary" value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></td>
                    <td className="py-2.5 text-right"><input type="number" min="0" className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-[13px] outline-none focus:border-primary" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} /></td>
                    <td className="py-2.5 text-right font-bold text-primary">{fmt(it.unit_price * it.quantity)}</td>
                    <td className="py-2.5 text-center"><button onClick={() => removeItem(i)} className="p-1 hover:bg-red-50 rounded cursor-pointer"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-between items-end">
            <div className="w-[200px]">
              <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Thanh toán</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="Số tiền trả NCC" />
            </div>
            <div className="text-right">
              <div className="text-[13px] text-gray-500 mb-1">Tổng cộng ({items.reduce((s, it) => s + it.quantity, 0)} SP)</div>
              <div className="text-2xl font-extrabold text-primary">{fmt(subtotal)}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose}>Bỏ qua</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} className="shadow-md bg-gradient-to-r from-primary to-blue-600 border-none">{saving ? 'Đang lưu...' : 'Nhập hàng'}</Button>
        </div>
      </div>
    </div>
  );
}
