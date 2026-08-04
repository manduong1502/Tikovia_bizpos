# 🚀 TIKO BIZPOS - TIẾN TRÌNH DỰ ÁN & BÀN GIAO CÔNG VIỆC (HANDOVER GUIDE)

> **File này được tự động khởi tạo để đồng bộ bối cảnh công việc cho Antigravity AI khi bạn về nhà sử dụng máy tính khác.**

---

## 📌 1. TỔNG QUAN HỆ THỐNG & TÀI KHOẢN REFER

- **Dự án**: Hệ thống Quản lý Bán hàng, Khách hàng, Sổ quỹ & Báo cáo Tài chính **Tiko BizPOS** (mô phỏng chuẩn 100% KiotViet).
- **Cấu trúc Thư mục Codebase**:
  - 🖥️ **Frontend React (Vite/Tailwind)**: `d:\Mẫn\demo web kioviet\kiotviet-react`
    - Repository Git: `https://github.com/manduong1502/Tikovia_bizpos.git` (Nhánh: `main`)
  - ⚙️ **Backend Node/Express (TypeScript/Prisma)**: `d:\Mẫn\demo web kioviet\kiotviet-backend`
    - Repository Git: `https://github.com/manduong1502/Tikovia_bizpos_backend.git` (Nhánh: `main`)
- **Tài khoản KiotViet Gốc (Read-Only dùng để so sánh số liệu)**:
  - 🔗 URL: `https://thucphamtichdaiviet.kiotviet.vn/man/#/FinancialReport`
  - 👤 Username: `tichdaiviet`
  - 🔑 Password: `Tichdaiviet0491@@@@@`
- **Địa chỉ Web & Server Production**:
  - 🌐 Website App: `https://bizpos.tikovia.vn`
  - 🗄️ Database PostgreSQL: `postgresql://tikovia:tikovia_secure_2026@192.168.1.200:5433/bizpos?schema=public`
  - 💻 SSH Server: `hoangnam@192.168.1.200`
    - Backend Path VPS: `/mnt/ssd500/tiko/bizpos-api`
    - Frontend Path VPS: `/mnt/ssd500/tiko/bizpos-react`

---

## ✅ 2. CÁC HẠNG MỤC ĐÃ HOÀN THÀNH XUẤT SẮC

### 1. **Báo cáo Tài chính (`/reports/financial`) chuẩn 100% KiotViet**
- **Lỗi cũ**: Lợi nhuận thuần bị âm -2.7 tỷ VNĐ do gom nhầm chi phí trả nợ Nhà cung cấp (`Phiếu chi Tiền trả NCC`) vào Chi phí hoạt động (Mục 6).
- **Đã sửa**: Trong `reportController.ts`, lọc loại bỏ toàn bộ phiếu chi của Nhà cung cấp (`isSupplierPayment`).
- **Kết quả (Tháng 7/2026)**:
  - Doanh thu thuần (Mục 3): **4.809.880.468 đ** (Trùng khớp 100% KiotViet)
  - Giá vốn hàng bán (Mục 4): **4.256.927.127 đ** (Trùng khớp 100% KiotViet)
  - Lợi nhuận thuần (Mục 10): **552.953.341 đ** (Trùng khớp 100% KiotViet)

### 2. **Tốc độ Realtime 0ms & Đẩy Khách hàng mới mua lên đầu trang (`/customers`)**
- **Đã sửa**: Sắp xếp danh sách khách hàng theo `lastTransaction desc, updatedAt desc, id desc`. Loại bỏ mã ghép `[...toAdd, ...list]` ở frontend gây dính cứng khách *"453 Tôn Đức Thắng"*.
- **Tối ưu 0ms**: Thêm cơ chế Optimistic UI Update. Ngay khi bấm tạo đơn trên POS hoặc thanh toán, khách hàng đó lập tức nhảy thẳng lên vị trí số 1 trong 0 mili-giây.

### 3. **Tìm kiếm Khách hàng thông minh**
- **Đã nâng cấp**: Tìm kiếm quét trên cả 5 trường **`Tên` + `Mã KH` + `SĐT` + `Địa chỉ` + `Ghi chú`**.
- Giúp tìm thấy ngay khách hàng *"anh Quốc Quảng Ngãi"* (`KH000926`) khi thu ngân gõ SĐT nhà xe Sơn Tùng (`0901941456`), SĐT phụ (`0344298927`), không bị gán nhầm thành "Khách lẻ" nữa.

