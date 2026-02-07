/* ═══════════════════════════════════════════════════════════════
   📍 GEOLOCATION MODULE — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Gerencia GPS e cálculos de direção/distância até Jerusalém
   ═══════════════════════════════════════════════════════════════ */

const GeoModule = (() => {
    // Coordenadas de Jerusalém (Muro das Lamentações / Monte do Templo)
    const JERUSALEM = {
        lat: 31.7683,
        lng: 35.2137,
        name: 'Jerusalém',
        nameHebrew: 'יְרוּשָׁלַיִם'
    };

    let currentPosition = null;
    let watchId = null;
    let onPositionUpdate = null;

    /**
     * Converte graus para radianos
     */
    function toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Converte radianos para graus
     */
    function toDeg(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * Calcula a distância entre dois pontos usando a fórmula de Haversine
     * @returns {number} Distância em quilômetros
     */
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Calcula o bearing (direção) de um ponto para outro
     * @returns {number} Bearing em graus (0-360, onde 0 = Norte)
     */
    function calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(toRad(lat2));
        const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
                  Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
        let bearing = toDeg(Math.atan2(y, x));
        return (bearing + 360) % 360; // Normaliza para 0-360
    }

    /**
     * Formata a distância de forma legível
     */
    function formatDistance(km) {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`;
        } else if (km < 100) {
            return `${km.toFixed(1)} km`;
        } else {
            return `${Math.round(km).toLocaleString('pt-BR')} km`;
        }
    }

    /**
     * Formata o bearing como direção cardinal
     */
    function bearingToCardinal(bearing) {
        const directions = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    }

    /**
     * Inicia o rastreamento de GPS
     */
    function startTracking(callback) {
        onPositionUpdate = callback;

        if (!navigator.geolocation) {
            console.error('Geolocalização não disponível');
            if (callback) callback(null, 'Geolocalização não suportada pelo navegador');
            return false;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000
        };

        // Primeira posição
        navigator.geolocation.getCurrentPosition(
            handlePosition,
            handleError,
            options
        );

        // Rastreamento contínuo
        watchId = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            options
        );

        return true;
    }

    /**
     * Para o rastreamento de GPS
     */
    function stopTracking() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    /**
     * Manipula nova posição GPS
     */
    function handlePosition(position) {
        currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
        };

        // Calcula dados em relação a Jerusalém
        const distance = calculateDistance(
            currentPosition.lat, currentPosition.lng,
            JERUSALEM.lat, JERUSALEM.lng
        );

        const bearing = calculateBearing(
            currentPosition.lat, currentPosition.lng,
            JERUSALEM.lat, JERUSALEM.lng
        );

        const data = {
            position: currentPosition,
            jerusalem: {
                distance: distance,
                distanceFormatted: formatDistance(distance),
                bearing: bearing,
                bearingCardinal: bearingToCardinal(bearing)
            }
        };

        if (onPositionUpdate) {
            onPositionUpdate(data, null);
        }
    }

    /**
     * Manipula erros de GPS
     */
    function handleError(error) {
        let message;
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Permissão de localização negada. Habilite nas configurações.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Localização indisponível. Verifique seu GPS.';
                break;
            case error.TIMEOUT:
                message = 'Tempo esgotado ao buscar localização.';
                break;
            default:
                message = 'Erro desconhecido ao buscar localização.';
        }
        console.error('Erro GPS:', message);
        if (onPositionUpdate) {
            onPositionUpdate(null, message);
        }
    }

    // API Pública
    return {
        JERUSALEM,
        startTracking,
        stopTracking,
        calculateDistance,
        calculateBearing,
        formatDistance,
        bearingToCardinal,
        getCurrentPosition: () => currentPosition
    };
})();
