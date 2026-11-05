import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Marked } from '../vendor/marked.esm.js';
import { mathExtensions } from '../templates/math.mjs';

const md = new Marked({ extensions: mathExtensions });
test('inline TeX preserves subscripts, fractions and surrounding emphasis', () => {
  const html = md.parse(String.raw`**角度 $\theta_x$** 与 $\frac{d_2}{L+d_2} \ll 1$。`);
  assert.equal((html.match(/class="katex"/g) || []).length, 2);
  assert.match(html, /<msub>/);
  assert.match(html, /<mfrac>/);
  assert.match(html, /<strong>角度 /);
});
test('multiline display math renders as a block', () => {
  assert.match(md.parse('$$\nx_1 = 2\n$$\n'), /katex-display/);
});
test('code and escaped dollar signs remain literal', () => {
  const html = md.parse('`$x_1$`\n\n```text\n$y_2$\n```\n\n\\$100');
  assert.doesNotMatch(html, /class="katex/);
  assert.match(html, /<code>\$x_1\$<\/code>/);
  assert.match(html, /\$y_2\$/);
  assert.match(html, /\$100/);
});
test('invalid TeX stops publication instead of silently showing broken math', () => {
  assert.throws(() => md.parse(String.raw`$\frac{a}$`), /ParseError/);
});
