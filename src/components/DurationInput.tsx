import React, { useEffect, useState } from 'react';
import { formatDuration, parseDuration } from '../utils/holdSets';

interface DurationInputProps {
  /** Segundos. */
  value: number;
  onChange: (seconds: number) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Campo de tiempo: escribes «25» (minutos), «25:30» (min:seg) o «1:05:00». Se
 * muestra como 25:30 y solo se interpreta al salir del campo, para no pelear con
 * el usuario mientras escribe.
 */
export default function DurationInput({ value, onChange, className, placeholder = 'min:seg', id }: DurationInputProps) {
  const [text, setText] = useState(() => (value ? formatDuration(value) : ''));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value ? formatDuration(value) : '');
  }, [value, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      aria-label="Tiempo"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        if (/^[0-9:.,]*$/.test(e.target.value)) setText(e.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        const seconds = parseDuration(text);
        onChange(seconds);
        setText(seconds ? formatDuration(seconds) : '');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={className}
    />
  );
}
