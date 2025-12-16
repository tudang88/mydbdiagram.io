# MyDBDiagram.io - Backend Design Document

## 1. Overview

This document describes the backend architecture and design of MyDBDiagram.io at a logical level, focusing on class relationships, request flows, and module structure through diagrams.

## 2. Backend Architecture Overview

The backend follows a layered architecture:
- **Routes Layer**: API endpoint definitions
- **Controllers Layer**: Request handling
- **Services Layer**: Business logic
- **Repositories Layer**: Data access
- **Middleware**: Cross-cutting concerns

## 3. Class Diagram - Core Backend Classes

```mermaid
classDiagram
    class DiagramController {
        -DiagramService diagramService
        -ValidationService validationService
        +create(Request, Response) void
        +getById(Request, Response) void
        +list(Request, Response) void
        +update(Request, Response) void
        +delete(Request, Response) void
    }
    
    class DiagramService {
        -DiagramRepository repository
        +create(DiagramData) Promise~Diagram~
        +findById(String) Promise~Diagram~
        +findAll() Promise~Diagram[]~
        +update(String, Partial) Promise~Diagram~
        +delete(String) Promise~boolean~
    }
    
    class DiagramRepository {
        -FileRepository fileRepository
        +findById(String) Promise~Diagram~
        +findAll() Promise~Diagram[]~
        +save(Diagram) Promise~Diagram~
        +update(String, Diagram) Promise~Diagram~
        +delete(String) Promise~boolean~
    }
    
    class FileRepository {
        +readJSON(String) Promise~Object~
        +writeJSON(String, Object) Promise~void~
        +listFiles(String) Promise~String[]~
        +deleteFile(String) Promise~boolean~
    }
    
    class ValidationService {
        +validateDiagram(Object) ValidationResult
        +validateTable(TableData) ValidationResult
    }
    
    DiagramController --> DiagramService : uses
    DiagramController --> ValidationService : uses
    DiagramService --> DiagramRepository : uses
    DiagramRepository --> FileRepository : uses
```

## 4. Class Diagram - Export System

```mermaid
classDiagram
    class ExportController {
        -ExportService exportService
        +export(Request, Response) void
    }
    
    class ExportService {
        -DiagramService diagramService
        -ExporterFactory exporterFactory
        +export(String, String) Promise~ExportResult~
    }
    
    class ExporterFactory {
        -Map~String,Exporter~ exporters
        +getExporter(String) Exporter
        +register(String, Exporter) void
        +getSupportedFormats() String[]
    }
    
    class Exporter {
        <<interface>>
        +export(Diagram, Options) Promise~ExportResult~
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
    
    ExportController --> ExportService : uses
    ExportService --> DiagramService : uses
    ExportService --> ExporterFactory : uses
    ExporterFactory --> Exporter : manages
    Exporter <|.. PNGExporter
    Exporter <|.. SVGExporter
    Exporter <|.. SQLExporter
```

## 5. Sequence Diagram - Creating a Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant Controller
    participant Validator
    participant Service
    participant Repository
    participant FileSystem
    
    Client->>Route: POST /api/diagrams
    Route->>Controller: create(req, res)
    Controller->>Validator: validateDiagram(req.body)
    Validator-->>Controller: ValidationResult
    alt Validation failed
        Controller-->>Client: 400 Bad Request
    else Validation passed
        Controller->>Service: create(diagramData)
        Service->>Service: Generate ID
        Service->>Repository: save(diagram)
        Repository->>FileSystem: Write JSON file
        FileSystem-->>Repository: Success
        Repository-->>Service: Diagram
        Service-->>Controller: Diagram
        Controller-->>Client: 201 Created
    end
```

## 6. Sequence Diagram - Exporting Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant Controller
    participant ExportService
    participant DiagramService
    participant ExporterFactory
    participant Exporter
    participant FileSystem
    
    Client->>Route: POST /api/diagrams/:id/export
    Route->>Controller: export(req, res)
    Controller->>ExportService: export(id, format)
    ExportService->>DiagramService: findById(id)
    DiagramService-->>ExportService: Diagram
    ExportService->>ExporterFactory: getExporter(format)
    ExporterFactory-->>ExportService: Exporter instance
    ExportService->>Exporter: export(diagram)
    Exporter->>Exporter: Render diagram
    Exporter->>FileSystem: Save file
    FileSystem-->>Exporter: File path
    Exporter-->>ExportService: ExportResult
    ExportService-->>Controller: Result
    Controller-->>Client: 200 OK with file path
```

