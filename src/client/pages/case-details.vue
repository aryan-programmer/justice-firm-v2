<script setup lang="ts">
import {computed, justiceFirmApi, navigateTo, nextTick, ref, useHead, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {LocationQuery} from "vue-router";
import {useDisplay} from "vuetify";
import {CaseDocumentData, CaseStatusEnum} from "../../common/db-types";
import {AddCaseDocumentInput, CaseFullData} from "../../common/rest-api-schema";
import {nn} from "../../common/utils/asserts";
import {
	caseDocumentPathPrefix,
	dateStringFormat,
	firstIfArray,
	nullOrEmptyCoalesce
} from "../../common/utils/functions";
import {printRemoveProxies} from "../../common/utils/pretty-print";
import {sleep} from "../../common/utils/sleep";
import {Nuly} from "../../common/utils/types";
import CaseDocumentsGrid from "../components/appointments-cases/CaseDocumentsGrid.vue";
import ClientCard from "../components/details-cards/ClientCard.vue";
import LawyerCard from "../components/details-cards/LawyerCard.vue";
import CaseDetailsPlaceholderCard from "../components/placeholders/CaseDetailsPlaceholderCard.vue";
import UploadFileWithDescriptionDialog from "../components/uploaded-files/UploadFileWithDescriptionDialog.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {UploadFileWithDescriptionDialogEventData} from "../utils/types";

useHead({title: () => "Case details"});

const {message, error} = useModals();
const route            = useRoute();
const userStore        = useUserStore();
const router           = useRouter();
const display          = useDisplay();
const {lg}             = display;

const caseData          = ref<CaseFullData | Nuly>(null);
const caseDocuments     = ref<CaseDocumentData[] | Nuly>(null);
const caseDocumentsGrid = ref<InstanceType<typeof CaseDocumentsGrid> | Nuly>(null);
const isLoading         = ref<boolean>(false);

const isCaseDocumentsAccordionInline = computed(() => lg.value && (caseDocuments.value?.length ?? 0) < 5);

watch(() => route.query, value => {
	fetchCase(value);
}, {immediate: true});

async function caseDocumentsRefresh () {
	await fetchCaseDocuments();
	await nextTick();
	caseDocumentsGrid.value?.masonryReload();
}

async function addCaseDocument (data: UploadFileWithDescriptionDialogEventData) {
	if (caseData.value == null || userStore.authToken == null) return;
	const uploadRes = await justiceFirmApi.uploadFile({
		fileName:   data.attachmentName,
		fileData:   data.attachmentDataUrl,
		pathPrefix: caseDocumentPathPrefix(caseData.value.id, userStore.authToken),
		authToken:  userStore.authToken,
	});
	if (isLeft(uploadRes) || !uploadRes.right.ok || uploadRes.right.body == null || "message" in uploadRes.right.body) {
		console.log(uploadRes);
		await error("Failed to upload case document");
		return;
	}
	const body: AddCaseDocumentInput = {
		authToken:   userStore.authToken,
		caseId:      caseData.value.id,
		file:        uploadRes.right.body,
		description: nullOrEmptyCoalesce(data.description?.trim(), ""),
	};

	const res = await justiceFirmApi.addCaseDocument(body);
	if (isLeft(res) || !res.right.ok) {
		console.log(res);
		await error("Failed to add case document");
		return;
	}
	await fetchCaseDocuments();
	await message("Uploaded case document successfully");
}

async function fetchCaseDocuments (retryIfFailed = true) {
	if (caseData.value == null || userStore.authToken == null) return;
	const res = await justiceFirmApi.getCaseDocuments({
		authToken: userStore.authToken,
		caseId:    caseData.value.id,
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		if (retryIfFailed) {
			setTimeout(() => fetchCaseDocuments(false), 1000);
		} else {
			await error(`Failed to fetch case documents`);
		}
		return;
	}
	caseDocuments.value = res.right.body;
}

async function fetchCase (value: LocationQuery) {
	const id = firstIfArray(value.id);
	if (id == null) {
		await navigateTo("/");
		await error("Specify a case to view details for");
		return;
	}
	isLoading.value = true;
	const res       = await justiceFirmApi.getCase({
		authToken: nn(userStore.authToken),
		id,
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await navigateTo("/");
		await error(`Failed to find the case with the ID ${id}`);
		return;
	}
	caseData.value = res.right.body;
	await Promise.race([fetchCaseDocuments(), sleep(1000)]);
	isLoading.value = false;
	printRemoveProxies({caseDocuments: caseDocuments.value});
}
</script>

<style scoped lang="scss">
.case-details-card-parent-parent {
	position: relative;
	min-height: 100%;
	max-height: 100%;
	height: 100%;
	flex-grow: 1;
}

.case-details-card-parent {
	min-height: 100%;
	max-height: 100%;
	height: 100%;
	width: 100%;
	display: flex;
	position: absolute;
	bottom: 0;
	top: 0;
}

.case-details-card {
	display: flex;
	flex-direction: column;
	margin-right: auto;
	margin-left: auto;
	height: 100%;
}

$case-documents-expansion-title-height: 32px;

.case-documents-expansion-panel-title {
	min-height: $case-documents-expansion-title-height !important;
	max-height: $case-documents-expansion-title-height !important;
	padding-top: 0px;
	padding-bottom: 0px;
	z-index: 10000;
	position: -webkit-sticky !important;
	position: sticky !important;
	top: 0px;
}

.case-documents-expansion-panel-text {
	padding: 0px !important;
	margin: 0px !important;

	:deep(.v-expansion-panel-text__wrapper) {
		padding: 0px !important;
		margin: 0px !important;
	}
}

.case-documents-actions {
	z-index: 10000;
	position: -webkit-sticky;
	position: sticky;
	top: $case-documents-expansion-title-height;
	//bottom: 0px;
	display: flex;
	flex-direction: row;
	justify-content: space-around;
	flex-wrap: wrap;
	padding: 4px;
}
</style>

<template>
<div class="case-details-card-parent-parent">
	<v-sheet elevation="3" rounded class="case-details-card-parent">
		<CaseDetailsPlaceholderCard v-if="isLoading" class="elevation-0 w-100 case-details-card scroll-y" />
		<v-card
			v-else-if="caseData!=null"
			color="gradient--juicy-peach"
			class="elevation-0 w-100 case-details-card scroll-y">
			<v-card-title>
				<h3>Case details</h3>
			</v-card-title>
			<v-card-text>
				<v-row>
					<v-col sm="6" cols="12">
						<LawyerCard
							:lawyer="caseData.lawyer"
							class="h-100"
							:side-by-side="true"
						>
							<template #actions>
							<v-btn
								:to="`/lawyer-details?id=${caseData.lawyer.id}`"
								color="cyan-lighten-4"
								density="compact"
								rounded
								variant="tonal">View details
							</v-btn>
							</template>
						</LawyerCard>
					</v-col>
					<v-col sm="6" cols="12">
						<ClientCard
							class="h-100"
							:client="caseData.client"
							:side-by-side="true"
						/>
					</v-col>
					<v-col :cols="isCaseDocumentsAccordionInline?4:12" class="align-self-stretch">
						<v-row>
							<v-col :cols="isCaseDocumentsAccordionInline?12:'auto'">
								<p>
									Opened on: {{ dateStringFormat(caseData.openedOn) }}<br />
									Case Type: {{ caseData.caseType.name }}<br />
								</p>
								<pre class="pre-wrap text-body-2">Description: {{ caseData.description }}</pre>
								<p v-if="caseData.status === CaseStatusEnum.Waiting">
									Status:
									<v-chip
										class="fw-bold"
										color="amber-darken-3"
										variant="tonal"
										density="compact">Waiting
									</v-chip>
								</p>
								<p v-else-if="caseData.status === CaseStatusEnum.Open">
									Status:
									<v-chip
										class="fw-bold"
										color="green-darken-3"
										variant="tonal"
										density="compact">Open
									</v-chip>
								</p>
								<p v-else-if="caseData.status === CaseStatusEnum.Closed">
									Status:
									<v-chip
										class="fw-bold"
										color="red-darken-2"
										variant="tonal"
										density="compact">Closed
									</v-chip>
								</p>
								<div class="sticky-top d-flex">
									<v-btn
										:to="`/chat-group?id=${caseData.groupId}`"
										:class="`mt-1 ${isCaseDocumentsAccordionInline?'mx-auto':''}`"
										color="teal-lighten-3"
										density="default"
										elevation="2"
										rounded
										variant="elevated">View Chat group
									</v-btn>
								</div>
							</v-col>
						</v-row>
					</v-col>
					<v-col :cols="isCaseDocumentsAccordionInline?8:12">
						<v-expansion-panels
							:variant="isCaseDocumentsAccordionInline?'popout':'accordion'"
							class="w-100">
							<v-expansion-panel class="bg-gradient--new-retrowave">
								<v-expansion-panel-title class="case-documents-expansion-panel-title bg-gradient--premium-white">
									<h3>View case documents</h3>
								</v-expansion-panel-title>
								<v-expansion-panel-text class="case-documents-expansion-panel-text">
									<v-sheet
										elevation="1"
										class="case-documents-actions rounded-b-sm bg-gradient--premium-white mx-1">
										<UploadFileWithDescriptionDialog
											@upload-file="addCaseDocument"
											title="Upload case document"
											description-field-name="Description"
											button-text="Upload"
											button-icon="fas fa-upload"
											bg-color="gradient--royal-garden"
										>
											<template v-slot:activator="{activatorProps}">
											<v-btn
												v-bind="activatorProps"
												density="compact"
												color="green-darken-2"
												variant="elevated"
												rounded>
												<template #prepend>
												<v-icon icon="fa-plus" class="ml-1" />
												</template>
												Add case document
											</v-btn>
											</template>
										</UploadFileWithDescriptionDialog>
										<v-btn
											density="compact"
											rounded
											color="blue-darken-2"
											variant="tonal"
											@click="caseDocumentsRefresh">
											<template #prepend>
											<v-icon icon="fa-refresh" class="ml-1" />
											</template>
											Refresh
										</v-btn>
									</v-sheet>
									<div class="ma-3">
										<CaseDocumentsGrid :documents="caseDocuments" ref="caseDocumentsGrid" />
									</div>
								</v-expansion-panel-text>
							</v-expansion-panel>
						</v-expansion-panels>
					</v-col>
				</v-row>
			</v-card-text>
		</v-card>
	</v-sheet>
</div>
</template>
