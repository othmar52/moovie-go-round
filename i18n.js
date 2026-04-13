const userLang = navigator.language.startsWith('de') ? 'de' : 'en';

const dict = {
  en: {
    titleWheel: "Movie Selection",
    copyBtnTitle: "Copy to clipboard",
    copyBtn: "📋 Copy",
    statusSearching: "Searching...",
    loadingExtracting: "Extracting movies from tabs...",
    manualInputPlaceholder: "Enter more movies here (one per line)...",
    addManualBtn: "Add",
    maxItemsLbl: "Max. Segments: ",
    durationLbl: "Spin Time (sec): ",
    spinBtn: "HOLD<br/>&<br/>SPIN!",
    focusTabBtn: "🎬 Switch to Movie Tab",
    copyListBtn: "📋 Copy List",
    closeModalBtn: "Close & Spin Again",
    noTabsFound: "No movie tabs found. Add them manually!",
    ready: "Ready.",
    moviesInList: " movies in the list.",
    copied: "✅ Copied!",
    noKnownTab: "No known tab",
    openTab: "Open Tab: ",
    // Options Page
    optionsTitle: "⚙️ Manage Authorized URLs",
    optionsDesc: "Enter the URLs of your streaming services (Plex, Jellyfin, Moovy, etc.) that the wheel is allowed to scan.",
    addBtn: "Add",
    currentUrls: "Currently authorized sites:",
    noUrls: "No URLs authorized yet.",
    removeBtn: "Remove",
    permDenied: "Permission denied or invalid URL."
  },
  de: {
    titleWheel: "Film-Auswahl",
    copyBtnTitle: "In Zwischenablage kopieren",
    copyBtn: "📋 Kopieren",
    statusSearching: "Suche läuft...",
    loadingExtracting: "Filme werden aus Tabs extrahiert...",
    manualInputPlaceholder: "Weitere Filme hier eingeben (eine Zeile pro Film)...",
    addManualBtn: "Hinzufügen",
    maxItemsLbl: "Max. Segmente: ",
    durationLbl: "Drehzeit (Sek.): ",
    spinBtn: "HOLD<br/>&<br/>SPIN!",
    focusTabBtn: "🎬 Zum Film-Tab wechseln",
    copyListBtn: "📋 Liste kopieren",
    closeModalBtn: "Schließen & Neu drehen",
    noTabsFound: "Keine Film-Tabs gefunden. Füge sie manuell hinzu!",
    ready: "Bereit.",
    moviesInList: " Filme in der Liste.",
    copied: "✅ Kopiert",
    noKnownTab: "Kein Tab bekannt",
    // Options Page
    openTab: "Tab öffnen: ",
    optionsTitle: "⚙️ Berechtigte URLs verwalten",
    optionsDesc: "Trage hier die URLs deiner Streaming-Dienste (Plex, Jellyfin, Moovy, etc.) ein, die vom Glücksrad gescannt werden dürfen.",
    addBtn: "Hinzufügen",
    currentUrls: "Aktuell berechtigte Seiten:",
    noUrls: "Noch keine URLs berechtigt.",
    removeBtn: "Entfernen",
    permDenied: "Berechtigung wurde abgelehnt oder die URL ist ungültig."
  }
};

// Hilfsfunktion zum schnellen Abrufen eines Textes
function t(key) {
  return dict[userLang][key] || dict['en'][key] || key;
}

// Ersetzt alle Texte im HTML
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.placeholder) el.placeholder = t(key);
      if (el.type === 'button') el.value = t(key);
    } else {
      el.innerHTML = t(key);
    }
  });
  
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
});