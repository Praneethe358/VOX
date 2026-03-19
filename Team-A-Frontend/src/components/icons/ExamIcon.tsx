import React from 'react';

interface ExamIconProps {
  className?: string;
}

export default function ExamIcon({ className = 'h-4 w-4' }: ExamIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 3.5H14.5L19.5 8.5V19.5C19.5 20.6046 18.6046 21.5 17.5 21.5H7C5.89543 21.5 5 20.6046 5 19.5V5.5C5 4.39543 5.89543 3.5 7 3.5Z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M14 3.5V8.5H19" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8.5 12H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8.5 15H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8.5 18H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
