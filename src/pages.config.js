import Editor from './pages/Editor';
import Generate from './pages/Generate';
import VideoEditor from './pages/VideoEditor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Editor": Editor,
    "Generate": Generate,
    "VideoEditor": VideoEditor,
}

export const pagesConfig = {
    mainPage: "Editor",
    Pages: PAGES,
    Layout: __Layout,
};