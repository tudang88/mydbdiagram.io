# MyDBDiagram.io - System Design Document

## 1. Overview

This document describes the overall system architecture of MyDBDiagram.io at a logical level, focusing on component interactions and system structure through diagrams.

## 2. Architecture Principles

- **Modularity**: Each module has a single responsibility, loosely coupled
- **Separation of Concerns**: Clear separation between Presentation, Business Logic, Data Access, and API layers
- **Dependency Injection**: Dependencies injected for testability
- **Testability**: Pure functions where possible, clear interfaces

## 3. Block Diagram - System Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend Application"]
        UI[UI Components]
        State[State Management]
        Services[API Services]
        Core[Core Domain Logic]
    end
    
    subgraph Backend["Backend Server"]
        Routes[API Routes]
        Controllers[Controllers]
        Services2[Business Services]
        Repos[Repositories]
        Exporters[Exporters]
    end
    
    subgraph Storage["Storage"]
        Files[File System]
        Output[Output Directory]
    end
    
    UI --> State
    State --> Services
    Services --> Core
    Services <-->|HTTP/REST| Routes
    Routes --> Controllers
    Controllers --> Services2
    Services2 --> Repos
    Services2 --> Exporters
    Repos --> Files
    Exporters --> Output
```

## 4. Block Diagram - Component Layers

```mermaid
graph LR
    subgraph Presentation["Presentation Layer"]
        A[UI Components]
    end
    
    subgraph Business["Business Logic Layer"]
        B[Core Domain Models]
        C[Validators]
    end
    
    subgraph Data["Data Access Layer"]
        D[Repositories]
    end
    
    subgraph API["API Layer"]
        E[Services]
        F[Controllers]
    end
    
    A --> B
    A --> E
    B --> C
    E --> F
    F --> B
    F --> D
```

## 5. Data Flow - Creating Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant State
    participant Service
    participant Core
    participant Validator
    
    User->>UI: Add Table
    UI->>State: Update State
    State->>Service: Save Request
    Service->>Core: Create Table
    Core->>Validator: Validate
    Validator-->>Core: Validation Result
    Core-->>Service: Table Created
    Service-->>State: Update
    State-->>UI: Re-render
```

## 6. Data Flow - Saving Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Service
    participant API
    participant Backend
    participant Controller
    participant Service2
    participant Repo
    participant Storage
    
    User->>UI: Save Diagram
    UI->>Service: Save Request
    Service->>API: POST /api/diagrams
    API->>Backend: HTTP Request
    Backend->>Controller: Handle Request
    Controller->>Service2: Create Diagram
    Service2->>Repo: Save
    Repo->>Storage: Write File
    Storage-->>Repo: Success
    Repo-->>Service2: Diagram Saved
    Service2-->>Controller: Response
    Controller-->>Backend: HTTP Response
    Backend-->>API: Response
    API-->>Service: Success
    Service-->>UI: Update UI
```

## 7. Data Flow - Exporting Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Service
    participant API
    participant Backend
    participant Controller
    participant ExportService
    participant Exporter
    participant Output
    
    User->>UI: Export PNG
    UI->>Service: Export Request
    Service->>API: POST /api/diagrams/:id/export
    API->>Backend: HTTP Request
    Backend->>Controller: Handle Export
    Controller->>ExportService: Export Diagram
    ExportService->>Exporter: Get Exporter(PNG)
    Exporter->>Exporter: Render Diagram
    Exporter->>Output: Save File
    Output-->>Exporter: File Path
    Exporter-->>ExportService: Result
    ExportService-->>Controller: Response
    Controller-->>Backend: HTTP Response
    Backend-->>API: File Path
    API-->>Service: Success
    Service-->>UI: Show Success
```

## 8. Module Dependencies

```mermaid
graph TD
    UI[UI Layer] --> State[State Management]
    State --> Services[Services Layer]
    Services --> Core[Core Modules]
    Core --> Utils[Utilities]
    
    Routes[Routes] --> Controllers[Controllers]
    Controllers --> Services2[Services]
    Services2 --> Repos[Repositories]
    Repos --> Storage[Storage]
```

## 9. System Boundaries

```mermaid
graph TB
    subgraph Client["Client Side"]
        Browser[Web Browser]
        FrontendApp[Frontend Application]
    end
    
    subgraph Server["Server Side"]
        BackendApp[Backend Application]
        FileSystem[File System]
    end
    
    Browser --> FrontendApp
    FrontendApp <-->|HTTP/REST API| BackendApp
    BackendApp --> FileSystem
```

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial system design document |
| 2.0 | 2024 | - | Refactored to focus on logical diagrams |
