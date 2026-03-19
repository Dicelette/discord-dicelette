import type { UserProfile } from "../types";

export function HeroHeader(props: {
	user: UserProfile;
	oauthScopes: string[];
	onConnect: () => void;
	status: string;
}) {
	return (
		<header className="hero card">
			<div>
				<p className="eyebrow">Prototype React</p>
				<h1>Webdashboard Dicelette</h1>
				<p className="hero-copy">
					Une interface web dédiée au paramétrage du bot par serveur Discord, avec
					connexion OAuth2, détection des serveurs, sélection du serveur actif et
					séparation stricte des écrans selon le rôle utilisateur.
				</p>
				<div className="pill-row">
					<span className="pill">OAuth Discord ({props.oauthScopes.join(", ")})</span>
					<span className="pill">Intégration Enmap activable</span>
					<span className="pill">Prototype de configuration</span>
				</div>
			</div>
			<div className="login-card">
				<div className="avatar">{props.user.avatar}</div>
				<strong>{props.user.discordTag}</strong>
				<span>
					{props.user.connected ? "Connecté à Discord" : "Connexion Discord à initier"}
				</span>
				<button onClick={props.onConnect} type="button">
					{props.user.connected ? "Session Discord active" : "Se connecter avec Discord"}
				</button>
				<small className="helper-copy">{props.status}</small>
			</div>
		</header>
	);
}
