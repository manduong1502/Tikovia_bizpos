import { useState, useEffect, useCallback } from 'react';
import { employeeAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Plus, Download, Search, Shield, ShieldCheck, Users, Edit, Trash2 } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import EmployeeModal from './EmployeeModal';

const STATUS_MAP = { '': 'Tất cả', active: 'Đang làm', inactive: 'Đã nghỉ' };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);

  const reload = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const r = await employeeAPI.getAll(params);
      setEmployees(Array.isArray(r) ? r : (r.data || []));
    } catch { setEmployees([]); }
  }, [filterStatus, search]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = search
    ? employees.filter(e => (e.name || e.full_name || '').toLowerCase().includes(search.toLowerCase()) || (e.code || '').toLowerCase().includes(search.toLowerCase()))
    : employees;

  const handleDelete = async (emp) => {
    if (!confirm(`Bạn có chắc muốn xóa nhân viên ${emp.name || emp.full_name}?`)) return;
    try {
      await employeeAPI.delete(emp.id);
      toast.success('Xóa nhân viên thành công');
      reload();
    } catch {}
  };

  const handleExport = () => {
    exportCSV(
      [
        { key: 'code', label: 'Mã NV' },
        { key: 'name', label: 'Tên nhân viên' },
        { key: 'phone', label: 'Điện thoại' },
        { key: 'id_card', label: 'CMND/CCCD' },
        { key: 'salary', label: 'Lương' },
        { key: 'status', label: 'Trạng thái' },
      ],
      filtered.map(e => ({ ...e, name: e.name || e.full_name, code: e.code || `NV${String(e.id).padStart(4, '0')}` })),
      'nhan_vien'
    );
    toast.success('Xuất file thành công');
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Nhân viên</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditEmployee(null); setModalOpen(true); }} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none">Thêm nhân viên</Button>
          <Button icon={<Download size={16} />} className="shadow-sm" onClick={handleExport}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Trạng thái</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUS_MAP).map(([val, label]) => (
                  <button key={val} onClick={() => setFilterStatus(val)} className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterStatus === val ? 'bg-blue-50 text-primary border-primary/30 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Chi nhánh</span>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium text-gray-700 bg-gray-50/50 cursor-pointer">
                <option>Tất cả chi nhánh</option>
                <option>Chi nhánh trung tâm</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} className="text-gray-400" />} placeholder="Tìm nhân viên" value={search} onChange={e => setSearch(e.target.value)} className="bg-white" /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-left">Mã NV</th>
                <th className="px-4 py-3.5 text-left">Tên nhân viên</th>
                <th className="px-4 py-3.5 text-left">Điện thoại</th>
                <th className="px-4 py-3.5 text-left">Chi nhánh</th>
                <th className="px-4 py-3.5 text-left">Trạng thái</th>
                <th className="px-4 py-3.5 text-center w-[100px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-primary">{e.code || `NV${String(e.id).padStart(4, '0')}`}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-800">{e.name || e.full_name}</td>
                  <td className="px-4 py-3.5 text-gray-600 font-medium">{e.phone || ''}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-700">Chi nhánh trung tâm</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${e.status === 'inactive' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {e.status === 'inactive' ? 'Đã nghỉ' : 'Đang làm'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditEmployee(e); setModalOpen(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Sửa"><Edit size={15} className="text-gray-400 hover:text-primary" /></button>
                      <button onClick={() => handleDelete(e)} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Xóa"><Trash2 size={15} className="text-gray-400 hover:text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><Users size={32} className="text-gray-300" /></div><div className="text-base font-medium text-gray-500">Không có nhân viên</div></td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {filtered.length} nhân viên</span>
          </div>
        </div>
      </div>

      <EmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload} employee={editEmployee} />
    </div>
  );
}
