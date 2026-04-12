export type CustomCriticalValues = {
	id?: string;
	selection: ">" | ">=" | "<" | "<=" | "==" | "!=";
	name: string;
	formula: string;
	text: string;
	onNaturalDice: boolean;
	affectSkill: boolean;
};

export type CriticalValues = {
	success?: number | string;
	failure?: number | string;
};

export type MacroValues = {
	id?: string; // id stable pour les listes (drag & memo)
	name: string;
	value: string;
};

export type StatisticFields = {
	id?: string; // id stable pour les listes (drag & memo)
	min?: string;
	max?: string;
	combinaison?: string;
	name: string;
	excluded?: boolean;
};

export type DataForm = {
	isCharNameRequired: boolean;
	isPrivate: boolean;
	statistics: StatisticFields[];
	total?: number | string;
	diceType?: string;
	critical?: CriticalValues;
	damages: MacroValues[];
	customCritical: CustomCriticalValues[];
	forceDistrib?: boolean;
};
