# MyDBDiagram.io

Personal tool similar to dbdiagram.io for database diagramming.

## Features

- **Visual Database Diagramming**: Create and edit database diagrams with tables, columns, and relationships
- **Import/Export**: Import from SQL or JSON, export to JSON, SQL, or SVG
- **Save/Load**: Save diagrams to backend and load them later
- **Interactive Canvas**: Zoom, pan, drag tables, and create relationships
- **Keyboard Shortcuts**: Efficient workflow with keyboard shortcuts
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Project Structure

```
mydbdiagramio/
├── design/          # Design files and documentation
├── output/          # Exported files from the tool
└── src/             # Source code
    ├── client/      # Frontend (React + TypeScript)
    └── server/      # Backend (Express + TypeScript)
```

## Getting Started

### Prerequisites

- Node.js 18+ (use `.nvmrc` for version management)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Recommended: Use run-chrome.sh to automatically open in Chrome
./run-chrome.sh

# Or use run.sh script (automatically handles port conflicts)
./run.sh

# Or run directly with npm:
npm run dev

# Or run separately:
npm run dev:server  # Backend on http://localhost:3000
npm run dev:client  # Frontend on http://localhost:5173
```

**Scripts**:
- **`run-chrome.sh`**: Automatically opens the app in Chrome after starting
  - Kills processes using ports 3000, 5173, 5174, or 5175
  - Waits for server to be ready
  - Opens Chrome automatically
- **`run.sh`**: Starts the app with port cleanup
  - Kills any processes using ports 3000, 5173, 5174, or 5175
  - Installs dependencies if needed
  - Starts the application with proper error handling

**Manual Browser Access**:
After starting the app, open your browser and navigate to:
- Frontend: `http://localhost:5173` (or the port shown in terminal)
- Backend API: `http://localhost:3000`

The application will be available at `http://localhost:5173` (frontend) with the backend API at `http://localhost:3000`.

### Build

```bash
# Build both frontend and backend
npm run build

# Or build separately:
npm run build:server  # Build backend
npm run build:client  # Build frontend
```

### Run Production

```bash
# Build first
npm run build

# Then start the server
npm start
```

## Usage

### Creating Diagrams

1. Click "New" to create a new diagram
2. Right-click on canvas to add a table, or use Ctrl+N
3. Double-click a table to edit it
4. Drag tables to reposition them
5. Right-click a table to create relationships or delete it

### Keyboard Shortcuts

- `Ctrl/Cmd + N`: Add new table
- `Ctrl/Cmd + S`: Save diagram
- `Delete/Backspace`: Delete selected table
- `Escape`: Close dialogs/menus
- `Ctrl/Cmd + /`: Show keyboard shortcuts help
- `Ctrl/Cmd + Wheel`: Zoom in/out
- `Right Click`: Open context menu
- `Double Click`: Edit table/column

### Importing Diagrams

1. Click "Import" in the toolbar
2. Choose import method:
   - **SQL**: Paste SQL DDL statements
   - **JSON**: Paste JSON diagram data
   - **File**: Upload a SQL or JSON file

### Exporting Diagrams

1. Click "Export" in the toolbar
2. Select export format:
   - **JSON**: Diagram data in JSON format
   - **SQL**: SQL DDL statements
   - **SVG**: Vector image of the diagram

### Saving and Loading

1. **Save**: Click "Save" to save the current diagram to the backend
2. **Load**: Click "Load" to see all saved diagrams and load one

## API Documentation

### Diagram Endpoints

- `GET /api/diagrams` - List all diagrams
- `GET /api/diagrams/:id` - Get diagram by ID
- `POST /api/diagrams` - Create new diagram
- `PUT /api/diagrams/:id` - Update diagram
- `DELETE /api/diagrams/:id` - Delete diagram

### Export Endpoints

- `POST /api/diagrams/:id/export?format=json|sql|svg` - Export diagram
- `GET /api/diagrams/formats` - Get supported export formats

### Health Check

- `GET /health` - Server health check

## Code Quality

### Linting

```bash
npm run lint
npm run lint:fix
```

### Formatting

```bash
npm run format
npm run format:check
```

### Type Checking

```bash
npm run type-check
```

### Clean

```bash
npm run clean
```

## Technology Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **CSS**: Styling

### Backend
- **Node.js**: Runtime
- **Express**: Web framework
- **TypeScript**: Type safety
- **File System**: Data persistence

## Project Rules & Standards

- **Language**: TypeScript
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Line Endings**: LF (Unix)
- **Code Style**: ESLint + Prettier
- **Strict Mode**: Enabled
- **Architecture**: Modular, testable, maintainable

## Testing

### Running Tests

```bash
# Run domain model tests
npx tsx src/client/core/__tests__/test-domain-models.ts

# Run backend tests
npx tsx src/server/__tests__/test-repositories.ts
npx tsx src/server/__tests__/test-services.ts
npx tsx src/server/__tests__/test-exporters.ts

# Run frontend tests
npx tsx src/client/__tests__/test-api-client.ts
npx tsx src/client/__tests__/test-state-management.ts
npx tsx src/client/__tests__/test-parsers.ts

# Run integration tests (requires server running)
npm run dev:server  # In one terminal
npx tsx src/server/__tests__/test-backend-api.ts  # In another terminal
```

## Development Guidelines

1. **Modular Architecture**: Keep code modular and testable
2. **Type Safety**: Always use TypeScript types
3. **Error Handling**: Handle errors gracefully with user-friendly messages
4. **Testing**: Write tests for new features
5. **Documentation**: Update design documents when making logic changes
6. **Code Style**: Follow ESLint and Prettier rules

## CI/CD

This project uses GitHub Actions for continuous integration and deployment.

### Workflows

- **CI Workflow** (`.github/workflows/ci.yml`): Runs on every push and pull request
  - Type checking
  - Linting
  - Format checking
  - Building
  - Unit and integration tests

- **Build Workflow** (`.github/workflows/build.yml`): Runs on main branch pushes and tags
  - Full build process
  - Artifact upload

### Status Badge

Add this to your README to show CI status:
![CI](https://github.com/tudang88/mydbdiagramio/workflows/CI/badge.svg)

## License

MIT
