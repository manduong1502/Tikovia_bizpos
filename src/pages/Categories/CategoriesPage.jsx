import { useState, useEffect } from 'react';
import { categoryAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, ChevronRight, Folder, FolderOpen, Save, X } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', parent_id: '' });
  const [expandedIds, setExpandedIds] = useState(new Set());

  const load = () => categoryAPI.getAll().then(c => setCategories(Array.isArray(c) ? c : [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const roots = categories.filter(c => !c.parent_id);
  const children = (pid) => categories.filter(c => c.parent_id === pid);

  const toggle = (id) => {
    const next = new Set(expandedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedIds(next);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên nhóm hàng'); return; }
    try {
      await categoryAPI.create({ name: form.name, parent_id: form.parent_id || null });
      toast.success('Tạo nhóm hàng thành công');
      setModalOpen(false);
      setForm({ name: '', parent_id: '' });
      load();
    } catch {}
  };

  const renderNode = (cat, level = 0) => {
    const kids = children(cat.id);
    const isOpen = expandedIds.has(cat.id);
    const productCount = cat.product_count || 0;
    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50 transition-colors`}
          style={{ paddingLeft: `${16 + level * 24}px` }}
          onClick={() => kids.length > 0 && toggle(cat.id)}
        >
          {kids.length > 0 ? (
            <ChevronRight size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          ) : <span className="w-[14px]" />}
          {isOpen ? <FolderOpen size={16} className="text-primary" /> : <Folder size={16} className="text-gray-400" />}
          <span className="text-sm flex-1">{cat.name}</span>
          <span className="text-xs text-gray-400">{productCount} SP</span>
          <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary cursor-pointer p-1"><Edit size={12} /></button>
        </div>
        {isOpen && kids.map(k => renderNode(k, level + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Nhóm hàng</h1>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Thêm nhóm hàng</Button>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-border text-sm font-semibold text-gray-600">
          Tất cả nhóm hàng ({categories.length})
        </div>
        {roots.length > 0 ? roots.map(c => renderNode(c)) : (
          <div className="text-center py-16 text-gray-300">
            <div className="text-4xl mb-3">📁</div>
            <div className="text-sm">Chưa có nhóm hàng nào</div>
            <Button variant="primary" className="mt-4" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>Tạo nhóm hàng đầu tiên</Button>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm nhóm hàng" size="sm"
        footer={<><Button onClick={() => setModalOpen(false)} icon={<X size={14} />}>Bỏ qua</Button><Button variant="primary" onClick={handleSave} icon={<Save size={14} />}>Lưu</Button></>}>
        <div className="space-y-4">
          <div><label className="text-sm text-gray-600 mb-1 block">Tên nhóm hàng <span className="text-red-500">*</span></label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Nhập tên nhóm hàng" autoFocus />
          </div>
          <div><label className="text-sm text-gray-600 mb-1 block">Nhóm cha</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" value={form.parent_id} onChange={e => setForm(p => ({...p, parent_id: e.target.value}))}>
              <option value="">Không có (nhóm gốc)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
