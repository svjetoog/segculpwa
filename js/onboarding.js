// js/onboarding.js

/**
 * Configura e inicializa el tour principal de bienvenida para el nuevo dashboard.
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
        id: 'dash-step-1-welcome',
        title: '¡Hola! Bienvenido a tu Panel',
        text: 'Este es tu nuevo centro de control. Aquí tendrás un resumen visual del estado de todo tu cultivo de un solo vistazo.',
        attachTo: { element: '#app header h1', on: 'bottom' },
        buttons: [{ action() { return this.next(); }, text: 'Comenzar' }],
    });

    tour.addStep({
        id: 'dash-step-2-widget',
        title: 'Tu Cultivo en Números',
        text: 'Este widget te muestra las estadísticas clave, como ciclos activos y stock, además de la actividad más reciente que hayas registrado.',
        attachTo: { element: '.widget:first-of-type', on: 'bottom' },
    });
    
    tour.addStep({
        id: 'dash-step-3-action',
        title: 'Tu Primer Paso: Cargar Datos',
        text: 'Ahora que ya conocés el panel, el siguiente paso es cargar tu cultivo. Para eso, abrí el <strong>menú</strong> y seleccioná <strong>"Configuración Rápida"</strong>.',
        attachTo: { element: '#menuBtn', on: 'bottom' },
        buttons: [
            { action() { return this.back(); }, classes: 'shepherd-button-secondary', text: 'Atrás' },
            { 
              action() {
                document.getElementById('menuBtn').click(); // Abre el menú para el usuario
                this.complete();
              }, 
              text: '¡Entendido!' 
            },
        ],
    });

    const markTourAsComplete = () => {
        localStorage.setItem('onboarding_main_complete', 'true');
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