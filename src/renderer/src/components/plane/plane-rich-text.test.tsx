// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlaneRichText } from './plane-rich-text'

describe('PlaneRichText', () => {
  it('keeps formatting and https links but drops scripts, images and unsafe hrefs', () => {
    const html = renderToStaticMarkup(
      <PlaneRichText
        html={
          '<p>Hello <strong>world</strong><script>alert(1)</script><img src=x onerror=alert(1)></p>' +
          '<a href="javascript:alert(1)">bad</a><a href="https://plane.so/x">good</a>'
        }
      />
    )
    expect(html).toContain('<strong>world</strong>')
    expect(html).not.toContain('alert(1)')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('href="https://plane.so/x"')
  })
})
