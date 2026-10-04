/* Small helpers: dates, deadlines, money, text clean-up. */
(function () {
  "use strict";

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  // All dates are handled as UTC midnight so time zones never shift a day.
  function parseDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    if (d.getUTCMonth() !== p[1] - 1) return null;
    return d;
  }

  function today() {
    var n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }

  function fmtDate(d) {
    if (typeof d === "string") d = parseDate(d);
    if (!d) return "";
    return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
  }

  function weekdayName(d) {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()];
  }

  function addDays(d, n) {
    return new Date(d.getTime() + n * 86400000);
  }

  function addYears(d, n) {
    return new Date(Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate()));
  }

  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  // nth weekday of a month (n = 1..4) or last (n = -1). weekday: 0 = Sunday.
  function nthWeekday(year, month, weekday, n) {
    if (n > 0) {
      var first = new Date(Date.UTC(year, month, 1));
      var offset = (weekday - first.getUTCDay() + 7) % 7;
      return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7));
    }
    var last = new Date(Date.UTC(year, month + 1, 0));
    var back = (last.getUTCDay() - weekday + 7) % 7;
    return new Date(Date.UTC(year, month, last.getUTCDate() - back));
  }

  function observed(d) {
    var day = d.getUTCDay();
    if (day === 6) return addDays(d, -1);
    if (day === 0) return addDays(d, 1);
    return d;
  }

  var holidayCache = {};
  function federalHolidays(year) {
    if (holidayCache[year]) return holidayCache[year];
    var list = [
      observed(new Date(Date.UTC(year, 0, 1))),   // New Year's Day
      nthWeekday(year, 0, 1, 3),                  // Martin Luther King Jr. Day
      nthWeekday(year, 1, 1, 3),                  // Washington's Birthday
      nthWeekday(year, 4, 1, -1),                 // Memorial Day
      observed(new Date(Date.UTC(year, 5, 19))),  // Juneteenth
      observed(new Date(Date.UTC(year, 6, 4))),   // Independence Day
      nthWeekday(year, 8, 1, 1),                  // Labor Day
      nthWeekday(year, 9, 1, 2),                  // Columbus Day
      observed(new Date(Date.UTC(year, 10, 11))), // Veterans Day
      nthWeekday(year, 10, 4, 4),                 // Thanksgiving
      observed(new Date(Date.UTC(year, 11, 25)))  // Christmas
    ];
    // New Year's Day of next year can be observed on Dec 31 of this year.
    var nextNY = observed(new Date(Date.UTC(year + 1, 0, 1)));
    if (nextNY.getUTCFullYear() === year) list.push(nextNY);
    holidayCache[year] = list.map(function (x) { return x.getTime(); });
    return holidayCache[year];
  }

  function isBusinessDay(d) {
    var day = d.getUTCDay();
    if (day === 0 || day === 6) return false;
    return federalHolidays(d.getUTCFullYear()).indexOf(d.getTime()) === -1;
  }

  function addBusinessDays(d, n) {
    var cur = d;
    var count = 0;
    while (count < n) {
      cur = addDays(cur, 1);
      if (isBusinessDay(cur)) count++;
    }
    return cur;
  }

  function parseMoney(s) {
    if (s === undefined || s === null) return null;
    var clean = String(s).replace(/[^0-9.]/g, "");
    if (!clean) return null;
    var n = parseFloat(clean);
    return isNaN(n) ? null : n;
  }

  function fmtMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return "";
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function digits(s) { return String(s || "").replace(/\D/g, ""); }

  function fmtANumber(s) {
    var d = digits(s);
    if (d.length < 7 || d.length > 9) return String(s || "").trim();
    while (d.length < 9) d = "0" + d;
    return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
  }

  function escapeHtml(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Trim, collapse spaces, and end with a period if the person forgot one.
  function sentence(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    if (!/[.!?)"”]$/.test(s)) s += ".";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function clean(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  // Join a list in plain English: "a", "a and b", "a, b, and c".
  function joinList(items) {
    items = items.filter(Boolean);
    if (items.length <= 1) return items.join("");
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  var NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  function numWord(n) { return NUMBER_WORDS[n] || String(n); }

  // The built-in PDF font (Times) only supports Western European letters.
  // Replace anything else so the PDF never shows broken characters.
  var WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  function pdfSafe(s) {
    s = String(s === undefined || s === null ? "" : s).normalize("NFC");
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      var code = ch.charCodeAt(0);
      if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) || code === 10 ||
          WIN_ANSI_EXTRA.indexOf(ch) !== -1) {
        out += ch;
      } else {
        var base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
        var bc = base.charCodeAt(0);
        out += (base && bc >= 32 && bc <= 126) ? base : "?";
      }
    }
    return out;
  }

  function hasNonLatin(s) {
    return pdfSafe(s) !== String(s || "").normalize("NFC");
  }

  window.U = {
    MONTHS: MONTHS, parseDate: parseDate, today: today, fmtDate: fmtDate, weekdayName: weekdayName,
    addDays: addDays, addYears: addYears, daysBetween: daysBetween, addBusinessDays: addBusinessDays,
    isBusinessDay: isBusinessDay, federalHolidays: federalHolidays,
    parseMoney: parseMoney, fmtMoney: fmtMoney, digits: digits, fmtANumber: fmtANumber,
    escapeHtml: escapeHtml, sentence: sentence, clean: clean, joinList: joinList, plural: plural,
    numWord: numWord, pdfSafe: pdfSafe, hasNonLatin: hasNonLatin
  };
})();
