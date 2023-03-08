<script setup lang="ts">
import {computed, ref} from "#imports";
import {VBtn} from "vuetify/components";
import {Nuly} from "../../common/utils/types";
import {uniqId} from "../../common/utils/uniq-id";
import {forceRipple} from "../utils/functions";

const props         = defineProps<{
	link?: string,
	icon: string,
	title: string,
	value: string,
	active?: boolean,
	theme: string
}>();
const emit          = defineEmits<{
	(on: "click"): void
}>();
const id            = ref("i-" + uniqId());
const buttonElement = ref<VBtn | Nuly>(null);

const buttonColor = computed(() => {
	if (props.theme === "dark")
		return props.active ? 'blue-lighten-2' : 'white';
	return props.active ? 'blue-darken-2' : 'black';
});

function onClick () {
	if (buttonElement.value != null) {
		forceRipple(buttonElement.value.$el);
	}
	emit('click');
}
</script>

<style lang="scss">
.nav-link {
	text-decoration: none;
	cursor: pointer;
	color: black;
}

.nav-item {
	display: flex;
	flex-direction: column;
	align-items: center;

	.nav-item-text {
		text-align: center;
		font-weight: 400;
		cursor: pointer;
	}

	&.active .nav-item-text {
		font-weight: 500;
	}
}
</style>

<template>
<NuxtLink
	:to="props.link"
	@click="onClick"
	:class="`nav-item nav-link px-1 py-1 pt-2 text-${buttonColor} ${active?'active':''}`"
>
	<v-btn
		ref="buttonElement"
		:active="active"
		rounded="pill"
		:variant="active?'tonal':'text'"
		:ripple="true"
		:id="id"
		:color="buttonColor"
	>
		<v-icon :icon="props.icon" />
	</v-btn>
	<label
		:for="id"
		class="nav-item-text"
	>{{ props.title }}</label>
</NuxtLink>
</template>
