/**
 * Global HTML entity decoder for Mermaid diagrams
 * This provides a guaranteed way to decode HTML entities in diagrams
 */
(function() {
  // Create the decoder function
  function decodeHtmlEntities(text) {
    if (!text) return text;
    
    // Fix arrow syntax
    text = text.replace(/--&gt;/g, '-->');
    
    // Common HTML entities
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    // Replace all encoded entities with their decoded versions
    return text.replace(/&[a-z0-9#]+;/gi, entity => {
      if (entities[entity]) {
        return entities[entity];
      }
      
      // Handle numeric entities
      if (entity.startsWith('&#')) {
        try {
          const tempEl = document.createElement('span');
          tempEl.innerHTML = entity;
          return tempEl.innerText;
        } catch(e) {
          return entity;
        }
      }
      
      return entity;
    });
  }
  
  // Expose globally - multiple ways to ensure it's available
  // 1. As a global function
  window.decodeHtmlEntities = decodeHtmlEntities;
  
  // 2. Through the mermaidDebug object
  window.mermaidDebug = window.mermaidDebug || {};
  window.mermaidDebug.decodeHtmlEntities = decodeHtmlEntities;
  
  console.log('HTML entity decoder is globally available');
})(); 