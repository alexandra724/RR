/* =====================================================================
   The step-by-step interview. Each "screen" asks a few questions.
   Answers are saved only in this browser (localStorage).

   Every message to the person is written twice: T("English", "Español").
   The papers that get filed are always made in English (see js/case.js).
   ===================================================================== */
(function () {
  "use strict";
  var U = window.U, Case = window.Case, Render = window.Render, S = window.SITE;
  var T = U.T;
  var STORE_KEY = "immigration-fine-helper-v1";
  var LANG_KEY = "immigration-fine-helper-lang";
  var app = document.getElementById("app");

  /* ---------------- Language ---------------- */

  function initialLang() {
    var m = /[?&]lang=(en|es)\b/i.exec(window.location.search);
    if (m) return m[1].toLowerCase();
    try {
      var saved = window.localStorage.getItem(LANG_KEY);
      if (saved) return saved;
    } catch (e) { /* ignore */ }
    var langs = navigator.languages || [navigator.language || ""];
    return langs.some(function (l) { return /^es\b/i.test(l || ""); }) ? "es" : "en";
  }

  function setLanguage(l) {
    U.setLang(l);
    try { window.localStorage.setItem(LANG_KEY, U.lang()); } catch (e) { /* ignore */ }
  }

  U.setLang(initialLang());

  /* ---------------- State ---------------- */

  function blankState() {
    return { cur: "welcome", person: {}, notices: [{}], story: { apps: {} }, translator: {} };
  }

  var state = load();

  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.notices && s.notices.length) {
          s.story = s.story || {};
          s.story.apps = s.story.apps || {};
          s.person = s.person || {};
          s.translator = s.translator || {};
          return s;
        }
      }
    } catch (e) { /* storage may be blocked; start fresh */ }
    return blankState();
  }

  function save() {
    if (state.cur && state.cur !== "welcome") state.lastCur = state.cur;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function erase() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    state = blankState();
    window.scrollTo(0, 0);
  }

  function confirmErase() {
    if (window.confirm(T("This will erase all your answers from this device. Are you sure?",
      "Esto borrará todas sus respuestas de este aparato. ¿Está seguro?"))) {
      erase();
      render();
    }
  }

  function get(path) {
    return path.split(".").reduce(function (o, k) { return o === undefined || o === null ? undefined : o[k]; }, state);
  }

  function set(path, val) {
    var keys = path.split(".");
    var o = state;
    for (var i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] === undefined || o[keys[i]] === null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = val;
  }

  /* ---------------- Helpers used by the questions ---------------- */

  function completeNotices() { return state.notices.filter(Case.isComplete); }
  function anyFine(codes) { return completeNotices().some(function (n) { return codes.indexOf(Case.fineOf(n)) !== -1; }); }
  function anyA() { return anyFine(["274D", "240B"]); }
  function anyB() { return anyFine(["275b", "1815"]); }

  function yesNo() { return [{ value: "yes", label: T("Yes", "Sí") }, { value: "no", label: T("No", "No") }]; }
  function yesNoUnsure() { return yesNo().concat([{ value: "unsure", label: T("Not sure", "No estoy seguro") }]); }

  var STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "AS", "GU", "MP", "VI"];

  function latinOnly(v) {
    return U.hasNonLatin(v)
      ? T("Please use English letters (A–Z) only. Government offices need papers in English letters.",
          "Use solo letras del alfabeto inglés (A–Z). Las oficinas del gobierno necesitan los papeles con estas letras.")
      : "";
  }

  function validEmail(v) {
    if (!v) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? "" :
      T("This does not look like an email address. Check it and try again.", "Esto no parece un correo electrónico. Revíselo e intente otra vez.");
  }

  function addressBlock(lines) {
    return '<div class="address">' + lines.map(U.escapeHtml).join("<br>") + "</div>";
  }

  function link(href, text) {
    return '<a href="' + href + '" target="_blank" rel="noopener">' + text + "</a>";
  }

  function faqLink() { return U.lang() === "es" ? (S.links.faqEs || S.links.faq) : S.links.faq; }

  /* ---------------- The screens ---------------- */

  function noticeScreens(i) {
    var base = "notices." + i + ".";
    var n = function () { return state.notices[i] || {}; };
    var form = function () { return Case.docForm(n()); };
    var list = [];

    list.push({
      id: "n" + i + "-form", section: "notice",
      title: i === 0 ? T("What kind of paper did you get?", "¿Qué tipo de papel recibió?") : T("What kind of paper is your next notice?", "¿Qué tipo de papel es su siguiente aviso?"),
      lead: function () {
        return T("Look at the <strong>title at the top of the first page</strong>. You can compare it with ",
          "Fíjese en el <strong>título en la parte de arriba de la primera página</strong>. Los avisos están en inglés. Puede compararlo con estos ") +
          link(S.links.sampleNotices, T("sample notices", "avisos de muestra")) + ".";
      },
      fields: function () {
        return [{
          type: "choice", key: base + "form", required: true, label: T("The paper says:", "El papel dice:"), options: [
            { value: "nvo", label: "Notice of Violation and Order", desc: T(
              "Full title: “Notice of Violation and Order Under the Immigration and Nationality Act.” The bottom corner says “DHS Form 281.” This is the most common notice since mid-2025.",
              "Aviso de Violación y Orden. Título completo: “Notice of Violation and Order Under the Immigration and Nationality Act.” En la esquina de abajo dice “DHS Form 281.” Es el aviso más común desde mediados de 2025.") },
            { value: "i79", label: "Notice of Intention to Fine", desc: T(
              "An older kind of notice (Form I-79), usually dated before June 27, 2025.",
              "Aviso de Intención de Multar. Un tipo de aviso más antiguo (Formulario I-79), normalmente con fecha anterior al 27 de junio de 2025.") },
            { value: "1815", label: "Notice of Fee Assessment Under 8 U.S.C. § 1815", desc: T(
              "The bottom corner says “DHS Form 1815.” Usually $5,000 or more.",
              "Aviso de Cobro de Cargo. En la esquina de abajo dice “DHS Form 1815.” Normalmente es de $5,000 o más.") },
            { value: "invoice", label: T("A bill (invoice) or past-due notice", "Una factura (cobro) o aviso de pago vencido"), desc: T(
              "A letter from CBP, the Treasury (“Centralized Receivables Service”), or a debt collector, asking you to pay.",
              "Una carta de CBP, del Tesoro (“Centralized Receivables Service”) o de un cobrador de deudas, pidiéndole que pague. Puede decir “Invoice” o “Past Due Notice.”") },
            { value: "other", label: T("Something else, or I’m not sure", "Otra cosa, o no estoy seguro"), desc: T(
              "For example, an “Appeal Decision and Order” or a “Rescission” notice.",
              "Por ejemplo, un “Appeal Decision and Order” o un aviso de “Rescission.”") }
          ]
        }];
      }
    });

    list.push({
      id: "n" + i + "-other", section: "notice", when: function () { return n().form === "other"; },
      title: T("This tool may not fit your paper", "Puede que esta herramienta no sirva para su papel"),
      hideNext: true,
      html: function () {
        return '<div class="callout">' +
          T("<p>This tool makes papers for the four kinds of papers on the last screen.</p>",
            "<p>Esta herramienta prepara papeles para los cuatro tipos de papeles de la pantalla anterior.</p>") +
          "<ul><li>" + T("<strong>“Rescission of Notice of Violation and Order”</strong> — good news. It means the fine was cancelled. Keep it in a safe place.",
            "<strong>“Rescission of Notice of Violation and Order”</strong>: ¡buenas noticias! Quiere decir que la multa fue cancelada. Guárdelo en un lugar seguro.") + "</li>" +
          "<li>" + T("<strong>“Appeal Decision and Order”</strong> — this is DHS’s final decision on an appeal. There is no other appeal inside DHS, but you may be able to go to federal court. <strong>Talk to a lawyer as soon as possible.</strong>",
            "<strong>“Appeal Decision and Order”</strong>: es la decisión final del DHS sobre una apelación. No hay otra apelación dentro del DHS, pero es posible que pueda ir a una corte federal. <strong>Hable con un abogado lo antes posible.</strong>") + "</li>" +
          "<li>" + T("<strong>Not sure?</strong> Compare your paper with these ", "<strong>¿No está seguro?</strong> Compare su papel con estos ") +
          link(S.links.sampleNotices, T("sample notices", "avisos de muestra")) + T(", or ask a lawyer: ", ", o pregunte a un abogado: ") +
          link(S.links.findLawyer, T("find free or low-cost legal help", "encuentre ayuda legal gratis o de bajo costo")) + ".</li></ul>" +
          T("<p>Use the <strong>Back</strong> button to choose a different answer.</p>", "<p>Use el botón <strong>Atrás</strong> para elegir otra respuesta.</p>") + "</div>";
      }
    });

    list.push({
      id: "n" + i + "-invoice", section: "notice", when: function () { return n().form === "invoice"; },
      title: T("About your bill", "Sobre su factura"),
      lead: T("We will make a letter that disputes the bill, plus your full written defense.",
        "Vamos a preparar una carta para disputar la factura, más su defensa completa por escrito."),
      fields: function () {
        return [
          {
            type: "choice", key: base + "invoiceFrom", required: true, label: T("Who sent the bill?", "¿Quién le mandó la factura?"), options: [
              { value: "cbp", label: "U.S. Customs and Border Protection (CBP)", desc: T(
                "It may say “For inquiries, please contact the CBP at INACivilPenalties@cbp.dhs.gov.”",
                "Oficina de Aduanas y Protección Fronteriza. Puede decir “For inquiries, please contact the CBP at INACivilPenalties@cbp.dhs.gov.”") },
              { value: "crs", label: "Centralized Receivables Service (CRS)", desc: T(
                "Part of the U.S. Department of the Treasury. It may say “CRS Invoice Number.”",
                "Parte del Departamento del Tesoro de EE. UU. Puede decir “CRS Invoice Number.”") },
              { value: "collector", label: T("A private debt collection company", "Una compañía privada de cobro de deudas"), desc: T(
                "A company (not the government) asking you to pay.", "Una compañía (no el gobierno) que le pide que pague.") }
            ]
          },
          { type: "date", key: base + "invoiceDate", required: true, past: true, label: T("Date on the bill", "Fecha de la factura"),
            hint: T("It may be called “Invoice Date” or “Date of this notice.”", "Puede decir “Invoice Date” o “Date of this notice.”") },
          { type: "text", key: base + "invoiceNumber", label: T("Invoice or reference number (optional)", "Número de factura o de referencia (opcional)"),
            hint: T("For example, “CRS Invoice Number” or “Agency Reference.”", "Por ejemplo, “CRS Invoice Number” o “Agency Reference.”") }
        ];
      }
    });

    list.push({
      id: "n" + i + "-orig", section: "notice", when: function () { return n().form === "invoice"; },
      title: T("Do you have the notice that came before the bill?", "¿Tiene el aviso que llegó antes de la factura?"),
      lead: T("Usually DHS sends a fine notice first, and a bill later. If you have the notice, we will use its information.",
        "Normalmente el DHS manda primero un aviso de multa y después una factura. Si tiene el aviso, usaremos su información."),
      fields: function () {
        return [{
          type: "choice", key: base + "origForm", required: true, label: T("Before the bill, I got:", "Antes de la factura, recibí:"), options: [
            { value: "nvo", label: T("A “Notice of Violation and Order” (DHS Form 281)", "Un “Notice of Violation and Order” (DHS Form 281)") },
            { value: "i79", label: T("A “Notice of Intention to Fine” (Form I-79)", "Un “Notice of Intention to Fine” (Formulario I-79)") },
            { value: "1815", label: T("A “Notice of Fee Assessment Under 8 U.S.C. § 1815” (DHS Form 1815)", "Un “Notice of Fee Assessment Under 8 U.S.C. § 1815” (DHS Form 1815)") },
            { value: "none", label: T("I don’t have it, or I’m not sure", "No lo tengo, o no estoy seguro") }
          ]
        }];
      }
    });

    list.push({
      id: "n" + i + "-fine", section: "notice",
      when: function () { return n().form && n().form !== "other" && form() !== "1815" && (n().form !== "invoice" || n().origForm); },
      title: T("Which law is your fine under?", "¿Bajo qué ley es su multa?"),
      lead: function () {
        if (form() === "none") return T("Look at your bill. It usually names the law — for example, “Section 274D(a)” or “failure to timely depart.”",
          "Revise su factura. Normalmente dice la ley; por ejemplo, “Section 274D(a)” o “failure to timely depart.”");
        return T("On your notice, find the section that is <strong>checked (☒ or ■)</strong>: “Section 240B,” “Section 274D,” or “Section 275.”",
          "En su aviso, busque la sección que está <strong>marcada (☒ o ■)</strong>: “Section 240B”, “Section 274D” o “Section 275”.");
      },
      fields: function () {
        var opts = [
          { value: "274D", label: T("Section 274D", "Sección 274D (Section 274D)"), desc: T(
            "For not leaving the U.S. after a final deportation (removal) order. Often $998 for each day — it can add up to more than $1 million.",
            "Por no salir de EE. UU. después de una orden final de deportación (remoción). A menudo $998 por cada día; puede sumar más de 1 millón de dólares.") },
          { value: "240B", label: T("Section 240B", "Sección 240B (Section 240B)"), desc: T(
            "For not leaving by the date in a voluntary departure order. Often $3,000.",
            "Por no salir antes de la fecha de una orden de salida voluntaria. A menudo $3,000.") },
          { value: "275b", label: T("Section 275 (also called 275(b))", "Sección 275 (también llamada 275(b))"), desc: T(
            "For being stopped while entering the U.S. without inspection. Usually up to $250.",
            "Por ser detenido mientras entraba a EE. UU. sin inspección. Normalmente hasta $250.") }
        ];
        if (form() === "none") opts.push({ value: "1815", label: "8 U.S.C. § 1815", desc: T(
          "A fee for being stopped between ports of entry. Usually $5,000 or more.",
          "Un cargo por ser detenido entre puertos de entrada. Normalmente $5,000 o más.") });
        return [{
          type: "choice", key: base + "fine", required: true, label: T("My fine is under:", "Mi multa es bajo:"), options: opts,
          hint: T("If more than one section is checked, choose one now. At the end you can add another notice for the other section. Each one gets its own papers.",
            "Si hay más de una sección marcada, elija una ahora. Al final puede agregar otro aviso para la otra sección. Cada una tendrá sus propios papeles.")
        }];
      }
    });

    list.push({
      id: "n" + i + "-details", section: "notice",
      when: function () { return Case.isComplete(n()); },
      title: T("Numbers and dates from your notice", "Números y fechas de su aviso"),
      lead: function () {
        return form() === "none" ? T("Use the information on your bill.", "Use la información de su factura.")
          : T("Copy these exactly from your " + Case.FORMS[form()].name + ".", "Cópielos exactamente de su aviso (“" + Case.FORMS[form()].name + "”).");
      },
      fields: function () {
        var f = form();
        var trackHint = {
          nvo: T("Top right of page 1, under “File Number.”", "Arriba a la derecha de la página 1, debajo de “File Number.”"),
          i79: T("Near the top of the notice.", "Cerca de la parte de arriba del aviso."),
          "1815": T("Near the top of page 1. It usually starts with the letter F.", "Cerca de la parte de arriba de la página 1. Normalmente empieza con la letra F."),
          none: T("On a bill it may be called “Penalty Tracking Number” or “Agency Reference.”", "En una factura puede decir “Penalty Tracking Number” o “Agency Reference.”")
        }[f];
        var dateHint = {
          nvo: T("On page 2, next to the officer’s signature, on the right (“Date”).", "En la página 2, junto a la firma del oficial, a la derecha (“Date”)."),
          i79: T("The date printed on the notice.", "La fecha impresa en el aviso."),
          "1815": T("On page 2, next to the officer’s title (“Notice Date”).", "En la página 2, junto al cargo del oficial (“Notice Date”)."),
          none: ""
        }[f];
        var amountHint = {
          nvo: T("On page 1: “a civil penalty be imposed upon you in the amount of $…”", "En la página 1: “a civil penalty be imposed upon you in the amount of $…”"),
          i79: T("The amount of the fine on the notice.", "La cantidad de la multa en el aviso."),
          "1815": T("On page 1: “you are required to pay a fee in the amount of $…”", "En la página 1: “you are required to pay a fee in the amount of $…”"),
          none: T("The amount of the fine. On a bill, use the “principal” amount if it is shown.", "La cantidad de la multa. En una factura, use la cantidad “principal” si aparece.")
        }[f];
        return [
          { type: "text", key: base + "tracking", label: Case.trackingLabel(n()) + (f === "none" ? T(" (optional)", " (opcional)") : ""),
            hint: trackHint, required: f !== "none", autocomplete: "off", validate: latinOnly },
          { type: "date", key: base + "noticeDate", label: T("Date of the notice", "Fecha del aviso"), hint: dateHint, required: true, past: true, when: function () { return f !== "none"; } },
          { type: "money", key: base + "amount", label: T("Amount of the fine", "Cantidad de la multa"), hint: amountHint, required: true }
        ];
      }
    });

    list.push({
      id: "n" + i + "-delivery", section: "notice",
      when: function () { return Case.isComplete(n()) && form() !== "none"; },
      title: T("How did you get the notice?", "¿Cómo recibió el aviso?"),
      lead: T("These dates matter. If the notice reached you late, your papers will say so.",
        "Estas fechas son importantes. Si el aviso le llegó tarde, sus papeles lo dirán."),
      fields: function () {
        return [
          {
            type: "choice", key: base + "delivery", required: true, label: T("I got it:", "Lo recibí:"), options: [
              { value: "mail", label: T("In the mail", "Por correo") },
              { value: "person", label: T("An officer gave it to me in person", "Un oficial me lo dio en persona") },
              { value: "unsure", label: T("I don’t remember", "No me acuerdo") }
            ]
          },
          { type: "date", key: base + "postmarkDate", past: true, label: T("Date of the postmark on the envelope (optional)", "Fecha del matasellos en el sobre (opcional)"),
            hint: T("The date the post office stamped on the envelope. If you don’t have the envelope, leave this empty. Keep the envelope if you have it!",
              "La fecha que la oficina postal sella en el sobre. Si no tiene el sobre, déjelo en blanco. ¡Si tiene el sobre, guárdelo!"),
            when: function () { return n().delivery === "mail"; } },
          { type: "date", key: base + "receivedDate", past: true, label: T("Date it arrived (optional)", "Fecha en que le llegó (opcional)"), when: function () { return n().delivery === "mail"; } },
          { type: "date", key: base + "receivedDate", past: true, required: true, label: T("Date the officer gave it to you", "Fecha en que el oficial se lo dio"), when: function () { return n().delivery === "person"; } }
        ];
      }
    });

    list.push({
      id: "n" + i + "-where", section: "notice",
      when: function () { return Case.isComplete(n()) && !(n().form === "invoice" && n().invoiceFrom === "collector"); },
      title: function () {
        return Case.destination(n()).method === "email" ? T("Where to email your papers", "A dónde enviar sus papeles por correo electrónico") : T("Where to mail your papers", "A dónde enviar sus papeles por correo");
      },
      html: function () {
        var nn = n();
        if (nn.form === "invoice" && nn.invoiceFrom === "cbp") {
          return T("<p>CBP bills usually say to send disputes by email to:</p>", "<p>Las facturas de CBP normalmente dicen que se envíen las disputas por correo electrónico a:</p>") + addressBlock([S.emailCbpInvoice]);
        }
        if (nn.form === "invoice") {
          return T("<p>These bills usually say to send questions and disputes to:</p>", "<p>Estas facturas normalmente dicen que se envíen las preguntas y disputas a:</p>") + addressBlock(S.crsAddress);
        }
        if (Case.fineOf(nn) === "1815") {
          return T("<p>A Notice of Fee Assessment usually says to send disputes by email to:</p>", "<p>Un “Notice of Fee Assessment” normalmente dice que se envíen las disputas por correo electrónico a:</p>") +
            addressBlock([S.email1815]) + T("<p class=\"hint\">Look on page 2 of your notice.</p>", "<p class=\"hint\">Fíjese en la página 2 de su aviso.</p>");
        }
        return T("<p>Most notices say to send your appeal to:</p>", "<p>La mayoría de los avisos dicen que se envíe la apelación a:</p>") + addressBlock(S.iceAddress) +
          (form() === "nvo" ? T("<p class=\"hint\">Look on page 2 of your notice, under “APPEAL RIGHTS.”</p>", "<p class=\"hint\">Fíjese en la página 2 de su aviso, debajo de “APPEAL RIGHTS.”</p>") : "");
      },
      fields: function () {
        var email = Case.destination(Object.assign({}, n(), { customEmail: "" })).method === "email";
        return [
          { type: "choice", key: base + "sameAddress", required: true,
            label: email ? T("Does your paper show this same email address?", "¿Su papel muestra este mismo correo electrónico?") : T("Does your paper show this same address?", "¿Su papel muestra esta misma dirección?"),
            options: [{ value: "yes", label: T("Yes, it’s the same", "Sí, es la misma") }, { value: "no", label: T("No, it’s different", "No, es diferente") }] },
          { type: "textarea", key: base + "customAddress", rows: 4, required: true, label: T("Type the address from your paper", "Escriba la dirección de su papel"),
            hint: T("One line for each line of the address.", "Una línea por cada línea de la dirección."), when: function () { return !email && n().sameAddress === "no"; }, validate: latinOnly },
          { type: "text", key: base + "customEmail", required: true, inputmode: "email", label: T("Type the email address from your paper", "Escriba el correo electrónico de su papel"),
            when: function () { return email && n().sameAddress === "no"; }, validate: validEmail }
        ];
      }
    });

    list.push({
      id: "n" + i + "-collector", section: "notice",
      when: function () { return n().form === "invoice" && n().invoiceFrom === "collector"; },
      title: T("The debt collector’s address", "La dirección del cobrador de deudas"),
      lead: T("We will make a dispute letter to the debt collector. Copy their mailing address from their letter.",
        "Vamos a preparar una carta de disputa para el cobrador de deudas. Copie la dirección postal de su carta."),
      fields: function () {
        return [{ type: "textarea", key: base + "customAddress", rows: 4, required: true,
          label: T("Debt collector’s name and mailing address", "Nombre y dirección postal del cobrador de deudas"),
          hint: T("One line for each line of the address.", "Una línea por cada línea de la dirección."), validate: latinOnly }];
      }
    });

    list.push({
      id: "n" + i + "-specific", section: "notice",
      when: function () { return Case.isComplete(n()) && (Case.fineOf(n()) === "274D" || Case.fineOf(n()) === "240B"); },
      title: function () { return Case.fineOf(n()) === "274D" ? T("Your removal order", "Su orden de deportación") : T("Your voluntary departure order", "Su orden de salida voluntaria"); },
      lead: T("If you don’t know, leave it empty. We use this to check whether the fine is too old (more than 5 years).",
        "Si no sabe, déjelo en blanco. Lo usamos para ver si la multa es demasiado vieja (más de 5 años)."),
      fields: function () {
        if (Case.fineOf(n()) === "274D") {
          return [{ type: "date", key: base + "orderDate", past: true,
            label: T("Date your removal (deportation) order became final", "Fecha en que su orden de deportación (remoción) quedó final"),
            hint: T("On a Notice of Violation and Order, Section 274D says: “On ____, an order of removal, for which you are subject, was made final.”",
              "En un “Notice of Violation and Order”, la sección 274D dice: “On ____, an order of removal, for which you are subject, was made final.”") }];
        }
        return [
          { type: "date", key: base + "vdGrant", past: true, label: T("Date the judge gave you voluntary departure", "Fecha en que el juez le dio la salida voluntaria"),
            hint: T("On a Notice of Violation and Order, Section 240B says: “On ____, you were permitted to depart voluntarily.”",
              "En un “Notice of Violation and Order”, la sección 240B dice: “On ____, you were permitted to depart voluntarily.”") },
          { type: "date", key: base + "vdDeadline", past: true, label: T("The last day you were allowed to leave (if you know it)", "El último día en que podía salir (si lo sabe)") }
        ];
      }
    });

    list.push({
      id: "n" + i + "-deadline", section: "notice",
      when: function () { return Case.isComplete(n()); },
      title: T("Your deadline", "Su fecha límite"),
      html: function () {
        var nn = n();
        var dl = Case.deadline(nn);
        if (!dl) return '<div class="callout">' + T("We could not figure out your deadline. Send your papers as soon as you can.", "No pudimos calcular su fecha límite. Envíe sus papeles lo antes posible.") + "</div>";
        var late = Case.isLate(nn);
        var when = U.weekdayUI(dl.date) + ", " + U.fmtDateUI(dl.date);
        var verb = dl.by === "postmarked" ? T("mailed (postmarked)", "enviados por correo (con matasellos)") :
          (Case.destination(nn).method === "email" ? T("sent", "enviados") : T("received", "recibidos"));
        return '<div class="callout ' + (late ? "callout-warn" : "callout-deadline") + '">' +
          (late
            ? T("<p><strong>Your deadline seems to have passed</strong> (" + U.fmtDateUI(dl.date) + ").</p><p><strong>Keep going and send your papers anyway.</strong> Lawyers who work on these fines recommend it, so that your defenses are on the record. Later, we will ask why you are sending it late.</p>",
                "<p><strong>Parece que su fecha límite ya pasó</strong> (" + U.fmtDateUI(dl.date) + ").</p><p><strong>Siga adelante y envíe sus papeles de todas maneras.</strong> Los abogados que trabajan con estas multas lo recomiendan, para que sus defensas queden por escrito. Más adelante le preguntaremos por qué lo envía tarde.</p>")
            : T("<p>Your papers must be <strong>" + verb + " by " + when + "</strong>.</p><p>That is " + U.escapeHtml(dl.rule) + ".</p>",
                "<p>Sus papeles deben ser <strong>" + verb + " a más tardar el " + when + "</strong>.</p><p>Es decir, " + U.escapeHtml(dl.ruleEs) + ".</p>")) +
          "</div><p class=\"hint\">" +
          T("Deadlines are counted from the date printed on the " + (nn.form === "invoice" ? "bill" : "notice") + ", even if it reached you late. Most people can finish this tool in 20–30 minutes.",
            "El plazo se cuenta desde la fecha impresa en " + (nn.form === "invoice" ? "la factura" : "el aviso") + ", aunque le haya llegado tarde. La mayoría de las personas termina en 20 a 30 minutos.") + "</p>";
      }
    });

    return list;
  }

  function buildScreens() {
    var list = [];

    list.push({ id: "welcome", section: "start", title: T("Fight your immigration fine", "Pelee su multa de inmigración"), custom: welcomeHtml, nextLabel: T("Start →", "Empezar →") });

    state.notices.forEach(function (_, i) { list = list.concat(noticeScreens(i)); });

    list.push({
      id: "more", section: "notice",
      title: T("Do you have another fine notice?", "¿Tiene otro aviso de multa?"),
      lead: T("For example, a second notice with a different tracking number, or a notice with two sections checked. Each one needs its own papers.",
        "Por ejemplo, un segundo aviso con otro número, o un aviso con dos secciones marcadas. Cada uno necesita sus propios papeles."),
      html: function () {
        var items = state.notices.map(function (n, i) {
          return "<li><span>" + U.escapeHtml(Case.noticeLabel(n, i)) + "</span>" +
            (state.notices.length > 1 ? ' <button type="button" class="link-btn" data-action="remove-notice" data-i="' + i + '">' + T("Remove", "Quitar") + "</button>" : "") + "</li>";
        }).join("");
        return "<p><strong>" + T("Notices so far:", "Avisos hasta ahora:") + "</strong></p><ul class=\"notice-list\">" + items + "</ul>";
      },
      fields: function () {
        return [{ type: "choice", key: "moreAnswer", required: true, label: T("Do you have another notice?", "¿Tiene otro aviso?"),
          options: [{ value: "yes", label: T("Yes, add another notice", "Sí, agregar otro aviso") }, { value: "no", label: T("No, that’s all", "No, es todo") }] }];
      },
      onNext: function () {
        if (state.moreAnswer === "yes") {
          state.notices.push({});
          state.moreAnswer = "";
          return "n" + (state.notices.length - 1) + "-form";
        }
      }
    });

    list.push({
      id: "name", section: "you", title: T("Your name", "Su nombre"),
      lead: T("Write your name <strong>the same way it is written on your notice</strong>.", "Escriba su nombre <strong>igual que como aparece en su aviso</strong>."),
      fields: function () {
        return [
          { type: "text", key: "person.firstName", label: T("First name", "Nombre"), required: true, autocomplete: "given-name", validate: latinOnly },
          { type: "text", key: "person.middleName", label: T("Middle name (optional)", "Segundo nombre (opcional)"), autocomplete: "additional-name", validate: latinOnly },
          { type: "text", key: "person.lastName", label: T("Last name(s)", "Apellido(s)"), required: true, autocomplete: "family-name", validate: latinOnly }
        ];
      }
    });

    list.push({
      id: "anumber", section: "you", title: T("Your A-Number", "Su Número A (A-Number)"),
      lead: T("Your A-Number (Alien Registration Number) has 8 or 9 digits. On the notice it is called <strong>“File Number.”</strong> It may start with the letter A.",
        "Su Número A (número de registro de extranjero o “A-Number”) tiene 8 o 9 dígitos. En el aviso se llama <strong>“File Number.”</strong> Puede empezar con la letra A."),
      fields: function () {
        return [{
          type: "text", key: "person.aNumber", label: T("A-Number", "Número A"), required: true, inputmode: "numeric", placeholder: T("Example: 123 456 789", "Ejemplo: 123 456 789"), short: true,
          validate: function (v) {
            var d = U.digits(v);
            return d.length >= 7 && d.length <= 9 ? "" : T("An A-Number has 8 or 9 numbers. Please check it.", "Un Número A tiene 8 o 9 números. Revíselo, por favor.");
          }
        }];
      }
    });

    list.push({
      id: "address", section: "you", title: T("Your address and contact information", "Su dirección y datos de contacto"),
      lead: T("Use your <strong>current mailing address</strong> — where DHS should send letters. It is OK if it is different from the address on your notice.",
        "Use su <strong>dirección postal actual</strong>, donde el DHS debe mandarle cartas. No importa si es diferente de la dirección en su aviso."),
      fields: function () {
        return [
          { type: "text", key: "person.street", label: T("Street address", "Calle y número"), required: true, autocomplete: "address-line1", validate: latinOnly },
          { type: "text", key: "person.apt", label: T("Apartment, unit, or floor (optional)", "Apartamento, unidad o piso (opcional)"), autocomplete: "address-line2", short: true, validate: latinOnly },
          { type: "text", key: "person.city", label: T("City", "Ciudad"), required: true, autocomplete: "address-level2", validate: latinOnly },
          { type: "select", key: "person.state", label: T("State", "Estado"), required: true, options: STATES.map(function (s) { return { value: s, label: s }; }) },
          { type: "text", key: "person.zip", label: T("ZIP code", "Código postal (ZIP)"), required: true, inputmode: "numeric", autocomplete: "postal-code", short: true,
            validate: function (v) { return /^\d{5}(-?\d{4})?$/.test(String(v).trim()) ? "" : T("A ZIP code has 5 numbers.", "Un código postal tiene 5 números."); } },
          { type: "text", key: "person.phone", label: T("Phone number (optional)", "Teléfono (opcional)"), inputmode: "tel", autocomplete: "tel", short: true },
          { type: "text", key: "person.email", label: T("Email (optional)", "Correo electrónico (opcional)"), inputmode: "email", autocomplete: "email", validate: validEmail }
        ];
      }
    });

    list.push({
      id: "story-intro", section: "story", title: T("Now, your story", "Ahora, su historia"),
      html: function () {
        return T("<p>Next, we will ask some questions about your situation. Your answers help explain why you should not have to pay the fine.</p>",
            "<p>Ahora le haremos algunas preguntas sobre su situación. Sus respuestas ayudan a explicar por qué no debería tener que pagar la multa.</p>") +
          '<div class="callout">' +
          T("<p><strong>Only say things that are true.</strong> You will sign your papers under “penalty of perjury.” That means it is a crime to lie in them.</p>",
            "<p><strong>Diga solo cosas que sean verdad.</strong> Usted firmará sus papeles “bajo pena de perjurio”. Eso quiere decir que mentir en ellos es un delito.</p>") +
          T("<p>If you are not sure about something, choose <strong>“Not sure”</strong> or leave it empty. We will leave it out of your papers.</p>",
            "<p>Si no está seguro de algo, elija <strong>“No estoy seguro”</strong> o déjelo en blanco. No lo pondremos en sus papeles.</p>") + "</div>" +
          T("<p>Most questions are optional. Each answer you give becomes a short sentence in your papers. You will see all of them before you finish.</p>",
            "<p>La mayoría de las preguntas son opcionales. Cada respuesta se convierte en una oración corta en sus papeles. Las verá todas antes de terminar.</p>") +
          (U.lang() === "es" ? '<div class="callout callout-warn"><p><strong>Sus papeles estarán en inglés</strong>, porque el gobierno los exige en inglés. Nosotros traducimos sus respuestas automáticamente. Si una pregunta le pide escribir algo con sus propias palabras, trate de escribirlo en inglés, o pida ayuda a alguien de confianza.</p></div>' : "");
      }
    });

    list.push({
      id: "st-arrival", section: "story", title: T("When you came to the United States", "Cuándo llegó a los Estados Unidos"),
      fields: function () {
        return [
          { type: "select", key: "story.arrivalYear", label: T("Year you first came to live in the United States", "Año en que llegó a vivir a los Estados Unidos por primera vez"),
            hint: T("If you are not sure, leave it empty.", "Si no está seguro, déjelo en blanco."), options: yearOptions() },
          { type: "select", key: "story.arrivalMonth", label: T("Month (optional)", "Mes (opcional)"),
            options: U.MONTHS.map(function (m, i) { return { value: String(i + 1), label: U.monthUI(i) }; }), when: function () { return !!state.story.arrivalYear; } }
        ];
      }
    });

    list.push({
      id: "st-order", section: "story", when: anyA, title: T("About your immigration court order", "Sobre su orden de la corte de inmigración"),
      fields: function () {
        return [
          { type: "choice", key: "story.knewOrder", label: T("When the judge made the order in your case, did you know about it?", "Cuando el juez dictó la orden en su caso, ¿usted lo sabía?"),
            hint: T("Some people were ordered to leave when they were not in court (“in absentia”), and did not know.", "A algunas personas les ordenaron salir cuando no estaban en la corte (“in absentia”) y no lo sabían."), options: yesNoUnsure() },
          { type: "date", key: "story.learnedOrderDate", past: true, label: T("When did you find out about the order? (optional)", "¿Cuándo se enteró de la orden? (opcional)"), when: function () { return state.story.knewOrder === "no"; } },
          { type: "choice", key: "story.minorAtOrder", label: T("Were you under 18 years old when the order was made?", "¿Tenía menos de 18 años cuando se dictó la orden?"), options: yesNoUnsure() },
          { type: "choice", key: "story.warned", label: T("Did anyone — the judge or your court papers — ever warn you that you could be fined money for not leaving?", "¿Alguien —el juez o sus papeles de la corte— le advirtió alguna vez que le podían multar por no salir?"), options: yesNoUnsure() },
          { type: "choice", key: "story.hadVD", when: function () { return anyFine(["274D"]); }, label: T("Did the judge give you “voluntary departure” (permission to leave on your own by a certain date)?", "¿El juez le dio “salida voluntaria” (permiso para salir por su cuenta antes de cierta fecha)?"), options: yesNoUnsure() },
          { type: "choice", key: "story.warnedDaily", when: function () { return anyFine(["274D"]) && state.story.hadVD === "yes"; }, label: T("Were you ever warned that you could be fined for each day you stayed (up to $998 a day)?", "¿Alguna vez le advirtieron que le podían multar por cada día que se quedara (hasta $998 por día)?"), options: yesNoUnsure() }
        ];
      }
    });

    list.push({
      id: "st-ice", section: "story", when: anyA, title: T("Your contact with ICE", "Su contacto con ICE"),
      lead: T("Following ICE’s rules shows that you were not refusing to leave on purpose.", "Cumplir con las reglas de ICE muestra que usted no se negaba a salir a propósito."),
      fields: function () {
        var nowPast = [{ value: "now", label: T("Yes, now", "Sí, ahora") }, { value: "past", label: T("Yes, in the past", "Sí, en el pasado") }, { value: "no", label: T("No", "No") }, { value: "unsure", label: T("Not sure", "No estoy seguro") }];
        return [
          { type: "choice", key: "story.supervision", label: T("Are you on an “Order of Supervision” with ICE?", "¿Está bajo una “Orden de Supervisión” (Order of Supervision) de ICE?"),
            hint: T("This is a paper from ICE (often Form I-220B) that lets you stay in the U.S. while you report to ICE.", "Es un papel de ICE (a menudo el Formulario I-220B) que le permite quedarse en EE. UU. mientras se reporta con ICE."), options: nowPast },
          { type: "choice", key: "story.checkins", label: T("Do you go to check-ins with ICE?", "¿Va a sus citas de control (check-ins) con ICE?"), options: [
            { value: "all", label: T("Yes, I go to all of them", "Sí, voy a todas") }, { value: "some", label: T("Yes, but I missed some", "Sí, pero falté a algunas") },
            { value: "no", label: T("No", "No") }, { value: "unsure", label: T("Not sure", "No estoy seguro") }] },
          { type: "choice", key: "story.isap", label: T("Are you in ISAP (ICE’s “Alternatives to Detention” program)?", "¿Está en ISAP (el programa de “Alternativas a la Detención” de ICE)?"),
            hint: T("For example: an ankle monitor, the SmartLINK phone app, phone check-ins, or home visits.", "Por ejemplo: un grillete electrónico, la aplicación SmartLINK, reportes por teléfono o visitas a su casa."), options: nowPast },
          { type: "checks", key: "story.isapTypes", label: T("What does (or did) ISAP include? Check all that apply.", "¿Qué incluye (o incluía) ISAP? Marque todo lo que aplique."),
            when: function () { return state.story.isap === "now" || state.story.isap === "past"; }, options: [
              { value: "ankle", label: T("An ankle monitor", "Un grillete electrónico (en el tobillo)") }, { value: "app", label: T("A phone app for check-ins (like SmartLINK)", "Una aplicación del teléfono para reportarse (como SmartLINK)") },
              { value: "calls", label: T("Phone calls", "Llamadas telefónicas") }, { value: "visits", label: T("Home visits", "Visitas a su casa") }] }
        ];
      }
    });

    list.push({
      id: "st-apps", section: "story", title: T("Immigration applications", "Solicitudes de inmigración"),
      lead: T("Have you ever applied for any of these? Check all that apply. You do not need to have won.",
        "¿Alguna vez ha solicitado algo de esto? Marque todo lo que aplique. No importa si no se lo aprobaron."),
      custom: appsHtml
    });

    list.push({
      id: "st-reasons", section: "story", when: anyA, title: T("Things that made it hard to leave", "Cosas que le hicieron difícil salir"),
      fields: function () {
        return [
          { type: "choice", key: "story.custody", label: T("After your order, were you ever held in jail, prison, or immigration detention?", "Después de su orden, ¿estuvo alguna vez en la cárcel, en prisión o en detención de inmigración?"), options: yesNo() },
          { type: "text", key: "story.custodyWhen", label: T("About when? (optional)", "¿Más o menos cuándo? (opcional)"), placeholder: T("Example: from March 2019 to June 2020", "Ejemplo: from March 2019 to June 2020"),
            english: true, when: function () { return state.story.custody === "yes"; }, validate: latinOnly },
          { type: "choice", key: "story.healthTravel", label: T("Have serious health problems (yours or your family’s) made it very hard or impossible for you to travel?", "¿Problemas graves de salud (suyos o de su familia) le han hecho muy difícil o imposible viajar?"), options: yesNo() },
          { type: "choice", key: "story.vawaCentral", when: function () { return anyFine(["240B"]) && state.story.apps.vawa && state.story.apps.vawa.on; },
            label: T("Was abuse (by your U.S. citizen or permanent resident family member) one of the main reasons you did not leave by your voluntary departure date?", "¿El abuso (de su familiar ciudadano o residente permanente) fue una de las razones principales por las que no salió antes de su fecha de salida voluntaria?"), options: yesNoUnsure() }
        ];
      }
    });

    list.push({
      id: "st-entry", section: "story", when: anyB, title: T("How and where you were stopped", "Cómo y dónde lo detuvieron"),
      lead: T("<strong>You do not have to answer these.</strong> We only put an answer in your papers if it helps you.",
        "<strong>No tiene que contestar estas preguntas.</strong> Solo pondremos una respuesta en sus papeles si le ayuda."),
      fields: function () {
        return [
          { type: "choice", key: "story.howEntered", label: T("How did you come into the United States?", "¿Cómo entró a los Estados Unidos?"), options: [
            { value: "visa", label: T("With a visa", "Con una visa"), desc: T("For example, a tourist, student, or work visa.", "Por ejemplo, una visa de turista, de estudiante o de trabajo.") },
            { value: "port", label: T("An officer at an official border crossing or airport let me in", "Un oficial en un cruce fronterizo oficial o aeropuerto me dejó entrar"), desc: T("For example, with a CBP One appointment or parole.", "Por ejemplo, con una cita de CBP One o con parole.") },
            { value: "other", label: T("Another way, or I prefer not to say", "De otra forma, o prefiero no decirlo") }] },
          { type: "choice", key: "story.whereStopped", label: T("Where were you when immigration officers first stopped you or took you into custody?", "¿Dónde estaba cuando los oficiales de inmigración lo detuvieron por primera vez?"), options: [
            { value: "border", label: T("At the border, while I was crossing", "En la frontera, mientras cruzaba") },
            { value: "interior", label: T("Inside the U.S., away from the border", "Dentro de EE. UU., lejos de la frontera"), desc: T("For example, at home, at work, at an ICE check-in, or during a traffic stop.", "Por ejemplo, en su casa, en el trabajo, en una cita con ICE o cuando lo pararon manejando.") },
            { value: "never", label: T("I was never stopped — the notice just came to me", "Nunca me detuvieron; el aviso simplemente me llegó") },
            { value: "unsure", label: T("Not sure, or I prefer not to say", "No estoy seguro, o prefiero no decirlo") }] },
          { type: "text", key: "story.stopPlace", label: T("City and state where this happened (optional)", "Ciudad y estado donde pasó (opcional)"), placeholder: T("Example: Houston, Texas", "Ejemplo: Houston, Texas"),
            when: function () { return state.story.whereStopped === "interior"; }, validate: latinOnly },
          { type: "date", key: "story.stopDate", past: true, label: T("Date (optional)", "Fecha (opcional)"), when: function () { return state.story.whereStopped === "interior"; } }
        ];
      }
    });

    list.push({
      id: "st-family", section: "story", title: T("Your family", "Su familia"),
      lead: T("Who depends on you for money or care?", "¿Quién depende de usted económicamente o para su cuidado?"),
      fields: function () {
        return [
          { type: "choice", key: "story.spouse", label: T("A spouse or partner?", "¿Un esposo, esposa o pareja?"), options: yesNo() },
          { type: "number", key: "story.children", label: T("How many children depend on you?", "¿Cuántos hijos dependen de usted?"), min: 0, max: 20, hint: T("Write 0 if none.", "Escriba 0 si ninguno.") },
          { type: "number", key: "story.usChildren", label: T("How many of these children are U.S. citizens?", "¿Cuántos de esos hijos son ciudadanos estadounidenses?"), min: 0, max: 20, hint: T("Write 0 if none.", "Escriba 0 si ninguno.") },
          { type: "number", key: "story.otherDependents", label: T("Other family members who depend on you (for example, parents)?", "¿Otros familiares que dependen de usted (por ejemplo, sus padres)?"), min: 0, max: 20, hint: T("Write 0 if none.", "Escriba 0 si ninguno.") }
        ];
      }
    });

    list.push({
      id: "st-money", section: "story", title: T("Work and money", "Trabajo y dinero"),
      lead: T("This helps show that the fine would be an unfair burden on you and your family.", "Esto ayuda a mostrar que la multa sería una carga injusta para usted y su familia."),
      fields: function () {
        return [
          { type: "choice", key: "story.working", label: T("Are you working now?", "¿Está trabajando ahora?"), options: yesNo() },
          { type: "text", key: "story.job", label: T("What work do you do?", "¿En qué trabaja?"), placeholder: T("Example: cook in a restaurant", "Ejemplo: cook in a restaurant (cocinero en un restaurante)"),
            english: true, when: function () { return state.story.working === "yes"; }, validate: latinOnly },
          { type: "money", key: "story.income", label: T("About how much do you earn each month? (optional)", "¿Más o menos cuánto gana al mes? (opcional)"), when: function () { return state.story.working === "yes"; } },
          { type: "text", key: "story.notWorkingWhy", label: T("Why not? (optional)", "¿Por qué no? (opcional)"), placeholder: T("Example: I take care of my children", "Ejemplo: I take care of my children (cuido a mis hijos)"),
            english: true, when: function () { return state.story.working === "no"; }, validate: latinOnly },
          { type: "choice", key: "story.leftover", label: T("After you pay rent, food, and bills each month, how much money is left?", "Después de pagar la renta, la comida y las cuentas cada mes, ¿cuánto dinero le queda?"), options: [
            { value: "none", label: T("Nothing — or not enough", "Nada, o no me alcanza") }, { value: "little", label: T("A little", "Un poco") }, { value: "some", label: T("More than a little", "Más que un poco") }] },
          { type: "choice", key: "story.savings", label: T("Do you have savings?", "¿Tiene ahorros?"), options: [
            { value: "none", label: T("No savings", "No tengo ahorros") }, { value: "small", label: T("Less than $1,000", "Menos de $1,000") }, { value: "more", label: T("$1,000 or more", "$1,000 o más") }] },
          { type: "choice", key: "story.taxes", label: T("Do you file taxes in the United States?", "¿Declara impuestos en los Estados Unidos?"), options: yesNo() }
        ];
      }
    });

    list.push({
      id: "st-health", section: "story", title: T("Health", "Salud"),
      fields: function () {
        return [
          { type: "choice", key: "story.health", label: T("Do you or someone in your family have serious health problems?", "¿Usted o alguien de su familia tiene problemas graves de salud?"), options: yesNo() },
          { type: "textarea", key: "story.healthText", rows: 3, label: T("Tell us in 1 or 2 sentences", "Explíquelo en 1 o 2 oraciones"),
            hint: T("Start with “I” or “My.” Example: “My daughter has asthma and needs medicine every day.”", "Ejemplo en inglés: “My daughter has asthma and needs medicine every day.” (Mi hija tiene asma y necesita medicina todos los días.)"),
            english: true, when: function () { return state.story.health === "yes"; }, validate: latinOnly }
        ];
      }
    });

    list.push({
      id: "st-more", section: "story", title: T("Anything else?", "¿Algo más?"),
      lead: T("Optional. Write in English, starting with “I.” Short and true is best.", "Opcional. Lo mejor es algo corto y verdadero."),
      fields: function () {
        return [
          { type: "textarea", key: "story.community", rows: 3, label: T("Good things about you that DHS should know", "Cosas buenas de usted que el DHS debe saber"),
            placeholder: T("Example: I volunteer at my church every week. I have never been arrested.", "Ejemplo: I volunteer at my church every week. (Soy voluntario en mi iglesia cada semana.)"), english: true, validate: latinOnly },
          { type: "textarea", key: "story.extra", rows: 4, label: T("Anything else that explains why you should not be fined", "Cualquier otra cosa que explique por qué no deberían multarle"), english: true, validate: latinOnly }
        ];
      }
    });

    list.push({
      id: "st-late", section: "story", when: function () { return completeNotices().some(Case.isLate); },
      title: T("Why are you sending it late?", "¿Por qué lo envía tarde?"),
      lead: T("Your deadline seems to have passed. That’s OK — send your papers anyway. If you want, tell DHS why. (Optional.)",
        "Parece que su fecha límite ya pasó. Está bien: envíe sus papeles de todas maneras. Si quiere, explíquele al DHS por qué. (Opcional.)"),
      fields: function () {
        return [{ type: "text", key: "story.lateReason", label: T("Reason (optional)", "Razón (opcional)"),
          placeholder: T("Example: I did not receive the notice until weeks after its date", "Ejemplo: I did not receive the notice until weeks after its date"), english: true, validate: latinOnly }];
      }
    });

    list.push({
      id: "translator", section: "story", title: T("Did someone translate for you?", "¿Alguien le tradujo?"),
      lead: function () {
        return T("If someone read or explained these papers to you in another language, they should sign a short “Certificate of Translation.” We will make it for them.",
          "<strong>Sus papeles estarán en inglés.</strong> Si no lee bien el inglés, pida a una persona de confianza que se los lea y se los traduzca antes de firmar. Esa persona debe firmar un breve “Certificado de Traducción” (Certificate of Translation). Nosotros lo preparamos.");
      },
      fields: function () {
        var on = function () { return state.translator.used === "yes"; };
        return [
          { type: "choice", key: "translator.used", required: true, label: T("Did someone translate for you?", "¿Alguien le va a traducir o le tradujo los papeles?"),
            options: [{ value: "yes", label: T("Yes", "Sí") }, { value: "no", label: T("No, I read and understand English", "No, yo leo y entiendo inglés") }] },
          { type: "text", key: "translator.name", required: true, label: T("Translator’s full name", "Nombre completo de quien traduce"), when: on, validate: latinOnly },
          { type: "text", key: "translator.language", required: true, label: T("Your language", "Su idioma (escríbalo en inglés)"), placeholder: T("Example: Spanish", "Ejemplo: Spanish"), when: on, validate: latinOnly },
          { type: "text", key: "translator.street", required: true, label: T("Translator’s street address", "Dirección (calle y número) de quien traduce"), when: on, validate: latinOnly },
          { type: "text", key: "translator.cityStateZip", required: true, label: T("Translator’s city, state, and ZIP code", "Ciudad, estado y código postal de quien traduce"), when: on, validate: latinOnly }
        ];
      }
    });

    list.push({ id: "review", section: "review", title: T("Check your papers", "Revise sus papeles"), custom: reviewHtml, nextLabel: T("Make my papers", "Preparar mis papeles") });
    list.push({ id: "papers", section: "papers", title: T("Your papers are ready", "Sus papeles están listos"), custom: papersHtml, hideNext: true });

    return list.filter(function (s) { return !s.when || s.when(); });
  }

  function yearOptions() {
    var out = [];
    for (var y = U.today().getUTCFullYear(); y >= 1940; y--) out.push({ value: String(y), label: String(y) });
    return out;
  }

  /* ---------------- Custom screens ---------------- */

  function welcomeHtml() {
    var resume = !!(state.lastCur || (state.notices[0] && state.notices[0].form));
    var es = U.lang() === "es";
    var h = [];
    h.push('<p class="lang-note">' + (es
      ? 'This page is also available in English. <button type="button" class="link-btn" data-action="lang" data-lang="en">View in English</button>'
      : '¿Prefiere español? <button type="button" class="link-btn" data-action="lang" data-lang="es">Ver en español</button>') + "</p>");
    h.push('<p class="lead">' + T("Did you get a letter from the U.S. Department of Homeland Security (DHS) saying you must pay an immigration fine? This free tool helps you <strong>make the papers to fight it</strong> — by yourself, without a lawyer.",
      "¿Recibió una carta del Departamento de Seguridad Nacional (DHS) que dice que debe pagar una multa de inmigración? Esta herramienta gratuita le ayuda a <strong>preparar los papeles para pelearla</strong>, usted mismo, sin abogado.") + "</p>");
    h.push('<div class="grid-2">');
    h.push('<div class="card"><h3>' + T("What you will get", "Lo que recibirá") + "</h3><ul>" +
      T("<li>A <strong>cover letter</strong></li><li>Your <strong>written defense</strong> (a sworn statement explaining why you should not pay)</li><li>Clear <strong>instructions</strong> for what to do next</li>",
        "<li>Una <strong>carta de presentación</strong></li><li>Su <strong>defensa por escrito</strong> (una declaración jurada que explica por qué no debe pagar)</li><li><strong>Instrucciones</strong> claras en español de qué hacer después</li>") + "</ul></div>");
    h.push('<div class="card"><h3>' + T("What you need", "Lo que necesita") + "</h3><ul>" +
      T("<li>The <strong>notice</strong> you got from DHS</li><li>The <strong>envelope</strong> it came in, if you have it</li><li>About <strong>20–30 minutes</strong></li>",
        "<li>El <strong>aviso</strong> que recibió del DHS</li><li>El <strong>sobre</strong> en que llegó, si lo tiene</li><li>Unos <strong>20 a 30 minutos</strong></li>") + "</ul></div>");
    h.push("</div>");
    if (es) {
      h.push('<div class="callout"><p><strong>Las preguntas y las instrucciones están en español. Los papeles que usted enviará al gobierno estarán en inglés</strong>, porque el gobierno los exige en inglés. Le mostraremos en español lo que dicen sus papeles antes de terminar.</p></div>');
    }
    h.push('<div class="callout callout-warn"><p>' + T("<strong>Act fast. The deadline is short.</strong> For most notices it is only <strong>15 business days</strong> (about 3 weeks). If your deadline already passed, <strong>send your papers anyway</strong>.",
      "<strong>Actúe rápido. El plazo es corto.</strong> Para la mayoría de los avisos es de solo <strong>15 días hábiles</strong> (unas 3 semanas). Si su fecha límite ya pasó, <strong>envíe sus papeles de todas maneras</strong>.") + "</p></div>");
    h.push("<p>" + T("<strong>This tool works for fines under:</strong> INA § 274D (not leaving after a deportation order), INA § 240B (voluntary departure), INA § 275(b) (entry), and 8 U.S.C. § 1815 (apprehension fee). It also helps if you got a bill for one of these fines.",
      "<strong>Esta herramienta sirve para multas bajo:</strong> INA § 274D (no salir después de una orden de deportación), INA § 240B (salida voluntaria), INA § 275(b) (entrada) y 8 U.S.C. § 1815 (cargo por detención). También ayuda si le llegó una factura por una de estas multas.") + "</p>");
    h.push('<div class="callout callout-private"><p>🔒 ' + T("<strong>Your answers stay private.</strong> They are saved only on this device. Nothing is sent to us or anyone else. You can erase everything at any time.",
      "<strong>Sus respuestas son privadas.</strong> Se guardan solo en este aparato. No se envían ni a nosotros ni a nadie. Puede borrar todo en cualquier momento.") + "</p></div>");
    function faq(q, a) { h.push('<details class="faq"><summary>' + q + "</summary><p>" + a + "</p></details>"); }
    faq(T("Is this legal advice?", "¿Esto es asesoría legal?"),
      T("No. This tool gives general information and helps you fill in papers. It is not a lawyer. If you can, talk to a lawyer about your situation: ",
        "No. Esta herramienta da información general y le ayuda a llenar papeles. No es un abogado. Si puede, hable con un abogado sobre su situación: ") +
      link(S.links.findLawyer, T("find free or low-cost legal help", "encuentre ayuda legal gratis o de bajo costo")) +
      T(". Do not miss your deadline while you look for one.", ". No deje pasar su fecha límite mientras busca uno."));
    faq(T("Is it risky to fight the fine?", "¿Es arriesgado pelear la multa?"),
      T("It is up to DHS to prove that the fine is justified. The lawyers who wrote the model papers this tool uses encourage people to file an opposition and raise every defense they have. If you are worried, talk to a lawyer.",
        "Le toca al DHS probar que la multa es justa. Los abogados que escribieron los modelos que usa esta herramienta animan a las personas a presentar una oposición y a usar todas sus defensas. Si está preocupado, hable con un abogado."));
    faq(T("I don’t read English well. Can I still use this?", "No leo bien el inglés. ¿Puedo usar esto?"),
      T("Yes. You can use this tool in Spanish (button at the top). Ask someone you trust to help you. The papers must be in English. If someone translates for you, we will make a short “Certificate of Translation” for them to sign.",
        "Sí. Las preguntas y las instrucciones están en español. Los papeles deben ir en inglés, así que pida a una persona de confianza que se los lea y traduzca antes de firmar. Nosotros preparamos un breve “Certificado de Traducción” para que esa persona lo firme."));
    faq(T("I got more than one notice.", "Recibí más de un aviso."),
      T("That is common — for example, a § 1815 notice and a § 275(b) notice. Answer the questions for the first one. Before you finish, we will ask if you have another, and make separate papers for each.",
        "Es común; por ejemplo, un aviso de § 1815 y uno de § 275(b). Conteste las preguntas del primero. Antes de terminar, le preguntaremos si tiene otro y prepararemos papeles separados para cada uno."));
    faq(T("Where can I learn more?", "¿Dónde puedo aprender más?"),
      T("Read the questions and answers at ", "Lea las preguntas y respuestas (en español) de ") + link(faqLink(), "noimmigrationfines.org") + ".");
    if (resume) {
      h.push('<div class="resume"><p>' + T("You already started. Do you want to continue?", "Usted ya empezó. ¿Quiere continuar?") +
        '</p><button type="button" class="btn btn-primary" data-action="resume">' + T("Continue where I left off", "Continuar donde me quedé") +
        '</button> <button type="button" class="btn btn-secondary" data-action="restart">' + T("Start over", "Empezar de nuevo") + "</button></div>");
    }
    return h.join("");
  }

  function appsHtml() {
    var apps = state.story.apps;
    var opts = [{ value: "", label: T("Choose…", "Elija…") }, { value: "pending", label: T("Still waiting for a decision", "Todavía espero una decisión") },
      { value: "approved", label: T("Approved", "Aprobada") }, { value: "denied", label: T("Denied", "Negada") }, { value: "unsure", label: T("Not sure", "No estoy seguro") }];
    function statusSelect(key) {
      var v = (apps[key] && apps[key].status) || "";
      return '<label class="inline-label">' + T("What happened?", "¿Qué pasó?") + ' <select data-app-status="' + key + '">' + opts.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === v ? " selected" : "") + ">" + o.label + "</option>";
      }).join("") + "</select></label>";
    }
    var h = ['<div class="checks" data-field="apps">'];
    Case.APPS.concat([{ key: "other", label: "Something else", labelEs: "Otra cosa" }]).forEach(function (a) {
      var on = apps[a.key] && apps[a.key].on;
      h.push('<div class="opt-block"><label class="opt opt-check"><input type="checkbox" data-app="' + a.key + '"' + (on ? " checked" : "") + "><span>" + U.escapeHtml(T(a.label, a.labelEs)) + "</span></label>");
      if (on) {
        h.push('<div class="opt-sub">');
        if (a.key === "other") {
          h.push('<label class="inline-label">' + T("What did you apply for?", "¿Qué solicitó? (en inglés si puede)") +
            ' <input type="text" data-app-text="other" value="' + U.escapeHtml(apps.other.text || "") + '"></label>');
        }
        h.push(statusSelect(a.key) + "</div>");
      }
      h.push("</div>");
    });
    h.push("</div>");
    return h.join("");
  }

  // A fact as shown on screen: in Spanish mode, the Spanish meaning plus the English words that go in the papers.
  function factHtml(f) {
    if (U.lang() !== "es") return U.escapeHtml(f.en);
    return U.escapeHtml(f.es) + (f.es !== f.en ? '<small class="en-text" lang="en">' + U.escapeHtml(f.en) + "</small>" : "");
  }

  function reviewHtml() {
    var p = state.person;
    var es = U.lang() === "es";
    var h = [];
    h.push("<p>" + T("Please read this page carefully. You can change anything by clicking <strong>Change</strong>.",
      "Lea esta página con cuidado. Puede cambiar cualquier cosa con el botón <strong>Cambiar</strong>.") + "</p>");
    if (es) {
      h.push('<div class="callout"><p>Sus papeles estarán <strong>en inglés</strong>. Abajo le mostramos en español lo que dirá cada oración, y en letra pequeña cómo aparecerá en inglés.</p></div>');
    }
    h.push('<div class="card"><h3>' + T("About you", "Sus datos") + ' <button type="button" class="link-btn" data-goto="name">' + T("Change", "Cambiar") + '</button></h3><dl class="summary">' +
      row(T("Name", "Nombre"), Case.fullName(p)) + row(T("A-Number", "Número A"), U.fmtANumber(p.aNumber)) +
      row(T("Address", "Dirección"), U.clean(p.street) + (p.apt ? ", " + p.apt : "") + ", " + U.clean(p.city) + ", " + (p.state || "") + " " + U.clean(p.zip)) +
      row(T("Phone", "Teléfono"), p.phone || "—") + row(T("Email", "Correo electrónico"), p.email || "—") + "</dl></div>");

    completeNotices().forEach(function (n) {
      var i = state.notices.indexOf(n);
      var dl = Case.deadline(n);
      h.push('<div class="card"><h3>' + U.escapeHtml(Case.noticeLabel(n, i)) + ' <button type="button" class="link-btn" data-goto="n' + i + '-form">' + T("Change", "Cambiar") + "</button></h3>");
      h.push('<dl class="summary">' +
        row(Case.trackingLabel(n), n.tracking || "—") +
        (n.noticeDate ? row(T("Notice date", "Fecha del aviso"), U.fmtDateUI(n.noticeDate)) : "") +
        (n.invoiceDate ? row(T("Bill date", "Fecha de la factura"), U.fmtDateUI(n.invoiceDate)) : "") +
        row(T("Amount", "Cantidad"), U.fmtMoney(U.parseMoney(n.amount))) +
        row(T("Deadline", "Fecha límite"), dl ? U.fmtDateUI(dl.date) + (Case.isLate(n) ? T(" (passed — send anyway)", " (ya pasó; envíelo de todas maneras)") : "") : "—") + "</dl>");

      var defs = Case.defenseOptions(state, n);
      if (defs.length) {
        h.push("<h4>" + T("Extra defenses", "Defensas adicionales") + '</h4><p class="hint">' +
          T("We checked these based on your answers. Check only the ones that are true for you.", "Las marcamos según sus respuestas. Marque solo las que sean verdad para usted.") + '</p><div class="checks">');
        defs.forEach(function (o) {
          var text = es ? U.escapeHtml(o.es) + '<small class="en-text" lang="en">' + U.escapeHtml(o.text) + "</small>" : "“" + U.escapeHtml(o.text) + "”";
          h.push('<label class="opt opt-check"><input type="checkbox" data-def="' + i + ":" + o.key + '"' + (o.on ? " checked" : "") + "><span>" + text + "<small>" + U.escapeHtml(o.why) + "</small></span></label>");
        });
        h.push("</div>");
      }

      var facts = [].concat.apply([], Case.factParagraphs(state, n));
      h.push("<h4>" + T("Facts about you that will be in your papers", "Datos sobre usted que estarán en sus papeles") + "</h4>");
      if (facts.length) {
        h.push('<ul class="facts">' + facts.map(function (f) { return "<li>" + factHtml(f) + "</li>"; }).join("") + "</ul>");
        h.push('<p class="hint">' + T("Something wrong?", "¿Algo está mal?") + ' <button type="button" class="link-btn" data-goto="story-intro">' + T("Change your answers", "Cambie sus respuestas") + "</button></p>");
      } else {
        h.push('<p class="hint">' + T("You did not add any facts. That is OK, but facts about your situation can help.", "No agregó ningún dato. Está bien, pero los datos sobre su situación pueden ayudar.") +
          ' <button type="button" class="link-btn" data-goto="story-intro">' + T("Add facts", "Agregar datos") + "</button></p>");
      }
      if (es) {
        h.push('<details class="preview"><summary>Qué más dicen sus papeles (resumen en español)</summary><div class="callout">' +
          "<p>Además de sus datos, su defensa por escrito dice que:</p><ul>" +
          "<li>Usted presenta esta oposición a la multa y no tiene los medios económicos para pagarla.</li>" +
          (Case.FINES[Case.fineOf(n)].template === "A" ? "<li>La multa es excesiva y viola la Octava Enmienda de la Constitución.</li>" : "") +
          "<li>El aviso viola su derecho al debido proceso (Quinta Enmienda): por ejemplo, el DHS no dio pruebas, no explicó qué factores considera, y la misma agencia que lo acusa es la que decide." +
          ((state.story || {}).warned !== "yes" ? " También dice que nunca le advirtieron de multas como estas." : "") + "</li>" +
          "<li>La multa viola su derecho a un juicio con jurado (Séptima Enmienda).</li>" +
          "<li>El DHS le causa angustia emocional con multas excesivas y desproporcionadas.</li>" +
          "<li>Si el DHS lo multa de todas maneras, la multa debe ser mínima; usted pide que la retiren, y se reserva el derecho de tomar acciones legales.</li>" +
          "<li>Al final, usted declara bajo pena de perjurio que todo es verdad.</li></ul>" +
          "<p>La carta de presentación dice que usted " + (n.form === "nvo" ? "apela el aviso, niega la violación" : "disputa la multa") + " y pide copias de los documentos del gobierno sobre su caso.</p></div></details>");
      }
      h.push('<details class="preview"><summary>' + T("Read the full papers for this notice", "Leer los papeles completos (en inglés)") + '</summary><div class="doc" lang="en">' +
        Render.toHtml(Case.buildCoverLetter(state, n)) + '<hr class="d-break">' + Render.toHtml(Case.buildOpposition(state, n)) + "</div></details>");
      h.push("</div>");
    });
    h.push('<div class="callout"><p>' + T("By clicking <strong>Make my papers</strong>, you confirm that your answers are true to the best of your knowledge.",
      "Al hacer clic en <strong>Preparar mis papeles</strong>, usted confirma que sus respuestas son verdad, según su mejor conocimiento.") + "</p></div>");
    return h.join("");
  }

  function row(k, v) { return "<dt>" + U.escapeHtml(k) + "</dt><dd>" + U.escapeHtml(v) + "</dd>"; }

  function papersHtml() {
    var h = [];
    var es = U.lang() === "es";
    var notices = completeNotices();
    h.push('<p class="lead">' + T("Download your papers below. Then follow the steps to <strong>print, sign, and send</strong> them.",
      "Descargue sus papeles abajo. Después siga los pasos para <strong>imprimirlos, firmarlos y enviarlos</strong>.") + "</p>");
    if (es) {
      h.push('<div class="callout"><p><strong>Sus papeles están en inglés</strong>, porque el gobierno los exige en inglés. Las <strong>instrucciones</strong> están en español. Si no lee bien el inglés, pida a una persona de confianza que le lea sus papeles antes de firmar.</p></div>');
    }
    notices.forEach(function (n, k) {
      var i = state.notices.indexOf(n);
      var dl = Case.deadline(n);
      var dest = Case.destination(n);
      h.push('<section class="card papers-card"><h2>' + U.escapeHtml(Case.noticeLabel(n, i)) + "</h2>");
      if (dl) {
        var when = U.weekdayUI(dl.date) + ", " + U.fmtDateUI(dl.date);
        var verb = dl.by === "postmarked" ? T("mail", "envíelo por correo") : (dest.method === "email" ? T("send", "envíelo") : T("must arrive", "debe llegar"));
        h.push('<div class="callout ' + (Case.isLate(n) ? "callout-warn" : "callout-deadline") + '"><strong>' + (Case.isLate(n)
          ? T("Your deadline seems to have passed (" + U.fmtDateUI(dl.date) + "). Send your papers anyway, as soon as you can.",
              "Parece que su fecha límite ya pasó (" + U.fmtDateUI(dl.date) + "). Envíe sus papeles de todas maneras, lo antes posible.")
          : T("Deadline: " + verb + " by " + when, "Fecha límite: " + verb + " a más tardar el " + when)) + "</strong></div>");
      }
      h.push('<div class="downloads">' +
        '<button type="button" class="btn btn-primary btn-big" data-dl="pdf" data-i="' + i + '">' + T("⬇ Download papers (PDF, ready to print)", "⬇ Descargar papeles (PDF en inglés, listo para imprimir)") + "</button>" +
        '<button type="button" class="btn btn-secondary" data-dl="instructions" data-i="' + i + '">' + T("⬇ Download instructions (PDF)", "⬇ Descargar instrucciones (PDF en español)") + "</button>" +
        '<button type="button" class="btn btn-secondary" data-dl="docx" data-i="' + i + '">' + T("⬇ Word version (only if you need to edit)", "⬇ Versión Word (solo si necesita editar)") + "</button>" +
        '</div><p class="dl-status" id="dl-status-' + i + '" role="status" aria-live="polite"></p>');

      if (dest.method === "email") {
        var em = Case.emailText(state, n);
        var mailto = "mailto:" + encodeURIComponent(em.to) + "?subject=" + encodeURIComponent(em.subject) + "&body=" + encodeURIComponent(em.body);
        h.push('<div class="email-box"><h3>' + T("Your email", "Su correo electrónico") + "</h3>" +
          (es ? '<p class="hint">El asunto y el mensaje están en inglés porque van dirigidos al gobierno.</p>' : "") +
          copyRow(T("To", "Para"), em.to) + copyRow(T("Subject", "Asunto"), em.subject) +
          '<label class="field-label" for="em-body-' + i + '">' + T("Message", "Mensaje") + '</label><textarea id="em-body-' + i + '" readonly rows="10" lang="en">' + U.escapeHtml(em.body) + "</textarea>" +
          '<button type="button" class="btn btn-small" data-copy-target="em-body-' + i + '">' + T("Copy message", "Copiar mensaje") + "</button> " +
          '<a class="btn btn-small" href="' + mailto + '">' + T("Open in my email app", "Abrir en mi aplicación de correo") + "</a>" +
          '<p class="hint">' + T("Remember to <strong>attach</strong> your signed papers and a copy of your notice. Email apps cannot attach them for you.",
            "Recuerde <strong>adjuntar</strong> sus papeles firmados y una copia de su aviso. La aplicación de correo no puede adjuntarlos por usted.") + "</p></div>");
      }

      h.push('<details class="next-steps"' + (k === 0 ? " open" : "") + "><summary>" + T("What to do next — step by step", "Qué hacer ahora, paso a paso") + "</summary>" +
        Render.instructionsHtml(Case.nextSteps(state, n, i)) + "</details>");
      h.push("</section>");
    });
    h.push('<div class="card"><h3>' + T("More notices?", "¿Más avisos?") + "</h3><p>" + T("If you got another notice, you can make papers for it too.", "Si recibió otro aviso, también puede preparar papeles para ese.") +
      '</p><button type="button" class="btn btn-secondary" data-goto="more">' + T("Add another notice", "Agregar otro aviso") + "</button></div>");
    h.push('<div class="card card-erase"><h3>' + T("When you are done", "Cuando termine") + "</h3><p>" +
      T("If you are using a shared or public computer, <strong>erase your answers</strong> so that other people cannot see them. Download your papers first!",
        "Si usa una computadora compartida o pública, <strong>borre sus respuestas</strong> para que otras personas no puedan verlas. ¡Descargue sus papeles primero!") +
      '</p><button type="button" class="btn btn-danger" data-action="restart">' + T("Erase my answers from this device", "Borrar mis respuestas de este aparato") + "</button></div>");
    return h.join("");
  }

  function copyRow(label, value) {
    var id = "copy-" + Math.random().toString(36).slice(2);
    return '<div class="copy-row"><span class="copy-label">' + label + ':</span> <code id="' + id + '">' + U.escapeHtml(value) + '</code> <button type="button" class="btn btn-small" data-copy-target="' + id + '">' + T("Copy", "Copiar") + "</button></div>";
  }

  /* ---------------- Field rendering ---------------- */

  var fieldSeq = 0;

  function resolve(x) { return typeof x === "function" ? x() : x; }

  var ENGLISH_HINT = "Escriba en inglés si puede, porque irá en sus papeles en inglés. Si no sabe, pida ayuda a alguien de confianza.";

  function fieldHtml(f) {
    if (f.when && !f.when()) return "";
    var id = "f" + (++fieldSeq);
    var val = get(f.key);
    var label = U.escapeHtml(f.label || "");
    var hintText = [f.hint, f.english && U.lang() === "es" ? ENGLISH_HINT : ""].filter(Boolean).join(" ");
    var hint = hintText ? '<p class="hint" id="' + id + '-hint">' + U.escapeHtml(hintText) + "</p>" : "";
    var describedBy = hintText ? ' aria-describedby="' + id + '-hint"' : "";
    var err = '<p class="field-error" id="' + id + '-err" hidden></p>';
    var attrs = ' data-key="' + f.key + '" data-type="' + f.type + '"';

    switch (f.type) {
      case "choice":
        return '<fieldset class="field" data-field="' + f.key + '"><legend class="field-label">' + label + "</legend>" + hint + err +
          '<div class="opts">' + f.options.map(function (o) {
            return '<label class="opt"><input type="radio" name="' + id + '" value="' + o.value + '"' + attrs + (val === o.value ? " checked" : "") + ">" +
              "<span>" + U.escapeHtml(o.label) + (o.desc ? "<small>" + U.escapeHtml(o.desc) + "</small>" : "") + "</span></label>";
          }).join("") + "</div></fieldset>";
      case "checks":
        var obj = val || {};
        return '<fieldset class="field" data-field="' + f.key + '"><legend class="field-label">' + label + "</legend>" + hint + err +
          '<div class="opts">' + f.options.map(function (o) {
            return '<label class="opt opt-check"><input type="checkbox" value="' + o.value + '"' + attrs + (obj[o.value] ? " checked" : "") + "><span>" + U.escapeHtml(o.label) + "</span></label>";
          }).join("") + "</div></fieldset>";
      case "select":
        return '<div class="field" data-field="' + f.key + '"><label class="field-label" for="' + id + '">' + label + "</label>" + hint + err +
          '<select id="' + id + '"' + attrs + describedBy + '><option value="">' + T("Choose…", "Elija…") + "</option>" + f.options.map(function (o) {
            return '<option value="' + o.value + '"' + (String(val) === o.value ? " selected" : "") + ">" + U.escapeHtml(o.label) + "</option>";
          }).join("") + "</select></div>";
      case "textarea":
        return '<div class="field" data-field="' + f.key + '"><label class="field-label" for="' + id + '">' + label + "</label>" + hint + err +
          '<textarea id="' + id + '" rows="' + (f.rows || 3) + '"' + attrs + describedBy + (f.placeholder ? ' placeholder="' + U.escapeHtml(f.placeholder) + '"' : "") + ">" + U.escapeHtml(val || "") + "</textarea></div>";
      case "date":
        return '<div class="field" data-field="' + f.key + '"><label class="field-label" for="' + id + '">' + label + "</label>" + hint + err +
          '<input type="date" class="input-short" id="' + id + '"' + attrs + describedBy + ' value="' + U.escapeHtml(val || "") + '" min="1940-01-01"' +
          (f.past ? ' max="' + U.today().toISOString().slice(0, 10) + '"' : "") + "></div>";
      case "money":
        return '<div class="field" data-field="' + f.key + '"><label class="field-label" for="' + id + '">' + label + "</label>" + hint + err +
          '<div class="money"><span aria-hidden="true">$</span><input type="text" inputmode="decimal" class="input-short" id="' + id + '"' + attrs + describedBy + ' value="' + U.escapeHtml(val || "") + '" placeholder="0.00"></div></div>';
      case "number":
        return '<div class="field" data-field="' + f.key + '"><label class="field-label" for="' + id + '">' + label + "</label>" + hint + err +
          '<input type="number" class="input-tiny" inputmode="numeric" id="' + id + '"' + attrs + describedBy + ' min="' + (f.min || 0) + '" max="' + (f.max || 99) + '" value="' + U.escapeHtml(val === undefined ? "" : val) + '"></div>';
      default:
        return '<div class="field" data-field="' + f.key + '"><label class="field-label" for="' + id + '">' + label + "</label>" + hint + err +
          '<input type="text" id="' + id + '"' + attrs + describedBy + (f.short ? ' class="input-short"' : "") +
          (f.inputmode ? ' inputmode="' + f.inputmode + '"' : "") + (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : "") +
          (f.placeholder ? ' placeholder="' + U.escapeHtml(f.placeholder) + '"' : "") + ' value="' + U.escapeHtml(val || "") + '"></div>';
    }
  }

  /* ---------------- Validation ---------------- */

  function validate(screen) {
    var errors = [];
    var fields = (resolve(screen.fields) || []).filter(function (f) { return !f.when || f.when(); });
    fields.forEach(function (f) {
      var v = get(f.key);
      var msg = "";
      var empty = v === undefined || v === null || String(v).trim() === "";
      if (f.required && empty) {
        msg = f.type === "choice" ? T("Please choose an answer.", "Elija una respuesta, por favor.") : T("Please fill this in.", "Llene esto, por favor.");
      } else if (!empty && f.type === "date") {
        var d = U.parseDate(v);
        if (!d) msg = T("Please enter a full date (month, day, and year).", "Escriba la fecha completa (mes, día y año).");
        else if (f.past && d > U.today()) msg = T("This date is in the future. Please check it.", "Esta fecha está en el futuro. Revísela, por favor.");
        else if (d < U.parseDate("1940-01-01")) msg = T("Please check the year.", "Revise el año, por favor.");
      } else if (!empty && f.type === "money") {
        if (U.parseMoney(v) === null) msg = T("Please enter an amount, like 3000 or 1,820,352.00.", "Escriba una cantidad, como 3000 o 1,820,352.00.");
      } else if (!empty && f.type === "number") {
        var num = Number(v);
        if (isNaN(num) || num < (f.min || 0) || num > (f.max || 99) || Math.floor(num) !== num) msg = T("Please enter a whole number.", "Escriba un número entero.");
      }
      if (!msg && !empty && f.validate) msg = f.validate(v);
      if (msg) errors.push({ key: f.key, msg: msg });
    });
    if (screen.id === "st-family") {
      var kids = parseInt(state.story.children, 10) || 0;
      if ((parseInt(state.story.usChildren, 10) || 0) > kids) {
        errors.push({ key: "story.usChildren", msg: T("This number cannot be bigger than the number of children.", "Este número no puede ser mayor que el número de hijos.") });
      }
    }
    if (screen.id === "st-apps" && state.story.apps.other && state.story.apps.other.on && !U.clean(state.story.apps.other.text)) {
      errors.push({ key: "apps", msg: T("Please write what you applied for under “Something else,” or uncheck it.", "Escriba qué solicitó en “Otra cosa”, o quite la marca.") });
    }
    return errors;
  }

  function showErrors(errors) {
    var box = document.getElementById("error-summary");
    if (!errors.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = "<p><strong>" + (errors.length === 1 ? T("Please fix this before you continue:", "Corrija esto antes de continuar:") : T("Please fix these before you continue:", "Corrija esto antes de continuar:")) + "</strong></p><ul>" +
      errors.map(function (e) { return "<li>" + U.escapeHtml(e.msg) + "</li>"; }).join("") + "</ul>";
    var firstEl = null;
    errors.forEach(function (e) {
      var wrap = app.querySelector('[data-field="' + e.key + '"]');
      if (!wrap) return;
      wrap.classList.add("has-error");
      var p = wrap.querySelector(".field-error");
      if (p) { p.hidden = false; p.textContent = e.msg; }
      if (!firstEl) firstEl = wrap.querySelector("input, select, textarea");
    });
    (firstEl || box).focus();
    if (!firstEl) box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------- Rendering a screen ---------------- */

  function sections() {
    return [
      { key: "notice", label: T("Your notice", "Su aviso") },
      { key: "you", label: T("About you", "Sus datos") },
      { key: "story", label: T("Your story", "Su historia") },
      { key: "review", label: T("Review", "Revisar") },
      { key: "papers", label: T("Your papers", "Sus papeles") }
    ];
  }

  function render(focus) {
    chrome();
    var list = buildScreens();
    var idx = indexOf(list, state.cur);
    if (idx === -1) { idx = 0; state.cur = list[0].id; }
    var screen = list[idx];
    fieldSeq = 0;

    var progress = "";
    if (screen.section !== "start") {
      var secs = sections();
      var secIdx = secs.findIndex(function (s) { return s.key === screen.section; });
      var pct = Math.round((idx / (list.length - 1)) * 100);
      progress = '<nav class="progress" aria-label="' + T("Progress", "Progreso") + '"><ol>' + secs.map(function (s, k) {
        return '<li class="' + (k < secIdx ? "done" : k === secIdx ? "current" : "") + '"' + (k === secIdx ? ' aria-current="step"' : "") + ">" + s.label + "</li>";
      }).join("") + '</ol><div class="bar"><div style="width:' + pct + '%"></div></div></nav>';
    }

    var body = "";
    var lead = resolve(screen.lead);
    if (lead) body += '<p class="lead">' + lead + "</p>";
    if (screen.html) body += resolve(screen.html);
    if (screen.custom) body += screen.custom();
    var fields = resolve(screen.fields) || [];
    body += fields.map(fieldHtml).join("");

    var nav = '<div class="nav">';
    if (idx > 0) nav += '<button type="button" class="btn btn-secondary" data-action="back">' + T("← Back", "← Atrás") + "</button>";
    if (!screen.hideNext) nav += '<button type="submit" class="btn btn-primary">' + (screen.nextLabel || T("Continue →", "Continuar →")) + "</button>";
    nav += "</div>";

    app.innerHTML = progress +
      '<form id="screen-form" novalidate><h1 tabindex="-1">' + U.escapeHtml(resolve(screen.title)) + "</h1>" +
      '<div id="error-summary" class="error-summary" role="alert" tabindex="-1" hidden></div>' +
      body + nav + "</form>";

    if (focus !== false) {
      var h1 = app.querySelector("h1");
      if (h1) h1.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function indexOf(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  function currentScreen() {
    var list = buildScreens();
    return { list: list, idx: indexOf(list, state.cur), screen: list[indexOf(list, state.cur)] };
  }

  function goNext() {
    var c = currentScreen();
    if (!c.screen) return;
    var errors = validate(c.screen);
    if (errors.length) { showErrors(errors); return; }
    var target = c.screen.onNext && c.screen.onNext();
    var list = buildScreens();
    if (target) {
      state.cur = target;
    } else {
      var i = indexOf(list, c.screen.id);
      if (i < list.length - 1) state.cur = list[i + 1].id;
    }
    save();
    render();
  }

  function goBack() {
    var c = currentScreen();
    if (c.idx > 0) state.cur = c.list[c.idx - 1].id;
    save();
    render();
  }

  /* ---------------- Events ---------------- */

  function readInput(el) {
    var key = el.getAttribute("data-key");
    var type = el.getAttribute("data-type");
    if (!key) return false;
    if (type === "checks") {
      var obj = Object.assign({}, get(key) || {});
      obj[el.value] = el.checked;
      set(key, obj);
    } else {
      set(key, el.value);
    }
    var wrap = el.closest(".field");
    if (wrap && wrap.classList.contains("has-error")) {
      wrap.classList.remove("has-error");
      var p = wrap.querySelector(".field-error");
      if (p) p.hidden = true;
    }
    save();
    return type === "choice" || type === "checks" || type === "select";
  }

  app.addEventListener("input", function (e) {
    var el = e.target;
    if (el.matches("[data-app-text]")) {
      state.story.apps.other.text = el.value;
      save();
      return;
    }
    if (el.matches("input[type=text], input[type=number], input[type=date], textarea")) readInput(el);
  });

  app.addEventListener("change", function (e) {
    var el = e.target;
    if (el.matches("[data-app]")) {
      var k = el.getAttribute("data-app");
      state.story.apps[k] = Object.assign({}, state.story.apps[k] || {}, { on: el.checked });
      save();
      renderKeepScroll();
      return;
    }
    if (el.matches("[data-app-status]")) {
      state.story.apps[el.getAttribute("data-app-status")].status = el.value;
      save();
      return;
    }
    if (el.matches("[data-def]")) {
      var parts = el.getAttribute("data-def").split(":");
      var n = state.notices[Number(parts[0])];
      n.def = n.def || {};
      n.def[parts[1]] = el.checked;
      save();
      renderKeepScroll();
      return;
    }
    if (el.matches("input[type=radio], input[type=checkbox], select")) {
      if (readInput(el)) renderKeepScroll(el);
    }
  });

  function renderKeepScroll(el) {
    var y = window.scrollY;
    var key = el && el.getAttribute("data-key");
    var val = el && el.value;
    render(false);
    window.scrollTo(0, y);
    if (key) {
      var again = app.querySelector('[data-key="' + key + '"][value="' + val + '"]') || app.querySelector('select[data-key="' + key + '"]');
      if (again) again.focus({ preventScroll: true });
    }
  }

  app.addEventListener("submit", function (e) {
    e.preventDefault();
    goNext();
  });

  app.addEventListener("click", function (e) {
    var el = e.target.closest("button, a");
    if (!el) return;
    var action = el.getAttribute("data-action");
    if (action === "back") { goBack(); return; }
    if (action === "lang") { setLanguage(el.getAttribute("data-lang")); render(); return; }
    if (action === "resume") {
      var c = buildScreens();
      state.cur = state.lastCur && indexOf(c, state.lastCur) !== -1 ? state.lastCur : (c[1] ? c[1].id : "welcome");
      save(); render(); return;
    }
    if (action === "restart") { confirmErase(); return; }
    if (action === "remove-notice") {
      var i = Number(el.getAttribute("data-i"));
      if (window.confirm(T("Remove ", "¿Quitar ") + Case.noticeLabel(state.notices[i], i) + T("?", "?"))) {
        state.notices.splice(i, 1);
        if (!state.notices.length) state.notices.push({});
        state.cur = "more";
        save(); render();
      }
      return;
    }
    var goto = el.getAttribute("data-goto");
    if (goto) { state.cur = goto; save(); render(); return; }
    var copyTarget = el.getAttribute("data-copy-target");
    if (copyTarget) { copy(document.getElementById(copyTarget), el); return; }
    var dl = el.getAttribute("data-dl");
    if (dl) { download(dl, Number(el.getAttribute("data-i")), el); }
  });

  function copy(target, btn) {
    var text = target.value !== undefined ? target.value : target.textContent;
    var done = function () { var old = btn.textContent; btn.textContent = T("Copied ✓", "Copiado ✓"); setTimeout(function () { btn.textContent = old; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(target); done(); });
    } else { fallbackCopy(target); done(); }
  }

  function fallbackCopy(target) {
    var ta = document.createElement("textarea");
    ta.value = target.value !== undefined ? target.value : target.textContent;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    ta.remove();
  }

  function fileBase(n, i) {
    var last = String(state.person.lastName || "Papers").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var fine = Case.FINES[Case.fineOf(n)].short.replace(/[^A-Za-z0-9]+/g, "");
    return last + "-" + fine + (state.notices.length > 1 ? "-Notice" + (i + 1) : "");
  }

  function download(kind, i, btn) {
    var n = state.notices[i];
    var status = document.getElementById("dl-status-" + i);
    var footer = Case.fullName(state.person) + "  ·  A# " + U.fmtANumber(state.person.aNumber);
    var job;
    btn.disabled = true;
    if (status) status.textContent = T("Making your file… please wait.", "Preparando su archivo… espere, por favor.");
    if (kind === "instructions") {
      var blocks = Render.instructionBlocks(Case.nextSteps(state, n, i), T("What to do next", "Qué hacer ahora"), Case.noticeLabel(n, i));
      job = Render.downloadPdf(blocks, fileBase(n, i) + T("-Instructions.pdf", "-Instrucciones.pdf"), footer, T("Instructions", "Instrucciones"),
        [T("Page", "Página"), T("of", "de")]);
    } else {
      // The papers that get filed are always in English.
      var papers = Case.buildCoverLetter(state, n).concat([{ t: "pagebreak" }], Case.buildOpposition(state, n));
      job = kind === "docx"
        ? Render.downloadDocx(papers, fileBase(n, i) + "-Papers.docx", footer)
        : Render.downloadPdf(papers, fileBase(n, i) + "-Papers.pdf", footer, "Written Defense");
    }
    job.then(function () {
      if (status) status.textContent = T("Done! Look in your Downloads folder (or your phone’s Files app).", "¡Listo! Búsquelo en su carpeta de Descargas (o en la aplicación Archivos de su teléfono).");
    }, function (err) {
      if (status) status.textContent = T("Sorry, something went wrong making the file. Please try again, or try a different browser (like Chrome or Safari).",
        "Lo sentimos, hubo un problema al preparar el archivo. Intente otra vez, o use otro navegador (como Chrome o Safari).");
      if (window.console) console.error(err);
    }).then(function () { btn.disabled = false; });
  }

  /* ---------------- Page chrome (header, footer, language button) ---------------- */

  function chrome() {
    var es = U.lang() === "es";
    var name = T(S.siteName, S.siteNameEs || S.siteName);
    document.title = name;
    document.getElementById("site-name").textContent = name;
    document.getElementById("site-tagline").textContent = T(S.tagline, S.taglineEs || S.tagline);
    var langBtn = document.getElementById("lang-toggle");
    langBtn.textContent = es ? "English" : "Español";
    langBtn.setAttribute("lang", es ? "en" : "es");
    langBtn.setAttribute("aria-label", es ? "View this site in English" : "Ver este sitio en español");
    var restart = document.getElementById("restart-top");
    restart.textContent = T("Start over", "Empezar de nuevo");
    restart.title = T("Erase all answers and start over", "Borrar todas las respuestas y empezar de nuevo");
    document.querySelector(".skip").textContent = T("Skip to main content", "Ir al contenido principal");

    var foot = [];
    var by = es ? (S.providedByEs || S.providedBy) : S.providedBy;
    if (by) foot.push("<p><strong>" + U.escapeHtml(by) + "</strong></p>");
    var contact = [S.contactName, S.contactPhone, S.contactEmail, S.contactWebsite].map(U.clean).filter(Boolean);
    if (contact.length) foot.push("<p>" + T("Contact: ", "Contacto: ") + Render.linkify(U.escapeHtml(contact.join(" · "))) + "</p>");
    foot.push("<p>" + T("<strong>This is not legal advice.</strong> This tool gives general information and helps you fill in papers. Using it does not make anyone your lawyer. If you can, talk to a lawyer about your situation.",
      "<strong>Esto no es asesoría legal.</strong> Esta herramienta da información general y le ayuda a llenar papeles. Usarla no hace que nadie sea su abogado. Si puede, hable con un abogado sobre su situación.") + "</p>");
    foot.push("<p>" + U.escapeHtml(T(S.credit, S.creditEs || S.credit)) + "</p>");
    foot.push("<p>🔒 " + T("Your answers are saved only on this device and are never sent to anyone. Information last reviewed: ",
      "Sus respuestas se guardan solo en este aparato y nunca se envían a nadie. Información revisada por última vez: ") +
      U.escapeHtml(T(S.lastReviewed, S.lastReviewedEs || S.lastReviewed)) + ".</p>");
    document.getElementById("site-footer").innerHTML = foot.join("");
  }

  document.getElementById("restart-top").addEventListener("click", confirmErase);
  document.getElementById("lang-toggle").addEventListener("click", function () {
    setLanguage(U.lang() === "es" ? "en" : "es");
    render(false);
  });

  state.cur = "welcome"; // always open on the welcome page; "Continue" resumes
  render(false);
})();
