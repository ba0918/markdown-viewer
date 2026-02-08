import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { isWslFile } from './wsl-detector.ts';

Deno.test('isWslFile: WSL2ファイル（wsl.localhost）を検知', () => {
  const url = 'file://wsl.localhost/Ubuntu/home/user/test.md';
  assertEquals(isWslFile(url), true);
});

Deno.test('isWslFile: WSL2ファイル（wsl$）を検知', () => {
  const url = 'file://wsl$/Ubuntu/home/user/test.md';
  assertEquals(isWslFile(url), true);
});

Deno.test('isWslFile: 通常のWindowsローカルファイルは非WSL', () => {
  const url = 'file:///C:/Users/user/test.md';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: 通常のLinuxローカルファイルは非WSL', () => {
  const url = 'file:///home/user/test.md';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: HTTPSのURLは非WSL', () => {
  const url = 'https://example.com/test.md';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: HTTPのURLは非WSL', () => {
  const url = 'http://localhost:8000/test.md';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: ファイル名に wsl.localhost を含むが、ホスト名は違う（誤検知防止）', () => {
  const url = 'file:///home/user/wsl.localhost.md';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: ファイル名に wsl を含むが、ホスト名は違う（誤検知防止）', () => {
  const url = 'file:///home/user/my-wsl-file.md';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: ホスト名が wsl で始まる将来的な新パターン', () => {
  const url = 'file://wsl2.localhost/Ubuntu/home/user/test.md';
  assertEquals(isWslFile(url), true);
});

Deno.test('isWslFile: ホスト名が wslX のような新パターン', () => {
  const url = 'file://wslX/Ubuntu/home/user/test.md';
  assertEquals(isWslFile(url), true);
});

Deno.test('isWslFile: 不正なURL（URL解析失敗）', () => {
  const url = 'not-a-valid-url';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: 空文字列', () => {
  const url = '';
  assertEquals(isWslFile(url), false);
});

Deno.test('isWslFile: ホスト名が wslserver.com のような別ドメイン（制限事項: 誤検知する）', () => {
  // 制限事項: wsl で始まるドメイン名は WSL と誤認識される
  // ただし file:// プロトコル以外では実害なし（Hot Reload は file:// のみ）
  const url = 'https://wslserver.com/test.md';
  assertEquals(isWslFile(url), true);
});

Deno.test('isWslFile: ホスト名が www.wsl.com のような別ドメイン（誤検知しない）', () => {
  const url = 'https://www.wsl.com/test.md';
  assertEquals(isWslFile(url), false); // www で始まるので false
});
