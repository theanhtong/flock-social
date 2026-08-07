'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Search,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserProfile } from '@/services/user-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';

export function RightPanel() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);

  const [trendingTopics] = useState<Array<{ tag: string; postsCount: string }>>([]);
  const [suggestedUsers] = useState<Array<{ name: string; username: string; role: string }>>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    const timer = setTimeout(async () => {
      try {
        const results = await userService.searchUsers(searchQuery.trim(), token);
        const list: UserProfile[] = Array.isArray(results) ? results : (results as any)?.data || [];
        const filteredList = list.filter((u) => {
          if (currentUser?.id && String(u.id) === String(currentUser.id)) return false;
          if (currentUser?.username && u.username.toLowerCase() === currentUser.username.toLowerCase()) return false;
          return true;
        });
        setSearchResults(filteredList);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token, currentUser]);

  return (
    <>
      {/* Search */}
      <div ref={searchContainerRef} className="relative font-sans">
        <Input
          placeholder="Search Flock..."
          className="text-xs font-sans pr-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim()) setShowSearchDropdown(true);
          }}
        />
        {isSearching ? (
          <Loader2 className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 animate-spin" />
        ) : searchQuery ? (
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowSearchDropdown(false);
            }}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        )}

        {/* User Search Results Dropdown */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto font-sans">
            {isSearching ? (
              <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
              </div>
            ) : !Array.isArray(searchResults) || searchResults.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                No users found for "{searchQuery}"
              </div>
            ) : (
              <div className="py-1 divide-y divide-slate-800/50">
                {searchResults.map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    onClick={() => setShowSearchDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/70 transition-colors group"
                  >
                    <Avatar
                      src={u.avatarUrl}
                      name={u.displayName || u.username}
                      size="sm"
                      isVerified={u.isVerified}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                          {u.displayName || u.username}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        @{u.username}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
            Trending Topics
          </h3>
        </div>
        {trendingTopics.length === 0 ? (
          <span className="text-[11px] text-slate-500 font-sans">No trending topics yet</span>
        ) : (
          <div className="flex flex-col gap-2.5 font-sans">
            {trendingTopics.map((t, i) => (
              <div key={i} className="flex flex-col font-sans">
                <span className="text-xs font-semibold text-blue-400 hover:underline cursor-pointer font-sans">{t.tag}</span>
                <span className="text-[10px] text-slate-500 font-sans">{t.postsCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested People */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
        <div className="flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
            Suggested People
          </h3>
        </div>
        {suggestedUsers.length === 0 ? (
          <span className="text-[11px] text-slate-500 font-sans">No suggestions yet</span>
        ) : (
          suggestedUsers.map((u, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 font-sans">
              <div className="flex items-center gap-2 min-w-0 font-sans">
                <Avatar name={u.name} size="xs" />
                <div className="flex flex-col min-w-0 font-sans">
                  <span className="text-[11px] font-bold text-slate-200 truncate font-sans">{u.name}</span>
                  <span className="text-[10px] text-slate-400 font-sans truncate">@{u.username}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="px-2 py-0.5 text-[10px] font-sans">Follow</Button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
