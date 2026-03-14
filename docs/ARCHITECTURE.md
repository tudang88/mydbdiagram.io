# Tài Liệu Kiến Trúc - MyDBDiagram.io

## Mục Lục

1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Kiến Trúc Tổng Thể](#kiến-trúc-tổng-thể)
3. [Kiến Trúc Frontend](#kiến-trúc-frontend)
4. [Kiến Trúc Backend](#kiến-trúc-backend)
5. [Luồng Dữ Liệu (Data Flow)](#luồng-dữ-liệu-data-flow)
6. [Design Patterns](#design-patterns)
7. [Cấu Trúc Module và Dependencies](#cấu-trúc-module-và-dependencies)
8. [Technology Stack](#technology-stack)
9. [Lưu Trữ Dữ Liệu](#lưu-trữ-dữ-liệu)

---

## Tổng Quan Hệ Thống

### Mục Đích
MyDBDiagram.io là một công cụ web cho phép người dùng tạo, chỉnh sửa và quản lý sơ đồ cơ sở dữ liệu (database diagrams) một cách trực quan. Ứng dụng tương tự như dbdiagram.io, cung cấp khả năng:

- Tạo và chỉnh sửa sơ đồ cơ sở dữ liệu với bảng, cột và quan hệ
- Import từ SQL hoặc JSON
- Export sang nhiều định dạng (JSON, SQL, SVG, PNG)
- Lưu và tải sơ đồ từ backend
- Tương tác với canvas (zoom, pan, kéo thả bảng)

### Kiến Trúc Tổng Thể

Ứng dụng được xây dựng theo mô hình **Client-Server** với kiến trúc **layered architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Frontend)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   UI     │  │  State   │  │ Services │  │   Core   │   │
│  │Components│→ │Management│→ │  Layer   │→ │  Domain  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Backend)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Routes  │→ │Controllers│→ │ Services │→ │Repositories│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────┐                              │
│  │Exporters │  │Middleware│                              │
│  └──────────┘  └──────────┘                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE (File System)                     │
│  ┌──────────┐  ┌──────────┐                                │
│  │ Diagrams │  │  Output  │                                │
│  │   JSON   │  │  Files   │                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Kiến Trúc Frontend

### Tổng Quan

Frontend được xây dựng bằng **React 18** với **TypeScript**, được tổ chức thành 4 lớp chính:

1. **UI Layer (Presentation Layer)**: React Components
2. **State Layer**: State Management (Stores)
3. **Service Layer**: API Communication & Business Logic
4. **Core Layer**: Domain Models & Business Rules

### 1. UI Layer (Presentation Layer)

**Vị trí**: `src/client/components/`

**Chức năng**: Hiển thị giao diện người dùng và xử lý tương tác

**Các Component Chính**:

- **`App.tsx`**: Component gốc, quản lý toàn bộ ứng dụng
- **`Toolbar`**: Thanh công cụ với các nút New, Save, Load, Import, Export
- **`DiagramCanvas`**: Canvas chính để hiển thị và tương tác với sơ đồ
  - `DiagramContent.tsx`: Render các table và relationship
- **`TableNode`**: Component hiển thị một bảng trên canvas
- **`RelationshipLine`**: Component hiển thị đường quan hệ giữa các bảng
- **`SQLEditor`**: Editor để nhập SQL/DBML và parse thành diagram
- **`TableEditor`**: Dialog để chỉnh sửa thông tin bảng
- **`ColumnEditor`**: Dialog để chỉnh sửa thông tin cột
- **`RelationshipCreator`**: Dialog để tạo quan hệ giữa các bảng
- **`ImportDialog`**: Dialog để import diagram từ file hoặc text
- **`ExportDialog`**: Dialog để export diagram sang các định dạng
- **`LoadDialog`**: Dialog để load diagram đã lưu
- **`ErrorBoundary`**: Xử lý lỗi React
- **`ErrorMessage`**: Hiển thị thông báo lỗi
- **`Notification`**: Hiển thị thông báo (success/error/info)
- **`LoadingIndicator`**: Hiển thị trạng thái loading
- **`KeyboardShortcutsHelp`**: Hiển thị bảng phím tắt
- **`ContextMenu`**: Menu ngữ cảnh khi click chuột phải

**Luồng Tương Tác**:
```
User Action → UI Component → State Store → Service → API → Backend
```

### 2. State Layer (State Management)

**Vị trí**: `src/client/state/store/`

**Chức năng**: Quản lý trạng thái ứng dụng theo mô hình **Observer Pattern**

**Các Store**:

#### `DiagramStore`
- **Chức năng**: Lưu trữ diagram hiện tại
- **Pattern**: Observer Pattern (subscribe/unsubscribe)
- **API**:
  - `setDiagram(diagram)`: Cập nhật diagram
  - `getDiagram()`: Lấy diagram hiện tại
  - `subscribe(observer)`: Đăng ký lắng nghe thay đổi

#### `UIStore`
- **Chức năng**: Quản lý trạng thái UI (selected table, selected relationship, etc.)
- **Pattern**: Observer Pattern
- **API**:
  - `getState()`: Lấy trạng thái UI
  - `setState(partialState)`: Cập nhật trạng thái UI
  - `subscribe(observer)`: Đăng ký lắng nghe thay đổi

**Đặc Điểm**:
- Stores là singleton instances được khởi tạo trong `App.tsx`
- Components subscribe để nhận thông báo khi state thay đổi
- State changes trigger re-render của các component đã subscribe

### 3. Service Layer

**Vị trí**: `src/client/services/`

**Chức năng**: Xử lý giao tiếp với backend API và business logic

**Các Service**:

#### `ApiClient`
- **Chức năng**: HTTP client với caching
- **Features**:
  - GET/POST/PUT/DELETE requests
  - Response caching (sử dụng `apiCache` utility)
  - Cache invalidation khi có thay đổi
  - Error handling
- **API**:
  - `get<T>(path)`: GET request với cache
  - `post<T>(path, data)`: POST request
  - `put<T>(path, data)`: PUT request
  - `delete<T>(path)`: DELETE request

#### `DiagramService`
- **Chức năng**: Business logic cho diagram operations
- **Dependencies**: `ApiClient`, `DiagramValidator`
- **API**:
  - `saveDiagram(diagram)`: Lưu diagram lên server
  - `loadDiagram(id)`: Tải diagram từ server
  - `listDiagrams()`: Lấy danh sách diagrams
  - `deleteDiagram(id)`: Xóa diagram

#### `ExportService`
- **Chức năng**: Xử lý export diagram
- **Dependencies**: `ApiClient`
- **API**:
  - `exportDiagram(id, format)`: Export diagram sang format (json/sql/svg/png)

### 4. Core Layer (Domain Models & Business Logic)

**Vị trí**: `src/client/core/`

**Chức năng**: Chứa domain models và business rules

#### Domain Models

**`Diagram`** (`core/diagram/Diagram.ts`)
- **Chức năng**: Domain model đại diện cho một diagram
- **Properties**:
  - `id`: ID duy nhất
  - `tables`: Map chứa các Table
  - `relationships`: Map chứa các Relationship
  - `metadata`: Thông tin metadata (createdAt, updatedAt, sourceText, sourceFormat)
- **Methods**:
  - `addTable(table)`: Thêm bảng
  - `removeTable(id)`: Xóa bảng (tự động xóa relationships liên quan)
  - `getTable(id)`: Lấy bảng theo ID
  - `addRelationship(rel)`: Thêm quan hệ
  - `removeRelationship(id)`: Xóa quan hệ
  - `validate()`: Validate diagram
  - `toJSON()`: Serialize sang JSON
  - `fromJSON(data)`: Deserialize từ JSON
  - `setSourceText(text, format)`: Lưu source SQL/DBML

**`Table`** (`core/table/Table.ts`)
- **Chức năng**: Domain model đại diện cho một bảng
- **Properties**:
  - `id`: ID duy nhất
  - `name`: Tên bảng
  - `position`: Vị trí trên canvas (x, y)
  - `columns`: Mảng các Column
  - `metadata`: Metadata của bảng
- **Methods**:
  - `addColumn(column)`: Thêm cột
  - `removeColumn(id)`: Xóa cột
  - `updateColumn(id, updates)`: Cập nhật cột
  - `getColumn(id)`: Lấy cột theo ID
  - `moveTo(position)`: Di chuyển bảng
  - `validate()`: Validate bảng
  - `toJSON()`: Serialize sang JSON
  - `fromJSON(data)`: Deserialize từ JSON

**`Relationship`** (`core/relationship/Relationship.ts`)
- **Chức năng**: Domain model đại diện cho quan hệ giữa các bảng
- **Properties**:
  - `id`: ID duy nhất
  - `fromTableId`: ID bảng nguồn
  - `fromColumnId`: ID cột nguồn
  - `toTableId`: ID bảng đích
  - `toColumnId`: ID cột đích
  - `type`: Loại quan hệ (one-to-one, one-to-many, many-to-many)
- **Methods**:
  - `validate(diagram)`: Validate quan hệ
  - `toJSON()`: Serialize sang JSON
  - `fromJSON(data)`: Deserialize từ JSON

#### Parsers

**Vị trí**: `src/client/core/parser/`

**Chức năng**: Parse các định dạng input thành Diagram

**Các Parser**:

- **`SQLParser`**: Parse SQL DDL statements thành Diagram
- **`DBMLParser`**: Parse DBML syntax thành Diagram
- **`JSONParser`**: Parse JSON diagram data thành Diagram
- **`ParserInterface`**: Interface chung cho tất cả parsers

**Pattern**: Strategy Pattern - mỗi parser implement `ParserInterface`

#### Validators

**Vị trí**: `src/client/core/validator/`

**Chức năng**: Validate domain models

**Các Validator**:

- **`DiagramValidator`**: Validate diagram (tables, relationships)
- **`TableValidator`**: Validate table (columns, constraints)
- **`RelationshipValidator`**: Validate relationship (table references)

#### Exporters (Frontend)

**Vị trí**: `src/client/core/exporter/`

**Chức năng**: Export diagram từ frontend (không qua server)

- **`FrontendExporter`**: Export diagram sang các format (JSON, SQL)

### Utilities

**Vị trí**: `src/client/utils/`

- **`cache.ts`**: In-memory cache cho API responses
- **`debounce.ts`**: Debounce function cho performance
- **`viewport.ts`**: Viewport utilities cho canvas

---

## Kiến Trúc Backend

### Tổng Quan

Backend được xây dựng bằng **Node.js** với **Express** và **TypeScript**, tuân theo **layered architecture**:

1. **Routes Layer**: Định nghĩa API endpoints
2. **Controllers Layer**: Xử lý HTTP requests/responses
3. **Services Layer**: Business logic
4. **Repositories Layer**: Data access
5. **Middleware**: Cross-cutting concerns (logging, error handling)

### 1. Routes Layer

**Vị trí**: `src/server/routes/`

**Chức năng**: Định nghĩa API endpoints và routing

**Các Routes**:

- **`index.ts`**: Router chính, tổng hợp tất cả routes
  - `/health`: Health check endpoint
  - `/api/diagrams`: Diagram routes
  - `/api/diagrams/:id/export`: Export routes

- **`diagram.routes.ts`**: Routes cho diagram operations
  - `GET /api/diagrams`: List all diagrams
  - `GET /api/diagrams/:id`: Get diagram by ID
  - `POST /api/diagrams`: Create new diagram
  - `PUT /api/diagrams/:id`: Update diagram
  - `DELETE /api/diagrams/:id`: Delete diagram

- **`export.routes.ts`**: Routes cho export operations
  - `POST /api/diagrams/:id/export?format=json|sql|svg|png`: Export diagram
  - `GET /api/diagrams/formats`: Get supported export formats

### 2. Controllers Layer

**Vị trí**: `src/server/controllers/`

**Chức năng**: Xử lý HTTP requests, validation, và trả về responses

**Các Controllers**:

#### `DiagramController`
- **Dependencies**: `DiagramService`, `ValidationService`
- **Methods**:
  - `create(req, res)`: Tạo diagram mới
  - `getById(req, res)`: Lấy diagram theo ID
  - `list(req, res)`: Liệt kê tất cả diagrams
  - `update(req, res)`: Cập nhật diagram
  - `delete(req, res)`: Xóa diagram

**Luồng Xử Lý**:
```
Request → Validation → Service → Repository → Response
```

#### `ExportController`
- **Dependencies**: `ExportService`
- **Methods**:
  - `export(req, res)`: Export diagram sang format

### 3. Services Layer

**Vị trí**: `src/server/services/`

**Chức năng**: Business logic và orchestration

**Các Services**:

#### `DiagramService`
- **Dependencies**: `DiagramRepository`
- **Chức năng**: Business logic cho diagram operations
- **Methods**:
  - `create(data)`: Tạo diagram mới (generate ID, metadata)
  - `findById(id)`: Tìm diagram theo ID
  - `findAll()`: Lấy tất cả diagrams
  - `update(id, updates)`: Cập nhật diagram
  - `delete(id)`: Xóa diagram

#### `ExportService`
- **Dependencies**: `DiagramService`, `ExporterFactory`
- **Chức năng**: Orchestrate export process
- **Methods**:
  - `export(id, format)`: Export diagram
    - Load diagram từ DiagramService
    - Get exporter từ ExporterFactory
    - Execute export
    - Return file path

#### `ValidationService`
- **Chức năng**: Validate request data
- **Methods**:
  - `validateDiagram(data)`: Validate diagram data
  - `validateTable(data)`: Validate table data
  - `validateRelationship(data)`: Validate relationship data

### 4. Repositories Layer

**Vị trí**: `src/server/repositories/`

**Chức năng**: Data access abstraction (Repository Pattern)

**Các Repositories**:

#### `DiagramRepository`
- **Dependencies**: `FileRepository`
- **Chức năng**: CRUD operations cho diagrams
- **Storage**: File system (`data/diagrams/*.json`)
- **Methods**:
  - `findById(id)`: Đọc diagram từ file
  - `findAll()`: Liệt kê tất cả diagram files
  - `save(diagram)`: Lưu diagram vào file
  - `update(id, diagram)`: Cập nhật diagram file
  - `delete(id)`: Xóa diagram file

#### `FileRepository`
- **Chức năng**: Low-level file operations
- **Methods**:
  - `readJSON(path)`: Đọc JSON file
  - `writeJSON(path, data)`: Ghi JSON file
  - `listFiles(dir)`: Liệt kê files trong directory
  - `deleteFile(path)`: Xóa file

**Pattern**: Repository Pattern - abstract data access layer

### 5. Exporters

**Vị trí**: `src/server/exporters/`

**Chức năng**: Export diagram sang các định dạng khác nhau

**Pattern**: Strategy Pattern + Factory Pattern

**Các Exporters**:

- **`JSONExporter`**: Export sang JSON
- **`SQLExporter`**: Export sang SQL DDL statements
- **`SVGExporter`**: Export sang SVG image
- **`PNGExporter`**: Export sang PNG image

**`ExporterFactory`**:
- **Chức năng**: Factory để tạo exporters
- **Methods**:
  - `getExporter(format)`: Lấy exporter theo format
  - `register(format, exporter)`: Đăng ký exporter mới
  - `getSupportedFormats()`: Lấy danh sách formats được hỗ trợ

**`ExporterInterface`**:
- Interface chung cho tất cả exporters
- Method: `export(diagram, options)`

### 6. Middleware

**Vị trí**: `src/server/middleware/`

**Chức năng**: Cross-cutting concerns

**Các Middleware**:

- **`logger.ts`**: Log HTTP requests
- **`errorHandler.ts`**: Global error handler
  - Catch errors từ controllers
  - Format error responses
  - Log errors

**Middleware Chain**:
```
Request → CORS → JSON Parser → Logger → Routes → Error Handler → Response
```

### 7. Server Entry Point

**Vị trí**: `src/server/index.ts`

**Chức năng**: Khởi tạo Express server

**Setup**:
- CORS configuration
- JSON body parser
- Routes registration
- Error handler (must be last)
- Server listening on port 3000

---

## Luồng Dữ Liệu (Data Flow)

### 1. Tạo Diagram Mới

```
User clicks "New"
  ↓
App.tsx → handleNewDiagram()
  ↓
Diagram.create() → new Diagram()
  ↓
DiagramStore.setDiagram()
  ↓
DiagramStore.notifyObservers()
  ↓
Components re-render → Canvas shows empty diagram
```

### 2. Parse SQL và Tạo Diagram

```
User types SQL in SQLEditor
  ↓
User clicks "Draw"
  ↓
SQLEditor → SQLParser.parse(sql)
  ↓
SQLParser → Creates Diagram with Tables
  ↓
handleDiagramChangeFromSQL(newDiagram)
  ↓
DiagramStore.setDiagram(newDiagram)
  ↓
Canvas re-renders with tables
```

### 3. Lưu Diagram

```
User clicks "Save"
  ↓
Toolbar → DiagramService.saveDiagram(diagram)
  ↓
DiagramService → ApiClient.post('/api/diagrams', diagramData)
  ↓
Backend: POST /api/diagrams
  ↓
DiagramController.create()
  ↓
ValidationService.validateDiagram()
  ↓
DiagramService.create()
  ↓
DiagramRepository.save()
  ↓
FileRepository.writeJSON()
  ↓
Response → Frontend
  ↓
Notification: "Diagram saved successfully"
```

### 4. Tải Diagram

```
User clicks "Load"
  ↓
Toolbar → DiagramService.listDiagrams()
  ↓
ApiClient.get('/api/diagrams')
  ↓
Backend: GET /api/diagrams
  ↓
DiagramController.list()
  ↓
DiagramService.findAll()
  ↓
DiagramRepository.findAll()
  ↓
FileRepository.listFiles() + readJSON()
  ↓
Response → Frontend
  ↓
LoadDialog shows list
  ↓
User selects diagram
  ↓
DiagramService.loadDiagram(id)
  ↓
ApiClient.get('/api/diagrams/:id')
  ↓
Backend: GET /api/diagrams/:id
  ↓
DiagramController.getById()
  ↓
DiagramService.findById()
  ↓
DiagramRepository.findById()
  ↓
FileRepository.readJSON()
  ↓
Response → Frontend
  ↓
Diagram.fromJSON(data)
  ↓
DiagramStore.setDiagram(diagram)
  ↓
Canvas re-renders
```

### 5. Export Diagram

```
User clicks "Export" → Selects format (e.g., PNG)
  ↓
ExportDialog → ExportService.exportDiagram(id, 'png')
  ↓
ApiClient.post('/api/diagrams/:id/export?format=png')
  ↓
Backend: POST /api/diagrams/:id/export
  ↓
ExportController.export()
  ↓
ExportService.export()
  ↓
DiagramService.findById() → Load diagram
  ↓
ExporterFactory.getExporter('png')
  ↓
PNGExporter.export(diagram)
  ↓
File saved to output/
  ↓
Response with file path
  ↓
Frontend downloads file
```

### 6. Thêm Bảng Mới

```
User clicks "Add Table" or double-clicks canvas
  ↓
handleTableAdd()
  ↓
new Table(id, name, position)
  ↓
diagram.addTable(table)
  ↓
DiagramStore.setDiagram() (diagram is mutated)
  ↓
Canvas re-renders → New table appears
```

### 7. Chỉnh Sửa Bảng

```
User double-clicks table
  ↓
handleTableDoubleClick(tableId)
  ↓
setEditingTable(table)
  ↓
TableEditor dialog opens
  ↓
User edits → TableEditor updates table
  ↓
User clicks "Save"
  ↓
handleTableSave()
  ↓
Table is already updated (mutable)
  ↓
Dialog closes
  ↓
Canvas re-renders (if subscribed to DiagramStore)
```

### 8. Tạo Quan Hệ

```
User clicks relationship tool → Selects from table
  ↓
handleRelationshipCreate(fromTableId)
  ↓
RelationshipCreator dialog opens
  ↓
User selects to table and columns
  ↓
User clicks "Create"
  ↓
handleRelationshipSave(relationship)
  ↓
diagram.addRelationship(relationship)
  ↓
Diagram validates relationship (tables exist)
  ↓
RelationshipLine appears on canvas
```

---

## Design Patterns

### 1. Layered Architecture

**Mô tả**: Tổ chức code thành các lớp với trách nhiệm rõ ràng

**Frontend Layers**:
- UI Layer → State Layer → Service Layer → Core Layer

**Backend Layers**:
- Routes → Controllers → Services → Repositories → Storage

**Lợi ích**:
- Separation of concerns
- Dễ test
- Dễ maintain
- Dễ scale

### 2. Repository Pattern

**Mô tả**: Abstract data access layer

**Implementation**:
- `DiagramRepository` abstract file operations
- `FileRepository` handle low-level file I/O

**Lợi ích**:
- Dễ thay đổi storage (file → database)
- Testable (mock repository)
- Business logic không phụ thuộc storage

### 3. Factory Pattern

**Mô tả**: Tạo objects mà không cần specify exact class

**Implementation**:
- `ExporterFactory` tạo exporters dựa trên format string

**Lợi ích**:
- Dễ thêm exporter mới
- Centralized exporter management
- Loose coupling

### 4. Strategy Pattern

**Mô tả**: Định nghĩa family of algorithms, make them interchangeable

**Implementation**:
- Parsers: `SQLParser`, `DBMLParser`, `JSONParser` implement `ParserInterface`
- Exporters: `PNGExporter`, `SVGExporter`, etc. implement `ExporterInterface`

**Lợi ích**:
- Dễ thêm parser/exporter mới
- Runtime selection of algorithm
- Open/Closed Principle

### 5. Observer Pattern

**Mô tả**: Define one-to-many dependency between objects

**Implementation**:
- `DiagramStore` và `UIStore` sử dụng observer pattern
- Components subscribe để nhận updates

**Lợi ích**:
- Loose coupling giữa stores và components
- Reactive updates
- Dễ thêm observers mới

### 6. Dependency Injection

**Mô tả**: Inject dependencies thay vì tạo trong class

**Implementation**:
- Services nhận dependencies qua constructor
- Controllers nhận services qua constructor

**Lợi ích**:
- Testable (mock dependencies)
- Flexible (dễ thay đổi implementation)
- Loose coupling

---

## Cấu Trúc Module và Dependencies

### Frontend Module Dependencies

```
UI Components
  ↓ depends on
State Stores (DiagramStore, UIStore)
  ↓ depends on
Services (DiagramService, ExportService)
  ↓ depends on
Core Domain Models (Diagram, Table, Relationship)
  ↓ depends on
Types & Utilities
```

### Backend Module Dependencies

```
Routes
  ↓ depends on
Controllers
  ↓ depends on
Services
  ↓ depends on
Repositories
  ↓ depends on
File System
```

### Cross-Layer Dependencies

```
Frontend Services → Backend API (HTTP)
Backend Services → Frontend Types (shared types)
```

**Lưu ý**: Frontend và Backend có thể share types thông qua:
- Common type definitions
- Type-only imports

---

## Technology Stack

### Frontend

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool và dev server
- **CSS**: Styling (no CSS framework)

### Backend

- **Node.js**: Runtime environment
- **Express**: Web framework
- **TypeScript**: Type safety
- **File System**: Data persistence (no database)

### Development Tools

- **ESLint**: Linting
- **Prettier**: Code formatting
- **tsx**: TypeScript execution
- **concurrently**: Run multiple processes

### Build & Deployment

- **TypeScript Compiler**: Compile TS to JS
- **Vite**: Bundle frontend
- **Node.js**: Run backend

---

## Lưu Trữ Dữ Liệu

### Storage Strategy

**Hiện tại**: File System

**Cấu trúc**:
```
data/
  diagrams/
    diagram-{timestamp}.json  # Diagram files
output/
  {diagram-id}.{format}      # Exported files
```

### Diagram File Format

```json
{
  "id": "diagram-1234567890",
  "tables": [
    {
      "id": "table-1",
      "name": "Users",
      "position": { "x": 100, "y": 200 },
      "columns": [...],
      "metadata": {...}
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "fromTableId": "table-1",
      "toTableId": "table-2",
      "type": "one-to-many",
      ...
    }
  ],
  "metadata": {
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "sourceText": "CREATE TABLE...",
    "sourceFormat": "sql"
  }
}
```

### Future Considerations

- **Database**: Có thể migrate sang database (PostgreSQL, MongoDB)
- **Cloud Storage**: Có thể lưu trên cloud (S3, Azure Blob)
- **Caching**: Có thể thêm Redis cho caching
- **Search**: Có thể thêm Elasticsearch cho search

---

## Tổng Kết

### Điểm Mạnh của Kiến Trúc

1. **Modular**: Code được tổ chức rõ ràng, dễ maintain
2. **Testable**: Mỗi layer có thể test độc lập
3. **Scalable**: Dễ thêm features mới
4. **Type-safe**: TypeScript đảm bảo type safety
5. **Separation of Concerns**: Mỗi layer có trách nhiệm rõ ràng

### Các Pattern Được Sử Dụng

- Layered Architecture
- Repository Pattern
- Factory Pattern
- Strategy Pattern
- Observer Pattern
- Dependency Injection

### Luồng Dữ Liệu Rõ Ràng

- Frontend: UI → State → Service → API
- Backend: Route → Controller → Service → Repository → Storage
- Bidirectional: Frontend ↔ Backend qua HTTP/REST API

### Khả Năng Mở Rộng

- Dễ thêm parser mới (Strategy Pattern)
- Dễ thêm exporter mới (Factory Pattern)
- Dễ thay đổi storage (Repository Pattern)
- Dễ thêm features mới (Modular Architecture)

---

**Tài liệu này mô tả kiến trúc tổng thể của MyDBDiagram.io ở mức độ chi tiết, giúp developers hiểu rõ cách hệ thống được tổ chức và hoạt động.**

