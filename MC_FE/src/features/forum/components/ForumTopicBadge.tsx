import React from 'react';
import { MessageSquare, Mic, HelpCircle, Briefcase, Tag } from 'lucide-react';

interface ForumTopicBadgeProps {
  name: string;
  icon?: string;
  onClick?: () => void;
  active?: boolean;
}

export const ForumTopicBadge: React.FC<ForumTopicBadgeProps> = ({ name, icon, onClick, active }) => {
  const getIcon = () => {
    switch (icon) {
      case 'Mic':
        return <Mic className="h-3.5 w-3.5" />;
      case 'HelpCircle':
        return <HelpCircle className="h-3.5 w-3.5" />;
      case 'Briefcase':
        return <Briefcase className="h-3.5 w-3.5" />;
      case 'MessageSquare':
      default:
        return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
        active
          ? 'bg-[#03163f] text-white shadow-md shadow-[#03163f]/20 scale-105'
          : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-300/50'
      }`}
    >
      {getIcon()}
      <span>{name}</span>
    </button>
  );
};
