// js/ui.js

import { crearTimelinePrincipal } from './components/timelinePrincipal.js';

export const getEl = (id) => document.getElementById(id);
let notificationTimeout;

const FERTILIZER_LINES = {
    "Top Crop": ["Deeper Underground", "Top Veg", "Top Bloom", "Big One", "Top Candy", "Top Bud", "Micro Vita"],
    "Namaste": ["Amazonia Roots", "Oro Negro", "Flora Booster", "Trico+", "Shanti", "Bio CaMg"],
    "Kawsay": ["Nutri Base", "Amazonia", "Flora Booster", "Bud Engorde", "Super Candy"],
    "Advanced Nutrients": ["Sensi Grow A+B", "Sensi Bloom A+B", "Voodoo Juice", "B-52", "Big Bud", "Overdrive", "Flawless Finish"],
    "Athena (Blended)": ["Grow A", "Grow B", "Bloom A", "Bloom B", "CaMg", "PK", "Cleanse"],
    "Orgánico / Living Soil": ["Humus de lombriz", "Compost", "Bokashi", "Guano de murciélago", "Harina de hueso", "Melaza", "Micorrizas", "Trichodermas"],
    "Plagron": ["Power Roots", "Terra Grow", "Terra Bloom", "Pure Zym", "Sugar Royal", "Green Sensation", "PK 13-14"],
    "Personalizada": []
};

function createTooltipIcon(title) {
    return `
        <span class="tooltip-trigger inline-flex items-center justify-center" data-tippy-content="${title}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-amber-500 cursor-pointer">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
        </span>
    `;
}

function initializeTooltips() {
    setTimeout(() => {
        tippy('.tooltip-trigger', {
            animation: 'scale-subtle',
            theme: 'light-border',
            allowHTML: true,
            trigger: 'mouseenter focus',
        });
        tippy('.tooltip-trigger-click', {
            animation: 'scale-subtle',
            theme: 'light-border',
            allowHTML: true,
            trigger: 'click',
            interactive: true,
        });
    }, 0);
}

export function showNotification(message, type = 'success') {
    const container = getEl('notification-container');
    if (!container) return;

    if(document.getElementById('main-notification')) {
        return;
    }
    
    const notif = document.createElement('div');
    notif.id = 'main-notification';
    notif.textContent = message;
    
    notif.className = `p-3 rounded-lg shadow-lg text-white transition-all duration-500 ease-in-out`;
    notif.classList.add(type === 'success' ? 'bg-green-500' : 'bg-red-500');

    notif.style.opacity = '0';
    notif.style.transform = 'translateY(20px)';
    
    container.innerHTML = '';
    container.appendChild(notif);

    void notif.offsetWidth;

    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
    
    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(20px)';
        notif.addEventListener('transitionend', () => notif.remove());
    }, 4000);
}

function createModalHTML(id, title, formId, content, submitText, cancelId, submitId = "submitBtn") {
    return `
        <div class="w-11/12 md:w-full max-w-lg p-6 rounded-lg shadow-lg overflow-y-auto max-h-screen">
            <h2 class="text-2xl font-bold mb-6 text-amber-400">${title}</h2>
            <form id="${formId}" data-id="">
                ${content}
                <div class="flex justify-end gap-4 mt-8">
                    <button type="button" id="${cancelId}" class="btn-secondary btn-base py-2 px-4 rounded-lg">Cancelar</button>
                    <button type="submit" id="${submitId}" class="btn-primary btn-base py-2 px-4 rounded-lg">${submitText}</button>
                </div>
            </form>
        </div>
    `;
}

export function openSalaModal(sala = null) {
    const title = sala ? 'Editar Sala' : 'Añadir Sala';
    const content = `
        <div>
            <label for="sala-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Sala</label>
            <input type="text" id="sala-name" required class="w-full p-2 rounded-md" value="${sala ? sala.name : ''}">
        </div>
    `;
    const modal = getEl('salaModal');
    modal.innerHTML = createModalHTML('salaModalContent', title, 'salaForm', content, sala ? 'Guardar Cambios' : 'Crear Sala', 'cancelSalaBtn');
    
    getEl('salaForm').dataset.id = sala ? sala.id : '';
    modal.style.display = 'flex';
}

// MODIFICADO: La función ahora acepta el objeto handlers para poder llamar al selector de genéticas.
export function openCicloModal(ciclo = null, salas = [], preselectedSalaId = null, handlers) {
    const title = ciclo ? 'Editar Ciclo' : 'Añadir Ciclo';
    const salaOptions = salas.length > 0
        ? salas.map(s => `<option value="${s.id}" ${ (ciclo && ciclo.salaId === s.id) || (preselectedSalaId === s.id) ? 'selected' : ''}>${s.name}</option>`).join('')
        : '<option value="" disabled>Crea una sala primero</option>';
    
    const geneticsSectionHTML = !ciclo ? `
        <hr class="border-gray-300 dark:border-gray-600 my-6">
        <div>
            <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Genéticas del Ciclo</h3>
            <div id="selected-genetics-container" class="space-y-2 mb-4">
                 <p class="text-sm text-gray-500 dark:text-gray-400 italic">Añade genéticas desde tu stock de clones o baúl de semillas.</p>
            </div>
            <button type="button" id="open-genetics-selector-btn" class="btn-secondary btn-base w-full py-2 rounded-lg text-sm">
                + Definir Genéticas del Ciclo
            </button>
            <input type="hidden" id="ciclo-genetics-data" name="ciclo-genetics-data">
        </div>
    ` : '';
    
    const content = `
        <div class="space-y-4">
            <div>
                <label for="ciclo-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Ciclo</label>
                <input type="text" id="ciclo-name" required class="w-full p-2 rounded-md" value="${ciclo ? ciclo.name : ''}">
            </div>
            <div>
                <label for="ciclo-sala-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sala</label>
                <select id="ciclo-sala-select" required class="w-full p-2 rounded-md">${salaOptions}</select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="cicloPhase" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fase Inicial</label>
                    <select id="cicloPhase" class="w-full p-2 rounded-md">
                        <option value="Vegetativo" ${ciclo && ciclo.phase === 'Vegetativo' ? 'selected' : ''}>Vegetativo</option>
                        <option value="Floración" ${ciclo && ciclo.phase === 'Floración' ? 'selected' : ''}>Floración</option>
                    </select>
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <label for="cultivationType" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Cultivo</label>
                        ${createTooltipIcon("Define el método de cultivo. Esto ajustará las opciones de registro disponibles (ej: 'Cambio de Solución' para Hidroponia).")}
                    </div>
                    <select id="cultivationType" class="w-full p-2 rounded-md">
                        <option value="Sustrato" ${ciclo && ciclo.cultivationType === 'Sustrato' ? 'selected' : ''}>Sustrato</option>
                        <option value="Hidroponia" ${ciclo && ciclo.cultivationType === 'Hidroponia' ? 'selected' : ''}>Hidroponia</option>
                    </select>
                </div>
            </div>
            <div id="vegetativeDateContainer" class="${(ciclo && ciclo.phase === 'Vegetativo') || !ciclo ? '' : 'hidden'}">
                <label for="vegetativeStartDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio Vegetativo</label>
                <input type="date" id="vegetativeStartDate" class="w-full p-2 rounded-md" value="${ciclo ? ciclo.vegetativeStartDate : ''}">
            </div>
            <div id="floweringDateContainer" class="${ciclo && ciclo.phase === 'Floración' ? '' : 'hidden'}">
                <label for="floweringStartDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio Floración (12/12)</label>
                <input type="date" id="floweringStartDate" class="w-full p-2 rounded-md" value="${ciclo ? ciclo.floweringStartDate : ''}">
            </div>
            <div>
                <label for="ciclo-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                <textarea id="ciclo-notes" rows="3" class="w-full p-2 rounded-md">${ciclo ? ciclo.notes : ''}</textarea>
            </div>
            ${geneticsSectionHTML}
        </div>
    `;
    const modal = getEl('cicloModal');
    modal.innerHTML = createModalHTML('cicloModalContent', title, 'cicloForm', content, ciclo ? 'Guardar Cambios' : 'Crear Ciclo', 'cancelCicloBtn');
    
    getEl('cicloForm').dataset.id = ciclo ? ciclo.id : '';
    modal.style.display = 'flex';
    
    // NUEVO: Lógica para el botón que abre el selector de genéticas
    if (!ciclo) {
        const openSelectorBtn = getEl('open-genetics-selector-btn');
        if(openSelectorBtn) {
            openSelectorBtn.addEventListener('click', () => {
                // El handler se encargará de llamar a la UI con los datos necesarios
                handlers.openGeneticsSelector((selectedGenetics) => {
                    renderSelectedGeneticsForCiclo(selectedGenetics);
                });
            });
        }
    }
    
    initializeTooltips();
}
export function openAddToCatalogModal(handlers) {
    const modal = getEl('cicloModal'); // Reutilizamos un modal existente para mostrarlo
    
    const modalContent = `
        <div class="w-11/12 md:w-full max-w-lg p-6 rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold mb-6 text-amber-400">Añadir al Catálogo</h2>
            
            <div id="catalog-choice-container">
                <p class="text-gray-600 dark:text-gray-300 mb-4">¿Qué quieres añadir a tu catálogo maestro?</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button type="button" id="add-choice-seeds" class="btn-secondary btn-base p-6 rounded-lg text-lg flex flex-col items-center gap-2">
                        🌱
                        <span>Semillas</span>
                    </button>
                    <button type="button" id="add-choice-clone" class="btn-secondary btn-base p-6 rounded-lg text-lg flex flex-col items-center gap-2">
                        🧬
                        <span>Nuevo Clon (Cut)</span>
                    </button>
                </div>
            </div>

            <form id="addSeedsForm" class="hidden space-y-4">
                <h3 class="text-lg font-bold">Añadir Semillas</h3>
                <input type="text" name="name" placeholder="Nombre de la Genética" required class="w-full p-2 rounded-md">
                <input type="text" name="bank" placeholder="Banco (Opcional)" class="w-full p-2 rounded-md">
                <input type="number" name="quantity" placeholder="Cantidad de semillas" required class="w-full p-2 rounded-md">
                <div class="flex justify-end gap-4 mt-4">
                    <button type="button" class="btn-secondary btn-base py-2 px-4 rounded-lg cancel-add-btn">Cancelar</button>
                    <button type="submit" class="btn-primary btn-base py-2 px-4 rounded-lg">Guardar Semillas</button>
                </div>
            </form>

            <form id="addCloneForm" class="hidden space-y-4">
                 <h3 class="text-lg font-bold">Añadir Nuevo Clon (Cut)</h3>
                 <input type="text" name="name" placeholder="Nombre de la Genética" required class="w-full p-2 rounded-md">
                 <input type="text" name="parents" placeholder="Parentales (Opcional)" class="w-full p-2 rounded-md">
                 <input type="text" name="owner" placeholder="Origen / Dueño (Opcional)" class="w-full p-2 rounded-md">
                 <input type="number" name="quantity" value="1" placeholder="Cantidad de clones" required class="w-full p-2 rounded-md">
                 <div class="flex justify-end gap-4 mt-4">
                    <button type="button" class="btn-secondary btn-base py-2 px-4 rounded-lg cancel-add-btn">Cancelar</button>
                    <button type="submit" class="btn-primary btn-base py-2 px-4 rounded-lg">Guardar Clon</button>
                </div>
            </form>
        </div>
    `;
    modal.innerHTML = modalContent;
    modal.style.display = 'flex';

    // Lógica interna del modal
    const choiceContainer = getEl('catalog-choice-container');
    const addSeedsForm = getEl('addSeedsForm');
    const addCloneForm = getEl('addCloneForm');

    getEl('add-choice-seeds').addEventListener('click', () => {
        choiceContainer.classList.add('hidden');
        addSeedsForm.classList.remove('hidden');
    });

    getEl('add-choice-clone').addEventListener('click', () => {
        choiceContainer.classList.add('hidden');
        addCloneForm.classList.remove('hidden');
    });
    
    document.querySelectorAll('.cancel-add-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.style.display = 'none');
    });

    addSeedsForm.addEventListener('submit', (e) => handlers.handleAddToCatalogSubmit(e, 'seed'));
    addCloneForm.addEventListener('submit', (e) => handlers.handleAddToCatalogSubmit(e, 'clone'));
}
// NUEVO: Función que renderiza la lista de genéticas seleccionadas en el modal de ciclo.
function renderSelectedGeneticsForCiclo(selectedGenetics) {
    const container = getEl('selected-genetics-container');
    const dataInput = getEl('ciclo-genetics-data');
    container.innerHTML = '';

    if (selectedGenetics.length === 0) {
        container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400 italic">Añade genéticas desde tu stock de clones o baúl de semillas.</p>`;
        dataInput.value = '';
        return;
    }

    selectedGenetics.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm';
        itemDiv.innerHTML = `
            <span>
                <strong class="text-amber-500">${item.quantity}x</strong> 
                ${item.name} 
                <span class="text-xs text-gray-500 dark:text-gray-400">(${item.source})</span>
            </span>
            <button type="button" data-index="${index}" class="btn-danger btn-base p-1 rounded-full w-5 h-5 flex items-center justify-center text-xs remove-selected-genetic-btn">&times;</button>
        `;
        container.appendChild(itemDiv);
    });

    // Guardar los datos en el input oculto para que el formulario los pueda recoger.
    dataInput.value = JSON.stringify(selectedGenetics);

    // Añadir listeners a los botones de eliminar
    document.querySelectorAll('.remove-selected-genetic-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.currentTarget.dataset.index);
            // Filtramos el array para quitar el elemento
            const updatedSelection = selectedGenetics.filter((_, i) => i !== indexToRemove);
            // Volvemos a renderizar la lista con los datos actualizados
            renderSelectedGeneticsForCiclo(updatedSelection);
        });
    });
}

