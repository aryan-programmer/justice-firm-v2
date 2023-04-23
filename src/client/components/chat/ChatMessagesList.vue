<script setup lang="ts">
import {computed} from "#imports";
import _ from "lodash";
import {getDateTimeHeader, getDayFromMs} from "../../../common/utils/functions";
import {MessageData} from "../../../common/ws-api-schema";
import {useUserStore} from "../../store/userStore";
import {messageDataToDisplayable} from "../../utils/functions";
import ChatMessageBox from "./ChatMessageBox.vue";

const props         = defineProps<{
	messages: MessageData[]
}>();
const emit          = defineEmits<{
	(on: 'anyImageLoaded'): void
}>()
const messageGroups = computed(() => {
	return _
		.chain(props.messages)
		.groupBy(value => {
			return getDayFromMs(+value.ts);
		})
		.map(value => ({
			header:   getDateTimeHeader(new Date(+value[0].ts)),
			sortKey:  getDayFromMs(+value[0].ts),
			messages: messageDataToDisplayable(value, userStore)
		}))
		.sortBy(value => value.sortKey)
		.value();
});

const userStore = useUserStore();

function onLoad () {
	emit('anyImageLoaded')
}
</script>

<template>
<div>
	<div class="d-flex flex-column my-2" v-for="messageGroup in messageGroups" :key="messageGroup.sortKey.toString()">
		<div class="sticky-top d-flex flex-column">
			<v-card
				class="pa-1 mx-auto"
				density="compact">
				<v-card-text class="pa-0 text-center text-caption">
					{{ messageGroup.header }}
				</v-card-text>
			</v-card>
		</div>
		<ChatMessageBox
			v-for="message in messageGroup.messages"
			:key="message.id"
			:message="message"
			@imageLoad="onLoad"
		/>
	</div>
</div>
</template>
