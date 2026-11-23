const CLAVE_BD_UNIMATCH = "unimatch_fiis_uni_v1";

const DATOS_INICIALES = {
  perfilActualId: 1,
  usuarios: [
    {
      id: 1,
      nombre: "Alberto Villalobos",
      procedencia: "CAJAMARCA",
      carrera: "Ing. de Sistemas",
      ciclo: "5° año",
      contacto: "alberto.villalobos@uni.pe",
      bio: "Apasionado por sistemas, programación y trabajo colaborativo en la FIIS-UNI.",
      categoria: "Estudio",
      cursosDomina: ["Programación", "IA"],
      cursosNecesita: ["Cálculo Diferencial", "Diseño UX"],
      disponibilidad: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    },
    {
      id: 2,
      nombre: "Camila Rojas",
      procedencia: "LIMA",
      carrera: "Ing. de Sistemas",
      ciclo: "4° año",
      contacto: "camila.rojas@uni.pe",
      bio: "Busco compañeros para un proyecto de investigación este ciclo.",
      categoria: "Estudio",
      cursosDomina: ["Diseño UX", "Investigación", "IA", "Programación"],
      cursosNecesita: ["Cálculo Integral"],
      disponibilidad: [0, 2, 3, 6, 7, 8, 10, 11, 13, 14]
    },
    {
      id: 3,
      nombre: "Rodrigo Quispe",
      procedencia: "AREQUIPA",
      carrera: "Ing. Industrial",
      ciclo: "3° ciclo",
      contacto: "rodrigo.quispe@uni.pe",
      bio: "Preparando prácticas de Cálculo Diferencial y Física I para parciales.",
      categoria: "Estudio",
      cursosDomina: ["Cálculo Diferencial", "Física I"],
      cursosNecesita: ["Programación"],
      disponibilidad: [1, 2, 5, 7, 10, 12]
    },
    {
      id: 4,
      nombre: "María Huamán",
      procedencia: "CUSCO",
      carrera: "Ing. de Inteligencia Artificial",
      ciclo: "2° ciclo",
      contacto: "maria.huaman@uni.pe",
      bio: "Grupo de repaso de Química General y ejercicios de programación.",
      categoria: "Estudio",
      cursosDomina: ["Química General", "Programación"],
      cursosNecesita: ["Cálculo Diferencial"],
      disponibilidad: [0, 1, 6, 8, 11, 13]
    },
    {
      id: 5,
      nombre: "Diego Mendoza",
      procedencia: "TRUJILLO",
      carrera: "Ing. de Sistemas",
      ciclo: "4° ciclo",
      contacto: "diego.mendoza@uni.pe",
      bio: "Organizando pichangas y retos de lógica algorítmica los fines de semana.",
      categoria: "Actividades",
      cursosDomina: ["Programación", "Física I"],
      cursosNecesita: ["IA"],
      disponibilidad: [2, 3, 7, 8, 12, 13]
    },
    {
      id: 6,
      nombre: "Valeria Paredes",
      procedencia: "LIMA",
      carrera: "Ing. Industrial",
      ciclo: "5° ciclo",
      contacto: "valeria.paredes@uni.pe",
      bio: "Interesada en investigación aplicada, concursos académicos y networking FIIS.",
      categoria: "Networking",
      cursosDomina: ["Investigación", "Diseño UX"],
      cursosNecesita: ["Programación"],
      disponibilidad: [0, 1, 5, 6, 10, 11]
    }
  ],
  matchesIds: [2, 3, 4],
  descartadosIds: [],
  chatActivoId: 2,
  conversaciones: {
    2: [
      {
        tipo: "ellos",
        texto: "¿Te animas al proyecto de investigación?"
      },
      {
        tipo: "mio",
        texto: "¡Claro! ¿Nos vemos mañana?"
      },
      {
        tipo: "plan",
        lugar: "Biblioteca",
        hora: "3:00 p. m.",
        estado: "Confirmado"
      },
      {
        tipo: "ellos",
        texto: "Perfecto, ahí estaré."
      }
    ],
    3: [
      {
        tipo: "ellos",
        texto: "Hola, ¿avanzamos ejercicios de Cálculo Diferencial esta semana?"
      }
    ],
    4: [
      {
        tipo: "ellos",
        texto: "¡Hola! Si necesitas repasar Química General, avísame."
      }
    ]
  },
  sesiones: [
    {
      id: 101,
      titulo: "Hackaton",
      curso: "Programación",
      categoria: "Actividades",
      fechaHora: "dom, 20 set. a las 8:00 p. m.",
      lugar: "Sala 3",
      asistentes: []
    },
    {
      id: 102,
      titulo: "Maratón de Integrales y Cálculo",
      curso: "Cálculo Integral",
      categoria: "Estudio",
      fechaHora: "mar, 22 set. a las 4:00 p. m.",
      lugar: "Biblioteca central",
      asistentes: ["Camila Rojas", "Rodrigo Quispe"]
    }
  ]
};

function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function cargarEstado() {
  const raw = localStorage.getItem(CLAVE_BD_UNIMATCH);
  if (!raw) {
    const inicial = clonar(DATOS_INICIALES);
    guardarEstado(inicial);
    return inicial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo BD:", e);
    return clonar(DATOS_INICIALES);
  }
}

function guardarEstado(estado) {
  localStorage.setItem(CLAVE_BD_UNIMATCH, JSON.stringify(estado));
}

function restaurarEstadoDemo() {
  const inicial = clonar(DATOS_INICIALES);
  guardarEstado(inicial);
  return inicial;
}