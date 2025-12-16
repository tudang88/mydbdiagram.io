# MyDBDiagram.io - Requirements Document

## 1. Project Overview

### 1.1 Purpose
MyDBDiagram.io is a personal tool for creating, editing, and exporting database diagrams. It provides a visual interface for designing database schemas and relationships, similar to dbdiagram.io.

### 1.2 Goals
- Create an intuitive web-based tool for database diagramming
- Support multiple input formats (SQL, JSON, manual input)
- Export diagrams to various formats (PNG, SVG, SQL, etc.)
- Provide a clean, modern user interface
- Enable offline functionality (optional)

## 2. Functional Requirements

### 2.1 Core Features

#### 2.1.1 Diagram Creation
- **FR-001**: User can create a new database diagram from scratch
- **FR-002**: User can add tables to the diagram
- **FR-003**: User can add columns to tables with:
  - Column name
  - Data type
  - Constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, etc.)
  - Default values
  - Comments/descriptions
- **FR-004**: User can edit table properties (name, description)
- **FR-005**: User can delete tables and columns
- **FR-006**: User can rearrange tables on the canvas by dragging

#### 2.1.2 Relationships
- **FR-007**: User can create relationships between tables:
  - One-to-One (1:1)
  - One-to-Many (1:N)
  - Many-to-Many (M:N)
- **FR-008**: User can specify relationship properties:
  - Foreign key column
  - Referenced table and column
  - Relationship name/label
  - Optional vs Required
- **FR-009**: User can edit or delete relationships
- **FR-010**: System automatically displays relationship lines between tables

#### 2.1.3 Import/Input
- **FR-011**: User can import database schema from SQL DDL statements
- **FR-012**: User can import from JSON format
- **FR-013**: User can paste SQL code directly into the tool
- **FR-014**: System validates imported data and shows errors if invalid
- **FR-015**: System supports common SQL dialects (MySQL, PostgreSQL, SQLite, etc.)

#### 2.1.4 Export
- **FR-016**: User can export diagram as PNG image
- **FR-017**: User can export diagram as SVG vector image
- **FR-018**: User can export as SQL DDL statements
- **FR-019**: User can export as JSON schema
- **FR-020**: User can export as PDF document
- **FR-021**: All exports are saved to `output/` directory
- **FR-022**: User can specify custom filename for exports

#### 2.1.5 Canvas & Visualization
- **FR-023**: User can zoom in/out on the canvas
- **FR-024**: User can pan the canvas
- **FR-025**: System displays tables with clear visual boundaries
- **FR-026**: System displays relationships with labeled lines
- **FR-027**: User can customize colors for tables (optional)
- **FR-028**: System supports grid/snap-to-grid for alignment (optional)

### 2.2 User Interface

#### 2.2.1 Layout
- **FR-029**: Toolbar with main actions (New, Open, Save, Export)
- **FR-030**: Sidebar for table properties editing
- **FR-031**: Main canvas area for diagram visualization
- **FR-032**: Status bar showing current zoom level and table count

#### 2.2.2 Interactions
- **FR-033**: User can click on tables to select and edit
- **FR-034**: User can double-click on tables to edit properties
- **FR-035**: User can right-click for context menu
- **FR-036**: User can use keyboard shortcuts for common actions
- **FR-037**: System provides undo/redo functionality

### 2.3 Data Management

#### 2.3.1 Save/Load
- **FR-038**: User can save diagram to backend server (JSON format)
- **FR-039**: User can load previously saved diagrams from backend
- **FR-040**: System auto-saves to backend at regular intervals
- **FR-041**: User can export/import project files
- **FR-042**: User can list all saved diagrams
- **FR-043**: User can delete saved diagrams
- **FR-044**: Backend stores diagrams in `output/` directory or database

#### 2.3.2 Backend API
- **FR-045**: Backend provides API endpoint to save diagram
- **FR-046**: Backend provides API endpoint to load diagram by ID
- **FR-047**: Backend provides API endpoint to list all diagrams
- **FR-048**: Backend provides API endpoint to delete diagram
- **FR-049**: Backend provides API endpoint to export diagram in various formats
- **FR-050**: Backend validates diagram data before saving

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-001**: Diagram should render smoothly with up to 50 tables
- **NFR-002**: Export operations should complete within 5 seconds for typical diagrams
- **NFR-003**: UI should remain responsive during all operations
- **NFR-004**: Initial page load should be under 3 seconds

### 3.2 Usability
- **NFR-005**: Interface should be intuitive for users familiar with database concepts
- **NFR-006**: Tool should provide helpful error messages
- **NFR-007**: Tool should support keyboard navigation
- **NFR-008**: Tool should work on modern browsers (Chrome, Firefox, Safari, Edge)

### 3.3 Compatibility
- **NFR-009**: Support for desktop browsers (minimum screen width: 1024px)
- **NFR-010**: Responsive design for tablet devices (optional)
- **NFR-011**: Support for common SQL dialects

### 3.4 Maintainability
- **NFR-012**: Code should follow TypeScript best practices
- **NFR-013**: Code should be well-documented
- **NFR-014**: Code should be modular and testable

## 4. Technical Requirements

