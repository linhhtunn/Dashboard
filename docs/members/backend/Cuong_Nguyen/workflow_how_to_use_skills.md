# TEAM 5 - WORKFLOW HOW TO USE SKILLS
## PHU TRACH: NGUYEN DUC CUONG

Tai lieu nay quy dinh cach su dung cac skill cho team 5 de lam viec theo huong enterprise, co quy trinh ro rang va khong bi lan giua cac he.

---

## 1. Nguyen tac tong the

- `openspec` la xuong song cho change/spec/task/implement.
- `vibecode-kit` la khung phoi hop, scan, RRI, debug, QA, handover.
- `security-threat-model` dung truoc khi chot architecture hoac API co lien quan den PHI / data nhay cam.
- `security-best-practices` dung khi implement, review code, review PR, va chot coding standard.
- `sentry` dung khi can observability, crash, latency, error tracking, production health.
- `openai-docs` dung khi co phan call OpenAI API / structured output / agent workflow.

---

## 2. Thu tu su dung de khong bi lan

### Buoc 1: Mo change bang `openspec`
Dung khi:
- can tao proposal
- can viet design
- can chia task
- can track tien do theo change

Output mong doi:
- proposal
- design
- tasks
- co dinh danh change ro rang

### Buoc 2: Phan tich va lam ro bang `vibecode-kit`
Dung khi:
- can scan codebase
- can hoi requirement theo RRI
- can van dung debug protocol
- can lap blueprint / tip / verify

Output mong doi:
- scan report
- RRI report
- blueprint
- task graph / TIP
- verify report

### Buoc 3: Kiem tra rui ro bang `security-threat-model`
Dung truoc khi:
- them endpoint moi
- chot data flow wearable / mobile / hospital
- chot auth, webhook, rate limit
- trien khai prompt / context co the tiep xuc PHI

Output mong doi:
- trust boundaries
- assets
- attacker capabilities
- abuse paths
- mitigations

### Buoc 4: Code an toan bang `security-best-practices`
Dung khi:
- viet FastAPI endpoint
- viet validation / schema
- xu ly secrets / env
- review input / error handling
- day least privilege

Output mong doi:
- code secure-by-default
- warning ve log nhay cam
- auth / validation / audit logic ro rang

### Buoc 5: Them observability bang `sentry`
Dung khi:
- can theo doi error production
- can do latency / crash / breadcrumbs
- can tra cuu issue that

Output mong doi:
- issue list
- issue detail
- fix plan
- signal ve health cua service

### Buoc 6: Su dung `openai-docs`
Dung khi:
- can chot cach goi OpenAI API
- can structured output
- can agentic RAG / tool calling
- can xem lai model / SDK / API hien tai

Output mong doi:
- implement dung doc moi nhat
- tranh dung API cu

---

## 3. Lua chon skill theo tinh huong

### Tinh huong A: Bat dau mot change moi
1. `openspec`
2. `vibecode-kit`
3. `security-threat-model`

### Tinh huong B: Dang can implement endpoint
1. `openspec`
2. `security-best-practices`
3. `openai-docs` neu co OpenAI

### Tinh huong C: Dang co bug / crash / latency
1. `vibecode-kit`
2. `sentry`
3. `security-best-practices` neu bug lien quan input / auth / log

### Tinh huong D: Dang review AI agent / prompt / RAG
1. `openspec`
2. `vibecode-kit`
3. `security-threat-model`
4. `openai-docs`

---

## 4. Prompt mau de kich hoat dung skill

### OpenSpec
```text
Dung openspec de tao change va chia task cho phan nay.
```

### Vibecode Kit
```text
Dung vibecode-kit de scan repo va hoi RRI cho phan nay.
```

### Security Threat Model
```text
Dung security-threat-model de threat model API nay.
```

### Security Best Practices
```text
Dung security-best-practices de review code Python/FastAPI nay.
```

### Sentry
```text
Dung sentry de kiem tra production issues cua service nay.
```

### OpenAI Docs
```text
Dung openai-docs de xem cach dung OpenAI API cho structured output.
```

---

## 5. Cach khong dung lan 2 he

- Neu da bat dau bang `openspec` thi giu `openspec` lam khung chinh cua change.
- Neu da bat dau bang `vibecode-kit` thi dung no de scan, hoi requirement, debug, QA.
- Khong nen truyen mot prompt qua nhieu skill cung luc neu khong co muc dich ro rang.
- `openspec` va `vibecode-kit` co the song song, nhung khong nen doi vai tro cua nhau.

---

## 6. Quy uoc team 5

- Team 5 phai uu tien an toan du lieu va khong duoc log PHI.
- Moi API agent lien quan den health data phai duoc review bang `security-threat-model` truoc.
- Moi thay doi lien quan den prompt / structured output / OpenAI phai doi chieu voi `openai-docs`.
- Moi van de crash, latency, error that phai doi sang `sentry`.
- Moi change co spec/phases phai di qua `openspec`.

---

## 7. Cheat sheet nhanh

- `openspec` = change / proposal / design / tasks / traceability
- `vibecode-kit` = scan / RRI / blueprint / TIP / debug / QA / handover
- `security-threat-model` = threat model / trust boundary / abuse path
- `security-best-practices` = secure coding / review / guardrails
- `sentry` = observability / issue investigation
- `openai-docs` = OpenAI API / structured output / agent docs

