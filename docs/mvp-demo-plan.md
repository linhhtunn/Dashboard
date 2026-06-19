# MVP Demo Plan

## Muc tieu demo hien tai

- Chay duoc luong dashboard -> patient detail -> AI chat voi `P001`.
- Danh sach patient load nhanh, khong goi lap vitals/alerts theo tung patient.
- `GET /api/patients/{id}` va `GET /api/patients/{id}/alerts` khong con chan demo vi proxy status sai hoac schema `evidence`.
- Section panel ben phai trong chat hien thong tin `P001` tu backend neu co, fallback demo data neu backend loi.

## Kich ban test MVP

1. Dashboard load:
   - Mo dashboard.
   - Xac nhan thread history hien duoc.
   - Mo 1 issue trong chat summary.
   - Xac nhan patient context panel hien dung thong tin `P001`, khong con ten demo sai context.

2. Patient list:
   - Mo `/patients`.
   - Xac nhan danh sach hien trong vai giay, khong bi loading keo dai do query lap theo tung patient.
   - Search `P001` va mo detail.

3. Patient detail:
   - Mo `/patients/P001`.
   - Xac nhan profile load duoc.
   - Xac nhan vitals, metric summaries, alerts cung hien.
   - Xac nhan khong co loi `502` gia khi backend tra `404`.

4. Alert panel:
   - Goi `/api/patients/P001/alerts`.
   - Xac nhan response 200 va `evidence` luon la list.

5. AI chat:
   - Gui prompt "Tom tat tinh trang hien tai cua P001".
   - Xac nhan co response, thread duoc ghi vao history.
   - Xac nhan panel ben phai mo theo issue goi y.

## Script demo < 5 phut

1. Vao dashboard, mo issue tu chat de show panel `P001`.
2. Vao `/patients`, search `P001`, mo detail.
3. Show vitals + alerts dang load tu backend.
4. Quay lai dashboard, gui 1 cau hoi AI cho `P001`.
5. Show thread vua tao trong history.

## Out of scope sprint hien tai

- Real-time websocket/push update cho vitals va alerts.
- Dong bo hoan toan moi metric/issue trong panel theo AI output thay vi mapping issue demo.
- Toi uu latency LLM o muc sub-second.
- Hoan thien i18n/encoding cho toan bo text UI.
- Full e2e automation va load test production-grade.

## Ke hoach xu ly nhanh neu can demo truoc

1. Uu tien chay backend + frontend voi `P001` la golden path.
2. Neu data DB thieu, giu fallback fixture/demo cho panel va alert list.
3. Neu chat LLM cham, demo bang 1 prompt ngan va thread da co san.
4. Neu can an toan hon, freeze scope: dashboard + patient detail + 1 luot AI chat.
