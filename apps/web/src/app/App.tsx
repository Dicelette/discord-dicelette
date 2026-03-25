import { Navigate, Route, Routes } from "react-router-dom";
import DashboardRoute from "../routes/dashboard";
import LoginRoute from "../routes/login";
import ServersRoute from "../routes/servers";
import { useAuth } from "../shared/hooks/useAuth";
import LoadingSpinner from "../shared/ui/LoadingSpinner";
import AppLayout from "./layout/AppLayout";

function App() {
	const { user, loading } = useAuth();

	if (loading) return <LoadingSpinner />;

	return (
		<Routes>
			<Route path="/login" element={!user ? <LoginRoute /> : <Navigate to="/" />} />
			<Route path="/" element={user ? <AppLayout /> : <Navigate to="/login" />}>
				<Route index element={<ServersRoute />} />
				<Route path="dashboard/:guildId" element={<DashboardRoute />} />
			</Route>
		</Routes>
	);
}

export default App;
