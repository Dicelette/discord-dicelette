export function KeyValue(props: { label: string; value: string }) {
	return (
		<div className="kv-card">
			<strong>{props.label}</strong>
			<span>{props.value}</span>
		</div>
	);
}
