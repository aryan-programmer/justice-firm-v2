<script lang="ts">
import {defineComponent, nextTick} from "#imports";
import {CaseDocumentData} from "../../../common/db-types";
import {Nuly} from "../../../common/utils/types";
import CaseDocument from "./CaseDocument.vue";

export default defineComponent({
	components: {CaseDocument},
	props:      {
		documents: Array as () => CaseDocumentData[] | Nuly
	},
	watch:      {
		async documents () {
			await nextTick();
			this.masonryReload();
		}
	},
	methods:    {
		masonryReload (this: Object) {
			if (typeof (this as any).$redrawVueMasonry == "function") {
				console.log(this, (this as any).$redrawVueMasonry);
				(this as any).$redrawVueMasonry();
			} else {
				console.log("$redrawVueMasonry not found on ", this);
			}
		}
	}
});
</script>

<template>
<v-row
	v-masonry
	v-if="documents != null && documents.length>0"
	no-gutters>
	<v-col
		v-for="document in documents ?? []"
		class="pa-1"
		cols="12"
		sm="6"
		:key="document.id"
	>
		<CaseDocument :document="document" @imageLoad="masonryReload" />
	</v-col>
</v-row>
<h3 v-else class="text-center">No documents found</h3>
</template>
