const admin = require("firebase-admin");
// La importación de v2 para funciones HTTP (onRequest)
const {onRequest} = require("firebase-functions/v2/https");
// La importación de v2 para funciones programadas (onSchedule)
const {onSchedule} = require("firebase-functions/v2/scheduler");

admin.initializeApp();
const db = admin.firestore();

// --- FUNCIÓN DE ADMIN ACTUALIZADA ---
exports.sendAdminNotification = onRequest(
    {cors: true},
    // La lógica de la función va dentro
    async (request, response) => {
      if (
        !request.headers.authorization ||
        !request.headers.authorization.startsWith("Bearer ")
      ) {
        response.status(401).send("Unauthorized");
        return;
      }
      const idToken = request.headers.authorization.split("Bearer ")[1];
      let decodedIdToken;
      try {
        decodedIdToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        response.status(401).send("Unauthorized");
        return;
      }

      try {
        const callerUid = decodedIdToken.uid;
        const userDoc = await db.collection("users").doc(callerUid).get();
        if (!userDoc.exists || userDoc.data().role !== "admin") {
          response.status(403).send("Forbidden");
          return;
        }

        const {
          targetUserId, pushTitle, pushBody, internalMessage,
        } = request.body;
        if (!targetUserId || !internalMessage || !pushTitle || !pushBody) {
          response.status(400).send("Bad Request: Faltan campos.");
          return;
        }

        await db.collection("users").doc(targetUserId).collection("notifications")
            .add({
              message: internalMessage,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
              tipo: "admin_direct",
              enlace: "#",
            });

        await sendPushNotification(targetUserId, {
          title: pushTitle,
          body: pushBody,
        });

        response.status(200).send({
          success: true, message: "Notificaciones enviadas con éxito.",
        });
      } catch (error) {
        console.error("Error detallado en sendAdminNotification:", error);
        response.status(500).send("Internal Server Error");
      }
    });


