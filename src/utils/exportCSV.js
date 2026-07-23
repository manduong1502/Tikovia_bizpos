import * as XLSX from 'xlsx-js-style';
import toast from 'react-hot-toast';

/**
 * Export data to XLSX and download
 * @param {string} filename - Filename without extension
 * @param {string[]} headers - Column headers
 * @param {any[][]} rows - Row data arrays
 */
export function applyExcelStyles(worksheet, autoCols = []) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const timeCols = [];
  
  // Find which columns have "Thời gian", "Ngày tạo" or similar in row 0
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCell = worksheet[XLSX.utils.encode_cell({c:C, r:0})];
    if (headerCell && (headerCell.v === 'Thời gian' || headerCell.v === 'Ngày tạo' || headerCell.v === 'Ngày cập nhật')) {
      timeCols.push(C);
    }
  }

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = {c:C, r:R};
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!worksheet[cellRef]) continue;
      
      const isHeader = R === 0 || (worksheet[cellRef].v && String(worksheet[cellRef].v).includes('Công nợ chi tiết'));
      
      const alignment = { vertical: 'center' };
      if (timeCols.includes(C) && R > 0) {
        alignment.horizontal = 'right';
      }
      
      worksheet[cellRef].s = {
        ...(worksheet[cellRef].s || {}),
        font: {
          bold: isHeader || (worksheet[cellRef].s?.font?.bold),
          name: 'Arial',
          sz: 11
        },
        alignment,
        border: {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: "thin", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        }
      };
    }
  }

  if (autoCols.length > 0) {
    worksheet['!cols'] = autoCols;
  }
}

export function applyDebtExcelStyles(worksheet, autoCols = [], headerRowIndex, merges = []) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
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
      if (typeof val === 'string' && (val.includes('Từ ngày') || val.includes('Toàn thời gian'))) {
        cellStyle.font = { name: 'Arial', sz: 11, italic: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      
      // Store / Customer Info section above table
      if (R < headerRowIndex) {
        if (C === 0 || C === range.e.c - 4 || C === range.e.c - 2) {
          cellStyle.font = { name: 'Arial', sz: 10, bold: true };
        }
      }

      // Table Header formatting
      if (R === headerRowIndex) {
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

      // Table Data formatting
      if (R > headerRowIndex && R <= range.e.r - 4) {
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
        
        if (R === range.e.r - 4) {
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
        cellStyle.alignment = cellStyle.alignment || {};
        cellStyle.alignment.horizontal = 'right';
      }

      // Footer formatting (Date and Signature section)
      if (R >= range.e.r - 3) {
        if (R === range.e.r - 3) { // Date line
          cellStyle.alignment.horizontal = 'center';
          cellStyle.font = { name: 'Arial', sz: 10, italic: true };
        } else if (R === range.e.r - 1) { // Signature Title
          cellStyle.font = { name: 'Arial', sz: 10, bold: true };
          cellStyle.alignment.horizontal = 'center';
        } else if (R === range.e.r) { // Signature Subtitle
          cellStyle.font = { name: 'Arial', sz: 9.5, italic: true };
          cellStyle.alignment.horizontal = 'center';
        }
      }

      worksheet[cellRef].s = cellStyle;
    }
  }

  // Draw full borders for outer box of table
  for (let R = headerRowIndex; R <= range.e.r - 4; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      if (!worksheet[cellRef]) worksheet[cellRef] = { v: '', t: 's' };
      worksheet[cellRef].s = worksheet[cellRef].s || {};
      worksheet[cellRef].s.border = worksheet[cellRef].s.border || {};
      
      if (C === 0) worksheet[cellRef].s.border.left = { style: "thin", color: { auto: 1 } };
      if (C === range.e.c) worksheet[cellRef].s.border.right = { style: "thin", color: { auto: 1 } };
      if (R === range.e.r - 4) worksheet[cellRef].s.border.bottom = { style: "thin", color: { auto: 1 } };
    }
  }

  if (autoCols.length > 0) {
    worksheet['!cols'] = autoCols;
  }
}

export function exportCSV(filename, headers, rows) {
  // Create a worksheet from the data array (prepend headers)
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  applyExcelStyles(worksheet, headers.map(h => ({ wch: Math.max(10, h.length + 2) })));

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
  exportCSV('khach_hang', ['Mã KH', 'Tên', 'Điện thoại', 'Email', 'Địa chỉ', 'Nợ hiện tại', 'Tổng bán'],
    customers.map(c => [c.code || `KH${String(c.id).padStart(6, '0')}`, c.name, c.phone || '', c.email || '', c.address || '', c.debt || 0, c.total_spent || 0])
  );
}
