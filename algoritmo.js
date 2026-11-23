const CURSOS_BASE = [
  "Programación",
  "Cálculo Diferencial",
  "Cálculo Integral",
  "Química General",
  "Física I",
  "IA",
  "Diseño UX",
  "Investigación"
];

const DIAS_SEMANA = ["L", "M", "M", "J", "V"];
const TURNOS_DIA = ["Mañana", "Tarde", "Noche"];

function calcularCompatibilidad(perfilA, candidatoB) {
  if (!perfilA || !candidatoB || perfilA.id === candidatoB.id) {
    return null;
  }

  const dominaA = new Set(perfilA.cursosDomina || []);
  const necesitaA = [...new Set(perfilA.cursosNecesita || [])];
  const dominaB = new Set(candidatoB.cursosDomina || []);
  const necesitaB = [...new Set(candidatoB.cursosNecesita || [])];

  const bEnsenaAA = necesitaA.filter((curso) => dominaB.has(curso));
  const aEnsenaAB = necesitaB.filter((curso) => dominaA.has(curso));

  const setTodosA = new Set([...dominaA, ...necesitaA]);
  const setTodosB = new Set([...dominaB, ...necesitaB]);
  const enComun = [...setTodosA].filter((curso) => setTodosB.has(curso));

  let porcentaje = 0;
  if (necesitaA.length > 0) {
    porcentaje = Math.round((bEnsenaAA.length / necesitaA.length) * 100);
  } else if (aEnsenaAB.length > 0) {
    porcentaje = 50;
  }

  const esBidireccional = bEnsenaAA.length > 0 && aEnsenaAB.length > 0;

  return {
    candidato: candidatoB,
    porcentaje,
    bEnsenaAA,
    aEnsenaAB,
    enComun,
    esBidireccional
  };
}

function obtenerCandidatosOrdenados(perfilActual, todosUsuarios, categoria, idsExcluidos) {
  const excluidosSet = new Set(idsExcluidos || []);

  return todosUsuarios
    .filter((u) => u.id !== perfilActual.id && !excluidosSet.has(u.id))
    .filter((u) => !categoria || u.categoria === categoria)
    .map((u) => calcularCompatibilidad(perfilActual, u))
    .filter(Boolean)
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

function compararDisponibilidades(slotsA, slotsB) {
  const setA = new Set(slotsA || []);
  const setB = new Set(slotsB || []);
  const bloques = [];
  let coincidentes = 0;

  for (let i = 0; i < 15; i++) {
    const tieneA = setA.has(i);
    const tieneB = setB.has(i);
    let estado = "ocupado";

    if (tieneA && tieneB) {
      estado = "ambos";
      coincidentes++;
    } else if (tieneA || tieneB) {
      estado = "uno";
    }

    bloques.push({
      indice: i,
      dia: DIAS_SEMANA[i % 5],
      turno: TURNOS_DIA[Math.floor(i / 5)],
      estado
    });
  }

  return { bloques, coincidentes };
}

