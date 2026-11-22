import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AnswerText from './AnswerText'

describe('AnswerText', () => {
  it('turns citation markers into links to their source cards', () => {
    render(<AnswerText text="Employees get 18 days [1]. Unused days carry over [2]." messageId={42} sourceNumbers={[1, 2]} />)

    expect(screen.getByRole('link', { name: 'Source 1' })).toHaveAttribute('href', '#source-42-1')
    expect(screen.getByRole('link', { name: 'Source 2' })).toHaveAttribute('href', '#source-42-2')
  })

  it('leaves markers without a matching source as plain text', () => {
    render(<AnswerText text="Something [7]." messageId={1} sourceNumbers={[1]} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('[7]')).toBeInTheDocument()
  })

  it('never renders model output as HTML', () => {
    const { container } = render(<AnswerText text={'<img src=x onerror="alert(1)">'} messageId={1} />)

    expect(container.querySelector('img')).toBeNull()
  })
})
