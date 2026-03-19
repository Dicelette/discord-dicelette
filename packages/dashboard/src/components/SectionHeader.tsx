export function SectionHeader(props: {
	eyebrow: string;
	title: string;
	description: string;
}) {
	return (
		<header className="section-header">
			<p>{props.eyebrow}</p>
			<h2>{props.title}</h2>
			<span>{props.description}</span>
		</header>
	);
}
