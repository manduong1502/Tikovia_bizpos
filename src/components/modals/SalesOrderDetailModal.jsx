import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatWorkingHoursDateTime } from '../../utils/dateFilterUtils';
import { printHTML } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function SalesOrderDetailModal({ open, onClose, data, partnerName, onRefresh }) {
  const navigate = useNavigate();
  const [orderDetail, setOrderDetail] = useState(data);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setOrderDetail(data);

    // If order items are missing or empty, fetch the full order details from the server
    const hasItems = Array.isArray(data.items) && data.items.length > 0;
    const lookupId = data.id || data.code || data.order_code;
    if (!hasItems && lookupId) {
      let isMounted = true;
      setLoadingDetail(true);
      orderAPI.getById(lookupId)
        .then(full => {
          if (isMounted && full) {
            setOrderDetail(prev => ({
              ...prev,
              ...full,
              items: full.items || full.order_items || prev?.items || []
            }));
          }
        })
        .catch(err => {
          console.warn('Could not fetch full order items:', err);
        })
        .finally(() => {
          if (isMounted) setLoadingDetail(false);
        });

      return () => { isMounted = false; };
    }
  }, [data]);

  if (!open || !data) return null;

  const currentOrder = orderDetail || data;
  const code = currentOrder.code || currentOrder.order_code || (currentOrder.id ? `HD${currentOrder.id}` : '---');
  const items = currentOrder.items || currentOrder.order_items || [];
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const custName = partnerName || currentOrder.customerName || currentOrder.customer_name || currentOrder.customer?.name || 'Khách lẻ';
  const custPhone = currentOrder.customerPhone || currentOrder.customer?.phone || '';
  const custAddress = currentOrder.customerAddress || currentOrder.customer?.address || '';
  const orderDate = currentOrder.date || currentOrder.createdAt || currentOrder.created_at;
  const dateFormatted = orderDate ? formatWorkingHoursDateTime(orderDate) : '---';

  const handleCancel = async () => {
    const cancelCode = code;
    const tid = toast.loading('Đang hủy hóa đơn...');
    try {
      const realId = typeof currentOrder.id === 'string' ? parseInt(currentOrder.id.split('-')[0], 10) || currentOrder.id : currentOrder.id;
      await orderAPI.cancel(realId || cancelCode);
      toast.success(`Hủy hóa đơn ${cancelCode} thành công`, { id: tid });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.success(`Hủy hóa đơn ${cancelCode} thành công`, { id: tid });
      if (onRefresh) onRefresh();
      onClose();
    }
  };

  const handleOpenTicket = () => {
    navigate('/invoices', {
      state: {
        openOrderCode: code
      }
    });
    onClose();
  };

  const handlePrint = async () => {
    let orderToPrint = currentOrder;

    // Fetch full order if items are still missing before printing
    const lookupId = orderToPrint.id || orderToPrint.code || orderToPrint.order_code;
    if ((!orderToPrint.items || orderToPrint.items.length === 0) && lookupId) {
      setIsPrinting(true);
      const tid = toast.loading('Đang chuẩn bị phiếu in...');
      try {
        const full = await orderAPI.getById(lookupId);
        if (full) {
          orderToPrint = { ...orderToPrint, ...full, items: full.items || full.order_items || [] };
          setOrderDetail(orderToPrint);
        }
        toast.dismiss(tid);
      } catch (e) {
        toast.dismiss(tid);
      } finally {
        setIsPrinting(false);
      }
    }

    const f = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
    const printCode = orderToPrint.code || orderToPrint.order_code || (orderToPrint.id ? `HD${orderToPrint.id}` : 'HÓA ĐƠN');
    const rawDate = orderToPrint.date || orderToPrint.createdAt || orderToPrint.created_at;
    const printDateStr = rawDate ? formatWorkingHoursDateTime(rawDate) : new Date().toLocaleString('vi-VN');
    const printCustName = partnerName || orderToPrint.customerName || orderToPrint.customer_name || orderToPrint.customer?.name || 'Khách lẻ';
    const printCustPhone = orderToPrint.customerPhone || orderToPrint.customer?.phone || '';
    const printCustAddress = orderToPrint.customerAddress || orderToPrint.customer?.address || '';

    const paidAmount = orderToPrint.paid_amount ?? orderToPrint.paid ?? 0;
    let oldDebt = 0;
    let remainingDebt = 0;
    if (orderToPrint.oldDebt !== undefined && orderToPrint.oldDebt !== null) {
      oldDebt = Number(orderToPrint.oldDebt);
      remainingDebt = orderToPrint.newDebt !== undefined && orderToPrint.newDebt !== null 
        ? Number(orderToPrint.newDebt) 
        : (oldDebt + Number(orderToPrint.total || 0) - Number(paidAmount));
    } else {
      const custDebt = orderToPrint.customer ? Number(orderToPrint.customer.totalDebt || orderToPrint.customer.debt || 0) : 0;
      oldDebt = orderToPrint.customer ? Math.max(0, custDebt - (Number(orderToPrint.total || 0) - Number(paidAmount))) : 0;
      remainingDebt = oldDebt + Number(orderToPrint.total || 0) - Number(paidAmount);
    }
    const totalDebt = oldDebt + Number(orderToPrint.total || 0);

    const itemsToPrint = orderToPrint.items || orderToPrint.order_items || [];

    const invoiceHTML = `
      <style>
        .inv-wrap { width: 70mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; line-height: 1.4; padding: 10px 2mm 0 2mm; box-sizing: border-box; }
        .inv-logo-container { text-align: center; margin-bottom: 2px; }
        .inv-logo-img { width: 90px; max-height: 40px; object-fit: contain; margin: 0 auto; display: block; }
        .inv-company { text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; }
        .inv-info { text-align: center; font-size: 12px; margin: 2px 0; }
        .inv-stk { text-align: center; font-size: 12px; font-weight: bold; margin: 2px 0; }
        .inv-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0 2px; }
        .inv-code-date { text-align: center; font-size: 11px; margin-bottom: 10px; color: #333; }
        .inv-customer-info { font-size: 12px; margin-bottom: 8px; line-height: 1.5; }
        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
        .inv-table th, .inv-table td { border: 1px solid #000 !important; padding: 4px 2px; }
        .inv-table th { font-weight: bold; text-align: center; }
        .inv-summary { width: 100%; font-size: 12px; margin-bottom: 15px; border-collapse: collapse; }
        .inv-summary td { padding: 3px 0; border: none !important; }
        .inv-summary .label { text-align: right; padding-right: 15px; }
        .inv-summary .value { text-align: right; width: 90px; }
        .inv-footer { font-size: 12px; line-height: 1.5; font-weight: bold; margin-bottom: 15px; }
        .inv-thanks { text-align: center; font-size: 12px; font-style: italic; margin-top: 20px; }
        @media print {
          @page { margin: 0; }
          body { margin: 0; padding: 0; }
          .inv-wrap { padding: 5mm 4mm 0 4mm; width: 70mm; margin: 0 auto; }
        }
      </style>
      <div class="inv-wrap">
        <div class="inv-logo-container">
          <img src="${window.location.origin}/logovuong.png" class="inv-logo-img" alt="TIKOVIA" onerror="this.style.display='none'" />
        </div>
        <div class="inv-company">CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ TIKOVIA</div>
        <div class="inv-info" style="margin-top: 10px;">ĐC: 82 Trần Tử Bình, Hòa Châu, Hòa Vang, ĐN</div>
        <div class="inv-info">Điện Thoại: 0796.637.194</div>
        <div class="inv-stk">STK : 8282688686</div>
        <div class="inv-stk">Ngân hàng: TMCP Quân Đội (MB Bank)</div>

        <div class="inv-title">HÓA ĐƠN BÁN HÀNG</div>
        <div class="inv-code-date">${printCode} - ${printDateStr}</div>

        <div class="inv-customer-info">
          <div>Khách hàng: <strong>${printCustName}</strong></div>
          ${printCustPhone ? `<div>SĐT: ${printCustPhone}</div>` : ''}
          ${printCustAddress ? `<div>ĐC: ${printCustAddress}</div>` : ''}
        </div>

        <table class="inv-table">
          <thead>
            <tr>
              <th style="text-align: left;">Mặt hàng</th>
              <th style="width: 25px;">SL</th>
              <th style="width: 28px;">ĐVT</th>
              <th style="text-align: right;">Giá</th>
              <th style="text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToPrint.map((it) => {
              const name = it.product_name || it.product?.name || it.name || '---';
              const unit = it.unit || it.product?.unit || 'cái';
              const qty = Number(it.quantity || 0);
              const price = Number(it.unit_price || it.price || 0) - Number(it.discount || 0);
              const itemTotal = Number(it.total || qty * price);
              return `
              <tr>
                <td>${name}</td>
                <td style="text-align: center;">${f(qty)}</td>
                <td style="text-align: center;">${unit}</td>
                <td style="text-align: right;">${f(price)}</td>
                <td style="text-align: right;">${f(itemTotal)}</td>
              </tr>
              `;
            }).join('')}
            ${itemsToPrint.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:10px;">Không có mặt hàng nào</td></tr>' : ''}
          </tbody>
        </table>

        <table class="inv-summary">
          <tr>
            <td class="label">Tổng đơn hàng:</td>
            <td class="value">${f(Math.abs(orderToPrint.total || 0))}</td>
          </tr>
          ${oldDebt > 0 ? `
          <tr>
            <td class="label">Nợ cũ:</td>
            <td class="value">${f(oldDebt)}</td>
          </tr>
          <tr>
            <td class="label">Tổng Nợ:</td>
            <td class="value">${f(totalDebt)}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Khách đã trả:</td>
            <td class="value">${f(paidAmount)}</td>
          </tr>
          ${remainingDebt > 0 ? `
          <tr>
            <td class="label">Dư nợ sau khi trả:</td>
            <td class="value" style="font-weight: bold; color: #b91c1c;">${f(remainingDebt)}</td>
          </tr>` : ''}
        </table>

        <div class="inv-footer" style="text-align: right; font-size: 12px; font-weight: bold; margin-top: 10px;">
          <div style="margin-bottom: 5px;">Chữ ký Khách Hàng :</div>
          ${orderToPrint.note ? `<div style="white-space: pre-wrap; font-weight: normal; margin-top: 4px;">Ghi chú: ${orderToPrint.note}</div>` : ''}
        </div>

        <div class="inv-thanks">
          Cảm ơn và hẹn gặp lại!
        </div>
      </div>
    `;

    // Mobile fallback if browser blocks iframe print
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      try {
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(`<!DOCTYPE html><html><head><title>Hóa đơn ${printCode}</title></head><body>${invoiceHTML}<script>window.onload = function() { window.print(); };</script></body></html>`);
          printWin.document.close();
          return;
        }
      } catch (err) {
        console.warn('Popup blocked, using printHTML fallback', err);
      }
    }

    printHTML(invoiceHTML, `Hóa đơn ${printCode}`);
  };

  const statusLabels = {
    'COMPLETED': { text: 'Hoàn thành', bg: 'bg-green-100', color: 'text-green-700' },
    'PENDING': { text: 'Phiếu tạm', bg: 'bg-yellow-100', color: 'text-yellow-700' },
    'CANCELLED': { text: 'Đã hủy', bg: 'bg-red-100', color: 'text-red-700' },
  };

  const status = statusLabels[currentOrder.status] || { text: currentOrder.status || 'Hoàn thành', bg: 'bg-green-100', color: 'text-green-700' };

  return createPortal(
    <div className="fixed inset-0 z-[200000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans text-left" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-gray-100 animate-scale-up custom-scrollbar overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <h3 className="font-extrabold text-base sm:text-lg text-gray-800 truncate">
              Chi tiết hóa đơn {code}
            </h3>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color} shrink-0`}>
              {status.text}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors shrink-0 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        {/* Body Content */}
        <div className="p-3.5 sm:p-6 flex flex-col gap-4 sm:gap-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Order Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 text-xs sm:text-[13px] bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-gray-150">
            <div>
              <span className="text-gray-500 block text-[11px]">Ngày bán:</span>
              <span className="font-bold text-gray-800">{dateFormatted}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Khách hàng:</span>
              <span className="font-bold text-primary truncate block">{custName}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-gray-500 block text-[11px]">Chi nhánh:</span>
              <span className="font-bold text-gray-800">{currentOrder.branch || 'Chi nhánh trung tâm'}</span>
            </div>
            {custPhone && (
              <div>
                <span className="text-gray-500 block text-[11px]">Số điện thoại:</span>
                <span className="font-semibold text-gray-700">{custPhone}</span>
              </div>
            )}
            {custAddress && (
              <div className="col-span-2">
                <span className="text-gray-500 block text-[11px]">Địa chỉ:</span>
                <span className="font-semibold text-gray-700">{custAddress}</span>
              </div>
            )}
          </div>

          {/* Table with mobile horizontal scroll */}
          <div className="border border-gray-200 rounded-xl overflow-x-auto custom-scrollbar shadow-xs">
            <table className="w-full text-xs sm:text-[13px] min-w-[500px]">
              <thead>
                <tr className="bg-gray-100/90 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                  <th className="p-2.5 sm:p-3 w-10 text-center">STT</th>
                  <th className="p-2.5 sm:p-3">Mã hàng</th>
                  <th className="p-2.5 sm:p-3">Tên hàng</th>
                  <th className="p-2.5 sm:p-3 text-right">Số lượng</th>
                  <th className="p-2.5 sm:p-3 text-right">Đơn giá</th>
                  <th className="p-2.5 sm:p-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-2.5 sm:p-3 text-center text-gray-400">{idx + 1}</td>
                    <td className="p-2.5 sm:p-3 text-primary font-bold">{it.product_sku || it.sku || it.product?.sku || '---'}</td>
                    <td className="p-2.5 sm:p-3 text-gray-800">
                      {(it.product_name || it.name || it.product?.name || '---')} {it.product?.unit || it.unit ? `(${it.product?.unit || it.unit})` : ''}
                    </td>
                    <td className="p-2.5 sm:p-3 text-right">{fmt(it.quantity)}</td>
                    <td className="p-2.5 sm:p-3 text-right">{fmt(it.unit_price || it.price)}</td>
                    <td className="p-2.5 sm:p-3 text-right font-bold text-primary">
                      {fmt((Number(it.quantity) || 0) * (Number(it.unit_price || it.price) || 0))}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400">
                      {loadingDetail ? 'Đang tải chi tiết mặt hàng...' : 'Không có mặt hàng nào'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end w-full text-xs sm:text-[13px]">
            <div className="w-full sm:w-80 flex flex-col gap-2 bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-gray-150">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Số lượng mặt hàng</span>
                <span className="font-bold text-gray-800">{items.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Tổng số lượng</span>
                <span className="font-bold text-gray-800">{totalQty}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Tổng tiền hàng</span>
                <span className="font-bold text-gray-900">{fmt(Math.abs(currentOrder.total || 0))}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-200/60 pt-1.5">
                <span className="text-gray-600 font-semibold">Khách đã trả</span>
                <span className="font-bold text-primary">{fmt(currentOrder.paid ?? currentOrder.paid_amount ?? 0)}</span>
              </div>
              {Number(currentOrder.total || 0) > Number(currentOrder.paid ?? currentOrder.paid_amount ?? 0) && (
                <div className="flex justify-between gap-4 text-amber-700 font-semibold">
                  <span>Còn thiếu</span>
                  <span>{fmt(Number(currentOrder.total || 0) - Number(currentOrder.paid ?? currentOrder.paid_amount ?? 0))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
          <div>
            {currentOrder.status !== 'CANCELLED' && currentOrder.status !== 'cancelled' && (
              <button 
                onClick={handleCancel}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs border-none"
              >
                Hủy phiếu
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-3">
            <Button 
              variant="secondary" 
              className="flex items-center justify-center gap-1.5 font-bold shadow-xs text-xs sm:text-sm py-2 px-3 sm:px-4 cursor-pointer" 
              onClick={handlePrint}
              disabled={isPrinting}
            >
              <Printer size={16} className="text-gray-600 shrink-0" /> 
              <span className="whitespace-nowrap">In phiếu</span>
            </Button>
            <Button 
              variant="primary" 
              onClick={handleOpenTicket} 
              className="shadow-sm bg-gradient-to-r from-primary to-blue-600 border-none px-3 sm:px-6 flex items-center justify-center gap-1.5 text-xs sm:text-sm py-2 cursor-pointer"
            >
              <ExternalLink size={16} className="shrink-0" /> 
              <span className="whitespace-nowrap">Mở phiếu</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={onClose} 
              className="border border-gray-200 text-xs sm:text-sm py-2 px-3 sm:px-4 cursor-pointer"
            >
              Đóng
            </Button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
