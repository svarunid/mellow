export interface AuthUser {
	id: string;
	name: string;
	email: string;
	image?: string | null;
}

export interface AuthSession {
	id: string;
	userId: string;
	activeOrganizationId?: string | null;
	activeTeamId?: string | null;
}
