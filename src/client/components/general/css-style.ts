import {defineComponent, h} from "#imports";

export const CssStyle = defineComponent({
	name: "css-style",
	render () {
		console.log(this.$slots);
		return h("style", this.$slots.default?.());
	},
})
