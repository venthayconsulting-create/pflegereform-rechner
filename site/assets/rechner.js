/*
 * Pflegereform-Rechner: Berechnung vollständig im Browser, keine Netzwerkzugriffe,
 * kein Speichern. Datengrundlage: rechner_logik.json (Stand 14.11.2026).
 * 2027-Werte entsprechen dem Kabinettsentwurf und sind nicht beschlossen.
 */
(function (root) {
  'use strict';

  var STAND = '14.11.2026';
  var ENTWURF = 'laut Gesetzentwurf (Stand ' + STAND + ')';

  var ADS = {
    "pflegebox": {
      "titel": "Pflegebox-Anbieter für Pflegehilfsmittel zum Verbrauch",
      "text": "Pflegehilfsmittel zum Verbrauch, zum Beispiel Einmalhandschuhe oder Desinfektionsmittel, bezuschusst die Pflegekasse bei Anspruch mit bis zu 42 € monatlich (Stand 2026). Anbieter stellen dafür Pakete zusammen. Prüfen Sie vor einer Bestellung, was in Ihrem Fall von der Pflegekasse übernommen wird und ob Kosten bei Ihnen verbleiben.",
      "cta": "Pflegebox-Anbieter ansehen",
      "href": "/go/pflegebox"
    },
    "hausnotruf": {
      "titel": "Hausnotruf-Anbieter im Überblick",
      "text": "Ein Hausnotruf verbindet Sie per Knopfdruck mit einer Notrufzentrale. Die Pflegekasse bezuschusst ihn unter Bedingungen in der Regel mit 27 € monatlich (Stand 2026, bei Anbietern mit Vertrag mit der Kasse). Achten Sie auf Vertragslaufzeit, Kündigungsfrist und die Kosten, die über den Zuschuss hinausgehen.",
      "cta": "Hausnotruf-Anbieter ansehen",
      "href": "/go/hausnotruf"
    },
    "treppenlift": {
      "titel": "Treppenlift: Angebote einholen",
      "text": "Ein Treppenlift kann zu den wohnumfeldverbessernden Maßnahmen gehören, für die die Pflegekasse bis zu 4.180 € je Maßnahme zuschießen kann. Ob Ihr Vorhaben dazuzählt und in welcher Höhe gezahlt wird, entscheidet die Pflegekasse. Fragen Sie dort nach, bevor Sie einen Auftrag erteilen.",
      "cta": "Treppenlift-Angebote ansehen",
      "href": "/go/treppenlift"
    },
    "bad": {
      "titel": "Barrierearmes Bad: Umbau-Angebote",
      "text": "Ein barrierearmer Badumbau, etwa mit bodengleicher Dusche, kann zu den wohnumfeldverbessernden Maßnahmen gehören (Zuschuss bis 4.180 € je Maßnahme, Stand 2026). Ob und wie viel die Pflegekasse zahlt, entscheidet sie im Einzelfall. Klären Sie das vor der Auftragserteilung.",
      "cta": "Anbieter für Badumbau ansehen",
      "href": "/go/bad"
    },
    "24h-pflege": {
      "titel": "Betreuung im Haushalt: Anbieter für 24-Stunden-Betreuung",
      "text": "Wenn Sie eine durchgehende Betreuung zu Hause erwägen, finden Sie bei Vermittlern entsprechende Angebote. Kosten und Vertragsmodelle unterscheiden sich. Die Pflegekasse zahlt nur im Rahmen ihrer Leistungen. Vergleichen Sie Kosten und Vertragsbedingungen sorgfältig.",
      "cta": "Anbieter für 24-Stunden-Betreuung ansehen",
      "href": "/go/24h-pflege"
    }
  };

  var D = {
    pflegegeld2026: { 1: 0, 2: 347, 3: 599, 4: 800, 5: 990 },
    sachleistung2026: { 1: 0, 2: 796, 3: 1497, 4: 1859, 5: 2299 },
    tages2026: { 1: 0, 2: 721, 3: 1357, 4: 1685, 5: 2085 },
    vollstat2026: { 1: 131, 2: 805, 3: 1319, 4: 1855, 5: 2096 },
    entlastung2026Monat: 131,
    entlastung2026Jahr: 131 * 12,
    jahresbetragVK2026: 3539,
    hilfsmittel2026Monat: 42,
    wohnumfeld2026: 4180,
    hausnotruf2026: 27,
    schwelle2026: { 1: 12.5, 2: 27, 3: 47.5, 4: 70, 5: 90 },
    entlastungsbudget2027: { 1: 0, 2: 380, 3: 630, 4: 890, 5: 1080 },
    sachleistungsbudget2027: { 1: 0, 2: 890, 3: 1590, 4: 2090, 5: 2530 },
    sozialraum2027: 175,
    sozialraum2027Unter25: 300,
    ueberbrueckung2027Jahr: 2285,
    schwelle2027: { 1: 15, 2: 30, 3: 50, 4: 70, 5: 90 }
  };

  var PG_WERTE = ['0', '1', '2', '3', '4', '5', 'kein_unklar'];

  /* ---------- Formatierung ---------- */
  function fmt(n) {
    var neg = n < 0;
    var a = Math.round(Math.abs(n) * 100) / 100;
    var parts = a.toFixed(2).split('.');
    var ganz = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var out = parts[1] === '00' ? ganz : ganz + ',' + parts[1];
    return (neg ? '−' : '') + out + ' €';
  }
  function fmtSigned(n) {
    if (n > 0) { return '+' + fmt(n); }
    if (n === 0) { return fmt(0); }
    return fmt(n);
  }
  function fmtPunkte(n) {
    return String(n).replace('.', ',');
  }
  function fmtZahl(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* ---------- Eingabeprüfung ---------- */
  function zahl(wert, max, name, fehler) {
    if (wert === undefined || wert === null || wert === '') { return 0; }
    var s = String(wert).replace(',', '.');
    var n = Number(s);
    if (!isFinite(n) || n < 0) {
      fehler[name] = 'Bitte geben Sie einen Betrag von 0 bis ' + fmtZahl(max) + ' Euro ein.';
      return 0;
    }
    if (n > max) {
      fehler[name] = 'Bitte höchstens ' + fmtZahl(max) + ' Euro eintragen. Das ist der Jahreshöchstbetrag 2026.';
      return 0;
    }
    return n;
  }

  function pruefe(raw) {
    var fehler = {};
    var e = raw || {};
    var pg = e.pflegegrad === undefined || e.pflegegrad === null ? '' : String(e.pflegegrad);
    if (PG_WERTE.indexOf(pg) < 0) { fehler.pflegegrad = 'Bitte wählen Sie einen Pflegegrad, „Noch keiner“ oder „Weiß ich nicht“ aus.'; }
    var vers = e.versorgung;
    if (vers !== 'zuhause' && vers !== 'heim') { fehler.versorgung = 'Bitte wählen Sie aus, wo die Pflege stattfindet.'; }
    var antrag = e.antrag_gestellt;
    if (['ja', 'nein', 'weiss_nicht'].indexOf(antrag) < 0) { fehler.antrag_gestellt = 'Bitte wählen Sie eine Antwort aus.'; }
    var entl = zahl(e.entlastungsbetrag_2026_genutzt_eur, D.entlastung2026Jahr, 'entlastungsbetrag_2026_genutzt_eur', fehler);
    var verh = zahl(e.verhinderungs_kurzzeitpflege_2026_genutzt_eur, D.jahresbetragVK2026, 'verhinderungs_kurzzeitpflege_2026_genutzt_eur', fehler);
    var ok = Object.keys(fehler).length === 0;
    return {
      ok: ok,
      fehler: fehler,
      werte: {
        pflegegrad: pg,
        versorgung: vers,
        antrag_gestellt: antrag,
        entl: entl,
        verh: verh,
        unter25: e.alter_unter_25 === true,
        ersatz2025: e.ersatzpflege_2025_noch_nicht_abgerechnet === true,
        verschlechterung: e.verschlechterung_erwartet === true
      }
    };
  }

  /* ---------- Berechnung ---------- */
  function berechne(raw) {
    var v = pruefe(raw);
    if (!v.ok) { return { ok: false, fehler: v.fehler }; }
    var e = v.werte;
    var pg = /^[1-5]$/.test(e.pflegegrad) ? Number(e.pflegegrad) : 0;
    var hatPG = pg >= 1;
    var zuhause = e.versorgung === 'zuhause';
    var heim = e.versorgung === 'heim';
    var antragOffen = e.antrag_gestellt === 'nein' || e.antrag_gestellt === 'weiss_nicht';

    var bis = [];
    var vergleich = [];
    var hinweise = [];
    var schritte = [];
    var regeln = [];

    function add(id) { regeln.push(id); }

    /* --- (a) Bis 31.12.2026 --- */
    var restEntl = hatPG && zuhause ? Math.max(0, D.entlastung2026Jahr - e.entl) : null;
    var restVK = pg >= 2 && zuhause ? Math.max(0, D.jahresbetragVK2026 - e.verh) : null;

    if (hatPG && zuhause) {
      if (restEntl > 0) {
        add('R1_entlastung_rest');
        bis.push({
          id: 'R1_entlastung_rest', prio: 1, status: 'entwurf',
          jahr: D.entlastung2026Jahr, genutzt: e.entl,
          titel: 'Entlastungsbetrag 2026',
          betrag: restEntl, betragText: fmt(restEntl) + ' rechnerisch offen',
          frist: 'Belege möglichst bis 31.12.2026 einreichen',
          text: 'Von Ihrem Entlastungsbetrag 2026 sind rechnerisch noch ' + fmt(restEntl) + ' offen (131 € × 12 Monate abzüglich Ihrer Angabe). Nach geltendem Recht könnten Sie Reste bis 30.06.2027 nutzen. Im Entwurf für 2027 ist kein Ansparen vorgesehen, und TK sowie Verbraucherzentrale NRW weisen darauf hin, dass 2026-Reste zum 31.12.2026 verfallen könnten. Reichen Sie Belege deshalb möglichst bis Jahresende ein.',
          unsicher: 'Offen: Eine Übergangsregel für 2026-Reste wurde im Gesetzestext nicht gefunden.'
        });
      } else {
        bis.push({
          id: 'R1_entlastung_erledigt', prio: 9, status: 'erledigt',
          jahr: D.entlastung2026Jahr, genutzt: e.entl,
          titel: 'Entlastungsbetrag 2026',
          betrag: 0, betragText: 'nach Ihren Angaben ausgeschöpft',
          frist: '',
          text: 'Nach Ihren Angaben ist der Entlastungsbetrag 2026 rechnerisch ausgeschöpft. Fragen Sie bei Ihrer Pflegekasse nach, ob alle Belege verbucht sind.'
        });
      }
    }

    if (pg >= 2 && zuhause) {
      if (restVK > 0) {
        add('R2_verhinderung_rest');
        bis.push({
          id: 'R2_verhinderung_rest', prio: 2, status: 'entwurf',
          jahr: D.jahresbetragVK2026, genutzt: e.verh,
          titel: 'Verhinderungs- und Kurzzeitpflege 2026',
          betrag: restVK, betragText: fmt(restVK) + ' rechnerisch offen',
          frist: 'Belege zeitnah einreichen; Erstattungsantrag für Ersatzpflege 2026 nach geltendem Recht bis 31.12.2027 (ob der Entwurf daran etwas ändert, ist offen)',
          text: 'Vom gemeinsamen Jahresbetrag für Verhinderungs- und Kurzzeitpflege (3.539 €) sind 2026 rechnerisch noch ' + fmt(restVK) + ' offen. Der Entwurf sieht ab 2027 keine eigene Verhinderungspflege und keinen gemeinsamen Jahresbetrag mehr vor. Wenn Sie 2026 Ersatzpflege planen oder bereits hatten, reichen Sie die Belege zeitnah ein.',
          unsicher: 'Hinweis: Der Jahresbetrag gilt je Kalenderjahr (§ 42a SGB XI). Eine Übertragung ins Folgejahr sieht der Gesetzestext nicht vor.'
        });
      } else {
        bis.push({
          id: 'R2_verhinderung_erledigt', prio: 9, status: 'erledigt',
          jahr: D.jahresbetragVK2026, genutzt: e.verh,
          titel: 'Verhinderungs- und Kurzzeitpflege 2026',
          betrag: 0, betragText: 'nach Ihren Angaben ausgeschöpft',
          frist: '',
          text: 'Nach Ihren Angaben ist der gemeinsame Jahresbetrag 2026 rechnerisch ausgeschöpft.'
        });
      }
    }

    if (e.ersatz2025) {
      add('R3_ersatzpflege_2025');
      bis.push({
        id: 'R3_ersatzpflege_2025', prio: 1, status: 'geltend',
        titel: 'Ersatzpflege aus dem Jahr 2025',
        betrag: null, betragText: '',
        frist: 'Antrag bis 31.12.2026 bei der Pflegekasse',
        text: 'Erstattungsanträge für Ersatzpflege aus dem Jahr 2025 müssen nach geltendem Recht bis zum 31.12.2026 bei der Pflegekasse eingehen.'
      });
    }

    if (antragOffen && (!hatPG || e.verschlechterung)) {
      add('R4_antrag_vor_jahresende');
      bis.push({
        id: 'R4_antrag_vor_jahresende', prio: 1, status: 'entwurf',
        titel: hatPG ? 'Höherstufungsantrag prüfen' : 'Antrag auf Pflegegrad stellen',
        betrag: null, betragText: '',
        frist: 'Eingang bei der Pflegekasse bis 31.12.2026',
        text: 'Wenn der Pflegebedarf tatsächlich besteht, sollten Sie nicht unnötig warten. Der Entwurf sieht vor, dass sich die Feststellung nach dem Recht zum Zeitpunkt der Antragstellung richtet. Ab 2027 sollen die Punkteschwellen für Pflegegrad 1 bis 3 steigen (15 / 30 / 50 statt 12,5 / 27 / 47,5). Ein Antrag, der bis 31.12.2026 bei der Pflegekasse eingeht, würde danach nach den heutigen Schwellen geprüft. Ein formloser Antrag genügt. Das gilt nur, wenn der Entwurf so beschlossen wird.',
        unsicher: 'Offen: Maßgeblich ist vermutlich der Eingang bei der Pflegekasse, nicht das Absendedatum. Das ist im Gesetzestext nicht abschließend geprüft.'
      });
    }

    if (!hatPG && e.antrag_gestellt === 'ja') {
      add('R13_kein_pflegegrad');
      bis.push({
        id: 'R13_kein_pflegegrad', prio: 2, status: 'entwurf',
        titel: 'Ihr Antrag ist gestellt',
        betrag: null, betragText: '',
        frist: 'Eingangsnachweis aufbewahren; Eingang bis 31.12.2026',
        text: 'Ihr Antrag ist gestellt. Nach dem Entwurf richtet sich die Beurteilung nach dem Recht zum Antragsdatum. Bei Antrag bis 31.12.2026 gelten demnach die heutigen Schwellen. Bewahren Sie die Eingangsbestätigung auf. Ab 01.01.2027 ist die Bearbeitungsfrist von 25 Arbeitstagen laut Entwurf bis 30.04.2027 ausgesetzt, außer in besonders dringenden Fällen.'
      });
    }

    if (pg === 1 && zuhause) {
      add('R6_pg1_wegfall');
      bis.push({
        id: 'R6_pg1_wegfall', prio: 1, status: 'entwurf',
        titel: 'Pflegegrad 1: Entlastungsbetrag soll entfallen',
        betrag: D.entlastung2026Jahr, betragText: 'bis zu ' + fmt(D.entlastung2026Jahr) + ' pro Jahr betroffen',
        frist: 'Entlastungsbetrag 2026 möglichst vollständig nutzen',
        text: 'Im Entwurf entfällt der Entlastungsbetrag (131 € monatlich, 1.572 € jährlich) für Pflegegrad 1. Die als Ersatz vorgesehene Pflegebegleitung zu Hause soll nach dem Entwurf erst ab 01.01.2029 gelten. Nutzen Sie den Entlastungsbetrag 2026 daher möglichst vollständig.'
      });
    }

    if (hatPG && zuhause) {
      add('R11_pflegehilfsmittel');
      bis.push({
        id: 'R11_pflegehilfsmittel', prio: 2, status: 'entwurf',
        titel: 'Pflegehilfsmittel zum Verbrauch',
        betrag: D.hilfsmittel2026Monat, betragText: 'bis zu ' + fmt(D.hilfsmittel2026Monat) + ' monatlich',
        frist: 'Anspruch bis Jahresende nutzen',
        text: 'Der eigene Anspruch auf Pflegehilfsmittel zum Verbrauch (bis 42 € monatlich) soll 2027 entfallen und aus dem Budget gezahlt werden. Nutzen Sie den Anspruch bis Jahresende.',
        unsicher: pg === 1 ? 'Offen: Pflegegrad 1 hat im Entwurf kein Entlastungs- oder Sachleistungsbudget. Wie Verbrauchsprodukte dort künftig finanziert werden, ist unklar. Fragen Sie Ihre Pflegekasse.' : ''
      });
    }

    bis.sort(function (a, b) { return a.prio - b.prio; });

    /* --- (b) Vergleich 2026 / 2027 --- */
    function schwelleZeile() {
      var heute = pg ? 'ab ' + fmtPunkte(D.schwelle2026[pg]) + ' Gesamtpunkten' : '';
      var neu = pg ? 'ab ' + fmtPunkte(D.schwelle2027[pg]) + ' Gesamtpunkten' : '';
      var gleich = pg && D.schwelle2026[pg] === D.schwelle2027[pg];
      return {
        id: 'schwelle', leistung: 'Punkteschwelle für Pflegegrad ' + pg + ' bei einer Begutachtung',
        heute: heute, ab2027: gleich ? neu + ' (unverändert)' : neu,
        diff: '', status: 'entwurf',
        hinweis: gleich ? '' : 'Für neue Anträge ab 2027. Ein bestehender Pflegegrad soll allein wegen der neuen Schwellen nicht sinken.'
      };
    }

    if (pg >= 2 && zuhause) {
      var ent = D.entlastungsbudget2027[pg];
      var pgg = D.pflegegeld2026[pg];
      add('R8_geldleistung_2027');
      vergleich.push({
        id: 'R8', leistung: 'Pflegegeld (2027: Entlastungsbudget)',
        heute: fmt(pgg) + ' je Monat', ab2027: fmt(ent) + ' je Monat',
        diff: fmtSigned(ent - pgg) + ' je Monat', status: 'entwurf',
        kurz: { name: 'Pflegegeld', einheit: 'im Monat', heute: fmt(pgg), ab: fmt(ent) },
        hinweis: 'Daraus sollen künftig auch Pflegehilfsmittel zum Verbrauch bezahlt werden. Das Entlastungsbudget ist also nicht vollständig zusätzliches Geld.'
      });
      var sach = D.sachleistungsbudget2027[pg];
      var sach26 = D.sachleistung2026[pg];
      vergleich.push({
        id: 'sach', leistung: 'Pflegesachleistung (2027: Sachleistungsbudget)',
        heute: fmt(sach26) + ' je Monat', ab2027: fmt(sach) + ' je Monat',
        diff: fmtSigned(sach - sach26) + ' je Monat', status: 'entwurf',
        kurz: { name: 'Pflegesachleistung', einheit: 'im Monat', heute: fmt(sach26), ab: fmt(sach) },
        hinweis: 'Die Umwidmung von bis zu 40 % der Sachleistung für Alltagsunterstützung soll entfallen.'
      });
      var sr = e.unter25 ? D.sozialraum2027Unter25 : D.sozialraum2027;
      add('R9_sozialraumbudget');
      vergleich.push({
        id: 'R9', leistung: 'Entlastungsbetrag (2027: Sozialraumbudget)',
        heute: fmt(D.entlastung2026Monat) + ' je Monat', ab2027: fmt(sr) + ' je Monat' + (e.unter25 ? ' (unter 25 Jahren)' : ' (unter 25 Jahren: ' + fmt(D.sozialraum2027Unter25) + ')'),
        diff: fmtSigned(sr - D.entlastung2026Monat) + ' je Monat', status: 'entwurf',
        kurz: { name: 'Entlastungsbetrag', einheit: 'im Monat', heute: fmt(D.entlastung2026Monat), ab: fmt(sr) },
        hinweis: 'Das Sozialraumbudget lässt sich nach dem Entwurf nur monatlich nutzen und nicht ansparen. Erstattung gegen Beleg.'
      });
    }

    if (pg >= 2) {
      add('R10_ueberbrueckungsbudget');
      vergleich.push({
        id: 'R10', leistung: 'Verhinderungs- und Kurzzeitpflege (2027: Überbrückungsbudget)',
        heute: 'bis ' + fmt(D.jahresbetragVK2026) + ' je Kalenderjahr (gemeinsamer Jahresbetrag)',
        ab2027: 'Überbrückungsbudget bis ' + fmt(D.ueberbrueckung2027Jahr) + ' je Kalenderjahr',
        diff: '', status: 'entwurf',
        kurz: { name: 'Verhinderungs- und Kurzzeitpflege', einheit: 'im Jahr', heute: 'bis ' + fmt(D.jahresbetragVK2026), ab: 'bis ' + fmt(D.ueberbrueckung2027Jahr) },
        hinweis: 'Für akute Notsituationen. Verhinderungspflege entfällt als eigene Leistung, der gemeinsame Jahresbetrag ebenfalls. Die beiden Beträge sind nicht eins zu eins vergleichbar, weil geplante Abwesenheit künftig über das Sachleistungs- oder Entlastungsbudget gedeckt werden soll.'
      });
    }

    if (pg === 1 && zuhause) {
      vergleich.push({
        id: 'R6', leistung: 'Entlastungsbetrag',
        heute: fmt(D.entlastung2026Monat) + ' je Monat (' + fmt(D.entlastung2026Jahr) + ' je Jahr)',
        ab2027: 'entfällt',
        diff: fmtSigned(-D.entlastung2026Monat) + ' je Monat', status: 'entwurf',
        kurz: { name: 'Entlastungsbetrag', einheit: 'im Monat', heute: fmt(D.entlastung2026Monat), ab: 'entfällt' },
        hinweis: 'Als Ersatz ist eine Pflegebegleitung zu Hause vorgesehen, die laut Entwurf erst ab 01.01.2029 gelten soll.'
      });
      vergleich.push({
        id: 'begleitung', leistung: 'Pflegebegleitung zu Hause',
        heute: 'nicht vorgesehen', ab2027: 'laut Entwurf erst ab 01.01.2029: Anspruch auf Pflegebegleitung zu Hause (kein Geldbetrag für Sie)',
        diff: '', status: 'entwurf',
        hinweis: 'Die Mittel dafür werden laut Entwurf mit 146 € je pflegebedürftiger Person in häuslicher Pflege regional bereitgestellt. Die Ausgestaltung ist im Einzelnen noch offen.'
      });
    }

    if (hatPG && zuhause) {
      vergleich.push({
        id: 'R11', leistung: 'Pflegehilfsmittel zum Verbrauch',
        heute: 'bis ' + fmt(D.hilfsmittel2026Monat) + ' je Monat (eigener Anspruch)',
        ab2027: 'kein eigener Anspruch mehr, Finanzierung aus dem Budget',
        diff: '', status: pg === 1 ? 'offen' : 'entwurf',
        hinweis: pg === 1 ? 'Für Pflegegrad 1 sind die Details offen.' : ''
      });
    }

    if (pg >= 2 && zuhause) {
      vergleich.push({
        id: 'tages', leistung: 'Tages- und Nachtpflege',
        heute: fmt(D.tages2026[pg]) + ' je Monat', ab2027: 'bleibt zusätzlich nutzbar ohne Anrechnung auf ambulante Leistungen. Betrag 2027 offen.',
        diff: '', status: 'offen', hinweis: ''
      });
    }

    if (hatPG && zuhause) {
      add('R12_wohnumfeld_hausnotruf');
      vergleich.push({
        id: 'R12', leistung: 'Wohnumfeldverbessernde Maßnahmen und Hausnotruf',
        heute: 'bis ' + fmt(D.wohnumfeld2026) + ' je Maßnahme; Hausnotruf in der Regel ' + fmt(D.hausnotruf2026) + ' monatlich',
        ab2027: 'Regelung offen',
        diff: '', status: 'offen',
        hinweis: 'Wie diese Zuschüsse ab 2027 geregelt sind, ließ sich in den geprüften Quellen nicht klären. Der Hausnotruf-Betrag (in der Regel 27 € monatlich bei Vertragsanbietern, netto) gilt für Verträge ab 01.04.2026 laut GKV-Spitzenverband. Welcher Betrag für Sie gilt, sagt Ihre Pflegekasse.'
      });
    }

    if (pg === 1 && heim) {
      add('R7_pg1_heim');
      vergleich.push({
        id: 'R7', leistung: 'Zuschuss bei vollstationärer Pflege (Pflegegrad 1)',
        heute: fmt(D.vollstat2026[1]) + ' je Monat', ab2027: 'entfällt für Neufälle',
        diff: '', status: 'entwurf',
        hinweis: 'Für bisherige Bezieher ist ein Besitzstandsschutz vorgesehen.'
      });
    }

    if (heim && pg >= 2) {
      add('R14_heim_allgemein');
      vergleich.push({
        id: 'R14', leistung: 'Pauschale bei vollstationärer Pflege',
        heute: fmt(D.vollstat2026[pg]) + ' je Monat', ab2027: 'in den geprüften Quellen keine geänderte Pauschale genannt',
        diff: '', status: 'offen',
        hinweis: 'Zu Eigenanteilen und Zuschüssen bei vollstationärer Pflege ab 2027 haben wir keine abgesicherten Angaben. Klären Sie die Details mit der Pflegekasse oder der Pflegeberatung.'
      });
    }

    if (hatPG) {
      vergleich.push(schwelleZeile());
    } else {
      [1, 2, 3].forEach(function (p) {
        vergleich.push({
          id: 'schwelle' + p, leistung: 'Pflegegrad ' + p + ': Punkteschwelle',
          heute: 'ab ' + fmtPunkte(D.schwelle2026[p]) + ' Gesamtpunkten', ab2027: 'ab ' + fmtPunkte(D.schwelle2027[p]) + ' Gesamtpunkten',
          diff: '', status: 'entwurf', hinweis: ''
        });
      });
      vergleich.push({
        id: 'schwelle45', leistung: 'Pflegegrad 4 und 5: Punkteschwelle',
        heute: 'ab 70 beziehungsweise ab 90 Gesamtpunkten', ab2027: 'unverändert',
        diff: '', status: 'entwurf', hinweis: 'Maßgeblich ist laut Entwurf das Recht zum Zeitpunkt der Antragstellung.'
      });
    }

    if (hatPG) {
      add('R5_bestandsschutz');
      hinweise.push('Nach dem Entwurf behalten Sie Ihren Pflegegrad. Allein wegen neuer Schwellen soll er nicht sinken, auch nicht bei einer späteren Begutachtung, solange die Einstufung nach altem Recht fortbestünde. Eine Neubegutachtung allein wegen des Gesetzes ist nicht vorgesehen.');
    }
    if (hatPG && heim) {
      hinweise.push('Bei Heimversorgung gilt der Entlastungsbetrag nur eingeschränkt. Der Rechner zeigt dafür keinen Rest an. Lassen Sie sich von Ihrer Pflegekasse oder der Pflegeberatung beraten.');
    }
    if (!hatPG) {
      hinweise.push('Ohne festgestellten Pflegegrad bestehen die Leistungen dieser Tabelle noch nicht. Die Schwellen zeigen, ab welcher Gesamtpunktzahl bei der Begutachtung ein Pflegegrad festgestellt wird.');
    }

    /* --- (c) Nächste Schritte --- */
    var hatRest = (restEntl && restEntl > 0) || (restVK && restVK > 0) || e.ersatz2025;
    if (hatRest) {
      schritte.push('Sammeln Sie Rechnungen und Belege für 2026 und reichen Sie diese möglichst bis Jahresende bei Ihrer Pflegekasse ein.');
      schritte.push('Fragen Sie bei Ihrer Pflegekasse nach dem aktuellen Stand Ihrer Budgets. Dort sehen Sie, was 2026 bereits abgerechnet ist.');
    }
    if (antragOffen && (!hatPG || e.verschlechterung)) {
      schritte.push('Stellen Sie den Antrag formlos bei Ihrer Pflegekasse und lassen Sie sich den Eingang bestätigen. Weil nicht geklärt ist, ob Eingang oder Absendedatum zählt, ist ein früher Zeitpunkt im Dezember sicherer.');
    }
    if (!hatPG && e.antrag_gestellt === 'ja') {
      schritte.push('Bewahren Sie die Eingangsbestätigung Ihres Antrags auf.');
    }
    if (hatPG && zuhause) {
      schritte.push('Wenn Sie einen Umbau oder einen Hausnotruf planen, klären Sie die Antragstellung mit Ihrer Pflegekasse. Zuschüsse für wohnumfeldverbessernde Maßnahmen (bis 4.180 € je Maßnahme) und für den Hausnotruf (in der Regel 27 € monatlich bei Vertragsanbietern) gelten 2026. Die Regelung ab 2027 ist offen.');
    }
    if (heim && pg >= 2) {
      schritte.push('Klären Sie die Details zur vollstationären Pflege ab 2027 mit Ihrer Pflegekasse oder der Pflegeberatung.');
    }
    schritte.push('Kostenlose Pflegeberatung nach § 7a SGB XI: Sie haben als Versicherte mit Pflegegrad oder bei gestelltem Antrag Anspruch auf individuelle Beratung durch Ihre Pflegekasse. Die Beratung kann auch zu Hause stattfinden. Fragen Sie bei Ihrer Pflegekasse nach einem Termin.');
    schritte.push('Verfolgen Sie das Gesetzgebungsverfahren: Bundesrat 20.11.2026, Anhörung im Gesundheitsausschuss 25.11.2026, 2./3. Lesung im Bundestag 11.12.2026 und Bundesrat 18.12.2026 (die beiden letzten Termine sind geplant und nicht verbindlich).');

    /* --- Empfehlungsbausteine (Anzeige) --- */
    var ads = [];
    if (hatPG && zuhause) {
      ads.push('pflegebox');
      ads.push('hausnotruf');
      if (pg >= 3) { ads.push('24h-pflege'); }
    }

    return {
      ok: true,
      stand: STAND,
      entwurfLabel: ENTWURF,
      kopfzeile: 'Stand 14.11.2026: Das Pflegeneuordnungsgesetz ist noch nicht beschlossen. Bundestag und Bundesrat entscheiden voraussichtlich im Dezember 2026. Die Angaben können sich ändern.',
      beruhigung: hatPG ? 'Wer 2026 einen Pflegegrad hat, soll ihn laut Entwurf allein durch das Gesetz nicht verlieren.' : '',
      restEntlastung: restEntl,
      restVerhinderung: restVK,
      bis: bis,
      vergleich: vergleich,
      hinweise: hinweise,
      schritte: schritte,
      ads: ads,
      regeln: regeln,
      fusszeile: 'Dies ist keine Rechts- oder Sozialberatung. Verbindlich sind das verkündete Gesetz und die Auskunft Ihrer Pflegekasse.'
    };
  }

  /* ---------- Tabelle „Was sich 2027 ändern soll“ (Pflegegrad 2 bis 5) ---------- */
  function tabelle(pg) {
    return [
      { id: 'pflegegeld', name: 'Pflegegeld', note: 'heißt 2027 Entlastungsbudget', einheit: 'im Monat', heute: fmt(D.pflegegeld2026[pg]), ab: fmt(D.entlastungsbudget2027[pg]) },
      { id: 'sach', name: 'Pflegesachleistung', note: 'heißt 2027 Sachleistungsbudget', einheit: 'im Monat', heute: fmt(D.sachleistung2026[pg]), ab: fmt(D.sachleistungsbudget2027[pg]) },
      { id: 'entlastung', name: 'Entlastungsbetrag', note: 'heißt 2027 Sozialraumbudget, unter 25 Jahren: ' + fmt(D.sozialraum2027Unter25), einheit: 'im Monat', heute: fmt(D.entlastung2026Monat), ab: fmt(D.sozialraum2027) },
      { id: 'vk', name: 'Verhinderungs- und Kurzzeitpflege', note: 'wird 2027 zum Überbrückungsbudget', einheit: 'im Jahr', heute: 'bis ' + fmt(D.jahresbetragVK2026), ab: 'bis ' + fmt(D.ueberbrueckung2027Jahr) },
      { id: 'hilfsmittel', name: 'Pflegehilfsmittel', note: 'z. B. Handschuhe, Desinfektion', einheit: 'im Monat', heute: 'bis ' + fmt(D.hilfsmittel2026Monat), ab: 'aus dem Budget', abOhneEinheit: true }
    ];
  }

  /* Sätze eines Textes (ohne Lookbehind, damit auch ältere Browser den Code laden). */
  function saetze(text) {
    return String(text).replace(/\.\s+(?=[A-ZÄÖÜ])/g, '.\u0001').split('\u0001');
  }

  /* ---------- Oberfläche ---------- */
  function initUI(doc) {
    var ns = 'http://www.w3.org/2000/svg';
    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, text) {
      var n = doc.createElement(tag);
      if (cls) { n.className = cls; }
      if (text !== undefined && text !== null) { n.textContent = text; }
      return n;
    }
    var ICONS = {
      links: { vb: 18, d: 'M11 4L6 9l5 5' },
      rechts: { vb: 18, d: 'M7 4l5 5-5 5' },
      runter: { vb: 20, d: 'M5 7.5l5 5 5-5' },
      pfeil: { vb: 16, d: 'M3 8h9M8.5 4.5L12 8l-3.5 3.5' },
      drucken: { vb: 20, d: 'M6 8V3h8v5M6 15H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 12h8v5H6z' }
    };
    function icon(name, cls, size) {
      var ic = ICONS[name];
      var svg = doc.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
      svg.setAttribute('viewBox', '0 0 ' + ic.vb + ' ' + ic.vb);
      svg.setAttribute('width', String(size || ic.vb));
      svg.setAttribute('height', String(size || ic.vb));
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var p = doc.createElementNS(ns, 'path');
      p.setAttribute('d', ic.d);
      svg.appendChild(p);
      return svg;
    }
    function svgFehler() {
      var svg = doc.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'fehler-icon');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var c = doc.createElementNS(ns, 'circle');
      c.setAttribute('cx', '10'); c.setAttribute('cy', '10'); c.setAttribute('r', '8.25');
      var p = doc.createElementNS(ns, 'path');
      p.setAttribute('d', 'M10 5.5v5.5M10 14v.5');
      svg.appendChild(c);
      svg.appendChild(p);
      return svg;
    }

    /* ======== Tabelle mit Pflegegrad-Umschalter ======== */
    function tabellenZeile(z) {
      var tr = el('tr');
      var th = el('th');
      th.scope = 'row';
      th.appendChild(el('span', 't-name', z.name));
      var note = el('span', 't-note');
      note.appendChild(el('span', 't-einheit', z.einheit + ', '));
      note.appendChild(doc.createTextNode(z.note));
      th.appendChild(note);
      tr.appendChild(th);
      var td1 = el('td', 't-heute');
      td1.appendChild(doc.createTextNode(z.heute));
      td1.appendChild(el('span', 'u', ' ' + z.einheit));
      tr.appendChild(td1);
      var td2 = el('td', 't-neu');
      td2.appendChild(icon('pfeil', 't-pfeil'));
      td2.appendChild(doc.createTextNode(z.ab));
      if (!z.abOhneEinheit) { td2.appendChild(el('span', 'u', ' ' + z.einheit)); }
      tr.appendChild(td2);
      return tr;
    }
    function initTabelle() {
      var tab = $('vergleich-tabelle');
      var gruppe = $('pg-umschalter');
      if (!tab || !gruppe) { return; }
      var body = tab.querySelector('tbody');
      var buttons = gruppe.querySelectorAll('button');
      var label = $('tabelle-pg');
      gruppe.hidden = false;
      function setze(pg) {
        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-pg') === String(pg) ? 'true' : 'false');
        });
        body.textContent = '';
        tabelle(pg).forEach(function (z) { body.appendChild(tabellenZeile(z)); });
        if (label) { label.textContent = String(pg); }
      }
      Array.prototype.forEach.call(buttons, function (b) {
        b.addEventListener('click', function () { setze(Number(b.getAttribute('data-pg'))); });
      });
    }
    initTabelle();

    /* ======== Rechner in Schritten ======== */
    var form = $('rechner-form');
    var out = $('ergebnis');
    var sec = $('rechner');
    if (!form || !out || !sec) { return; }
    sec.classList.add('js');

    function radio(name) {
      var e = form.querySelector('input[name="' + name + '"]:checked');
      return e ? e.value : '';
    }

    var SCHRITTE = [
      { id: 's-pflegegrad', felder: ['pflegegrad'] },
      { id: 's-versorgung', felder: ['versorgung'] },
      { id: 's-betraege', felder: ['entlastungsbetrag_2026_genutzt_eur', 'verhinderungs_kurzzeitpflege_2026_genutzt_eur'] },
      { id: 's-antrag', felder: ['antrag_gestellt'] }
    ];

    function gruppenSicht() {
      var pgv = radio('pflegegrad');
      var pgn = /^[1-5]$/.test(pgv) ? Number(pgv) : 0;
      var zuhause = radio('versorgung') === 'zuhause';
      return {
        'g-entlastung': pgn >= 1 && zuhause,
        'g-verhinderung': pgn >= 2 && zuhause,
        'g-ersatz': pgn >= 2,
        'g-unter25': pgn >= 2 && zuhause,
        'g-verschlechterung': pgn >= 1
      };
    }
    function sichtbarkeit() {
      var g = gruppenSicht();
      Object.keys(g).forEach(function (id) {
        var n = $(id);
        if (n) { n.hidden = !g[id]; }
      });
    }
    function schrittGilt(i) {
      if (SCHRITTE[i].id !== 's-betraege') { return true; }
      if (radio('pflegegrad') === '') { return true; }
      var g = gruppenSicht();
      return g['g-entlastung'] || g['g-verhinderung'] || g['g-ersatz'] || g['g-unter25'];
    }
    function gelten() {
      var l = [];
      SCHRITTE.forEach(function (s, i) { if (schrittGilt(i)) { l.push(i); } });
      return l;
    }

    function lies() {
      function sicht(id) { var g = $(id); return g && !g.hidden; }
      return {
        pflegegrad: radio('pflegegrad'),
        versorgung: radio('versorgung'),
        antrag_gestellt: radio('antrag_gestellt'),
        entlastungsbetrag_2026_genutzt_eur: sicht('g-entlastung') ? $('entlastung').value : '',
        verhinderungs_kurzzeitpflege_2026_genutzt_eur: sicht('g-verhinderung') ? $('verhinderung').value : '',
        ersatzpflege_2025_noch_nicht_abgerechnet: sicht('g-ersatz') && $('ersatz2025').checked,
        alter_unter_25: sicht('g-unter25') && $('unter25').checked,
        verschlechterung_erwartet: sicht('g-verschlechterung') && $('verschlechterung').checked
      };
    }

    /* ---- Fehler ---- */
    var feldMap = {
      pflegegrad: ['pg-1', 'err-pflegegrad'],
      versorgung: ['versorgung-zuhause', 'err-versorgung'],
      antrag_gestellt: ['antrag-ja', 'err-antrag'],
      entlastungsbetrag_2026_genutzt_eur: ['entlastung', 'err-entlastung'],
      verhinderungs_kurzzeitpflege_2026_genutzt_eur: ['verhinderung', 'err-verhinderung']
    };
    function setzeText(p, text) {
      var t = p.querySelector('.et');
      (t || p).textContent = text;
    }
    function feldLeeren(k) {
      var m = feldMap[k];
      if (!m) { return; }
      var p = $(m[1]);
      if (p) { p.hidden = true; setzeText(p, ''); }
      var inp = $(m[0]);
      if (inp) { inp.removeAttribute('aria-invalid'); }
      if (k === 'pflegegrad' || k === 'versorgung' || k === 'antrag_gestellt') {
        form.querySelectorAll('input[name="' + k + '"]').forEach(function (r) { r.removeAttribute('aria-invalid'); });
      }
    }
    function fehlerLeeren() { Object.keys(feldMap).forEach(feldLeeren); }
    function feldFehler(k, text) {
      var m = feldMap[k];
      var p = $(m[1]);
      setzeText(p, text);
      p.hidden = false;
      var inp = $(m[0]);
      if (inp) { inp.setAttribute('aria-invalid', 'true'); }
      if (k === 'pflegegrad' || k === 'versorgung' || k === 'antrag_gestellt') {
        form.querySelectorAll('input[name="' + k + '"]').forEach(function (r) { r.setAttribute('aria-invalid', 'true'); });
      }
      return inp;
    }
    /* Prüfung beim Verlassen eines Betragsfeldes; Fehler verschwinden beim Fokussieren und Tippen */
    var betragFelder = {
      entlastung: ['entlastungsbetrag_2026_genutzt_eur', D.entlastung2026Jahr],
      verhinderung: ['verhinderungs_kurzzeitpflege_2026_genutzt_eur', D.jahresbetragVK2026]
    };
    Object.keys(betragFelder).forEach(function (id) {
      var inp = $(id);
      if (!inp) { return; }
      var key = betragFelder[id][0];
      inp.addEventListener('blur', function () {
        var f = {};
        zahl(inp.value, betragFelder[id][1], key, f);
        if (f[key]) { feldFehler(key, f[key]); }
      });
      inp.addEventListener('input', function () { feldLeeren(key); });
    });

    /* Fehler dieses Schrittes anzeigen; true, wenn welche vorliegen */
    function schrittFehler(i) {
      var v = pruefe(lies());
      var erste = null;
      var n = 0;
      SCHRITTE[i].felder.forEach(function (k) {
        if (v.fehler[k]) {
          var inp = feldFehler(k, v.fehler[k]);
          if (!erste) { erste = inp; }
          n++;
        }
      });
      if (erste) { erste.focus(); }
      return n > 0;
    }

    /* ---- Schrittanzeige ---- */
    var fortschrittBox = $('fortschritt');
    var listeBox = $('schritt-liste');
    var btnZurueck = $('btn-zurueck');
    var btnWeiter = $('btn-weiter');
    var weiterText = btnWeiter.querySelector('.b-text');
    var weiterIcon = btnWeiter.querySelector('.ic');
    var aktuell = 0;

    function aktualisiere() {
      sichtbarkeit();
      var gl = gelten();
      var pos = gl.indexOf(aktuell);
      if (pos < 0) { pos = 0; }
      var nr = pos + 1;
      var n = gl.length;
      var kopf = $(SCHRITTE[aktuell].id).querySelector('.frage-nr');
      if (kopf) { kopf.textContent = 'Frage ' + nr + ' von ' + n; }
      fortschrittBox.textContent = '';
      for (var k = 1; k <= n; k++) { fortschrittBox.appendChild(el('span', k <= nr ? 'seg an' : 'seg')); }
      listeBox.textContent = '';
      gl.forEach(function (idx, j) {
        var li = el('li', j === pos ? 'aktiv' : (j < pos ? 'fertig' : ''));
        if (j === pos) { li.setAttribute('aria-current', 'step'); }
        li.appendChild(el('span', 'punkt', String(j + 1)));
        li.appendChild(doc.createTextNode($(SCHRITTE[idx].id).getAttribute('data-label')));
        listeBox.appendChild(li);
      });
      btnZurueck.hidden = pos === 0;
      var letzte = pos === n - 1;
      weiterText.textContent = letzte ? 'Ergebnis anzeigen' : 'Weiter';
      if (weiterIcon) { weiterIcon.setAttribute('class', letzte ? 'ic aus' : 'ic'); }
    }

    function sichtbarMachen(ziel) {
      var r = ziel.getBoundingClientRect();
      var h = doc.defaultView.innerHeight || 700;
      if (r.top < 0 || r.top > h * 0.5) { ziel.scrollIntoView(); }
    }
    function zeige(i, fokus) {
      aktuell = i;
      SCHRITTE.forEach(function (s, idx) { $(s.id).classList.toggle('aktiv', idx === i); });
      aktualisiere();
      if (fokus) {
        var h = $(SCHRITTE[i].id).querySelector('.frage-titel');
        if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
        sichtbarMachen(form);
      }
    }

    function weiter() {
      fehlerLeeren();
      if (schrittFehler(aktuell)) { return; }
      var gl = gelten();
      var pos = gl.indexOf(aktuell);
      if (pos >= 0 && pos < gl.length - 1) { zeige(gl[pos + 1], true); } else { los(); }
    }
    function zurueck() {
      fehlerLeeren();
      var gl = gelten();
      var pos = gl.indexOf(aktuell);
      if (pos > 0) { zeige(gl[pos - 1], true); }
    }

    form.addEventListener('change', function (ev) {
      var n = ev.target && ev.target.name;
      var map = { pflegegrad: 'pflegegrad', versorgung: 'versorgung', antrag_gestellt: 'antrag_gestellt' };
      if (n && map[n]) { feldLeeren(map[n]); }
      aktualisiere();
    });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); weiter(); });
    btnZurueck.addEventListener('click', zurueck);

    /* ======== Ergebnis ======== */
    function statusText(status) {
      var map = {
        geltend: 'Geltendes Recht',
        entwurf: 'Laut Gesetzentwurf (Stand 14.11.2026)',
        offen: 'Noch offen',
        erledigt: 'Nach Ihren Angaben erledigt'
      };
      return map[status] || map.offen;
    }
    function datumHeute() {
      var d = new Date();
      function z(n) { return (n < 10 ? '0' : '') + n; }
      return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear();
    }
    function pgText(pg) {
      if (/^[1-5]$/.test(pg)) { return 'Pflegegrad ' + pg; }
      if (pg === '0') { return 'noch kein Pflegegrad'; }
      return 'Pflegegrad unklar';
    }
    function profil(eing) {
      var t = /^[1-5]$/.test(eing.pflegegrad) ? 'Pflegegrad ' + eing.pflegegrad : (eing.pflegegrad === '0' ? 'Noch kein Pflegegrad' : 'Pflegegrad unklar');
      return t + ', ' + (eing.versorgung === 'heim' ? 'im Pflegeheim' : 'zu Hause');
    }
    var KURZ = {
      R1_entlastung_rest: 'für Hilfe im Alltag',
      R1_entlastung_erledigt: 'für Hilfe im Alltag',
      R2_verhinderung_rest: 'wenn Sie eine Pause brauchen',
      R2_verhinderung_erledigt: 'wenn Sie eine Pause brauchen'
    };

    /* Zeile: Kopf (Name, Unterzeile, Betrag), optional aufklappbar */
    function zeile(name, sub, betrag, inhalt, offen) {
      var wurzel;
      var kopf;
      if (inhalt) {
        wurzel = el('details', 'zeile');
        if (offen) { wurzel.open = true; }
        kopf = el('summary', 'z-kopf');
      } else {
        wurzel = el('div', 'zeile');
        kopf = el('div', 'z-kopf');
      }
      var tx = el('span', 'z-text');
      tx.appendChild(el('strong', null, name));
      if (sub) { tx.appendChild(el('span', 'z-sub', sub)); }
      kopf.appendChild(tx);
      if (betrag) { kopf.appendChild(el('strong', 'z-betrag', betrag)); }
      if (inhalt) { kopf.appendChild(icon('runter', 'chev')); }
      wurzel.appendChild(kopf);
      if (inhalt) { wurzel.appendChild(inhalt); }
      return wurzel;
    }
    function leistungInhalt(it) {
      var box = el('div', 'z-inhalt');
      var ul = el('ul', null);
      saetze(it.text).forEach(function (s) { ul.appendChild(el('li', null, s)); });
      box.appendChild(ul);
      if (it.jahr !== undefined) {
        box.appendChild(el('p', 'z-klein', 'Jahresbetrag ' + fmt(it.jahr) + ', bereits genutzt ' + fmt(it.genutzt) + '.'));
      }
      if (it.unsicher) { box.appendChild(el('p', 'z-klein', it.unsicher)); }
      if (it.frist) {
        var fp = el('p', 'z-klein');
        fp.appendChild(el('strong', null, 'Frist: '));
        fp.appendChild(doc.createTextNode(it.frist));
        box.appendChild(fp);
      }
      box.appendChild(el('p', 'z-klein', statusText(it.status) + '.'));
      return box;
    }
    function abschnitt(titel) {
      var s = el('section', 'erg-abschnitt');
      s.appendChild(el('h3', null, titel));
      return s;
    }

    function anzeigen(ids) {
      var box = el('aside', 'anz-box');
      box.setAttribute('aria-label', 'Anzeige');
      box.appendChild(el('p', 'anz-hinweis', 'Anzeige. Wir erhalten ggf. eine Vergütung, für Sie entstehen keine Mehrkosten.'));
      ids.forEach(function (id) {
        var a = ADS[id];
        if (!a) { return; }
        var row = el('div', 'anz-eintrag');
        row.appendChild(el('p', 'a-titel', a.titel));
        var link = el('a', 'btn btn-sek');
        link.href = a.href;
        link.rel = 'sponsored nofollow noopener';
        link.appendChild(doc.createTextNode(a.cta));
        link.appendChild(el('span', 'sr-only', ' (Anzeige)'));
        row.appendChild(link);
        var det = el('details', 'anz-mehr');
        det.appendChild(el('summary', null, 'Worauf Sie achten sollten'));
        det.appendChild(el('p', null, a.text));
        row.appendChild(det);
        box.appendChild(row);
      });
      return box;
    }

    function vergleichsListe(liste) {
      var ul = el('ul', 'vergleich');
      liste.forEach(function (z) {
        var li = el('li', null);
        li.appendChild(el('h4', 'v-name', z.leistung));
        var sp = el('div', 'v-spalten');
        var c1 = el('p', null);
        c1.appendChild(el('span', 'l', 'Heute'));
        c1.appendChild(doc.createTextNode(z.heute));
        var c2 = el('p', null);
        c2.appendChild(el('span', 'l', 'Ab 2027 (Entwurf)'));
        c2.appendChild(doc.createTextNode(z.ab2027));
        sp.appendChild(c1);
        sp.appendChild(c2);
        li.appendChild(sp);
        if (z.diff) { li.appendChild(el('p', 'l-klein', 'Veränderung: ' + z.diff)); }
        if (z.status === 'offen') { li.appendChild(el('p', 'l-klein', 'Noch offen.')); }
        ul.appendChild(li);
      });
      return ul;
    }

    function schrittZeile(text, nr) {
      var li = el('li', null);
      li.appendChild(el('span', 'nr', String(nr)));
      var tx = el('div', 'nr-text');
      var t = saetze(text);
      tx.appendChild(el('p', null, t[0]));
      if (t.length > 1) {
        var det = el('details', 'mehr-klein');
        det.appendChild(el('summary', null, 'Mehr dazu'));
        det.appendChild(el('p', null, t.slice(1).join(' ')));
        tx.appendChild(det);
      }
      li.appendChild(tx);
      return li;
    }

    function render(r, eing) {
      out.textContent = '';
      var wrap = el('div', 'erg');

      /* Kopfleiste */
      var bar = el('div', 'erg-bar');
      var back = el('button', 'erg-zurueck');
      back.type = 'button';
      back.id = 'angaben-aendern';
      back.appendChild(icon('links'));
      back.appendChild(doc.createTextNode('Angaben ändern'));
      bar.appendChild(back);
      bar.appendChild(el('span', 'erg-profil', profil(eing)));
      wrap.appendChild(bar);

      /* Salbei-Fläche: Satz und Gesamtbetrag */
      var sumJahr = 0, sumRest = 0, hatSumme = false;
      r.bis.forEach(function (it) {
        if (it.jahr !== undefined) { hatSumme = true; sumJahr += it.jahr; sumRest += it.betrag; }
      });
      var flaeche = el('section', 'erg-summe');
      var h2 = el('h2', 'ergebnis-satz');
      h2.id = 'ergebnis-titel';
      h2.tabIndex = -1;
      if (hatSumme && sumRest > 0) {
        h2.appendChild(doc.createTextNode('Bis 31. Dezember können Sie noch'));
        h2.appendChild(el('span', 'betrag', fmt(sumRest)));
        h2.appendChild(doc.createTextNode('abrufen.'));
      } else if (hatSumme) {
        h2.appendChild(doc.createTextNode('Bei diesen Leistungen ist nach Ihren Angaben nichts mehr offen.'));
      } else {
        h2.appendChild(doc.createTextNode('Ihre Übersicht'));
      }
      flaeche.appendChild(h2);
      if (hatSumme && sumRest > 0) {
        flaeche.appendChild(el('p', 'erg-klein', 'Was bis Jahresende nicht genutzt wird, kann verfallen.'));
      }
      wrap.appendChild(flaeche);

      /* Ihr Geld für 2026 / Wichtig bis Jahresende / Jeden Monat zusätzlich */
      var geld = r.bis.filter(function (it) { return it.jahr !== undefined; });
      var wichtig = r.bis.filter(function (it) { return it.jahr === undefined && it.id !== 'R11_pflegehilfsmittel'; });
      var hilfsmittel = r.bis.filter(function (it) { return it.id === 'R11_pflegehilfsmittel'; })[0];
      var hausnotruf = r.regeln.indexOf('R12_wohnumfeld_hausnotruf') >= 0;
      var offenGesetzt = false;
      function offen() { if (offenGesetzt) { return false; } offenGesetzt = true; return true; }

      if (!r.bis.length) {
        wrap.appendChild(el('p', 'erg-leer', 'Aus Ihren Angaben ergeben sich keine betragsbezogenen Fristen zum 31.12.2026. Das ersetzt keine Auskunft Ihrer Pflegekasse.'));
      }
      if (geld.length) {
        var s1 = abschnitt('Ihr Geld für 2026');
        geld.forEach(function (it) {
          var sub = KURZ[it.id] || '';
          if (it.status === 'erledigt') { sub = it.betragText; }
          s1.appendChild(zeile(it.titel.replace(' 2026', ''), sub, fmt(it.betrag), leistungInhalt(it), offen()));
        });
        wrap.appendChild(s1);
      }
      if (wichtig.length) {
        var s2 = abschnitt('Wichtig bis Jahresende');
        wichtig.forEach(function (it) {
          s2.appendChild(zeile(it.titel, it.betragText || it.frist, '', leistungInhalt(it), offen()));
        });
        wrap.appendChild(s2);
      }
      if (hilfsmittel || hausnotruf) {
        var s3 = abschnitt('Jeden Monat zusätzlich');
        if (hilfsmittel) {
          s3.appendChild(zeile('Pflegehilfsmittel', 'Handschuhe, Desinfektion, Bettschutz', 'bis ' + fmt(D.hilfsmittel2026Monat), leistungInhalt(hilfsmittel), false));
        }
        if (hausnotruf) {
          s3.appendChild(zeile('Hausnotruf', 'Zuschuss der Pflegekasse, in der Regel', fmt(D.hausnotruf2026), null, false));
        }
        wrap.appendChild(s3);
      }

      /* Anzeigen */
      if (r.ads.length) { wrap.appendChild(anzeigen(r.ads)); }

      /* Ab 2027 für Sie */
      var s4 = abschnitt('Ab 2027 für Sie');
      s4.appendChild(el('p', 'erg-unter', 'Laut Gesetzentwurf, noch nicht beschlossen.'));
      var sichtbar = r.vergleich.filter(function (z) { return z.kurz; });
      var weitere = r.vergleich.filter(function (z) { return !z.kurz; });
      sichtbar.forEach(function (z) {
        var row = el('div', 'zeile v-zeile');
        var kopf = el('div', 'z-kopf');
        var tx = el('span', 'z-text');
        tx.appendChild(el('strong', null, z.kurz.name));
        tx.appendChild(el('span', 'z-sub', z.kurz.einheit));
        kopf.appendChild(tx);
        var w = el('span', 'z-werte');
        w.appendChild(el('span', 'z-alt', z.kurz.heute));
        w.appendChild(icon('pfeil', 't-pfeil'));
        w.appendChild(el('span', 'sr-only', ' wird zu '));
        w.appendChild(el('strong', 'z-neu', z.kurz.ab));
        kopf.appendChild(w);
        row.appendChild(kopf);
        s4.appendChild(row);
      });
      if (r.beruhigung) { s4.appendChild(el('p', 'erg-beruhigung', r.beruhigung)); }
      var det = el('details', 'mehr');
      if (!sichtbar.length) { det.open = true; }
      var sum = el('summary', null);
      sum.appendChild(el('span', null, 'Weitere Hinweise zu 2027'));
      sum.appendChild(icon('runter', 'chev'));
      det.appendChild(sum);
      var inh = el('div', 'z-inhalt');
      inh.appendChild(el('p', null, r.kopfzeile));
      if (weitere.length) { inh.appendChild(vergleichsListe(weitere)); }
      r.hinweise.forEach(function (h) { inh.appendChild(el('p', null, h)); });
      var dl = el('dl', null);
      r.vergleich.forEach(function (z) {
        if (!z.hinweis) { return; }
        dl.appendChild(el('dt', null, z.leistung));
        dl.appendChild(el('dd', null, z.hinweis));
      });
      if (dl.childNodes.length) { inh.appendChild(dl); }
      det.appendChild(inh);
      s4.appendChild(det);
      wrap.appendChild(s4);

      /* Nächste Schritte */
      var s5 = abschnitt('Ihre nächsten Schritte');
      var ol = el('ol', 'schritte');
      r.schritte.forEach(function (s, i) { ol.appendChild(schrittZeile(s, i + 1)); });
      s5.appendChild(ol);
      wrap.appendChild(s5);

      /* Drucken oder teilen, Hinweis */
      var fuss = el('section', 'erg-fuss');
      var teil = el('button', 'btn-flaeche');
      teil.type = 'button';
      teil.id = 'teilen';
      teil.appendChild(icon('drucken'));
      teil.appendChild(doc.createTextNode('Ergebnis drucken oder teilen'));
      fuss.appendChild(teil);
      var hin = el('p', 'erg-klein');
      hin.appendChild(doc.createTextNode('Berechnet für ' + pgText(eing.pflegegrad) + ', ' + (eing.versorgung === 'heim' ? 'Pflegeheim' : 'häusliche Pflege') + ', am ' + datumHeute() + '. ' + r.fusszeile + ' Kostenlose Pflegeberatung gibt es bei Ihrer Pflegekasse (§ 7a SGB XI). '));
      var q = el('a', null, 'Quellen');
      q.href = '/pflegereform-2027/#quellen';
      hin.appendChild(q);
      fuss.appendChild(hin);
      wrap.appendChild(fuss);

      out.appendChild(wrap);

      back.addEventListener('click', angabenAendern);
      teil.addEventListener('click', function () {
        var grob = doc.defaultView.matchMedia && doc.defaultView.matchMedia('(pointer: coarse)').matches;
        var nav = doc.defaultView.navigator;
        if (grob && nav && nav.share) {
          var text = (hatSumme && sumRest > 0 ? 'Bis 31. Dezember noch ' + fmt(sumRest) + ' abrufbar' : 'Meine Übersicht') + ' (' + profil(eing) + ').';
          nav.share({ title: 'Pflegereform-Rechner', text: text, url: doc.defaultView.location.origin + '/' }).catch(function () {});
        } else {
          doc.defaultView.print();
        }
      });
    }

    function angabenAendern() {
      out.textContent = '';
      sec.classList.remove('ergebnis-modus');
      form.hidden = false;
      zeige(0, true);
      sichtbarMachen(sec);
    }

    function los() {
      fehlerLeeren();
      sichtbarkeit();
      var eing = lies();
      var r = berechne(eing);
      if (!r.ok) {
        for (var i = 0; i < SCHRITTE.length; i++) {
          var hat = SCHRITTE[i].felder.some(function (k) { return r.fehler[k]; });
          if (hat) { zeige(i, false); schrittFehler(i); return; }
        }
        return;
      }
      render(r, eing);
      form.hidden = true;
      sec.classList.add('ergebnis-modus');
      var titel = $('ergebnis-titel');
      var bar = out.querySelector('.erg-bar');
      if (bar && bar.scrollIntoView) { bar.scrollIntoView(); }
      if (titel) { try { titel.focus({ preventScroll: true }); } catch (e) { titel.focus(); } }
    }

    /* Drucken: alle aufklappbaren Bereiche des Ergebnisses öffnen */
    var geschlossen = [];
    doc.defaultView.addEventListener('beforeprint', function () {
      geschlossen = [];
      out.querySelectorAll('details').forEach(function (d) { if (!d.open) { geschlossen.push(d); d.open = true; } });
    });
    doc.defaultView.addEventListener('afterprint', function () {
      geschlossen.forEach(function (d) { d.open = false; });
      geschlossen = [];
    });

    zeige(0, false);
  }


  var api = { berechne: berechne, pruefe: pruefe, fmt: fmt, tabelle: tabelle, saetze: saetze, DATA: D, ADS: ADS, STAND: STAND };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PflegeRechner = api;
    if (root.document) {
      if (root.document.readyState === 'loading') {
        root.document.addEventListener('DOMContentLoaded', function () { initUI(root.document); });
      } else {
        initUI(root.document);
      }
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
