import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { returnAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatWorkingHoursDateTime } from '../../utils/dateFilterUtils';
import { printHTML } from '../../utils/exportUtils';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function SalesReturnDetailModal({ open, onClose, data, partnerName, onRefresh }) {
  const navigate = useNavigate();
  const [returnDetail, setReturnDetail] = useState(data);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setReturnDetail(data);

    const hasItems = Array.isArray(data.items) && data.items.length > 0;
    const lookupId = data.id || data.code;
    if (!hasItems && lookupId) {
      let isMounted = true;
      setLoadingDetail(true);
      returnAPI.getById(lookupId)
        .then(full => {
          if (isMounted && full) {
            setReturnDetail(prev => ({
              ...prev,
              ...full,
              items: full.items || full.return_items || prev?.items || []
            }));
          }
        })
        .catch(err => {
          console.warn('Could not fetch return items:', err);
        })
        .finally(() => {
          if (isMounted) setLoadingDetail(false);
        });

      return () => { isMounted = false; };
    }
  }, [data]);

  if (!open || !data) return null;

  const currentReturn = returnDetail || data;

  const handleCancel = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy phiếu trả hàng ${currentReturn.code} này? Giao dịch này sẽ bị hủy hoàn toàn, tồn kho và công nợ sẽ được hoàn lại.`)) {
      return;
    }
    try {
      const realId = typeof currentReturn.id === 'string' ? parseInt(currentReturn.id.split('-')[0], 10) : currentReturn.id;
      await returnAPI.cancel(realId || currentReturn.code);
      toast.success('Hủy phiếu trả hàng thành công');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Hủy phiếu trả hàng thất bại');
    }
  };

  const handleOpenTicket = () => {
    navigate('/returns', {
      state: {
        openReturnCode: currentReturn.code
      }
    });
    onClose();
  };

  const handlePrint = async () => {
    let retToPrint = currentReturn;
    const lookupId = retToPrint.id || retToPrint.code;
    if ((!retToPrint.items || retToPrint.items.length === 0) && lookupId) {
      setIsPrinting(true);
      const tid = toast.loading('Đang chuẩn bị phiếu in...');
      try {
        const full = await returnAPI.getById(lookupId);
        if (full) {
          retToPrint = { ...retToPrint, ...full, items: full.items || full.return_items || [] };
          setReturnDetail(retToPrint);
        }
        toast.dismiss(tid);
      } catch (e) {
        toast.dismiss(tid);
      } finally {
        setIsPrinting(false);
      }
    }

    const f = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
    const printCode = retToPrint.code || (retToPrint.id ? `TH${retToPrint.id}` : 'PHIẾU TRẢ');
    const rawDate = retToPrint.date || retToPrint.createdAt || retToPrint.created_at;
    const printDateStr = rawDate ? formatWorkingHoursDateTime(rawDate) : new Date().toLocaleString('vi-VN');
    const printCustName = partnerName || retToPrint.customerName || retToPrint.customer_name || retToPrint.customer?.name || 'Khách lẻ';
    const itemsToPrint = retToPrint.items || retToPrint.return_items || [];

    const discountValue = Number(retToPrint.discount || 0);
    const paidValue = Number(retToPrint.paid || 0);
    const refundTotal = Number(retToPrint.total || 0) - discountValue;

    const returnHTML = `
      <style>
        .inv-wrap { width: 70mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; line-height: 1.4; padding: 10px 2mm 0 2mm; box-sizing: border-box; }
        .inv-logo-container { text-align: center; margin-bottom: 2px; }
        .inv-logo-img { width: 90px; max-height: 40px; object-fit: contain; margin: 0 auto; display: block; }
        .inv-company { text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; }
        .inv-info { text-align: center; font-size: 12px; margin: 2px 0; }
        .inv-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0 2px; color: #b91c1c; }
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

        <div class="inv-title">PHIẾU TRẢ HÀNG</div>
        <div class="inv-code-date">${printCode} - ${printDateStr}</div>

        <div class="inv-customer-info">
          <div>Khách hàng: <strong>${printCustName}</strong></div>
        </div>

        <table class="inv-table">
          <thead>
            <tr>
              <th style="text-align: left;">Mặt hàng</th>
              <th style="width: 25px;">SL</th>
              <th style="width: 28px;">ĐVT</th>
              <th style="text-align: right;">Giá trả</th>
              <th style="text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToPrint.map((it) => {
              const name = it.product?.name || it.product_name || it.name || '---';
              const unit = it.unit || it.product?.unit || 'cái';
              const qty = Number(it.quantity || 0);
              const price = Number(it.unit_price || it.price || 0);
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
            <td class="label">Tổng tiền hàng trả:</td>
            <td class="value">${f(Math.abs(retToPrint.total || 0))}</td>
          </tr>
          ${discountValue > 0 ? `
          <tr>
            <td class="label">Phí trả hàng:</td>
            <td class="value">-${f(discountValue)}</td>
          </tr>` : ''}
          <tr>
            <td class="label" style="font-weight: bold;">Cần trả khách:</td>
            <td class="value" style="font-weight: bold;">${f(refundTotal)}</td>
          </tr>
          <tr>
            <td class="label" style="font-weight: bold;">Đã trả khách:</td>
            <td class="value" style="font-weight: bold; color: #15803d;">${f(paidValue)}</td>
          </tr>
        </table>

        <div class="inv-footer" style="text-align: right; font-size: 12px; margin-top: 10px;">
          ${retToPrint.note || retToPrint.reason ? `<div>Ghi chú: ${retToPrint.note || retToPrint.reason}</div>` : ''}
        </div>
      </div>
    `;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      try {
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(`<!DOCTYPE html><html><head><title>Phiếu trả hàng ${printCode}</title></head><body>${returnHTML}<script>window.onload = function() { window.print(); };</script></body></html>`);
          printWin.document.close();
          return;
        }
      } catch (err) {
        console.warn('Popup blocked, using printHTML fallback', err);
      }
    }

    printHTML(returnHTML, `Phiếu trả hàng ${printCode}`);
  };

  const items = currentReturn.items || [];
  const statusLabels = {
    'COMPLETED': { text: 'Hoàn thành', bg: 'bg-green-100', color: 'text-green-700' },
    'PENDING': { text: 'Phiếu tạm', bg: 'bg-yellow-100', color: 'text-yellow-700' },
    'CANCELLED': { text: 'Đã hủy', bg: 'bg-red-100', color: 'text-red-700' },
  };

  const status = statusLabels[currentReturn.status] || { text: currentReturn.status || 'Hoàn thành', bg: 'bg-green-100', color: 'text-green-700' };
  const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);

  // Phí trả hàng (discount) và Tiền trả khách (paid)
  const discountVal = Number(currentReturn.discount || 0);
  const paidVal = Number(currentReturn.paid || 0);
  const refundAmount = Number(currentReturn.total || 0) - discountVal;

  return createPortal(
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/40 p-2 sm:p-4 animate-fade-in font-sans text-left" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col custom-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-800 tracking-tight">Phiếu trả hàng</h2>
            <span className="font-bold text-gray-600 text-xs sm:text-sm">{data.code}</span>
            <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded ${status.bg} ${status.color}`}>
              {status.text}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-[13px]">
            <div>
              <span className="text-gray-500 block">Ngày trả:</span>
              <span className="font-bold text-gray-800">
                {formatWorkingHoursDateTime(data.date || data.createdAt || data.created_at)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Khách hàng:</span>
              <span className="font-bold text-primary">{partnerName || 'Khách lẻ'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Chi nhánh:</span>
              <span className="font-bold text-gray-800">Chi nhánh trung tâm</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Mobile View: Cards */}
            <div className="block sm:hidden divide-y divide-gray-100">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 flex flex-col gap-1 text-xs hover:bg-gray-50/50">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-primary">{it.product?.sku || it.product_sku || it.sku || '---'}</span>
                    <span className="font-bold text-gray-800">{it.product?.name || it.product_name || it.name || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1 border-t border-gray-50">
                    <span>Số lượng: <strong className="text-gray-800">{fmt(it.quantity)}</strong></span>
                    <span>Đơn giá: <strong className="text-gray-800">{fmt(it.unit_price || it.price)}</strong></span>
                    <span>Thành tiền: <strong className="text-primary">{fmt((it.quantity || 0) * (it.unit_price || it.price || 0))}</strong></span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="p-4 text-center text-gray-400 text-xs">Không có mặt hàng nào</div>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3">Mã hàng</th>
                    <th className="p-3">Tên hàng</th>
                    <th className="p-3 text-right">Số lượng</th>
                    <th className="p-3 text-right">Giá trả lại</th>
                    <th className="p-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30">
                      <td className="p-3 text-center text-gray-400">{idx + 1}</td>
                      <td className="p-3 text-primary font-bold">{it.product?.sku || it.product_sku || it.sku || '---'}</td>
                      <td className="p-3 text-gray-800">
                        {it.product?.name || it.product_name || it.name || '---'} {it.product?.unit || it.unit ? `(${it.product?.unit || it.unit})` : ''}
                      </td>
                      <td className="p-3 text-right">{fmt(it.quantity)}</td>
                      <td className="p-3 text-right">{fmt(it.unit_price || it.price)}</td>
                      <td className="p-3 text-right font-bold text-primary">
                        {fmt((it.quantity || 0) * (it.unit_price || it.price || 0))}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">Không có mặt hàng nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end text-xs sm:text-[13px]">
            <div className="flex flex-col gap-1.5 w-full sm:w-72">
              <div className="flex justify-between">
                <span className="text-gray-500">Số lượng mặt hàng</span>
                <span className="font-bold">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tổng số lượng trả</span>
                <span className="font-bold">{totalQty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tổng tiền hàng trả</span>
                <span className="font-bold">{fmt(Math.abs(data.total))}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phí trả hàng</span>
                  <span className="font-bold text-red-600">-{fmt(discountVal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold">
                <span className="text-gray-700">Cần trả khách</span>
                <span className="text-primary">{fmt(refundAmount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">Đã trả khách</span>
                <span className="text-green-600">{fmt(paidVal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-gray-100 bg-gray-50/70 mt-auto shrink-0">
          <div>
            {currentReturn.status !== 'CANCELLED' && currentReturn.status !== 'cancelled' && (
              <button 
                onClick={handleCancel}
                className="w-full sm:w-auto px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs border-none"
              >
                Hủy phiếu
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-2.5">
            <Button 
              variant="secondary" 
              className="flex items-center justify-center gap-1 font-bold shadow-xs text-xs sm:text-sm py-2 px-3 sm:px-4 cursor-pointer" 
              onClick={handlePrint}
              disabled={isPrinting}
            >
              <Printer size={15} className="text-gray-600 shrink-0" /> 
              <span className="whitespace-nowrap">In phiếu</span>
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenTicket}
              className="shadow-sm bg-gradient-to-r from-primary to-blue-600 border-none px-3 sm:px-5 flex items-center justify-center gap-1 text-xs sm:text-sm py-2 cursor-pointer"
            >
              <ExternalLink size={15} className="shrink-0" /> 
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