export function openGeneticsSelectorModal(allGenetics, onConfirm) {
    let currentSelection = []; // Estado interno para esta modal

    const modal = getEl('geneticsSelectorModal');
    modal.innerHTML = `
        <div class="w-11/12 md:w-full max-w-3xl p-6 rounded-lg shadow-lg flex flex-col max-h-[90vh]">
            <h2 class="text-2xl font-bold mb-4 text-amber-400">Definir Genéticas del Ciclo</h2>
            
            <div class="mb-4 border-b border-gray-300 dark:border-gray-700">
                <nav class="flex space-x-4" aria-label="Tabs">
                    <button id="selectorTabClones" class="py-3 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-amber-400 btn-base">Desde Clones</button>
                    <button id="selectorTabSemillas" class="py-3 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-transparent btn-base">Desde Semillas</button>
                </nav>
            </div>

            <div class="flex-grow overflow-y-auto pr-2">
                <div id="selectorContentClones"></div>
                <div id="selectorContentSemillas" class="hidden"></div>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-300 dark:border-gray-600">
                <h3 class="font-bold mb-2">Resumen de Selección</h3>
                <div id="selector-summary" class="space-y-1 text-sm max-h-24 overflow-y-auto mb-4">
                    <p class="italic text-gray-500">Ninguna genética seleccionada.</p>
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" id="cancelGeneticsSelector" class="btn-secondary btn-base py-2 px-4 rounded-lg">Cancelar</button>
                    <button type="button" id="confirmGeneticsSelector" class="btn-primary btn-base py-2 px-4 rounded-lg">Confirmar Selección</button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    const clonesContent = getEl('selectorContentClones');
    const semillasContent = getEl('selectorContentSemillas');
    const summaryContainer = getEl('selector-summary');

    const updateSelectionState = (itemData, isChecked) => {
        const existingIndex = currentSelection.findIndex(s => s.id === itemData.id && s.source === itemData.source);
        if (isChecked) {
            if (existingIndex === -1) {
                currentSelection.push(itemData);
            } else {
                 currentSelection[existingIndex] = itemData;
            }
        } else {
            if (existingIndex > -1) {
                currentSelection.splice(existingIndex, 1);
            }
        }
        renderSummary();
    };

    const renderSummary = () => {
        summaryContainer.innerHTML = '';
        if (currentSelection.length === 0) {
            summaryContainer.innerHTML = '<p class="italic text-gray-500">Ninguna genética seleccionada.</p>';
            return;
        }
        currentSelection.forEach(item => {
            const summaryItem = document.createElement('p');
            const trackingText = item.trackIndividually ? ' (Individual)' : ' (Grupo)';
            summaryItem.innerHTML = `<strong class="text-amber-500">${item.quantity}x</strong> ${item.name} <span class="text-xs">${trackingText}</span>`;
            summaryContainer.appendChild(summaryItem);
        });
    };

    const createListItem = (item, source) => {
        const stock = source === 'clone' ? item.cloneStock : item.quantity;
        const div = document.createElement('div');
        div.className = 'grid grid-cols-12 gap-4 items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800';
        div.innerHTML = `
            <div class="col-span-1 flex items-center">
                <input type="checkbox" class="h-5 w-5 rounded text-amber-500 focus:ring-amber-500 selector-checkbox">
            </div>
            <div class="col-span-5">
                <p class="font-semibold">${item.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Disponibles: ${stock || 0}</p>
            </div>
            <div class="col-span-3 flex items-center gap-2">
                <label class="text-sm">Cant:</label>
                <input type="number" min="1" max="${stock || 0}" value="1" disabled class="w-full p-1 rounded-md selector-quantity">
            </div>
            <div class="col-span-3 flex items-center justify-end">
                <button type="button" disabled class="btn-base btn-secondary text-xs py-1 px-3 rounded-full selector-tracking-btn">
                    Grupo
                </button>
            </div>
        `;

        const mainCheckbox = div.querySelector('.selector-checkbox');
        const quantityInput = div.querySelector('.selector-quantity');
        const trackingBtn = div.querySelector('.selector-tracking-btn');
        let trackIndividually = false;

        const handleUpdate = () => {
            const itemData = { 
                id: item.id, 
                name: item.name, 
                source,
                quantity: parseInt(quantityInput.value) || 1,
                trackIndividually: trackIndividually
            };
            updateSelectionState(itemData, mainCheckbox.checked);
        };

        mainCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            quantityInput.disabled = !isChecked;
            trackingBtn.disabled = !isChecked;
            if (isChecked) quantityInput.focus();
            handleUpdate();
        });
        
        quantityInput.addEventListener('input', handleUpdate);
        
        trackingBtn.addEventListener('click', () => {
            trackIndividually = !trackIndividually;
            
            trackingBtn.classList.toggle('btn-secondary');
            trackingBtn.classList.toggle('btn-primary');
            
            if (trackIndividually) {
                trackingBtn.innerHTML = `🧬 Phenohunt`;
            } else {
                trackingBtn.innerHTML = 'Grupo';
            }
            handleUpdate();
        });

        return div;
    };

    allGenetics.forEach(g => clonesContent.appendChild(createListItem(g, 'clone')));
    allGenetics.filter(g => g.isSeedAvailable).forEach(g => semillasContent.appendChild(createListItem(g, 'seed')));

    const tabClonesBtn = getEl('selectorTabClones');
    const tabSemillasBtn = getEl('selectorTabSemillas');
    tabClonesBtn.addEventListener('click', () => {
        tabClonesBtn.classList.add('border-amber-400'); tabSemillasBtn.classList.remove('border-amber-400');
        clonesContent.classList.remove('hidden'); semillasContent.classList.add('hidden');
    });
    tabSemillasBtn.addEventListener('click', () => {
        tabSemillasBtn.classList.add('border-amber-400'); tabClonesBtn.classList.remove('border-amber-400');
        semillasContent.classList.remove('hidden'); clonesContent.classList.add('hidden');
    });

    getEl('cancelGeneticsSelector').addEventListener('click', () => modal.style.display = 'none');
    getEl('confirmGeneticsSelector').addEventListener('click', () => {
        onConfirm(currentSelection);
        modal.style.display = 'none';
    });
}

export function openLogModal(ciclo, week, log = null) {
    const title = 'Añadir Registro';
    const content = `
        <div class="space-y-4">
            <div>
                <label for="logType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Registro</label>
                <select id="logType" class="w-full p-2 rounded-md">
                    <option value="Riego">${ciclo.cultivationType === 'Hidroponia' ? 'Control de Solución' : 'Riego'}</option>
                    ${ciclo.cultivationType === 'Hidroponia' ? '<option value="Cambio de Solución">Cambio de Solución</option>' : ''}
                    <option value="Control de Plagas">Control de Plagas</option>
                    <option value="Podas">Podas</option>
                </select>
            </div>
            <div id="log-fields-container"></div>
        </div>
    `;
    const modal = getEl('logModal');
    modal.innerHTML = createModalHTML('logModalContent', title, 'logForm', content, 'Guardar Registro', 'cancelLogBtn');
    
    const form = getEl('logForm');
    form.dataset.cicloId = ciclo.id;
    form.dataset.week = week.weekNumber;
    form.dataset.logId = log ? log.id : '';
    
    const logTypeSelect = getEl('logType');
    const logFieldsContainer = getEl('log-fields-container');

    const toggleLogFields = () => {
        const type = logTypeSelect.value;
        logFieldsContainer.innerHTML = '';

        if (type === 'Riego' || type === 'Cambio de Solución') {
            logFieldsContainer.innerHTML = getRiegoHTML(type, FERTILIZER_LINES);
            
            const addLineBtn = getEl('add-fert-line-btn');
            const linesContainer = getEl('fertilizer-lines-container');
            
            const addFertilizerLineBlock = () => {
                const lineBlock = document.createElement('div');
                lineBlock.className = 'fert-line-block border border-gray-300 dark:border-gray-600 p-3 rounded-md relative mt-2';
                
                const lineOptions = Object.keys(FERTILIZER_LINES).map(line => `<option value="${line}">${line}</option>`).join('');

                lineBlock.innerHTML = `
                    <button type="button" class="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 remove-line-btn" title="Eliminar esta línea">&times;</button>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Línea de Fertilizantes</label>
                            <select class="w-full p-2 rounded-md fert-line-select">${lineOptions}</select>
                        </div>
                        <div class="fertilizer-products-container space-y-3"></div>
                    </div>
                `;
                linesContainer.appendChild(lineBlock);
                
                const lineSelect = lineBlock.querySelector('.fert-line-select');
                const productsContainer = lineBlock.querySelector('.fertilizer-products-container');

                if (ciclo.lastUsedFertilizerLine) {
                    lineSelect.value = ciclo.lastUsedFertilizerLine;
                }

                lineSelect.addEventListener('change', () => renderFertilizerProducts(lineSelect.value, productsContainer));
                lineBlock.querySelector('.remove-line-btn').addEventListener('click', () => lineBlock.remove());
                
                renderFertilizerProducts(lineSelect.value, productsContainer); 
            };

            addLineBtn.addEventListener('click', addFertilizerLineBlock);
            addFertilizerLineBlock();

        } else if (type === 'Control de Plagas') {
            logFieldsContainer.innerHTML = `
                <label for="plagas-notes">Notas / Producto Aplicado</label>
                <textarea id="plagas-notes" rows="3" class="w-full p-2 rounded-md"></textarea>
            `;
        } else if (type === 'Podas') {
             logFieldsContainer.innerHTML = `
                <label for="podaType">Tipo de Poda</label>
                <select id="podaType" class="w-full p-2 rounded-md">
                    <option>LST</option><option>Main-lining</option><option>Supercropping</option><option>Defoliación</option><option>Lollipop</option><option>Clones</option>
                </select>
                <div id="clonesSection" class="mt-2 hidden">
                    <label for="clones-count">Cantidad de Clones</label>
                    <input type="number" id="clones-count" class="w-full p-2 rounded-md">
                </div>
            `;
            getEl('podaType').addEventListener('change', () => getEl('clonesSection').style.display = getEl('podaType').value === 'Clones' ? 'block' : 'none');
        } else if (type === 'Trasplante') { 
            logFieldsContainer.innerHTML = `
                <label for="trasplante-details" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Detalles del Trasplante</label>
                <input type="text" id="trasplante-details" placeholder="Ej: Maceta de 10L, de 1L a 3L, etc." class="w-full p-2 rounded-md">
            `;
        }
    };
    
    logTypeSelect.addEventListener('change', toggleLogFields);
    toggleLogFields();

    modal.style.display = 'flex';
}

function getRiegoHTML(type) {
    const litrosField = type === 'Cambio de Solución' ? `
        <div>
            <label for="log-litros" class="text-gray-700 dark:text-gray-300">Litros Totales</label>
            <input type="number" step="0.1" id="log-litros" class="w-full p-2 rounded-md">
        </div>
    ` : '';
    
    return `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="log-ph" class="text-gray-700 dark:text-gray-300">pH</label>
                <input type="number" step="0.1" id="log-ph" class="w-full p-2 rounded-md">
            </div>
            <div>
                <label for="log-ec" class="text-gray-700 dark:text-gray-300">EC</label>
                <input type="number" step="0.1" id="log-ec" class="w-full p-2 rounded-md">
            </div>
            ${litrosField}
        </div>
        <fieldset class="mt-4 border border-gray-300 dark:border-gray-600 p-3 rounded-md">
            <legend class="px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Fertilizantes</legend>
            <div id="fertilizer-lines-container" class="space-y-4"></div>
            <button type="button" id="add-fert-line-btn" class="btn-secondary btn-base py-1 px-3 text-sm rounded-md mt-4 w-full">+ Añadir Otra Línea</button>
        </fieldset>
    `;
}

function renderFertilizerProducts(lineName, container) {
    container.innerHTML = '';
    const products = FERTILIZER_LINES[lineName];
    if (lineName === 'Personalizada') {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = '+ Añadir Producto';
        addBtn.className = 'btn-secondary btn-base py-2 px-3 text-sm rounded-md';
        addBtn.onclick = () => {
            const productRow = document.createElement('div');
            productRow.className = 'grid grid-cols-3 gap-2 custom-fert-row';
            productRow.innerHTML = `
                <input type="text" placeholder="Nombre Producto" class="p-2 rounded-md col-span-1 fert-product-name">
                <input type="number" step="0.1" placeholder="Dosis" class="p-2 rounded-md col-span-1 fert-dose">
                <select class="p-2 rounded-md col-span-1 fert-unit">
                    <option>ml/L</option><option>gr/L</option><option>ml</option><option>gr</option>
                </select>
            `;
            container.insertBefore(productRow, addBtn);
        };
        container.appendChild(addBtn);
    } else {
        products.forEach(productName => {
            const productRow = document.createElement('div');
            productRow.className = 'grid grid-cols-3 gap-2 items-center product-row';
            productRow.innerHTML = `
                <label class="text-gray-700 dark:text-gray-300 col-span-1">${productName}</label>
                <input type="number" step="0.1" placeholder="Dosis" data-product-name="${productName}" class="p-2 rounded-md col-span-1 fert-dose">
                <select class="p-2 rounded-md col-span-1 fert-unit">
                    <option>ml/L</option><option>gr/L</option><option>ml</option><option>gr</option>
                </select>
            `;
            container.appendChild(productRow);
        });
    }
}

export function openMoveCicloModal(ciclo, salas) {
    const title = `Mover Ciclo "${ciclo.name}"`;
    const salaOptions = salas
        .filter(s => s.id !== ciclo.salaId)
        .map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    const content = `
        <p class="mb-4 text-gray-700 dark:text-gray-300">Selecciona la sala de destino:</p>
        <select id="move-ciclo-sala-select" class="w-full p-2 rounded-md">
            ${salaOptions.length > 0 ? salaOptions : '<option disabled>No hay otras salas</option>'}
        </select>
    `;

    const modal = getEl('moveCicloModal');
    modal.innerHTML = createModalHTML('moveCicloModalContent', title, 'moveCicloForm', content, 'Mover', 'cancelMoveCicloBtn');
    
    getEl('moveCicloForm').dataset.cicloId = ciclo.id;
    modal.style.display = 'flex';
}

export function openGerminateModal(seed) {
    const title = `Germinar "${seed.name}"`;
    const content = `
        <p class="mb-1 text-gray-700 dark:text-gray-300">Disponibles: ${seed.quantity}</p>
        <label for="germinate-quantity" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad a germinar</label>
        <input type="number" id="germinate-quantity" min="1" max="${seed.quantity}" required class="w-full p-2 rounded-md" value="1">
    `;
    const modal = getEl('germinateSeedModal');
    modal.innerHTML = createModalHTML('germinateSeedModalContent', title, 'germinateSeedForm', content, 'Germinar', 'cancelGerminateBtn');
    
    getEl('germinateSeedForm').dataset.id = seed.id;
    modal.style.display = 'flex';
}

export function renderCicloDetails(ciclo, handlers) {
    let weeksToRender = [];
    let phaseTitle = '';

    if (ciclo.phase === 'Vegetativo' && ciclo.vegetativeWeeks) {
        weeksToRender = ciclo.vegetativeWeeks;
        phaseTitle = 'Semanas de Vegetativo';
    } else if (ciclo.phase === 'Floración' && ciclo.floweringWeeks) {
        weeksToRender = ciclo.floweringWeeks;
        phaseTitle = 'Semanas de Floración';
    }

    let actionButtonsHTML = '';
    if (ciclo.estado === 'en_secado') {
        actionButtonsHTML = `
            <div class="mt-8 text-center bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-amber-400 mb-2">Proceso de Secado en Marcha</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-4">Cuando la cosecha esté seca y lista para enfrascar, haz clic abajo para guardar el resultado final.</p>
                <button id="finalizar-ciclo-btn" class="btn-primary btn-base py-3 px-6 rounded-lg text-lg animate-pulse">
                    Finalizar y Enfrascar Cosecha
                </button>
            </div>
        `;
    } else {
        const lastWeekNumber = weeksToRender.length > 0 ? weeksToRender[weeksToRender.length - 1].weekNumber : 0;
        const weeksHTML = weeksToRender.length > 0 ? `
            <div class="space-y-4">
                ${weeksToRender.sort((a,b) => a.weekNumber - b.weekNumber).map((week, index) => {
                    const phaseInfo = handlers.getPhaseInfo(week.phaseName || ciclo.phase);
                    const isLastWeek = week.weekNumber === lastWeekNumber;
                    
                    const deleteButtonHTML = `
                        <button 
                            data-action="delete-week" 
                            data-ciclo-id="${ciclo.id}" 
                            data-week-number="${week.weekNumber}" 
                            class="btn-base p-1 rounded-md ${isLastWeek ? 'text-gray-400 hover:bg-red-800 hover:text-white' : 'text-gray-700 dark:text-gray-800 cursor-not-allowed'}" 
                            ${!isLastWeek ? 'disabled' : ''} 
                            ${!isLastWeek ? `data-tippy-content="Solo se puede eliminar la última semana"` : ''}
                            title="Eliminar Semana ${week.weekNumber}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        </button>
                    `;

                    return `
                        <div class="mb-4">
                            <div class="week-header p-3 rounded-t-lg flex justify-between items-center cursor-pointer" onclick="this.nextElementSibling.classList.toggle('hidden')">
                                <div class="flex items-center gap-2">
                                    ${deleteButtonHTML}
                                    <h4 class="font-bold text-lg text-gray-900 dark:text-white">Semana ${week.weekNumber} 
                                        <span class="text-sm font-normal px-2 py-1 rounded-full ml-2 ${phaseInfo.color}">${phaseInfo.name}</span>
                                    </h4>
                                </div>
                                <button class="btn-primary btn-base text-xs py-1 px-2 rounded-md add-log-for-week-btn" data-week='${JSON.stringify(week)}'>+ Registro</button>
                            </div>
                            <div class="p-4 bg-white dark:bg-[#262626] rounded-b-lg space-y-3" id="logs-week-${week.weekNumber}">
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>` : `<p class="text-center text-gray-500 dark:text-gray-400">No hay semanas definidas.</p>`;
        
        const mainActionButtons = `
            <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button id="add-week-btn" class="btn-secondary btn-base py-2 px-4 rounded-lg w-full sm:w-auto">
                    + Añadir Semana de ${ciclo.phase === 'Floración' ? 'Floración' : 'Vegetativo'}
                </button>
                ${ciclo.phase === 'Vegetativo' ? `
                <button id="pasar-a-flora-btn" data-ciclo-id="${ciclo.id}" data-ciclo-name="${ciclo.name}" class="btn-primary btn-base py-2 px-4 rounded-lg font-bold w-full sm:w-auto animate-pulse">
                    Pasar a Floración 🌸
                </button>` : ''}
                ${ciclo.phase === 'Floración' ? `
                <button id="iniciar-secado-btn" class="btn-primary btn-base py-2 px-4 rounded-lg font-bold w-full sm:w-auto">
                    🌱 Poner a Secar
                </button>` : ''}
            </div>
        `;

        actionButtonsHTML = `
            <div class="mt-6">
                <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">${phaseTitle}</h3>
                ${weeksHTML}
                ${mainActionButtons}
            </div>`;
    }

    const diffDaysVege = handlers.calculateDaysSince(ciclo.vegetativeStartDate);
    const diffDaysFlora = handlers.calculateDaysSince(ciclo.floweringStartDate);
    let statusText = '';
    if(ciclo.estado === 'en_secado') statusText = `El ciclo está <span class="font-bold text-yellow-400">EN SECADO</span>.`;
    else if(ciclo.phase === 'Vegetativo' && diffDaysVege !== null) statusText = `Día ${diffDaysVege} de vegetativo.`;
    else if(ciclo.phase === 'Floración' && diffDaysFlora !== null) statusText = `Día ${diffDaysFlora} de floración.`;

    // MODIFICADO: Añadida la sección "Genéticas en Cultivo"
    const geneticsListHTML = (ciclo.genetics && ciclo.genetics.length > 0)
        ? ciclo.genetics.map(g => `
            <li class="flex items-center gap-2 p-2 rounded-md bg-gray-100 dark:bg-gray-800">
                <span class="text-amber-500 font-bold">${g.quantity > 1 ? `${g.quantity}x` : '1x'}</span>
                <span class="text-gray-800 dark:text-gray-200">${g.name}</span>
                <span class="text-xs px-2 py-0.5 rounded-full ${g.source === 'clone' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}">${g.source}</span>
            </li>
          `).join('')
        : '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No hay genéticas definidas para este ciclo.</p>';

    const html = `
        <div data-ciclo-id="${ciclo.id}">
            <header class="flex justify-between items-start mb-6">
                <div>
                    <h2 class="text-3xl font-bold text-amber-400 font-mono tracking-wider">${ciclo.name}</h2>
                    <p class="text-gray-500 dark:text-gray-400">${statusText}</p>
                </div>
                <button id="backToCiclosBtn" class="btn-secondary btn-base py-2 px-4 rounded-lg">Volver</button>
            </header>
            
            <div class="my-6 p-4 card rounded-lg">
                <h3 class="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Genéticas en Cultivo</h3>
                <ul class="space-y-2">
                    ${geneticsListHTML}
                </ul>
            </div>

            <div id="timeline-container" class="my-2"></div>
            <main>
                ${actionButtonsHTML}
            </main>
        </div>
    `;
    setTimeout(() => {
        document.querySelectorAll('.add-log-for-week-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const weekData = JSON.parse(e.target.dataset.week);
                openLogModal(ciclo, weekData);
            });
        });

        document.querySelectorAll('[data-action="delete-week"]').forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlers.handleDeleteLastWeek(e.currentTarget.dataset.cicloId);
                });
            } else {
                tippy(btn, {
                    animation: 'scale-subtle',
                    theme: 'light-border',
                });
            }
        });

        const finalizarBtn = getEl('finalizar-ciclo-btn');
        if (finalizarBtn) {
            finalizarBtn.addEventListener('click', () => handlers.openFinalizarCicloModal(ciclo));
        }
        
        try {
            if (ciclo.phase === 'Floración' && ciclo.estado !== 'en_secado') {
                const timelineContainer = getEl('timeline-container');
                if (timelineContainer) {
                    const diaActual = handlers.calculateDaysSince(ciclo.floweringStartDate);
                    const semanasTotales = weeksToRender.length;
                    
                    if (diaActual !== null && semanasTotales > 0) {
                        const timelineElement = crearTimelinePrincipal(diaActual, semanasTotales);
                        timelineContainer.innerHTML = '';
                        timelineContainer.appendChild(timelineElement);
                    }
                }
            }
        } catch (error) {
            console.error("Error al renderizar la timeline principal:", error);
        }

        initializeTooltips();
    }, 0);
    
    return html;
}

