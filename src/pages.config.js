/**
 * pages.config.js - Page routing configuration
 *
 * Page components are loaded lazily via React.lazy and wrapped with a
 * Suspense fallback (centered spinner) so each route code-splits.
 */
import React, { Suspense } from 'react';
import __Layout from './Layout.jsx';

const CenteredSpinner = () =>
  React.createElement('div', { className: 'fixed inset-0 flex items-center justify-center bg-background' },
    React.createElement('div', { className: 'w-8 h-8 border-4 border-border border-t-[#c7af48] rounded-full animate-spin' })
  );

const withSuspense = (LazyComp) => (props) =>
  React.createElement(Suspense, { fallback: React.createElement(CenteredSpinner) },
    React.createElement(LazyComp, props)
  );

const AdminClients = withSuspense(React.lazy(() => import('./pages/AdminClients')));
const AdminCourseEdit = withSuspense(React.lazy(() => import('./pages/AdminCourseEdit')));
const AdminCourses = withSuspense(React.lazy(() => import('./pages/AdminCourses')));
const AdminDashboard = withSuspense(React.lazy(() => import('./pages/AdminDashboard')));
const CourseView = withSuspense(React.lazy(() => import('./pages/CourseView')));
const Home = withSuspense(React.lazy(() => import('./pages/Home')));
const Index = withSuspense(React.lazy(() => import('./pages/Index')));


export const PAGES = {
    "AdminClients": AdminClients,
    "AdminCourseEdit": AdminCourseEdit,
    "AdminCourses": AdminCourses,
    "AdminDashboard": AdminDashboard,
    "CourseView": CourseView,
    "Home": Home,
    "Index": Index,
}

export const pagesConfig = {
    mainPage: "Index",
    Pages: PAGES,
    Layout: __Layout,
};