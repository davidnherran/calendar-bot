const { default: makeWASocket, useMultiFileAuthState } = require("baileys");
const { obtenerEventoActual } = require("./calendar");

const usuariosEnEspera = new Map();

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        syncFullHistory: true,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log("🔄 Conexión cerrada. Reintentando...", shouldReconnect);
            if (shouldReconnect) iniciarBot();
        } else if (connection === "open") {
            console.log("✅ Bot conectado a WhatsApp!");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const message = messages[0];

        if (!message.key.fromMe && message.key.remoteJid.endsWith("@s.whatsapp.net")) {
            const numeroUsuario = message.key.remoteJid;

            if (usuariosEnEspera.has(numeroUsuario)) return;

            const mensajeEvento = await obtenerEventoActual();
            const saludo = obtenerSaludo();
            const mensajeFinal = mensajeEvento;

            try {
                await sock.sendMessage(numeroUsuario, { text: `> ⚠︎ ¡Hola!, ${saludo}.` });
                await sock.sendMessage(numeroUsuario, { text: `> ${mensajeFinal}` });
                await sock.sendMessage(numeroUsuario, { text: `> _Si es algo urgente, llámame dos veces_.` });

                usuariosEnEspera.set(numeroUsuario, setTimeout(() => {
                    usuariosEnEspera.delete(numeroUsuario);
                }, 3 * 60 * 1000));
            } catch (error) {
                console.log("❌ Error al responder:", error);
            }
        }
    });
}

function obtenerSaludo() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "buenos días";
    if (hora >= 12 && hora < 19) return "buenas tardes";
    return "buenas noches";
}

iniciarBot();