export function renderToolsView() {
    const html = `
        <header class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-amber-400 font-mono tracking-wider">Herramientas</h1>
            <button id="backToPanelBtn" class="btn-secondary btn-base py-2 px-4 rounded-lg">Volver al Panel</button>
        </header>
        <div class="mb-6 border-b border-gray-300 dark:border-gray-700">
            <nav class="flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                <button id="geneticsTabBtn" class="py-4 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-300 whitespace-nowrap btn-base">Genéticas</button>
                <button id="stockTabBtn" class="py-4 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-300 whitespace-nowrap btn-base">Stock Clones</button>
                <button id="baulSemillasTabBtn" class="py-4 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-300 whitespace-nowrap btn-base">Baúl de Semillas</button>
                <button id="phenohuntTabBtn" class="py-4 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-300 whitespace-nowrap btn-base">Phenohunting</button>
                <button id="curingJarsTabBtn" class="py-4 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-300 whitespace-nowrap btn-base">Frascos en Curado</button>
                <button id="historialTabBtn" class="py-4 px-1 border-b-2 font-medium text-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-300 whitespace-nowrap btn-base">Historial</button>
            </nav>
        </div>
        <div id="curingJarsContent" class="hidden">
            <div id="curingJarsList" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between my-4 gap-4">
            <input type="search" id="searchTools" placeholder="Buscar..." class="w-full sm:w-auto sm:max-w-xs p-2 rounded-md focus:ring-amber-500 focus:border-amber-500">
            <div class="flex items-center gap-2">
                <button id="exportCsvBtn" class="btn-secondary btn-base py-2 px-3 rounded-md hidden" title="Exportar vista actual a CSV">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                </button>
                <div id="view-mode-toggle" class="flex items-center gap-2">
                    <button id="view-mode-card" class="btn-secondary p-2 rounded-md btn-base" title="Vista de tarjetas"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg></button>
                    <button id="view-mode-list" class="btn-secondary p-2 rounded-md btn-base" title="Vista de lista"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></button>
                </div>
            </div>
        </div>
        <div id="geneticsContent">
            <div class="flex justify-end mb-4 gap-2">
                 <button id="add-bulk-btn" class="btn-secondary btn-base py-2 px-4 rounded-lg">
                    ⚡ Carga Rápida
                </button>
                 <button id="add-to-catalog-btn" class="btn-primary btn-base py-2 px-4 rounded-lg">
                    + Añadir al Catálogo
                </button>
            </div>
            <div id="geneticsList" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                </div>
        </div>
        <div id="stockContent" class="hidden">
            <div id="stockList" class="space-y-4"></div>
        </div>
        <div id="baulSemillasContent" class="hidden">
            <div id="baulSemillasList" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                </div>
        </div>
        <div id="phenohuntContent" class="hidden">
            <div id="phenohuntList" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 <p class="text-center text-gray-500 dark:text-gray-400 col-span-full">Cargando cacerías activas...</p>
            </div>
        </div>
        <div id="historialContent" class="hidden">
            <div class="flex flex-col md:flex-row gap-8">
                <aside class="w-full md:w-1/4">
                    <div id="historial-filter-panel" class="card p-4">
                        <h3 class="font-bold text-lg mb-4">Filtrar Cosechas</h3>
                        </div>
                </aside>
                <main class="w-full md:w-3/4">
                    <div id="historialGrid" class="space-y-4">
                        </div>
                </main>
            </div>
        </div>
    `;
    setTimeout(() => initializeTooltips(), 0);
    return html;
}

