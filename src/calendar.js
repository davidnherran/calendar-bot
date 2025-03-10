const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// Archivo de credenciales descargado de Google Cloud
const CREDENTIALS_PATH = "credentials.json";
const TOKEN_PATH = "token.json";

// Alcance para acceder a los eventos del usuario
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

// Función para autorizar y obtener un evento
async function obtenerEventoActual() {
  const auth = await authorize();
  if (!auth) return "❌ No se pudo autenticar con Google Calendar.";

  return await getCurrentEvent(auth);
}

// Cargar credenciales y autenticar
function authorize() {
  return new Promise((resolve, reject) => {
    try {
      const content = fs.readFileSync(CREDENTIALS_PATH);
      const credentials = JSON.parse(content);
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        resolve(oAuth2Client);
      } else {
        getNewToken(oAuth2Client, resolve);
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Obtener un nuevo token si no existe
function getNewToken(oAuth2Client, resolve) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Autoriza esta app visitando este enlace:", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Introduce el código de autorización: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error("Error al obtener el token", err);
        return resolve(null);
      }
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log("Token guardado en token.json");
      resolve(oAuth2Client);
    });
  });
}

// Consultar el evento en curso
async function getCurrentEvent(auth) {
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const nowISO = now.toISOString();

  // Consulta eventos que comenzaron antes de ahora y terminan después de ahora
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: nowISO,  // El evento debe estar en curso
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items;

  if (events.length) {
    // Filtrar solo eventos que ya hayan comenzado y no hayan terminado aún
    const ongoingEvent = events.find(event => 
      new Date(event.start.dateTime) <= now && new Date(event.end.dateTime) > now
    );

    if (ongoingEvent) {
      return `Ahora mismo estoy ${
        ongoingEvent.description || "con un tema laboral"
      }, pero estaré disponible de nuevo a las \`${new Date(ongoingEvent.end.dateTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}\`. Te responderé en cuanto pueda.`;
    }
  }

  return `Dame un momento, enseguida te contesto.`;
}


// Exportamos la función para que `bot.js` la pueda usar
module.exports = { obtenerEventoActual };
