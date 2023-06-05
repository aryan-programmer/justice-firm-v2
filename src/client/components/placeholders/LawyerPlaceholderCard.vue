<script setup lang="ts">
import {computed, contentLoaderPrimaryColor, contentLoaderSecondaryColor, contentLoaderSpeed, useSlots} from "#imports";
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
	numExtraActions?: number,
	showStatistics?: boolean,
	showCaseSpecializations?: boolean,
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
		<v-row no-gutters class="justify-space-between">
			<v-col cols="12" :md="sideImage?8:12" class="pt-0 mt-0">
				<v-card-title class="ps-0 mt-0 pt-0" style="max-width: 300px;">
					<RectangularPlaceholder
						:width="250"
						:height="25"
						:rounding-x="contentLoaderTextRounding"
						:rounding-y="contentLoaderTextRounding" />
				</v-card-title>
				<v-row no-gutters>
					<v-col class="px-0 pt-1" style="max-width: 300px;">
						<ContentLoader
							:viewBox="`0 0 325 ${contentLoaderTextHeightWithPadding*11}`"
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
							<!-- Latitude & Longitude: -->
							<rect
								x="0"
								width="275"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*3"
								:height="contentLoaderTextHeight" />
							<!-- Distance: -->
							<rect
								x="0"
								width="275"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*4"
								:height="contentLoaderTextHeight" />
							<!-- Office Address: -->
							<rect
								x="0"
								width="120"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*5"
								:height="contentLoaderTextHeight" />
							<!-- 4 Lines of Address: v-for starts at 1 for some reason -->
							<rect
								v-for="i in 4"
								x="0"
								width="275"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*(5+i)"
								:height="contentLoaderTextHeight" />
							<!-- Status: -->
							<rect
								x="0"
								width="100"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*10+2"
								:height="contentLoaderTextHeight" />
							<rect
								x="105"
								width="100"
								:rx="10"
								:ry="10"
								:y="contentLoaderTextHeightWithPadding*10"
								:height="contentLoaderTextHeight+4" />
						</ContentLoader>
					</v-col>
					<v-col cols="12" sm="5" class="px-0 pt-1" v-if="props.showStatistics">
						<ContentLoader
							width="240"
							:viewBox="`0 0 325 ${contentLoaderTextHeightWithPadding*6}`"
							:speed="contentLoaderSpeed"
							:primaryColor="contentLoaderPrimaryColor"
							:secondaryColor="contentLoaderSecondaryColor"
						>
							<!-- 6 Lines of statistics: v-for starts at 1 for some reason -->
							<rect
								v-for="i in 6"
								x="0"
								width="275"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*(i-1)"
								:height="contentLoaderTextHeight" />
						</ContentLoader>
					</v-col>
				</v-row>
			</v-col>
			<v-col v-if="sideImage" class="pa-3 d-flex">
				<RectangularPlaceholder auto-scale class="clamp-image-height mx-auto" />
			</v-col>
		</v-row>
		<ContentLoader
			v-if="props.showCaseSpecializations"
			:viewBox="`0 0 500 20`"
			:speed="contentLoaderSpeed"
			:primaryColor="contentLoaderPrimaryColor"
			:secondaryColor="contentLoaderSecondaryColor"
			:class="props.class"
		>
			<rect x="0" y="0" rx="5" ry="5" width="500" height="20" />
		</ContentLoader>
	</v-card-text>
	<v-card-actions
		class="flex-row flex-wrap align-center mt-0 pt-0"
		style="min-height: 0px;">
		<ButtonPlaceholder v-for="i in 1+(props.numExtraActions??0)" :width="175" :height="20" />
	</v-card-actions>
</v-card>
</template>