export function renderSettingsView() {
    const html = `
        <header class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-amber-400 font-mono tracking-wider">Ajustes</h1>
            <button id="backToPanelFromSettingsBtn" class="btn-secondary btn-base py-2 px-4 rounded-lg">Volver al Panel</button>
        </header>
        <div class="max-w-2xl mx-auto space-y-8">
            <div class="card p-6">
                <h2 class="text-xl font-bold text-amber-400 mb-4">Apariencia</h2>
                <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Tema de la aplicación</span>
                    <button id="theme-toggle" class="btn-secondary btn-base p-2 rounded-full"></button>
                </div>
            </div>
            <div class="card p-6">
                <h2 class="text-xl font-bold text-amber-400 mb-4">Cambiar Contraseña</h2>
                <form id="changePasswordForm" class="space-y-4">
                    <input type="password" id="newPassword" placeholder="Nueva contraseña" required class="w-full p-2 rounded-md">
                    <input type="password" id="confirmPassword" placeholder="Confirmar nueva contraseña" required class="w-full p-2 rounded-md">
                    <button type="submit" class="btn-primary btn-base py-2 px-4 rounded-lg">Cambiar Contraseña</button>
                </form>
            </div>
            <div class="card p-6 border-red-500 dark:border-red-500">
                <h2 class="text-xl font-bold text-red-500 dark:text-red-400 mb-4">Zona de Peligro</h2>
                <p class="text-gray-500 dark:text-gray-400 mb-4">Esta acción no se puede deshacer. Perderás todos tus datos de cultivo.</p>
                <button id="deleteAccountBtn" class="btn-danger btn-base py-2 px-4 rounded-lg">Eliminar mi Cuenta</button>
            </div>
        </div>
    `;
    setTimeout(() => initializeTooltips(), 0);
    return html;
}

export function createCicloCard(ciclo, handlers) {
    const card = document.createElement('div');
    card.className = 'card rounded-xl p-5 flex flex-col justify-between';
    
    let phaseColor = 'bg-gray-500';
    let phaseText = ciclo.phase;
    if (ciclo.estado === 'en_secado') {
        phaseColor = handlers.getPhaseInfo('en_secado').color;
        phaseText = handlers.getPhaseInfo('en_secado').name;
    } else if (ciclo.phase === 'Floración') {
        phaseColor = 'bg-pink-500';
    } else if (ciclo.phase === 'Vegetativo') {
        phaseColor = 'bg-green-500';
    }

    const typeText = ciclo.cultivationType || 'Sustrato';
    const typeColor = typeText === 'Hidroponia' ? 'bg-blue-500' : 'bg-yellow-600';
    let statusInfo = '';
    let microTimelineHTML = '';

    if (ciclo.estado === 'en_secado') {
        statusInfo = `<p class="text-sm text-yellow-400 font-semibold mt-1">¡Listo para enfrascar!</p>`;
    } else if (ciclo.phase === 'Floración') {
        const diffDays = handlers.calculateDaysSince(ciclo.floweringStartDate);
        if (diffDays !== null && diffDays >= 0) {
            const currentWeek = Math.floor(diffDays / 7) + 1;
            const totalWeeks = ciclo.floweringWeeks ? ciclo.floweringWeeks.length : 0;
            
            if (totalWeeks > 0) {
                 statusInfo = `<p class="text-sm text-gray-500 dark:text-gray-300 mt-1">Día ${diffDays} (Semana ${currentWeek} / ${totalWeeks})</p>`;
                
                const totalDays = totalWeeks * 7;
                const progressPercentage = Math.min(100, (diffDays / totalDays) * 100);
                microTimelineHTML = `
                    <div class="micro-timeline-container">
                        <div class="micro-timeline-progress" style="width: ${progressPercentage}%;"></div>
                    </div>
                `;
            }
        }
    } else if (ciclo.phase === 'Vegetativo') {
        const diffDays = handlers.calculateDaysSince(ciclo.vegetativeStartDate);
        if (diffDays !== null && diffDays >= 0) {
            const currentWeek = Math.floor(diffDays / 7) + 1;
            statusInfo = `<p class="text-sm text-gray-500 dark:text-gray-300 mt-1">Día ${diffDays} (Semana ${currentWeek}) de vegetativo</p>`;
        }
    }
    card.innerHTML = `
        <div>
            <div class="flex justify-between items-start">
                <h3 class="text-xl font-bold text-amber-400">${ciclo.name}</h3>
                <div class="flex flex-col items-end gap-2">
                   <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${phaseColor} text-white">${phaseText}</span>
                   <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${typeColor} text-white">${typeText}</span>
                </div>
            </div>
            ${statusInfo}
            ${microTimelineHTML}
        </div>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
            <button data-action="move-ciclo" class="btn-secondary btn-base p-2 rounded-lg tooltip-trigger" data-tippy-content="Permite mover este ciclo a otra Sala sin afectar sus datos.">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
            </button>
            <button data-action="edit-ciclo" class="btn-secondary btn-base p-2 rounded-lg" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
            </button>
            <button data-action="delete-ciclo" class="btn-danger btn-base p-2 rounded-lg" title="Eliminar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            </button>
            <button data-action="view-details" class="btn-primary btn-base flex-grow sm:flex-grow-0 font-semibold py-2 px-3 rounded-lg text-sm">Ver Detalles</button>
        </div>
    `;
    card.querySelector('[data-action="edit-ciclo"]').addEventListener('click', () => handlers.openCicloModal(ciclo, null, null, handlers));
    card.querySelector('[data-action="delete-ciclo"]').addEventListener('click', () => handlers.deleteCiclo(ciclo.id, ciclo.name));
    card.querySelector('[data-action="view-details"]').addEventListener('click', () => handlers.showCicloDetails(ciclo));
    card.querySelector('[data-action="move-ciclo"]').addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.openMoveCicloModal(ciclo.id);
    });
    return card;
}

