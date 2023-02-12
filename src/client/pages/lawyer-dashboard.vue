<script setup lang="ts">
import {definePageMeta} from "#imports";

definePageMeta({
	middleware: "lawyer-only-page"
});
</script>

<template>
This is the lawyer dashboard.
</template>
