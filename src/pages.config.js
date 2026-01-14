import Editor from './pages/Editor';
import Gallery from './pages/Gallery';
import Generate from './pages/Generate';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Gallery": Gallery,
    "Generate": Generate,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Generate",
    Pages: PAGES,
    Layout: __Layout,
};