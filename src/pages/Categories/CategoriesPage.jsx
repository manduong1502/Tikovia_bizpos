import { useState, useEffect, useCallback } from 'react';
import { categoryAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen,
  Save, X, Search, Package, Layers, MoreHorizontal
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CategoriesPage() {
  const [roots, setRoots] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', note: '', parentId: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(() => {
    categoryAPI.getAll()
      .then(res => {
        if (res && res.roots) {
          setRoots(res.roots);
          setTotalCount(res.totalCount || 0);
        } else if (Array.isArray(res)) {
          // Fallback for old API format
          setRoots(res.filter(c => !c.parentId));
          setTotalCount(res.length);
        }
      })
      .catch(() => { setRoots([]); setTotalCount(0); });
  }, []);
  useEffect(() => { load(); }, [load]);

  // Recursive function to get all children from a given category object
  const getChildren = (cat) => cat.children || [];

  // Get product count from _count
  const getProductCount = (cat) => cat._count?.products || 0;
  const getChildCount = (cat) => cat._count?.children || 0;

  // Count total products recursively (this cat + all descendants)
  const getTotalProducts = (cat) => {
    let total = getProductCount(cat);
    const kids = getChildren(cat);
    for (const kid of kids) {
      total += getTotalProducts(kid);
    }
    return total;
  };

  // Flatten all categories for selectors and total counts
  const flattenAll = (cats) => {
    let result = [];
    for (const c of cats) {
      result.push(c);
      if (c.children) result = result.concat(flattenAll(c.children));
    }
    return result;
  };
  const allFlat = flattenAll(roots);

  // Search filter
  const matchesSearch = (cat) => {
    if (!search) return true;
    const s = search.toLowerCase();
    if (cat.name.toLowerCase().includes(s)) return true;
    const kids = getChildren(cat);
    return kids.some(k => matchesSearch(k));
  };

  const filteredRoots = roots.filter(matchesSearch);

  const totalProducts = allFlat.reduce((sum, c) => sum + getProductCount(c), 0);

  const toggle = (id) => {
    const next = new Set(expandedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedIds(next);
  };

  const expandAll = () => {
    const ids = new Set();
    const addIds = (cats) => {
      for (const c of cats) {
        if (getChildren(c).length > 0) {
          ids.add(c.id);
          addIds(getChildren(c));
        }
      }
    };
    addIds(roots);
    setExpandedIds(ids);
  };

  const collapseAll = () => setExpandedIds(new Set());

  const openCreateModal = (parentId = null) => {
    setEditingCategory(null);
    setForm({ name: '', note: '', parentId: parentId ? String(parentId) : '' });
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setForm({ name: cat.name, note: cat.note || '', parentId: cat.parentId ? String(cat.parentId) : '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên nhóm hàng'); return; }
    try {
      const payload = {
        name: form.name.trim(),
        note: form.note || null,
        parentId: form.parentId ? Number(form.parentId) : null,
      };
      if (editingCategory) {
        await categoryAPI.update(editingCategory.id, payload);
        toast.success('Cập nhật nhóm hàng thành công');
      } else {
        await categoryAPI.create(payload);
        toast.success('Tạo nhóm hàng thành công');
      }
      setModalOpen(false);
      setForm({ name: '', note: '', parentId: '' });
      setEditingCategory(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      await categoryAPI.delete(id);
      toast.success('Xóa nhóm hàng thành công');
      setDeleteConfirm(null);
      if (selectedId === id) setSelectedId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể xóa nhóm hàng');
    }
  };

  // Find selected category from the tree
  const findCat = (id, cats = roots) => {
    for (const c of cats) {
      if (c.id === id) return c;
      const found = findCat(id, getChildren(c));
      if (found) return found;
    }
    return null;
  };
  const selectedCat = selectedId ? findCat(selectedId) : null;

  // ─── Render Tree Node ───
  const renderNode = (cat, level = 0) => {
    if (!matchesSearch(cat)) return null;
    const kids = getChildren(cat);
    const isOpen = expandedIds.has(cat.id);
    const hasKids = kids.length > 0;
    const isSelected = selectedId === cat.id;
    const productCount = getProductCount(cat);
    const totalProds = getTotalProducts(cat);

    return (
      <div key={cat.id}>
        <div
          className={`group flex items-center gap-2.5 py-2.5 px-3 cursor-pointer border-b border-gray-50 transition-all duration-150
            ${isSelected ? 'bg-blue-50/80 border-l-[3px] border-l-primary' : 'hover:bg-gray-50/80 border-l-[3px] border-l-transparent'}`}
          style={{ paddingLeft: `${12 + level * 28}px` }}
          onClick={() => { setSelectedId(cat.id); if (hasKids) toggle(cat.id); }}
        >
          {/* Expand/Collapse Arrow */}
          <span className="w-5 h-5 flex items-center justify-center shrink-0">
            {hasKids ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggle(cat.id); }}
                className="p-0 border-none bg-transparent cursor-pointer text-gray-400 hover:text-primary transition-colors"
              >
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            ) : <span className="w-[15px]" />}
          </span>

          {/* Folder Icon */}
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
            ${isSelected ? 'bg-primary/10' : 'bg-gray-100 group-hover:bg-blue-50'}`}>
            {isOpen ? <FolderOpen size={16} className="text-primary" /> : <Folder size={16} className={isSelected ? 'text-primary' : 'text-gray-400 group-hover:text-primary/60'} />}
          </span>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <span className={`text-[13px] font-semibold block truncate ${isSelected ? 'text-primary' : 'text-gray-800'}`}>{cat.name}</span>
            {cat.note && <span className="text-[11px] text-gray-400 block truncate">{cat.note}</span>}
          </div>

          {/* Product Count Badge */}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${totalProds > 0 ? 'bg-blue-50 text-primary' : 'bg-gray-50 text-gray-400'}`}>
            {totalProds} SP
          </span>

          {/* Child count badge */}
          {hasKids && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-500 shrink-0">
              {kids.length} nhóm con
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); openCreateModal(cat.id); }}
              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-blue-50 transition-all"
              title="Thêm nhóm con"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openEditModal(cat); }}
              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all"
              title="Sửa"
            >
              <Edit size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(cat); }}
              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
              title="Xóa"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Children */}
        {isOpen && kids.length > 0 && (
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 border-l border-gray-100" style={{ marginLeft: `${32 + level * 28}px` }} />
            {kids.map(k => renderNode(k, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent font-sans w-full relative">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-2 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100 flex-none z-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
          <h1 className="text-sm sm:text-base font-extrabold text-gray-800 tracking-tight flex items-center gap-2 m-0">Nhóm hàng</h1>
          <Button
            variant="primary"
            onClick={() => openCreateModal()}
            className="flex items-center justify-center gap-1 shadow-md bg-primary hover:bg-primary-hover font-bold py-1.5 px-3 rounded-lg text-xs whitespace-nowrap cursor-pointer shrink-0"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Thêm nhóm hàng</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
            <Layers size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-[22px] font-bold text-gray-800 truncate">{totalCount}</div>
            <div className="text-[12px] text-gray-500 font-medium truncate">Nhóm hàng</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
            <Package size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-[22px] font-bold text-gray-800 truncate">{totalProducts}</div>
            <div className="text-[12px] text-gray-500 font-medium truncate">Sản phẩm</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
            <Folder size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-[22px] font-bold text-gray-800 truncate">{roots.length}</div>
            <div className="text-[12px] text-gray-500 font-medium truncate">Nhóm gốc</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 items-start max-w-full">
        {/* Tree Panel */}
        <div className="flex-1 bg-white border border-gray-100 rounded-xl min-h-[500px] shadow-sm overflow-x-auto max-w-full w-full">
          <div className="min-w-[600px]">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3 justify-between">
              <div className="w-full sm:w-auto sm:flex-1 max-w-sm">
                <Input
                  icon={<Search size={16} className="text-gray-400" />}
                  placeholder="Tìm nhóm hàng..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-white w-full"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={expandAll}
                  className="px-3 py-1.5 text-[12px] rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-primary hover:border-primary/30 hover:bg-blue-50/30 cursor-pointer font-medium transition-all"
                >
                  Mở tất cả
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1.5 text-[12px] rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-primary hover:border-primary/30 hover:bg-blue-50/30 cursor-pointer font-medium transition-all"
                >
                  Thu gọn
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="flex items-center py-2.5 px-3 bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 uppercase font-bold tracking-wider">
              <span className="flex-1 pl-14">Tên nhóm hàng</span>
              <span className="w-[80px] text-center">Sản phẩm</span>
              <span className="w-[100px] text-center">Nhóm con</span>
              <span className="w-[110px] text-right pr-2">Thao tác</span>
            </div>

            {/* Tree Content */}
            <div className="divide-y divide-gray-50">
              {filteredRoots.length > 0 ? (
                filteredRoots.map(c => renderNode(c))
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Folder size={32} className="text-primary/40" />
                  </div>
                  <div className="text-base font-semibold text-gray-500 mb-1">
                    {search ? 'Không tìm thấy nhóm hàng phù hợp' : 'Chưa có nhóm hàng nào'}
                  </div>
                  <div className="text-[13px] text-gray-400 mb-4">
                    {search ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo nhóm hàng đầu tiên để phân loại sản phẩm'}
                  </div>
                  {!search && (
                    <Button variant="primary" icon={<Plus size={14} />} onClick={() => openCreateModal()} className="shadow-sm">
                      Tạo nhóm hàng đầu tiên
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
              <span>Hiển thị {filteredRoots.length} nhóm gốc / {totalCount} nhóm hàng</span>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCat && (
          <div className="w-full lg:w-[320px] shrink-0 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md">
                  <FolderOpen size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-gray-800 truncate">{selectedCat.name}</div>
                  <div className="text-[12px] text-gray-500 font-medium">ID: {selectedCat.id}</div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 rounded-xl p-3.5 text-center border border-blue-100/50">
                  <div className="text-lg font-bold text-primary">{getProductCount(selectedCat)}</div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">Sản phẩm</div>
                </div>
                <div className="bg-orange-50/50 rounded-xl p-3.5 text-center border border-orange-100/50">
                  <div className="text-lg font-bold text-orange-600">{getChildCount(selectedCat)}</div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">Nhóm con</div>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3 text-[13px]">
                <div>
                  <span className="text-gray-500 font-medium block mb-1">Ghi chú</span>
                  <span className="text-gray-800 font-medium">{selectedCat.note || 'Không có'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block mb-1">Nhóm cha</span>
                  <span className="text-gray-800 font-medium">
                    {selectedCat.parentId ? (allFlat.find(c => c.id === selectedCat.parentId)?.name || '—') : 'Nhóm gốc'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block mb-1">Ngày tạo</span>
                  <span className="text-gray-800 font-medium">
                    {(() => {
                      if (!selectedCat.createdAt) return '—';
                      const d = new Date(selectedCat.createdAt);
                      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
                    })()}
                  </span>
                </div>
              </div>

              {/* Child categories list */}
              {getChildren(selectedCat).length > 0 && (
                <div>
                  <span className="text-[12px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Nhóm con</span>
                  <div className="space-y-1.5">
                    {getChildren(selectedCat).map(kid => (
                      <div
                        key={kid.id}
                        onClick={() => { setSelectedId(kid.id); setExpandedIds(prev => new Set([...prev, selectedCat.id])); }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50/80 hover:bg-blue-50/60 cursor-pointer transition-colors border border-gray-100 hover:border-primary/20"
                      >
                        <Folder size={14} className="text-gray-400 shrink-0" />
                        <span className="text-[13px] font-medium text-gray-700 flex-1 truncate">{kid.name}</span>
                        <span className="text-[11px] text-gray-400 font-medium shrink-0">{getProductCount(kid)} SP</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Button
                  size="sm"
                  icon={<Plus size={13} />}
                  onClick={() => openCreateModal(selectedCat.id)}
                  className="flex-1 text-[12px] font-semibold"
                >
                  Thêm nhóm con
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Edit size={13} />}
                  onClick={() => openEditModal(selectedCat)}
                  className="flex-1 text-[12px] font-semibold"
                >
                  Chỉnh sửa
                </Button>
              </div>
              <Button
                size="sm"
                icon={<Trash2 size={13} />}
                onClick={() => setDeleteConfirm(selectedCat)}
                className="w-full text-[12px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
              >
                Xóa nhóm hàng
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCategory(null); }}
        title={editingCategory ? 'Sửa nhóm hàng' : 'Thêm nhóm hàng'}
        size="sm"
        footer={
          <>
            <Button onClick={() => { setModalOpen(false); setEditingCategory(null); }} icon={<X size={14} />}>Bỏ qua</Button>
            <Button variant="primary" onClick={handleSave} icon={<Save size={14} />}>
              {editingCategory ? 'Cập nhật' : 'Lưu'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1.5 block font-medium">
              Tên nhóm hàng <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none font-medium"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Nhập tên nhóm hàng"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1.5 block font-medium">Nhóm cha</label>
            <select
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:border-primary outline-none cursor-pointer font-medium text-gray-700 bg-white"
              value={form.parentId}
              onChange={e => setForm(p => ({ ...p, parentId: e.target.value }))}
            >
              <option value="">Không có (nhóm gốc)</option>
              {allFlat
                .filter(c => c.id !== editingCategory?.id)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1.5 block font-medium">Ghi chú</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none resize-none font-medium"
              rows={3}
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Nhập ghi chú (không bắt buộc)"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}
              className="bg-red-500 hover:bg-red-600 text-white border-none"
            >
              Xóa
            </Button>
          </>
        }
      >
        <div className="text-sm text-gray-600 leading-relaxed">
          <p className="mb-2">Bạn có chắc muốn xóa nhóm hàng <strong className="text-gray-800">"{deleteConfirm?.name}"</strong>?</p>
          {deleteConfirm && getChildCount(deleteConfirm) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[13px] text-amber-700">
              ⚠️ Nhóm này có <strong>{getChildCount(deleteConfirm)} nhóm con</strong>. Các nhóm con sẽ được chuyển thành nhóm gốc sau khi xóa.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
