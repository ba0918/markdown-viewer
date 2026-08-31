/**
 * URLスキーム判定ユーティリティ（セキュリティ用）
 *
 * HTML属性値として書かれたURLは、ブラウザがHTMLエンティティをデコードし、
 * タブ・改行・制御文字を除去してからURLとして解釈する。
 * そのため「生の属性値」に対する `startsWith("javascript:")` のような
 * 前方一致チェックは容易にバイパスされる:
 *
 * - `java&#115;cript:alert(1)`  → 数値実体参照
 * - `java&Tab;script:alert(1)`  → 名前付き実体参照（ブラウザがタブを除去）
 * - `java<TAB>script:alert(1)`  → 生の制御文字
 * - `&amp;#106;avascript:...`   → 多重エンコード
 *
 * 本モジュールは値をブラウザ解釈後の正規形へ正規化した上で、
 * 「拒否リスト」ではなく「許可リスト」でスキームを判定する。
 */

/** 名前付き実体参照のうち、URLスキームの偽装に使えるもの */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  colon: ":",
  tab: "\t",
  newline: "\n",
  sol: "/",
  bsol: "\\",
  semi: ";",
  num: "#",
  period: ".",
  plus: "+",
  excl: "!",
  lpar: "(",
  rpar: ")",
};

/** 数値実体参照（16進） */
const HEX_ENTITY_PATTERN = /&#[xX]([0-9a-fA-F]+);?/g;
/** 数値実体参照（10進） */
const DEC_ENTITY_PATTERN = /&#(\d+);?/g;
/** 名前付き実体参照（セミコロンあり） */
const NAMED_ENTITY_PATTERN = new RegExp(
  `&(${Object.keys(NAMED_ENTITIES).join("|")});`,
  "gi",
);
/**
 * セミコロンなしのレガシー実体参照。
 * HTML仕様上、属性値では直後が英数字か `=` の場合デコードされないため同条件で扱う。
 */
const LEGACY_ENTITY_PATTERN = /&(amp|lt|gt|quot)(?![0-9a-zA-Z=])/gi;

/**
 * C0制御文字とDEL。ブラウザはURL解釈前にタブ・改行を除去するため、
 * スキーム判定でも同様に除去する必要がある（意図的な制御文字マッチ）。
 */
// deno-lint-ignore no-control-regex
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;

/** 多重エンコードに対応するためのデコード最大回数（無限ループ防止） */
const MAX_DECODE_PASSES = 5;

/** コードポイントが文字列化可能な範囲かを判定 */
const toCharSafe = (original: string, codePoint: number): string => {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
    return original;
  }
  // サロゲート単独はデコードしない（不正な文字列生成を避ける）
  if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
    return original;
  }
  return String.fromCodePoint(codePoint);
};

/** 実体参照を1回デコードする */
const decodeEntitiesOnce = (value: string): string => {
  return value
    .replace(
      HEX_ENTITY_PATTERN,
      (match, hex: string) => toCharSafe(match, parseInt(hex, 16)),
    )
    .replace(
      DEC_ENTITY_PATTERN,
      (match, dec: string) => toCharSafe(match, parseInt(dec, 10)),
    )
    .replace(
      NAMED_ENTITY_PATTERN,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
    )
    .replace(
      LEGACY_ENTITY_PATTERN,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
    );
};

/**
 * HTML属性値として書かれたURLを、ブラウザ解釈後の正規形へ正規化する
 *
 * 処理:
 * 1. 実体参照をデコード（多重エンコード対策のため変化しなくなるまで繰り返す）
 * 2. 制御文字（タブ・改行含む）を除去 ※ブラウザのURL解釈と同じ挙動
 * 3. 前後の空白を除去
 *
 * ブラウザより「多く」デコードするため、判定は常に安全側（過剰にブロック）へ倒れる。
 *
 * @param value - 生の属性値
 * @returns 正規化済みの値
 */
export const normalizeUrlAttributeValue = (value: string): string => {
  let current = value;
  for (let i = 0; i < MAX_DECODE_PASSES; i++) {
    const decoded = decodeEntitiesOnce(current).replace(
      CONTROL_CHAR_PATTERN,
      "",
    );
    if (decoded === current) break;
    current = decoded;
  }
  return current.trim();
};

/** URLスキームの構文（RFC 3986）: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) */
const SCHEME_PATTERN = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;

/**
 * 正規化済みURLからスキームを取得する
 *
 * @param normalizedUrl - normalizeUrlAttributeValue() 済みの値、または絶対URL
 * @returns 小文字のスキーム（例: "https:"）。相対URLの場合はnull
 */
export const getUrlScheme = (normalizedUrl: string): string | null => {
  const match = SCHEME_PATTERN.exec(normalizedUrl);
  return match ? `${match[1].toLowerCase()}:` : null;
};
