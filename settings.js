/* =====================================================================
   SETTINGS — this is the only file you should need to change.

   How to edit on GitHub:  open this file, click the pencil icon (✏️),
   change the text BETWEEN the quote marks "like this", then click
   "Commit changes". The website updates by itself in 1–2 minutes.

   Rules: keep the quote marks, keep the comma at the end of each line.
   ===================================================================== */

window.SITE = {

  // The name shown at the top of the website (in English and in Spanish).
  siteName: "Immigration Fine Helper",
  siteNameEs: "Ayuda con Multas de Inmigración",

  // One short line under the name. Lines ending in "Es" are the Spanish version.
  tagline: "Make your papers to fight a DHS immigration fine — free, private, step by step.",
  taglineEs: "Prepare sus papeles para pelear una multa de inmigración del DHS: gratis, privado y paso a paso.",

  // Who runs this website. Leave "" (empty) to hide.
  // Example: "Provided by the Law Office of Jane Doe"
  providedBy: "",
  providedByEs: "",   // the same line in Spanish, e.g. "Un servicio de la Oficina Legal de Jane Doe"

  // How people can contact you for help. Leave "" (empty) to hide any line.
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  contactWebsite: "",

  // The date you last checked that this information is still correct.
  lastReviewed: "October 2026",
  lastReviewedEs: "octubre de 2026",

  // Credit line for the model briefs this tool is based on.
  credit: "The papers this tool makes are based on the free model briefs for people without a lawyer published at noimmigrationfines.org by Public Justice, The Legal Aid Society, Free Migration Project, and the NYU Immigrant Rights Clinic. This website is independent and is not run by those organizations.",
  creditEs: "Los papeles que prepara esta herramienta se basan en los modelos gratuitos para personas sin abogado publicados en noimmigrationfines.org por Public Justice, The Legal Aid Society, Free Migration Project y la Clínica de Derechos de los Inmigrantes de NYU. Este sitio web es independiente y no lo manejan esas organizaciones.",

  // ---- Where papers are sent (check these if DHS changes them) ----

  // Mailing address for appeals of DHS "Notice of Violation and Order" (Form 281)
  // and "Notice of Intention to Fine" (Form I-79). Each line in its own quotes.
  iceAddress: [
    "U.S. Immigration and Customs Enforcement",
    "Attn: Civil Fines",
    "500 12th St. SW, Mail Stop 5202, Room 11078",
    "Washington, DC 20536-5202"
  ],

  // Email for disputes of 8 U.S.C. § 1815 "Notice of Fee Assessment".
  email1815: "INAfees@cbp.dhs.gov",

  // Email for disputes of CBP invoices (bills).
  emailCbpInvoice: "INACivilPenalties@cbp.dhs.gov",

  // Address for disputes of Treasury "Centralized Receivables Service" (CRS) bills.
  crsAddress: [
    "U.S. Department of Homeland Security",
    "U.S. Immigration & Customs Enforcement",
    "Voluntary Departure",
    "PO Box 19296",
    "Springfield, IL 62794-9296"
  ],

  // Helpful links shown to users.
  links: {
    resources: "https://noimmigrationfines.org/#resources",
    faq: "https://noimmigrationfines.org/#FAQs",
    faqEs: "https://noimmigrationfines.org/wp-content/uploads/2026/05/Practice-Advisory-Civil-Immigration-Fines-Pro-Se-rev-05-07-2026-Spanish.pdf",
    sampleNotices: "https://noimmigrationfines.org/#sample",
    crsDisputeForm: "https://noimmigrationfines.org/wp-content/uploads/2025/09/6-CRS-Dispute-Form.pdf",
    crsCoverLetter: "https://noimmigrationfines.org/wp-content/uploads/2025/09/7-CRS-Dispute-Cover-Letter_081925.docx",
    debtCollectorLetter: "https://library.nclc.org/companion-material/sample-dispute-letter",
    findLawyer: "https://www.immigrationadvocates.org/legaldirectory/",
    uspsTracking: "https://tools.usps.com/go/TrackConfirmAction_input"
  }
};
