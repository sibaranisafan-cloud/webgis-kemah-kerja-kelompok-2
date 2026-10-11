// =========================================================
// 1. INISIALISASI PETA
// =========================================================
const map = L.map('map', {
    zoomSnap: 0.1,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 120
}).setView([-5.57473, 105.21770], 14);
window.map = map;

// =========================================================
// KONTROL SKALA RASIO — INSTAN (TANPA LOOP)
// =========================================================
const SkalaRasio = L.Control.extend({
    options: { position: 'bottomright' },

    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-control-scale-rasio');
        container.innerHTML = `
            <span class="scale-label">Skala</span>
            <span class="scale-display" title="Klik untuk ubah skala">1 : —</span>
            <input type="number" class="scale-input" style="display:none;" min="100" step="100" />
        `;
        this._container = container;
        this._map = map;

        const display = container.querySelector('.scale-display');
        const input = container.querySelector('.scale-input');

        display.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentScale = this._getCurrentScale();
            input.value = currentScale;
            display.style.display = 'none';
            input.style.display = 'inline-block';
            input.focus();
            input.select();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._setScale(parseInt(input.value));
                this._closeInput();
            }
            if (e.key === 'Escape') {
                this._closeInput();
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => this._closeInput(), 100);
        });

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        map.on('zoomend moveend', this._update, this);
        setTimeout(() => this._update(), 100);

        return container;
    },

    _closeInput: function() {
        const display = this._container.querySelector('.scale-display');
        const input = this._container.querySelector('.scale-input');
        input.style.display = 'none';
        display.style.display = 'inline';
    },

    _getCurrentScale: function() {
        const zoom = this._map.getZoom();
        const lat = this._map.getCenter().lat;
        const pxPerCm = 96 / 2.54;
        const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
        const scale = Math.round(metersPerPixel * pxPerCm * 100);
        return scale;
    },

    _setScale: function(targetScale) {
        if (!targetScale || targetScale < 50) return;

        const lat = this._map.getCenter().lat;
        const pxPerCm = 96 / 2.54;

        const metersPerPixel = (targetScale / 100) / pxPerCm;
        const zoomFloat = Math.log2(
            156543.03392 * Math.cos(lat * Math.PI / 180) / metersPerPixel
        );

        const targetZoom = parseFloat(zoomFloat.toFixed(2));

        this._map.flyTo(this._map.getCenter(), targetZoom, {
            duration: 0.6,
            easeLinearity: 0.5
        });
    },

    _update: function() {
        if (!this._map) return;
        const scale = this._getCurrentScale();
        this._container.querySelector('.scale-display').innerText =
            '1 : ' + scale.toLocaleString('id-ID');
    },

    onRemove: function(map) {
        map.off('zoomend moveend', this._update, this);
    }
});
map.addControl(new SkalaRasio());

// Base maps
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

const esriSatellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri' }
);

const baseMaps = {
    "OpenStreetMap": osm,
    "Satelit Esri": esriSatellite
};

// =========================================================
// 2. KONTROL LAYER
// =========================================================
L.control.layers(baseMaps, {}, {
    collapsed: false,
    position: 'topright'
}).addTo(map);

// Geocoder
L.Control.geocoder({ defaultMarkGeocode: false })
    .on('markgeocode', function (e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
            bbox.getSouthEast(),
            bbox.getNorthEast(),
            bbox.getNorthWest(),
            bbox.getSouthWest()
        ]);
        map.fitBounds(poly.getBounds());
    }).addTo(map);

