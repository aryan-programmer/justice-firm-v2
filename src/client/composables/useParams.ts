import {computed, reactive, useRouter} from "#imports";

export function useParamsAndQueries () {
	const router    = useRouter();
	const routeData = reactive({params: router.currentRoute.value.params, query: router.currentRoute.value.query});
	router.afterEach(route => {
		routeData.params = route.params;
		routeData.query  = route.query;
	});
	return [computed(() => routeData.params), computed(() => routeData.query)];
}
