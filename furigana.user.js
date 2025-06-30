// ==UserScript==
// @name         Japanese Furigana Generatorj
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically add furigana to Japanese text on web pages
// @author       Snowstar Miao <snomiao@gmail.com>
// @match        *://*/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/cash/8.1.5/cash.min.js
// ==/UserScript==

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        OPENAI_API_KEY: 'your-openai-api-key-here', // Replace with your actual API key
        MAX_CONCURRENT_REQUESTS: 3,
        SELECTOR: 'p, h1, h2, h3, h4, h5, h6, span, div', // Elements to process
        MIN_TEXT_LENGTH: 10, // Minimum text length to process
        JAPANESE_REGEX: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g // Hiragana, Katakana, Kanji
    };

    // Concurrent execution control
    const lockMap = new Map();

    async function concurrentLock(key, maxConcurrent) {
        if (!lockMap.has(key)) {
            lockMap.set(key, { count: 0, queue: [] });
        }

        const lock = lockMap.get(key);

        if (lock.count >= maxConcurrent) {
            return new Promise(resolve => {
                lock.queue.push(resolve);
            });
        }

        lock.count++;
        return Promise.resolve();
    }

    function releaseLock(key) {
        const lock = lockMap.get(key);
        if (lock) {
            lock.count--;
            if (lock.queue.length > 0) {
                const next = lock.queue.shift();
                lock.count++;
                next();
            }
        }
    }

    // Utility functions
    function isVisible(element) {
        if (!element || !element.offsetParent) return false;

        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0;
    }

    function containsJapanese(text) {
        return CONFIG.JAPANESE_REGEX.test(text);
    }

    function hasAlreadyProcessed(element) {
        return element.dataset.furiganaProcessed === 'true';
    }

    // Main furigana processing function
    async function fillJapaneseFurigana(element) {
        if (hasAlreadyProcessed(element)) return;

        const html = element.innerHTML.trim();
        if (!html || html.length < CONFIG.MIN_TEXT_LENGTH || !containsJapanese(html)) {
            return;
        }

        try {
            await concurrentLock('fillJapaneseFurigana', CONFIG.MAX_CONCURRENT_REQUESTS);

            const furiganaText = await generateFurigana(html);
            if (furiganaText) {
                element.innerHTML = furiganaText;
                element.dataset.furiganaProcessed = 'true';
            }
        } catch (error) {
            console.error('Error processing furigana:', error);
        } finally {
            releaseLock('fillJapaneseFurigana');
        }
    }

    // OpenAI API integration
    async function generateFurigana(html) {
        if (!CONFIG.OPENAI_API_KEY || CONFIG.OPENAI_API_KEY === 'your-openai-api-key-here') {
            console.warn('OpenAI API key not configured');
            return null;
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [{
                        role: 'system',
                        content: 'You are a Japanese language expert. Add furigana (ruby text) to Japanese text using HTML ruby tags. Only add furigana to kanji characters, not hiragana or katakana. Return only the HTML with ruby tags, no explanations.'
                    },
                    {
                        role: 'user',
                        content: `Add furigana to this Japanese html:`
                    },
                    {
                        role: 'user',
                        content: `${html}`
                    }],
                    max_tokens: 1000,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim();
        } catch (error) {
            console.error('OpenAI API error:', error);
            return null;
        }
    }

    // Fallback furigana generation using local dictionary (simplified)
    function generateFuriganaFallback(text) {
        // This is a simplified fallback - in a real implementation, 
        // you would use a proper Japanese dictionary/morphological analyzer
        const kanjiReadings = {
            '日本': 'にほん',
            '東京': 'とうきょう',
            '大学': 'だいがく',
            '学生': 'がくせい',
            '先生': 'せんせい',
            '今日': 'きょう',
            '明日': 'あした',
            '昨日': 'きのう'
        };

        let result = text;
        for (const [kanji, reading] of Object.entries(kanjiReadings)) {
            const rubyTag = `<ruby>${kanji}<rt>${reading}</rt></ruby>`;
            result = result.replace(new RegExp(kanji, 'g'), rubyTag);
        }

        return result !== text ? result : null;
    }

    // CSS styles for furigana
    function addFuriganaStyles() {
        const style = document.createElement('style');
        style.textContent = `
            ruby {
                ruby-align: center;
                ruby-position: over;
            }
            
            ruby rt {
                font-size: 0.6em;
                line-height: 1;
                color: #666;
                font-weight: normal;
            }
            
            ruby rb {
                position: relative;
            }
            
            /* Ensure good spacing */
            ruby + ruby {
                margin-left: 0.1em;
            }
        `;
        document.head.appendChild(style);
    }

    // Main initialization
    function init() {
        addFuriganaStyles();

        // Process existing elements
        const elements = Array.from(document.querySelectorAll(CONFIG.SELECTOR))
            .filter(isVisible);

        elements.forEach(element => {
            fillJapaneseFurigana(element);
        });

        // Observe for new content
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const elements = [node, ...node.querySelectorAll(CONFIG.SELECTOR)]
                            .filter(isVisible);

                        elements.forEach(element => {
                            fillJapaneseFurigana(element);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();