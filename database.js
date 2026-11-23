const SUPABASE_URL = "https://hsyzrspzybiicxeykvor.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uQkp_Tt3Dtvl-HaB2hLIFw_CoXAWrE2";
const CLAVE_SESION_LOCAL = "unimatch_fiis_sesion_id_v1";

function headersSupabase() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Prefer: "return=representation"
  };
}

function crearEstadoVacio() {
  return {
    sesionActivaId: null,
    cuentas: [],
    relacionesPorUsuario: {},
    sesiones: []
  };
}

function mapearCuentaDesdeBD(fila) {
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    procedencia: fila.procedencia,
    carrera: fila.carrera,
    ciclo: fila.ciclo,
    contacto: fila.contacto,
    password: fila.password,
    bio: fila.bio || "",
    categoria: fila.categoria || "Estudio",
    cursosDomina: Array.isArray(fila.cursos_domina) ? fila.cursos_domina : [],
    cursosNecesita: Array.isArray(fila.cursos_necesita) ? fila.cursos_necesita : [],
    disponibilidad: Array.isArray(fila.disponibilidad) ? fila.disponibilidad : []
  };
}

function mapearCuentaHaciaBD(cuenta) {
  return {
    id: Number(cuenta.id),
    nombre: cuenta.nombre,
    procedencia: cuenta.procedencia,
    carrera: cuenta.carrera,
    ciclo: cuenta.ciclo,
    contacto: cuenta.contacto,
    password: cuenta.password,
    bio: cuenta.bio || "",
    categoria: cuenta.categoria || "Estudio",
    cursos_domina: cuenta.cursosDomina || [],
    cursos_necesita: cuenta.cursosNecesita || [],
    disponibilidad: cuenta.disponibilidad || []
  };
}

async function cargarEstadoRemoto() {
  const sesionGuardada = localStorage.getItem(CLAVE_SESION_LOCAL);
  const estado = crearEstadoVacio();
  estado.sesionActivaId = sesionGuardada ? Number(sesionGuardada) : null;

  try {
    const [resCuentas, resRelaciones, resSesiones] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/cuentas?select=*&order=creado_en.asc`, {
        headers: headersSupabase()
      }),
      fetch(`${SUPABASE_URL}/rest/v1/relaciones?select=*`, {
        headers: headersSupabase()
      }),
      fetch(`${SUPABASE_URL}/rest/v1/sesiones?select=*&order=id.desc`, {
        headers: headersSupabase()
      })
    ]);

    if (resCuentas.ok) {
      const filasCuentas = await resCuentas.json();
      estado.cuentas = filasCuentas.map(mapearCuentaDesdeBD);
    } else {
      console.error("Error leyendo cuentas:", resCuentas.status, await resCuentas.text());
    }

    if (resRelaciones.ok) {
      const filasRel = await resRelaciones.json();
      filasRel.forEach((r) => {
        estado.relacionesPorUsuario[Number(r.usuario_id)] = {
          matchesIds: Array.isArray(r.matches_ids) ? r.matches_ids.map(Number) : [],
          descartadosIds: Array.isArray(r.descartados_ids) ? r.descartados_ids.map(Number) : [],
          chatActivoId: r.chat_activo_id ? Number(r.chat_activo_id) : null,
          conversaciones: r.conversaciones && typeof r.conversaciones === "object" ? r.conversaciones : {}
        };
      });
    }

    if (resSesiones.ok) {
      const filasSes = await resSesiones.json();
      estado.sesiones = filasSes.map((s) => ({
        id: Number(s.id),
        titulo: s.titulo,
        curso: s.curso,
        categoria: s.categoria,
        fechaHora: s.fecha_hora,
        lugar: s.lugar,
        asistentes: Array.isArray(s.asistentes) ? s.asistentes : []
      }));
    }
  } catch (err) {
    console.error("Error cargando datos desde Supabase:", err);
  }

  return estado;
}

async function guardarSesionActivaLocal(id) {
  if (id) {
    localStorage.setItem(CLAVE_SESION_LOCAL, String(id));
  } else {
    localStorage.removeItem(CLAVE_SESION_LOCAL);
  }
}

async function registrarCuentaRemota(datosCuenta) {
  const nuevaCuenta = {
    id: Date.now(),
    nombre: datosCuenta.nombre.trim(),
    procedencia: datosCuenta.procedencia.trim().toUpperCase(),
    carrera: datosCuenta.carrera,
    ciclo: datosCuenta.ciclo.trim(),
    contacto: datosCuenta.contacto.trim(),
    password: datosCuenta.password,
    bio: (datosCuenta.bio || "").trim(),
    categoria: datosCuenta.categoria || "Estudio",
    cursosDomina: [],
    cursosNecesita: [],
    disponibilidad: []
  };

  const respCuenta = await fetch(`${SUPABASE_URL}/rest/v1/cuentas`, {
    method: "POST",
    headers: headersSupabase(),
    body: JSON.stringify(mapearCuentaHaciaBD(nuevaCuenta))
  });

  if (!respCuenta.ok) {
    const textoError = await respCuenta.text();
    console.error("Error al crear cuenta en Supabase:", respCuenta.status, textoError);
    throw new Error(textoError || "No se pudo crear la cuenta");
  }

  const respRel = await fetch(`${SUPABASE_URL}/rest/v1/relaciones`, {
    method: "POST",
    headers: headersSupabase(),
    body: JSON.stringify({
      usuario_id: nuevaCuenta.id,
      matches_ids: [],
      descartados_ids: [],
      chat_activo_id: null,
      conversaciones: {}
    })
  });

  if (!respRel.ok) {
    console.error("Error al crear relaciones iniciales:", respRel.status, await respRel.text());
  }

  localStorage.setItem(CLAVE_SESION_LOCAL, String(nuevaCuenta.id));
  return nuevaCuenta;
}

async function actualizarCuentaRemota(cuenta) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/cuentas?id=eq.${cuenta.id}`, {
    method: "PATCH",
    headers: headersSupabase(),
    body: JSON.stringify(mapearCuentaHaciaBD(cuenta))
  });
  if (!resp.ok) {
    console.error("Error actualizando cuenta:", resp.status, await resp.text());
  }
}

async function guardarRelacionRemota(usuarioId, rel) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/relaciones?on_conflict=usuario_id`, {
    method: "POST",
    headers: {
      ...headersSupabase(),
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      usuario_id: Number(usuarioId),
      matches_ids: rel.matchesIds || [],
      descartados_ids: rel.descartadosIds || [],
      chat_activo_id: rel.chatActivoId || null,
      conversaciones: rel.conversaciones || {}
    })
  });
  if (!resp.ok) {
    console.error("Error guardando relación:", resp.status, await resp.text());
  }
}

async function crearSesionRemota(sesion) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/sesiones`, {
    method: "POST",
    headers: headersSupabase(),
    body: JSON.stringify({
      id: Number(sesion.id),
      titulo: sesion.titulo,
      curso: sesion.curso,
      categoria: sesion.categoria,
      fecha_hora: sesion.fechaHora,
      lugar: sesion.lugar,
      asistentes: sesion.asistentes || []
    })
  });
  if (!resp.ok) {
    console.error("Error creando sesión:", resp.status, await resp.text());
  }
}

async function actualizarAsistentesSesionRemota(sesionId, asistentes) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/sesiones?id=eq.${Number(sesionId)}`, {
    method: "PATCH",
    headers: headersSupabase(),
    body: JSON.stringify({ asistentes })
  });
  if (!resp.ok) {
    console.error("Error actualizando asistentes:", resp.status, await resp.text());
  }
}

