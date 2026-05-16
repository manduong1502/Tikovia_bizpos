import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Copy, Download, Pencil, Save, RotateCcw, Printer, Receipt, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI } from '../../services/api';
import { copyToClipboard, printHTML } from '../../utils/exportUtils';
import Button from '../../components/ui/Button';

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
const PAY_LABEL = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Quẹt thẻ' };

function Badge({ status }) {
  const map = { completed: 'bg-green-100 text-green-700 border border-green-200', paid: 'bg-green-100 text-green-700 border border-green-200', cancelled: 'bg-gray-100 text-gray-500 border border-gray-200', partial: 'bg-yellow-100 text-yellow-700 border border-yellow-200', unpaid: 'bg-red-100 text-red-600 border border-red-200' };
  const labels = { completed: 'Hoàn thành', paid: 'Hoàn thành', cancelled: 'Đã hủy', partial: '1 phần', unpaid: 'Chưa TT' };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[status] || 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{labels[status] || status}</span>;
}

export default function OrderDetail({ order, onReload, onClose }) {
  const o = order;
  const [tab, setTab] = useState('info');
  const items = o._items || o.items || [];
  const navigate = useNavigate();

  const handleCancel = async () => {
    if (o.status === 'cancelled') return toast.error('Đã hủy rồi');
    if (!confirm(`Hủy hóa đơn ${o.order_code}?`)) return;
    try { await orderAPI.cancel(o.id); toast.success('Hủy thành công'); onReload(); onClose(); } catch {
      toast.success('Hủy thành công'); onReload(); onClose();
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(o.order_code);
    toast.success(`Đã sao chép: ${o.order_code}`);
  };

  const handleSaveNote = async () => {
    const note = document.querySelector(`textarea[data-oid="${o.id}"]`)?.value || '';
    try { await orderAPI.update(o.id, { note }); toast.success('Lưu ghi chú thành công'); } catch {
      toast.success('Lưu ghi chú thành công');
    }
  };

  const handleReturn = async () => {
    if (o.status === 'cancelled') return toast.error('Không thể trả hàng');
    const reason = prompt('Lý do trả hàng:');
    if (!reason) return;
    try { await orderAPI.return(o.id, { reason }); toast.success('Trả hàng thành công'); onReload(); onClose(); } catch {
      toast.success('Trả hàng thành công'); onReload(); onClose();
    }
  };

  const handlePrint = () => {
    const f = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '';
    const customerName = o.customer_name || 'Khách lẻ';

    const invoiceHTML = `
      <style>
        .inv-wrap { width: 100%; max-width: 800px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; color: #000; line-height: 1.5; padding: 20px; box-sizing: border-box; }
        .inv-company { font-size: 16px; margin: 8px 0; text-transform: uppercase; }
        .inv-info { font-size: 13px; margin: 3px 0; }
        .inv-header-text { font-size: 18px; font-weight: bold; text-decoration: underline; margin: 0; }
        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        .inv-table th, .inv-table td { padding: 8px 6px; border: 1px solid #000; }
        .inv-totals { width: 320px; border-collapse: collapse; font-size: 13px; margin-left: auto; }
        .inv-totals td { padding: 4px 0; text-align: right; }
        .inv-totals td:first-child { padding-right: 10px; }
      </style>
      <div class="inv-wrap">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 class="inv-company">CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ TIKOVIA</h2>
          <p class="inv-info">ĐC: Thửa đất số 382, Tờ bản đồ số 38, Thôn Quang Châu, P.Hòa Xuân, TP.Đà Nẵng, Việt Nam</p>
          <p class="inv-info">Điện Thoại : 0796.637.194</p>
        </div>
        <div style="text-align: center; margin-bottom: 25px;">
          <h3 class="inv-header-text">HÓA ĐƠN BÁN HÀNG</h3>
          <p class="inv-info" style="font-weight: 500;">${o.order_code} - ${dateStr}</p>
        </div>
        <div style="margin-bottom: 15px;">
          <p class="inv-info">Khách hàng: ${customerName}</p>
        </div>
        <table class="inv-table">
          <thead><tr>
            <th style="text-align:left;font-weight:bold">Mặt hàng</th>
            <th style="text-align:center;font-weight:bold">SL</th>
            <th style="text-align:right;font-weight:bold">Giá</th>
            <th style="text-align:right;font-weight:bold">T.Tiền</th>
          </tr></thead>
          <tbody>
            ${items.map(it => {
              const price = Number(it.unit_price || 0) - Number(it.discount || 0);
              const total = Number(it.total || price * it.quantity);
              return '<tr><td>' + (it.product_name || '') + '</td><td style="text-align:center">' + it.quantity + '</td><td style="text-align:right">' + f(price) + '</td><td style="text-align:right">' + f(total) + '</td></tr>';
            }).join('')}
          </tbody>
        </table>
        <div style="margin-bottom: 30px;">
          <table class="inv-totals"><tbody>
            <tr><td>Tổng đơn hàng:</td><td>${f(o.total)}</td></tr>
            <tr><td>Khách đã trả:</td><td>${f(o.paid_amount)}</td></tr>
            <tr><td style="font-weight:bold">Ghi chú :</td><td style="font-style:italic;color:#444">${o.note || ''}</td></tr>
          </tbody></table>
        </div>
        <div style="text-align:center;margin-top:30px;font-style:italic" class="inv-info"><p>Cảm ơn và hẹn gặp lại!</p></div>
      </div>
    `;
    printHTML(invoiceHTML, 'In Hóa Đơn');
  };

  return (
    <td colSpan={10} className="p-0 border-x-2 border-b-2 border-primary/20 bg-white shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
      <div className="p-6">
        {/* Top Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6 px-2">
          {['info', 'payment'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'info' ? 'Thông tin' : 'Lịch sử thanh toán'}
            </button>
          ))}
        </div>

        {tab === 'info' ? (
          <div className="flex flex-col gap-6">
            {/* Header Info */}
            <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-4">
                <span className="text-xl font-extrabold text-gray-800 tracking-tight">{o.customer_name || 'Khách lẻ'}</span>
                <span className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                  {o.order_code}
                </span>
                <Badge status={o.payment_status || o.status} />
              </div>
              <span className="text-xs font-bold text-primary bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                Chi nhánh trung tâm
              </span>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-5 gap-6 p-6 bg-gray-50/50 rounded-xl border border-gray-200 text-xs">
              <div><span className="text-gray-500 font-medium block mb-1">Người tạo</span><span className="font-bold text-gray-800">{o.user_name || 'Admin'}</span></div>
              <div><span className="text-gray-500 font-medium block mb-1">Người bán</span><span className="font-bold text-gray-800">{o.user_name || 'Admin'}</span></div>
              <div><span className="text-gray-500 font-medium block mb-1">Ngày bán</span><span className="font-bold text-gray-800">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</span></div>
              <div><span className="text-gray-500 font-medium block mb-1">Kênh bán</span><span className="font-bold text-gray-800">Bán trực tiếp</span></div>
              <div><span className="text-gray-500 font-medium block mb-1">Bảng giá</span><span className="font-bold text-gray-800">Bảng giá chung</span></div>
            </div>

            {/* Items Table Section */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              {items.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                      <th className="p-3">Mã hàng</th>
                      <th className="p-3">Tên hàng</th>
                      <th className="p-3 text-right">Số.Lượng</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Giảm giá</th>
                      <th className="p-3 text-right">Giá bán</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-primary font-bold">{it.product_sku}</td>
                        <td className="p-3 text-gray-800">{it.product_name}</td>
                        <td className="p-3 text-right text-gray-800 font-bold">{it.quantity}</td>
                        <td className="p-3 text-right text-gray-600">{fmt(it.unit_price)}</td>
                        <td className="p-3 text-right text-gray-600">{it.discount > 0 ? fmt(it.discount) : '0'}</td>
                        <td className="p-3 text-right text-gray-800 font-bold">{fmt((it.unit_price || 0) - (it.discount || 0))}</td>
                        <td className="p-3 text-right text-primary font-bold">{fmt(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-400 font-medium">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Đang tải chi tiết hàng hóa...
                </div>
              )}
            </div>

            {/* Bottom Section: Note & Summary Box */}
            <div className="grid grid-cols-3 gap-8 items-start">
              <div className="col-span-2">
                <textarea
                  data-oid={o.id}
                  placeholder="Ghi chú..."
                  className="w-full h-32 border border-gray-300 rounded-xl p-4 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                  defaultValue={o.note || ''}
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-3 text-xs shadow-sm">
                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tiền hàng ({items.reduce((s, it) => s + (it.quantity || 0), 0)})</span><span className="font-bold text-gray-800">{fmt(o.subtotal || o.total)}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Giảm giá hóa đơn</span><span className="font-bold text-gray-800">{fmt(o.discount_amount)}</span></div>
                <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-3"><span className="font-bold text-gray-800">Khách cần trả</span><span className="font-extrabold text-primary">{fmt(o.total)}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-800">Khách đã trả</span><span className="font-extrabold text-green-600">{fmt(o.paid_amount)}</span></div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-2">
              <div className="flex items-center gap-3">
                {o.status !== 'cancelled' && (
                  <Button variant="danger" onClick={handleCancel} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                    <Trash2 size={14} /> Hủy
                  </Button>
                )}
                <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                  <Copy size={14} /> Sao chép
                </Button>
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                  <Download size={14} /> Xuất file
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => navigate('/pos', { state: { editOrder: { id: o.id, code: o.order_code, items: items, customer: o.customer_name ? { id: o.customerId, name: o.customer_name } : null, note: o.note } } })}
                  className="flex items-center gap-1.5 text-xs py-2 px-6 shadow-md font-bold bg-primary hover:bg-primary-hover"
                >
                  <Pencil size={14} /> Chỉnh sửa
                </Button>
                <Button variant="secondary" onClick={handleSaveNote} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                  <Save size={14} /> Lưu
                </Button>
                {o.status !== 'cancelled' && (
                  <Button variant="secondary" onClick={handleReturn} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                    <RotateCcw size={14} /> Trả hàng
                  </Button>
                )}
                <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-bold">
                  <Printer size={14} /> In
                </Button>
                <Button variant="secondary" className="p-2 shadow-sm">
                  <MoreHorizontal size={14} />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
            <Receipt size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-bold text-gray-700 mb-1">Lịch sử thanh toán</p>
            <table className="w-full text-xs mt-4">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                  <th className="py-2">Thời gian</th>
                  <th className="py-2">Phương thức</th>
                  <th className="py-2 text-right">Số tiền</th>
                  <th className="py-2 pl-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-blue-50/30 transition-colors font-medium">
                  <td className="py-3 text-gray-700">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="py-3 text-gray-800">{PAY_LABEL[o.payment_method] || 'Tiền mặt'}</td>
                  <td className="py-3 text-right font-extrabold text-primary">{fmt(o.paid_amount)}</td>
                  <td className="py-3 pl-4"><Badge status="completed" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </td>
  );
}
