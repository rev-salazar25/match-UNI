document.addEventListener("DOMContentLoaded", async () => {
  let estado = await cargarEstadoRemoto();
  let categoriaActual = "Estudio";
  let compararConId = null;
  let modoAcceso = "login";
  let vistaActivaId = "vista-acceso";
  let perfilModalUsuarioId = null;

  const CURSOS_RESPALDO = [
    "Cálculo Diferencial",
    "Cálculo Integral",
    "Cálculo Vectorial",
    "Química General",
    "Programación I (C++)",
    "Estructuras de Datos / Lisp",
    "Análisis y Diseño de Sistemas",
    "Redacción y Comunicación"
  ];

  function obtenerListaCursos() {
    if (typeof CURSOS_BASE !== "undefined" && Array.isArray(CURSOS_BASE) && CURSOS_BASE.length > 0) {
      return CURSOS_BASE;
    }
    return CURSOS_RESPALDO;
  }

  const vistas = document.querySelectorAll(".vista");
  const navItems = document.querySelectorAll(".nav-item");
  const barraNav = document.getElementById("barra-nav-principal");
  const indicadorCuentaTop = document.getElementById("indicador-cuenta-top");
  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

  const tituloAcceso = document.getElementById("titulo-acceso");
  const tabModoLogin = document.getElementById("tab-modo-login");
  const tabModoRegistro = document.getElementById("tab-modo-registro");
  const panelIniciarSesion = document.getElementById("panel-iniciar-sesion");
  const panelCrearCuenta = document.getElementById("panel-crear-cuenta");
  const formIniciarSesion = document.getElementById("form-iniciar-sesion");
  const errorFormLogin = document.getElementById("error-form-login");
  const errorFormRegistro = document.getElementById("error-form-registro");

  function obtenerUsuarioActual() {
    if (!estado || !estado.sesionActivaId) return null;
    return (estado.cuentas || []).find((c) => Number(c.id) === Number(estado.sesionActivaId)) || null;
  }

  function obtenerOtrosUsuarios(usuarioId) {
    return (estado.cuentas || []).filter((c) => Number(c.id) !== Number(usuarioId));
  }

  function obtenerRelaciones(usuarioId) {
    const key = Number(usuarioId);
    if (!estado.relacionesPorUsuario) {
      estado.relacionesPorUsuario = {};
    }
    if (!estado.relacionesPorUsuario[key]) {
      estado.relacionesPorUsuario[key] = {
        matchesIds: [],
        descartadosIds: [],
        chatActivoId: null,
        conversaciones: {}
      };
    }
    if (!estado.relacionesPorUsuario[key].conversaciones) {
      estado.relacionesPorUsuario[key].conversaciones = {};
    }
    return estado.relacionesPorUsuario[key];
  }

  function obtenerMensajesDeConversacion(rel, otroId) {
    const convs = rel.conversaciones || {};
    const lista = convs[String(otroId)] || convs[Number(otroId)] || [];
    return Array.isArray(lista) ? lista : [];
  }

  function obtenerIniciales(nombre) {
    return (nombre || "U")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => (p[0] ? p[0].toUpperCase() : ""))
      .join("") || "U";
  }

  function obtenerRutaBannerCategoria(categoria) {
    const mapa = {
      Estudio: "./assets/img/Banner-Estudio.jpg",
      Actividades: "./assets/img/Banner-Actividades.jpg",
      Networking: "./assets/img/Banner-Networking.jpg"
    };
    return mapa[categoria] || mapa.Estudio;
  }

  function formatearDisponibilidadTexto(dispArray) {
    const setDisp = new Set(dispArray || []);
    if (setDisp.size === 0) return "Sin franjas marcadas aún.";
    const dias = (typeof DIAS_SEMANA !== "undefined" && DIAS_SEMANA) || ["Lun", "Mar", "Mié", "Jue", "Vie"];
    const turnos = (typeof TURNOS_DIA !== "undefined" && TURNOS_DIA) || ["Mañana", "Tarde", "Noche"];
    return [...setDisp]
      .sort((a, b) => a - b)
      .map((idx) => `${dias[idx % 5]} (${turnos[Math.floor(idx / 5)]})`)
      .join(", ");
  }

  function asegurarModalPerfilUsuario() {
    let modal = document.getElementById("modal-perfil-usuario");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "modal-perfil-usuario";
    modal.className = "modal-perfil-overlay";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal-perfil-card" role="dialog" aria-modal="true" aria-labelledby="modal-perfil-titulo">
        <div class="modal-perfil-top">
          <h3 id="modal-perfil-titulo">Perfil del compañero</h3>
          <button type="button" id="btn-cerrar-modal-perfil" class="btn-gris" style="padding:0.4rem 0.75rem;">✕</button>
        </div>
        <div id="modal-perfil-cuerpo" class="modal-perfil-cuerpo"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrarModalPerfilUsuario();
    });
    document.getElementById("btn-cerrar-modal-perfil").addEventListener("click", cerrarModalPerfilUsuario);

    return modal;
  }

  function cerrarModalPerfilUsuario() {
    const modal = document.getElementById("modal-perfil-usuario");
    if (!modal) return;
    perfilModalUsuarioId = null;
    modal.hidden = true;
    modal.style.display = "none";
  }

  async function eliminarMatchUsuario(objetivoId) {
    const u = obtenerUsuarioActual();
    if (!u) return;
    const rel = obtenerRelaciones(u.id);
    const idNum = Number(objetivoId);

    rel.matchesIds = (rel.matchesIds || []).map(Number).filter((id) => id !== idNum);
    if (Number(rel.chatActivoId) === idNum) {
      rel.chatActivoId = rel.matchesIds.length > 0 ? Number(rel.matchesIds[0]) : null;
    }

    cerrarModalPerfilUsuario();
    await guardarRelacionRemota(u.id, rel);
    estado = await cargarEstadoRemoto();
    estado.sesionActivaId = u.id;

    if (vistaActivaId === "vista-chats") renderChats();
    if (vistaActivaId === "vista-matches") renderMatches();
  }

  function abrirModalPerfilUsuario(usuarioObjetivo) {
    if (!usuarioObjetivo) return;
    perfilModalUsuarioId = Number(usuarioObjetivo.id);
    const modal = asegurarModalPerfilUsuario();
    const cuerpo = document.getElementById("modal-perfil-cuerpo");
    const uActual = obtenerUsuarioActual();
    const rel = uActual ? obtenerRelaciones(uActual.id) : null;
    const esMatch = rel ? (rel.matchesIds || []).map(Number).includes(Number(usuarioObjetivo.id)) : false;

    const dom = usuarioObjetivo.cursosDomina || [];
    const nec = usuarioObjetivo.cursosNecesita || [];

    cuerpo.innerHTML = `
      <div
        class="banner-perfil-visual"
        style="background-image: url('${obtenerRutaBannerCategoria(usuarioObjetivo.categoria)}');"
      >
        <span class="banner-perfil-etiqueta">${usuarioObjetivo.categoria || "Estudio"}</span>
        <span class="banner-perfil-sub">${usuarioObjetivo.ciclo || "UNI"}</span>
      </div>

      <div class="perfil-cabecera">
        <div class="avatar-iniciales">${obtenerIniciales(usuarioObjetivo.nombre)}</div>
        <div>
          <div class="perfil-nombre">${usuarioObjetivo.nombre} <span class="verificado-dot">●</span></div>
          <div class="perfil-procedencia">${usuarioObjetivo.procedencia || "UNI"}</div>
        </div>
      </div>

      <div class="perfil-meta-pills">
        <span class="pill-dato">${usuarioObjetivo.carrera}</span>
        <span class="pill-dato">${usuarioObjetivo.ciclo}</span>
        ${usuarioObjetivo.genero && usuarioObjetivo.genero !== "No especificado" ? `<span class="pill-dato">${usuarioObjetivo.genero}</span>` : ""}
        <span class="pill-dato">${usuarioObjetivo.contacto}</span>
      </div>

      <div class="bloque-detalle-perfil">
        <h4>Descripción</h4>
        <p class="perfil-bio">${usuarioObjetivo.bio || "Este compañero aún no agregó una descripción."}</p>
      </div>

      <div class="bloque-detalle-perfil">
        <h4>Cursos que domina y necesita</h4>
        <div class="chips-wrap">
          ${
            dom.length === 0 && nec.length === 0
              ? `<span class="ayuda-mini">Sin cursos registrados aún.</span>`
              : [
                  ...dom.map((c) => `<span class="chip-interes domina">Domina: ${c}</span>`),
                  ...nec.map((c) => `<span class="chip-interes">Necesita: ${c}</span>`)
                ].join("")
          }
        </div>
      </div>

      <div class="bloque-detalle-perfil">
        <h4>Disponibilidad semanal</h4>
        <p class="perfil-bio">${formatearDisponibilidadTexto(usuarioObjetivo.disponibilidad)}</p>
      </div>

      ${
        esMatch
          ? `
        <div class="fila-botones" style="margin-top:0.35rem;">
          <button type="button" id="btn-confirmar-eliminar-match" class="btn-peligro-match">
            Eliminar match
          </button>
        </div>
      `
          : ""
      }
    `;

    modal.hidden = false;
    modal.style.display = "flex";

    const btnEliminar = document.getElementById("btn-confirmar-eliminar-match");
    if (btnEliminar) {
      btnEliminar.addEventListener("click", async () => {
        const seguro = window.confirm(`¿Deseas eliminar tu match con ${usuarioObjetivo.nombre}?`);
        if (!seguro) return;
        await eliminarMatchUsuario(usuarioObjetivo.id);
      });
    }
  }

  function cambiarModoAcceso(nuevoModo) {
    modoAcceso = nuevoModo;
    const esLogin = modoAcceso === "login";

    if (tituloAcceso) {
      tituloAcceso.textContent = esLogin ? "Iniciar Sesión" : "Crear cuenta";
    }
    if (tabModoLogin) {
      tabModoLogin.classList.toggle("activa", esLogin);
    }
    if (tabModoRegistro) {
      tabModoRegistro.classList.toggle("activa", !esLogin);
    }
    if (panelIniciarSesion) {
      panelIniciarSesion.hidden = !esLogin;
      panelIniciarSesion.style.display = esLogin ? "flex" : "none";
    }
    if (panelCrearCuenta) {
      panelCrearCuenta.hidden = esLogin;
      panelCrearCuenta.style.display = !esLogin ? "flex" : "none";
    }
    if (errorFormLogin) {
      errorFormLogin.hidden = true;
    }
    if (errorFormRegistro) {
      errorFormRegistro.hidden = true;
    }
  }

  if (tabModoLogin) {
    tabModoLogin.addEventListener("click", () => cambiarModoAcceso("login"));
  }
  if (tabModoRegistro) {
    tabModoRegistro.addEventListener("click", () => cambiarModoAcceso("registro"));
  }

  function mostrarVistaUnica(idVista) {
    vistaActivaId = idVista;
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
      cambiarModoAcceso(modoAcceso);
      mostrarVistaUnica("vista-acceso");
    } else {
      if (indicadorCuentaTop) indicadorCuentaTop.textContent = u.nombre;
      if (btnCerrarSesion) btnCerrarSesion.hidden = false;
      if (barraNav) barraNav.hidden = false;
      mostrarVistaUnica("vista-perfil");
    }
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!obtenerUsuarioActual()) {
        mostrarVistaUnica("vista-acceso");
        return;
      }
      const sesionActual = estado.sesionActivaId;
      estado = await cargarEstadoRemoto();
      estado.sesionActivaId = sesionActual;
      mostrarVistaUnica(btn.dataset.vista);
    });
  });

  const formCrearCuenta = document.getElementById("form-crear-cuenta");
  const bloqueCuentasExistentes = document.getElementById("bloque-cuentas-existentes");
  const listaCuentasExistentes = document.getElementById("lista-cuentas-existentes");

  function renderAcceso() {
    if (!bloqueCuentasExistentes || !listaCuentasExistentes) return;

    if (estado.cuentas && estado.cuentas.length > 0) {
      bloqueCuentasExistentes.hidden = false;
      listaCuentasExistentes.innerHTML = "";
      estado.cuentas.forEach((cuenta) => {
        const pill = document.createElement("span");
        pill.className = "pill-dato";
        pill.textContent = `${cuenta.nombre} · ${cuenta.ciclo}`;
        listaCuentasExistentes.appendChild(pill);
      });
    } else {
      bloqueCuentasExistentes.hidden = true;
      listaCuentasExistentes.innerHTML = "";
    }
  }

  if (formIniciarSesion) {
    formIniciarSesion.addEventListener("submit", async (e) => {
      e.preventDefault();
      estado = await cargarEstadoRemoto();
      const contactoIngresado = document.getElementById("login-contacto").value.trim().toLowerCase();
      const passwordIngresado = document.getElementById("login-password").value;

      const cuentaEncontrada = (estado.cuentas || []).find(
        (c) =>
          c.contacto.trim().toLowerCase() === contactoIngresado &&
          c.password === passwordIngresado
      );

      if (!cuentaEncontrada) {
        if (errorFormLogin) {
          errorFormLogin.textContent = "Correo/número o contraseña incorrectos. Verifica tus datos o crea una cuenta.";
          errorFormLogin.hidden = false;
        }
        return;
      }

      if (errorFormLogin) errorFormLogin.hidden = true;
      formIniciarSesion.reset();
      estado.sesionActivaId = cuentaEncontrada.id;
      await guardarSesionActivaLocal(cuentaEncontrada.id);
      sincronizarSesionUI();
    });
  }

  if (formCrearCuenta) {
    formCrearCuenta.addEventListener("submit", async (e) => {
      e.preventDefault();
      estado = await cargarEstadoRemoto();
      const contactoLimpio = document.getElementById("reg-contacto").value.trim().toLowerCase();
      const yaExiste = (estado.cuentas || []).some(
        (c) => c.contacto.trim().toLowerCase() === contactoLimpio
      );

      if (yaExiste) {
        if (errorFormRegistro) {
          errorFormRegistro.textContent = "Ese correo o número ya está registrado. Ve a Iniciar Sesión.";
          errorFormRegistro.hidden = false;
        }
        return;
      }

      if (errorFormRegistro) errorFormRegistro.hidden = true;

      try {
        const nueva = await registrarCuentaRemota({
          nombre: document.getElementById("reg-nombre").value,
          procedencia: document.getElementById("reg-procedencia").value,
          ciclo: document.getElementById("reg-ciclo").value,
          carrera: document.getElementById("reg-carrera").value,
          contacto: document.getElementById("reg-contacto").value,
          password: document.getElementById("reg-password").value,
          categoria: document.getElementById("reg-categoria").value,
          genero: document.getElementById("reg-genero") ? document.getElementById("reg-genero").value : "No especificado",
          bio: document.getElementById("reg-bio").value
        });
        estado = await cargarEstadoRemoto();
        estado.sesionActivaId = nueva.id;
        formCrearCuenta.reset();
        sincronizarSesionUI();
      } catch (err) {
        if (errorFormRegistro) {
          errorFormRegistro.textContent = "Detalle del error: " + (err.message || err);
          errorFormRegistro.hidden = false;
        }
      }
    });
  }

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", async () => {
      estado.sesionActivaId = null;
      await guardarSesionActivaLocal(null);
      sincronizarSesionUI();
    });
  }

  const tarjetaPerfil = document.getElementById("tarjeta-perfil-actual");
  const chipsCursos = document.getElementById("chips-perfil-cursos");
  const badgeCursosCount = document.getElementById("badge-cursos-count");
  const grillaDispPerfil = document.getElementById("grilla-disponibilidad-perfil");
  const textoFranjas = document.getElementById("texto-franjas-abiertas");

  function asegurarPanelEditorPerfil() {
    let panel = document.getElementById("panel-editor-perfil");
    if (!panel) {
      const vistaPerfil = document.getElementById("vista-perfil") || document.body;
      panel = document.createElement("section");
      panel.id = "panel-editor-perfil";
      panel.className = "panel-editor";
      panel.hidden = true;
      panel.innerHTML = `
        <div class="bloque-titulo-fila">
          <h3>Editar mis cursos (domino / necesito)</h3>
          <button type="button" id="btn-cancelar-edicion" class="btn-gris">Cerrar</button>
        </div>
        <p class="ayuda-mini">Marca los cursos que dominas para ayudar a otros y los que necesitas reforzar.</p>
        <form id="form-perfil-completo" class="form-app">
          <div class="grupo-checks">
            <span class="label-grupo">Cursos que domino</span>
            <div id="checks-domina" class="checks-grid"></div>
          </div>
          <div class="grupo-checks">
            <span class="label-grupo">Cursos que necesito</span>
            <div id="checks-necesita" class="checks-grid"></div>
          </div>
          <div id="error-form-perfil" class="alerta-error" hidden></div>
          <div class="fila-botones">
            <button type="submit" class="btn-naranja">Guardar cursos</button>
          </div>
        </form>
      `;
      vistaPerfil.appendChild(panel);
    }

    if (!panel.dataset.enlazado) {
      panel.dataset.enlazado = "1";
      const btnCerrar = panel.querySelector("#btn-cancelar-edicion");
      if (btnCerrar) {
        btnCerrar.addEventListener("click", cerrarEditorPerfil);
      }

      const formEd = panel.querySelector("#form-perfil-completo");
      if (formEd) {
        formEd.addEventListener("submit", async (e) => {
          e.preventDefault();
          const uActual = obtenerUsuarioActual();
          if (!uActual) return;
          const domCont = panel.querySelector("#checks-domina");
          const necCont = panel.querySelector("#checks-necesita");
          const errCont = panel.querySelector("#error-form-perfil");
          const domina = [...domCont.querySelectorAll("input:checked")].map((i) => i.value);
          const necesita = [...necCont.querySelectorAll("input:checked")].map((i) => i.value);

          const repetidos = domina.filter((c) => necesita.includes(c));
          if (repetidos.length > 0) {
            if (errCont) {
              errCont.textContent = `No marques el mismo curso en domino y necesito: ${repetidos.join(", ")}`;
              errCont.hidden = false;
            }
            return;
          }

          uActual.cursosDomina = domina;
          uActual.cursosNecesita = necesita;
          await actualizarCuentaRemota(uActual);
          cerrarEditorPerfil();
          renderPerfil();
        });
      }
    }

    return panel;
  }

  function poblarCheckboxesEditor(usuario) {
    const panel = asegurarPanelEditorPerfil();
    const domCont = panel.querySelector("#checks-domina");
    const necCont = panel.querySelector("#checks-necesita");
    if (!domCont || !necCont) return;

    domCont.innerHTML = "";
    necCont.innerHTML = "";

    obtenerListaCursos().forEach((curso) => {
      const lblD = document.createElement("label");
      lblD.className = "check-item";
      const chkD = document.createElement("input");
      chkD.type = "checkbox";
      chkD.value = curso;
      chkD.checked = (usuario.cursosDomina || []).includes(curso);
      lblD.append(chkD, document.createTextNode(curso));
      domCont.appendChild(lblD);

      const lblN = document.createElement("label");
      lblN.className = "check-item";
      const chkN = document.createElement("input");
      chkN.type = "checkbox";
      chkN.value = curso;
      chkN.checked = (usuario.cursosNecesita || []).includes(curso);
      lblN.append(chkN, document.createTextNode(curso));
      necCont.appendChild(lblN);
    });
  }

  function abrirEditorPerfil() {
    const u = obtenerUsuarioActual();
    const panel = asegurarPanelEditorPerfil();
    if (!u || !panel) return;
    poblarCheckboxesEditor(u);
    const errCont = panel.querySelector("#error-form-perfil");
    if (errCont) errCont.hidden = true;
    panel.hidden = false;
    panel.style.display = "flex";
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cerrarEditorPerfil() {
    const panel = document.getElementById("panel-editor-perfil");
    if (!panel) return;
    panel.hidden = true;
    panel.style.display = "none";
  }

  const btnEditarPerfilRapido = document.getElementById("btn-editar-perfil-rapido");
  if (btnEditarPerfilRapido) {
    btnEditarPerfilRapido.addEventListener("click", abrirEditorPerfil);
  }

  function renderPerfil() {
    const u = obtenerUsuarioActual();
    if (!u) {
      mostrarVistaUnica("vista-acceso");
      return;
    }

    const dom = u.cursosDomina || [];
    const nec = u.cursosNecesita || [];
    const totalCursos = new Set([...dom, ...nec]).size;

    if (tarjetaPerfil) {
      tarjetaPerfil.style.display = "flex";
      tarjetaPerfil.innerHTML = `
        <div
          class="banner-perfil-visual"
          style="background-image: url('${obtenerRutaBannerCategoria(u.categoria)}');"
        >
          <span class="banner-perfil-etiqueta">Modo activo · ${u.categoria || "Estudio"}</span>
          <span class="banner-perfil-sub">${totalCursos} cursos · ${(u.disponibilidad || []).length} franjas</span>
        </div>
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
          ${u.genero && u.genero !== "No especificado" ? `<span class="pill-dato">${u.genero}</span>` : ""}
          <span class="pill-dato">${u.contacto}</span>
        </div>
        <p class="perfil-bio">${u.bio || "Cuenta activa en UniMatch. Configura tus cursos y disponibilidad cuando quieras."}</p>
      `;
    }

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
      const diasFallback = ["Lun", "Mar", "Mié", "Jue", "Vie"];
      const turnosFallback = ["Mañana", "Tarde", "Noche"];

      for (let i = 0; i < 15; i++) {
        const dia = (typeof DIAS_SEMANA !== "undefined" && DIAS_SEMANA[i % 5]) || diasFallback[i % 5];
        const turno = (typeof TURNOS_DIA !== "undefined" && TURNOS_DIA[Math.floor(i / 5)]) || turnosFallback[Math.floor(i / 5)];
        const estaLibre = disp.has(i);

        const bloque = document.createElement("button");
        bloque.type = "button";
        bloque.className = `franja-bloque ${estaLibre ? "activa" : ""}`;
        bloque.setAttribute("aria-pressed", String(estaLibre));
        bloque.title = `${dia} · ${turno} — ${estaLibre ? "Disponible" : "No marcado"}`;
        bloque.innerHTML = `
          <span class="franja-dia">${dia}</span>
          <span class="franja-turno">${turno}</span>
          <span class="franja-estado">${estaLibre ? "Libre ✓" : "Marcar"}</span>
        `;

        bloque.addEventListener("click", async () => {
          if (disp.has(i)) {
            disp.delete(i);
          } else {
            disp.add(i);
          }
          u.disponibilidad = [...disp].sort((a, b) => a - b);
          renderPerfil();
          await actualizarCuentaRemota(u);
        });

        grillaDispPerfil.appendChild(bloque);
      }

      const bloqueDisp = grillaDispPerfil.closest(".bloque-app");
      if (bloqueDisp && !bloqueDisp.querySelector(".mascota-calendario-wrap")) {
        const decor = document.createElement("div");
        decor.className = "mascota-calendario-wrap";
        decor.innerHTML = `
          <img
            src="./assets/img/calendario-yui.jpg"
            alt="Decoración de disponibilidad semanal"
            class="mascota-calendario-img"
            onerror="this.parentElement.style.display='none'"
          />
          <span class="mascota-calendario-nota">¡Marca tus bloques libres!</span>
        `;
        bloqueDisp.appendChild(decor);
      }
    }
  }

  const contenedorCandidato = document.getElementById("contenedor-candidato-match");
  const contadorCandidatos = document.getElementById("contador-candidatos");
  const tabsCat = document.querySelectorAll(".tab-cat:not([data-modo])");

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
          <p>Aún no hay otras cuentas registradas. Comparte el enlace para que otros compañeros creen su cuenta y aparezcan aquí.</p>
          <div style="display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap;margin-top:0.2rem;">
            <button type="button" id="btn-ir-perfil-vacio" class="btn-naranja" style="flex:0 1 auto;">Completar mi perfil</button>
          </div>
        </div>
      `;
      const btnPerfilVacio = document.getElementById("btn-ir-perfil-vacio");
      if (btnPerfilVacio) {
        btnPerfilVacio.addEventListener("click", () => mostrarVistaUnica("vista-perfil"));
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
        btnReinicio.addEventListener("click", async () => {
          rel.descartadosIds = [];
          renderMatches();
          await guardarRelacionRemota(u.id, rel);
        });
      }
      return;
    }

    const actual = candidatos[0];
    const cand = actual.candidato;
    const imgPortada = obtenerRutaBannerCategoria(cand.categoria);

    contenedorCandidato.innerHTML = `
      <article class="tarjeta-candidato">
        <div class="portada-candidato" style="background-image: url('${imgPortada}');">
          <span class="badge-coincidencias">${actual.porcentaje}% compatibilidad</span>
          <span class="badge-categoria-card">${cand.categoria}</span>
          <div class="portada-iniciales-respaldo">${obtenerIniciales(cand.nombre)}</div>
        </div>
        <div class="cuerpo-candidato">
          <div class="candidato-titulo">
            <span class="candidato-nombre">${cand.nombre}</span>
            <span class="candidato-ciclo">${cand.ciclo}${cand.genero && cand.genero !== "No especificado" ? ` · ${cand.genero}` : ""}</span>
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

    document.getElementById("btn-swipe-x").addEventListener("click", async () => {
      rel.descartadosIds.push(cand.id);
      renderMatches();
      await guardarRelacionRemota(u.id, rel);
    });

    document.getElementById("btn-swipe-check").addEventListener("click", async () => {
      if (!rel.matchesIds.includes(cand.id)) {
        rel.matchesIds.push(cand.id);
      }
      if (!Array.isArray(rel.conversaciones[String(cand.id)])) {
        rel.conversaciones[String(cand.id)] = [];
      }
      rel.chatActivoId = cand.id;
      await guardarRelacionRemota(u.id, rel);
      mostrarVistaUnica("vista-chats");
    });
  }

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
    formPlan.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = obtenerUsuarioActual();
      if (!u) return;
      const rel = obtenerRelaciones(u.id);
      const lugar = document.getElementById("input-plan-lugar").value.trim();
      const hora = document.getElementById("input-plan-hora").value.trim();
      if (!lugar || !hora || !rel.chatActivoId) return;

      const destinoId = Number(rel.chatActivoId);
      const nuevoPlan = {
        id: Date.now(),
        tipo: "plan",
        lugar,
        hora,
        estado: "Confirmado"
      };

      document.getElementById("input-plan-lugar").value = "";
      document.getElementById("input-plan-hora").value = "";
      formPlan.hidden = true;

      const resultado = await enviarMensajeEntreUsuarios(u.id, destinoId, nuevoPlan);
      estado.relacionesPorUsuario[Number(u.id)] = resultado.relRemitente;
      estado.relacionesPorUsuario[destinoId] = resultado.relDestinatario;
      renderChats();
    });
  }

  if (formMensaje) {
    formMensaje.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = obtenerUsuarioActual();
      if (!u) return;
      const rel = obtenerRelaciones(u.id);
      const input = document.getElementById("input-mensaje");
      const texto = input ? input.value.trim() : "";
      if (!texto || !rel.chatActivoId) return;

      const destinoId = Number(rel.chatActivoId);
      const nuevoMsg = {
        id: Date.now(),
        tipo: "mio",
        texto
      };

      input.value = "";

      const resultado = await enviarMensajeEntreUsuarios(u.id, destinoId, nuevoMsg);
      estado.relacionesPorUsuario[Number(u.id)] = resultado.relRemitente;
      estado.relacionesPorUsuario[destinoId] = resultado.relDestinatario;
      renderChats();
    });
  }

  function renderChats() {
    const u = obtenerUsuarioActual();
    if (!u || !mensajesBox) return;

    const rel = obtenerRelaciones(u.id);
    const otros = obtenerOtrosUsuarios(u.id);
    const contactos = otros.filter((x) => (rel.matchesIds || []).map(Number).includes(Number(x.id)));

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

    if (!contactos.some((c) => Number(c.id) === Number(rel.chatActivoId))) {
      rel.chatActivoId = Number(contactos[0].id);
    }

    const activo = contactos.find((c) => Number(c.id) === Number(rel.chatActivoId)) || contactos[0];
    if (headerChat) {
      headerChat.innerHTML = `
        <div class="chat-usuario-info">
          <div class="avatar-sm">${obtenerIniciales(activo.nombre)}</div>
          <div>
            <div style="font-weight:800;font-size:0.92rem;">${activo.nombre}</div>
            <div class="estado-linea">Match · ${activo.contacto}</div>
          </div>
        </div>
        <div class="chat-acciones-match">
          <button type="button" id="btn-ver-perfil-match" class="btn-mini">Ver perfil</button>
          <button type="button" id="btn-eliminar-match-chat" class="btn-peligro-sm">Eliminar match</button>
        </div>
      `;

      const btnVerPerfil = document.getElementById("btn-ver-perfil-match");
      if (btnVerPerfil) {
        btnVerPerfil.addEventListener("click", () => abrirModalPerfilUsuario(activo));
      }

      const btnEliminarMatch = document.getElementById("btn-eliminar-match-chat");
      if (btnEliminarMatch) {
        btnEliminarMatch.addEventListener("click", async () => {
          const seguro = window.confirm(`¿Deseas eliminar tu match con ${activo.nombre}?`);
          if (!seguro) return;
          await eliminarMatchUsuario(activo.id);
        });
      }
    }

    if (listaContactosChat) {
      listaContactosChat.innerHTML = "";
      contactos.forEach((c) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = `pill-contacto ${Number(c.id) === Number(activo.id) ? "activa" : ""}`;
        pill.textContent = c.nombre.split(" ")[0];
        pill.addEventListener("click", async () => {
          rel.chatActivoId = Number(c.id);
          renderChats();
          await guardarRelacionRemota(u.id, rel);
        });
        listaContactosChat.appendChild(pill);
      });
    }

    const msgs = obtenerMensajesDeConversacion(rel, activo.id);
    mensajesBox.innerHTML = "";

    if (msgs.length === 0) {
      mensajesBox.innerHTML = `
        <div class="vacio-app">
          <p><strong>Aún no hay mensajes con ${activo.nombre}.</strong></p>
          <p>Escribe el primer mensaje o propón un plan de estudio aquí abajo.</p>
        </div>
      `;
    } else {
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
    }

    mensajesBox.scrollTop = mensajesBox.scrollHeight;
  }

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
          <p>Cuando otros compañeros se registren, aquí verás qué bloques de Lunes a Viernes coinciden libres.</p>
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
          <span>🟦 Ambos libres</span>
          <span>⬜ Solo uno libre</span>
          <span>⬛ No disponible</span>
        </div>
      `;
    }
  }

  const listaSesiones = document.getElementById("lista-sesiones");
  const formNuevaSesion = document.getElementById("form-nueva-sesion");
  const selectSesionCurso = document.getElementById("select-sesion-curso");

  if (selectSesionCurso) {
    selectSesionCurso.innerHTML = obtenerListaCursos().map((c) => `<option value="${c}">${c}</option>`).join("");
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
    formNuevaSesion.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = obtenerUsuarioActual();
      if (!u) return;

      const titulo = document.getElementById("input-sesion-titulo").value.trim();
      const curso = document.getElementById("select-sesion-curso").value;
      const categoria = document.getElementById("select-sesion-cat").value;
      const fechaHora = document.getElementById("input-sesion-fecha").value.trim();
      const lugar = document.getElementById("input-sesion-lugar").value.trim();

      if (!titulo || !fechaHora || !lugar) return;

      const nuevaSesion = {
        id: Date.now(),
        titulo,
        curso,
        categoria,
        fechaHora,
        lugar,
        asistentes: [u.nombre]
      };

      estado.sesiones.unshift(nuevaSesion);
      formNuevaSesion.reset();
      formNuevaSesion.hidden = true;
      formNuevaSesion.style.display = "none";
      renderSesiones();
      await crearSesionRemota(nuevaSesion);
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

      card.querySelector(".btn-unirme").addEventListener("click", async () => {
        s.asistentes = s.asistentes || [];
        if (yaUnido) {
          s.asistentes = s.asistentes.filter((n) => n !== u.nombre);
        } else {
          s.asistentes.push(u.nombre);
        }
        renderSesiones();
        await actualizarAsistentesSesionRemota(s.id, s.asistentes);
      });

      listaSesiones.appendChild(card);
    });
  }

  setInterval(async () => {
    if (!obtenerUsuarioActual()) return;
    if (["vista-matches", "vista-chats", "vista-horarios", "vista-sesiones"].includes(vistaActivaId)) {
      const sesionActual = estado.sesionActivaId;
      estado = await cargarEstadoRemoto();
      estado.sesionActivaId = sesionActual;
      if (vistaActivaId === "vista-matches") renderMatches();
      if (vistaActivaId === "vista-chats") renderChats();
      if (vistaActivaId === "vista-horarios") renderHorarios();
      if (vistaActivaId === "vista-sesiones") renderSesiones();
    }
  }, 5000);

  (function iniciarRealtimeRelaciones() {
    if (typeof WebSocket === "undefined") return;

    const wsUrl = SUPABASE_URL.replace(/^https?:\/\//, "wss://") +
      `/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}&vsn=1.0.0`;

    let socket;
    let pingTimer;

    function conectar() {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send(JSON.stringify({
          topic: "realtime:public:relaciones",
          event: "phx_join",
          payload: {
            config: {
              postgres_changes: [{ event: "*", schema: "public", table: "relaciones" }]
            }
          },
          ref: "1"
        }));

        pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              topic: "phoenix",
              event: "heartbeat",
              payload: {},
              ref: String(Date.now())
            }));
          }
        }, 25000);
      };

      socket.onmessage = async (evento) => {
        try {
          const msg = JSON.parse(evento.data);
          if (msg.event === "postgres_changes") {
            const sesionActual = estado.sesionActivaId;
            if (!sesionActual) return;
            estado = await cargarEstadoRemoto();
            estado.sesionActivaId = sesionActual;
            if (vistaActivaId === "vista-chats") renderChats();
            if (vistaActivaId === "vista-matches") renderMatches();
          }
        } catch (err) {
          console.error("Error procesando evento Realtime:", err);
        }
      };

      socket.onclose = () => {
        clearInterval(pingTimer);
        setTimeout(conectar, 3000);
      };
    }

    conectar();
  })();

  sincronizarSesionUI();
});
