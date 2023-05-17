<script lang="ts" setup>
import {uniqId} from "../../../common/utils/uniq-id";
import {CloseType, ModalStore_T, SnackbarData, useModalStore} from "../../store/modalsStore";
import {CssStyle} from "./css-style";

const props                    = defineProps<{
	distance?: number
}>();
const distance                 = computed(() => props.distance ?? 55);
const identifier               = ref(uniqId());
const data                     = reactive({
	len:     0, // we need it to have a css transition
	keys:    [], // array of 'keys'
	heights: [] as number[], // height of each snackbar to correctly position them
});
const modalStore: ModalStore_T = useModalStore();
const snackbarShowings         = reactive<{ value: Record<string, boolean> }>({value: {}});//(new WeakMap<SnackbarData, boolean>());
const snackbarHeights          = reactive<{ value: Record<string, number> }>({value: {}});//(new WeakMap<SnackbarData, number>());
let snackbarTimeouts           = {} as Record<string, number>;//(new WeakMap<SnackbarData, number>());

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
		return;
	}
	const vs: SnackbarData[] = [];
	for (const snackbar of modalStore.snackbars) {
		if (snackbarShowings.value[snackbar.id]) continue;
		vs.push(snackbar);
	}
	if (vs.length === 0) return;
	await nextTick();
	for (let v of vs) {
		snackbarShowings.value[v.id] = true;
	}
	await nextTick();
	await nextTick();
	await nextTick();
	for (let v of vs) {
		let height = distance.value;
		let elem   = document.querySelector(
			".v-snackbars-" + identifier.value + "-" + v.id
		);
		if (elem) {
			let wrapper = elem.querySelector(".v-snack__wrapper");
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

<template>
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
		<span :class="`text-${snackbar.textColor}`">{{ snackbar.message }}</span>
		</template>
		<template v-slot:actions>
		<v-btn
			:variant="snackbar.okBtnVariant"
			:color="snackbar.okBtnColor"
			@click="modalValueUpdate(snackbar.id, CloseType.Ok)">{{ snackbar.okBtnText }}
		</v-btn>
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
