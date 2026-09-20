import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  MessageSquare,
  Share2,
  Video,
  Youtube,
  Search,
  Filter,
  BarChart3,
  MessageCircle,
  Calendar,
  Send,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Link,
  Tag,
  User,
  Sliders,
  Check,
  Globe,
  CornerDownRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  Article,
  ArticleComment,
  ArticleCategory,
  ArticleAnalyticsSummary,
  Door,
  BusinessSettings,
} from '../types.ts';
import {
  fetchAdminArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  fetchAdminArticleComments,
  moderateArticleComment,
  replyToArticleComment,
  deleteArticleComment,
  fetchArticleAnalytics,
  fetchAdminArticleCategories,
  createArticleCategory,
  updateArticleCategory,
  deleteArticleCategory,
  uploadImage,
} from '../lib/api.ts';

interface AdminArticlesTabProps {
  doors: Door[];
  settings?: BusinessSettings;
  onDataUpdated?: () => void;
}

export const AdminArticlesTab: React.FC<AdminArticlesTabProps> = ({
  doors,
  settings,
  onDataUpdated,
}) => {
  // Sub-tabs: 'articles' | 'comments' | 'analytics' | 'categories'
  const [subTab, setSubTab] = useState<'articles' | 'comments' | 'analytics' | 'categories'>('articles');

  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [comments, setComments] = useState<(ArticleComment & { articleTitle?: string; articleSlug?: string })[]>([]);
  const [commentCounts, setCommentCounts] = useState<{ all: number; pending: number; approved: number; hidden: number; spam: number }>({
    all: 0,
    pending: 0,
    approved: 0,
    hidden: 0,
    spam: 0,
  });
  const [analytics, setAnalytics] = useState<ArticleAnalyticsSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters for Articles
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'scheduled' | 'archived'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Filters for Comments
  const [commentStatusFilter, setCommentStatusFilter] = useState<'all' | 'pending' | 'approved' | 'hidden' | 'spam'>('pending');
  const [commentSearch, setCommentSearch] = useState('');

  // Modal / Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'basic' | 'content' | 'media' | 'cta' | 'seo'>('basic');
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  // Reply Modal / Inline state
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ArticleCategory | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');

  // Article Form State
  const initialFormState = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    gallery: [] as { url: string; caption?: string; altText?: string }[],
    author: 'Shivshahi Wood Experts',
    authorPhoto: '',
    authorBio: 'Master woodworking craftspersons and timber seasoning specialists.',
    category: 'Door Guide',
    categoryId: '',
    tags: ['Sagwan Door', 'Teak Wood', 'Buying Guide'],
    tagsInput: 'Sagwan Door, Teak Wood, Buying Guide',
    readTime: '4 min read',
    status: 'published' as 'draft' | 'published' | 'scheduled' | 'archived',
    scheduledAt: '',
    notifySubscribers: false,
    youtubeUrl: '',
    youtubeVideoId: '',
    youtubeTitle: '',
    youtubeDescription: '',
    relatedDoorIds: [] as string[],
    cta: {
      enabled: true,
      type: 'calculator' as 'calculator' | 'contact' | 'custom',
      title: 'Calculate Door Price For Your Custom Size',
      subtitle: 'Instant estimate including seasoned teak wood, chaukhat frame, and PU polish.',
      buttonText: 'Open Door Calculator',
      customUrl: '',
    },
    seo: {
      seoTitle: '',
      metaDescription: '',
      focusKeyword: '',
      canonicalUrl: '',
    },
  };

  const [formData, setFormData] = useState(initialFormState);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [artData, catData, commData, anaData] = await Promise.all([
        fetchAdminArticles(),
        fetchAdminArticleCategories(),
        fetchAdminArticleComments({ status: commentStatusFilter }),
        fetchArticleAnalytics().catch(() => null),
      ]);
      setArticles(artData);
      setCategories(catData);
      setComments(commData.comments);
      setCommentCounts(commData.counts);
      if (anaData) setAnalytics(anaData);
    } catch (err: any) {
      console.error('Error loading admin blog data:', err);
      setErrorMessage(err.message || 'Failed to load blog data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (subTab === 'comments') {
      fetchAdminArticleComments({ status: commentStatusFilter })
        .then(res => {
          setComments(res.comments);
          setCommentCounts(res.counts);
        })
        .catch(console.error);
    }
  }, [commentStatusFilter, subTab]);

  // Helper to extract YouTube video ID
  const extractYoutubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : '';
  };

  // Helper to auto-calculate reading time
  const autoCalculateReadTime = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 180));
    return `${minutes} min read`;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingArticleId(null);
    setFormData(initialFormState);
    setActiveEditorTab('basic');
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (art: Article) => {
    setEditingArticleId(art.id);
    setFormData({
      title: art.title || '',
      slug: art.slug || '',
      excerpt: art.excerpt || '',
      content: art.content || '',
      image: art.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      gallery: Array.isArray(art.gallery) ? art.gallery : [],
      author: art.author || 'Shivshahi Wood Experts',
      authorPhoto: art.authorPhoto || '',
      authorBio: art.authorBio || 'Master woodworking craftspersons and timber seasoning specialists.',
      category: art.category || 'Door Guide',
      categoryId: art.categoryId || '',
      tags: Array.isArray(art.tags) ? art.tags : ['Sagwan Door'],
      tagsInput: Array.isArray(art.tags) ? art.tags.join(', ') : 'Sagwan Door',
      readTime: art.readTime || '4 min read',
      status: art.status || (art.published ? 'published' : 'draft'),
      scheduledAt: art.scheduledAt ? art.scheduledAt.substring(0, 16) : '',
      notifySubscribers: false,
      youtubeUrl: art.youtubeUrl || (art.youtubeVideoId ? `https://www.youtube.com/watch?v=${art.youtubeVideoId}` : ''),
      youtubeVideoId: art.youtubeVideoId || '',
      youtubeTitle: art.youtubeTitle || '',
      youtubeDescription: art.youtubeDescription || '',
      relatedDoorIds: Array.isArray(art.relatedDoorIds) ? art.relatedDoorIds : [],
      cta: {
        enabled: art.cta?.enabled !== false,
        type: art.cta?.type || 'calculator',
        title: art.cta?.title || 'Calculate Door Price For Your Custom Size',
        subtitle: art.cta?.subtitle || 'Instant estimate including seasoned teak wood, chaukhat frame, and PU polish.',
        buttonText: art.cta?.buttonText || 'Open Door Calculator',
        customUrl: art.cta?.customUrl || '',
      },
      seo: {
        seoTitle: art.seo?.seoTitle || art.title,
        metaDescription: art.seo?.metaDescription || art.excerpt || '',
        focusKeyword: art.seo?.focusKeyword || '',
        canonicalUrl: art.seo?.canonicalUrl || '',
      },
    });
    setActiveEditorTab('basic');
    setIsEditorOpen(true);
  };

  // Image file upload handler
  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      setFormData(prev => ({ ...prev, image: res.url }));
      showToast('Featured image uploaded successfully');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Gallery image upload handler
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const newItems: { url: string; caption?: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImage(files[i]);
        newItems.push({ url: res.url, caption: '' });
      }
      setFormData(prev => ({
        ...prev,
        gallery: [...prev.gallery, ...newItems],
      }));
      showToast(`Uploaded ${newItems.length} gallery photos`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload gallery images');
    } finally {
      setUploadingGallery(false);
    }
  };

  // Save Article
  const handleSaveArticle = async () => {
    if (!formData.title.trim()) {
      alert('Article title is required');
      setActiveEditorTab('basic');
      return;
    }

    setActionLoading(true);
    try {
      const tags = formData.tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const ytId = formData.youtubeVideoId.trim() || extractYoutubeId(formData.youtubeUrl);

      const payload: Partial<Article> & { notifySubscribers?: boolean } = {
        title: formData.title.trim(),
        slug: formData.slug.trim() || undefined,
        excerpt: formData.excerpt.trim(),
        content: formData.content,
        image: formData.image,
        gallery: formData.gallery,
        author: formData.author.trim(),
        authorPhoto: formData.authorPhoto.trim() || undefined,
        authorBio: formData.authorBio.trim() || undefined,
        category: formData.category,
        categoryId: formData.categoryId || undefined,
        tags,
        readTime: formData.readTime.trim() || autoCalculateReadTime(formData.content),
        status: formData.status,
        published: formData.status === 'published',
        scheduledAt: formData.status === 'scheduled' && formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
        youtubeVideoId: ytId || undefined,
        youtubeUrl: formData.youtubeUrl.trim() || undefined,
        youtubeTitle: formData.youtubeTitle.trim() || undefined,
        youtubeDescription: formData.youtubeDescription.trim() || undefined,
        relatedDoorIds: formData.relatedDoorIds,
        cta: formData.cta,
        seo: {
          seoTitle: formData.seo.seoTitle.trim() || formData.title.trim(),
          metaDescription: formData.seo.metaDescription.trim() || formData.excerpt.trim(),
          focusKeyword: formData.seo.focusKeyword.trim() || undefined,
          canonicalUrl: formData.seo.canonicalUrl.trim() || undefined,
        },
        notifySubscribers: formData.notifySubscribers,
      };

      if (editingArticleId) {
        await updateArticle(editingArticleId, payload);
        showToast('Article successfully updated');
      } else {
        await createArticle(payload);
        showToast('New article successfully published');
      }

      setIsEditorOpen(false);
      await loadAllData();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      console.error('Error saving article:', err);
      setErrorMessage(err.message || 'Failed to save article');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Article
  const handleDeleteArticle = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    setActionLoading(true);
    try {
      await deleteArticle(id);
      showToast('Article and comments deleted');
      await loadAllData();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete article');
    } finally {
      setActionLoading(false);
    }
  };

  // Comment Moderation Actions
  const handleModerateComment = async (commentId: string, status: 'approved' | 'hidden' | 'spam') => {
    try {
      await moderateArticleComment(commentId, status);
      showToast(`Comment marked as ${status}`);
      const updatedComments = await fetchAdminArticleComments({ status: commentStatusFilter });
      setComments(updatedComments.comments);
      setCommentCounts(updatedComments.counts);
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to moderate comment');
    }
  };

  // Reply to Comment
  const handleSendReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    try {
      await replyToArticleComment(commentId, replyText.trim(), 'Shivshahi Wood Experts');
      setReplyText('');
      setReplyingToCommentId(null);
      showToast('Reply published successfully');
      const updatedComments = await fetchAdminArticleComments({ status: commentStatusFilter });
      setComments(updatedComments.comments);
      setCommentCounts(updatedComments.counts);
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reply');
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteArticleComment(commentId);
      showToast('Comment deleted');
      const updatedComments = await fetchAdminArticleComments({ status: commentStatusFilter });
      setComments(updatedComments.comments);
      setCommentCounts(updatedComments.counts);
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete comment');
    }
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      // Search
      const matchSearch =
        !searchQuery ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.category || '').toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchStatus =
        statusFilter === 'all' ||
        art.status === statusFilter ||
        (statusFilter === 'published' && art.published) ||
        (statusFilter === 'draft' && art.status === 'draft');

      // Category
      const matchCategory =
        categoryFilter === 'all' ||
        (art.category && art.category.toLowerCase() === categoryFilter.toLowerCase()) ||
        art.categoryId === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [articles, searchQuery, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6 text-stone-100">
      {/* Toast & Error Banners */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            {errorMessage}
          </span>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            <h2 className="font-serif text-2xl font-bold text-white tracking-tight">
              Content & Article Hub
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Publish educational door guides, inspect engagement metrics, moderate comments, and integrate YouTube videos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Reload Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            id="admin-write-new-guide-btn"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/50 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Write New Guide
          </button>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setSubTab('articles')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            subTab === 'articles'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>All Articles ({articles.length})</span>
        </button>

        <button
          onClick={() => setSubTab('comments')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap relative ${
            subTab === 'comments'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comment Moderation</span>
          {commentCounts.pending > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
              {commentCounts.pending}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('analytics')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            subTab === 'analytics'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Engagement Analytics</span>
        </button>

        <button
          onClick={() => setSubTab('categories')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            subTab === 'categories'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ARTICLES LIST & MANAGEMENT */}
      {/* ========================================================================= */}
      {subTab === 'articles' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search articles by title, author, keyword..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Articles Table / Cards */}
          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-stone-900/50 border border-stone-800 text-stone-400 space-y-3">
              <FileText className="w-8 h-8 text-stone-600 mx-auto" />
              <p className="text-sm font-medium">No articles matched your criteria</p>
              <button
                onClick={handleOpenCreate}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Create First Article
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map(art => (
                <div
                  key={art.id}
                  className="p-4 rounded-2xl bg-stone-900 border border-stone-800/80 hover:border-stone-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Article Info */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <img
                      src={art.image}
                      alt={art.title}
                      className="w-20 h-14 rounded-xl object-cover border border-stone-800 shrink-0 bg-stone-950"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 font-semibold border border-stone-700">
                          {art.category || 'Door Guide'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                            art.status === 'published' || art.published
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : art.status === 'scheduled'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                              : art.status === 'archived'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {art.status || (art.published ? 'published' : 'draft')}
                        </span>

                        {art.youtubeVideoId && (
                          <span className="px-2 py-0.5 rounded-md bg-red-950 text-red-400 font-semibold border border-red-800/50 flex items-center gap-1 text-[10px]">
                            <Youtube className="w-3 h-3" />
                            Video Attached
                          </span>
                        )}

                        <span className="text-stone-500">
                          {art.author} • {art.readTime || '4 min read'}
                        </span>
                      </div>

                      <h3 className="font-serif text-base font-bold text-stone-100 hover:text-amber-400 transition-colors line-clamp-1">
                        {art.title}
                      </h3>

                      <p className="text-xs text-stone-400 line-clamp-1">
                        {art.excerpt || art.content?.substring(0, 120)}
                      </p>

                      {/* Engagement Metrics Badges */}
                      <div className="flex items-center gap-4 text-xs font-mono pt-1 text-stone-400">
                        <span className="flex items-center gap-1 hover:text-amber-400 transition-colors" title="Views">
                          <Eye className="w-3.5 h-3.5 text-stone-500" />
                          <strong className="text-stone-200">{(art.views || 0).toLocaleString('en-IN')}</strong> Views
                        </span>

                        <span className="flex items-center gap-1 hover:text-rose-400 transition-colors" title="Likes">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          <strong className="text-stone-200">{(art.likes || 0).toLocaleString('en-IN')}</strong> Likes
                        </span>

                        <span className="flex items-center gap-1 hover:text-sky-400 transition-colors" title="Approved Comments">
                          <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                          <strong className="text-stone-200">{(art.commentCount || 0).toLocaleString('en-IN')}</strong> Comments
                          {art.pendingCommentsCount && art.pendingCommentsCount > 0 ? (
                            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                              {art.pendingCommentsCount} new
                            </span>
                          ) : null}
                        </span>

                        <span className="flex items-center gap-1 hover:text-emerald-400 transition-colors" title="Shares">
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <strong className="text-stone-200">{(art.shares || 0).toLocaleString('en-IN')}</strong> Shares
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenEdit(art)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      title="Edit Article"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteArticle(art.id, art.title)}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors"
                      title="Delete Article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: COMMENT MODERATION */}
      {/* ========================================================================= */}
      {subTab === 'comments' && (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'approved', 'hidden', 'spam'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setCommentStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    commentStatusFilter === st
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  {st} ({commentCounts[st] ?? 0})
                </button>
              ))}
            </div>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-stone-900/50 border border-stone-800 text-stone-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-stone-600 mx-auto" />
              <p className="text-sm font-medium">No comments found in this status category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-600 text-stone-950 font-bold text-xs flex items-center justify-center">
                          {c.authorName.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-bold text-sm text-stone-200">{c.authorName}</span>
                        {c.authorEmail && (
                          <span className="text-xs text-stone-500">({c.authorEmail})</span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                            c.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : c.status === 'pending'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                              : c.status === 'spam'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <div className="text-xs text-stone-400">
                        Article: <strong className="text-amber-400">{c.articleTitle}</strong> •{' '}
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Quick moderation buttons */}
                    <div className="flex items-center gap-1.5">
                      {c.status !== 'approved' && (
                        <button
                          onClick={() => handleModerateComment(c.id, 'approved')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 font-semibold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}

                      {c.status !== 'hidden' && (
                        <button
                          onClick={() => handleModerateComment(c.id, 'hidden')}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
                        >
                          Hide
                        </button>
                      )}

                      {c.status !== 'spam' && (
                        <button
                          onClick={() => handleModerateComment(c.id, 'spam')}
                          className="px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs"
                        >
                          Spam
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800/60 text-stone-200 text-xs leading-relaxed whitespace-pre-wrap">
                    {c.content}
                  </div>

                  {/* Existing Admin Reply */}
                  {c.adminReply && (
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-amber-400">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Official Reply ({c.adminReply.authorName})</span>
                        <span className="text-[10px] text-stone-500 font-normal">
                          {new Date(c.adminReply.repliedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p className="text-stone-300 pl-5">{c.adminReply.text}</p>
                    </div>
                  )}

                  {/* Reply Button or Form */}
                  {replyingToCommentId === c.id ? (
                    <div className="space-y-2 pt-2 border-t border-stone-800">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type official reply to this customer..."
                        className="w-full p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setReplyingToCommentId(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendReply(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Official Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReplyingToCommentId(c.id);
                        setReplyText(c.adminReply?.text || '');
                      }}
                      className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      {c.adminReply ? 'Edit Official Reply' : 'Reply as Wood Specialist'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ENGAGEMENT ANALYTICS */}
      {/* ========================================================================= */}
      {subTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Total Published</span>
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {analytics.totalArticles}
              </div>
              <p className="text-[10px] text-stone-500">Live & Draft Guides</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Total Views</span>
                <Eye className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {analytics.totalViews.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-stone-500">Deduplicated reads</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Total Likes</span>
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {analytics.totalLikes.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-stone-500">Reader appreciation</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Approved Comments</span>
                <MessageSquare className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {analytics.totalComments.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-stone-500">User discussions</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Total Shares</span>
                <Share2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {analytics.totalShares.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-stone-500">WhatsApp & Social</p>
            </div>
          </div>

          {/* Top Rankings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 Most Viewed */}
            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <h3 className="font-serif text-sm font-bold text-amber-400 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Most Viewed Articles
              </h3>
              <div className="space-y-2">
                {analytics.topViewed.map((art, idx) => (
                  <div
                    key={art.id}
                    className="p-2.5 rounded-xl bg-stone-950 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-stone-200 line-clamp-1 flex items-center gap-2">
                      <span className="font-mono text-amber-500 font-bold">#{idx + 1}</span>
                      {art.title}
                    </span>
                    <span className="font-mono text-amber-400 font-bold ml-2 shrink-0">
                      {(art.views || 0).toLocaleString('en-IN')} views
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Most Liked */}
            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <h3 className="font-serif text-sm font-bold text-rose-400 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Most Liked Articles
              </h3>
              <div className="space-y-2">
                {analytics.topLiked.map((art, idx) => (
                  <div
                    key={art.id}
                    className="p-2.5 rounded-xl bg-stone-950 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-stone-200 line-clamp-1 flex items-center gap-2">
                      <span className="font-mono text-rose-500 font-bold">#{idx + 1}</span>
                      {art.title}
                    </span>
                    <span className="font-mono text-rose-400 font-bold ml-2 shrink-0">
                      {(art.likes || 0).toLocaleString('en-IN')} likes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Most Shared */}
            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <h3 className="font-serif text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Most Shared on WhatsApp & Social
              </h3>
              <div className="space-y-2">
                {analytics.topShared.map((art, idx) => (
                  <div
                    key={art.id}
                    className="p-2.5 rounded-xl bg-stone-950 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-stone-200 line-clamp-1 flex items-center gap-2">
                      <span className="font-mono text-emerald-500 font-bold">#{idx + 1}</span>
                      {art.title}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold ml-2 shrink-0">
                      {(art.shares || 0).toLocaleString('en-IN')} shares
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Most Commented */}
            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <h3 className="font-serif text-sm font-bold text-sky-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Most Discussed Guides
              </h3>
              <div className="space-y-2">
                {analytics.topCommented.map((art, idx) => (
                  <div
                    key={art.id}
                    className="p-2.5 rounded-xl bg-stone-950 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-stone-200 line-clamp-1 flex items-center gap-2">
                      <span className="font-mono text-sky-400 font-bold">#{idx + 1}</span>
                      {art.title}
                    </span>
                    <span className="font-mono text-sky-400 font-bold ml-2 shrink-0">
                      {(art.commentCount || 0).toLocaleString('en-IN')} comments
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: CATEGORY MANAGEMENT */}
      {/* ========================================================================= */}
      {subTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-base font-bold text-white">
              Article Categories ({categories.length})
            </h3>
            <button
              onClick={() => {
                setEditingCategory(null);
                setNewCatName('');
                setNewCatDescription('');
                setIsCategoryModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(c => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-bold text-stone-100">{c.name}</h4>
                  <p className="text-stone-400 text-[11px] mt-1">{c.description || 'No description'}</p>
                  <span className="text-[10px] text-amber-500 mt-2 block font-mono">
                    Slug: {c.slug}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingCategory(c);
                      setNewCatName(c.name);
                      setNewCatDescription(c.description || '');
                      setIsCategoryModalOpen(true);
                    }}
                    className="p-1.5 rounded bg-stone-800 text-stone-300 hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete category "${c.name}"?`)) return;
                      await deleteArticleCategory(c.id);
                      showToast('Category deleted');
                      loadAllData();
                    }}
                    className="p-1.5 rounded bg-rose-950/40 text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ARTICLE EDITOR MODAL (Full featured: Basic, Content, Media, CTA, SEO) */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl text-stone-100 overflow-hidden my-4 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/95 sticky top-0 z-10">
              <div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                  {editingArticleId ? 'Edit Wood Guide' : 'Compose New Wood Buying Guide'}
                </h3>
                <p className="text-xs text-stone-400">
                  Rich formatting, YouTube embed, SEO optimization, and call-to-action triggers
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab selector within Editor */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-stone-800 bg-stone-950 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveEditorTab('basic')}
                className={`pb-2.5 px-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeEditorTab === 'basic'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                1. Basic Details
              </button>

              <button
                onClick={() => setActiveEditorTab('content')}
                className={`pb-2.5 px-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeEditorTab === 'content'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                2. Full Content & Formatting
              </button>

              <button
                onClick={() => setActiveEditorTab('media')}
                className={`pb-2.5 px-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeEditorTab === 'media'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                3. Images & YouTube Video
              </button>

              <button
                onClick={() => setActiveEditorTab('cta')}
                className={`pb-2.5 px-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeEditorTab === 'cta'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                4. Related Doors & CTA
              </button>

              <button
                onClick={() => setActiveEditorTab('seo')}
                className={`pb-2.5 px-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeEditorTab === 'seo'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                5. SEO & Notifications
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5 text-xs">
              {/* TAB 1: BASIC DETAILS */}
              {activeEditorTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Article Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          title: val,
                          // Auto generate slug if slug hasn't been manually detached
                          slug: prev.slug ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                          seo: {
                            ...prev.seo,
                            seoTitle: prev.seo.seoTitle || `${val} | Jai Hanuman Door`,
                          },
                        }));
                      }}
                      placeholder="e.g. Authentic Sagwan vs Plywood Doors: 7 Crucial Differences"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        placeholder="e.g. sagwan-vs-plywood-doors"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={formData.author}
                        onChange={e => setFormData({ ...formData, author: e.target.value })}
                        placeholder="e.g. Shivshahi Wood Experts"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Author Bio / Credential
                      </label>
                      <input
                        type="text"
                        value={formData.authorBio}
                        onChange={e => setFormData({ ...formData, authorBio: e.target.value })}
                        placeholder="e.g. Master wood carver & seasoning specialist with 25+ years experience"
                        className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Short Summary / Excerpt (Shows on cards & search results)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.excerpt}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          excerpt: val,
                          seo: { ...prev.seo, metaDescription: prev.seo.metaDescription || val },
                        }));
                      }}
                      placeholder="Brief overview explaining what the customer will learn in this door buying guide..."
                      className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tagsInput}
                      onChange={e => setFormData({ ...formData, tagsInput: e.target.value })}
                      placeholder="Sagwan Door, Main Entrance, Teak Wood, Kiln Seasoned"
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: CONTENT & FORMATTING */}
              {activeEditorTab === 'content' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                    💡 <strong>Pro Woodworking Formatting:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-stone-400">
                      <li>Use <code className="text-amber-400">## Heading 2</code> or <code className="text-amber-400">### Heading 3</code> to create Table of Contents automatically.</li>
                      <li>Use bullet points <code className="text-amber-400">- Feature</code> for specifications.</li>
                      <li>Double line breaks create readable paragraphs.</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-stone-300 font-semibold">Full Article Body</label>
                      <span className="text-stone-500 font-mono">
                        {formData.content.trim().split(/\s+/).filter(Boolean).length} words • {autoCalculateReadTime(formData.content)}
                      </span>
                    </div>
                    <textarea
                      rows={16}
                      value={formData.content}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          content: val,
                          readTime: autoCalculateReadTime(val),
                        }));
                      }}
                      placeholder="Write your comprehensive wood guide here..."
                      className="w-full p-4 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 font-sans text-sm leading-relaxed focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: IMAGES & YOUTUBE VIDEO */}
              {activeEditorTab === 'media' && (
                <div className="space-y-6">
                  {/* Featured Cover Image */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <label className="block text-stone-200 font-bold">
                      Main Featured Cover Image
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-32 h-20 rounded-xl overflow-hidden bg-stone-900 border border-stone-700 shrink-0">
                        <img
                          src={formData.image}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            {uploadingImage ? 'Uploading...' : 'Upload Cover Image File'}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingImage}
                              onChange={handleFeaturedImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <input
                          type="text"
                          value={formData.image}
                          onChange={e => setFormData({ ...formData, image: e.target.value })}
                          placeholder="Or paste image URL"
                          className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* YouTube Video Integration */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-5 h-5 text-red-500" />
                      <h4 className="font-bold text-stone-200">
                        YouTube Video Integration
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Embed a woodworking video tutorial or factory tour directly inside this article.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-300 mb-1">YouTube URL or Video ID</label>
                        <input
                          type="text"
                          value={formData.youtubeUrl}
                          onChange={e => {
                            const val = e.target.value;
                            const id = extractYoutubeId(val);
                            setFormData({
                              ...formData,
                              youtubeUrl: val,
                              youtubeVideoId: id || val,
                            });
                          }}
                          placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-300 mb-1">Extracted Video ID</label>
                        <input
                          type="text"
                          value={formData.youtubeVideoId}
                          onChange={e => setFormData({ ...formData, youtubeVideoId: e.target.value.trim() })}
                          placeholder="e.g. dQw4w9WgXcQ"
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-300 mb-1">Video Title / Caption (Optional)</label>
                      <input
                        type="text"
                        value={formData.youtubeTitle}
                        onChange={e => setFormData({ ...formData, youtubeTitle: e.target.value })}
                        placeholder="e.g. Master Craftsman Teak Seasoning Process (Live Workshop Tour)"
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                      />
                    </div>

                    {/* Video Player Live Preview */}
                    {formData.youtubeVideoId && (
                      <div className="mt-3 aspect-video rounded-xl overflow-hidden border border-stone-800 bg-stone-900">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${formData.youtubeVideoId}`}
                          title="YouTube video preview"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>

                  {/* Additional Gallery Photos */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-stone-200">Article Photo Gallery</h4>
                        <p className="text-[11px] text-stone-400">
                          Upload multiple high-res photos showcasing grain textures, joints, or finished installations.
                        </p>
                      </div>

                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold text-xs flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingGallery ? 'Uploading...' : 'Add Gallery Photos'}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={uploadingGallery}
                          onChange={handleGalleryUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {formData.gallery.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        {formData.gallery.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-stone-800 bg-stone-900 aspect-video"
                          >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  gallery: prev.gallery.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="absolute top-1 right-1 p-1 rounded bg-stone-950/80 text-rose-400 hover:text-rose-300"
                              title="Remove photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: RELATED DOORS & CALL TO ACTION */}
              {activeEditorTab === 'cta' && (
                <div className="space-y-6">
                  {/* Related Doors Multi-select */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <h4 className="font-bold text-stone-200">
                      Link Related Doors from Catalog
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      Customers reading this guide can view and calculate pricing directly for these doors.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {doors.map(door => {
                        const isSelected = formData.relatedDoorIds.includes(door.id);
                        return (
                          <div
                            key={door.id}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                relatedDoorIds: isSelected
                                  ? prev.relatedDoorIds.filter(id => id !== door.id)
                                  : [...prev.relatedDoorIds, door.id],
                              }));
                            }}
                            className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                              isSelected
                                ? 'bg-amber-950/30 border-amber-500/60 text-amber-300'
                                : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img
                                src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                              <span className="font-medium text-xs truncate">{door.name}</span>
                            </div>
                            <span className="font-mono text-[11px] shrink-0">
                              ₹{door.startingPrice?.toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Call To Action Box Configuration */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-stone-200">
                        Interactive Call-to-Action (CTA) Banner
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.cta.enabled}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              cta: { ...formData.cta, enabled: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded text-amber-600 bg-stone-900 border-stone-700"
                        />
                        <span className="text-xs text-stone-300">Enable CTA</span>
                      </label>
                    </div>

                    {formData.cta.enabled && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-stone-300 mb-1">Action Type</label>
                            <select
                              value={formData.cta.type}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  cta: { ...formData.cta, type: e.target.value as any },
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                            >
                              <option value="calculator">Open Door Price Calculator</option>
                              <option value="contact">Chat on WhatsApp</option>
                              <option value="custom">Custom Web Link</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-stone-300 mb-1">Button Label</label>
                            <input
                              type="text"
                              value={formData.cta.buttonText}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  cta: { ...formData.cta, buttonText: e.target.value },
                                })
                              }
                              placeholder="e.g. Calculate Door Price For Your Size"
                              className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-stone-300 mb-1">CTA Headline</label>
                          <input
                            type="text"
                            value={formData.cta.title}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                cta: { ...formData.cta, title: e.target.value },
                              })
                            }
                            placeholder="e.g. Need Sagwan Doors in Pune or Western Maharashtra?"
                            className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                          />
                        </div>

                        <div>
                          <label className="block text-stone-300 mb-1">CTA Subtitle</label>
                          <input
                            type="text"
                            value={formData.cta.subtitle}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                cta: { ...formData.cta, subtitle: e.target.value },
                              })
                            }
                            placeholder="e.g. Direct factory rates, kiln seasoned timber with 10-year anti-warp warranty."
                            className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: SEO & PUBLISHING */}
              {activeEditorTab === 'seo' && (
                <div className="space-y-6">
                  {/* SEO Configuration */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <h4 className="font-bold text-stone-200 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-amber-500" />
                      Search Engine Optimization (SEO)
                    </h4>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-stone-300 font-semibold">SEO Meta Title</label>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {formData.seo.seoTitle.length} / 60 chars
                        </span>
                      </div>
                      <input
                        type="text"
                        value={formData.seo.seoTitle}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            seo: { ...formData.seo, seoTitle: e.target.value },
                          })
                        }
                        placeholder="Sagwan Wood Door Maintenance Guide | Jai Hanuman Door"
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-stone-300 font-semibold">Meta Description</label>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {formData.seo.metaDescription.length} / 160 chars
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={formData.seo.metaDescription}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            seo: { ...formData.seo, metaDescription: e.target.value },
                          })
                        }
                        placeholder="Learn essential maintenance tips for 100% seasoned CP Sagwan Teak Wood Doors..."
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 mb-1">Primary Focus Keyword</label>
                      <input
                        type="text"
                        value={formData.seo.focusKeyword}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            seo: { ...formData.seo, focusKeyword: e.target.value },
                          })
                        }
                        placeholder="e.g. Sagwan Door Maintenance, Teak Wood Doors Pune"
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                      />
                    </div>
                  </div>

                  {/* Publishing Status & Controls */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
                    <h4 className="font-bold text-stone-200">
                      Publishing Status & Push Notifications
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-stone-300 font-semibold mb-1">Status</label>
                        <select
                          value={formData.status}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              status: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200"
                        >
                          <option value="published">Published (Visible immediately)</option>
                          <option value="draft">Draft (Private admin only)</option>
                          <option value="scheduled">Scheduled (Auto-publish at specific time)</option>
                          <option value="archived">Archived (Hidden from catalog)</option>
                        </select>
                      </div>

                      {formData.status === 'scheduled' && (
                        <div>
                          <label className="block text-stone-300 font-semibold mb-1">
                            Scheduled Date & Time (IST)
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.scheduledAt}
                            onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* Push notification toggle */}
                    <div className="pt-2 border-t border-stone-800">
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.notifySubscribers}
                          onChange={e => setFormData({ ...formData, notifySubscribers: e.target.checked })}
                          className="w-4 h-4 mt-0.5 rounded text-amber-600 bg-stone-950 border-stone-700 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-stone-200 block text-xs">
                            🔔 Send Push Notification to All Subscribers
                          </span>
                          <span className="text-[11px] text-stone-400">
                            Broadcasts an immediate push notification to customers with a deep link to this guide.
                            (Note: Per system policy, notifications are NEVER sent automatically unless explicitly chosen here).
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/95 sticky bottom-0 z-10">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                id="admin-save-article-btn"
                onClick={handleSaveArticle}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/50 active:scale-95 transition-all disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingArticleId ? 'Update Article' : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Creation / Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center font-serif text-lg font-bold text-white border-b border-stone-800 pb-3">
              <span>{editingCategory ? 'Edit Category' : 'Create Article Category'}</span>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-stone-300 mb-1 font-semibold">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Sagwan Teak Wood"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                />
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-semibold">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newCatDescription}
                  onChange={e => setNewCatDescription(e.target.value)}
                  placeholder="Articles covering teak grain grades, seasoning methods, and comparisons..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newCatName.trim()) return;
                  if (editingCategory) {
                    await updateArticleCategory(editingCategory.id, {
                      name: newCatName.trim(),
                      description: newCatDescription.trim(),
                    });
                  } else {
                    await createArticleCategory({
                      name: newCatName.trim(),
                      description: newCatDescription.trim(),
                    });
                  }
                  setIsCategoryModalOpen(false);
                  showToast('Category saved');
                  loadAllData();
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
