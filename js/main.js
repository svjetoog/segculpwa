// js/main.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, serverTimestamp, getDocs, writeBatch, updateDoc, arrayUnion, where, increment, getDoc, collectionGroup, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    getEl, showNotification, renderSalasGrid, createCicloCard, createLogEntry,
    renderGeneticsList, renderStockList,
    renderBaulSemillasList,
    renderGeneticsListCompact, renderBaulSemillasListCompact, renderStockListCompact,
    initializeEventListeners,
    renderCicloDetails, renderToolsView, renderSettingsView,
    openSalaModal as uiOpenSalaModal,
    openCicloModal as uiOpenCicloModal,
    openLogModal as uiOpenLogModal,
    openGeneticsSelectorModal as uiOpenGeneticsSelectorModal,
    openGerminateModal as uiOpenGerminateModal,
    openMoveCicloModal as uiOpenMoveCicloModal,
    openFinalizarCicloModal as uiOpenFinalizarCicloModal,
    renderHistorialView,
    renderPhenohuntList,
    renderPhenohuntWorkspace,
    openPhenoEditModal as uiOpenPhenoEditModal,
    openAddToCatalogModal as uiOpenAddToCatalogModal,
    openPromoteToGeneticModal,
    renderHeader,
    renderDashboard,
    initializeDashboardEventListeners,
    openBulkAddModal as uiOpenBulkAddModal,
    renderWizardCicloRow,
    openSetupWizardModal as uiOpenSetupWizardModal,
    renderSalasView
} from './ui.js';
import { startMainTour, startToolsTour } from './onboarding.js';

// --- STATE MANAGEMENT ---
let userId = null;
let salasUnsubscribe = null, ciclosUnsubscribe = null, logsUnsubscribe = null, geneticsUnsubscribe = null, seedsUnsubscribe = null, historialUnsubscribe = null, phenohuntUnsubscribe = null;
let currentSalas = [], currentCiclos = [], currentGenetics = [], currentSeeds = [], currentHistorial = [], currentPhenohunts = [];
let currentSalaId = null, currentSalaName = null;
let confirmCallback = null;
let activeToolsTab = 'genetics';
let toolsViewMode = localStorage.getItem('toolsViewMode') || 'card';
let sortableSalas = null;
let sortableGenetics = null;
let sortableStock = null;
let sortableSeeds = null;

const PREDEFINED_TAGS = {
    "Cualidades del Producto Final": ["Muy Potente", "Ultra Resinoso", "Aroma Intenso", "Sabor Complejo", "Flores Densas", "Aspecto Atractivo"],
    "Experiencia de Cultivo": ["Fácil de Cultivar", "Resistente a Plagas"],
    "Producción": ["Baja Producción", "Producción Media", "Alta Producción"]
};
const MAX_CUSTOM_TAGS = 3;

const PHENOHUNT_TAGS = {
    "Estructura de la Planta": ["Compacta", "Espigada", "Buena Ramificación", "Distancia Internodal Corta", "Distancia Internodal Larga", "Tallo Robusto"],
    "Perfil de Terpenos": ["Cítrico", "Terroso", "Dulce", "Gassy / Fuel", "Floral", "Frutal", "Pino", "Especiado"],
    "Producción": ["Baja", "Media", "Alta", "Muy Alta"],
    "Producción de Resina": ["Baja", "Normal", "Alta", "Ultra Resinosa"],
    "Resistencia": ["Resistente a Plagas", "Resistente a Hongos", "Sensible"],
};

// --- 1. FUNCTION DEFINITIONS (LOGIC & DATA) ---

function handleAuthError(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'El formato del email no es válido.';
        case 'auth/user-not-found': case 'auth/wrong-password': return 'Email o contraseña incorrectos.';
        case 'auth/email-already-in-use': return 'Este email ya está registrado.';
        case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
        default: return 'Ocurrió un error. Inténtalo de nuevo.';
    }
}

function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showNotification('No hay datos para exportar.', 'error');
        return;
    }

    const headers = Object.keys(data[0]);
    // CORREGIDO: Volvemos a la coma (,), el estándar universal que Google Sheets prefiere.
    const csvRows = [headers.join(',')]; 

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        // CORREGIDO: Volvemos a la coma (,) también aquí.
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    // Mantenemos el BOM (\uFEFF) ya que no molesta a Google Sheets y sigue ayudando a Excel.
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Exportación generada con éxito.');
}

function calculateDaysSince(startDateString) {
    if (!startDateString) return null;
    const start = new Date(startDateString + 'T00:00:00Z');
    if (isNaN(start.getTime())) return null;
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (start > todayUTC) return 0;
    const diffTime = todayUTC - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
}

function calculateDaysBetween(start, end) {
    if (!start || !end) return 0;
    const startDate = start.toDate ? start.toDate() : start;
    const endDate = end.toDate ? end.toDate() : end;
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}


function getPhaseInfo(phaseName) {
    switch(phaseName) {
        case 'Vegetativo': return { name: 'VEGETATIVO', color: 'bg-green-600', class: 'vegetativo' };
        case 'PRE-FLORA': return { name: 'PRE-FLORA', color: 'bg-purple-600', class: 'pre-flora' };
        case 'FLORA': return { name: 'FLORA', color: 'bg-pink-600', class: 'flora' };
        case 'MADURACION': return { name: 'MADURACION', color: 'bg-orange-600', class: 'maduracion' };
        case 'LAVADO': return { name: 'LAVADO', color: 'bg-blue-600', class: 'lavado' };
        case 'en_secado': return { name: 'EN SECADO', color: 'bg-yellow-400 text-black', class: 'secado' };
        default: return { name: 'Finalizado', color: 'bg-gray-500', class: 'finalizado' };
    }
}

function calculateVegetativeWeeks(startDateString) {
    const days = calculateDaysSince(startDateString);
    if (days === null || days < 1) return []; 
    const weekCount = Math.ceil(days / 7);
    const weeks = [];
    for (let i = 1; i <= weekCount; i++) {
        weeks.push({ weekNumber: i, phaseName: 'Vegetativo' });
    }
    return weeks.length > 0 ? weeks : [{ weekNumber: 1, phaseName: 'Vegetativo' }];
}

function generateStandardWeeks() {
    const weeks = [];
    for (let i = 1; i <= 9; i++) {
        let phaseName;
        if (i <= 3) phaseName = 'PRE-FLORA';
        else if (i <= 6) phaseName = 'FLORA';
        else if (i <= 8) phaseName = 'MADURACION';
        else if (i === 9) phaseName = 'LAVADO';
        weeks.push({ weekNumber: i, phaseName });
    }
    return weeks;
}

function formatFertilizers(fertilizers) {
    if (!fertilizers) return 'Ninguno';
    if (Array.isArray(fertilizers) && fertilizers.length > 0) {
        return fertilizers.map(f => `${f.productName} (${f.dose} ${f.unit})`).join(', ');
    }
    if (typeof fertilizers === 'object' && !Array.isArray(fertilizers)) {
        const used = [];
        if (fertilizers.basesAmount && fertilizers.basesUnit) used.push(`Bases (${fertilizers.basesAmount} ${fertilizers.basesUnit})`);
        if (fertilizers.enzimas) used.push('Enzimas');
        if (fertilizers.candy) used.push('Candy');
        if (fertilizers.bigBud) used.push('BigBud');
        if (fertilizers.flawlessFinish) used.push('FlawlessFinish');
        if (fertilizers.foliar && fertilizers.foliarProduct) used.push(`Foliar (${fertilizers.foliarProduct})`);
        return used.length > 0 ? used.join(', ') : 'Ninguno';
    }
    return 'Ninguno';
}

function initializeDragAndDrop() {
    const salasGrid = getEl('salasGrid');
    if (sortableSalas) sortableSalas.destroy();

    if (salasGrid) {
        sortableSalas = new Sortable(salasGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                const batch = writeBatch(db);
                Array.from(evt.to.children).forEach((item, index) => {
                    const salaId = item.dataset.salaId;
                    if (salaId) {
                        const salaRef = doc(db, `users/${userId}/salas`, salaId);
                        batch.update(salaRef, { position: index });
                    }
                });
                try {
                    await batch.commit();
                    showNotification('Orden de salas guardado.');
                } catch (error) {
                    console.error("Error saving new sala order:", error);
                    showNotification('Error al guardar el nuevo orden.', 'error');
                }
            },
        });
    }
}

function destroyToolSortables() {
    if (sortableGenetics) {
        sortableGenetics.destroy();
        sortableGenetics = null;
    }
    if (sortableStock) {
        sortableStock.destroy();
        sortableStock = null;
    }
    if (sortableSeeds) {
        sortableSeeds.destroy();
        sortableSeeds = null;
    }
}

function initializeToolsDragAndDrop() {
    const onSortEnd = async (evt, collectionName) => {
        const batch = writeBatch(db);
        Array.from(evt.to.children).forEach((item, index) => {
            const docId = item.dataset.id;
            if (docId) {
                const docRef = doc(db, `users/${userId}/${collectionName}`, docId);
                batch.update(docRef, { position: index });
            }
        });
        try {
            await batch.commit();
            showNotification('Orden guardado.');
        } catch (error) {
            console.error(`Error saving new ${collectionName} order:`, error);
            showNotification('Error al guardar el nuevo orden.', 'error');
        }
    };

    destroyToolSortables();

    if (activeToolsTab === 'genetics') {
        const geneticsList = getEl('geneticsList');
        if (geneticsList) {
            sortableGenetics = new Sortable(geneticsList, { animation: 150, ghostClass: 'sortable-ghost', onEnd: (evt) => onSortEnd(evt, 'genetics') });
        }
    } else if (activeToolsTab === 'stock') {
        const stockList = getEl('stockList');
        if (stockList) {
            sortableStock = new Sortable(stockList, { animation: 150, ghostClass: 'sortable-ghost', onEnd: (evt) => onSortEnd(evt, 'genetics') });
        }
    } else if (activeToolsTab === 'baulSemillas') {
        const seedsList = getEl('baulSemillasList');
        if (seedsList) {
            sortableSeeds = new Sortable(seedsList, { animation: 150, ghostClass: 'sortable-ghost', onEnd: (evt) => onSortEnd(evt, 'seeds') });
        }
    }
}


