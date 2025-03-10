const venom = require("venom-bot");
const express = require("express");
const { obtenerEventoActual } = require("./calendar");

const usuariosEnEspera = new Map();
let qrCodeData = "";

const app = express();
const port = process.env.PORT || 3001;

app.get("/qr", (req, res) => {
    if (qrCodeData) {
        res.send(qrCodeData);
    } else {
        res.send("QR no disponible aún. Espera un momento.");
    }
});

app.listen(port, () => {
    console.log(`Servidor QR corriendo en http://localhost:${port}/qr`);
});

venom
    .create({
        session: "session-s",
        headless: "new",
        disableWelcome: true,
        logQR: false,
        browserArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
        catchQR: (qrCode) => {
            console.log(qrCode);
            qrCodeData = qrCode;
            console.log(`🔗 QR disponible en: http://localhost:${port}/qr`);
        },
    })
    .then((client) => {
        console.log("🤖 Bot iniciado");
        startBot(client);
    })
    .catch((error) => console.log("❌ Error al iniciar Venom:", error));


async function startBot(client) {
    client.onMessage(async (message) => {
        if (!message.isGroupMsg) {
            const numeroUsuario = message.from;

            if (usuariosEnEspera.has(numeroUsuario)) {
                return;
            }

            const mensajeEvento = await obtenerEventoActual();
            const saludo = obtenerSaludo();
            const mensajeFinal = mensajeEvento;

            const contacto = await client.getContact(numeroUsuario);
            if (contacto.shortName) {
                await client.sendText(numeroUsuario, `> ⚠︎ ¡Hola! ${contacto.shortName}, ${saludo}.`);
                await client.sendText(numeroUsuario, `> ${mensajeFinal}`);
                await client.sendText(numeroUsuario, `> _Si es algo urgente, llámame dos veces_.`);
            } else {
                await client.sendText(numeroUsuario, `> ⚠︎ ¡Hola! ${contacto.shortName}, ${saludo}.`);
                await client.sendText(numeroUsuario, `> ${mensajeFinal}`);
            }

            usuariosEnEspera.set(numeroUsuario, setTimeout(() => {
                usuariosEnEspera.delete(numeroUsuario);
            }, 3 * 60 * 1000));
        }
    });
}

function obtenerSaludo() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "buenos días";
    if (hora >= 12 && hora < 19) return "buenas tardes";
    return "buenas noches";
}