import Generate from './pages/Generate';
import Profile from './pages/Profile';
import Gallery from './pages/Gallery';
import Editor from './pages/Editor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Generate": Generate,
    "Profile": Profile,
    "Gallery": Gallery,
    "Editor": Editor,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};