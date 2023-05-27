import {defineNuxtPlugin} from "#app";
import {library} from '@fortawesome/fontawesome-svg-core'
import {faSquare as farSquare} from "@fortawesome/free-regular-svg-icons";
import {
	faArrowRotateLeft,
	faBars,
	faBriefcase,
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
	faCircle,
	faClose,
	faDownload,
	faFile,
	faFileArchive,
	faFileAudio,
	faFileCode,
	faFileExcel,
	faFileImage,
	faFilePdf,
	faFilePowerpoint,
	faFileText,
	faFileVideo,
	faFileWord,
	faGavel,
	faHome,
	faIdBadge,
	faImagePortrait,
	faInfo,
	faInfoCircle,
	faPaperclip,
	faPaperPlane,
	faPlus,
	faQuestion,
	faRefresh,
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
	faUpload,
	faUser,
	faUserPlus,
	faUserTie,
	faXmark
} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
//@ts-ignore
import {VueMasonryPlugin} from 'vue-masonry';
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
	faCircle,
	faQuestion,
	faBriefcase,
	faPaperPlane,
	faPaperclip,
	faFile,
	faFileImage,
	faFileAudio,
	faFileVideo,
	faFilePdf,
	faFileWord,
	faFileExcel,
	faFilePowerpoint,
	faFileText,
	faFileCode,
	faFileArchive,
	faDownload,
	faPlus,
	faUpload,
	faRefresh,
	faArrowRotateLeft,
	faIdBadge,
	faInfo,
	faInfoCircle
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
	nuxtApp.vueApp.use(VueMasonryPlugin);
})
