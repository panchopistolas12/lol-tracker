// --- VARIABLES GLOBALES PARA PAGINACIÓN ---
let currentMatchIndex = 0;
let lastSearchData = { nombre: '', tag: '' };

// --- 1. FUNCIÓN PRINCIPAL DE BÚSQUEDA ---
async function buscarInvocador(isLoadMore = false) {
    const input = document.getElementById("summonerName").value;
    const botonBusqueda = document.querySelector(".btn-search-large");
    const contenedorResultados = document.getElementById("result-container");

    if (!isLoadMore) {
        if (!input.includes("#")) return alert("Por favor, incluye el TAG. Ejemplo: Dragonite#LAS");
        let [nombre, tag] = input.split("#");
        lastSearchData = { nombre: nombre.trim(), tag: tag.trim() };
        currentMatchIndex = 0;

        botonBusqueda.disabled = true;
        botonBusqueda.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        contenedorResultados.classList.remove("results-hidden");
        contenedorResultados.innerHTML = `<p style="color: #a09b8c; text-align: center; padding: 40px;">Consultando a Riot Games...</p>`;
    } else {
        const btnMore = document.getElementById("btnLoadMore");
        btnMore.disabled = true;
        btnMore.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cargando...`;
    }

    try {
        const url = `/api/search?nombre=${encodeURIComponent(lastSearchData.nombre)}&tag=${encodeURIComponent(lastSearchData.tag)}&start=${currentMatchIndex}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error en la consulta");

        const datos = await response.json();
        mostrarDatosReales(datos, isLoadMore);
        currentMatchIndex += 5;

    } catch (error) {
        if (!isLoadMore) {
            contenedorResultados.innerHTML = `<div style="color: #ff5859; text-align: center; padding: 40px;"><h3>Error</h3><p>${error.message}</p></div>`;
        } else {
            alert("No hay más partidas.");
        }
    } finally {
        if (!isLoadMore) {
            botonBusqueda.disabled = false;
            botonBusqueda.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> BUSCAR`;
        }
    }
}

// --- 2. RENDERIZADO DE RESULTADOS ---
function mostrarDatosReales(datos, isLoadMore) {
    const contenedorResultados = document.getElementById("result-container");

    let matchCardsHTML = '';
    if (datos.historial) {
        datos.historial.forEach(m => {
            const statusClass = m.win ? 'match-win' : 'match-loss';
            const statusText = m.win ? 'VICTORY' : 'DEFEAT';
            const kdaRatio = ((m.kills + m.assists) / (m.deaths || 1)).toFixed(2);

            let itemsHTML = '';
            for (let i = 0; i <= 6; i++) {
                const itemId = m[`item${i}`];
                if (itemId && itemId !== 0) {
                    itemsHTML += `<img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/item/${itemId}.png" class="item-icon" title="Item ID: ${itemId}">`;
                } else {
                    itemsHTML += `<div class="item-empty"></div>`;
                }
            }

            const team1Icons = m.team1.map(c => `<img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${c}.png" class="t-icon" title="${c}">`).join('');
            const team2Icons = m.team2.map(c => `<img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${c}.png" class="t-icon" title="${c}">`).join('');

            matchCardsHTML += `
                <div class="lck-match-card ${statusClass}">
                    <div class="m-status-bar"></div>
                    <img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${m.championName}.png" class="m-champ">
                    <div class="m-stats">
                        <span class="m-result">${statusText}</span>
                        <span class="m-kda-text"><b>${m.kills}</b> / <span class="d">${m.deaths}</span> / <b>${m.assists}</b></span>
                        <span class="m-ratio">${kdaRatio} KDA</span>
                    </div>
                    <div class="m-items-grid">${itemsHTML}</div>
                    <div class="m-teams-grid">
                        <div class="t-column">${team1Icons}</div>
                        <div class="t-column">${team2Icons}</div>
                    </div>
                </div>`;
        });
    }

    if (!isLoadMore) {
        let vics = datos.historial.filter(m => m.win).length;
        let totalK = datos.historial.reduce((s, m) => s + m.kills, 0);
        let totalD = datos.historial.reduce((s, m) => s + m.deaths, 0);
        let totalA = datos.historial.reduce((s, m) => s + m.assists, 0);
        let avgKDA = ((totalK + totalA) / (totalD || 1)).toFixed(2);

        let rangoTexto = datos.rango || "UNRANKED";
        let tier = rangoTexto.split(" ")[0].toLowerCase();
        let rankImageHTML = '';
        const rangosValidos = ["iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"];
        if (rangosValidos.includes(tier)) {
            let url = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier}.png`;
            rankImageHTML = `<img src="${url}" class="rank-mini">`;
        }

        let maestriasHTML = datos.maestrias.map(m => `
            <img src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${m.championId}.png" class="p-m-icon" title="${(m.championPoints / 1000).toFixed(0)}k pts">
        `).join('');

        contenedorResultados.innerHTML = `
            <div class="lck-header-card">
                <div class="p-identity">
                    <div class="pfp-wrapper">
                        <img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${datos.iconoId}.png" class="p-pfp">
                        <span class="p-lvl-tag">${datos.nivel}</span>
                    </div>
                    <div class="p-info">
                        <h2 class="p-name">${datos.nombre} <span class="p-tag">#${datos.tag}</span></h2>
                        <div class="p-rank-row">
                             ${rankImageHTML}
                             <span>${diosRango(rangoTexto)} • <b>${datos.lp} LP</b> • WR ${datos.winrate}%</span>
                        </div>
                    </div>
                </div>
                <div class="p-masteries">
                    ${maestriasHTML}
                </div>
            </div>

            <div class="lck-body">
                <div class="res-summary-panel">
                    <div class="summary-item">
                        <span class="label">Resumen Últimas 5</span>
                        <span class="value">${vics}V - ${5 - vics}D</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">KDA Sesión</span>
                        <span class="value" style="color: var(--hextech-blue)">${avgKDA}</span>
                    </div>
                </div>

                <h4 class="section-title">Historial de Partidas</h4>
                <div id="match-list-container">${matchCardsHTML}</div>
                <button id="btnLoadMore" onclick="buscarInvocador(true)" class="lck-btn-more">MOSTRAR MÁS PARTIDAS</button>
            </div>`;
    } else {
        document.getElementById("match-list-container").insertAdjacentHTML('beforeend', matchCardsHTML);
        document.getElementById("btnLoadMore").disabled = false;
        document.getElementById("btnLoadMore").innerHTML = "MOSTRAR MÁS PARTIDAS";
    }
}

function diosRango(texto) {
    if (!texto || texto === "UNRANKED") return "Unranked";
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// --- 3. EVENTOS Y MODAL ---
window.onload = function() {
    const modal = document.getElementById("authModal");
    const openBtn = document.getElementById("openFeedback");
    const closeBtn = document.querySelector(".close-modal-btn");
    const pixelCat = document.getElementById("pixelCat");
    const catMenu = document.getElementById("catMenu");
    const openFromCat = document.getElementById("openFeedbackFromCat");

    // Lógica para Abrir Modal
    if (openBtn) openBtn.onclick = () => modal.style.display = "block";
    if (openFromCat) openFromCat.onclick = (e) => {
        e.preventDefault();
        modal.style.display = "block";
    };

    // Lógica para Cerrar Modal
    if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    };

    // Lógica del Gatito
    if (pixelCat) {
        pixelCat.onclick = (e) => {
            e.stopPropagation();
            catMenu.style.display = (catMenu.style.display === "block") ? "none" : "block";
        };
    }
    document.addEventListener("click", () => { if (catMenu) catMenu.style.display = "none"; });

    // --- LÓGICA DE ENVÍO DE FORMULARIO CON ANIMACIÓN ---
        const feedbackForm = document.getElementById("feedbackForm");
        if (feedbackForm) {
            feedbackForm.onsubmit = async function(e) {
                e.preventDefault();

                // 1. CAPTURAR EL NOMBRE ANTES DE LIMPIAR TODO
                const nombreUsuario = document.getElementById("fbName").value || "Invocador";

                const btn = this.querySelector(".btn-submit-hextech span");
                const originalText = btn.innerText;
                btn.innerText = "TRANSMITIENDO...";

                const data = new FormData(this);
                try {
                    const res = await fetch(this.action, {
                        method: 'POST',
                        body: data,
                        headers: { 'Accept': 'application/json' }
                    });

                    if (res.ok) {
                        // 2. CERRAR MODAL Y LIMPIAR
                        modal.style.display = "none";
                        this.reset();

                        // 3. DISPARAR LA ANIMACIÓN CON EL NOMBRE
                        mostrarAgradecimiento(nombreUsuario);
                    } else {
                        alert("¡Error! Revisa tu conexión con la base Hextech.");
                    }
                } catch (error) {
                    alert("Error de red.");
                } finally {
                    btn.innerText = originalText;
                }
            };
        }

    // ASEGÚRATE DE QUE ESTA FUNCIÓN ESTÉ FUERA DE WINDOW.ONLOAD
    function mostrarAgradecimiento(nombre) {
        // Creamos la notificación dinámicamente
        const toast = document.createElement("div");
        toast.className = "success-toast";
        toast.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>
            <h3>¡REPORTE RECIBIDO!</h3>
            <p>Gracias por ayudar a mejorar Hextech Scout, <b>${nombre}</b>.</p>
        `;
        document.body.appendChild(toast);

        // Animación de entrada (escala y opacidad)
        setTimeout(() => toast.classList.add("show"), 100);

        // Desaparece solo después de 3.5 segundos
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }

    const searchInput = document.getElementById("summonerName");
    if (searchInput) searchInput.onkeypress = (e) => { if (e.key === "Enter") buscarInvocador(); };
};

