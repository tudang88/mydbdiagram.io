# Tools và Phương Pháp Test — Frontend đến Backend

Tài liệu tổng hợp các **công cụ (tools)** và **phương pháp test** thường dùng trong dự án phát triển hệ thống web full-stack (frontend + backend).

---

## Mục lục

1. [Tổng quan phân lớp](#1-tổng-quan-phân-lớp)
2. [Tools theo giai đoạn và vai trò](#2-tools-theo-giai-đoạn-và-vai-trò)
3. [Các phương pháp test](#3-các-phương-pháp-test)
4. [Toolchain test cụ thể](#4-toolchain-test-cụ-thể)
5. [CI/CD và quality gate](#5-cicd-và-quality-gate)
6. [Áp dụng trong dự án này](#6-áp-dụng-trong-dự-án-này)

---

## 1. Tổng quan phân lớp

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                                 │
│  Dev: Editor, Vite/Webpack, HMR │ Lint: ESLint │ Format: Prettier         │
│  Test: Unit (Vitest/Jest), Component (RTL), E2E (Playwright/Cypress)     │
│  Build: Vite/Webpack → static assets                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↕ HTTP/API
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND                                                                  │
│  Dev: Node/TS, tsx/nodemon │ Lint: ESLint │ Format: Prettier             │
│  Test: Unit (Vitest/Jest), Integration (supertest), E2E (API)           │
│  Run: node / tsx                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  SHARED / DEVOPS                                                          │
│  Type check (TypeScript), Git hooks (lint-staged, husky), CI (GitHub     │
│  Actions, GitLab CI), Container (Docker), API test (Postman/Insomnia)    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tools theo giai đoạn và vai trò

### 2.1 Development (viết code, chạy local)

| Vai trò | Frontend | Backend (Node/TS) | Backend (PHP/Laravel) |
|--------|----------|-------------------|------------------------|
| **Runtime / Build** | Vite, Webpack, Parcel | Node.js, tsx, ts-node | PHP, Laravel Sail / Valet |
| **Hot reload** | Vite HMR, Webpack HMR | tsx watch, nodemon | Laravel Mix / Vite, sail |
| **Package manager** | npm, yarn, pnpm | npm, yarn, pnpm | Composer |
| **Env / config** | .env, import.meta.env (Vite) | dotenv, process.env | .env, config(), phpdotenv |

**Ghi chú:**  
- **Vite:** build nhanh, HMR tốt, thích hợp React/Vue/Svelte.  
- **tsx:** chạy TypeScript trực tiếp không cần build, phù hợp dev server Node.  
- **Laravel:** dùng Vite cho frontend asset; backend chạy `php artisan serve` hoặc Sail.

---

### 2.2 Code quality (trước khi commit / trong CI)

| Loại | Tool | Mục đích |
|------|------|----------|
| **Linting** | ESLint | Phát hiện lỗi pattern, style, best practice (JS/TS/React). Có thể dùng cho cả frontend và backend Node. |
| | PHP_CodeSniffer (PHPCS), PHPStan, Pint | PHP: chuẩn PSR, static analysis, format. |
| **Format** | Prettier | Format code thống nhất (JS/TS/JSON/CSS/MD). Không phụ thuộc ngôn ngữ. |
| | Laravel Pint | Format PHP theo chuẩn Laravel/PSR. |
| **Type check** | TypeScript (tsc) | Kiểm tra type toàn bộ codebase (`tsc --noEmit`). |
| | PHPStan, Psalm | PHP: static analysis, type-like checks. |

**Cách dùng thường:**  
- Script: `lint`, `lint:fix`, `format`, `format:check`, `type-check`.  
- Chạy trước commit: **lint-staged** + **husky** (pre-commit hook).

---

### 2.3 Build & deploy

| Layer | Tool / Cách | Ghi chú |
|-------|-------------|---------|
| **Frontend** | Vite build, Webpack | Output: static (HTML/JS/CSS). Deploy lên CDN/S3/Netlify/Vercel hoặc serve từ backend. |
| **Backend Node** | tsc → node dist/ | Build ra JS; chạy bằng node. Có thể dùng esbuild/tsup cho build nhanh hơn. |
| **Backend Laravel** | php artisan (optimize, config:cache) | Không “build” PHP; cache config/route. Frontend build qua Vite. |
| **Container** | Docker, Docker Compose | Chuẩn hóa môi trường dev/staging/prod. |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins | Chạy lint, test, build; deploy khi pass. |

---

### 2.4 Debug & quan sát

| Công cụ | Dùng cho |
|---------|----------|
| **Browser DevTools** | Network, Console, React/Vue devtools, performance. |
| **VS Code / Cursor** | Breakpoint, debug Node (launch.json), PHP (Xdebug). |
| **Postman / Insomnia / Bruno** | Gọi API thủ công, lưu collection, test nhanh backend. |
| **Logging** | Winston, Pino (Node); Laravel Log; cấu trúc log (JSON) để dễ parse. |
| **Tracing** | OpenTelemetry, Jaeger (khi có microservice). |

---

## 3. Các phương pháp test

### 3.1 Kim tự tháp test (Test Pyramid)

```
           ▲
          / \        E2E / UI (ít, chậm, ổn định chính)
         /   \
        /─────\      Integration (vừa phải, API, DB)
       /       \
      /─────────\    Unit (nhiều, nhanh, logic đơn vị)
     /___________\
```

- **Unit:** Test từng hàm/class đơn lẻ, mock dependency. Nhanh, nhiều.  
- **Integration:** Test nhiều thành phần cùng lúc (API + DB, service + repository).  
- **E2E:** Test luồng người dùng qua browser hoặc API end-to-end. Ít, chậm, dễ vỡ.

---

### 3.2 Unit test

**Mục đích:** Kiểm tra logic nghiệp vụ (domain, service, util) độc lập; mock DB, HTTP, file.

**Đối tượng thường test:**  
- Hàm pure (parser, validator, transformer).  
- Service/use case (mock repository).  
- Domain entity (method, validation).

**Đặc điểm:**  
- Chạy trong process, không cần server/DB thật.  
- Nhanh; nên có nhiều case (biên, lỗi).  
- Mock để cô lập (repository, HTTP client).

**Ví dụ phạm vi:**  
- Frontend: store, parser, validator, domain model.  
- Backend: service, repository (mock file/DB), exporter, validator.

---

### 3.3 Integration test

**Mục đích:** Kiểm tra nhiều lớp làm việc cùng nhau (API ↔ controller ↔ service ↔ DB).

**Cách làm thường gặp:**  
- **Backend:** Gửi HTTP tới app (supertest, axios) với DB thật hoặc DB test (SQLite, test DB).  
- **Frontend:** Render component + provider (React Testing Library) gọi API mock (MSW).  
- **API contract:** Đảm bảo request/response đúng schema (OpenAPI, Pact).

**Đặc điểm:**  
- Cần môi trường (DB, env). Chậm hơn unit.  
- Phát hiện lỗi “nối” giữa các phần (route, serialization, query).

---

### 3.4 E2E (End-to-End) test

**Mục đích:** Mô phỏng người dùng: mở browser, click, nhập form, kiểm tra kết quả.

**Tool điển hình:**  
- **Playwright:** Đa browser, API ổn, chạy song song.  
- **Cypress:** DX tốt, chạy trong browser.  
- **Selenium:** Cũ hơn, đa ngôn ngữ.

**Đặc điểm:**  
- Chậm, dễ flaky (timing, network). Nên ít nhưng cover luồng chính (đăng nhập, tạo diagram, export).  
- Chạy trong CI với browser headless; có thể tách suite “smoke” chạy mỗi deploy.

---

### 3.5 Test API (backend)

**Cách 1 – Trong code (integration):**  
- Gọi HTTP tới app (supertest với Express; Laravel HTTP test).  
- Khởi tạo app với config test; dùng DB test hoặc in-memory.

**Cách 2 – Ngoài code (manual / collection):**  
- Postman/Insomnia: collection + env (dev/staging).  
- Có thể export sang Newman (CLI) để chạy trong CI.

**Cách 3 – Contract / schema:**  
- Đảm bảo response đúng OpenAPI schema.  
- Pact: consumer (frontend) và provider (backend) thỏa thuận contract.

---

### 3.6 Test component (frontend)

**Mục đích:** Test component React/Vue đơn lẻ: render đúng, tương tác (click, input), không cần server thật.

**Tool:**  
- **React Testing Library (RTL):** Khuyến nghị; test theo vai trò người dùng (label, role), tránh phụ thuộc implementation.  
- **Vue Test Utils:** Tương tự cho Vue.  
- **Jest hoặc Vitest:** Runner + mock; Vitest tích hợp tốt với Vite.

**Practice:** Mock API (MSW); test “hạnh phúc” và vài case lỗi (loading, error state).

---

### 3.7 Snapshot test

**Ý tưởng:** Lưu “ảnh” output (DOM, JSON) lần đầu; lần sau so sánh. Khác thì fail (cần người xem có phải thay đổi có chủ đích không).

**Lưu ý:** Dễ vỡ khi UI thay đổi; nên dùng ít, cho component ổn định hoặc serialized data (JSON), không lạm dụng cho mọi component.

---

### 3.8 Visual regression test

**Mục đích:** So sánh screenshot trước/sau để bắt thay đổi layout/CSS không mong muốn.

**Tool:** Percy, Chromatic, Playwright screenshot so sánh.  
**Dùng khi:** Design system, landing page, component quan trọng; thường chạy trong CI với review thủ công khi diff.

---

## 4. Toolchain test cụ thể

### 4.1 Node.js / TypeScript (backend + frontend dùng JS/TS)

| Loại test | Tool | Lệnh / ghi chú |
|-----------|------|----------------|
| **Unit + Integration** | **Vitest** | `vitest`, tương thích Vite, ESM, nhanh. Thay thế Jest cho dự án Vite. |
| | **Jest** | `jest`, phổ biến; cần config cho ESM/TS (ts-jest, jest-resolve). |
| **API (integration)** | **supertest** | Gắn với Express/Fastify app, gửi request, assert status + body. |
| **Mock** | **vitest** hoặc **jest** | `vi.fn()`, `vi.mock()`, `jest.fn()`, `jest.mock()`. |
| | **MSW (Mock Service Worker)** | Mock HTTP ở level network; dùng cho test frontend không cần backend thật. |
| **Coverage** | **Vitest** / **Jest** | `vitest --coverage`, `jest --coverage`; report HTML/text. |
| **E2E** | **Playwright** | `npx playwright test`; cấu hình browser, baseURL. |
| | **Cypress** | `npx cypress run` hoặc open; component test có sẵn. |
| **Component (React)** | **React Testing Library** | render(), screen, userEvent; chạy với Vitest/Jest. |

**Cấu trúc thư mục test gợi ý:**  
- Cùng thư mục: `foo.ts` + `foo.test.ts`.  
- Hoặc thư mục: `__tests__/foo.test.ts`, `src/foo/__tests__/bar.test.ts`.

---

### 4.2 PHP / Laravel

| Loại test | Tool | Ghi chú |
|-----------|------|--------|
| **Unit** | **PHPUnit** | `php artisan test --testsuite=Unit`; test class/hàm, mock bằng PHPUnit mock. |
| **Feature (integration)** | **PHPUnit** + **Laravel Testing** | `php artisan test --testsuite=Feature`; gọi route, assert response, DB. |
| **Database** | **RefreshDatabase** | Migrate lại DB test mỗi test; dùng SQLite in-memory hoặc MySQL test. |
| **API** | `$this->get()`, `$this->post()`, `$this->json()` | Trong Feature test; assert status, JSON structure. |
| **Browser E2E** | **Laravel Dusk** | Selenium/ChromeDriver; test click, form trong browser. (Có thể dùng Playwright bên ngoài thay.) |
| **Mock** | **Mockery**, Laravel **fake** | Fake queue, mail, storage trong test. |

**Lệnh:**  
- Chạy toàn bộ: `php artisan test`.  
- Chạy file: `php artisan test tests/Unit/UserServiceTest.php`.  
- Coverage: `phpunit --coverage-html coverage` (cần Xdebug hoặc PCOV).

---

### 4.3 So sánh nhanh runner

| | Vitest | Jest | PHPUnit |
|---|--------|------|--------|
| **Môi trường** | Node, Vite ecosystem | Node | PHP |
| **Tốc độ** | Rất nhanh | Nhanh | Phụ thuộc DB/scope |
| **ESM** | Tốt | Cần config | — |
| **Snapshot** | Có | Có | Có (cho JSON/text) |
| **Coverage** | Có (v8/istanbul) | Có | Có (Xdebug/PCOV) |

---

## 5. CI/CD và quality gate

### 5.1 Pipeline gợi ý

```
Commit / PR
    → Install dependencies
    → Lint (ESLint / PHPCS)
    → Format check (Prettier / Pint)
    → Type check (tsc / PHPStan)
    → Unit tests (+ coverage)
    → Integration tests (API)
    → (Optional) E2E tests (có thể tách job riêng)
    → Build (frontend + backend nếu cần)
    → Deploy (khi branch main/release)
```

### 5.2 Quality gate

- **Bắt buộc pass:** Lint, type check, unit test (và thường là integration API).  
- **Không merge nếu:** Test fail hoặc coverage giảm mạnh (tùy quy ước, ví dụ dưới 80% fail).  
- **E2E:** Có thể chạy trên PR hoặc chỉ sau merge (schedule/nightly) để giảm thời gian feedback.

### 5.3 Công cụ CI thường dùng

| Nền tảng | Công cụ |
|----------|---------|
| GitHub | GitHub Actions |
| GitLab | GitLab CI |
| Tự host / đa nền | Jenkins, Tekton |
| SaaS | CircleCI, Travis CI, Buildkite |

---

## 6. Áp dụng trong dự án này (MyDBDiagram.io)

Dự án hiện tại dùng stack **Node.js + TypeScript, Express (backend), React + Vite (frontend)**. Dưới đây là tools và cách test đang dùng, có thể mở rộng thêm theo tài liệu trên.

### 6.1 Tools đang dùng

| Loại | Tool | Cách dùng |
|------|------|-----------|
| **Lint** | ESLint | `npm run lint`, `npm run lint:fix`; config `.eslintrc.json` (TypeScript + React). |
| **Format** | Prettier | `npm run format`, `npm run format:check`; config `.prettierrc`. |
| **Type check** | TypeScript | `npm run type-check` (tsc --noEmit). |
| **Dev frontend** | Vite | `npm run dev:client`; HMR. |
| **Dev backend** | tsx | `npm run dev:server` (tsx watch); không cần build khi dev. |
| **Build** | tsc + Vite | `npm run build` (server + client). |

### 6.2 Cách test hiện tại

- **Không dùng Jest/Vitest trong package.json.** Test được chạy bằng **script thủ công** với **tsx**:  
  - Domain models, validators, parsers (client/core).  
  - Repositories, services, exporters, controllers (server).  
  - API client, state, UI components, import/export, canvas, toolbar, v.v. (client).  
- **Backend API integration:** Có script gọi HTTP (ví dụ `test-backend-api.ts`), cần server đang chạy (`npm run dev:server` rồi `npx tsx src/server/__tests__/test-backend-api.ts`).  
- **Kết quả test:** Ghi trong `docs/` (ví dụ TEST_SUMMARY.md, BACKEND_TEST_RESULTS.md, các file *TEST_RESULTS.md).

### 6.3 Gợi ý mở rộng

- **Thêm runner chuẩn:** Cài **Vitest**, thêm script `test` và `test:coverage`; chuyển dần các file trong `__tests__` sang `*.test.ts` chạy bằng Vitest để có assert chuẩn, mock và coverage.  
- **API integration trong CI:** Dùng **supertest** gắn app Express, không cần server chạy ngoài; chạy trong pipeline.  
- **E2E (tùy chọn):** Thêm **Playwright** cho vài luồng chính (mở app, tạo diagram, export); chạy trong CI hoặc nightly.  
- **Pre-commit:** Thêm **husky** + **lint-staged** để chạy lint + format + type-check (và sau này là test) trước khi commit.

---

## Tóm tắt

| Chủ đề | Nội dung chính |
|--------|----------------|
| **Tools dev** | Vite/Webpack (frontend), Node/tsx (backend), npm/yarn/pnpm, .env |
| **Quality** | ESLint, Prettier, TypeScript (tsc), PHPCS/PHPStan/Pint (PHP) |
| **Unit test** | Vitest/Jest (JS/TS), PHPUnit (PHP); mock dependency |
| **Integration** | supertest (Node API), Laravel HTTP test, MSW (frontend) |
| **E2E** | Playwright, Cypress; ít case, luồng chính |
| **CI** | Lint → type check → unit → integration → build → deploy |
| **Dự án này** | ESLint, Prettier, tsc, Vite, tsx; test bằng script tsx trong `__tests__`; có thể chuẩn hóa bằng Vitest + supertest + (tùy chọn) Playwright. |

Khi mở rộng, nên ưu tiên: **unit + integration API** ổn định trước, sau đó mới bổ sung E2E và visual/contract test nếu cần.
