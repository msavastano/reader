'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Trash2, Key } from 'lucide-react';
import { getChatHistory, saveChatHistory, clearChatHistory } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/types';

const SUGGESTIONS = [
  "Recommend a mind-bending sci-fi story",
  "What's good on Clarkesworld right now?",
  "I want something like Ted Chiang",
  "Find me a short fantasy story under 5000 words",
  "What are the best free SF magazines online?",
];

const API_KEY_STORAGE_KEY = 'reader_gemini_api_key';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getChatHistory().then((history) => {
        if (history.length > 0) {
            setMessages(history);
        }
    });

    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowKeyInput(true);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showKeyInput]);

  useEffect(() => {
    if (isOpen && !showKeyInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showKeyInput]);

  const saveApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    setApiKey(key);
    setShowKeyInput(false);
  };

  const removeApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setShowKeyInput(true);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    const userMsg: ChatMessage = { 
      id: crypto.randomUUID(),
      role: 'user', 
      content: text.trim(),
      timestamp: Date.now()
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        timestamp: Date.now()
      };

      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveChatHistory(updated);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please check your API key.`,
        timestamp: Date.now()
      };
      const updated = [...newMessages, errorMsg];
      setMessages(updated);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClear = () => {
    setMessages([]);
    clearChatHistory();
  };

  if (!isOpen) {
    return (
      <button
        className="chat-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open story finder"
        title="Find stories"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>
          <span className="chat-header-dot" />
          Story Finder
        </h3>
        <div style={{ display: 'flex', gap: '4px' }}>
           <button 
            className="btn-icon" 
            onClick={() => setShowKeyInput(!showKeyInput)} 
            title="API Key Settings"
            style={{ color: apiKey ? 'var(--text-muted)' : 'var(--accent)' }}
           >
             <Key size={16} />
           </button>
          {messages.length > 0 && !showKeyInput && (
            <button className="btn-icon" onClick={handleClear} title="Clear chat">
              <Trash2 size={16} />
            </button>
          )}
          <button className="btn-icon" onClick={() => setIsOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {showKeyInput ? (
        <div className="chat-settings-view" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Gemini API Key</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              To use the chat features, you need to provide your own Google Gemini API key. 
              The key is stored locally in your browser.
            </p>
          </div>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const key = formData.get('apiKey') as string;
              if (key.trim()) saveApiKey(key.trim());
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <input 
              name="apiKey"
              type="password" 
              placeholder="Enter your API key"
              defaultValue={apiKey}
              className="chat-input"
              style={{ width: '100%', padding: '8px 12px' }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Save Key
            </button>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
              Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get one here</a>
            </p>
          </form>

          {apiKey && (
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button 
                onClick={removeApiKey}
                className="btn"
                style={{ width: '100%', justifyContent: 'center', color: 'var(--error, #e53e3e)', borderColor: 'var(--border)' }}
              >
                Remove Saved Key
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                <MessageCircle size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ marginBottom: '4px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Hi! I can help you find stories.
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Ask me for recommendations, or tell me what kind of story you&apos;re in the mood for.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
              >
                {msg.role === 'assistant' ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                 ) : (
                    msg.content
                 )}
              </div>
            ))}

            {loading && (
              <div className="chat-message chat-message-assistant">
                <div className="chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 0 && (
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="chat-suggestion"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form className="chat-input-area" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Ask me for story recommendations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send"
              disabled={loading || !input.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
