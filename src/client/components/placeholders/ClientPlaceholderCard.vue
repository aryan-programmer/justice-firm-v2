<script setup lang="ts">
import {computed, contentLoaderPrimaryColor, contentLoaderSecondaryColor, useSlots} from "#imports";
import {ContentLoader} from "vue-content-loader";
import {useDisplay} from "vuetify";
import {
	contentLoaderTextHeight,
	contentLoaderTextHeightWithPadding,
	contentLoaderTextRounding
} from "../../utils/constants";
import ButtonPlaceholder from "./ButtonPlaceholder.vue";
import RectangularPlaceholder from "./RectangularPlaceholder.vue";

const props = defineProps<{
	sideBySide?: boolean,
	class?: string,
	numActions?: number,
}>();

const slots                             = useSlots();
const display                           = useDisplay();
const {smAndDown: ignoreSideBySideTrue} = display;

const sideImage = computed(() =>
	props.sideBySide === true && !ignoreSideBySideTrue.value
);
</script>

<template>
<v-card
	color="white"
	:class="props.class"
	elevation="3"
	theme="light">
	<div class="d-flex">
		<RectangularPlaceholder v-if="!sideImage" auto-scale class="clamp-image-height mx-auto" />
	</div>
	<v-card-text>
		<v-row>
			<v-col cols="12" :md="sideImage?8:12">
				<v-card-title class="ps-0 mt-0 pt-0" style="max-width: 300px;">
					<RectangularPlaceholder
						:width="250"
						:height="25"
						:rounding-x="contentLoaderTextRounding"
						:rounding-y="contentLoaderTextRounding" />
				</v-card-title>
				<ContentLoader
					style="max-width: 300px;"
					:viewBox="`0 0 325 ${contentLoaderTextHeightWithPadding*8}`"
					:speed="contentLoaderSpeed"
					:primaryColor="contentLoaderPrimaryColor"
					:secondaryColor="contentLoaderSecondaryColor"
				>
					<!-- Email: -->
					<rect
						x="0"
						width="240"
						y="0"
						:rx="contentLoaderTextRounding"
						:ry="contentLoaderTextRounding"
						:height="contentLoaderTextHeight" />
					<!-- Phone: -->
					<rect
						x="0"
						width="200"
						:rx="contentLoaderTextRounding"
						:ry="contentLoaderTextRounding"
						:y="contentLoaderTextHeightWithPadding*1"
						:height="contentLoaderTextHeight" />
					<!-- Gender: -->
					<rect
						x="0"
						width="115"
						:rx="contentLoaderTextRounding"
						:ry="contentLoaderTextRounding"
						:y="contentLoaderTextHeightWithPadding*2"
						:height="contentLoaderTextHeight" />
					<!-- Office Address: -->
					<rect
						x="0"
						width="120"
						:rx="contentLoaderTextRounding"
						:ry="contentLoaderTextRounding"
						:y="contentLoaderTextHeightWithPadding*3"
						:height="contentLoaderTextHeight" />
					<!-- 4 Lines of Address: v-for starts at 1 for some reason -->
					<rect
						v-for="i in 4"
						x="0"
						width="275"
						:rx="contentLoaderTextRounding"
						:ry="contentLoaderTextRounding"
						:y="contentLoaderTextHeightWithPadding*(3+i)"
						:height="contentLoaderTextHeight" />
				</ContentLoader>
			</v-col>
			<v-col v-if="sideImage" class="clamp-image-height d-flex">
				<RectangularPlaceholder auto-scale class="clamp-image-height mx-auto" />
			</v-col>
		</v-row>
	</v-card-text>
	<v-card-actions
		v-if="(props.numActions??0)>0"
		class="flex-row flex-wrap align-center mt-0 pt-0"
		style="min-height: 0px;">
		<ButtonPlaceholder v-for="i in (props.numActions??0)" :width="150" :height="20" />
	</v-card-actions>
</v-card>
</template>
