async function buscarInvocador() {
    const input = document.getElementById("summonerName").value;
    const boton = document.querySelector("button");
    const contenedorResultados = document.getElementById("result-container");

    // 1. VALIDACIÓN Y LIMPIEZA
    if (!input.includes("#")) {
        alert("Por favor, incluye el TAG. Ejemplo: Dragonite#LAS");
        return;
    }

    let [nombre, tag] = input.split("#");
    nombre = nombre.trim();
    tag = tag.trim();

    // 2. MODO "CARGANDO"
    boton.disabled = true;
    boton.textContent = "Buscando...";

    // Aseguramos que la caja sea visible para mostrar el mensaje de carga
    contenedorResultados.classList.remove("results-hidden"); // <--- ¡ESTO FALTABA!
    contenedorResultados.innerHTML = `<p style="color: #a09b8c; text-align: center;">Consultando a Riot Games...</p>`;

    try {
        const response = await fetch(`/api/search?nombre=${encodeURIComponent(nombre)}&tag=${encodeURIComponent(tag)}`);

        if (!response.ok) {
            throw new Error("Jugador no encontrado o error en el servidor");
        }

        const datos = await response.json();
        mostrarDatosReales(datos);

    } catch (error) {
        contenedorResultados.innerHTML = `
            <div style="color: #ff5859; padding: 20px; border: 1px solid #ff5859; border-radius: 10px; text-align: center;">
                <h3>Error</h3>
                <p>${error.message}</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">(Intenta revisar si el nombre y el #TAG son correctos)</p>
            </div>
        `;
    } finally {
        boton.disabled = false;
        boton.textContent = "BUSCAR";
    }
}

function mostrarDatosReales(datos) {
    const contenedorResultados = document.getElementById("result-container");

    // Aseguramos que la caja sea visible
    contenedorResultados.classList.remove("results-hidden");

    // --- LÓGICA DEL RANGO ---
    let rangoTexto = datos.rango || "UNRANKED";
    let tier = rangoTexto.split(" ")[0].toLowerCase();
    const rangosValidos = ["iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"];

    let imagenUrl = rangosValidos.includes(tier)
        ? `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier}.png`
        : "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-unranked.png";

    // --- LÓGICA DE MAESTRÍAS ---
    let maestriasHTML = '';
    if (datos.maestrias && datos.maestrias.length > 0) {
        maestriasHTML = `<div class="mastery-container">`;
        datos.maestrias.forEach(m => {
            let imgChamp = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${m.championId}.png`;
            maestriasHTML += `
                <div class="champion-circle">
                    <img src="${imgChamp}" alt="Champ">
                    <div class="mastery-level">${m.championLevel}</div>
                    <div class="mastery-points">${(m.championPoints / 1000).toFixed(0)}k</div>
                </div>
            `;
        });
        maestriasHTML += `</div>`;
    }

    // --- HTML FINAL ---
    const tarjetaHTML = `
        <div class="profile-card">
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="position: relative;">
                    <img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${datos.iconoId}.png"
                         style="width: 85px; border-radius: 50%; border: 3px solid #c8aa6e; box-shadow: 0 0 15px rgba(200, 170, 110, 0.3);">
                    <span style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); background: #1a1a1a; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; border: 1px solid #c8aa6e;">
                        ${datos.nivel}
                    </span>
                </div>

                <div style="text-align: left;">
                    <h2 style="margin: 0; color: #f0e6d2; font-size: 1.8rem;">${datos.nombre}</h2>
                    <p style="margin: 0; color: #a09b8c; letter-spacing: 1px;">#${datos.tag}</p>
                </div>
            </div>

            <hr style="border-color: #5c5b57; margin: 20px 0; opacity: 0.5;">

            <div class="rank-badge">
                <img src="${imagenUrl}" alt="${datos.rango}" class="rank-image">
                <h3 style="color: #f0e6d2; margin: 10px 0 5px 0; font-size: 1.5rem; text-transform: uppercase;">${datos.rango}</h3>
                <div style="display: flex; justify-content: center; gap: 20px; color: #a09b8c;">
                    <span><b>${datos.lp}</b> LP</span>
                    <span style="color: ${datos.winrate >= 50 ? '#2deb90' : '#ff5859'};">WR: ${datos.winrate}%</span>
                </div>
            </div>

            ${maestriasHTML}

        </div>
    `;

    contenedorResultados.innerHTML = tarjetaHTML;
}

// Permitir buscar con Enter
document.getElementById("summonerName").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        buscarInvocador();
    }
});