export function createLogEntry(log, ciclo, handlers) {
    const entry = document.createElement('div');
    const logDate = log.date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short'});
    let details = '';
    let borderColorClass = 'border-amber-500';

    if (log.type === 'Iniciar Secado') {
        borderColorClass = 'border-yellow-400';
        details = `<p class="font-semibold text-yellow-400">🔥 Inicio de Secado</p><p class="text-sm text-gray-500 dark:text-gray-300 mt-1">El ciclo ha sido marcado para secado.</p>`;
    } else if (log.type === 'Riego' || log.type === 'Cambio de Solución') {
        const title = log.type === 'Cambio de Solución' ? 'Cambio de Solución' : (ciclo.cultivationType === 'Hidroponia' ? 'Control de Solución' : 'Riego');
        const color = log.type === 'Cambio de Solución' ? 'text-blue-400' : 'text-amber-400';
        details = `<p class="font-semibold ${color}">${title}</p>
                        <div class="text-sm text-gray-500 dark:text-gray-300 mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                            ${log.litros ? `<span><strong>Litros:</strong> ${log.litros}</span>` : ''}
                            <span><strong>pH:</strong> ${log.ph || 'N/A'}</span>
                            <span><strong>EC:</strong> ${log.ec || 'N/A'}</span>
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-300 mt-2"><strong>Fertilizantes:</strong> ${handlers.formatFertilizers(log.fertilizers)}</div>`;
        borderColorClass = log.type === 'Cambio de Solución' ? 'border-blue-400' : 'border-amber-500';

    } else if (log.type === 'Control de Plagas') {
        borderColorClass = 'border-red-400';
        details = `<p class="font-semibold text-red-400">Control de Plagas</p>
                         <p class="text-sm text-gray-500 dark:text-gray-300 mt-1 whitespace-pre-wrap">${log.notes || 'Sin notas.'}</p>`;
    } else if (log.type === 'Podas') {
        borderColorClass = 'border-green-400';
        details = `<p class="font-semibold text-green-400">Poda: ${log.podaType || ''}</p>`;
        if(log.clonesCount) details += `<p class="text-sm text-gray-500 dark:text-gray-300">Se sacaron ${log.clonesCount} clones.</p>`;
    } else if (log.type === 'Trasplante') { 
        borderColorClass = 'border-teal-400';
        details = `<p class="font-semibold text-teal-400">Trasplante</p>
                         <p class="text-sm text-gray-500 dark:text-gray-300 mt-1">${log.details || 'Sin detalles.'}</p>`;
    }
    entry.className = `log-entry p-3 rounded-md ${borderColorClass}`;

    entry.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <span class="text-xs text-gray-400 dark:text-gray-400">${logDate}</span>
            </div>
            <button data-action="delete-log" data-ciclo-id="${ciclo.id}" data-log-id="${log.id}" class="p-1 rounded-md text-gray-500 dark:text-gray-500 hover:bg-red-800 hover:text-white btn-base" title="Eliminar registro">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <div class="mt-2">${details}</div>
    `;
    entry.querySelector('[data-action="delete-log"]').addEventListener('click', (e) => {
        handlers.deleteLog(e.currentTarget.dataset.cicloId, e.currentTarget.dataset.logId);
    });
    return entry;
}

export function renderSalasGrid(salas, ciclos, handlers) {
    const salasGrid = getEl('salasGrid');
    if (!salasGrid) return;
    getEl('loadingSalas').style.display = 'none';
    salasGrid.innerHTML = '';
    if (salas.length === 0) {
        getEl('emptySalasState').style.display = 'block';
        return;
    }
    getEl('emptySalasState').style.display = 'none';

    salas.sort((a, b) => (a.position || 0) - (b.position || 0));

    salas.forEach(sala => {
        const ciclosInSala = ciclos.filter(c => c.salaId === sala.id);
        const activeCiclos = ciclosInSala.filter(c => c.estado !== 'finalizado');
        const salaCard = document.createElement('div');
        salaCard.className = 'card rounded-xl p-5 flex flex-col justify-between aspect-square relative';
        salaCard.dataset.salaId = sala.id;
        
        const ciclosPreviewContainer = document.createElement('div');
        ciclosPreviewContainer.className = 'ciclos-list space-y-1';

        if (activeCiclos.length > 0) {
            activeCiclos.forEach(ciclo => {
                const cicloItemContainer = document.createElement('div');
                cicloItemContainer.className = 'ciclo-item-container';

                const cicloLink = document.createElement('div');
                cicloLink.className = 'ciclo-item-link';
                cicloLink.onclick = () => handlers.showCicloDetails(ciclo);

                let phaseClass = 'finalizado';
                if (ciclo.estado === 'en_secado') {
                    phaseClass = 'secado';
                } else if (ciclo.phase === 'Vegetativo') {
                    phaseClass = 'vegetativo';
                } else if (ciclo.phase === 'Floración' && ciclo.floweringStartDate && ciclo.floweringWeeks) {
                    const diffDays = handlers.calculateDaysSince(ciclo.floweringStartDate);
                    if (diffDays !== null && diffDays >= 0) {
                        const currentWeek = Math.floor(diffDays / 7) + 1;
                        const weekData = ciclo.floweringWeeks.find(w => w.weekNumber === currentWeek);
                        phaseClass = weekData ? handlers.getPhaseInfo(weekData.phaseName).class : 'flora';
                    } else {
                        phaseClass = 'flora';
                    }
                }

                cicloLink.innerHTML = `
                    <div class="ciclo-status-dot ${phaseClass}"></div>
                    <span class="ciclo-name">${ciclo.name}</span>
                `;

                const actionsButton = document.createElement('button');
                actionsButton.className = 'btn-base p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600';
                actionsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>`;
                
                const actionsMenu = document.createElement('div');
                actionsMenu.className = 'ciclo-actions-menu hidden';
                actionsMenu.innerHTML = `
                    <a data-action="edit-ciclo">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                        Editar
                    </a>
                    <a data-action="move-ciclo">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                        Mover
                    </a>
                    <a data-action="delete-ciclo" class="text-red-500 dark:text-red-400">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        Eliminar
                    </a>
                `;
                
                actionsButton.onclick = (e) => handlers.handleToggleCicloMenu(e, actionsMenu);
                actionsMenu.querySelector('[data-action="edit-ciclo"]').onclick = () => handlers.openCicloModal(ciclo, null, null, handlers);
                actionsMenu.querySelector('[data-action="move-ciclo"]').onclick = () => handlers.openMoveCicloModal(ciclo.id);
                actionsMenu.querySelector('[data-action="delete-ciclo"]').onclick = () => handlers.deleteCiclo(ciclo.id, ciclo.name);

                cicloItemContainer.appendChild(cicloLink);
                cicloItemContainer.appendChild(actionsButton);
                cicloItemContainer.appendChild(actionsMenu);
                ciclosPreviewContainer.appendChild(cicloItemContainer);
            });
        } else {
            ciclosPreviewContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Sala vacía</p>';
        }

        salaCard.innerHTML = `
            <div class="absolute top-2 right-2">
                <button data-action="quick-add-ciclo" data-sala-id="${sala.id}" class="btn-secondary h-8 w-8 rounded-full flex items-center justify-center btn-base hover:bg-amber-500" title="Añadir Ciclo a ${sala.name}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </button>
            </div>
            <div class="flex-grow flex flex-col">
                <h3 class="text-2xl font-bold text-amber-400 cursor-pointer" data-action="open-sala">${sala.name}</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-4">${activeCiclos.length} ciclo(s) activo(s)</p>
                <div class="flex-grow relative overflow-y-auto"></div>
            </div>
            <div class="flex justify-end gap-2 mt-4 flex-wrap">
                <button data-action="edit-sala" class="btn-secondary btn-base p-2 rounded-lg" title="Editar Sala">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                </button>
                <button data-action="delete-sala" class="btn-danger btn-base p-2 rounded-lg" title="Eliminar Sala">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
            </div>
        `;
        salaCard.querySelector('.flex-grow.relative').appendChild(ciclosPreviewContainer);

        salaCard.querySelector('[data-action="open-sala"]').addEventListener('click', (e) => {
            handlers.showCiclosView(sala.id, sala.name);
        });
        salaCard.querySelector('[data-action="edit-sala"]').addEventListener('click', (e) => {
            e.stopPropagation();
            handlers.openSalaModal(sala);
        });
        salaCard.querySelector('[data-action="delete-sala"]').addEventListener('click', (e) => {
            e.stopPropagation();
            handlers.deleteSala(sala.id, sala.name);
        });
        salaCard.querySelector('[data-action="quick-add-ciclo"]').addEventListener('click', (e) => {
            e.stopPropagation();
            handlers.openCicloModal(null, null, e.currentTarget.dataset.salaId, handlers);
        });
        salasGrid.appendChild(salaCard);
    });
    initializeTooltips();
}
function createMasterGeneticCard(g, handlers) {
    const geneticCard = document.createElement('div');
    geneticCard.className = 'card p-4 flex flex-col justify-between';
    geneticCard.dataset.id = g.id;

    const favoriteIconHTML = `
        <button data-action="toggle-favorite" data-id="${g.id}" class="btn-base p-1 rounded-full text-gray-400 hover:bg-yellow-100 dark:hover:bg-gray-700" title="Marcar como favorita">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 ${g.favorita ? 'text-yellow-400' : 'text-gray-400'}">
                <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clip-rule="evenodd" />
            </svg>
        </button>
    `;

    const seedStockHTML = g.seedStock > 0 ? `<span class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">🌱 Semillas: <strong class="text-amber-400">${g.seedStock}</strong></span>` : '';
    const cloneStockHTML = g.cloneStock > 0 ? `<span class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">🧬 Clones: <strong class="text-amber-400">${g.cloneStock}</strong></span>` : '';

    geneticCard.innerHTML = `
        <div>
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-2">
                    ${favoriteIconHTML}
                    <h3 class="font-bold text-lg text-amber-400">${g.name}</h3>
                </div>
                <span class="text-xs text-gray-400 dark:text-gray-500">${g.bank || 'Sin Banco'}</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-9">${g.parents || 'Parentales desconocidos'}</p>
            
            <div class="mt-4 pl-9 flex flex-col sm:flex-row gap-x-4 gap-y-1">
                ${seedStockHTML}
                ${cloneStockHTML}
            </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
            <button data-action="edit-genetic" data-id="${g.id}" class="btn-secondary btn-base p-2 rounded-lg" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
            </button>
            <button data-action="delete-genetic" data-id="${g.id}" class="btn-danger btn-base p-2 rounded-lg" title="Eliminar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            </button>
        </div>
    `;
    return geneticCard;
}
export function renderGeneticsList(genetics, handlers) {
    const geneticsList = getEl('geneticsList');
    if (!geneticsList) return;
    geneticsList.innerHTML = '';
    if (genetics.length === 0) {
        geneticsList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 col-span-full">Tu catálogo de genéticas está vacío. ¡Añade tu primer clon o paquete de semillas para empezar!</p>`;
        return;
    }
    
    // Ordenar por favoritas primero, luego alfabéticamente
    genetics.sort((a, b) => {
        if (a.favorita && !b.favorita) return -1;
        if (!a.favorita && b.favorita) return 1;
        return a.name.localeCompare(b.name);
    });

    genetics.forEach(g => {
        const geneticCard = createMasterGeneticCard(g, handlers);
        geneticsList.appendChild(geneticCard);
    });
    
    // Re-asignar listeners después de renderizar
    geneticsList.querySelectorAll('[data-action="edit-genetic"]').forEach(btn => btn.addEventListener('click', (e) => handlers.editGenetic(e.currentTarget.dataset.id)));
    geneticsList.querySelectorAll('[data-action="delete-genetic"]').forEach(btn => btn.addEventListener('click', (e) => handlers.deleteGenetic(e.currentTarget.dataset.id)));
    geneticsList.querySelectorAll('[data-action="toggle-favorite"]').forEach(btn => btn.addEventListener('click', (e) => handlers.handleToggleFavorite(e.currentTarget.dataset.id)));
}

export function renderGeneticsListCompact(genetics, handlers) {
    const geneticsList = getEl('geneticsList');
    if (!geneticsList) return;
    geneticsList.innerHTML = '';
    if (genetics.length === 0) {
        geneticsList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No hay genéticas que coincidan con la búsqueda.</p>`;
        return;
    }
    genetics.sort((a, b) => (a.position || 0) - (b.position || 0));
    genetics.forEach(g => {
        const item = document.createElement('div');
        item.className = 'compact-list-item flex justify-between items-center';
        item.dataset.id = g.id;

        const favoriteIconHTML = `
            <button data-action="toggle-favorite" data-id="${g.id}" class="btn-base p-1 rounded-full text-gray-400 hover:bg-yellow-100 dark:hover:bg-gray-700" title="Marcar como favorita">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 ${g.favorita ? 'text-yellow-400' : 'text-gray-400'}">
                    <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clip-rule="evenodd" />
                </svg>
            </button>
        `;

        item.innerHTML = `
            <div class="flex items-center gap-2">
                 ${favoriteIconHTML}
                <div>
                    <p class="font-semibold text-amber-400">${g.name}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${g.bank || 'Sin banco'}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button data-action="edit-genetic" data-id="${g.id}" class="btn-secondary btn-base p-2 rounded-lg" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                </button>
                <button data-action="delete-genetic" data-id="${g.id}" class="btn-danger btn-base p-2 rounded-lg" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
            </div>
        `;
        geneticsList.appendChild(item);
    });
    geneticsList.querySelectorAll('[data-action="edit-genetic"]').forEach(btn => btn.addEventListener('click', (e) => handlers.editGenetic(e.currentTarget.dataset.id)));
    geneticsList.querySelectorAll('[data-action="delete-genetic"]').forEach(btn => btn.addEventListener('click', (e) => handlers.deleteGenetic(e.currentTarget.dataset.id)));
    geneticsList.querySelectorAll('[data-action="toggle-favorite"]').forEach(btn => btn.addEventListener('click', (e) => handlers.handleToggleFavorite(e.currentTarget.dataset.id)));
}

export function renderStockList(genetics, handlers) {
    const stockList = getEl('stockList');
    if (!stockList) return;
    stockList.innerHTML = '';
    if (genetics.length === 0) {
        stockList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">Añade genéticas para ver el stock.</p>`;
        return;
    }
    stockList.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    genetics.sort((a, b) => (a.position || 0) - (b.position || 0));
    genetics.forEach(g => {
        const stockCard = document.createElement('div');
        stockCard.className = 'card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center';
        stockCard.dataset.id = g.id;
        stockCard.innerHTML = `
            <div class="mb-3 sm:mb-0">
                <p class="font-bold text-lg text-amber-400">${g.name}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Clones en stock: <span class="font-bold text-xl text-amber-400">${g.cloneStock || 0}</span></p>
            </div>
            <div class="flex items-center gap-2 tooltip-trigger" data-tippy-content="Actualiza manualmente tu stock. También se suma automáticamente cuando registrás una 'Poda de Clones' en un ciclo.">
                <button data-action="update-stock" data-id="${g.id}" data-amount="-1" class="btn-secondary btn-base rounded-full w-10 h-10 flex items-center justify-center text-2xl">-</button>
                <button data-action="update-stock" data-id="${g.id}" data-amount="1" class="btn-secondary btn-base rounded-full w-10 h-10 flex items-center justify-center text-2xl">+</button>
            </div>
        `;
        stockList.appendChild(stockCard);
    });
    stockList.querySelectorAll('[data-action="update-stock"]').forEach(btn => btn.addEventListener('click', (e) => handlers.updateStock(e.currentTarget.dataset.id, parseInt(e.currentTarget.dataset.amount))));
}

export function renderStockListCompact(genetics, handlers) {
    const stockList = getEl('stockList');
    if (!stockList) return;
    stockList.innerHTML = '';
    if (genetics.length === 0) {
        stockList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No hay clones en stock.</p>`;
        return;
    }
    stockList.className = 'space-y-4';
    genetics.sort((a, b) => (a.position || 0) - (b.position || 0));
    genetics.forEach(g => {
        const item = document.createElement('div');
        item.className = 'compact-list-item flex justify-between items-center';
        item.dataset.id = g.id;
        item.innerHTML = `
            <div>
                <p class="font-semibold text-amber-400">${g.name}</p>
            </div>
            <div class="flex items-center gap-4">
                <span class="font-bold text-lg text-gray-700 dark:text-gray-300">${g.cloneStock || 0}</span>
                <div class="flex items-center gap-2 tooltip-trigger" data-tippy-content="Actualiza manualmente tu stock. También se suma automáticamente cuando registrás una 'Poda de Clones' en un ciclo.">
                    <button data-action="update-stock" data-id="${g.id}" data-amount="-1" class="btn-secondary btn-base rounded-full w-8 h-8 flex items-center justify-center text-xl">-</button>
                    <button data-action="update-stock" data-id="${g.id}" data-amount="1" class="btn-secondary btn-base rounded-full w-8 h-8 flex items-center justify-center text-xl">+</button>
                </div>
            </div>
        `;
        stockList.appendChild(item);
    });
    stockList.querySelectorAll('[data-action="update-stock"]').forEach(btn => btn.addEventListener('click', (e) => handlers.updateStock(e.currentTarget.dataset.id, parseInt(e.currentTarget.dataset.amount))));
}

export function renderBaulSemillasList(seeds, handlers) {
    const baulSemillasList = getEl('baulSemillasList');
    if (!baulSemillasList) return;
    baulSemillasList.innerHTML = '';
    if (seeds.length === 0) {
        baulSemillasList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No hay semillas que coincidan con la búsqueda.</p>`;
        return;
    }
    seeds.sort((a, b) => (a.position || 0) - (b.position || 0));
    seeds.forEach(s => {
        const seedCard = document.createElement('div');
        seedCard.className = 'card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center';
        seedCard.dataset.id = s.id;
        seedCard.innerHTML = `
            <div class="mb-3 sm:mb-0">
                <p class="font-bold text-lg text-amber-400">${s.name}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${s.bank || 'Banco Desconocido'}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Cantidad: <span class="font-bold text-amber-400">${s.seedStock || 0}</span></p>
            </div>
            <div class="flex gap-2 flex-wrap">
                <button data-action="germinate-seed" data-id="${s.id}" class="btn-primary btn-base py-2 px-4 rounded-lg text-sm tooltip-trigger" ${s.seedStock > 0 ? '' : 'disabled'} data-tippy-content="Inicia el proceso de germinación. Esto descontará la cantidad seleccionada de tu stock en el baúl.">Germinar</button>
                <button data-action="delete-seed" data-id="${s.id}" class="btn-danger btn-base p-2 rounded-lg" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
            </div>
        `;
        baulSemillasList.appendChild(seedCard);
    });
    baulSemillasList.querySelectorAll('[data-action="germinate-seed"]').forEach(btn => btn.addEventListener('click', (e) => handlers.openGerminateModal(e.currentTarget.dataset.id)));
    baulSemillasList.querySelectorAll('[data-action="delete-seed"]').forEach(btn => btn.addEventListener('click', (e) => handlers.deleteSeed(e.currentTarget.dataset.id)));
}

