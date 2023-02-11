import {ArrayOptions, ObjectOptions, ObjectPropertyKeys, TObject, TOmit, TSchema, Type} from "@sinclair/typebox";
import {GeolocationNotAvailableError}                                                   from "./errors";

export function capitalizeFirstLetter (string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export function ArrayOf<TS extends TSchema> (schema: TS, options?: ArrayOptions) {
	return Type.Array(schema, {
		$id: `Array_Of${schema.$id}`,
		...options
	});
}

export function InputOmit<T extends TObject, K extends ObjectPropertyKeys<T>[]> (schema: T, keys: readonly [...K], options?: ObjectOptions): TOmit<T, K> {
	return Type.Omit(schema, keys, {
		$id: `${schema.$id}Input`,
		...options
	});
}

export function PartialObject<T extends TObject, K extends ObjectPropertyKeys<T>[]> (schema: T, options?: ObjectOptions) {
	return Type.Partial(schema, {
		$id: `Partial${schema.$id}`,
		...options
	});
}

export async function getCurrentPosition (options?: PositionOptions) {
	return new Promise<GeolocationPosition>((resolve, reject) => {
		if (navigator.geolocation) {
			console.log(navigator.geolocation);
			navigator.geolocation.getCurrentPosition(resolve, reject, options);
		} else {
			reject(new GeolocationNotAvailableError());
		}
	})
}