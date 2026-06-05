// ═══════════════════════════════════════
// ★ IDs RAÍZ — nunca eliminables desde la web ★
// Solo estos dos pueden gestionar la lista de admins
// ═══════════════════════════════════════
const HARDCODED_ADMIN_IDS = [
  '966402052962017321',
  '1129889778691751968'
];

const DISCORD_CONFIG = {
  client_id: '1506739511969714237',
  redirect_uri: encodeURIComponent(window.location.href.split('?')[0].split('#')[0]),
  scope: 'identify'
};

let currentUser = null;

// ═══════════════════════════════════════
// GESTIÓN DE ADMINS
// ═══════════════════════════════════════

/** Admins extra guardados en localStorage */
function getExtraAdmins() {
  try { return JSON.parse(localStorage.getItem('extra_admins') || '[]'); } catch(e) { return []; }
}
function saveExtraAdmins(list) {
  localStorage.setItem('extra_admins', JSON.stringify(list));
}

/** Todos los IDs de admin (hardcoded + extras) */
function getAllAdminIds() {
  return [...HARDCODED_ADMIN_IDS, ...getExtraAdmins().map(a => a.id)];
}

/** ¿Puede acceder al panel admin? */
function isAdmin() {
  return currentUser && getAllAdminIds().includes(currentUser.id);
}

/** ¿Es admin raíz? Solo estos dos pueden tocar la lista de admins */
function isSuperAdmin() {
  return currentUser && HARDCODED_ADMIN_IDS.includes(currentUser.id);
}

// ═══════════════════════════════════════
// DISCORD OAUTH
// ═══════════════════════════════════════
document.getElementById('btn-discord-login').addEventListener('click', function(e) {
  e.preventDefault();
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CONFIG.client_id}&redirect_uri=${DISCORD_CONFIG.redirect_uri}&response_type=token&scope=${DISCORD_CONFIG.scope}`;
  window.location.href = url;
});

async function handleDiscordCallback() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (!token) return false;
  try {
    const res = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } });
    const user = await res.json();
    currentUser = {
      id: user.id,
      username: user.username,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`
    };
    localStorage.setItem('discord_user', JSON.stringify(currentUser));
    return true;
  } catch(err) {
    showFlash('Error al obtener datos de Discord');
    return false;
  }
}

// ═══════════════════════════════════════
// FICHAS
// ═══════════════════════════════════════
function getAllFichas() {
  try { return JSON.parse(localStorage.getItem('all_fichas') || '[]'); } catch(e) { return []; }
}
function saveAllFichas(fichas) {
  localStorage.setItem('all_fichas', JSON.stringify(fichas));
}
function getFichaById(id) {
  return getAllFichas().find(f => f.id === id);
}

// ═══════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
}

function navigate(name) {
  if (name === 'admin' && !isAdmin()) { showFlash('Acceso denegado'); return; }
  updateNavAvatars();
  showPage(name);
  if (name === 'admin') renderAdminPanel();
}

function updateNavAvatars() {
  if (!currentUser) return;
  [['nav-avatar','nav-username'], ['nav2-avatar','nav2-username'], ['nav3-avatar','nav3-username'], ['nav4-avatar','nav4-username']].forEach(([avId, unId]) => {
    const av = document.getElementById(avId), un = document.getElementById(unId);
    if (av) av.src = currentUser.avatar;
    if (un) un.textContent = currentUser.username;
  });
  ['nav-admin-home','nav-admin-lore','nav-admin-ficha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin() ? 'flex' : 'none';
  });
}

function logout() {
  localStorage.removeItem('discord_user');
  currentUser = null;
  showPage('login');
}

// ═══════════════════════════════════════
// FICHA DEL JUGADOR
// ═══════════════════════════════════════
function siguientePaso() {
  const ocupacion = document.getElementById('char-ocupacion').value;
  if (!ocupacion) { showFlash('Elige una ocupación primero'); return; }
  document.getElementById('ficha-paso1').style.display = 'none';
  if (ocupacion === 'estudiante') {
    document.getElementById('ficha-paso-estudiante').style.display = 'block';
  } else if (ocupacion === 'profesor') {
    document.getElementById('ficha-paso-profesor').style.display = 'block';
  } else {
    enviarFicha();
  }
}

