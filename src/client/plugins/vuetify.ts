import {defineNuxtPlugin} from "#app";
import {library} from '@fortawesome/fontawesome-svg-core'
import {faSquare as farSquare} from "@fortawesome/free-regular-svg-icons";
import {
	faBars,
	faBugSlash,
	faCertificate,
	faCheckSquare,
	faChevronDown,
	faChevronLeft,
	faChevronUp,
	faGavel,
	faHome,
	faImagePortrait,
	faSearch,
	faSignIn,
	faSignOut,
	faSquare,
	faTable,
	faTimesCircle,
	faUser,
	faUserPlus,
	faUserTie
} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import {createVuetify} from 'vuetify'
import {aliases, fa} from 'vuetify/iconsets/fa-svg'

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
	faBugSlash
);
// import * as components from 'vuetify/components'
// import * as directives from 'vuetify/directives'

export default defineNuxtPlugin(nuxtApp => {
	nuxtApp.vueApp.component("font-awesome-icon", FontAwesomeIcon);

	const vuetify = createVuetify({
		ssr:   false,
		icons: {
			defaultSet: 'fa',
			aliases,
			sets:       {
				fa,
			},
		}
	})

	nuxtApp.vueApp.use(vuetify)
})
