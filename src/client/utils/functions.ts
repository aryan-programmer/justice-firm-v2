import {Ref} from "@vue/reactivity";
import {isLeft} from "fp-ts/Either";
import {AppointmentSparseData} from "../../common/api-schema";
import {StatusEnum} from "../../common/db-types";
import {assert, nn} from "../../common/utils/asserts";
import {Nuly} from "../../common/utils/types";
import {UserStore_T} from "../store/userStore";
import {justiceFirmApi} from "./api-fetcher-impl";

export class FileReaderEventError extends Error {
	public readonly event: ProgressEvent<FileReader>;


	constructor (message: string, event: ProgressEvent<FileReader>) {
		super(message);
		this.event = event;
	}
}

export function readFileAsDataUrl (file: File): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const fileReader = new FileReader();
		const fileName   = file.name;
		fileReader.addEventListener('load', () => {
			const res = fileReader.result;
			assert(typeof res === "string");
			console.log(res.length);
			resolve(res);
		});
		const listener = (ev: ProgressEvent<FileReader>) => {
			reject(new FileReaderEventError(`Failed to read file ${fileName}`, ev));
		};
		fileReader.addEventListener("error", listener);
		fileReader.addEventListener("abort", listener);
		fileReader.readAsDataURL(file);
	})
}

export async function fetchAppointmentsIntoRefByUserType (
	status: StatusEnum,
	orderByOpenedOn: boolean,
	appointmentsRef: Ref<AppointmentSparseData[] | Nuly>,
	userStore: UserStore_T,
) {
	const res = await justiceFirmApi.getAppointments({
		body: {
			withStatus: status,
			orderByOpenedOn,
			authToken:  nn(userStore.authToken)
		}
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		alert(`Failed to get ${status} appointment requests`);
		return;
	}
	if ("message" in res.right.body) {
		console.log(res);
		alert(`Failed to get ${status} appointment requests: ${res.right.body.message}`);
		return;
	}
	appointmentsRef.value = res.right.body;
}

export async function fetchAppointmentsByCategory (
	waitingAppointments: Ref<AppointmentSparseData[] | Nuly>,
	rejectedAppointments: Ref<AppointmentSparseData[] | Nuly>,
	confirmedAppointments: Ref<AppointmentSparseData[] | Nuly>,
	userStore: UserStore_T,
) {
	await Promise.all([
		fetchAppointmentsIntoRefByUserType(StatusEnum.Waiting, true, waitingAppointments, userStore),
		fetchAppointmentsIntoRefByUserType(StatusEnum.Confirmed, false, confirmedAppointments, userStore),
	]);
	await fetchAppointmentsIntoRefByUserType(StatusEnum.Rejected, true, rejectedAppointments, userStore);
}

