# Health-app Software Engineering

Monorepo cho CareSignal AI — MVP tập trung vào **frontend lâm sàng**.

## Bắt đầu nhanh

```bash
cd frontend
npm install
cp .env.example .env.local   # tùy chọn
npm run dev
```

Mở `http://localhost:3000` → redirect `/patients`.

## Tài liệu (frontend là trục chính)

| Tài liệu | Mô tả |
|----------|--------|
| [frontend/README.md](./frontend/README.md) | Hướng dẫn dev, routes, stack |
| [docs/frontend-architecture.md](./docs/frontend-architecture.md) | Kiến trúc chi tiết, data flow, chat |
| [docs/HANDOVER_FRONTEND.md](./docs/HANDOVER_FRONTEND.md) | Contract agent + map code FE |
| [docs/mvp-demo-plan.md](./docs/mvp-demo-plan.md) | Kịch bản demo MVP |

## Cấu trúc repo

```
frontend/     # Next.js app — UI + BFF + seed data (MVP chính)
docs/         # Tài liệu kỹ thuật
backend/      # Services khác (nếu có)
```
