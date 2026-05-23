import type { CSSProperties, ReactNode } from 'react';

/**
 * Tiny streaming-safe Markdown renderer. Handles paragraphs, h1–h3,
 * unordered/ordered lists, blockquotes, **bold**, *italic*, `code`,
 * and [links](url). Designed to render mid-stream output gracefully —
 * unterminated `**` or `*` markers fall through as plain text rather
 * than swallow the rest of the buffer.
 *
 * Intentionally minimal: no tables, no images, no code fences. Add
 * those if the assistant starts emitting them.
 */
export function Markdown({ text, baseStyle }: { text: string; baseStyle?: CSSProperties }) {
  const blocks = parseBlocks(text);
  return (
    <div style={baseStyle}>
      {blocks.map((b, i) => renderBlock(b, i, blocks.length))}
    </div>
  );
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'ulist'; items: string[] }
  | { kind: 'olist'; items: string[] }
  | { kind: 'quote'; text: string };

function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  const blocks = src.split(/\n{2,}/);
  for (const raw of blocks) {
    if (!raw.trim()) continue;
    const lines = raw.split('\n');
    const first = lines[0];

    const headingMatch = first.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      out.push({
        kind: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });
      continue;
    }

    if (lines.every((l) => /^[-*]\s/.test(l) || l.trim() === '')) {
      out.push({
        kind: 'ulist',
        items: lines.filter((l) => /^[-*]\s/.test(l)).map((l) => l.replace(/^[-*]\s+/, '')),
      });
      continue;
    }

    if (lines.every((l) => /^\d+\.\s/.test(l) || l.trim() === '')) {
      out.push({
        kind: 'olist',
        items: lines.filter((l) => /^\d+\.\s/.test(l)).map((l) => l.replace(/^\d+\.\s+/, '')),
      });
      continue;
    }

    if (/^>\s?/.test(first)) {
      out.push({
        kind: 'quote',
        text: lines.map((l) => l.replace(/^>\s?/, '')).join(' '),
      });
      continue;
    }

    // Paragraph — collapse soft line wraps into spaces (standard md).
    out.push({ kind: 'paragraph', text: lines.join(' ') });
  }
  return out;
}

function renderBlock(b: Block, i: number, total: number): ReactNode {
  const last = i === total - 1;
  const marginBottom = last ? 0 : 10;
  switch (b.kind) {
    case 'heading': {
      const sizes = { 1: 16, 2: 14, 3: 13 } as const;
      return (
        <p
          key={i}
          style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            fontSize: sizes[b.level],
            fontWeight: 700,
            color: 'var(--nf-focus)',
            textTransform: b.level === 3 ? 'uppercase' : 'none',
            letterSpacing: b.level === 3 ? '0.1em' : 'normal',
            margin: i === 0 ? '0 0 6px' : '12px 0 6px',
          }}
        >
          {renderInline(b.text)}
        </p>
      );
    }
    case 'paragraph':
      return (
        <p
          key={i}
          style={{
            margin: i === 0 ? `0 0 ${marginBottom}px` : `0 0 ${marginBottom}px`,
            lineHeight: 1.6,
          }}
        >
          {renderInline(b.text)}
        </p>
      );
    case 'ulist':
      return (
        <ul
          key={i}
          style={{
            margin: i === 0 ? `0 0 ${marginBottom}px` : `0 0 ${marginBottom}px`,
            paddingLeft: 18,
            listStyleType: 'disc',
          }}
        >
          {b.items.map((it, j) => (
            <li key={j} style={{ marginBottom: 3, lineHeight: 1.55 }}>
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
    case 'olist':
      return (
        <ol
          key={i}
          style={{
            margin: i === 0 ? `0 0 ${marginBottom}px` : `0 0 ${marginBottom}px`,
            paddingLeft: 22,
            listStyleType: 'decimal',
          }}
        >
          {b.items.map((it, j) => (
            <li key={j} style={{ marginBottom: 3, lineHeight: 1.55 }}>
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
    case 'quote':
      return (
        <blockquote
          key={i}
          style={{
            margin: i === 0 ? `0 0 ${marginBottom}px` : `0 0 ${marginBottom}px`,
            paddingLeft: 10,
            borderLeft: '2px solid var(--nf-rule)',
            fontStyle: 'italic',
            color: 'var(--nf-ink-soft)',
            lineHeight: 1.55,
          }}
        >
          {renderInline(b.text)}
        </blockquote>
      );
  }
}

/**
 * Scan for inline markers. Unterminated markers are rendered as the
 * literal characters they started with — so streaming "the **chief"
 * shows "the **chief" until the closing "**" arrives, then snaps to
 * "the <strong>chief</strong>". No flashes, no swallowed text.
 */
function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  let buf = '';
  let key = 0;
  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = '';
    }
  };

  while (i < text.length) {
    const c = text[i];

    // **bold**
    if (c === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1 && end > i + 2) {
        flush();
        out.push(
          <strong key={key++} style={{ fontWeight: 700, color: 'var(--nf-ink)' }}>
            {renderInline(text.slice(i + 2, end))}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // *italic* / _italic_ — single marker, not adjacent to another marker
    if ((c === '*' || c === '_') && text[i + 1] !== c) {
      const end = text.indexOf(c, i + 1);
      if (end !== -1 && end > i + 1 && text[end + 1] !== c && text[end - 1] !== ' ') {
        flush();
        out.push(
          <em key={key++} style={{ fontStyle: 'italic' }}>
            {renderInline(text.slice(i + 1, end))}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    // `code`
    if (c === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        out.push(
          <code
            key={key++}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.9em',
              background: 'var(--nf-panel-deep)',
              padding: '0 4px',
              borderRadius: 2,
            }}
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    // [text](url)
    if (c === '[') {
      const tEnd = text.indexOf(']', i + 1);
      if (tEnd !== -1 && text[tEnd + 1] === '(') {
        const uEnd = text.indexOf(')', tEnd + 2);
        if (uEnd !== -1) {
          const url = text.slice(tEnd + 2, uEnd);
          const linkText = text.slice(i + 1, tEnd);
          flush();
          out.push(
            <a
              key={key++}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: 'var(--nf-focus)', textDecoration: 'underline' }}
            >
              {linkText}
            </a>,
          );
          i = uEnd + 1;
          continue;
        }
      }
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}
