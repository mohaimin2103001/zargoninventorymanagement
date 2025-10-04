'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notice {
  _id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
}

interface NoticeBannerProps {
  className?: string;
}

export function NoticeBanner({ className }: NoticeBannerProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissedNotices, setDismissedNotices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load dismissed notices from localStorage
    const savedDismissed = localStorage.getItem('dismissedNotices');
    if (savedDismissed) {
      try {
        const parsed = JSON.parse(savedDismissed);
        setDismissedNotices(new Set(parsed));
      } catch (error) {
        console.error('Failed to parse dismissed notices:', error);
      }
    }
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        // Backend returns { success: true, data: notices[], pagination: {...} }
        const data = result.data || result;
        const noticesArray = Array.isArray(data) ? data : [];
        setNotices(noticesArray.filter((notice: Notice) => notice.isActive));
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      setNotices([]); // Ensure notices is always an array
    } finally {
      setLoading(false);
    }
  };

  const dismissNotice = (noticeId: string) => {
    const newDismissed = new Set([...dismissedNotices, noticeId]);
    setDismissedNotices(newDismissed);
    // Save to localStorage
    localStorage.setItem('dismissedNotices', JSON.stringify([...newDismissed]));
  };

  const getNoticeIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5" />;
      case 'high':
        return <AlertCircle className="w-5 h-5" />;
      case 'medium':
        return <Info className="w-5 h-5" />;
      case 'low':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getNoticeStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-500 text-red-800 border-l-4';
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-800 border-l-4';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800 border-l-4';
      case 'low':
        return 'bg-blue-100 border-blue-500 text-blue-800 border-l-4';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800 border-l-4';
    }
  };

  const activeNotices = notices.filter(notice => !dismissedNotices.has(notice._id));

  if (loading || activeNotices.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {activeNotices.map((notice) => (
        <div
          key={notice._id}
          className={cn(
            "p-4 rounded-lg flex items-start space-x-3 relative",
            getNoticeStyles(notice.priority)
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getNoticeIcon(notice.priority)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {notice.title}
                <span className="ml-2 text-xs font-normal opacity-75">
                  [{notice.priority.toUpperCase()}]
                </span>
              </h4>
              <button
                onClick={() => dismissNotice(notice._id)}
                className="flex-shrink-0 ml-2 p-1 rounded hover:bg-black/10 transition-colors"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm mt-1">{notice.content}</p>
            {notice.expiresAt && (
              <p className="text-xs mt-2 opacity-75">
                Expires: {new Date(notice.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
