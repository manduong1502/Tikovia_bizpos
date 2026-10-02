import * as XLSX from 'xlsx-js-style';
import toast from 'react-hot-toast';

/**
 * Export data to XLSX and download
 * @param {string} filename - Filename without extension
 * @param {string[]} headers - Column headers
 * @param {any[][]} rows - Row data arrays
 */
export function applyExcelStyles(worksheet, autoCols = []) {
  if (!worksheet || !worksheet['!ref']) return;
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const timeCols = [];
  const sttCols = [];
  const centerCols = [];
  
  // Find column types from header row (row 0)
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCell = worksheet[XLSX.utils.encode_cell({ c: C, r: 0 })];
    if (headerCell && headerCell.v) {
      const hStr = String(headerCell.v).trim().toLowerCase();
      if (hStr === 'stt') {
        sttCols.push(C);
      } else if (hStr.includes('thời gian') || hStr.includes('ngày tạo') || hStr.includes('ngày cập nhật') || hStr.includes('ngày')) {
        timeCols.push(C);
      } else if (hStr.includes('mã') || hStr.includes('điện thoại') || hStr.includes('sđt') || hStr.includes('trạng thái') || hStr.includes('đvt')) {
        centerCols.push(C);
      }
    }
  }

  // Detect summary row (e.g. contains "Tổng cộng")
  let summaryRowIndex = -1;
  for (let R = range.e.r; R >= range.s.r + 1; --R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: R })];
      if (cell && cell.v && String(cell.v).toLowerCase().includes('tổng cộng')) {
        summaryRowIndex = R;
        break;
      }
    }
    if (summaryRowIndex !== -1) break;
  }

  const rowHeights = [];
  for (let R = range.s.r; R <= range.e.r; ++R) {
    const isHeader = R === 0;
    const isSummary = R === summaryRowIndex;

    if (isHeader) rowHeights.push({ hpt: 26 });
    else if (isSummary) rowHeights.push({ hpt: 24 });
    else rowHeights.push({ hpt: 20 });

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = { c: C, r: R };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!worksheet[cellRef]) {
        if (isSummary || isHeader) {
          worksheet[cellRef] = { v: '', t: 's' };
        } else {
          continue;
        }
      }

      const cell = worksheet[cellRef];
      let val = cell.v;
      const alignment = { vertical: 'center' };

      if (isHeader) {
        alignment.horizontal = 'center';
      } else if (isSummary) {
        if (typeof val === 'number') {
          alignment.horizontal = 'right';
        } else if (String(val).toLowerCase().includes('tổng cộng')) {
          alignment.horizontal = 'center';
        } else {
          alignment.horizontal = 'center';
        }
      } else {
        if (sttCols.includes(C)) {
          alignment.horizontal = 'center';
        } else if (timeCols.includes(C)) {
          alignment.horizontal = 'center';
        } else if (centerCols.includes(C)) {
          alignment.horizontal = 'center';
        } else if (typeof val === 'number') {
          alignment.horizontal = 'right';
        } else {
          alignment.horizontal = 'left';
        }
      }

      // Convert pure numeric string to number (avoid converting phone numbers like "0977...")
      if (R > 0 && !isHeader && !centerCols.includes(C) && !sttCols.includes(C)) {
        if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim()) && val.trim().length < 15) {
          if (!val.startsWith('0') || val === '0') {
            cell.v = Number(val.trim());
            cell.t = 'n';
            val = cell.v;
          }
        }
      }

      // Number formatting with comma separators (e.g. 1,000,000)
      if (typeof val === 'number' && !sttCols.includes(C)) {
        cell.z = '#,##0';
        alignment.horizontal = 'right';
      }

      cell.s = {
        font: {
          bold: isHeader || isSummary,
          name: 'Arial',
          sz: isHeader ? 11 : (isSummary ? 11 : 10),
          color: { rgb: isHeader ? "000000" : (isSummary ? "000000" : "1F2937") }
        },
        fill: isHeader 
          ? { fgColor: { rgb: "E2E8F0" } }
          : (isSummary ? { fgColor: { rgb: "F1F5F9" } } : undefined),
        alignment,
        border: {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: isSummary ? "double" : "thin", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        }
      };
    }
  }

  worksheet['!rows'] = rowHeights;

  if (autoCols.length > 0) {
    worksheet['!cols'] = autoCols;
  }
}

