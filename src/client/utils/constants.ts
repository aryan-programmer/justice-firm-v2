export const confirmedColor   = "green-accent-4";
export const waitingColor     = "deep-purple-accent-3";
export const rejectedColor    = "red-accent-3"
// List of official MIME Types: http://www.iana.org/assignments/media-types/media-types.xhtml
const iconClasses             = {
	// Media
	image: "fa-file-image",
	audio: "fa-file-audio",
	video: "fa-file-video",
	// Documents
	"application/pdf":                                 "fa-file-pdf",
	"application/msword":                              "fa-file-word",
	"application/vnd.ms-word":                         "fa-file-word",
	"application/vnd.oasis.opendocument.text":         "fa-file-word",
	"application/vnd.openxmlformats-officedocument.wordprocessingml":
	                                                   "fa-file-word",
	"application/vnd.ms-excel":                        "fa-file-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml":
	                                                   "fa-file-excel",
	"application/vnd.oasis.opendocument.spreadsheet":  "fa-file-excel",
	"application/vnd.ms-powerpoint":                   "fa-file-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml":
	                                                   "fa-file-powerpoint",
	"application/vnd.oasis.opendocument.presentation": "fa-file-powerpoint",
	"text/plain":                                      "fa-file-text",
	"text/html":                                       "fa-file-code",
	"application/json":                                "fa-file-code",
	// Archives
	"application/gzip": "fa-file-archive",
	"application/zip":  "fa-file-archive"
};
export const iconClassesArray = Object.entries(iconClasses);
