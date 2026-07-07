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
  
  // Set merges
  if (merges.length > 0) {
    worksheet['!merges'] = merges;
  }

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = {c:C, r:R};
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!worksheet[cellRef]) continue;
      
      let cellStyle = {
        font: { name: 'Arial', sz: 10 },
        alignment: { vertical: 'center' }
      };

      const val = worksheet[cellRef].v;

      // Title formatting
      if (typeof val === 'string' && val.includes('Công nợ chi tiết')) {
        cellStyle.font = { name: 'Arial', sz: 14, bold: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      // Date range formatting
      if (typeof val === 'string' && (val.includes('Từ ngày') || val.includes('Toàn thời gian'))) {
        cellStyle.font = { name: 'Arial', sz: 11, bold: true };
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      }
      
      // Store/Customer Info formatting
      if (R < headerRowIndex && C === 0) {
        cellStyle.font.bold = true;
      }
      
      // Debt Summary formatting
      if (R >= headerRowIndex - 4 && R < headerRowIndex && C >= range.e.c - 3) {
        cellStyle.font.bold = true;
      }

      // Table Header formatting
      if (R === headerRowIndex) {
        cellStyle.font.bold = true;
        cellStyle.alignment.horizontal = 'center';
        cellStyle.border = {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: "thin", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        };
      }

      // Table Data formatting
      if (R > headerRowIndex && R <= range.e.r - 4) {
        // A row is a transaction header row if Column A (Thời gian) is not empty
        const timeCell = worksheet[XLSX.utils.encode_cell({c:0, r:R})];
        const isTxRow = timeCell && timeCell.v !== '' && timeCell.v !== undefined;
        
        cellStyle.border = {
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        };

        if (isTxRow) {
          cellStyle.font.bold = true;
          cellStyle.border.top = { style: "thin", color: { auto: 1 } };
          cellStyle.border.bottom = { style: "thin", color: { auto: 1 } };
          cellStyle.fill = {
            patternType: "solid",
            fgColor: { rgb: "F9FAFB" }
          };
        } else {
          cellStyle.font.bold = false;
          cellStyle.font.italic = true;
          cellStyle.border.bottom = { style: "dashed", color: { auto: 1 } };
        }
        
        // Final bottom border for the table
        if (R === range.e.r - 4) {
          cellStyle.border.bottom = { style: "thin", color: { auto: 1 } };
        }
        
        // Alignment
        if (C === 0) cellStyle.alignment.horizontal = 'right';
        if (C === 1) cellStyle.alignment.horizontal = 'center';
        if (C >= 4 && C <= range.e.c) cellStyle.alignment.horizontal = 'right'; // Number columns
      }

      // Apply currency formatting to numeric values
      if (typeof val === 'number') {
        worksheet[cellRef].z = '#,##0';
        cellStyle.alignment = cellStyle.alignment || {};
        cellStyle.alignment.horizontal = 'right';
      }

      // Footer formatting
      if (R >= range.e.r - 3) {
        if (R === range.e.r - 3 && C === range.e.c - 1) { // Ngày tháng năm
          cellStyle.alignment.horizontal = 'center';
          cellStyle.font.italic = true;
        }
        if (R === range.e.r - 1) { // Người lập biểu
          cellStyle.font.bold = true;
          cellStyle.alignment.horizontal = 'center';
        }
        if (R === range.e.r) { // Ký tên
          cellStyle.font.italic = true;
          cellStyle.alignment.horizontal = 'center';
        }
      }

      worksheet[cellRef].s = cellStyle;
    }
  }

  // Draw full borders for the table outer box to be safe
  for (let R = headerRowIndex; R <= range.e.r - 4; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({c:C, r:R});
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
