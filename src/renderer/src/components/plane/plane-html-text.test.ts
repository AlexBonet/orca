// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { planeHtmlToText } from './plane-html-text'

describe('planeHtmlToText', () => {
  it('keeps paragraph and list structure as plain text', () => {
    expect(planeHtmlToText('<p>Hello</p><ul><li>one</li><li>two</li></ul>')).toBe(
      'Hello\n• one\n• two'
    )
  })

  it('never returns markup or script content as HTML', () => {
    const text = planeHtmlToText('<p>hi<img src=x onerror=alert(1)></p>')
    expect(text).toBe('hi')
  })
})
