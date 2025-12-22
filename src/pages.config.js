import Editor from './pages/Editor';
import Generate from './pages/Generate';
import Gallery from './pages/Gallery';
import VideoEditor from './pages/VideoEditor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Generate": Generate,
    "Gallery": Gallery,
    "VideoEditor": VideoEditor,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};