## 7. Sequence Diagram - Loading Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant Controller
    participant Service
    participant Repository
    participant FileSystem
    
    Client->>Route: GET /api/diagrams/:id
    Route->>Controller: getById(req, res)
    Controller->>Service: findById(id)
    Service->>Repository: findById(id)
    Repository->>FileSystem: Read JSON file
    alt File not found
        FileSystem-->>Repository: null
        Repository-->>Service: null
        Service-->>Controller: null
        Controller-->>Client: 404 Not Found
    else File found
        FileSystem-->>Repository: Diagram JSON
        Repository-->>Service: Diagram
        Service-->>Controller: Diagram
        Controller-->>Client: 200 OK with Diagram
    end
```

## 8. Block Diagram - Backend Module Structure

```mermaid
graph TB
    subgraph Routes["Routes Layer"]
        DiagramRoutes[Diagram Routes]
        ExportRoutes[Export Routes]
    end
    
    subgraph Controllers["Controllers Layer"]
        DiagramController[Diagram Controller]
        ExportController[Export Controller]
    end
    
    subgraph Services["Services Layer"]
        DiagramService[Diagram Service]
        ValidationService[Validation Service]
        ExportService[Export Service]
    end
    
    subgraph Repositories["Repositories Layer"]
        DiagramRepo[Diagram Repository]
        FileRepo[File Repository]
    end
    
    subgraph Exporters["Exporters"]
        ExporterFactory[Exporter Factory]
        PNGExporter[PNG Exporter]
        SVGExporter[SVG Exporter]
        SQLExporter[SQL Exporter]
    end
    
    subgraph Middleware["Middleware"]
        ErrorHandler[Error Handler]
        Validator[Request Validator]
        Logger[Logger]
    end
    
    DiagramRoutes --> DiagramController
    ExportRoutes --> ExportController
    DiagramController --> DiagramService
    DiagramController --> ValidationService
    ExportController --> ExportService
    DiagramService --> DiagramRepo
    ExportService --> ExporterFactory
    ExportService --> DiagramService
    DiagramRepo --> FileRepo
    ExporterFactory --> PNGExporter
    ExporterFactory --> SVGExporter
    ExporterFactory --> SQLExporter
```

## 9. Request Flow Through Layers

```mermaid
graph LR
    Request[HTTP Request] --> Route[Route]
    Route --> Middleware[Middleware]
    Middleware --> Controller[Controller]
    Controller --> Service[Service]
    Service --> Repository[Repository]
    Repository --> Storage[Storage]
    Storage --> Repository
    Repository --> Service
    Service --> Controller
    Controller --> Response[HTTP Response]
```

## 10. Error Handling Flow

```mermaid
sequenceDiagram
    participant Request
    participant Controller
    participant Service
    participant Repository
    participant ErrorHandler
    
    Request->>Controller: API Call
    Controller->>Service: Business Logic
    Service->>Repository: Data Access
    Repository-->>Service: Error
    Service-->>Controller: Error
    Controller->>ErrorHandler: Handle Error
    ErrorHandler->>ErrorHandler: Log Error
    ErrorHandler-->>Request: Error Response
```

## 11. Middleware Chain

```mermaid
graph LR
    Request[Incoming Request] --> CORS[CORS Middleware]
    CORS --> Parser[JSON Parser]
    Parser --> Logger[Logger]
    Logger --> Validator[Validator]
    Validator --> Route[Route Handler]
    Route --> ErrorHandler[Error Handler]
    ErrorHandler --> Response[Response]
```

## 12. Repository Pattern

```mermaid
classDiagram
    class Repository {
        <<interface>>
        +findById(String) Promise~T~
        +findAll() Promise~T[]~
        +save(T) Promise~T~
        +update(String, T) Promise~T~
        +delete(String) Promise~boolean~
    }
    
    class DiagramRepository {
        -FileRepository fileRepository
        +findById(String) Promise~Diagram~
        +findAll() Promise~Diagram[]~
        +save(Diagram) Promise~Diagram~
        +update(String, Diagram) Promise~Diagram~
        +delete(String) Promise~boolean~
    }
    
    Repository <|.. DiagramRepository
```

## 13. Factory Pattern - Exporters

```mermaid
classDiagram
    class ExporterFactory {
        -Map exporters
        +getExporter(String) Exporter
        +register(String, Exporter) void
    }
    
    class Exporter {
        <<interface>>
        +export(Diagram) Promise~Result~
    }
    
    class PNGExporter
    class SVGExporter
    class SQLExporter
    
    ExporterFactory --> Exporter : creates
    Exporter <|.. PNGExporter
    Exporter <|.. SVGExporter
    Exporter <|.. SQLExporter
```

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial backend design document |
| 2.0 | 2024 | - | Refactored to focus on logical diagrams |
