# 🚀 VinhAds VIDEO SAAS v2.5 — HƯỚNG DẪN KHỞI ĐỘNG HỆ THỐNG

Hệ thống tự động hóa tạo video AI, quản lý sản phẩm Shopee Affiliate và xuất bản đa kênh Facebook, TikTok, Shorts & Threads.

---

## ⚡ 1-Click Khởi Động Tất Cả Dự Án (StartAll Master)

Toàn bộ script khởi động rải rác cũ đã được dọn dẹp và gom lại thành **1 NÚT DUY NHẤT** tại thư mục `StartAll`:

👉 **Vị trí file Master:** `C:\VisualStudio\Modern SaaS Dashboard Design\StartAll\StartAll.bat`  
👉 **Lối tắt ngoài Desktop:** `Desktop -> StartAll - VinhAds.lnk`

### Cách khởi chạy:
- **Cách 1:** Double-click vào file shortcut **`StartAll - VinhAds.lnk`** trên màn hình Desktop.
- **Cách 2:** Mở thư mục `C:\VisualStudio\Modern SaaS Dashboard Design\StartAll` và double-click **`StartAll.bat`** (hoặc `StartAll.ps1`).

---

## 🔄 Tiến Trình Tự Động Khi Nhấn Nút StartAll:

1. **Khởi động Database & Cache:** Kích hoạt Docker Containers (`PostgreSQL 5432` & `Redis 6379`).
2. **Khởi chạy Backend Server:** NestJS API Server tại port 3000.
3. **Khởi chạy Worker Queue:** BullMQ Queue Worker xử lý tác vụ ngầm.
4. **Khởi chạy Frontend Web App:** Next.js Dashboard tại port 3001.
5. **Khởi tạo Cloudflare Tunnels:** Tạo link HTTPS công khai công cộng cho Web & API.
6. **Mở Trình Duyệt:** Tự động mở `http://localhost:3001/dashboard`.

---

## 🌐 Các Link Truy Cập Hệ Thống

| Dịch Vụ | Link Nội Bộ (Local) |
| :--- | :--- |
| **Giao Diện Web Dashboard** | `http://localhost:3001/dashboard` |
| **Backend REST API** | `http://localhost:3000/api` |
| **Hẹn Giờ & Đăng Bài Đa Kênh** | `http://localhost:3001/dashboard/schedules` |
| **Quản Lý Bài Đăng Facebook** | `http://localhost:3001/dashboard/posts` |

---

## 🔑 Fanpage & Threads Đã Được Cấu Hình

- **Facebook Fanpage:** **Loài mèo gắn link** (Page ID: `1282948524895927`) — Token active `pages_manage_posts`
- **Meta Threads App ID:** `1400119534865638`