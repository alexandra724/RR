/* =====================================================================
   The step-by-step interview. Each "screen" asks a few questions.
   Answers are saved only in this browser (localStorage).
   ===================================================================== */
(function () {
  "use strict";
  var U = window.U, Case = window.Case, Render = window.Render, S = window.SITE;
  var STORE_KEY = "immigration-fine-helper-v1";
  var app = document.getElementById("app");

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
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function erase() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    state = blankState();
    window.scrollTo(0, 0);
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

  var YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
  var YES_NO_UNSURE = YES_NO.concat([{ value: "unsure", label: "Not sure" }]);

  var STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "AS", "GU", "MP", "VI"];

  function latinOnly(v) {
    return U.hasNonLatin(v) ? "Please use English letters (A–Z) only. Government offices need papers in English letters." : "";
  }

  function addressBlock(lines) {
    return '<div class="address">' + lines.map(U.escapeHtml).join("<br>") + "</div>";
  }

  /* ---------------- The screens ---------------- */

  function noticeScreens(i) {
    var base = "notices." + i + ".";
    var n = function () { return state.notices[i] || {}; };
    var form = function () { return Case.docForm(n()); };
    var list = [];

    list.push({
      id: "n" + i + "-form", section: "notice",
      title: i === 0 ? "What kind of paper did you get?" : "What kind of paper is your next notice?",
      lead: "Look at the <strong>title at the top of the first page</strong>. You can compare it with <a href=\"" + S.links.sampleNotices + "\" target=\"_blank\" rel=\"noopener\">sample notices</a>.",
      fields: [{
        type: "choice", key: base + "form", required: true, label: "The paper says:", options: [
          { value: "nvo", label: "Notice of Violation and Order", desc: "Full title: “Notice of Violation and Order Under the Immigration and Nationality Act.” The bottom corner says “DHS Form 281.” This is the most common notice since mid-2025." },
          { value: "i79", label: "Notice of Intention to Fine", desc: "An older kind of notice (Form I-79), usually dated before June 27, 2025." },
          { value: "1815", label: "Notice of Fee Assessment Under 8 U.S.C. § 1815", desc: "The bottom corner says “DHS Form 1815.” Usually $5,000 or more." },
          { value: "invoice", label: "A bill (invoice) or past-due notice", desc: "A letter from CBP, the Treasury (“Centralized Receivables Service”), or a debt collector, asking you to pay." },
          { value: "other", label: "Something else, or I’m not sure", desc: "For example, an “Appeal Decision and Order” or a “Rescission” notice." }
        ]
      }]
    });

    list.push({
      id: "n" + i + "-other", section: "notice", when: function () { return n().form === "other"; },
      title: "This tool may not fit your paper",
      hideNext: true,
      html: function () {
        return '<div class="callout">' +
          "<p>This tool makes papers for the four kinds of papers on the last screen.</p>" +
          "<ul><li><strong>“Rescission of Notice of Violation and Order”</strong> — good news. It means the fine was cancelled. Keep it in a safe place.</li>" +
          "<li><strong>“Appeal Decision and Order”</strong> — this is DHS’s final decision on an appeal. There is no other appeal inside DHS, but you may be able to go to federal court. <strong>Talk to a lawyer as soon as possible.</strong></li>" +
          "<li><strong>Not sure?</strong> Compare your paper with these <a href=\"" + S.links.sampleNotices + "\" target=\"_blank\" rel=\"noopener\">sample notices</a>, or ask a lawyer: <a href=\"" + S.links.findLawyer + "\" target=\"_blank\" rel=\"noopener\">find free or low-cost legal help</a>.</li></ul>" +
          "<p>Use the <strong>Back</strong> button to choose a different answer.</p></div>";
      }
    });

    list.push({
      id: "n" + i + "-invoice", section: "notice", when: function () { return n().form === "invoice"; },
      title: "About your bill",
      lead: "We will make a letter that disputes the bill, plus your full written defense.",
      fields: [
        {
          type: "choice", key: base + "invoiceFrom", required: true, label: "Who sent the bill?", options: [
            { value: "cbp", label: "U.S. Customs and Border Protection (CBP)", desc: "It may say “For inquiries, please contact the CBP at INACivilPenalties@cbp.dhs.gov.”" },
            { value: "crs", label: "Centralized Receivables Service (CRS)", desc: "Part of the U.S. Department of the Treasury. It may say “CRS Invoice Number.”" },
            { value: "collector", label: "A private debt collection company", desc: "A company (not the government) asking you to pay." }
          ]
        },
        { type: "date", key: base + "invoiceDate", required: true, past: true, label: "Date on the bill", hint: "It may be called “Invoice Date” or “Date of this notice.”" },
        { type: "text", key: base + "invoiceNumber", label: "Invoice or reference number (optional)", hint: "For example, “CRS Invoice Number” or “Agency Reference.”" }
      ]
    });

    list.push({
      id: "n" + i + "-orig", section: "notice", when: function () { return n().form === "invoice"; },
      title: "Do you have the notice that came before the bill?",
      lead: "Usually DHS sends a fine notice first, and a bill later. If you have the notice, we will use its information.",
      fields: [{
        type: "choice", key: base + "origForm", required: true, label: "Before the bill, I got:", options: [
          { value: "nvo", label: "A “Notice of Violation and Order” (DHS Form 281)" },
          { value: "i79", label: "A “Notice of Intention to Fine” (Form I-79)" },
          { value: "1815", label: "A “Notice of Fee Assessment Under 8 U.S.C. § 1815” (DHS Form 1815)" },
          { value: "none", label: "I don’t have it, or I’m not sure" }
        ]
      }]
    });

    list.push({
      id: "n" + i + "-fine", section: "notice",
      when: function () { return n().form && n().form !== "other" && form() !== "1815" && (n().form !== "invoice" || n().origForm); },
      title: "Which law is your fine under?",
      lead: function () {
        if (form() === "none") return "Look at your bill. It usually names the law — for example, “Section 274D(a)” or “failure to timely depart.”";
        return "On your notice, find the section that is <strong>checked (☒ or ■)</strong>: “Section 240B,” “Section 274D,” or “Section 275.”";
      },
      fields: function () {
        var opts = [
          { value: "274D", label: "Section 274D", desc: "For not leaving the U.S. after a final deportation (removal) order. Often $998 for each day — it can add up to more than $1 million." },
          { value: "240B", label: "Section 240B", desc: "For not leaving by the date in a voluntary departure order. Often $3,000." },
          { value: "275b", label: "Section 275 (also called 275(b))", desc: "For being stopped while entering the U.S. without inspection. Usually up to $250." }
        ];
        if (form() === "none") opts.push({ value: "1815", label: "8 U.S.C. § 1815", desc: "A fee for being stopped between ports of entry. Usually $5,000 or more." });
        return [{
          type: "choice", key: base + "fine", required: true, label: "My fine is under:", options: opts,
          hint: "If more than one section is checked, choose one now. At the end you can add another notice for the other section. Each one gets its own papers."
        }];
      }
    });

    list.push({
      id: "n" + i + "-details", section: "notice",
      when: function () { return Case.isComplete(n()); },
      title: "Numbers and dates from your notice",
      lead: function () {
        return form() === "none" ? "Use the information on your bill." : "Copy these exactly from your " + Case.FORMS[form()].name + ".";
      },
      fields: function () {
        var f = form();
        var trackHint = {
          nvo: "Top right of page 1, under “File Number.”",
          i79: "Near the top of the notice.",
          "1815": "Near the top of page 1. It usually starts with the letter F.",
          none: "On a bill it may be called “Penalty Tracking Number” or “Agency Reference.”"
        }[f];
        var dateHint = {
          nvo: "On page 2, next to the officer’s signature, on the right (“Date”).",
          i79: "The date printed on the notice.",
          "1815": "On page 2, next to the officer’s title (“Notice Date”).",
          none: ""
        }[f];
        var amountHint = {
          nvo: "On page 1: “a civil penalty be imposed upon you in the amount of $…”",
          i79: "The amount of the fine on the notice.",
          "1815": "On page 1: “you are required to pay a fee in the amount of $…”",
          none: "The amount of the fine. On a bill, use the “principal” amount if it is shown."
        }[f];
        var fields = [
          { type: "text", key: base + "tracking", label: Case.trackingLabel(n()) + (f === "none" ? " (optional)" : ""), hint: trackHint, required: f !== "none", autocomplete: "off", validate: latinOnly },
          { type: "date", key: base + "noticeDate", label: "Date of the notice", hint: dateHint, required: true, past: true, when: function () { return f !== "none"; } },
          { type: "money", key: base + "amount", label: "Amount of the fine", hint: amountHint, required: true }
        ];
        return fields;
      }
    });

    list.push({
      id: "n" + i + "-delivery", section: "notice",
      when: function () { return Case.isComplete(n()) && form() !== "none"; },
      title: "How did you get the notice?",
      lead: "These dates matter. If the notice reached you late, your papers will say so.",
      fields: [
        {
          type: "choice", key: base + "delivery", required: true, label: "I got it:", options: [
            { value: "mail", label: "In the mail" },
            { value: "person", label: "An officer gave it to me in person" },
            { value: "unsure", label: "I don’t remember" }
          ]
        },
        { type: "date", key: base + "postmarkDate", past: true, label: "Date of the postmark on the envelope (optional)", hint: "The date the post office stamped on the envelope. If you don’t have the envelope, leave this empty. Keep the envelope if you have it!", when: function () { return n().delivery === "mail"; } },
        { type: "date", key: base + "receivedDate", past: true, label: "Date it arrived (optional)", when: function () { return n().delivery === "mail"; } },
        { type: "date", key: base + "receivedDate", past: true, required: true, label: "Date the officer gave it to you", when: function () { return n().delivery === "person"; } }
      ]
    });

    list.push({
      id: "n" + i + "-where", section: "notice",
      when: function () { return Case.isComplete(n()) && !(n().form === "invoice" && n().invoiceFrom === "collector"); },
      title: function () { return Case.destination(n()).method === "email" ? "Where to email your papers" : "Where to mail your papers"; },
      html: function () {
        var nn = n();
        if (nn.form === "invoice" && nn.invoiceFrom === "cbp") {
          return "<p>CBP bills usually say to send disputes by email to:</p>" + addressBlock([S.emailCbpInvoice]);
        }
        if (nn.form === "invoice") {
          return "<p>These bills usually say to send questions and disputes to:</p>" + addressBlock(S.crsAddress);
        }
        if (Case.fineOf(nn) === "1815") {
          return "<p>A Notice of Fee Assessment usually says to send disputes by email to:</p>" + addressBlock([S.email1815]) + "<p class=\"hint\">Look on page 2 of your notice.</p>";
        }
        return "<p>Most notices say to send your appeal to:</p>" + addressBlock(S.iceAddress) +
          (form() === "nvo" ? "<p class=\"hint\">Look on page 2 of your notice, under “APPEAL RIGHTS.”</p>" : "");
      },
      fields: function () {
        var email = Case.destination(Object.assign({}, n(), { customEmail: "" })).method === "email";
        return [
          { type: "choice", key: base + "sameAddress", required: true, label: email ? "Does your paper show this same email address?" : "Does your paper show this same address?", options: [{ value: "yes", label: "Yes, it’s the same" }, { value: "no", label: "No, it’s different" }] },
          { type: "textarea", key: base + "customAddress", rows: 4, required: true, label: "Type the address from your paper", hint: "One line for each line of the address.", when: function () { return !email && n().sameAddress === "no"; }, validate: latinOnly },
          { type: "text", key: base + "customEmail", required: true, inputmode: "email", label: "Type the email address from your paper", when: function () { return email && n().sameAddress === "no"; }, validate: validEmail }
        ];
      }
    });

    list.push({
      id: "n" + i + "-collector", section: "notice",
      when: function () { return n().form === "invoice" && n().invoiceFrom === "collector"; },
      title: "The debt collector’s address",
      lead: "We will make a dispute letter to the debt collector. Copy their mailing address from their letter.",
      fields: [{ type: "textarea", key: base + "customAddress", rows: 4, required: true, label: "Debt collector’s name and mailing address", hint: "One line for each line of the address.", validate: latinOnly }]
    });

    list.push({
      id: "n" + i + "-specific", section: "notice",
      when: function () { return Case.isComplete(n()) && (Case.fineOf(n()) === "274D" || Case.fineOf(n()) === "240B"); },
      title: function () { return Case.fineOf(n()) === "274D" ? "Your removal order" : "Your voluntary departure order"; },
      lead: "If you don’t know, leave it empty. We use this to check whether the fine is too old (more than 5 years).",
      fields: function () {
        if (Case.fineOf(n()) === "274D") {
          return [{ type: "date", key: base + "orderDate", past: true, label: "Date your removal (deportation) order became final", hint: "On a Notice of Violation and Order, Section 274D says: “On ____, an order of removal, for which you are subject, was made final.”" }];
        }
        return [
          { type: "date", key: base + "vdGrant", past: true, label: "Date the judge gave you voluntary departure", hint: "On a Notice of Violation and Order, Section 240B says: “On ____, you were permitted to depart voluntarily.”" },
          { type: "date", key: base + "vdDeadline", past: true, label: "The last day you were allowed to leave (if you know it)" }
        ];
      }
    });

    list.push({
      id: "n" + i + "-deadline", section: "notice",
      when: function () { return Case.isComplete(n()); },
      title: "Your deadline",
      html: function () {
        var nn = n();
        var dl = Case.deadline(nn);
        if (!dl) return '<div class="callout">We could not figure out your deadline. Send your papers as soon as you can.</div>';
        var late = Case.isLate(nn);
        var verb = dl.by === "postmarked" ? "mailed (postmarked)" : (Case.destination(nn).method === "email" ? "sent" : "received");
        return '<div class="callout ' + (late ? "callout-warn" : "callout-deadline") + '">' +
          (late
            ? "<p><strong>Your deadline seems to have passed</strong> (" + U.fmtDate(dl.date) + ").</p><p><strong>Keep going and send your papers anyway.</strong> Lawyers who work on these fines recommend it, so that your defenses are on the record. Later, we will ask why you are sending it late.</p>"
            : "<p>Your papers must be <strong>" + verb + " by " + U.weekdayName(dl.date) + ", " + U.fmtDate(dl.date) + "</strong>.</p><p>That is " + U.escapeHtml(dl.rule) + ".</p>") +
          "</div><p class=\"hint\">Deadlines are counted from the date printed on the " + (nn.form === "invoice" ? "bill" : "notice") +
          ", even if it reached you late. Most people can finish this tool in 20–30 minutes.</p>";
      }
    });

    return list;
  }

  function validEmail(v) {
    if (!v) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? "" : "This does not look like an email address. Check it and try again.";
  }

  function buildScreens() {
    var list = [];

    list.push({ id: "welcome", section: "start", title: "Fight your immigration fine", custom: welcomeHtml, nextLabel: "Start →" });

    state.notices.forEach(function (_, i) { list = list.concat(noticeScreens(i)); });

    list.push({
      id: "more", section: "notice",
      title: "Do you have another fine notice?",
      lead: "For example, a second notice with a different tracking number, or a notice with two sections checked. Each one needs its own papers.",
      html: function () {
        var items = state.notices.map(function (n, i) {
          return "<li><span>" + U.escapeHtml(Case.noticeLabel(n, i)) + "</span>" +
            (state.notices.length > 1 ? ' <button type="button" class="link-btn" data-action="remove-notice" data-i="' + i + '">Remove</button>' : "") + "</li>";
        }).join("");
        return "<p><strong>Notices so far:</strong></p><ul class=\"notice-list\">" + items + "</ul>";
      },
      fields: [{ type: "choice", key: "moreAnswer", required: true, label: "Do you have another notice?", options: [{ value: "yes", label: "Yes, add another notice" }, { value: "no", label: "No, that’s all" }] }],
      onNext: function () {
        if (state.moreAnswer === "yes") {
          state.notices.push({});
          state.moreAnswer = "";
          return "n" + (state.notices.length - 1) + "-form";
        }
      }
    });

    list.push({
      id: "name", section: "you", title: "Your name",
      lead: "Write your name <strong>the same way it is written on your notice</strong>.",
      fields: [
        { type: "text", key: "person.firstName", label: "First name", required: true, autocomplete: "given-name", validate: latinOnly },
        { type: "text", key: "person.middleName", label: "Middle name (optional)", autocomplete: "additional-name", validate: latinOnly },
        { type: "text", key: "person.lastName", label: "Last name(s)", required: true, autocomplete: "family-name", validate: latinOnly }
      ]
    });

    list.push({
      id: "anumber", section: "you", title: "Your A-Number",
      lead: "Your A-Number (Alien Registration Number) has 8 or 9 digits. On the notice it is called <strong>“File Number.”</strong> It may start with the letter A.",
      fields: [{
        type: "text", key: "person.aNumber", label: "A-Number", required: true, inputmode: "numeric", placeholder: "Example: 123 456 789", short: true,
        validate: function (v) {
          var d = U.digits(v);
          return d.length >= 7 && d.length <= 9 ? "" : "An A-Number has 8 or 9 numbers. Please check it.";
        }
      }]
    });

    list.push({
      id: "address", section: "you", title: "Your address and contact information",
      lead: "Use your <strong>current mailing address</strong> — where DHS should send letters. It is OK if it is different from the address on your notice.",
      fields: [
        { type: "text", key: "person.street", label: "Street address", required: true, autocomplete: "address-line1", validate: latinOnly },
        { type: "text", key: "person.apt", label: "Apartment, unit, or floor (optional)", autocomplete: "address-line2", short: true, validate: latinOnly },
        { type: "text", key: "person.city", label: "City", required: true, autocomplete: "address-level2", validate: latinOnly },
        { type: "select", key: "person.state", label: "State", required: true, options: STATES.map(function (s) { return { value: s, label: s }; }) },
        {
          type: "text", key: "person.zip", label: "ZIP code", required: true, inputmode: "numeric", autocomplete: "postal-code", short: true,
          validate: function (v) { return /^\d{5}(-?\d{4})?$/.test(String(v).trim()) ? "" : "A ZIP code has 5 numbers."; }
        },
        { type: "text", key: "person.phone", label: "Phone number (optional)", inputmode: "tel", autocomplete: "tel", short: true },
        { type: "text", key: "person.email", label: "Email (optional)", inputmode: "email", autocomplete: "email", validate: validEmail }
      ]
    });

    list.push({
      id: "story-intro", section: "story", title: "Now, your story",
      html: function () {
        return "<p>Next, we will ask some questions about your situation. Your answers help explain why you should not have to pay the fine.</p>" +
          '<div class="callout"><p><strong>Only say things that are true.</strong> You will sign your papers under “penalty of perjury.” That means it is a crime to lie in them.</p>' +
          "<p>If you are not sure about something, choose <strong>“Not sure”</strong> or leave it empty. We will leave it out of your papers.</p></div>" +
          "<p>Most questions are optional. Each answer you give becomes a short sentence in your papers. You will see all of them before you finish.</p>";
      }
    });

    list.push({
      id: "st-arrival", section: "story", title: "When you came to the United States",
      fields: [
        { type: "select", key: "story.arrivalYear", label: "Year you first came to live in the United States", hint: "If you are not sure, leave it empty.", options: yearOptions() },
        { type: "select", key: "story.arrivalMonth", label: "Month (optional)", options: U.MONTHS.map(function (m, i) { return { value: String(i + 1), label: m }; }), when: function () { return !!state.story.arrivalYear; } }
      ]
    });

    list.push({
      id: "st-order", section: "story", when: anyA, title: "About your immigration court order",
      fields: [
        { type: "choice", key: "story.knewOrder", label: "When the judge made the order in your case, did you know about it?", hint: "Some people were ordered to leave when they were not in court (“in absentia”), and did not know.", options: YES_NO_UNSURE },
        { type: "date", key: "story.learnedOrderDate", past: true, label: "When did you find out about the order? (optional)", when: function () { return state.story.knewOrder === "no"; } },
        { type: "choice", key: "story.minorAtOrder", label: "Were you under 18 years old when the order was made?", options: YES_NO_UNSURE },
        { type: "choice", key: "story.warned", label: "Did anyone — the judge or your court papers — ever warn you that you could be fined money for not leaving?", options: YES_NO_UNSURE },
        { type: "choice", key: "story.hadVD", when: function () { return anyFine(["274D"]); }, label: "Did the judge give you “voluntary departure” (permission to leave on your own by a certain date)?", options: YES_NO_UNSURE },
        { type: "choice", key: "story.warnedDaily", when: function () { return anyFine(["274D"]) && state.story.hadVD === "yes"; }, label: "Were you ever warned that you could be fined for each day you stayed (up to $998 a day)?", options: YES_NO_UNSURE }
      ]
    });

    list.push({
      id: "st-ice", section: "story", when: anyA, title: "Your contact with ICE",
      lead: "Following ICE’s rules shows that you were not refusing to leave on purpose.",
      fields: [
        {
          type: "choice", key: "story.supervision", label: "Are you on an “Order of Supervision” with ICE?", hint: "This is a paper from ICE (often Form I-220B) that lets you stay in the U.S. while you report to ICE.", options: [
            { value: "now", label: "Yes, now" }, { value: "past", label: "Yes, in the past" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]
        },
        {
          type: "choice", key: "story.checkins", label: "Do you go to check-ins with ICE?", options: [
            { value: "all", label: "Yes, I go to all of them" }, { value: "some", label: "Yes, but I missed some" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]
        },
        {
          type: "choice", key: "story.isap", label: "Are you in ISAP (ICE’s “Alternatives to Detention” program)?", hint: "For example: an ankle monitor, the SmartLINK phone app, phone check-ins, or home visits.", options: [
            { value: "now", label: "Yes, now" }, { value: "past", label: "Yes, in the past" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]
        },
        {
          type: "checks", key: "story.isapTypes", label: "What does (or did) ISAP include? Check all that apply.", when: function () { return state.story.isap === "now" || state.story.isap === "past"; }, options: [
            { value: "ankle", label: "An ankle monitor" }, { value: "app", label: "A phone app for check-ins (like SmartLINK)" }, { value: "calls", label: "Phone calls" }, { value: "visits", label: "Home visits" }]
        }
      ]
    });

    list.push({
      id: "st-apps", section: "story", title: "Immigration applications",
      lead: "Have you ever applied for any of these? Check all that apply. You do not need to have won.",
      custom: appsHtml
    });

    list.push({
      id: "st-reasons", section: "story", when: anyA, title: "Things that made it hard to leave",
      fields: [
        { type: "choice", key: "story.custody", label: "After your order, were you ever held in jail, prison, or immigration detention?", options: YES_NO },
        { type: "text", key: "story.custodyWhen", label: "About when? (optional)", placeholder: "Example: from March 2019 to June 2020", when: function () { return state.story.custody === "yes"; }, validate: latinOnly },
        { type: "choice", key: "story.healthTravel", label: "Have serious health problems (yours or your family’s) made it very hard or impossible for you to travel?", options: YES_NO },
        { type: "choice", key: "story.vawaCentral", when: function () { return anyFine(["240B"]) && state.story.apps.vawa && state.story.apps.vawa.on; }, label: "Was abuse (by your U.S. citizen or permanent resident family member) one of the main reasons you did not leave by your voluntary departure date?", options: YES_NO_UNSURE }
      ]
    });

    list.push({
      id: "st-entry", section: "story", when: anyB, title: "How and where you were stopped",
      lead: "<strong>You do not have to answer these.</strong> We only put an answer in your papers if it helps you.",
      fields: [
        {
          type: "choice", key: "story.howEntered", label: "How did you come into the United States?", options: [
            { value: "visa", label: "With a visa", desc: "For example, a tourist, student, or work visa." },
            { value: "port", label: "An officer at an official border crossing or airport let me in", desc: "For example, with a CBP One appointment or parole." },
            { value: "other", label: "Another way, or I prefer not to say" }]
        },
        {
          type: "choice", key: "story.whereStopped", label: "Where were you when immigration officers first stopped you or took you into custody?", options: [
            { value: "border", label: "At the border, while I was crossing" },
            { value: "interior", label: "Inside the U.S., away from the border", desc: "For example, at home, at work, at an ICE check-in, or during a traffic stop." },
            { value: "never", label: "I was never stopped — the notice just came to me" },
            { value: "unsure", label: "Not sure, or I prefer not to say" }]
        },
        { type: "text", key: "story.stopPlace", label: "City and state where this happened (optional)", placeholder: "Example: Houston, Texas", when: function () { return state.story.whereStopped === "interior"; }, validate: latinOnly },
        { type: "date", key: "story.stopDate", past: true, label: "Date (optional)", when: function () { return state.story.whereStopped === "interior"; } }
      ]
    });

    list.push({
      id: "st-family", section: "story", title: "Your family",
      lead: "Who depends on you for money or care?",
      fields: [
        { type: "choice", key: "story.spouse", label: "A spouse or partner?", options: YES_NO },
        { type: "number", key: "story.children", label: "How many children depend on you?", min: 0, max: 20, hint: "Write 0 if none." },
        { type: "number", key: "story.usChildren", label: "How many of these children are U.S. citizens?", min: 0, max: 20, hint: "Write 0 if none." },
        { type: "number", key: "story.otherDependents", label: "Other family members who depend on you (for example, parents)?", min: 0, max: 20, hint: "Write 0 if none." }
      ]
    });

    list.push({
      id: "st-money", section: "story", title: "Work and money",
      lead: "This helps show that the fine would be an unfair burden on you and your family.",
      fields: [
        { type: "choice", key: "story.working", label: "Are you working now?", options: YES_NO },
        { type: "text", key: "story.job", label: "What work do you do?", placeholder: "Example: cook in a restaurant", when: function () { return state.story.working === "yes"; }, validate: latinOnly },
        { type: "money", key: "story.income", label: "About how much do you earn each month? (optional)", when: function () { return state.story.working === "yes"; } },
        { type: "text", key: "story.notWorkingWhy", label: "Why not? (optional)", placeholder: "Example: I take care of my children", when: function () { return state.story.working === "no"; }, validate: latinOnly },
        {
          type: "choice", key: "story.leftover", label: "After you pay rent, food, and bills each month, how much money is left?", options: [
            { value: "none", label: "Nothing — or not enough" }, { value: "little", label: "A little" }, { value: "some", label: "More than a little" }]
        },
        {
          type: "choice", key: "story.savings", label: "Do you have savings?", options: [
            { value: "none", label: "No savings" }, { value: "small", label: "Less than $1,000" }, { value: "more", label: "$1,000 or more" }]
        },
        { type: "choice", key: "story.taxes", label: "Do you file taxes in the United States?", options: YES_NO }
      ]
    });

    list.push({
      id: "st-health", section: "story", title: "Health",
      fields: [
        { type: "choice", key: "story.health", label: "Do you or someone in your family have serious health problems?", options: YES_NO },
        { type: "textarea", key: "story.healthText", rows: 3, label: "Tell us in 1 or 2 sentences", hint: "Start with “I” or “My.” Example: “My daughter has asthma and needs medicine every day.”", when: function () { return state.story.health === "yes"; }, validate: latinOnly }
      ]
    });

    list.push({
      id: "st-more", section: "story", title: "Anything else?",
      lead: "Optional. Write in English, starting with “I.” Short and true is best.",
      fields: [
        { type: "textarea", key: "story.community", rows: 3, label: "Good things about you that DHS should know", placeholder: "Example: I volunteer at my church every week. I have never been arrested.", validate: latinOnly },
        { type: "textarea", key: "story.extra", rows: 4, label: "Anything else that explains why you should not be fined", validate: latinOnly }
      ]
    });

    list.push({
      id: "st-late", section: "story", when: function () { return completeNotices().some(Case.isLate); },
      title: "Why are you sending it late?",
      lead: "Your deadline seems to have passed. That’s OK — send your papers anyway. If you want, tell DHS why. (Optional.)",
      fields: [{ type: "text", key: "story.lateReason", label: "Reason (optional)", placeholder: "Example: I did not receive the notice until weeks after its date", validate: latinOnly }]
    });

    list.push({
      id: "translator", section: "story", title: "Did someone translate for you?",
      lead: "If someone read or explained these papers to you in another language, they should sign a short “Certificate of Translation.” We will make it for them.",
      fields: [
        { type: "choice", key: "translator.used", required: true, label: "Did someone translate for you?", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No, I read and understand English" }] },
        { type: "text", key: "translator.name", required: true, label: "Translator’s full name", when: function () { return state.translator.used === "yes"; }, validate: latinOnly },
        { type: "text", key: "translator.language", required: true, label: "Your language", placeholder: "Example: Spanish", when: function () { return state.translator.used === "yes"; }, validate: latinOnly },
        { type: "text", key: "translator.street", required: true, label: "Translator’s street address", when: function () { return state.translator.used === "yes"; }, validate: latinOnly },
        { type: "text", key: "translator.cityStateZip", required: true, label: "Translator’s city, state, and ZIP code", when: function () { return state.translator.used === "yes"; }, validate: latinOnly }
      ]
    });

    list.push({ id: "review", section: "review", title: "Check your papers", custom: reviewHtml, nextLabel: "Make my papers" });
    list.push({ id: "papers", section: "papers", title: "Your papers are ready", custom: papersHtml, hideNext: true });

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
    var h = [];
    h.push('<p class="lead">Did you get a letter from the U.S. Department of Homeland Security (DHS) saying you must pay an immigration fine? This free tool helps you <strong>make the papers to fight it</strong> — by yourself, without a lawyer.</p>');
    h.push('<div class="grid-2">');
    h.push('<div class="card"><h3>What you will get</h3><ul><li>A <strong>cover letter</strong></li><li>Your <strong>written defense</strong> (a sworn statement explaining why you should not pay)</li><li>Clear <strong>instructions</strong> for what to do next</li></ul></div>');
    h.push('<div class="card"><h3>What you need</h3><ul><li>The <strong>notice</strong> you got from DHS</li><li>The <strong>envelope</strong> it came in, if you have it</li><li>About <strong>20–30 minutes</strong></li></ul></div>');
    h.push("</div>");
    h.push('<div class="callout callout-warn"><p><strong>Act fast. The deadline is short.</strong> For most notices it is only <strong>15 business days</strong> (about 3 weeks). If your deadline already passed, <strong>send your papers anyway</strong>.</p></div>');
    h.push('<p><strong>This tool works for fines under:</strong> INA § 274D (not leaving after a deportation order), INA § 240B (voluntary departure), INA § 275(b) (entry), and 8 U.S.C. § 1815 (apprehension fee). It also helps if you got a bill for one of these fines.</p>');
    h.push('<div class="callout callout-private"><p>🔒 <strong>Your answers stay private.</strong> They are saved only on this device. Nothing is sent to us or anyone else. You can erase everything at any time.</p></div>');
    h.push('<details class="faq"><summary>Is this legal advice?</summary><p>No. This tool gives general information and helps you fill in papers. It is not a lawyer. If you can, talk to a lawyer about your situation: <a href="' + S.links.findLawyer + '" target="_blank" rel="noopener">find free or low-cost legal help</a>. Do not miss your deadline while you look for one.</p></details>');
    h.push('<details class="faq"><summary>Is it risky to fight the fine?</summary><p>It is up to DHS to prove that the fine is justified. The lawyers who wrote the model papers this tool uses encourage people to file an opposition and raise every defense they have. If you are worried, talk to a lawyer.</p></details>');
    h.push('<details class="faq"><summary>I don’t read English well. Can I still use this?</summary><p>Yes. Ask someone you trust to help you. The papers must be in English. If someone translates for you, we will make a short “Certificate of Translation” for them to sign.</p></details>');
    h.push('<details class="faq"><summary>I got more than one notice.</summary><p>That is common — for example, a § 1815 notice and a § 275(b) notice. Answer the questions for the first one. Before you finish, we will ask if you have another, and make separate papers for each.</p></details>');
    h.push('<details class="faq"><summary>Where can I learn more?</summary><p>Read the questions and answers at <a href="' + S.links.faq + '" target="_blank" rel="noopener">noimmigrationfines.org</a>.</p></details>');
    if (resume) {
      h.push('<div class="resume"><p>You already started. Do you want to continue?</p><button type="button" class="btn btn-primary" data-action="resume">Continue where I left off</button> <button type="button" class="btn btn-secondary" data-action="restart">Start over</button></div>');
    }
    return h.join("");
  }

  function appsHtml() {
    var apps = state.story.apps;
    var opts = [{ value: "", label: "Choose…" }, { value: "pending", label: "Still waiting for a decision" }, { value: "approved", label: "Approved" }, { value: "denied", label: "Denied" }, { value: "unsure", label: "Not sure" }];
    function statusSelect(key) {
      var v = (apps[key] && apps[key].status) || "";
      return '<label class="inline-label">What happened? <select data-app-status="' + key + '">' + opts.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === v ? " selected" : "") + ">" + o.label + "</option>";
      }).join("") + "</select></label>";
    }
    var h = ['<div class="checks">'];
    Case.APPS.concat([{ key: "other", label: "Something else" }]).forEach(function (a) {
      var on = apps[a.key] && apps[a.key].on;
      h.push('<div class="opt-block"><label class="opt opt-check"><input type="checkbox" data-app="' + a.key + '"' + (on ? " checked" : "") + "><span>" + U.escapeHtml(a.label) + "</span></label>");
      if (on) {
        h.push('<div class="opt-sub">');
        if (a.key === "other") h.push('<label class="inline-label">What did you apply for? <input type="text" data-app-text="other" value="' + U.escapeHtml(apps.other.text || "") + '"></label>');
        h.push(statusSelect(a.key) + "</div>");
      }
      h.push("</div>");
    });
    h.push("</div>");
    return h.join("");
  }

  function reviewHtml() {
    var p = state.person;
    var h = [];
    h.push("<p>Please read this page carefully. You can change anything by clicking <strong>Change</strong>.</p>");
    h.push('<div class="card"><h3>About you <button type="button" class="link-btn" data-goto="name">Change</button></h3><dl class="summary">' +
      row("Name", Case.fullName(p)) + row("A-Number", U.fmtANumber(p.aNumber)) +
      row("Address", U.clean(p.street) + (p.apt ? ", " + p.apt : "") + ", " + U.clean(p.city) + ", " + (p.state || "") + " " + U.clean(p.zip)) +
      row("Phone", p.phone || "—") + row("Email", p.email || "—") + "</dl></div>");

    completeNotices().forEach(function (n) {
      var i = state.notices.indexOf(n);
      var dl = Case.deadline(n);
      h.push('<div class="card"><h3>' + U.escapeHtml(Case.noticeLabel(n, i)) + ' <button type="button" class="link-btn" data-goto="n' + i + '-form">Change</button></h3>');
      h.push('<dl class="summary">' +
        row(Case.trackingLabel(n), n.tracking || "—") +
        (n.noticeDate ? row("Notice date", U.fmtDate(n.noticeDate)) : "") +
        (n.invoiceDate ? row("Bill date", U.fmtDate(n.invoiceDate)) : "") +
        row("Amount", U.fmtMoney(U.parseMoney(n.amount))) +
        row("Deadline", dl ? U.fmtDate(dl.date) + (Case.isLate(n) ? " (passed — send anyway)" : "") : "—") + "</dl>");

      var defs = Case.defenseOptions(state, n);
      if (defs.length) {
        h.push('<h4>Extra defenses</h4><p class="hint">We checked these based on your answers. Check only the ones that are true for you.</p><div class="checks">');
        defs.forEach(function (o) {
          h.push('<label class="opt opt-check"><input type="checkbox" data-def="' + i + ":" + o.key + '"' + (o.on ? " checked" : "") + "><span>“" + U.escapeHtml(o.text) + "”<small>" + U.escapeHtml(o.why) + "</small></span></label>");
        });
        h.push("</div>");
      }

      var facts = Case.factParagraphs(state, n);
      h.push("<h4>Facts about you that will be in your papers</h4>");
      if (facts.length) {
        h.push('<ul class="facts">' + [].concat.apply([], facts).map(function (f) { return "<li>" + U.escapeHtml(f) + "</li>"; }).join("") + "</ul>");
        h.push('<p class="hint">Something wrong? <button type="button" class="link-btn" data-goto="story-intro">Change your answers</button></p>');
      } else {
        h.push('<p class="hint">You did not add any facts. That is OK, but facts about your situation can help. <button type="button" class="link-btn" data-goto="story-intro">Add facts</button></p>');
      }
      h.push('<details class="preview"><summary>Read the full papers for this notice</summary><div class="doc">' +
        Render.toHtml(Case.buildCoverLetter(state, n)) + '<hr class="d-break">' + Render.toHtml(Case.buildOpposition(state, n)) + "</div></details>");
      h.push("</div>");
    });
    h.push('<div class="callout"><p>By clicking <strong>Make my papers</strong>, you confirm that your answers are true to the best of your knowledge.</p></div>');
    return h.join("");
  }

  function row(k, v) { return "<dt>" + U.escapeHtml(k) + "</dt><dd>" + U.escapeHtml(v) + "</dd>"; }

  function papersHtml() {
    var h = [];
    var notices = completeNotices();
    h.push('<p class="lead">Download your papers below. Then follow the steps to <strong>print, sign, and send</strong> them.</p>');
    notices.forEach(function (n, k) {
      var i = state.notices.indexOf(n);
      var dl = Case.deadline(n);
      var dest = Case.destination(n);
      h.push('<section class="card papers-card"><h2>' + U.escapeHtml(Case.noticeLabel(n, i)) + "</h2>");
      if (dl) {
        h.push('<div class="callout ' + (Case.isLate(n) ? "callout-warn" : "callout-deadline") + '">' + (Case.isLate(n)
          ? "<strong>Your deadline seems to have passed (" + U.fmtDate(dl.date) + "). Send your papers anyway, as soon as you can.</strong>"
          : "<strong>Deadline: " + (dl.by === "postmarked" ? "mail" : (dest.method === "email" ? "send" : "must arrive")) + " by " + U.weekdayName(dl.date) + ", " + U.fmtDate(dl.date) + "</strong>") + "</div>");
      }
      h.push('<div class="downloads">' +
        '<button type="button" class="btn btn-primary btn-big" data-dl="pdf" data-i="' + i + '">⬇ Download papers (PDF, ready to print)</button>' +
        '<button type="button" class="btn btn-secondary" data-dl="instructions" data-i="' + i + '">⬇ Download instructions (PDF)</button>' +
        '<button type="button" class="btn btn-secondary" data-dl="docx" data-i="' + i + '">⬇ Word version (only if you need to edit)</button>' +
        '</div><p class="dl-status" id="dl-status-' + i + '" role="status" aria-live="polite"></p>');

      if (dest.method === "email") {
        var em = Case.emailText(state, n);
        var mailto = "mailto:" + encodeURIComponent(em.to) + "?subject=" + encodeURIComponent(em.subject) + "&body=" + encodeURIComponent(em.body);
        h.push('<div class="email-box"><h3>Your email</h3>' +
          copyRow("To", em.to) + copyRow("Subject", em.subject) +
          '<label class="field-label" for="em-body-' + i + '">Message</label><textarea id="em-body-' + i + '" readonly rows="10">' + U.escapeHtml(em.body) + "</textarea>" +
          '<button type="button" class="btn btn-small" data-copy-target="em-body-' + i + '">Copy message</button> ' +
          '<a class="btn btn-small" href="' + mailto + '">Open in my email app</a>' +
          '<p class="hint">Remember to <strong>attach</strong> your signed papers and a copy of your notice. Email apps cannot attach them for you.</p></div>');
      }

      h.push('<details class="next-steps"' + (k === 0 ? " open" : "") + "><summary>What to do next — step by step</summary>" +
        Render.instructionsHtml(Case.nextSteps(state, n, i)) + "</details>");
      h.push("</section>");
    });
    h.push('<div class="card"><h3>More notices?</h3><p>If you got another notice, you can make papers for it too.</p><button type="button" class="btn btn-secondary" data-goto="more">Add another notice</button></div>');
    h.push('<div class="card card-erase"><h3>When you are done</h3><p>If you are using a shared or public computer, <strong>erase your answers</strong> so that other people cannot see them. Download your papers first!</p>' +
      '<button type="button" class="btn btn-danger" data-action="restart">Erase my answers from this device</button></div>');
    return h.join("");
  }

  function copyRow(label, value) {
    var id = "copy-" + Math.random().toString(36).slice(2);
    return '<div class="copy-row"><span class="copy-label">' + label + ':</span> <code id="' + id + '">' + U.escapeHtml(value) + '</code> <button type="button" class="btn btn-small" data-copy-target="' + id + '">Copy</button></div>';
  }

  /* ---------------- Field rendering ---------------- */

  var fieldSeq = 0;

  function resolve(x) { return typeof x === "function" ? x() : x; }

  function fieldHtml(f) {
    if (f.when && !f.when()) return "";
    var id = "f" + (++fieldSeq);
    var val = get(f.key);
    var label = U.escapeHtml(f.label || "") + (f.required ? "" : "");
    var hint = f.hint ? '<p class="hint" id="' + id + '-hint">' + U.escapeHtml(f.hint) + "</p>" : "";
    var describedBy = f.hint ? ' aria-describedby="' + id + '-hint"' : "";
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
          '<select id="' + id + '"' + attrs + describedBy + '><option value="">Choose…</option>' + f.options.map(function (o) {
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
        msg = f.type === "choice" ? "Please choose an answer." : "Please fill this in.";
      } else if (!empty && f.type === "date") {
        var d = U.parseDate(v);
        if (!d) msg = "Please enter a full date (month, day, and year).";
        else if (f.past && d > U.today()) msg = "This date is in the future. Please check it.";
        else if (d < U.parseDate("1940-01-01")) msg = "Please check the year.";
      } else if (!empty && f.type === "money") {
        if (U.parseMoney(v) === null) msg = "Please enter an amount, like 3000 or 1,820,352.00.";
      } else if (!empty && f.type === "number") {
        var num = Number(v);
        if (isNaN(num) || num < (f.min || 0) || num > (f.max || 99) || Math.floor(num) !== num) msg = "Please enter a whole number.";
      }
      if (!msg && !empty && f.validate) msg = f.validate(v);
      if (msg) errors.push({ key: f.key, msg: msg });
    });
    if (screen.id === "st-family") {
      var kids = parseInt(state.story.children, 10) || 0;
      if ((parseInt(state.story.usChildren, 10) || 0) > kids) errors.push({ key: "story.usChildren", msg: "This number cannot be bigger than the number of children." });
    }
    if (screen.id === "st-apps" && state.story.apps.other && state.story.apps.other.on && !U.clean(state.story.apps.other.text)) {
      errors.push({ key: "apps", msg: "Please write what you applied for under “Something else,” or uncheck it." });
    }
    return errors;
  }

  function showErrors(errors) {
    var box = document.getElementById("error-summary");
    if (!errors.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = "<p><strong>Please fix " + (errors.length === 1 ? "this" : "these") + " before you continue:</strong></p><ul>" +
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

  var SECTIONS = [
    { key: "notice", label: "Your notice" },
    { key: "you", label: "About you" },
    { key: "story", label: "Your story" },
    { key: "review", label: "Review" },
    { key: "papers", label: "Your papers" }
  ];

  function render(focus) {
    var list = buildScreens();
    var idx = indexOf(list, state.cur);
    if (idx === -1) { idx = 0; state.cur = list[0].id; }
    var screen = list[idx];
    fieldSeq = 0;

    var progress = "";
    if (screen.section !== "start") {
      var secIdx = SECTIONS.findIndex(function (s) { return s.key === screen.section; });
      var pct = Math.round((idx / (list.length - 1)) * 100);
      progress = '<nav class="progress" aria-label="Progress"><ol>' + SECTIONS.map(function (s, k) {
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
    if (idx > 0) nav += '<button type="button" class="btn btn-secondary" data-action="back">← Back</button>';
    if (!screen.hideNext) nav += '<button type="submit" class="btn btn-primary">' + (screen.nextLabel || "Continue →") + "</button>";
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
    if (action === "resume") {
      var c = buildScreens();
      state.cur = state.lastCur && indexOf(c, state.lastCur) !== -1 ? state.lastCur : (c[1] ? c[1].id : "welcome");
      save(); render(); return;
    }
    if (action === "restart") {
      if (window.confirm("This will erase all your answers from this device. Are you sure?")) {
        erase(); render();
      }
      return;
    }
    if (action === "remove-notice") {
      var i = Number(el.getAttribute("data-i"));
      if (window.confirm("Remove " + Case.noticeLabel(state.notices[i], i) + "?")) {
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
    var done = function () { var old = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = old; }, 1800); };
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
    var last = String(state.person.lastName || "Papers").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var fine = Case.FINES[Case.fineOf(n)].short.replace(/[^A-Za-z0-9]+/g, "");
    return last + "-" + fine + (state.notices.length > 1 ? "-Notice" + (i + 1) : "");
  }

  function download(kind, i, btn) {
    var n = state.notices[i];
    var status = document.getElementById("dl-status-" + i);
    var footer = Case.fullName(state.person) + "  ·  A# " + U.fmtANumber(state.person.aNumber);
    var job;
    btn.disabled = true;
    if (status) status.textContent = "Making your file… please wait.";
    if (kind === "instructions") {
      var blocks = Render.instructionBlocks(Case.nextSteps(state, n, i), "What to do next", Case.noticeLabel(n, i));
      job = Render.downloadPdf(blocks, fileBase(n, i) + "-Instructions.pdf", footer, "Instructions");
    } else {
      var papers = Case.buildCoverLetter(state, n).concat([{ t: "pagebreak" }], Case.buildOpposition(state, n));
      job = kind === "docx"
        ? Render.downloadDocx(papers, fileBase(n, i) + "-Papers.docx", footer)
        : Render.downloadPdf(papers, fileBase(n, i) + "-Papers.pdf", footer, "Written Defense");
    }
    job.then(function () {
      if (status) status.textContent = "Done! Look in your Downloads folder (or your phone’s Files app).";
    }, function (err) {
      if (status) status.textContent = "Sorry, something went wrong making the file. Please try again, or try a different browser (like Chrome or Safari).";
      if (window.console) console.error(err);
    }).then(function () { btn.disabled = false; });
  }

  // Remember the last real screen so "Continue where I left off" works.
  var _save = save;
  save = function () {
    if (state.cur && state.cur !== "welcome") state.lastCur = state.cur;
    _save();
  };

  /* ---------------- Page chrome ---------------- */

  function chrome() {
    document.title = S.siteName;
    document.getElementById("site-name").textContent = S.siteName;
    document.getElementById("site-tagline").textContent = S.tagline;
    var foot = [];
    if (S.providedBy) foot.push("<p><strong>" + U.escapeHtml(S.providedBy) + "</strong></p>");
    var contact = [S.contactName, S.contactPhone, S.contactEmail, S.contactWebsite].map(U.clean).filter(Boolean);
    if (contact.length) foot.push("<p>Contact: " + Render.linkify(U.escapeHtml(contact.join(" · "))) + "</p>");
    foot.push("<p><strong>This is not legal advice.</strong> This tool gives general information and helps you fill in papers. Using it does not make anyone your lawyer. If you can, talk to a lawyer about your situation.</p>");
    foot.push("<p>" + U.escapeHtml(S.credit) + "</p>");
    foot.push("<p>🔒 Your answers are saved only on this device and are never sent to anyone. Information last reviewed: " + U.escapeHtml(S.lastReviewed) + ".</p>");
    document.getElementById("site-footer").innerHTML = foot.join("");
    document.getElementById("restart-top").addEventListener("click", function () {
      if (window.confirm("This will erase all your answers from this device. Are you sure?")) {
        erase(); render();
      }
    });
  }

  chrome();
  if (state.cur !== "welcome") state.cur = "welcome"; // always open on the welcome page; "Continue" resumes
  render(false);
})();
