import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Trash2, Edit2, AlertCircle, RefreshCw, ExternalLink, Wand2, SlidersHorizontal, Layers, Crop, ArrowLeft, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';

const MessageBubble = React.memo(function MessageBubble({ 
  message, 
  onCopy, 
  onDelete, 
  onEdit, 
  onAction,
  onRetry,
  copiedMessageId,
  actionLoadingStates 
}) {
  const isUser = message.role === 'user';
  
  const markdownComponents = useMemo(() => ({
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="relative group/code">
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-2">
            <code className={className} {...props}>{children}</code>
          </pre>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
            onClick={() => {
              navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
              toast.success('Code copied');
            }}
          >
            <Copy className="h-3 w-3 text-slate-400" />
          </Button>
        </div>
      ) : (
        <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
          {children}
        </code>
      );
    },
    a: ({ children, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
    li: ({ children }) => <li className="my-0.5">{children}</li>,
    h1: ({ children }) => <h1 className="text-lg font-semibold my-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-semibold my-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600">
        {children}
      </blockquote>
    ),
  }), []);

  const getActionIcon = useCallback((type) => {
    const iconMap = {
      navigate: ExternalLink,
      tool: Wand2,
      adjustment: SlidersHorizontal,
      filter: Layers,
      crop: Crop,
      apply_prompt: ArrowLeft,
      apply_style: Play,
    };
    return iconMap[type] || Play;
  }, []);

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[2px] flex-shrink-0 shadow-lg shadow-[#FF6B35]/20">
          <div className="w-full h-full rounded-[10px] bg-[#141414] flex items-center justify-center overflow-hidden">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg" 
              alt="FLIK" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-1 max-w-[80%]">
        {isUser && (
          <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity mb-1">
            <button
              onClick={() => onEdit(message)}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/80"
              title="Edit"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/80"
              title="Copy"
            >
              {copiedMessageId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-2xl text-sm space-y-2 ${
            isUser
              ? 'bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-tr-none shadow-lg'
              : 'bg-white/8 text-white/90 rounded-tl-none backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors'
          }`}
        >
          {isUser && message.images && message.images.length > 0 && (
            <div className={`grid gap-2 mb-2 ${message.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {message.images.map((imgUrl, idx) => (
                <img key={idx} src={imgUrl} alt="Uploaded" className="w-full rounded-lg" />
              ))}
            </div>
          )}
          
          {message.role === 'assistant' && message.image_urls && message.image_urls.length > 0 && (
            <div className={`grid gap-2 mb-2 ${message.image_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {message.image_urls.map((imgUrl, idx) => (
                <img key={idx} src={imgUrl} alt={`Response ${idx + 1}`} className="w-full rounded-lg" />
              ))}
            </div>
          )}
          
          <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 last:[&>*]:mb-0 [&>p]:leading-relaxed">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
          
          {message.timestamp && (
            <div className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
              {message.edited && <span className="italic">(edited)</span>}
            </div>
          )}
        </div>

        {message.role === 'assistant' && (
          <div className="flex flex-col gap-2 mt-2">
            {message.suggested_prompt && (
              <button
                onClick={() => onAction({ type: 'apply_prompt', prompt: message.suggested_prompt })}
                className="bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 hover:border-[#FF6B35]/50 rounded-lg p-2 text-xs text-white/60 hover:text-white/80 italic border-l-2 border-l-[#FF6B35] transition-all text-left group"
              >
                <span className="block mb-1 text-[10px] text-white/40 group-hover:text-[#FF6B35]">💡 Click to use</span>
                "{message.suggested_prompt}"
              </button>
            )}
            
            {message.isError && (
              <button
                onClick={() => onRetry(message.id)}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
            
            {message.suggested_actions && message.suggested_actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.suggested_actions.map((action, idx) => {
                  const Icon = getActionIcon(action.type);
                  const isLoading = actionLoadingStates?.[idx];
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => onAction(action, idx)}
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-gradient-to-r from-white/5 to-white/10 hover:from-[#FF6B35]/20 hover:to-[#FFB800]/20 border border-white/10 hover:border-[#FF6B35]/50 text-white/90 text-[11px] px-3 py-1.5 rounded-lg transition-all group shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 text-[#FF6B35] animate-spin" />
                      ) : (
                        <Icon className="w-3 h-3 text-[#FF6B35]" />
                      )}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
});

export default MessageBubble;