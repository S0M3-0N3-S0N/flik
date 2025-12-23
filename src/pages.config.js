import Editor from './pages/Editor';
import Gallery from './pages/Gallery';
import Generate from './pages/Generate';
import Profile from './pages/Profile';
import VideoEditor from './pages/VideoEditor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Gallery": Gallery,
    "Generate": Generate,
    "Profile": Profile,
    "VideoEditor": VideoEditor,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};