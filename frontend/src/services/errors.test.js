import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errors'

const apiError = (status, detail) => ({ response: { status, data: { detail } } })

describe('getErrorMessage', () => {
  it("shows the API's own message", () => {
    expect(getErrorMessage(apiError(409, 'Leave.txt is already in your library.'))).toBe('Leave.txt is already in your library.')
    expect(getErrorMessage(apiError(429, 'The AI service is busy right now. Try again in a minute.'))).toBe(
      'The AI service is busy right now. Try again in a minute.',
    )
  })

  it('shows the first validation problem from a 422 response', () => {
    const error = apiError(422, [{ msg: 'Value error, Question can\'t be empty', loc: ['body', 'question'] }])
    expect(getErrorMessage(error)).toBe("Question can't be empty")
  })

  it('hides the details of server bugs (500)', () => {
    expect(getErrorMessage(apiError(500, 'Internal server error'))).toBe('Something went wrong. Please try again.')
  })

  it('explains network problems', () => {
    expect(getErrorMessage(new Error('Network Error'))).toBe(
      "Can't reach the server. Check your connection and that the backend is running.",
    )
    expect(getErrorMessage({ code: 'ECONNABORTED' })).toBe('The server took too long to respond. Please try again.')
  })
})