export function renderBaulSemillasListCompact(seeds, handlers) {
    const baulSemillasList = getEl('baulSemillasList');
    if (!baulSemillasList) return;
    baulSemillasList.innerHTML = '';
    if (seeds.length === 0) {
        baulSemillasList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No hay semillas que coincidan con la búsqueda.</p>`;
        return;
    }
    seeds.sort((a, b) => (a.position || 0) - (b.position || 0));
    seeds.forEach(s => {
        const item = document.createElement('div');
        item.className = 'compact-list-item flex justify-between items-center';
        item.dataset.id = s.id;
        item.innerHTML = `
            <div>
                <p class="font-semibold text-amber-400">${s.name} <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${s.seedStock})</span></p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${s.bank || 'Banco Desconocido'}</p>
            </div>
            <div class="flex gap-2">
                <button data-action="germinate-seed" data-id="${s.id}" class="btn-primary btn-base p-2 rounded-lg text-sm tooltip-trigger" ${s.seedStock > 0 ? '' : 'disabled'} data-tippy-content="Inicia el proceso de germinación. Esto descontará la cantidad seleccionada de tu stock en el baúl.">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" /></svg>
                </button>
                <button data-action="delete-seed" data-id="${s.id}" class="btn-danger btn-base p-2 rounded-lg" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
            </div>
        `;
        baulSemillasList.appendChild(item);
    });
    baulSemillasList.querySelectorAll('[data-action="germinate-seed"]').forEach(btn => btn.addEventListener('click', (e) => handlers.openGerminateModal(e.currentTarget.dataset.id)));
    baulSemillasList.querySelectorAll('[data-action="delete-seed"]').forEach(btn => btn.addEventListener('click', (e) => handlers.deleteSeed(e.currentTarget.dataset.id)));
}

export function renderHistorialView(historial, handlers) {
    const grid = getEl('historialGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (historial.length === 0) {
        grid.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 col-span-full">No hay cosechas en tu historial. ¡Finaliza un ciclo para empezar!</p>`;
        return;
    }

    historial.sort((a,b) => b.fechaFinalizacion.toDate() - a.fechaFinalizacion.toDate());
    historial.forEach(ciclo => {
        grid.appendChild(createHistorialCard(ciclo, handlers));
    });
    initializeTooltips();
}

function createHistorialCard(ciclo, handlers) {
    const card = document.createElement('div');
    card.className = 'card p-4 rounded-lg';

    const fechaFin = ciclo.fechaFinalizacion ? ciclo.fechaFinalizacion.toDate().toLocaleDateString('es-AR') : 'N/A';
    const allTags = [...(ciclo.etiquetasGlobales || []), ...(ciclo.etiquetasCustom || [])];
    const tagsHTML = allTags.map(tag => {
        const isCustom = ciclo.etiquetasCustom && ciclo.etiquetasCustom.includes(tag);
        return `<span class="tag ${isCustom ? 'tag-custom' : 'tag-standard'}">${tag}</span>`;
    }).join('');
    
    const geneticsList = ciclo.genetics ? ciclo.genetics.map(g => `<li>${g.name}</li>`).join('') : '<li>No especificadas</li>';

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <h3 class="text-xl font-bold text-amber-400">${ciclo.name}</h3>
            <div class="flex items-center gap-2">
                <span class="text-lg font-mono text-gray-700 dark:text-gray-200 cursor-pointer tooltip-trigger-click" data-tippy-content="<ul class='list-disc list-inside text-left'>${geneticsList}</ul>">🧬</span>
            </div>
        </div>
        <hr class="border-gray-200 dark:border-gray-700 my-2">
        <div class="flex justify-between items-center text-gray-600 dark:text-gray-300 font-mono text-lg my-3">
            <span class="tooltip-trigger" data-tippy-content="Peso en seco">⚖️ ${ciclo.pesoSeco || 0}g</span>
            <span class="tooltip-trigger" data-tippy-content="Días de floración">🌸 ${ciclo.diasDeFlora || 0}d</span>
            <span class="tooltip-trigger" data-tippy-content="Días de secado">⏳ ${ciclo.diasDeSecado || 0}d</span>
            <span class="tooltip-trigger" data-tippy-content="Fecha de cosecha">🗓️ ${fechaFin}</span>
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
            ${tagsHTML || '<p class="text-xs text-gray-400 italic">Sin etiquetas.</p>'}
        </div>
    `;
    
    return card;
}

export function openFinalizarCicloModal(ciclo, predefinedTags, maxCustomTags, allGenetics) {
    const modal = getEl('finalizarCicloModal');
    const form = getEl('finalizarCicloForm');
    form.dataset.cicloId = ciclo.id;

    const globalTagsContainer = getEl('global-tags-container');
    globalTagsContainer.innerHTML = '';
    Object.entries(predefinedTags).forEach(([category, tags]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-2';
        categoryDiv.innerHTML = `<h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">${category}</h4>`;
        const tagsWrapper = document.createElement('div');
        tagsWrapper.className = 'flex flex-wrap gap-2';
        tags.forEach(tag => {
            const tagEl = document.createElement('button');
            tagEl.type = 'button';
            tagEl.className = 'tag tag-standard';
            tagEl.textContent = tag;
            tagEl.onclick = () => tagEl.classList.toggle('active');
            tagsWrapper.appendChild(tagEl);
        });
        categoryDiv.appendChild(tagsWrapper);
        globalTagsContainer.appendChild(categoryDiv);
    });

    const customTagsContainer = getEl('custom-tags-container');
    const customTagInput = getEl('custom-tag-input');
    const addCustomTagBtn = getEl('add-custom-tag-btn');
    customTagsContainer.innerHTML = '';

    const addCustomTag = () => {
        if (customTagsContainer.children.length >= maxCustomTags) {
            showNotification(`Puedes añadir un máximo de ${maxCustomTags} etiquetas personalizadas.`, 'error');
            return;
        }
        const value = customTagInput.value.trim();
        if (value) {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag tag-custom flex items-center gap-1';
            tagEl.textContent = value;
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.innerHTML = '&times;';
            removeBtn.className = 'font-bold';
            removeBtn.onclick = () => tagEl.remove();
            tagEl.appendChild(removeBtn);
            customTagsContainer.appendChild(tagEl);
            customTagInput.value = '';
        }
    };
    addCustomTagBtn.onclick = addCustomTag;
    customTagInput.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); addCustomTag(); }};

    const geneticasContainer = getEl('geneticas-feedback-container');
    geneticasContainer.innerHTML = '';
    if (ciclo.genetics && ciclo.genetics.length > 0) {
        ciclo.genetics.forEach(g => {
            const geneticInfo = allGenetics.find(ag => ag.id === g.id);
            const row = document.createElement('div');
            row.className = 'genetic-feedback-row p-3 rounded-md bg-gray-100 dark:bg-gray-800';
            row.dataset.id = g.id;
            row.dataset.name = g.name;
            row.innerHTML = `
                <p class="font-bold text-lg text-amber-400">${g.name}</p>
                <div class="flex items-center justify-between mt-2">
                    <div class="flex gap-4 text-sm">
                        <label class="flex items-center gap-1"><input type="radio" name="decision-${g.id}" value="repetir"> 👍 Repetir</label>
                        <label class="flex items-center gap-1"><input type="radio" name="decision-${g.id}" value="no-repetir"> 👎 No Repetir</label>
                    </div>
                    <label class="flex items-center gap-2 text-lg cursor-pointer">
                        <input type="checkbox" class="favorite-checkbox h-5 w-5 rounded text-amber-500 focus:ring-amber-500" ${geneticInfo && geneticInfo.favorita ? 'checked' : ''}> ⭐ Favorita
                    </label>
                </div>
            `;
            geneticasContainer.appendChild(row);
        });
    } else {
        geneticasContainer.innerHTML = '<p class="italic text-gray-500">No se especificaron genéticas para este ciclo.</p>';
    }

    modal.style.display = 'flex';
}

export function initializeEventListeners(handlers) {
    // Mantenemos los listeners de los formularios de autenticación
    const loginForm = getEl('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handlers.handleLogin(getEl('login-email').value, getEl('login-password').value);
        });
    }
    const registerForm = getEl('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handlers.handleRegister(getEl('register-email').value, getEl('register-password').value);
        });
    }
    const showRegister = getEl('showRegister');
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            getEl('loginForm').classList.add('hidden');
            getEl('registerForm').classList.remove('hidden');
            getEl('authError').classList.add('hidden');
        });
    }
    const showLogin = getEl('showLogin');
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            getEl('registerForm').classList.add('hidden');
            getEl('loginForm').classList.remove('hidden');
            getEl('authError').classList.add('hidden');
        });
    }
    
    // Mantenemos los listeners para cerrar los modales, que son globales
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#cancelSalaBtn')) getEl('salaModal').style.display = 'none';
        if (e.target.closest('#cancelCicloBtn')) getEl('cicloModal').style.display = 'none';
        if (e.target.closest('#cancelLogBtn')) getEl('logModal').style.display = 'none';
        if (e.target.closest('#cancelGeneticsSelector')) getEl('geneticsSelectorModal').style.display = 'none';
        if (e.target.closest('#cancelMoveCicloBtn')) getEl('moveCicloModal').style.display = 'none';
        if (e.target.closest('#cancelGerminateBtn')) getEl('germinateSeedModal').style.display = 'none';
        if (e.target.closest('#closeAboutBtn')) getEl('aboutModal').style.display = 'none';
        if (e.target.closest('#cancelActionBtn')) handlers.hideConfirmationModal();
        if (e.target.closest('#confirmActionBtn')) {
            if (handlers.getConfirmCallback()) handlers.getConfirmCallback()();
            handlers.hideConfirmationModal();
        }
        if (e.target.closest('#cancelFinalizarBtn')) getEl('finalizarCicloModal').style.display = 'none';
        if (e.target.closest('#cancelBulkAddBtn')) getEl('bulkAddModal').style.display = 'none';
        if (e.target.closest('#cancelWizardBtn')) getEl('setupWizardModal').style.display = 'none';
    });

    // Mantenemos los listeners de los formularios de los modales
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'salaForm') handlers.handleSalaFormSubmit(e);
        if (e.target.id === 'cicloForm') handlers.handleCicloFormSubmit(e);
        if (e.target.id === 'logForm') handlers.handleLogFormSubmit(e);
        if (e.target.id === 'moveCicloForm') handlers.handleMoveCicloSubmit(e);
        // ... y el resto de tus listeners de formularios ...
    });
    
    // SE HAN ELIMINADO LOS LISTENERS PARA #menuBtn, #logoutBtn, #menuTools, etc.
    // Su única responsabilidad ahora es de la función showDashboard.

    initializeTooltips();
}

