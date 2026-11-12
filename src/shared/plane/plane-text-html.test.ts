import { describe, expect, it } from 'vitest'
import { planeTextToHtml } from './plane-text-html'

describe('planeTextToHtml', () => {
  it('escapes markup typed by the user', () => {
    expect(planeTextToHtml('<img src=x onerror=alert(1)> & "ok"')).toBe(
      '<p>&lt;img src=x onerror=alert(1)&gt; &amp; &quot;ok&quot;</p>'
    )
  })

  it('maps blank lines to paragraphs and single newlines to breaks', () => {
    expect(planeTextToHtml('one\ntwo\n\nthree')).toBe('<p>one<br>two</p><p>three</p>')
  })
})
