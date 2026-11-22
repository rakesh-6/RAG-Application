/**
 * Shows an answer and turns citation markers like "[2]" into small links that jump
 * to source card 2. Markers without a matching source stay plain text.
 * (React escapes the text, so model output can never inject HTML.)
 */
export default function AnswerText({ text, messageId, sourceNumbers = [] }) {
  const parts = text.split(/(\[\d+\])/g)
  return (
    <p className="text-[15px] leading-[1.65] whitespace-pre-wrap">
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/)
        const number = match ? Number(match[1]) : null
        if (number !== null && sourceNumbers.includes(number)) {
          return (
            <a
              key={index}
              href={`#source-${messageId}-${number}`}
              aria-label={`Source ${number}`}
              className="mx-0.5 rounded-md bg-indigo-50 px-1.5 py-px text-xs font-semibold text-indigo-700 no-underline hover:bg-indigo-100"
            >
              {number}
            </a>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </p>
  )
}
