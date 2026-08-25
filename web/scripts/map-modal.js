/**
 * Leaflet.js Interactive Map Picker Modal
 */

let mapInstance = null;
let markerInstance = null;
let tempSelectedLocation = {
  latitude: 25.033964,
  longitude: 121.564468,
  name: "地圖選定位置",
};

export function initMapModal(onLocationSelected) {
  const modalEl = document.getElementById("map-modal");
  const closeBtn = document.getElementById("btn-close-map");
  const confirmBtn = document.getElementById("btn-confirm-map");
  const coordDisplay = document.getElementById("map-selected-coord");

  function openMap(initialLat = 25.033964, initialLon = 121.564468) {
    modalEl.classList.add("show");
    tempSelectedLocation.latitude = initialLat;
    tempSelectedLocation.longitude = initialLon;

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
    if (onLocationSelected) {
      onLocationSelected({ ...tempSelectedLocation });
    }
    closeModal();
  });

  return { openMap, closeModal };
}
