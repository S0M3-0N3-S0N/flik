import Editor from './pages/Editor';
import Generate from './pages/Generate';
import Discover from './pages/Discover';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import FollowFeed from './pages/FollowFeed';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Generate": Generate,
    "Discover": Discover,
    "Profile": Profile,
    "Messages": Messages,
    "Notifications": Notifications,
    "FollowFeed": FollowFeed,
}

export const pagesConfig = {
    mainPage: "Generate",
    Pages: PAGES,
    Layout: __Layout,
};