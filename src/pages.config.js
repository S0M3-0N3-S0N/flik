import Gallery from './pages/Gallery';
import Generate from './pages/Generate';
import VideoEditor from './pages/VideoEditor';
import Editor from './pages/Editor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Gallery": Gallery,
    "Generate": Generate,
    "VideoEditor": VideoEditor,
    "Editor": Editor,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};