/**
 * Mermaid language definition for highlight.js
 * This file registers mermaid as a language with highlight.js
 */
(function() {
  // Check if highlight.js is available
  if (typeof hljs === 'undefined') {
    console.error('highlight.js not loaded. Mermaid syntax highlighting will not be available.');
    return;
  }

  // Define Mermaid language
  function hljsDefineMermaid(hljs) {
    return {
      name: 'mermaid',
      aliases: ['mermaid', 'mmd'],
      case_insensitive: true,
      keywords: {
        keyword: 'graph flowchart sequenceDiagram classDiagram stateDiagram erDiagram gantt pie gitGraph ' +
                'journey mindmap requirementDiagram timeline',
        literal: 'TB TD BT RL LR true false'
      },
      contains: [
        hljs.HASH_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        {
          className: 'function',
          begin: '\\b[a-zA-Z][a-zA-Z0-9_]*\\s*\\(',
          returnBegin: true,
          contains: [
            {
              className: 'title',
              begin: /[a-zA-Z][a-zA-Z0-9_]*/
            },
            {
              className: 'params',
              begin: /\(/,
              end: /\)/,
              contains: [
                hljs.QUOTE_STRING_MODE,
                hljs.NUMBER_MODE
              ]
            }
          ]
        },
        {
          className: 'operator',
          begin: '-->'
        },
        {
          className: 'operator',
          begin: '---'
        },
        {
          className: 'operator',
          begin: '==>'
        },
        {
          className: 'type',
          begin: '\\[\\[.*?\\]\\]'
        },
        {
          className: 'type',
          begin: '\\[\\(.*?\\)\\]'
        },
        {
          className: 'type',
          begin: '\\(\\(.*?\\)\\)'
        },
        {
          className: 'type',
          begin: '\\{\\{.*?\\}\\}'
        }
      ]
    };
  }

  // Register the language with highlight.js
  hljs.registerLanguage('mermaid', hljsDefineMermaid);
  console.log('Mermaid language registered with highlight.js');
})(); 