export function notNil<T>(value: T | null | undefined, description: string) {
	if (value == null) {
		throw new Error(`Value should not be empty. ${description}`);
	}
	return value;
}
