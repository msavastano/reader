'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Volume2, BookOpen } from 'lucide-react';

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
    synonyms?: string[];
  }[];
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings: DictionaryMeaning[];
  sourceUrls?: string[];
}

interface TooltipPosition {
  x: number;
  y: number;
}

interface WordDefineProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function WordDefine({ containerRef }: WordDefineProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [showDefinition, setShowDefinition] = useState(false);
  const [definition, setDefinition] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Listen for text selection (mouseup) inside the reader container
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    // Only trigger for single words (no spaces)
    if (!text || text.includes(' ') || text.length > 30 || text.length < 2) {
      return;
    }

    // Only trigger if selection is inside the reader container
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !containerRef.current?.contains(anchorNode)) {
      return;
    }

    // Strip any non-alpha chars from edges
    const cleanWord = text.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    // Position the tooltip near the selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedWord(cleanWord);
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [containerRef]);

  // Close tooltip when clicking elsewhere
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) {
      return;
    }
    // Don't close if user is making a new selection
    setSelectedWord(null);
    setTooltipPos(null);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleMouseUp, handleMouseDown]);

  // Fetch definition from free dictionary API
  const fetchDefinition = useCallback(async (word: string) => {
    setLoading(true);
    setError(null);
    setDefinition(null);
    setShowDefinition(true);
    setSelectedWord(null);
    setTooltipPos(null);

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          setError(`No definition found for "${word}".`);
        } else {
          setError('Failed to fetch definition. Please try again.');
        }
        setLoading(false);
        return;
      }

      const data: DictionaryEntry[] = await res.json();
      if (data && data.length > 0) {
        setDefinition(data[0]);
      } else {
        setError(`No definition found for "${word}".`);
      }
    } catch {
      setError('Network error. Could not fetch definition.');
    }

    setLoading(false);
  }, []);

  const playPronunciation = useCallback(() => {
    if (!definition?.phonetics) return;
    const audioUrl = definition.phonetics.find(p => p.audio)?.audio;
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
    }
  }, [definition]);

  const hasAudio = definition?.phonetics?.some(p => p.audio);
  const phonetic = definition?.phonetic || definition?.phonetics?.find(p => p.text)?.text;

  return (
    <>
      {/* Selection tooltip - "Define" button */}
      {selectedWord && tooltipPos && (
        <div
          ref={tooltipRef}
          className="define-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="define-tooltip-btn"
            onClick={() => fetchDefinition(selectedWord)}
          >
            <BookOpen size={14} />
            Define
          </button>
        </div>
      )}

      {/* Definition overlay */}
      {showDefinition && (
        <div className="define-overlay" onClick={() => setShowDefinition(false)}>
          <div className="define-modal" onClick={(e) => e.stopPropagation()}>
            <div className="define-modal-header">
              <div className="define-modal-title-row">
                {definition ? (
                  <>
                    <h2 className="define-word">{definition.word}</h2>
                    {phonetic && (
                      <span className="define-phonetic">{phonetic}</span>
                    )}
                    {hasAudio && (
                      <button
                        className="define-audio-btn"
                        onClick={playPronunciation}
                        title="Play pronunciation"
                      >
                        <Volume2 size={18} />
                      </button>
                    )}
                  </>
                ) : loading ? (
                  <h2 className="define-word">Looking up…</h2>
                ) : (
                  <h2 className="define-word">Definition</h2>
                )}
              </div>
              <button
                className="btn-icon define-close-btn"
                onClick={() => setShowDefinition(false)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="define-modal-body">
              {loading && (
                <div className="define-loading">
                  <div className="spinner" />
                  <span>Fetching definition…</span>
                </div>
              )}

              {error && (
                <div className="define-error">
                  <p>{error}</p>
                </div>
              )}

              {definition && (
                <div className="define-content">
                  {definition.meanings.map((meaning, i) => (
                    <div key={i} className="define-meaning">
                      <div className="define-pos">{meaning.partOfSpeech}</div>
                      <ol className="define-definitions">
                        {meaning.definitions.slice(0, 4).map((def, j) => (
                          <li key={j} className="define-def-item">
                            <p className="define-def-text">{def.definition}</p>
                            {def.example && (
                              <p className="define-example">"{def.example}"</p>
                            )}
                            {def.synonyms && def.synonyms.length > 0 && (
                              <div className="define-synonyms">
                                <span className="define-synonyms-label">Synonyms: </span>
                                {def.synonyms.slice(0, 5).map((syn, k) => (
                                  <button
                                    key={k}
                                    className="define-synonym-chip"
                                    onClick={() => fetchDefinition(syn)}
                                  >
                                    {syn}
                                  </button>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}

                  {definition.sourceUrls && definition.sourceUrls.length > 0 && (
                    <div className="define-source">
                      <a
                        href={definition.sourceUrls[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
