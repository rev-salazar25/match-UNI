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
    if (!estado || !estado.sesionActivaId) return null;
    return (estado.cuentas || []).find((c) => c.id === estado.sesionActivaId) || null;
  }

  function obtenerOtrosUsuarios(usuarioId) {
    return (estado.cuentas || []).filter((c) => c.id !== usuarioId);
  }

  function obtenerRelaciones(usuarioId) {
    if (!estado.relacionesPorUsuario) {
      estado.relacionesPorUsuario = {};
    }
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
      .map((p) => p[0] ? p[0].toUpperCase() : "")
      .join("") || "U";
  }

  function mostrarVistaUnica(idVista) {
    vistas.forEach((v) => {
      const esObjetivo = v.id === idVista;
      v.classList.toggle("activa", esObjetivo);
      v.hidden = !esObjetivo;
      v.style.display = esObjetivo ? "flex" : "none";
    });

    navItems.forEach((b) => {
      b.classList.toggle("activa", b.dataset.vista === idVista);
    });

    if (idVista === "vista-acceso") renderAcceso();
    if (idVista === "vista-perfil") renderPerfil();
    if (idVista === "vista-matches") renderMatches();
    if (idVista === "vista-chats") renderChats();
    if (idVista === "vista-horarios") renderHorarios();
    if (idVista === "vista-sesiones") renderSesiones();
  }

  function sincronizarSesionUI() {
    const u = obtenerUsuarioActual();
    if (!u) {
      if (indicadorCuentaTop) indicadorCuentaTop.textContent = "Sin sesión";
      if (btnCerrarSesion) btnCerrarSesion.hidden = true;
      if (barraNav) barraNav.hidden = true;
      mostrarVistaUnica("vista-acceso");
    } else {
      if (indicadorCuentaTop) indicadorCuentaTop.textContent = u.nombre;
      if (btnCerrarSesion) btnCerrarSesion.hidden = false;
      if (barraNav) barraNav.hidden = false;
      mostrarVistaUnica("vista-perfil");
    }
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!obtenerUsuarioActual()) {
        mostrarVistaUnica("vista-acceso");
        return;
      }
      mostrarVistaUnica(btn.dataset.vista);
    });
  });

  // --- ACCESO / CREAR CUENTA / CERRAR SESIÓN ---
  const formCrearCuenta = document.getElementById("form-crear-cuenta");
  const bloqueCuentasExistentes = document.getElementById("bloque-cuentas-existentes");
  const listaCuentasExistentes = document.getElementById("lista-cuentas-existentes");

  function renderAcceso() {
    if (!bloqueCuentasExistentes || !listaCuentasExistentes) return;

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
      listaCuentasExistentes.innerHTML = "";
    }
  }

  if (formCrearCuenta) {
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
  }

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", () => {
      estado.sesionActivaId = null;
      guardarEstado(estado);
      sincronizarSesionUI();
    });
  }

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
    if (!checksDomina || !checksNecesita) return;
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
    if (!u || !panelEditor) return;
    poblarCheckboxesEditor(u);
    if (errorFormPerfil) errorFormPerfil.hidden = true;
    panelEditor.hidden = false;
    panelEditor.style.display = "flex";
  }

  function cerrarEditorPerfil() {
    if (!panelEditor) return;
    panelEditor.hidden = true;
    panelEditor.style.display = "none";
  }

  const btnEditarPerfilRapido = document.getElementById("btn-editar-perfil-rapido");
  if (btnEditarPerfilRapido) {
    btnEditarPerfilRapido.addEventListener("click", abrirEditorPerfil);
  }

  const btnCancelarEdicion = document.getElementById("btn-cancelar-edicion");
  if (btnCancelarEdicion) {
    btnCancelarEdicion.addEventListener("click", cerrarEditorPerfil);
  }

  if (formPerfil) {
    formPerfil.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = obtenerUsuarioActual();
      if (!u) return;

      const domina = [...checksDomina.querySelectorAll("input:checked")].map((i) => i.value);
      const necesita = [...checksNecesita.querySelectorAll("input:checked")].map((i) => i.value);

      const repetidos = domina.filter((c) => necesita.includes(c));
      if (repetidos.length > 0) {
        if (errorFormPerfil) {
          errorFormPerfil.textContent = `No marques el mismo curso en domino y necesito: ${repetidos.join(", ")}`;
          errorFormPerfil.hidden = false;
        }
        return;
      }

      u.cursosDomina = domina;
      u.cursosNecesita = necesita;
      guardarEstado(estado);
      cerrarEditorPerfil();
      renderPerfil();
    });
  }

  function renderPerfil() {
    const u = obtenerUsuarioActual();
    if (!u) {
      mostrarVistaUnica("vista-acceso");
      return;
    }

    if (tarjetaPerfil) {
      tarjetaPerfil.style.display = "flex";
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
        <p class="perfil-bio">${u.bio || "Cuenta nueva iniciada desde 0. Configura tus cursos y disponibilidad cuando quieras."}</p>
      `;
    }

    const dom = u.cursosDomina || [];
    const nec = u.cursosNecesita || [];
    const totalCursos = new Set([...dom, ...nec]).size;

    if (badgeCursosCount) {
      badgeCursosCount.textContent = `${totalCursos} cursos`;
    }

    if (chipsCursos) {
      chipsCursos.innerHTML = "";
      if (totalCursos === 0) {
        chipsCursos.innerHTML = `
          <div class="vacio-app" style="width:100%;">
            <p>Aún no seleccionaste cursos que dominas o necesitas.</p>
            <button type="button" id="btn-config-desde-vacio" class="btn-naranja">Configurar mis cursos ahora</button>
          </div>
        `;
        const btnCfg = document.getElementById("btn-config-desde-vacio");
        if (btnCfg) btnCfg.addEventListener("click", abrirEditorPerfil);
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
    }

    const disp = new Set(u.disponibilidad || []);
    if (textoFranjas) {
      textoFranjas.textContent = `${disp.size} de 15 franjas abiertas`;
    }

    if (grillaDispPerfil) {
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
    if (!u || !contenedorCandidato) return;

    const rel = obtenerRelaciones(u.id);
    const otros = obtenerOtrosUsuarios(u.id);
    const excluidos = [...(rel.matchesIds || []), ...(rel.descartadosIds || [])];
    const candidatos = obtenerCandidatosOrdenados(u, otros, categoriaActual, excluidos);

    if (contadorCandidatos) {
      contadorCandidatos.textContent = `${candidatos.length} candidatos`;
    }

    if (otros.length === 0) {
      contenedorCandidato.innerHTML = `
        <div class="vacio-app">
          <p><strong>No se encontraron matches todavía.</strong></p>
          <p>Aún no hay otras cuentas registradas en el sistema. Cierra sesión y crea otra cuenta para probar compatibilidad y hacer match.</p>
          <button type="button" id="btn-ir-crear-otra" class="btn-naranja">Cerrar sesión y crear otra cuenta</button>
        </div>
      `;
      const btnCrearOtra = document.getElementById("btn-ir-crear-otra");
      if (btnCrearOtra) {
        btnCrearOtra.addEventListener("click", () => {
          estado.sesionActivaId = null;
          guardarEstado(estado);
          sincronizarSesionUI();
        });
      }
      return;
    }

    if (candidatos.length === 0) {
      contenedorCandidato.innerHTML = `
        <div class="vacio-app">
          <p><strong>No se encontraron matches en ${categoriaActual}.</strong></p>
          <p>Ya revisaste los perfiles disponibles en esta categoría o no hay compañeros en este rubro.</p>
          <button type="button" id="btn-reiniciar-cola" class="btn-naranja">Revisar perfiles descartados</button>
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
          <p class="candidato-bio">${cand.bio || "Estudiante registrado en UniMatch."}</p>
          <div class="candidato-bio">
            <strong>Te puede enseñar (${actual.porcentaje}%):</strong>
            ${actual.bEnsenaAA.length > 0 ? actual.bEnsenaAA.join(", ") : "Ninguno de tus cursos necesitados"}
          </div>
          <div class="candidato-bio">
            <strong>Tú le puedes enseñar:</strong>
            ${actual.aEnsenaAB.length > 0 ? actual.aEnsenaAB.join(", ") : "—"}
          </div>
          <div class="chips-wrap">
            ${
              (cand.cursosDomina || []).length > 0
                ? cand.cursosDomina.map((et) => `<span class="chip-interes domina">Domina: ${et}</span>`).join("")
                : `<span class="chip-interes">Sin cursos dominados aún</span>`
            }
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
      mostrarVistaUnica("vista-chats");
    });
  }

  // --- VISTA CHATS ---
  const headerChat = document.getElementById("header-chat-activo");
  const listaContactosChat = document.getElementById("lista-contactos-chat");
  const mensajesBox = document.getElementById("mensajes-chat");
  const formPlan = document.getElementById("form-plan");
  const formMensaje = document.getElementById("form-mensaje");

  const btnTogglePlan = document.getElementById("btn-toggle-plan");
  if (btnTogglePlan && formPlan) {
    btnTogglePlan.addEventListener("click", () => {
      formPlan.hidden = !formPlan.hidden;
    });
  }

  if (formPlan) {
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
  }

  if (formMensaje) {
    formMensaje.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = obtenerUsuarioActual();
      if (!u) return;
      const rel = obtenerRelaciones(u.id);
      const input = document.getElementById("input-mensaje");
      const texto = input ? input.value.trim() : "";
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
  }

  function renderChats() {
    const u = obtenerUsuarioActual();
    if (!u || !mensajesBox) return;

    const rel = obtenerRelaciones(u.id);
    const otros = obtenerOtrosUsuarios(u.id);
    const contactos = otros.filter((x) => (rel.matchesIds || []).includes(x.id));

    if (contactos.length === 0) {
      if (headerChat) headerChat.innerHTML = `<strong>Chats</strong><span class="badge-suave">0 matches</span>`;
      if (listaContactosChat) listaContactosChat.innerHTML = `<span class="ayuda-mini">Sin conversaciones</span>`;
      mensajesBox.innerHTML = `
        <div class="vacio-app">
          <p><strong>No hay conversaciones activas todavía.</strong></p>
          <p>Aún no has hecho match con nadie. Ve a <strong>Matches</strong> y acepta un perfil para abrir su chat.</p>
          <button type="button" id="btn-ir-matches-chat" class="btn-naranja">Ir a Matches</button>
        </div>
      `;
      const btnIrM = document.getElementById("btn-ir-matches-chat");
      if (btnIrM) btnIrM.addEventListener("click", () => mostrarVistaUnica("vista-matches"));
      return;
    }

    if (!contactos.some((c) => c.id === rel.chatActivoId)) {
      rel.chatActivoId = contactos[0].id;
    }

    const activo = contactos.find((c) => c.id === rel.chatActivoId) || contactos[0];
    if (headerChat) {
      headerChat.innerHTML = `
        <div class="chat-usuario-info">
          <div class="avatar-sm">${obtenerIniciales(activo.nombre)}</div>
          <div>
            <div style="font-weight:800;font-size:0.92rem;">${activo.nombre}</div>
            <div class="estado-linea">En línea · ${activo.contacto}</div>
          </div>
        </div>
      `;
    }

    if (listaContactosChat) {
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
    }

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
    if (!u || !matrizComparacion) return;

    const otros = obtenerOtrosUsuarios(u.id);
    if (otros.length === 0) {
      if (tabsComparar) tabsComparar.innerHTML = `<span class="ayuda-mini">Sin compañeros registrados</span>`;
      matrizComparacion.innerHTML = `
        <div class="vacio-app">
          <p><strong>No hay compañeros para comparar horarios todavía.</strong></p>
          <p>Cuando exista otra cuenta registrada, aquí verás qué bloques de Lunes a Viernes coinciden libres.</p>
        </div>
      `;
      if (resumenCruce) resumenCruce.innerHTML = `<div>0 franjas coincidentes · Marca tu disponibilidad en <strong>Perfil</strong>.</div>`;
      return;
    }

    if (!otros.some((x) => x.id === compararConId)) {
      compararConId = otros[0].id;
    }

    if (tabsComparar) {
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
    }

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

    if (resumenCruce) {
      resumenCruce.innerHTML = `
        <div><strong>${resultado.coincidentes} franjas coincidentes</strong> con ${otro.nombre}</div>
        <div class="leyenda-cruce">
          <span>🟧 Ambos libres</span>
          <span>⬜ Solo uno libre</span>
          <span>⬛ No disponible</span>
        </div>
      `;
    }
  }

  // --- VISTA SESIONES ---
  const listaSesiones = document.getElementById("lista-sesiones");
  const formNuevaSesion = document.getElementById("form-nueva-sesion");
  const selectSesionCurso = document.getElementById("select-sesion-curso");

  if (selectSesionCurso) {
    selectSesionCurso.innerHTML = CURSOS_BASE.map((c) => `<option value="${c}">${c}</option>`).join("");
  }

  const btnToggleNuevaSesion = document.getElementById("btn-toggle-nueva-sesion");
  if (btnToggleNuevaSesion && formNuevaSesion) {
    btnToggleNuevaSesion.addEventListener("click", () => {
      const vaAAbrirse = formNuevaSesion.hidden;
      formNuevaSesion.hidden = !vaAAbrirse;
      formNuevaSesion.style.display = vaAAbrirse ? "flex" : "none";
    });
  }

  if (formNuevaSesion) {
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
      formNuevaSesion.style.display = "none";
      guardarEstado(estado);
      renderSesiones();
    });
  }

  function renderSesiones() {
    const u = obtenerUsuarioActual();
    if (!u || !listaSesiones) return;

    listaSesiones.innerHTML = "";
    if (!estado.sesiones || estado.sesiones.length === 0) {
      listaSesiones.innerHTML = `
        <div class="vacio-app">
          <p><strong>No hay sesiones creadas todavía.</strong></p>
          <p>Crea la primera sesión de estudio o repaso para coordinar con tus compañeros.</p>
          <button type="button" id="btn-crear-sesion-vacio" class="btn-naranja">+ Crear primera sesión</button>
        </div>
      `;
      const btnCrearS = document.getElementById("btn-crear-sesion-vacio");
      if (btnCrearS && formNuevaSesion) {
        btnCrearS.addEventListener("click", () => {
          formNuevaSesion.hidden = false;
          formNuevaSesion.style.display = "flex";
        });
      }
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
