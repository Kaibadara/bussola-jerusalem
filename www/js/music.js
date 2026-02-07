/* ═══════════════════════════════════════════════════════════════
   🎵 MUSIC MODULE — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Player de melodias hebraicas sagradas (Kadoshin)
   Músicas de domínio público / Creative Commons
   ═══════════════════════════════════════════════════════════════ */

const MusicModule = (() => {
    let audio = null;
    let isPlaying = false;
    let currentTrack = 0;
    let volume = 0.3;

    // Playlist de melodias sagradas hebraicas
    // URLs de áudio livres de direitos (Creative Commons / Domínio Público)
    const PLAYLIST = [
        {
            title: "Shalom Aleichem",
            artist: "Melodia Tradicional",
            description: "Canto de boas-vindas do Shabbat"
        },
        {
            title: "Hine Ma Tov",
            artist: "Salmo 133",
            description: "Quão bom é habitar em união"
        },
        {
            title: "Shema Israel",
            artist: "Deuteronômio 6:4",
            description: "Ouve, ó Israel, o Senhor é Um"
        },
        {
            title: "Kadosh Kadosh Kadosh",
            artist: "Isaías 6:3",
            description: "Santo, Santo, Santo é o Senhor dos Exércitos"
        },
        {
            title: "Yerushalayim Shel Zahav",
            artist: "Jerusalém de Ouro",
            description: "Hino à Cidade Santa"
        }
    ];

    /**
     * Inicializa o player de música
     */
    function init() {
        createPlayerUI();
        
        // Cria o elemento de áudio
        audio = new Audio();
        audio.volume = volume;
        audio.loop = false;

        // Gera música ambiente usando Web Audio API (sem necessidade de arquivos MP3)
        initAmbientMusic();

        console.log('🎵 Player de música inicializado');
    }

    /**
     * Cria a UI do player flutuante
     */
    function createPlayerUI() {
        const player = document.createElement('div');
        player.id = 'music-player';
        player.className = 'music-player';
        player.innerHTML = `
            <button id="music-toggle" class="music-toggle" onclick="MusicModule.toggle()" title="Melodias Hebraicas">
                <span class="music-icon">🎵</span>
            </button>
            <div id="music-panel" class="music-panel hidden">
                <div class="music-panel-header">
                    <span>🕎 Melodias Sagradas</span>
                    <button class="music-close" onclick="MusicModule.closePanel()">✕</button>
                </div>
                <div id="music-now-playing" class="music-now-playing">
                    <span class="music-title">Kadosh Kadosh Kadosh</span>
                    <span class="music-artist">Ambiente Sagrado</span>
                </div>
                <div class="music-controls">
                    <button class="music-btn" onclick="MusicModule.prev()">⏮</button>
                    <button id="music-play-btn" class="music-btn music-play" onclick="MusicModule.togglePlay()">▶</button>
                    <button class="music-btn" onclick="MusicModule.next()">⏭</button>
                </div>
                <div class="music-volume">
                    <span>🔈</span>
                    <input type="range" id="music-volume" min="0" max="100" value="30" 
                           oninput="MusicModule.setVolume(this.value)">
                    <span>🔊</span>
                </div>
                <div class="music-playlist">
                    ${PLAYLIST.map((track, i) => `
                        <div class="playlist-item ${i === 0 ? 'active' : ''}" onclick="MusicModule.playTrack(${i})">
                            <span class="playlist-icon">🎶</span>
                            <div class="playlist-info">
                                <span class="playlist-title">${track.title}</span>
                                <span class="playlist-desc">${track.description}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(player);
    }

    /**
     * Inicializa música ambiente usando Web Audio API
     * Gera melodias harmônicas suaves sem necessidade de arquivos externos
     */
    let audioCtx = null;
    let ambientNodes = [];
    let isAmbientPlaying = false;
    let melodyTimeoutId = null;

    function initAmbientMusic() {
        // Será criado quando o usuário interagir (política de autoplay)
    }

    function createAmbientContext() {
        if (audioCtx) {
            // Resume se estiver suspenso (política de autoplay)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            return;
        }
        
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Resume para garantir que funcione após gesto do usuário
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    /**
     * Toca música ambiente com escalas hebraicas (Ahava Raba / Freygish)
     */
    function playAmbient() {
        createAmbientContext();
        stopAmbient();

        // Escala hebraica Ahava Raba (Freygish): C, Db, E, F, G, Ab, Bb
        // Frequências base
        const hebrewScale = [261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 466.16];
        const octaveLow = hebrewScale.map(f => f / 2);
        const octaveHigh = hebrewScale.map(f => f * 2);
        const allNotes = [...octaveLow, ...hebrewScale, ...octaveHigh];

        // Drone de fundo (nota base sustentada)
        const drone = audioCtx.createOscillator();
        const droneGain = audioCtx.createGain();
        drone.type = 'sine';
        drone.frequency.value = octaveLow[0]; // C grave
        droneGain.gain.value = volume * 0.08;
        drone.connect(droneGain);
        droneGain.connect(audioCtx.destination);
        drone.start();
        ambientNodes.push({ osc: drone, gain: droneGain });

        // Quinta drone
        const drone5 = audioCtx.createOscillator();
        const drone5Gain = audioCtx.createGain();
        drone5.type = 'sine';
        drone5.frequency.value = octaveLow[4]; // G
        drone5Gain.gain.value = volume * 0.05;
        drone5.connect(drone5Gain);
        drone5Gain.connect(audioCtx.destination);
        drone5.start();
        ambientNodes.push({ osc: drone5, gain: drone5Gain });

        // Melodia aleatória suave
        playMelodicPhrase(hebrewScale);

        isAmbientPlaying = true;
    }

    function playMelodicPhrase(scale) {
        if (!isAmbientPlaying && ambientNodes.length === 0) return;

        const now = audioCtx.currentTime;
        const noteIndex = Math.floor(Math.random() * scale.length);
        const freq = scale[noteIndex];
        const duration = 1.5 + Math.random() * 3; // 1.5 a 4.5 segundos

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.value = freq;

        // Envelope ADSR suave
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.12, now + 0.5); // Attack
        gainNode.gain.linearRampToValueAtTime(volume * 0.06, now + duration * 0.6); // Decay
        gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + duration);

        // Agenda a próxima nota
        if (isAmbientPlaying) {
            const nextDelay = (duration * 0.7 + Math.random() * 2) * 1000;
            melodyTimeoutId = setTimeout(() => {
                if (isAmbientPlaying) playMelodicPhrase(scale);
            }, nextDelay);
        }
    }

    function stopAmbient() {
        isAmbientPlaying = false;
        if (melodyTimeoutId) {
            clearTimeout(melodyTimeoutId);
            melodyTimeoutId = null;
        }
        ambientNodes.forEach(node => {
            try {
                node.osc.stop();
                node.osc.disconnect();
                node.gain.disconnect();
            } catch (e) {}
        });
        ambientNodes = [];
    }

    /**
     * Toggle do painel
     */
    function toggle() {
        const panel = document.getElementById('music-panel');
        if (panel) panel.classList.toggle('hidden');
    }

    function closePanel() {
        const panel = document.getElementById('music-panel');
        if (panel) panel.classList.add('hidden');
    }

    /**
     * Play/Pause
     */
    function togglePlay() {
        const btn = document.getElementById('music-play-btn');
        
        if (isAmbientPlaying) {
            stopAmbient();
            if (btn) btn.textContent = '▶';
            isPlaying = false;
        } else {
            playAmbient();
            if (btn) btn.textContent = '⏸';
            isPlaying = true;
        }
    }

    /**
     * Próxima melodia
     */
    function next() {
        currentTrack = (currentTrack + 1) % PLAYLIST.length;
        updateTrackDisplay();
        if (isPlaying) {
            stopAmbient();
            setTimeout(() => playAmbient(), 200);
        }
    }

    /**
     * Melodia anterior
     */
    function prev() {
        currentTrack = (currentTrack - 1 + PLAYLIST.length) % PLAYLIST.length;
        updateTrackDisplay();
        if (isPlaying) {
            stopAmbient();
            setTimeout(() => playAmbient(), 200);
        }
    }

    /**
     * Toca uma faixa específica
     */
    function playTrack(index) {
        currentTrack = index;
        updateTrackDisplay();
        stopAmbient();
        playAmbient();
        isPlaying = true;
        const btn = document.getElementById('music-play-btn');
        if (btn) btn.textContent = '⏸';
    }

    /**
     * Atualiza o display da faixa atual
     */
    function updateTrackDisplay() {
        const track = PLAYLIST[currentTrack];
        const titleEl = document.querySelector('.music-title');
        const artistEl = document.querySelector('.music-artist');
        if (titleEl) titleEl.textContent = track.title;
        if (artistEl) artistEl.textContent = track.description;

        // Atualiza items da playlist
        document.querySelectorAll('.playlist-item').forEach((item, i) => {
            item.classList.toggle('active', i === currentTrack);
        });
    }

    /**
     * Ajusta o volume
     */
    function setVolume(val) {
        volume = val / 100;
        if (audio) audio.volume = volume;

        // Atualiza volume dos nós ambient
        ambientNodes.forEach(node => {
            if (node.gain) {
                node.gain.gain.value = volume * 0.08;
            }
        });
    }

    // API Pública
    return {
        init,
        toggle,
        closePanel,
        togglePlay,
        next,
        prev,
        playTrack,
        setVolume
    };
})();
