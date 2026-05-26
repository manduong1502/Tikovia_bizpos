import { useState } from 'react';
import { Eye, Printer, Copy, Save, XCircle, Search, ClipboardList } from 'lucide-react';
import Button from '../../../components/ui/Button';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function PurchaseOrderDetail({
  order: o,
  visibleColumns,
  PAY_BADGE,
  PAY_LABEL,
  poNotes,
  poReceivedBy,
  handleUpdateReceivedBy,
  deletePO,
  purchaseReturns = []
}) {
  const [detailTab, setDetailTab] = useState('info');
  const [detailSearchSku, setDetailSearchSku] = useState('');
  const [detailSearchName, setDetailSearchName] = useState('');

  const items = o.items?.filter(it => {
    if (detailSearchSku && !(it.product_sku || '').toLowerCase().includes(detailSearchSku.toLowerCase())) return false;
    if (detailSearchName && !(it.product_name || '').toLowerCase().includes(detailSearchName.toLowerCase())) return false;
    return true;
  }) || [];

  const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
  const subtotal = items.reduce((s, it) => s + ((it.unit_price || 0) * (it.quantity || 0)), 0);
  const totalDiscount = items.reduce((s, it) => s + (it.discount || 0), 0);
  const finalTotal = subtotal - totalDiscount;

  const currentNote = poNotes[o.id] ?? o.note;
  const currentReceivedBy = poReceivedBy[o.id] ?? o.received_by;

  return (
    <tr id={`detail-${o.id}`} className="bg-white shadow-xl border-x-2 border-b-2 border-primary/20 animate-fade-in">
      <td colSpan={visibleColumns.length + 2} className="p-0">
        <div className="p-3">
          {/* Top Tabs */}
          <div className="flex gap-3 border-b border-gray-200 mb-3 px-2">
            <button
              onClick={() => setDetailTab('info')}
              className={`py-1 px-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                detailTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Thông tin
            </button>
            <button
              onClick={() => setDetailTab('history')}
              className={`py-1 px-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                detailTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Lịch sử thanh toán
            </button>
            <button
              onClick={() => setDetailTab('returns')}
              className={`py-1 px-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                detailTab === 'returns' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Lịch sử trả hàng
            </button>
          </div>

          {detailTab === 'info' ? (
            <div className="flex flex-col gap-4">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between bg-blue-50/50 p-2 px-3 rounded-lg border border-blue-100 text-xs gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-800 tracking-tight">{o.po_code}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${PAY_BADGE[o.payment_status]}`}>
                    {PAY_LABEL[o.payment_status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Người nhập:</span>
                    <select
                      className="border border-gray-300 rounded px-2.5 py-1 text-sm font-bold text-gray-800 bg-white outline-none focus:border-primary shadow-sm"
                      value={currentReceivedBy}
                      onChange={(e) => handleUpdateReceivedBy(o.id, e.target.value)}
                    >
                      <option value="Võ Thành Huy">Võ Thành Huy</option>
                      <option value="Admin">Admin</option>
                      <option value="Nguyễn Văn A">Nguyễn Văn A</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Eye size={16} /> <span className="font-bold">{o.view_count || 1}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-2 my-2">
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-1 px-2.5 border border-gray-200 shadow-sm font-bold text-gray-700 bg-white hover:bg-gray-50">
                  <Printer size={15} className="text-gray-500" /> In mã vạch
                </Button>
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-1 px-2.5 border border-gray-200 shadow-sm font-bold text-gray-700 bg-white hover:bg-gray-50">
                  <Copy size={15} className="text-gray-500" /> Sao chép
                </Button>
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-1 px-2.5 border border-gray-200 shadow-sm font-bold text-gray-700 bg-white hover:bg-gray-50">
                  <Printer size={15} className="text-gray-500" /> In đơn
                </Button>
                <Button variant="danger" onClick={() => deletePO(o.id)} className="flex items-center gap-1.5 text-xs py-1 px-2.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 font-bold shadow-sm">
                  <XCircle size={15} /> Hủy phiếu
                </Button>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side: Items */}
                <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Search inner */}
                  <div className="p-3 border-b border-gray-200 bg-gray-50/50 flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Tìm theo mã hàng..."
                        value={detailSearchSku}
                        onChange={(e) => setDetailSearchSku(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-primary shadow-sm"
                      />
                    </div>
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Tìm theo tên hàng..."
                        value={detailSearchName}
                        onChange={(e) => setDetailSearchName(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-primary shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-left text-gray-600 font-bold uppercase tracking-wide">
                          <th className="p-3">Mã hàng</th>
                          <th className="p-3">Tên hàng</th>
                          <th className="p-3 text-right">Số lượng</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 text-right">Giảm giá</th>
                          <th className="p-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {items.length > 0 ? items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 text-gray-800">{it.product_sku}</td>
                            <td className="p-3 font-bold text-gray-900">{it.product_name}</td>
                            <td className="p-3 text-right text-gray-800">{it.quantity}</td>
                            <td className="p-3 text-right text-gray-800">{fmt(it.unit_price)}</td>
                            <td className="p-3 text-right text-gray-800">{fmt(it.discount)}</td>
                            <td className="p-3 text-right font-bold text-gray-900">{fmt(it.total)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">Không tìm thấy hàng hóa</td>
                          </tr>
                        )}
                        {/* Totals Row */}
                        {items.length > 0 && (
                          <tr className="bg-blue-50/30 border-t-2 border-blue-100 font-bold text-gray-900">
                            <td colSpan={2} className="p-3 text-right">Tổng cộng:</td>
                            <td className="p-3 text-right">{totalQty}</td>
                            <td className="p-3 text-right">-</td>
                            <td className="p-3 text-right">{fmt(totalDiscount)}</td>
                            <td className="p-3 text-right text-primary">{fmt(finalTotal)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: Summary */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-extrabold text-gray-800 mb-4 tracking-tight flex items-center gap-2">
                      <Save size={16} className="text-gray-500" /> Thanh toán
                    </h3>
                    <div className="space-y-3 text-sm font-medium">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Tổng tiền hàng</span>
                        <span className="font-bold text-gray-900">{fmt(o.subtotal || o.total)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Giảm giá</span>
                        <span className="font-bold text-gray-900">{fmt(o.discount_amount)}</span>
                      </div>
                      <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-extrabold text-gray-800">Cần trả NCC</span>
                        <span className="font-extrabold text-primary text-base">{fmt(o.total)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Đã trả NCC</span>
                        <span className="font-bold text-gray-900">{fmt(o.paid_amount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-extrabold text-gray-800 mb-3 tracking-tight">Ghi chú</h3>
                    <textarea
                      readOnly
                      value={currentNote}
                      className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:border-primary resize-none shadow-sm"
                      placeholder="Không có ghi chú..."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : detailTab === 'history' ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-gray-600 font-bold uppercase tracking-wide">
                      <th className="p-3">Mã phiếu chi</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Phương thức</th>
                      <th className="p-3 text-right">Giá trị</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {(o.paid_amount || 0) > 0 ? (
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 text-primary font-bold">{`PC${(o.po_code || '').replace('PN', '') || '0001'}`}</td>
                        <td className="p-3 text-gray-800">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                        <td className="p-3 text-gray-800">{o.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
                        <td className="p-3 text-right font-bold text-gray-900">{fmt(o.paid_amount)}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700">Hoàn thành</span>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">Không có lịch sử thanh toán</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-gray-600 font-bold uppercase tracking-wide">
                      <th className="p-3">Mã phiếu trả</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3 text-right">Tổng tiền trả</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {purchaseReturns && purchaseReturns.length > 0 ? (
                      purchaseReturns.map(pr => (
                        <tr key={pr.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-3 text-primary font-bold">{pr.code}</td>
                          <td className="p-3 text-gray-800">{pr.created_at || pr.createdAt ? new Date(pr.created_at || pr.createdAt).toLocaleString('vi-VN') : ''}</td>
                          <td className="p-3 text-right font-bold text-gray-900">{fmt(pr.total)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700">Đã trả hàng</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400">Không có lịch sử trả hàng</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
