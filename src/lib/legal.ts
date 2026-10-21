export const legalPages = {
  terms: {
    title: "Terms of service",
    updated: "October 2025",
    sections: [
      {
        heading: "Who this covers",
        body: "These terms cover use of the Blackworld site and the partnership application. Account, card, and payment services are provided only after a separate agreement with an approved business, fintech, or institution.",
      },
      {
        heading: "Retail banking",
        body: "Retail banking ended in October 2025. Blackworld does not open consumer accounts through this site.",
      },
      {
        heading: "Acceptable use",
        body: "Do not misuse the site, attempt to access another institution’s data, or submit an application with information you are not authorized to give.",
      },
    ],
  },
  privacy: {
    title: "Privacy",
    updated: "October 2025",
    sections: [
      {
        heading: "What you send",
        body: "Partnership, sales, and support forms keep what you type in this browser so the page can confirm it. This demo does not transmit those fields to a server.",
      },
      {
        heading: "Login",
        body: "A successful login stores your email in local storage on this device so the header can show you are signed in. The password is checked for length and then discarded.",
      },
      {
        heading: "Exchange rates",
        body: "The converter may request public mid-market rates. If that request fails, the page keeps the sandbox rates bundled with the site.",
      },
    ],
  },
  compliance: {
    title: "Compliance",
    updated: "October 2025",
    sections: [
      {
        heading: "License",
        body: "Blackworld is presented as a full-reserve bank licensed by OCIF in Puerto Rico. Services on this site are for businesses, fintechs, and institutions.",
      },
      {
        heading: "Controls",
        body: "Account opening includes KYC and AML checks. Card programs expose spending controls. Payment rails covered here are SWIFT, ACH, and wires.",
      },
      {
        heading: "Assurance",
        body: "The platform is described as SOC 2 Type II, with a 99.99% API uptime target and a sandbox for integration testing.",
      },
    ],
  },
} as const;

export type LegalSlug = keyof typeof legalPages;
