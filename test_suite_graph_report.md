# Graph Report Test Suite

This document contains the automated test suite generated for the graph report application based on the specification in `graph_report.md`.

## Test Cases

```json
{
  "testSuite": "graph_report_app",
  "tests": [
    {
      "id": "TC001",
      "feature": "Graph Creation - Empty Name",
      "type": "Negative",
      "priority": "High",
      "preconditions": "User navigates to Graph Creation page",
      "inputData": "'   ' (only spaces)",
      "steps": [
        "Enter graph name in input field",
        "Click Create Graph button"
      ],
      "expectedResult": "Display validation error 'Name required' and prevent graph creation"
    },
    {
      "id": "TC002",
      "feature": "Graph Creation - Overlong Name",
      "type": "Negative",
      "priority": "High",
      "preconditions": "User on Graph Creation page",
      "inputData": "A string of 101 'A' characters",
      "steps": [
        "Paste 101-character string into name field",
        "Attempt to create graph"
      ],
      "expectedResult": "Show error 'Maximum 100 characters allowed' and reject submission"
    },
    {
      "id": "TC003",
      "feature": "Data Processing - Large Dataset",
      "type": "Performance",
      "priority": "Medium",
      "preconditions": "User has loaded a dataset with 15000 nodes and edges",
      "inputData": "JSON payload with 15000 nodes",
      "steps": [
        "Upload dataset",
        "Initiate graph rendering"
      ],
      "expectedResult": "Render completes within 8 seconds; no timeout error"
    },
    {
      "id": "TC004",
      "feature": "API Input - Invalid JSON",
      "type": "Negative",
      "priority": "High",
      "preconditions": "Authenticated user sends request to /api/graph",
      "inputData": "{ 'malformed': [ JSON }",
      "steps": [
        "Send POST request with invalid JSON",
        "Observe server response"
      ],
      "expectedResult": "Server responds with HTTP 500 and error message 'Invalid input format'"
    },
    {
      "id": "TC005",
      "feature": "UI Rendering - Zero Elements",
      "type": "Negative",
      "priority": "Medium",
      "preconditions": "Graph contains no nodes or edges",
      "inputData": "Empty graph object",
      "steps": [
        "Load graph with zero nodes/edges",
        "View graph visualization"
      ],
      "expectedResult": "Display 'No data available' message without crash"
    },
    {
      "id": "TC006",
      "feature": "UI Rendering - Special Characters",
      "type": "Security",
      "priority": "High",
      "preconditions": "User creates graph with label '<script>alert(1)</script>'",
      "inputData": "Node label containing HTML script tag",
      "steps": [
        "Enter label with script tag",
        "Render graph"
      ],
      "expectedResult": "Label displayed as escaped text; no script execution"
    },
    {
      "id": "TC007",
      "feature": "API Authentication - Missing Token",
      "type": "Negative",
      "priority": "High",
      "preconditions": "User attempts API call without valid JWT",
      "inputData": "POST /api/graph without Authorization header",
      "steps": [
        "Make request to protected endpoint"
      ],
      "expectedResult": "Server returns HTTP 401 Unauthorized"
    },
    {
      "id": "TC008",
      "feature": "Export - High resolution PNG",
      "type": "Performance",
      "priority": "Medium",
      "preconditions": "User selects Export > PNG at 5000x5000 resolution",
      "inputData": "Graph with 8000 nodes",
      "steps": [
        "Click Export PNG",
        "Save file"
      ],
      "expectedResult": "Export completes without memory crash; file size within limits"
    }
  ],
  "failureScenarios": [
    {
      "id": "F001",
      "condition": "Input name empty or whitespace only",
      "symptom": "Missing client-side validation leads to server error",
      "impact": "Graph creation fails unexpectedly"
    },
    {
      "id": "F002",
      "condition": "Graph name exceeds 100 characters",
      "symptom": "Database truncation or rejection without proper message",
      "impact": "User confusion, potential data loss"
    },
    {
      "id": "F003",
      "condition": "Node count > 50000",
      "symptom": "Browser tab crash or 500 error",
      "impact": "Service unavailable for large datasets"
    },
    {
      "id": "F004",
      "condition": "Circular references in graph data",
      "symptom": "Infinite layout loop causing timeout",
      "impact": "UI hangs, user must refresh"
    },
    {
      "id": "F005",
      "condition": "Large PNG export (5000x5000)",
      "symptom": "Memory exhaustion leading to crash",
      "impact": "Export fails, user loses unsaved work"
    }
  ],
  "expectedBugs": [
    {
      "id": "BUG-001",
      "description": "Validation error messages are inconsistent across API and UI",
      "reproduction": "Create graph with name exceeding 100 chars; UI shows generic error while API returns specific message"
    },
    {
      "id": "BUG-002",
      "description": "Performance degradation not detected under load testing",
      "reproduction": "Upload 15000-node dataset; rendering takes >15 seconds"
    },
    {
      "id": "BUG-003",
      "description": "XSS via special characters not fully sanitized in exported formats",
      "reproduction": "Add label '<img src=x onerror=alert(1)>'; export to SVG"
    },
    {
      "id": "BUG-004",
      "description": "Missing auth token handling leads to 401 responses without proper client feedback",
      "reproduction": "Make API request without JWT; verify response code and body"
    },
    {
      "id": "BUG-005",
      "description": "Large CSV uploads may cause timeout without progress indication",
      "reproduction": "Upload 50MB CSV with 1M rows; observe hangs or timeout"
    }
  ]
}
```