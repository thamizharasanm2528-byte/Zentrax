import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import {
    Rss,
    ThumbsUp,
    MessageCircle,
    Share2,
    Send,
    User,
    Rocket,
    Plus,
    Loader2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import Skeleton from '../../components/Skeleton';

const Feed = () => {
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [expandedComments, setExpandedComments] = useState({}); // { [postId]: true }
    const [commentInput, setCommentInput] = useState({}); // { [postId]: text }
    const [commentLoading, setCommentLoading] = useState({});
    const { user } = useAuth();

    const fetchPosts = useCallback(async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/feed`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.posts) {
                setPosts(data.posts);
            }
        } catch (err) {
            console.error('Error fetching posts:', err);
        }
        setFetching(false);
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (user) fetchPosts();
    }, [user, fetchPosts]);

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim()) return;

        const temporaryPost = {
            id: 'temp-' + Date.now(),
            content: newPostContent,
            createdAt: new Date().toISOString(),
            likes: [],
            comments: [],
            authorId: user.uid,
            isOptimistic: true
        };

        setPosts(prev => [temporaryPost, ...prev]);
        setNewPostContent('');
        setLoading(true);

        try {
            await fetch(`${API_BASE_URL}/api/feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({ content: newPostContent })
            });
            fetchPosts();
        } catch (err) {
            console.error('Error creating post:', err);
            setPosts(prev => prev.filter(p => !p.isOptimistic));
        }
        setLoading(false);
    };

    const toggleLike = async (postId) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const alreadyLiked = p.likes?.includes(user?.uid);
                const newLikes = alreadyLiked
                    ? p.likes.filter(id => id !== user?.uid)
                    : [...(p.likes || []), user?.uid];
                return { ...p, likes: newLikes };
            }
            return p;
        }));

        try {
            await fetch(`${API_BASE_URL}/api/feed/${postId}/like`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${await user.getIdToken()}` }
            });
        } catch (err) {
            console.error('Error liking post:', err);
            fetchPosts();
        }
    };

    const handleComment = async (postId) => {
        const text = commentInput[postId]?.trim();
        if (!text) return;

        setCommentLoading(prev => ({ ...prev, [postId]: true }));

        // Optimistic add
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    comments: [...(p.comments || []), { userId: user.uid, text, createdAt: new Date().toISOString() }]
                };
            }
            return p;
        }));
        setCommentInput(prev => ({ ...prev, [postId]: '' }));

        try {
            await fetch(`${API_BASE_URL}/api/feed/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({ text })
            });
        } catch (err) {
            console.error('Error adding comment:', err);
            fetchPosts();
        }
        setCommentLoading(prev => ({ ...prev, [postId]: false }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Rss className="h-8 w-8 mr-3 text-primary-600" />
                        Collaboration Feed
                    </h1>
                    <p className="text-gray-500 mt-2">See what the ZENTRAX community is building.</p>
                </div>
            </header>

            {/* Post Composer */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden p-6">
                <form onSubmit={handlePostSubmit} className="space-y-4">
                    <div className="flex space-x-4">
                        <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 shrink-0">
                            <User className="h-5 w-5" />
                        </div>
                        <textarea
                            required
                            rows="3"
                            className="flex-1 w-full px-0 py-2 bg-transparent border-none text-gray-900 dark:text-white focus:ring-0 text-sm md:text-base resize-none outline-none"
                            placeholder="What's your project status or learning today?"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                        <div />
                        <button
                            type="submit"
                            disabled={loading || !newPostContent}
                            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Post Update
                        </button>
                    </div>
                </form>
            </div>

            {/* Feed List */}
            <div className="space-y-6">
                {fetching ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border border-gray-100 dark:border-gray-700 text-center space-y-4">
                        <Rocket className="h-16 w-16 mx-auto text-gray-200" />
                        <p className="text-gray-500 font-medium">No updates yet. Be the first to share!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className={`bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-6 transition-all hover:shadow-md ${post.isOptimistic ? 'opacity-60' : ''}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            {post.authorId === user?.uid ? 'You' : `User ${post.authorId?.substring(0, 6)}...`}
                                        </h4>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{new Date(post.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600"><Share2 className="h-4 w-4" /></button>
                            </div>

                            <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                                {post.content}
                            </div>

                            <div className="flex items-center space-x-6 border-t border-gray-50 dark:border-gray-700 pt-4">
                                <button
                                    onClick={() => toggleLike(post.id)}
                                    className={`flex items-center space-x-2 text-xs font-semibold transition-colors ${post.likes?.includes(user?.uid) ? 'text-primary-600' : 'text-gray-500 hover:text-primary-600'}`}
                                >
                                    <ThumbsUp className={`h-4 w-4 ${post.likes?.includes(user?.uid) ? 'fill-current' : ''}`} />
                                    <span>{post.likes?.length || 0} Likes</span>
                                </button>
                                <button
                                    onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                    className="flex items-center space-x-2 text-xs font-semibold text-gray-500 hover:text-primary-600 transition-colors"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{post.comments?.length || 0} Comments</span>
                                    {expandedComments[post.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                            </div>

                            {/* Comment Section */}
                            {expandedComments[post.id] && (
                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 space-y-3">
                                    {/* Existing comments */}
                                    {(post.comments || []).map((c, idx) => (
                                        <div key={idx} className="flex space-x-3">
                                            <div className="h-7 w-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                                                <User className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex-1 bg-gray-50 dark:bg-gray-700/30 px-4 py-2.5 rounded-2xl">
                                                <p className="text-[10px] text-gray-400 font-semibold mb-1">
                                                    {c.userId === user?.uid ? 'You' : `User ${c.userId?.substring(0, 6)}`}
                                                    <span className="ml-2 font-normal">{new Date(c.createdAt).toLocaleTimeString()}</span>
                                                </p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{c.text}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* New comment input */}
                                    <div className="flex space-x-3 items-center">
                                        <div className="h-7 w-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 shrink-0">
                                            <User className="h-3.5 w-3.5" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Write a comment..."
                                            value={commentInput[post.id] || ''}
                                            onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleComment(post.id); }}
                                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <button
                                            onClick={() => handleComment(post.id)}
                                            disabled={commentLoading[post.id] || !commentInput[post.id]?.trim()}
                                            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 transition-all"
                                        >
                                            {commentLoading[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Feed;