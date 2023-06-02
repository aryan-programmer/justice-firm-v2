import {defineComponent, h} from "#imports";

export const CssStyle = defineComponent({
	name: "css-style",
	render () {
		return h("style", this.$slots.default?.());
	},
});
