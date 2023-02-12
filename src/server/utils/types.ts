import {Static, Type} from "@sinclair/typebox";

export const MariaDbModifyQueryResult = Type.Object({
	affectedRows:  Type.Number(),
	insertId:      Type.Optional(Type.Number()),
	warningStatus: Type.Number()
});
export type MariaDbModifyQueryResult = Static<typeof MariaDbModifyQueryResult>;
