import { House, Search, Library } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';

interface Props {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function MobileBottomNav({ searchInputRef }: Props) {
  const currentView = usePlayerStore(s => s.currentView);
  const searchQuery = usePlayerStore(s => s.searchQuery);
  const setView = usePlayerStore(s => s.setView);
  const setSearchQuery = usePlayerStore(s => s.setSearchQuery);

  const getActiveTab = () => {
    if (currentView === 'home') return 'home';
    if (currentView === 'library' || currentView === 'playlist' || currentView === 'songs' || currentView === 'liked' || currentView === 'recent') return 'library';
    return 'home';
  };

  const activeTab = getActiveTab();

  const tabs = [
    {
      id: 'home',
      icon: House,
      label: 'Inicio',
      action: () => {
        setSearchQuery('');
        setView('home');
      },
    },
    {
      id: 'search',
      icon: Search,
      label: 'Buscar',
      action: () => {
        searchInputRef?.current?.focus();
      },
    },
    {
      id: 'library',
      icon: Library,
      label: 'Biblioteca',
      action: () => {
        setSearchQuery('');
        setView('library');
      },
    },
  ];

  return (
    <nav className="md:hidden h-14 bg-white border-t border-black/10 flex items-center justify-around px-2 flex-shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={tab.action}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-lg transition-colors ${
            activeTab === tab.id ? 'text-[#e91e63]' : 'text-[#999999]'
          }`}
        >
          <tab.icon size={20} />
          <span className="text-[10px] font-semibold">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
