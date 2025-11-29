"use client";

import { useState } from "react";

interface CompanyLogoProps {
  logo: string;
  companyName: string;
  linkedinUrl: string;
}

/**
 * Company logo component with fallback placeholder.
 * Uses React state instead of innerHTML manipulation for security and React best practices.
 */
export default function CompanyLogo({
  logo,
  companyName,
  linkedinUrl,
}: CompanyLogoProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <a
      href={linkedinUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-[64px] h-[64px] rounded-[8px] overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0 hover:bg-white/20 transition-all duration-300 hover:scale-105"
    >
      {hasError ? (
        <svg
          className="w-6 h-6 text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ) : (
        <img
          src={logo}
          alt={`${companyName} logo`}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      )}
    </a>
  );
}