// Koordinat realtime
map.on('mousemove', function (e) {
    const box = document.getElementById('coordinate-box');
    if (box) {
        box.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Lat: ${e.latlng.lat.toFixed(5)} | Lng: ${e.latlng.lng.toFixed(5)}`;
    }
});

// =========================================================
// 3. STYLE IDW (berdasarkan atribut VALUE 1-9)
// =========================================================
function getColor(value) {
    const val = Number(value);
    switch (val) {
        case 1: return '#238B00';
        case 2: return '#4FBF00';
        case 3: return '#8FD400';
        case 4: return '#C7E600';
        case 5: return '#FFE000';
        case 6: return '#FFB000';
        case 7: return '#FF7900';
        case 8: return '#F03B00';
        case 9: return '#D7191C';
        default: return '#cccccc';
    }
}

function getHargaByValue(value) {
    const harga = {
        1: 'Rp 99.729,64844 - Rp 228.255,0556 /m²',
        2: 'Rp 228.255,0557 - Rp 295.311,7898 /m²',
        3: 'Rp 295.311,7899 - Rp 356.780,4628 /m²',
        4: 'Rp 356.780,4629 - Rp 412.661,0747 /m²',
        5: 'Rp 412.661,0748 - Rp 490.893,9312 /m²',
        6: 'Rp 490.893,9313 - Rp 608.243,2161 /m²',
        7: 'Rp 608.243,2162 - Rp 775.885,0515 /m²',
        8: 'Rp 775.885,0516 - Rp 1.038.523,927 /m²',
        9: 'Rp 1.038.523,928 - Rp 1.524.685,25 /m²'
    };
    return harga[Number(value)] || '-';
}

function styleIDW(feature) {
    const value = (feature.properties || {}).VALUE;
    return {
        fillColor: getColor(value),
        weight: 0.3,
        opacity: 1,
        color: '#ffffff',
        fillOpacity: 1
    };
}

function highlightFeature(e) {
    const layer = e.target;
    if (typeof layer.setStyle === 'function') {
        layer.setStyle({ weight: 1.5, color: '#666666', fillOpacity: 0.9 });
    }
}

function resetHighlightIDW(e) {
    if (geojsonIDW) geojsonIDW.resetStyle(e.target);
}

function onEachIDW(feature, layer) {
    const props = feature.properties || {};
    const value = props.VALUE !== undefined ? Number(props.VALUE) : '-';
    const harga = getHargaByValue(value);

    layer.bindTooltip(`VALUE: ${value}`, { sticky: true, direction: 'top' });

    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightIDW,
        click: function () {
            const infoDiv = document.getElementById('info-content');
            if (infoDiv) {
                infoDiv.innerHTML = `
                    <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:8px;">
                        <div><strong>Value:</strong> ${value}</div>
                        <div><strong>Klasifikasi:</strong> Kelas ${value}</div>
                        <div>
                            <strong>Harga Tanah:</strong><br>
                            <span style="font-weight:600; color:#d84315;">${harga}</span>
                        </div>
                    </div>
                `;
            }
        }
    });
}

// =========================================================
// 4. STYLE ZONA_NEW
// =========================================================
function getColorZonaNew(znt) {
    if (!znt) return '#ffffff';
    const code = String(znt).toUpperCase().trim();

    if (code.includes('2053')) return '#990000';
    if (code.includes('2052')) return '#ff2a00';
    if (code.includes('429'))  return '#ffff00';
    if (code.includes('1975')) return '#ffaa00';
    if (code.includes('1974')) return '#fbc97f';
    if (code.includes('1970') || code.includes('1971')) return '#c5f500';
    if (code.includes('1844') || code.includes('1944') || code.includes('184')) return '#ffc0cb';
    if (code.includes('971') || code.includes('98') || code.includes('89') || code.includes('97')) return '#38a800';

    return '#ffffff';
}

function styleZonaNew(feature) {
    const props = feature.properties || {};
    return {
        fillColor: getColorZonaNew(JSON.stringify(props)),
        weight: 1,
        opacity: 1,
        color: '#555555',
        fillOpacity: 0.85
    };
}

function onEachZonaNew(feature, layer) {
    const props = feature.properties || {};

    const idZona  = props.Id !== undefined ? props.Id : '-';
    const kodeZona = props.Zona || props.ZNT || props.ZONA || '-';

    const kodeStr = String(kodeZona).toUpperCase();
    let kategori = '-';
    let warnaKategori = '#94A3B8';

    if (kodeStr.includes('2053'))      { kategori = 'Sangat Tinggi'; warnaKategori = '#990000'; }
    else if (kodeStr.includes('2052')) { kategori = 'Tinggi';        warnaKategori = '#ff2a00'; }
    else if (kodeStr.includes('429'))  { kategori = 'Sedang-Tinggi'; warnaKategori = '#ffff00'; }
    else if (kodeStr.includes('1975')) { kategori = 'Sedang';        warnaKategori = '#ffaa00'; }
    else if (kodeStr.includes('1974')) { kategori = 'Sedang';        warnaKategori = '#fbc97f'; }
    else if (kodeStr.includes('1971') || kodeStr.includes('1970')) { kategori = 'Rendah'; warnaKategori = '#c5f500'; }
    else if (kodeStr.includes('1944')) { kategori = 'Rendah';        warnaKategori = '#ffc0cb'; }
    else if (kodeStr.includes('89') || kodeStr.includes('98')) { kategori = 'Sangat Rendah'; warnaKategori = '#38a800'; }
    else if (kodeStr.includes('97'))   { kategori = 'Sangat Rendah'; warnaKategori = '#38a800'; }

    layer.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px; line-height: 1.6;">
            <div style="font-weight: 700; color: #D4AF37; font-size: 0.85rem; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-draw-polygon"></i> Detail Zona
            </div>
            <div style="font-size: 0.78rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #94A3B8;">ID Zona</span>
                    <strong style="color: #F0F2F5;">${idZona}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #94A3B8;">Kode Zona</span>
                    <strong style="color: #D4AF37;">${kodeZona}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94A3B8;">Kategori</span>
                    <strong style="color: ${warnaKategori};">${kategori}</strong>
                </div>
            </div>
        </div>
    `);
}

// =========================================================
// 5. VARIABEL LAYER
// =========================================================
let geojsonIDW   = null;
let geojsonZona  = null;
let geojsonTitik = null;
let geojsonJalan = null;
// =========================================================
// 6. TOGGLE LAYER VIA CHECKBOX
// =========================================================
window.toggleWebGISLayer = function (layerName, checked) {

    let targetLayer = null;

    if (layerName === 'Inverse Distance Weighting (IDW)') {
        targetLayer = geojsonIDW;
    }
    else if (layerName === 'zona') {
        targetLayer = geojsonZona;
    }
    else if (layerName === 'titik') {
        targetLayer = geojsonTitik;
    }
        else if (layerName === 'jalan') {
        targetLayer = geojsonJalan;
    }

    if (!targetLayer) {
        console.warn('Layer belum tersedia:', layerName);
        return;
    }

    if (checked) {
        if (!map.hasLayer(targetLayer)) map.addLayer(targetLayer);
        if (layerName === 'titik' && typeof targetLayer.bringToFront === 'function') {
            targetLayer.bringToFront();
        }
    } else {
        if (map.hasLayer(targetLayer)) map.removeLayer(targetLayer);
    }
    updateLegend();
};

// =========================================================
// 7. LOAD GEOJSON (IDW + ZONA_NEW + TITIK)
// =========================================================
Promise.all([
    fetch('assets/Data kemker/idwasli.geojson').then(r => {
        if (!r.ok) throw new Error('idwasli.geojson gagal dimuat');
        return r.json();
    }),
    fetch('assets/Data kemker/ZONA_NEW.geojson').then(r => {
        if (!r.ok) throw new Error('ZONA_NEW.geojson gagal dimuat');
        return r.json();
    }),
    fetch('assets/Data kemker/Titik_Survei.geojson').then(r => {
        if (!r.ok) throw new Error('Titik_Survei.geojson gagal dimuat');
        return r.json();
    }),
    fetch('assets/Data kemker/Jalan.geojson').then(r => {
        if (!r.ok) throw new Error('Jalan.geojson gagal dimuat');
        return r.json();
    })
])
.then(([dataIDW, dataZona, dataTitik, dataJalan]) => {

    // --- Layer IDW ---
    geojsonIDW = L.geoJSON(dataIDW, {
        style: styleIDW,
        onEachFeature: onEachIDW
    });

    // --- Layer ZONA_NEW ---
    geojsonZona = L.geoJSON(dataZona, {
        style: styleZonaNew,
        onEachFeature: onEachZonaNew
    });

    // --- Layer TITIK SURVEI (NOMOR OTOMATIS + AUTO-DETECT ZONA) ---
    let nomorUrutTitik = 1;

    geojsonTitik = L.geoJSON(dataTitik, {
        onEachFeature: function (feature, layer) {
            const props = feature.properties || {};
            const nilaiTanah = props.NilaiTanah || 0;

            // Fungsi cari zona berdasarkan posisi titik
function cariZona(latlngTitik) {
    let kodeZona = "Tidak ada zona";
    let zonaDitemukan = false;

    if (!geojsonZona) return kodeZona;

    // Buat titik GeoJSON dari koordinat
    const titikGeoJSON = turf.point([latlngTitik.lng, latlngTitik.lat]);

    geojsonZona.eachLayer(function (polygonLayer) {
        if (zonaDitemukan) return;

        if (polygonLayer.feature && polygonLayer.feature.geometry) {
            // Cek apakah titik benar-benar di dalam polygon
            const isInside = turf.booleanPointInPolygon(titikGeoJSON, polygonLayer.feature);
            
            if (isInside) {
                const p = polygonLayer.feature.properties;
                kodeZona = p.Zona || p.ZNT || p.ZONA || p.Id || "Zona tidak diketahui";
                zonaDitemukan = true;
            }
        }
    });

    return kodeZona;
}

            const latlng = layer.getLatLng();
            const kodeZona = cariZona(latlng);

            // Susun konten popup
            const kontenPopup = `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.8rem; line-height: 1.6; min-width: 180px;">
                    <div style="font-weight: 700; color: #D4AF37; font-size: 0.85rem; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 6px;">
                        <i class="fa-solid fa-location-dot"></i> Detail Titik Survei
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span style="color:#94A3B8;">Nomor</span>
                            <strong style="color:#F0F2F5;">${nomorUrutTitik}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span style="color:#94A3B8;">Zona</span>
                            <strong style="color:#D4AF37;">${kodeZona}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:#94A3B8;">Nilai Tanah</span>
                            <strong style="color:#F0F2F5;">${nilaiTanah}</strong>
                        </div>
                    </div>
                </div>
            `;

            layer.bindPopup(kontenPopup);
            nomorUrutTitik++;
        }
    });
    // --- Layer JALAN ---
    geojsonJalan = L.geoJSON(dataJalan, {
        style: {
            color: '#000000',
            weight: 3,
            opacity: 0.85
        },
        onEachFeature: function (feature, layer) {
            const props = feature.properties || {};
            const nama = props.NAMAOBJ || 'Jalan tanpa nama';
            const jenis = props.JENIS || '-';
            const desa = props.DESA || '-';

            layer.bindPopup(`
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.78rem; line-height: 1.6;">
                    <div style="font-weight: 700; color: #D4AF37; font-size: 0.82rem; margin-bottom: 6px; border-bottom: 1px solid #333; padding-bottom: 4px;">
                        <i class="fa-solid fa-road"></i> Informasi Jalan
                    </div>
                    <div><strong>Nama:</strong> ${nama}</div>
                    <div><strong>Jenis:</strong> ${jenis}</div>
                    <div><strong>Desa:</strong> ${desa}</div>
                </div>
            `);
        }
    });
    // --- Tampilkan sesuai default checkbox HTML ---
    geojsonIDW.addTo(map);
    geojsonJalan.addTo(map);
    geojsonTitik.addTo(map);

    // Zoom ke IDW
    if (geojsonIDW.getBounds().isValid()) {
        map.fitBounds(geojsonIDW.getBounds());
    }

    // Update legenda setelah layer siap
    updateLegend();

})
.catch(err => console.error('Gagal memuat GeoJSON:', err));

// =========================================================
// 8. LEAFLET GEOMAN (Pengukuran)
// =========================================================
map.pm.addControls({
    position: 'topleft',
    drawMarker: false,
    drawCircleMarker: false,
    drawPolyline: true,
    drawRectangle: false,
    drawPolygon: true,
    drawCircle: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    removalMode: true
});

map.pm.setLang('id');

function calculateDistance(latlngs) {
    let total = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        total += latlngs[i].distanceTo(latlngs[i + 1]);
    }
    return total;
}

