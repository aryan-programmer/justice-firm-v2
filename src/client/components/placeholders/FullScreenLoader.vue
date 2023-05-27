<script setup lang="ts">
import Loader from "./Loader.vue";

const props = defineProps<{
	primaryColor?: string,
	zIndex?: number,
}>();
</script>

<template>
<div class="full-screen-underlay d-flex align-center justify-center" :style="`z-index: ${props.zIndex??-1}`">
	<Loader :primary-color="props.primaryColor" />
</div>
</template>
