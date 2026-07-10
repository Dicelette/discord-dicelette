import { LoadingSpinner } from "@shared";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./providers";
import {
	AppLayout,
	CharPage,
	Dashboard,
	Login,
	LoginError,
	Playground,
	Servers,
} from "./routes";

function App() {
	const { user, loading } = useAuth();

	if (window.location.hostname.startsWith("playground.")) return <Playground />;

	if (loading) return <LoadingSpinner />;

	return (
		<Routes>
			<Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
			<Route path="/login/error" element={<LoginError />} />
			<Route path="/playground" element={<Playground />} />
			<Route path="/char/:guildId/:userId" element={<CharPage />} />
			<Route path="/" element={user ? <AppLayout /> : <Navigate to="/login" />}>
				<Route index element={<Servers />} />
				<Route path="dashboard/:guildId" element={<Dashboard />} />
			</Route>
		</Routes>
	);
}

export default App;