function loadSalas() {
    if (!userId) return;
    // Ya no manipulamos los loaders de la vista de salas, el dashboard se encarga
    const q = query(collection(db, `users/${userId}/salas`), orderBy("position")); // Añadido orderBy para consistencia
    if (salasUnsubscribe) salasUnsubscribe();
    salasUnsubscribe = onSnapshot(q, (snapshot) => {
        currentSalas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Si el dashboard está visible, volvemos a renderizar la grilla de salas dentro de él.
        const appView = getEl('app');
        if (appView && !appView.classList.contains('hidden')) {
            const ciclosActivos = currentCiclos.filter(c => c.estado !== 'finalizado');
            renderSalasGrid(currentSalas, ciclosActivos, handlers);
            initializeDragAndDrop(); // Re-inicializamos D&D para las salas
        }
        
    }, error => {
        console.error("Error loading salas:", error);
        const salasGrid = getEl('salasGrid');
        if(salasGrid) salasGrid.innerHTML = `<p class="text-red-500">Error al cargar las salas.</p>`;
    });
}

function loadCiclos() {
    if (!userId) return;
    const q = query(collection(db, `users/${userId}/ciclos`));
    if (ciclosUnsubscribe) ciclosUnsubscribe();
    ciclosUnsubscribe = onSnapshot(q, (snapshot) => {
        // `currentCiclos` ahora solo contendrá los que están 'activos' o 'en_curado', pero no los 'finalizados'.
        currentCiclos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => c.estado !== 'finalizado');
        
        // Si el dashboard es la vista activa, lo refrescamos con los datos actualizados.
        if (!getEl('app').classList.contains('hidden')) {
            handlers.showDashboard();
        }
        
        // Si la vista de detalle de un ciclo está activa, la refrescamos.
        if (!getEl('cicloDetailView').classList.contains('hidden')) {
            const activeCicloId = getEl('cicloDetailView').querySelector('[data-ciclo-id]')?.dataset.cicloId;
            if (activeCicloId) {
                const updatedCiclo = currentCiclos.find(c => c.id === activeCicloId);
                if (updatedCiclo) {
                    handlers.showCicloDetails(updatedCiclo);
                } else {
                    // Si el ciclo ya no se encuentra en la lista activa (ej. se finalizó), volvemos al panel.
                    handlers.hideCicloDetails();
                }
            }
        }
    });
}

function loadGenetics() {
    if (!userId) return;
    const q = query(collection(db, `users/${userId}/genetics`));
    if (geneticsUnsubscribe) geneticsUnsubscribe();
    geneticsUnsubscribe = onSnapshot(q, (snapshot) => {
        currentGenetics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        currentGenetics.sort((a, b) => (a.position || 0) - (b.position || 0));
        if(!getEl('toolsView').classList.contains('hidden')) {
            handlers.handleToolsSearch({ target: getEl('searchTools') });
        }
    });
}

function loadPhenohunts() {
    if (!userId) return;
    const q = query(collection(db, `users/${userId}/ciclos`), where("isPhenohunt", "==", true), where("estado", "==", "activo"));
    if (phenohuntUnsubscribe) phenohuntUnsubscribe();
    phenohuntUnsubscribe = onSnapshot(q, (snapshot) => {
        currentPhenohunts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (activeToolsTab === 'phenohunt') {
             renderPhenohuntList(currentPhenohunts, handlers);
        }
    }, error => {
        console.error("Error loading phenohunts:", error);
        const listContainer = getEl('phenohuntList');
        if(listContainer) listContainer.innerHTML = `<p class="text-red-500">Error al cargar las cacerías.</p>`
    });
}

function loadHistorial() {
    if (!userId) return;
    const q = query(collection(db, `users/${userId}/ciclos`), where("estado", "==", "finalizado"));
    if (historialUnsubscribe) historialUnsubscribe();
    historialUnsubscribe = onSnapshot(q, (snapshot) => {
        currentHistorial = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (activeToolsTab === 'historial') {
             renderHistorialView(currentHistorial, handlers);
        }
    }, error => {
        console.error("Error loading history:", error);
    });
}

function loadLogsForCiclo(cicloId, weekNumbers) {
    if (logsUnsubscribe) logsUnsubscribe();
    const q = query(collection(db, `users/${userId}/ciclos/${cicloId}/logs`));
    logsUnsubscribe = onSnapshot(q, (snapshot) => {
        const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate() }));
        allLogs.sort((a, b) => b.date - a.date);
        
        const weeksWithLogs = new Set(allLogs.map(log => log.week));

        weekNumbers.forEach(weekNum => {
            const logContainer = getEl(`logs-week-${weekNum}`);
            if(logContainer) {
                logContainer.innerHTML = `<p class="text-gray-500 dark:text-gray-400 italic">No hay registros.</p>`;
                if (!weeksWithLogs.has(weekNum)) {
                    logContainer.classList.add('hidden');
                }
            }
        });
        
        allLogs.forEach(log => {
            const logContainer = getEl(`logs-week-${log.week}`);
            if (logContainer) {
                if (logContainer.querySelector('p.italic')) logContainer.innerHTML = '';
                const ciclo = currentCiclos.find(c => c.id === cicloId);
                logContainer.appendChild(createLogEntry(log, ciclo, handlers));
            }
        });
    });
}

async function runDataMigration(userId) {
    const userDocRef = doc(db, 'users', userId);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().dataModelVersion === 2) {
            console.log('El modelo de datos ya está actualizado. No se requiere migración.');
            return; // La migración ya se hizo, no hacemos nada.
        }

        console.log('Iniciando migración de datos a v2 para el usuario:', userId);
        
        // 1. Leer todos los datos viejos y actuales
        const geneticsRef = collection(db, `users/${userId}/genetics`);
        const seedsRef = collection(db, `users/${userId}/seeds`);

        const [geneticsSnapshot, seedsSnapshot] = await Promise.all([
            getDocs(geneticsRef),
            getDocs(seedsRef)
        ]);

        if (seedsSnapshot.empty) {
             console.log('No hay semillas para migrar. Marcando como actualizado.');
             await setDoc(userDocRef, { dataModelVersion: 2 }, { merge: true });
             return;
        }

        const existingGenetics = geneticsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const batch = writeBatch(db);

        // 2. Fusionar datos de semillas en genéticas
        for (const seedDoc of seedsSnapshot.docs) {
            const seed = seedDoc.data();
            const existingGenetic = existingGenetics.find(g => g.name.toLowerCase() === seed.name.toLowerCase());

            if (existingGenetic) {
                // La genética ya existe, actualizamos su stock de semillas
                const existingGeneticRef = doc(db, `users/${userId}/genetics`, existingGenetic.id);
                batch.update(existingGeneticRef, {
                    seedStock: increment(seed.quantity),
                    isSeedAvailable: true
                });
            } else {
                // La genética no existe, la creamos desde la semilla
                const newGeneticRef = doc(geneticsRef);
                batch.set(newGeneticRef, {
                    name: seed.name,
                    bank: seed.bank || null,
                    parents: null,
                    owner: null,
                    favorita: false,
                    cloneStock: 0,
                    seedStock: seed.quantity,
                    isSeedAvailable: true,
                    position: existingGenetics.length // Añadir al final
                });
                existingGenetics.push({name: seed.name}); // Evitar duplicados en la misma ejecución
            }
            
            // 3. Borrar la semilla vieja del baúl
            batch.delete(seedDoc.ref);
        }

        // 4. Marcar la migración como completada
        batch.set(userDocRef, { dataModelVersion: 2 }, { merge: true });

        // 5. Ejecutar todas las operaciones
        await batch.commit();
        console.log('¡Migración a v2 completada con éxito!');

    } catch (error) {
        console.error("¡ERROR GRAVE DURANTE LA MIGRACIÓN DE DATOS!", error);
        // En un caso real, aquí se podría registrar el error en un servicio de monitoreo
    }
}