export function applyDebtExcelStyles(worksheet, autoCols = [], headerRowIndex, merges = [], lastDataRowIndex) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const maxTableR = lastDataRowIndex || (range.e.r - 5);
  
  if (merges.length > 0) {
    worksheet['!merges'] = merges;
  }

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = { c: C, r: R };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!worksheet[cellRef]) continue;
      
      let cellStyle = {
        font: { name: 'Arial', sz: 10 },
        alignment: { vertical: 'center' }
      };

      const val = worksheet[cellRef].v;

      // Title formatting
      if (typeof val === 'string' && val.includes('Công nợ chi tiết')) {
        cellStyle.font = { name: 'Arial', sz: 15, bold: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      // Date range formatting
      else if (typeof val === 'string' && (val.includes('Từ ngày') || val.includes('Toàn thời gian'))) {
        cellStyle.font = { name: 'Arial', sz: 11, italic: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      
      // Store / Customer Info section above table
      else if (R < headerRowIndex) {
        if (C === 0 || C === range.e.c - 4 || C === range.e.c - 2) {
          cellStyle.font = { name: 'Arial', sz: 10, bold: true };
        }
      }

      // Table Header formatting
      else if (R === headerRowIndex) {
        cellStyle.font = { name: 'Arial', sz: 10, bold: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
        cellStyle.fill = {
          patternType: "solid",
          fgColor: { rgb: "E5E7EB" }
        };
        cellStyle.border = {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: "thin", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        };
      }

      // Table Data formatting (STRICTLY up to maxTableR)
      else if (R > headerRowIndex && R <= maxTableR) {
        const timeCell = worksheet[XLSX.utils.encode_cell({ c: 0, r: R })];
        const isTxRow = timeCell && timeCell.v !== '' && timeCell.v !== undefined;
        
        cellStyle.border = {
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        };

        if (isTxRow) {
          cellStyle.font = { name: 'Arial', sz: 10, bold: true };
          cellStyle.border.top = { style: "thin", color: { auto: 1 } };
          cellStyle.border.bottom = { style: "thin", color: { auto: 1 } };
          cellStyle.fill = {
            patternType: "solid",
            fgColor: { rgb: "F9FAFB" }
          };
        } else {
          cellStyle.font = { name: 'Arial', sz: 9.5, italic: true };
          cellStyle.border.bottom = { style: "dashed", color: { auto: 1 } };
        }
        
        if (R === maxTableR) {
          cellStyle.border.bottom = { style: "thin", color: { auto: 1 } };
        }
        
        // Alignments per column
        if (C === 0) cellStyle.alignment.horizontal = 'center'; // Thời gian
        else if (C === 1) cellStyle.alignment.horizontal = 'center'; // Mã SKU / Mã HĐ
        else if (C === 2) cellStyle.alignment.horizontal = 'left'; // Diễn giải / Tên SP
        else if (C === 3) cellStyle.alignment.horizontal = 'center'; // ĐVT
        else cellStyle.alignment.horizontal = 'right'; // Number columns
      }

      // Format pure numeric values to comma separated currency format
      let numVal = val;
      if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim())) {
        numVal = Number(val.trim());
        worksheet[cellRef].v = numVal;
        worksheet[cellRef].t = 'n';
      }

      if (typeof numVal === 'number') {
        worksheet[cellRef].z = '#,##0';
        if (R > headerRowIndex && R <= maxTableR) {
          cellStyle.alignment = cellStyle.alignment || {};
          cellStyle.alignment.horizontal = 'right';
        }
      }

      // Footer formatting (Date and Signature section) - OUTSIDE TABLE, NO BORDERS
      if (typeof val === 'string' && val.includes('Ngày ') && val.includes('tháng ') && val.includes('năm ')) {
        cellStyle.font = { name: 'Arial', sz: 10, italic: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (typeof val === 'string' && (val === 'Khách hàng' || val === 'Nhà cung cấp' || val === 'Người lập biểu' || val === 'TM Công ty')) {
        cellStyle.font = { name: 'Arial', sz: 10, bold: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (typeof val === 'string' && val === '(Ký, họ tên)') {
        cellStyle.font = { name: 'Arial', sz: 9.5, italic: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }

      worksheet[cellRef].s = cellStyle;
    }
  }

  // Draw full outer borders ONLY for the data table (headerRowIndex to maxTableR)
  for (let R = headerRowIndex; R <= maxTableR; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      if (!worksheet[cellRef]) worksheet[cellRef] = { v: '', t: 's' };
      worksheet[cellRef].s = worksheet[cellRef].s || {};
      worksheet[cellRef].s.border = worksheet[cellRef].s.border || {};
      
      if (C === 0) worksheet[cellRef].s.border.left = { style: "thin", color: { auto: 1 } };
      if (C === range.e.c) worksheet[cellRef].s.border.right = { style: "thin", color: { auto: 1 } };
      if (R === maxTableR) worksheet[cellRef].s.border.bottom = { style: "thin", color: { auto: 1 } };
    }
  }

  if (autoCols.length > 0) {
    worksheet['!cols'] = autoCols;
  }
}

export function exportCSV(filename, headers, rows) {
  // Calculate dynamic column widths based on content
  const colWidths = headers.map((h, colIdx) => {
    let maxLen = h.length;
    rows.forEach(r => {
      const val = r[colIdx];
      if (val !== undefined && val !== null) {
        const strVal = typeof val === 'number' ? val.toLocaleString('vi-VN') : String(val);
        if (strVal.length > maxLen) maxLen = strVal.length;
      }
    });
    return { wch: Math.min(60, Math.max(10, maxLen + 3)) };
  });

  // Create a worksheet from the data array (prepend headers)
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  applyExcelStyles(worksheet, colWidths);

  // Create a new workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  // Generate XLSX file and trigger download
  XLSX.writeFile(workbook, `${filename}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
  
  toast.success('Xuất file thành công');
}

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export function exportProducts(products) {
  exportCSV('hang_hoa', ['Mã hàng', 'Tên hàng', 'Nhóm hàng', 'Giá bán', 'Giá vốn', 'Tồn kho', 'Thương hiệu'],
    products.map(p => [p.sku || '', p.name, p.category_name || '', p.sellPrice || p.sell_price || 0, p.costPrice || p.cost_price || 0, p.stock || p.stock_quantity || 0, p.brand || ''])
  );
}

export function exportOrders(orders) {
  exportCSV('hoa_don', ['Mã hóa đơn', 'Thời gian', 'Khách hàng', 'Tổng tiền', 'Giảm giá', 'Khách trả', 'Trạng thái'],
    orders.map(o => [o.order_code, o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '', o.customer_name || 'Khách lẻ', o.total || 0, o.discount_amount || 0, o.paid_amount || 0, o.payment_status || ''])
  );
}

export function exportCustomers(customers) {
  const headers = [
    'STT',
    'Mã KH',
    'Tên khách hàng',
    'Điện thoại',
    'Email',
    'Địa chỉ',
    'Ngày tạo',
    'Ghi chú',
    'Nợ hiện tại',
    'Tổng bán'
  ];

  let totalDebtSum = 0;
  let totalSpentSum = 0;

  const rows = customers.map((c, idx) => {
    const debt = Number(c.debt !== undefined && c.debt !== null ? c.debt : (c.totalDebt || 0));
    const spent = Number(c.total_spent !== undefined && c.total_spent !== null ? c.total_spent : (c.totalSpent || 0));
    totalDebtSum += debt;
    totalSpentSum += spent;

    let createdDateStr = '';
    const rawDate = c.createdAt || c.created_at;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        const hours = pad(d.getHours());
        const mins = pad(d.getMinutes());
        createdDateStr = (hours === '00' && mins === '00')
          ? `${day}/${month}/${year}`
          : `${day}/${month}/${year} ${hours}:${mins}`;
      }
    }

    return [
      idx + 1,
      c.code || (c.id ? `KH${String(c.id).padStart(6, '0')}` : ''),
      c.name || '',
      c.phone || '',
      c.email || '',
      c.address || '',
      createdDateStr,
      c.note || '',
      debt,
      spent
    ];
  });

  // Hàng tổng cộng (Summary row at bottom)
  const summaryRow = [
    '',
    'Tổng cộng',
    '',
    '',
    '',
    '',
    '',
    '',
    totalDebtSum,
    totalSpentSum
  ];
  rows.push(summaryRow);

  exportCSV('khach_hang', headers, rows);
}

export function exportSingleInvoiceExcel(order) {
  if (!order) {
    toast.error('Không tìm thấy thông tin hóa đơn');
    return;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
  const code = order.order_code || order.code || `HD${String(order.id).padStart(6, '0')}`;
  const custName = order.customer_name || order.customer?.name || 'Khách lẻ';
  const custPhone = order.customer?.phone || order.customer_phone || '';
  const custAddress = order.customer?.address || order.customer_address || '';
  
  const totalAmount = Number(order.total || 0);
  const discountAmount = Number(order.discount_amount || order.discount || 0);
  const paidAmount = Number(order.paid_amount || order.paid || 0);
  const debtAmount = totalAmount - discountAmount - paidAmount;

  const merges = [];
  const rows = [];

  // Row 0: Title (HÓA ĐƠN BÁN HÀNG)
  rows.push(['HÓA ĐƠN BÁN HÀNG', '', '', '', '', '', '', '']);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });

  // Row 1: Order Code & Time
  rows.push(['Mã hóa đơn:', code, '', '', '', '', 'Thời gian:', dateStr]);
  merges.push({ s: { r: 1, c: 1 }, e: { r: 1, c: 3 } });
  merges.push({ s: { r: 1, c: 6 }, e: { r: 1, c: 7 } });

  // Row 2: Customer Info & Phone
  rows.push(['Khách hàng:', custName, '', '', '', '', 'Điện thoại:', custPhone]);
  merges.push({ s: { r: 2, c: 1 }, e: { r: 2, c: 3 } });
  merges.push({ s: { r: 2, c: 6 }, e: { r: 2, c: 7 } });

  // Row 3: Address
  rows.push(['Địa chỉ:', custAddress, '', '', '', '', '', '']);
  merges.push({ s: { r: 3, c: 1 }, e: { r: 3, c: 7 } });

  // Row 4: Empty space
  rows.push([]);

  // Row 5: Table Headers
  const headerRowIdx = 5;
  rows.push(['STT', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'Số lượng', 'Đơn giá', 'Giảm giá', 'Thành tiền']);

  // Product Items Rows
  items.forEach((it, idx) => {
    const sku = it.product?.sku || it.product_sku || `SP${String(idx + 1).padStart(4, '0')}`;
    const name = it.product_name || it.product?.name || '';
    const unit = it.product?.unit || it.unit || 'Cái';
    const qty = Number(it.quantity || 0);
    const price = Number(it.unit_price || it.price || 0);
    const discount = Number(it.discount || 0);
    const itemTotal = Number(it.total || ((price - discount) * qty));

    rows.push([
      idx + 1,
      sku,
      name,
      unit,
      qty,
      price,
      discount,
      itemTotal
    ]);
  });

  const lastItemRowIdx = headerRowIdx + items.length;

  // Summary section
  rows.push(['', '', '', '', '', '', 'Tổng tiền hàng:', totalAmount]);
  const sumTotalRowIdx = lastItemRowIdx + 1;
  merges.push({ s: { r: sumTotalRowIdx, c: 0 }, e: { r: sumTotalRowIdx, c: 5 } });

  rows.push(['', '', '', '', '', '', 'Giảm giá hóa đơn:', discountAmount]);
  const sumDiscountRowIdx = sumTotalRowIdx + 1;
  merges.push({ s: { r: sumDiscountRowIdx, c: 0 }, e: { r: sumDiscountRowIdx, c: 5 } });

  rows.push(['', '', '', '', '', '', 'Khách cần trả:', totalAmount - discountAmount]);
  const sumMustPayRowIdx = sumDiscountRowIdx + 1;
  merges.push({ s: { r: sumMustPayRowIdx, c: 0 }, e: { r: sumMustPayRowIdx, c: 5 } });

  rows.push(['', '', '', '', '', '', 'Khách đã trả:', paidAmount]);
  const sumPaidRowIdx = sumMustPayRowIdx + 1;
  merges.push({ s: { r: sumPaidRowIdx, c: 0 }, e: { r: sumPaidRowIdx, c: 5 } });

  if (debtAmount > 0) {
    rows.push(['', '', '', '', '', '', 'Còn nợ:', debtAmount]);
    const sumDebtRowIdx = sumPaidRowIdx + 1;
    merges.push({ s: { r: sumDebtRowIdx, c: 0 }, e: { r: sumDebtRowIdx, c: 5 } });
  }

  if (order.note) {
    const noteRowIdx = rows.length;
    rows.push([`Ghi chú: ${order.note}`, '', '', '', '', '', '', '']);
    merges.push({ s: { r: noteRowIdx, c: 0 }, e: { r: noteRowIdx, c: 7 } });
  }

  // Footer Date & Signatures
  rows.push([]);
  const dateFooterRowIdx = rows.length;
  const now = new Date();
  rows.push(['', '', '', '', '', `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`, '', '']);
  merges.push({ s: { r: dateFooterRowIdx, c: 5 }, e: { r: dateFooterRowIdx, c: 7 } });

  const sigTitleRowIdx = rows.length;
  rows.push(['Khách hàng', '', '', 'Người bán hàng', '', 'TM. Công ty', '', '']);
  merges.push({ s: { r: sigTitleRowIdx, c: 0 }, e: { r: sigTitleRowIdx, c: 2 } });
  merges.push({ s: { r: sigTitleRowIdx, c: 3 }, e: { r: sigTitleRowIdx, c: 4 } });
  merges.push({ s: { r: sigTitleRowIdx, c: 5 }, e: { r: sigTitleRowIdx, c: 7 } });

  const sigSubRowIdx = rows.length;
  rows.push(['(Ký, họ tên)', '', '', '(Ký, họ tên)', '', '(Ký, đóng dấu)', '', '']);
  merges.push({ s: { r: sigSubRowIdx, c: 0 }, e: { r: sigSubRowIdx, c: 2 } });
  merges.push({ s: { r: sigSubRowIdx, c: 3 }, e: { r: sigSubRowIdx, c: 4 } });
  merges.push({ s: { r: sigSubRowIdx, c: 5 }, e: { r: sigSubRowIdx, c: 7 } });

  // Build Sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;

  // Auto Column Widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 16 }, // Mã SP
    { wch: 35 }, // Tên SP
    { wch: 10 }, // ĐVT
    { wch: 12 }, // Số lượng
    { wch: 16 }, // Đơn giá
    { wch: 14 }, // Giảm giá
    { wch: 18 }, // Thành tiền
  ];

  // Styling cells
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };

      const val = ws[cellRef].v;

      let cellStyle = {
        font: { name: 'Arial', sz: 10 },
        alignment: { vertical: 'center' }
      };

      // Title (R=0)
      if (R === 0) {
        cellStyle.font = { name: 'Arial', sz: 16, bold: true, color: { rgb: "1E40AF" } };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      // Header info section (R=1..3)
      else if (R >= 1 && R <= 3) {
        if (C === 0 || C === 6) {
          cellStyle.font = { name: 'Arial', sz: 10, bold: true, color: { rgb: "374151" } };
        } else {
          cellStyle.font = { name: 'Arial', sz: 10, bold: C === 1 };
        }
        if (C === 6) cellStyle.alignment.horizontal = 'right';
      }
      // Table Header (R=headerRowIdx)
      else if (R === headerRowIdx) {
        cellStyle.font = { name: 'Arial', sz: 10.5, bold: true, color: { rgb: "FFFFFF" } };
        cellStyle.fill = { patternType: "solid", fgColor: { rgb: "1E40AF" } };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
        cellStyle.border = {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: "medium", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        };
      }
      // Table Data Rows (headerRowIdx < R <= lastItemRowIdx)
      else if (R > headerRowIdx && R <= lastItemRowIdx) {
        cellStyle.border = {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        };

        if (R % 2 === 0) {
          cellStyle.fill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };
        }

        if (C === 0) cellStyle.alignment.horizontal = 'center';
        else if (C === 1) { cellStyle.alignment.horizontal = 'center'; cellStyle.font = { name: 'Arial', sz: 10, bold: true }; }
        else if (C === 2) cellStyle.alignment.horizontal = 'left';
        else if (C === 3) cellStyle.alignment.horizontal = 'center';
        else cellStyle.alignment.horizontal = 'right';

        if (R === lastItemRowIdx) {
          cellStyle.border.bottom = { style: "medium", color: { auto: 1 } };
        }
      }
      // Summary section rows (R > lastItemRowIdx && R < dateFooterRowIdx)
      else if (R > lastItemRowIdx && R < dateFooterRowIdx) {
        if (C === 6) {
          cellStyle.font = { name: 'Arial', sz: 10.5, bold: true };
          cellStyle.alignment = { horizontal: 'right', vertical: 'center' };
        } else if (C === 7) {
          cellStyle.font = { name: 'Arial', sz: 11, bold: true, color: { rgb: "1E40AF" } };
          cellStyle.alignment = { horizontal: 'right', vertical: 'center' };
        }
      }
      // Date Footer
      else if (R === dateFooterRowIdx) {
        cellStyle.font = { name: 'Arial', sz: 10, italic: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      // Signatures Title
      else if (R === sigTitleRowIdx) {
        cellStyle.font = { name: 'Arial', sz: 10.5, bold: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      // Signatures Subtitle
      else if (R === sigSubRowIdx) {
        cellStyle.font = { name: 'Arial', sz: 9.5, italic: true, color: { rgb: "6B7280" } };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // Format numeric cells with #,##0
      if (typeof val === 'number') {
        ws[cellRef].z = '#,##0';
        ws[cellRef].t = 'n';
      } else if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim())) {
        const num = Number(val.trim());
        ws[cellRef].v = num;
        ws[cellRef].t = 'n';
        ws[cellRef].z = '#,##0';
      }

      ws[cellRef].s = cellStyle;
    }
  }

  // Draw table outline borders
  for (let R = headerRowIdx; R <= lastItemRowIdx; ++R) {
    for (let C = 0; C <= 7; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
      ws[cellRef].s = ws[cellRef].s || {};
      ws[cellRef].s.border = ws[cellRef].s.border || {};

      if (C === 0) ws[cellRef].s.border.left = { style: "medium", color: { auto: 1 } };
      if (C === 7) ws[cellRef].s.border.right = { style: "medium", color: { auto: 1 } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HoaDon');
  XLSX.writeFile(wb, `HoaDon_${code}.xlsx`);
  toast.success('Đã xuất file hóa đơn thành công!');
}