function calculateArea(latlngs) {
    const coords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    const radius = 6378137;
    let area = 0;
    if (coords.length < 3) return 0;
    for (let i = 0; i < coords.length; i++) {
        const p1 = coords[i];
        const p2 = coords[(i + 1) % coords.length];
        const rad1 = p1.lat * Math.PI / 180;
        const rad2 = p2.lat * Math.PI / 180;
        const dLng = (p2.lng - p1.lng) * Math.PI / 180;
        area += dLng * (2 + Math.sin(rad1) + Math.sin(rad2));
    }
    return Math.abs(area * radius * radius / 2);
}

map.on('pm:create', function (e) {
    const layer = e.layer;
    const shape = e.shape;

    drawnItems.addLayer(layer);

    if (shape === 'Line' || shape === 'Polyline') {
        const latlngs = layer.getLatLngs();
        const distance = calculateDistance(latlngs);
        const text = distance >= 1000
            ? (distance / 1000).toFixed(2) + ' km'
            : Math.round(distance) + ' m';
        layer.bindPopup(`<b>Panjang Garis:</b><br><span style="color:#d84315; font-weight:bold;">${text}</span>`).openPopup();
    } else if (shape === 'Polygon') {
        const latlngs = layer.getLatLngs();
        const area = calculateArea(latlngs);
        const text = area >= 10000
            ? (area / 10000).toFixed(2) + ' Ha (' + Math.round(area).toLocaleString('id-ID') + ' m²)'
            : Math.round(area).toLocaleString('id-ID') + ' m²';
        layer.bindPopup(`<b>Luas Area:</b><br><span style="color:#43a047; font-weight:bold;">${text}</span>`).openPopup();
    }
});

