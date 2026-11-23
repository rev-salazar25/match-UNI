const CLAVE_BD_UNIMATCH_V3 = "unimatch_fiis_uni_limpio_v3";

function crearEstadoVacio() {
  return {
    sesionActivaId: null,
    cuentas: [], // Empieza en 0: solo existirán las cuentas que se registren
    relacionesPorUsuario: {}, // { [userId]: { matchesIds: [], descartadosIds: [], chatActivoId: null, conversaciones: {} } }
    sesiones: [] // Empieza en 0 sesiones
  };
}

function cargarEstado() {
  const raw = localStorage.getItem(CLAVE_BD_UNIMATCH_V3);
  if (!raw) {
    const inicial = crearEstadoVacio();
    guardarEstado(inicial);
    return inicial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo BD:", e);
    return crearEstadoVacio();
  }
}

function guardarEstado(estado) {
  localStorage.setItem(CLAVE_BD_UNIMATCH_V3, JSON.stringify(estado));
}

function crearNuevaCuentaDesdeCero(estado, datosCuenta) {
  const nuevaCuenta = {
    id: Date.now(),
    nombre: datosCuenta.nombre.trim(),
    procedencia: datosCuenta.procedencia.trim().toUpperCase(),
    carrera: datosCuenta.carrera,
    ciclo: datosCuenta.ciclo.trim(),
    contacto: datosCuenta.contacto.trim(),
    bio: datosCuenta.bio.trim(),
    categoria: datosCuenta.categoria || "Estudio",
    cursosDomina: [],
    cursosNecesita: [],
    disponibilidad: []
  };

  estado.cuentas.push(nuevaCuenta);
  estado.relacionesPorUsuario[nuevaCuenta.id] = {
    matchesIds: [],
    descartadosIds: [],
    chatActivoId: null,
    conversaciones: {}
  };
  estado.sesionActivaId = nuevaCuenta.id;
  guardarEstado(estado);
  return nuevaCuenta;
}
