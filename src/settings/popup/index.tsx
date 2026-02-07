import { h, render } from 'preact';
import { App } from './App.tsx';

/**
 * Popup エントリーポイント
 *
 * 責務: Preact アプリケーションのマウント
 */
const root = document.getElementById('app');
if (root) {
  render(<App />, root);
} else {
  console.error('Failed to find #app element');
}
