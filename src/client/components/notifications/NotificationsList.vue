<script setup lang="ts">
import {computed} from "#imports";
import {dateFormat, getDateTimeHeader, timeFormat} from "../../../common/utils/functions";
import {getColorFromLevel} from "../../utils/functions";
import {NotificationDataDisplayable} from "../../utils/types";

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
			<span class="text-no-wrap">{{ getDateTimeHeader(notif.timestamp)! }}</span><br />
			<span class="text-no-wrap">{{ timeFormat(notif.timestamp)! }}</span>
		</p>
		</template>
		<v-card
			:subtitle="(showTimeStampOnOpposite?undefined:dateFormat(notif.timestamp))!"
			:color="getColorFromLevel(notif.level)"
			density="compact"
			variant="tonal"
			rounded="lg">
			<v-card-text class="pb-3">
				{{ notif.text }}<br />
				<v-card-actions class="mr-0 mb-0 mt-1 pa-0" style="min-height: 0px; margin-left: -8px">
					<v-btn
						v-if="notif.link!=null"
						:to="notif.link"
						class="ma-0"
						color="cyan-lighten-4"
						density="compact"
						rounded
						variant="elevated">View more
					</v-btn>
				</v-card-actions>
			</v-card-text>
		</v-card>
	</v-timeline-item>
</v-timeline>
</template>
