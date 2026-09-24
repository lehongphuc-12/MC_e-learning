import React from 'react';
import { Search, Flame, Clock, MessageSquare } from 'lucide-react';
import { ForumTopic } from '../types/forumTypes';
import { ForumTopicBadge } from './ForumTopicBadge';

interface ForumFilterBarProps {
  topics: ForumTopic[];
  selectedTopicId?: number;
  searchQuery: string;
  sortBy: 'latest' | 'hot' | 'most_commented';
  onSelectTopic: (topicId?: number) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sortBy: 'latest' | 'hot' | 'most_commented') => void;
}

export const ForumFilterBar: React.FC<ForumFilterBarProps> = ({
  topics,
  selectedTopicId,
  searchQuery,
  sortBy,
  onSelectTopic,
  onSearchChange,
  onSortChange,
}) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Search Input & Sort Dropdowns */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm bài viết, thảo luận theo từ khóa..."
            className="w-full rounded-2xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          />
        </div>

        {/* Sort Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl p-1 shrink-0 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => onSortChange('latest')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sortBy === 'latest'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Mới nhất</span>
          </button>

          <button
            type="button"
            onClick={() => onSortChange('hot')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sortBy === 'hot'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Sôi nổi</span>
          </button>

          <button
            type="button"
            onClick={() => onSortChange('most_commented')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sortBy === 'most_commented'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Nhiều bình luận</span>
          </button>
        </div>
      </div>

      {/* Topics Filter Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <ForumTopicBadge
          name="Tất cả chủ đề"
          active={!selectedTopicId}
          onClick={() => onSelectTopic(undefined)}
        />
        {topics.map((t) => (
          <ForumTopicBadge
            key={t.topicId}
            name={t.name}
            icon={t.icon}
            active={selectedTopicId === t.topicId}
            onClick={() => onSelectTopic(t.topicId)}
          />
        ))}
      </div>
    </div>
  );
};
