// js/onboarding.js

/**
 * Configura e inicializa el tour principal de bienvenida para nuevos usuarios.
 */
export function startMainTour() {
    if (localStorage.getItem('onboarding_main_complete')) {
        return; 
    }

    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'shepherd-theme-dark', 
            scrollTo: { behavior: 'smooth', block: 'center' },
            cancelIcon: {
                enabled: true
            },
            buttons: [
                {
                    action() { return this.back(); },
                    classes: 'shepherd-button-secondary',
                    text: 'Atrás',
                },
                {
                    action() { return this.next(); },
                    text: 'Siguiente',
                },
            ],
        },
    });

    tour.addStep({
        id: 'step-1-welcome',
        title: '¡Hola! Bienvenido a SegCul',
        text: 'Vamos a dar un recorrido rápido para mostrarte las funciones clave y que puedas empezar a usar la app.',
        attachTo: { element: '#app header h1', on: 'bottom' },
        buttons: [{ action() { return this.next(); }, text: 'Comenzar' }],
    });

    tour.addStep({
        id: 'step-2-menu',
        title: 'Menú de Acciones',
        text: 'Este es el menú principal. Usalo para desplegar las acciones más importantes, como añadir salas, ciclos o acceder a las herramientas.',
        attachTo: { element: '#menuBtn', on: 'bottom' },
        beforeShowPromise: function() {
            return new Promise(function(resolve) {
                document.getElementById('dropdownMenu').classList.add('hidden');
                resolve();
            });
        },
    });
    
    tour.addStep({
        id: 'step-3-setup-wizard',
        title: 'La Forma Rápida de Empezar',
        text: 'Para empezar, te recomendamos usar esta opción. La <strong>Configuración Rápida</strong> es la forma más directa de cargar todas tus salas y ciclos actuales de una sola vez.',
        attachTo: { element: '#menuSetupWizard', on: 'bottom' },
        beforeShowPromise: function() {
            return new Promise(function(resolve) {
                document.getElementById('dropdownMenu').classList.remove('hidden');
                resolve();
            });
        },
    });

    tour.addStep({
        id: 'step-4-end',
        title: '¡Excelente! Todo Listo',
        text: 'Con esto ya tenés lo necesario para comenzar. Más adelante, explorá las <strong>Herramientas</strong> para gestionar tu inventario de genéticas. ¡Muchos éxitos en tu cultivo!',
        attachTo: { element: '#menuTools', on: 'bottom' },
        buttons: [
            { action() { return this.back(); }, classes: 'shepherd-button-secondary', text: 'Atrás' },
            { action() { return this.complete(); }, text: 'Finalizar Tour' },
        ],
    });

    const markTourAsComplete = () => {
        localStorage.setItem('onboarding_main_complete', 'true');
        const dropdown = document.getElementById('dropdownMenu');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    };
    tour.on('complete', markTourAsComplete);
    tour.on('cancel', markTourAsComplete);

    const mainPanel = document.querySelector('#app header h1');
    if (mainPanel) {
        tour.start();
    }
}


// ======================================================
// TOUR PARA LA PANTALLA DE HERRAMIENTAS (VERSIÓN CORTA)
// ======================================================

/**
 * Configura e inicializa el tour para la sección de Herramientas.
 */
export function startToolsTour() {
    if (localStorage.getItem('onboarding_tools_complete')) {
        return;
    }

    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'shepherd-theme-dark',
            scrollTo: { behavior: 'smooth', block: 'center' },
            cancelIcon: {
                enabled: true
            },
            buttons: [
                {
                    action() { return this.back(); },
                    classes: 'shepherd-button-secondary',
                    text: 'Atrás',
                },
                {
                    action() { return this.next(); },
                    text: 'Siguiente',
                },
            ],
        },
    });

    tour.addStep({
        id: 'tools-step-1-tabs',
        title: 'Tu Centro de Inventario',
        text: 'Esta sección centraliza toda tu información clave. Usá las pestañas para navegar entre tu <strong>Catálogo de Genéticas</strong>, el <strong>Stock</strong> disponible y el resto de las herramientas.',
        attachTo: { element: 'nav[aria-label="Tabs"]', on: 'bottom' },
        buttons: [{ action() { return this.next(); }, text: 'Entendido' }],
    });

    tour.addStep({
        id: 'tools-step-2-add-buttons',
        title: 'Dos Formas de Añadir Items',
        text: 'Para sumar genéticas a tu catálogo, usá <strong>"+ Añadir al Catálogo"</strong> para un solo item, o la <strong>"Carga Rápida"</strong> si necesitás registrar varios de una vez.',
        attachTo: { element: '#add-bulk-btn', on: 'bottom' },
    });

    tour.addStep({
        id: 'tools-step-3-search-view',
        title: 'Buscá y Visualizá a tu Gusto',
        text: 'Usá el <strong>buscador</strong> para filtrar al instante. También podés cambiar entre la <strong>vista de tarjetas o de lista</strong> y <strong>exportar</strong> tus datos a un archivo CSV.',
        attachTo: { element: '#searchTools', on: 'bottom' },
    });

    tour.addStep({
        id: 'tools-step-4-drag',
        title: 'Organizá por Arrastre',
        text: 'Un dato útil: en las vistas de inventario, podés <strong>arrastrar y soltar</strong> las tarjetas o elementos de la lista para ordenarlos según tu criterio. El orden se guarda solo.',
        attachTo: { element: '#geneticsList', on: 'top' },
        // Se ajustan los botones para que este sea el último paso.
        buttons: [
            { action() { return this.back(); }, classes: 'shepherd-button-secondary', text: 'Atrás' },
            { action() { return this.complete(); }, text: '¡Entendido!' },
        ],
    });


    const markTourAsComplete = () => {
        localStorage.setItem('onboarding_tools_complete', 'true');
    };
    tour.on('complete', markTourAsComplete);
    tour.on('cancel', markTourAsComplete);

    if (document.querySelector('nav[aria-label="Tabs"]')) {
        tour.start();
    }
}