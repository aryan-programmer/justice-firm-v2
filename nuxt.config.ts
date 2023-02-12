import vuetify from 'vite-plugin-vuetify';
// https://nuxt.com/docs/api/configuration/nuxt-config
// @ts-ignore
export default defineNuxtConfig({
	srcDir: "./src/client",
	nitro: {
		preset: "netlify"
	},
	modules: [
		'@pinia/nuxt',
		'@vueuse/nuxt',
		async (options, nuxt) => {
			nuxt.hooks.hook('vite:extendConfig', config => {
				config.plugins?.push(
					vuetify({
						styles: {configFile: "./styles/settings.scss"}
					})
				)
			})
		}
	],
	css: ["~/styles/main.scss"],
	build: {
		transpile: ['vuetify'],
	},
	ssr: false,
})
