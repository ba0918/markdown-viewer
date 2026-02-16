# Mermaid XSS Test

This document tests XSS attack vectors through Mermaid diagrams. All malicious
content should be neutralized by Mermaid's `securityLevel: 'strict'` setting.

## XSS via Node Labels

```mermaid
graph TD
    A["<img src=x onerror=alert(1)>"] --> B["<script>alert(2)</script>"]
    C["javascript:alert(3)"] --> D["Normal Node"]
```

## XSS via Click Events

```mermaid
graph TD
    A["Click me"] --> B["Safe Node"]
    click A "javascript:alert('XSS')" "Malicious link"
```

## XSS via Subgraph Title

```mermaid
graph TD
    subgraph "<img src=x onerror=alert(4)>"
        E["Node E"] --> F["Node F"]
    end
```
