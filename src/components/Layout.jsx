import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';

const Layout = ({ children }) => {
    const location = useLocation();

    return (
        <div className="layout">
            <TopBar />
            <main key={location.pathname} className="content page-fade-in">
                {children}
            </main>

            <style>{`
                .layout { min-height: 100vh; }
                .page-fade-in {
                    animation: pageFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes pageFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Layout;
