# Kế hoạch implement DBML theo file econtract_database_2 1.dbml

## 1. Phân tích file mẫu

File `econtract_database_2 1.dbml` sử dụng cú pháp DBML mở rộng so với parser hiện tại:

| Tính năng | Ví dụ trong file | Parser hiện tại |
|-----------|------------------|------------------|
| **Tên bảng trong dấu ngoặc kép** | `Table "m_users" {` | Chỉ hỗ trợ `Table table_name` (không dấu ngoặc) |
| **Tên cột trong dấu ngoặc kép** | `"id" SERIAL [pk, increment]` | Chỉ hỗ trợ `column_name` |
| **Ref inline trong cột** | `"user_id" INTEGER [ref: > "m_users"."id", not null]` | Chỉ hỗ trợ dòng độc lập `Ref: t.col > t.col` |
| **Constraint `increment`** | `[pk, increment]` | Chưa map sang AUTO_INCREMENT |
| **Default value** | `[default: true]`, `[default: 'api']`, `[default: \`CURRENT_TIMESTAMP\`]` | Chưa parse |
| **Comment sau cột** | `"representative_name" VARCHAR(200) // 代表者情報` | Chưa lưu vào column.comment |
| **Kiểu dữ liệu** | SERIAL, VARCHAR(50), CHAR(7), BOOLEAN, DATE, TIMESTAMP, SMALLINT, TEXT, DECIMAL(10,2), JSONB | Phần lớn đã đúng (regex type có `(n,m)`); SERIAL đã là từ khóa |

**Diamond notation (◇)** trong file chỉ là comment mô tả polymorphic, không phải cú pháp DBML chuẩn — không cần parse thành cấu trúc đặc biệt trong phase này.

---

## 2. Các function nhỏ cần phát triển

### 2.1 Parser – Quoted identifiers

| # | Function / logic | Mô tả | File |
|---|------------------|--------|------|
| F1 | `matchQuotedOrUnquotedIdentifier(str)` | Trích tên identifier từ chuỗi: `"m_users"` → `m_users`, `users` → `users`. Dùng cho tên bảng và tên cột. | DBMLParser.ts hoặc utils |
| F2 | Table regex với quoted name | Regex mới: `Table\s+"?([^"\s]+)"?\s*\{` để match cả `Table "m_users"` và `Table users`. | DBMLParser.ts |
| F3 | Column regex với quoted name | Phần tên cột: `"?([^"\s]+)"?\s+` thay cho `(\w+)\s+`. | DBMLParser.ts |
| F4 | Table name map key | Dùng tên bảng đã normalize (bỏ ngoặc, lowercase) làm key trong `tableNameMap`. | DBMLParser.ts |

### 2.2 Parser – Inline ref

| # | Function / logic | Mô tả | File |
|---|------------------|--------|------|
| F5 | Parse ref trong `[ ... ]` | Trong chuỗi constraint, tìm `ref:\s*>\s*"([^"]+)"\."([^"]+)"` hoặc `ref:\s*<\s*"([^"]+)"\."([^"]+)"`. Trả về `{ toTable, toColumn, direction }` hoặc null. | DBMLParser.ts |
| F6 | Thu thập ref khi parse cột | Khi parse từng cột, nếu có inline ref thì push vào mảng `inlineRefs`: `{ fromTableId, fromColumnName, toTableName, toColumnName, direction }`. | DBMLParser.ts |
| F7 | Resolve inline ref sau khi có tables | Sau khi parse xong mọi bảng, resolve `toTableName` → `tableId` và thêm vào `relationships` (tương tự standalone Ref). | DBMLParser.ts |

### 2.3 Parser – Constraints & default

| # | Function / logic | Mô tả | File |
|---|------------------|--------|------|
| F8 | Constraint `increment` | Trong constraint string, nếu có `increment` thì thêm `{ type: 'AUTO_INCREMENT' }`. | DBMLParser.ts |
| F9 | Parse `default: value` | Tách giá trị sau `default:`. Hỗ trợ: từ đơn (true/false/số), chuỗi trong `'...'`, backtick \`...\`. Lưu vào `column.defaultValue` (string). | DBMLParser.ts |
| F10 | Inline comment sau cột | Nếu dòng có `//`, phần sau `//` (trim) lưu vào `column.comment` cho cột vừa parse. | DBMLParser.ts |

### 2.4 Validation & canParse

| # | Function / logic | Mô tả | File |
|---|------------------|--------|------|
| F11 | `canParse` với quoted Table | Thêm pattern `Table\s+"[^"]+"\s*\{` để nhận diện DBML có bảng tên trong ngoặc kép. | DBMLParser.ts |
| F12 | Validation | Giữ hoặc bổ sung: input có chứa ít nhất một Table (dạng `Table name` hoặc `Table "name"`). | DBMLParser.ts |

### 2.5 Export (round-trip, optional)

| # | Function / logic | Mô tả | File |
|---|------------------|--------|------|
| F13 | Export DBML (nếu có) | Khi export lại DBML: tên bảng/cột có ký tự đặc biệt thì xuất dạng `"name"`, ref xuất dạng inline `[ref: > "t"."c"]`, default xuất đúng format. | FrontendExporter hoặc DBMLExporter (nếu có) |

