/**
 * Mapeamento menu inferior (index.html → módulo Início)
 *
 * | data-screen   | Legado (showScreen)     | Rota React              | View              |
 * |---------------|-------------------------|-------------------------|-------------------|
 * | inicio        | #inicio                 | /inicio                 | VistaGeralView    |
 * | perfil        | #perfil                 | /inicio/perfil          | PerfilView        |
 * | eventos       | #eventos (injetado JS)  | /inicio/eventos         | EventosView       |
 * | agenda        | #agenda                 | /inicio/agenda          | AgendaView        |
 * | corpo         | #corpo                  | /inicio/corpo           | CorpoView         |
 * | timeline      | #timeline               | /inicio/linha           | LinhaView         |
 * | medicamentos  | #medicamentos           | /inicio/meds            | MedsView          |
 * | documentos    | #documentos             | /inicio/docs            | DocsView          |
 *
 * Comportamento legado: showScreen(id) troca .screen.active e marca .nav-active
 * no bottom-nav — sem modais.
 */

export const BOTTOM_NAV_ITEMS = [
  { id: 'inicio', label: 'Início', icon: 'home', path: '/inicio', end: true },
  { id: 'perfil', label: 'Perfil', icon: 'circle-user', path: '/inicio/perfil' },
  { id: 'eventos', label: 'Eventos', icon: 'plus', path: '/inicio/eventos' },
  { id: 'agenda', label: 'Agenda', icon: 'agenda-square', path: '/inicio/agenda' },
  { id: 'corpo', label: 'Corpo', icon: 'target', path: '/inicio/corpo' },
  { id: 'timeline', label: 'Linha', icon: 'arrow-up-right', path: '/inicio/linha' },
  { id: 'medicamentos', label: 'Meds', icon: 'sparkle', path: '/inicio/meds' },
  { id: 'documentos', label: 'Docs', icon: 'file-list', path: '/inicio/docs' },
];
