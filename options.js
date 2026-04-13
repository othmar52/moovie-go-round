document.addEventListener("DOMContentLoaded", loadPermissions);

document.getElementById("addBtn").addEventListener("click", () => {
  const inputEl = document.getElementById("urlInput");
  let url = inputEl.value.trim();

  if (!url) return;

  // Formatiert die URL so, dass Unterseiten erlaubt sind (Das '/*' am Ende)
  if (!url.endsWith("/*")) {
    if (!url.endsWith("/")) url += "/";
    url += "*";
  }

  // Fordert die Berechtigung vom Browser an (Das öffnet in Chrome ein kleines Pop-up für den Nutzer)
  chrome.permissions.request({ origins: [url] }, (granted) => {
    if (granted) {
      inputEl.value = "";
      loadPermissions(); // Liste neu laden
    } else {
      alert("Berechtigung wurde abgelehnt oder die URL ist ungültig.");
    }
  });
});

function loadPermissions() {
  chrome.permissions.getAll((perms) => {
    const list = document.getElementById("urlList");
    list.innerHTML = "";

    // Die Berechtigungen enthalten auch Standard-URLs, wir wollen nur die vom Nutzer hinzugefügten
    const origins = perms.origins || [];

    if (origins.length === 0) {
      list.innerHTML =
        '<p style="color: #888; font-size: 14px;">Noch keine URLs berechtigt.</p>';
      return;
    }

    origins.forEach((orig) => {
      const item = document.createElement("div");
      item.className = "url-item";

      const text = document.createElement("span");
      text.innerText = orig;

      const remBtn = document.createElement("button");
      remBtn.className = "remove-btn";
      remBtn.innerText = "Entfernen";
      remBtn.onclick = () => {
        chrome.permissions.remove({ origins: [orig] }, (removed) => {
          if (removed) loadPermissions();
        });
      };

      item.appendChild(text);
      item.appendChild(remBtn);
      list.appendChild(item);
    });
  });
}
