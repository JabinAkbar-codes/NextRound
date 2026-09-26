import { useState, useEffect } from 'react'
import { Select, TextInput } from '@mantine/core'

const OTHER = '__other__'

/**
 * A preset dropdown that also lets the user type any subject/title of
 * their own ("Cyber Security", "Kubernetes", a specific job role, etc).
 * Always reports a plain string to the parent via onChange.
 */
export default function TopicSelect({ label, presets, value, onChange, placeholder = 'Type your own topic…' }) {
  const isPreset = presets.includes(value)
  const [mode, setMode] = useState(isPreset || !value ? 'preset' : 'custom')
  const [customText, setCustomText] = useState(isPreset ? '' : value || '')

  useEffect(() => {
    // keep local UI mode in sync if the parent resets `value` externally
    if (presets.includes(value)) {
      setMode('preset')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const selectData = [...presets.map((p) => ({ value: p, label: p })), { value: OTHER, label: 'Other — type your own…' }]

  const handleSelect = (val) => {
    if (val === OTHER) {
      setMode('custom')
      onChange(customText)
    } else {
      setMode('preset')
      onChange(val)
    }
  }

  const handleCustomChange = (e) => {
    setCustomText(e.target.value)
    onChange(e.target.value)
  }

  return (
    <div>
      <Select
        label={label}
        data={selectData}
        value={mode === 'custom' ? OTHER : value}
        onChange={handleSelect}
        allowDeselect={false}
        mb={mode === 'custom' ? 8 : undefined}
      />
      {mode === 'custom' && (
        <TextInput placeholder={placeholder} value={customText} onChange={handleCustomChange} autoFocus />
      )}
    </div>
  )
}
