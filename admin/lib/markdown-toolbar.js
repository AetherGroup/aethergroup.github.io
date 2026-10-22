const COLORS = [
  { id: 'breaking', label: 'Breaking', tone: 'danger' },
  { id: 'added', label: 'Added', tone: 'success' },
  { id: 'fixed', label: 'Fixed', tone: 'info' },
  { id: 'changed', label: 'Changed', tone: 'accent' },
  { id: 'deprecated', label: 'Deprecated', tone: 'warning' },
];

const BUTTONS = [
  { id: 'h1', text: 'H1', title: 'Heading 1' },
  { id: 'h2', text: 'H2', title: 'Heading 2' },
  { id: 'h3', text: 'H3', title: 'Heading 3' },
  { id: 'h4', text: 'H4', title: 'Heading 4' },
  { id: 'p', text: '¶', title: 'Paragraph (remove the heading)' },
  { id: 'big', text: 'A+', title: 'Bigger text' },
  { id: 'small', text: 'A−', title: 'Smaller text' },
  { sep: true },
  { id: 'bold', icon: 'bold', title: 'Bold (Ctrl+B)' },
  { id: 'italic', icon: 'italic', title: 'Italic (Ctrl+I)' },
  { id: 'bolditalic', icon: 'boldItalic', title: 'Bold and italic' },
  { id: 'strike', icon: 'strike', title: 'Strikethrough' },
  { id: 'underline', icon: 'underline', title: 'Underline' },
  { id: 'highlight', icon: 'highlight', title: 'Highlight' },
  { sep: true },
  { id: 'code', icon: 'code', title: 'Inline code (Ctrl+K)' },
  { id: 'codeblock', icon: 'codeBlock', title: 'Code block' },
  { id: 'sup', icon: 'sup', title: 'Superscript' },
  { id: 'sub', icon: 'sub', title: 'Subscript' },
  { id: 'kbd', icon: 'kbd', title: 'Keyboard key' },
  { sep: true },
  { id: 'ul', icon: 'listUl', title: 'Bullet list' },
  { id: 'ol', text: '1.', title: 'Numbered list' },
  { id: 'task', icon: 'task', title: 'Task list' },
  { id: 'quote', icon: 'quote', title: 'Quote' },
  { sep: true },
  { id: 'link', icon: 'link', title: 'Link' },
  { id: 'image', icon: 'image', title: 'Image' },
  { id: 'table', icon: 'table', title: 'Table' },
  { id: 'hr', icon: 'hr', title: 'Horizontal rule' },
  { id: 'details', icon: 'details', title: 'Collapsible block' },
  { id: 'br', icon: 'br', title: 'Line break' },
  { sep: true },
  { id: 'clear', icon: 'eraser', title: 'Clear the formatting' },
];

const ACTIONS = {
  bold: { wrap: ['**', '**'] },
  italic: { wrap: ['*', '*'] },
  bolditalic: { wrap: ['***', '***'] },
  strike: { wrap: ['~~', '~~'] },
  underline: { wrap: ['<u>', '</u>'] },
  highlight: { wrap: ['<mark>', '</mark>'] },
  code: { wrap: ['`', '`'] },
  sup: { wrap: ['<sup>', '</sup>'] },
  sub: { wrap: ['<sub>', '</sub>'] },
  kbd: { wrap: ['<kbd>', '</kbd>'] },
  big: { wrap: ['<span class="tx-big">', '</span>'] },
  small: { wrap: ['<span class="tx-small">', '</span>'] },
  h1: { line: '# ' },
  h2: { line: '## ' },
  h3: { line: '### ' },
  h4: { line: '#### ' },
  ul: { line: '- ' },
  ol: { line: '1. ' },
  quote: { line: '> ' },
  link: { wrap: ['[', '](https://)'], placeholder: 'link text' },
  image: { wrap: ['![', '](https://)'], placeholder: 'alt text' },
  codeblock: { block: ['```\n', '\n```\n'], placeholder: 'code' },
  details: {
    block: [
      '\n<details class="md-details">\n<summary>More</summary>\n\n',
      '\n\n</details>\n',
    ],
    placeholder: 'Hidden text',
  },
  table: {
    block: ['\n| Column | Column |\n| --- | --- |\n| Cell | Cell |\n', ''],
  },
  hr: { block: ['\n---\n', ''] },
  br: { inline: '<br>\n' },
};

