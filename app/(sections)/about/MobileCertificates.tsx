import CertificateGrid, { type Certificate } from "../work/CertificateGrid";

const initialCertificates: Certificate[] = [
  {
    id: "cert-azure",
    title: "Azure Fundamentals",
    issuingOrg: "Microsoft",
    date: "Oct 2024",
    image: "/images/certifications/microsoft-certified-fundamentals-badge.svg",
    credentialUrl:
      "https://learn.microsoft.com/api/credentials/share/en-us/JohnNazareneDelaPisa-8958/D57215FE29EAA434?sharingId",
  },
  {
    id: "cert-gcp",
    title: "Cloud Digital Leader",
    issuingOrg: "Google",
    date: "Jan 2025",
    image: "/images/certifications/googlecloudpractitioner.png",
    credentialUrl:
      "https://www.credly.com/badges/95d75765-13fa-4c81-802c-834c0217da8a/linked_in_profile",
  },
  {
    id: "cert-terraform",
    title: "Terraform Associate",
    issuingOrg: "HashiCorp",
    date: "Feb 2025",
    image: "/images/certifications/TerraformAssociate.png",
    credentialUrl:
      "https://www.credly.com/badges/bebd520f-8e29-4ec4-9f11-22a35b047349/linked_in_profile",
  },
  {
    id: "cert-copilot",
    title: "GitHub Copilot",
    issuingOrg: "Microsoft",
    date: "Oct 2025",
    image: "/images/certifications/Github_Copilot_badge.png",
    credentialUrl: "",
  },
];

export default function MobileCertificates() { return <CertificateGrid certificates={initialCertificates} variant="mobile" />; }
