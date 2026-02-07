/* ═══════════════════════════════════════════════════════════════
   🧭 COMPASS MODULE — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Controla a bússola 3D, orientação do dispositivo e seta para Jerusalém
   ═══════════════════════════════════════════════════════════════ */

const CompassModule = (() => {
    let compassDisk = null;
    let jerusalemArrow = null;
    let currentHeading = 0;
    let targetBearing = 0;
    let isCalibrated = false;
    let animationFrameId = null;
    let smoothHeading = 0;
    let onHeadingUpdate = null;
    let lastVibrationTime = 0;
    let isAligned = false;

    /**
     * Inicializa os elementos da bússola
     */
    function init(headingCallback) {
        compassDisk = document.getElementById('compass-disk');
        jerusalemArrow = document.getElementById('jerusalem-arrow');
        onHeadingUpdate = headingCallback;
        
        // Cria marcações de graus dinamicamente
        createDegreeMarks();
        
        return true;
    }

    /**
     * Cria as marcações de graus ao redor da bússola
     */
    function createDegreeMarks() {
        const container = document.querySelector('.degree-marks');
        if (!container) return;
        
        for (let i = 0; i < 360; i += 5) {
            const mark = document.createElement('div');
            mark.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${i % 30 === 0 ? '2px' : '1px'};
                height: ${i % 30 === 0 ? '12px' : '6px'};
                background: ${i % 90 === 0 ? '#c4a35a' : 'rgba(196, 163, 90, 0.3)'};
                transform-origin: 0 ${150}px;
                transform: rotate(${i}deg) translateX(-50%);
            `;
            container.appendChild(mark);
        }
    }

    /**
     * Inicia o sensor de orientação (bússola do dispositivo)
     */
    function startOrientation() {
        // iOS 13+ precisa de permissão explícita
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            return DeviceOrientationEvent.requestPermission()
                .then(permission => {
                    if (permission === 'granted') {
                        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
                        window.addEventListener('deviceorientation', handleOrientationFallback, true);
                        startAnimationLoop();
                        return true;
                    }
                    return false;
                })
                .catch(err => {
                    console.error('Erro ao solicitar permissão de orientação:', err);
                    return false;
                });
        }

        // Android e outros
        if (window.DeviceOrientationEvent) {
            // Tenta primeiro o evento absoluto (mais preciso)
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            // Fallback para orientação relativa
            window.addEventListener('deviceorientation', handleOrientationFallback, true);
            startAnimationLoop();
            return Promise.resolve(true);
        }

        console.warn('DeviceOrientation não suportado');
        
        // Fallback: usa GPS heading se disponível
        startAnimationLoop();
        return Promise.resolve(false);
    }

    /**
     * Manipula evento de orientação absoluta (preferido)
     */
    function handleOrientation(event) {
        if (event.absolute !== true && event.webkitCompassHeading === undefined) {
            return; // Não é absoluto, ignora
        }

        let heading;

        if (event.webkitCompassHeading !== undefined) {
            // Safari/iOS
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            // Chrome/Android — alpha é relativo ao norte magnético quando absolute=true
            heading = 360 - event.alpha;
        }

        if (heading !== undefined) {
            currentHeading = heading;
            isCalibrated = true;
            
            // Remove o fallback se o absoluto funcionar
            window.removeEventListener('deviceorientation', handleOrientationFallback, true);
        }
    }

    /**
     * Fallback para orientação relativa
     */
    function handleOrientationFallback(event) {
        if (isCalibrated) return; // Já temos orientação absoluta

        if (event.alpha !== null) {
            // Em Android, quando não é absolute, alpha pode não ser confiável
            // mas usamos como melhor estimativa
            currentHeading = 360 - event.alpha;
        }

        if (event.webkitCompassHeading !== undefined) {
            // iOS
            currentHeading = event.webkitCompassHeading;
            isCalibrated = true;
        }
    }

    /**
     * Inicia o loop de animação suave da bússola
     */
    function startAnimationLoop() {
        function animate() {
            // Suavização (interpolação linear)
            const diff = currentHeading - smoothHeading;
            
            // Encontra o menor ângulo
            let delta = ((diff + 540) % 360) - 180;
            smoothHeading += delta * 0.15; // Fator de suavização
            smoothHeading = ((smoothHeading % 360) + 360) % 360;

            updateCompassVisuals();
            
            if (onHeadingUpdate) {
                onHeadingUpdate(smoothHeading);
            }

            animationFrameId = requestAnimationFrame(animate);
        }

        if (!animationFrameId) {
            animate();
        }
    }

    /**
     * Atualiza os visuais da bússola
     */
    function updateCompassVisuals() {
        // Gira o disco da bússola (oposto ao heading para N ficar em cima)
        if (compassDisk) {
            compassDisk.style.transform = `rotate(${-smoothHeading}deg)`;
        }

        // Gira a seta de Jerusalém (bearing - heading do dispositivo)
        if (jerusalemArrow) {
            const arrowRotation = targetBearing - smoothHeading;
            jerusalemArrow.style.transform = `translate(-50%, -50%) rotate(${arrowRotation}deg)`;

            // Vibração ao alinhar (±5°)
            const normalizedDiff = Math.abs(((arrowRotation % 360) + 540) % 360 - 180);
            const aligned = normalizedDiff < 5;
            if (aligned && !isAligned) {
                isAligned = true;
                const now = Date.now();
                if (now - lastVibrationTime > 3000 && typeof navigator.vibrate === 'function') {
                    navigator.vibrate([80, 50, 80]);
                    lastVibrationTime = now;
                }
                // Feedback visual
                jerusalemArrow.classList.add('aligned');
            } else if (!aligned && isAligned) {
                isAligned = false;
                jerusalemArrow.classList.remove('aligned');
            }
        }

        // Atualiza indicador de calibração
        updateCalibrationUI();
    }

    /**
     * Atualiza UI de calibração
     */
    function updateCalibrationUI() {
        const indicator = document.getElementById('calibration-indicator');
        if (!indicator) return;
        if (isCalibrated) {
            indicator.classList.add('calibrated');
            indicator.textContent = '🧭 Bússola calibrada';
        } else {
            indicator.classList.remove('calibrated');
            indicator.textContent = '⚠️ Mova o celular em forma de 8 para calibrar';
        }
    }

    /**
     * Atualiza o bearing para Jerusalém
     */
    function updateBearing(bearing) {
        targetBearing = bearing;
    }

    /**
     * Define heading manualmente (fallback via GPS heading)
     */
    function setHeading(heading) {
        if (!isCalibrated && heading !== null) {
            currentHeading = heading;
        }
    }

    /**
     * Para o sensor de orientação
     */
    function stop() {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientationFallback, true);
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    /**
     * Retorna se a bússola está calibrada
     */
    function getCalibrationStatus() {
        return isCalibrated;
    }

    // API Pública
    return {
        init,
        startOrientation,
        updateBearing,
        setHeading,
        stop,
        getCalibrationStatus,
        getCurrentHeading: () => smoothHeading
    };
})();