const handlers = {
    signOut: () => signOut(auth),
    handleLogin: (email, password) => {
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => {
                getEl('authError').innerText = handleAuthError(error);
                getEl('authError').classList.remove('hidden');
            });
    },
    openBulkAddModal: () => {
        uiOpenBulkAddModal(handlers);
    },
    getAllSalas: () => currentSalas,

    openSetupWizard: () => {
        uiOpenSetupWizardModal(handlers);
    },
    showDashboard: () => {
        // --- LÓGICA RESTAURADA PARA CALCULAR DATOS DINÁMICOS ---
        const activeCiclos = currentCiclos.filter(c => c.estado === 'activo');
        
        // Calculamos el total de plantas sumando las cantidades de genéticas en todos los ciclos activos
        const totalPlants = activeCiclos.reduce((acc, ciclo) => {
            return acc + (ciclo.genetics ? ciclo.genetics.reduce((pAcc, gen) => pAcc + (gen.quantity || 0), 0) : 0);
        }, 0);

        // Creamos los datos para las tarjetas de estadísticas
        const statsData = [
            { label: 'Salas Activas', value: currentSalas.length, icon: '🚪', color: 'amber' },
            { label: 'Ciclos Activos', value: activeCiclos.length, icon: '🔄', color: 'pink' },
            { label: 'Plantas Totales', value: totalPlants, icon: '🌿', color: 'green' },
            { label: 'Genéticas Únicas', value: currentGenetics.length, icon: '🧬', color: 'purple' },
        ];

        // Obtenemos la actividad reciente basándonos en los últimos logs registrados
        const recentActivity = currentCiclos
            .filter(c => c.lastLogTimestamp)
            .sort((a, b) => b.lastLogTimestamp.toDate() - a.lastLogTimestamp.toDate())
            .slice(0, 3) // Tomamos los 3 más recientes
            .map(c => {
                const timeDiff = new Date() - c.lastLogTimestamp.toDate();
                const hoursAgo = Math.round(timeDiff / (1000 * 60 * 60));
                const timeAgo = hoursAgo < 1 ? 'Recién' : (hoursAgo === 1 ? 'Hace 1 hora' : `Hace ${hoursAgo} horas`);

                return {
                    icon: '📝',
                    description: `Nuevo registro: "${c.lastLogType || 'Actividad'}"`,
                    cicloName: c.name,
                    timeAgo: timeAgo
                };
            });
            
        const curingJars = currentCiclos.filter(c => c.estado === 'en_curado')
            .sort((a,b) => b.fechaInicioCurado.toDate() - a.fechaInicioCurado.toDate())
            .slice(0, 3);
        
        // --- FIN DE LA LÓGICA RESTAURADA ---

        // 1. Renderizamos el Dashboard con los datos que acabamos de calcular
        renderDashboard(statsData, recentActivity, curingJars);
        
        // 2. Inicializamos los listeners específicos del dashboard (como el carrusel de stats)
        initializeDashboardEventListeners(statsData);
        
        // 3. Conectamos el botón "Ver todas las salas" que está dentro del dashboard
        const navigateToSalasBtn = getEl('navigateToSalas');
        if(navigateToSalasBtn) {
            navigateToSalasBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handlers.showSalasView();
            });
        }
    },
    showSalasView: () => {
        renderSalasView(currentSalas, currentCiclos, handlers);
        initializeDragAndDrop();
    },
    handleFinishCuring: (cicloId, cicloName) => {
        handlers.showConfirmationModal(`¿Seguro que querés dar por finalizado el frasco de "${cicloName}"? El ciclo se moverá a tu historial de forma permanente.`, async () => {
            try {
                const cicloRef = doc(db, `users/${userId}/ciclos`, cicloId);
                await updateDoc(cicloRef, {
                    estado: 'finalizado',
                    fechaFinalizacion: serverTimestamp()
                });
                showNotification(`El frasco de "${cicloName}" fue movido al historial.`);
            } catch (error) {
                console.error("Error finalizando el curado:", error);
                showNotification('Error al finalizar el frasco.', 'error');
            }
        });
    },
    handleWizardStep1Next: async () => {
        const textarea = getEl('wizard-salas-textarea');
        const salaNames = textarea.value.split('\n').map(s => s.trim()).filter(s => s !== '');

        if (salaNames.length > 0) {
            const batch = writeBatch(db);
            const salasRef = collection(db, `users/${userId}/salas`);
            salaNames.forEach((name, index) => {
                const newSalaRef = doc(salasRef);
                batch.set(newSalaRef, { name: name, position: (currentSalas.length || 0) + index });
            });
            try {
                await batch.commit();
                showNotification(`${salaNames.length} sala(s) creadas con éxito.`);
                // Forzamos la recarga de salas para que el estado se actualice antes de pasar al paso 2
                loadSalas(); 
            } catch (error) {
                console.error("Error creando salas en masa:", error);
                showNotification('Error al crear las salas.', 'error');
                return;
            }
        }

        // Cambiar la vista del modal al paso 2
        getEl('wizard-modal-title').textContent = 'Configuración Rápida - Paso 2: Ciclos';
        getEl('wizard-step-1').classList.add('hidden');
        getEl('wizard-step-2').classList.remove('hidden');
        getEl('wizard-step-1-next').classList.add('hidden');
        getEl('wizard-step-2-save').classList.remove('hidden');

        // Añadimos una primera fila por defecto para guiar al usuario
        if (getEl('wizard-ciclos-container').childElementCount === 0) {
            renderWizardCicloRow(null, currentSalas);
        }
    },

    handleWizardSaveAll: async () => {
        const rows = document.querySelectorAll('.wizard-ciclo-row');
        if (rows.length === 0) {
            getEl('setupWizardModal').style.display = 'none';
            return;
        }

        const batch = writeBatch(db);
        const ciclosRef = collection(db, `users/${userId}/ciclos`);
        let ciclosCreados = 0;

        rows.forEach(row => {
            const name = row.querySelector('.wizard-ciclo-name').value.trim();
            const salaId = row.querySelector('.wizard-ciclo-sala').value;
            const phase = row.querySelector('.wizard-ciclo-phase').value;
            const date = row.querySelector('.wizard-ciclo-date').value;

            if (!name || !salaId || !date) {
                return; // Omitir filas incompletas
            }
            
            const cicloData = {
                name: name,
                salaId: salaId,
                phase: phase,
                estado: 'activo',
                genetics: [],
                vegetativeStartDate: phase === 'Vegetativo' ? date : null,
                floweringStartDate: phase === 'Floración' ? date : null,
                cultivationType: 'Sustrato', // Valor por defecto
            };

            if (phase === 'Floración') {
                cicloData.floweringWeeks = generateStandardWeeks();
            }

            const newCicloRef = doc(ciclosRef);
            batch.set(newCicloRef, cicloData);
            ciclosCreados++;
        });

        if (ciclosCreados === 0) {
            showNotification('Rellena los datos de al menos un ciclo para guardar.', 'error');
            return;
        }

        try {
            await batch.commit();
            showNotification(`${ciclosCreados} ciclo(s) creados con éxito.`, 'success');
            getEl('setupWizardModal').style.display = 'none';
        } catch (error) {
            console.error("Error guardando ciclos en masa:", error);
            showNotification('Error al guardar los ciclos.', 'error');
        }
    },
    handleBulkStep1Next: () => {
        const textarea = getEl('bulk-names-textarea');
        const names = textarea.value
            .split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
        
        if (names.length === 0) {
            showNotification('Debes introducir al menos un nombre de genética.', 'error');
            return;
        }
        
        // Usamos Set para obtener nombres únicos y evitar duplicados en el paso 2
        const uniqueNames = [...new Set(names)];
        renderBulkStep2(uniqueNames);
    },
    
    handleBulkStep2Back: () => {
        getEl('bulk-modal-title').textContent = 'Carga Rápida - Paso 1: Nombres';
        getEl('bulk-step-1').classList.remove('hidden');
        getEl('bulk-step-2').classList.add('hidden');
        getEl('bulk-step-1-next').classList.remove('hidden');
        getEl('bulk-step-2-back').classList.add('hidden');
        getEl('bulk-step-2-save').classList.add('hidden');
    },

    handleBulkSaveAll: async () => {
        const rows = document.querySelectorAll('.bulk-details-row');
        const batch = writeBatch(db);
        const geneticsRef = collection(db, `users/${userId}/genetics`);
        let processedCount = 0;

        try {
            for (const row of rows) {
                const name = row.querySelector('.bulk-input-name').value.trim();
                const cloneStock = parseInt(row.querySelector('.bulk-input-clones').value) || 0;
                const seedStock = parseInt(row.querySelector('.bulk-input-seeds').value) || 0;

                if (!name || (cloneStock === 0 && seedStock === 0)) {
                    continue; // Omitir filas sin nombre o sin stock para guardar
                }
                
                processedCount++;

                const q = query(geneticsRef, where("name", "==", name));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    // La genética no existe, la creamos con todos los datos
                    const newDocData = {
                        name: name,
                        cloneStock: cloneStock,
                        seedStock: seedStock,
                        isSeedAvailable: seedStock > 0,
                        bank: row.querySelector('.bulk-input-bank').value.trim() || null,
                        parents: row.querySelector('.bulk-input-parents').value.trim() || null,
                        owner: row.querySelector('.bulk-input-owner').value.trim() || null,
                        favorita: false,
                        position: (currentGenetics.length || 0) + processedCount
                    };
                    const newDocRef = doc(geneticsRef);
                    batch.set(newDocRef, newDocData);
                } else {
                    // La genética ya existe, actualizamos su stock
                    const existingDocRef = querySnapshot.docs[0].ref;
                    const updateData = {
                        cloneStock: increment(cloneStock),
                        seedStock: increment(seedStock),
                    };
                    if (seedStock > 0) {
                        updateData.isSeedAvailable = true;
                    }
                    batch.update(existingDocRef, updateData);
                }
            }
            
            if (processedCount === 0) {
                showNotification('No hay datos válidos para guardar.', 'error');
                return;
            }

            await batch.commit();
            getEl('bulkAddModal').style.display = 'none';
            showNotification(`${processedCount} genéticas guardadas/actualizadas con éxito.`, 'success');

        } catch (error) {
            console.error("Error en la carga masiva (Paso 2):", error);
            showNotification("Ocurrió un error al guardar los datos.", "error");
        }
    },
    getSalaNameById: (salaId) => {
        const sala = currentSalas.find(s => s.id === salaId);
        return sala ? sala.name : 'Desconocida';
    },
    // Este handler llama a la función de UI que crea el modal
openPhenoEditModal: (individuo) => {
    // La constante PHENOHUNT_TAGS la creamos al principio de este paso
    uiOpenPhenoEditModal(individuo, PHENOHUNT_TAGS);
},
    openPromoteToGeneticModal: (individuo, originalGeneticId) => {
    // Buscamos la data original de la genética para heredar el banco/parentales
    const originalGenetic = currentGenetics.find(g => g.id === originalGeneticId);
    if (originalGenetic) {
        openPromoteToGeneticModal(individuo, originalGenetic);
    } else {
        showNotification('No se encontró la genética original para heredar los datos.', 'error');
    }
},

handlePromoteToGenetic: async (e) => {
    e.preventDefault();
    const form = e.target;
    const phenoId = form.dataset.phenoId;
    const huntId = form.dataset.huntId;
    const modal = getEl('promoteToGeneticModal');

    const newGeneticData = {
        name: getEl('promote-name').value.trim(),
        bank: getEl('promote-bank').value.trim(),
        parents: getEl('promote-parents').value.trim(),
        notes: getEl('promote-notes').value.trim(),
        cloneStock: 1, // Por defecto, al guardarlo, tienes 1 clon (el keeper)
        seedStock: 0,
        favorita: true, // Un keeper siempre es favorito por defecto
        isSeedAvailable: false,
        position: currentGenetics.length // Se añade al final de la lista
    };

    if (!newGeneticData.name) {
        showNotification('El nombre de la nueva genética es obligatorio.', 'error');
        return;
    }

    const batch = writeBatch(db);

    try {
        // 1. Añadimos la nueva genética al catálogo
        const newGeneticRef = doc(collection(db, `users/${userId}/genetics`));
        batch.set(newGeneticRef, newGeneticData);

        // 2. Marcamos el fenotipo como "promovido" en el ciclo para evitar duplicados
        const huntRef = doc(db, `users/${userId}/ciclos`, huntId);
        const huntDoc = await getDoc(huntRef);
        if (huntDoc.exists()) {
            const huntData = huntDoc.data();
            const updatedGenetics = huntData.genetics.map(individuo => {
                if (individuo.phenoId === phenoId) {
                    return { ...individuo, promoted: true }; // Marcamos como promovido
                }
                return individuo;
            });
            batch.update(huntRef, { genetics: updatedGenetics });
        }

        // 3. Ejecutamos ambas operaciones
            await batch.commit();

            showNotification(`¡"${newGeneticData.name}" añadido al catálogo!`, 'success');
            modal.style.display = 'none';

        } catch (error) {
            console.error("Error promoviendo fenotipo:", error);
            showNotification("Error al promover la genética.", "error");
        }
    },