*Ghi chú: Hiện tại có thể chưa có export DBML; nếu chỉ Import từ DBML thì F13 có thể làm sau.*

---

## 3. Test cần viết

### 3.1 Unit test – Parser

| # | Test case | Mô tả |
|---|-----------|--------|
| T1 | Quoted table name | Input `Table "m_users" { "id" serial }` → 1 bảng tên `m_users`, 1 cột `id`. |
| T2 | Quoted column names | Input một bảng với vài cột dạng `"email" VARCHAR(50)` → columns đúng tên và type. |
| T3 | Inline ref `ref: > "t"."c"` | Một bảng có cột `"user_id" integer [ref: > "m_users"."id"]` → có 1 relationship từ bảng hiện tại → m_users.id. |
| T4 | Inline ref `ref: <` | Cột có `ref: < "other"."id"` → relationship chiều ngược (other.id ← current column). |
| T5 | Constraint increment | `[pk, increment]` → constraints có PRIMARY_KEY và AUTO_INCREMENT. |
| T6 | Default: boolean/number | `[default: true]`, `[default: 0]` → column.defaultValue là `"true"`, `"0"`. |
| T7 | Default: quoted string | `[default: 'api']` → column.defaultValue chứa giá trị tương ứng (e.g. `'api'` hoặc `api` tùy quy ước lưu). |
| T8 | Default: backtick | `[default: \`CURRENT_TIMESTAMP\`]` → column.defaultValue `CURRENT_TIMESTAMP`. |
| T9 | canParse quoted Table | `canParse('Table "x" { }')` → true. |
| T10 | Type DECIMAL(10,2) | Cột `"amount" DECIMAL(10,2)` → type giữ nguyên `DECIMAL(10,2)`. |

### 3.2 Integration test – Full file econtract

| # | Test case | Mô tả |
|---|-----------|--------|
| T11 | Parse full econtract_database_2 1.dbml | Đọc file mẫu, parse bằng DBMLParser → success, số bảng đúng, số relationship ≥ số ref inline (+ standalone Ref nếu có). |
| T12 | Tables và columns chính | Sau parse, có bảng `m_users`, `m_personal_owners`, `t_e_contracts`, …; một vài cột có default (e.g. is_active default true). |
| T13 | Relationships từ inline ref | Có relationship từ `m_personal_owners.user_id` → `m_users.id`, và các ref tương tự khác trong file. |

### 3.3 Regression

| # | Test case | Mô tả |
|---|-----------|--------|
| T14 | DBML không ngoặc kép (cũ) | DBML cũ dạng `Table users { id integer [pk] }` vẫn parse đúng. |
| T15 | Standalone Ref vẫn hoạt động | Dòng `Ref: a.id > b.id` vẫn tạo relationship như hiện tại. |

---

## 4. Tổng hợp

| Loại | Số lượng |
|------|----------|
| **Function / logic nhỏ (parser + validation)** | 12 (F1–F12; F13 optional) |
| **Unit test parser** | 10 (T1–T10) |
| **Integration test (full file)** | 3 (T11–T13) |
| **Regression test** | 2 (T14–T15) |
| **Tổng test** | **15** |

---

## 5. Thứ tự thực hiện đề xuất

1. F1–F4: Quoted identifiers (table + column) + test T1, T2, T14.  
2. F5–F7: Inline ref + test T3, T4, T12, T13.  
3. F8–F10: increment, default, comment + test T5–T8, T10.  
4. F11–F12: canParse & validation + test T9.  
5. T11: Integration test với full file econtract.  
6. T15: Standalone Ref regression.  
7. (Tùy chọn) F13: Export DBML và test round-trip.

Sau khi hoàn thành, import file `econtract_database_2 1.dbml` vào ứng dụng sẽ cho diagram đầy đủ bảng và quan hệ tương ứng.

---

## 6. Trạng thái triển khai (đã hoàn thành)

- **Parser:** Đã bổ sung trong `src/client/core/parser/DBMLParser.ts`:
  - Bảng/cột có tên trong dấu ngoặc kép (`Table "name"`, `"col" type`).
  - Inline ref trong cột: `[ref: > "table"."col"]`, `[ref: < "table"."col"]`.
  - Constraint `increment` → AUTO_INCREMENT.
  - Default: `default: true`, `default: 0`, `default: 'api'`, `default: \`CURRENT_TIMESTAMP\``.
  - Comment sau cột (phần sau `//`) gán vào `column.comment`.
  - Standalone Ref hỗ trợ tên trong ngoặc kép.
- **Validation / canParse:** Nhận diện `Table "name" {`.
- **Test:** Đã thêm trong `src/client/__tests__/test-parsers.ts`: test DBML (T1–T10, T14, T15) và test integration với file econtract (khi có file tại `~/Downloads/econtract_database_2 1.dbml`).

**Lưu ý:** Parser xử lý theo từng dòng; định nghĩa bảng có nhiều cột trên cùng một dòng (ví dụ `Table t { a int, b int }`) sẽ không parse được các cột. File econtract mẫu mỗi cột một dòng nên parse đúng.
