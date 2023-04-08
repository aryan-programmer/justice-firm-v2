<script setup lang="ts">
import {computed} from "#imports";
import {dateFormat} from "../../common/utils/functions";
import {MessageData} from "../../common/ws-api-schema";
import {useUserStore} from "../store/userStore";

const props     = defineProps<{
	message: MessageData
}>();
const userStore = useUserStore();
const timestamp = computed(() => dateFormat(new Date(+props.message.ts)));
const isMe      = computed(() => props.message.from === userStore.authToken?.id);
const color     = computed(() => isMe.value ? "gradient--palo-alto" : "gradient--landing-aircraft");
const theme     = computed(() => isMe.value ? "light" : "light");

</script>

<style>
.message {
	width: -webkit-fit-content;
	width: -moz-fit-content;
	width: fit-content;
	white-space: pre;
	box-shadow: 0 0 2rem rgba(0, 0, 0, 0.075), 0rem 1rem 1rem -1rem rgba(0, 0, 0, 0.1);
}

.message.is-me {
	align-self: end;
	border-radius: 1.125rem 1.125rem 0 1.125rem;
}

.message.is-other {
	align-self: start;
	border-radius: 1.125rem 1.125rem 1.125rem 0;
}
</style>

<template>
<v-card density="compact" :class="`ma-1 message ${isMe?'is-me':'is-other'}`" :color="color" :theme="theme">
	<v-card-text class="py-1 px-2">
		<p>{{ message.text }}</p>
	</v-card-text>
	<v-card-subtitle>
		{{ timestamp }}
	</v-card-subtitle>
</v-card>
</template>
