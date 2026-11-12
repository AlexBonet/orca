const BLOCK_SELECTOR = 'p, div, li, h1, h2, h3, h4, h5, h6, pre, blockquote, tr'

/** Plane sends rich-text HTML; render it as inert text so remote markup never reaches the DOM. */
export function planeHtmlToText(html: string): string {
  if (!html.trim()) {
    return ''
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('br').forEach((node) => node.replaceWith('\n'))
  doc.querySelectorAll('li').forEach((node) => node.prepend('• '))
  doc.querySelectorAll(BLOCK_SELECTOR).forEach((node) => node.append('\n'))
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}
