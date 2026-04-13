document.addEventListener("DOMContentLoaded", loadPermissions);

document.getElementById("addBtn").addEventListener("click", () => {
  const inputEl = document.getElementById("urlInput");
  let url = inputEl.value.trim();

  if (!url) return;

  if (!url.endsWith("/*")) {
    if (!url.endsWith("/")) url += "/";
    url += "*";
  }

  chrome.permissions.request({ origins: [url] }, (granted) => {
    if (granted) {
      inputEl.value = "";
      loadPermissions(); 
    } else {
      alert(t('permDenied')); // LOKALISIERT
    }
  });
});

function loadPermissions() {
  chrome.permissions.getAll((perms) => {
    const list = document.getElementById("urlList");
    list.innerHTML = "";

    const origins = perms.origins || [];

    if (origins.length === 0) {
      // LOKALISIERT
      list.innerHTML = `<p style="color: #888; font-size: 14px;">${t('noUrls')}</p>`;
      return;
    }

    origins.forEach((orig) => {
      const item = document.createElement("div");
      item.className = "url-item";

      const text = document.createElement("span");
      text.innerText = orig;

      const remBtn = document.createElement("button");
      remBtn.className = "remove-btn";
      remBtn.innerText = t('removeBtn'); // LOKALISIERT
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