// =========================================================
// 9. SCROLL HANDLER
// =========================================================
const scrollContainer = document.getElementById('main-scroll-container');
if (scrollContainer) {
    scrollContainer.addEventListener('scroll', () => {
        if (window.map) window.map.invalidateSize();
    });
}

// =========================================================
// 10. MODAL PROFIL
// =========================================================
function openProfileModal(imgSrc, name, nim, role) {
    document.getElementById('modalImg').src = imgSrc;
    document.getElementById('modalName').innerText = name;
    document.getElementById('modalNim').innerText = 'NIM: ' + nim;
    document.getElementById('modalRole').innerText = role;
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

window.onclick = function (event) {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) closeProfileModal();
};

// =========================================================
// 11. FEATURE GROUP UNTUK HASIL DIGITASI GEOMAN
// =========================================================
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// =========================================================
// 12. EKSPOR HASIL DIGITASI (GeoJSON & KML)
// =========================================================
function exportGeoJSON() {
    var data = drawnItems.toGeoJSON();
    if (data.features.length === 0) {
        alert("Belum ada objek yang digambar/didigitasi!");
        return;
    }
    var str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    var a = document.createElement('a');
    a.setAttribute("href", str);
    a.setAttribute("download", "hasil_digitasi.geojson");
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function exportKML() {
    var data = drawnItems.toGeoJSON();

    if (!data.features || data.features.length === 0) {
        alert("Belum ada objek yang digambar/didigitasi!\n\nGambar polygon/garis dulu di peta.");
        return;
    }

    var kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    kml += '<Document>\n';
    kml += '<name>Hasil Digitasi WebGIS ZNT</name>\n';
    kml += '<description>Hasil digitasi dari WebGIS Zona Nilai Tanah Desa Sidodadi</description>\n';

    kml += '<Style id="polyStyle">\n';
    kml += '  <LineStyle><color>ff00a5ff</color><width>2</width></LineStyle>\n';
    kml += '  <PolyStyle><color>7f00a5ff</color></PolyStyle>\n';
    kml += '</Style>\n';

    data.features.forEach(function(feature, index) {
        var geom = feature.geometry;
        if (!geom) return;

        kml += '<Placemark>\n';
        kml += '  <name>Objek ' + (index + 1) + '</name>\n';
        kml += '  <styleUrl>#polyStyle</styleUrl>\n';

        if (geom.type === 'Point') {
            kml += '  <Point><coordinates>' +
                geom.coordinates[0] + ',' + geom.coordinates[1] + ',0' +
                '</coordinates></Point>\n';
        }
        else if (geom.type === 'LineString') {
            kml += '  <LineString><coordinates>';
            geom.coordinates.forEach(function(coord) {
                kml += coord[0] + ',' + coord[1] + ',0 ';
            });
            kml += '</coordinates></LineString>\n';
        }
        else if (geom.type === 'Polygon') {
            kml += '  <Polygon><outerBoundaryIs><LinearRing><coordinates>';
            geom.coordinates[0].forEach(function(coord) {
                kml += coord[0] + ',' + coord[1] + ',0 ';
            });
            kml += '</coordinates></LinearRing></outerBoundaryIs></Polygon>\n';
        }
        else if (geom.type === 'MultiPolygon') {
            kml += '  <MultiGeometry>\n';
            geom.coordinates.forEach(function(polygon) {
                kml += '    <Polygon><outerBoundaryIs><LinearRing><coordinates>';
                polygon[0].forEach(function(coord) {
                    kml += coord[0] + ',' + coord[1] + ',0 ';
                });
                kml += '</coordinates></LinearRing></outerBoundaryIs></Polygon>\n';
            });
            kml += '  </MultiGeometry>\n';
        }

        kml += '</Placemark>\n';
    });

    kml += '</Document>\n';
    kml += '</kml>';

    var blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = 'hasil_digitasi.kml';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    console.log('KML exported:', data.features.length, 'fitur');
}

// =========================================================
// ALAT BANTU PETA
// =========================================================
let posisiAwal = null;
let zoomAwal = null;

map.whenReady(function() {
    posisiAwal = map.getCenter();
    zoomAwal = map.getZoom();
});

// ========================
// 1. ZOOM SEMUA BIDANG
// ========================
function zoomSemuaBidang() {
    const layers = [];

    if (geojsonIDW && map.hasLayer(geojsonIDW)) layers.push(geojsonIDW);
    if (geojsonZona && map.hasLayer(geojsonZona)) layers.push(geojsonZona);
    if (geojsonTitik && map.hasLayer(geojsonTitik)) layers.push(geojsonTitik);
    if (typeof drawnItems !== 'undefined' && drawnItems.getLayers().length > 0) {
        layers.push(drawnItems);
    }

    if (layers.length === 0) {
        alert('Tidak ada layer yang aktif untuk di-zoom.');
        return;
    }

    let bounds = null;
    layers.forEach(function(layer) {
        try {
            const b = layer.getBounds();
            if (b && b.isValid()) {
                bounds = bounds ? bounds.extend(b) : b;
            }
        } catch (e) {}
    });

    if (bounds) {
        map.fitBounds(bounds, { padding: [40, 40] });
    } else {
        alert('Layer tidak memiliki koordinat yang valid.');
    }
}

// ========================
// 2. TAMPILAN AWAL
// ========================
function tampilanAwal() {
    if (posisiAwal && zoomAwal) {
        map.setView(posisiAwal, zoomAwal);
    } else {
        map.setView([-5.57473, 105.21770], 14);
    }
}

// ========================
// 3. LAYAR PENUH
// ========================
function layarPenuh() {
    const elem = document.documentElement;
    const btn = event.target.closest('.tool-btn');

    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-compress"></i> <span>Keluar Layar Penuh</span>';
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-maximize"></i> <span>Layar Penuh</span>';
        }
    }
}

