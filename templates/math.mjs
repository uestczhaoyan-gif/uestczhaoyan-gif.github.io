import katex from '../vendor/katex.mjs';

const render = (tex, displayMode) => katex.renderToString(tex, {
  displayMode, throwOnError: true, trust: false, output: 'htmlAndMathml'
});

// Parse before Markdown emphasis can consume TeX underscores or backslashes.
// Marked handles code spans/fences and escaped dollar signs independently.
export const mathExtensions = [
  {
    name: 'displayMath', level: 'block',
    start: src => src.indexOf('$$'),
    tokenizer(src) {
      const match = /^\$\$[ \t]*\n?([\s\S]+?)\n?\$\$(?:[ \t]*\n|$)/.exec(src);
      if (match) return { type: 'displayMath', raw: match[0], tex: match[1].trim() };
    },
    renderer: token => `${render(token.tex, true)}\n`
  },
  {
    name: 'inlineMath', level: 'inline',
    start: src => src.indexOf('$'),
    tokenizer(src) {
      const match = /^\$(?!\$)([^\n$]+?)\$(?!\$)/.exec(src);
      if (match) return { type: 'inlineMath', raw: match[0], tex: match[1] };
    },
    renderer: token => render(token.tex, false)
  }
];
