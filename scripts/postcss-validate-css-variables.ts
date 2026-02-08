/**
 * PostCSS Plugin: CSS変数の未定義エラーを検出
 * フォールバック値のないvar()が未定義変数を参照している場合、ビルドエラーを発生させる
 *
 * Fail-fast原則: 未定義CSS変数は即座にビルドエラーとして報告
 */

import type { Plugin, Root } from "postcss";

interface CssVarLocation {
  file: string;
  line: number;
  column: number;
}

export default function validateCssVariables(): Plugin {
  return {
    postcssPlugin: "validate-css-variables",
    Once(root: Root) {
      const defined = new Set<string>();
      const used = new Map<string, CssVarLocation>();

      // 1. 定義された変数を収集
      root.walkDecls((decl) => {
        if (decl.prop.startsWith("--")) {
          defined.add(decl.prop);
        }
      });

      // 2. 使用されている変数を収集（フォールバックなしのみ）
      root.walkDecls((decl) => {
        // var(--name) または var(--name, fallback) をマッチ
        const varRegex = /var\((--[a-zA-Z0-9-_]+)(?:\s*,\s*(.+?))?\)/g;
        let match: RegExpExecArray | null;

        while ((match = varRegex.exec(decl.value)) !== null) {
          const varName = match[1];
          const hasFallback = match[2] !== undefined;

          // フォールバックがない場合のみチェック対象
          if (!hasFallback) {
            used.set(varName, {
              file: decl.source?.input.file || "unknown",
              line: decl.source?.start?.line || 0,
              column: decl.source?.start?.column || 0,
            });
          }
        }
      });

      // 3. 未定義変数をチェック
      const undefinedVars: string[] = [];
      for (const [varName, location] of used.entries()) {
        if (!defined.has(varName)) {
          undefinedVars.push(
            `${location.file}:${location.line}:${location.column} - Undefined CSS variable: ${varName}`,
          );
        }
      }

      // 4. エラー発生（Fail-fast）
      if (undefinedVars.length > 0) {
        throw new Error(
          `CSS変数の未定義エラーが検出されました:\n${undefinedVars.join("\n")}`,
        );
      }
    },
  };
}

validateCssVariables.postcss = true;
