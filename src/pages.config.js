import Editor from './pages/Editor';
import Gallery from './pages/Gallery';
import Generate from './pages/Generate';
import VideoEditor from './pages/VideoEditor';
import IMPROVEMENTS from './pages/IMPROVEMENTS';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Gallery": Gallery,
    "Generate": Generate,
    "VideoEditor": VideoEditor,
    "IMPROVEMENTS": IMPROVEMENTS,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};