// Este handler es la lógica que se ejecuta cuando guardas el modal
handlePhenoCardUpdate: async (e) => {
    e.preventDefault();
    const form = e.target;
    const phenoId = form.dataset.phenoId;
    const huntId = form.dataset.huntId; // Obtenemos el ID del ciclo
    const modal = getEl('phenoEditModal');

    // Recolectamos todos los datos del formulario
    const notes = getEl('pheno-notes').value.trim();
    const predefinedTags = Array.from(form.querySelectorAll('#predefined-tags-container .tag.active')).map(t => t.textContent);
    const customTags = Array.from(form.querySelectorAll('#custom-tags-container .tag')).map(t => t.firstChild.textContent);

    // Apuntamos al documento del ciclo en la base de datos
    const huntRef = doc(db, `users/${userId}/ciclos`, huntId);
    try {
        const huntDoc = await getDoc(huntRef);
        if (!huntDoc.exists()) throw new Error("Ciclo de cacería no encontrado");

        const huntData = huntDoc.data();
        
        // Creamos una nueva versión del array de genéticas con nuestro individuo actualizado
        const updatedGenetics = huntData.genetics.map(individuo => {
            if (individuo.phenoId === phenoId) {
                // Actualizamos el individuo con las nuevas notas y etiquetas
                return { 
                    ...individuo, 
                    notes: notes, 
                    tags: { predefined: predefinedTags, custom: customTags } 
                };
            }
            return individuo;
        });
        
        // Guardamos el array completo de vuelta en la base de datos
        await updateDoc(huntRef, { genetics: updatedGenetics });
        showNotification('Evaluación guardada con éxito.');
        modal.style.display = 'none';

    } catch (error) {
        console.error("Error guardando evaluación del feno:", error);
        showNotification("Error al guardar la evaluación.", "error");
    }
},
    showPhenohuntWorkspace: (hunt) => {
        handlers.hideAllViews();
        const view = getEl('phenohuntDetailView');
        renderPhenohuntWorkspace(hunt, handlers);
        view.classList.remove('hidden');
        view.classList.add('view-container');
    },

    hidePhenohuntWorkspace: () => {
        const view = getEl('phenohuntDetailView');
        view.classList.add('hidden');
        view.classList.remove('view-container');
        // Volvemos a la vista de herramientas, en la pestaña correcta.
        handlers.showToolsView();
        handlers.switchToolsTab('phenohunt');
    },

    handleSetPhenoDecision: async (huntId, phenoId, newDecision) => {
        const huntRef = doc(db, `users/${userId}/ciclos`, huntId);
        try {
            const huntDoc = await getDoc(huntRef);
            if (!huntDoc.exists()) throw new Error("Ciclo de cacería no encontrado");
            
            const huntData = huntDoc.data();
            let wasChanged = false;

            const updatedGenetics = huntData.genetics.map(individuo => {
                if (individuo.phenoId === phenoId) {
                    // Si el usuario vuelve a hacer clic en la misma decisión, la quitamos (vuelve a 'evaluacion')
                    const finalDecision = individuo.decision === newDecision ? 'evaluacion' : newDecision;
                    if (individuo.decision !== finalDecision) {
                        wasChanged = true;
                    }
                    return { ...individuo, decision: finalDecision };
                }
                return individuo;
            });

            if (wasChanged) {
                await updateDoc(huntRef, { genetics: updatedGenetics });
                showNotification('Decisión guardada.');
                // onSnapshot se encargará de redibujar la vista automáticamente.
            }

        } catch (error) {
            console.error("Error al guardar la decisión del feno:", error);
            showNotification("Error al guardar la decisión.", "error");
        }
    },
    handleRegister: (email, password) => {
        createUserWithEmailAndPassword(auth, email, password)
            .catch(error => {
                getEl('authError').innerText = handleAuthError(error);
                getEl('authError').classList.remove('hidden');
            });
    },
     openAddToCatalogModal: () => {
        uiOpenAddToCatalogModal(handlers);
    },

    handleAddToCatalogSubmit: async (e, type) => {
        e.preventDefault();
        const form = e.target;
        const name = form.elements.name.value.trim();
        const quantity = parseInt(form.elements.quantity.value);

        if (!name || !quantity || quantity < 1) {
            showNotification('Nombre y cantidad (mínimo 1) son obligatorios.', 'error');
            return;
        }

        const geneticsRef = collection(db, `users/${userId}/genetics`);
        const q = query(geneticsRef, where("name", "==", name));
        
        try {
            const querySnapshot = await getDocs(q);
            let geneticData = {};
            
            if (type === 'seed') {
                geneticData = {
                    name: name,
                    bank: form.elements.bank.value.trim() || null,
                    seedStock: increment(quantity),
                    isSeedAvailable: true
                };
            } else { // type === 'clone'
                geneticData = {
                    name: name,
                    parents: form.elements.parents.value.trim() || null,
                    owner: form.elements.owner.value.trim() || null,
                    cloneStock: increment(quantity)
                };
            }

            if (querySnapshot.empty) {
                // No existe, la creamos
                if(type === 'seed') geneticData.cloneStock = 0;
                if(type === 'clone') geneticData.seedStock = 0;
                
                await addDoc(geneticsRef, geneticData);
                showNotification(`"${name}" añadida al catálogo.`);
            } else {
                // Ya existe, la actualizamos
                const existingDocRef = querySnapshot.docs[0].ref;
                await updateDoc(existingDocRef, geneticData);
                showNotification(`Stock de "${name}" actualizado.`);
            }
            
            getEl('cicloModal').style.display = 'none'; // Cierra el modal
        } catch (error) {
            console.error("Error guardando en el catálogo:", error);
            showNotification("Error al guardar la genética.", "error");
        }
    },
    handleExportCSV: () => {
        const now = new Date();
        const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;

        if (activeToolsTab === 'genetics') {
            // CASO NUEVO: Exporta una lista maestra desde el catálogo principal
            const masterData = currentGenetics.map(g => ({
                nombre: g.name,
                banco: g.bank || 'N/A',
                stock_clones: g.cloneStock || 0,
                stock_semillas: g.seedStock || 0,
                favorita: g.favorita ? 'Si' : 'No'
            }));
            exportToCSV(masterData, `catalogo_geneticas_${dateString}.csv`);

        } else if (activeToolsTab === 'stock') {
            // CASO CORREGIDO: Filtra del catálogo principal solo los clones
            const stockData = currentGenetics.filter(g => g.cloneStock > 0).map(g => ({
                nombre: g.name,
                banco: g.bank || 'N/A',
                stock_clones: g.cloneStock || 0,
                favorita: g.favorita ? 'Si' : 'No'
            }));
            exportToCSV(stockData, `stock_clones_${dateString}.csv`);

        } else if (activeToolsTab === 'baulSemillas') {
            // CASO CORREGIDO: Filtra del catálogo principal solo las semillas
            const seedData = currentGenetics.filter(g => g.seedStock > 0).map(g => ({
                nombre: g.name,
                banco: g.bank || 'N/A',
                stock_semillas: g.seedStock || 0
            }));
            exportToCSV(seedData, `baul_semillas_${dateString}.csv`);
        }
    },
	handlePasarAFlora: (cicloId, cicloName) => {
        handlers.showConfirmationModal(`¿Seguro que quieres pasar el ciclo "${cicloName}" a Floración? Esto establecerá la fecha de floración a hoy y generará las 9 semanas estándar.`, async () => {
            try {
                const cicloRef = doc(db, `users/${userId}/ciclos`, cicloId);
                const today = new Date();
                const floweringStartDate = today.toISOString().split('T')[0];

                await updateDoc(cicloRef, {
                    phase: 'Floración',
                    floweringStartDate: floweringStartDate,
                    floweringWeeks: generateStandardWeeks(),
                    vegetativeWeeks: null 
                });
                showNotification(`Ciclo "${cicloName}" ha pasado a Floración.`);
            } catch (error) {
                console.error("Error al pasar a floración:", error);
                showNotification('Error al cambiar de fase.', 'error');
            }
        });
    },
    calculateDaysSince,
    getPhaseInfo,
    formatFertilizers,
    getConfirmCallback: () => confirmCallback,
    hideConfirmationModal: () => {
        getEl('confirmationModal').style.display = 'none';
        confirmCallback = null;
    },
    showConfirmationModal: (message, onConfirm) => {
        getEl('confirmationMessage').textContent = message;
        confirmCallback = onConfirm;
        getEl('confirmationModal').style.display = 'flex';
    },
    openSalaModal: (sala = null) => {
        uiOpenSalaModal(sala);
    },
    handleSalaFormSubmit: async (e) => {
        e.preventDefault();
        const form = e.target;
        const salaName = getEl('sala-name').value.trim();
        if (!salaName) {
            showNotification('El nombre de la sala no puede estar vacío.', 'error');
            return;
        }
        const salaId = form.dataset.id;
        try {
            if (salaId) {
                await updateDoc(doc(db, `users/${userId}/salas`, salaId), { name: salaName });
                showNotification('Sala actualizada correctamente.');
            } else {
                const newSalaData = {
                    name: salaName,
                    position: currentSalas.length
                };
                await addDoc(collection(db, `users/${userId}/salas`), newSalaData);
                showNotification('Sala creada correctamente.');
            }
            getEl('salaModal').style.display = 'none';
        } catch (error) {
            console.error("Error guardando sala:", error);
            showNotification('Error al guardar la sala.', 'error');
        }
    },
    deleteSala: (id, name) => {
        handlers.showConfirmationModal(`¿Seguro que quieres eliminar la sala "${name}"? Todos los ciclos dentro de ella también serán eliminados. Esta acción no se puede deshacer.`, async () => {
            try {
                const batch = writeBatch(db);
                const ciclosQuery = query(collection(db, `users/${userId}/ciclos`), where("salaId", "==", id));
                const ciclosSnapshot = await getDocs(ciclosQuery);
                ciclosSnapshot.forEach(cicloDoc => {
                    batch.delete(cicloDoc.ref);
                });
                batch.delete(doc(db, `users/${userId}/salas`, id));
                await batch.commit();
                showNotification(`Sala "${name}" y sus ciclos eliminados.`);
            } catch (error) {
                console.error("Error deleting sala and its ciclos:", error);
                showNotification('Error al eliminar la sala.', 'error');
            }
        });
    },
    // MODIFICADO: Ahora pasa el objeto handlers a la UI para poder conectar el botón del selector.
    openCicloModal: (ciclo = null, preselectedSalaId = null) => {
        uiOpenCicloModal(ciclo, currentSalas, preselectedSalaId, handlers);
    },
    // NUEVO: Handler que abre el modal selector de genéticas
    openGeneticsSelector: (onConfirmCallback) => {
        // Ahora solo pasamos el catálogo maestro unificado.
        uiOpenGeneticsSelectorModal(currentGenetics, onConfirmCallback);
    },
    // MODIFICADO: Lógica de creación de ciclo con control granular de phenohunt
    handleCicloFormSubmit: async (e) => {
        e.preventDefault();
        const form = e.target;
        const cicloId = form.dataset.id;

        if (cicloId) {
            // La lógica de edición no cambia, la mantenemos como estaba.
            const cicloData = {
                name: getEl('ciclo-name').value.trim(),
                salaId: getEl('ciclo-sala-select').value,
                phase: getEl('cicloPhase').value,
                cultivationType: getEl('cultivationType').value,
                vegetativeStartDate: getEl('vegetativeStartDate').value,
                floweringStartDate: getEl('floweringStartDate').value,
                notes: getEl('ciclo-notes').value.trim(),
            };
            if (!cicloData.name || !cicloData.salaId) {
                showNotification('Nombre y sala son obligatorios.', 'error'); return;
            }
            try {
                const originalCiclo = currentCiclos.find(c => c.id === cicloId);
                if (originalCiclo && originalCiclo.phase === 'Vegetativo' && cicloData.phase === 'Floración') {
                    cicloData.floweringWeeks = generateStandardWeeks();
                    if (!cicloData.floweringStartDate) {
                        const today = new Date();
                        cicloData.floweringStartDate = today.toISOString().split('T')[0];
                    }
                }
                await updateDoc(doc(db, `users/${userId}/ciclos`, cicloId), cicloData);
                showNotification('Ciclo actualizado.');
                getEl('cicloModal').style.display = 'none';
            } catch (error) {
                console.error("Error actualizando ciclo:", error);
                showNotification('Error al actualizar el ciclo.', 'error');
            }
            return;
        }

        // --- Lógica de CREACIÓN de ciclo con selección de genéticas ---
        const geneticsDataInput = getEl('ciclo-genetics-data');
        const selectedGenetics = geneticsDataInput.value ? JSON.parse(geneticsDataInput.value) : [];

        if (selectedGenetics.length === 0) {
            showNotification('Debes añadir al menos una genética al ciclo.', 'error');
            return;
        }
        
        const cicloData = {
            name: getEl('ciclo-name').value.trim(),
            salaId: getEl('ciclo-sala-select').value,
            phase: getEl('cicloPhase').value,
            cultivationType: getEl('cultivationType').value,
            vegetativeStartDate: getEl('vegetativeStartDate').value,
            floweringStartDate: getEl('floweringStartDate').value,
            notes: getEl('ciclo-notes').value.trim(),
            estado: 'activo',
            isPhenohunt: selectedGenetics.some(g => g.trackIndividually), // El ciclo es phenohunt si al menos un item lo es.
            genetics: []
        };

        if (!cicloData.name || !cicloData.salaId) {
            showNotification('Nombre y sala son obligatorios.', 'error');
            return;
        }
        
        try {
            const batch = writeBatch(db);

            // 1. Preparar el array de genéticas para el ciclo según el tracking individual
            selectedGenetics.forEach(item => {
                if (item.trackIndividually) {
                    for (let i = 0; i < item.quantity; i++) {
                        cicloData.genetics.push({
                            id: item.id,
                            name: `${item.name} #${i + 1}`,
                            quantity: 1,
                            source: item.source,
                            phenoId: `${item.id}-${Date.now()}-${i}`
                        });
                    }
                } else {
                    // Se añade como un solo grupo
                    cicloData.genetics.push({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        source: item.source
                    });
                }
            });

            if (cicloData.phase === 'Floración') {
                cicloData.floweringWeeks = generateStandardWeeks();
            } else if (cicloData.phase === 'Vegetativo') {
                cicloData.vegetativeWeeks = calculateVegetativeWeeks(cicloData.vegetativeStartDate);
            }

            const newCicloRef = doc(collection(db, `users/${userId}/ciclos`));
            batch.set(newCicloRef, cicloData);

            for (const item of selectedGenetics) {
                const collectionName = item.source === 'clone' ? 'genetics' : 'seeds';
                const stockField = item.source === 'clone' ? 'cloneStock' : 'quantity';
                const itemRef = doc(db, `users/${userId}/${collectionName}`, item.id);
                batch.update(itemRef, { [stockField]: increment(-item.quantity) });
            }

            await batch.commit();

            showNotification('Ciclo creado con éxito. Stock actualizado.');
            getEl('cicloModal').style.display = 'none';

        } catch (error) {
            console.error("Error creando ciclo y actualizando stock:", error);
            showNotification('Error al crear el ciclo.', 'error');
        }
    },
    deleteCiclo: (cicloId, cicloName) => {
        handlers.showConfirmationModal(`¿Seguro que quieres eliminar el ciclo "${cicloName}"? Todos sus registros serán eliminados.`, async () => {
            try {
                const logsRef = collection(db, `users/${userId}/ciclos/${cicloId}/logs`);
                const logsSnapshot = await getDocs(logsRef);
                const batch = writeBatch(db);
                logsSnapshot.forEach(logDoc => {
                    batch.delete(logDoc.ref);
                });
                batch.delete(doc(db, `users/${userId}/ciclos`, cicloId));
                await batch.commit();
                showNotification('Ciclo eliminado correctamente.');
            } catch (error) {
                console.error("Error deleting ciclo: ", error);
                showNotification('Error al eliminar el ciclo.', 'error');
            }
        });
    },
    showCiclosView: (salaId, salaName) => {
        currentSalaId = salaId;
        currentSalaName = salaName;
        handlers.hideAllViews();
        const view = getEl('ciclosView');
        // El HTML ahora se genera dentro de esta función, es más limpio
        view.innerHTML = `
            <header class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-mono tracking-wider font-bold text-amber-400">Sala: ${salaName}</h1>
                <button id="backToSalasViewBtn" class="btn-secondary btn-base py-2 px-4 rounded-lg">Volver a Salas</button>
            </header>
            <main>
                <div id="ciclosGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                <div id="emptyCiclosState" class="text-center py-10 text-gray-500 dark:text-gray-400 hidden">
                    <p>No hay ciclos en esta sala.</p>
                </div>
            </main>
        `;
        view.classList.remove('hidden');
        view.classList.add('view-container');

        getEl('backToSalasViewBtn').addEventListener('click', handlers.showSalasView);

        const ciclosGrid = getEl('ciclosGrid');
        const emptyState = getEl('emptyCiclosState');
        const ciclosInSala = currentCiclos.filter(c => c.salaId === salaId);

        if (ciclosInSala.length > 0) {
            emptyState.classList.add('hidden');
            ciclosInSala.forEach(ciclo => {
                ciclosGrid.appendChild(createCicloCard(ciclo, handlers));
            });
        } else {
            emptyState.classList.remove('hidden');
        }
    },
    hideCiclosView: () => {
        const view = getEl('ciclosView');
        view.classList.add('hidden');
        view.classList.remove('view-container');
        getEl('app').classList.remove('hidden');
        currentSalaId = null;
        currentSalaName = null;
    },
    handleToggleCicloMenu: (e, menuElement) => {
        e.stopPropagation();
        document.querySelectorAll('.ciclo-actions-menu').forEach(menu => {
            if (menu !== menuElement) {
                menu.classList.add('hidden');
            }
        });
        menuElement.classList.toggle('hidden');
    },
    showCicloDetails: async (ciclo) => {
        if (logsUnsubscribe) logsUnsubscribe();

        const cicloRef = doc(db, `users/${userId}/ciclos`, ciclo.id);
        let needsUpdate = false;

        if (ciclo.phase === 'Vegetativo') {
            const calculatedWeeks = calculateVegetativeWeeks(ciclo.vegetativeStartDate);
            if (JSON.stringify(calculatedWeeks) !== JSON.stringify(ciclo.vegetativeWeeks)) {
                ciclo.vegetativeWeeks = calculatedWeeks;
                needsUpdate = true;
            }
        }
        
        if (ciclo.phase === 'Floración' && ciclo.floweringWeeks && ciclo.floweringWeeks.some(w => w.phaseName === 'SECADO')) {
            ciclo.floweringWeeks = ciclo.floweringWeeks.filter(w => w.phaseName !== 'SECADO');
            needsUpdate = true;
        }

        if (needsUpdate) {
            await updateDoc(cicloRef, { 
                vegetativeWeeks: ciclo.vegetativeWeeks || null,
                floweringWeeks: ciclo.floweringWeeks || null
            }).catch(err => console.error("Error actualizando semanas del ciclo:", err));
        }

        handlers.hideAllViews();
        const detailView = getEl('cicloDetailView');
        detailView.innerHTML = renderCicloDetails(ciclo, handlers);
        detailView.classList.remove('hidden');
        detailView.classList.add('view-container');

        // CORREGIDO: El botón ahora llama directamente a showDashboard.
        getEl('backToCiclosBtn').addEventListener('click', () => handlers.showDashboard());

        const addWeekBtn = getEl('add-week-btn');
        if(addWeekBtn) addWeekBtn.addEventListener('click', () => handlers.handleAddWeek(ciclo.id));
        
        const pasarAFloraBtn = getEl('pasar-a-flora-btn');
        if(pasarAFloraBtn) pasarAFloraBtn.addEventListener('click', (e) => handlers.handlePasarAFlora(e.currentTarget.dataset.cicloId, e.currentTarget.dataset.cicloName));

        const iniciarSecadoBtn = getEl('iniciar-secado-btn');
        if(iniciarSecadoBtn) iniciarSecadoBtn.addEventListener('click', () => handlers.handleIniciarSecado(ciclo.id, ciclo.name));

        let weeksToShow = [];
        if (ciclo.phase === 'Floración' && ciclo.floweringWeeks) {
            weeksToShow = ciclo.floweringWeeks;
        } else if (ciclo.phase === 'Vegetativo' && ciclo.vegetativeWeeks) {
            weeksToShow = ciclo.vegetativeWeeks;
        }

        const weekNumbers = weeksToShow.map(w => w.weekNumber);
        if (weekNumbers.length > 0) {
            loadLogsForCiclo(ciclo.id, weekNumbers);
        }
    },

    hideCicloDetails: () => {
        if (logsUnsubscribe) logsUnsubscribe();
        const view = getEl('cicloDetailView');
        view.classList.add('hidden');
        view.classList.remove('view-container');
        if (currentSalaId && currentSalaName) {
            handlers.showCiclosView(currentSalaId, currentSalaName);
        } else {
            handlers.hideCiclosView();
        }
    },
    showToolsView: () => {
        handlers.hideAllViews();
        const container = getEl('app-content-container');
        if(!container) return;

        getEl('view-title').innerText = 'Herramientas';
        container.innerHTML = renderToolsView();

        getEl('backToDashboardBtn').addEventListener('click', handlers.showDashboard);
        getEl('add-bulk-btn').addEventListener('click', handlers.openBulkAddModal); // <--- Este es el botón que no funcionaba
        getEl('add-to-catalog-btn').addEventListener('click', handlers.openAddToCatalogModal);
        getEl('geneticsTabBtn').addEventListener('click', () => handlers.switchToolsTab('genetics'));
        getEl('stockTabBtn').addEventListener('click', () => handlers.switchToolsTab('stock'));
        getEl('baulSemillasTabBtn').addEventListener('click', () => handlers.switchToolsTab('baulSemillas'));
        getEl('curingJarsTabBtn').addEventListener('click', () => handlers.switchToolsTab('curingJars'));
        getEl('phenohuntTabBtn').addEventListener('click', () => handlers.switchToolsTab('phenohunt'));
        getEl('historialTabBtn').addEventListener('click', () => handlers.switchToolsTab('historial'));
        getEl('searchTools').addEventListener('input', handlers.handleToolsSearch);
        getEl('view-mode-card').addEventListener('click', () => handlers.handleViewModeToggle('card'));
        getEl('view-mode-list').addEventListener('click', () => handlers.handleViewModeToggle('list'));
        getEl('exportCsvBtn').addEventListener('click', handlers.handleExportCSV);

        // Cargar la pestaña por defecto
        handlers.switchToolsTab('genetics');
        handlers.handleViewModeToggle(toolsViewMode, true);
    },
    hideToolsView: () => {
        const view = getEl('toolsView');
        view.classList.add('hidden');
        view.classList.remove('view-container');
        getEl('app').classList.remove('hidden');
    },
    showSettingsView: () => {
        handlers.hideAllViews();
        const container = getEl('app-content-container');
        if(!container) return;

        getEl('view-title').innerText = 'Ajustes';
        container.innerHTML = renderSettingsView();

        // AÑADIDO: Listener para que el botón 'backToDashboardBtn' funcione.
        getEl('backToDashboardBtn').addEventListener('click', handlers.showDashboard);

        // Re-asignar listeners específicos de la vista de Ajustes
        getEl('changePasswordForm').addEventListener('submit', handlers.handleChangePassword);
        getEl('deleteAccountBtn').addEventListener('click', handlers.handleDeleteAccount);
        handlers.initializeTheme();
    },
    hideSettingsView: () => {
        const view = getEl('settingsView');
        view.classList.add('hidden');
        view.classList.remove('view-container');
        getEl('app').classList.remove('hidden');
    },
    hideAllViews: () => {
        ['app', 'ciclosView', 'cicloDetailView', 'toolsView', 'settingsView', 'historialView', 'phenohuntDetailView'].forEach(id => {
            const el = getEl(id);
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('view-container');
            }
        });
    },
    switchToolsTab: (newTab) => {
        activeToolsTab = newTab;
        ['genetics', 'stock', 'baulSemillas', 'curingJars', 'phenohunt', 'historial'].forEach(tab => {
            const contentEl = getEl(`${tab}Content`);
            const tabBtnEl = getEl(`${tab}TabBtn`);
            if (contentEl) contentEl.classList.toggle('hidden', tab !== activeToolsTab);
            if (tabBtnEl) {
                tabBtnEl.classList.toggle('border-amber-400', tab === activeToolsTab);
                tabBtnEl.classList.toggle('border-transparent', tab !== activeToolsTab);
            }
        });

        const searchTools = getEl('searchTools');
        const viewMode = getEl('view-mode-toggle');
        const exportBtn = getEl('exportCsvBtn');

        searchTools.classList.remove('hidden');
        viewMode.classList.remove('hidden');
        exportBtn.classList.remove('hidden');
        
        if (newTab === 'curingJars') {
            searchTools.classList.add('hidden');
            viewMode.classList.add('hidden');
            exportBtn.classList.add('hidden');
            const curingCiclos = currentCiclos.filter(c => c.estado === 'en_curado');
            renderCuringJarsList(curingCiclos, handlers);
        } else if (newTab === 'historial') {
            searchTools.placeholder = 'Buscar por genética, sala...';
            viewMode.classList.add('hidden');
            exportBtn.classList.add('hidden');
            renderHistorialView(currentHistorial, handlers);
        } else if (newTab === 'phenohunt') {
            searchTools.placeholder = 'Buscar cacería por nombre...';
            viewMode.classList.add('hidden');
            exportBtn.classList.add('hidden');
            renderPhenohuntList(currentPhenohunts, handlers);
        } else {
            searchTools.placeholder = 'Buscar por nombre...';
            if (newTab === 'genetics') renderGeneticsList(currentGenetics, handlers);
            if (newTab === 'stock') renderStockList(currentGenetics.filter(g => g.cloneStock > 0), handlers);
            if (newTab === 'baulSemillas') renderBaulSemillasList(currentGenetics.filter(g => g.seedStock > 0), handlers);
        }
        
        handlers.handleToolsSearch({ target: { value: '' } });
    },
    handleToolsSearch: (e) => {
        const searchTerm = e.target.value.toLowerCase();
        let dataToRender;

        if (activeToolsTab === 'genetics') {
            dataToRender = currentGenetics.filter(g => g.name.toLowerCase().includes(searchTerm));
            renderGeneticsList(dataToRender, handlers);
        } else if (activeToolsTab === 'baulSemillas') {
            dataToRender = currentGenetics.filter(g => g.seedStock > 0 && g.name.toLowerCase().includes(searchTerm));
            renderBaulSemillasList(dataToRender, handlers);
        } else if (activeToolsTab === 'stock') {
            dataToRender = currentGenetics.filter(g => g.cloneStock > 0 && g.name.toLowerCase().includes(searchTerm));
            renderStockList(dataToRender, handlers);
        }
        
        // La inicialización de Drag & Drop ya no depende del modo de vista, por lo que podemos simplificar.
        if (activeToolsTab !== 'historial') {
            initializeToolsDragAndDrop();
        }
    },
    handleViewModeToggle: (mode, isInitial = false) => {
        if (!isInitial) {
            toolsViewMode = mode;
            localStorage.setItem('toolsViewMode', mode);
        }

        getEl('view-mode-card').classList.toggle('bg-amber-500', toolsViewMode === 'card');
        getEl('view-mode-list').classList.toggle('bg-amber-500', toolsViewMode === 'list');

        handlers.handleToolsSearch({ target: getEl('searchTools') });
    },
    
    editGenetic: (id) => {
        const genetic = currentGenetics.find(g => g.id === id);
        if (genetic) {
            getEl('genetic-form-title').innerText = 'Editar Genética';
            getEl('genetic-name').value = genetic.name;
            getEl('genetic-parents').value = genetic.parents || '';
            getEl('genetic-bank').value = genetic.bank || '';
            getEl('genetic-owner').value = genetic.owner || '';
            getEl('genetic-stock').value = genetic.cloneStock || 0;
            getEl('geneticsForm').dataset.id = id;
            getEl('genetic-name').focus();
        }
    },
    deleteGenetic: (id) => {
        const genetic = currentGenetics.find(g => g.id === id);
        if (genetic) {
            handlers.showConfirmationModal(`¿Seguro que quieres eliminar la genética "${genetic.name}"?`, async () => {
                try {
                    await deleteDoc(doc(db, `users/${userId}/genetics`, id));
                    showNotification('Genética eliminada.');
                } catch (error) {
                    console.error("Error deleting genetic:", error);
                    showNotification('Error al eliminar la genética.', 'error');
                }
            });
        }
    },
    handleToggleFavorite: async (id) => {
        const genetic = currentGenetics.find(g => g.id === id);
        if (!genetic) return;

        const newFavoriteState = !genetic.favorita;
        const geneticRef = doc(db, `users/${userId}/genetics`, id);

        try {
            await updateDoc(geneticRef, {
                favorita: newFavoriteState
            });
            showNotification(`"${genetic.name}" ${newFavoriteState ? 'marcada como favorita.' : 'ya no es favorita.'}`);
        } catch (error) {
            console.error("Error updating favorite status:", error);
            showNotification('Error al actualizar el estado de favorito.', 'error');
        }
    },
    updateStock: async (id, amount) => {
        try {
            const geneticRef = doc(db, `users/${userId}/genetics`, id);
            await updateDoc(geneticRef, {
                cloneStock: increment(amount)
            });
        } catch (error) {
            console.error("Error updating stock:", error);
            showNotification('Error al actualizar el stock.', 'error');
        }
    },
    
    deleteSeed: (id) => {
    // CORREGIDO: Busca en currentGenetics en lugar de currentSeeds
    const seed = currentGenetics.find(s => s.id === id); 
    if(seed) {
        handlers.showConfirmationModal(`¿Seguro que quieres eliminar las semillas "${seed.name}" del baúl?`, async () => {
            try {
                // La lógica de borrado sigue siendo sobre la genética, pero solo se resetea el stock de semillas.
                await updateDoc(doc(db, `users/${userId}/genetics`, id), {
                    seedStock: 0,
                    isSeedAvailable: false
                });
                showNotification('Semillas eliminadas del baúl.');
            } catch (error) {
                console.error("Error deleting seed stock:", error);
                showNotification('Error al eliminar las semillas.', 'error');
            }
        });
      }
    },
    openGerminateModal: (id) => {
        const seed = currentGenetics.find(s => s.id === id); 
         if(seed) {
            uiOpenGerminateModal(seed);
         }
    },
    handleGerminateFormSubmit: async (e) => {
        e.preventDefault();
        const form = e.target;
        const seedId = form.dataset.id;
        const quantity = parseInt(getEl('germinate-quantity').value);

        if (!seedId || !quantity || quantity <= 0) {
            showNotification('Cantidad inválida.', 'error');
            return;
        }

        const seed = currentSeeds.find(s => s.id === seedId);
        if (quantity > seed.quantity) {
            showNotification('No puedes germinar más semillas de las que tienes.', 'error');
            return;
        }

        try {
            await updateDoc(doc(db, `users/${userId}/seeds`, seedId), {
                quantity: increment(-quantity)
            });
            showNotification(`${quantity} semilla(s) de ${seed.name} puestas a germinar.`);
            getEl('germinateSeedModal').style.display = 'none';
        } catch(error) {
            console.error("Error germinating seed:", error);
            showNotification('Error al germinar la semilla.', 'error');
        }
    },
    handleDeleteAccount: () => {
        handlers.showConfirmationModal('¿ESTÁS SEGURO? Esta acción eliminará permanentemente tu cuenta y todos tus datos. No se puede deshacer.', async () => {
            try {
                const user = auth.currentUser;
                await deleteUser(user);
                showNotification('Cuenta eliminada. Serás desconectado.');
            } catch (error) {
                console.error("Error deleting account:", error);
                showNotification('Error al eliminar la cuenta. Es posible que necesites volver a iniciar sesión para completar esta acción.', 'error');
            }
        });
    },
    handleChangePassword: async (e) => {
        e.preventDefault();
        const newPassword = getEl('newPassword').value;
        const confirmPassword = getEl('confirmPassword').value;
        if (newPassword.length < 6) {
            showNotification('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification('Las contraseñas no coinciden.', 'error');
            return;
        }
        try {
            const user = auth.currentUser;
            await updatePassword(user, newPassword);
            showNotification('Contraseña cambiada correctamente.');
            e.target.reset();
        } catch (error)
        {
            console.error("Error changing password:", error);
            showNotification('Error al cambiar la contraseña. Es posible que necesites volver a iniciar sesión.', 'error');
        }
    },
    handleLogFormSubmit: async (e) => {
    e.preventDefault();
    const form = e.target;
    const cicloId = form.dataset.cicloId;
    const week = form.dataset.week;

    const logData = {
        type: getEl('logType').value,
        date: serverTimestamp(),
        week: parseInt(week)
    };
    
    let firstFertilizerLine = null;

    if (logData.type === 'Riego' || logData.type === 'Cambio de Solución') {
        logData.ph = getEl('log-ph').value || null;
        logData.ec = getEl('log-ec').value || null;
        if (logData.type === 'Cambio de Solución') {
            logData.litros = getEl('log-litros').value || null;
        }

        const fertilizersUsed = [];
        document.querySelectorAll('.fert-line-block').forEach((block, index) => {
            const selectedLine = block.querySelector('.fert-line-select').value;

            if (index === 0 && selectedLine) {
                firstFertilizerLine = selectedLine;
            }
            
            if (selectedLine === 'Personalizada') {
                block.querySelectorAll('.custom-fert-row').forEach(row => {
                    const productName = row.querySelector('.fert-product-name').value.trim();
                    const dose = row.querySelector('.fert-dose').value;
                    if (productName && dose) {
                        fertilizersUsed.push({
                            productName: productName,
                            dose: parseFloat(dose),
                            unit: row.querySelector('.fert-unit').value
                        });
                    }
                });
            } else {
                block.querySelectorAll('.product-row').forEach(row => {
                    const dose = row.querySelector('.fert-dose').value;
                    if (dose) {
                        fertilizersUsed.push({
                            productName: row.querySelector('.fert-dose').dataset.productName,
                            dose: parseFloat(dose),
                            unit: row.querySelector('.fert-unit').value
                        });
                    }
                });
            }
        });
        logData.fertilizers = fertilizersUsed;

    } else if (logData.type === 'Control de Plagas') {
        logData.notes = getEl('plagas-notes').value.trim();
    } else if (logData.type === 'Podas') {
        logData.podaType = getEl('podaType').value;
        if (logData.podaType === 'Clones') {
            logData.clonesCount = parseInt(getEl('clones-count').value) || 0;
        }
    } else if (logData.type === 'Trasplante') {
        logData.details = getEl('trasplante-details').value.trim();
    }

    try {
        // Iniciar un batch de escritura
        const batch = writeBatch(db);

        // 1. Referencia al ciclo principal que vamos a actualizar
        const cicloRef = doc(db, `users/${userId}/ciclos`, cicloId);

        // 2. Referencia al nuevo documento de log que vamos a crear
        const newLogRef = doc(collection(db, `users/${userId}/ciclos/${cicloId}/logs`));

        // 3. Añadir la creación del nuevo log al batch
        batch.set(newLogRef, logData);

        // 4. Preparar el objeto con los datos para actualizar el ciclo principal
        const cycleUpdateData = {
            lastLogTimestamp: serverTimestamp(), // Campo nuevo
            lastLogType: logData.type,         // Campo nuevo
            logCount: increment(1)             // Campo nuevo que incrementa el contador en 1
        };
        
        // Si se usó una línea de fertilizantes, la añadimos a los datos de actualización
        if (firstFertilizerLine) {
            cycleUpdateData.lastUsedFertilizerLine = firstFertilizerLine;
        }

        // 5. Añadir la actualización del ciclo al batch
        batch.update(cicloRef, cycleUpdateData);

        // 6. Ejecutar ambas operaciones (crear log y actualizar ciclo) de forma atómica
        await batch.commit();

        showNotification('Registro añadido.');
        getEl('logModal').style.display = 'none';
    } catch (error) {
        console.error("Error guardando log y actualizando ciclo:", error);
        showNotification('Error al guardar el registro.', 'error');
    }
},
    deleteLog: (cicloId, logId) => {
        handlers.showConfirmationModal('¿Seguro que quieres eliminar este registro?', async () => {
            try {
                await deleteDoc(doc(db, `users/${userId}/ciclos/${cicloId}/logs`, logId));
                showNotification('Registro eliminado.');
            } catch (error) {
                console.error("Error deleting log:", error);
                showNotification('Error al eliminar el registro.', 'error');
            }
        });
    },
    openFinalizarCicloModal: (ciclo) => {
        uiOpenFinalizarCicloModal(ciclo, PREDEFINED_TAGS, MAX_CUSTOM_TAGS, currentGenetics);
    },
    handleFinalizarCicloFormSubmit: async (e) => {
    e.preventDefault();
    const form = e.target;
    const cicloId = form.dataset.cicloId;
    const cicloOriginal = (await getDoc(doc(db, `users/${userId}/ciclos`, cicloId))).data();
    
    // La recolección de datos del formulario no cambia
    const pesoSeco = parseFloat(getEl('peso-seco').value);
    const etiquetasGlobales = Array.from(getEl('global-tags-container').querySelectorAll('.tag.active')).map(t => t.textContent);
    const etiquetasCustom = Array.from(getEl('custom-tags-container').querySelectorAll('.tag')).map(t => t.textContent.replace(' ×', ''));
    const feedbackGeneticas = [];
    document.querySelectorAll('.genetic-feedback-row').forEach(row => {
        const id = row.dataset.id;
        const name = row.dataset.name;
        const decision = row.querySelector('input[name="decision-' + id + '"]:checked')?.value || 'ninguna';
        const favorita = row.querySelector('.favorite-checkbox').checked;
        feedbackGeneticas.push({ id, name, decision, favorita });
    });

    // La consolidación de datos (snapshot) tampoco cambia
    const snapshot_genetics = [];
    if (cicloOriginal.genetics && cicloOriginal.genetics.length > 0) {
        cicloOriginal.genetics.forEach(cicloGenetic => {
            const fullGeneticData = currentGenetics.find(g => g.id === cicloGenetic.id);
            if (fullGeneticData) {
                snapshot_genetics.push({
                    id: fullGeneticData.id,
                    name: fullGeneticData.name,
                    phenoName: cicloGenetic.name,
                    bank: fullGeneticData.bank || null,
                    parents: fullGeneticData.parents || null,
                    owner: fullGeneticData.owner || null,
                });
            } else {
                snapshot_genetics.push({ id: cicloGenetic.id, name: cicloGenetic.name, phenoName: cicloGenetic.name, bank: 'Dato no disponible', parents: null, owner: null });
            }
        });
    }

    const diasDeSecado = cicloOriginal.fechaInicioSecado ? calculateDaysBetween(cicloOriginal.fechaInicioSecado, new Date()) : 0;
    const diasDeFlora = calculateDaysSince(cicloOriginal.floweringStartDate);

    // --- ▼▼▼ AQUÍ ESTÁ EL CAMBIO PRINCIPAL ▼▼▼ ---
    const cosechaData = {
        estado: 'en_curado', // Cambiamos el estado
        fechaInicioCurado: serverTimestamp(), // Añadimos la fecha de inicio de curado
        pesoSeco: isNaN(pesoSeco) ? 0 : pesoSeco,
        diasDeFlora,
        diasDeSecado,
        etiquetasGlobales,
        etiquetasCustom,
        feedbackGeneticas,
        snapshot_genetics
        // El campo 'fechaFinalizacion' ya no se establece aquí
    };
    // --- ▲▲▲ FIN DEL CAMBIO ▲▲▲ ---

    try {
        const batch = writeBatch(db);
        const cicloRef = doc(db, `users/${userId}/ciclos`, cicloId);
        batch.update(cicloRef, cosechaData);
        
        for (const feedback of feedbackGeneticas) {
            const geneticRef = doc(db, `users/${userId}/genetics`, feedback.id);
            const originalGenetic = currentGenetics.find(g => g.id === feedback.id);
            if (originalGenetic && originalGenetic.favorita !== feedback.favorita) {
                batch.update(geneticRef, { favorita: feedback.favorita });
            }
        }
        
        await batch.commit();
        // Actualizamos el mensaje para reflejar el nuevo estado
        showNotification('¡Cosecha enfrascada! Ahora podés seguir su curado desde Herramientas.');
        getEl('finalizarCicloModal').style.display = 'none';
    } catch(error) {
        console.error("Error guardando la cosecha para curado: ", error);
        showNotification('Error al iniciar el proceso de curado.', 'error');
    }
},
    handleAddWeek: async (cicloId) => {
        try {
            const cicloRef = doc(db, `users/${userId}/ciclos`, cicloId);
            const cicloSnap = await getDoc(cicloRef);
            if (!cicloSnap.exists()) throw new Error("Cycle not found");
            const cicloData = cicloSnap.data();
            
            const weeksArrayName = cicloData.phase === 'Floración' ? 'floweringWeeks' : 'vegetativeWeeks';
            const currentWeeks = cicloData[weeksArrayName] || [];
            
            const newWeekNumber = currentWeeks.length + 1;
            const newWeek = { weekNumber: newWeekNumber, phaseName: cicloData.phase === 'Floración' ? 'FLORA' : 'Vegetativo' };
            
            await updateDoc(cicloRef, { [weeksArrayName]: arrayUnion(newWeek) });
            showNotification(`Semana ${newWeekNumber} añadida al ciclo.`);
        } catch (error) {
            console.error("Error adding week:", error);
            showNotification('Error al añadir la semana.', 'error');
        }
    },
    handleDeleteLastWeek: async (cicloId) => {
        try {
            const cicloRef = doc(db, `users/${userId}/ciclos`, cicloId);
            const cicloSnap = await getDoc(cicloRef);
            if (!cicloSnap.exists()) throw new Error("Ciclo no encontrado");
            
            const cicloData = cicloSnap.data();
            const weeksArrayName = cicloData.phase === 'Floración' ? 'floweringWeeks' : 'vegetativeWeeks';
            const currentWeeks = cicloData[weeksArrayName] || [];

            if (currentWeeks.length === 0) {
                showNotification("No hay semanas para eliminar.", "error");
                return;
            }

            const lastWeekNumber = currentWeeks[currentWeeks.length - 1].weekNumber;

            handlers.showConfirmationModal(`¿Seguro que quieres eliminar la Semana ${lastWeekNumber}? Todos sus registros también se borrarán.`, async () => {
                try {
                    const batch = writeBatch(db);

                    const logsQuery = query(collection(db, `users/${userId}/ciclos/${cicloId}/logs`), where("week", "==", lastWeekNumber));
                    const logsSnapshot = await getDocs(logsQuery);
                    logsSnapshot.forEach(logDoc => {
                        batch.delete(logDoc.ref);
                    });

                    const updatedWeeks = currentWeeks.slice(0, -1);
                    batch.update(cicloRef, { [weeksArrayName]: updatedWeeks });

                    await batch.commit();
                    showNotification(`Semana ${lastWeekNumber} y sus registros eliminados.`);
                } catch (error) {
                    console.error("Error al eliminar la última semana y sus logs:", error);
                    showNotification("Error al eliminar la semana.", "error");
                }
            });

        } catch (error) {
            console.error("Error preparando la eliminación de la semana:", error);
            showNotification("No se pudo preparar la eliminación de la semana.", "error");
        }
    },
    handleIniciarSecado: (cicloId, cicloName) => {
        handlers.showConfirmationModal(`¿Seguro que quieres finalizar el cultivo de "${cicloName}" y empezar el secado? Ya no podrás añadir más registros.`, async () => {
            try {
                const cicloRef = doc(db, `users/${userId}/ciclos`, cicloId);
                await updateDoc(cicloRef, {
                    estado: 'en_secado',
                    fechaInicioSecado: serverTimestamp()
                });
                showNotification('Proceso de secado iniciado.');
            } catch (error) {
                console.error("Error starting drying process:", error);
                showNotification('Error al iniciar el secado.', 'error');
            }
        });
    },
    openMoveCicloModal: (cicloId) => {
        const ciclo = currentCiclos.find(c => c.id === cicloId);
        if (ciclo) {
            uiOpenMoveCicloModal(ciclo, currentSalas);
        }
    },
    handleMoveCicloSubmit: async (e) => {
        e.preventDefault();
        const form = e.target;
        const cicloId = form.dataset.cicloId;
        const newSalaId = getEl('move-ciclo-sala-select').value;
        if (!cicloId || !newSalaId) {
            showNotification('Selección inválida.', 'error');
            return;
        }
        try {
            await updateDoc(doc(db, `users/${userId}/ciclos`, cicloId), { salaId: newSalaId });
            showNotification('Ciclo movido de sala.');
            getEl('moveCicloModal').style.display = 'none';
            if (!getEl('ciclosView').classList.contains('hidden')) {
                handlers.hideCiclosView();
            }
        } catch (error) {
            console.error("Error moving ciclo:", error);
            showNotification('Error al mover el ciclo.', 'error');
        }
    },
    initializeTheme: () => {
        const themeToggleBtn = getEl('theme-toggle');
        if (themeToggleBtn) {
            handlers.updateThemeIcon();
            themeToggleBtn.addEventListener('click', handlers.handleThemeToggle);
        }
    },
    handleThemeToggle: () => {
        document.documentElement.classList.toggle('dark');
        localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        handlers.updateThemeIcon();
    },
    updateThemeIcon: () => {
        const themeToggleBtn = getEl('theme-toggle');
        if (themeToggleBtn) {
            const isDark = document.documentElement.classList.contains('dark');
            const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.95-4.243-1.591 1.591M5.25 12H3m4.243-4.95L6.343 5.657M12 6.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5Z" /></svg>`;
            const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>`;
            themeToggleBtn.innerHTML = isDark ? sunIcon : moonIcon;
        }
    }
};
function initializeAppUI(user) {
    // Esta función se llama UNA SOLA VEZ al iniciar sesión.
    // Muestra el esqueleto de la app, renderiza el header y le asigna sus listeners.
    getEl('app-shell').classList.remove('hidden');
    renderHeader(user);

    // Asignar listeners al header persistente
    getEl('logoutBtn').addEventListener('click', () => handlers.signOut());
    getEl('menuBtn').addEventListener('click', (e) => { e.stopPropagation(); getEl('dropdownMenu').classList.toggle('hidden'); });
    getEl('aboutBtn').addEventListener('click', () => getEl('aboutModal').style.display = 'flex');
    
    // Listeners de navegación del menú
    getEl('menuDashboard').addEventListener('click', (e) => { e.preventDefault(); handlers.showDashboard(); getEl('dropdownMenu').classList.add('hidden'); });
    getEl('menuSalas').addEventListener('click', (e) => { e.preventDefault(); handlers.showSalasView(); getEl('dropdownMenu').classList.add('hidden'); });
    getEl('menuTools').addEventListener('click', (e) => { e.preventDefault(); handlers.showToolsView(); getEl('dropdownMenu').classList.add('hidden'); });
    getEl('menuSettings').addEventListener('click', (e) => { e.preventDefault(); handlers.showSettingsView(); getEl('dropdownMenu').classList.add('hidden'); });
}
onAuthStateChanged(auth, async user => {
    getEl('initial-loader').classList.add('hidden');
    
    // Limpiar vistas anteriores
    getEl('authView').classList.add('hidden');
    getEl('app-shell').classList.add('hidden');

    if (user) {
        userId = user.uid;
        await runDataMigration(user.uid);

        // 1. Carga inicial de datos (esperamos a que termine)
        const ciclosQuery = query(collection(db, `users/${userId}/ciclos`));
        const geneticsQuery = query(collection(db, `users/${userId}/genetics`));
        const salasQuery = query(collection(db, `users/${userId}/salas`));
        
        console.log("Cargando datos iniciales desde Firestore...");
        const [ciclosSnapshot, geneticsSnapshot, salasSnapshot] = await Promise.all([
            getDocs(ciclosQuery), getDocs(geneticsQuery), getDocs(salasQuery)
        ]);

        currentCiclos = ciclosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => c.estado !== 'finalizado');
        currentGenetics = geneticsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        currentSalas = salasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Datos de ciclos cargados:", currentCiclos); // DEBUG: Para verificar los datos

        // 2. Inicializar la UI persistente (header)
        initializeAppUI(user);

        // 3. Mostrar la vista inicial (Dashboard)
        handlers.showDashboard();

        // 4. Activar listeners para actualizaciones en tiempo real
        loadCiclos(); loadSalas(); loadGenetics(); loadPhenohunts(); loadHistorial();

        // 5. Inicializar listeners globales (modales, etc.)
        initializeEventListeners(handlers); 

        // 6. Activar Tour
        if (!localStorage.getItem('segcul_tour_v1_completed')) {
            startMainTour();
            localStorage.setItem('segcul_tour_v1_completed', 'true');
        }

    } else {
        // Lógica para cuando el usuario no está logueado
        userId = null;
        if (salasUnsubscribe) salasUnsubscribe(); // Detener listeners
        // ...
        getEl('authView').classList.remove('hidden');
        initializeEventListeners(handlers);
    }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.error('Error al registrar el Service Worker:', error);
      });
  });
}