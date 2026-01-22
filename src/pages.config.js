import Editor from './pages/Editor';
import Profile from './pages/Profile';
import Generate from './pages/Generate';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Profile": Profile,
    "Generate": Generate,
}

export const pagesConfig = {
    mainPage: "Generate",
    Pages: PAGES,
    Layout: __Layout,
};