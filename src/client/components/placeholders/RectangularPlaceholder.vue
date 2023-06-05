<script setup lang="ts">
import {computed, contentLoaderSpeed} from "#imports";
import {ContentLoader} from "vue-content-loader";
import {contentLoaderPrimaryColor, contentLoaderSecondaryColor} from "../../utils/constants";

const props = defineProps<{
	width?: number,
	height?: number,
	class?: string,
	roundingX?: number,
	roundingY?: number,
	autoScale?: boolean,
	primaryColor?: string,
	secondaryColor?: string,
}>();

const width     = computed(() => props.width ?? 300);
const height    = computed(() => props.height ?? 200);
const roundingX = computed(() => props.roundingX ?? 0);
const roundingY = computed(() => props.roundingY ?? 0);
</script>

<template>
<ContentLoader
	:width="props.autoScale===true?undefined: width"
	:viewBox="`0 0 ${width} ${height}`"
	:speed="contentLoaderSpeed"
	:primaryColor="props.primaryColor??contentLoaderPrimaryColor"
	:secondaryColor="props.secondaryColor??contentLoaderSecondaryColor"
	:class="props.class"
>
	<rect x="0" y="0" :rx="roundingX" :ry="roundingY" :width="width" :height="height" />
</ContentLoader>
</template>
