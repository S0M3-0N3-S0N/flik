import Discover from './pages/Discover';
import Editor from './pages/Editor';
import Generate from './pages/Generate';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Discover": Discover,
    "Editor": Editor,
    "Generate": Generate,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Generate",
    Pages: PAGES,
    Layout: __Layout,
};