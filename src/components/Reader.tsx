'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story, ReaderSettings as ReaderSettingsType } from '@/lib/types';
import { getProgress, saveProgress, getSettings, saveSettings, markStoryAsRead } from '@/lib/storage';
import ReaderSettingsPanel from './ReaderSettings';
import WordDefine from './WordDefine';

interface ReaderProps {
  story: Story;
  onBack: () => void;
}

/**
 * Parse HTML content into an array of block-level HTML strings (paragraphs, etc).
 * Flattens any wrapper divs that Readability may add around the content.
 */
function parseBlocks(html: string): string[] {
  const div = document.createElement('div');
  div.innerHTML = html;

  const blocks: string[] = [];

  function collectBlocks(parent: Element) {
    for (const child of Array.from(parent.children)) {
      const tag = child.tagName.toLowerCase();
      // If it's a wrapper div with children, recurse into it
      if (tag === 'div' && child.children.length > 0) {
        collectBlocks(child);
      } else {
        // It's a real block element (p, h1, h2, blockquote, etc.)
        blocks.push(child.outerHTML);
      }
    }
  }

  collectBlocks(div);

  // If we couldn't find any blocks, split by <p>, <br>, etc.
  if (blocks.length === 0) {
    // Fallback: split text into chunks of ~500 chars at sentence boundaries
    const text = div.textContent || '';
    const sentences = text.split(/(?<=[.!?])\s+/);
    let chunk = '';
    for (const s of sentences) {
      if (chunk.length + s.length > 500 && chunk.length > 0) {
        blocks.push(`<p>${chunk}</p>`);
        chunk = s;
      } else {
        chunk += (chunk ? ' ' : '') + s;
      }
    }
    if (chunk) blocks.push(`<p>${chunk}</p>`);
  }

  return blocks;
}

/**
 * Groups block-level elements into pages using actual DOM height measurement.
 * Creates a properly-styled offscreen container to get accurate measurements.
 */
function paginateBlocks(
  blocks: string[],
  containerWidth: number,
  availableHeight: number,
  fontFamily: string,
  fontSize: number,
  lineHeight: number
): { pages: string[], pageStartIndexes: number[] } {
  // Create a hidden measuring container
  const measurer = document.createElement('div');
  measurer.style.cssText = `
    position: fixed;
    top: -99999px;
    left: 0;
    width: ${containerWidth}px;
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
    line-height: ${lineHeight};
    visibility: hidden;
    pointer-events: none;
  `;
  // Copy reader content styles for paragraph margins, text indent etc.
  const style = document.createElement('style');
  style.textContent = `
    .measure-content p { margin-bottom: 1em; text-indent: 1.5em; }  
    .measure-content p:first-child { text-indent: 0; }
    .measure-content h1 { font-size: 2em; font-weight: 700; margin-bottom: 0.3em; line-height: 1.2; }
    .measure-content h2 { font-size: 1.5em; font-weight: 600; margin: 1.5em 0 0.5em; }
    .measure-content hr { margin: 2em 0; }
  `;
  measurer.appendChild(style);
  measurer.classList.add('measure-content');
  document.body.appendChild(measurer);

  const pages: string[] = [];
  const pageStartIndexes: number[] = [0];
  let currentPageBlocks: string[] = [];
  let currentHeight = 0;

  blocks.forEach((blockHtml, index) => {
    // Insert the block into the measurer to get its height
    const wrapper = document.createElement('div');
    wrapper.innerHTML = blockHtml;
    const el = wrapper.firstElementChild as HTMLElement;
    if (!el) return;

    measurer.appendChild(el);
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const mt = parseFloat(cs.marginTop) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    const blockHeight = rect.height + mt + mb;

    // If this block would overflow the current page, start a new one
    if (currentHeight + blockHeight > availableHeight && currentPageBlocks.length > 0) {
      pages.push(currentPageBlocks.join('\n'));
      pageStartIndexes.push(index);
      currentPageBlocks = [];
      currentHeight = 0;
    }

    currentPageBlocks.push(blockHtml);
    currentHeight += blockHeight;

    // Remove the element from measurer after measuring
    measurer.removeChild(el);
  });

  // Push the final page
  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks.join('\n'));
  }

  document.body.removeChild(measurer);

  return { 
    pages: pages.length > 0 ? pages : [blocks.join('\n')],
    pageStartIndexes: pages.length > 0 ? pageStartIndexes : [0]
  };
}

