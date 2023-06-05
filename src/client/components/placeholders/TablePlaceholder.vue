<script setup lang="ts">
import {computed, contentLoaderSpeed} from "#imports";
import {ContentLoader} from "vue-content-loader";
import {useDisplay} from "vuetify";

const props = defineProps<{
	class?: string,
	roundingX?: number,
	roundingY?: number,
	columnWidths: number[],
	numRows: number
}>();

const display     = useDisplay();
const width       = display.width;
const headerWidth = 50;
const lineWidth   = 2;
const textHeight  = 20;
const padding     = 14;
const paddingD2   = padding / 2;
const rowHeight   = textHeight + padding + lineWidth;
const rhd3        = rowHeight / 3;
const rhd3t2      = rhd3 * 2;
const height      = computed(() => (props.numRows + 1) * rowHeight + padding);

const scaledColumnWidths                    = computed(() => {
	const sum = props.columnWidths.reduce((a, b) => a + b, 0);
	return props.columnWidths.map((v) => v / sum * width.value);
});
const scaledColumnWidthsPartialSums         = computed(() => {
	const arr           = scaledColumnWidths.value;
	const res: number[] = [];
	let v               = 0;
	for (const item of arr) {
		res.push(v);
		v += item;
	}
	return res;
});
const scaledColumnWidthsPartialSumsWithNext = computed(() => {
	const arr                     = scaledColumnWidths.value;
	const res: [number, number][] = [];
	let v                         = 0;
	let n                         = 0;
	for (const item of arr) {
		n += item;
		res.push([v, item]);
		v += item;
	}
	return res;
});
const roundingX                             = computed(() => props.roundingX ?? 0);
const roundingY                             = computed(() => props.roundingY ?? 0);

</script>

<template>
<ContentLoader
	:viewBox="`0 0 ${width} ${height}`"
	:speed="contentLoaderSpeed"
	secondaryColor="#dadada"
	primaryColor="#fafafa"
	:class="props.class"
>
	<!-- Header row -->
	<rect x="0" y="0" rx="0" ry="0" :width="width" :height="paddingD2" />
	<rect
		v-for="scw in scaledColumnWidthsPartialSumsWithNext"
		:x="scw[0]"
		:y="paddingD2"
		rx="0"
		ry="0"
		:width="padding"
		:height="rowHeight-padding"
	/>
	<rect
		:x="width-padding"
		:y="paddingD2"
		rx="0"
		ry="0"
		:width="padding"
		:height="rowHeight-padding"
	/>
	<rect x="0" :y="rowHeight-paddingD2" rx="0" ry="0" :width="width" :height="paddingD2" />
	<!-- Borders -->
	<rect x="0" :y="rowHeight" rx="0" ry="0" :width="lineWidth" :height="height-rowHeight" />
	<rect :x="width-lineWidth" :y="rowHeight" rx="0" ry="0" :width="lineWidth" :height="height-rowHeight" />
	<rect x="0" :y="height-lineWidth" rx="0" ry="0" :width="width" :height="lineWidth" />
	<template v-for="j in (props.numRows)">
	<rect
		v-for="(scw, i) in scaledColumnWidthsPartialSumsWithNext"
		:x="scw[0]+padding+paddingD2/2"
		:y="padding+(rowHeight)*j"
		rx="0"
		ry="0"
		:width="scw[1]-padding-paddingD2-(i===scaledColumnWidthsPartialSumsWithNext.length-1?paddingD2:0)"
		:height="textHeight"
	/>
	</template>
</ContentLoader>
</template>
