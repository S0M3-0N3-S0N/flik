import Discover from './pages/Discover';
import Generate from './pages/Generate';
import Profile from './pages/Profile';
import Editor from './pages/Editor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Discover": Discover,
    "Generate": Generate,
    "Profile": Profile,
    "Editor": Editor,
}

export const pagesConfig = {
    mainPage: "Generate",
    Pages: PAGES,
    Layout: __Layout,
};