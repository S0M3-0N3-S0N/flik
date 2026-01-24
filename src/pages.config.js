import Discover from './pages/Discover';
import Editor from './pages/Editor';
import Generate from './pages/Generate';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Discover": Discover,
    "Editor": Editor,
    "Generate": Generate,
    "Profile": Profile,
    "Messages": Messages,
}

export const pagesConfig = {
    mainPage: "Generate",
    Pages: PAGES,
    Layout: __Layout,
};