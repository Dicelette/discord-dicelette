import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";
import { useAuth } from "./hooks/useAuth";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ServerSelectPage from "./pages/ServerSelectPage";

function App() {
	const { user, loading } = useAuth();

	if (loading) return <LoadingSpinner />;

	return (
		<Routes>
			<Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
			<Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
				<Route index element={<ServerSelectPage />} />
				<Route path="dashboard/:guildId" element={<DashboardPage />} />
			</Route>
		</Routes>
	);
}

export default App;
