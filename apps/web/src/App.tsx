import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import ServerSelectPage from "./pages/ServerSelectPage";
import DashboardPage from "./pages/DashboardPage";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";

function App() {
	const { user, loading } = useAuth();

	if (loading) return <LoadingSpinner />;

	return (
		<Routes>
			<Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
			<Route
				path="/"
				element={user ? <Layout /> : <Navigate to="/login" />}
			>
				<Route index element={<ServerSelectPage />} />
				<Route path="dashboard/:guildId" element={<DashboardPage />} />
			</Route>
		</Routes>
	);
}

export default App;
