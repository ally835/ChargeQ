import { useRef, useEffect } from 'react'

interface PinInputProps {
  length?: 4 | 6
  value: string[]
  onChange: (digits: string[]) => void
  onComplete: (code: string) => void
  hasError?: boolean
  disabled?: boolean
  large?: boolean
}

export function PinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  hasError = false,
  disabled = false,
  large = false,
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 120)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (hasError) {
      onChange(Array(length).fill(''))
      setTimeout(() => {
        inputRefs.current.forEach((el) => {
          if (el) { el.style.borderColor = 'var(--r)'; el.style.boxShadow = '0 0 0 3px rgba(226,75,74,0.12)' }
        })
        setTimeout(() => {
          inputRefs.current.forEach((el) => {
            if (el) { el.style.borderColor = ''; el.style.boxShadow = '' }
          })
          inputRefs.current[0]?.focus()
        }, 900)
      }, 50)
    }
  }, [hasError]) // eslint-disable-line

  function handleInput(idx: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[idx] = digit
    onChange(next)
    if (digit) {
      if (idx < length - 1) { inputRefs.current[idx + 1]?.focus() }
      else {
        const code = next.join('')
        if (code.length === length) onComplete(code)
      }
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const size = large ? 52 : 44
  const fontSize = large ? 22 : 18

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length }, (_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] ?? ''}
          disabled={disabled}
          onChange={(e) => handleInput(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          style={{
            width: size, height: size,
            background: value[idx] ? 'var(--gc)' : 'var(--bg3)',
            border: `1.5px solid ${value[idx] ? 'var(--g)' : 'rgba(29,158,117,0.2)'}`,
            borderRadius: 10, color: 'var(--cream)',
            fontFamily: 'Syne, sans-serif', fontSize, fontWeight: 700,
            textAlign: 'center', outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            caretColor: 'var(--g)',
          } as React.CSSProperties}
          onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.12)' }}
          onBlur={(e) => { if (!value[idx]) e.target.style.borderColor = 'rgba(29,158,117,0.2)'; e.target.style.boxShadow = '' }}
        />
      ))}
    </div>
  )
}
