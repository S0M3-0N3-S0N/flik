import Gallery from './pages/Gallery';
import Generate from './pages/Generate';
import Editor from './pages/Editor';
import VideoEditor from './pages/VideoEditor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Gallery": Gallery,
    "Generate": Generate,
    "Editor": Editor,
    "VideoEditor": VideoEditor,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};