// --- FUNCIÓN PROGRAMADA ACTUALIZADA ---
exports.scheduledDailyNotifications = onSchedule({
  schedule: "1 0 * * *",
  timeZone: "America/Argentina/Buenos_Aires",
  region: "us-central1",
}, async (event) => {
  console.log("Iniciando tarea diaria de notificaciones (v2)...");
  let usersSnapshot = await db.collection("users").get();
  if (usersSnapshot.empty) {
    console.log(
        "El primer intento no encontró usuarios. " +
        "Esperando 2 segundos para reintentar (posible cold start)...",
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    usersSnapshot = await db.collection("users").get();
  }
  if (usersSnapshot.empty) {
    console.log("No se encontraron usuarios tras el reintento. Terminando.");
    return null;
  }

  console.log(`Procesando notificaciones para ${usersSnapshot.size} usuarios.`);
  const promises = usersSnapshot.docs.map((userDoc) =>
    processUserNotifications(userDoc.id),
  );
  await Promise.all(promises);
  console.log("Tarea diaria de notificaciones (v2) completada.");
  return null;
});

/**
 * Procesa las notificaciones automáticas para un solo usuario.
 * @param {string} userId El ID del usuario a procesar.
 */
async function processUserNotifications(userId) {
  const now = new Date();
  const notificationsRef = db.collection(`users/${userId}/notifications`);

  const frascosSnapshot = await db.collection(`users/${userId}/frascos`).get();
  if (!frascosSnapshot.empty) {
    for (const frascoDoc of frascosSnapshot.docs) {
      const frasco = frascoDoc.data();
      const diasCurado = Math.round(
          (now - frasco.fechaEnfrascado.toDate()) / (1000 * 60 * 60 * 24),
      );
      if (diasCurado === 5 || diasCurado === 10) {
        const message = `Tu frasco de "${frasco.nombreCosecha}"`+
          ` llegó al día ${diasCurado}. ¡Buen momento para un chequeo!`;
        const notifCreated = await createNotificationIfNotExists(
            notificationsRef, "curado", message, frascoDoc.id,
        );
        if (notifCreated) {
          await sendPushNotification(userId, {
            title: "Recordatorio de Curado 🌬️",
            body: `Es hora de ventilar tu frasco de "${frasco.nombreCosecha}".`,
          });
        }
      }
    }
  }

  const ciclosActivosSnapshot = await db
      .collection(`users/${userId}/ciclos`).where("estado", "==", "activo")
      .get();
  if (!ciclosActivosSnapshot.empty) {
    for (const cicloDoc of ciclosActivosSnapshot.docs) {
      const ciclo = cicloDoc.data();
      const startDateString = ciclo.phase === "Floración" ?
        ciclo.floweringStartDate :
        ciclo.vegetativeStartDate;
      if (!startDateString) continue;

      const diasDesdeInicio = Math.floor(
          (now - new Date(startDateString + "T00:00:00Z")) /
          (1000 * 60 * 60 * 24),
      ) + 1;

      if (diasDesdeInicio > 1 && (diasDesdeInicio - 1) % 7 === 0) {
        const semanaNum = Math.floor((diasDesdeInicio - 1) / 7) + 1;
        const message = `¡Nueva Semana! Tu ciclo "${ciclo.name}" comienza la ` +
          `semana ${semanaNum} de ${ciclo.phase}.`;
        const notifCreated = await createNotificationIfNotExists(
            notificationsRef, "semana", message, cicloDoc.id,
        );

        if (notifCreated && ciclo.phase === "Floración") {
          await sendPushNotification(userId, {
            title: "¡Nueva Semana de Cultivo! 🌱",
            body: `Tu ciclo "${ciclo.name}" comienza la semana ` +
              `${semanaNum} de Floración.`,
          });
        }
      }
    }
  }
}

/**
 * Envía una notificación push a un usuario específico.
 * @param {string} userId El ID del usuario al que se enviará el mensaje.
 * @param {object} payload El objeto con el título y cuerpo del mensaje.
 */
async function sendPushNotification(userId, payload) {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    console.log(`Usuario ${userId} no encontrado para enviar push.`);
    return;
  }

  const userData = userDoc.data();
  if (!userData.fcmTokens || userData.fcmTokens.length === 0) {
    console.log(`Usuario ${userId} no tiene tokens para notificaciones push.`);
    return;
  }
  const tokens = userData.fcmTokens;

  console.log("Tokens a los que se enviará:", tokens);

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    tokens: tokens,
  };

  console.log(
      "Objeto 'message' completo que se envía a FCM:",
      JSON.stringify(message, null, 2),
  );

  try {
    // --- LÍNEA CORREGIDA ---
    // El método correcto es sendMulticast, no sendEachForTokens.
    const response = await admin.messaging().sendMulticast(message);
    // --- FIN DE LA CORRECCIÓN ---

    console.log("Respuesta de FCM recibida para el usuario:", userId);
    console.log("Éxitos:", response.successCount, "Fallos:", response.failureCount);

    const tokensToRemove = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const error = result.error;
        console.log("Fallo al enviar al token:", tokens[index], error);
        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token"
        ) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await userDoc.ref.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
      console.log("Tokens inválidos eliminados para el usuario", userId);
    }
  } catch (error) {
    console.error("Error grave al intentar enviar notificación push:", error);
  }
}

/**
 * Crea una notificación interna si no existe una igual pendiente.
 * @param {object} ref La referencia a la colección de notificaciones.
 * @param {string} tipo El tipo de notificación.
 * @param {string} message El contenido del mensaje.
 * @param {string} itemId El ID del ítem asociado.
 * @return {Promise<boolean>} Verdadero si se creó una notificación.
 */
async function createNotificationIfNotExists(ref, tipo, message, itemId) {
  const link = `/${tipo}/${itemId}`;
  const q = ref
      .where("read", "==", false)
      .where("tipo", "==", tipo)
      .where("enlace", "==", link)
      .limit(1);
  const existingNotifSnapshot = await q.get();

  if (existingNotifSnapshot.empty) {
    await ref.add({
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      tipo,
      enlace: link,
    });
    console.log(`Notificación interna creada para ${itemId}`);
    return true;
  }

  console.log(`Notificación interna omitida (ya existe) para ${itemId}`);
  return false;
}
