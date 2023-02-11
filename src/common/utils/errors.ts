export class GeolocationNotAvailableError extends Error {

	constructor (message: string = "Geolocation is not supported by this browser.") {
		super(message);
	}
}
