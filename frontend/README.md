# CareSignal AI Frontend

Frontend cho CareSignal AI - he thong monitoring va AI-assisted summary cho bai toan healthcare simulation.

## Product Direction

- AI-first clinical dashboard
- Frontend song ngu `vi/en`
- Locale mac dinh la `vi`
- User co the switch locale o moi man
- `preferredLocale` can duoc luu de giu lai sau reload va login lai
- AI support only. Not a diagnosis.

## Core Stack

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- `lucide-react` cho icon
- `recharts` cho chart

## Routes

- `/dashboard`
- `/patients`
- `/patients/[patientId]`

Sprint 2+:

- `/login`
- `/register`
- `/settings`

## Dashboard Architecture

Dashboard duoc thiet ke theo layout 2 panel:

- Panel trai: `AI workspace`
- Panel phai: `Patient summary panel`

### Left Panel Rules

Panel trai chi dong vai tro hoi thoai va tom tat:

- user prompt
- AI summary response
- summary highlights
- confidence
- disclaimer

Khong hien thi evidence chi tiet o panel trai.

### Right Panel Rules

Panel phai la noi doi chieu clinical context:

- patient profile
- conditions
- medication
- recent symptoms
- alerts
- vitals snapshot
- evidence cho AI summary

Quyet dinh nay la bat buoc cho cac commit tiep theo:

- `AI chi tra loi summary`
- `Evidence hien thi o patient summary panel`

## Clinical Wording Rules

Khong dung:

- chan doan
- ket luan benh
- AI khuyen nghi dieu tri

Nen dung:

- dau hieu bat thuong
- can theo doi them
- co nguy co
- can bac si xac nhan

Disclaimer chuan:

`AI support only. Not a diagnosis. Always use clinical judgment.`

## Data Contract Principles

- Domain APIs uu tien tra `code`, khong tra label da dich
- FE map glossary EN/VI
- Unit giu nguyen: `bpm`, `ms`, `%`, `mmHg`
- Vital metrics hien tai chi nhan 5 chi so:
  - `heart_rate`
  - `hrv_rmssd`
  - `spo2`
  - `systolic_bp`
  - `diastolic_bp`

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
