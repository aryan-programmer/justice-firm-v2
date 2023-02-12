<script setup lang="ts">
import {definePageMeta} from "#imports";

definePageMeta({
	middleware: "admin-only-page"
});
</script>

<template>
This is the administrator dashboard.
</template>
