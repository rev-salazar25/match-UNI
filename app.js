document.addEventListener("DOMContentLoaded", () => {
  let estado = cargarEstado();
  let categoriaActual = "Estudio";
  let compararConId = null;

  const vistas = document.querySelectorAll(".vista");
  const navItems = document.querySelectorAll(".nav-item");

  function obtenerUsuarioActual() {
    return estado.usuarios.find((u) => u.id === estado.perfilActualId) || estado.usuarios[0];
  }

  function obtenerIniciales(nombre) {
    return (nombre || "U")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  function cambiarVista(idVista) {
    vistas.forEach((v) => v.classList.toggle("activa", v.id === idVista));
    navItems.forEach((b) => b.classList.toggle("activa", b.dataset.vista === idVista));

    if (idVista === "vista-perfil") renderPerfil();
    if (idVista === "vista-matches") renderMatches();
    if (idVista === "vista-chats") renderChats();
    if (idVista === "vista-horarios") renderHorarios();
    if (idVista === "vista-sesiones") renderSesiones();
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => cambiarVista(btn.dataset.vista));
  });

  // --- VISTA PERFIL ---
  const tarjetaPerfil = document.getElementById("tarjeta-perfil-actual");
  const chipsCursos = document.getElementById("chips-perfil-cursos");
  const badgeCursosCount = document.getElementById("badge-cursos-count");
  const grillaDispPerfil = document.getElementById("grilla-disponibilidad-perfil");
  const textoFranjas = document.getElementById("texto-franjas-abiertas");
  const panelEditor = document.getElementById("panel-editor-perfil");
  const formPerfil = document.getElementById("form-perfil-completo");
  const checksDomina = document.getElementById("checks-domina");
  const checksNecesita = document.getElementById("checks-necesita");
  const errorFormPerfil = document.getElementById("error-form-perfil");

  function poblarCheckboxesEditor(usuario) {
    checksDomina.innerHTML = "";
    checksNecesita.innerHTML = "";

    CURSOS_BASE.forEach((curso) => {
      const lblD = document.createElement("label");
      lblD.className = "check-item";
      const chkD = document.createElement("input");
      chkD.type = "checkbox";
      chkD.value = curso;
      chkD.checked = (usuario.cursosDomina || []).includes(curso);
      lblD.append(chkD, document.createTextNode(curso));
      checksDomina.appendChild(lblD);

      const lblN = document.createElement("label");
      lblN.className = "check-item";
      const chkN = document.createElement("input");
      chkN.type = "checkbox";
      chkN.value = curso;
      chkN.checked = (usuario.cursosNecesita || []).includes(curso);
      lblN.append(chkN, document.createTextNode(curso));
      checksNecesita.appendChild(lblN);
    });
  }

  function abrirEditorPerfil() {
    const u = obtenerUsuarioActual();
    document.getElementById("input-nombre").value = u.nombre || "";
    document.getElementById("input-procedencia").value = u.procedencia || "";
    document.getElementById("input-ciclo").value = u.ciclo || "";
    document.getElementById("select-carrera").value = u.carrera || "Ing. de Sistemas";
    document.getElementById("input-contacto").value = u.contacto || "";
    document.getElementById("input-bio").value = u.bio || "";
    poblarCheckboxesEditor(u);
    errorFormPerfil.hidden = true;
    panelEditor.hidden = false;
  }

  document.getElementById("btn-editar-perfil-rapido").addEventListener("click", abrirEditorPerfil);
  document.getElementById("btn-abrir-registro").addEventListener("click", () => {
    cambiarVista("vista-perfil");
    abrirEditorPerfil();
  });
  document.getElementById("btn-cancelar-edicion").addEventListener("click", () => {
    panelEditor.hidden = true;
  });

  formPerfil.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = obtenerUsuarioActual();
    const nombre = document.getElementById("input-nombre").value.trim();
    const procedencia = document.getElementById("input-procedencia").value.trim().toUpperCase();
    const ciclo = document.getElementById("input-ciclo").value.trim();
    const carrera = document.getElementById("select-carrera").value;
    const contacto = document.getElementById("input-contacto").value.trim();
    const bio = document.getElementById("input-bio").value.trim();

    const domina = [...checksDomina.querySelectorAll("input:checked")].map((i) => i.value);
    const necesita = [...checksNecesita.querySelectorAll("input:checked")].map((i) => i.value);

    const repetidos = domina.filter((c) => necesita.includes(c));
    if (repetidos.length > 0) {
      errorFormPerfil.textContent = `No marques el mismo curso en ambos lados: ${repetidos.join(", ")}`;
      errorFormPerfil.hidden = false;
      return;
    }

    u.nombre = nombre;
    u.procedencia = procedencia;
    u.ciclo = ciclo;
    u.carrera = carrera;
    u.contacto = contacto;
    u.bio = bio;
    u.cursosDomina = domina;
    u.cursosNecesita = necesita;

    guardarEstado(estado);
    panelEditor.hidden = true;
    renderPerfil();
  });

  function renderPerfil() {
    const u = obtenerUsuarioActual();
    tarjetaPerfil.innerHTML = `
      <div class="perfil-cabecera">
        <div class="avatar-iniciales">${obtenerIniciales(u.nombre)}</div>
        <div>
          <div class="perfil-nombre">${u.nombre} <span class="verificado-dot">●</span></div>
          <div class="perfil-procedencia">${u.procedencia}</div>
        </div>
      </div>
      <div class="perfil-meta-pills">
        <span class="pill-dato">${u.carrera}</span>
        <span class="pill-dato">${u.ciclo}</span>
        <span class="pill-dato">${u.contacto}</span>
      </div>
      <p class="perfil-bio">${u.bio || ""}</p>
    `;

    const listaUnica = [...new Set([...(u.cursosDomina || []), ...(u.cursosNecesita || [])])];
    badgeCursosCount.textContent = `${listaUnica.length} activos`;
    chipsCursos.innerHTML = "";

    if (listaUnica.length === 0) {
      chipsCursos.innerHTML = `<span class="ayuda-mini">Sin cursos seleccionados aún.</span>`;
    } else {
      listaUnica.forEach((curso) => {
        const chip = document.createElement("span");
        const esDomina = (u.cursosDomina || []).includes(curso);
        chip.className = `chip-interes ${esDomina ? "domina" : ""}`;
        chip.textContent = curso;
        chipsCursos.appendChild(chip);
      });
    }

    const disp = new Set(u.disponibilidad || []);
    textoFranjas.textContent = `${disp.size} de 15 franjas abiertas`;
    grillaDispPerfil.innerHTML = "";

    for (let i = 0; i < 15; i++) {
      const bloque = document.createElement("button");
      bloque.type = "button";
      bloque.className = `franja-bloque ${disp.has(i) ? "activa" : ""}`;
      bloque.title = `${DIAS_SEMANA[i % 5]} · ${TURNOS_DIA[Math.floor(i / 5)]}`;
      bloque.addEventListener("click", () => {
        if (disp.has(i)) {
          disp.delete(i);
        } else {
          disp.add(i);
        }
        u.disponibilidad = [...disp].sort((a, b) => a - b);
        guardarEstado(estado);
        renderPerfil();
      });
      grillaDispPerfil.appendChild(bloque);
    }
  }

  // --- VISTA MATCHES ---
  const contenedorCandidato = document.getElementById("contenedor-candidato-match");
  const contadorCandidatos = document.getElementById("contador-candidatos");
  const tabsCat = document.querySelectorAll(".tab-cat");

  tabsCat.forEach((tab) => {
    tab.addEventListener("click", () => {
      categoriaActual = tab.dataset.categoria;
      tabsCat.forEach((t) => t.classList.toggle("activa", t.dataset.categoria === categoriaActual));
      renderMatches();
    });
  });

  function renderMatches() {
    const u = obtenerUsuarioActual();
    const excluidos = [...(estado.matchesIds || []), ...(estado.descartadosIds || [])];
    const candidatos = obtenerCandidatosOrdenados(u, estado.usuarios, categoriaActual, excluidos);
    contadorCandidatos.textContent = `${candidatos.length} candidatos`;

    if (candidatos.length === 0) {
      contenedorCandidato.innerHTML = `
        <div class="vacio-app">
          <p>No hay más perfiles pendientes en <strong>${categoriaActual}</strong>.</p>
          <button type="button" id="btn-reiniciar-cola" class="btn-naranja">Volver a mostrar perfiles</button>
        </div>
      `;
      const btnReinicio = document.getElementById("btn-reiniciar-cola");
      if (btnReinicio) {
        btnReinicio.addEventListener("click", () => {
          estado.descartadosIds = [];
          guardarEstado(estado);
          renderMatches();
        });
      }
      return;
    }

    const actual = candidatos[0];
    const cand = actual.candidato;
    const etiquetas = [...new Set([...(cand.cursosDomina || []), ...(cand.cursosNecesita || [])])];

    contenedorCandidato.innerHTML = `
      <article class="tarjeta-candidato">
        <div class="portada-candidato">
          <span class="badge-coincidencias">${actual.enComun.length} intereses en común</span>
          <span class="badge-categoria-card">${cand.categoria}</span>
          <span>${obtenerIniciales(cand.nombre)}</span>
        </div>
        <div class="cuerpo-candidato">
          <div class="candidato-titulo">
            <span class="candidato-nombre">${cand.nombre}</span>
            <span class="candidato-ciclo">${cand.ciclo}</span>
          </div>
          <div class="candidato-rol">${cand.carrera}</div>
          <p class="candidato-bio">${cand.bio || ""}</p>
          <div class="chips-wrap">
            ${etiquetas.map((et) => `<span class="chip-interes">${et}</span>`).join("")}
          </div>
        </div>
      </article>

      <div class="acciones-swipe">
        <button type="button" id="btn-swipe-x" class="btn-swipe btn-rechazar" aria-label="Descartar">✕</button>
        <button type="button" id="btn-swipe-check" class="btn-swipe btn-aceptar" aria-label="Hacer match">✓</button>
      </div>
    `;

    document.getElementById("btn-swipe-x").addEventListener("click", () => {
      estado.descartadosIds.push(cand.id);
      guardarEstado(estado);
      renderMatches();
    });

    document.getElementById("btn-swipe-check").addEventListener("click", () => {
      if (!estado.matchesIds.includes(cand.id)) {
        estado.matchesIds.push(cand.id);
      }
      if (!estado.conversaciones[cand.id]) {
        estado.conversaciones[cand.id] = [
          {
            tipo: "ellos",
            texto: `¡Hola ${u.nombre.split(" ")[0]}! Hacemos match en ${cand.categoria.toLowerCase()}. ¿Coordinamos?`
          }
        ];
      }
      estado.chatActivoId = cand.id;
      guardarEstado(estado);
      cambiarVista("vista-chats");
    });
  }

  // --- VISTA CHATS ---
  const headerChat = document.getElementById("header-chat-activo");
  const listaContactosChat = document.getElementById("lista-contactos-chat");
  const mensajesBox = document.getElementById("mensajes-chat");
  const formPlan = document.getElementById("form-plan");
  const formMensaje = document.getElementById("form-mensaje");

  document.getElementById("btn-toggle-plan").addEventListener("click", () => {
    formPlan.hidden = !formPlan.hidden;
  });

  formPlan.addEventListener("submit", (e) => {
    e.preventDefault();
    const lugar = document.getElementById("input-plan-lugar").value.trim();
    const hora = document.getElementById("input-plan-hora").value.trim();
    if (!lugar || !hora || !estado.chatActivoId) return;

    if (!estado.conversaciones[estado.chatActivoId]) {
      estado.conversaciones[estado.chatActivoId] = [];
    }

    estado.conversaciones[estado.chatActivoId].push({
      tipo: "plan",
      lugar,
      hora,
      estado: "Confirmado"
    });

    document.getElementById("input-plan-lugar").value = "";
    document.getElementById("input-plan-hora").value = "";
    formPlan.hidden = true;
    guardarEstado(estado);
    renderChats();
  });

  formMensaje.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-mensaje");
    const texto = input.value.trim();
    if (!texto || !estado.chatActivoId) return;

    if (!estado.conversaciones[estado.chatActivoId]) {
      estado.conversaciones[estado.chatActivoId] = [];
    }

    estado.conversaciones[estado.chatActivoId].push({
      tipo: "mio",
      texto
    });

    input.value = "";
    guardarEstado(estado);
    renderChats();
  });

  function renderChats() {
    const contactos = estado.usuarios.filter((u) => estado.matchesIds.includes(u.id));
    if (contactos.length === 0) {
      headerChat.innerHTML = `<strong>Sin matches aún</strong>`;
      listaContactosChat.innerHTML = "";
      mensajesBox.innerHTML = `<div class="vacio-app">Acepta un perfil en <strong>Matches</strong> para iniciar una conversación.</div>`;
      return;
    }

    if (!contactos.some((c) => c.id === estado.chatActivoId)) {
      estado.chatActivoId = contactos[0].id;
    }

    const activo = contactos.find((c) => c.id === estado.chatActivoId) || contactos[0];
    headerChat.innerHTML = `
      <div class="chat-usuario-info">
        <div class="avatar-sm">${obtenerIniciales(activo.nombre)}</div>
        <div>
          <div style="font-weight:800;font-size:0.92rem;">${activo.nombre}</div>
          <div class="estado-linea">En línea · ${activo.contacto}</div>
        </div>
      </div>
    `;

    listaContactosChat.innerHTML = "";
    contactos.forEach((c) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = `pill-contacto ${c.id === activo.id ? "activa" : ""}`;
      pill.textContent = c.nombre.split(" ")[0];
      pill.addEventListener("click", () => {
        estado.chatActivoId = c.id;
        guardarEstado(estado);
        renderChats();
      });
      listaContactosChat.appendChild(pill);
    });

    const msgs = estado.conversaciones[activo.id] || [];
    mensajesBox.innerHTML = "";

    msgs.forEach((m) => {
      if (m.tipo === "plan") {
        const planCard = document.createElement("div");
        planCard.className = "tarjeta-plan";
        planCard.innerHTML = `
          <span class="plan-etiqueta">Propuesta de plan</span>
          <span class="plan-dato">📍 ${m.lugar}</span>
          <span class="plan-dato">🕒 ${m.hora}</span>
          <span class="plan-estado">✓ ${m.estado || "Confirmado"}</span>
        `;
        mensajesBox.appendChild(planCard);
      } else {
        const burbuja = document.createElement("div");
        burbuja.className = `burbuja ${m.tipo === "mio" ? "mio" : "ellos"}`;
        burbuja.textContent = m.texto;
        mensajesBox.appendChild(burbuja);
      }
    });

    mensajesBox.scrollTop = mensajesBox.scrollHeight;
  }

  // --- VISTA HORARIOS ---
  const tabsComparar = document.getElementById("tabs-comparar-con");
  const matrizComparacion = document.getElementById("matriz-comparacion");
  const resumenCruce = document.getElementById("resumen-cruce-horario");

  function renderHorarios() {
    const u = obtenerUsuarioActual();
    const companeros = estado.usuarios.filter((x) => x.id !== u.id);

    if (!companeros.some((x) => x.id === compararConId)) {
      const preferido = companeros.find((x) => x.nombre.includes("Camila")) || companeros[0];
      compararConId = preferido ? preferido.id : null;
    }

    tabsComparar.innerHTML = "";
    companeros.forEach((comp) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `pill-contacto ${comp.id === compararConId ? "activa" : ""}`;
      btn.textContent = comp.nombre.split(" ")[0];
      btn.addEventListener("click", () => {
        compararConId = comp.id;
        renderHorarios();
      });
      tabsComparar.appendChild(btn);
    });

    const otro = companeros.find((x) => x.id === compararConId);
    if (!otro) return;

    const resultado = compararDisponibilidades(u.disponibilidad, otro.disponibilidad);
    matrizComparacion.innerHTML = `
      <div class="fila-dias-header">
        <span></span>
        ${DIAS_SEMANA.map((d) => `<span>${d}</span>`).join("")}
      </div>
    `;

    TURNOS_DIA.forEach((turno, idxTurno) => {
      const fila = document.createElement("div");
      fila.className = "fila-turno";

      const labelTurno = document.createElement("span");
      labelTurno.className = "etiqueta-turno";
      labelTurno.textContent = turno;
      fila.appendChild(labelTurno);

      for (let col = 0; col < 5; col++) {
        const bloqueInfo = resultado.bloques[idxTurno * 5 + col];
        const celda = document.createElement("div");
        celda.className = "celda-horario";
        if (bloqueInfo.estado === "ambos") celda.classList.add("libre-ambos");
        if (bloqueInfo.estado === "uno") celda.classList.add("libre-uno");
        celda.title = `${bloqueInfo.dia} · ${bloqueInfo.turno}`;
        fila.appendChild(celda);
      }

      matrizComparacion.appendChild(fila);
    });

    resumenCruce.innerHTML = `
      <div><strong>${resultado.coincidentes} franjas coincidentes</strong> con ${otro.nombre}</div>
      <div class="leyenda-cruce">
        <span>🟧 Ambos libres</span>
        <span>⬜ Solo uno libre</span>
        <span>⬛ No disponible</span>
      </div>
    `;
  }

  // --- VISTA SESIONES ---
  const listaSesiones = document.getElementById("lista-sesiones");
  const formNuevaSesion = document.getElementById("form-nueva-sesion");
  const selectSesionCurso = document.getElementById("select-sesion-curso");

  selectSesionCurso.innerHTML = CURSOS_BASE.map((c) => `<option value="${c}">${c}</option>`).join("");

  document.getElementById("btn-toggle-nueva-sesion").addEventListener("click", () => {
    formNuevaSesion.hidden = !formNuevaSesion.hidden;
  });

  formNuevaSesion.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = obtenerUsuarioActual();
    const titulo = document.getElementById("input-sesion-titulo").value.trim();
    const curso = document.getElementById("select-sesion-curso").value;
    const categoria = document.getElementById("select-sesion-cat").value;
    const fechaHora = document.getElementById("input-sesion-fecha").value.trim();
    const lugar = document.getElementById("input-sesion-lugar").value.trim();

    if (!titulo || !fechaHora || !lugar) return;

    estado.sesiones.unshift({
      id: Date.now(),
      titulo,
      curso,
      categoria,
      fechaHora,
      lugar,
      asistentes: [u.nombre]
    });

    formNuevaSesion.reset();
    formNuevaSesion.hidden = true;
    guardarEstado(estado);
    renderSesiones();
  });

  function renderSesiones() {
    const u = obtenerUsuarioActual();
    listaSesiones.innerHTML = "";

    estado.sesiones.forEach((s) => {
      const yaUnido = (s.asistentes || []).includes(u.nombre);
      const card = document.createElement("article");
      card.className = "tarjeta-sesion";
      card.innerHTML = `
        <div class="sesion-top">
          <div>
            <div class="sesion-titulo">${s.titulo}</div>
            <span class="chip-interes">${s.curso}</span>
          </div>
          <button type="button" class="btn-unirme ${yaUnido ? "unido" : ""}">
            ${yaUnido ? "Unido ✓" : "Unirme"}
          </button>
        </div>
        <div class="sesion-meta">🕒 ${s.fechaHora}</div>
        <div class="sesion-meta">📍 ${s.lugar}</div>
        <div class="sesion-asistentes">
          ${
            s.asistentes && s.asistentes.length > 0
              ? `Asistentes (${s.asistentes.length}): ${s.asistentes.join(", ")}`
              : "Sé la primera persona en unirte"
          }
        </div>
      `;

      card.querySelector(".btn-unirme").addEventListener("click", () => {
        s.asistentes = s.asistentes || [];
        if (yaUnido) {
          s.asistentes = s.asistentes.filter((n) => n !== u.nombre);
        } else {
          s.asistentes.push(u.nombre);
        }
        guardarEstado(estado);
        renderSesiones();
      });

      listaSesiones.appendChild(card);
    });
  }

  // --- BOTÓN RESTAURAR DEMO ---
  document.getElementById("btn-reset-demo").addEventListener("click", () => {
    estado = restaurarEstadoDemo();
    cambiarVista("vista-perfil");
  });

  // Render inicial
  renderPerfil();
});