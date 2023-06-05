<script setup lang="ts">
import {
	contentLoaderPrimaryColor,
	contentLoaderSecondaryColor,
	contentLoaderSpeed,
	contentLoaderTextHeight,
	contentLoaderTextHeightWithPadding,
	contentLoaderTextRounding,
	useRoute,
	useRouter
} from "#imports";
import {ContentLoader} from "vue-content-loader";
import {useDisplay} from "vuetify";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";
import ButtonPlaceholder from "./ButtonPlaceholder.vue";
import ClientPlaceholderCard from "./ClientPlaceholderCard.vue";
import LawyerPlaceholderCard from "./LawyerPlaceholderCard.vue";
import RectangularPlaceholder from "./RectangularPlaceholder.vue";

const props = defineProps<{
	class?: string
}>();

const {message, error} = useModals();
const userStore        = useUserStore();
const route            = useRoute();
const router           = useRouter();
const {width, lg}      = useDisplay();

const isCaseDocumentsAccordionInline = lg;
</script>

<template>
<v-card color="white" :class="props.class??'w-100 elevation-3'">
	<v-card-title>
		<v-card-title class="ps-0 mt-0 pt-0" style="max-width: 300px;">
			<RectangularPlaceholder
				:width="250"
				:height="25"
				:rounding-x="contentLoaderTextRounding"
				:rounding-y="contentLoaderTextRounding" />
		</v-card-title>
	</v-card-title>
	<v-card-text>
		<v-row>
			<v-col md="6" cols="12">
				<LawyerPlaceholderCard side-by-side class="h-100" :num-extra-actions="1" />
			</v-col>
			<v-col md="6" cols="12">
				<ClientPlaceholderCard side-by-side class="h-100" />
			</v-col>
			<v-col :cols="isCaseDocumentsAccordionInline?4:12" class="align-self-stretch">
				<v-row>
					<v-col :cols="isCaseDocumentsAccordionInline?12:'auto'">
						<ContentLoader
							:width="380"
							:viewBox="`0 0 380 ${contentLoaderTextHeightWithPadding*5}`"
							:speed="contentLoaderSpeed"
							:primaryColor="contentLoaderPrimaryColor"
							:secondaryColor="contentLoaderSecondaryColor"
						>
							<!-- Opened on: -->
							<rect
								x="0"
								width="225"
								y="0"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:height="contentLoaderTextHeight" />
							<!-- Case Type: -->
							<rect
								x="0"
								width="200"
								:y="contentLoaderTextHeightWithPadding"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:height="contentLoaderTextHeight" />
							<!-- Description: -->
							<rect
								x="0"
								width="375"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*2"
								:height="contentLoaderTextHeight" />
							<!-- Description: Line 2-->
							<rect
								x="0"
								width="350"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*3"
								:height="contentLoaderTextHeight" />
							<!-- Status: -->
							<rect
								x="0"
								width="100"
								:rx="contentLoaderTextRounding"
								:ry="contentLoaderTextRounding"
								:y="contentLoaderTextHeightWithPadding*4+2"
								:height="contentLoaderTextHeight" />
							<rect
								x="105"
								width="100"
								:rx="10"
								:ry="10"
								:y="contentLoaderTextHeightWithPadding*4"
								:height="contentLoaderTextHeight+4" />
						</ContentLoader>
						<div class="sticky-top d-flex">
							<ButtonPlaceholder
								:height="34"
								:width="140"
								:class="`mt-1 ${isCaseDocumentsAccordionInline?'mx-auto':''}`" />
						</div>
					</v-col>
				</v-row>
			</v-col>
			<v-col :cols="isCaseDocumentsAccordionInline?8:12">
				<RectangularPlaceholder
					:width="width"
					auto-scale
					:height="isCaseDocumentsAccordionInline?60:40"
					:rounding-y="10"
					:rounding-x="10" />
			</v-col>
		</v-row>
	</v-card-text>
</v-card>
</template>