function volverFicha() {
  document.getElementById('ficha-paso-estudiante').style.display = 'none';
  document.getElementById('ficha-paso-profesor').style.display = 'none';
  document.getElementById('ficha-paso1').style.display = 'block';
  resetQuiz();
}

// ═══════════════════════════════════════
// QUIZ DE CASA (Estudiante)
// ═══════════════════════════════════════
const CASAS = {
  A: {
    emoji: '🦌',
    nombre: 'ELENARË',
    lema: '"En la naturaleza hallamos verdad"',
    desc: 'Sabiduría, armonía y conexión con la naturaleza definen tu camino. Eres una persona reflexiva, paciente y empática, que busca comprender antes de actuar. Tu fortaleza reside en la observación y el conocimiento profundo.'
  },
  B: {
    emoji: '🦂',
    nombre: 'CARAXES',
    lema: '"La astucia forja el destino"',
    desc: 'La determinación y la ambición impulsan tus pasos. Afrontas los desafíos de frente, piensas estratégicamente y rara vez te rindes. Tu capacidad para convertir obstáculos en oportunidades te distingue.'
  },
  C: {
    emoji: '🐺',
    nombre: 'VARNËTHIR',
    lema: '"Unidos en equilibrio, fuertes en lealtad"',
    desc: 'La lealtad, el honor y la justicia son tus pilares. Valoras a tu comunidad, defiendes lo que consideras correcto y sabes trabajar en equipo para alcanzar objetivos comunes.'
  }
};

let quizCasaResultado = null;

