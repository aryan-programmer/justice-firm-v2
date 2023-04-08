import {checker} from 'vite-plugin-checker';
import vuetify from 'vite-plugin-vuetify';

// https://nuxt.com/docs/api/configuration/nuxt-config
// @ts-ignore
export default defineNuxtConfig({
// @ts-ignore
	srcDir:  "./src/client",
	nitro:   {
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
	vite:    {
		ssr:     {
			noExternal: ['vuetify'],
		},
		css:     {
			preprocessorOptions: {
				scss: {
					additionalData: `@use './src/client/styles/settings.scss' as *;`,
				},
			},
		},
		plugins: [
			checker({
				vueTsc: true,
			}),
		]
	},
	css:     ["~/styles/main.scss"],
	build:   {
		transpile:   ['vuetify'],
	},
	ssr:     false,
})