//=================================================================
// FUNCIÓN 1: Dibuja la lista de cacerías
//=================================================================
export function renderPhenohuntList(hunts, handlers) {
  const listContainer = getEl('phenohuntList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (hunts.length === 0) {
    listContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 col-span-full">No tienes cacerías de fenotipos activas. Crea un nuevo ciclo y marca la opción "Phenohunt" para empezar una.</p>`;
    return;
  }

  hunts.forEach(hunt => {
    const card = document.createElement('div');
    card.className = 'card p-4 flex flex-col justify-between';
    card.dataset.id = hunt.id;

    const individualsCount = hunt.genetics ? hunt.genetics.filter(g => g.phenoId).length : 0;
    const salaName = handlers.getSalaNameById(hunt.salaId);

    card.innerHTML = `
        <div>
            <div class="flex justify-between items-start">
                <h3 class="font-bold text-lg text-amber-400">${hunt.name}</h3>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-600 text-white">PHENOHUNT</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">En sala: <strong>${salaName}</strong></p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Individuos en seguimiento: <strong class="text-amber-400 text-lg">${individualsCount}</strong></p>
        </div>
        <div class="flex justify-end gap-2 mt-4">
            <button data-action="open-phenohunt-workspace" data-id="${hunt.id}" class="btn-primary btn-base w-full font-semibold py-2 px-3 rounded-lg text-sm">
                Abrir Mesa de Trabajo
            </button>
        </div>
    `;
    
    card.querySelector('[data-action="open-phenohunt-workspace"]').addEventListener('click', (e) => {
        const huntData = hunts.find(h => h.id === e.currentTarget.dataset.id);
        if (huntData) {
            handlers.showPhenohuntWorkspace(huntData);
        }
    });

    listContainer.appendChild(card);
  });
} // <-- FIN DE LA FUNCIÓN renderPhenohuntList


//=================================================================
// FUNCIÓN 2: Dibuja una tarjeta de fenotipo (es una ayudante, no necesita 'export')
//=================================================================
function createPhenoCard(individuo, hunt) {
  const decision = individuo.decision || 'evaluacion'; 

  const isKeeper = decision === 'keeper';
  const isDiscard = decision === 'discard';

  const promoteButtonHTML = isKeeper ? `
      <button data-action="promote-keeper" data-hunt-id="${hunt.id}" data-pheno-id="${individuo.phenoId}" class="btn-primary btn-base w-full mt-2 py-2 rounded-lg text-sm font-semibold animate-pulse">
          ⭐ Promover a Genética
      </button>
  ` : '';

  return `
      <div class="card p-4 flex flex-col justify-between" data-pheno-id="${individuo.phenoId}">
          <div>
              <h4 class="font-bold text-lg text-amber-400">${individuo.name}</h4>
              
              <div class="flex justify-around items-center my-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button 
                      data-hunt-id="${hunt.id}" data-pheno-id="${individuo.phenoId}" data-decision="keeper"
                      class="pheno-decision-btn flex-1 py-2 px-2 text-sm rounded-md transition-colors ${isKeeper ? 'bg-green-500 text-white font-bold shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}">
                      Keeper ⭐
                  </button>
                  <button 
                      data-hunt-id="${hunt.id}" data-pheno-id="${individuo.phenoId}" data-decision="discard"
                      class="pheno-decision-btn flex-1 py-2 px-2 text-sm rounded-md transition-colors ${isDiscard ? 'bg-red-500 text-white font-bold shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}">
                      Descarte 🗑️
                  </button>
              </div>

              <div class="text-xs text-gray-500 dark:text-gray-400 space-y-2 mt-3 h-16">
                  <p><i>Aquí se mostrarán las notas y etiquetas...</i></p>
              </div>
          </div>

          <div class="mt-4">
              <button data-action="edit-pheno" data-hunt-id="${hunt.id}" data-pheno-id="${individuo.phenoId}" class="btn-secondary btn-base w-full py-2 rounded-lg text-sm">
                  Añadir/Ver Notas
              </button>
              ${promoteButtonHTML}
          </div>
      </div>
  `;
} // <-- FIN DE LA FUNCIÓN createPhenoCard


//=================================================================
// FUNCIÓN 3: Dibuja la Mesa de Trabajo completa
//=================================================================
export function renderPhenohuntWorkspace(hunt, handlers) {
  const view = getEl('phenohuntDetailView');
  if (!view) return;

  const individuals = hunt.genetics.filter(g => g.phenoId);

  // Se crean las tarjetas para cada planta
  const cardsHTML = individuals.map(individuo => createPhenoCard(individuo, hunt)).join('');

  // Se construye el HTML completo de la vista
  const html = `
    <header class="flex justify-between items-start mb-6" data-hunt-id="${hunt.id}">
        <div>
            <h2 class="text-3xl font-bold text-amber-400 font-mono tracking-wider">${hunt.name}</h2>
            <p class="text-gray-500 dark:text-gray-400">Mesa de Trabajo de Phenohunt</p>
        </div>
        <button id="backToToolsBtn" class="btn-secondary btn-base py-2 px-4 rounded-lg">Volver</button>
    </header>
    <main>
        <div id="pheno-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${cardsHTML}
        </div>
    </main>
  `;

  view.innerHTML = html;

  // --- LISTENERS PARA TODOS LOS BOTONES ---

  // Botón para volver a la lista de herramientas
  view.querySelector('#backToToolsBtn').addEventListener('click', handlers.hidePhenohuntWorkspace);
  
  // Botones de decisión (Keeper/Descarte)
  view.querySelectorAll('.pheno-decision-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const { huntId, phenoId, decision } = e.currentTarget.dataset;
          handlers.handleSetPhenoDecision(huntId, phenoId, decision);
      });
  });

  // Botón para editar notas y etiquetas
  view.querySelectorAll('[data-action="edit-pheno"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const phenoId = e.currentTarget.dataset.phenoId;
          const individuo = hunt.genetics.find(g => g.phenoId === phenoId);
          if (individuo) {
              handlers.openPhenoEditModal(individuo);
          }
      });
  });
    
  // ¡AQUÍ ESTÁ EL LISTENER QUE FALTABA!
  // Botón para promover un "Keeper"
  view.querySelectorAll('[data-action="promote-keeper"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const phenoId = e.currentTarget.dataset.phenoId;
          const individuo = hunt.genetics.find(g => g.phenoId === phenoId);
          if (individuo) {
              // Pasamos el individuo y su ID de genética original para heredar los datos
              handlers.openPromoteToGeneticModal(individuo, individuo.id);
          }
      });
  });
}
export function openPhenoEditModal(individuo, predefinedTags) {
        const modal = getEl('phenoEditModal');
        const title = `Evaluar: ${individuo.name}`;
        
        // Carga los datos existentes para mostrarlos en el modal
        const currentNotes = individuo.notes || '';
        const currentPredefinedTags = individuo.tags?.predefined || [];
        const currentCustomTags = individuo.tags?.custom || [];
    
        // Crea el HTML para las etiquetas predefinidas
        let tagsHTML = '';
        Object.entries(predefinedTags).forEach(([category, tags]) => {
            tagsHTML += `<div class="mb-3">
                <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">${category}</h4>
                <div class="flex flex-wrap gap-2">
                    ${tags.map(tag => `<button type="button" class="tag tag-standard ${currentPredefinedTags.includes(tag) ? 'active' : ''}">${tag}</button>`).join('')}
                </div>
            </div>`;
        });
    
        const content = `
            <div class="space-y-4">
                <div>
                    <label for="pheno-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas del Fenotipo</label>
                    <textarea id="pheno-notes" rows="4" class="w-full p-2 rounded-md">${currentNotes}</textarea>
                </div>
                <hr class="border-gray-300 dark:border-gray-600">
                <div>
                    <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Etiquetas de Evaluación</h3>
                    <div id="predefined-tags-container">${tagsHTML}</div>
                </div>
                <div>
                    <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Etiquetas Personalizadas</h3>
                    <div id="custom-tags-container" class="flex flex-wrap gap-2 mb-2">
                        ${currentCustomTags.map(tag => `<span class="tag tag-custom flex items-center gap-1">${tag}<button type="button" class="font-bold remove-custom-tag-btn">&times;</button></span>`).join('')}
                    </div>
                    <div id="add-custom-tag-container" class="flex gap-2 items-center">
                        <input type="text" id="custom-tag-input" placeholder="Escribe y presiona Enter..." class="flex-grow p-2 rounded-md" maxlength="30">
                    </div>
                </div>
            </div>
        `;
    
        // Reutiliza la función que ya tienes para crear el marco del modal
        modal.innerHTML = createModalHTML('phenoEditModalContent', title, 'phenoEditForm', content, 'Guardar Cambios', 'cancelPhenoEditBtn');
        
        modal.style.display = 'flex';
        
        // Lógica para que el modal funcione
        const form = getEl('phenoEditForm');
        form.dataset.phenoId = individuo.phenoId;
    
        getEl('predefined-tags-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag')) {
                e.target.classList.toggle('active');
            }
        });
    
        const customTagInput = getEl('custom-tag-input');
        const customTagsContainer = getEl('custom-tags-container');
    
        const addCustomTag = () => {
            const value = customTagInput.value.trim();
            if (value) {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag tag-custom flex items-center gap-1';
                tagEl.innerHTML = `${value}<button type="button" class="font-bold remove-custom-tag-btn">&times;</button>`;
                customTagsContainer.appendChild(tagEl);
                customTagInput.value = '';
            }
        };
        
        customTagInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); addCustomTag(); }});
        
        customTagsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-custom-tag-btn')) {
                e.target.parentElement.remove();
            }
        });
        
        getEl('cancelPhenoEditBtn').addEventListener('click', () => modal.style.display = 'none');
    } 
    export function openPromoteToGeneticModal(individuo, originalGenetic) {
        const modal = getEl('promoteToGeneticModal');
        const title = `Promover: ${individuo.name}`;
    
        // 1. Preparamos el nombre sugerido
        const suggestedName = `${originalGenetic.name} (${individuo.name.split('#')[1] ? 'Feno #' + individuo.name.split('#')[1].trim() : 'Selección'})`;
    
        // 2. Formateamos las notas y etiquetas para un resumen claro
        let summary = `Ficha de Selección para: ${individuo.name}\n`;
        summary += `--------------------------------------\n\n`;
        
        if (individuo.tags?.predefined?.length > 0) {
            summary += `ETIQUETAS DE EVALUACIÓN:\n`;
            summary += individuo.tags.predefined.join(', ') + '\n\n';
        }
        if (individuo.tags?.custom?.length > 0) {
            summary += `ETIQUETAS PERSONALIZADAS:\n`;
            summary += individuo.tags.custom.join(', ') + '\n\n';
        }
        if (individuo.notes) {
            summary += `NOTAS ADICIONALES:\n`;
            summary += individuo.notes;
        }
    
        const content = `
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Estás a punto de añadir este fenotipo como una nueva entrada permanente en tu Catálogo de Genéticas.</p>
            <div class="space-y-4">
                <div>
                    <label for="promote-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Nueva Genética</label>
                    <input type="text" id="promote-name" class="w-full p-2 rounded-md" value="${suggestedName}">
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="promote-bank" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banco</label>
                        <input type="text" id="promote-bank" class="w-full p-2 rounded-md" value="${originalGenetic.bank || ''}">
                    </div>
                    <div>
                        <label for="promote-parents" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parentales</label>
                        <input type="text" id="promote-parents" class="w-full p-2 rounded-md" value="${originalGenetic.parents || ''}">
                    </div>
                </div>
                <div>
                    <label for="promote-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas / Ficha de Selección</label>
                    <textarea id="promote-notes" rows="8" class="w-full p-2 rounded-md text-xs font-mono">${summary}</textarea>
                </div>
            </div>
        `;
    
        modal.innerHTML = createModalHTML('promoteToGeneticModalContent', title, 'promoteToGeneticForm', content, 'Añadir al Catálogo', 'cancelPromoteBtn');
        
        modal.style.display = 'flex';
        
        const form = getEl('promoteToGeneticForm');
        form.dataset.phenoId = individuo.phenoId;

        getEl('cancelPromoteBtn').addEventListener('click', () => modal.style.display = 'none');
    }
    export function openBulkAddModal(handlers) {
    const modal = getEl('bulkAddModal');
    
    const modalContent = `
        <div class="w-11/12 md:w-full max-w-4xl p-6 rounded-lg shadow-lg flex flex-col max-h-[90vh]">
            <h2 id="bulk-modal-title" class="text-2xl font-bold mb-4 text-amber-400">Carga Rápida - Paso 1: Nombres</h2>
            
            <div id="bulk-step-1">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Escribe o pega el nombre de cada genética en una nueva línea. Puedes diferenciar fenotipos o selecciones en el nombre.</p>
                <textarea id="bulk-names-textarea" rows="12" class="w-full p-2 rounded-md font-mono text-sm" 
                          placeholder="Zkittlez (Feno Dulce)\nGorilla Glue #4\nMoby Dick\n..."></textarea>
            </div>

            <div id="bulk-step-2" class="hidden flex-grow overflow-y-auto pr-2">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Ahora, completa los detalles y el stock para cada genética. Los campos son opcionales.</p>
                <div id="bulk-details-container" class="space-y-3"></div>
            </div>

            <div id="bulk-modal-footer" class="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-300 dark:border-gray-600">
                <button type="button" id="cancelBulkAddBtn" class="btn-secondary btn-base py-2 px-4 rounded-lg">Cancelar</button>
                <button type="button" id="bulk-step-1-next" class="btn-primary btn-base py-2 px-4 rounded-lg">Siguiente: Añadir Detalles</button>
                <button type="button" id="bulk-step-2-back" class="btn-secondary btn-base py-2 px-4 rounded-lg hidden">Atrás</button>
                <button type="button" id="bulk-step-2-save" class="btn-primary btn-base py-2 px-4 rounded-lg hidden">Guardar Todo</button>
            </div>
        </div>
    `;

    modal.innerHTML = modalContent;
    modal.style.display = 'flex';

    getEl('cancelBulkAddBtn').addEventListener('click', () => modal.style.display = 'none');
    getEl('bulk-step-1-next').addEventListener('click', handlers.handleBulkStep1Next);
    getEl('bulk-step-2-back').addEventListener('click', handlers.handleBulkStep2Back);
    getEl('bulk-step-2-save').addEventListener('click', handlers.handleBulkSaveAll);
}
export function renderBulkStep2(names) {
    const container = getEl('bulk-details-container');
    container.innerHTML = ''; 

    container.innerHTML += `
        <div class="hidden md:grid grid-cols-12 gap-x-2 text-xs font-bold text-gray-500 dark:text-gray-400 px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div class="col-span-3">Genética</div>
            <div class="col-span-1 text-center">Clones</div>
            <div class="col-span-1 text-center">Semillas</div>
            <div class="col-span-2">Banco</div>
            <div class="col-span-3">Parentales</div>
            <div class="col-span-2">Origen</div>
        </div>
    `;
    
    names.forEach((name, index) => {
        const row = document.createElement('div');
        row.className = 'bulk-details-row p-2 rounded-md grid grid-cols-2 md:grid-cols-12 gap-x-2 gap-y-2 hover:bg-gray-50 dark:hover:bg-gray-800 items-center';
        row.dataset.index = index;
        
        row.innerHTML = `
            <input type="text" value="${name}" class="p-1 rounded-md col-span-2 md:col-span-3 bulk-input-name" placeholder="Nombre Genética">
            <input type="number" min="0" class="p-1 rounded-md md:col-span-1 bulk-input-clones text-center" placeholder="0">
            <input type="number" min="0" class="p-1 rounded-md md:col-span-1 bulk-input-seeds text-center" placeholder="0">
            <input type="text" class="p-1 rounded-md col-span-2 md:col-span-2 bulk-input-bank" placeholder="Banco (si son semillas)">
            <input type="text" class="p-1 rounded-md col-span-2 md:col-span-3 bulk-input-parents" placeholder="Parentales">
            <input type="text" class="p-1 rounded-md col-span-2 md:col-span-2 bulk-input-owner" placeholder="Origen/Dueño (si es clon)">
        `;
        container.appendChild(row);
    });

    getEl('bulk-modal-title').textContent = 'Carga Rápida - Paso 2: Detalles y Stock';
    getEl('bulk-step-1').classList.add('hidden');
    getEl('bulk-step-2').classList.remove('hidden');
    getEl('bulk-step-1-next').classList.add('hidden');
    getEl('bulk-step-2-back').classList.remove('hidden');
    getEl('bulk-step-2-save').classList.remove('hidden');
}
export function openSetupWizardModal(handlers) {
    const modal = getEl('setupWizardModal');
    
    const modalContent = `
        <div class="w-11/12 md:w-full max-w-4xl p-6 rounded-lg shadow-lg flex flex-col max-h-[90vh]">
            <h2 id="wizard-modal-title" class="text-2xl font-bold mb-4 text-amber-400">Configuración Rápida - Paso 1: Salas</h2>
            
            <div id="wizard-step-1">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Introduce los nombres de tus salas de cultivo (ej: Carpa 1x1, Indoor Vege, Balcón), una por línea.</p>
                <textarea id="wizard-salas-textarea" rows="8" class="w-full p-2 rounded-md font-mono text-sm" placeholder="Carpa 1x1\nIndoor Vege\n..."></textarea>
            </div>

            <div id="wizard-step-2" class="hidden flex-grow overflow-y-auto pr-2">
                <div class="flex justify-between items-center mb-3">
                    <p class="text-sm text-gray-500 dark:text-gray-400">Define los ciclos activos. Puedes añadir más filas según necesites.</p>
                    <button type="button" id="wizard-add-ciclo-row" class="btn-secondary btn-base text-sm py-1 px-3 rounded-md">+ Añadir Ciclo</button>
                </div>
                <div id="wizard-ciclos-container" class="space-y-2"></div>
            </div>

            <div class="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-300 dark:border-gray-600">
                <button type="button" id="cancelWizardBtn" class="btn-secondary btn-base py-2 px-4 rounded-lg">Cancelar</button>
                <button type="button" id="wizard-step-1-next" class="btn-primary btn-base py-2 px-4 rounded-lg">Siguiente: Crear Ciclos</button>
                <button type="button" id="wizard-step-2-save" class="btn-primary btn-base py-2 px-4 rounded-lg hidden">Guardar y Finalizar</button>
            </div>
        </div>
    `;

    modal.innerHTML = modalContent;
    modal.style.display = 'flex';

    getEl('cancelWizardBtn').addEventListener('click', () => modal.style.display = 'none');
    getEl('wizard-step-1-next').addEventListener('click', handlers.handleWizardStep1Next);
    getEl('wizard-step-2-save').addEventListener('click', handlers.handleWizardSaveAll);
    getEl('wizard-add-ciclo-row').addEventListener('click', () => renderWizardCicloRow(null, handlers.getAllSalas()));
}

