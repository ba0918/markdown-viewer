# XSS Attack Vectors Test

このドキュメントは、XSS攻撃パターンをテストするためのフィクスチャです。
全てのパターンが適切にサニタイズされ、攻撃が無効化されることを確認します。

## 1. JavaScript Protocol

[Click me](javascript:alert('XSS'))

[Click me too](JAVASCRIPT:alert('XSS'))

## 2. SVG Injection

<svg onload="alert('XSS')"><circle r="50"/></svg>

<svg><script>alert('XSS')</script></svg>

## 3. Event Handler Injection

<img src="x" onerror="alert('XSS')">

<div onclick="alert('XSS')">Click me</div>

<body onload="alert('XSS')">

## 4. Data URL Attack

<img src="data:text/html,<script>alert('XSS')</script>">

<iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>

## 5. Style-based XSS

<style>@import url('data:,*{x:expression(alert(1))}')</style>

<div style="background:url('javascript:alert(1)')">Test</div>

## 6. CSS Animation Attack

<style>
@keyframes exploit {
  from { background: url('data:image/svg+xml,<svg onload=alert(1)>') }
}
</style>

## 7. HTML Comment Injection

<!-- <script>alert('XSS')</script> -->

## 8. Object/Embed Tags

<object data="javascript:alert('XSS')"></object>

<embed src="javascript:alert('XSS')">

## 9. Meta Refresh Attack

<meta http-equiv="refresh" content="0;url=javascript:alert('XSS')">

## 10. Link Tag Attack

<link rel="stylesheet" href="javascript:alert('XSS')">

## 11. Form Action Attack

<form action="javascript:alert('XSS')"><input type="submit"></form>

## 12. Base Tag Attack

<base href="javascript:alert('XSS')//">

## 13. Encoded JavaScript Protocol

<a href="java&#115;cript:alert('XSS')" id="xss-entity-dec">Entity (decimal)</a>

<a href="java&#x73;cript:alert('XSS')" id="xss-entity-hex">Entity (hex)</a>

<a href="java&#115cript:alert('XSS')" id="xss-entity-nosemi">Entity (no
semicolon)</a>

<a href="&#106;avascript:alert('XSS')" id="xss-entity-first">Entity (first
char)</a>

## 14. Named Entity Protocol Obfuscation

<a href="java&Tab;script:alert('XSS')" id="xss-named-tab">Named entity (Tab)</a>

<a href="java&NewLine;script:alert('XSS')" id="xss-named-newline">Named entity
(NewLine)</a>

<a href="javascript&colon;alert('XSS')" id="xss-named-colon">Named entity
(colon)</a>

<a href="&amp;#106;avascript:alert('XSS')" id="xss-double-encoded">Double
encoded</a>

## 15. Encoded Protocol in img src

<img src="java&#115;cript:alert('XSS')" alt="entity img">

<img src="da&#116;a:text/html,<script>alert('XSS')</script>" alt="entity data img">
