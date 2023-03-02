import {defineNuxtPlugin} from "#app";
import {library} from '@fortawesome/fontawesome-svg-core'
import {faSquare as farSquare} from "@fortawesome/free-regular-svg-icons";
import {
	faBars,
	faBugSlash,
	faCalendarDays,
	faCaretDown,
	faCertificate,
	faCheck,
	faCheckSquare,
	faChevronDown,
	faChevronLeft,
	faChevronRight,
	faChevronUp,
	faClose,
	faGavel,
	faHome,
	faImagePortrait,
	faQuestion,
	faSearch,
	faSignIn,
	faSignOut,
	faSortDown,
	faSortUp,
	faSquare,
	faStepBackward,
	faStepForward,
	faTable,
	faTimesCircle,
	faUser,
	faUserPlus,
	faUserTie,
	faXmark
} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import {createVuetify} from 'vuetify'
import {aliases, fa} from 'vuetify/iconsets/fa-svg'
import {
	VDataTable,
	VDataTableFooter,
	VDataTableRow,
	VDataTableRows,
	VDataTableServer,
	VDataTableVirtual
} from 'vuetify/labs/VDataTable'

library.add(
	faGavel,
	faHome,
	faSearch,
	faUserPlus,
	faSignIn,
	faChevronLeft,
	faChevronDown,
	faChevronUp,
	faBars,
	faImagePortrait,
	faTimesCircle,
	faCertificate,
	faSquare,
	faCheckSquare,
	farSquare,
	faSignOut,
	faTable,
	faUserTie,
	faUser,
	faBugSlash,
	faCalendarDays,
	faSortUp,
	faSortDown,
	faCaretDown,
	faStepBackward,
	faChevronRight,
	faStepForward,
	faCheck,
	faClose,
	faXmark,
	faQuestion
);
// import * as components from 'vuetify/components'
// import * as directives from 'vuetify/directives'

export default defineNuxtPlugin(nuxtApp => {
	nuxtApp.vueApp.component("font-awesome-icon", FontAwesomeIcon);

	const vuetify = createVuetify({
		ssr:        false,
		components: {
			VDataTable, VDataTableFooter, VDataTableRow, VDataTableServer, VDataTableVirtual, VDataTableRows
		},
		defaults:   {
			VDataTable: {
				fixedHeader: true,
				noDataText:  'Results not found',
			},
		},
		icons:      {
			defaultSet: 'fa',
			aliases,
			sets:       {
				fa,
			},
		}
	})

	nuxtApp.vueApp.use(vuetify)
})
