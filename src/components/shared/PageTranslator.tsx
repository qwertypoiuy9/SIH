import React, { useEffect, useRef } from 'react';
import { useKisanQ } from '../../context/KisanFlowContext';
import { TranslateService } from '../../services/translateService';

// Text nodes that belong to these tags should be ignored
const IGNORED_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'];

export const PageTranslator: React.FC = () => {
  const { language, setIsTranslating, isTranslating } = useKisanQ();
  const observerRef = useRef<MutationObserver | null>(null);
  
  // Stores original English text to prevent re-translating already translated text
  const originalTextMap = useRef<WeakMap<Text, string>>(new WeakMap());
  // Prevent translating while we are translating
  const processingRef = useRef(false);

  useEffect(() => {
    let active = true;

    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const isIgnored = (node: Node): boolean => {
      let parent = node.parentElement;
      while (parent) {
        if (IGNORED_TAGS.includes(parent.tagName)) return true;
        if (parent.hasAttribute('translate') && parent.getAttribute('translate') === 'no') return true;
        if (parent.hasAttribute('data-no-translate')) return true;
        parent = parent.parentElement;
      }
      return false;
    };

    const hasTranslatableText = (text: string) => {
      // Must contain at least one letter (avoid translating pure numbers or symbols)
      return /[a-zA-Z]/.test(text) && text.trim().length > 0;
    };

    const collectTextNodes = (root: Node): Text[] => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (isIgnored(node)) return NodeFilter.FILTER_REJECT;
            const text = originalTextMap.current.get(node as Text) || node.nodeValue || '';
            if (hasTranslatableText(text)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      const nodes: Text[] = [];
      let currentNode = walker.nextNode();
      while (currentNode) {
        nodes.push(currentNode as Text);
        currentNode = walker.nextNode();
      }
      return nodes;
    };

    const translateNodes = async (nodes: Text[]) => {
      if (nodes.length === 0) return;
      
      // If language is English, just restore original texts
      if (language === 'en') {
        observerRef.current?.disconnect();
        nodes.forEach(node => {
          const original = originalTextMap.current.get(node);
          if (original && node.nodeValue !== original) {
            node.nodeValue = original;
          }
        });
        startObserving();
        return;
      }

      setIsTranslating(true);
      processingRef.current = true;
      
      const textsToTranslate = nodes.map(n => {
        const original = originalTextMap.current.get(n);
        if (original) return original;
        
        // Save original text
        const val = n.nodeValue || '';
        originalTextMap.current.set(n, val);
        return val;
      });

      try {
        const translatedTexts = await TranslateService.translateBatch(textsToTranslate, 'en', language);
        if (!active) return;
        
        // Disconnect observer temporarily to avoid infinite loops from our own DOM mutations
        observerRef.current?.disconnect();
        
        nodes.forEach((node, idx) => {
          if (translatedTexts[idx] && translatedTexts[idx] !== textsToTranslate[idx]) {
            node.nodeValue = translatedTexts[idx];
          }
        });
      } catch (err) {
        console.error("DOM translation error:", err);
      } finally {
        if (active) {
          startObserving();
          setIsTranslating(false);
          processingRef.current = false;
        }
      }
    };

    const startObserving = () => {
      if (!observerRef.current) {
        observerRef.current = new MutationObserver((mutations) => {
          if (processingRef.current) return;
          
          const newTextNodes: Text[] = [];
          
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                  if (!isIgnored(node)) {
                    const text = node.nodeValue || '';
                    if (hasTranslatableText(text)) {
                      newTextNodes.push(node as Text);
                    }
                  }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  newTextNodes.push(...collectTextNodes(node));
                }
              });
            } else if (mutation.type === 'characterData') {
              const node = mutation.target as Text;
              if (!isIgnored(node)) {
                // Since text changed, we might need to re-translate
                // Only queue it if it doesn't match the currently translated state
                // This prevents infinite loops if some other script modifies it
                newTextNodes.push(node);
              }
            }
          });
          
          if (newTextNodes.length > 0) {
            translateNodes(newTextNodes);
          }
        });
      }

      const mainContent = document.querySelector('main') || document.body;
      observerRef.current.observe(mainContent, {
        childList: true,
        subtree: true,
        characterData: true
      });
    };

    // Initial translation pass
    const mainContent = document.querySelector('main') || document.body;
    const initialNodes = collectTextNodes(mainContent);
    
    // Store originals for initial nodes if they don't have them
    initialNodes.forEach(n => {
      if (!originalTextMap.current.has(n)) {
        originalTextMap.current.set(n, n.nodeValue || '');
      }
    });

    translateNodes(initialNodes).finally(() => {
      if (active) {
        startObserving();
      }
    });

    return () => {
      active = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [language, setIsTranslating]);

  return null; // This is a utility component, renders nothing
};
