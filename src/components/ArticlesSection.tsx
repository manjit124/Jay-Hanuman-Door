import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Clock,
  User,
  ArrowRight,
  X,
  ChevronRight,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Youtube,
  Search,
  Filter,
  SlidersHorizontal,
  Sparkles,
  Send,
  CornerDownRight,
  MessageCircle,
  ShieldCheck,
  ThumbsUp,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Article, ArticleComment, Door, BusinessSettings, UserProfile } from '../types.ts';
import { ProtectedImage } from './ProtectedImage.tsx';
import {
  fetchArticleDetails,
  registerArticleView,
  toggleArticleLike,
  registerArticleShare,
  submitArticleComment,
  fetchArticleComments,
  toggleUserArticleBookmark,
  fetchUserSavedArticles,
  getGuestSavedArticles,
} from '../lib/api.ts';

interface ArticlesSectionProps {
  articles: Article[];
  doors?: Door[];
  settings?: BusinessSettings;
  currentUser?: UserProfile | null;
  onOpenCalculator?: (door?: Door) => void;
  onOpenDoorDetail?: (door: Door) => void;
  onOpenAuth?: () => void;
}

// Generate unique viewer hash for deduplicated view counting
function getViewerHash(): string {
  let hash = localStorage.getItem('shivshahi_viewer_hash');
  if (!hash) {
    hash = 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    try {
      localStorage.setItem('shivshahi_viewer_hash', hash);
    } catch {}
  }
  return hash;
}

