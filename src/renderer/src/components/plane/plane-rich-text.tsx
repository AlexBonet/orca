import { createElement, type ReactNode } from 'react'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'

const ALLOWED_TAGS = new Set([
  'p',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'br',
  'hr'
])

const TAG_CLASS: Record<string, string> = {
  p: 'my-1.5',
  ul: 'my-1.5 list-disc pl-5',
  ol: 'my-1.5 list-decimal pl-5',
  h1: 'mt-3 mb-1 text-base font-semibold',
  h2: 'mt-3 mb-1 text-sm font-semibold',
  h3: 'mt-2 mb-1 text-sm font-medium',
  blockquote: 'my-1.5 border-l-2 border-border pl-3 text-muted-foreground',
  pre: 'my-1.5 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs',
  code: 'rounded bg-muted px-1 font-mono text-xs',
  hr: 'my-2 border-border'
}

function safeHttpUrl(href: string | null): string | null {
  if (!href) {
    return null
  }
  try {
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function renderNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }
  if (!(node instanceof Element)) {
    return null
  }
  const tag = node.tagName.toLowerCase()
  const children = renderChildren(node, key)
  if (tag === 'a') {
    const url = safeHttpUrl(node.getAttribute('href'))
    return url ? (
      <a
        key={key}
        href={url}
        className="text-primary underline-offset-2 hover:underline"
        onClick={(event) => {
          event.preventDefault()
          openAppHttpLink(url)
        }}
      >
        {children}
      </a>
    ) : (
      <span key={key}>{children}</span>
    )
  }
  if (!ALLOWED_TAGS.has(tag)) {
    // Unknown elements (scripts, images, embeds) keep only their text so nothing remote renders.
    return <span key={key}>{tag === 'script' || tag === 'style' ? null : children}</span>
  }
  return tag === 'br' || tag === 'hr'
    ? createElement(tag, { key, className: TAG_CLASS[tag] })
    : createElement(tag, { key, className: TAG_CLASS[tag] }, children)
}

function renderChildren(parent: Node, keyPrefix: string): ReactNode[] {
  return Array.from(parent.childNodes).map((child, index) =>
    renderNode(child, `${keyPrefix}.${index}`)
  )
}

/** Renders Plane rich text through an element allowlist; raw HTML never enters the DOM. */
export function PlaneRichText({ html }: { html: string }): React.JSX.Element | null {
  if (!html.trim()) {
    return null
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return <div className="break-words text-sm">{renderChildren(doc.body, 'r')}</div>
}
