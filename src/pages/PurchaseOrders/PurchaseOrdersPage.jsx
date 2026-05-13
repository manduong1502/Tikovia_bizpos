import { useState, useEffect, useCallback } from 'react';
import { purchaseOrderAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Plus, Download, Search, ClipboardList } from 'lucide-react';
import { exportCSV } from '../../utils/exportUtils';
import PurchaseOrderModal from './PurchaseOrderModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const PAY_BADGE = { paid: 'bg-green-100 text-green-700', partial: 'bg-yellow-100 text-yellow-700', unpaid: 'bg-red-100 text-red-600' };
const PAY_LABEL = { paid: 'Đã TT', partial: '1 phần', unpaid: 'Chưa TT' };

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await purchaseOrderAPI.getAll({ limit: 200 });
      setOrders(Array.isArray(r) ? r : (r.data || []));
    } catch { setOrders([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = orders.filter(o => {
    if (search && !(o.po_code || '').toLowerCase().includes(search.toLowerCase()) && !(o.supplier_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPayment && o.payment_status !== filterPayment) return false;
    return true;
  });

  const handleExport = () => {
    exportCSV(
      [
        { key: 'po_code', label: 'Mã phiếu nhập' },
        { key: 'created_at_fmt', label: 'Thời gian' },
        { key: 'supplier_name', label: 'Nhà cung cấp' },
        { key: 'total', label: 'Tổng tiền' },
        { key: 'paid_amount', label: 'Đã trả' },
        { key: 'payment_status', label: 'Thanh toán' },
      ],
      filtered.map(o => ({ ...o, created_at_fmt: o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '' })),
      'nhap_hang'
    );
    toast.success('Xuất file thành công');
  };

  return (
    <div className="flex flex-col gap-5 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800 m-0 tracking-tight">Nhập hàng</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none">Nhập hàng</Button>
          <Button icon={<Download size={16} />} className="shadow-sm" onClick={handleExport}>Xuất file</Button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-[240px] shrink-0 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-sm font-bold text-gray-800 mb-2.5 block">Thanh toán</span>
              <div className="flex flex-wrap gap-1.5">
                {[{ val: '', label: 'Tất cả' }, { val: 'paid', label: 'Đã TT' }, { val: 'partial', label: '1 phần' }, { val: 'unpaid', label: 'Chưa TT' }].map(t => (
                  <button key={t.val} onClick={() => setFilterPayment(t.val)} className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer font-medium transition-all ${filterPayment === t.val ? 'bg-blue-50 text-primary border-primary/30 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-blue-50/30'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-1/3"><Input icon={<Search size={16} className="text-gray-400" />} placeholder="Theo mã phiếu, NCC" value={search} onChange={e => setSearch(e.target.value)} className="bg-white" /></div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-left">Mã phiếu nhập</th>
                <th className="px-4 py-3.5 text-left">Thời gian</th>
                <th className="px-4 py-3.5 text-left">Nhà cung cấp</th>
                <th className="px-4 py-3.5 text-right">Cần trả NCC</th>
                <th className="px-4 py-3.5 text-right">Đã trả</th>
                <th className="px-4 py-3.5 text-left">Thanh toán</th>
                <th className="px-4 py-3.5 text-left">Người tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-primary">{o.po_code}</td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-500 font-medium">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-800">{o.supplier_name || ''}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-800">{fmt(o.total)}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-gray-700">{fmt(o.paid_amount || 0)}</td>
                  <td className="px-4 py-3.5"><span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${PAY_BADGE[o.payment_status] || 'bg-gray-100 text-gray-500'}`}>{PAY_LABEL[o.payment_status] || o.payment_status}</span></td>
                  <td className="px-4 py-3.5 text-gray-500 font-medium">{o.user_name || 'Admin'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><ClipboardList size={32} className="text-gray-300" /></div><div className="text-base font-medium text-gray-500">Không có phiếu nhập</div></td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-600 font-medium">
            <span>Hiển thị {filtered.length} phiếu nhập</span>
          </div>
        </div>
      </div>

      <PurchaseOrderModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload} />
    </div>
  );
}
