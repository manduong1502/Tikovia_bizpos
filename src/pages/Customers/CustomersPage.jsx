import React, { useState, useEffect, useCallback } from 'react';
import { customerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Plus, Download, Search, Trash2, Edit, User } from 'lucide-react';
import CustomerModal from './CustomerModal';

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

  const fetchCustomers = useCallback(() => {
    customerAPI.getAll({ limit: 200 })
      .then(r => setCustomers(Array.isArray(r) ? r : (r.data || [])))
      .catch(() => setCustomers([]));
  }, []);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = search
    ? customers.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search) || (c.code || '').toLowerCase().includes(search.toLowerCase()))
    : customers;

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const totalDebt = filtered.reduce((s, c) => s + (c.debt || 0), 0);
  const totalSales = filtered.reduce((s, c) => s + (c.total_spent || 0), 0);

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 m-0">Khách hàng</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditCustomer(null); setModalOpen(true); }}>Khách hàng</Button>
          <Button icon={<Download size={16} />}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Sidebar */}
        <div className="w-[240px] shrink-0 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-700">Nhóm khách hàng</span>
              <button className="text-primary text-xs font-medium hover:underline">Tạo mới</button>
            </div>
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm"><option>Tất cả các nhóm</option></select>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Ngày tạo</span>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="ct-date" defaultChecked /> Toàn thời gian</label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-600"><input type="radio" name="ct-date" /> Tùy chỉnh</label>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Loại khách hàng</span>
            <div className="flex gap-1">
              {['Tất cả', 'Cá nhân'].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-xs rounded border cursor-pointer transition-colors ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Giới tính</span>
            <div className="flex gap-1">
              {['Tất cả', 'Nam', 'Nữ'].map((t, i) => (
                <button key={t} className={`px-3 py-1 text-xs rounded border cursor-pointer transition-colors ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1.5 block">Tổng bán</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-6">Từ</span><input className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="Giá trị" /></div>
              <div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-6">Tới</span><input className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="Giá trị" /></div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-white border border-border rounded min-h-[500px]">
          <div className="p-3 border-b border-border bg-gray-50/50">
            <div className="w-1/3">
              <Input icon={<Search size={16} />} placeholder="Theo mã, tên, số điện thoại" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-10"><input type="checkbox" className="w-4 h-4" /></th>
                  <th className="px-3 py-3">Mã khách hàng</th>
                  <th className="px-3 py-3">Tên khách hàng</th>
                  <th className="px-3 py-3">Điện thoại</th>
                  <th className="px-3 py-3 text-right">Nợ hiện tại</th>
                  <th className="px-3 py-3 text-right">Tổng bán</th>
                  <th className="px-3 py-3 text-right">Tổng bán trừ trả hàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-gray-50/60 text-xs font-semibold text-gray-600">
                  <td></td><td colSpan={3}></td>
                  <td className="px-3 py-2 text-right">{fmt(totalDebt)}</td>
                  <td className="px-3 py-2 text-right">{fmt(totalSales)}</td>
                  <td className="px-3 py-2 text-right">{fmt(totalSales)}</td>
                </tr>
                {pageItems.map(c => {
                  const code = c.code || `KH${String(c.id).padStart(6, '0')}`;
                  const isExp = expandedId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr className={`cursor-pointer transition-colors ${isExp ? 'bg-blue-50 border-l-[3px] border-l-primary' : 'hover:bg-gray-50'}`}
                          onClick={() => { if (isExp) setExpandedId(null); else { setExpandedId(c.id); setDetailTab('info'); loadDetail(c.id); } }}>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="w-4 h-4" /></td>
                        <td className="px-3 py-3 font-medium text-primary">{code}</td>
                        <td className="px-3 py-3">{c.name}</td>
                        <td className="px-3 py-3 text-gray-500">{c.phone || ''}</td>
                        <td className="px-3 py-3 text-right">{fmt(c.debt || 0)}</td>
                        <td className="px-3 py-3 text-right font-medium">{fmt(c.total_spent || 0)}</td>
                        <td className="px-3 py-3 text-right">{fmt(c.total_spent || 0)}</td>
                      </tr>
                      {isExp && (
                        <tr><td colSpan={7} className="p-0 border-2 border-blue-200 bg-white" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-0 border-b border-gray-200">
                            {[{k:'info',l:'Thông tin'},{k:'history',l:'Lịch sử mua hàng'},{k:'address',l:'Địa chỉ nhận hàng'},{k:'debt',l:'Nợ cần thu từ khách'}].map(t => (
                              <button key={t.k} onClick={() => setDetailTab(t.k)} className={`px-4 py-2.5 text-[13px] border-b-2 cursor-pointer transition-colors ${detailTab === t.k ? 'text-primary border-primary font-semibold' : 'text-gray-500 border-transparent'}`}>{t.l}</button>
                            ))}
                          </div>

                          {detailTab === 'info' && (
                            <div className="p-5">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl shrink-0"><User size={28} className="text-gray-400" /></div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-base font-semibold">{c.name}</span>
                                    <span className="text-xs text-primary">{code}</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">Người tạo: Admin • Ngày tạo: {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''}</div>
                                </div>
                                <span className="text-xs text-gray-400">Chi nhánh trung tâm</span>
                              </div>
                              <div className="grid grid-cols-3 gap-x-8 gap-y-3 text-[13px]">
                                {[['Điện thoại', c.phone],['Sinh nhật','Chưa có'],['Giới tính','Chưa có'],['Email', c.email],['Facebook','Chưa có'],['',''],[' Địa chỉ', c.address]].map(([l,v], i) => l && (
                                  <div key={i} className={l === ' Địa chỉ' ? 'col-span-3' : ''}><span className="text-gray-400">{l.trim()}</span><span className="ml-2 text-gray-700">{v || 'Chưa có'}</span></div>
                                ))}
                              </div>
                            </div>
                          )}
                          {detailTab === 'history' && (
                            <div className="p-5">
                              {c.orders && c.orders.length > 0 ? (
                                <table className="w-full text-xs"><thead><tr className="text-gray-400 border-b"><th className="py-2 text-left">Mã đơn</th><th className="py-2 text-left">Thời gian</th><th className="py-2 text-left">Trạng thái</th><th className="py-2 text-right">Tổng tiền</th></tr></thead>
                                <tbody>{c.orders.map((o,i) => (
                                  <tr key={i} className="border-b border-gray-50"><td className="py-2 text-primary">{o.order_code}</td><td className="py-2">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td><td className="py-2"><span className={`px-2 py-0.5 rounded text-[11px] ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>{o.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}</span></td><td className="py-2 text-right font-medium">{fmt(o.total)}</td></tr>
                                ))}</tbody></table>
                              ) : <div className="text-center py-8 text-gray-300">Chưa có đơn hàng nào</div>}
                            </div>
                          )}
                          {detailTab === 'address' && <div className="p-5 text-center text-gray-300">Chưa có địa chỉ nhận hàng</div>}
                          {detailTab === 'debt' && (
                            <div className="p-5">
                              <div className="text-center py-8 text-gray-300">{c.debt > 0 ? `Nợ hiện tại: ${fmt(c.debt)}` : 'Không có nợ'}</div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100">
                            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => deleteCust(c.id)}>Xóa</Button>
                            <div className="flex-1" />
                            <Button variant="primary" size="sm" icon={<Edit size={14} />} onClick={() => { setEditCustomer(c); setModalOpen(true); }}>Chỉnh sửa</Button>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {pageItems.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không có khách hàng</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-gray-600">
            <span>{filtered.length} khách hàng</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`px-2.5 py-1 text-xs rounded border cursor-pointer ${page === i + 1 ? 'bg-primary text-white border-primary' : 'border-gray-200 hover:bg-gray-50'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <CustomerModal open={modalOpen} onClose={() => setModalOpen(false)} customer={editCustomer} onSaved={fetchCustomers} />
    </div>
  );
}
