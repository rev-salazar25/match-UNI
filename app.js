document.addEventListener("DOMContentLoaded", () => {
  let estado = cargarEstado();
  let categoriaActual = "Estudio";
  let compararConId = null;

  const vistas = document.querySelectorAll(".vista");
  const navItems = document.querySelectorAll(".nav-item");
  const barraNav = document.getElementById("barra-nav-principal");
  const indicadorCuentaTop = document.getElementById("indicador-cuenta-top");
  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

  function obtenerUsuarioActual() {
    if (!estado.sesionActivaId) return null;
    return estado.cuentas.find((c) => c.id === estado.sesionActivaId) || null;
  }

  function obtenerOtrosUsuarios(usuarioId) {
    return (estado.cuentas || []).filter((c) => c.id !== usuarioId);
  }

  function obtenerRelaciones(usuarioId) {
    if (!estado.relacionesPorUsuario[usuarioId]) {
      estado.relacionesPorUsuario[usuarioId] = {
        matchesIds: [],
        descartadosIds: [],
        chatActivoId: null,
        conversaciones: {}
      };
    }
    return estado.relacionesPorUsuario[usuarioId];
  }

  function obtenerIniciales(nombre) {
    return (nombre || "U")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  function sincronizarSesionUI() {
    const u = obtenerUsuarioActual();
    if (!u) {
      indicadorCuentaTop.textContent = "Sin sesión";
      btnCerrarSesion.hidden = true;
      barraNav.hidden = true;
      renderAcceso();
      cambiarVista("vista-acceso");
    } else {
      indicadorCuentaTop.textContent = u.nombre;
      btnCerrarSesion.hidden = false;
      barraNav.hidden = false;
      renderPerfil();
      cambiarVista("vista-perfil");
    }
  }

  function cambiarVista(idVista) {
    vistas.forEach((v) => v.classList.toggle("activa", v.id === idVista));
    navItems.forEach((b) => b.classList.toggle("activa", b.dataset.vista === idVista));

    if (idVista === "vista-acceso") renderAcceso();
    if (idVista === "vista-perfil") renderPerfil();
    if (idVista === "vista-matches") renderMatches();
    if (idVista === "vista-chats") renderChats();
    if (idVista === "vista-horarios") renderHorarios();
    if (idVista === "vista-sesiones") renderSesiones();
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!obtenerUsuarioActual()) {
        cambiarVista("vista-acceso");
        return;
      }
      cambiarVista(btn.dataset.vista);
    });
  });

  // --- ACCESO / CREAR CUENTA / CERRAR SESIÓN ---
  const formCrearCuenta = document.getElementById("form-crear-cuenta");
  const bloqueCuentasExistentes = document.getElementById("bloque-cuentas-existentes");
  const listaCuentasExistentes = document.getElementById("lista-cuentas-existentes");

  function renderAcceso() {
    if (estado.cuentas && estado.cuentas.length > 0) {
      bloqueCuentasExistentes.hidden = false;
      listaCuentasExistentes.innerHTML = "";
      estado.cuentas.forEach((cuenta) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pill-contacto";
        btn.textContent = `${cuenta.nombre} (${cuenta.ciclo})`;
        btn.addEventListener("click", () => {
          estado.sesionActivaId = cuenta.id;
          guardarEstado(estado);
          sincronizarSesionUI();
        });
        listaCuentasExistentes.appendChild(btn);
      });
    } else {
      bloqueCuentasExistentes.hidden = true;
    }
  }

  formCrearCuenta.addEventListener("submit", (e) => {
    e.preventDefault();
    crearNuevaCuentaDesdeCero(estado, {
      nombre: document.getElementById("reg-nombre").value,
      procedencia: document.getElementById("reg-procedencia").value,
      ciclo: document.getElementById("reg-ciclo").value,
      carrera: document.getElementById("reg-carrera").value,
      contacto: document.getElementById("reg-contacto").value,
      categoria: document.getElementById("reg-categoria").value,
      bio: document.getElementById("reg-bio").value
    });
    formCrearCuenta.reset();
    sincronizarSesionUI();
  });

  btnCerrarSesion.addEventListener("click", () => {
    estado.sesionActivaId = null;
    guardarEstado(estado);
    sincronizarSesionUI();
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
    if (!u) return;
    poblarCheckboxesEditor(u);
    errorFormPerfil.hidden = true;
    panelEditor.hidden = false;
  }

  document.getElementById("btn-editar-perfil-rapido").addEventListener("click", abrirEditorPerfil);
  document.getElementById("btn-cancelar-edicion").addEventListener("click", () => {
    panelEditor.hidden = true;
  });

  formPerfil.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = obtenerUsuarioActual();
    if (!u) return;

    const domina = [...checksDomina.querySelectorAll("input:checked")].map((i) => i.value);
    const necesita = [...checksNecesita.querySelectorAll("input:checked")].map((i) => i.value);

    const repetidos = domina.filter((c) => necesita.includes(c));
    if (repetidos.length > 0) {
      errorFormPerfil.textContent = `No marques el mismo curso en domino y necesito: ${repetidos.join(", ")}`;
      errorFormPerfil.hidden = false;
      return;
    }

    u.cursosDomina = domina;
    u.cursosNecesita = necesita;
    guardarEstado(estado);
    panelEditor.hidden = true;
    renderPerfil();
  });

  function renderPerfil() {
    const u = obtenerUsuarioActual();
    if (!u) return;

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
      <p class="perfil-bio">${u.bio || "Cuenta nueva iniciada desde 0."}</p>
    `;

    const dom = u.cursosDomina || [];
    const nec = u.cursosNecesita || [];
    const totalCursos = new Set([...dom, ...nec]).size;
    badgeCursosCount.textContent = `${totalCursos} cursos`;
    chipsCursos.innerHTML = "";

    if (totalCursos === 0) {
      chipsCursos.innerHTML = `<span class="ayuda-mini">0 cursos seleccionados. Toca "Configurar cursos" para elegir cuáles dominas y cuáles necesitas.</span>`;
    } else {
      dom.forEach((c) => {
        const chip = document.createElement("span");
        chip.className = "chip-interes domina";
        chip.textContent = `Domino: ${c}`;
        chipsCursos.appendChild(chip);
      });
      nec.forEach((c) => {
        const chip = document.createElement("span");
        chip.className = "chip-interes";
        chip.textContent = `Necesito: ${c}`;
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
    if (!u) return;

    const rel = obtenerRelaciones(u.id);
    const otros = obtenerOtrosUsuarios(u.id);
    const excluidos = [...(rel.matchesIds || []), ...(rel.descartadosIds || [])];
    const candidatos = obtenerCandidatosOrdenados(u, otros, categoriaActual, excluidos);
    contadorCandidatos.textContent = `${candidatos.length} candidatos`;

    if (otros.length === 0) {
      contenedorCandidato.innerHTML = `
        <div class="vacio-app">
          <p><strong>0 usuarios registrados todavía.</strong></p>
          <p>Nadie más ha creado su cuenta aún. Puedes cerrar sesión y crear otra cuenta para probar el cruce de cursos.</p>
        </div>
      `;
      return;
    }

    if (candidatos.length === 0) {
      contenedorCandidato.innerHTML = `
        <div class="vacio-app">
          <p>No hay candidatos pendientes en <strong>${categoriaActual}</strong>.</p>
          <button type="button" id="btn-reiniciar-cola" class="btn-naranja">Volver a mostrar perfiles descartados</button>
        </div>
      `;
      const btnReinicio = document.getElementById("btn-reiniciar-cola");
      if (btnReinicio) {
        btnReinicio.addEventListener("click", () => {
          rel.descartadosIds = [];
          guardarEstado(estado);
          renderMatches();
        });
      }
      return;
    }

    const actual = candidatos[0];
    const cand = actual.candidato;

    contenedorCandidato.innerHTML = `
      <article class="tarjeta-candidato">
        <div class="portada-candidato">
          <span class="badge-coincidencias">${actual.porcentaje}% compatibilidad</span>
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
          <div class="candidato-bio">
            <strong>Te puede enseñar (${actual.porcentaje}%):</strong>
            ${actual.bEnsenaAA.length > 0 ? actual.bEnsenaAA.join(", ") : "Ninguno de tus cursos necesitados"}
          </div>
          <div class="candidato-bio">
            <strong>Tú le puedes enseñar:</strong>
            ${actual.aEnsenaAB.length > 0 ? actual.aEnsenaAB.join(", ") : "—"}
          </div>
          <div class="chips-wrap">
            ${(cand.cursosDomina || []).map((et) => `<span class="chip-interes domina">Domina: ${et}</span>`).join("")}
          </div>
        </div>
      </article>

      <div class="acciones-swipe">
        <button type="button" id="btn-swipe-x" class="btn-swipe btn-rechazar" aria-label="Descartar">✕</button>
        <button type="button" id="btn-swipe-check" class="btn-swipe btn-aceptar" aria-label="Hacer match">✓</button>
      </div>
    `;

    document.getElementById("btn-swipe-x").addEventListener("click", () => {
      rel.descartadosIds.push(cand.id);
      guardarEstado(estado);
      renderMatches();
    });

    document.getElementById("btn-swipe-check").addEventListener("click", () => {
      if (!rel.matchesIds.includes(cand.id)) {
        rel.matchesIds.push(cand.id);
      }
      if (!rel.conversaciones[cand.id]) {
        rel.conversaciones[cand.id] = [
          {
            tipo: "ellos",
            texto: `¡Hola ${u.nombre.split(" ")[0]}! Tenemos ${actual.porcentaje}% de compatibilidad en cursos. ¿Coordinamos?`
          }
        ];
      }
      rel.chatActivoId = cand.id;
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
    const u = obtenerUsuarioActual();
    if (!u) return;
    const rel = obtenerRelaciones(u.id);
    const lugar = document.getElementById("input-plan-lugar").value.trim();
    const hora = document.getElementById("input-plan-hora").value.trim();
    if (!lugar || !hora || !rel.chatActivoId) return;

    if (!rel.conversaciones[rel.chatActivoId]) {
      rel.conversaciones[rel.chatActivoId] = [];
    }

    rel.conversaciones[rel.chatActivoId].push({
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
    const u = obtenerUsuarioActual();
    if (!u) return;
    const rel = obtenerRelaciones(u.id);
    const input = document.getElementById("input-mensaje");
    const texto = input.value.trim();
    if (!texto || !rel.chatActivoId) return;

    if (!rel.conversaciones[rel.chatActivoId]) {
      rel.conversaciones[rel.chatActivoId] = [];
    }

    rel.conversaciones[rel.chatActivoId].push({
      tipo: "mio",
      texto
    });

    input.value = "";
    guardarEstado(estado);
    renderChats();
  });

  function renderChats() {
    const u = obtenerUsuarioActual();
    if (!u) return;
    const rel = obtenerRelaciones(u.id);
    const otros = obtenerOtrosUsuarios(u.id);
    const contactos = otros.filter((x) => (rel.matchesIds || []).includes(x.id));

    if (contactos.length === 0) {
      headerChat.innerHTML = `<strong>0 matches activos</strong>`;
      listaContactosChat.innerHTML = "";
      mensajesBox.innerHTML = `<div class="vacio-app">Tu lista de chats está vacía. Cuando hagas match con alguien en <strong>Matches</strong> aparecerá aquí.</div>`;
      return;
    }

    if (!contactos.some((c) => c.id === rel.chatActivoId)) {
      rel.chatActivoId = contactos[0].id;
    }

    const activo = contactos.find((c) => c.id === rel.chatActivoId) || contactos[0];
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
        rel.chatActivoId = c.id;
        guardarEstado(estado);
        renderChats();
      });
      listaContactosChat.appendChild(pill);
    });

    const msgs = rel.conversaciones[activo.id] || [];
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
    if (!u) return;

    const otros = obtenerOtrosUsuarios(u.id);
    if (otros.length === 0) {
      tabsComparar.innerHTML = "";
      matrizComparacion.innerHTML = `<div class="vacio-app">Aún no hay otros usuarios registrados para comparar horarios.</div>`;
      resumenCruce.innerHTML = "";
      return;
    }

    if (!otros.some((x) => x.id === compararConId)) {
      compararConId = otros[0].id;
    }

    tabsComparar.innerHTML = "";
    otros.forEach((comp) => {
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

    const otro = otros.find((x) => x.id === compararConId);
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
    if (!u) return;

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
    if (!u) return;

    listaSesiones.innerHTML = "";
    if (!estado.sesiones || estado.sesiones.length === 0) {
      listaSesiones.innerHTML = `<div class="vacio-app">0 sesiones creadas todavía. Toca <strong>+ Nueva</strong> para publicar la primera.</div>`;
      return;
    }

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
          Asistentes (${(s.asistentes || []).length}): ${(s.asistentes || []).join(", ")}
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

  sincronizarSesionUI();
});