export function renderWizardCicloRow(ciclo = {}, allSalas = []) {
    const container = getEl('wizard-ciclos-container');
    const row = document.createElement('div');
    row.className = 'wizard-ciclo-row p-2 rounded-md grid grid-cols-12 gap-2 bg-gray-50 dark:bg-gray-800';

    const salaOptions = allSalas.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];

    row.innerHTML = `
        <input type="text" class="p-1 rounded-md col-span-12 md:col-span-4 wizard-ciclo-name" placeholder="Nombre del Ciclo">
        <select class="p-1 rounded-md col-span-6 md:col-span-3 wizard-ciclo-sala">${salaOptions}</select>
        <select class="p-1 rounded-md col-span-6 md:col-span-2 wizard-ciclo-phase">
            <option value="Vegetativo">Vegetativo</option>
            <option value="Floración">Floración</option>
        </select>
        <input type="date" value="${today}" class="p-1 rounded-md col-span-10 md:col-span-2 wizard-ciclo-date">
        <button type="button" class="col-span-2 md:col-span-1 btn-danger btn-base flex items-center justify-center rounded-md" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(row);
}
export function renderDashboard(stats, recentActivity, curingJars) {
    const appContainer = getEl('app');
    if (!appContainer) return;

    appContainer.innerHTML = ''; // Limpiamos la vista anterior

    // --- INICIO DE FUNCIONES AUXILIARES DENTRO DE RENDER ---
    const getTimeElapsed = (startDate) => {
        if (!startDate) return 'Fecha inválida';
        const start = startDate.toDate();
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) return '1 día';
        if (diffDays < 30) return `${diffDays} días`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} mes(es)`;
        return `${Math.floor(diffDays / 365)} año(s)`;
    };

    const getCuringStageOpacities = (startDate) => {
        if (!startDate) return { initial: 'opacity-40', optimal: 'opacity-40', extended: 'opacity-40' };
        const start = startDate.toDate();
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 21) { // Hasta 3 semanas
            return { initial: 'opacity-100', optimal: 'opacity-40', extended: 'opacity-40' };
        } else if (diffDays <= 60) { // De 3 semanas a 2 meses
            return { initial: 'opacity-40', optimal: 'opacity-100', extended: 'opacity-40' };
        } else { // Más de 2 meses
            return { initial: 'opacity-40', optimal: 'opacity-40', extended: 'opacity-100' };
        }
    };

    const curingJarsHTML = curingJars.length > 0
        ? curingJars.map(jar => {
            const opacities = getCuringStageOpacities(jar.fechaInicioCurado);
            const geneticsNames = jar.snapshot_genetics.map(g => g.phenoName || g.name).join(', ');
            return `
            <div>
                <div class="flex justify-between items-center text-sm mb-2">
                    <span class="font-semibold truncate" title="${geneticsNames}">${jar.name}</span>
                    <span class="font-mono font-semibold text-amber-400">${getTimeElapsed(jar.fechaInicioCurado)}</span>
                </div>
                <div class="flex w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <div class="cure-bar-segment w-1/3 bg-amber-400 ${opacities.initial}" title="Etapa Inicial (< 3 sem)"></div>
                    <div class="cure-bar-segment w-1/3 bg-emerald-400 ${opacities.optimal}" title="Etapa Óptima (3 sem - 2 meses)"></div>
                    <div class="cure-bar-segment w-1/3 bg-violet-400 ${opacities.extended}" title="Etapa Extendida (> 2 meses)"></div>
                </div>
            </div>
            `;
        }).join('')
        : `<p class="text-center text-sm text-gray-400 dark:text-gray-500 py-4">No hay frascos en curado.</p>`;
    // --- FIN DE FUNCIONES AUXILIARES ---

    const dashboardHTML = `
        <div class="max-w-7xl mx-auto">
            {...} // Mantenemos todo el HTML del header sin cambios
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {...} // Mantenemos el Widget "Mi Cultivo" sin cambios

                <div class="widget p-6">
                    <h2 class="text-xl font-bold text-amber-400 mb-4">Mis Frascos en Curado</h2>
                    <div class="space-y-5">
                        ${curingJarsHTML}
                    </div>
                    ${curingJars.length > 0 ? `<a href="#" id="navigateToCuringJars" class="block text-center text-amber-400 text-sm font-semibold pt-4 hover:underline">Ver todos...</a>` : ''}
                </div>

                {...} // Mantenemos el Widget "Comunidad" con su mensaje de "Próximamente"
            </div>
        </div>
    `;
    
    appContainer.innerHTML = dashboardHTML;

    // Listener para el nuevo enlace "Ver todos..."
    const navigateToCuringJars = getEl('navigateToCuringJars');
    if (navigateToCuringJars) {
        navigateToCuringJars.addEventListener('click', (e) => {
            e.preventDefault();
            // Lógica para navegar a la herramienta y abrir la pestaña correcta
            handlers.showToolsView();
            setTimeout(() => handlers.switchToolsTab('curingJars'), 50);
        });
    }
}
export function renderCuringJarsList(curingCiclos, handlers) {
    const listContainer = getEl('curingJarsList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (curingCiclos.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 col-span-full">No tenés ninguna cosecha en proceso de curado.</p>`;
        return;
    }

    const getTimeElapsed = (startDate) => {
        if (!startDate) return 'Fecha inválida';
        const start = startDate.toDate();
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) return '1 día';
        if (diffDays < 7) return `${diffDays} días`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} semana(s)`;
        return `${Math.floor(diffDays / 30)} mes(es)`;
    };

    curingCiclos.forEach(ciclo => {
        const card = document.createElement('div');
        card.className = 'card p-4 flex flex-col justify-between';
        const geneticsNames = ciclo.snapshot_genetics.map(g => g.phenoName || g.name).join(', ');

        card.innerHTML = `
            <div>
                <h3 class="font-bold text-lg text-amber-400">${ciclo.name}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate" title="${geneticsNames}">${geneticsNames}</p>
                <div class="flex justify-between items-baseline mt-3 font-mono">
                    <span class="text-2xl font-bold text-gray-700 dark:text-gray-200">${ciclo.pesoSeco || 0}g</span>
                    <span class="text-sm text-amber-400">en curado hace ${getTimeElapsed(ciclo.fechaInicioCurado)}</span>
                </div>
            </div>
            <div class="mt-4">
                {/* ▼▼▼ TEXTO DEL BOTÓN ACTUALIZADO ▼▼▼ */}
                <button data-id="${ciclo.id}" class="btn-primary btn-base w-full font-semibold py-2 px-3 rounded-lg text-sm finish-curing-btn">
                    Dar por Finalizado
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });

    listContainer.querySelectorAll('.finish-curing-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cicloId = e.currentTarget.dataset.id;
            const cicloName = curingCiclos.find(c => c.id === cicloId)?.name;
            handlers.handleFinishCuring(cicloId, cicloName);
        });
    });
}