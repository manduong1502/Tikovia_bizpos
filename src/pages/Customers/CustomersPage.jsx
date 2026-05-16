import React, { useState, useEffect, useCallback } from 'react';
import { customerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Dropdown from '../../components/ui/Dropdown';
import DateFilter from '../../components/ui/DateFilter';
import { Plus, Download, Search, Trash2, Edit, User } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import CustomerModal from './CustomerModal';
import {
  getRangeByCreatedLabel,
  inDateRange,
  buildCustomRange,
} from '../../utils/dateFilterUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [expandedId, setExpandedId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  // Filter states
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState({ mode: 'all', label: 'Toàn thời gian', start: null, end: null });
  const [filterType, setFilterType] = useState('Tất cả');
  const [filterGender, setFilterGender] = useState('Tất cả');
  const [filterTotalFrom, setFilterTotalFrom] = useState('');
  const [filterTotalTo, setFilterTotalTo] = useState('');

  const fetchCustomers = useCallback(() => {
    customerAPI.getAll({ limit: 200 })
      .then(r => setCustomers(Array.isArray(r) ? r : (r.data || [])))
      .catch(() => setCustomers([]));
  }, []);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  let filtered = customers.filter(c => {
    if (search && !(c.name || '').toLowerCase().includes(search.toLowerCase()) && !(c.phone || '').includes(search) && !(c.code || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterGroup && filterGroup !== 'all') {
      return false;
    }
    if (filterType !== 'Tất cả') {
      if (filterType === 'Cá nhân' && c.type === 'company') return false;
    }
    if (filterGender !== 'Tất cả') {
      const g = (c.gender || '').toLowerCase();
      if (filterGender === 'Nam' && g !== 'nam' && g !== 'male') return false;
      if (filterGender === 'Nữ' && g !== 'nữ' && g !== 'female') return false;
    }
    if (filterTotalFrom) {
      const from = Number(filterTotalFrom) || 0;
      if (Number(c.totalSpent || c.total_spent || 0) < from) return false;
    }
    if (filterTotalTo) {
      const to = Number(filterTotalTo) || 0;
      if (Number(c.totalSpent || c.total_spent || 0) > to) return false;
    }
    return true;
  });

  if (filterDate && filterDate.mode === 'all' && filterDate.label !== 'Toàn thời gian') {
    const range = getRangeByCreatedLabel(filterDate.label);
    if (range) {
      filtered = filtered.filter(c => inDateRange(c.created_at || c.createdAt, range));
    }
  } else if (filterDate && filterDate.mode === 'custom' && filterDate.start) {
    const range = buildCustomRange(filterDate.start, filterDate.end);
    if (range) {
      filtered = filtered.filter(c => inDateRange(c.created_at || c.createdAt, range));
    }
  }

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const totalDebt = filtered.reduce((s, c) => s + Number(c.totalDebt || c.debt || 0), 0);
  const totalSales = filtered.reduce((s, c) => s + Number(c.totalSpent || c.total_spent || 0), 0);

  const loadDetail = async (id) => {
    try {
      const data = await customerAPI.getById(id);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch {}
  };

  const deleteCust = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    try {
      await customerAPI.delete(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setExpandedId(null);
      toast.success('Xóa khách hàng thành công');
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Khách hàng</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditCustomer(null); setModalOpen(true); }} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none">Khách hàng</Button>
          <Button icon={<Download size={16} />} className="shadow-sm" onClick={() => { exportCSV([{key:'code',label:'Mã KH'},{key:'name',label:'Tên'},{key:'phone',label:'ĐT'},{key:'email',label:'Email'},{key:'address',label:'Địa chỉ'},{key:'totalDebt',label:'Nợ'},{key:'totalSpent',label:'Tổng mua'}], filtered, 'khach_hang'); toast.success('Xuất file thành công'); }}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-800">Nhóm khách hàng</span>
                <button type="button" className="text-primary text-xs font-semibold hover:underline bg-transparent border-none cursor-pointer">Tạo mới</button>
              </div>
              <Dropdown
                value={filterGroup}
                options={[
                  { value: '', label: 'Tất cả các nhóm' },
                  { value: 'all', label: 'Khách hàng chung' },
                ]}
                onChange={setFilterGroup}
              />
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Ngày tạo</span>
              <DateFilter
                type="created"
                value={filterDate}
                onChange={setFilterDate}
              />
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Loại khách hàng</span>
              <div className="flex gap-1.5">
                {['Tất cả', 'Cá nhân'].map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterType === t ? 'bg-blue-50 text-primary border-primary/30 shadow-sm font-bold' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Giới tính</span>
              <div className="flex gap-1.5">
                {['Tất cả', 'Nam', 'Nữ'].map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setFilterGender(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterGender === t ? 'bg-blue-50 text-primary border-primary/30 shadow-sm font-bold' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full" />
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Tổng bán</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-gray-500 w-8">Từ</span>
                  <input
                    type="number"
                    value={filterTotalFrom}
                    onChange={e => setFilterTotalFrom(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Giá trị"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-gray-500 w-8">Tới</span>
                  <input
                    type="number"
                    value={filterTotalTo}
                    onChange={e => setFilterTotalTo(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Giá trị"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-white border border-gray-100 rounded-xl min-h-[500px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1/3">
              <Input icon={<Search size={16} className="text-gray-400" />} placeholder="Theo mã, tên, số điện thoại" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="bg-white" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /></th>
                  <th className="px-4 py-3.5">Mã khách hàng</th>
                  <th className="px-4 py-3.5">Tên khách hàng</th>
                  <th className="px-4 py-3.5">Điện thoại</th>
                  <th className="px-4 py-3.5 text-right">Nợ hiện tại</th>
                  <th className="px-4 py-3.5 text-right">Tổng bán</th>
                  <th className="px-4 py-3.5 text-right">Tổng bán trừ trả hàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="bg-blue-50/50 text-[13px] font-bold text-gray-700">
                  <td></td><td colSpan={3}></td>
                  <td className="px-4 py-2.5 text-right text-red-600">{fmt(totalDebt)}</td>
                  <td className="px-4 py-2.5 text-right text-primary">{fmt(totalSales)}</td>
                  <td className="px-4 py-2.5 text-right text-primary">{fmt(totalSales)}</td>
                </tr>
                {pageItems.map(c => {
                  const code = c.code || `KH${String(c.id).padStart(6, '0')}`;
                  const isExp = expandedId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr className={`cursor-pointer transition-colors ${isExp ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                          onClick={() => { if (isExp) setExpandedId(null); else { setExpandedId(c.id); setDetailTab('info'); loadDetail(c.id); } }}>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /></td>
                        <td className="px-4 py-3.5 font-bold text-primary">{code}</td>
                        <td className="px-4 py-3.5 font-medium text-gray-800">{c.name}</td>
                        <td className="px-4 py-3.5 text-gray-600 font-medium">{c.phone || ''}</td>
                        <td className="px-4 py-3.5 text-right font-medium text-gray-700">{fmt(c.totalDebt || 0)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-800">{fmt(c.totalSpent || 0)}</td>
                        <td className="px-4 py-3.5 text-right font-medium text-gray-700">{fmt(c.totalSpent || 0)}</td>
                      </tr>
                      {isExp && (
                        <tr><td colSpan={7} className="p-0 border-x-2 border-b-2 border-primary/20 bg-white shadow-inner" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 border-b border-gray-100 px-6 pt-2">
                            {[{k:'info',l:'Thông tin'},{k:'history',l:'Lịch sử mua hàng'},{k:'address',l:'Địa chỉ nhận hàng'},{k:'debt',l:'Nợ cần thu từ khách'}].map(t => (
                              <button key={t.k} onClick={() => setDetailTab(t.k)} className={`px-4 py-2.5 text-[13px] border-b-2 cursor-pointer transition-all ${detailTab === t.k ? 'text-primary border-primary font-bold' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>{t.l}</button>
                            ))}
                          </div>

                          {detailTab === 'info' && (
                            <div className="p-8">
                              <div className="flex items-start gap-6 mb-6">
                                <div className="w-[80px] h-[80px] bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><User size={40} className="text-primary/60" /></div>
                                <div className="flex-1 mt-1">
                                  <div className="flex items-center gap-4 mb-2">
                                    <span className="text-xl font-bold text-gray-800 tracking-tight">{c.name}</span>
                                    <span className="text-sm text-primary font-semibold">{code}</span>
                                  </div>
                                  <div className="text-sm text-gray-500 font-medium mt-1">Người tạo: <span className="text-gray-800">Admin</span> • Ngày tạo: <span className="text-gray-800">{c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''}</span></div>
                                </div>
                                <span className="text-[13px] font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md mt-1">Chi nhánh trung tâm</span>
                              </div>
                              <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-[13px] bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                {[['Điện thoại', c.phone],['Sinh nhật','Chưa có'],['Giới tính','Chưa có'],['Email', c.email],['Facebook','Chưa có'],['',''],['Địa chỉ', c.address]].map(([l,v], i) => l && (
                                  <div key={i} className={l === 'Địa chỉ' ? 'col-span-3 border-t border-gray-100 pt-4 mt-2' : ''}><span className="text-gray-500 font-medium block mb-1">{l.trim()}</span><span className="text-gray-800 font-semibold text-sm">{v || 'Chưa có thông tin'}</span></div>
                                ))}
                              </div>
                            </div>
                          )}
                          {detailTab === 'history' && (
                            <div className="p-8">
                              {c.orders && c.orders.length > 0 ? (
                                <table className="w-full text-[13px]">
                                  <thead>
                                    <tr className="text-gray-500 border-b border-gray-200">
                                      <th className="py-2.5 text-left font-semibold">Mã đơn</th>
                                      <th className="py-2.5 text-left font-semibold">Thời gian</th>
                                      <th className="py-2.5 text-left font-semibold">Trạng thái</th>
                                      <th className="py-2.5 text-right font-semibold">Tổng tiền</th>
                                    </tr>
                                  </thead>
                                <tbody>{c.orders.map((o,i) => (
                                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 text-primary font-semibold">{o.order_code}</td>
                                    <td className="py-3 text-gray-600 font-medium">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                                    <td className="py-3"><span className={`px-2 py-1 rounded-md text-[11px] font-bold ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>{o.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}</span></td>
                                    <td className="py-3 text-right font-bold text-gray-800">{fmt(o.total)}</td>
                                  </tr>
                                ))}</tbody></table>
                              ) : <div className="text-center py-10 text-gray-400 font-medium"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><User size={24} className="text-gray-300" /></div>Chưa có đơn hàng nào</div>}
                            </div>
                          )}
                          {detailTab === 'address' && <div className="p-10 text-center text-gray-400 font-medium"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><User size={24} className="text-gray-300" /></div>Chưa có địa chỉ nhận hàng</div>}
                          {detailTab === 'debt' && (
                            <div className="p-8">
                              <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-gray-100">
                                <div className="text-[15px] font-medium text-gray-600 mb-2">Nợ hiện tại</div>
                                <div className={`text-3xl font-bold tracking-tight ${c.totalDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>{c.totalDebt > 0 ? fmt(c.totalDebt) : 'Không có nợ'}</div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3 px-8 py-4 border-t border-gray-100 bg-gray-50/30">
                            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => deleteCust(c.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold bg-white border-red-200 shadow-sm">Xóa khách hàng</Button>
                            <div className="flex-1" />
                            <Button variant="primary" size="sm" icon={<Edit size={14} />} onClick={() => { setEditCustomer(c); setModalOpen(true); }} className="shadow-sm font-semibold px-4">Chỉnh sửa</Button>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {pageItems.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><User size={32} className="text-gray-300" /></div><div className="text-base font-medium text-gray-500">Không có khách hàng</div></td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {filtered.length} khách hàng</span>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 flex items-center justify-center text-xs rounded-lg border cursor-pointer font-bold transition-all ${page === i + 1 ? 'bg-primary text-white border-primary shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50 hover:text-primary hover:border-primary/50'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <CustomerModal open={modalOpen} onClose={() => setModalOpen(false)} customer={editCustomer} onSaved={fetchCustomers} />
    </div>
  );
}
