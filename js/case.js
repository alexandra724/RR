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

  var T = U.T;

  var FINES = {
    "274D": {
      short: "INA § 274D",
      plain: "Fine for not leaving after a deportation (removal) order",
      plainEs: "Multa por no salir después de una orden de deportación (remoción)",
      law: "INA § 274D (willful failure to depart after a final order of removal)",
      template: "A"
    },
    "240B": {
      short: "INA § 240B",
      plain: "Fine for not leaving after voluntary departure",
      plainEs: "Multa por no salir después de la salida voluntaria",
      law: "INA § 240B (voluntary failure to depart after a voluntary departure order)",
      template: "A"
    },
    "275b": {
      short: "INA § 275(b)",
      plain: "Fine for entering without inspection",
      plainEs: "Multa por entrar sin inspección",
      law: "INA § 275(b) (apprehended while entering, or attempting to enter, without inspection)",
      template: "B"
    },
    "1815": {
      short: "8 U.S.C. § 1815",
      plain: "Fee for being apprehended between ports of entry",
      plainEs: "Cargo por ser detenido entre puertos de entrada",
      law: "8 U.S.C. § 1815 (apprehension between ports of entry)",
      template: "B"
    }
  };

  // Names of the notices as printed on them (used in the English papers).
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

  // Shown on screen and in the instructions, so it follows the chosen language.
  function noticeLabel(n, i) {
    var f = FINES[fineOf(n)];
    var label = T("Notice ", "Aviso ") + (i + 1) + (f ? ": " + f.short + " — " + T(f.plain, f.plainEs) : "");
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
        return { date: U.addDays(inv, 10), by: "received",
          rule: "10 calendar days from the invoice date (it must be received by then)",
          ruleEs: "10 días calendario desde la fecha de la factura (debe llegar antes de esa fecha)" };
      }
      if (n.invoiceFrom === "crs") {
        return { date: U.addDays(inv, 30), by: "received",
          rule: "30 days from the invoice date (check your bill — a “Past Due Notice” may give 60 days)",
          ruleEs: "30 días desde la fecha de la factura (revise su factura: un “Past Due Notice” puede dar 60 días)" };
      }
      return { date: U.addDays(inv, 30), by: "received",
        rule: "30 days from the day you got the first letter from the debt collector",
        ruleEs: "30 días desde el día en que recibió la primera carta del cobrador de deudas" };
    }
    if (!nd) return null;
    if (fineOf(n) === "1815") {
      return { date: U.addDays(nd, 30), by: "received",
        rule: "30 days from the date on the notice",
        ruleEs: "30 días desde la fecha del aviso" };
    }
    if (nd >= IFR_DATE) {
      return { date: U.addBusinessDays(nd, 15), by: "postmarked",
        rule: "15 business days from the date of the notice (weekends and federal holidays do not count)",
        ruleEs: "15 días hábiles desde la fecha del aviso (no cuentan los fines de semana ni los días feriados federales)" };
    }
    return { date: U.addDays(nd, 30), by: "received",
      rule: "30 days from the date of the notice",
      ruleEs: "30 días desde la fecha del aviso" };
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

  /* ---------------- Defenses (the optional statements in paragraph 6) ----------------
     "text" goes into the English papers. "es" is a Spanish explanation shown on screen. */

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
      var odOld = !!(od && nd && U.addYears(od, 5) < nd);
      opts.push({
        key: "sol",
        text: "Also, the fine was issued to me more than five years after the removal order, so the fine is barred by the statute of limitations.",
        es: "Además, la multa se me impuso más de cinco años después de la orden de deportación, así que ya pasó el plazo legal (prescripción) para multarme.",
        why: od
          ? T("Your removal order date (" + U.fmtDateUI(od) + ") is " + (odOld ? "more" : "less") + " than 5 years before the notice.",
              "La fecha de su orden de deportación (" + U.fmtDateUI(od) + ") es " + (odOld ? "más" : "menos") + " de 5 años antes del aviso.")
          : T("Check this only if your removal order was more than 5 years before the fine notice.",
              "Marque esto solo si su orden de deportación fue más de 5 años antes del aviso de multa."),
        auto: odOld
      });
    }
    if (fine === "240B") {
      var end = U.parseDate(n.vdDeadline) || (U.parseDate(n.vdGrant) ? U.addDays(U.parseDate(n.vdGrant), 120) : null);
      opts.push({
        key: "sol",
        text: "Also, the fine was issued to me more than five years after the voluntary departure order, so the fine is barred by the statute of limitations.",
        es: "Además, la multa se me impuso más de cinco años después de la orden de salida voluntaria, así que ya pasó el plazo legal (prescripción) para multarme.",
        why: end
          ? T("Based on the dates you gave, your voluntary departure time ended about " + U.fmtDateUI(end) + ".",
              "Según las fechas que nos dio, su plazo de salida voluntaria terminó alrededor del " + U.fmtDateUI(end) + ".")
          : T("Check this only if your voluntary departure order was more than 5 years before the fine notice.",
              "Marque esto solo si su orden de salida voluntaria fue más de 5 años antes del aviso de multa."),
        auto: !!(end && nd && U.addYears(end, 5) < nd)
      });
    }
    if (fine === "275b") {
      opts.push({
        key: "interior",
        text: "I was fined in the interior of the U.S., not between ports of entry.",
        es: "Me multaron dentro de los Estados Unidos, no entre puertos de entrada (no en la frontera).",
        why: T("Check this if immigration officers did not stop you right at the border.",
               "Marque esto si los oficiales de inmigración no lo detuvieron en la frontera misma."),
        auto: interior
      });
      opts.push({
        key: "afterEntry",
        text: "I was fined after I entered the U.S., not at the time I was entering or attempting to enter.",
        es: "Me multaron después de entrar a los Estados Unidos, no en el momento en que estaba entrando o intentando entrar.",
        why: T("Check this if you got the fine later, not while you were crossing the border.",
               "Marque esto si recibió la multa después, no mientras cruzaba la frontera."),
        auto: interior || s.howEntered === "visa" || s.howEntered === "port"
      });
    }
    if (fine === "1815") {
      opts.push({
        key: "interior",
        text: "I was fined in the interior of the U.S., not between ports of entry.",
        es: "Me multaron dentro de los Estados Unidos, no entre puertos de entrada (no en la frontera).",
        why: T("Check this if immigration officers did not stop you right at the border.",
               "Marque esto si los oficiales de inmigración no lo detuvieron en la frontera misma."),
        auto: interior
      });
      opts.push({
        key: "before0704",
        text: "I entered the U.S. before July 4, 2025, the date that this law was enacted.",
        es: "Entré a los Estados Unidos antes del 4 de julio de 2025, la fecha en que se aprobó esta ley.",
        why: s.arrivalYear
          ? T("You said you came in " + (s.arrivalMonth ? U.MONTHS[s.arrivalMonth - 1] + " " : "") + s.arrivalYear + ".",
              "Usted dijo que llegó en " + (s.arrivalMonth ? U.MONTHS_ES[s.arrivalMonth - 1] + " de " : "") + s.arrivalYear + ".")
          : T("Check this if you came to the U.S. before July 4, 2025.",
              "Marque esto si llegó a los Estados Unidos antes del 4 de julio de 2025."),
        auto: arrivalBeforeJuly4(s)
      });
    }
    opts.forEach(function (o) {
      var ov = n.def && n.def[o.key];
      o.on = ov === undefined ? o.auto : !!ov;
    });
    return opts;
  }

  /* ---------------- Facts: turning answers into sentences ----------------
     Each fact is a pair: { en: sentence for the English papers,
                            es: the same sentence in Spanish, shown on screen only }. */

  function F(en, es) { return { en: en, es: es }; }

  // Text the person typed is used as-is in both languages.
  function typed(s) { var t = U.sentence(s); return F(t, t); }

  var APPS = [
    { key: "asylum",
      label: "Asylum, withholding of removal, or protection under the Convention Against Torture (CAT)",
      labelEs: "Asilo, suspensión de la deportación (withholding of removal) o protección bajo la Convención contra la Tortura (CAT)",
      phrase: "I applied for protection in the United States (asylum, withholding of removal, or protection under the Convention Against Torture).",
      phraseEs: "Solicité protección en los Estados Unidos (asilo, suspensión de la deportación o protección bajo la Convención contra la Tortura)." },
    { key: "tps", label: "TPS (Temporary Protected Status)", labelEs: "TPS (Estatus de Protección Temporal)",
      phrase: "I applied for Temporary Protected Status (TPS).", phraseEs: "Solicité el Estatus de Protección Temporal (TPS)." },
    { key: "uvisa", label: "U visa (for victims of crimes)", labelEs: "Visa U (para víctimas de delitos)",
      phrase: "I applied for a U visa.", phraseEs: "Solicité una visa U." },
    { key: "tvisa", label: "T visa (for victims of trafficking)", labelEs: "Visa T (para víctimas de trata de personas)",
      phrase: "I applied for a T visa.", phraseEs: "Solicité una visa T." },
    { key: "vawa",
      label: "VAWA self-petition (for victims of abuse by a U.S. citizen or permanent resident family member)",
      labelEs: "Autopetición de VAWA (para víctimas de abuso por un familiar ciudadano o residente permanente)",
      phrase: "I filed a VAWA self-petition.", phraseEs: "Presenté una autopetición de VAWA." },
    { key: "family", label: "A family petition or green card (adjustment of status)",
      labelEs: "Una petición familiar o la residencia (green card / ajuste de estatus)",
      phrase: "I applied for lawful permanent residence based on a family or other immigrant petition.",
      phraseEs: "Solicité la residencia permanente con base en una petición familiar u otra petición de inmigrante." },
    { key: "sijs", label: "Special Immigrant Juvenile Status (SIJS)", labelEs: "Estatus Especial de Inmigrante Juvenil (SIJS)",
      phrase: "I applied for Special Immigrant Juvenile Status.", phraseEs: "Solicité el Estatus Especial de Inmigrante Juvenil." },
    { key: "daca", label: "DACA", labelEs: "DACA",
      phrase: "I applied for Deferred Action for Childhood Arrivals (DACA).", phraseEs: "Solicité la Acción Diferida para los Llegados en la Infancia (DACA)." },
    { key: "deferred", label: "Deferred action or parole (other than DACA)", labelEs: "Acción diferida o parole (que no sea DACA)",
      phrase: "I applied for deferred action or parole.", phraseEs: "Solicité acción diferida o parole." },
    { key: "mtr", label: "A motion to reopen my immigration case", labelEs: "Una moción para reabrir mi caso de inmigración",
      phrase: "I filed a motion to reopen my immigration case.", phraseEs: "Presenté una moción para reabrir mi caso de inmigración." },
    { key: "appeal",
      label: "An appeal of my immigration case (to the Board of Immigration Appeals or a federal court)",
      labelEs: "Una apelación de mi caso de inmigración (a la Junta de Apelaciones de Inmigración o a una corte federal)",
      phrase: "I appealed my immigration case.", phraseEs: "Apelé mi caso de inmigración." },
    { key: "stay", label: "A stay of removal (a request to stop my deportation)",
      labelEs: "Una suspensión de la deportación (stay of removal: una solicitud para detener mi deportación)",
      phrase: "I asked for a stay of removal.", phraseEs: "Pedí una suspensión de la deportación (stay of removal)." }
  ];

  var STATUS_TEXT = {
    pending: F(" It is still pending (waiting for a decision).", " Todavía está pendiente (esperando una decisión)."),
    approved: F(" It was approved.", " Fue aprobada."),
    denied: F(" It was denied.", " Fue negada.")
  };

  function withStatus(base, status) {
    var st = STATUS_TEXT[status];
    return F(base.en + (st ? st.en : ""), base.es + (st ? st.es : ""));
  }

  function appSentences(s) {
    var out = [];
    var apps = s.apps || {};
    APPS.forEach(function (a) {
      var v = apps[a.key];
      if (!v || !v.on) return;
      out.push(withStatus(F(a.phrase, a.phraseEs), v.status));
    });
    if (apps.other && apps.other.on && U.clean(apps.other.text)) {
      var what = U.clean(apps.other.text).replace(/\.$/, "");
      out.push(withStatus(F("I applied for " + what + ".", "Solicité: " + what + "."), apps.other.status));
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
    var is274 = fine === "274D";
    var orderEn = is274 ? "removal order" : "voluntary departure order";
    var orderEs = is274 ? "la orden de deportación" : "la orden de salida voluntaria";
    var out = [];
    if (s.knewOrder === "no") {
      var learned = U.parseDate(s.learnedOrderDate);
      out.push(F("I did not know about the " + orderEn + " in my case" + (learned ? " until " + U.fmtDate(learned) : " when it was entered") + ".",
        "No sabía de " + orderEs + " en mi caso" + (learned ? " hasta el " + U.fmtDateUI(learned) : " cuando se dictó") + "."));
    }
    if (s.minorAtOrder === "yes") {
      out.push(F("I was a child (under 18 years old) when the " + orderEn + " was entered.",
        "Yo era menor de edad (menos de 18 años) cuando se dictó " + orderEs + "."));
    }
    if (s.warned === "no") {
      out.push(is274
        ? F("No one ever warned me, including the immigration judge, that I could be fined for not leaving the United States.",
            "Nadie me advirtió nunca, ni siquiera el juez de inmigración, que me podían multar por no salir de los Estados Unidos.")
        : F("No one ever warned me, including the immigration judge, that I could be fined if I did not leave by my voluntary departure deadline.",
            "Nadie me advirtió nunca, ni siquiera el juez de inmigración, que me podían multar si no salía antes de la fecha límite de mi salida voluntaria."));
    }
    if (is274 && s.hadVD === "yes") {
      var noDaily = s.warnedDaily === "no";
      out.push(F("The immigration judge granted me voluntary departure." + (noDaily ? " I was never warned that I could face daily fines under INA § 274D." : ""),
        "El juez de inmigración me concedió la salida voluntaria." + (noDaily ? " Nunca me advirtieron que podía recibir multas diarias bajo la sección 274D de la INA." : "")));
    }
    if (s.supervision === "now") out.push(F("I am on an Order of Supervision with U.S. Immigration and Customs Enforcement (ICE).", "Estoy bajo una Orden de Supervisión de ICE."));
    if (s.supervision === "past") out.push(F("I was on an Order of Supervision with U.S. Immigration and Customs Enforcement (ICE).", "Estuve bajo una Orden de Supervisión de ICE."));
    if (s.checkins === "all") out.push(F("I have gone to all of my ICE check-ins.", "He ido a todas mis citas de control (check-ins) con ICE."));
    if (s.checkins === "some") out.push(F("I have reported to ICE for check-ins.", "Me he presentado ante ICE para mis citas de control (check-ins)."));
    if (s.isap === "now" || s.isap === "past") {
      var kEn = [], kEs = [];
      var t = s.isapTypes || {};
      if (t.ankle) { kEn.push("an ankle monitor"); kEs.push("un grillete electrónico"); }
      if (t.app) { kEn.push("a phone app for check-ins"); kEs.push("una aplicación del teléfono para reportarme"); }
      if (t.calls) { kEn.push("phone calls"); kEs.push("llamadas telefónicas"); }
      if (t.visits) { kEn.push("home visits"); kEs.push("visitas a mi casa"); }
      var now = s.isap === "now";
      out.push(F((now ? "I am" : "I was") + " in ICE’s Alternatives to Detention program (ISAP)" +
          (kEn.length ? ", which " + (now ? "includes " : "included ") + U.joinList(kEn) : "") + ".",
        (now ? "Estoy" : "Estuve") + " en el programa de Alternativas a la Detención de ICE (ISAP)" +
          (kEs.length ? ", que " + (now ? "incluye " : "incluía ") + U.joinListEs(kEs) : "") + "."));
    }
    if (s.custody === "yes") {
      var when = U.clean(s.custodyWhen).replace(/\.$/, "");
      out.push(F("After the " + orderEn + ", I was held in jail, prison, or immigration detention for a period of time, and I could not leave the United States on my own during that time." +
          (when ? " This was " + when + "." : ""),
        "Después de " + orderEs + ", estuve en la cárcel, en prisión o en detención de inmigración por un tiempo, y durante ese tiempo no podía salir de los Estados Unidos por mi cuenta." +
          (when ? " Esto fue: " + when + "." : "")));
    }
    if (s.healthTravel === "yes") {
      out.push(F("Serious health problems have made it very hard or impossible for me to travel.",
        "Problemas graves de salud me han hecho muy difícil o imposible viajar."));
    }
    var apps = appSentences(s);
    if (apps.length) {
      out = out.concat(apps);
      if (fine === "240B" && s.vawaCentral === "yes" && s.apps && s.apps.vawa && s.apps.vawa.on) {
        out.push(F("Battery or extreme cruelty was at least one central reason why I did not leave by my voluntary departure deadline. Under INA § 240B(d)(2), this penalty does not apply to me.",
          "La violencia o la crueldad extrema fue por lo menos una de las razones principales por las que no salí antes de la fecha límite de mi salida voluntaria. Según la sección 240B(d)(2) de la INA, esta multa no se me aplica."));
      }
      out.push(is274
        ? F("I have been using the legal process available to me. I have not willfully refused to leave the United States.",
            "He estado usando los procesos legales que tengo a mi alcance. No me he negado a propósito a salir de los Estados Unidos.")
        : F("I have been using the legal process available to me. I did not voluntarily fail to depart.",
            "He estado usando los procesos legales que tengo a mi alcance. No dejé de salir por voluntad propia."));
    }
    return out;
  }

  function entryFacts(state, n) {
    var s = state.story || {};
    var out = [];
    var nd = U.parseDate(n.noticeDate) || U.parseDate(n.invoiceDate);
    if (s.arrivalYear) {
      out.push(F("I came to the United States in " + (s.arrivalMonth ? U.MONTHS[s.arrivalMonth - 1] + " " : "") + s.arrivalYear + ".",
        "Llegué a los Estados Unidos en " + (s.arrivalMonth ? U.MONTHS_ES[s.arrivalMonth - 1] + " de " : "") + s.arrivalYear + "."));
    }
    if (s.howEntered === "visa") {
      out.push(F("I entered the United States with a visa, after an immigration officer inspected me at an official port of entry.",
        "Entré a los Estados Unidos con una visa, después de que un oficial de inmigración me inspeccionó en un puerto de entrada oficial."));
    } else if (s.howEntered === "port") {
      out.push(F("I came to an official port of entry, where an immigration officer inspected me and allowed me to enter the United States.",
        "Llegué a un puerto de entrada oficial, donde un oficial de inmigración me inspeccionó y me permitió entrar a los Estados Unidos."));
    }
    var stop = U.parseDate(s.stopDate);
    if (s.whereStopped === "interior") {
      var place = U.clean(s.stopPlace).replace(/\.$/, "");
      out.push(F("I was not apprehended while entering the United States. Immigration officers first stopped me" +
          (place ? " in " + place : "") + (stop ? " on or about " + U.fmtDate(stop) : "") + ", inside the United States and away from the border.",
        "No me detuvieron mientras entraba a los Estados Unidos. Los oficiales de inmigración me detuvieron por primera vez" +
          (place ? " en " + place : "") + (stop ? " alrededor del " + U.fmtDateUI(stop) : "") + ", dentro de los Estados Unidos y lejos de la frontera."));
      if (stop && nd && U.daysBetween(stop, nd) > 60) {
        var days = U.daysBetween(stop, nd);
        out.push(F("The Notice is dated " + U.fmtDate(nd) + ", " + monthsPhrase(days, "en") + " after immigration officers first stopped me. I was not given this fine at the time I was apprehended.",
          "El aviso tiene fecha del " + U.fmtDateUI(nd) + ", " + monthsPhrase(days, "es") + " después de que los oficiales de inmigración me detuvieron por primera vez. No me dieron esta multa en el momento en que me detuvieron."));
      }
    } else if (s.whereStopped === "never") {
      out.push(F("Immigration officers never apprehended me while I was entering the United States. I received the Notice while I was living inside the United States.",
        "Los oficiales de inmigración nunca me detuvieron mientras entraba a los Estados Unidos. Recibí el aviso mientras vivía dentro de los Estados Unidos."));
    }
    return out.concat(appSentences(s));
  }

  function monthsPhrase(days, lang) {
    var months = Math.floor(days / 30.4);
    var es = lang === "es";
    if (months >= 24) return (es ? "más de " : "more than ") + Math.floor(months / 12) + (es ? " años" : " years");
    if (months >= 12) return es ? "más de un año" : "more than a year";
    return es ? "más de " + months + (months === 1 ? " mes" : " meses") : "more than " + U.plural(months, "month", "months");
  }

  function lifeFacts(state, n) {
    var s = state.story || {};
    var out = [];
    var t = FINES[fineOf(n)].template;
    if (t === "A" && s.arrivalYear) out.push(F("I have lived in the United States since " + s.arrivalYear + ".", "He vivido en los Estados Unidos desde " + s.arrivalYear + "."));

    var famEn = [], famEs = [];
    if (s.spouse === "yes") { famEn.push("my spouse or partner"); famEs.push("mi cónyuge o pareja"); }
    var kids = parseInt(s.children, 10) || 0;
    var usKids = Math.min(parseInt(s.usChildren, 10) || 0, kids);
    if (kids > 0) {
      var kEn = kids === 1 ? "my child" : "my " + U.numWord(kids) + " children";
      var kEs = kids === 1 ? "mi hijo o hija" : "mis " + kids + " hijos";
      if (usKids > 0) {
        if (kids === 1) {
          kEn += ", who is a U.S. citizen";
          kEs += ", que es ciudadano(a) estadounidense";
        } else if (usKids === kids) {
          kEn += " (" + (kids === 2 ? "both" : "all") + " of them are U.S. citizens)";
          kEs += " (" + (kids === 2 ? "los dos son" : "todos son") + " ciudadanos estadounidenses)";
        } else {
          kEn += " (" + U.numWord(usKids) + " of them " + (usKids === 1 ? "is a U.S. citizen" : "are U.S. citizens") + ")";
          kEs += " (" + usKids + " de ellos " + (usKids === 1 ? "es ciudadano estadounidense" : "son ciudadanos estadounidenses") + ")";
        }
      }
      famEn.push(kEn); famEs.push(kEs);
    }
    var others = parseInt(s.otherDependents, 10) || 0;
    if (others > 0) {
      famEn.push(others === 1 ? "one other family member" : U.numWord(others) + " other family members");
      famEs.push(others === 1 ? "otro familiar" : others + " familiares más");
    }
    if (famEn.length) out.push(F("My family depends on me. This includes " + U.joinList(famEn) + ".", "Mi familia depende de mí. Esto incluye a " + U.joinListEs(famEs) + "."));

    if (s.working === "yes") {
      var job = U.clean(s.job).replace(/\.$/, "");
      var inc = U.parseMoney(s.income);
      if (job) out.push(F("I work as " + (/^(a|an|the)\s/i.test(job) ? "" : (/^[aeiou]/i.test(job) ? "an " : "a ")) + job + ".", "Trabajo como: " + job + "."));
      else out.push(F("I work.", "Trabajo."));
      if (inc !== null) {
        var amt = U.fmtMoney(inc).replace(/\.00$/, "");
        out.push(F("I earn about " + amt + " per month.", "Gano aproximadamente " + amt + " al mes."));
      }
    } else if (s.working === "no") {
      var why = U.clean(s.notWorkingWhy).replace(/^because\s+/i, "").replace(/^porque\s+/i, "").replace(/\.$/, "");
      out.push(F("I am not working right now" + (why ? " because " + why : "") + ".", "No estoy trabajando ahora" + (why ? " porque " + why : "") + "."));
    }
    if (s.leftover === "none") out.push(F("After I pay for rent, food, and other basic needs, I have no money left over.", "Después de pagar la renta, la comida y otras necesidades básicas, no me queda dinero."));
    if (s.leftover === "little") out.push(F("After I pay for rent, food, and other basic needs, I have very little money left over.", "Después de pagar la renta, la comida y otras necesidades básicas, me queda muy poco dinero."));
    if (s.savings === "none") out.push(F("I have no savings.", "No tengo ahorros."));
    if (s.savings === "small") out.push(F("I have less than $1,000 in savings.", "Tengo menos de $1,000 en ahorros."));
    if (s.taxes === "yes") out.push(F("I file taxes in the United States.", "Declaro impuestos en los Estados Unidos."));
    if (s.health === "yes" && U.clean(s.healthText)) out.push(typed(s.healthText));
    return out;
  }

  function otherFacts(state) {
    var s = state.story || {};
    var out = [];
    if (U.clean(s.community)) out.push(typed(s.community));
    if (U.clean(s.extra)) out.push(typed(s.extra));
    return out;
  }

  // Returns paragraphs (arrays of {en, es} facts) for this notice.
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

    factParagraphs(state, n).forEach(function (facts) { para(facts.map(function (f) { return f.en; }).join(" ")); });

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

  /* ---------------- Instructions ("what to do next") ----------------
     Shown on screen and in the instructions PDF, in the chosen language.
     Text uses **bold** markers; render.js turns them into bold text.
     Anything the person must copy onto a government form stays in English. */

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
    var es = U.lang() === "es";
    var sections = [];
    var when = dl ? U.weekdayUI(dl.date) + ", " + U.fmtDateUI(dl.date) : "";

    var dlText;
    if (!dl) {
      dlText = T("We could not figure out your deadline. Look at your notice and send your papers as soon as possible.",
        "No pudimos calcular su fecha límite. Revise su aviso y envíe sus papeles lo antes posible.");
    } else if (late) {
      dlText = T("Your deadline seems to have passed (**" + when + "**). **Send your papers anyway, as soon as you can.** Lawyers who work on these fines recommend it, so that your defenses are on the record.",
        "Parece que su fecha límite ya pasó (**" + when + "**). **Envíe sus papeles de todas maneras, lo antes posible.** Los abogados que trabajan con estas multas lo recomiendan, para que sus defensas queden por escrito.");
    } else {
      var verbEn = dl.by === "postmarked" ? "mailed (postmarked)" : (dest.method === "email" ? "sent" : "received");
      var verbEs = dl.by === "postmarked" ? "enviados por correo (con matasellos)" : (dest.method === "email" ? "enviados" : "recibidos");
      dlText = T("Your papers must be **" + verbEn + " by " + when + "**. That is " + dl.rule + ". Do not wait until the last day.",
        "Sus papeles deben ser **" + verbEs + " a más tardar el " + when + "**. Es decir, " + dl.ruleEs + ". No espere hasta el último día.");
    }
    sections.push({ title: T("Your deadline", "Su fecha límite"), box: true, items: [dlText,
      T("Deadlines are counted from the date printed on the notice, even if it reached you late. If you are not sure, send your papers right away.",
        "El plazo se cuenta desde la fecha impresa en el aviso, aunque le haya llegado tarde. Si no está seguro, envíe sus papeles de inmediato.")] });

    var steps = [];
    steps.push({ title: T("Read your papers carefully", "Lea sus papeles con cuidado"), items: [
      es ? "Sus papeles están **en inglés**, porque el gobierno los exige en inglés. Si no lee bien el inglés, pida a una persona de confianza que se los lea y se los traduzca **antes de firmar**." : "",
      T("Check that your name, A-Number, " + trackingLabel(n) + ", dates, and amount are correct.",
        "Revise que su nombre, su Número A (A-Number), el " + trackingLabel(n) + ", las fechas y la cantidad estén correctos."),
      T("Make sure everything is **true**. When you sign, you are promising under **penalty of perjury** (lying is a crime) that it is true.",
        "Asegúrese de que todo sea **verdad**. Al firmar, usted promete **bajo pena de perjurio** (mentir es un delito) que todo es verdad."),
      T("If something is wrong, go back in the app, fix it, and download your papers again.",
        "Si algo está mal, regrese en la aplicación, corríjalo y descargue sus papeles otra vez.")
    ].filter(Boolean) });

    var noPrinter = T("No printer? Try a public library, a print shop (like FedEx Office, Staples, or The UPS Store), or a community organization.",
      "¿No tiene impresora? Pruebe en una biblioteca pública, una tienda de impresión (como FedEx Office, Staples o The UPS Store) o una organización comunitaria.");
    var translatorSigns = translator ? T("The person who translated for you must sign and date the **Certificate of Translation** (the last page).",
      "La persona que le tradujo debe firmar y poner la fecha en el **Certificado de Traducción** (“Certificate of Translation”, la última página).") : "";

    if (dest.method === "email") {
      steps.push({ title: T("Print, sign, and scan", "Imprima, firme y escanee"), items: [
        T("Print all pages. ", "Imprima todas las páginas. ") + noPrinter,
        T("Sign with blue or black ink: **the cover letter** (page 1, above your name) and **the written defense** (the “Signature” line on its last page). Write the date next to “Today’s date.”",
          "Firme con tinta azul o negra: **la carta de presentación** (página 1, arriba de su nombre) y **la defensa por escrito** (la línea que dice “Signature” en su última página). Escriba la fecha junto a “Today’s date”."),
        translatorSigns,
        T("Make a PDF of the signed pages with your phone: on iPhone use the **Notes** app (Scan Documents); on Android use **Google Drive** (Scan). Also scan or photograph **every page of your notice**.",
          "Haga un PDF de las páginas firmadas con su teléfono: en iPhone use la aplicación **Notas** (Escanear documentos); en Android use **Google Drive** (Escanear). También escanee o tome foto de **todas las páginas de su aviso**."),
        T("Can’t print? Some free phone apps (such as Adobe Fill & Sign) let you sign a PDF with your finger.",
          "¿No puede imprimir? Algunas aplicaciones gratuitas (como Adobe Fill & Sign) le permiten firmar un PDF con el dedo.")
      ].filter(Boolean) });
      steps.push({ title: T("Send the email", "Envíe el correo electrónico"), items: [
        T("Send an email **to: " + dest.email + "**", "Envíe un correo electrónico **a: " + dest.email + "**"),
        T("Use the subject line and message the app gives you (you can copy them on the last screen of the app).",
          "Use el asunto y el mensaje que le da la aplicación (puede copiarlos en la última pantalla). Están en inglés porque van dirigidos al gobierno."),
        T("**Attach:** (1) your signed papers and (2) the copy of your notice" + (n.form === "invoice" ? " and bill" : "") + ".",
          "**Adjunte:** (1) sus papeles firmados y (2) la copia de su aviso" + (n.form === "invoice" ? " y de la factura" : "") + "."),
        T("After you send it, check your “Sent” folder. Take a screenshot of the sent email and keep it. Save any reply you get.",
          "Después de enviarlo, revise su carpeta de “Enviados”. Tome una captura de pantalla del correo enviado y guárdela. Guarde cualquier respuesta que reciba.")
      ] });
    } else {
      steps.push({ title: T("Print and sign", "Imprima y firme"), items: [
        T("Print every page, on one side of the paper. ", "Imprima todas las páginas, de un solo lado del papel. ") + noPrinter,
        T("Sign with blue or black ink: **the cover letter** (page 1, above your name) and **the written defense** (the “Signature” line on its last page). Write the date next to “Today’s date” and on the cover letter.",
          "Firme con tinta azul o negra: **la carta de presentación** (página 1, arriba de su nombre) y **la defensa por escrito** (la línea que dice “Signature” en su última página). Escriba la fecha junto a “Today’s date” y en la carta de presentación (“Date”)."),
        translatorSigns
      ].filter(Boolean) });
      if (n.form === "nvo") {
        steps.push({ title: T("Fill out the “Notice of Appeal” page of your notice", "Llene la página “Notice of Appeal” (Aviso de Apelación) de su aviso"), items: [
          T("Your notice has a page called **NOTICE OF APPEAL** (usually the last page, page 4 of 4).",
            "Su aviso tiene una página llamada **NOTICE OF APPEAL** (normalmente la última, la página 4 de 4)."),
          T("In the space under “I am filing an appeal of a Notice of Violation and Order for the following reasons,” write: **“I deny the violation. Please see my attached written defense and brief.”**",
            "En el espacio debajo de “I am filing an appeal of a Notice of Violation and Order for the following reasons”, escriba **en inglés**, tal como aparece aquí: **“I deny the violation. Please see my attached written defense and brief.”** (Quiere decir: “Niego la violación. Vea mi defensa por escrito adjunta.”)"),
          T("Check the box **“I have attached a separate written brief or statement.”** If you are also sending copies of documents (see the next step), check **“I have attached additional documentary evidence.”**",
            "Marque la casilla **“I have attached a separate written brief or statement.”** (adjunté una declaración por escrito). Si también envía copias de documentos (vea el siguiente paso), marque **“I have attached additional documentary evidence.”**"),
          T("Sign and date it. Fill in: Printed Name **" + fullName(p) + "**, File Number **" + U.fmtANumber(p.aNumber) + "**, Penalty Tracking Number **" + (track || "(from your notice)") + "**, your mailing address, phone, and email.",
            "Fírmela y escriba la fecha. Llene: Printed Name (nombre) **" + fullName(p) + "**, File Number (Número A) **" + U.fmtANumber(p.aNumber) + "**, Penalty Tracking Number **" + (track || "(el de su aviso)") + "**, y su dirección postal, teléfono y correo electrónico."),
          T("If you do not have this page anymore, still send your papers. Your cover letter says that you are appealing.",
            "Si ya no tiene esta página, envíe sus papeles de todas maneras. Su carta de presentación dice que usted está apelando.")
        ] });
      }
      var proof = [];
      var add = function (en, es2) { proof.push(T(en, es2)); };
      add("a copy of **your notice** (all pages)", "una copia de **su aviso** (todas las páginas)");
      if (n.form === "invoice") add("a copy of **the bill or letter** you got", "una copia de **la factura o carta** que recibió");
      if (s.supervision === "now" || s.supervision === "past") add("your **Order of Supervision**", "su **Orden de Supervisión**");
      if (s.checkins === "all" || s.checkins === "some") add("papers showing your **ICE check-ins**", "papeles que muestren sus **citas de control con ICE**");
      if (s.isap === "now" || s.isap === "past") add("your **ISAP** papers", "sus papeles de **ISAP**");
      if (hasApps(s)) add("**receipts or decisions** for your immigration applications", "**recibos o decisiones** de sus solicitudes de inmigración");
      if (s.health === "yes" || s.healthTravel === "yes") add("**letters from doctors** or medical records", "**cartas de médicos** o expedientes médicos");
      if (s.working === "yes" || s.working === "no") add("proof of your income, like **pay stubs or a tax return**", "prueba de sus ingresos, como **talones de pago o una declaración de impuestos**");
      if ((parseInt(s.usChildren, 10) || 0) > 0) add("**birth certificates** of your U.S. citizen children", "**actas de nacimiento** de sus hijos ciudadanos estadounidenses");
      steps.push({ title: T("Add copies of papers that support what you said (optional, but helpful)", "Agregue copias de papeles que apoyen lo que dijo (opcional, pero ayuda)"), items: [
        T("You can include " + U.joinList(proof) + ".", "Puede incluir " + U.joinListEs(proof) + "."),
        T("**Send copies only — never originals.** Keep all your original papers.", "**Envíe solo copias, nunca originales.** Guarde todos sus documentos originales."),
        T("Do not send anything you are not comfortable with the government seeing. If you are unsure, ask a lawyer.",
          "No envíe nada que no quiera que vea el gobierno. Si tiene dudas, pregunte a un abogado.")
      ] });
      steps.push({ title: T("Make a copy of everything for yourself", "Haga una copia de todo para usted"), items: [
        T("Before you mail it, copy (or take clear phone photos of) **every page** you are sending, including the signed pages. Keep them in a safe place with your notice.",
          "Antes de enviarlo, saque copias (o tome fotos claras con su teléfono) de **todas las páginas** que va a enviar, incluyendo las páginas firmadas. Guárdelas en un lugar seguro junto con su aviso.")
      ] });
      var addr = dest.lines.length ? dest.lines.join(", ") : T("the address on your letter", "la dirección que aparece en su carta");
      steps.push({ title: T("Mail it at the post office", "Envíelo por correo en la oficina postal"), items: [
        n.form === "invoice" ? T("Check your bill or letter for the address where disputes must be sent. If it is different from the address below, go back in the app and change it.",
          "Revise en su factura o carta la dirección a donde se deben enviar las disputas. Si es diferente de la dirección de abajo, regrese en la aplicación y cámbiela.") : "",
        T("Put everything in a large envelope. Write your address in the top-left corner.", "Ponga todo en un sobre grande. Escriba su dirección en la esquina de arriba a la izquierda."),
        T("Mail it **to:** " + addr + ".", "Envíelo **a:** " + addr + "."),
        T("At the post office counter, ask for **Certified Mail with Return Receipt** (or **Priority Mail Express**). These give you proof of mailing and a tracking number. Use the U.S. Postal Service, not FedEx or UPS.",
          "En el mostrador de la oficina postal, pida **“Certified Mail with Return Receipt”** (correo certificado con acuse de recibo) o **“Priority Mail Express”**. Así tendrá prueba del envío y un número de rastreo. Use el Servicio Postal de EE. UU. (USPS), no FedEx ni UPS."),
        T("Write the Certified Mail number on your copy of the cover letter. **Keep the receipt.**",
          "Escriba el número de Certified Mail en su copia de la carta de presentación. **Guarde el recibo.**"),
        dl && !late ? T("Mail it **by " + U.fmtDateUI(dl.date) + "**.", "Envíelo **a más tardar el " + U.fmtDateUI(dl.date) + "**.") : T("Mail it as soon as possible.", "Envíelo lo antes posible.")
      ].filter(Boolean) });
      steps.push({ title: T("Track it and keep your proof", "Rastree el envío y guarde su prueba"), items: [
        T("Track your envelope at " + S.links.uspsTracking + " using your tracking number.",
          "Rastree su sobre en " + S.links.uspsTracking + " con su número de rastreo."),
        T("When the green Return Receipt card comes back, keep it with your copies.",
          "Cuando le regrese la tarjeta verde de acuse de recibo (Return Receipt), guárdela con sus copias.")
      ] });
    }
    sections.push({ title: T("Step by step", "Paso a paso"), steps: steps });

    var after = [];
    if (n.form !== "invoice" && form === "nvo") {
      after.push(T("A supervisory officer (someone who did not make the first decision) will review your appeal. Your notice says they will usually decide within **45 days** after your appeal is filed.",
        "Un oficial supervisor (alguien que no tomó la primera decisión) revisará su apelación. Su aviso dice que normalmente decidirán dentro de **45 días** después de presentada la apelación."));
      after.push(T("They may ask you for more information. If they do, you must answer within **15 days**. Open all mail from DHS right away.",
        "Es posible que le pidan más información. Si lo hacen, debe responder dentro de **15 días**. Abra todo el correo del DHS de inmediato."));
      after.push(T("If they agree with you, you will get a paper saying the fine is **reversed, cancelled, or rescinded**. Keep it forever.",
        "Si le dan la razón, recibirá un papel que dice que la multa fue **anulada, cancelada o revocada** (“reversed”, “cancelled” o “rescinded”). Guárdelo para siempre."));
      after.push(T("If they do not agree, you will get an **Appeal Decision and Order**, and later a bill. There is no other appeal inside DHS, but you may be able to challenge it in **federal court**. Talk to a lawyer quickly if this happens.",
        "Si no le dan la razón, recibirá un documento llamado **“Appeal Decision and Order”** y después una factura. No hay otra apelación dentro del DHS, pero es posible que pueda impugnarla en una **corte federal**. Si esto pasa, hable pronto con un abogado."));
    } else if (n.form !== "invoice" && form === "i79") {
      after.push(T("An officer will review your written defense and decide. Open all mail from DHS right away.",
        "Un oficial revisará su defensa por escrito y tomará una decisión. Abra todo el correo del DHS de inmediato."));
      after.push(T("If you lose, you may be able to appeal to the Board of Immigration Appeals (BIA) on **Form EOIR-29** (not EOIR-26). Follow the instructions on the decision and get a lawyer’s help if you can.",
        "Si pierde, es posible que pueda apelar a la Junta de Apelaciones de Inmigración (BIA) con el **Formulario EOIR-29** (no el EOIR-26). Siga las instrucciones de la decisión y busque la ayuda de un abogado si puede."));
    } else if (n.form !== "invoice") {
      after.push(T("CBP will review your dispute. Check your email often, including your spam or junk folder, and open all mail from DHS right away.",
        "CBP revisará su disputa. Revise su correo electrónico seguido, también la carpeta de correo no deseado (spam), y abra todo el correo del DHS de inmediato."));
    } else {
      after.push(T("Wait for an answer, and open all mail and email right away. Keep paying attention to any new deadlines in letters you get.",
        "Espere una respuesta y abra todo su correo y correo electrónico de inmediato. Ponga atención a cualquier nueva fecha límite en las cartas que reciba."));
    }
    sections.push({ title: T("What happens next", "Qué pasa después"), items: after });

    sections.push({ title: T("If you get a bill (invoice) later", "Si después le llega una factura (cobro)"), items: [
      T("**Do not ignore it.** Bills can come from U.S. Customs and Border Protection (CBP), the Department of the Treasury’s Centralized Receivables Service (CRS), or a private debt collector.",
        "**No la ignore.** Las facturas pueden venir de la Oficina de Aduanas y Protección Fronteriza (CBP), del Servicio Centralizado de Cuentas por Cobrar del Departamento del Tesoro (CRS) o de un cobrador de deudas privado."),
      T("**Bill from CBP:** you can dispute it in writing by email to **" + S.emailCbpInvoice + "** within **10 calendar days** of the invoice date. Include your Penalty Tracking Number and send these same papers again.",
        "**Factura de CBP:** puede disputarla por escrito, por correo electrónico a **" + S.emailCbpInvoice + "**, dentro de **10 días calendario** desde la fecha de la factura. Incluya su Penalty Tracking Number y envíe otra vez estos mismos papeles."),
      T("**Bill from CRS (Treasury):** use the free CRS Dispute Form and cover letter: " + S.links.crsDisputeForm + " and " + S.links.crsCoverLetter,
        "**Factura de CRS (Tesoro):** use el formulario gratuito de disputa de CRS y su carta de presentación: " + S.links.crsDisputeForm + " y " + S.links.crsCoverLetter),
      T("**Letter from a private debt collector:** send them a dispute letter right away (sample: " + S.links.debtCollectorLetter + "). The law says they must pause collection when you dispute the debt.",
        "**Carta de un cobrador de deudas privado:** envíele una carta de disputa de inmediato (modelo en inglés: " + S.links.debtCollectorLetter + "). La ley dice que deben pausar el cobro cuando usted disputa la deuda."),
      T("This app can also make dispute papers for a bill — start a new notice and choose “A bill (invoice) or past-due notice.”",
        "Esta aplicación también puede preparar papeles para disputar una factura: agregue un aviso nuevo y elija “Una factura (cobro) o aviso de pago vencido”.")
    ] });

    sections.push({ title: T("Important to know", "Es importante saber"), items: [
      T("**Should I just pay?** Talk to a lawyer first. DHS may treat payment as admitting that you did something wrong. If you do pay, write **“Payment under protest, with reservation of rights”** on your check or money order.",
        "**¿Debo simplemente pagar?** Hable primero con un abogado. El DHS podría tomar el pago como si usted admitiera que hizo algo malo. Si decide pagar, escriba en inglés en su cheque o giro postal: **“Payment under protest, with reservation of rights”** (pago bajo protesta, con reserva de derechos)."),
      T("**Is it risky to fight the fine?** It is up to DHS to prove the fine is justified. The lawyers at noimmigrationfines.org encourage people to file an opposition and raise their defenses.",
        "**¿Es arriesgado pelear la multa?** Le toca al DHS probar que la multa es justa. Los abogados de noimmigrationfines.org animan a las personas a presentar una oposición y a usar sus defensas."),
      T("**If you move,** tell ICE (and the immigration court or USCIS, if you have a case there) your new address right away, so you do not miss important letters.",
        "**Si se muda,** avísele de inmediato su nueva dirección a ICE (y a la corte de inmigración o a USCIS, si tiene un caso allí), para que no pierda cartas importantes."),
      (fineOf(n) === "274D" || fineOf(n) === "240B") ? T("**Lawsuit:** A class action, Maria L. v. Noem (D. Mass.), challenges INA § 274D and § 240B fines. Check noimmigrationfines.org for updates.",
        "**Demanda:** Una demanda colectiva, Maria L. v. Noem (D. Mass.), impugna las multas de las secciones 274D y 240B de la INA. Busque noticias en noimmigrationfines.org.") : ""
    ].filter(Boolean) });

    var help = [
      T("Questions and answers about these fines: ", "Preguntas y respuestas sobre estas multas: ") + (es ? S.links.faqEs || S.links.faq : S.links.faq),
      T("Find free or low-cost legal help: ", "Encuentre ayuda legal gratis o de bajo costo: ") + S.links.findLawyer
    ];
    var contact = [S.contactName, S.contactPhone, S.contactEmail, S.contactWebsite].map(U.clean).filter(Boolean);
    if (contact.length) help.unshift(T("Contact us: ", "Contáctenos: ") + contact.join(" · "));
    sections.push({ title: T("Get help", "Busque ayuda"), items: help });
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
