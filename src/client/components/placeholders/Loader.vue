<script setup lang="ts">
import {hexToRgb} from "../../../common/utils/colors";

const props               = defineProps<{
	primaryColor?: string,
}>();
const defaultPrimaryColor = "#b3deff";

const values = computed(() => {
	const primaryColor            = props.primaryColor ?? defaultPrimaryColor;
	const {r: pr, g: pg, b: pb}   = (hexToRgb(primaryColor) ?? hexToRgb(defaultPrimaryColor))!;
	const primaryColorTranslucent = `rgba(${pr},${pg},${pb},0.2)`;
	console.log({pr, pg, pb, primaryColorTranslucent, primaryColor});
	return {primaryColor, primaryColorTranslucent};
});
</script>

<style scoped lang="css">
.loader {
	--primary-color: v-bind('values.primaryColor');
	--primary-color-translucent: v-bind('values.primaryColorTranslucent');

	width: 16px;
	height: 16px;
	box-shadow: 0 30px, 0 -30px;
	border-radius: 4px;
	background: currentColor;
	display: block;
	margin: -50px auto 0;
	position: relative;
	color: var(--primary-color);
	transform: translateY(30px);
	box-sizing: border-box;
	animation: animloader 2s ease infinite;
}

.loader::after,
.loader::before {
	content: '';
	box-sizing: border-box;
	width: 16px;
	height: 16px;
	box-shadow: 0 30px, 0 -30px;
	border-radius: 4px;
	background: currentColor;
	color: var(--primary-color);
	position: absolute;
	left: 30px;
	top: 0;
	animation: animloader 2s 0.2s ease infinite;
}

.loader::before {
	animation-delay: 0.4s;
	left: 60px;
}

@keyframes animloader {
	0% {
		top: 0;
		color: var(--primary-color);
	}
	50% {
		top: 30px;
		color: var(--primary-color-translucent);
	}
	100% {
		top: 0;
		color: var(--primary-color);
	}
}
</style>

<template>
<div class="loader"></div>
</template>
