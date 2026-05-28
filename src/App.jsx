import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, Marker, Popup, WMSTileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import proj4 from 'proj4';
import Header from './Header';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import datosGeoRaw from './adaja.json';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const submenuStyles = `
  .leaflet-control-layers-overlays label:has(input + span:contains("↳")) {
    margin-left: 20px;
    font-size: 0.9em;
    color: #555;
    border-left: 1px dashed #ccc;
    padding-left: 10px;
  }
`;

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const iconoLluvia = L.divIcon({
  html: '<span style="font-size: 30px; line-height: 1;">🌧️</span>',
  className: '',
  iconSize: [60, 60],
  iconAnchor: [30, 30]
});

const UTM30N = "+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

function App() {
  const [datosCorregidos, setDatosCorregidos] = useState(null);
  const [mostrarSubmenu, setMostrarSubmenu] = useState(false);
  const [datosRioReal, setDatosRioReal] = useState(null);
  const [historicoReal, setHistoricoReal] = useState([]);
  const [cargandoReal, setCargandoReal] = useState(true);
  const [mostrarGrafica, setMostrarGrafica] = useState(false);
  const [pluviometros, setPluviometros] = useState([]);

  const position = [40.62435, -4.7300];

  // 1. Transformar coordenadas UTM del JSON local
  useEffect(() => {
    if (datosGeoRaw && datosGeoRaw.features) {
      try {
        const tempGeo = JSON.parse(JSON.stringify(datosGeoRaw));
        tempGeo.features.forEach(feature => {
          if (feature.geometry.type === "Polygon") {
            feature.geometry.coordinates = feature.geometry.coordinates.map(ring =>
              ring.map(coord => proj4(UTM30N, WGS84, coord))
            );
          } else if (feature.geometry.type === "MultiPolygon") {
            feature.geometry.coordinates = feature.geometry.coordinates.map(poly =>
              poly.map(ring => ring.map(coord => proj4(UTM30N, WGS84, coord)))
            );
          }
        });
        setDatosCorregidos(tempGeo);
      } catch (error) {
        console.error("Error transformando coordenadas:", error);
      }
    }
  }, []);

  // 2. Datos del río
  useEffect(() => {
    const timestampAntiCache = new Date().getTime();

    fetch(`http://localhost:8080/api/rios?v=${timestampAntiCache}`)
      .then(response => response.json())
      .then(dataActual => {
        if (dataActual && dataActual.length > 0) {
          setDatosRioReal(dataActual[dataActual.length - 1]);
        } else {
          setDatosRioReal({
            nombreRio: "Río Adaja (Estación EA046)",
            caudal: 0.0,
            fecha: "Sin registros",
            hora: "--:--"
          });
        }
      })
      .catch(error => console.error("Error cargando caudal actual:", error));

    fetch(`http://localhost:8080/api/rios/historico?v=${timestampAntiCache}`)
      .then(response => response.json())
      .then(dataHistorico => {
        if (dataHistorico && dataHistorico.length > 0) {
          setHistoricoReal(dataHistorico);
        }
        setCargandoReal(false);
      })
      .catch(error => {
        console.error("Error cargando el histórico:", error);
        setCargandoReal(false);
      });
  }, []);

  // 3. 🎯 Datos de pluviómetros: Duero + Ávila + Muñotello
  useEffect(() => {
    fetch(`http://localhost:8080/api/pluviometros`)
      .then(res => res.json())
      .then(data => {

        // Listado autorizado: Curso del Duero + Localidades solicitadas de Ávila
        const localidadesPermitidas = ['duero', 'duruelo', 'covaleda', 'salduero', 'soria', 'almazán', 'almazan', 'san esteban', 'gormaz', 'aranda', 'roa', 'peñafiel', 'tudela', 'laguna', 'tordesillas', 'castronuño', 'toro', 'zamora', 'villalcampo', 'castro', 'aldeadávila', 'aldeadavila', 'saucelle', 'avila', 'ávila', 'muñotello', 'munotello', 'candeleda', 'hervás', 'hervas', 'madrigal', 'madrigal de la vera', 'vicolozano', 'Berrocalejo de Aragona', 'Tolbaños', 'Mingorría', 'San Esteban de los Patos', 'Velayos', 'Santo Tomé de Zabarcos', 'Sanchidrián', 'Blascosancho', 'Pajares de Adaja', 'Gutiérrez-Muñoz', 'Adanero', 'Mamblas', 'Arévalo', 'Villatoro', 'Poveda', 'Amavida', 'Pradosegar', 'Narros del Puerto', 'La Torre', 'Muñogalindo', 'Santa María del Arroyo', 'Padiernos', 'Solosancho', 'Sotalbo', 'Niharra', 'El Fresno', 'Gemuño'
        ];

        const pluviometrosFiltrados = data.filter(p => {
          const nombreAislado = p.nombre ? p.nombre.toLowerCase() : '';

          // Valida si el nombre del pluviómetro contiene alguna de las palabras clave
          return localidadesPermitidas.some(localidad => nombreAislado.includes(localidad));
        });

        setPluviometros(pluviometrosFiltrados);
      })
      .catch(err => console.error("Error pluviómetros:", err));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: "100vh", width: "100%" }}>
      <style>{submenuStyles}</style>

      <Header />

      <div style={{ flex: 1 }}>
        <MapContainer center={position} zoom={10} minZoom={9} maxZoom={11} style={{ height: "100%", width: "100%" }}>
          <LayersControl position="topleft">

            <LayersControl.BaseLayer checked name="🗺️ Mapa Callejero">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="🛰️ Vista Satelital">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay name={mostrarSubmenu ? "📂 RIESGOS DE INUNDACIÓN" : "📁 RIESGOS DE INUNDACIÓN"}>
              <FolderTrigger onToggle={setMostrarSubmenu} />
            </LayersControl.Overlay>

            {mostrarSubmenu && (
              <>
                <LayersControl.Overlay name="&nbsp;&nbsp;&nbsp;🌊  ZONA INUNDABLE T=10 AÑOS (Alta)">
                  <WMSTileLayer
                    url="https://servicios.idee.es/wms-inspire/riesgos-naturales/inundaciones"
                    layers="NZ.Flood.FluvialT10"
                    format="image/png"
                    transparent={true}
                    version="1.1.1"
                  />
                </LayersControl.Overlay>

                <LayersControl.Overlay checked name="&nbsp;&nbsp;&nbsp;🌊  ZONA INUNDABLE T=100 AÑOS (Media)">
                  <WMSTileLayer
                    url="https://servicios.idee.es/wms-inspire/riesgos-naturales/inundaciones"
                    layers="NZ.Flood.FluvialT100"
                    format="image/png"
                    transparent={true}
                    version="1.1.1"
                  />
                </LayersControl.Overlay>

                <LayersControl.Overlay name="&nbsp;&nbsp;&nbsp;🌊  ZONA INUNDABLE T=500 AÑOS (Baja)">
                  <WMSTileLayer
                    url="https://servicios.idee.es/wms-inspire/riesgos-naturales/inundaciones"
                    layers="NZ.Flood.FluvialT500"
                    format="image/png"
                    transparent={true}
                    version="1.1.1"
                  />
                </LayersControl.Overlay>
              </>
            )}

          </LayersControl>

          {/* --- MARCADOR RÍO ADAJA --- */}
          <Marker position={position}>
            <Popup
              minWidth={350}
              maxWidth={350}
              eventHandlers={{ remove: () => setMostrarGrafica(false) }}
            >
              <div style={{ fontFamily: "sans-serif", padding: "2px", width: "100%" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50", borderBottom: "1px solid #ddd", paddingBottom: "4px", fontSize: "16px" }}>
                  ℹ️ Estación Telemetría: Río Adaja
                </h3>

                {cargandoReal ? (
                  <p style={{ margin: 0, fontSize: "12px", color: "#7f8c8d" }}>Consultando datos en Supabase...</p>
                ) : datosRioReal ? (
                  <div>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Ubicación:</strong> <span style={{ color: "#555" }}>{datosRioReal.nombreRio || datosRioReal.nombre_rio}</span>
                    </p>
                    <p style={{ margin: "6px 0 12px 0", fontSize: "14px" }}>
                      <strong>Caudal en Tiempo Real:</strong> <span style={{ color: "#2980b9", fontWeight: "bold", background: "#e8f4fd", padding: "3px 8px", borderRadius: "4px" }}>{typeof datosRioReal.caudal === 'number' ? datosRioReal.caudal.toFixed(2) : datosRioReal.caudal} m³/s</span>
                    </p>

                    {!mostrarGrafica ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMostrarGrafica(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "#2980b9",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontWeight: "bold",
                          fontSize: "12px",
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                        }}
                      >
                        📊 Ver gráfica últimas 24h
                      </button>
                    ) : (
                      historicoReal.length > 0 ? (
                        <GraficaPopup
                          datos={historicoReal}
                          alOcultar={(e) => {
                            if (e) e.stopPropagation();
                            setMostrarGrafica(false);
                          }}
                        />
                      ) : (
                        <p style={{ margin: "10px 0", fontSize: "12px", color: "#eab308", fontStyle: "italic" }}>Esperando acumular datos en el búfer...</p>
                      )
                    )}

                    <p style={{ margin: "10px 0 0 0", fontSize: "10px", color: "#94a3b8", textAlign: "right" }}>
                      📅 Actualizado: {datosRioReal.fecha} a las {datosRioReal.hora}
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "12px", color: "#c0392b" }}>⚠️ Servidor API fuera de línea</p>
                )}
              </div>
            </Popup>
          </Marker>

          {/* --- CAPA GeoJSON --- */}
          {datosCorregidos && (
            <GeoJSON
              data={datosCorregidos}
              style={{ color: 'red', weight: 1, fillColor: 'red', fillOpacity: 0.2 }}
            />
          )}

          {/* --- MARCADORES PLUVIÓMETROS --- */}
          {pluviometros.map(p => (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={iconoLluvia}>
              <Popup>
                <div style={{ fontFamily: "sans-serif" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#2c3e50", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
                    🌧️ {p.nombre}
                  </h3>
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>Precipitación:</strong>{" "}
                    <span style={{ color: "#2980b9", fontWeight: "bold", background: "#e8f4fd", padding: "3px 8px", borderRadius: "4px" }}>
                      {typeof p.precipitacion === 'number' ? p.precipitacion.toFixed(1) : p.precipitacion} mm
                    </span>
                  </p>
                  <p style={{ margin: "10px 0 0 0", fontSize: "10px", color: "#94a3b8", textAlign: "right" }}>
                    📅 {p.fecha}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </div>
    </div>
  );
}

function GraficaPopup({ datos, alOcultar }) {
  return (
    <div style={{ width: '100%', height: '150px', marginTop: '10px', background: '#fdfdfd', padding: '8px 4px 4px 4px', borderRadius: '6px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: "6px", paddingLeft: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", flex: 1 }}>Evolución últimas 24 horas:</span>
        <span
          onClick={alOcultar}
          style={{ fontSize: "10px", color: "#ef4444", cursor: "pointer", textDecoration: "underline", paddingRight: "6px" }}
        >
          Ocultar
        </span>
      </div>
      <div style={{ width: '100%', height: '115px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 5, right: 15, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="hora" tick={{ fontSize: 9, fill: '#94a3b8' }} stroke="#cbd5e1" tickFormatter={(value) => {
              if (typeof value === 'string' && value.includes(':')) {
                return `${value.split(':')[0]}h`;
              }
              return value;
            }} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              formatter={(value) => [`${value} m³/s`, 'Caudal']}
              labelFormatter={(label) => `Hora: ${label}`}
            />
            <Line type="monotone" dataKey="caudal" stroke="#2980b9" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FolderTrigger({ onToggle }) {
  useEffect(() => {
    onToggle(true);
    return () => onToggle(false);
  }, [onToggle]);
  return null;
}

export default App;