<script setup lang="ts">
import {
	ChatWSAPIClient,
	computed,
	definePageMeta,
	navigateTo,
	nextTick,
	onBeforeUnmount,
	reactive,
	ref,
	useRoute,
	useRouter,
	watch
} from "#imports";
import {isLeft} from "fp-ts/Either";
import {LocationQuery} from "vue-router";
import {VTextarea} from "vuetify/components/VTextarea";
import {ID_T} from "../../common/db-types";
import {nn} from "../../common/utils/asserts";
import {firstIfArray, isNullOrEmpty} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {EstablishConnectionOutput, MessageData, PostMessageInput} from "../../common/ws-api-schema";
import ChatMessagesList from "../components/ChatMessagesList.vue";
import {useUserStore} from "../store/userStore";

definePageMeta({
	middleware: "yes-user-page"
});

const userStore    = useUserStore();
const route        = useRoute();
const router       = useRouter();
const chatClient   = ref<ChatWSAPIClient | Nuly>();
const chatData     = ref<EstablishConnectionOutput | Nuly>();
const messageText  = ref<string>("");
const scrollingBox = ref<VTextarea | Nuly>();
const canPost      = computed(() =>
	!isNullOrEmpty(messageText.value)
);
const messages     = reactive({messages: [] as MessageData[]});
const pastMessages = new Set<ID_T>();

watch(() => route.query, value => {
	openConnection(value);
}, {immediate: true});

watch(chatClient, value => {
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
		console.log("Null");
		return;
	}
	console.log(el, el.scrollHeight);
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
		alert("Failed to post message");
		return;
	}
	messageText.value = "";
	await scrollToBottom();
}

async function openConnection (value: LocationQuery) {
	const id = firstIfArray(value.id);
	if (id == null) {
		await navigateTo("/");
		alert("Specify an chat group to connect to for");
		return;
	}
	await chatClient.value?.close();
	chatClient.value = null;
	const cl         = new ChatWSAPIClient();
	await cl.open();
	const res = await cl.establishConnection({group: id, authToken: nn(userStore.authToken)});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await navigateTo("/");
		alert(`Failed to open a connection with the ID ${id}`);
		await cl.close();
		return;
	}
	const establishConnBody = res.right.body;
	console.log(establishConnBody);
	chatData.value    = establishConnBody;
	chatClient.value  = cl;
	const messagesRes = await cl.getMessages({chatAuthToken: establishConnBody.chatAuthToken});
	if (isLeft(messagesRes) || !messagesRes.right.ok || messagesRes.right.body == null || "message" in messagesRes.right.body) {
		alert(`Failed to get messages`);
		return;
	}
	const msgs: MessageData[] = messagesRes.right.body;
	msgs.sort((a, b) => {
		return a.ts.localeCompare(b.ts)
	});
	for (const msg of msgs) {
		pastMessages.add(msg.id);
	}
	console.log(msgs);
	messages.messages = msgs;
	await scrollToBottom();
}
</script>

<style>
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
		<v-card
			v-if="chatClient!=null && chatData!=null"
			color="gradient--wide-matrix"
			class="elevation-3 chat-group-card pa-2 v-col v-col-12 v-col-sm-8"
		>
			<v-card-title class="py-2 border-b-sm text-white" style="border-block-end-color: white !important;">
				<span class="h4">{{ chatData.name }}</span>
			</v-card-title>
			<v-card-text class="h-100 pb-0 pt-0 flex-grow-1 scroll-y" ref="scrollingBox">
				<ChatMessagesList :messages="messages.messages" />
			</v-card-text>
			<v-card-actions
				class="border-t-sm pa-0 d-flex flex-row"
				style="border-block-start-color: white !important;">
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
