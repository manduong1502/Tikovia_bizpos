import { useState, useEffect, useCallback } from 'react';
import { supplierAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Plus, Download, Search, Building2, Edit, Trash2 } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import SupplierModal from './SupplierModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);

  const reload = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const r = await supplierAPI.getAll(params);
      setSuppliers(Array.isArray(r) ? r : (r.data || []));
    } catch { setSuppliers([]); }
  }, [search]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = search ? suppliers.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase())) : suppliers;

  const handleDelete = async (s) => {
    if (!confirm(`Bạn có chắc muốn xóa nhà cung cấp ${s.name}?`)) return;
    try {
      await supplierAPI.delete(s.id);
      toast.success('Xóa NCC thành công');
      reload();
    } catch {}
  };

  const handleExport = () => {
    exportCSV(
      [
        { key: 'code', label: 'Mã NCC' },
        { key: 'name', label: 'Tên NCC' },
        { key: 'contact_person', label: 'Người liên hệ' },
        { key: 'phone', label: 'Điện thoại' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Địa chỉ' },
        { key: 'debt', label: 'Nợ hiện tại' },
      ],
      filtered,
      'nha_cung_cap'
    );
    toast.success('Xuất file thành công');
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Nhà cung cấp</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditSupplier(null); setModalOpen(true); }} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none">Thêm nhà cung cấp</Button>
          <Button icon={<Download size={16} />} className="shadow-sm" onClick={handleExport}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Nhóm NCC</span>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium text-gray-700 bg-gray-50/50 cursor-pointer"><option>Tất cả</option></select>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} className="text-gray-400" />} placeholder="Tìm nhà cung cấp" value={search} onChange={e => setSearch(e.target.value)} className="bg-white" /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-left">Mã NCC</th>
                <th className="px-4 py-3.5 text-left">Tên nhà cung cấp</th>
                <th className="px-4 py-3.5 text-left">Điện thoại</th>
                <th className="px-4 py-3.5 text-left">Email</th>
                <th className="px-4 py-3.5 text-right">Nợ hiện tại</th>
                <th className="px-4 py-3.5 text-center w-[100px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-primary">{s.code || `NCC${String(s.id).padStart(3, '0')}`}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-800">{s.name}</td>
                  <td className="px-4 py-3.5 text-gray-600 font-medium">{s.phone || ''}</td>
                  <td className="px-4 py-3.5 text-gray-600">{s.email || ''}</td>
                  <td className={`px-4 py-3.5 text-right font-bold ${(s.debt || 0) > 0 ? 'text-red-500' : 'text-gray-700'}`}>{fmt(s.debt || 0)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditSupplier(s); setModalOpen(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Sửa"><Edit size={15} className="text-gray-400 hover:text-primary" /></button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Xóa"><Trash2 size={15} className="text-gray-400 hover:text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><Building2 size={32} className="text-gray-300" /></div><div className="text-base font-medium text-gray-500">Không có nhà cung cấp</div></td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {filtered.length} nhà cung cấp</span>
          </div>
        </div>
      </div>

      <SupplierModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload} supplier={editSupplier} />
    </div>
  );
}
