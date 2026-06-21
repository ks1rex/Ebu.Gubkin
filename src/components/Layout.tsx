import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* decorative blurred orbs — fixed, behind everything, never intercept clicks */}
      <div className="fixed -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-[#7c3aed] opacity-55 blur-[80px] pointer-events-none" />
      <div className="fixed top-10 -right-32 w-[380px] h-[380px] rounded-full bg-[#db2777] opacity-40 blur-[80px] pointer-events-none" />
      <div className="fixed -bottom-52 left-[38%] w-[460px] h-[460px] rounded-full bg-[#0ea5e9] opacity-30 blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