function calcularQuiz() {
  const conteo = { A: 0, B: 0, C: 0 };
  let sinResponder = false;

  for (let i = 1; i <= 6; i++) {
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    if (!sel) { sinResponder = true; break; }
    conteo[sel.value]++;
  }

  const errorEl = document.getElementById('quiz-error');
  if (sinResponder) {
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  // Casa ganadora (en empate, orden de prioridad A > C > B)
  const ganadora = ['A','C','B'].reduce((best, cur) => conteo[cur] > conteo[best] ? cur : best, 'A');
  quizCasaResultado = ganadora;
  const casa = CASAS[ganadora];

  document.getElementById('quiz-resultado-inner').innerHTML = `
    <div class="quiz-casa-header">
      <span class="quiz-casa-emoji">${casa.emoji}</span>
      <span class="quiz-casa-nombre">${casa.nombre}</span>
      <span class="quiz-casa-lema">${casa.lema}</span>
    </div>
    <p class="quiz-casa-desc">${casa.desc}</p>
  `;

  document.getElementById('quiz-resultado').style.display = 'block';
  document.getElementById('btn-quiz-calcular').style.display = 'none';
  document.getElementById('btn-quiz-enviar').style.display = 'inline-flex';

  // Scroll suave al resultado
  document.getElementById('quiz-resultado').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetQuiz() {
  for (let i = 1; i <= 6; i++) {
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    if (sel) sel.checked = false;
  }
  quizCasaResultado = null;
  const res = document.getElementById('quiz-resultado');
  if (res) res.style.display = 'none';
  const calcBtn = document.getElementById('btn-quiz-calcular');
  if (calcBtn) { calcBtn.style.display = 'inline-flex'; }
  const envBtn = document.getElementById('btn-quiz-enviar');
  if (envBtn) envBtn.style.display = 'none';
  const errorEl = document.getElementById('quiz-error');
  if (errorEl) errorEl.style.display = 'none';
}

function enviarFicha() {
  const data = {
    id: 'ficha_' + Date.now() + '_' + Math.random().toString(36).substr(2,6),
    discord_id: document.getElementById('char-discord-id').value || currentUser?.id || '',
    discord_username: currentUser?.username || '',
    steam_id: document.getElementById('char-steam-id').value,
    nombre: document.getElementById('char-nombre').value,
    apellido: document.getElementById('char-apellido').value,
    fnac: document.getElementById('char-fnac').value,
    nac: document.getElementById('char-nac').value,
    sangre: document.getElementById('char-sangre').value,
    ocupacion: document.getElementById('char-ocupacion').value,
    raza: document.getElementById('char-raza').value,
    fisica: document.getElementById('char-fisica').value,
    interp: document.getElementById('char-interp').value,
    historia: document.getElementById('char-historia').value,
    casa: quizCasaResultado ? CASAS[quizCasaResultado].nombre : '',
    casa_emoji: quizCasaResultado ? CASAS[quizCasaResultado].emoji : '',
    estado: 'pendiente',
    fecha_envio: new Date().toISOString(),
    historial: [{ accion: 'Enviada', por: currentUser?.username || 'Jugador', fecha: new Date().toISOString(), mensaje: '' }]
  };
  if (!data.nombre || !data.ocupacion) { showFlash('Completa al menos nombre y ocupación'); return; }
  const fichas = getAllFichas();
  fichas.push(data);
  saveAllFichas(fichas);
  localStorage.setItem('ficha_personaje', JSON.stringify(data));
  showFlash('¡Ficha enviada! Los administradores la revisarán pronto.');
  volverFicha();
}

function loadFicha() {
  const saved = localStorage.getItem('ficha_personaje');
  if (!saved) return;
  try {
    const d = JSON.parse(saved);
    const fieldMap = { 'discord-id':'discord_id', 'steam-id':'steam_id', 'nombre':'nombre', 'apellido':'apellido', 'fnac':'fnac', 'nac':'nac', 'fisica':'fisica', 'interp':'interp', 'historia':'historia' };
    Object.entries(fieldMap).forEach(([elSuffix, key]) => {
      const el = document.getElementById('char-' + elSuffix);
      if (el && d[key]) el.value = d[key];
    });
    if (d.sangre) document.getElementById('char-sangre').value = d.sangre;
    if (d.ocupacion) document.getElementById('char-ocupacion').value = d.ocupacion;
    if (d.raza) document.getElementById('char-raza').value = d.raza;
  } catch(e) {}
}

function clearFicha() {
  if (!confirm('¿Limpiar todos los datos del personaje?')) return;
  localStorage.removeItem('ficha_personaje');
  ['char-discord-id','char-steam-id','char-nombre','char-apellido','char-fnac','char-nac','char-fisica','char-interp','char-historia'].forEach(id => { document.getElementById(id).value = ''; });
  ['char-sangre','char-ocupacion','char-raza'].forEach(id => { document.getElementById(id).value = ''; });
}

// ═══════════════════════════════════════
// PANEL ADMIN
// ═══════════════════════════════════════
let adminFilter = 'all';

function setFilter(f, btn) {
  adminFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAdminTable();
}

function renderAdminPanel() {
  renderAdminStats();
  renderAdminTable();
}

function renderAdminStats() {
  const fichas = getAllFichas();
  const pending  = fichas.filter(f => f.estado === 'pendiente').length;
  const accepted = fichas.filter(f => f.estado === 'aceptada').length;
  const denied   = fichas.filter(f => f.estado === 'denegada').length;
  document.getElementById('admin-stats').innerHTML = `
    <div class="admin-stat total"><span class="s-num">${fichas.length}</span><span class="s-label">Total</span></div>
    <div class="admin-stat pending"><span class="s-num">${pending}</span><span class="s-label">Pendientes</span></div>
    <div class="admin-stat accepted"><span class="s-num">${accepted}</span><span class="s-label">Aceptadas</span></div>
    <div class="admin-stat denied"><span class="s-num">${denied}</span><span class="s-label">Denegadas</span></div>
  `;
}

function renderAdminTable() {
  const fichas = getAllFichas();
  const filtered = adminFilter === 'all' ? fichas : fichas.filter(f => f.estado === adminFilter);
  const tbody = document.getElementById('admin-tbody');
  const empty = document.getElementById('admin-empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filtered.map(f => {
    const badgeClass = f.estado === 'pendiente' ? 'badge-pending' : f.estado === 'aceptada' ? 'badge-accepted' : 'badge-denied';
    const badgeText  = f.estado === 'pendiente' ? 'Pendiente' : f.estado === 'aceptada' ? 'Aceptada' : 'Denegada';
    const fecha = f.fecha_envio ? new Date(f.fecha_envio).toLocaleDateString('es-ES') : '—';

    let actions = `<button class="action-btn action-btn-view" onclick="openModal('${f.id}')">Ver ficha</button>`;
    if (f.estado === 'pendiente') {
      actions = `<button class="action-btn action-btn-accept" onclick="accionFicha('${f.id}','aceptar')">✓ Aceptar</button>
                 <button class="action-btn action-btn-deny"   onclick="accionFicha('${f.id}','denegar')">✗ Denegar</button>
                 ${actions}`;
    } else {
      actions += ` <button class="action-btn action-btn-revert" onclick="accionFicha('${f.id}','revertir')">↩ Revertir</button>
                   <button class="action-btn action-btn-delete" onclick="accionFicha('${f.id}','eliminar')">🗑 Eliminar</button>`;
    }

    return `<tr>
      <td><span class="char-name">${f.nombre || '—'} ${f.apellido || ''}</span><span class="char-discord">@${f.discord_username || f.discord_id || '—'}</span></td>
      <td>${f.raza || '—'}</td>
      <td style="text-transform:capitalize;">${f.ocupacion || '—'}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td style="font-size:0.85rem;color:var(--text-dim);">${fecha}</td>
      <td><div class="actions-cell">${actions}</div></td>
    </tr>`;
  }).join('');
}

function accionFicha(id, accion) {
  const fichas = getAllFichas();
  const idx = fichas.findIndex(f => f.id === id);
  if (idx === -1) return;

  if (accion === 'eliminar') {
    if (!confirm('¿Eliminar esta ficha permanentemente? Esta acción no se puede deshacer.')) return;
    fichas.splice(idx, 1);
    saveAllFichas(fichas);
    closeModal();
    showFlash('Ficha eliminada.');
    renderAdminPanel();
    return;
  }

  let mensaje = '';
  if (accion === 'denegar') {
    mensaje = prompt('Motivo de denegación (opcional):') || '';
  }
  if (accion === 'aceptar' && !confirm('¿Aceptar esta ficha?')) return;

  const nuevoEstado = accion === 'aceptar' ? 'aceptada' : accion === 'denegar' ? 'denegada' : 'pendiente';
  const accionLabel = accion === 'aceptar' ? 'Aceptada' : accion === 'denegar' ? 'Denegada' : 'Revertida a pendiente';

  fichas[idx].estado = nuevoEstado;
  fichas[idx].historial = fichas[idx].historial || [];
  fichas[idx].historial.push({ accion: accionLabel, por: currentUser.username, fecha: new Date().toISOString(), mensaje });
  saveAllFichas(fichas);

  closeModal();
  showFlash(`Ficha ${accionLabel.toLowerCase()} correctamente.`);
  renderAdminPanel();
}

// ═══════════════════════════════════════
// GESTIÓN DE ADMINS — solo super admins
// ═══════════════════════════════════════
function addAdmin() {
  if (!isSuperAdmin()) { showFlash('Sin permisos para gestionar admins'); return; }

  const idEl   = document.getElementById('new-admin-id');
  const noteEl = document.getElementById('new-admin-note');
  const id   = idEl.value.trim();
  const note = noteEl.value.trim();

  if (!id) { showFlash('Introduce un ID de Discord'); return; }
  if (!/^\d{17,20}$/.test(id)) { showFlash('El ID debe ser numérico (17-20 dígitos)'); return; }
  if (getAllAdminIds().includes(id)) { showFlash('Ese ID ya es admin'); return; }

  const extras = getExtraAdmins();
  extras.push({ id, note: note || '', addedBy: currentUser.username, addedAt: new Date().toISOString() });
  saveExtraAdmins(extras);
  idEl.value = ''; noteEl.value = '';
  showFlash('Admin añadido correctamente');
  renderAdminList();
}

function removeAdmin(id) {
  if (!isSuperAdmin()) { showFlash('Sin permisos para gestionar admins'); return; }
  if (!confirm('¿Quitar a este admin?')) return;
  const extras = getExtraAdmins().filter(a => a.id !== id);
  saveExtraAdmins(extras);
  showFlash('Admin eliminado');
  renderAdminList();
}

function renderAdminList() {
  const extras = getExtraAdmins();
  const ul = document.getElementById('admin-id-list');
  if (!ul) return;

  // Mostrar / ocultar el formulario de añadir según permisos
  const addSection  = document.getElementById('add-admin-section');
  const lockNotice  = document.getElementById('add-admin-locked');
  if (isSuperAdmin()) {
    addSection.style.display = 'block';
    lockNotice.style.display = 'none';
  } else {
    addSection.style.display = 'none';
    lockNotice.style.display = 'block';
  }

  const hardcodedRows = HARDCODED_ADMIN_IDS.map(id => `
    <li class="admin-id-row">
      <div class="admin-id-info">
        <span class="admin-id-val">${id}</span>
        <span class="admin-id-hardcoded">⚑ Raíz — no eliminable</span>
      </div>
    </li>`).join('');

  const extraRows = extras.length === 0
    ? `<li class="admin-id-row"><span style="color:var(--text-dim);font-style:italic;font-size:0.9rem;">No hay admins adicionales.</span></li>`
    : extras.map(a => {
        const fecha = a.addedAt ? new Date(a.addedAt).toLocaleDateString('es-ES') : '—';
        const deleteBtn = isSuperAdmin()
          ? `<button class="action-btn action-btn-delete" onclick="removeAdmin('${a.id}')">✕ Quitar</button>`
          : '';
        return `<li class="admin-id-row">
          <div class="admin-id-info">
            <span class="admin-id-val">${a.id}</span>
            <span class="admin-id-note">${a.note ? a.note + ' · ' : ''}Añadido por ${a.addedBy} el ${fecha}</span>
          </div>
          ${deleteBtn}
        </li>`;
      }).join('');

  ul.innerHTML = hardcodedRows + extraRows;
}

function switchTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'admins') renderAdminList();
}

