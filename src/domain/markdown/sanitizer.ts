import xss from 'xss';

/**
 * xss (js-xss) オプション設定
 * 許可するHTMLタグと属性のホワイトリスト
 */
const xssOptions = {
  // 許可するHTMLタグのホワイトリスト
  whiteList: {
    'p': ['class', 'id'],
    'br': [],
    'strong': ['class', 'id'],
    'em': ['class', 'id'],
    'u': ['class', 'id'],
    's': ['class', 'id'],
    'del': ['class', 'id'], // GFM: 打ち消し線
    'code': ['class', 'id', 'language-*'], // シンタックスハイライト用
    'pre': ['class', 'id'],
    'a': ['href', 'title', 'class', 'id'],
    'img': ['src', 'alt', 'title', 'class', 'id'],
    'h1': ['class', 'id'],
    'h2': ['class', 'id'],
    'h3': ['class', 'id'],
    'h4': ['class', 'id'],
    'h5': ['class', 'id'],
    'h6': ['class', 'id'],
    'ul': ['class', 'id'],
    'ol': ['class', 'id'],
    'li': ['class', 'id'],
    'input': ['type', 'disabled', 'checked', 'class', 'id'], // GFM: タスクリスト
    'blockquote': ['class', 'id'],
    'table': ['class', 'id'],
    'thead': ['class', 'id'],
    'tbody': ['class', 'id'],
    'tr': ['class', 'id'],
    'th': ['class', 'id'],
    'td': ['class', 'id'],
    'hr': ['class', 'id'],
    'div': ['class', 'id'],
    'span': ['class', 'id'] // highlight.js 用
  },
  // ホワイトリスト外のタグを完全削除
  stripIgnoreTag: true,
  // script と style タグの中身も削除
  stripIgnoreTagBody: ['script', 'style'],
  // class 属性のワイルドカード対応（highlight.js の hljs-* クラス用）
  onTagAttr: (tag: string, name: string, value: string) => {
    // highlight.js の hljs-* クラスを許可
    if (name === 'class' && value.includes('hljs')) {
      return `class="${value}"`;
    }
    // language-* クラスを許可
    if (name === 'class' && value.includes('language-')) {
      return `class="${value}"`;
    }
  }
};

/**
 * HTMLサニタイゼーション
 * XSS対策を行う純粋関数
 *
 * @param html - サニタイズ対象のHTML文字列
 * @returns サニタイズ済みのHTML文字列
 *
 * セキュリティ要件:
 * - javascript: プロトコルの完全ブロック
 * - イベントハンドラ属性の除去
 * - 危険なタグの除去
 * - データ属性の禁止
 * - シンタックスハイライト用のクラス属性を許可
 */
export const sanitizeHTML = async (html: string): Promise<string> => {
  // xss は同期関数だが、インターフェース統一のため async を維持
  return xss(html, xssOptions);
};
