import Generate from './pages/Generate';
import Profile from './pages/Profile';
import Editor from './pages/Editor';
import Discover from './pages/Discover';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Generate": Generate,
    "Profile": Profile,
    "Editor": Editor,
    "Discover": Discover,
}

export const pagesConfig = {
    mainPage: "Generate",
    Pages: PAGES,
    Layout: __Layout,
};