const BUTTONS = [
  { id: 'h1', text: 'H1', title: 'Heading 1' },
  { id: 'h2', text: 'H2', title: 'Heading 2' },
  { id: 'h3', text: 'H3', title: 'Heading 3' },
  { id: 'h4', text: 'H4', title: 'Heading 4' },
  { id: 'p', text: '¶', title: 'Paragraph (remove the heading)' },
  { sep: true },
  { id: 'bold', icon: 'bold', title: 'Bold (Ctrl+B)' },
  { id: 'italic', icon: 'italic', title: 'Italic (Ctrl+I)' },
  { id: 'strike', icon: 'strike', title: 'Strikethrough' },
  { id: 'code', icon: 'code', title: 'Inline code' },
  { sep: true },
  { id: 'ul', icon: 'listUl', title: 'Bullet list' },
  { id: 'ol', text: '1.', title: 'Numbered list' },
  { id: 'quote', icon: 'quote', title: 'Quote' },
  { sep: true },
  { id: 'link', icon: 'link', title: 'Link' },
  { id: 'image', icon: 'image', title: 'Image' },
  { id: 'codeblock', icon: 'codeBlock', title: 'Code block' },
  { id: 'table', icon: 'table', title: 'Table' },
  { id: 'hr', icon: 'hr', title: 'Horizontal rule' },
];

const ACTIONS = {
  bold: { wrap: ['**', '**'] },
  italic: { wrap: ['*', '*'] },
  strike: { wrap: ['~~', '~~'] },
  code: { wrap: ['`', '`'] },
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
  table: {
    block: ['\n| Column | Column |\n| --- | --- |\n| Cell | Cell |\n', ''],
  },
  hr: { block: ['\n---\n', ''] },
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

function prefixLines(textarea, prefix) {
  const value = textarea.value;
  const start = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  let end = value.indexOf('\n', textarea.selectionEnd);
  if (end === -1) end = value.length;

  const lines = value.slice(start, end).split('\n');
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const nextLines = allPrefixed
    ? lines.map((line) => line.slice(prefix.length))
    : lines.map((line) => prefix + line);

  const block = nextLines.join('\n');
  replaceRange(textarea, start, end, block);
  textarea.setSelectionRange(start, start + block.length);
}

function stripHeading(textarea) {
  const value = textarea.value;
  const start = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  let end = value.indexOf('\n', textarea.selectionEnd);
  if (end === -1) end = value.length;

  const lines = value.slice(start, end).split('\n');
  const nextLines = lines.map((line) => line.replace(/^#{1,6}\s+/, ''));
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

export function applyFormat(textarea, id) {
  if (id === 'p') {
    stripHeading(textarea);
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

  if (action.block) {
    insertBlock(textarea, action.block[0], action.block[1], action.placeholder);
  }
}

function buttonMarkup(button) {
  if (button.sep) return '<span class="adm-toolbar__sep" aria-hidden="true"></span>';

  const face = button.icon
    ? `<svg class="icon" aria-hidden="true"><use href="#i-${button.icon}" /></svg>`
    : `<span class="adm-toolbar__text">${button.text}</span>`;

  return `<button class="adm-toolbar__btn" type="button" data-format="${button.id}" title="${button.title}" aria-label="${button.title}">${face}</button>`;
}

export function createToolbar(host, textarea) {
  if (!host || !textarea) return;

  host.innerHTML = BUTTONS.map(buttonMarkup).join('');

  host.addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) event.preventDefault();
  });

  host.addEventListener('click', (event) => {
    const button = event.target.closest('[data-format]');
    if (!button) return;
    applyFormat(textarea, button.dataset.format);
    textarea.focus();
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
  ['~~struck~~', 'Strikethrough'],
  ['`code`', 'Inline code'],
  ['[text](https://)', 'Link'],
  ['![alt](cover.png)', 'Image'],
  ['- item', 'Bullet list'],
  ['1. item', 'Numbered list'],
  ['> quote', 'Quote'],
  ['---', 'Horizontal rule'],
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
    </p>`;
}
