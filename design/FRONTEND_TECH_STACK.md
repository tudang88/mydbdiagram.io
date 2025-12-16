# Frontend Tech Stack Explanation

## Tổng quan

Ứng dụng MyDBDiagram.io sử dụng **React** và **Vite** để xây dựng frontend. Tài liệu này giải thích vai trò và lý do chọn các công nghệ này.

---

## 1. React - UI Framework

### React là gì?

React là một **JavaScript library** (thư viện) được Facebook phát triển để xây dựng giao diện người dùng (UI). React giúp tạo ra các ứng dụng web **tương tác** và **động**.

### Vai trò trong ứng dụng MyDBDiagram.io:

#### 1.1 **Component-Based Architecture (Kiến trúc dựa trên Component)**

React cho phép chia UI thành các **components** (thành phần) nhỏ, có thể tái sử dụng:

```
MyDBDiagram.io UI Structure:
├── App.tsx (Component chính)
├── Toolbar Component (Thanh công cụ)
├── Canvas Component (Vùng vẽ diagram)
│   ├── TableNode Component (Hiển thị bảng)
│   └── RelationshipLine Component (Đường kết nối)
├── Sidebar Component (Thanh bên để chỉnh sửa)
└── ExportMenu Component (Menu xuất file)
```

**Ví dụ trong code:**
```tsx
// src/client/App.tsx
function App() {
  return (
    <div className="app">
      <header>MyDBDiagram.io</header>
      <main>
        {/* Các components khác sẽ được thêm vào đây */}
      </main>
    </div>
  );
}
```

#### 1.2 **State Management (Quản lý trạng thái)**

React giúp quản lý **state** (trạng thái) của ứng dụng một cách hiệu quả:

- **State**: Dữ liệu thay đổi theo thời gian (ví dụ: diagram hiện tại, bảng được chọn, zoom level)
- **Reactive Updates**: Khi state thay đổi, UI tự động cập nhật

**Ví dụ:**
```tsx
// Khi user thêm một bảng mới
const [tables, setTables] = useState([]);

function addTable(newTable) {
  setTables([...tables, newTable]); // State thay đổi
  // React tự động re-render UI để hiển thị bảng mới
}
```

#### 1.3 **Virtual DOM (DOM ảo)**

React sử dụng **Virtual DOM** để tối ưu hiệu suất:

- Thay vì cập nhật trực tiếp DOM (chậm), React tạo một bản sao ảo
- So sánh thay đổi và chỉ cập nhật phần cần thiết
- **Kết quả**: Ứng dụng nhanh hơn, đặc biệt khi có nhiều bảng và relationships

#### 1.4 **Event Handling (Xử lý sự kiện)**

React xử lý các tương tác của người dùng:

- Click chuột để chọn bảng
- Drag & drop để di chuyển bảng
- Double-click để chỉnh sửa
- Keyboard shortcuts

**Ví dụ:**
```tsx
function TableNode({ table, onSelect, onMove }) {
  return (
    <div 
      onClick={() => onSelect(table.id)}
      onDrag={(e) => onMove(table.id, e.position)}
    >
      {table.name}
    </div>
  );
}
```

### Tại sao chọn React?

1. **Phổ biến và có nhiều tài liệu**: Dễ tìm tài liệu, tutorials
2. **Component reusability**: Dễ tái sử dụng code (TableNode có thể dùng nhiều lần)
3. **Ecosystem phong phú**: Nhiều thư viện hỗ trợ (state management, UI components)
4. **TypeScript support tốt**: Type-safe development
5. **Performance**: Virtual DOM giúp ứng dụng nhanh

---

## 2. Vite - Build Tool & Development Server

### Vite là gì?

Vite (phát âm là "veet", tiếng Pháp nghĩa là "nhanh") là một **build tool** và **development server** hiện đại, được tạo bởi Evan You (tác giả của Vue.js).

### Vai trò trong ứng dụng MyDBDiagram.io:

#### 2.1 **Development Server (Máy chủ phát triển)**

Vite cung cấp một development server **cực kỳ nhanh**:

- **Hot Module Replacement (HMR)**: Khi bạn sửa code, thay đổi hiển thị ngay lập tức trong browser (không cần refresh)
- **Fast startup**: Khởi động server trong vài milliseconds
- **On-demand compilation**: Chỉ compile file khi cần

**Ví dụ workflow:**
```
1. Bạn sửa App.tsx
2. Vite tự động detect thay đổi
3. Browser tự động update (không cần F5)
4. Thời gian: < 100ms
```

#### 2.2 **Build Tool (Công cụ build)**

Khi deploy lên production, Vite:

- **Bundle code**: Gộp tất cả files thành các file tối ưu
- **Minify**: Nén code để giảm kích thước
- **Tree-shaking**: Loại bỏ code không sử dụng
- **Code splitting**: Chia code thành các chunks để load nhanh hơn

**Kết quả:**
- Development: Code dễ đọc, dễ debug
- Production: Code nhỏ gọn, tối ưu, load nhanh

#### 2.3 **Module Resolution (Giải quyết module)**

Vite hỗ trợ:

- **ES Modules**: Sử dụng `import/export` hiện đại
- **Path Aliases**: Sử dụng `@/` thay vì `../../` (dễ đọc hơn)
- **TypeScript**: Compile TypeScript trực tiếp, không cần bước build riêng

**Ví dụ trong vite.config.ts:**
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src/client'),
  },
}

