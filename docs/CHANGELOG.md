# Changelog

All notable changes to MyDBDiagram.io will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-16

### Added
- **Core Domain Models**
  - Diagram, Table, Column, Relationship classes with full CRUD operations
  - Validation system with DiagramValidator, TableValidator, RelationshipValidator
  - Serialization support (toJSON/fromJSON)

- **Backend Infrastructure**
  - Express server with CORS support
  - Repository pattern (FileRepository, DiagramRepository)
  - Service layer (ValidationService, DiagramService, ExportService)
  - Controller layer (DiagramController, ExportController)
  - RESTful API endpoints for diagram CRUD operations
  - Export system (JSON, SQL, SVG formats)
  - Error handling middleware with detailed logging
  - Request logging middleware

- **Frontend Infrastructure**
  - React + Vite setup with hot module replacement
  - Path aliases configuration
  - API client with caching support
  - State management (DiagramStore, UIStore) using observer pattern
  - Service layer (DiagramService, ExportService)
  - Parser system (JSONParser, SQLParser)

- **UI Components**
  - DiagramCanvas with zoom, pan, and drag support
  - TableNode component with selection and dragging
  - RelationshipLine component for visualizing relationships
  - TableEditor and ColumnEditor for editing diagram elements
  - Toolbar with New, Save, Load, Export, Import actions
  - ImportDialog for importing diagrams (SQL, JSON, file upload)
  - ExportDialog for exporting diagrams (JSON, SQL, SVG)
  - LoadDialog for loading saved diagrams
  - ContextMenu for table operations
  - RelationshipCreator for creating relationships
  - ErrorBoundary and ErrorMessage components
  - Notification component (success, error, info, warning)
  - LoadingIndicator component
  - KeyboardShortcutsHelp dialog

- **Features**
  - Create, edit, delete tables and columns
  - Create relationships between tables (one-to-one, one-to-many, many-to-many)
  - Import diagrams from SQL DDL or JSON
  - Export diagrams to JSON, SQL, or SVG
  - Save and load diagrams from backend
  - Canvas interactions: zoom, pan, drag tables
  - Keyboard shortcuts (Ctrl+N, Ctrl+S, Delete, Escape, etc.)
  - Viewport-based rendering for performance
  - API response caching
  - Error handling with user-friendly messages

- **Performance Optimizations**
  - React.memo for TableNode and RelationshipLine
  - Viewport-based rendering (only render visible elements)
  - Throttled mouse and wheel events (~60fps)
  - Hardware acceleration for canvas
  - API response caching (5min TTL)
  - Debounce and throttle utilities

- **Documentation**
  - Comprehensive README with setup and usage instructions
  - API documentation with all endpoints
  - Design documents (system, frontend, backend)
  - Implementation checklist
  - Test results documentation

- **Testing**
  - Unit tests for domain models
  - Unit tests for backend services and repositories
  - Unit tests for frontend services and stores
  - Unit tests for parsers and validators
  - Integration tests for API endpoints
  - End-to-end flow tests

### Technical Details
- **Language**: TypeScript (strict mode)
- **Frontend**: React 18, Vite
- **Backend**: Node.js, Express
- **Code Style**: ESLint + Prettier
- **Architecture**: Modular, testable, maintainable

### Known Limitations
- PNG export is not yet implemented (placeholder)
- Canvas library requires native dependencies

---

## [Unreleased]

### Planned Features
- Auto-save functionality
- Undo/Redo support
- Table templates
- Diagram themes
- Collaboration features
- Real-time synchronization

