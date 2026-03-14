# Kiến trúc, Cấu trúc & Best Practices — Node.js/TypeScript & PHP/Laravel

Tài liệu tổng hợp các kiến trúc, cấu trúc dự án, best practices và nguyên tắc vàng khi phát triển hệ thống web với **Node.js/TypeScript** và **PHP/Laravel**.

---

## Mục lục

1. [Các kiến trúc hệ thống thường dùng](#1-các-kiến-trúc-hệ-thống-thường-dùng)
2. [Cấu trúc dự án Node.js/TypeScript](#2-cấu-trúc-dự-án-nodejstypescript)
3. [Cấu trúc dự án PHP/Laravel](#3-cấu-trúc-dự-án-phplaravel)
4. [Best practices theo từng lớp](#4-best-practices-theo-từng-lớp)
5. [Nguyên tắc vàng cần tuân thủ](#5-nguyên-tắc-vàng-cần-tuân-thủ)

---

## 1. Các kiến trúc hệ thống thường dùng

### 1.1 Layered (N-tier) Architecture

**Mô tả:** Chia ứng dụng thành các lớp rõ ràng, dependency chỉ đi từ trên xuống (không có lớp trên phụ thuộc lớp dưới ngược lại qua interface).

```
┌─────────────────────────────────────────┐
│  Presentation (Routes / Controllers)   │  ← HTTP, validation, serialization
├─────────────────────────────────────────┤
│  Application / Service (Use cases)     │  ← Business logic, orchestration
├─────────────────────────────────────────┤
│  Domain (Entities, domain logic)       │  ← Optional: core business rules
├─────────────────────────────────────────┤
│  Data (Repositories, persistence)      │  ← DB, file, external API
└─────────────────────────────────────────┘
```

**Áp dụng:** Hầu hết web app (Express, Laravel MVC). Dễ hiểu, dễ onboard.

**Lưu ý:** Tránh “skip layer” (controller gọi repository trực tiếp); tránh đưa logic nghiệp vụ xuống controller hoặc repository.

---

### 1.2 Modular Monolith

**Mô tả:** Vẫn một codebase, một deploy, nhưng chia theo **module/domain** (User, Order, Payment…). Mỗi module có thể có controller, service, repository riêng; giao tiếp qua interface hoặc event, tránh import chéo trực tiếp giữa module.

```
src/
  modules/
    user/
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.routes.ts
    order/
      order.controller.ts
      order.service.ts
      ...
  shared/
    db, config, errors, ...
```

**Áp dụng:** Ứng dụng trung bình → lớn, nhiều domain; chuẩn bị tách microservice sau này.

**Lưu ý:** Ranh giới module phải rõ (public API của module); tránh shared “god object” giữa các module.

---

### 1.3 Clean Architecture / Hexagonal (Ports & Adapters)

**Mô tả:** Domain nằm ở trung tâm, không phụ thuộc framework hay DB. Các “port” (interface) do domain định nghĩa; “adapter” (HTTP, DB, queue) implement port và gọi vào use case.

```
        ┌──────────────────────────────────────┐
        │  Adapters (HTTP, CLI, Queue, ...)   │
        └──────────────┬───────────────────────┘
                       │ uses
        ┌──────────────▼───────────────────────┐
        │  Ports (Interfaces)                  │
        └──────────────┬───────────────────────┘
                       │
        ┌──────────────▼───────────────────────┐
        │  Use Cases / Application Layer      │
        └──────────────┬───────────────────────┘
                       │
        ┌──────────────▼───────────────────────┐
        │  Domain (Entities, Value Objects)   │
        └─────────────────────────────────────┘
```

**Áp dụng:** Dự án cần testability cao, đổi DB/framework dễ, hoặc nhiều kênh vào/ra (REST, GraphQL, CLI, worker).

**Lưu ý:** Tốn công thiết kế; chỉ nên dùng khi độ phức tạp nghiệp vụ hoặc yêu cầu thay đổi công nghệ thực sự cao.

---

### 1.4 Domain-Driven Design (DDD) — mức vừa phải

**Mô tả:** Tổ chức code theo **bounded context** và **aggregate**. Entity, Value Object, Domain Event, Repository (interface) thuộc domain; Application Service điều phối; Infrastructure implement repository và tích hợp bên ngoài.

**Áp dụng:** Nghiệp vụ phức tạp, nhiều quy tắc, nhiều team/domain.

**Lưu ý:** Tránh “DDD theatre”: đặt tên DDD nhưng vẫn anemic model và logic nằm hết trong service. Nên bắt đầu với Aggregates rõ ràng và Ubiquitous Language.

---

### 1.5 Microservices

**Mô tả:** Hệ thống gồm nhiều service độc lập (deploy, DB riêng), giao tiếp qua HTTP/gRPC/message queue. Mỗi service thường vẫn dùng layered hoặc modular bên trong.

**Áp dụng:** Team lớn, scale độc lập từng phần, công nghệ đa dạng.

**Lưu ý:** Phức tạp vận hành (network, tracing, eventual consistency). Chỉ chọn khi monolith thực sự trở thành nút thắt (team, scale, release).

---

### 1.6 Event-Driven (bên trong hoặc giữa service)

**Mô tả:** Thành phần giao tiếp qua event (publish/subscribe). Request/response vẫn có thể dùng cho đồng bộ; event dùng cho bất đồng bộ, decoupling, audit.

**Áp dụng:** Cập nhật trạng thái sau khi có hành động (order placed → inventory, notification); tích hợp giữa microservices.

**Lưu ý:** Cần idempotency, ordering, dead letter; debug và trace phức tạp hơn.

---

## 2. Cấu trúc dự án Node.js/TypeScript

### 2.1 Express / Fastify / Koa — Layered

```
src/
  server/
    index.ts              # Khởi tạo app, middleware global, listen
    app.ts                # (optional) Tách cấu hình app để test
    routes/
      index.ts            # Gộp tất cả router
      user.routes.ts
      order.routes.ts
    controllers/
      user.controller.ts
      order.controller.ts
    services/
      user.service.ts
      order.service.ts
    repositories/
      user.repository.ts
      order.repository.ts
    middleware/
      error.middleware.ts
      auth.middleware.ts
      validate.middleware.ts
    config/
      index.ts
      db.ts
  shared/                 # (optional) Types, utils dùng chung
    types/
    utils/
```

**Nguyên tắc:** Route → Controller → Service → Repository. Controller chỉ parse request, gọi service, map response. Không gọi repository từ controller.

---

### 2.2 Express / Fastify — Modular (theo feature)

```
src/
  server/
    index.ts
    app.ts
    modules/
      user/
        user.routes.ts
        user.controller.ts
        user.service.ts
        user.repository.ts
        user.types.ts
      order/
        order.routes.ts
        order.controller.ts
        order.service.ts
        order.repository.ts
    shared/
      middleware/
      config/
      errors/
  shared/
    types/
    utils/
```

**Nguyên tắc:** Mỗi module tự chứa routes/controller/service/repository; shared chỉ chứa thứ thực sự dùng chung. Tránh `user.service` import `order.repository`.

---

### 2.3 NestJS — Module-based

```
src/
  app.module.ts
  main.ts
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    users.repository.ts   # hoặc dùng TypeORM repository trong .entity
    dto/
      create-user.dto.ts
      update-user.dto.ts
    entities/
      user.entity.ts      # nếu dùng ORM
  orders/
    orders.module.ts
    orders.controller.ts
    orders.service.ts
    dto/
  common/                 # shared: guards, filters, pipes, decorators
    filters/
    guards/
    pipes/
    decorators/
  config/
    configuration.ts
```

**Nguyên tắc:** Một domain = một module. Module export service nếu module khác cần dùng; controller không export. DTO cho mọi input; dùng pipe validation.

---

### 2.4 Clean/Hexagonal (Node/TS)

```
src/
  domain/
    user/
      user.entity.ts
      user.repository.port.ts   # interface
      user.service.port.ts
    order/
  application/
    user/
      create-user.use-case.ts
      get-user.use-case.ts
    order/
  infrastructure/
    http/
      user.controller.ts
      user.routes.ts
    persistence/
      user.repository.ts        # implement port
    messaging/
  shared/
    errors/
    types/
```

**Nguyên tắc:** Application layer gọi domain + port; infrastructure implement port và inject vào use case. Domain không import từ application hay infrastructure.

---

## 3. Cấu trúc dự án PHP/Laravel

### 3.1 Laravel MVC chuẩn (Layered)

```
app/
  Http/
    Controllers/
      UserController.php
      OrderController.php
    Middleware/
    Requests/
      StoreUserRequest.php
      UpdateUserRequest.php
  Models/
    User.php
    Order.php
  Services/           # optional, nhưng nên có
    UserService.php
    OrderService.php
  Repositories/       # optional, khi cần tách data access
    UserRepository.php
  Providers/
config/
database/
  migrations/
routes/
  api.php
  web.php
```

**Nguyên tắc:** Controller mỏng: nhận Request (đã validate), gọi Service, trả Resource/JsonResponse. Model cho Eloquent; logic nghiệp vụ trong Service, không nhét vào Controller hoặc Model.

---

### 3.2 Laravel — Modular (theo domain)

```
app/
  Domains/
    User/
      Actions/
      Models/
      Http/
        Controllers/
        Requests/
      Services/
    Order/
      ...
  Core/               # shared: base controller, traits, helpers
  Providers/
routes/
  api.php             # Route::prefix('api')->group(...)
```

Hoặc dùng package **nWidart/laravel-modules** (thư mục `Modules/`):

```
Modules/
  User/
    Http/
      Controllers/
      Requests/
    Models/
    Services/
    Providers/
    Routes/
      api.php
  Order/
    ...
```

**Nguyên tắc:** Mỗi domain có Controllers, Models, Services (và Requests) riêng. Giao tiếp giữa domain qua Service hoặc Event, tránh Model của domain này gọi trực tiếp Model domain kia trong logic phức tạp.

---

### 3.3 Laravel — Action / Single Responsibility

```
app/
  Http/Controllers/
    UserController.php   # chỉ gọi Action
  Actions/
    User/
      CreateUser.php
      UpdateUser.php
      GetUserProfile.php
  Models/
  ...
```

**Nguyên tắc:** Mỗi use case = một class Action (invoke). Controller gọi `CreateUser::run($request->validated())`. Giúp tái sử dụng (CLI, job, API) và test từng hành động.

---

### 3.4 Laravel API Resources & Form Requests

- **Form Request:** Validation ngay trong lớp riêng (`authorize()` + `rules()`). Controller nhận `StoreUserRequest`, không validate tay.
- **API Resource:** Chuẩn hóa response JSON (`UserResource`, `UserCollection`). Tránh trả trực tiếp Model (lộ field, N+1).

**Cấu trúc gợi ý:**

```
app/Http/
  Requests/
    User/
      StoreUserRequest.php
      UpdateUserRequest.php
  Resources/
    UserResource.php
    UserCollection.php
```

---

## 4. Best practices theo từng lớp

### 4.1 Routes / HTTP layer

| Practice | Node/TS | Laravel |
|----------|--------|--------|
| Đặt tên RESTful | `GET /users`, `POST /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id` | Giống; dùng `Route::apiResource('users', UserController::class)` |
| Nhóm theo prefix | `router.use('/api/users', userRoutes)` | `Route::prefix('api')->group(...)` |
| Middleware auth | Middleware kiểm tra JWT/session, gắn user vào `req.user` / `ctx.state` | `auth:sanctum` hoặc custom guard; `$request->user()` |
| Rate limit | `express-rate-limit`, `@fastify/rate-limit` | `throttle:60,1` trong route hoặc middleware |
| Version API | `/api/v1/users` | Prefix `api/v1` hoặc route file riêng |

---

### 4.2 Controllers

| Practice | Mô tả |
|----------|--------|
| Mỏng | Chỉ: nhận input (đã validate), gọi service/use case, map kết quả sang HTTP (status + body). Không if/else nghiệp vụ phức tạp. |
| Một responsibility | Một action = một method (index, store, show, update, destroy hoặc tên rõ ràng). |
| Trả về thống nhất | Cùng format success (data, meta) và error (code, message, details). Dùng middleware/interceptor/exception handler để chuẩn hóa. |
| Không catch rồi “nuốt” | Bắt lỗi để log hoặc chuyển sang error response, không catch rồi return 200. |

---

### 4.3 Services / Application logic

| Practice | Mô tả |
|----------|--------|
| Stateless | Service nhận input, gọi repository/domain, trả kết quả. Không lưu state request trong service. |
| Giao tiếp qua interface | Service phụ thuộc abstraction (repository interface, port), không phụ thuộc implementation cụ thể. |
| Transaction ở đây | Nếu một use case cần nhiều thao tác DB, mở transaction trong service (Laravel: `DB::transaction(fn () => ...)`; Node: pass transaction hoặc unit of work). |
| Không nhận Request/Response | Service nhận DTO/plain object; không import `req`, `res` hay `Request` của framework. |

---

### 4.4 Data access (Repository / Model)

| Practice | Node/TS | Laravel |
|----------|--------|--------|
| Abstraction | Repository interface + implementation; service inject interface. | Có thể dùng Repository pattern bọc Model, hoặc dùng Model trực tiếp trong Service nhưng tránh logic nghiệp vụ trong Model. |
| Query | Method có tên rõ: `findById`, `findByEmail`, `save`, `delete`. Tránh controller/service viết raw query. | Scope, query trong Repository hoặc trong Model (scope). |
| N+1 | Dùng eager load: Prisma `include`, TypeORM `relations`, Sequelize `include`. | Eloquent `with()`, `load()`. Luôn kiểm tra khi trả danh sách có quan hệ. |
| Mapping | Entity/Domain model trong code; repository map sang DB row. | Eloquent Model = entity; dùng Resource khi trả API. |

---

### 4.5 Validation & security

| Practice | Mô tả |
|----------|--------|
| Validate mọi input | Body, query, params; dùng schema (Zod, Joi, class-validator) hoặc Form Request. Trả 400 với message rõ. |
| Không tin client | Id từ URL cần kiểm tra quyền (resource thuộc user/tenant). |
| Auth & authz | Auth: ai là ai (JWT/session). Authz: được làm gì (policy, role). Kiểm tra cả hai. |
| Secret & config | Env cho từng môi trường; không commit secret; Laravel `config()`, Node `process.env` qua config module. |
| Log & audit | Log lỗi có context (userId, requestId); hành động nhạy cảm nên audit (ai làm gì, lúc nào). |

---

### 4.6 Error handling

| Practice | Mô tả |
|----------|--------|
| Central handler | Một nơi bắt mọi lỗi (middleware Express/Fastify, Laravel exception handler), map sang HTTP và body thống nhất. |
| Mã & message | Client cần mã lỗi (code) và message; không trả stack trace ra ngoài ở production. |
| HTTP status đúng | 400 validation, 401 chưa đăng nhập, 403 không có quyền, 404 không tìm thấy, 409 conflict, 500 lỗi server. |
| Log đủ | Trước khi trả response, log lỗi (và requestId) để debug. |

---

## 5. Nguyên tắc vàng cần tuân thủ

### 5.1 Nguyên tắc vàng về kiến trúc & cấu trúc

1. **Dependency rule**  
   Dependency chỉ đi vào trong: Presentation → Application → Domain → Data. Không để layer bên trong phụ thuộc layer bên ngoài (ví dụ domain không import HTTP hay DB cụ thể). Có thể dùng interface/port để đảo chiều phụ thuộc.

2. **Single Responsibility (SRP)**  
   Mỗi class/file một trách nhiệm rõ ràng: Controller xử lý HTTP, Service xử lý nghiệp vụ, Repository xử lý persistence.

3. **Don’t Repeat Yourself (DRY)**  
   Logic dùng lại (validation, format response, auth) đưa vào middleware, pipe, service, helper; không copy-paste giữa các route/controller.

4. **Explicit over implicit**  
   Inject dependency qua constructor (hoặc DI container); không dùng global, singleton ẩn. Interface và type rõ ràng (TypeScript type, PHP type hint + interface).

5. **Module/Domain boundary**  
   Trong modular monolith: module chỉ expose public API (service interface hoặc vài entry point); không để module khác đụng sâu vào implementation chi tiết.

---

### 5.2 Nguyên tắc vàng về API & data

6. **RESTful nhất quán**  
   URL là danh từ (resource), HTTP method thể hiện hành động. Trả đúng status code và body thống nhất (envelope hoặc JSON:API tùy quy ước).

7. **Validate ở biên**  
   Mọi input từ client đều coi là chưa tin cậy; validate ngay ở lớp vào (middleware, Form Request, DTO) trước khi vào service.

8. **Không lộ implementation**  
   Response không trả stack trace, cấu trúc DB nội bộ, hay message lỗi thô từ DB. Dùng mã lỗi và message an toàn cho người dùng.

9. **Idempotency khi cần**  
   Cho thao tác tạo/cập nhật quan trọng (payment, trừ kho), hỗ trợ idempotency key để client gửi lại không gây tác dụng phụ hai lần.

---

### 5.3 Nguyên tắc vàng về bảo mật & vận hành

10. **Least privilege**  
    User/role chỉ được quyền tối thiểu cần thiết. Token/session có thời hạn; refresh và revoke rõ ràng.

11. **Config theo môi trường**  
    Mỗi môi trường (local, staging, prod) có config riêng; secret lấy từ env hoặc vault, không hardcode.

12. **Health check**  
    Có endpoint `/health` hoặc `/ready` để load balancer và orchestrator kiểm tra; khi cần thì kiểm tra DB/cache (nhưng nhanh).

13. **Log có cấu trúc**  
    Log dạng JSON hoặc trường cố định (level, message, requestId, userId, timestamp) để dễ tìm và phân tích.

14. **Graceful shutdown**  
    Nhận SIGTERM thì ngừng nhận request mới, xử lý xong request đang chạy (và job trong queue nếu có), rồi thoát.

---

### 5.4 Nguyên tắc vàng về chất lượng mã

15. **Test những gì quan trọng**  
    Unit test cho service/use case (logic nghiệp vụ); integration/e2e cho API quan trọng. Mock DB và dependency bên ngoài.

16. **Đặt tên có nghĩa**  
    Tên biến, hàm, class phản ánh đúng vai trò; tránh tên chung chung (data, info, handler) trừ khi thực sự generic.

17. **Giữ hàm ngắn**  
    Hàm dài thì tách nhỏ; mức độ chi tiết đồng đều (một hàm không vừa chi tiết HTTP vừa chi tiết SQL).

18. **Không comment bù code dở**  
    Comment giải thích “tại sao”, không mô tả “làm gì” (tên hàm đã nên nói rõ). Code khó hiểu thì refactor thay vì comment dài.

---

## Tóm tắt nhanh

| Chủ đề | Node.js/TypeScript | PHP/Laravel |
|--------|--------------------|-------------|
| Kiến trúc phổ biến | Layered, Modular, Clean/Hexagonal | MVC, Modular (Domains/Modules), Action |
| Cấu trúc | routes → controllers → services → repositories | Routes → Controllers → Services (→ Repositories) → Models |
| Validation | Zod, Joi, class-validator, middleware | Form Request, Validation rules |
| Response chuẩn | Middleware/Interceptor format chung | API Resource, Exception handler |
| Error | Global error middleware, map → status + body | Handler, report, render |
| Config | env + config module | .env + config/*.php |
| Auth | JWT/session middleware, guard | Sanctum/Passport, middleware, policy |

Áp dụng **layered** hoặc **modular** làm nền; tuân thủ **dependency rule**, **SRP**, **validate ở biên**, **error handling tập trung** và **config theo môi trường** là nền tảng vững cho mọi dự án Node/TS và Laravel.
