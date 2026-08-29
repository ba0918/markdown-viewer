import xss from "xss";
import { escapeHtml } from "../../shared/utils/escape-html.ts";
import {
  hasAllowedUrlScheme,
  normalizeUrlAttributeValue,
} from "../../shared/utils/url-scheme.ts";

/**
 * `<a href>` で許可するURLスキーム
 *
 * `file:` は含めない。ナビゲーションを伴うリンクでローカルファイルへ
 * 誘導されるのを避けるため（Markdown内の相対リンクはcontent層で解決する）。
 */
const LINK_ALLOWED_SCHEMES = [
  "http:",
  "https:",
  "mailto:",
  "tel:",
  "ftp:",
] as const;

/**
 * `<img src>` で許可するURLスキーム
 *
 * ローカルMarkdownファイル内の画像参照（file:///path/to/image.png）を
 * 表示するため `file:` を許可する。ナビゲーションを伴わないため
 * リンク（`<a>`）よりリスクは限定的。
 */
const IMAGE_ALLOWED_SCHEMES = ["http:", "https:", "file:"] as const;

/** 許可するクラス名か判定（hljs系 / language-系のみ） */
const isAllowedClassName = (className: string): boolean =>
  className === "hljs" ||
  className.startsWith("hljs-") ||
  className.startsWith("language-");

/**
 * URL属性（href/src）を安全な形で出力する
 *
 * 出力値は「ブラウザ解釈後の正規形」を再エスケープしたもの。
 * `&` もエスケープするため、ブラウザ側で実体参照が再デコードされて
 * 検証をすり抜けることはない（多重デコード対策）。
 *
 * @param name - 属性名（href / src）
 * @param value - 生の属性値
 * @param allowedSchemes - 許可するURLスキーム
 * @returns 属性文字列。許可されない場合は空文字（＝属性を削除）
 */
const buildUrlAttribute = (
  name: string,
  value: string,
  allowedSchemes: readonly string[],
): string => {
  if (!hasAllowedUrlScheme(value, allowedSchemes)) {
    return "";
  }
  return `${name}="${escapeHtml(normalizeUrlAttributeValue(value))}"`;
};

/**
 * xss (js-xss) オプション設定
 * 許可するHTMLタグと属性のホワイトリスト
 */
const xssOptions = {
  whiteList: {
    "p": ["class", "id"],
    "br": [],
    "strong": ["class", "id"],
    "em": ["class", "id"],
    "u": ["class", "id"],
    "s": ["class", "id"],
    "del": ["class", "id"], // GFM: 打ち消し線
    "code": ["class", "id", "language-*"], // シンタックスハイライト用
    "pre": ["class", "id"],
    "a": ["href", "title", "class", "id"],
    "img": ["src", "alt", "title", "class", "id"],
    "h1": ["class", "id"],
    "h2": ["class", "id"],
    "h3": ["class", "id"],
    "h4": ["class", "id"],
    "h5": ["class", "id"],
    "h6": ["class", "id"],
    "ul": ["class", "id"],
    "ol": ["class", "id"],
    "li": ["class", "id"],
    "input": ["type", "disabled", "checked", "class", "id"], // GFM: タスクリスト
    "blockquote": ["class", "id"],
    "table": ["class", "id"],
    "thead": ["class", "id"],
    "tbody": ["class", "id"],
    "tr": ["class", "id"],
    "th": ["class", "id"],
    "td": ["class", "id"],
    "hr": ["class", "id"],
    "div": ["class", "id"],
    "span": ["class", "id"], // highlight.js 用
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
  onTagAttr: (tag: string, name: string, value: string) => {
    // hljs-*とlanguage-*クラスのみ許可（クラス名単位で厳格チェック）
    // 部分一致ではなく、個別クラス名が完全にhljsパターンに合致する場合のみ許可
    if (name === "class") {
      const classes = value.split(/\s+/).filter(Boolean);
      if (classes.length > 0 && classes.every(isAllowedClassName)) {
        return `class="${escapeHtml(value)}"`;
      }
      // 不許可クラスを含む場合、class属性を除去（空文字でxssライブラリのデフォルト許可を上書き）
      return "";
    }
    // 相対パスのhrefを許可（xssはデフォルトで削除するため）
    if (tag === "a" && name === "href") {
      return buildUrlAttribute("href", value, LINK_ALLOWED_SCHEMES);
    }
    if (tag === "img" && name === "src") {
      return buildUrlAttribute("src", value, IMAGE_ALLOWED_SCHEMES);
    }
  },
};

/**
 * HTMLサニタイゼーション
 * XSS対策を行う純粋関数
 *
 * @param html - サニタイズ対象のHTML文字列
 * @returns サニタイズ済みのHTML文字列
 *
 * セキュリティ要件:
 * - href/srcは許可スキームのホワイトリスト方式（javascript: 等を完全ブロック）
 * - 実体参照・制御文字によるスキーム偽装を正規化してから判定
 * - イベントハンドラ属性の除去
 * - 危険なタグの除去
 * - データ属性の禁止
 * - シンタックスハイライト用のクラス属性を許可
 */
export const sanitizeHTML = (html: string): string => {
  return xss(html, xssOptions);
};
