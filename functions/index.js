const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https = require("https");
const cors = require("cors")({origin: true});
admin.initializeApp();
const db = admin.firestore();

exports.generateSummary = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    if (request.method !== "POST") {
      return response.status(405).send("Method Not Allowed");
    }

    const prompt = request.body.prompt;
    if (!prompt) {
      return response.status(400).send("Bad Request: prompt is missing.");
    }

    const geminiApiKey = functions.config().gemini.key;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-preview-0514:generateContent?key=${geminiApiKey}`;

    const payload = JSON.stringify({
      contents: [{role: "user", parts: [{text: prompt}]}],
    });

    const options = {
      method: "POST",
      headers: {"Content-Type": "application/json"},
    };

    const apiRequest = https.request(apiUrl, options, (apiResponse) => {
      let data = "";
      apiResponse.on("data", (chunk) => {
        data += chunk;
      });
      apiResponse.on("end", () => {
        response.status(200).send(JSON.parse(data));
      });
    });

    apiRequest.on("error", (error) => {
      console.error("Error calling Gemini API:", error);
      response.status(500).send("Internal Server Error");
    });

    apiRequest.write(payload);
    apiRequest.end();
  });
});

exports.sendAdminNotification = functions.https.onCall(async (data, context) => {
  // 1. Verificar que el usuario que llama esté autenticado.
  if (!context.auth) {
    // CORRECCIÓN "max-len": Línea dividida en varias para ser más corta
    throw new functions.https.HttpsError(
        "unauthenticated",
        "La función solo puede ser llamada por usuarios autenticados.",
    );
  }

  // 2. Verificar que el usuario que llama tenga el rol de 'admin'.
  const callerUid = context.auth.uid;
  const userDoc = await db.collection("users").doc(callerUid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Debes ser un administrador para usar esta función.",
    );
  }

  // 3. Validar los datos de entrada (ID de destino y mensaje).
  const {targetUserId, message} = data;
  if (!targetUserId || !message || message.trim() === "") {
    // CORRECCIÓN "max-len": Línea dividida en varias para ser más corta
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Se requiere un ID de usuario de destino y un mensaje.",
    );
  }

  // 4. Crear el objeto de la notificación.
  const notificationPayload = {
    message: message,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    tipo: "admin_direct",
    enlace: "#",
  };

  // 5. Intentar guardar la notificación.
  try {
    await db
        .collection("users")
        .doc(targetUserId)
        .collection("notifications")
        .add(notificationPayload);

    return {success: true, message: "Notificación enviada con éxito."};
  } catch (error) {
    console.error("Error al enviar notificación de admin:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Ocurrió un error al crear la notificación en la base de datos.",
    );
  }
});