export const ArticlesSection: React.FC<ArticlesSectionProps> = ({
  articles: initialArticles,
  doors = [],
  settings,
  currentUser,
  onOpenCalculator,
  onOpenDoorDetail,
  onOpenAuth,
}) => {
  // Articles local state (so views, likes, comments update optimistically)
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  useEffect(() => {
    setArticles(initialArticles);
  }, [initialArticles]);

  // Active filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'views' | 'likes'>('latest');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Saved / Bookmarked Article IDs
  const [savedArticleIds, setSavedArticleIds] = useState<string[]>([]);

  // Reader Modal State
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleComments, setArticleComments] = useState<ArticleComment[]>([]);
  const [relatedDoors, setRelatedDoors] = useState<Door[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // User Like states: map of articleId -> boolean
  const [userLikedMap, setUserLikedMap] = useState<Record<string, boolean>>({});

  // Share menu open state
  const [shareMenuOpenArticleId, setShareMenuOpenArticleId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Lightbox for Gallery
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Comment submission form
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState<string | null>(null);
  const [commentErrorMsg, setCommentErrorMsg] = useState<string | null>(null);

  // Initialize saved articles
  useEffect(() => {
    const loadSaved = async () => {
      try {
        if (currentUser) {
          const res = await fetchUserSavedArticles();
          setSavedArticleIds(res.favoriteArticleIds || []);
        } else {
          setSavedArticleIds(getGuestSavedArticles());
        }
      } catch {
        setSavedArticleIds(getGuestSavedArticles());
      }
    };
    loadSaved();
  }, [currentUser]);

  // Pre-fill comment author name/email if user is logged in
  useEffect(() => {
    if (currentUser) {
      if (!commentName) setCommentName(currentUser.name);
      if (!commentEmail) setCommentEmail(currentUser.email);
    }
  }, [currentUser]);

  // Extract all categories & tags from articles
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(a => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [articles]);

  const allTagsList = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(a => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set).slice(0, 12);
  }, [articles]);

  // Filter and sort published articles
  const filteredArticles = useMemo(() => {
    return articles
      .filter(art => art.published !== false && art.status !== 'draft' && art.status !== 'archived')
      .filter(art => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = art.title.toLowerCase().includes(q);
          const matchExcerpt = (art.excerpt || '').toLowerCase().includes(q);
          const matchAuthor = (art.author || '').toLowerCase().includes(q);
          const matchTags = Array.isArray(art.tags) && art.tags.some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchExcerpt && !matchAuthor && !matchTags) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && art.category !== selectedCategory) {
          return false;
        }

        // Tag filter
        if (selectedTag !== 'all' && (!Array.isArray(art.tags) || !art.tags.includes(selectedTag))) {
          return false;
        }

        // Saved filter
        if (showSavedOnly && !savedArticleIds.includes(art.id)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'views') {
          return (b.views || 0) - (a.views || 0);
        }
        if (sortBy === 'likes') {
          return (b.likes || 0) - (a.likes || 0);
        }
        if (sortBy === 'popular') {
          const scoreA = (a.views || 0) + (a.likes || 0) * 3 + (a.commentCount || 0) * 5;
          const scoreB = (b.views || 0) + (b.likes || 0) * 3 + (b.commentCount || 0) * 5;
          return scoreB - scoreA;
        }
        // Latest (default)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [articles, searchQuery, selectedCategory, selectedTag, showSavedOnly, savedArticleIds, sortBy]);

  // Open Article Reader Modal
  const handleOpenArticle = async (article: Article) => {
    setSelectedArticle(article);
    setLoadingDetails(true);
    setCommentSuccessMsg(null);
    setCommentErrorMsg(null);
    setCommentContent('');

    // Automatically count article view with deduplicated hash
    const viewerHash = getViewerHash();
    registerArticleView(article.id, viewerHash)
      .then(res => {
        if (res.counted) {
          // Optimistically update view count in local state
          setArticles(prev =>
            prev.map(a => (a.id === article.id ? { ...a, views: res.views } : a))
          );
          setSelectedArticle(prev => (prev && prev.id === article.id ? { ...prev, views: res.views } : prev));
        }
      })
      .catch(console.error);

    // Fetch full details & comments
    try {
      const details = await fetchArticleDetails(article.slug || article.id);
      setSelectedArticle(details.article);
      setArticleComments(details.comments || []);
      setRelatedDoors(details.relatedDoors || []);
      setRelatedArticles(details.relatedArticles || []);
    } catch (err) {
      console.error('Failed to load article details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Toggle Like Handler
  const handleToggleLike = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const viewerHash = getViewerHash();
    const wasLiked = !!userLikedMap[articleId];

    // Optimistic UI update
    setUserLikedMap(prev => ({ ...prev, [articleId]: !wasLiked }));
    setArticles(prev =>
      prev.map(a => {
        if (a.id === articleId) {
          const cur = a.likes || 0;
          return { ...a, likes: wasLiked ? Math.max(0, cur - 1) : cur + 1 };
        }
        return a;
      })
    );
    if (selectedArticle && selectedArticle.id === articleId) {
      const cur = selectedArticle.likes || 0;
      setSelectedArticle({
        ...selectedArticle,
        likes: wasLiked ? Math.max(0, cur - 1) : cur + 1,
      });
    }

    try {
      const res = await toggleArticleLike(articleId, viewerHash);
      setUserLikedMap(prev => ({ ...prev, [articleId]: res.liked }));
      setArticles(prev =>
        prev.map(a => (a.id === articleId ? { ...a, likes: res.likes } : a))
      );
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle(prev => (prev ? { ...prev, likes: res.likes } : null));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert optimistic update on failure
      setUserLikedMap(prev => ({ ...prev, [articleId]: wasLiked }));
    }
  };

  // Toggle Bookmark / Save
  const handleToggleBookmark = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    try {
      const res = await toggleUserArticleBookmark(articleId);
      setSavedArticleIds(res.favoriteArticleIds);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  // Share Actions
  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'twitter' | 'copy', article: Article) => {
    const articleUrl = `${window.location.origin}/?view=articles&id=${article.slug || article.id}`;
    const shareText = `Check out this expert guide: "${article.title}" by Shivshahi Sagwan Doors!`;

    // Increment share counter in DB
    registerArticleShare(article.id, platform).then(res => {
      setArticles(prev =>
        prev.map(a => (a.id === article.id ? { ...a, shares: res.shares } : a))
      );
      if (selectedArticle && selectedArticle.id === article.id) {
        setSelectedArticle(prev => (prev ? { ...prev, shares: res.shares } : null));
      }
    }).catch(console.error);

    if (platform === 'whatsapp') {
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n\n' + articleUrl)}`,
        '_blank'
      );
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
        '_blank'
      );
    } else if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`,
        '_blank'
      );
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(articleUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch (err) {
        prompt('Copy guide link:', articleUrl);
      }
    }
    setShareMenuOpenArticleId(null);
  };

  // Submit Comment Handler
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;
    if (!commentContent.trim()) {
      setCommentErrorMsg('Please enter your comment before submitting.');
      return;
    }
    if (!commentName.trim()) {
      setCommentErrorMsg('Please provide your name.');
      return;
    }

    setSubmittingComment(true);
    setCommentErrorMsg(null);
    setCommentSuccessMsg(null);

    try {
      const res = await submitArticleComment(selectedArticle.id, {
        authorName: commentName.trim(),
        authorEmail: commentEmail.trim() || undefined,
        content: commentContent.trim(),
      });

      setCommentContent('');
      setCommentSuccessMsg(
        'Thank you! Your comment has been submitted and will appear once approved by our master craftsman moderation team.'
      );

      // Refresh comments
      const updatedComments = await fetchArticleComments(selectedArticle.id);
      setArticleComments(updatedComments);
    } catch (err: any) {
      setCommentErrorMsg(err.message || 'Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Top Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs tracking-wider uppercase">
          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
          Master Timber Knowledge Hub
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
          Door Guides & Wood Wisdom
        </h1>
        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Comprehensive buying checklists, authentic seasoned Sagwan maintenance advice, standard Indian doorway dimensions, and workshop craftsmanship secrets.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guides, wood types, maintenance tips..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs sm:text-sm focus:outline-none focus:border-amber-600 shadow-sm"
            >
              <option value="latest">Sort: Latest Published</option>
              <option value="popular">Sort: Most Popular</option>
              <option value="views">Sort: Most Viewed</option>
              <option value="likes">Sort: Most Liked</option>
            </select>
          </div>

          {/* Saved Bookmarks Toggle */}
          <div>
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`w-full py-2.5 px-3 rounded-xl border font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                showSavedOnly
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${showSavedOnly ? 'fill-white' : ''}`} />
              Saved Guides ({savedArticleIds.length})
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-500 font-semibold shrink-0">Categories:</span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200'
            }`}
          >
            All Guides ({articles.filter(a => a.published !== false).length})
          </button>
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Popular Tags */}
        {allTagsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-stone-500">
            <span className="font-semibold text-stone-400">Popular Topics:</span>
            {allTagsList.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  selectedTag === tag
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'bg-stone-200/70 text-stone-600 hover:bg-stone-300'
                }`}
              >
                #{tag}
              </button>
            ))}
            {selectedTag !== 'all' && (
              <button
                onClick={() => setSelectedTag('all')}
                className="text-amber-700 font-bold hover:underline ml-1"
              >
                Clear tag filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Articles */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-16 px-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
          <BookOpen className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-stone-800">
            No guides found matching your selection
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
            Try resetting your search query or selecting a different category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedTag('all');
              setShowSavedOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
          >
            Show All Articles
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredArticles.map(article => {
            const isSaved = savedArticleIds.includes(article.id);
            const isLiked = !!userLikedMap[article.id];

            return (
              <article
                key={article.id}
                id={`article-card-${article.id}`}
                onClick={() => handleOpenArticle(article)}
                className="group cursor-pointer bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Article Cover Image */}
                <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
                  <ProtectedImage
                    src={
                      article.image ||
                      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={article.title}
                    watermarkSettings={settings?.contentProtection}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full"
                  />

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-stone-900/80 backdrop-blur-md text-amber-400 font-bold text-[11px] border border-amber-500/30 shadow-md">
                      {article.category || 'Wood Guide'}
                    </span>
                    {article.youtubeVideoId && (
                      <span className="px-2 py-1 rounded-lg bg-red-600/90 backdrop-blur-md text-white font-bold text-[10px] flex items-center gap-1 shadow-md">
                        <Youtube className="w-3 h-3" />
                        Video
                      </span>
                    )}
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={e => handleToggleBookmark(e, article.id)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-stone-900/70 hover:bg-stone-900 text-white backdrop-blur-md shadow-md transition-transform active:scale-90"
                    title={isSaved ? 'Remove from Saved' : 'Save this Guide'}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : 'text-white'}`}
                    />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-xs text-stone-500 mb-2">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {article.readTime || '4 min read'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(article.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-stone-600 mt-2 line-clamp-3 leading-relaxed">
                      {article.excerpt || article.content?.substring(0, 140)}
                    </p>
                  </div>

                  {/* Real-time Engagement Metrics Bar (Section 1) */}
                  <div className="pt-3 border-t border-stone-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
                      {/* Views */}
                      <span
                        className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                        title="Total Views"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-400" />
                        <strong className="text-stone-700">
                          {(article.views || 0).toLocaleString('en-IN')}
                        </strong>{' '}
                        Views
                      </span>

                      {/* Likes (Interactive Toggle on Card) */}
                      <button
                        onClick={e => handleToggleLike(e, article.id)}
                        className="flex items-center gap-1 hover:text-rose-600 transition-colors p-1 -m-1 rounded-lg"
                        title="Like this guide"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isLiked
                              ? 'fill-rose-500 text-rose-500'
                              : 'text-stone-400 group-hover:text-rose-500'
                          }`}
                        />
                        <strong className={isLiked ? 'text-rose-600 font-bold' : 'text-stone-700'}>
                          {(article.likes || 0).toLocaleString('en-IN')}
                        </strong>
                      </button>

                      {/* Comments */}
                      <span
                        className="flex items-center gap-1 hover:text-sky-600 transition-colors"
                        title="Customer Comments"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                        <strong className="text-stone-700">
                          {(article.commentCount || 0).toLocaleString('en-IN')}
                        </strong>
                      </span>

                      {/* Shares */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShareMenuOpenArticleId(
                            shareMenuOpenArticleId === article.id ? null : article.id
                          );
                        }}
                        className="flex items-center gap-1 hover:text-emerald-600 transition-colors p-1 -m-1 rounded-lg relative"
                        title="Share Guide"
                      >
                        <Share2 className="w-3.5 h-3.5 text-stone-400" />
                        <strong className="text-stone-700">
                          {(article.shares || 0).toLocaleString('en-IN')}
                        </strong>

                        {/* Inline Share Popup */}
                        {shareMenuOpenArticleId === article.id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className="absolute right-0 bottom-7 z-20 w-44 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-2 text-stone-100 text-xs space-y-1 animate-in fade-in zoom-in-95"
                          >
                            <button
                              onClick={() => handleShare('whatsapp', article)}
                              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-stone-800 flex items-center gap-2 text-emerald-400 font-semibold text-left"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp
                            </button>
                            <button
                              onClick={() => handleShare('copy', article)}
                              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-stone-800 flex items-center gap-2 text-stone-200 text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-amber-500" />
                              {copiedLink ? 'Copied!' : 'Copy Link'}
                            </button>
                            <button
                              onClick={() => handleShare('facebook', article)}
                              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-stone-800 flex items-center gap-2 text-blue-400 text-left"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Facebook
                            </button>
                          </div>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-amber-700 group-hover:text-amber-800 pt-1">
                      <span>Read Complete Guide</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL SCREEN INTERACTIVE ARTICLE READER MODAL */}
      {/* ========================================================================= */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl text-stone-100 overflow-hidden my-4 max-h-[95vh] flex flex-col">
            {/* Reader Sticky Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-900/95 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {selectedArticle.category || 'Wood Craft Guide'}
                </span>
                <span className="text-xs text-stone-400 hidden sm:inline">
                  • {selectedArticle.readTime || '4 min read'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Save button */}
                <button
                  onClick={e => handleToggleBookmark(e, selectedArticle.id)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Bookmark Guide"
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      savedArticleIds.includes(selectedArticle.id)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-stone-300'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {savedArticleIds.includes(selectedArticle.id) ? 'Saved' : 'Save'}
                  </span>
                </button>

                {/* Close modal button */}
                <button
                  id="close-article-modal-btn"
                  onClick={() => setSelectedArticle(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Reader Content */}
            <div className="overflow-y-auto p-4 sm:p-8 space-y-8">
              {/* Featured Cover Image */}
              <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-xl">
                <ProtectedImage
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  watermarkSettings={settings?.contentProtection}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              </div>

              {/* Title & Author Meta */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-amber-400 font-medium">
                  <span>{selectedArticle.author || 'Shivshahi Wood Experts'}</span>
                  <span>•</span>
                  <span>{selectedArticle.readTime || '4 min read'}</span>
                  <span>•</span>
                  <span>
                    {new Date(selectedArticle.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                  {selectedArticle.title}
                </h1>

                {/* Author Credentials Card */}
                <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800/80 flex items-center gap-3 text-xs">
                  <div className="w-10 h-10 rounded-full bg-amber-600 text-stone-950 font-bold flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-200">
                      {selectedArticle.author || 'Shivshahi Wood Craftsman'}
                    </h4>
                    <p className="text-stone-400 text-[11px]">
                      {selectedArticle.authorBio ||
                        'Specialist timber craftsman with 25+ years experience in seasoned Sagwan wood and custom door manufacturing.'}
                    </p>
                  </div>
                </div>

                {/* Real-time Interactive Engagement Bar inside Reader (Section 1) */}
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/80 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                  <div className="flex items-center gap-6">
                    {/* Views */}
                    <span className="flex items-center gap-1.5 text-stone-300" title="Deduplicated Views">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <strong className="text-white text-sm">
                        {(selectedArticle.views || 0).toLocaleString('en-IN')}
                      </strong>{' '}
                      Views
                    </span>

                    {/* Like Button with Animation */}
                    <button
                      onClick={e => handleToggleLike(e, selectedArticle.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                        userLikedMap[selectedArticle.id]
                          ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/40'
                          : 'bg-stone-900 border-stone-700 text-stone-300 hover:text-white'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          userLikedMap[selectedArticle.id]
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-stone-400'
                        }`}
                      />
                      <strong className="text-sm">
                        {(selectedArticle.likes || 0).toLocaleString('en-IN')}
                      </strong>{' '}
                      Likes
                    </button>

                    {/* Comments Count */}
                    <span className="flex items-center gap-1.5 text-stone-300">
                      <MessageSquare className="w-4 h-4 text-sky-400" />
                      <strong className="text-white text-sm">
                        {(selectedArticle.commentCount || articleComments.length).toLocaleString('en-IN')}
                      </strong>{' '}
                      Comments
                    </span>
                  </div>

                  {/* Share Menu */}
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[11px] font-sans">Share:</span>
                    <button
                      onClick={() => handleShare('whatsapp', selectedArticle)}
                      className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                      title="Share on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleShare('facebook', selectedArticle)}
                      className="p-2 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-400 hover:bg-blue-900/60 transition-colors"
                      title="Share on Facebook"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleShare('copy', selectedArticle)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 hover:text-white transition-colors flex items-center gap-1.5"
                      title="Copy Link"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-500" />
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* YouTube Video Section (if attached) */}
              {selectedArticle.youtubeVideoId && (
                <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-5 h-5 text-red-500" />
                      <h3 className="font-serif text-base font-bold text-white">
                        {selectedArticle.youtubeTitle || 'Woodworking Tutorial & Factory Video'}
                      </h3>
                    </div>

                    <a
                      href={`https://www.youtube.com/watch?v=${selectedArticle.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="aspect-video rounded-xl overflow-hidden border border-stone-800 bg-stone-900 shadow-lg">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${selectedArticle.youtubeVideoId}`}
                      title={selectedArticle.youtubeTitle || 'Woodworking Video'}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {selectedArticle.youtubeDescription && (
                    <p className="text-stone-400 text-xs leading-relaxed">
                      {selectedArticle.youtubeDescription}
                    </p>
                  )}
                </div>
              )}

              {/* Article Content with clean typography */}
              <div className="prose prose-invert prose-amber max-w-none text-stone-200 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line font-sans">
                {selectedArticle.content}
              </div>

              {/* Photo Gallery (if present) */}
              {Array.isArray(selectedArticle.gallery) && selectedArticle.gallery.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-stone-800">
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Guide Image Gallery & Grain Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedArticle.gallery.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setLightboxImage(img.url)}
                        className="cursor-pointer group aspect-video rounded-xl overflow-hidden border border-stone-800 bg-stone-950 relative"
                      >
                        <img
                          src={img.url}
                          alt={img.caption || 'Timber grain detail'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {img.caption && (
                          <div className="absolute bottom-0 inset-x-0 bg-stone-950/80 p-1.5 text-[10px] text-stone-300 truncate">
                            {img.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Related Doors Featured In This Guide */}
              {relatedDoors.length > 0 && (
                <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-white">
                        Doors Featured in This Guide
                      </h3>
                      <p className="text-xs text-stone-400">
                        Crafted to custom specifications with seasoned CP Sagwan Teak Wood
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {relatedDoors.map(door => (
                      <div
                        key={door.id}
                        className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center gap-3 group hover:border-amber-500/50 transition-colors"
                      >
                        <img
                          src={
                            door.images?.[0] ||
                            'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80'
                          }
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0 border border-stone-700"
                        />
                        <div className="space-y-1 flex-1 overflow-hidden">
                          <h4 className="font-bold text-xs text-stone-100 truncate">{door.name}</h4>
                          <span className="font-mono text-xs font-bold text-amber-400 block">
                            ₹{door.startingPrice?.toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedArticle(null);
                              if (onOpenCalculator) onOpenCalculator(door);
                            }}
                            className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
                          >
                            Calculate Price
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Call-to-Action Banner */}
              {selectedArticle.cta?.enabled !== false && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/70 border border-amber-500/40 space-y-3 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-stone-950 uppercase">
                        Shivshahi Guarantee
                      </span>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                        {selectedArticle.cta?.title || 'Calculate Door Price For Your Custom Size'}
                      </h3>
                      <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
                        {selectedArticle.cta?.subtitle ||
                          'Get transparent, instant pricing for kiln-seasoned CP Sagwan Teak Wood, customized Chaukhat frames, and PU polish.'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedArticle(null);
                        if (onOpenCalculator) {
                          onOpenCalculator();
                        }
                      }}
                      className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm whitespace-nowrap shadow-lg shadow-amber-950/50 active:scale-95 transition-all self-start sm:self-center"
                    >
                      {selectedArticle.cta?.buttonText || 'Open Door Price Calculator'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tags Section */}
              {Array.isArray(selectedArticle.tags) && selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs text-stone-500">Tags:</span>
                  {selectedArticle.tags.map(t => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* =============================================================== */}
              {/* COMMENT SYSTEM & DISCUSSION (Section 5) */}
              {/* =============================================================== */}
              <div className="pt-8 border-t border-stone-800 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-500" />
                    <h3 className="font-serif text-xl font-bold text-white">
                      Customer Discussion & Questions ({articleComments.length})
                    </h3>
                  </div>
                </div>

                {/* Comment Submission Form */}
                <form
                  onSubmit={handleCommentSubmit}
                  className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4"
                >
                  <h4 className="font-bold text-sm text-stone-200">
                    Ask a Question or Share Your Experience
                  </h4>

                  {commentSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{commentSuccessMsg}</span>
                    </div>
                  )}

                  {commentErrorMsg && (
                    <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{commentErrorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 text-xs mb-1">
                        Your Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={commentName}
                        onChange={e => setCommentName(e.target.value)}
                        placeholder="e.g. Rajesh Kulkarni"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 text-xs mb-1">
                        Email Address (Private, for response notifications)
                      </label>
                      <input
                        type="email"
                        value={commentEmail}
                        onChange={e => setCommentEmail(e.target.value)}
                        placeholder="rajesh@example.com"
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 text-xs mb-1">
                      Your Comment / Wood Inquiry <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={commentContent}
                      onChange={e => setCommentContent(e.target.value)}
                      placeholder="Ask about wood seasoning, custom sizes, termite treatments, or door maintenance..."
                      required
                      className="w-full p-3 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs leading-relaxed focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                      Comments are verified by our wood craftsmen before appearing publicly.
                    </p>

                    <button
                      type="submit"
                      disabled={submittingComment}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Submit Comment
                    </button>
                  </div>
                </form>

                {/* Approved Comments List */}
                <div className="space-y-3">
                  {articleComments.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-stone-950/40 border border-stone-800/60 text-stone-400 space-y-1 text-xs">
                      <p className="font-semibold text-stone-300">Be the first to comment on this guide!</p>
                      <p className="text-[11px] text-stone-500">
                        Have questions about wood selection or door maintenance? Post above.
                      </p>
                    </div>
                  ) : (
                    articleComments.map(c => (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl bg-stone-950 border border-stone-800/80 space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-700 text-stone-100 font-bold text-[11px] flex items-center justify-center">
                              {c.authorName.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-bold text-stone-200">{c.authorName}</span>
                            <span className="text-[10px] text-stone-500">
                              •{' '}
                              {new Date(c.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        <p className="text-stone-300 leading-relaxed whitespace-pre-wrap pl-8">
                          {c.content}
                        </p>

                        {/* Official Admin / Craftsman Reply */}
                        {c.adminReply && (
                          <div className="ml-8 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-amber-400">
                              <CornerDownRight className="w-3.5 h-3.5" />
                              <span>{c.adminReply.authorName || 'Shivshahi Wood Specialists'}</span>
                              <span className="text-[10px] text-stone-500 font-normal">
                                • {new Date(c.adminReply.repliedAt).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <p className="text-stone-300 pl-5 leading-relaxed">
                              {c.adminReply.text}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Related Articles Carousel / Grid */}
              {relatedArticles.length > 0 && (
                <div className="pt-8 border-t border-stone-800 space-y-4">
                  <h3 className="font-serif text-lg font-bold text-white">
                    More Door Guides You May Like
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relatedArticles.map(rel => (
                      <div
                        key={rel.id}
                        onClick={() => handleOpenArticle(rel)}
                        className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 cursor-pointer flex items-center gap-3 transition-colors"
                      >
                        <img
                          src={rel.image}
                          alt=""
                          className="w-16 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-stone-200 line-clamp-1 hover:text-amber-400">
                            {rel.title}
                          </h4>
                          <span className="text-[10px] text-stone-500 font-mono mt-1 block">
                            👁 {rel.views || 0} views • ❤️ {rel.likes || 0} likes
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Bar */}
            <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-900/95 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Crafted with care by Shivshahi Sagwan Door Manufacturing
              </span>

              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Gallery Photos */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt=""
              className="w-full h-full object-contain rounded-xl shadow-2xl border border-stone-800"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-stone-900/80 text-white hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