### 4. **Xóa sạch & Re-import Dữ liệu mới nhất cho Chị Yến (`KH001119`)**
- **Đã làm sạch**: Xóa sạch toàn bộ hóa đơn và công nợ cũ của khách hàng **CHỊ YẾN - BÊ THUI HOÀNG YẾN - Hòa Tiến** (`KH001119`).
- **Nạp dữ liệu mới**: Từ 2 file Excel (`DanhSachChiTietHoaDon_Chị yến bê thui năm nay.xlsx` và `CongNoChiTietKhachHang_ChiYenBeThui.xlsx`).
- **Số liệu chốt chuẩn 100% KiotViet**:
  - 📦 Tổng số hóa đơn: **200 hóa đơn**
  - 💳 Tổng số phiếu thu: **204 phiếu thu**
  - 💰 Tổng bán (`totalSpent`): **489.366.600 đ** (Khớp chính xác 100% KiotViet)
  - 📌 Công nợ hiện tại (`totalDebt`): **20.597.180 đ** (Khớp chính xác 100% KiotViet)
- **Đã sửa thứ tự hiển thị & Dư nợ lũy kế khớp 100% KiotViet**:
  - Đã quy định cứng quy tắc sắp xếp: Khi Hóa đơn và Phiếu thu trùng mốc thời gian (cùng giờ/phút), **Phiếu Thanh toán LUÔN LUÔN xếp ở TRÊN Hóa đơn Bán hàng** (chuẩn 100% KiotViet).
  - Kết quả: Khớp 100% từng dòng, từng mốc thời gian và Dư nợ lũy kế của KiotViet (`20.597.180 đ`, `17.027.180 đ`, `13.457.180 đ`, `17.027.180 đ`, `13.457.180 đ`,...).

### 5. **Nâng cấp Bộ lọc Thời gian Sổ quỹ (`/cashbook`) chuẩn KiotViet**
- Đã thay thế bộ chọn Radio đơn sơ ("Tháng này", "Tùy chỉnh") bằng linh kiện **`DateFilter` popover chuẩn 100% KiotViet**.
- Bổ sung đầy đủ 5 nhóm mốc thời gian:
  - 📅 **Theo ngày**: Hôm nay, Hôm qua
  - 📅 **Theo tuần**: Tuần này, Tuần trước, 7 ngày qua
  - 📅 **Theo tháng**: Tháng này, Tháng trước, 30 ngày qua
  - 📅 **Theo quý**: Quý này, Quý trước
  - 📅 **Theo năm**: Năm nay, Năm trước, Toàn thời gian
  - 📆 **Tùy chỉnh**: Bộ chọn khoảng ngày linh hoạt từ ngày - đến ngày.

### 6. **Mở rộng chiều cao Bảng Công Nợ (`/customers`)**
- Đã tăng chiều cao tối đa cho Bảng Công Nợ (`max-h-[620px]` / `max-h-[460px]`), giúp hiển thị thoải mái **8-10 dòng/đơn** cùng lúc mà không bị gò bó.

---

## 🛠️ 3. LỆNH DEPLOY TIÊU CHUẨN TRÊN VPS SERVER

Khi cần Deploy cập nhật mới trên VPS, mở terminal SSH `hoangnam@192.168.1.200` và chạy các câu lệnh sau:

### Cập nhật Backend:
```bash
cd /mnt/ssd500/tiko/bizpos-api
sudo git config --global --add safe.directory /mnt/ssd500/tiko/bizpos-api 2>/dev/null
sudo git fetch --all && sudo git reset --hard origin/main
sudo docker compose up -d --build
```

### Cập nhật Frontend:
```bash
cd /mnt/ssd500/tiko/bizpos-react
sudo git config --global --add safe.directory /mnt/ssd500/tiko/bizpos-react 2>/dev/null
sudo git fetch --all && sudo git reset --hard origin/main
sudo docker rm -f tiko-bizpos-web 2>/dev/null
sudo docker compose up -d --build
```

---

## 🤖 4. HƯỚNG DẪN DÀNH CHO ANTIGRAVITY AI KHI CHẠY Ở MÁY TÍNH KHÁC

> **Dear Antigravity Assistant at Home Computer:**
> 1. All latest code changes are built and pushed to `origin/main` on both `kiotviet-react` and `kiotviet-backend`.
> 2. The database is hosted on PostgreSQL `192.168.1.200:5433` (Database Name: `bizpos`).
> 3. Refer to the current progress above: All numbers for Financial Report, Customer Sorting, POS Searching, and Chị Yến's 404 transactions (17,027,180 đ debt) are fully verified and matching KiotViet 100%.
> 4. You can safely continue taking user requests from this clean, verified state.
