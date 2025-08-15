const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();
const db = admin.firestore();

// OMITIMOS LA FUNCIÓN generateSummary POR AHORA PARA SIMPLIFICAR

exports.sendAdminNotification = functions.https.onRequest((request, response) => {
  // Usamos cors para permitir llamadas desde nuestro sitio web
  cors(request, response, async () => {
    // 1. Verificamos que el token de autenticación venga en la solicitud
    if (!request.headers.authorization || !request.headers.authorization.startsWith("Bearer ")) {
      console.error("No Firebase ID token was passed as a Bearer token ");
      response.status(401).send("Unauthorized");
      return;
    }

    const idToken = request.headers.authorization.split("Bearer ")[1];
    let decodedIdToken;
    try {
      // 2. Verificamos que el token sea válido usando el Admin SDK
      decodedIdToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error("Error while verifying Firebase ID token:", error);
      response.status(401).send("Unauthorized");
      return;
    }

    try {
      // 3. Verificamos que el usuario tenga el rol de 'admin' en Firestore
      const callerUid = decodedIdToken.uid;
      const userDoc = await db.collection("users").doc(callerUid).get();
      if (!userDoc.exists || userDoc.data().role !== "admin") {
        console.error("Requestor is not an admin.");
        response.status(403).send("Forbidden");
      }

      const {targetUserId, message} = request.body;
      if (!targetUserId || !message || message.trim() === "") {
        response.status(400).send("Bad Request");
        return;
      }

      const notificationPayload = {
        message: message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        tipo: "admin_direct",
        enlace: "#",
      };

      await db.collection("users").doc(targetUserId).collection("notifications").add(notificationPayload);
      response.status(200).send({
        success: true, message: "Notificación enviada con éxito."});
    } catch (error) {
      console.error("Error processing request:", error);
      response.status(500).send("Internal Server Error");
    }
  });
});
