import { describe, expect, it } from 'vitest'
import { validateFile } from './fileValidation'

const fakeFile = (name, size) => ({ name, size })

describe('validateFile', () => {
  it('accepts PDF, DOCX and TXT files of normal size', () => {
    expect(validateFile(fakeFile('Handbook.pdf', 2_000_000))).toBeNull()
    expect(validateFile(fakeFile('Policy.DOCX', 80_000))).toBeNull()
    expect(validateFile(fakeFile('notes.txt', 9_000))).toBeNull()
  })

  it('rejects other file types', () => {
    expect(validateFile(fakeFile('Slides.pptx', 1000))).toBe("Slides.pptx can't be uploaded. Use PDF, DOCX or TXT.")
    expect(validateFile(fakeFile('README', 1000))).toBe("README can't be uploaded. Use PDF, DOCX or TXT.")
  })

  it('rejects empty and oversized files', () => {
    expect(validateFile(fakeFile('empty.txt', 0))).toBe('empty.txt is empty.')
    expect(validateFile(fakeFile('Annual_Report.pdf', 14.2 * 1024 * 1024))).toBe(
      'Annual_Report.pdf is 14.2 MB. The limit is 10 MB.',
    )
  })
})
