<script setup lang="ts">
import {computed} from "#imports";
import {hexToRgb} from "../../../common/utils/colors";

const props                 = defineProps<{
	primaryColor?: string,
	secondaryColor?: string,
}>();
const defaultPrimaryColor   = "#BBDEFB";
const defaultSecondaryColor = "#ff3c00";

const values = computed(() => {
	const primaryColor              = props.primaryColor ?? defaultPrimaryColor;
	const secondaryColor            = props.secondaryColor ?? defaultSecondaryColor;
	//const {r: pr, g: pg, b: pb} = (hexToRgb(primaryColor) ?? hexToRgb(defaultPrimaryColor))!;
	const {r: sr, g: sg, b: sb}     = (hexToRgb(secondaryColor) ?? hexToRgb(defaultSecondaryColor))!;
	const secondaryColorTranslucent = `rgba(${sr}, ${sg}, ${sb}, 0.25)`;
	return {primaryColor, secondaryColor, secondaryColorTranslucent};
});
</script>

<style scoped lang="css">
.loader {
	--primary-color: v-bind('values.primaryColor');
	--secondary-color: v-bind('values.secondaryColor');
	--secondary-color-translucent: v-bind('values.secondaryColorTranslucent');

	width: 100px;
	height: 75px;
	margin: 0 auto;
	background: var(--primary-color);
	position: relative;
	border-radius: 100%;
}

.loader:before {
	content: '';
	position: absolute;
	box-sizing: border-box;
	border: 15px solid transparent;
	border-top: 25px solid var(--primary-color);
	transform: rotate(45deg);
	top: 50px;
	left: -15px;
}

.loader:after {
	content: '';
	width: 12px;
	height: 12px;
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	border-radius: 50%;
	background-color: var(--secondary-color);
	box-shadow: 20px 0 var(--secondary-color), -20px 0 var(--secondary-color);
	animation: flash 0.5s ease-out infinite alternate;
}

@keyframes flash {
	0% {
		background-color: var(--secondary-color-translucent);
		box-shadow: 20px 0 var(--secondary-color-translucent), -20px 0 var(--secondary-color);
	}
	50% {
		background-color: var(--secondary-color);
		box-shadow: 20px 0 var(--secondary-color-translucent), -20px 0 var(--secondary-color-translucent);
	}
	100% {
		background-color: var(--secondary-color-translucent);
		box-shadow: 20px 0 var(--secondary-color), -20px 0 var(--secondary-color-translucent)
	}
}
</style>

<template>
<div class="loader"></div>
</template>
