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

/**
 * Calcula compatibilidad académica y de intereses entre un perfil base y un candidato.
 */
function calcularCompatibilidad(perfilBase, candidato) {
  if (!perfilBase || !candidato || perfilBase.id === candidato.id) {
    return null;
  }

  const dominaBase = new Set(perfilBase.cursosDomina || []);
  const necesitaBase = new Set(perfilBase.cursosNecesita || []);
  const dominaCand = new Set(candidato.cursosDomina || []);
  const necesitaCand = new Set(candidato.cursosNecesita || []);

  const baseEnsenaACand = [...dominaBase].filter((c) => necesitaCand.has(c));
  const candEnsenaABase = [...dominaCand].filter((c) => necesitaBase.has(c));

  const todosBase = new Set([...dominaBase, ...necesitaBase]);
  const todosCand = new Set([...dominaCand, ...necesitaCand]);
  const enComun = [...todosBase].filter((c) => todosCand.has(c));

  const esBidireccional = baseEnsenaACand.length > 0 && candEnsenaABase.length > 0;
  const totalCruces = baseEnsenaACand.length + candEnsenaABase.length;

  const puntaje =
    (esBidireccional ? 100 : 0) +
    totalCruces * 15 +
    enComun.length * 10;

  return {
    candidato,
    enComun,
    baseEnsenaACand,
    candEnsenaABase,
    esBidireccional,
    puntaje
  };
}

/**
 * Filtra y ordena candidatos según categoría ("Estudio", "Actividades", "Networking")
 * y excluye los ya evaluados (descartados o con match).
 */
function obtenerCandidatosOrdenados(perfilBase, todosUsuarios, categoria, idsExcluidos) {
  const excluidosSet = new Set(idsExcluidos || []);

  return todosUsuarios
    .filter((u) => u.id !== perfilBase.id && !excluidosSet.has(u.id))
    .filter((u) => !categoria || u.categoria === categoria)
    .map((u) => calcularCompatibilidad(perfilBase, u))
    .filter(Boolean)
    .sort((a, b) => b.puntaje - a.puntaje);
}

/**
 * Compara la matriz de 15 bloques (3 turnos x 5 días) entre dos usuarios.
 * Cada índice va de 0 a 14: fila = Math.floor(i / 5), col = i % 5.
 */
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

  return {
    bloques,
    coincidentes
  };
}   