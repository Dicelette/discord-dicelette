// API response types for channels and roles
export interface ApiChannel {
	id: string;
	name: string;
	type: number;
	parent_id?: string | null;
}

export interface ApiRole {
	id: string;
	name: string;
	color: number;
}
