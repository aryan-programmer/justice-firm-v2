<script setup lang="ts">
import {computed} from "#imports";
import {ComputedRef} from "@vue/reactivity";
import {storeToRefs} from "pinia";
import {CloseType, ModalData, ModalStore_T, useModalStore} from "../../store/modalsStore";

const modalStore: ModalStore_T = useModalStore();

const {isOpen} = storeToRefs(modalStore);

const modalOptions: ComputedRef<ModalData> = computed(() => modalStore.modalOptions.modalOptions!);
const closeDelay                           = 1000;

function modalValueUpdate (closeType: CloseType) {
	modalStore.closeCurrentModal(closeType);
}
</script>

<template>
<v-dialog
	v-if="modalOptions!=null"
	:model-value="isOpen"
	width="auto"
	@update:modelValue="modalValueUpdate(CloseType.Dismissed)"
	@after-leave="modalStore.modalFullyClosed">
	<v-card :color="modalOptions.backgroundColor">
		<v-card-title class="text-h5">
			{{ modalOptions.title }}
		</v-card-title>
		<v-card-text>
			{{ modalOptions.message }}
		</v-card-text>
		<v-card-actions>
			<v-btn
				:color="modalOptions.okBtnColor"
				:variant="modalOptions.okBtnVariant"
				@click="modalValueUpdate(CloseType.Ok)"
				rounded
			>
				{{ modalOptions.okBtnText }}
			</v-btn>
		</v-card-actions>
	</v-card>
</v-dialog>
</template>