document.addEventListener('fullscreenchange', function() {
    const btn = document.querySelector('.tool-btn i.fa-compress')?.closest('.tool-btn');
    if (!document.fullscreenElement && btn) {
        btn.innerHTML = '<i class="fa-solid fa-maximize"></i> <span>Layar Penuh</span>';
    }
});

// =========================================================
// LACAK LOKASI REAL-TIME
// =========================================================
let watchId = null;
let userMarker = null;
let accuracyCircle = null;
let isTracking = false;

function toggleLacakLokasi() {
    if (isTracking) {
        stopLacakLokasi();
    } else {
        startLacakLokasi();
    }
}

function startLacakLokasi() {
    if (!navigator.geolocation) {
        alert('Browser Anda tidak mendukung fitur lokasi (GPS).');
        return;
    }

    const btn = document.getElementById('btn-lacak-lokasi');
    const label = document.getElementById('label-lacak');

    if (label) label.innerText = 'Mencari sinyal GPS...';
    if (btn) btn.style.opacity = '0.7';

    watchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            const speed = position.coords.speed;
            const heading = position.coords.heading;

            isTracking = true;

            if (btn) btn.classList.add('tracking');
            if (label) label.innerText = 'Hentikan Pelacakan';

            if (userMarker) map.removeLayer(userMarker);
            if (accuracyCircle) map.removeLayer(accuracyCircle);

            userMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-location-marker',
                    html: `
                        <div class="user-marker-pulse">
                            <div class="user-marker-dot"></div>
                        </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                }),
                zIndexOffset: 1000
            }).addTo(map);

            accuracyCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#D4AF37',
                fillColor: '#D4AF37',
                fillOpacity: 0.12,
                weight: 1,
                opacity: 0.5
            }).addTo(map);

            let popupContent = `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 180px;">
                    <div style="font-weight: 700; color: #D4AF37; margin-bottom: 6px; font-size: 0.82rem;">
                        📍 Lokasi Anda
                    </div>
                    <div style="font-size: 0.72rem; line-height: 1.6;">
                        <div><b>Lat:</b> ${lat.toFixed(6)}</div>
                        <div><b>Lng:</b> ${lng.toFixed(6)}</div>
                        <div><b>Akurasi:</b> ±${Math.round(accuracy)} m</div>
                        ${speed ? `<div><b>Kecepatan:</b> ${(speed * 3.6).toFixed(1)} km/j</div>` : ''}
                        ${heading ? `<div><b>Arah:</b> ${Math.round(heading)}°</div>` : ''}
                    </div>
                </div>
            `;
            userMarker.bindPopup(popupContent);

            if (!window._firstFixDone) {
                map.setView([lat, lng], 17);
                window._firstFixDone = true;
            }

            const coordBox = document.getElementById('coordinate-box');
            if (coordBox) {
                coordBox.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Lat: ${lat.toFixed(5)} | Lng: ${lng.toFixed(5)}`;
            }
        },
        function(error) {
            const label = document.getElementById('label-lacak');
            const btn = document.getElementById('btn-lacak-lokasi');

            let pesan = 'Gagal melacak lokasi.';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    pesan = 'Akses lokasi ditolak. Izinkan akses lokasi di browser Anda.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    pesan = 'Sinyal GPS tidak tersedia. Pastikan Anda berada di area terbuka.';
                    break;
                case error.TIMEOUT:
                    pesan = 'Waktu pelacakan habis. Coba lagi.';
                    break;
            }
            alert(pesan);

            if (label) label.innerText = 'Lacak Lokasi Saya';
            if (btn) btn.classList.remove('tracking');
            isTracking = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
        }
    );
}

