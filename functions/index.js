const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const {onSchedule} = require("firebase-functions/v2/scheduler");

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

exports.scheduledDailyNotifications = onSchedule({
  schedule: "1 0 * * *",
  timeZone: "America/Argentina/Buenos_Aires",
  region: "us-central1",
}, async (event) => {
  console.log("Iniciando tarea diaria de notificaciones (v2)...");

  // --- LÓGICA DE REINTENTO AÑADIDA ---
  let usersSnapshot = await db.collection("users").get();

  // Si el primer intento devuelve un resultado vacío, esperamos y reintentamos.
  if (usersSnapshot.empty) {
    console.log(
        "El primer intento no encontró usuarios. " +
        "Esperando 2 segundos para reintentar (posible cold start)...",
    );
    // Pequeña pausa de 2 segundos
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Segundo intento
    usersSnapshot = await db.collection("users").get();
  }
  // --- FIN DE LA LÓGICA DE REINTENTO ---


  if (usersSnapshot.empty) {
    console.log("No se encontraron usuarios tras el reintento. Terminando.");
    return null;
  }

  // Si llegamos aquí, es porque SÍ encontró usuarios.
  console.log(`Procesando notificaciones para ${usersSnapshot.size} usuarios.`);
  const promises = usersSnapshot.docs.map((userDoc) =>
    processUserNotifications(userDoc.id),
  );

  await Promise.all(promises);
  console.log("Tarea diaria de notificaciones (v2) completada.");
  return null;
});


/**
 * Procesa todas las notificaciones pendientes para un único usuario.
 * @param {string} userId El ID del usuario a procesar.
 */
async function processUserNotifications(userId) {
  const now = new Date();
  const notificationsRef = db.collection(`users/${userId}/notifications`);

  // --- 1. Lógica para Recordatorios de Curado ---
  const frascosSnapshot = await db.collection(`users/${userId}/frascos`).get();
  if (!frascosSnapshot.empty) {
    for (const frascoDoc of frascosSnapshot.docs) {
      const frasco = frascoDoc.data();
      const fechaEnfrascado = frasco.fechaEnfrascado.toDate();
      const diasCurado = Math.round(
          (now - fechaEnfrascado) / (1000 * 60 * 60 * 24),
      );

      if (diasCurado === 5 || diasCurado === 10) {
        const message = `Tips de Curado: Tu frasco de "${frasco.nombreCosecha}"` +
          ` llegó al día ${diasCurado}. ¡Buen momento para un chequeo!`;
        await createNotificationIfNotExists(
            notificationsRef, "curado", message, frascoDoc.id,
        );
      }
    }
  }

  // --- 2. Lógica para Hitos de Ciclos ---
  const ciclosActivosSnapshot = await db.collection(`users/${userId}/ciclos`)
      .where("estado", "==", "activo").get();

  if (!ciclosActivosSnapshot.empty) {
    for (const cicloDoc of ciclosActivosSnapshot.docs) {
      const ciclo = cicloDoc.data();
      const startDateString = ciclo.phase === "Floración" ?
        ciclo.floweringStartDate : ciclo.vegetativeStartDate;

      if (!startDateString) continue;

      const startDate = new Date(startDateString + "T00:00:00Z");
      const diasDesdeInicio = Math.floor(
          (now - startDate) / (1000 * 60 * 60 * 24),
      ) + 1;

      // --- 2a. Hito de Nueva Semana ---
      if (diasDesdeInicio > 1 && (diasDesdeInicio - 1) % 7 === 0) {
        const semanaNum = Math.floor((diasDesdeInicio - 1) / 7) + 1;
        const message = `¡Nueva Semana! Tu ciclo "${ciclo.name}" comienza la ` +
          `semana ${semanaNum} de ${ciclo.phase}.`;
        await createNotificationIfNotExists(
            notificationsRef, "semana", message, cicloDoc.id,
        );
      }

      // --- 2b. Sugerencia de Fin de Ciclo ---
      const {phase, floweringWeeks} = ciclo;
      if (phase === "Floración" && floweringWeeks && floweringWeeks.length > 0) {
        const totalSemanas = floweringWeeks.length;
        const diaInicioUltimaSemana = (totalSemanas - 1) * 7 + 1;

        if (diasDesdeInicio === diaInicioUltimaSemana) {
          const message = `Recta Final: Tu ciclo "${ciclo.name}" está en su ` +
            "última semana. Es un buen momento para revisar los tricomas y " +
            "planificar los días finales.";
          await createNotificationIfNotExists(
              notificationsRef, "accion", message, cicloDoc.id,
          );
        }
      }
    }
  }
}

/**
 * Crea una notificación solo si no existe una del mismo tipo y para el
 * mismo ítem, evitando duplicados para el usuario.
 * @param {FirebaseFirestore.CollectionReference} ref La referencia a la
 * colección de notificaciones del usuario.
 * @param {string} tipo El tipo de notificación (ej: 'curado').
 * @param {string} message El mensaje a mostrar.
 * @param {string} itemId El ID del ciclo o frasco al que se refiere.
 */
async function createNotificationIfNotExists(ref, tipo, message, itemId) {
  const link = `/${tipo}/${itemId}`;

  const existingNotifQuery = await ref.where("read", "==", false)
      .where("tipo", "==", tipo)
      .where("enlace", "==", link)
      .limit(1)
      .get();

  if (existingNotifQuery.empty) {
    await ref.add({
      message: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      tipo: tipo,
      enlace: link,
    });
    console.log(`Notificación creada para ${itemId}: ${message}`);
  } else {
    console.log(`Notificación omitida (ya existe) para el item ${itemId}`);
  }
}
