export function htmlToPlainText(input?: string | null): string {
  return String(input ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function isHtmlBodyEmpty(input?: string | null): boolean {
  return !htmlToPlainText(input);
}

export function toSafeRenderableHtml(input?: string | null): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  const hasHtmlTags = /<\s*\/?\s*[a-z][^>]*>/i.test(raw);
  if (hasHtmlTags) {
    return raw.replace(/\r\n/g, '\n').replace(/\n/g, '<br />');
  }

  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br />');
  return `<p>${escaped}</p>`;
}

export const announcementHtmlTagStyles = {
  p: { marginTop: 0, marginBottom: 12 },
  br: { marginBottom: 0 },
  ul: { marginTop: 0, marginBottom: 12, paddingLeft: 18 },
  ol: { marginTop: 0, marginBottom: 12, paddingLeft: 18 },
  li: { marginBottom: 6 },
  a: { textDecorationLine: 'underline' as const },
  strong: { fontWeight: '700' as const },
  b: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  i: { fontStyle: 'italic' as const },
  u: { textDecorationLine: 'underline' as const },
};