function stopLacakLokasi() {
    const btn = document.getElementById('btn-lacak-lokasi');
    const label = document.getElementById('label-lacak');

    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
        accuracyCircle = null;
    }

    isTracking = false;
    window._firstFixDone = false;

    if (btn) btn.classList.remove('tracking');
    if (label) label.innerText = 'Lacak Lokasi Saya';

    console.log('Pelacakan lokasi dihentikan.');
}

// =========================================================
// PANEL LEGENDA OTOMATIS
// =========================================================
function toggleLegendPanel() {
    const panel = document.getElementById('legend-panel');
    if (panel) {
        panel.classList.toggle('collapsed');
    }
}

function updateLegend() {
    const body = document.getElementById('legend-body');
    if (!body) return;

    const idwAktif   = geojsonIDW   && map.hasLayer(geojsonIDW);
    const zonaAktif  = geojsonZona  && map.hasLayer(geojsonZona);
    const titikAktif = geojsonTitik && map.hasLayer(geojsonTitik);
    const jalanAktif = geojsonJalan && map.hasLayer(geojsonJalan);

    // VALIDASI: IDW + Zona = konflik warna
    if (idwAktif && zonaAktif) {
        body.innerHTML = `
            <div class="legend-warning">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <strong>Konflik Layer</strong>
                <p>IDW dan Zona Nilai Tanah tidak bisa ditampilkan bersamaan karena keduanya menggunakan warna. Matikan salah satu untuk melihat legenda.</p>
            </div>
        `;
        return;
    }

    let html = '';

    // LEGENDA IDW
    if (idwAktif) {
        html += `
            <div class="legend-section">
                <div class="legend-section-title">
                    <i class="fa-solid fa-fire"></i> Klasifikasi IDW
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #238B00;"></span>
                    <span class="legend-label">Kelas 1</span>
                    <span class="legend-value">Sangat Rendah</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #4FBF00;"></span>
                    <span class="legend-label">Kelas 2</span>
                    <span class="legend-value">Sangat Rendah</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #8FD400;"></span>
                    <span class="legend-label">Kelas 3</span>
                    <span class="legend-value">Rendah</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #C7E600;"></span>
                    <span class="legend-label">Kelas 4</span>
                    <span class="legend-value">Rendah</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #FFE000;"></span>
                    <span class="legend-label">Kelas 5</span>
                    <span class="legend-value">Sedang</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #FFB000;"></span>
                    <span class="legend-label">Kelas 6</span>
                    <span class="legend-value">Sedang</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #FF7900;"></span>
                    <span class="legend-label">Kelas 7</span>
                    <span class="legend-value">Tinggi</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #F03B00;"></span>
                    <span class="legend-label">Kelas 8</span>
                    <span class="legend-value">Tinggi</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #D7191C;"></span>
                    <span class="legend-label">Kelas 9</span>
                    <span class="legend-value">Sangat Tinggi</span>
                </div>
            </div>
        `;
    }

    // LEGENDA ZONA
    if (zonaAktif) {
        html += `
            <div class="legend-section">
                <div class="legend-section-title">
                    <i class="fa-solid fa-draw-polygon"></i> Zona Nilai Tanah
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #990000;"></span>
                    <span class="legend-label">Zona 2053</span>
                    <span class="legend-value">Sangat Tinggi</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #ff2a00;"></span>
                    <span class="legend-label">Zona 2052</span>
                    <span class="legend-value">Tinggi</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #ffff00;"></span>
                    <span class="legend-label">Zona 429</span>
                    <span class="legend-value">Sedang</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #ffaa00;"></span>
                    <span class="legend-label">Zona 1975</span>
                    <span class="legend-value">Sedang</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #fbc97f;"></span>
                    <span class="legend-label">Zona 1974</span>
                    <span class="legend-value">Sedang</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #c5f500;"></span>
                    <span class="legend-label">Zona 1970/1971</span>
                    <span class="legend-value">Rendah</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #ffc0cb;"></span>
                    <span class="legend-label">Zona 1944</span>
                    <span class="legend-value">Rendah</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #38a800;"></span>
                    <span class="legend-label">Zona 89/97/98</span>
                    <span class="legend-value">Sangat Rendah</span>
                </div>
            </div>
        `;
    }

    // LEGENDA TITIK SURVEI
    if (titikAktif) {
        html += `
            <div class="legend-section">
                <div class="legend-section-title">
                    <i class="fa-solid fa-location-dot"></i> Titik Survei
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #3388ff; border-radius: 50%;"></span>
                    <span class="legend-label">Titik Pengukuran Lapangan</span>
                </div>
            </div>
        `;
    }
        // LEGENDA JALAN
    if (jalanAktif) {
        html += `
            <div class="legend-section">
                <div class="legend-section-title">
                    <i class="fa-solid fa-road"></i> Jalan
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #000000; height: 3px; border-radius: 2px; align-self: center;"></span>
                    <span class="legend-label">Jalan Utama</span>
                </div>
            </div>
        `;
    }

    // TIDAK ADA LAYER AKTIF
    if (html === '') {
        html = `
            <div class="legend-empty">
                <i class="fa-solid fa-eye-slash"></i>
                Tidak ada layer aktif.<br>
                Aktifkan layer di panel kiri.
            </div>
        `;
    }

    body.innerHTML = html;
}

