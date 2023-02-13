import {StorageSerializers, useLocalStorage} from "@vueuse/core";
import {defineStore} from 'pinia'
import {AuthToken} from "../../common/api-types";
import {Nuly} from "../../common/utils/types";

export const useUserStore = defineStore('UserStore', () => {
	const authToken = useLocalStorage<AuthToken | Nuly>("UserStore::AuthToken",
		null,
		{serializer: StorageSerializers.object});

	return {
		authToken,
		signIn (token: AuthToken) {
			console.log("Token", token);
			authToken.value = token;
		},
		signOut () {
			console.log("Signing Out");
			authToken.value = null;
		}
	};
});

export type UserStore_T = ReturnType<typeof useUserStore>;
