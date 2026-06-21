import { Link } from "@mui/material";
import { useI18n } from "@shared";

interface Props {
	i18nKey: string;
	href: string;
	linkText: string;
}

export function TransWithLink({ i18nKey, href, linkText }: Props) {
	const { t } = useI18n();
	const [before, after] = t(i18nKey).split("{link}");
	return (
		<span>
			{before}
			<Link href={href} target="_blank" rel="noopener noreferrer">
				{linkText}
			</Link>
			{after}
		</span>
	);
}
