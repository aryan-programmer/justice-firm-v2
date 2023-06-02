<script setup lang="ts">
import {
	ChatWSAPIClient,
	computed,
	definePageMeta,
	justiceFirmApi,
	navigateTo,
	onBeforeUnmount,
	reactive,
	ref,
	useRoute,
	useRouter,
	watch
} from "#imports";
import {nextTick} from "@vue/runtime-core";
import {isLeft} from "fp-ts/Either";
import {LocationQuery} from "vue-router";
import {VTextarea} from "vuetify/components/VTextarea";
import {ID_T} from "../../common/db-types";
import {nn} from "../../common/utils/asserts";
import {
	chatGroupAttachmentPathPrefix,
	firstIfArray,
	isNullOrEmpty,
	nullOrEmptyCoalesce
} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {
	EstablishChatConnectionOutput,
	MessageData,
	PostMessageInput,
	PostMessageWithAttachmentInput
} from "../../common/ws-chatter-box-api-schema";
import ChatMessagesList from "../components/chat/ChatMessagesList.vue";
import ChatGroupPlaceholderCard from "../components/placeholders/ChatGroupPlaceholderCard.vue";
import UploadFileWithDescriptionDialog from "../components/uploaded-files/UploadFileWithDescriptionDialog.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {UploadFileWithDescriptionDialogEventData} from "../utils/types";

definePageMeta({
	middleware: "yes-user-page"
});

const {message, error} = useModals();
const userStore        = useUserStore();
const route            = useRoute();
const router           = useRouter();
const chatClient       = ref<ChatWSAPIClient | Nuly>();
const chatData         = ref<EstablishChatConnectionOutput | Nuly>();
const isLoading        = ref<boolean>(true);
const messageText      = ref<string>("");
const scrollingBox     = ref<VTextarea | Nuly>();
const canPost          = computed(() =>
	!isNullOrEmpty(messageText.value)
);
const messages         = reactive({messages: [] as MessageData[]});
const pastMessages     = new Set<ID_T>();
let chatGroupId: string | Nuly;

watch(() => route.query, value => {
	openConnection(value);
}, {immediate: true});

watch(chatClient, (value, oldValue) => {
	if (oldValue != null) {
		oldValue.close();
		oldValue.removeAllListeners('incomingMessage');
	}
	const cl = chatClient.value;
	if (cl == null) return;
	cl.on('incomingMessage', async message => {
		console.log(message);
		if (pastMessages.has(message.id)) return;
		messages.messages.push(message);
		await scrollToBottom();
	});
});

onBeforeUnmount(() => {
	chatClient.value?.close();
});

async function scrollToBottom () {
	await nextTick();
	const el = scrollingBox.value?.$el as HTMLDivElement | Nuly;
	if (el == null) {
		return;
	}
	el.scrollTop = el.scrollHeight;
}

async function onKeypressInTextArea (e: KeyboardEvent) {
	if (!e.shiftKey && (e.key.includes("Enter") || e.key.includes("Return"))) {
		e.preventDefault();
		await postMessage();
	}
}

async function postMessage () {
	if (!canPost.value) return;
	const cl = chatClient.value;
	if (cl == null) return;
	const body: PostMessageInput = {
		chatAuthToken: nn(chatData.value?.chatAuthToken),
		text:          messageText.value.trim(),
	};
	const res                    = await cl.postMessage(body);
	if (isLeft(res) || !res.right.ok) {
		await error("Failed to post message");
		return;
	}
	messageText.value = "";
	await scrollToBottom();
}

async function postMessageWithAttachment (data: UploadFileWithDescriptionDialogEventData) {
	const cl = chatClient.value;
	if (cl == null || chatGroupId == null || userStore.authToken == null) return;
	const uploadRes = await justiceFirmApi.uploadFile({
		fileName:   data.attachmentName,
		fileData:   data.attachmentDataUrl,
		pathPrefix: chatGroupAttachmentPathPrefix(chatGroupId, userStore.authToken.id),
		authToken:  userStore.authToken,
	});
	if (isLeft(uploadRes) || !uploadRes.right.ok || uploadRes.right.body == null || "message" in uploadRes.right.body) {
		console.log(uploadRes);
		await error("Failed to upload attachment");
		return;
	}
	const body: PostMessageWithAttachmentInput = {
		chatAuthToken: nn(chatData.value?.chatAuthToken),
		text:          nullOrEmptyCoalesce(data.description, data.attachmentName),
		uploadedFile:  uploadRes.right.body,
	};

	const res = await cl.postMessageWithAttachment(body);
	if (isLeft(res) || !res.right.ok) {
		console.log(res);
		await error("Failed to post message");
		return;
	}
	messageText.value = "";
	await scrollToBottom();
}

