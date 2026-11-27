import React, { useEffect, useRef, useState } from 'react';
import type { WindowMeasurementUnit } from '../../types.ts';
import {
  formatInchDecimal,
  formatInchFraction,
  parseMeasurementInput,
} from '../../lib/slidingWindowMeasurements.ts';

interface MeasurementInputProps {
  value: number | null;
  unit: WindowMeasurementUnit;
  onValueChange: (val: number | null) => void;
  allowEmpty?: boolean;
  allowZero?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  showConversionHint?: boolean;
  dataNeedsAttention?: string;
}

function formatInitialText(value: number | null, unit: WindowMeasurementUnit, allowZero: boolean): string {
  if (value === null || !Number.isFinite(value)) return '';
  if (!allowZero && value === 0) return '';
  if (unit === 'inch') return formatInchDecimal(value);
  return String(value);
}

/**
 * Measurement input for the Sliding Window Fabrication Calculator that accepts
 * both decimal values (e.g. 36.5, 14.875, 0.0625) and fractional / mixed-number
 * inch measurements (e.g. 1/16, 7/8, 14 7/8, 36 1/2, 42 3/8).
 */
export const MeasurementInput: React.FC<MeasurementInputProps> = ({
  value,
  unit,
  onValueChange,
  allowEmpty = false,
  allowZero = false,
  placeholder,
  className = '',
  ariaLabel,
  showConversionHint = false,
  dataNeedsAttention,
}) => {
  const [text, setText] = useState<string>(() => formatInitialText(value, unit, allowZero));
  const isFocusedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(formatInitialText(value, unit, allowZero));
    }
  }, [value, unit, allowZero]);

  const parsedCurrent = parseMeasurementInput(text);
  const hasInvalidSyntax = text.trim().length > 0 && (parsedCurrent === null || parsedCurrent < 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setText(next);

    if (next.trim() === '') {
      onValueChange(allowEmpty ? null : 0);
      return;
    }

    const parsed = parseMeasurementInput(next);
    if (parsed !== null && parsed >= 0) {
      onValueChange(parsed);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const trimmed = text.trim();
    if (!trimmed) {
      if (allowEmpty) {
        setText('');
        onValueChange(null);
      } else if (allowZero) {
        setText('0');
        onValueChange(0);
      } else {
        setText(formatInitialText(value, unit, allowZero));
      }
      return;
    }

    const parsed = parseMeasurementInput(trimmed);
    if (parsed !== null && parsed >= 0) {
      onValueChange(parsed);
      setText(formatInitialText(parsed, unit, allowZero || parsed === 0));
    } else {
      setText(formatInitialText(value, unit, allowZero));
    }
  };

  const hintFraction =
    showConversionHint && unit === 'inch' && parsedCurrent !== null && parsedCurrent > 0
      ? formatInchFraction(parsedCurrent, true)
      : null;
  const hintDecimal =
    showConversionHint && unit === 'inch' && parsedCurrent !== null && parsedCurrent > 0
      ? `${formatInchDecimal(parsedCurrent)}"`
      : null;

  return (
    <div className="w-full">
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-needs-attention={dataNeedsAttention}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={className}
      />
      {showConversionHint && unit === 'inch' && (
        <div className="mt-1 min-h-[15px] text-[10px] font-mono tabular-nums">
          {hasInvalidSyntax ? (
            <span className="text-[#B42318]">Enter decimal or fraction (e.g. 36 1/2 or 36.500)</span>
          ) : hintDecimal && hintFraction ? (
            <span className="text-[#8E6506]">
              = {hintDecimal} ({hintFraction})
            </span>
          ) : hintDecimal ? (
            <span className="text-[#666666]">= {hintDecimal}</span>
          ) : (
            <span className="text-[#888888]">Supports 36.5 or 36 1/2</span>
          )}
        </div>
      )}
    </div>
  );
};
