# TEAM 5 - AI AGENT SKILL STACK
## PHU TRACH: NGUYEN DUC CUONG

Tai lieu nay chot bo skill nen dung cho team 5 khi lam backend AI cho health app, voi muc tieu:
- khong bi miss van de bao mat
- khong bo sot logging/observability
- khong lam viec mou mu trong quy trinh
- code theo huong enterprise, co kiem soat

---

## 1. Skill chinh de lam viec

### 1. `openspec`
**Vai tro:** khung workflow chinh de quan ly change/spec/task/implement.

**Dung khi nao:**
- can tao proposal, design, tasks
- can chia change thanh cac artifact ro rang
- can implement theo task co status va traceability
- can giam drift giua yc, design va code

**Gia tri mang lai:**
- giup lam viec theo mot change ro rang thay vi nhay sang code ngay
- phu hop khi repo da co spec / proposal / tasks
- rat hop khi team can bao cao tien do, review va continue change

**Han che:**
- khong phai skill de debug co he thong
- khong phai skill de threat model chuyen sau
- khong thay the coaching / interview style cua vibecode-kit

---

### 2. `vibecode-kit`
**Vai tro:** khung quy trinh tong the cho phat trien va phoi hop.

**Dung khi nao:**
- can scan codebase truoc khi code
- can phan tich yeu cau truoc khi implement
- can chia task ro rang theo TIP / report / verify
- can debug co he thong
- can QA va handover

**Gia tri mang lai:**
- giup khong lam viec theo cam tinh
- co quy trinh `SCAN -> RRI -> VISION -> BLUEPRINT -> BUILD -> VERIFY`
- co debug protocol, QA protocol, X-Ray protocol

**Han che:**
- khong phai skill chuyen sau ve security
- khong thay the observability tool
- khong thay the spec-driven workflow cua OpenSpec

---

### 3. `security-threat-model`
**Vai tro:** phat hien rui ro an ninh tu goc nhin attacker.

**Dung khi nao:**
- lam voi health data, PHI, wearable data, hospital data
- thiet ke auth, webhook, API, rate limit, data flow
- can tim trust boundary, abuse path, attack surface

**Gia tri mang lai:**
- giup khong bo sot cac rui ro nhu:
  - leak du lieu benh nhan
  - spoof wearable payload
  - prompt injection qua context
  - unauthorized access
  - log nhay cam

**Han che:**
- chi giup tu duy va phan tich
- khong tu dong sua code

---

### 4. `security-best-practices`
**Vai tro:** ep quy tac code an toan va sach.

**Dung khi nao:**
- khi viet API, auth, config, secret handling
- khi review input validation, error handling, access control
- khi can day agent tu duy least privilege

**Gia tri mang lai:**
- giup code dung chuan enterprise hon
- nhac ve:
  - validate input
  - khong hardcode secrets
  - khong log du lieu nhay cam
  - co audit trail

**Han che:**
- khong thay the review security chuyen sau
- khong thay the pentest/threat modeling

---

### 5. `sentry`
**Vai tro:** quan sat loi, crash, latency, performance, trace.

**Dung khi nao:**
- can bo sung logging / error tracking / alerting
- can theo doi loi runtime va performance
- can bat cac van de thieu log hoac log khong du

**Gia tri mang lai:**
- giup khong bo sot loi that tren production
- giup do duoc:
  - error rate
  - latency
  - stack trace
  - breadcrumbs
  - context cua request

**Han che:**
- la tool observability, khong phai quy trinh phat trien
- can ket hop voi code convention va logging policy

---

### 6. `openai-docs` *(optional)*
**Vai tro:** tai lieu chinh thuc khi team dung OpenAI API / agent SDK.

**Dung khi nao:**
- goi Responses API
- lam agentic RAG
- can chot dung model / tool / structured output

**Gia tri mang lai:**
- giam sai lech vi dung doc cu
- giam tinh trang implement theo doan moi

**Han che:**
- chi dung khi stack co OpenAI

---

## 2. Skill nen uu tien theo muc do can thiet

### Muc bat buoc
1. `openspec`
2. `vibecode-kit`
3. `security-threat-model`
4. `security-best-practices`
5. `sentry`

### Muc theo stack
6. `openai-docs` neu dung OpenAI

---

## 3. Cach dung hop ly trong team 5

### Khi nao dung `openspec`
- khi can lam change co proposal / design / tasks
- khi can tai su dung artifact de track tien do
- khi muon quy trinh ro rang tu y tuong -> implement

### Khi nao dung `vibecode-kit`
- khi can len ke hoach
- khi can doc codebase
- khi can chia TIP / task
- khi can debug co quy trinh
- khi can QA va handover

### Khi nao dung `security-threat-model`
- truoc khi chot architecture hoac API contract
- truoc khi goc nhin ve data flow cua wearable / hospital / mobile
- truoc khi them endpoint co the tiep xuc PHI

### Khi nao dung `security-best-practices`
- luc review pull request
- luc implement auth, config, logging, error handling
- luc chot coding standard

### Khi nao dung `sentry`
- luc them observability cho app
- luc check production-like issues
- luc can trace loi/latency/su co that

---

## 4. Cach de LLM khong bi lan

### Nguyen tac
- dung `openspec` lam khung change/spec/task
- dung `vibecode-kit` lam khung quy trinh tong the va phoi hop
- dung `security-*` lam lop kiem soat
- dung `sentry` lam observability
- dung `openai-docs` chi khi co OpenAI

### Quy uoc prompt
- neu muon quan ly change/spec/task: noi ro `dung openspec`
- neu muon lap ke hoach: noi ro `dung vibecode-kit`
- neu muon review rui ro: noi ro `dung security-threat-model`
- neu muon implement theo spec: noi ro `dung openspec`

### Ket luan
- `openspec` va `vibecode-kit` khong xung dot truc tiep
- `openspec` nen lam xuong song cho change management
- `vibecode-kit` nen lam lop phoi hop, phan tich va debug
- khong nen tron lan 2 he trong 1 prompt neu khong can thiet

---

## 5. Bo skill chot cho team 5

**Core stack:**
- `openspec`
- `vibecode-kit`
- `security-threat-model`
- `security-best-practices`
- `sentry`

**Optional:**
- `openai-docs`

**Ly do:**
- du de bao phu quy trinh
- du de bat loi an ninh
- du de tang observability
- du de giu phong cach enterprise

---

## 6. Rule of thumb

- Neu dang lam plan -> dung `vibecode-kit`
- Neu dang lo mat an toan du lieu -> dung `security-threat-model`
- Neu dang review code -> dung `security-best-practices`
- Neu dang lo log / crash / latency -> dung `sentry`
- Neu dang goi OpenAI -> dung them `openai-docs`
