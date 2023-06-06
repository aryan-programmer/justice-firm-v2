import {SemanticColorLevel} from "./types";

export const contentLoaderSpeed                 = 2;
export const contentLoaderPrimaryColor          = "#f3f3f3";
export const contentLoaderSecondaryColor        = "#ecebeb";
export const contentLoaderTextHeight            = 16;
export const contentLoaderTextHeightWithPadding = 20;
export const contentLoaderTextRounding          = 5;

export const appointmentsIcon = "fa-calendar-days";
export const casesIcon        = "fa-briefcase";
export const gavelIcon        = "fa-gavel";

export const successColor = "green-accent-4";
export const infoColor    = "blue-accent-4";
export const warningColor = "amber-darken-2";
export const errorColor   = "red-accent-3";

export const levelToColorMap = {
	[SemanticColorLevel.Error]:   errorColor,
	[SemanticColorLevel.Warning]: warningColor,
	[SemanticColorLevel.Info]:    infoColor,
	[SemanticColorLevel.Success]: successColor,
};

export const confirmedColor          = "green-accent-4";
export const waitingColor            = "warning";
export const rejectedColor           = "red-accent-3";
export const meChatBgColor           = "gradient--landing-aircraft";
export const otherChatMessageBgColor = "gradient--palo-alto";
// List of official MIME Types: http://www.iana.org/assignments/media-types/media-types.xhtml
const iconClasses                    = {
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
export const iconClassesArray        = Object.entries(iconClasses);
