// Client-side photo storage using IndexedDB.
// Lets visitors upload photos from their device; photos are stored
// locally in the browser (per-category) and rendered into the grid.
// No server involved — nothing leaves the browser.

(function () {
  const DB_NAME = "mini-gallery-db";
  const STORE = "photos";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          store.createIndex("category", "category", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function addPhotos(category, files) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    Array.from(files).forEach((file) => {
      store.add({ category, blob: file, name: file.name, ts: Date.now() });
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getPhotos(category) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("category");
    return new Promise((resolve, reject) => {
      const req = idx.getAll(IDBKeyRange.only(category));
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.ts - b.ts));
      req.onerror = () => reject(req.error);
    });
  }

  async function deletePhoto(id) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function render(category, grid, emptyMsg, staticPhotos) {
    grid.innerHTML = "";
    staticPhotos = staticPhotos || [];
    const photos = await getPhotos(category);

    if (photos.length === 0 && staticPhotos.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-state";
      p.textContent = emptyMsg;
      grid.appendChild(p);
      return;
    }

    staticPhotos.forEach((sp) => {
      const wrap = document.createElement("div");
      wrap.className = "photo-card";
      const img = document.createElement("img");
      img.src = sp.src;
      img.alt = sp.alt || "Gallery photo";
      img.loading = "lazy";
      wrap.appendChild(img);
      grid.appendChild(wrap);
    });

    photos.forEach((photo) => {
      const wrap = document.createElement("div");
      wrap.className = "photo-card";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(photo.blob);
      img.alt = photo.name || "Uploaded photo";
      img.loading = "lazy";

      const del = document.createElement("button");
      del.className = "photo-delete";
      del.type = "button";
      del.title = "Remove photo";
      del.textContent = "✕";
      del.addEventListener("click", async () => {
        await deletePhoto(photo.id);
        render(category, grid, emptyMsg);
      });

      wrap.appendChild(img);
      wrap.appendChild(del);
      grid.appendChild(wrap);
    });
  }

  function initUploader(category, grid, emptyMsg, staticPhotos) {
    const input = document.getElementById("photo-input");
    const button = document.getElementById("upload-btn");

    button.addEventListener("click", () => input.click());

    input.addEventListener("change", async (e) => {
      if (!e.target.files.length) return;
      await addPhotos(category, e.target.files);
      input.value = "";
      render(category, grid, emptyMsg, staticPhotos);
    });

    render(category, grid, emptyMsg, staticPhotos);
  }

  async function exportZip(category, statusEl) {
    if (typeof JSZip === "undefined") {
      if (statusEl) statusEl.textContent = "Download tool didn't load — check your internet connection and try again.";
      return;
    }

    const photos = await getPhotos(category);
    if (photos.length === 0) {
      if (statusEl) statusEl.textContent = "No uploaded photos to download yet.";
      return;
    }

    if (statusEl) statusEl.textContent = `Zipping ${photos.length} photo${photos.length === 1 ? "" : "s"}...`;

    const zip = new JSZip();
    photos.forEach((photo, i) => {
      const ext = (photo.name && photo.name.includes(".")) ? photo.name.split(".").pop() : "jpg";
      zip.file(`photo${i + 1}.${ext}`, photo.blob);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${category}-photos.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (statusEl) statusEl.textContent = `Downloaded ${photos.length} photo${photos.length === 1 ? "" : "s"} as ${category}-photos.zip`;
  }

  window.MiniGallery = { initUploader, exportZip };
})();
