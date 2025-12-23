import Gallery from './pages/Gallery';
import Editor from './pages/Editor';
import Generate from './pages/Generate';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Gallery": Gallery,
    "Editor": Editor,
    "Generate": Generate,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};