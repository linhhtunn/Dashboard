# Bao cao Issue #20 - App Layout Shell

## 1. Thong tin issue

- **Issue:** `[Team 4] App layout shell`
- **Loai task:** Frontend layout skeleton
- **Pham vi:** Sprint 1 - Doctor-facing Dashboard
- **Nguoi phu trach:** Team 4 Frontend

## 2. Objective

Muc tieu cua issue la tao khung dieu huong chung cho 3 man hinh chinh cua ung dung:

- Dashboard
- Patients list
- Patient detail

Layout shell nay dong vai tro la bo khung co dinh de cac man hinh frontend tiep theo co the gan noi dung vao ma khong can lap lai cau truc dieu huong.

## 3. Scope thuc hien

Trong issue nay, pham vi duoc gioi han o muc tao khung giao dien chung:

- Tao `AppLayout` de boc cac man hinh nam trong ung dung.
- Tao `Sidebar` gom cac link dieu huong:
  - `Dashboard`
  - `Patients`
- Tao `TopBar` gom:
  - Ten ung dung `CareSignal AI`
  - Tagline ngan
  - Khu vuc mock user
- Tao 3 route su dung chung layout:
  - `/dashboard`
  - `/patients`
  - `/patients/[patientId]`
- Dam bao responsive co ban, khong vo layout tren man hinh nho.

Full responsive chi tiet, animation, mobile drawer va cac interaction nang cao nam ngoai scope cua issue nay.

## 4. Cau truc folder/file du kien

```text
frontend/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ globals.css
│  │
│  ├─ app-layout.tsx
│  ├─ sidebar.tsx
│  ├─ top-bar.tsx
│  │
│  ├─ dashboard/
│  │  └─ page.tsx
│  │
│  └─ patients/
│     ├─ page.tsx
│     └─ [patientId]/
│        └─ page.tsx
```

## 5. Vai tro tung file

### `app/layout.tsx`

Root layout mac dinh cua Next.js App Router.

File nay giu cac thanh phan nen tang:

- The `<html>`
- The `<body>`
- Font
- Import `globals.css`

Khong dua sidebar/topbar vao day de tranh tat ca route deu bi ep vao dashboard shell.

### `app/page.tsx`

Route `/`.

Trang goc se redirect sang `/dashboard` de khi mo ung dung nguoi dung vao thang man dashboard chinh.

### `app/globals.css`

Noi khai bao global style va token mau theo `design-contract.md`.

Cac token chinh can dung:

- `--color-primary`: deep blue
- `--color-secondary`: teal green
- `--color-surface`: nen app
- `--color-panel`: nen panel/card
- `--color-border`: duong vien
- `--color-text-strong`: text chinh
- `--color-text-body`: text phu

### `app/app-layout.tsx`

Component layout chung cho app.

Chuc nang:

- Chia man hinh thanh sidebar ben trai va content ben phai.
- Gan `TopBar` o dau vung content.
- Bao boc noi dung route bang `main`.
- Tao max width va spacing thong nhat cho cac man hinh.

### `app/sidebar.tsx`

Component menu dieu huong.

Chuc nang:

- Hien thi ten san pham `CareSignal AI`.
- Hien thi link `Dashboard`.
- Hien thi link `Patients`.
- Danh dau link dang active dua tren pathname hien tai.
- Ho tro layout ngang o mobile de tranh vo giao dien.

### `app/top-bar.tsx`

Component thanh tren cung.

Chuc nang:

- Hien thi ten app.
- Hien thi tagline `E2E Simulation for AI Health`.
- Hien thi mock user `Doctor Demo`.

### `app/dashboard/page.tsx`

Route `/dashboard`.

Noi dung hien tai la placeholder cho man tong quan, gom cac card mock:

- Active patients
- Open alerts
- Normal stream

### `app/patients/page.tsx`

Route `/patients`.

Noi dung hien tai la danh sach benh nhan mock.

Moi dong co link sang trang chi tiet:

```text
/patients/[patientId]
```

### `app/patients/[patientId]/page.tsx`

Route dynamic cho man chi tiet benh nhan.

Noi dung hien tai gom:

- Tieu de theo `patientId`
- Khu vuc placeholder cho vitals chart
- Khu vuc placeholder cho alert history

## 6. Huong thiet ke

Layout bam theo `frontend/design-contract.md`:

- Ten san pham: `CareSignal AI`
- Phong cach: clinical, modern, calm
- Nen app dung mau cool gray
- Panel/sidebar/topbar dung nen trang
- Active navigation dung mau deep blue
- Accent phu dung teal green
- Khong dung dark mode mac dinh trong Sprint 1

## 7. Output cua issue

Sau khi hoan thanh, ung dung co 3 route nam trong layout chung:

```text
/dashboard
/patients
/patients/[patientId]
```

Ca 3 route deu dung chung:

- Sidebar
- TopBar
- Content shell
- Spacing va nen giao dien thong nhat

## 8. Tieu chi hoan thanh

Issue duoc xem la hoan thanh khi:

- Chay duoc local bang `npm run dev`.
- Truy cap `/dashboard` thay layout chung.
- Truy cap `/patients` thay danh sach mock trong layout chung.
- Truy cap `/patients/p-001` thay trang detail mock trong layout chung.
- Sidebar co link sang Dashboard va Patients.
- TopBar hien ten app va mock user.
- Man hinh nho khong bi vo layout nghiem trong.

## 9. Ngoai scope

Cac hang muc sau chua nam trong issue nay:

- Mobile drawer cho sidebar.
- Search/filter benh nhan.
- Chart that bang Recharts.
- API mock `/api/patients` va `/api/vitals`.
- Authentication/user that.
- Full responsive chi tiet.
- Chatbot UI.

## 10. Ghi chu tiep theo

Sau issue layout shell, cac issue tiep theo co the tiep tuc gan noi dung vao khung nay:

- Man `/dashboard` AI-first.
- Man `/patients` list.
- Man `/patients/[patientId]` detail.
- Components vitals, alerts va chatbot.
