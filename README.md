# Immigration Fine Helper

A free, private website that helps a person **without a lawyer** make the papers to oppose a DHS immigration fine under **INA § 274D, INA § 240B, INA § 275(b), or 8 U.S.C. § 1815**. It also handles bills for those fines from CBP, Treasury (CRS), or a debt collector.

The person answers simple questions. The site then makes:

1. A **cover letter**. For a Form 281 notice it doubles as the written notice of appeal. Every version requests DHS's records.
2. The **Pro Se Written Defense, Answer, and Brief in Opposition**, a sworn declaration under 28 U.S.C. § 1746. It is based on the pro se model briefs from noimmigrationfines.org (rev. 05/07/2026).
3. A **Certificate of Translation**, if someone translated for them.
4. **Step-by-step instructions** tailored to their notice: deadline, signing, the Form 281 "Notice of Appeal" page, mailing or emailing, what happens next, and what to do about later bills.

Papers download as a **PDF ready to print** and as a **Word file** for editing.

**Privacy:** there is no server and no database. Everything happens in the person's own browser, and nothing they type is sent anywhere. Answers are saved only on their device, and they can erase them at any time.

---

## Part 1 — Put the website online (about 5 minutes, free)

You only do this once.

1. Go to **https://github.com/alexandra724/RR/settings/pages** (you must be logged in to GitHub).
2. Under **"Build and deployment"** → **"Source"**, choose **"Deploy from a branch"**.
3. Under **"Branch"**, click the drop-down and choose **`claude/affectionate-franklin-3ii7dw`**. Next to it, leave **`/ (root)`**. Click **Save**.
4. Wait 1–3 minutes, then refresh the page. A box will appear at the top: **"Your site is live at https://alexandra724.github.io/RR/"**.
5. Click the link. That is your website. Share that link with anyone who needs it.

> **Tip:** Later you can merge this branch into `main` (GitHub will offer a green "Compare & pull request" button) and pick `main` in step 3 instead. Either works.

### Optional: use your own web address (like `finehelp.yourfirm.com`)
On the same **Settings → Pages** screen, type your address under **"Custom domain"** and click **Save**. GitHub will show you the one DNS record to add at the company where you bought your domain (GoDaddy, Squarespace, etc.). Then check **"Enforce HTTPS."**

### Another option: Netlify (drag and drop, no GitHub settings)
1. On the repository's main page, click the green **Code** button → **Download ZIP**, then unzip it.
2. Go to **https://app.netlify.com/drop** and drag the unzipped folder onto the page.
3. Netlify gives you a link right away. Create a free account to keep the site permanently.

---

## Part 2 — Put your own name and contact information on it

Everything you are likely to change is in **one file: `settings.js`**.

1. On GitHub, click **`settings.js`**, then the **pencil icon ✏️** (top right of the file).
2. Change the text **between the quote marks**, for example `providedBy: "Provided by the Law Office of Jane Doe",`
   - Keep the quote marks and the comma at the end of each line.
   - Leave a line as `""` to hide it.
3. Click **"Commit changes…"** → **"Commit changes."** The website updates by itself in 1–2 minutes.

In `settings.js` you can change:

- The site name and tagline.
- "Provided by" and your contact phone, email, and website.
- The **ICE mailing address**, the **CBP email addresses**, and the CRS address. Update these if DHS changes them.
- The "last reviewed" date and all the help links.

---

## Part 3 — Test it yourself

1. Open your website and click **Start**. Pretend to be a client with a Form 281 / § 274D notice.
2. On the last screen, download the **papers**, the **instructions**, and the **Word version**.
3. Try it on your **phone** too. Most users will use a phone.
4. Sample output for a fictional person is in the **`examples/`** folder, if you want to review the papers without clicking through.

---

## For the reviewing attorney — legal content choices

The opposition text follows the two pro se model briefs: **Template A** for §§ 274D/240B and **Template B** for § 275(b) / § 1815. The defense list (Eighth, Fifth, and Seventh Amendments, and IIED) is verbatim. Please review these choices:

| Choice | Why |
|---|---|
| A closing "I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct" was added before the signature. | The opening line of the template doesn't include the "true and correct" language that 28 U.S.C. § 1746 calls for. |
| The notice's actual title is used in the brief title, ¶ 2, and the caption ("Notice of Violation and Order", "Notice of Fee Assessment", or "Notice of Intention to Fine"). For § 1815, the caption says "Fee Tracking Number." | The templates say "Notice of Intention to Fine" for every notice. Matching the paper the person actually got avoids confusion. |
| Paragraph 6 is written as plain sentences instead of check boxes. Only the fine that applies and the sub-defenses the person confirms are included. | Defaults are pre-checked from their answers: statute of limitations from the order date (or the voluntary departure date + 120 days) vs. the notice date; interior apprehension; entry before 7/4/2025; fined after entry. The person confirms each one on the Review screen. |
| Due Process item "ii. I was never warned…" is **left out** if the person said they *were* warned. | The document is sworn. |
| The facts paragraphs are built from guided questions. | **Template A topics:** knowledge of the order, warnings, voluntary departure without a § 274D daily-fine warning, being a minor, Order of Supervision, check-ins, ISAP, custody, health, applications/motions/stays, and the VAWA § 240B(d)(2) exception. **Template B topics:** arrival date, entry with a visa or inspection at a port, interior apprehension, and the delay between apprehension and the notice. **Both:** family, income, savings, taxes, health, community, and free text. |
| **Nothing is ever written that admits entry without inspection.** | The entry questions say "you do not have to answer." Only helpful answers (visa, inspected at a port, stopped in the interior) produce sentences. |
| If the deadline has passed, a paragraph asks DHS to accept the late filing, with the person's reason if they give one. | Follows the advisory: file even after the deadline. |
| Cover letters request records: 8 C.F.R. § 281.1(e)(3) for Form 281, a general request for I‑79, and the notice's own "inspect and copy records" language for § 1815 and invoices. The Form 281 cover letter also states the appeal and "I deny the violation." | This also covers anyone who lost the Notice of Appeal page. |
| Deadlines are counted from the date on the notice. | **On or after 6/27/2025:** 15 business days, skipping weekends and federal holidays. **Before 6/27/2025:** 30 days. **§ 1815:** 30 days. **Bills:** CBP 10 days, CRS 30 days, debt collector 30 days. Users are told to file even if the deadline has passed. |
| Signature and date lines are left blank for wet-ink signing. | — |

**To change the legal text:** all wording for the documents and instructions is in **`js/case.js`**. The brief is in `buildOpposition`, the cover letters in `buildCoverLetter`, the facts sentences in `departureFacts` / `entryFacts` / `lifeFacts`, and the instructions in `nextSteps`. The questions themselves are in **`js/app.js`**.

---

## Files

```
index.html        the page
settings.js       ← your settings (edit this)
css/style.css     look and feel
js/util.js        dates, deadlines, federal holidays, formatting
js/case.js        legal content: notices, deadlines, defenses, facts, documents, instructions
js/render.js      makes the PDF, Word file, and on-screen previews
js/app.js         the step-by-step questions
vendor/           PDF and Word libraries (pdfmake, docx), MIT licensed; see vendor/LICENSES.txt
examples/         sample output for a fictional person
```

No build step, no server, and no outside services. The site works on any static web host.

*This tool provides general information and document assistance. It is not legal advice.*
