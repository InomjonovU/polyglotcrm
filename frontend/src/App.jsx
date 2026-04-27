import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminLayout from './layouts/AdminLayout'
import TeacherLayout from './layouts/TeacherLayout'
import StudentLayout from './layouts/StudentLayout'
import ParentLayout from './layouts/ParentLayout'

// Shared
import GroupDetail from './pages/GroupDetail'
import Leaderboard from './pages/Leaderboard'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminStudents from './pages/admin/Students'
import AdminStudentDetail from './pages/admin/StudentDetail'
import AdminGroups from './pages/admin/Groups'
import AdminTeachers from './pages/admin/Teachers'
import AdminTeacherDetail from './pages/admin/TeacherDetail'
import AdminPayments from './pages/admin/Payments'
import AdminReports from './pages/admin/Reports'
import AdminSettings from './pages/admin/Settings'
import AdminSms from './pages/admin/Sms'
import AdminLeads from './pages/admin/Leads'
import AdminLibrary from './pages/admin/Library'

// Public pages
import ReceiptLookup from './pages/public/ReceiptLookup'
import ReceiptView from './pages/public/ReceiptView'

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherGroups from './pages/teacher/Groups'
import TeacherSalary from './pages/teacher/Salary'
import TeacherReferrals from './pages/teacher/Referrals'

// Client pages (used by both student and parent panels)
import StudentDashboard from './pages/student/Dashboard'
import StudentReferrals from './pages/student/Referrals'
import StudentGroups from './pages/student/Groups'
import StudentGroupDetail from './pages/student/GroupDetail'

function Home() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center">Yuklanmoqda...</div>
  if (!user) return <Navigate to="/login" />
  if (user.role === 'admin')   return <Navigate to="/admin" />
  if (user.role === 'teacher') return <Navigate to="/teacher" />
  if (user.role === 'student') return <Navigate to="/student" />
  if (user.role === 'parent')  return <Navigate to="/parent" />
  return <Navigate to="/login" />
}

function RoleRoute({ role, children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  const roles = Array.isArray(role) ? role : [role]
  if (!roles.includes(user.role)) return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Public receipt lookup — auth talab qilinmaydi */}
      <Route path="/chek" element={<ReceiptLookup />} />
      <Route path="/chek/:code" element={<ReceiptView />} />

      <Route path="/admin" element={<RoleRoute role="admin"><AdminLayout /></RoleRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:id" element={<AdminStudentDetail />} />
        <Route path="groups" element={<AdminGroups />} />
        <Route path="groups/:id" element={<GroupDetail />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="teachers/:id" element={<AdminTeacherDetail />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="leads" element={<AdminLeads />} />
        <Route path="library" element={<AdminLibrary />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="sms" element={<AdminSms />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="/teacher" element={<RoleRoute role="teacher"><TeacherLayout /></RoleRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="groups" element={<TeacherGroups />} />
        <Route path="groups/:id" element={<GroupDetail />} />
        <Route path="salary" element={<TeacherSalary />} />
        <Route path="referrals" element={<TeacherReferrals />} />
        <Route path="leaderboard" element={<Leaderboard />} />
      </Route>

      <Route path="/student" element={<RoleRoute role="student"><StudentLayout /></RoleRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="groups" element={<StudentGroups />} />
        <Route path="groups/:id" element={<StudentGroupDetail />} />
        <Route path="referrals" element={<StudentReferrals />} />
      </Route>

      <Route path="/parent" element={<RoleRoute role="parent"><ParentLayout /></RoleRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="groups" element={<StudentGroups />} />
        <Route path="groups/:id" element={<StudentGroupDetail />} />
        <Route path="referrals" element={<StudentReferrals />} />
      </Route>
    </Routes>
  )
}
