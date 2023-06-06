<script setup lang="ts">
import {computed} from "#imports";
import {getColorFromLevel} from "../../utils/functions";
import {NotificationDataDisplayable} from "../../utils/types";
import FileDownloadButton from "../uploaded-files/FileDownloadButton.vue";

const props                   = defineProps<{
	notifications: NotificationDataDisplayable[],
	showTimeStampOnOpposite?: boolean,
	header?: string,
}>();
const showTimeStampOnOpposite = computed(() => props.showTimeStampOnOpposite === true);

// TODO: Use https://www.npmjs.com/package/vue-virtual-scroller
</script>

<template>
<v-timeline :density="showTimeStampOnOpposite?'comfortable':'compact'">
	<v-timeline-item size="medium" fill-dot dot-color="black" v-if="props.header!=null">
		<template v-slot:opposite v-if="showTimeStampOnOpposite">
		<h3>Timestamp</h3>
		</template>
		<h1>{{ props.header }}</h1>
	</v-timeline-item>
	<v-timeline-item
		v-for="notif in props.notifications"
		:dot-color="getColorFromLevel(notif.level)"
		:icon="notif.icon!"
		icon-color="white"
		size="large"
		:key="notif.id"
	>
		<template v-slot:opposite v-if="showTimeStampOnOpposite">
		<p class="text-right">
			<span class="text-no-wrap">{{ notif.dateStrings.date }}</span><br />
			<span class="text-no-wrap">{{ notif.dateStrings.time }}</span>
		</p>
		</template>
		<v-card
			:subtitle="(showTimeStampOnOpposite?undefined:notif.dateStrings.dateTime)!"
			:color="getColorFromLevel(notif.level)"
			density="compact"
			variant="tonal"
			rounded="lg">
			<v-card-text class="" v-bind:class="{'pb-0': notif.links.length>0}">
				<p class="pre-wrap">{{ notif.text }}</p>
			</v-card-text>
			<v-card-actions class="pt-1" style="min-height: 0px;" v-if="notif.links.length>0">
				<template v-for="link in notif.links">
				<v-btn
					v-if="'link' in link"
					:to="link.link"
					color="cyan-lighten-4"
					density="compact"
					rounded
					variant="elevated">
					{{ link.text }}
				</v-btn>
				<FileDownloadButton
					v-else-if="'file' in link"
					:file="link.file"
					:button-text="link.text"
					color="cyan-lighten-4" />
				</template>
			</v-card-actions>
		</v-card>
	</v-timeline-item>
</v-timeline>
</template>
