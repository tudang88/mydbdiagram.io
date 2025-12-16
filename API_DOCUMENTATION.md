# API Documentation

## Base URL

```
http://localhost:3000
```

## Endpoints

### Health Check

#### GET /health

Check server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-16T10:00:00.000Z"
}
```

---

### Diagrams

#### GET /api/diagrams

List all saved diagrams.

**Response:**
```json
{
  "diagrams": [
    {
      "id": "diagram-1",
      "tables": [...],
      "relationships": [...],
      "metadata": {
        "createdAt": "2024-12-16T10:00:00.000Z",
        "updatedAt": "2024-12-16T10:00:00.000Z"
      }
    }
  ]
}
```

#### GET /api/diagrams/:id

Get a specific diagram by ID.

**Parameters:**
- `id` (path): Diagram ID

**Response:**
```json
{
  "id": "diagram-1",
  "tables": [...],
  "relationships": [...],
  "metadata": {
    "createdAt": "2024-12-16T10:00:00.000Z",
    "updatedAt": "2024-12-16T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `404`: Diagram not found

#### POST /api/diagrams

Create a new diagram.

**Request Body:**
```json
{
  "tables": [
    {
      "id": "table-1",
      "name": "Users",
      "position": { "x": 100, "y": 100 },
      "columns": [
        {
          "id": "col-1",
          "name": "id",
          "type": "INTEGER",
          "constraints": [{ "type": "PRIMARY_KEY" }]
        }
      ]
    }
  ],
  "relationships": [],
  "metadata": {
    "createdAt": "2024-12-16T10:00:00.000Z",
    "updatedAt": "2024-12-16T10:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "id": "diagram-1",
  "tables": [...],
  "relationships": [...],
  "metadata": {...}
}
```

**Error Responses:**
- `400`: Validation error
- `500`: Internal server error

#### PUT /api/diagrams/:id

Update an existing diagram.

**Parameters:**
- `id` (path): Diagram ID

**Request Body:** Same as POST /api/diagrams

**Response:**
```json
{
  "id": "diagram-1",
  "tables": [...],
  "relationships": [...],
  "metadata": {...}
}
```

**Error Responses:**
- `400`: Validation error
- `404`: Diagram not found
- `500`: Internal server error

#### DELETE /api/diagrams/:id

Delete a diagram.

**Parameters:**
- `id` (path): Diagram ID

**Response:**
- `204`: No content (success)

**Error Responses:**
- `404`: Diagram not found
- `500`: Internal server error

---

### Export

#### POST /api/diagrams/:id/export

Export a diagram in the specified format.

**Parameters:**
- `id` (path): Diagram ID
- `format` (query): Export format (`json`, `sql`, `svg`)

**Request Body:**
```json
{
  "filename": "my-diagram.json"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "format": "json",
  "filePath": "./output/my-diagram.json",
  "downloadUrl": "/api/files/my-diagram.json",
  "data": "..."
}
```

**Error Responses:**
- `400`: Invalid format or missing format parameter
- `404`: Diagram not found
- `500`: Export failed

#### GET /api/diagrams/formats

Get supported export formats.

**Response:**
```json
{
  "formats": ["json", "sql", "svg"]
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {  // Only in development mode
    "timestamp": "2024-12-16T10:00:00.000Z",
    "method": "POST",
    "path": "/api/diagrams",
    "error": "Error message",
    "stack": "Error stack trace"
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Request validation failed (400)
- `NOT_FOUND`: Resource not found (404)
- `UNAUTHORIZED`: Authentication required (401)
- `INTERNAL_ERROR`: Server error (500)
- `EXPORT_ERROR`: Export operation failed (500)

---

## Data Models

### Diagram

```typescript
interface Diagram {
  id: string;
  tables: Table[];
  relationships: Relationship[];
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}
```

### Table

```typescript
interface Table {
  id: string;
  name: string;
  position: { x: number; y: number };
  columns: Column[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
  };
}
```

### Column

```typescript
interface Column {
  id: string;
  name: string;
  type: string;
  constraints: Constraint[];
}
```

### Relationship

```typescript
interface Relationship {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  optional: boolean;
}
```

### Constraint

```typescript
interface Constraint {
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'NOT_NULL' | 'DEFAULT';
  value?: string;  // For DEFAULT constraint
}
```

---

## Examples

### Create a Diagram

```bash
curl -X POST http://localhost:3000/api/diagrams \
  -H "Content-Type: application/json" \
  -d '{
    "tables": [
      {
        "id": "table-1",
        "name": "Users",
        "position": { "x": 100, "y": 100 },
        "columns": [
          {
            "id": "col-1",
            "name": "id",
            "type": "INTEGER",
            "constraints": [{ "type": "PRIMARY_KEY" }]
          }
        ]
      }
    ],
    "relationships": [],
    "metadata": {
      "createdAt": "2024-12-16T10:00:00.000Z",
      "updatedAt": "2024-12-16T10:00:00.000Z"
    }
  }'
```

### Export Diagram to SQL

```bash
curl -X POST "http://localhost:3000/api/diagrams/diagram-1/export?format=sql" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "my-schema.sql"
  }'
```

---

## Notes

- All timestamps are in ISO 8601 format
- All IDs are strings
- Position coordinates are in pixels
- Export formats: `json`, `sql`, `svg`
- The API uses JSON for all requests and responses

