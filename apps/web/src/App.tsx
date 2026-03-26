import { LoadingSpinner } from "@shared";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./providers";
import { AppLayout, Dashboard, Login, Servers } from "./routes";

function App() {
	const { user, loading } = useAuth();

	if (loading) return <LoadingSpinner />;

	return (
		<Routes>
			<Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
			<Route path="/" element={user ? <AppLayout /> : <Navigate to="/login" />}>
				<Route index element={<Servers />} />
				<Route path="dashboard/:guildId" element={<Dashboard />} />
			</Route>
		</Routes>
	);
}

export default App;
