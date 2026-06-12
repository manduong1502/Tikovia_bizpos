import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Printer, Copy, Save, XCircle, Search, ClipboardList, MoreHorizontal } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

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
  const navigate = useNavigate();
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

  const handlePrintBarcodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>In mã vạch đơn nhập - ${o.po_code}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .barcode-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .barcode-item { border: 1px dashed #ccc; padding: 10px; text-align: center; font-size: 11px; }
          </style>
        </head>
        <body>
          <h2>IN MÃ VẠCH SẢN PHẨM</h2>
          <div class="barcode-grid">
            ${o.items?.map(it => Array(Math.min(it.quantity || 1, 10)).fill(0).map(() => `
              <div class="barcode-item">
                <div style="font-weight: bold;">${it.product_name} ${it.unit ? `(${it.unit})` : ''}</div>
                <div style="color: #666;">${it.product_sku}</div>
                <div style="font-size: 18px; margin: 4px 0; font-family: monospace;">||||||||||||||||||</div>
                <div style="font-weight: bold; color: #b91c1c;">${fmt(it.unit_price)} đ</div>
              </div>
            `).join('')).join('')}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyPO = () => {
    const itemLines = o.items?.map(it => `- ${it.product_sku}: ${it.product_name} x ${it.quantity} (Đơn giá: ${fmt(it.unit_price)})`).join('\n') || '';
    const text = `Mã đơn nhập: ${o.po_code}\nThời gian: ${o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}\nNhà cung cấp: ${o.supplier_name} (${o.supplier_code})\nCần trả NCC: ${fmt(o.total)} đ\nĐã trả: ${fmt(o.paid_amount)} đ\nChi tiết hàng hóa:\n${itemLines}`;
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép thông tin đơn nhập hàng');
  };

  const handleClonePO = () => {
    navigate('/purchase-orders/create', { state: { cloneFrom: o } });
    toast.success('Đang tạo phiếu nhập mới từ dữ liệu sao chép');
  };

  const handlePrintPO = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Đơn nhập hàng - ${o.po_code}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1e3a8a; text-align: center; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
            .info-table td { padding: 8px 12px; border: 1px solid #e5e7eb; }
            .info-table td.label { font-weight: bold; background-color: #f9fafb; width: 25%; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .items-table th, .items-table td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            .items-table th { background-color: #f3f4f6; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>PHIẾU NHẬP HÀNG</h2>
          <div style="text-align: center; margin-bottom: 20px;">Mã phiếu: <strong>${o.po_code}</strong> | Ngày nhập: ${o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</div>
          
          <table class="info-table">
            <tr><td class="label">Nhà cung cấp</td><td>${o.supplier_name} (${o.supplier_code})</td></tr>
            <tr><td class="label">Người lập phiếu</td><td>${o.created_by}</td></tr>
            <tr><td class="label">Người nhận hàng</td><td>${o.received_by}</td></tr>
            <tr><td class="label">Ghi chú</td><td>${o.note || '---'}</td></tr>
          </table>

          <h3>DANH SÁCH MẶT HÀNG</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Mã hàng</th>
                <th>Tên hàng</th>
                <th class="text-right">Số lượng</th>
                <th class="text-right">Đơn giá</th>
                <th class="text-right">Giảm giá</th>
                <th class="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${o.items?.map(it => `
                <tr>
                  <td>${it.product_sku}</td>
                  <td><strong>${it.product_name} ${it.unit ? `(${it.unit})` : ''}</strong></td>
                  <td class="text-right">${it.quantity}</td>
                  <td class="text-right">${fmt(it.unit_price)}</td>
                  <td class="text-right">${fmt(it.discount)}</td>
                  <td class="text-right"><strong>${fmt(it.total)}</strong></td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #f9fafb;">
                <td colSpan="5" class="text-right">Tổng cộng tiền hàng:</td>
                <td class="text-right">${fmt(o.subtotal || o.total)}</td>
              </tr>
              <tr style="font-weight: bold; background-color: #f9fafb;">
                <td colSpan="5" class="text-right">Giảm giá:</td>
                <td class="text-right">${fmt(o.discount_amount)}</td>
              </tr>
              <tr style="font-weight: bold; background-color: #f9fafb; color: #1d4ed8;">
                <td colSpan="5" class="text-right">Cần trả NCC:</td>
                <td class="text-right">${fmt(o.total)}</td>
              </tr>
              <tr style="font-weight: bold; background-color: #f9fafb;">
                <td colSpan="5" class="text-right">Đã thanh toán:</td>
                <td class="text-right">${fmt(o.paid_amount)}</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
                            <td className="p-3 font-bold text-gray-900">{it.product_name} {it.unit ? `(${it.unit})` : ''}</td>
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

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center gap-3">
                  <Button variant="danger" onClick={() => deletePO(o.id)} className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100">
                    <XCircle size={14} /> Hủy phiếu
                  </Button>
                  <Button variant="secondary" onClick={handleClonePO} className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold">
                    <Copy size={14} /> Sao chép
                  </Button>
                  <Button variant="secondary" onClick={handlePrintBarcodes} className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold">
                    <Printer size={14} /> In mã vạch
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="secondary" onClick={handlePrintPO} className="flex items-center gap-1.5 text-xs py-1 px-3.5 shadow-sm font-bold">
                    <Printer size={14} /> In đơn
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => alert(`Mã đơn nhập: ${o.po_code}\nNgười lập: ${o.created_by}\nNgười nhận: ${currentReceivedBy}`)}
                    className="p-2 shadow-sm border border-gray-200"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
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