const SHORTCUTS = {
  b: 'bold',
  i: 'italic',
  k: 'code',
};

function replaceRange(textarea, start, end, text) {
  textarea.setRangeText(text, start, end, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function surround(textarea, before, after, placeholder) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);

  const alreadyOpen = value.slice(Math.max(0, start - before.length), start) === before;
  const alreadyClose = value.slice(end, end + after.length) === after;

  if (selected && alreadyOpen && alreadyClose) {
    const from = start - before.length;
    replaceRange(textarea, from, end + after.length, selected);
    textarea.setSelectionRange(from, from + selected.length);
    return;
  }

  const inner = selected || placeholder || '';
  replaceRange(textarea, start, end, before + inner + after);
  const cursor = start + before.length;
  textarea.setSelectionRange(cursor, cursor + inner.length);
}

function blockRange(textarea) {
  const value = textarea.value;
  const start = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  let end = value.indexOf('\n', textarea.selectionEnd);
  if (end === -1) end = value.length;
  return { start, end };
}

function prefixLines(textarea, prefix) {
  const { start, end } = blockRange(textarea);
  const lines = textarea.value.slice(start, end).split('\n');
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const nextLines = allPrefixed
    ? lines.map((line) => line.slice(prefix.length))
    : lines.map((line) => prefix + line);

  const block = nextLines.join('\n');
  replaceRange(textarea, start, end, block);
  textarea.setSelectionRange(start, start + block.length);
}

function stripHeading(textarea) {
  const { start, end } = blockRange(textarea);
  const lines = textarea.value.slice(start, end).split('\n');
  const nextLines = lines.map((line) => line.replace(/^#{1,6}\s+/, ''));
  const block = nextLines.join('\n');

  replaceRange(textarea, start, end, block);
  textarea.setSelectionRange(start, start + block.length);
}

function toggleTask(textarea) {
  const { start, end } = blockRange(textarea);
  const lines = textarea.value.slice(start, end).split('\n');

  const allDone = lines.every((line) => line.startsWith('- [x] '));
  const allOpen = lines.every((line) => line.startsWith('- [ ] '));

  let nextLines;
  if (allDone) nextLines = lines.map((line) => line.replace(/^- \[x\] /, '- [ ] '));
  else if (allOpen) nextLines = lines.map((line) => line.replace(/^- \[ \] /, '- [x] '));
  else nextLines = lines.map((line) => '- [ ] ' + line.replace(/^(- \[[ x]\] )?/, ''));

  const block = nextLines.join('\n');
  replaceRange(textarea, start, end, block);
  textarea.setSelectionRange(start, start + block.length);
}

function insertBlock(textarea, open, close, placeholder) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const inner = selected || placeholder || '';

  const before = open.startsWith('\n') ? open : `\n${open}`;
  const after = close || '';

  replaceRange(textarea, start, end, `${before}${inner}${after}`);

  if (placeholder && !selected) {
    const cursor = start + before.length;
    textarea.setSelectionRange(cursor, cursor + inner.length);
  }
}

function clearFormatting(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return;

  const selected = textarea.value.slice(start, end);
  const cleaned = selected
    .replace(/<\/?(?:u|mark|sup|sub|kbd|span)[^>]*>/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]*\)/g, '$1')
    .replace(/!\[(.+?)\]\([^)]*\)/g, '$1');

  replaceRange(textarea, start, end, cleaned);
  textarea.setSelectionRange(start, start + cleaned.length);
}

export function applyFormat(textarea, id) {
  if (id === 'p') {
    stripHeading(textarea);
    return;
  }

  if (id === 'task') {
    toggleTask(textarea);
    return;
  }

  if (id === 'clear') {
    clearFormatting(textarea);
    return;
  }

  const action = ACTIONS[id];
  if (!action) return;

  if (action.wrap) {
    surround(textarea, action.wrap[0], action.wrap[1], action.placeholder);
    return;
  }

  if (action.line) {
    prefixLines(textarea, action.line);
    return;
  }

  if (action.inline) {
    const at = textarea.selectionEnd;
    replaceRange(textarea, at, at, action.inline);
    textarea.setSelectionRange(at + action.inline.length, at + action.inline.length);
    return;
  }

  if (action.block) {
    insertBlock(textarea, action.block[0], action.block[1], action.placeholder);
  }
}

