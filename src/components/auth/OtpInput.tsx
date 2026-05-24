import { useRef, useEffect } from 'react'

interface OtpInputProps {
  length?: number
  value: string[]
  onChange: (digits: string[]) => void
  onComplete: (code: string) => void
  hasError?: boolean
  disabled?: boolean
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  hasError = false,
  disabled = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  // When error fires, clear and re-focus first input
  useEffect(() => {
    if (hasError) {
      onChange(Array(length).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }, [hasError]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleInput(idx: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[idx] = digit

    onChange(next)

    if (digit) {
      if (idx < length - 1) {
        inputRefs.current[idx + 1]?.focus()
      } else {
        // Last digit entered — trigger completion
        const code = next.join('')
        if (code.length === length) onComplete(code)
      }
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!text) return
    const next = Array(length).fill('')
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    onChange(next)
    // Focus last filled or last slot
    const lastIdx = Math.min(text.length, length - 1)
    inputRefs.current[lastIdx]?.focus()
    if (text.length === length) onComplete(text)
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 8,
      }}
      onPaste={handlePaste}
    >
      {Array.from({ length }, (_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] ?? ''}
          disabled={disabled}
          autoComplete="one-time-code"
          style={{
            width: 44,
            height: 52,
            background: 'var(--bg3)',
            border: `1.5px solid ${
              hasError
                ? 'var(--r)'
                : value[idx]
                ? 'var(--g)'
                : 'rgba(29,158,117,0.2)'
            }`,
            borderRadius: 'var(--rads)',
            color: 'var(--cream)',
            fontFamily: 'Syne, sans-serif',
            fontSize: 22,
            fontWeight: 700,
            textAlign: 'center',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            caretColor: 'var(--g)',
            background: value[idx] ? 'var(--gc)' : 'var(--bg3)',
          } as React.CSSProperties}
          onChange={(e) => handleInput(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--g)'
            e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.12)'
          }}
          onBlur={(e) => {
            if (!value[idx]) {
              e.target.style.borderColor = hasError ? 'var(--r)' : 'rgba(29,158,117,0.2)'
            }
            e.target.style.boxShadow = ''
          }}
        />
      ))}
    </div>
  )
}
