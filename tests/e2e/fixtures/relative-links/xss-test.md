# XSS Test

このファイルはXSS対策のテスト用です。

## Malicious Links

- [Malicious Link](javascript:alert('XSS')) - javascript: プロトコル
  (ブロックされるべき)
- [Data URL](data:text/html,<script>alert('XSS')</script>) - data: プロトコル
  (ブロックされるべき)
