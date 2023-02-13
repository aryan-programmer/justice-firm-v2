export type DataTableHeader<TObject> = {
	key: keyof TObject
	value?: string
	title: string
	colspan?: number
	rowspan?: number
	fixed?: boolean
	align?: 'end' | 'start'
	width?: number
	minWidth?: string
	maxWidth?: string
	sortable?: boolean
	sort?: (a: any, b: any) => number
};