// Update legenda setelah DOM siap
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateLegend, 1500);
});// =========================================================
// GRAFIK PERBANDINGAN HARGA TANAH (ATR/BPN vs IDW)
// =========================================================
const DATA_PERBANDINGAN = [
    { zona: 'Zona 98',   atrbpn: 200000,  idw: 258159.414695 },
    { zona: 'Zona 89',   atrbpn: 1000000, idw: 278208.424218 },
    { zona: 'Zona 1975', atrbpn: 100000,  idw: 238565.087633 },
    { zona: 'Zona 1974', atrbpn: 100000,  idw: 213712.025922 },
    { zona: 'Zona 1944', atrbpn: 100000,  idw: 215313.720285 },
    { zona: 'Zona 1971', atrbpn: 100000,  idw: 704889.146984 },
    { zona: 'Zona 1970', atrbpn: 500000,  idw: 373412.611641 },
    { zona: 'Zona 97',   atrbpn: 100000,  idw: 409710.816630 },
    { zona: 'Zona 2052', atrbpn: 100000,  idw: 396891.035609 },
    { zona: 'Zona 429',  atrbpn: 100000,  idw: 316038.155433 },
    { zona: 'Zona 2053', atrbpn: 100000,  idw: 261754.011873 }
];


// =========================================================
// FUNGSI GRAFIK PERBANDINGAN HARGA
// =========================================================
let grafikInstance = null;

function cetakGrafik() {
    const modal = document.getElementById('grafikModal');
    if (!modal) {
        alert('Modal grafik tidak ditemukan. Cek map.html.');
        return;
    }
    modal.classList.add('active');
    setTimeout(() => { renderGrafik(); }, 100);
}

function closeGrafik() {
    const modal = document.getElementById('grafikModal');
    modal.classList.remove('active');
    if (grafikInstance) {
        grafikInstance.destroy();
        grafikInstance = null;
    }
}

