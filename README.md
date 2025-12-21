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
├── docs/            # Documentation and test results
├── output/          # Exported files from the tool
├── scripts/         # Shell scripts for development
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
./scripts/run-chrome.sh

# Or use run.sh script (automatically handles port conflicts)
./scripts/run.sh

# Or run directly with npm:
npm run dev

# Or run separately:
npm run dev:server  # Backend on http://localhost:3000
npm run dev:client  # Frontend on http://localhost:5173
```

**Scripts** (located in `scripts/` folder):
- **`scripts/run-chrome.sh`**: Automatically opens the app in Chrome after starting
  - Kills processes using ports 3000, 5173, 5174, or 5175
  - Waits for server to be ready
  - Opens Chrome automatically
- **`scripts/run.sh`**: Starts the app with port cleanup
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

1. Click **"New"** in the toolbar to create a new diagram
2. **Add tables**: Write SQL/DBML in the SQL Editor panel and click "Draw"
3. **Edit tables**: Double-click a table to open the table editor
4. **Edit columns**: Double-click a column to open the column editor
5. **Move tables**: Click and drag tables to reposition them on the canvas
6. **Create relationships**: Use the relationship tools (to be implemented)
7. **Delete tables**: Select a table and press `Delete/Backspace` (with confirmation)

### SQL Editor

The application includes a built-in SQL Editor panel on the left side:

- **Write SQL/DBML**: Type SQL DDL statements or DBML syntax directly in the editor
- **Dialect selection**: Choose between SQL or PostgreSQL (DBML) dialects
- **Draw diagram**: Click the "Draw" button to parse SQL and generate the visual diagram
- **Format SQL**: Use the format button to clean up your SQL code
- **Auto-sync**: The editor automatically updates when you import diagrams

### Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save diagram
- `Delete/Backspace`: Delete selected table (with confirmation)
- `Escape`: Close dialogs/menus
- `Ctrl/Cmd + /`: Show keyboard shortcuts help dialog
- `Ctrl/Cmd + Wheel`: Zoom in/out on canvas
- `Double Click`: Edit table or column

### Importing Diagrams

1. Click **"Import"** in the toolbar
2. Choose import method:
   - **Paste**: Paste SQL or JSON text directly
   - **SQL**: Switch to SQL mode and paste SQL DDL statements
   - **JSON**: Switch to JSON mode and paste JSON diagram data
   - **From File**: Upload a `.sql` or `.json` file
3. Click **"Import"** to load the diagram into the canvas

The imported content will also appear in the SQL Editor panel for further editing.

### Exporting Diagrams

1. Click **"Export"** in the toolbar
2. Select export format:
   - **JSON**: Export diagram data in JSON format
   - **SQL DDL**: Export as SQL CREATE TABLE statements
   - **SVG Image**: Export as SVG vector image
3. Click **"Export"** to download the file

### Saving and Loading

1. **Save**: Click **"Save"** in the toolbar to save the current diagram to the backend
   - The diagram ID, metadata, and SQL editor content are all saved
   - You'll receive a confirmation message when saved successfully
2. **Load**: Click **"Load"** in the toolbar to:
   - View all saved diagrams in a list
   - Select a diagram to load
   - The loaded diagram will appear on the canvas and in the SQL Editor

## Documentation

- **API Documentation**: See [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)
- **Changelog**: See [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- **Implementation Checklist**: See [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md)
- **Test Results**: See [`docs/`](docs/) for all test result files

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

## License

MIT