### 4.1 Technology Stack

#### Frontend
- **TR-001**: TypeScript for type safety
- **TR-002**: Modern JavaScript (ES2020+)
- **TR-003**: Canvas API or SVG for rendering (to be decided)
- **TR-004**: Module bundler (Vite, Webpack, or similar)
- **TR-005**: Modern frontend framework (React, Vue, or vanilla TS)

#### Backend
- **TR-006**: Local backend server (Node.js/Express or similar)
- **TR-007**: RESTful API for backend communication
- **TR-008**: File system access for saving/loading diagrams
- **TR-009**: Local database (SQLite or file-based) for persistence (optional)

### 4.2 Dependencies
- **TR-006**: Minimize external dependencies
- **TR-007**: Use well-maintained, lightweight libraries
- **TR-008**: Consider bundle size impact

### 4.3 Code Quality
- **TR-009**: ESLint for code linting
- **TR-010**: Prettier for code formatting
- **TR-011**: TypeScript strict mode enabled
- **TR-012**: Follow project coding standards from `.cursorrules`

## 5. Data Models

### 5.1 Table Schema
```typescript
interface Table {
  id: string;
  name: string;
  description?: string;
  position: { x: number; y: number };
  columns: Column[];
  color?: string;
}

interface Column {
  id: string;
  name: string;
  type: string;
  constraints: Constraint[];
  defaultValue?: string;
  comment?: string;
}

interface Constraint {
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'NOT_NULL' | 'AUTO_INCREMENT';
  value?: string; // For foreign key references
}
```

### 5.2 Relationship Schema
```typescript
interface Relationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  optional: boolean;
  label?: string;
}
```

### 5.3 Diagram Schema
```typescript
interface Diagram {
  version: string;
  tables: Table[];
  relationships: Relationship[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
  };
}
```

## 6. User Stories

### 6.1 As a Developer
- **US-001**: I want to create a database diagram from SQL DDL so I can visualize my schema
- **US-002**: I want to export my diagram as PNG so I can include it in documentation
- **US-003**: I want to edit relationships between tables so I can refine my design
- **US-004**: I want to save my work so I can continue later

### 6.2 As a Database Designer
- **US-005**: I want to create tables manually so I can design from scratch
- **US-006**: I want to see relationships clearly so I can understand table connections
- **US-007**: I want to export as SQL so I can generate DDL statements

## 7. Export Formats

### 7.1 Image Formats
- PNG: High-quality raster image, suitable for documentation
- SVG: Scalable vector format, editable and lightweight
- PDF: Document format, suitable for printing

### 7.2 Code Formats
- SQL: DDL statements for creating the database
- JSON: Structured data format for programmatic access

## 8. Future Enhancements (Out of Scope for MVP)

- Collaboration features (multi-user editing)
- Version control integration
- Database reverse engineering (connect to live database)
- Template library
- Custom themes and styling
- Advanced layout algorithms
- Print preview
- Cloud storage integration

## 9. Architecture

### 9.1 System Architecture
- **ARCH-001**: Frontend (client-side) communicates with local backend via REST API
- **ARCH-002**: Backend runs on localhost (default port: 3000 or configurable)
- **ARCH-003**: Backend handles file operations and data persistence
- **ARCH-004**: Frontend handles UI rendering and user interactions
- **ARCH-005**: Communication between frontend and backend via HTTP/HTTPS

### 9.2 Backend Structure
- **ARCH-006**: Backend should be organized in `src/server/` or `backend/` directory
- **ARCH-007**: Backend should have separate routes for different operations
- **ARCH-008**: Backend should handle CORS for local development
- **ARCH-009**: Backend should provide error handling and logging

## 10. Constraints

- **C-001**: Backend must run locally (localhost)
- **C-002**: Tool must be open-source and personal use
- **C-003**: Tool should not require user registration
- **C-004**: Backend should not require external database (use file system or SQLite)
- **C-005**: Backend should be lightweight and easy to set up

## 11. Backend API Specification

### 11.1 Endpoints

#### Save Diagram
- **POST** `/api/diagrams`
- Request Body: `Diagram` object
- Response: `{ id: string, message: string }`

#### Load Diagram
- **GET** `/api/diagrams/:id`
- Response: `Diagram` object

#### List Diagrams
- **GET** `/api/diagrams`
- Response: `{ diagrams: Array<{ id: string, name: string, updatedAt: string }> }`

#### Delete Diagram
- **DELETE** `/api/diagrams/:id`
- Response: `{ message: string }`

#### Export Diagram
- **POST** `/api/diagrams/:id/export`
- Request Body: `{ format: 'png' | 'svg' | 'sql' | 'json' | 'pdf' }`
- Response: File download or file path

### 11.2 Error Handling
- All endpoints should return appropriate HTTP status codes
- Error responses should follow format: `{ error: string, message: string }`

## 12. Success Criteria

- User can create a complete database diagram with 10+ tables
- User can export diagram in at least 3 formats
- User can import SQL DDL and visualize it correctly
- Tool loads and runs smoothly in modern browsers
- Code follows all project standards and is maintainable

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial requirements document |
| 1.1 | 2024 | - | Added local backend requirements |

