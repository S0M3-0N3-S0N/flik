import Editor from './pages/Editor';
import Generate from './pages/Generate';
import Profile from './pages/Profile';
import Gallery from './pages/Gallery';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Generate": Generate,
    "Profile": Profile,
    "Gallery": Gallery,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};