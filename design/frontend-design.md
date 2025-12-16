# MyDBDiagram.io - Frontend Design Document

## 1. Overview

This document describes the frontend architecture and design of MyDBDiagram.io at a logical level, focusing on class relationships, component interactions, and module structure through diagrams.

## 2. Frontend Architecture Overview

The frontend is organized into layers:
- **UI Layer**: React/Vue components for user interaction
- **State Layer**: Application state management
- **Service Layer**: API communication
- **Core Layer**: Business logic and domain models

## 3. Class Diagram - Core Domain Models

```mermaid
classDiagram
    class Diagram {
        -String id
        -Map~String,Table~ tables
        -Map~String,Relationship~ relationships
        -Metadata metadata
        +addTable(Table)
        +removeTable(String)
        +getTable(String) Table
        +addRelationship(Relationship)
        +removeRelationship(String)
        +validate() ValidationResult
        +toJSON() DiagramData
        +fromJSON(DiagramData) Diagram
    }
    
    class Table {
        -String id
        -String name
        -Position position
        -List~Column~ columns
        -Metadata metadata
        +addColumn(Column)
        +removeColumn(String)
        +updateColumn(String, Partial~Column~)
        +moveTo(Position)
        +validate() ValidationResult
        +toJSON() TableData
    }
    
    class Relationship {
        -String id
        -String fromTableId
        -String fromColumnId
        -String toTableId
        -String toColumnId
        -RelationshipType type
        +validate(Diagram) ValidationResult
        +toJSON() RelationshipData
    }
    
    class Column {
        -String id
        -String name
        -String type
        -List~Constraint~ constraints
        -String defaultValue
    }
    
    class Position {
        -Number x
        -Number y
    }
    
    Diagram "1" *-- "0..*" Table
    Diagram "1" *-- "0..*" Relationship
    Table "1" *-- "0..*" Column
    Relationship --> Table : references
    Table --> Position : has
```

## 4. Class Diagram - Services and State

```mermaid
classDiagram
    class DiagramService {
        -ApiClient apiClient
        -DiagramValidator validator
        +saveDiagram(Diagram) Promise~SaveResult~
        +loadDiagram(String) Promise~LoadResult~
        +listDiagrams() Promise~ListResult~
        +deleteDiagram(String) Promise~DeleteResult~
    }
    
    class ApiClient {
        -String baseUrl
        +get(String) Promise~ApiResponse~
        +post(String, Object) Promise~ApiResponse~
        +delete(String) Promise~ApiResponse~
    }
    
    class DiagramStore {
        -Diagram currentDiagram
        -List~Observer~ observers
        +setDiagram(Diagram)
        +getDiagram() Diagram
        +subscribe(Observer) Unsubscribe
    }
    
    class UIStore {
        -UIState state
        -List~Observer~ observers
        +getState() UIState
        +setState(Partial~UIState~)
        +subscribe(Observer) Unsubscribe
    }
    
    DiagramService --> ApiClient : uses
    DiagramService --> DiagramValidator : uses
    DiagramStore --> Diagram : manages
```

## 5. Class Diagram - Parsers and Exporters

```mermaid
classDiagram
    class Parser {
        <<interface>>
        +parse(TInput) ParseResult
        +validate(TInput) ValidationResult
        +canParse(Unknown) boolean
    }
    
    class SQLParser {
        +parse(String) ParseResult~Diagram~
        +validate(String) ValidationResult
        +canParse(Unknown) boolean
    }
    
    class JSONParser {
        +parse(String) ParseResult~Diagram~
        +validate(String) ValidationResult
        +canParse(Unknown) boolean
    }
    
    class Exporter {
        <<interface>>
        +export(TInput, Options) Promise~ExportResult~
        +validate(TInput) ValidationResult
        +getSupportedFormats() String[]
    }
    
    class PNGExporter {
        +export(Diagram, Options) Promise~ExportResult~
    }
    
    class SVGExporter {
        +export(Diagram, Options) Promise~ExportResult~
    }
    
    class SQLExporter {
        +export(Diagram, Options) Promise~ExportResult~
    }
    
    Parser <|.. SQLParser
    Parser <|.. JSONParser
    Exporter <|.. PNGExporter
    Exporter <|.. SVGExporter
    Exporter <|.. SQLExporter
```

