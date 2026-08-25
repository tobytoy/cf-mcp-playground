/**
 * Leaflet.js Interactive Map Picker Modal (Supports Origin, Destination, & Custom Favorites)
 */

let mapInstance = null;
let markerInstance = null;
let currentCallback = null;
let tempSelectedLocation = {
  latitude: 25.033964,
  longitude: 121.564468,
  name: "地圖選定位置",
};

export function initMapModal(defaultCallback) {
  const modalEl = document.getElementById("map-modal");
  const modalTitle = document.getElementById("map-modal-title");
  const closeBtn = document.getElementById("btn-close-map");
  const confirmBtn = document.getElementById("btn-confirm-map");
  const coordDisplay = document.getElementById("map-selected-coord");

  function openMap(initialLat = 25.033964, initialLon = 121.564468, title = "🗺️ 點擊地圖選擇位置", customCallback = null) {
    modalEl.classList.add("show");
    if (modalTitle) modalTitle.textContent = title;
    currentCallback = customCallback || defaultCallback;

    tempSelectedLocation.latitude = Number(Number(initialLat).toFixed(6));
    tempSelectedLocation.longitude = Number(Number(initialLon).toFixed(6));

    setTimeout(() => {
      if (!mapInstance && window.L) {
        mapInstance = window.L.map("map-container").setView([initialLat, initialLon], 15);

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapInstance);

        markerInstance = window.L.marker([initialLat, initialLon], {
          draggable: true,
        }).addTo(mapInstance);

        markerInstance.on("dragend", (e) => {
          const pos = e.target.getLatLng();
          updateMarkerPosition(pos.lat, pos.lng);
        });

        mapInstance.on("click", (e) => {
          updateMarkerPosition(e.latlng.lat, e.latlng.lng);
        });
      } else if (mapInstance) {
        mapInstance.invalidateSize();
        mapInstance.setView([initialLat, initialLon], 15);
        if (markerInstance) markerInstance.setLatLng([initialLat, initialLon]);
      }
      updateCoordText();
    }, 200);
  }

  function updateMarkerPosition(lat, lon) {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLon = Number(lon.toFixed(6));
    tempSelectedLocation.latitude = fixedLat;
    tempSelectedLocation.longitude = fixedLon;
    tempSelectedLocation.name = `座標 (${fixedLat}, ${fixedLon})`;
    if (markerInstance) markerInstance.setLatLng([fixedLat, fixedLon]);
    updateCoordText();
  }

  function updateCoordText() {
    if (coordDisplay) {
      coordDisplay.textContent = `緯度: ${tempSelectedLocation.latitude}, 經度: ${tempSelectedLocation.longitude}`;
    }
  }

  function closeModal() {
    modalEl.classList.remove("show");
  }

  closeBtn?.addEventListener("click", closeModal);
  modalEl?.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
  });

  confirmBtn?.addEventListener("click", () => {
    if (currentCallback) {
      currentCallback({ ...tempSelectedLocation });
    }
    closeModal();
  });

  return { openMap, closeModal };
}
