<script lang="ts" setup>
import {computed, nextTick, reactive, ref, watch} from "#imports";
import {useDisplay} from "vuetify";
import IconButton from "~/components/general/IconButton.vue";
import {uniqId} from "../../../common/utils/uniq-id";
import {CloseType, ModalStore_T, SnackbarData, useModalStore} from "../../store/modalsStore";
import FileDownloadButton from "../uploaded-files/FileDownloadButton.vue";
import {CssStyle} from "./css-style";

const props = defineProps<{
	distance?: number
}>();

const modalStore: ModalStore_T = useModalStore();
const display                  = useDisplay();
const {smAndDown}              = display;
const maxSnackbarWidth         = computed(() => smAndDown.value ? "100%" : "50%");

const distance         = computed(() => props.distance ?? 55);
const identifier       = ref(uniqId());
const data             = reactive({
	len:     0, // we need it to have a css transition
	keys:    [], // array of 'keys'
	heights: [] as number[], // height of each snackbar to correctly position them
});
const snackbarShowings = reactive<{ value: Record<string, boolean> }>({value: {}});//(new WeakMap<SnackbarData, boolean>());
const snackbarHeights  = reactive<{ value: Record<string, number> }>({value: {}});//(new WeakMap<SnackbarData, number>());
const pastSnackbars    = new Set<string>();
let snackbarTimeouts   = {} as Record<string, number>;//(new WeakMap<SnackbarData, number>());

function getDistances () {
	const res = {} as Record<string, number>;
	let sum   = 0;
	for (const snackbar of modalStore.snackbars) {
		res[snackbar.id] = sum;
		if (snackbarShowings.value[snackbar.id]) {
			sum += snackbarHeights.value[snackbar.id] ?? 0;
		}
	}
	return res;
}

watch(() => modalStore.snackbars, async value => {
	if (modalStore.snackbars.length === 0) {
		snackbarShowings.value = {};
		snackbarHeights.value  = {};
		snackbarTimeouts       = {};
		pastSnackbars.clear();
		return;
	}
	const vs: SnackbarData[] = [];
	for (const snackbar of modalStore.snackbars) {
		if (pastSnackbars.has(snackbar.id)) continue;
		vs.push(snackbar);
	}
	if (vs.length === 0) return;
	await nextTick();
	for (let v of vs) {
		pastSnackbars.add(v.id);
		snackbarShowings.value[v.id] = true;
	}
	await nextTick();
	await nextTick();
	await nextTick();
	for (let v of vs) {
		let height     = distance.value;
		const selector = ".v-snackbars-" + identifier.value + "-" + v.id;
		let elem       = document.querySelector(selector);
		if (elem) {
			let wrapper = elem.querySelector(".v-snackbar__wrapper ");
			if (wrapper) {
				height = wrapper.clientHeight + 7;
			}
		}
		snackbarTimeouts[v.id]      = window.setTimeout(() => modalValueUpdate(v.id, CloseType.TimedOut), v.timeoutMs);
		snackbarHeights.value[v.id] = height;
	}
});

function modalValueUpdate (id: string, closeType: CloseType) {
	snackbarShowings.value[id] = false;
	window.clearTimeout(snackbarTimeouts[id]);
	modalStore.closeSnackbarWithId(id, closeType);
}
</script>

<style>
.v-snackbar__actions {
	width: fit-content;
	justify-content: right;
	flex-direction: row;
	flex-wrap: wrap-reverse;
}
</style>

<template>
<css-style>
	.v-snackbar__wrapper {
	max-width: {{ maxSnackbarWidth }} !important;
	}
</css-style>
<div>
	<v-snackbar
		v-bind="$attrs"
		:model-value="snackbarShowings.value[snackbar.id]"
		@update:modelValue="modalValueUpdate(snackbar.id, CloseType.Dismissed)"
		:color="snackbar.backgroundColor"
		:key="snackbar.id"
		:ref="'v-snackbars-' + identifier"
		:class="'v-snackbars v-snackbars-' + identifier + '-' + snackbar.id"
		:timeout="-1"
		transition="scroll-x-reverse-transition"
		@after-leave="modalStore.snackbarWithIdFullyRemoved(snackbar.id)"
		v-for="(snackbar, idx) in modalStore.snackbars"
		location="top"
		:offset="getDistances()[snackbar.id]"
	>
		<template v-slot:default>
		<span :class="`text-${snackbar.textColor}`">{{
				"message" in snackbar ?
				snackbar.message :
				(snackbar.notification.shortText ?? snackbar.notification.text)
		                                            }}</span>
		</template>
		<template v-slot:actions>
		<v-btn
			v-if="'message' in snackbar"
			:variant="snackbar.okBtnVariant"
			:color="snackbar.okBtnColor"
			density="comfortable"
			rounded
			@click="modalValueUpdate(snackbar.id, CloseType.Ok)">{{ snackbar.okBtnText }}
		</v-btn>
		<template v-else>
		<template v-for="link in snackbar.notification.links">
		<v-btn
			v-if="'link' in link"
			:to="link.link"
			class="ms-1"
			:variant="snackbar.okBtnVariant"
			:color="snackbar.okBtnColor"
			density="compact"
			rounded
			@click="modalValueUpdate(snackbar.id, CloseType.Ok)">
			{{ link.shortText ?? link.text }}
		</v-btn>
		<FileDownloadButton
			v-else-if="'file' in link"
			class="ms-1"
			:file="link.file"
			:button-text="(link.shortText ?? link.text) as string"
			:variant="snackbar.okBtnVariant"
			:color="snackbar.okBtnColor" />
		</template>
		<IconButton
			class="px-2 ms-1"
			:variant="snackbar.okBtnVariant"
			:color="snackbar.okBtnColor"
			icon="fa-close"
			@click="modalValueUpdate(snackbar.id, CloseType.Ok)"
		/>
		</template>
		</template>
	</v-snackbar>
	<teleport to="head" :key="snackbar.id + idx" v-for="(snackbar, idx) in modalStore.snackbars">
		<css-style>
			<template v-slot:default>
			.v-snackbars-{{ identifier }}-{{ snackbar.id }} .v-snackbar__wrapper {
			transition: top 500ms; top: 0; }
			.v-snackbars-{{ identifier }}-{{ snackbar.id }} .v-snackbar__wrapper {
			top:{{ getDistances()[snackbar.id] }}px !important; }
			</template>
		</css-style>
	</teleport>
</div>
</template>
