import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Download, Search, Shield, ShieldCheck } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get('/api/users').then(r => setEmployees(Array.isArray(r.data) ? r.data : [])).catch(() => setEmployees([]));
  }, []);

  const filtered = search ? employees.filter(e => (e.full_name || '').toLowerCase().includes(search.toLowerCase())) : employees;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Nhân viên</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={16} />}>Thêm nhân viên</Button>
          <Button icon={<Download size={16} />}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Trạng thái</span>
            <div className="flex gap-1">
              {['Tất cả', 'Đang làm', 'Đã nghỉ'].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-xs rounded border cursor-pointer ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Chi nhánh</span>
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm"><option>Tất cả chi nhánh</option><option>Chi nhánh trung tâm</option></select>
          </div>
        </div>

        <div className="flex-1 bg-white border border-border rounded">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} />} placeholder="Tìm nhân viên" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr>
                <th className="px-3 py-3 w-10"><input type="checkbox" className="w-4 h-4" /></th>
                <th className="px-3 py-3 text-left">Mã NV</th>
                <th className="px-3 py-3 text-left">Tên nhân viên</th>
                <th className="px-3 py-3 text-left">Điện thoại</th>
                <th className="px-3 py-3 text-left">Chi nhánh</th>
                <th className="px-3 py-3 text-left">Vai trò</th>
                <th className="px-3 py-3 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3"><input type="checkbox" className="w-4 h-4" /></td>
                  <td className="px-3 py-3 font-medium text-primary">NV{String(e.id).padStart(4,'0')}</td>
                  <td className="px-3 py-3 font-medium">{e.full_name}</td>
                  <td className="px-3 py-3 text-gray-500">{e.phone || ''}</td>
                  <td className="px-3 py-3">Chi nhánh trung tâm</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${e.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-primary'}`}>
                      {e.role === 'admin' ? <><ShieldCheck size={12} /> Quản trị viên</> : <><Shield size={12} /> Nhân viên</>}
                    </span>
                  </td>
                  <td className="px-3 py-3"><span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[11px]">Đang làm</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không có nhân viên</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
