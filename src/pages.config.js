import Editor from './pages/Editor';
import Gallery from './pages/Gallery';
import Generate from './pages/Generate';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Gallery": Gallery,
    "Generate": Generate,
    "Profile": Profile,
    "LandingPage": LandingPage,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};