export default function Reader({ story, onBack }: ReaderProps) {
  const [settings, setSettings] = useState<ReaderSettingsType>(getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [pageAnimation, setPageAnimation] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [isRead, setIsRead] = useState(story.isRead || false);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const blocksRef = useRef<string[]>([]);
  const pageStartIndexesRef = useRef<number[]>([0]);
  const currentPageRef = useRef(currentPage);

  const totalPages = pages.length;

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const getFontFamily = useCallback(() => {
    if (settings.fontFamily === 'system') {
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    }
    return `"${settings.fontFamily}", serif`;
  }, [settings.fontFamily]);

  // Parse blocks once
  useEffect(() => {
    blocksRef.current = parseBlocks(story.content);
  }, [story.content]);

  // Paginate content
  const doPagination = useCallback(() => {
    if (!contentRef.current || blocksRef.current.length === 0) return;

    const containerWidth = contentRef.current.offsetWidth;
    // Available height = viewport - toolbar (56px) - top padding (48px) - bottom padding (80px) - progress bar (3px) - title area estimate (first page only)
    const availableHeight = window.innerHeight - 56 - 48 - 80 - 3;

    if (availableHeight <= 100) return;

    const { pages: newPages, pageStartIndexes: newStartIndexes } = paginateBlocks(
      blocksRef.current,
      containerWidth,
      availableHeight,
      getFontFamily(),
      settings.fontSize,
      settings.lineHeight
    );

    setPages(newPages);
    setReady(true);

    // On first load, restore reading position
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      const progress = getProgress(story.id);
      if (progress && progress.currentPage < newPages.length) {
        setCurrentPage(progress.currentPage);
        // We'll trust the stored index matches roughly the same start block for now
      }
    } else {
      // When repaginating, try to keep position based on the block we were reading
      const oldPage = currentPageRef.current;
      const oldStartIndexes = pageStartIndexesRef.current;
      
      // The block index that started the current page
      const targetBlockIndex = oldStartIndexes[oldPage] || 0;

      // Find which page in the new layout contains this block
      let newPageMatch = 0;
      for (let i = 0; i < newStartIndexes.length; i++) {
        if (newStartIndexes[i] <= targetBlockIndex) {
          newPageMatch = i;
        } else {
          break;
        }
      }
      
      setCurrentPage(newPageMatch);
    }
    
    // Update the ref for the next time
    pageStartIndexesRef.current = newStartIndexes;
    
  }, [story.id, settings.fontSize, settings.lineHeight, settings.marginSize, getFontFamily]);

  useEffect(() => {
    // Delay to let fonts load and DOM settle
    const timer = setTimeout(doPagination, 200);

    const handleResize = () => {
      doPagination();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [doPagination]);

  // Save progress whenever page changes
  useEffect(() => {
    if (totalPages > 0) {
      saveProgress({
        storyId: story.id,
        currentPage,
        totalPages,
        lastReadAt: Date.now(),
      });
    }
  }, [currentPage, totalPages, story.id]);

  const goToPage = useCallback((page: number, direction: 'forward' | 'back') => {
    if (page < 0 || page >= totalPages) return;
    setPageAnimation(direction === 'forward' ? 'page-turning' : 'page-turning-back');
    setCurrentPage(page);
    window.scrollTo({ top: 0 });
    setTimeout(() => setPageAnimation(''), 300);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1, 'forward');
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      goToPage(currentPage - 1, 'back');
    }
  }, [currentPage, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage, showSettings, onBack]);

  const handleSettingsChange = (newSettings: ReaderSettingsType) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleToggleRead = () => {
    const newState = !isRead;
    setIsRead(newState);
    markStoryAsRead(story.id, newState);
  };

  const progressPercent = totalPages > 1
    ? ((currentPage) / (totalPages - 1)) * 100
    : 100;

  const currentPageHtml = pages[currentPage] || '';

  return (
    <div className="reader-container">
      {/* Toolbar */}
      <div className="reader-toolbar">
        <div className="reader-toolbar-inner">
          <div className="reader-toolbar-left">
            <button className="btn-icon" onClick={onBack} title="Back to library">
              <ArrowLeft size={20} />
            </button>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '0.875rem', fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '300px'
              }}>
                {story.title}
              </div>
              {story.author && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {story.author}
                </div>
              )}
            </div>
          </div>

          <div className="reader-toolbar-center">
            {ready ? `Page ${currentPage + 1} of ${totalPages}` : 'Loading...'}
          </div>

          <div className="reader-toolbar-right">
            <button className="btn-icon" onClick={prevPage} disabled={currentPage === 0} title="Previous page">
              <ChevronLeft size={20} />
            </button>
            <button className="btn-icon" onClick={nextPage} disabled={currentPage >= totalPages - 1} title="Next page">
              <ChevronRight size={20} />
            </button>
            <button className="btn-icon" onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Reading Area */}
      <div className="reader-page-area">
        {/* Click zones for navigation */}
        {currentPage > 0 && (
          <div
            className="reader-nav-zone reader-nav-zone-left"
            onClick={prevPage}
          >
            <div className="reader-nav-hint">
              <ChevronLeft size={20} />
            </div>
          </div>
        )}

        <div
          ref={contentRef}
          className={`reader-page-content ${pageAnimation}`}
          data-margin={settings.marginSize}
          style={{
            fontFamily: getFontFamily(),
            fontSize: settings.fontSize + 'px',
            lineHeight: settings.lineHeight,
          }}
        >
          {/* Title on first page */}
          {currentPage === 0 && (
            <div style={{ marginBottom: '2em' }}>
              <h1 style={{ fontFamily: getFontFamily() }}>{story.title}</h1>
              {story.author && (
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '1.1em',
                  margin: '0.5em 0 0',
                  textIndent: '0',
                }}>
                  by {story.author}
                </p>
              )}
            </div>
          )}

          {ready ? (
            <div className={currentPage === 0 ? 'story-opening' : ''} dangerouslySetInnerHTML={{ __html: currentPageHtml }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Preparing pages...
            </div>
          )}

          {/* End of story indicator */}
          {currentPage === totalPages - 1 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 0 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              {totalPages > 1 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>— End —</div>}
              <button 
                className={isRead ? "btn btn-secondary" : "btn btn-primary"}
                onClick={handleToggleRead}
              >
                {isRead ? 'Mark as Unread' : 'Mark as Read'}
              </button>
            </div>
          )}
        </div>

        {currentPage < totalPages - 1 && (
          <div
            className="reader-nav-zone reader-nav-zone-right"
            onClick={nextPage}
          >
            <div className="reader-nav-hint">
              <ChevronRight size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="reader-progress">
        <div
          className="reader-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <ReaderSettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Word Define tooltip & overlay */}
      <WordDefine containerRef={contentRef} />
    </div>
  );
}
