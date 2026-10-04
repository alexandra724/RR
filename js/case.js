/* =====================================================================
   The legal content: notice types, deadlines, defenses, the facts the
   filer tells us, and the documents themselves (as simple "blocks" that
   js/render.js turns into PDF, Word, and on-screen previews).

   Opposition text follows the pro se model briefs at noimmigrationfines.org
   (rev. 05/07/2026): one template for INA §§ 274D/240B and one for
   INA § 275(b) / 8 U.S.C. § 1815.
   ===================================================================== */
(function () {
  "use strict";
  var U = window.U;
  var IFR_DATE = U.parseDate("2025-06-27");   // 8 C.F.R. part 281 interim final rule
  var OBBBA_DATE = U.parseDate("2025-07-04"); // 8 U.S.C. § 1815 enacted

  /* ---------------- Notice types ---------------- */

  var FINES = {
    "274D": {
      short: "INA § 274D",
      plain: "Fine for not leaving after a deportation (removal) order",
      law: "INA § 274D (willful failure to depart after a final order of removal)",
      template: "A"
    },
    "240B": {
      short: "INA § 240B",
      plain: "Fine for not leaving after voluntary departure",
      law: "INA § 240B (voluntary failure to depart after a voluntary departure order)",
      template: "A"
    },
    "275b": {
      short: "INA § 275(b)",
      plain: "Fine for entering without inspection",
      law: "INA § 275(b) (apprehended while entering, or attempting to enter, without inspection)",
      template: "B"
    },
    "1815": {
      short: "8 U.S.C. § 1815",
      plain: "Fee for being apprehended between ports of entry",
      law: "8 U.S.C. § 1815 (apprehension between ports of entry)",
      template: "B"
    }
  };

  var FORMS = {
    nvo: { name: "Notice of Violation and Order", tail: "NOTICE OF VIOLATION AND ORDER" },
    i79: { name: "Notice of Intention to Fine", tail: "NOTICE OF INTENTION TO FINE" },
    "1815": { name: "Notice of Fee Assessment Under 8 U.S.C. § 1815", tail: "NOTICE OF FEE ASSESSMENT" },
    none: { name: "fine notice", tail: "NOTICE OF INTENTION TO FINE" }
  };

  var INVOICE_FROM = {
    cbp: "U.S. Customs and Border Protection (CBP)",
    crs: "the Centralized Receivables Service (CRS) of the U.S. Department of the Treasury",
    collector: "a private debt collection company"
  };

  // Which notice the opposition answers (for a bill, the original notice if they have it).
  function docForm(n) {
    if (n.form === "invoice") return n.origForm || "none";
    return n.form;
  }

  function fineOf(n) {
    if (docForm(n) === "1815") return "1815";
    return n.fine;
  }

  function trackingLabel(n) {
    return fineOf(n) === "1815" ? "Fee Tracking Number" : "Penalty Tracking Number";
  }

  function isComplete(n) {
    return n && n.form && n.form !== "other" && fineOf(n) && FINES[fineOf(n)];
  }

  function noticeLabel(n, i) {
    var f = FINES[fineOf(n)];
    var label = "Notice " + (i + 1) + (f ? ": " + f.short + " — " + f.plain : "");
    if (n.tracking) label += " (" + U.clean(n.tracking) + ")";
    return label;
  }

  /* ---------------- Deadlines and where to send ---------------- */

  function deadline(n) {
    var nd = U.parseDate(n.noticeDate);
    if (n.form === "invoice") {
      var inv = U.parseDate(n.invoiceDate);
      if (!inv) return null;
      if (n.invoiceFrom === "cbp") {
        return { date: U.addDays(inv, 10), rule: "10 calendar days from the invoice date (it must be received by then)", by: "received" };
      }
      if (n.invoiceFrom === "crs") {
        return { date: U.addDays(inv, 30), rule: "30 days from the invoice date (check your bill — a “Past Due Notice” may give 60 days)", by: "received" };
      }
      return { date: U.addDays(inv, 30), rule: "30 days from the day you got the first letter from the debt collector", by: "received" };
    }
    if (!nd) return null;
    if (fineOf(n) === "1815") {
      return { date: U.addDays(nd, 30), rule: "30 days from the date on the notice", by: "received" };
    }
    if (nd >= IFR_DATE) {
      return { date: U.addBusinessDays(nd, 15), rule: "15 business days from the date of the notice (weekends and federal holidays do not count)", by: "postmarked" };
    }
    return { date: U.addDays(nd, 30), rule: "30 days from the date of the notice", by: "received" };
  }

  function isLate(n) {
    var d = deadline(n);
    return !!(d && d.date < U.today());
  }

  function destination(n) {
    var S = window.SITE;
    if (n.form === "invoice") {
      if (n.invoiceFrom === "cbp") return { method: "email", email: n.customEmail || S.emailCbpInvoice };
      if (n.invoiceFrom === "crs") return { method: "mail", lines: addressLines(n.customAddress) || S.crsAddress };
      return { method: "mail", lines: addressLines(n.customAddress) || [] };
    }
    if (fineOf(n) === "1815") return { method: "email", email: n.customEmail || S.email1815 };
    return { method: "mail", lines: (n.sameAddress === "no" && addressLines(n.customAddress)) || S.iceAddress };
  }

  function addressLines(s) {
    if (!s) return null;
    var lines = String(s).split(/\n/).map(U.clean).filter(Boolean);
    return lines.length ? lines : null;
  }

  /* ---------------- Defenses (the optional statements in paragraph 6) ---------------- */

  function arrivalBeforeJuly4(story) {
    var y = parseInt(story.arrivalYear, 10);
    if (!y) return false;
    if (y < 2025) return true;
    if (y > 2025) return false;
    var m = parseInt(story.arrivalMonth, 10);
    return !!m && m <= 6;
  }

  function defenseOptions(state, n) {
    var s = state.story || {};
    var fine = fineOf(n);
    var nd = U.parseDate(n.noticeDate) || U.parseDate(n.invoiceDate);
    var interior = s.whereStopped === "interior" || s.whereStopped === "never";
    var opts = [];
    if (fine === "274D") {
      var od = U.parseDate(n.orderDate);
      opts.push({
        key: "sol",
        text: "Also, the fine was issued to me more than five years after the removal order, so the fine is barred by the statute of limitations.",
        why: od ? "Your removal order date (" + U.fmtDate(od) + ") is " + (nd && U.addYears(od, 5) < nd ? "more" : "less") + " than 5 years before the notice." : "Check this only if your removal order was more than 5 years before the fine notice.",
        auto: !!(od && nd && U.addYears(od, 5) < nd)
      });
    }
    if (fine === "240B") {
      var end = U.parseDate(n.vdDeadline) || (U.parseDate(n.vdGrant) ? U.addDays(U.parseDate(n.vdGrant), 120) : null);
      opts.push({
        key: "sol",
        text: "Also, the fine was issued to me more than five years after the voluntary departure order, so the fine is barred by the statute of limitations.",
        why: end ? "Based on the dates you gave, your voluntary departure time ended about " + U.fmtDate(end) + "." : "Check this only if your voluntary departure order was more than 5 years before the fine notice.",
        auto: !!(end && nd && U.addYears(end, 5) < nd)
      });
    }
    if (fine === "275b") {
      opts.push({
        key: "interior",
        text: "I was fined in the interior of the U.S., not between ports of entry.",
        why: "Check this if immigration officers did not stop you right at the border.",
        auto: interior
      });
      opts.push({
        key: "afterEntry",
        text: "I was fined after I entered the U.S., not at the time I was entering or attempting to enter.",
        why: "Check this if you got the fine later, not while you were crossing the border.",
        auto: interior || s.howEntered === "visa" || s.howEntered === "port"
      });
    }
    if (fine === "1815") {
      opts.push({
        key: "interior",
        text: "I was fined in the interior of the U.S., not between ports of entry.",
        why: "Check this if immigration officers did not stop you right at the border.",
        auto: interior
      });
      opts.push({
        key: "before0704",
        text: "I entered the U.S. before July 4, 2025, the date that this law was enacted.",
        why: s.arrivalYear ? "You said you came in " + (s.arrivalMonth ? U.MONTHS[s.arrivalMonth - 1] + " " : "") + s.arrivalYear + "." : "Check this if you came to the U.S. before July 4, 2025.",
        auto: arrivalBeforeJuly4(s)
      });
    }
    opts.forEach(function (o) {
      var ov = n.def && n.def[o.key];
      o.on = ov === undefined ? o.auto : !!ov;
    });
    return opts;
  }

  /* ---------------- Facts: turning answers into sentences ---------------- */

  var APPS = [
    { key: "asylum", label: "Asylum, withholding of removal, or protection under the Convention Against Torture (CAT)", phrase: "I applied for protection in the United States (asylum, withholding of removal, or protection under the Convention Against Torture)." },
    { key: "tps", label: "TPS (Temporary Protected Status)", phrase: "I applied for Temporary Protected Status (TPS)." },
    { key: "uvisa", label: "U visa (for victims of crimes)", phrase: "I applied for a U visa." },
    { key: "tvisa", label: "T visa (for victims of trafficking)", phrase: "I applied for a T visa." },
    { key: "vawa", label: "VAWA self-petition (for victims of abuse by a U.S. citizen or permanent resident family member)", phrase: "I filed a VAWA self-petition." },
    { key: "family", label: "A family petition or green card (adjustment of status)", phrase: "I applied for lawful permanent residence based on a family or other immigrant petition." },
    { key: "sijs", label: "Special Immigrant Juvenile Status (SIJS)", phrase: "I applied for Special Immigrant Juvenile Status." },
    { key: "daca", label: "DACA", phrase: "I applied for Deferred Action for Childhood Arrivals (DACA)." },
    { key: "deferred", label: "Deferred action or parole (other than DACA)", phrase: "I applied for deferred action or parole." },
    { key: "mtr", label: "A motion to reopen my immigration case", phrase: "I filed a motion to reopen my immigration case." },
    { key: "appeal", label: "An appeal of my immigration case (to the Board of Immigration Appeals or a federal court)", phrase: "I appealed my immigration case." },
    { key: "stay", label: "A stay of removal (a request to stop my deportation)", phrase: "I asked for a stay of removal." }
  ];

  var STATUS_TEXT = {
    pending: " It is still pending (waiting for a decision).",
    approved: " It was approved.",
    denied: " It was denied."
  };

  function appSentences(s) {
    var out = [];
    var apps = s.apps || {};
    APPS.forEach(function (a) {
      var v = apps[a.key];
      if (!v || !v.on) return;
      out.push(a.phrase + (STATUS_TEXT[v.status] || ""));
    });
    if (apps.other && apps.other.on && U.clean(apps.other.text)) {
      out.push("I applied for " + U.clean(apps.other.text).replace(/\.$/, "") + "." + (STATUS_TEXT[apps.other.status] || ""));
    }
    return out;
  }

  function hasApps(s) {
    var apps = s.apps || {};
    return Object.keys(apps).some(function (k) { return apps[k] && apps[k].on; });
  }

  function departureFacts(state, n) {
    var s = state.story || {};
    var fine = fineOf(n);
    var orderWord = fine === "274D" ? "removal order" : "voluntary departure order";
    var out = [];
    if (s.knewOrder === "no") {
      var learned = U.parseDate(s.learnedOrderDate);
      out.push("I did not know about the " + orderWord + " in my case" + (learned ? " until " + U.fmtDate(learned) : " when it was entered") + ".");
    }
    if (s.minorAtOrder === "yes") {
      out.push("I was a child (under 18 years old) when the " + orderWord + " was entered.");
    }
    if (s.warned === "no") {
      out.push(fine === "274D"
        ? "No one ever warned me, including the immigration judge, that I could be fined for not leaving the United States."
        : "No one ever warned me, including the immigration judge, that I could be fined if I did not leave by my voluntary departure deadline.");
    }
    if (fine === "274D" && s.hadVD === "yes") {
      out.push("The immigration judge granted me voluntary departure." +
        (s.warnedDaily === "no" ? " I was never warned that I could face daily fines under INA § 274D." : ""));
    }
    if (s.supervision === "now") out.push("I am on an Order of Supervision with U.S. Immigration and Customs Enforcement (ICE).");
    if (s.supervision === "past") out.push("I was on an Order of Supervision with U.S. Immigration and Customs Enforcement (ICE).");
    if (s.checkins === "all") out.push("I have gone to all of my ICE check-ins.");
    if (s.checkins === "some") out.push("I have reported to ICE for check-ins.");
    if (s.isap === "now" || s.isap === "past") {
      var kinds = [];
      var t = s.isapTypes || {};
      if (t.ankle) kinds.push("an ankle monitor");
      if (t.app) kinds.push("a phone app for check-ins");
      if (t.calls) kinds.push("phone calls");
      if (t.visits) kinds.push("home visits");
      out.push((s.isap === "now" ? "I am" : "I was") + " in ICE’s Alternatives to Detention program (ISAP)" +
        (kinds.length ? ", which " + (s.isap === "now" ? "includes " : "included ") + U.joinList(kinds) : "") + ".");
    }
    if (s.custody === "yes") {
      out.push("After the " + orderWord + ", I was held in jail, prison, or immigration detention for a period of time, and I could not leave the United States on my own during that time." +
        (U.clean(s.custodyWhen) ? " This was " + U.clean(s.custodyWhen).replace(/\.$/, "") + "." : ""));
    }
    if (s.healthTravel === "yes") {
      out.push("Serious health problems have made it very hard or impossible for me to travel.");
    }
    var apps = appSentences(s);
    if (apps.length) {
      out = out.concat(apps);
      if (fine === "240B" && s.vawaCentral === "yes" && s.apps && s.apps.vawa && s.apps.vawa.on) {
        out.push("Battery or extreme cruelty was at least one central reason why I did not leave by my voluntary departure deadline. Under INA § 240B(d)(2), this penalty does not apply to me.");
      }
      out.push(fine === "274D"
        ? "I have been using the legal process available to me. I have not willfully refused to leave the United States."
        : "I have been using the legal process available to me. I did not voluntarily fail to depart.");
    }
    return out;
  }

  function entryFacts(state, n) {
    var s = state.story || {};
    var out = [];
    var nd = U.parseDate(n.noticeDate) || U.parseDate(n.invoiceDate);
    if (s.arrivalYear) {
      out.push("I came to the United States in " + (s.arrivalMonth ? U.MONTHS[s.arrivalMonth - 1] + " " : "") + s.arrivalYear + ".");
    }
    if (s.howEntered === "visa") {
      out.push("I entered the United States with a visa, after an immigration officer inspected me at an official port of entry.");
    } else if (s.howEntered === "port") {
      out.push("I came to an official port of entry, where an immigration officer inspected me and allowed me to enter the United States.");
    }
    var stop = U.parseDate(s.stopDate);
    if (s.whereStopped === "interior") {
      var place = U.clean(s.stopPlace);
      out.push("I was not apprehended while entering the United States. Immigration officers first stopped me" +
        (place ? " in " + place.replace(/\.$/, "") : "") + (stop ? " on or about " + U.fmtDate(stop) : "") +
        ", inside the United States and away from the border.");
      if (stop && nd && U.daysBetween(stop, nd) > 60) {
        out.push("The Notice is dated " + U.fmtDate(nd) + ", " + monthsPhrase(U.daysBetween(stop, nd)) + " after immigration officers first stopped me. I was not given this fine at the time I was apprehended.");
      }
    } else if (s.whereStopped === "never") {
      out.push("Immigration officers never apprehended me while I was entering the United States. I received the Notice while I was living inside the United States.");
    }
    return out.concat(appSentences(s));
  }

  function monthsPhrase(days) {
    var months = Math.floor(days / 30.4);
    if (months >= 24) return "more than " + Math.floor(months / 12) + " years";
    if (months >= 12) return "more than a year";
    return "more than " + U.plural(months, "month", "months");
  }

  function lifeFacts(state, n) {
    var s = state.story || {};
    var out = [];
    var t = FINES[fineOf(n)].template;
    if (t === "A" && s.arrivalYear) out.push("I have lived in the United States since " + s.arrivalYear + ".");

    var fam = [];
    if (s.spouse === "yes") fam.push("my spouse or partner");
    var kids = parseInt(s.children, 10) || 0;
    var usKids = Math.min(parseInt(s.usChildren, 10) || 0, kids);
    if (kids > 0) {
      var k = kids === 1 ? "my child" : "my " + U.numWord(kids) + " children";
      if (usKids > 0) {
        k += kids === 1 ? ", who is a U.S. citizen" : " (" + (usKids === kids ? (kids === 2 ? "both" : "all") + " of them are U.S. citizens" : U.numWord(usKids) + " of them " + (usKids === 1 ? "is a U.S. citizen" : "are U.S. citizens")) + ")";
      }
      fam.push(k);
    }
    var others = parseInt(s.otherDependents, 10) || 0;
    if (others > 0) fam.push(others === 1 ? "one other family member" : U.numWord(others) + " other family members");
    if (fam.length) out.push("My family depends on me. This includes " + U.joinList(fam) + ".");

    if (s.working === "yes") {
      var job = U.clean(s.job).replace(/\.$/, "");
      var inc = U.parseMoney(s.income);
      if (job) out.push("I work as " + (/^(a|an|the)\s/i.test(job) ? "" : (/^[aeiou]/i.test(job) ? "an " : "a ")) + job + ".");
      else out.push("I work.");
      if (inc !== null) out.push("I earn about " + U.fmtMoney(inc).replace(/\.00$/, "") + " per month.");
    } else if (s.working === "no") {
      out.push("I am not working right now" + (U.clean(s.notWorkingWhy) ? " because " + U.clean(s.notWorkingWhy).replace(/^because\s+/i, "").replace(/\.$/, "") : "") + ".");
    }
    if (s.leftover === "none") out.push("After I pay for rent, food, and other basic needs, I have no money left over.");
    if (s.leftover === "little") out.push("After I pay for rent, food, and other basic needs, I have very little money left over.");
    if (s.savings === "none") out.push("I have no savings.");
    if (s.savings === "small") out.push("I have less than $1,000 in savings.");
    if (s.taxes === "yes") out.push("I file taxes in the United States.");
    if (s.health === "yes" && U.clean(s.healthText)) out.push(U.sentence(s.healthText));
    return out;
  }

  function otherFacts(state) {
    var s = state.story || {};
    var out = [];
    if (U.clean(s.community)) out.push(U.sentence(s.community));
    if (U.clean(s.extra)) out.push(U.sentence(s.extra));
    return out;
  }

  // Returns paragraphs (arrays of sentences) of facts for this notice.
  function factParagraphs(state, n) {
    var t = FINES[fineOf(n)].template;
    var paras = [];
    var legal = t === "A" ? departureFacts(state, n) : entryFacts(state, n);
    if (legal.length) paras.push(legal);
    var life = lifeFacts(state, n);
    if (life.length) paras.push(life);
    var other = otherFacts(state);
    if (other.length) paras.push(other);
    return paras;
  }

  /* ---------------- Document blocks ---------------- */

  function fullName(p) { return U.clean((p.firstName || "") + " " + (p.middleName || "") + " " + (p.lastName || "")); }

  function streetLine(p) { return U.clean(p.street) + (U.clean(p.apt) ? ", " + U.clean(p.apt) : ""); }

  function cityLine(p) { return U.clean(p.city) + ", " + (p.state || "") + " " + U.clean(p.zip); }

  function fullAddress(p) { return streetLine(p) + ", " + cityLine(p); }

  function oppTitle(n) {
    return "PRO SE WRITTEN DEFENSE, ANSWER, AND BRIEF IN OPPOSITION TO IMPOSITION OF CIVIL PENALTY AND " + FORMS[docForm(n)].tail;
  }

  function P(runs, opts) {
    var b = { t: "p", runs: typeof runs === "string" ? [{ text: runs }] : runs };
    for (var k in opts) b[k] = opts[k];
    return b;
  }

  function buildOpposition(state, n) {
    var p = state.person;
    var name = fullName(p);
    var fine = fineOf(n);
    var F = FINES[fine];
    var form = docForm(n);
    var blocks = [];
    var num = 0;
    function para(text, extra) {
      num++;
      var b = P(typeof text === "string" ? [{ text: text }] : text, { num: num + ".", double: true });
      for (var k in extra) b[k] = extra[k];
      blocks.push(b);
    }
    function sub(label, text, level) {
      blocks.push(P(text, { label: label, level: level || 1, double: true }));
    }

    blocks.push({ t: "center", runs: [{ text: "U.S. DEPARTMENT OF HOMELAND SECURITY", b: true }], spaceAfter: 24 });
    blocks.push({ t: "caption", name: name, fileNo: "A# " + U.fmtANumber(p.aNumber), trackLabel: trackingLabel(n), track: U.clean(n.tracking) || "Not known" });
    blocks.push({ t: "title", text: oppTitle(n) });
    blocks.push({
      t: "fields", items: [
        ["Print Name", name],
        ["Street Address", streetLine(p)],
        ["City, State, Zip", cityLine(p)],
        ["Email (if any)", U.clean(p.email) || "None"]
      ]
    });
    blocks.push(P("I hereby declare under penalty of perjury, pursuant to 28 U.S. Code § 1746:", { spaceAfter: 12 }));

    para("My name is " + name + ". I live at " + fullAddress(p) + ".");

    var nd = U.parseDate(n.noticeDate);
    if (form === "none") {
      para("I am submitting this Opposition to the fine that the Department of Homeland Security (“DHS”) says I owe (“Notice”).");
    } else {
      para("I am submitting this Opposition to the " + FORMS[form].name + " (“Notice”) that I received from the Department of Homeland Security (“DHS”).");
    }
    if (nd) para("The Notice was dated " + U.fmtDate(nd) + ".");

    var post = U.parseDate(n.postmarkDate);
    var got = U.parseDate(n.receivedDate);
    if (n.delivery === "person" && got) {
      para("The Notice was given to me in person on " + U.fmtDate(got) + ".");
    } else if (post || got) {
      para((post ? "The Notice was sent to me on " + U.fmtDate(post) + "." : "") +
        (post && got ? " " : "") + (got ? "I received it on " + U.fmtDate(got) + "." : ""));
    }

    if (n.form === "invoice") {
      var inv = U.parseDate(n.invoiceDate);
      para("I also received " + (n.invoiceFrom === "collector" ? "a letter" : "an invoice") +
        (inv ? " dated " + U.fmtDate(inv) : "") + " from " + INVOICE_FROM[n.invoiceFrom] +
        " asking me to pay this fine. I dispute that I owe this money.");
    }

    if (isLate(n)) {
      var why = U.clean(state.story && state.story.lateReason).replace(/\.$/, "");
      para("To the extent this Opposition is considered late, I respectfully ask DHS to accept and consider it" +
        (why ? ", because " + why.replace(/^because\s+/i, "") : "") + ".");
    }

    para("The Notice says that I am supposed to pay fines in the amount of " + U.fmtMoney(U.parseMoney(n.amount)) + " (“Fines”).");

    var defs = defenseOptions(state, n).filter(function (o) { return o.on; });
    if (fine === "274D") {
      para("The Notice that I received was issued under " + F.law + ", but I did not willfully fail to depart.");
    } else if (fine === "240B") {
      para("The Notice that I received was issued under " + F.law + ", but I did not voluntarily fail to depart.");
    } else {
      para("The Notice that I received was issued under " + F.law + ".");
    }
    defs.forEach(function (o) { blocks.push(P(o.text, { level: 1, double: true })); });

    para("I do not have the financial means to pay the Fines, which are incredibly high and pose an unreasonable burden on me and my family.");

    factParagraphs(state, n).forEach(function (sentences) { para(sentences.join(" ")); });

    para("I understand that I may have defenses against the Fines, including:");
    var letters = "abcdefgh";
    var li = 0;
    if (F.template === "A") {
      sub(letters[li++] + ".", "The Fines in the Notice violate the Excessive Fines Clause of the Eighth Amendment to the U.S. Constitution.");
    }
    sub(letters[li++] + ".", "The Notice violates the guarantee of Due Process in the Fifth Amendment to the U.S. Constitution, in different possible ways, which may include things such as:");
    var dp = ["I do not meet the legal requirements to be fined."];
    if ((state.story || {}).warned !== "yes") dp.push("I was never warned that I might face Fines like these.");
    dp.push("DHS has provided no evidence with their Notice, and this keeps me from being able to respond in a meaningful way.");
    if (F.template === "A") dp.push("The Notice does not itemize the fines, and does not say when my alleged willfulness began, and this keeps me from being able to respond in a meaningful way.");
    dp.push("The Notice refers to defenses but does not say what factors would be considered for any defenses that I might have. This keeps me from being able to raise my defenses in a meaningful way.");
    dp.push("The decisions about the Fine were not made by a neutral fact finder. Instead, they were made by DHS, which is the same agency making the accusations against me, and which would also be the same agency deciding any appeal. This is fundamentally unfair.");
    var roman = ["i.", "ii.", "iii.", "iv.", "v.", "vi.", "vii."];
    dp.forEach(function (t, i) { sub(roman[i], t, 2); });
    sub(letters[li++] + ".", "The Notice violates my Seventh Amendment right to trial by jury by imposing civil penalties intended to punish me, and by doing so without a jury trial about whether I am liable for knowingly violating the law.");
    sub(letters[li++] + ".", "DHS is intentionally inflicting emotional distress on me through the Notice, by levying excessive, punitive, and grossly disproportionate Fines against me, and doing so with all the constitutional violations that I have listed here.");

    para("If DHS decides to fine me anyway, in spite of all the things I have said here, then the fines should be minimal because of mitigating factors in my case.");
    para("For all these reasons, DHS should withdraw the Fine in my case. If it fails to do so, it should at least significantly mitigate that Fine and impose only a minimal fine instead.");
    para("For the various violations of my rights detailed above, I reserve the right to bring legal actions under any applicable federal laws to protect my rights.");

    blocks.push(P("I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct.", { spaceBefore: 12, spaceAfter: 18, keepWithNext: true }));
    blocks.push({ t: "line", label: "Today’s date", value: "", keepWithNext: true });
    blocks.push({ t: "line", label: "My City and State", value: U.clean(p.city) + ", " + (p.state || ""), keepWithNext: true });
    blocks.push({
      t: "sig", lines: [
        ["Signature", ""],
        ["Printed Name", name],
        ["Address, Line 1", streetLine(p)],
        ["Address, Line 2", cityLine(p)]
      ]
    });

    if (state.translator && state.translator.used === "yes") {
      var tr = state.translator;
      blocks.push({ t: "pagebreak" });
      blocks.push({ t: "center", runs: [{ text: "CERTIFICATE OF TRANSLATION", b: true }], spaceAfter: 18 });
      blocks.push(P("I, " + U.clean(tr.name) + ", hereby declare that I am competent to translate between the " +
        U.clean(tr.language) + " and English languages. On ____________________, I read and translated aloud the foregoing " +
        oppTitle(n) + " to " + name + ", and believe that " + name + " understands the contents thereof.", { double: true, spaceAfter: 12 }));
      blocks.push(P("Pursuant to 28 U.S.C. § 1746, I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct.", { double: true, spaceAfter: 12 }));
      blocks.push({ t: "line", label: "Executed on", value: "" });
      blocks.push({
        t: "sig", lines: [
          ["Signature of Translator", ""],
          ["Printed Name", U.clean(tr.name)],
          ["Address, Line 1", U.clean(tr.street)],
          ["Address, Line 2", U.clean(tr.cityStateZip)]
        ]
      });
    }
    return blocks;
  }

  function buildCoverLetter(state, n) {
    var p = state.person;
    var name = fullName(p);
    var form = docForm(n);
    var dest = destination(n);
    var nd = U.parseDate(n.noticeDate);
    var inv = U.parseDate(n.invoiceDate);
    var track = U.clean(n.tracking);
    var blocks = [];

    var from = [name, streetLine(p), cityLine(p)];
    if (U.clean(p.phone)) from.push("Phone: " + U.clean(p.phone));
    if (U.clean(p.email)) from.push("Email: " + U.clean(p.email));
    from.forEach(function (l, i) { blocks.push(P(l, { spaceAfter: i === from.length - 1 ? 18 : 0 })); });

    blocks.push({ t: "line", label: "Date", value: "", spaceAfter: 18 });

    if (dest.method === "email") {
      blocks.push(P([{ text: "Sent by email to: ", b: true }, { text: dest.email }], { spaceAfter: 18 }));
    } else {
      (dest.lines.length ? dest.lines : ["[Write the address from your letter here]"]).forEach(function (l, i, arr) {
        blocks.push(P(l, { spaceAfter: i === arr.length - 1 ? 6 : 0 }));
      });
      blocks.push(P([{ text: "Sent by USPS Certified Mail No. ", i: true }, { text: "______________________________" }], { spaceAfter: 18 }));
    }

    var subject;
    if (n.form === "invoice") subject = "Written Dispute of " + (n.invoiceFrom === "collector" ? "Debt" : "Invoice") + " and Opposition to Civil Penalty";
    else if (form === "nvo") subject = "Notice of Appeal and Written Defense";
    else if (form === "i79") subject = "Written Defense in Response to Notice of Intention to Fine";
    else subject = "Written Dispute of Notice of Fee Assessment Under 8 U.S.C. § 1815";

    var re = [[{ text: "RE:  ", b: true }, { text: subject, b: true }]];
    re.push([{ text: "        Name: " }, { text: name }]);
    re.push([{ text: "        File No.: A# " + U.fmtANumber(p.aNumber) }]);
    if (track) re.push([{ text: "        " + trackingLabel(n) + ": " + track }]);
    if (nd) re.push([{ text: "        " + (form === "none" ? "Notice" : FORMS[form].name) + " dated " + U.fmtDate(nd) }]);
    if (n.form === "invoice") {
      re.push([{ text: "        " + (n.invoiceFrom === "collector" ? "Letter" : "Invoice") + (inv ? " dated " + U.fmtDate(inv) : "") + (U.clean(n.invoiceNumber) ? ", reference no. " + U.clean(n.invoiceNumber) : "") }]);
    }
    re.forEach(function (r, i) { blocks.push(P(r, { spaceAfter: i === re.length - 1 ? 18 : 0 })); });

    blocks.push(P("Dear Sir or Madam:", { spaceAfter: 12 }));

    var body = [];
    var nName = form === "none" ? "fine notice" : FORMS[form].name;
    var nRef = "the " + nName + (nd ? " dated " + U.fmtDate(nd) : "") + (track ? " (" + trackingLabel(n) + " " + track + ")" : "");
    if (n.form === "invoice") {
      body.push("I dispute this debt. I do not agree that I owe the civil penalty described in " +
        (n.invoiceFrom === "collector" ? "your letter" : "the invoice") + (inv ? " dated " + U.fmtDate(inv) : "") +
        ", which is based on " + nRef + ".");
      body.push("Enclosed is my Pro Se Written Defense, Answer, and Brief in Opposition, signed under penalty of perjury, which explains why I should not have to pay this fine.");
      if (n.invoiceFrom === "collector") {
        body.push("Under the Fair Debt Collection Practices Act, please stop collection until you send me verification of this debt, including copies of the documents showing that I owe it.");
      } else {
        body.push("I request to inspect and copy all records related to this debt, and I request a review of the determination that I owe this debt and of the amount due. Please do not take further collection action while my dispute is pending.");
      }
    } else if (form === "nvo") {
      body.push("I am appealing " + nRef + ". I deny the violation, and I do not admit that I owe this fine.");
      body.push("Enclosed is my Pro Se Written Defense, Answer, and Brief in Opposition, signed under penalty of perjury. Please consider it my written defense and part of my appeal.");
      body.push("I also request copies of pertinent documentation and records relevant to the penalty, under 8 C.F.R. § 281.1(e)(3).");
    } else if (form === "i79") {
      body.push("I am responding to " + nRef + ". I deny that I am liable for this fine.");
      body.push("Enclosed is my written defense under oath, setting forth the reasons why a fine should not be imposed, or if imposed, why it should be mitigated or remitted (8 C.F.R. § 280.12).");
      body.push("I also request copies of all documents and records that DHS relied on to issue this Notice.");
    } else {
      body.push("I dispute " + nRef + ". I do not agree that I owe this fee.");
      body.push("Attached is my Pro Se Written Defense, Answer, and Brief in Opposition, signed under penalty of perjury, which explains why the fee should not be imposed.");
      body.push("I also request to inspect and copy the records related to this debt.");
    }
    body.push("Please send all letters about this matter to me at the address above.");
    body.forEach(function (t) { blocks.push(P(t, { spaceAfter: 12, align: "justify" })); });

    blocks.push(P("Sincerely,", { spaceBefore: 6, spaceAfter: 30, keepWithNext: true }));
    blocks.push(P("____________________________________", { keepWithNext: true }));
    blocks.push(P(name, { spaceAfter: 18 }));

    var enc = ["Pro Se Written Defense, Answer, and Brief in Opposition"];
    if (state.translator && state.translator.used === "yes") enc.push("Certificate of Translation");
    if (n.form === "nvo") enc.push("Notice of Appeal page from the Notice of Violation and Order (filled out and signed)");
    if (n.form === "invoice") enc.push("Copy of the " + (n.invoiceFrom === "collector" ? "debt collection letter" : "invoice"));
    if (form !== "none") enc.push("Copy of the " + nName);
    blocks.push(P([{ text: "Enclosures:", b: true }], { keepWithNext: true }));
    enc.forEach(function (e, i) { blocks.push(P((i + 1) + ". " + e, { level: 1 })); });
    return blocks;
  }

  function emailText(state, n) {
    var p = state.person;
    var name = fullName(p);
    var form = docForm(n);
    var track = U.clean(n.tracking);
    var subject = (n.form === "invoice" ? "Dispute of Invoice" : "Dispute of Notice of Fee Assessment") +
      (track ? " - " + trackingLabel(n) + " " + track : "") + " - A# " + U.fmtANumber(p.aNumber) + " - " + name;
    var nd = U.parseDate(n.noticeDate);
    var lines = [
      "Dear Sir or Madam:",
      "",
      "My name is " + name + " (A# " + U.fmtANumber(p.aNumber) + ")." +
        (track ? " My " + trackingLabel(n) + " is " + track + "." : ""),
      "",
      n.form === "invoice"
        ? "I dispute the invoice I received and the civil penalty it is based on. I do not agree that I owe this money."
        : "I dispute the " + FORMS[form].name + (nd ? " dated " + U.fmtDate(nd) : "") + ". I do not agree that I owe this fee.",
      "",
      "Attached are:",
      "1. My signed cover letter and Pro Se Written Defense, Answer, and Brief in Opposition" +
        (state.translator && state.translator.used === "yes" ? ", with Certificate of Translation" : ""),
      "2. A copy of the " + (n.form === "invoice" ? "invoice" : "notice") + " I received",
      "",
      "I also request to inspect and copy the records related to this debt.",
      "",
      "Please confirm that you received this email.",
      "",
      "Sincerely,",
      name,
      streetLine(p),
      cityLine(p)
    ];
    if (U.clean(p.phone)) lines.push("Phone: " + U.clean(p.phone));
    return { to: destination(n).email, subject: subject, body: lines.join("\n") };
  }

  /* ---------------- Instructions ("what to do next") ---------------- */

  // Text uses **bold** markers; render.js turns them into bold text.
  function nextSteps(state, n, i) {
    var S = window.SITE;
    var p = state.person;
    var s = state.story || {};
    var form = docForm(n);
    var dest = destination(n);
    var dl = deadline(n);
    var late = isLate(n);
    var track = U.clean(n.tracking);
    var translator = state.translator && state.translator.used === "yes";
    var sections = [];

    var dlText;
    if (!dl) dlText = "We could not figure out your deadline. Look at your notice and send your papers as soon as possible.";
    else if (late) dlText = "Your deadline seems to have passed (**" + U.weekdayName(dl.date) + ", " + U.fmtDate(dl.date) + "**). **Send your papers anyway, as soon as you can.** Lawyers who work on these fines recommend it, so that your defenses are on the record.";
    else dlText = "Your papers must be **" + (dl.by === "postmarked" ? "mailed (postmarked)" : (dest.method === "email" ? "sent" : "received")) + " by " + U.weekdayName(dl.date) + ", " + U.fmtDate(dl.date) + "**. That is " + dl.rule + ". Do not wait until the last day.";
    sections.push({ title: "Your deadline", items: [dlText, "Deadlines are counted from the date printed on the notice, even if it reached you late. If you are not sure, send your papers right away."], box: true });

    var steps = [];
    steps.push({ title: "Read your papers carefully", items: [
      "Check that your name, A-Number, " + trackingLabel(n) + ", dates, and amount are correct.",
      "Make sure everything is **true**. When you sign, you are promising under **penalty of perjury** (lying is a crime) that it is true.",
      "If something is wrong, go back in the app, fix it, and download your papers again."
    ] });

    if (dest.method === "email") {
      steps.push({ title: "Print, sign, and scan", items: [
        "Print all pages. No printer? Try a public library, a print shop (like FedEx Office, Staples, or The UPS Store), or a community organization.",
        "Sign with blue or black ink: **the cover letter** (page 1, above your name) and **the written defense** (the “Signature” line on its last page). Write the date next to “Today’s date.”",
        translator ? "The person who translated for you must sign and date the **Certificate of Translation** (the last page)." : "",
        "Make a PDF of the signed pages with your phone: on iPhone use the **Notes** app (Scan Documents); on Android use **Google Drive** (Scan). Also scan or photograph **every page of your notice**.",
        "Can’t print? Some free phone apps (such as Adobe Fill & Sign) let you sign a PDF with your finger."
      ].filter(Boolean) });
      steps.push({ title: "Send the email", items: [
        "Send an email **to: " + dest.email + "**",
        "Use the subject line and message the app gives you (you can copy them on the last screen of the app).",
        "**Attach:** (1) your signed papers and (2) the copy of your notice" + (n.form === "invoice" ? " and bill" : "") + ".",
        "After you send it, check your “Sent” folder. Take a screenshot of the sent email and keep it. Save any reply you get."
      ] });
    } else {
      steps.push({ title: "Print and sign", items: [
        "Print every page, on one side of the paper. No printer? Try a public library, a print shop (like FedEx Office, Staples, or The UPS Store), or a community organization.",
        "Sign with blue or black ink: **the cover letter** (page 1, above your name) and **the written defense** (the “Signature” line on its last page). Write the date next to “Today’s date” and on the cover letter.",
        translator ? "The person who translated for you must sign and date the **Certificate of Translation** (the last page)." : ""
      ].filter(Boolean) });
      if (n.form === "nvo") {
        steps.push({ title: "Fill out the “Notice of Appeal” page of your notice", items: [
          "Your notice has a page called **NOTICE OF APPEAL** (usually the last page, page 4 of 4).",
          "In the space under “I am filing an appeal of a Notice of Violation and Order for the following reasons,” write: **“I deny the violation. Please see my attached written defense and brief.”**",
          "Check the box **“I have attached a separate written brief or statement.”** If you are also sending copies of documents (see the next step), check **“I have attached additional documentary evidence.”**",
          "Sign and date it. Fill in: Printed Name **" + fullName(p) + "**, File Number **" + U.fmtANumber(p.aNumber) + "**, Penalty Tracking Number **" + (track || "(from your notice)") + "**, your mailing address, phone, and email.",
          "If you do not have this page anymore, still send your papers. Your cover letter says that you are appealing."
        ] });
      }
      var proof = ["a copy of **your notice** (all pages)"];
      if (n.form === "invoice") proof.push("a copy of **the bill or letter** you got");
      if (s.supervision === "now" || s.supervision === "past") proof.push("your **Order of Supervision**");
      if (s.checkins === "all" || s.checkins === "some") proof.push("papers showing your **ICE check-ins**");
      if (s.isap === "now" || s.isap === "past") proof.push("your **ISAP** papers");
      if (hasApps(s)) proof.push("**receipts or decisions** for your immigration applications");
      if (s.health === "yes" || s.healthTravel === "yes") proof.push("**letters from doctors** or medical records");
      if (s.working === "yes" || s.working === "no") proof.push("proof of your income, like **pay stubs or a tax return**");
      if ((parseInt(s.usChildren, 10) || 0) > 0) proof.push("**birth certificates** of your U.S. citizen children");
      steps.push({ title: "Add copies of papers that support what you said (optional, but helpful)", items: [
        "You can include " + U.joinList(proof) + ".",
        "**Send copies only — never originals.** Keep all your original papers.",
        "Do not send anything you are not comfortable with the government seeing. If you are unsure, ask a lawyer."
      ] });
      steps.push({ title: "Make a copy of everything for yourself", items: [
        "Before you mail it, copy (or take clear phone photos of) **every page** you are sending, including the signed pages. Keep them in a safe place with your notice."
      ] });
      steps.push({ title: "Mail it at the post office", items: [
        n.form === "invoice" ? "Check your bill or letter for the address where disputes must be sent. If it is different from the address below, go back in the app and change it." : "",
        "Put everything in a large envelope. Write your address in the top-left corner.",
        "Mail it **to:** " + (dest.lines.length ? dest.lines.join(", ") : "the address on your letter") + ".",
        "At the post office counter, ask for **Certified Mail with Return Receipt** (or **Priority Mail Express**). These give you proof of mailing and a tracking number. Use the U.S. Postal Service, not FedEx or UPS.",
        "Write the Certified Mail number on your copy of the cover letter. **Keep the receipt.**",
        dl && !late ? "Mail it **by " + U.fmtDate(dl.date) + "**." : "Mail it as soon as possible."
      ].filter(Boolean) });
      steps.push({ title: "Track it and keep your proof", items: [
        "Track your envelope at " + S.links.uspsTracking + " using your tracking number.",
        "When the green Return Receipt card comes back, keep it with your copies."
      ] });
    }
    sections.push({ title: "Step by step", steps: steps });

    var after = [];
    if (n.form !== "invoice" && form === "nvo") {
      after.push("A supervisory officer (someone who did not make the first decision) will review your appeal. Your notice says they will usually decide within **45 days** after your appeal is filed.");
      after.push("They may ask you for more information. If they do, you must answer within **15 days**. Open all mail from DHS right away.");
      after.push("If they agree with you, you will get a paper saying the fine is **reversed, cancelled, or rescinded**. Keep it forever.");
      after.push("If they do not agree, you will get an **Appeal Decision and Order**, and later a bill. There is no other appeal inside DHS, but you may be able to challenge it in **federal court**. Talk to a lawyer quickly if this happens.");
    } else if (n.form !== "invoice" && form === "i79") {
      after.push("An officer will review your written defense and decide. Open all mail from DHS right away.");
      after.push("If you lose, you may be able to appeal to the Board of Immigration Appeals (BIA) on **Form EOIR-29** (not EOIR-26). Follow the instructions on the decision and get a lawyer’s help if you can.");
    } else if (n.form !== "invoice") {
      after.push("CBP will review your dispute. Check your email often, including your spam or junk folder, and open all mail from DHS right away.");
    } else {
      after.push("Wait for an answer, and open all mail and email right away. Keep paying attention to any new deadlines in letters you get.");
    }
    sections.push({ title: "What happens next", items: after });

    sections.push({ title: "If you get a bill (invoice) later", items: [
      "**Do not ignore it.** Bills can come from U.S. Customs and Border Protection (CBP), the Department of the Treasury’s Centralized Receivables Service (CRS), or a private debt collector.",
      "**Bill from CBP:** you can dispute it in writing by email to **" + S.emailCbpInvoice + "** within **10 calendar days** of the invoice date. Include your Penalty Tracking Number and send these same papers again.",
      "**Bill from CRS (Treasury):** use the free CRS Dispute Form and cover letter: " + S.links.crsDisputeForm + " and " + S.links.crsCoverLetter,
      "**Letter from a private debt collector:** send them a dispute letter right away (sample: " + S.links.debtCollectorLetter + "). The law says they must pause collection when you dispute the debt.",
      "This app can also make dispute papers for a bill — start a new notice and choose “A bill (invoice) or past-due notice.”"
    ] });

    sections.push({ title: "Important to know", items: [
      "**Should I just pay?** Talk to a lawyer first. DHS may treat payment as admitting that you did something wrong. If you do pay, write **“Payment under protest, with reservation of rights”** on your check or money order.",
      "**Is it risky to fight the fine?** It is up to DHS to prove the fine is justified. The lawyers at noimmigrationfines.org encourage people to file an opposition and raise their defenses.",
      "**If you move,** tell ICE (and the immigration court or USCIS, if you have a case there) your new address right away, so you do not miss important letters.",
      (fineOf(n) === "274D" || fineOf(n) === "240B") ? "**Lawsuit:** A class action, Maria L. v. Noem (D. Mass.), challenges INA § 274D and § 240B fines. Check noimmigrationfines.org for updates." : ""
    ].filter(Boolean) });

    var help = ["Questions and answers about these fines: " + S.links.faq, "Find free or low-cost legal help: " + S.links.findLawyer];
    var contact = [S.contactName, S.contactPhone, S.contactEmail, S.contactWebsite].map(U.clean).filter(Boolean);
    if (contact.length) help.unshift("Contact us: " + contact.join(" · "));
    sections.push({ title: "Get help", items: help });
    return sections;
  }

  window.Case = {
    FINES: FINES, FORMS: FORMS, APPS: APPS, INVOICE_FROM: INVOICE_FROM, IFR_DATE: IFR_DATE, OBBBA_DATE: OBBBA_DATE,
    docForm: docForm, fineOf: fineOf, trackingLabel: trackingLabel, isComplete: isComplete, noticeLabel: noticeLabel,
    deadline: deadline, isLate: isLate, destination: destination, defenseOptions: defenseOptions,
    factParagraphs: factParagraphs, fullName: fullName, buildOpposition: buildOpposition,
    buildCoverLetter: buildCoverLetter, emailText: emailText, nextSteps: nextSteps, hasApps: hasApps
  };
})();
