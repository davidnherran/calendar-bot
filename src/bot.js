const venom = require("venom-bot");
const { obtenerEventoActual } = require("./calendar");

const usuariosEnEspera = new Map();
let qrCodeData = "";

venom
    .create({
        session: "session",
        headless: "new",
        disableWelcome: true,
        logQR: true,
        browserArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    .then((client) => {
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
