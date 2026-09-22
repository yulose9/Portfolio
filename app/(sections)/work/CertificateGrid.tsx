"use client";

import Image from "next/image";

export interface Certificate {
  id: string;
  title: string;
  issuingOrg: string;
  date: string;
  image: string;
  credentialUrl: string;
  skills?: string[];
  level?: "Fundamentals" | "Associate" | "Professional" | "Expert";
  verified?: boolean;
  expiresAt?: string;
}

export default function CertificateGrid({ certificates, variant = "desktop" }: {
  certificates: Certificate[];
  variant?: "desktop" | "mobile";
}) {
  const mobile = variant === "mobile";
  return (
    <div className={`grid grid-cols-2 ${mobile ? "gap-3" : "xl:grid-cols-3 gap-6 lg:gap-8"}`}>
      {certificates.map((cert) => {
        const content = <>
          <span className={`self-end text-black/65 ${mobile ? "text-[11px] leading-4" : "rounded-full bg-black/5 px-3 py-1 text-sm"}`}>{cert.date}</span>
          <div className={`flex flex-1 items-center justify-center ${mobile ? "py-3 min-h-24" : "py-5 min-h-56"}`}>
            <Image src={cert.image} alt={`${cert.title} certification badge`} width={205} height={205}
              sizes={mobile ? "80px" : "205px"} draggable={false}
              className={mobile ? "h-20 w-20 object-contain" : "h-44 w-44 lg:h-48 lg:w-48 object-contain"} />
          </div>
          <div>
            <h3 className={`font-semibold leading-tight text-black ${mobile ? "text-sm" : "text-xl lg:text-2xl"}`}>{cert.title}</h3>
            <p className={`text-black/70 ${mobile ? "mt-1 text-xs" : "mt-2 text-base"}`}>{cert.issuingOrg}</p>
          </div>
        </>;
        const className = `flex min-w-0 flex-col rounded-2xl border border-black/10 bg-[#e9ebe8] ${mobile ? "p-3.5 min-h-[200px]" : "p-6 min-h-96"}`;
        return cert.credentialUrl ? (
          <a key={cert.id} href={cert.credentialUrl} target="_blank" rel="noopener noreferrer"
            aria-label={`View ${cert.title}`} draggable={false}
            className={`${className} transition-colors duration-150 ${mobile ? "active:bg-white" : "hover:bg-white"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}>
            {content}
          </a>
        ) : <article key={cert.id} className={className}>{content}</article>;
      })}
    </div>
  );
}
