import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import MarketLayout from './components/MarketLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home          from './pages/Home'
import Forum         from './pages/Forum'
import ForumCategory from './pages/ForumCategory'
import ForumThread   from './pages/ForumThread'
import Market        from './pages/Market'
import Gost          from './pages/Gost'
import GostLayout    from './components/GostLayout'
import Wallet        from './pages/Wallet'
import Profile       from './pages/Profile'
import Login         from './pages/Login'
import Register      from './pages/Register'
import AdminLayout      from './pages/Admin'
import AdminDashboard   from './pages/Admin/Dashboard'
import AdminFinance     from './pages/Admin/Finance'
import AdminDeposits    from './pages/Admin/Deposits'
import AdminWithdrawals from './pages/Admin/Withdrawals'
import AdminDisputes    from './pages/Admin/Disputes'
import AdminForumMod    from './pages/Admin/ForumMod'
import AdminUsers       from './pages/Admin/Users'
import AdminSettings    from './pages/Admin/Settings'
import OrderFeed        from './pages/OrderFeed'
import MyOrders         from './pages/MyOrders'
import AppliedOrders    from './pages/AppliedOrders'
import NewOrder         from './pages/NewOrder'
import OrderDetail      from './pages/OrderDetail'
import Applications     from './pages/Applications'
import OrderChat        from './pages/OrderChat'
import ServicesCatalog  from './pages/ServicesCatalog'
import ServiceDetail    from './pages/ServiceDetail'
import ServiceNew       from './pages/ServiceNew'
import ServiceEdit      from './pages/ServiceEdit'
import ServicesMine     from './pages/ServicesMine'
import UserProfile      from './pages/UserProfile'
import GostChat         from './pages/GostChat'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <Construction size={44} className="text-subtle mb-4" />
      <h1 className="text-xl font-semibold text-ink mb-2">Страница не найдена</h1>
      <p className="text-subtle text-sm">Возможно, она ещё в разработке</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index                         element={<Home />} />
            <Route path="forum"                element={<Forum />} />
            <Route path="forum/category/:id"   element={<ForumCategory />} />
            <Route path="forum/thread/:id"     element={<ForumThread />} />
            <Route path="market"  element={<Market />} />
            <Route path="market" element={<MarketLayout />}>
              <Route path="orders"                   element={<ProtectedRoute><OrderFeed /></ProtectedRoute>} />
              <Route path="orders/new"               element={<ProtectedRoute><NewOrder /></ProtectedRoute>} />
              <Route path="orders/mine"              element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
              <Route path="orders/applied"           element={<ProtectedRoute><AppliedOrders /></ProtectedRoute>} />
              <Route path="orders/:id"               element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="orders/:id/applications"  element={<ProtectedRoute><Applications /></ProtectedRoute>} />
              <Route path="orders/:id/chat"          element={<ProtectedRoute><OrderChat /></ProtectedRoute>} />
              <Route path="services"                 element={<ServicesCatalog />} />
              <Route path="services/new"             element={<ProtectedRoute><ServiceNew /></ProtectedRoute>} />
              <Route path="services/mine"            element={<ProtectedRoute><ServicesMine /></ProtectedRoute>} />
              <Route path="services/:id"             element={<ServiceDetail />} />
              <Route path="services/:id/edit"        element={<ProtectedRoute><ServiceEdit /></ProtectedRoute>} />
              <Route path="users/:id"                element={<UserProfile />} />
            </Route>
            <Route path="gost" element={<GostLayout />}>
              <Route index element={<Gost />} />
            </Route>
            <Route path="gost/chat/:id" element={<ProtectedRoute><GostChat /></ProtectedRoute>} />
            <Route path="wallet"  element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="login"    element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index                   element={<AdminDashboard />} />
              <Route path="finance"          element={<AdminFinance />} />
              <Route path="deposits"         element={<AdminDeposits />} />
              <Route path="withdrawals"      element={<AdminWithdrawals />} />
              <Route path="disputes"         element={<AdminDisputes />} />
              <Route path="forum"            element={<AdminForumMod />} />
              <Route path="users"            element={<AdminUsers />} />
              <Route path="settings"         element={<AdminSettings />} />
            </Route>
            <Route path="*"        element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