// ═══════════════════════════════════════
// MODAL
// ═══════════════════════════════════════
function openModal(id) {
  const f = getFichaById(id);
  if (!f) return;

  const badgeClass = f.estado === 'pendiente' ? 'badge-pending' : f.estado === 'aceptada' ? 'badge-accepted' : 'badge-denied';
  const badgeText  = f.estado === 'pendiente' ? 'Pendiente' : f.estado === 'aceptada' ? 'Aceptada' : 'Denegada';

  document.getElementById('modal-title').innerHTML = `${f.nombre || '—'} ${f.apellido || ''} <span class="badge ${badgeClass}" style="font-size:0.65rem;vertical-align:middle;margin-left:0.5rem;">${badgeText}</span>`;

  const historialHTML = (f.historial || []).slice().reverse().map(h => {
    const d = new Date(h.fecha).toLocaleString('es-ES');
    return `<div class="history-entry">
      <span class="h-action">${h.accion}</span>
      <span class="h-by"> · por ${h.por} · <span style="font-size:0.75rem;">${d}</span></span>
      ${h.mensaje ? `<div class="h-msg">"${h.mensaje}"</div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-section">
      <h4>Identificación</h4>
      <div class="modal-row"><span class="ml">Discord</span><span class="mv">@${f.discord_username || '—'} (${f.discord_id || '—'})</span></div>
      <div class="modal-row"><span class="ml">Steam ID</span><span class="mv">${f.steam_id || '—'}</span></div>
    </div>
    <div class="modal-section">
      <h4>Datos del Personaje</h4>
      <div class="modal-row"><span class="ml">Nombre</span><span class="mv">${f.nombre || '—'} ${f.apellido || ''}</span></div>
      <div class="modal-row"><span class="ml">Nacimiento</span><span class="mv">${f.fnac || '—'}</span></div>
      <div class="modal-row"><span class="ml">Nacionalidad</span><span class="mv">${f.nac || '—'}</span></div>
      <div class="modal-row"><span class="ml">Raza</span><span class="mv">${f.raza || '—'}</span></div>
      <div class="modal-row"><span class="ml">Estatus sangre</span><span class="mv">${f.sangre || '—'}</span></div>
      <div class="modal-row"><span class="ml">Ocupación</span><span class="mv" style="text-transform:capitalize;">${f.ocupacion || '—'}</span></div>
      ${f.casa ? `<div class="modal-row"><span class="ml">Casa</span><span class="mv">${f.casa_emoji || ''} ${f.casa}</span></div>` : ''}
    </div>
    ${f.fisica  ? `<div class="modal-section"><h4>Descripción Física</h4><p class="modal-text">${f.fisica}</p></div>` : ''}
    ${f.interp  ? `<div class="modal-section"><h4>Interpretación</h4><p class="modal-text">${f.interp}</p></div>` : ''}
    ${f.historia? `<div class="modal-section"><h4>Historia</h4><p class="modal-text">${f.historia}</p></div>` : ''}
    <div class="modal-section">
      <h4>Historial de Acciones</h4>
      ${historialHTML || '<p style="color:var(--text-dim);font-style:italic;">Sin historial.</p>'}
    </div>
    ${f.estado === 'pendiente' ? `<div class="admin-msg-wrap"><label>Mensaje al jugador (al aceptar/denegar)</label><textarea id="modal-admin-msg" placeholder="Bienvenido al servidor…"></textarea></div>` : ''}
  `;

  let footerHTML = `<button class="btn-outline" onclick="closeModal()">Cerrar</button>`;
  if (f.estado === 'pendiente') {
    footerHTML += `
      <button class="btn-outline" style="border-color:rgba(196,48,48,0.5);color:var(--red-light);" onclick="accionFichaConMsg('${f.id}','denegar')">✗ Denegar</button>
      <button class="btn-primary" onclick="accionFichaConMsg('${f.id}','aceptar')">✓ Aceptar</button>
    `;
  } else {
    footerHTML += `
      <button class="btn-outline" onclick="accionFicha('${f.id}','revertir')">↩ Revertir</button>
      <button class="btn-outline" style="border-color:rgba(196,48,48,0.5);color:var(--red-light);" onclick="accionFicha('${f.id}','eliminar')">🗑 Eliminar</button>
    `;
  }
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-backdrop').classList.add('open');
}

function accionFichaConMsg(id, accion) {
  const msgEl = document.getElementById('modal-admin-msg');
  const mensaje = msgEl ? msgEl.value.trim() : '';
  const fichas = getAllFichas();
  const idx = fichas.findIndex(f => f.id === id);
  if (idx === -1) return;

  if (accion === 'denegar') {
    const motivo = mensaje || (prompt('Motivo de denegación (opcional):') || '');
    fichas[idx].estado = 'denegada';
    fichas[idx].historial = fichas[idx].historial || [];
    fichas[idx].historial.push({ accion: 'Denegada', por: currentUser.username, fecha: new Date().toISOString(), mensaje: motivo });
  } else {
    fichas[idx].estado = 'aceptada';
    fichas[idx].historial = fichas[idx].historial || [];
    fichas[idx].historial.push({ accion: 'Aceptada', por: currentUser.username, fecha: new Date().toISOString(), mensaje });
  }

  saveAllFichas(fichas);
  closeModal();
  showFlash(`Ficha ${accion === 'aceptar' ? 'aceptada' : 'denegada'} correctamente.`);
  renderAdminPanel();
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-backdrop')) return;
  document.getElementById('modal-backdrop').classList.remove('open');
}

// ═══════════════════════════════════════
// FLASH
// ═══════════════════════════════════════
function showFlash(msg) {
  const el = document.getElementById('flash');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
(async function init() {
  if (window.location.hash.includes('access_token')) {
    const ok = await handleDiscordCallback();
    history.replaceState(null, '', window.location.pathname);
    if (ok) {
      updateNavAvatars();
      loadFicha();
      showPage('home');
      setTimeout(() => showFlash('Bienvenido, ' + currentUser.username), 200);
    } else {
      showPage('login');
    }
    return;
  }

  const saved = localStorage.getItem('discord_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      updateNavAvatars();
      loadFicha();
      showPage('home');
      return;
    } catch(e) { localStorage.removeItem('discord_user'); }
  }
  showPage('login');
})();