// Thay vì:
import { Diagram } from '../../../core/diagram/Diagram';

// Có thể viết:
import { Diagram } from '@/core/diagram/Diagram';
```

#### 2.4 **Proxy Configuration (Cấu hình proxy)**

Vite có thể proxy requests đến backend:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000', // Backend server
      changeOrigin: true,
    },
  },
}
```

**Lợi ích:**
- Frontend (port 5173) và Backend (port 3000) chạy riêng biệt
- Không cần CORS phức tạp trong development
- API calls từ frontend tự động được forward đến backend

### Tại sao chọn Vite?

1. **Cực kỳ nhanh**: Nhanh hơn Webpack, Create React App
2. **Zero config**: Cấu hình tối thiểu, hoạt động ngay
3. **Modern**: Hỗ trợ ES modules, TypeScript out-of-the-box
4. **Developer Experience**: HMR nhanh, error messages rõ ràng
5. **Production ready**: Build output tối ưu

---

## 3. React + Vite hoạt động cùng nhau như thế nào?

### 3.1 Development Flow (Luồng phát triển)

```
Developer writes code
    ↓
Vite watches for changes
    ↓
Vite compiles TypeScript/JSX on-demand
    ↓
React renders components
    ↓
Browser displays UI
    ↓
(Developer makes changes)
    ↓
Vite HMR updates browser instantly
```

### 3.2 File Structure

```
mydbdiagramio/
├── index.html          # Entry point (Vite injects scripts here)
├── vite.config.ts      # Vite configuration
├── src/
│   └── client/
│       ├── main.tsx    # React entry point
│       ├── App.tsx     # Main React component
│       └── ...
└── package.json        # Dependencies (React, Vite, etc.)
```

### 3.3 Build Process

**Development:**
```bash
npm run dev
→ Vite starts dev server
→ React app loads in browser
→ Changes hot-reload instantly
```

**Production:**
```bash
npm run build
→ Vite bundles and optimizes code
→ Creates dist/ folder with optimized files
→ Ready to deploy
```

---

## 4. So sánh với các lựa chọn khác

### React vs Vue vs Vanilla JS

| Feature | React | Vue | Vanilla JS |
|---------|-------|-----|------------|
| Component System | ✅ | ✅ | ❌ (phải tự build) |
| State Management | ✅ (hooks) | ✅ | ❌ (phải tự quản lý) |
| Ecosystem | ✅ Rất lớn | ✅ Lớn | ❌ |
| Learning Curve | Trung bình | Dễ | Khó (cho app lớn) |
| Performance | ✅ Tốt | ✅ Tốt | ✅ Tốt nhất (nhưng khó maintain) |

**→ Chọn React vì**: Cân bằng tốt giữa dễ sử dụng, performance, và ecosystem

### Vite vs Webpack vs Create React App

| Feature | Vite | Webpack | CRA |
|---------|------|---------|-----|
| Startup Time | ⚡ < 100ms | 🐌 10-30s | 🐌 10-30s |
| HMR Speed | ⚡ < 100ms | 🐌 1-3s | 🐌 1-3s |
| Config Complexity | ✅ Minimal | ❌ Complex | ✅ Zero (nhưng khó customize) |
| TypeScript | ✅ Native | ⚠️ Cần config | ✅ |
| Modern Features | ✅ ES Modules | ⚠️ Cần config | ⚠️ |

**→ Chọn Vite vì**: Nhanh nhất, dễ cấu hình, modern

---

## 5. Ví dụ thực tế trong MyDBDiagram.io

### 5.1 Component Structure

```tsx
// App.tsx - Component chính
function App() {
  const [diagram, setDiagram] = useState(null);
  
  return (
    <div>
      <Toolbar onSave={handleSave} />
      <Canvas diagram={diagram} />
      <Sidebar selectedTable={selectedTable} />
    </div>
  );
}
```

### 5.2 State Management

```tsx
// Khi user thêm bảng mới
function Canvas({ diagram }) {
  const handleAddTable = () => {
    const newTable = createTable();
    // React tự động re-render để hiển thị bảng mới
    setDiagram({ ...diagram, tables: [...diagram.tables, newTable] });
  };
  
  return (
    <div>
      {diagram.tables.map(table => (
        <TableNode key={table.id} table={table} />
      ))}
    </div>
  );
}
```

### 5.3 API Integration

```tsx
// Gọi API backend thông qua Vite proxy
async function loadDiagram(id) {
  // Request tự động được proxy đến http://localhost:3000/api/diagrams/:id
  const response = await fetch(`/api/diagrams/${id}`);
  const diagram = await response.json();
  setDiagram(diagram); // React update UI
}
```

---

## 6. Tóm tắt

### React:
- **Vai trò**: Xây dựng UI components, quản lý state, xử lý events
- **Lợi ích**: Component-based, reactive, performance tốt
- **Dùng cho**: Tất cả UI của ứng dụng

### Vite:
- **Vai trò**: Development server, build tool, module bundler
- **Lợi ích**: Cực kỳ nhanh, zero config, modern
- **Dùng cho**: Development workflow và production build

### Kết hợp:
- **React** xây dựng UI
- **Vite** giúp develop và build nhanh
- **Kết quả**: Ứng dụng nhanh, dễ maintain, developer experience tốt

---

## 7. Tài liệu tham khảo

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React + TypeScript](https://react-typescript-cheatsheet.netlify.app/)

