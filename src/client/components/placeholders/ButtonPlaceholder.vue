<script setup lang="ts">
import {computed, contentLoaderSpeed} from "#imports";
import {ContentLoader} from "vue-content-loader";
import {contentLoaderPrimaryColor, contentLoaderSecondaryColor} from "../../utils/constants";

const props = defineProps<{
	width?: number,
	height?: number;
	class?: string,
	roundingX?: number,
	roundingY?: number,
}>();

const width     = computed(() => props.width ?? 150);
const height    = computed(() => props.height ?? 24);
const roundingX = computed(() => props.roundingX ?? height.value / 2);
const roundingY = computed(() => props.roundingY ?? height.value / 2);

</script>

<template>
<ContentLoader
	:class="`v-btn-ish ${props.class??''}`"
	:width="width"
	:viewBox="`0 0 ${width} ${height}`"
	:speed="contentLoaderSpeed"
	:primaryColor="contentLoaderPrimaryColor"
	:secondaryColor="contentLoaderSecondaryColor"
>
	<rect
		x="0"
		y="0"
		:width="width"
		:rx="roundingX"
		:ry="roundingY"
		:height="height" />
</ContentLoader>
</template>
