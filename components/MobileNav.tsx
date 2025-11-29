import React from 'react';
import { LayoutDashboard, Wallet, Repeat } from 'lucide-react';

type MainView = 'dashboard' | 'upfront' | 'recurring';

interface Props {
  mainView: MainView;
  setMainView: (view: MainView) => void;
}

const MobileNav: React.FC<Props> = ({ mainView, setMainView }) => {
  const navItems = [
    { id: 'dashboard', label: '概览', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'upfront', label: '一次性费用', icon: <Wallet className="w-5 h-5" /> },
    { id: 'recurring', label: '周期性费用', icon: <Repeat className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 shadow-t-lg z-30">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setMainView(item.id as MainView)}
            className={`flex flex-col items-center justify-center w-full transition-colors duration-200 relative pt-1
              ${mainView === item.id ? 'text-brand-blue-dark font-bold' : 'text-slate-500 hover:text-brand-blue'}
            `}
          >
            {mainView === item.id && <div className="absolute top-0 h-1 w-8 bg-brand-gold rounded-full"></div>}
            {item.icon}
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;