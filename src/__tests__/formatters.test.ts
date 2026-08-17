import { describe, expect, it } from 'vitest';
import { toPlainText } from '@/utils/formatters';

describe('toPlainText', () => {
  it('removes formatting tags while preserving paragraphs and list items', () => {
    expect(toPlainText('<p><i>Primeiro</i> parágrafo</p><p><b>Segundo</b><br>linha</p><ul><li>Um</li><li>Dois</li></ul>'))
      .toBe('Primeiro parágrafo\n\nSegundo\nlinha\n\n- Um\n- Dois');
  });

  it('decodes named and numeric entities', () => {
    expect(toPlainText('A &amp; B &quot;ok&quot; &#x1F44D; &#169;')).toBe('A & B "ok" 👍 ©');
  });

  it('handles double encoding and invalid code points without leaving markup', () => {
    expect(toPlainText('&amp;lt;i&amp;gt;texto&amp;lt;/i&amp;gt; &#xD800; &#x110000;')).toBe('texto');
  });

  it('returns null for an empty or whitespace-only value', () => {
    expect(toPlainText(null)).toBeNull();
    expect(toPlainText('   ')).toBeNull();
  });
});