## 6. Sequence Diagram - Creating a Table

```mermaid
sequenceDiagram
    participant User
    participant TableEditor
    participant DiagramStore
    participant DiagramService
    participant Diagram
    participant TableValidator
    
    User->>TableEditor: Enter table name
    User->>TableEditor: Click Add
    TableEditor->>DiagramStore: Get current diagram
    DiagramStore-->>TableEditor: Diagram
    TableEditor->>Diagram: Create new Table
    TableEditor->>TableValidator: Validate table
    TableValidator-->>TableEditor: Valid
    TableEditor->>Diagram: addTable(Table)
    Diagram-->>TableEditor: Success
    TableEditor->>DiagramStore: Update diagram
    DiagramStore->>TableEditor: Notify observers
    TableEditor->>User: Show table on canvas
```

## 7. Sequence Diagram - Loading Diagram from Server

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant DiagramService
    participant ApiClient
    participant Backend
    participant DiagramStore
    
    User->>UI: Click Load Diagram
    UI->>DiagramService: loadDiagram(id)
    DiagramService->>ApiClient: GET /api/diagrams/:id
    ApiClient->>Backend: HTTP Request
    Backend-->>ApiClient: Diagram JSON
    ApiClient-->>DiagramService: Diagram Data
    DiagramService->>DiagramService: Diagram.fromJSON(data)
    DiagramService-->>UI: Diagram object
    UI->>DiagramStore: setDiagram(diagram)
    DiagramStore->>UI: Notify update
    UI->>User: Render diagram
```

## 8. Block Diagram - Frontend Module Structure

```mermaid
graph TB
    subgraph Core["Core Layer"]
        Diagram[Diagram Module]
        Table[Table Module]
        Relationship[Relationship Module]
        Parser[Parser Module]
        Exporter[Exporter Module]
    end
    
    subgraph Services["Service Layer"]
        DiagramService[Diagram Service]
        ExportService[Export Service]
        ApiClient[API Client]
    end
    
    subgraph State["State Layer"]
        DiagramStore[Diagram Store]
        UIStore[UI Store]
    end
    
    subgraph Components["Component Layer"]
        Canvas[Canvas Components]
        Editor[Editor Components]
        Toolbar[Toolbar Components]
    end
    
    Components --> State
    Components --> Services
    State --> Services
    Services --> Core
    Services --> ApiClient
```

## 9. Component Interaction - Canvas Rendering

```mermaid
sequenceDiagram
    participant DiagramCanvas
    participant TableNode
    participant RelationshipLine
    participant DiagramStore
    
    DiagramCanvas->>DiagramStore: Subscribe to diagram
    DiagramStore-->>DiagramCanvas: Diagram data
    DiagramCanvas->>DiagramCanvas: Calculate layout
    loop For each table
        DiagramCanvas->>TableNode: Render table
        TableNode-->>DiagramCanvas: Table rendered
    end
    loop For each relationship
        DiagramCanvas->>RelationshipLine: Render line
        RelationshipLine-->>DiagramCanvas: Line rendered
    end
    DiagramCanvas->>DiagramCanvas: Update canvas
```

## 10. State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Empty
    Empty --> Loading: Load request
    Loading --> Loaded: Success
    Loading --> Error: Failure
    Loaded --> Editing: User edits
    Editing --> Saving: Save request
    Saving --> Loaded: Success
    Saving --> Error: Failure
    Error --> Loading: Retry
    Loaded --> [*]: Unload
```

## 11. Module Dependencies

```mermaid
graph LR
    UI[UI Components] --> State[State Management]
    State --> Services[Services]
    Services --> Core[Core Modules]
    Core --> Utils[Utilities]
    
    UI -.->|uses| Core
    Services -.->|uses| Core
```

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial frontend design document |
| 2.0 | 2024 | - | Refactored to focus on logical diagrams |
