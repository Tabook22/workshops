import { createRoot } from 'react-dom/client';
import Home from '../app/page';
import Join from '../app/join/page';
import Presenter from './presenter-account';
import Project from '../app/project/page';
import Help from './help';
import About from '../app/about/page';
import '../app/globals.css';
import '../app/design-system.css';

const base = window.__WORKSHOP_BASE_PATH__ || '/workshops';
const route = location.pathname.slice(base.length).replace(/\/$/, '') || '/';
const Page = route === '/join' ? Join : route === '/presenter' ? Presenter : route === '/project' ? Project : route === '/about' ? About : Home;
createRoot(document.getElementById('root')!).render(<><Page />{route!=='/project'&&<Help/>}</>);
