import Editor from './pages/Editor';
import Gallery from './pages/Gallery';
import VideoEditor from './pages/VideoEditor';
import Generate from './pages/Generate';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Gallery": Gallery,
    "VideoEditor": VideoEditor,
    "Generate": Generate,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};