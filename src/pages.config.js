import Generate from './pages/Generate';
import Editor from './pages/Editor';
import Gallery from './pages/Gallery';
import VideoEditor from './pages/VideoEditor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Generate": Generate,
    "Editor": Editor,
    "Gallery": Gallery,
    "VideoEditor": VideoEditor,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};