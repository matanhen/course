import AdminClients from './pages/AdminClients';
import AdminCourseEdit from './pages/AdminCourseEdit';
import AdminCourses from './pages/AdminCourses';
import AdminDashboard from './pages/AdminDashboard';
import CourseView from './pages/CourseView';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminClients": AdminClients,
    "AdminCourseEdit": AdminCourseEdit,
    "AdminCourses": AdminCourses,
    "AdminDashboard": AdminDashboard,
    "CourseView": CourseView,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "AdminClients",
    Pages: PAGES,
    Layout: __Layout,
};