function mostrarAgradecimiento() {
    // --- LÓGICA DE ENVÍO DE FORMULARIO ---
        const feedbackForm = document.getElementById("feedbackForm");
        if (feedbackForm) {
            feedbackForm.onsubmit = async function(e) {
                e.preventDefault();

                // CAPTURAMOS EL NOMBRE ANTES DE LIMPIAR EL FORMULARIO
                const nombreUsuario = document.getElementById("fbName").value || "Invocador";

                const btn = this.querySelector(".btn-submit-hextech span");
                const originalText = btn.innerText;
                btn.innerText = "TRANSMITIENDO...";

                const data = new FormData(this);
                try {
                    const res = await fetch(this.action, {
                        method: 'POST',
                        body: data,
                        headers: { 'Accept': 'application/json' }
                    });

                    if (res.ok) {
                        modal.style.display = "none";
                        this.reset();

                        // PASAMOS EL NOMBRE A LA FUNCIÓN DE AGRADECIMIENTO
                        mostrarAgradecimiento(nombreUsuario);
                    } else {
                        alert("Asegúrate de configurar tu ID de Formspree.");
                    }
                } catch (error) {
                    alert("Error de conexión.");
                } finally {
                    btn.innerText = originalText;
                }
            };
        }

    // MODIFICA LA FUNCIÓN PARA QUE RECIBA EL NOMBRE
    function mostrarAgradecimiento(nombre) {
        const toast = document.createElement("div");
        toast.className = "success-toast";
        // USAMOS EL NOMBRE DINÁMICO AQUÍ
        toast.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>
            <h3>¡REPORTE RECIBIDO!</h3>
            <p>Gracias por ayudar a mejorar Hextech Scout, <b>${nombre}</b>.</p>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add("show"), 100);
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }
}