async function openConnection (value: LocationQuery) {
	const id = firstIfArray(value.id);
	if (id == null) {
		await navigateTo("/");
		await error("Specify an chat group to connect to for");
		return;
	}
	await chatClient.value?.close();
	chatClient.value = null;

	isLoading.value = true;
	try {
		const cl = new ChatWSAPIClient();
		await cl.open();
		const res = await cl.establishConnection({group: id, authToken: nn(userStore.authToken)});
		if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
			console.log(res);
			await navigateTo("/");
			await cl.close();
			await error(`Failed to open a connection with the ID ${id}`);
			return;
		}
		const establishConnBody = res.right.body;
		chatData.value          = establishConnBody;
		chatClient.value        = cl;
		chatGroupId             = id;
		const messagesRes       = await cl.getMessages({chatAuthToken: establishConnBody.chatAuthToken});
		if (isLeft(messagesRes) || !messagesRes.right.ok || messagesRes.right.body == null || "message" in messagesRes.right.body) {
			console.log(messagesRes);
			await error(`Failed to get messages`);
			return;
		}
		const msgs: MessageData[] = messagesRes.right.body;
		msgs.sort((a, b) => {
			return a.ts.localeCompare(b.ts);
		});
		for (const msg of msgs) {
			pastMessages.add(msg.id);
		}
		messages.messages = msgs;
		await scrollToBottom();
	} finally {
		isLoading.value = false;
	}
}
</script>

<style scoped>
.chat-group-card-parent-parent {
	position: relative;
	min-height: 100%;
	max-height: 100%;
	height: 100%;
	flex-grow: 1;
}

.chat-group-card-parent {
	min-height: 100%;
	max-height: 100%;
	height: 100%;
	width: 100%;
	display: flex;
	position: absolute;
	bottom: 0;
	top: 0;
}

.chat-group-card {
	display: flex;
	flex-direction: column;
	margin-right: auto;
	margin-left: auto;
}
</style>

<template>
<div class="chat-group-card-parent-parent">
	<div class="chat-group-card-parent">
		<ChatGroupPlaceholderCard v-if="isLoading" class="elevation-3 chat-group-card pa-2 w-100" />
		<v-card
			v-else-if="chatClient!=null && chatData!=null"
			color="gradient--wide-matrix"
			class="elevation-3 chat-group-card pa-2 w-100"
		>
			<v-card-title class="py-2 border-b-sm text-white" style="border-block-end-color: white !important;">
				<span class="h4">{{ chatData.name }}</span>
			</v-card-title>
			<v-card-text class="h-100 pb-0 pt-0 flex-grow-1 scroll-y" ref="scrollingBox">
				<ChatMessagesList :messages="messages.messages" @anyImageLoaded="scrollToBottom" />
			</v-card-text>
			<v-card-actions
				class="border-t-sm pa-0 d-flex flex-row"
				style="border-block-start-color: white !important;">
				<UploadFileWithDescriptionDialog
					@upload-file="postMessageWithAttachment"
					title="Post message with attachment"
					description-field-name="Message Text"
					button-text="Post message"
					button-icon="fas fa-paper-plane"
					bg-color="gradient--new-york">
					<template v-slot:activator="{activatorProps}">
					<v-btn icon="fa-paperclip" v-bind="activatorProps"></v-btn>
					</template>
				</UploadFileWithDescriptionDialog>
				<v-textarea
					hide-details
					v-model="messageText"
					variant="solo"
					placeholder="Type a message"
					density="compact"
					rows="1"
					@keydown="onKeypressInTextArea"
				/>
				<v-btn
					class="ma-1"
					icon="fa-paper-plane"
					density="default"
					variant="elevated"
					color="brown-lighten-2"
					size="small"
					elevation="1"
					:disabled="!canPost"
					@click="postMessage"
				/>
			</v-card-actions>
		</v-card>
	</div>
</div>
</template>
