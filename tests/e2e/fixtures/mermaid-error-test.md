# Mermaid Error Handling Test

This file contains valid and invalid Mermaid diagrams for testing error
recovery.

## Valid Flowchart

```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```

## Invalid Syntax (should show error fallback)

```mermaid
this is not valid mermaid syntax !!!
invalid --> --> --> broken
```

## Valid Sequence Diagram

```mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi!
```
