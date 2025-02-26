const venom = require("venom-bot");
const { obtenerEventoActual } = require("./calendar"); 

// Mapa para evitar spam (clave: número de usuario, valor: timeout)
const usuariosEnEspera = new Map();

// Iniciar el bot de WhatsApp
venom
    .create({
        session: "session-name",
        headless: true,
        disableWelcome: true,
        logQR: true,
        browserArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    .then((client) => startBot(client))
    .catch((error) => console.log("Error al iniciar Venom:", error));

async function startBot(client) {
    client.onMessage(async (message) => {
        // Verificar si el mensaje es individual y es "."
        if (!message.isGroupMsg) {
            const numeroUsuario = message.from;

            // Verificar si el usuario ya ha recibido una respuesta en los últimos 3 minutos
            if (usuariosEnEspera.has(numeroUsuario)) {
              return; // No responder si está en la lista de espera
            }

            // Obtener el mensaje del evento
            const mensajeEvento = await obtenerEventoActual();
            const saludo = obtenerSaludo();
            const mensajeFinal = mensajeEvento;


            // Enviar el mensaje
            const contacto = await client.getContact(numeroUsuario);
            if(contacto.shortName) {
              await client.sendText(numeroUsuario, `> ⚠︎ ¡Hola! ${contacto.shortName}, ${saludo}.`);
              await client.sendText(numeroUsuario, `> ${mensajeFinal}`);
              await client.sendText(numeroUsuario, `> _Si es algo urgente, llámame dos veces_.`);
            } else {
              await client.sendText(numeroUsuario, `> ⚠︎ ¡Hola! ${contacto.shortName}, ${saludo}.`);
              await client.sendText(numeroUsuario, `> ${mensajeFinal}`);
            }
            // Agregar al usuario a la lista de espera y eliminarlo después de 3 minutos
            usuariosEnEspera.set(numeroUsuario, setTimeout(() => {
                usuariosEnEspera.delete(numeroUsuario);
            }, 3 * 60 * 1000)); // 3 minutos en milisegundos
        }
    });
}

function obtenerSaludo() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "buenos días";
  if (hora >= 12 && hora < 19) return "buenas tardes";
  return "buenas noches";
}
