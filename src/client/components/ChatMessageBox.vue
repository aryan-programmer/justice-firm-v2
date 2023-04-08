<script setup lang="ts">
import {computed} from "#imports";
import {MessageDataDisplayable} from "../utils/types";

const props     = defineProps<{
	message: MessageDataDisplayable
}>();
const isMeDeps  = computed(() => props.message.isMe ? {
	bgColor: "gradient--landing-aircraft",
	class:   "is-me",
} : {
	bgColor: "gradient--palo-alto",
	class:   "is-other",
});
const lrClasses = computed(() => `${props.message.first ? "first" : ""} ${props.message.last ? "last" : ""}`)
</script>

<style lang="scss">
$border-radius: 0.75rem;
$top-margin: 4px;
$top-half-margin: 2px;

.message {
	margin: $top-half-margin 4px;
	width: -webkit-fit-content;
	width: -moz-fit-content;
	width: fit-content;
	max-width: 66%;
	white-space: pre-wrap;
	box-shadow: 0 0 2rem rgba(0, 0, 0, 0.075), 0rem 1rem 1rem -1rem rgba(0, 0, 0, 0.1);
}

.message.is-me {
	align-self: end;
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-top-left-radius: $border-radius;
	border-bottom-left-radius: $border-radius;
}

.message.is-other {
	align-self: start;
	border-top-right-radius: $border-radius;
	border-bottom-right-radius: $border-radius;
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.message.is-me.first {
	border-top-right-radius: $border-radius;
	margin-top: $top-margin;
}

.message.is-other.first {
	border-top-left-radius: $border-radius;
	margin-top: $top-margin;
}

.message.last {
	margin-bottom: 4px;
}
</style>

<template>
<v-card density="compact" :class="`message ${isMeDeps.class} ${lrClasses}`" :color="isMeDeps.bgColor">
	<v-card-text class="py-1 px-2">
		<p>{{ message.text }}</p>
	</v-card-text>
	<v-card-subtitle class="px-2">
		{{ message.timeString }}
	</v-card-subtitle>
</v-card>
</template>
