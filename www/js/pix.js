/* ═══════════════════════════════════════════════════════════════
   💛 PIX MODULE — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Sistema de doação via PIX com QR Code
   Chave PIX: ifoxnando@dbzmail.com
   ═══════════════════════════════════════════════════════════════ */

const PixModule = (() => {
    const PIX_KEY = 'ifoxnando@dbzmail.com';
    const PIX_NAME = 'Marcos Fernando';
    const PIX_CITY = 'Brasil';
    const PIX_DESCRIPTION = 'Doacao Bussola Jerusalem';

    let selectedValue = 0;

    /**
     * Gera o payload PIX (formato EMV/BRCode)
     * Seguindo o padrão do Banco Central do Brasil
     */
    function generatePixPayload(value) {
        const payload = buildPixPayload(value);
        return payload;
    }

    /**
     * Constrói o payload PIX no formato padrão BRCODE
     */
    function buildPixPayload(value) {
        // Formato EMV QR Code para PIX
        let payload = '';

        // ID 00 - Payload Format Indicator
        payload += tlv('00', '01');

        // ID 26 - Merchant Account Information (PIX)
        let merchantAccount = '';
        merchantAccount += tlv('00', 'br.gov.bcb.pix'); // GUI
        merchantAccount += tlv('01', PIX_KEY);           // Chave PIX
        if (PIX_DESCRIPTION) {
            merchantAccount += tlv('02', PIX_DESCRIPTION);
        }
        payload += tlv('26', merchantAccount);

        // ID 52 - Merchant Category Code
        payload += tlv('52', '0000');

        // ID 53 - Transaction Currency (986 = BRL)
        payload += tlv('53', '986');

        // ID 54 - Transaction Amount (se valor definido)
        if (value && value > 0) {
            payload += tlv('54', value.toFixed(2));
        }

        // ID 58 - Country Code
        payload += tlv('58', 'BR');

        // ID 59 - Merchant Name
        payload += tlv('59', normalize(PIX_NAME));

        // ID 60 - Merchant City
        payload += tlv('60', normalize(PIX_CITY));

        // ID 62 - Additional Data Field
        let additionalData = '';
        additionalData += tlv('05', '***');  // Reference Label
        payload += tlv('62', additionalData);

        // ID 63 - CRC16 (calculado sobre todo o payload)
        payload += '6304'; // Tag + Length do CRC
        const crc = crc16(payload);
        payload += crc;

        return payload;
    }

    /**
     * Cria um campo TLV (Tag-Length-Value)
     */
    function tlv(tag, value) {
        const length = value.length.toString().padStart(2, '0');
        return tag + length + value;
    }

    /**
     * Normaliza texto (remove acentos e caracteres especiais)
     */
    function normalize(text) {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .substring(0, 25);
    }

    /**
     * Calcula CRC-16/CCITT-FALSE
     */
    function crc16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
            }
            crc &= 0xFFFF;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    /**
     * Gera QR Code usando a biblioteca qrcode.js
     */
    function generateQRCode(text, canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Limpa o container
        const container = canvas.parentElement;
        
        // Remove canvas antigo e recria um div para o QRCode.js
        let qrDiv = document.getElementById('pix-qr-render');
        if (qrDiv) {
            qrDiv.innerHTML = '';
        } else {
            qrDiv = document.createElement('div');
            qrDiv.id = 'pix-qr-render';
            qrDiv.style.cssText = 'display:flex; justify-content:center; padding:10px;';
            canvas.style.display = 'none';
            container.appendChild(qrDiv);
        }

        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrDiv, {
                    text: text,
                    width: 200,
                    height: 200,
                    colorDark: '#1a0a00',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                // Fallback: mostra a chave PIX para copiar
                canvas.style.display = 'block';
                drawQRFallback(canvas, text);
            }
        } catch (e) {
            console.warn('Erro ao gerar QR:', e);
            canvas.style.display = 'block';
            drawQRFallback(canvas, text);
        }
    }

    /**
     * Fallback simples para QR Code (gera um código visual básico)
     */
    function drawQRFallback(canvas, text) {
        const ctx = canvas.getContext('2d');
        canvas.width = 180;
        canvas.height = 180;

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 180, 180);

        // Gera um padrão visual baseado no hash do texto
        const size = 9;
        const cellSize = Math.floor(180 / (size * 2 + 1));
        const offset = Math.floor((180 - cellSize * (size * 2 + 1)) / 2);

        ctx.fillStyle = '#1a0a00';

        // Padrão de posição (cantos)
        drawFinderPattern(ctx, offset, offset, cellSize);
        drawFinderPattern(ctx, offset + cellSize * (size * 2 - 6), offset, cellSize);
        drawFinderPattern(ctx, offset, offset + cellSize * (size * 2 - 6), cellSize);

        // Dados baseados no texto
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }

        for (let row = 0; row < size * 2 + 1; row++) {
            for (let col = 0; col < size * 2 + 1; col++) {
                // Pula os padrões de posição
                if ((row < 7 && col < 7) || 
                    (row < 7 && col > size * 2 - 7) || 
                    (row > size * 2 - 7 && col < 7)) continue;

                const bit = ((hash >> ((row * (size * 2 + 1) + col) % 31)) & 1);
                const charBit = text.charCodeAt((row * (size * 2 + 1) + col) % text.length) & 1;
                
                if (bit ^ charBit) {
                    ctx.fillRect(
                        offset + col * cellSize,
                        offset + row * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            }
        }

        // Texto PIX no centro
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(60, 78, 60, 24);
        ctx.fillStyle = '#1a0a00';
        ctx.font = 'bold 12px serif';
        ctx.textAlign = 'center';
        ctx.fillText('PIX', 90, 94);
    }

    function drawFinderPattern(ctx, x, y, cellSize) {
        // Quadrado externo
        for (let i = 0; i < 7; i++) {
            ctx.fillRect(x + i * cellSize, y, cellSize, cellSize);
            ctx.fillRect(x + i * cellSize, y + 6 * cellSize, cellSize, cellSize);
            ctx.fillRect(x, y + i * cellSize, cellSize, cellSize);
            ctx.fillRect(x + 6 * cellSize, y + i * cellSize, cellSize, cellSize);
        }
        // Quadrado interno
        for (let i = 2; i < 5; i++) {
            for (let j = 2; j < 5; j++) {
                ctx.fillRect(x + i * cellSize, y + j * cellSize, cellSize, cellSize);
            }
        }
    }

    /**
     * Inicializa o módulo PIX
     */
    function init() {
        const payload = generatePixPayload(0);
        generateQRCode(payload, 'pix-qr-canvas');
    }

    /**
     * Seleciona um valor de doação
     */
    function selectValue(value) {
        selectedValue = value;
        
        // Atualiza botões
        document.querySelectorAll('.value-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.textContent.replace(/[^\d]/g, '')) === value) {
                btn.classList.add('active');
            }
        });
        
        // Limpa campo custom
        const customInput = document.getElementById('custom-value');
        if (customInput) customInput.value = '';

        // Regenera QR com valor
        const payload = generatePixPayload(value);
        // Limpa QR anterior
        const qrRender = document.getElementById('pix-qr-render');
        if (qrRender) qrRender.innerHTML = '';
        const canvas = document.getElementById('pix-qr-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        generateQRCode(payload, 'pix-qr-canvas');
    }

    /**
     * Copia a chave PIX para a área de transferência
     */
    function copyKey() {
        navigator.clipboard.writeText(PIX_KEY).then(() => {
            const btn = document.getElementById('copy-pix-btn');
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✅ Copiado!';
                btn.style.background = 'linear-gradient(135deg, #2d7a2d, #4CAF50)';
                setTimeout(() => {
                    btn.textContent = original;
                    btn.style.background = '';
                }, 2000);
            }
        }).catch(() => {
            // Fallback para dispositivos antigos
            const textarea = document.createElement('textarea');
            textarea.value = PIX_KEY;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            const btn = document.getElementById('copy-pix-btn');
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✅ Copiado!';
                setTimeout(() => { btn.textContent = original; }, 2000);
            }
        });
    }

    // API Pública
    return {
        init,
        selectValue,
        copyKey,
        generatePixPayload,
        PIX_KEY
    };
})();

// Funções globais movidas para app.js (evita duplicação)