function applyColor(textarea, className) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);

  const span = /<(span|mark) class="(?:c|bg)-[a-z]+">([\s\S]*?)<\/\1>/g;
  let match;
  let hit = null;
  while ((match = span.exec(value)) !== null) {
    const from = match.index;
    const to = match.index + match[0].length;
    if (from <= start && end <= to) {
      hit = { from, to, inner: match[2] };
      break;
    }
  }

  if (hit) {
    const next = className ? `<span class="${className}">${hit.inner}</span>` : hit.inner;
    replaceRange(textarea, hit.from, hit.to, next);
    textarea.setSelectionRange(hit.from, hit.from + next.length);
    return;
  }

  if (!className) return;
  if (!selected.trim()) return;

  const next = `<span class="${className}">${selected}</span>`;
  replaceRange(textarea, start, end, next);
  textarea.setSelectionRange(start + next.length, start + next.length);
}

function buttonMarkup(button) {
  if (button.sep) return '<span class="adm-toolbar__sep" aria-hidden="true"></span>';

  const face = button.icon
    ? `<svg class="icon" aria-hidden="true"><use href="#i-${button.icon}" /></svg>`
    : `<span class="adm-toolbar__text">${button.text}</span>`;

  return `<button class="adm-toolbar__btn" type="button" data-format="${button.id}" title="${button.title}" aria-label="${button.title}">${face}</button>`;
}

function colorMarkup() {
  const items = COLORS.map(
    (color) => `
    <button class="adm-palette__item" type="button" role="menuitem" data-color="${color.id}">
      <i class="adm-palette__dot adm-palette__dot--${color.tone}"></i>
      ${color.label}
    </button>`,
  ).join('');

  return `
    <span class="adm-toolbar__color">
      <button class="adm-toolbar__btn" type="button" data-color-toggle aria-haspopup="menu"
              aria-expanded="false" title="Color" aria-label="Color">
        <svg class="icon" aria-hidden="true"><use href="#i-palette" /></svg>
      </button>
      <span class="adm-palette" data-palette role="menu" hidden>
        <span class="adm-palette__modes" data-modes>
          <button class="adm-palette__mode is-active" type="button" data-mode="c">Text</button>
          <button class="adm-palette__mode" type="button" data-mode="bg">Background</button>
        </span>
        ${items}
        <span class="adm-palette__sep" aria-hidden="true"></span>
        <button class="adm-palette__item" type="button" role="menuitem" data-color="">
          <svg class="icon" aria-hidden="true"><use href="#i-cls" /></svg>
          Remove the color
        </button>
      </span>
    </span>`;
}

export function createToolbar(host, textarea) {
  if (!host || !textarea) return;

  host.innerHTML = `${BUTTONS.map(buttonMarkup).join('')}${colorMarkup()}`;

  const palette = host.querySelector('[data-palette]');
  const toggle = host.querySelector('[data-color-toggle]');
  const modes = host.querySelector('[data-modes]');
  let mode = 'c';

  const closePalette = () => {
    palette.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openPalette = () => {
    palette.hidden = false;
    palette.classList.remove('is-up');
    const rect = toggle.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < palette.offsetHeight + 24) palette.classList.add('is-up');
  };

  host.addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) event.preventDefault();
  });

  host.addEventListener('click', (event) => {
    const modeButton = event.target.closest('[data-mode]');
    if (modeButton) {
      mode = modeButton.dataset.mode;
      for (const button of modes.querySelectorAll('[data-mode]')) {
        button.classList.toggle('is-active', button.dataset.mode === mode);
      }
      return;
    }

    const swatch = event.target.closest('[data-color]');
    if (swatch) {
      applyColor(textarea, swatch.dataset.color ? `${mode}-${swatch.dataset.color}` : '');
      closePalette();
      textarea.focus();
      return;
    }

    if (event.target.closest('[data-color-toggle]')) {
      if (palette.hidden) openPalette();
      else closePalette();
      return;
    }

    const button = event.target.closest('[data-format]');
    if (!button) return;
    applyFormat(textarea, button.dataset.format);
    textarea.focus();
  });

  document.addEventListener('click', (event) => {
    if (!palette.hidden && !host.contains(event.target)) closePalette();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !palette.hidden) {
      closePalette();
      textarea.focus();
    }
  });
}

