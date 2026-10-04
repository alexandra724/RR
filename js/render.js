/* =====================================================================
   Turns document "blocks" (from js/case.js) into:
     - an on-screen preview (HTML)
     - a PDF (pdfmake, built-in Times font)
     - a Word file (.docx)
   The PDF and Word libraries load only when someone downloads a file.
   ===================================================================== */
(function () {
  "use strict";
  var U = window.U;

  /* ---------- small helpers ---------- */

  // "**bold** text" -> runs
  function md(s) {
    var parts = String(s).split("**");
    return parts.map(function (t, i) { return { text: t, b: i % 2 === 1 }; }).filter(function (r) { return r.text; });
  }

  var loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(function (resolve, reject) {
        var el = document.createElement("script");
        el.src = src;
        el.onload = resolve;
        el.onerror = function () { delete loaded[src]; reject(new Error("Could not load " + src)); };
        document.head.appendChild(el);
      });
    }
    return loaded[src];
  }

  function loadPdf() {
    return loadScript("vendor/pdfmake.min.js").then(function () { return loadScript("vendor/pdfmake-times.js"); });
  }

  function loadDocx() { return loadScript("vendor/docx.min.js"); }

  function saveBlob(blob, filename) {
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  /* ---------- HTML preview ---------- */

  function runsHtml(runs) {
    return (runs || []).map(function (r) {
      var t = U.escapeHtml(r.text);
      if (r.b) t = "<strong>" + t + "</strong>";
      if (r.i) t = "<em>" + t + "</em>";
      if (r.u) t = "<u>" + t + "</u>";
      return t;
    }).join("");
  }

  function toHtml(blocks) {
    var h = [];
    blocks.forEach(function (b) {
      switch (b.t) {
        case "center":
          h.push('<p class="d-center">' + runsHtml(b.runs) + "</p>");
          break;
        case "caption":
          h.push('<div class="d-caption"><div class="d-cap-left"><div>In the Matter of</div><div class="d-cap-name">' +
            U.escapeHtml(b.name) + '</div><div>Respondent</div></div><div class="d-cap-right">File No. ' +
            U.escapeHtml(b.fileNo) + "</div></div>");
          h.push('<p><strong>' + U.escapeHtml(b.trackLabel) + ":</strong> " + U.escapeHtml(b.track) + "</p>");
          break;
        case "title":
          h.push('<p class="d-title">' + U.escapeHtml(b.text) + "</p>");
          break;
        case "fields":
          h.push('<div class="d-fields">' + b.items.map(function (it) {
            return "<div><em>" + U.escapeHtml(it[0]) + ":</em> <u>" + U.escapeHtml(it[1]) + "</u></div>";
          }).join("") + "</div>");
          break;
        case "p":
          var cls = "d-p" + (b.double ? " d-double" : "") + (b.level ? " d-l" + b.level : "") + (b.num ? " d-num" : "");
          h.push('<p class="' + cls + '">' + (b.num ? '<span class="d-n">' + b.num + "</span>" : "") +
            (b.label ? '<span class="d-lab">' + b.label + "</span>" : "") + runsHtml(b.runs) + "</p>");
          break;
        case "line":
          h.push('<p class="d-p">' + U.escapeHtml(b.label) + ": " + (b.value ? "<u>" + U.escapeHtml(b.value) + "</u>" : "<span class=\"d-blank\"></span>") + "</p>");
          break;
        case "sig":
          h.push('<div class="d-sig">' + b.lines.map(function (l) {
            return '<div class="d-sig-val">' + (U.escapeHtml(l[1]) || "&nbsp;") + '</div><div class="d-sig-lab">' + U.escapeHtml(l[0]) + "</div>";
          }).join("") + "</div>");
          break;
        case "pagebreak":
          h.push('<hr class="d-break" aria-label="New page">');
          break;
        case "heading":
          h.push('<h3 class="d-h">' + runsHtml(b.runs) + "</h3>");
          break;
        case "bullet":
          h.push('<p class="d-bullet">• ' + runsHtml(b.runs) + "</p>");
          break;
        case "box":
          h.push('<div class="d-box">' + runsHtml(b.runs) + "</div>");
          break;
      }
    });
    return h.join("\n");
  }

  /* ---------- PDF (pdfmake) ---------- */

  function pdfRuns(runs) {
    return (runs || []).map(function (r) {
      var o = { text: U.pdfSafe(r.text) };
      if (r.b) o.bold = true;
      if (r.i) o.italics = true;
      if (r.u) o.decoration = "underline";
      return o;
    });
  }

  var DOUBLE = 1.75;

  function pdfBlock(b) {
    var lh = b.double ? DOUBLE : 1.1;
    var margin = [0, b.spaceBefore || 0, 0, b.spaceAfter !== undefined ? b.spaceAfter : (b.double ? 0 : 0)];
    switch (b.t) {
      case "center":
        return { text: pdfRuns(b.runs), alignment: "center", margin: [0, b.spaceBefore || 0, 0, b.spaceAfter || 0] };
      case "caption":
        var parens = [];
        for (var i = 0; i < 9; i++) parens.push(")");
        return {
          stack: [
            {
              table: {
                widths: [250, 14, "*"],
                body: [[
                  {
                    stack: [
                      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 245, y2: 0, lineWidth: 1 }] },
                      { text: " ", margin: [0, 6, 0, 0] },
                      { text: "In the Matter of", bold: true, margin: [0, 4, 0, 18] },
                      { text: U.pdfSafe(b.name), decoration: "underline", margin: [24, 0, 0, 14] },
                      { text: "Respondent", bold: true, margin: [24, 0, 0, 8] },
                      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 245, y2: 0, lineWidth: 1 }] }
                    ]
                  },
                  { stack: parens.map(function (p) { return { text: p, bold: true, lineHeight: 1.05 }; }), margin: [0, 4, 0, 0] },
                  { text: [{ text: "File No. ", bold: true }, { text: U.pdfSafe(b.fileNo) }], margin: [8, 58, 0, 0] }
                ]]
              },
              layout: "noBorders"
            },
            { text: [{ text: U.pdfSafe(b.trackLabel) + ": ", bold: true }, { text: U.pdfSafe(b.track), decoration: "underline" }], margin: [0, 24, 0, 18] }
          ]
        };
      case "title":
        return {
          table: { widths: ["*"], body: [[{ text: U.pdfSafe(b.text), bold: true, alignment: "center", margin: [30, 10, 30, 10] }]] },
          layout: {
            hLineWidth: function () { return 1.2; }, vLineWidth: function () { return 0; },
            paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }
          },
          margin: [0, 6, 0, 24]
        };
      case "fields":
        return {
          stack: b.items.map(function (it) {
            return { text: [{ text: U.pdfSafe(it[0]) + ": ", italics: true }, { text: U.pdfSafe(it[1]), decoration: "underline" }], margin: [0, 0, 0, 8] };
          }),
          margin: [180, 0, 0, 18]
        };
      case "p":
        if (b.label) {
          var left = b.level === 2 ? 90 : 54;
          var lw = b.level === 2 ? 26 : 18;
          return {
            columns: [
              { width: lw, text: b.label, lineHeight: lh },
              { width: "*", text: pdfRuns(b.runs), alignment: "justify", lineHeight: lh }
            ],
            columnGap: 0,
            margin: [left, b.spaceBefore || 0, 0, b.spaceAfter || 0]
          };
        }
        var runs = pdfRuns(b.runs);
        var item = { text: runs, lineHeight: lh, alignment: b.align || (b.double ? "justify" : "left"), margin: margin };
        if (b.num) {
          item.text = [{ text: b.num + "        " + (b.num.length > 2 ? "" : "  ") }].concat(runs);
          item.leadingIndent = 36;
        } else if (b.level) {
          item.margin = [b.level === 2 ? 90 : 54, margin[1], 0, margin[3]];
        }
        return item;
      case "line":
        return {
          text: [{ text: U.pdfSafe(b.label) + ":  " }, b.value ? { text: U.pdfSafe(b.value), decoration: "underline" } : { text: "______________________________" }],
          margin: [0, 0, 0, b.spaceAfter !== undefined ? b.spaceAfter : 10]
        };
      case "sig":
        var st = [];
        b.lines.forEach(function (l, idx) {
          st.push({ text: U.pdfSafe(l[1]) || " ", margin: [0, idx === 0 ? 26 : 14, 0, 1] });
          st.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.8 }] });
          st.push({ text: U.pdfSafe(l[0]), italics: true, fontSize: 11, margin: [0, 3, 0, 0] });
        });
        return { stack: st, margin: [252, 0, 0, 0], unbreakable: true };
      case "heading":
        return { text: pdfRuns(b.runs), bold: true, fontSize: b.size || 13, margin: [0, b.spaceBefore !== undefined ? b.spaceBefore : 12, 0, 4] };
      case "bullet":
        return { columns: [{ width: 14, text: "•" }, { width: "*", text: pdfRuns(b.runs), lineHeight: 1.15 }], columnGap: 0, margin: [b.indent || 14, 0, 0, 4] };
      case "box":
        return {
          table: { widths: ["*"], body: [[{ text: pdfRuns(b.runs), margin: [8, 6, 8, 6] }]] },
          layout: { hLineWidth: function () { return 1.5; }, vLineWidth: function () { return 1.5; } },
          margin: [0, 4, 0, 6]
        };
    }
    return null;
  }

  function pdfContent(blocks) {
    var out = [];
    var breakNext = false;
    var group = [];
    function push(item) {
      if (breakNext) { item.pageBreak = "before"; breakNext = false; }
      out.push(item);
    }
    blocks.forEach(function (b) {
      if (b.t === "pagebreak") { breakNext = true; return; }
      var item = pdfBlock(b);
      if (!item) return;
      if (b.keepWithNext) { group.push(item); return; }
      if (group.length) {
        group.push(item);
        push({ stack: group, unbreakable: true });
        group = [];
        return;
      }
      push(item);
    });
    if (group.length) push({ stack: group, unbreakable: true });
    return out;
  }

  function pdfDoc(blocks, footerText, title) {
    return {
      pageSize: "LETTER",
      pageMargins: [72, 72, 72, 64],
      info: { title: U.pdfSafe(title || "Papers") },
      defaultStyle: { font: "Times", fontSize: 12 },
      content: pdfContent(blocks),
      footer: function (page, pages) {
        return { text: U.pdfSafe(footerText) + "   ·   Page " + page + " of " + pages, alignment: "center", fontSize: 9, color: "#444444", margin: [0, 24, 0, 0] };
      }
    };
  }

  function downloadPdf(blocks, filename, footerText, title) {
    return loadPdf().then(function () {
      return window.pdfMake.createPdf(pdfDoc(blocks, footerText, title)).getBlob();
    }).then(function (blob) { saveBlob(blob, filename); });
  }

  /* ---------- Word (.docx) ---------- */

  function downloadDocx(blocks, filename, footerText) {
    return loadDocx().then(function () {
      var d = window.docx;
      var NONE = { style: d.BorderStyle.NONE, size: 0, color: "FFFFFF" };
      var LINE = { style: d.BorderStyle.SINGLE, size: 8, color: "000000", space: 4 };

      function runs(rs, extra) {
        return (rs || []).map(function (r) {
          return new d.TextRun(Object.assign({ text: r.text, bold: !!r.b, italics: !!r.i, underline: r.u ? {} : undefined }, extra || {}));
        });
      }
      function spacing(b) {
        return { line: b.double ? 480 : 240, before: (b.spaceBefore || 0) * 20, after: (b.spaceAfter || 0) * 20 };
      }
      var out = [];
      var breakNext = false;
      function add(p) { out.push(p); }
      function para(opts) {
        if (breakNext) { opts.pageBreakBefore = true; breakNext = false; }
        return new d.Paragraph(opts);
      }

      blocks.forEach(function (b) {
        switch (b.t) {
          case "pagebreak":
            breakNext = true;
            break;
          case "center":
            add(para({ alignment: d.AlignmentType.CENTER, children: runs(b.runs), spacing: { after: (b.spaceAfter || 0) * 20 } }));
            break;
          case "caption":
            var cellBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE };
            var leftCell = new d.TableCell({
              borders: { top: LINE, bottom: LINE, left: NONE, right: NONE },
              width: { size: 4800, type: d.WidthType.DXA },
              children: [
                new d.Paragraph({ children: [new d.TextRun({ text: "In the Matter of", bold: true })], spacing: { before: 200, after: 300 } }),
                new d.Paragraph({ indent: { left: 480 }, children: [new d.TextRun({ text: b.name, underline: {} })], spacing: { after: 240 } }),
                new d.Paragraph({ indent: { left: 480 }, children: [new d.TextRun({ text: "Respondent", bold: true })], spacing: { after: 200 } })
              ]
            });
            var midCell = new d.TableCell({
              borders: cellBorders, width: { size: 300, type: d.WidthType.DXA },
              children: [")", ")", ")", ")", ")", ")", ")"].map(function (t) { return new d.Paragraph({ children: [new d.TextRun({ text: t, bold: true })] }); })
            });
            var rightCell = new d.TableCell({
              borders: cellBorders, width: { size: 4260, type: d.WidthType.DXA }, verticalAlign: d.VerticalAlign.CENTER,
              children: [new d.Paragraph({ indent: { left: 200 }, children: [new d.TextRun({ text: "File No. ", bold: true }), new d.TextRun(b.fileNo)] })]
            });
            add(new d.Table({
              width: { size: 9360, type: d.WidthType.DXA },
              columnWidths: [4800, 300, 4260],
              borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
              rows: [new d.TableRow({ children: [leftCell, midCell, rightCell] })]
            }));
            add(para({ spacing: { before: 480, after: 360 }, children: [new d.TextRun({ text: b.trackLabel + ": ", bold: true }), new d.TextRun({ text: b.track, underline: {} })] }));
            break;
          case "title":
            add(para({
              alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: b.text, bold: true })],
              border: { top: LINE, bottom: LINE }, indent: { left: 0, right: 0 }, spacing: { before: 120, after: 480 }
            }));
            break;
          case "fields":
            b.items.forEach(function (it, i) {
              add(para({
                indent: { left: 3600 }, spacing: { after: i === b.items.length - 1 ? 360 : 160 },
                children: [new d.TextRun({ text: it[0] + ": ", italics: true }), new d.TextRun({ text: it[1], underline: {} })]
              }));
            });
            break;
          case "p":
            var opts = { spacing: spacing(b), keepNext: !!b.keepWithNext, children: [] };
            opts.alignment = (b.align === "justify" || b.double) ? d.AlignmentType.JUSTIFIED : d.AlignmentType.LEFT;
            if (b.num) {
              opts.indent = { firstLine: 720 };
              opts.tabStops = [{ type: d.TabStopType.LEFT, position: 1440 }];
              opts.children = [new d.TextRun(b.num + "\t")].concat(runs(b.runs));
            } else if (b.label) {
              var left = b.level === 2 ? 2160 : 1440;
              opts.indent = { left: left, hanging: 400 };
              opts.tabStops = [{ type: d.TabStopType.LEFT, position: left }];
              opts.children = [new d.TextRun(b.label + "\t")].concat(runs(b.runs));
            } else {
              if (b.level) opts.indent = { left: b.level === 2 ? 2160 : 1440 };
              opts.children = runs(b.runs);
            }
            add(para(opts));
            break;
          case "line":
            add(para({
              keepNext: !!b.keepWithNext, spacing: { after: (b.spaceAfter !== undefined ? b.spaceAfter : 10) * 20 },
              children: [new d.TextRun(b.label + ":  "), b.value ? new d.TextRun({ text: b.value, underline: {} }) : new d.TextRun("______________________________")]
            }));
            break;
          case "sig":
            b.lines.forEach(function (l, i) {
              add(para({ indent: { left: 5040 }, keepNext: true, spacing: { before: i === 0 ? 480 : 240 }, border: { bottom: LINE }, children: [new d.TextRun(l[1] || " ")] }));
              add(para({ indent: { left: 5040 }, keepNext: i < b.lines.length - 1, children: [new d.TextRun({ text: l[0], italics: true, size: 22 })] }));
            });
            break;
        }
      });

      var doc = new d.Document({
        styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
        sections: [{
          properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
          footers: {
            default: new d.Footer({
              children: [new d.Paragraph({
                alignment: d.AlignmentType.CENTER,
                children: [new d.TextRun({ text: footerText + "   ·   Page ", size: 18 }), new d.TextRun({ children: [d.PageNumber.CURRENT], size: 18 }),
                  new d.TextRun({ text: " of ", size: 18 }), new d.TextRun({ children: [d.PageNumber.TOTAL_PAGES], size: 18 })]
              })]
            })
          },
          children: out
        }]
      });
      return d.Packer.toBlob(doc);
    }).then(function (blob) { saveBlob(blob, filename); });
  }

  /* ---------- Instructions -> blocks ---------- */

  function instructionBlocks(sections, heading, subheading) {
    var blocks = [
      { t: "heading", runs: [{ text: heading }], size: 18, spaceBefore: 0 },
      { t: "p", runs: [{ text: subheading, i: true }], spaceAfter: 6 }
    ];
    sections.forEach(function (sec) {
      blocks.push({ t: "heading", runs: [{ text: sec.title }] });
      if (sec.box) {
        blocks.push({ t: "box", runs: md(sec.items[0]) });
        sec.items.slice(1).forEach(function (it) { blocks.push({ t: "bullet", runs: md(it) }); });
        return;
      }
      if (sec.steps) {
        sec.steps.forEach(function (st, i) {
          blocks.push({ t: "heading", runs: [{ text: "Step " + (i + 1) + ": " + st.title }], size: 12, spaceBefore: 8 });
          st.items.forEach(function (it) { blocks.push({ t: "bullet", runs: md(it) }); });
        });
        return;
      }
      sec.items.forEach(function (it) { blocks.push({ t: "bullet", runs: md(it) }); });
    });
    return blocks;
  }

  function instructionsHtml(sections) {
    var h = [];
    sections.forEach(function (sec) {
      h.push("<section class=\"ns\"><h3>" + U.escapeHtml(sec.title) + "</h3>");
      if (sec.box) {
        h.push('<div class="callout callout-deadline">' + runsHtml(md(sec.items[0])) + "</div>");
        h.push("<ul>" + sec.items.slice(1).map(function (it) { return "<li>" + runsHtml(md(it)) + "</li>"; }).join("") + "</ul>");
      } else if (sec.steps) {
        h.push('<ol class="steps">' + sec.steps.map(function (st) {
          return "<li><strong class=\"step-title\">" + U.escapeHtml(st.title) + "</strong><ul>" +
            st.items.map(function (it) { return "<li>" + linkify(runsHtml(md(it))) + "</li>"; }).join("") + "</ul></li>";
        }).join("") + "</ol>");
      } else {
        h.push("<ul>" + sec.items.map(function (it) { return "<li>" + linkify(runsHtml(md(it))) + "</li>"; }).join("") + "</ul>");
      }
      h.push("</section>");
    });
    return h.join("");
  }

  function linkify(html) {
    return html.replace(/(https?:\/\/[^\s<]+[^\s<.,)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  window.Render = {
    md: md, toHtml: toHtml, downloadPdf: downloadPdf, downloadDocx: downloadDocx, pdfDoc: pdfDoc,
    instructionBlocks: instructionBlocks, instructionsHtml: instructionsHtml, linkify: linkify, loadPdf: loadPdf
  };
})();
