/* ═══════════════════════════════════════════════════════════════
   🗺️ MAPS MODULE — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Google Maps Static API — Imagem estática (máxima economia de tokens)
   Gera uma URL de imagem com 2 marcadores, sem JS SDK
   ═══════════════════════════════════════════════════════════════ */

const MapsModule = (() => {
    const API_KEY = 'AIzaSyALXMsYP0AR7zwfOQx7w81AIEZREQSlVDY';
    const JERUSALEM = { lat: 31.7683, lng: 35.2137 };
    let isReady = false;
    let mapEnabled = true;
    let lastUserPos = null;
    let imgElement = null;
    let debounceTimer = null;

    // Estilos escuros via URL params
    const DARK_STYLES = [
        'style=element:geometry|color:0x1a0f04',
        'style=element:labels.text.fill|color:0x8b7a5e',
        'style=element:labels.text.stroke|color:0x1a0a00',
        'style=feature:poi|visibility:off',
        'style=feature:road|element:geometry|color:0x2a1a0c',
        'style=feature:road|element:labels|visibility:off',
        'style=feature:transit|visibility:off',
        'style=feature:water|element:geometry|color:0x0a1a2a',
        'style=feature:administrative|element:geometry.stroke|color:0x2a1a08'
    ].join('&');

    // Estilos claros para tema light
    const LIGHT_STYLES = [
        'style=element:geometry|color:0xf5f0e0',
        'style=element:labels.text.fill|color:0x4a3a20',
        'style=feature:poi|visibility:off',
        'style=feature:road|element:labels|visibility:off',
        'style=feature:transit|visibility:off',
        'style=feature:water|element:geometry|color:0xb8d4e8',
        'style=feature:landscape.natural|color:0xe8e0c8'
    ].join('&');

    /**
     * Inicializa o mapa estático
     */
    function init() {
        if (!mapEnabled) {
            console.log('🗺️ Mapa desativado nas configurações');
            return false;
        }

        const container = document.getElementById('map');
        if (!container) return false;

        // Limpa conteúdo anterior
        container.innerHTML = '';

        // Cria elemento <img>
        imgElement = document.createElement('img');
        imgElement.className = 'static-map-img';
        imgElement.alt = 'Mapa — Você e Jerusalém';
        imgElement.loading = 'lazy';
        container.appendChild(imgElement);

        // Se já temos posição, renderiza com os dois pontos
        if (lastUserPos) {
            renderMap(lastUserPos.lat, lastUserPos.lng);
        } else {
            // Mostra só Jerusalém
            renderMap(null, null);
        }

        isReady = true;
        console.log('🗺️ Static Maps API inicializado');
        return true;
    }

    /**
     * Gera a URL do mapa estático
     */
    function buildMapUrl(userLat, userLng) {
        // Detecta tamanho ideal do container
        const container = document.getElementById('map');
        // Se container não visível (aba oculta), usa tamanho padrão
        const w = container && container.clientWidth > 0 ? Math.min(container.clientWidth, 640) : 600;
        const h = container && container.clientHeight > 0 ? Math.min(container.clientHeight, 640) : 400;
        const size = `${Math.floor(w)}x${Math.floor(h)}`;

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const styles = isLight ? LIGHT_STYLES : DARK_STYLES;

        // Marcador de Jerusalém (dourado)
        const jMarker = `markers=color:0xFFD700|label:J|${JERUSALEM.lat},${JERUSALEM.lng}`;

        let url = `https://maps.googleapis.com/maps/api/staticmap?${size ? `size=${size}` : 'size=600x400'}&scale=2&maptype=roadmap&${styles}&${jMarker}`;

        // Marcador do usuário (azul)
        if (userLat !== null && userLng !== null) {
            url += `&markers=color:0x4285F4|label:V|${userLat.toFixed(6)},${userLng.toFixed(6)}`;
        } else {
            url += `&center=${JERUSALEM.lat},${JERUSALEM.lng}&zoom=6`;
        }

        url += `&key=${API_KEY}`;
        return url;
    }

    /**
     * Renderiza o mapa
     */
    function renderMap(lat, lng) {
        if (!imgElement) return;
        imgElement.src = buildMapUrl(lat, lng);
    }

    /**
     * Atualiza posição do usuário (debounce de 10s para economizar requisições)
     */
    function updateUserPosition(lat, lng) {
        lastUserPos = { lat, lng };
        if (!mapEnabled || !isReady) return;

        // Debounce: só atualiza a imagem a cada 10 segundos
        if (debounceTimer) return;
        debounceTimer = setTimeout(() => {
            renderMap(lat, lng);
            debounceTimer = null;
        }, 10000);

        // Primeiro render é imediato
        if (!imgElement.src || imgElement.src === '') {
            renderMap(lat, lng);
        }
    }

    /**
     * Força atualização (ex: ao abrir aba)
     */
    function fitBothPoints() {
        if (lastUserPos && imgElement) {
            renderMap(lastUserPos.lat, lastUserPos.lng);
        }
    }

    /**
     * Ativa/desativa o mapa
     */
    function setEnabled(enabled) {
        mapEnabled = enabled;
        const section = document.getElementById('map-section');
        if (section) {
            section.style.display = enabled ? '' : 'none';
        }
        if (enabled && !isReady) {
            init();
        }
    }

    /**
     * Re-renderiza com tema atualizado
     */
    function refreshTheme() {
        if (isReady && lastUserPos) {
            renderMap(lastUserPos.lat, lastUserPos.lng);
        } else if (isReady) {
            renderMap(null, null);
        }
    }

    return {
        init,
        updateUserPosition,
        fitBothPoints,
        setEnabled,
        refreshTheme,
        isReady: () => isReady
    };
})();