export function attachShortcuts(textarea) {
  if (!textarea) return;

  textarea.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const id = SHORTCUTS[event.key.toLowerCase()];
    if (!id) return;
    event.preventDefault();
    applyFormat(textarea, id);
  });
}

const CHEATS = [
  ['# Title', 'Heading 1'],
  ['## Subtitle', 'Heading 2'],
  ['### Smaller', 'Heading 3'],
  ['**bold**', 'Bold'],
  ['*italic*', 'Italic'],
  ['***both***', 'Bold and italic'],
  ['~~struck~~', 'Strikethrough'],
  ['`code`', 'Inline code'],
  ['[text](https://)', 'Link'],
  ['![alt](cover.png)', 'Image'],
  ['- item', 'Bullet list'],
  ['1. item', 'Numbered list'],
  ['- [ ] item', 'Task list'],
  ['> quote', 'Quote'],
  ['---', 'Horizontal rule'],
];

const HTML_CHEATS = [
  ['&lt;u&gt;text&lt;/u&gt;', 'Underline'],
  ['&lt;mark&gt;text&lt;/mark&gt;', 'Highlight'],
  ['&lt;sup&gt;text&lt;/sup&gt;', 'Superscript'],
  ['&lt;sub&gt;text&lt;/sub&gt;', 'Subscript'],
  ['&lt;kbd&gt;Ctrl&lt;/kbd&gt;', 'Keyboard key'],
  ['&lt;span class="tx-big"&gt;', 'Bigger text'],
  ['&lt;span class="tx-small"&gt;', 'Smaller text'],
  ['&lt;details&gt;&lt;summary&gt;', 'Collapsible block'],
  ['&lt;br&gt;', 'Line break'],
];

const COLOR_CHEATS = [
  ['c-breaking', 'Breaking change'],
  ['c-added', 'Something new'],
  ['c-fixed', 'A fix'],
  ['c-changed', 'Something changed'],
  ['c-deprecated', 'Deprecated'],
  ['bg-breaking', 'Breaking, on a coloured background'],
  ['bg-added', 'New, on a coloured background'],
  ['bg-fixed', 'A fix, on a coloured background'],
];

export function createCheatsheet(host) {
  if (!host) return;

  host.innerHTML = `
    <p class="adm-cheatsheet__lead">
      The content is Markdown. These are the only things you need.
    </p>
    <dl class="adm-cheatsheet__list">
      ${CHEATS.map(
        ([syntax, what]) => `
        <div class="adm-cheatsheet__row">
          <dt><code>${syntax}</code></dt>
          <dd>${what}</dd>
        </div>`,
      ).join('')}
    </dl>
    <p class="adm-cheatsheet__lead">
      For a code block put three backticks on their own line, the code, and
      three more backticks.
    </p>
    <p class="adm-cheatsheet__lead">
      These need a little HTML. The buttons in the toolbar write them for you.
    </p>
    <dl class="adm-cheatsheet__list">
      ${HTML_CHEATS.map(
        ([syntax, what]) => `
        <div class="adm-cheatsheet__row">
          <dt><code>${syntax}</code></dt>
          <dd>${what}</dd>
        </div>`,
      ).join('')}
    </dl>
    <p class="adm-cheatsheet__lead">
      To colour a word, wrap it in a span. The colour button in the toolbar
      writes it for you.
    </p>
    <dl class="adm-cheatsheet__list">
      ${COLOR_CHEATS.map(
        ([name, what]) => `
        <div class="adm-cheatsheet__row">
          <dt><code>&lt;span class="${name}"&gt;</code></dt>
          <dd>${what}</dd>
        </div>`,
      ).join('')}
    </dl>`;
}
