import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import DataValidationPage from './pages/DataValidationPage'
import DashboardPage from './pages/DashboardPage'
import OlapExplorerPage from './pages/OlapExplorerPage'
import ReportDetailPage from './pages/ReportDetailPage'
import ReportMenuPage from './pages/ReportMenuPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'olap', element: <OlapExplorerPage /> },
      { path: 'reports', element: <ReportMenuPage /> },
      { path: 'reports/:id', element: <ReportDetailPage /> },
      { path: 'compare', element: <DataValidationPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