function renderGrafik() {
    const canvas = document.getElementById('grafikPerbandingan');
    if (!canvas) return;

    if (grafikInstance) {
        grafikInstance.destroy();
        grafikInstance = null;
    }

    const ctx = canvas.getContext('2d');
    const labels = DATA_PERBANDINGAN.map(d => d.zona);
    const dataAtrBpn = DATA_PERBANDINGAN.map(d => d.atrbpn);
    const dataIdw    = DATA_PERBANDINGAN.map(d => d.idw);
    const dataSelisih = DATA_PERBANDINGAN.map(d => Math.abs(d.atrbpn - d.idw));
    const formatRupiah = (val) => 'Rp ' + Math.round(val).toLocaleString('id-ID');

    grafikInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Harga ATR/BPN',
                    data: dataAtrBpn,
                    backgroundColor: '#4472C4',
                    borderColor: '#2E5496',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Harga Berdasarkan IDW',
                    data: dataIdw,
                    backgroundColor: '#ED7D31',
                    borderColor: '#C55A11',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Selisih',
                    data: dataSelisih,
                    backgroundColor: '#A5A5A5',
                    borderColor: '#7F7F7F',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1000, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20, 23, 26, 0.95)',
                    titleColor: '#D4AF37',
                    bodyColor: '#F0F2F5',
                    borderColor: 'rgba(212, 175, 55, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + formatRupiah(ctx.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#A0A8B4',
                        font: { size: 11 },
                        callback: function(v) {
                            if (v >= 1000000) return 'Rp ' + (v / 1000000).toFixed(1) + ' Jt';
                            if (v >= 1000) return 'Rp ' + (v / 1000).toFixed(0) + ' Rb';
                            return 'Rp ' + v;
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.06)' }
                },
                x: {
                    ticks: { color: '#A0A8B4', font: { size: 10 }, maxRotation: 45, minRotation: 30 },
                    grid: { display: false }
                }
            }
        }
    });
}

// =========================================================
// MODAL RINGKASAN HARGA
// =========================================================
function openStatModal() {
    const modal = document.getElementById('statModal');
    if (!modal) {
        alert('Modal statistik tidak ditemukan. Cek map.html.');
        return;
    }
    modal.classList.add('active');
    renderStatistik();
}

function closeStatModal() {
    const modal = document.getElementById('statModal');
    if (modal) modal.classList.remove('active');
}

// Format Rupiah singkat (1 juta, 705 ribu, dst.)
function formatRupiahShort(val) {
    if (val >= 1000000) {
        const jt = val / 1000000;
        if (jt % 1 === 0) return 'Rp ' + jt.toFixed(0) + ' juta';
        return 'Rp ' + jt.toFixed(1).replace('.', ',') + ' juta';
    } else if (val >= 1000) {
        const rb = val / 1000;
        if (rb % 1 === 0) return 'Rp ' + rb.toFixed(0) + ' ribu';
        return 'Rp ' + Math.round(rb) + ' ribu';
    }
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

// Hitung statistik dari DATA_PERBANDINGAN
function hitungStatistik() {
    if (!DATA_PERBANDINGAN || DATA_PERBANDINGAN.length === 0) return null;

    const totalZona = DATA_PERBANDINGAN.length;
    const maxATR = Math.max(...DATA_PERBANDINGAN.map(d => d.atrbpn));
    const maxIDW = Math.max(...DATA_PERBANDINGAN.map(d => d.idw));
    const avgATR = DATA_PERBANDINGAN.reduce((s, d) => s + d.atrbpn, 0) / totalZona;
    const avgIDW = DATA_PERBANDINGAN.reduce((s, d) => s + d.idw, 0) / totalZona;
    const avgDiff = DATA_PERBANDINGAN.reduce((s, d) => s + Math.abs(d.atrbpn - d.idw), 0) / totalZona;

    return { totalZona, maxATR, maxIDW, avgATR, avgIDW, avgDiff };
}

// Render isi modal statistik
function renderStatistik() {
    const container = document.getElementById('stat-list');
    if (!container) return;

    const stats = hitungStatistik();
    if (!stats) {
        container.innerHTML = '<div class="stat-loading">Data statistik belum tersedia.</div>';
        return;
    }

    container.innerHTML = `
        <div class="stat-row stat-total">
            <div class="stat-label"><i class="fa-solid fa-layer-group"></i><span>Total Zona</span></div>
            <div class="stat-value">${stats.totalZona}</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-row stat-high">
            <div class="stat-label"><i class="fa-solid fa-arrow-up"></i><span>Tertinggi ATR/BPN</span></div>
            <div class="stat-value">${formatRupiahShort(stats.maxATR)}</div>
        </div>
        <div class="stat-row stat-high-idw">
            <div class="stat-label"><i class="fa-solid fa-arrow-up"></i><span>Tertinggi IDW</span></div>
            <div class="stat-value">${formatRupiahShort(stats.maxIDW)}</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-row">
            <div class="stat-label"><i class="fa-solid fa-chart-simple"></i><span>Rata-rata ATR/BPN</span></div>
            <div class="stat-value">${formatRupiahShort(stats.avgATR)}</div>
        </div>
        <div class="stat-row">
            <div class="stat-label"><i class="fa-solid fa-chart-simple"></i><span>Rata-rata IDW</span></div>
            <div class="stat-value">${formatRupiahShort(stats.avgIDW)}</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-row stat-diff">
            <div class="stat-label"><i class="fa-solid fa-not-equal"></i><span>Selisih Rata-rata</span></div>
            <div class="stat-value">${formatRupiahShort(stats.avgDiff)}</div>
        </div>
    `;
}

// =========================================================
// SIDEBAR TOGGLE — Collapsible Bergulir
// =========================================================
function toggleSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) {
        console.warn('Sidebar tidak ditemukan');
        return;
    }

    sidebar.classList.toggle('collapsed');

    // Resize peta biar otomatis menyesuaikan lebar baru
    setTimeout(() => {
        if (window.map) window.map.invalidateSize();
    }, 450);
}